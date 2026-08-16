import { isSupabaseEnabled, supabase } from './supabase';
import type { SkillEntry } from '../data/skillCatalog';

/** สถิติการเลือกใช้ Skill — เก็บ event ตอนซื้อเพื่อให้ Admin ใช้ทำการตลาด
 *  Production: ตาราง public.skill_purchases (insert โดย user, อ่านได้เฉพาะแอดมิน)
 *  Local mode: เก็บใน localStorage (สำหรับ demo) */

export interface SkillPurchaseEvent {
  skillId: string;
  skillName: string;
  category: string;
  tier: number;
  price: number;
  payMethod: string;
  userEmail?: string | null;
  createdAt: string;
}

export interface SkillAdoption {
  skillId: string;
  companies: number;
}

const LS_KEY = 'ceo_ai_skill_stats';

function loadLocal(): SkillPurchaseEvent[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as SkillPurchaseEvent[]; } catch { return []; }
}

/** บันทึก event การซื้อ Skill — fire-and-forget ห้าม block การซื้อ */
export async function trackSkillPurchase(
  skill: SkillEntry,
  payMethod: string,
  workspaceId?: string | null,
): Promise<void> {
  if (isSupabaseEnabled && supabase) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('skill_purchases').insert({
      workspace_id: workspaceId ?? null,
      user_id: u?.user?.id,
      user_email: u?.user?.email ?? null,
      skill_id: skill.id,
      skill_name: skill.name,
      category: skill.category,
      tier: skill.tier,
      price: skill.price,
      pay_method: payMethod,
    });
    if (error) throw error;
    return;
  }
  const list = loadLocal();
  list.unshift({
    skillId: skill.id, skillName: skill.name, category: skill.category,
    tier: skill.tier, price: skill.price, payMethod,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 500)));
}

/** Admin: ดึง event ทั้งหมด (ล่าสุดก่อน) + การใช้งานปัจจุบันรวมทุกบริษัท */
export async function adminGetSkillStats(): Promise<{ events: SkillPurchaseEvent[]; adoption: SkillAdoption[] }> {
  if (isSupabaseEnabled && supabase) {
    const [ev, ad] = await Promise.all([
      supabase.from('skill_purchases').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.rpc('admin_skill_adoption'),
    ]);
    if (ev.error) throw ev.error;
    if (ad.error) throw ad.error;
    interface Row {
      skill_id: string; skill_name: string; category: string; tier: number;
      price: number; pay_method: string; user_email: string | null; created_at: string;
    }
    return {
      events: (ev.data as Row[] ?? []).map(r => ({
        skillId: r.skill_id, skillName: r.skill_name, category: r.category ?? '',
        tier: r.tier ?? 1, price: Number(r.price), payMethod: r.pay_method ?? '',
        userEmail: r.user_email, createdAt: r.created_at,
      })),
      adoption: (ad.data as { skill_id: string; companies: number }[] ?? [])
        .map(r => ({ skillId: r.skill_id, companies: Number(r.companies) })),
    };
  }
  return { events: loadLocal(), adoption: [] };
}

/* ── แยก "รายได้จริง" ออกจาก "การเปิดให้ฟรีโดยแอดมิน" ──────────────────
 *
 * ⚠️ มีอยู่เพราะเคยเกือบอ่านผิด (docs/LESSONS-LEDGER.md):
 *   ตรวจ production 16 ส.ค. 2569 พบ skill_purchases 146 รายการ รวม ฿239,290
 *   แต่ทั้งหมดเป็น pay_method = 'admin-free' ของผู้ซื้อคนเดียว (บัญชีแอดมินเอง)
 *   → เงินจริงที่เข้ามา = ฿0
 *   ถ้าแดชบอร์ดรวม price ทุกแถวเป็น "ยอดขาย" ตัวเลขนั้นจะโกหกเราเอง
 *   และตัวเลขที่โกหกตัวเองอันตรายกว่าไม่มีตัวเลขเลย
 * ─────────────────────────────────────────────────────────────────────── */

/** วิธีจ่ายที่ "ไม่ใช่เงินจริง" — เปิดให้ใช้โดยแอดมิน/ของแถม ไม่ควรนับเป็นรายได้ */
export const NON_REVENUE_PAY_METHODS = ['admin-free', 'free', 'gift', 'trial'] as const;

export function isRealPayment(payMethod: string): boolean {
  return !NON_REVENUE_PAY_METHODS.includes(
    (payMethod || '').trim().toLowerCase() as (typeof NON_REVENUE_PAY_METHODS)[number],
  );
}

export interface RevenueSplit {
  /** เงินที่เข้ามาจริง (บาท) */
  real: number;
  /** มูลค่าที่แอดมินเปิดให้ฟรี — ดูเป็นข้อมูลได้ แต่ห้ามเรียกว่ารายได้ */
  comped: number;
  realCount: number;
  compedCount: number;
}

/** แยกยอดขายจริงออกจากยอดที่เปิดให้ฟรี — ใช้แทนการ reduce price ตรง ๆ */
export function revenueSplit(events: readonly SkillPurchaseEvent[]): RevenueSplit {
  const out: RevenueSplit = { real: 0, comped: 0, realCount: 0, compedCount: 0 };
  for (const e of events) {
    const amt = Number(e.price) || 0;
    if (isRealPayment(e.payMethod)) { out.real += amt; out.realCount += 1; }
    else { out.comped += amt; out.compedCount += 1; }
  }
  return out;
}
