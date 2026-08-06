import { isSupabaseEnabled, supabase } from './supabase';

/* marketSnapshot — อ่าน snapshot demand/supply ล่าสุด (public read) มาโชว์บน Landing
 * เขียนโดย edge function market-snapshot ทุกวันที่ 1 · ตัวเลขนิ่งทั้งเดือน */

export interface SnapshotRow { kind: string; label: string; demand: number; supply: number; }
export interface Snapshot { month: string; rows: SnapshotRow[] }

/** ดึง snapshot ของเดือนล่าสุด (เดือน = ค่ามากสุดใน market_snapshot) */
export async function latestSnapshot(): Promise<Snapshot> {
  if (!isSupabaseEnabled || !supabase) return { month: '', rows: [] };
  const { data } = await supabase
    .from('market_snapshot')
    .select('month,kind,label,demand,supply')
    .order('month', { ascending: false })
    .limit(400);
  const all = data ?? [];
  if (!all.length) return { month: '', rows: [] };
  const month = String(all[0].month);
  const rows = all
    .filter(r => String(r.month) === month)
    .map(r => ({ kind: String(r.kind), label: String(r.label ?? ''), demand: Number(r.demand ?? 0), supply: Number(r.supply ?? 0) }));
  return { month, rows };
}
