import type { AppData } from '../types';
import { workspaceOps } from './adminOps';
import { isRealActivation } from './setupWizard';

/* ===== Activation Funnel + Engagement Segments (ฝั่ง Admin) =====
 * ตอบคำถามจาก GA4: "คนเข้ามาเยอะ (unknown 82%) แต่หลุดตรงไหน ก่อนถึง activation?"
 * คำนวณจาก AppData จริงของทุก workspace (สัญญาณเดียวกับหน้าเมือง/การเงิน) — เลขตรงทั้งระบบ
 * ทุกฟังก์ชันบริสุทธิ์ (pure) เทสต์ได้ · ไม่มี side-effect */

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  pct: number;          // % ของ workspace ทั้งหมด
  dropFromPrev: number; // % ที่หลุดจากขั้นก่อนหน้า (0 = ขั้นแรก)
}

export interface EngagementSeg {
  key: string;
  label: string;
  count: number;
  pct: number;
  hint: string;
}

export interface FunnelSummary {
  total: number;
  stages: FunnelStage[];
  segments: EngagementSeg[];
  activationRate: number;  // % ที่ activate (สร้างบริษัท AI / เปิดร้าน)
}

/** activate จริง = ปรับบริษัทให้ต่างจาก demo seed (ชื่อ/ประเภท/เป้าหมาย/ทีม)
 *  ไม่ใช่แค่ "มีชื่อ" — seed มีชื่อ+เอเจนต์ให้แล้ว ถ้าวัดแค่นั้นจะได้ ~100% เสมอ (ตัวเลขหลอก) */
const isActivated = isRealActivation;

/** ขั้น funnel: สมัคร → เลือกเป้าหมาย → สร้างบริษัท/ร้าน → ลงมือ → มีรายได้ */
export function funnelSummary(states: (AppData | null)[]): FunnelSummary {
  const total = states.length;
  const ops = states.map((d) => (d ? workspaceOps(d) : null));

  const onboarded = states.filter((d) => !!d?.onboardGoal).length;
  const activated = states.filter(isActivated).length;
  const didWork = ops.filter((o) => !!o && (o.tasksDone > 0 || o.dealsClosed > 0)).length;
  const earning = ops.filter(
    (o) => !!o && (o.revenue > 0 || (o.plan !== 'free' && o.subStatus === 'active')),
  ).length;

  const raw: { key: string; label: string; count: number }[] = [
    { key: 'signup', label: 'สมัคร / มีเวิร์กสเปซ', count: total },
    { key: 'goal', label: 'เลือกเป้าหมาย (onboarding)', count: onboarded },
    { key: 'activate', label: 'สร้างบริษัท AI / เปิดร้าน', count: activated },
    { key: 'work', label: 'ลงมือจริง (งานเสร็จ/ปิดดีล)', count: didWork },
    { key: 'revenue', label: 'มีรายได้ / จ่ายเงิน', count: earning },
  ];

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);
  const stages: FunnelStage[] = raw.map((s, i) => {
    const prev = i > 0 ? raw[i - 1].count : s.count;
    const dropFromPrev = i > 0 && prev > 0 ? Math.round(((prev - s.count) / prev) * 1000) / 10 : 0;
    return { ...s, pct: pct(s.count), dropFromPrev: Math.max(0, dropFromPrev) };
  });

  // แบ่งกลุ่มความลึกการใช้งาน (มิเรอร์ GA4: 25-34 ลึก vs unknown ตื้น)
  let deep = 0, active = 0, shallow = 0, inactive = 0;
  for (const o of ops) {
    if (!o) { inactive++; continue; }
    if (o.streak >= 3 || o.tasksDone >= 5 || o.dealsClosed >= 1) deep++;
    else if (o.tasksDone >= 1 || o.running || o.agents > 0) active++;
    else shallow++;
  }
  const segments: EngagementSeg[] = [
    { key: 'deep', label: 'ลึก (ผูกพัน)', count: deep, pct: pct(deep), hint: 'ต่อเนื่อง ≥3 วัน หรือ งานเสร็จ ≥5 / ปิดดีล — กลุ่มที่ต้องหาให้มากขึ้น' },
    { key: 'active', label: 'ใช้งาน', count: active, pct: pct(active), hint: 'เริ่มลงมือ (มีเอเจนต์/งาน) — ดันให้ลึกขึ้น' },
    { key: 'shallow', label: 'ตื้น', count: shallow, pct: pct(shallow), hint: 'สร้าง ws แต่ยังไม่ลงมือ — จุดที่ต้อง activate' },
    { key: 'inactive', label: 'ว่างเปล่า', count: inactive, pct: pct(inactive), hint: 'ยังไม่มีข้อมูล — เข้ามาแล้วออก' },
  ];

  return { total, stages, segments, activationRate: pct(activated) };
}
