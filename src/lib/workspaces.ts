import { supabase } from './supabase';
import type { AppData } from '../types';

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
}

export interface Member {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
}

/** คืนเวิร์กสเปซเริ่มต้นของผู้ใช้ (สร้าง "ส่วนตัว" ให้ถ้ายังไม่มี) */
export async function ensureDefaultWorkspace(): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('ensure_default_workspace');
  if (error) { console.warn('[ws] ensureDefault:', error.message); return null; }
  return data as string;
}

export async function listWorkspaces(): Promise<Workspace[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('workspaces').select('id,name,owner_id').order('created_at');
  if (error) { console.warn('[ws] list:', error.message); return []; }
  return (data ?? []) as Workspace[];
}

export async function createWorkspace(name: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('create_workspace', { p_name: name });
  if (error) { console.warn('[ws] create:', error.message); return null; }
  return data as string;
}

/** เชิญสมาชิกด้วยอีเมล (ต้องเป็นผู้ใช้ที่ลงทะเบียนแล้ว) — คืน 'ok' | 'not_found' | 'forbidden' | error */
export async function inviteMember(workspaceId: string, email: string): Promise<string> {
  if (!supabase) return 'no_supabase';
  const { data, error } = await supabase.rpc('invite_member', { p_workspace: workspaceId, p_email: email.trim() });
  return error ? error.message : (data as string);
}

export async function listMembers(workspaceId: string): Promise<Member[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('list_members', { p_workspace: workspaceId });
  if (error) { console.warn('[ws] members:', error.message); return []; }
  return (data ?? []) as Member[];
}

export async function setMemberRole(workspaceId: string, userId: string, role: 'admin' | 'member'): Promise<string> {
  if (!supabase) return 'no_supabase';
  const { data, error } = await supabase.rpc('set_member_role', { p_workspace: workspaceId, p_user: userId, p_role: role });
  return error ? error.message : (data as string);
}

export async function removeMember(workspaceId: string, userId: string): Promise<string> {
  if (!supabase) return 'no_supabase';
  const { data, error } = await supabase.rpc('remove_member', { p_workspace: workspaceId, p_user: userId });
  return error ? error.message : (data as string);
}

/** ลบ workspace ถาวร — RLS จำกัดเฉพาะ owner · FK cascade ลบข้อมูลลูกทั้งหมด
 *  (workspace_state, members, storefront, rfqs, orders, bids) · คืน '' = สำเร็จ */
export async function deleteWorkspace(workspaceId: string): Promise<string> {
  if (!supabase) return ''; // local mode ไม่มี workspace จริง — ผู้เรียกล้าง localStorage เอง
  const { error, count } = await supabase.from('workspaces')
    .delete({ count: 'exact' }).eq('id', workspaceId);
  if (error) return error.message;
  if (!count) return 'ลบไม่สำเร็จ — ต้องเป็นเจ้าของ (owner) เท่านั้น';
  return '';
}

export interface AdminWorkspace {
  id: string;
  name: string;
  owner_email: string;
  member_count: number;
  created_at: string;
}

/** สำหรับผู้ดูแลระบบ: ดูทุกเวิร์กสเปซในระบบ */
export async function adminListWorkspaces(): Promise<AdminWorkspace[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('admin_list_workspaces');
  if (error) { console.warn('[admin] list:', error.message); return []; }
  return (data ?? []) as AdminWorkspace[];
}

export async function wsLoad(wsId: string): Promise<AppData | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('workspace_state').select('data').eq('workspace_id', wsId).maybeSingle();
  if (error) { console.warn('[ws] load:', error.message); return null; }
  const d = data?.data as AppData | undefined;
  return d && Object.keys(d).length > 0 ? d : null;
}

/** outcome จาก ws_save_state → ควรถือว่า "ข้อมูลปลอดภัยแล้ว" ไหม
 *  'written' = เขียนลงจริง · 'stale' = cloud ใหม่กว่า (ไม่เขียนทับ แต่ไม่ใช่ error → ไม่ต้อง retry) */
export function wsSaveOk(outcome: unknown): boolean {
  return outcome === 'written' || outcome === 'stale';
}

/** error นี้แปลว่า RPC ยังไม่ถูก deploy (migration 0040 ยังไม่ apply) → ให้ fallback upsert เดิม */
export function isMissingRpc(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const msg = err.message ?? '';
  return err.code === 'PGRST202' || err.code === '42883'
    || /could not find the function/i.test(msg)
    || /function .*ws_save_state.* does not exist/i.test(msg);
}

/** เขียน AppData ขึ้น workspace_state — คืน true เมื่อข้อมูลปลอดภัย (เซฟลง หรือ cloud ใหม่กว่าอยู่แล้ว)
 *  ใช้ compare-and-set ฝั่ง server (0040) กัน 2 อุปกรณ์แก้พร้อมกัน last-write ทับของใหม่
 *  fallback: ถ้า RPC ยังไม่ deploy → upsert เดิม (ยังเซฟได้ แต่ไม่มี compare-and-set) */
export async function wsSave(wsId: string, data: AppData): Promise<boolean> {
  if (!supabase) return false;
  const { data: outcome, error } = await supabase.rpc('ws_save_state', { p_workspace_id: wsId, p_data: data });
  if (!error) return wsSaveOk(outcome);
  if (isMissingRpc(error)) {
    const { error: e2 } = await supabase
      .from('workspace_state')
      .upsert({ workspace_id: wsId, data, updated_at: new Date().toISOString() }, { onConflict: 'workspace_id' });
    if (e2) { console.warn('[ws] save fallback:', e2.message); return false; }
    return true;
  }
  console.warn('[ws] save:', error.message);
  return false;
}
