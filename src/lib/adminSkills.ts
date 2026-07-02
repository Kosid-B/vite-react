import { isSupabaseEnabled, supabase } from './supabase';
import type { SkillCategory, SkillTier } from '../data/skillCatalog';

/** Skill ที่ Admin ระบบเพิ่มเข้า Marketplace — แสดงให้ทุกบริษัทเห็น
 *  Production: ตาราง public.marketplace_skills (RLS: อ่านได้ทุกคน เขียนได้เฉพาะแอดมิน)
 *  Local mode: เก็บใน localStorage */
export interface AdminSkill {
  id: string;
  name: string;
  desc: string;
  category: SkillCategory;
  tier: SkillTier;
  price: number;
  icon: string;
  tags: string[];
  active: boolean;
  createdAt: string;
}

const LS_KEY = 'ceo_ai_admin_skills';

function loadLocal(): AdminSkill[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as AdminSkill[]; } catch { return []; }
}
function saveLocal(list: AdminSkill[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

interface SkillRow {
  id: string;
  name: string;
  description: string;
  category: string;
  tier: number;
  price: number;
  icon: string;
  tags: string[];
  active: boolean;
  created_at: string;
}

function rowToSkill(r: SkillRow): AdminSkill {
  return {
    id: r.id, name: r.name, desc: r.description,
    category: r.category as SkillCategory,
    tier: (r.tier as SkillTier) ?? 1,
    price: Number(r.price), icon: r.icon,
    tags: r.tags ?? [], active: r.active,
    createdAt: r.created_at?.slice(0, 10) ?? '',
  };
}

/** โหลด skill ที่ Admin เพิ่ม — includeInactive สำหรับหน้า Admin */
export async function listAdminSkills(includeInactive = false): Promise<AdminSkill[]> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('marketplace_skills').select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const all = (data as SkillRow[] ?? []).map(rowToSkill);
    return includeInactive ? all : all.filter(s => s.active);
  }
  const all = loadLocal();
  return includeInactive ? all : all.filter(s => s.active);
}

export async function createAdminSkill(input: Omit<AdminSkill, 'id' | 'createdAt' | 'active'>): Promise<AdminSkill> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase.from('marketplace_skills').insert({
      name: input.name, description: input.desc, category: input.category,
      tier: input.tier, price: input.price, icon: input.icon, tags: input.tags,
    }).select('*').single();
    if (error) throw error;
    return rowToSkill(data as SkillRow);
  }
  const skill: AdminSkill = {
    ...input,
    id: 'adm-' + Date.now().toString(36),
    active: true,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  saveLocal([skill, ...loadLocal()]);
  return skill;
}

export async function setAdminSkillActive(id: string, active: boolean): Promise<void> {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from('marketplace_skills').update({ active }).eq('id', id);
    if (error) throw error;
    return;
  }
  saveLocal(loadLocal().map(s => s.id === id ? { ...s, active } : s));
}

export async function deleteAdminSkill(id: string): Promise<void> {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from('marketplace_skills').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  saveLocal(loadLocal().filter(s => s.id !== id));
}
