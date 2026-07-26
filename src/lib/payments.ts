import { isSupabaseEnabled, supabase } from './supabase';

/** อัปสลิปในแอป + คิวแอดมินยืนยัน (ตาราง payment_submissions + bucket payment-slips)
 *  อนุมัติแล้ว → client ของผู้ใช้เอง (Billing) เปิดใช้งานแพ็กให้ (ไม่เขียนข้าม workspace) */

export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentSubmission {
  id: string;
  workspaceId: string;
  plan: string;
  cycle: string;
  amount: number;
  slipPath: string;
  status: PaymentStatus;
  note: string;
  createdAt: string;
  slipUrl?: string;   // signed URL (เฉพาะฝั่งแอดมินตอน list)
}

interface Row {
  id: string; workspace_id: string; plan: string; cycle: string; amount: number;
  slip_path: string; status: PaymentStatus; note: string; created_at: string;
}
const toSub = (r: Row): PaymentSubmission => ({
  id: r.id, workspaceId: r.workspace_id, plan: r.plan, cycle: r.cycle, amount: Number(r.amount),
  slipPath: r.slip_path, status: r.status, note: r.note, createdAt: r.created_at?.slice(0, 10) ?? '',
});

function extOf(file: File): string {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

/** ผู้ใช้อัปสลิป → อัปไฟล์เข้า bucket + สร้างแถว pending */
export async function submitPaymentSlip(input: {
  wsId: string | null; plan: string; cycle: string; amount: number; file: File;
}): Promise<{ error?: string; id?: string }> {
  if (!isSupabaseEnabled || !supabase) return { error: 'ใช้ได้เฉพาะโหมดออนไลน์ (ล็อกอิน)' };
  if (!input.wsId) return { error: 'ยังไม่พบ workspace — ลองรีเฟรชหน้า' };
  if (input.file.size > 5_242_880) return { error: 'ไฟล์ใหญ่เกิน 5MB' };
  const path = `${input.wsId}/${Date.now()}.${extOf(input.file)}`;
  const up = await supabase.storage.from('payment-slips').upload(path, input.file, { contentType: input.file.type });
  if (up.error) return { error: up.error.message };
  const { data, error } = await supabase.from('payment_submissions').insert({
    workspace_id: input.wsId, plan: input.plan, cycle: input.cycle, amount: input.amount, slip_path: path,
  }).select('id').maybeSingle();
  if (error) return { error: error.message };
  return { id: data?.id as string };
}

/** ตรวจสลิปกับ record ธนาคารจริงผ่าน SlipOK (server-side) → เปิดแพ็กให้เมื่อผ่าน
 *  ใช้เมื่อ PAYMENT.slipOkLive = true · server เป็นผู้เขียน plan (ปิดช่องโหว่ client-trust) */
export interface VerifySlipResult {
  ok: boolean;
  reason?: string;
  code?: number;
  subscription?: unknown;
  appliedPaymentIds?: string[];
  currentPeriodEnd?: string;
}
export async function verifySlip(input: {
  workspaceId: string; submissionId: string; plan: string; cycle: string;
}): Promise<VerifySlipResult> {
  if (!isSupabaseEnabled || !supabase) return { ok: false, reason: 'offline' };
  const { data, error } = await supabase.functions.invoke('verify-slip', { body: input });
  if (error) {
    // edge function ตอบ non-2xx → อ่าน body ที่แนบ reason มา (ถ้ามี)
    const ctx = (error as { context?: { body?: unknown } })?.context;
    let parsed: VerifySlipResult | null = null;
    try {
      const raw = ctx?.body;
      if (typeof raw === 'string') parsed = JSON.parse(raw);
      else if (raw && typeof raw === 'object') parsed = raw as VerifySlipResult;
    } catch { /* ignore */ }
    return parsed ?? { ok: false, reason: error.message || 'verify_failed' };
  }
  return (data as VerifySlipResult) ?? { ok: false, reason: 'no_response' };
}

/** ข้อความไทยของเหตุผลที่ตรวจสลิปไม่ผ่าน (map จาก reason ของ verify-slip) */
export function slipReasonText(reason?: string): string {
  switch (reason) {
    case 'duplicate_slip':      return 'สลิปนี้เคยใช้เปิดแพ็กแล้ว (กันใช้ซ้ำ)';
    case 'amount_too_low':
    case 'amount_mismatch':     return 'ยอดโอนไม่ตรงกับราคาแพ็ก';
    case 'receiver_mismatch':   return 'บัญชีผู้รับไม่ตรงกับบัญชีบริษัท — ตรวจว่าโอนเข้าบัญชีที่ถูกต้อง';
    case 'slip_not_verified':   return 'ตรวจสลิปไม่ผ่าน — รูปอาจไม่ใช่สลิปโอนจริง หรืออ่าน QR ไม่ได้';
    case 'slipok_not_configured':
    case 'slipok_unreachable':
    case 'slipok_bad_response': return 'ระบบตรวจสลิปไม่พร้อมชั่วคราว — ลองใหม่ หรือติดต่อทีมงาน';
    case 'not_a_member':
    case 'unauthorized':        return 'ไม่มีสิทธิ์ดำเนินการ — ลองล็อกอินใหม่';
    default:                    return 'ตรวจสลิปไม่สำเร็จ กรุณาลองใหม่หรือติดต่อทีมงาน';
  }
}

/** คำขอชำระเงินของ workspace ฉัน (ใช้ตรวจว่ามีอันที่อนุมัติแล้วเพื่อเปิดใช้งาน) */
export async function listMyPayments(wsId: string | null): Promise<PaymentSubmission[]> {
  if (!isSupabaseEnabled || !supabase || !wsId) return [];
  const { data } = await supabase.from('payment_submissions').select('*')
    .eq('workspace_id', wsId).order('created_at', { ascending: false });
  return (data as Row[] ?? []).map(toSub);
}

/** แอดมิน: คำขอที่รออนุมัติ + signed URL ของสลิป (ดูรูปได้) */
export async function listPendingPayments(): Promise<PaymentSubmission[]> {
  if (!isSupabaseEnabled || !supabase) return [];
  const { data } = await supabase.from('payment_submissions').select('*')
    .eq('status', 'pending').order('created_at', { ascending: true });
  const subs = (data as Row[] ?? []).map(toSub);
  await Promise.all(subs.map(async (s) => {
    if (!s.slipPath) return;
    const { data: signed } = await supabase!.storage.from('payment-slips').createSignedUrl(s.slipPath, 3600);
    s.slipUrl = signed?.signedUrl;
  }));
  return subs;
}

/** แอดมิน: อนุมัติ/ปฏิเสธคำขอ */
export async function reviewPayment(id: string, status: 'approved' | 'rejected', note = ''): Promise<string> {
  if (!isSupabaseEnabled || !supabase) return 'ใช้ได้เฉพาะโหมดออนไลน์';
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('payment_submissions')
    .update({ status, note, reviewed_at: new Date().toISOString(), reviewed_by: u?.user?.id ?? null })
    .eq('id', id);
  return error ? error.message : '';
}
