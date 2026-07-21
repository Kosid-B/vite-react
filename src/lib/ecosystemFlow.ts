/** Ecosystem Flow — วงจรธุรกิจครบวงจร ทำให้ "ไหล" ต่อกันง่าย/เร็วขึ้น (pure, ทดสอบได้)
 *  7 ด่าน: 24-Step → BMC → การตลาด → ทรัพยากร → การเงิน → เมือง → Marketplace (แล้ววนกลับ)
 *  แต่ละด่านอ่านสถานะจากข้อมูลจริง + ชี้ "ด่านถัดไป" ให้คลิกไปทำต่อได้ทันที (ลด friction) */

import type { AppData, PageId } from '../types';
import { cityStats } from './companyCity';

export type FlowStatus = 'empty' | 'partial' | 'done';

export interface FlowStage {
  id: string;
  page: PageId;
  icon: string;
  label: string;
  status: FlowStatus;
  metric: string;   // ตัวเลข/สถานะย่อ
  next: string;     // ทำอะไรต่อที่ด่านนี้
}

export interface EcosystemFlow {
  stages: FlowStage[];
  doneCount: number;
  total: number;
  pct: number;
  nextStage: FlowStage | null;   // ด่านแรกที่ยังไม่ done = ทำต่อตรงนี้
}

const bmcFilled = (arr: string[] | undefined) => (arr ?? []).filter(x => x && x.trim()).length > 0;

export function ecosystemFlow(d: AppData): EcosystemFlow {
  const de24 = d.businessModel?.de24 ?? [];
  const de24Done = de24.filter(s => s.done).length;
  const bmc = d.businessModel?.bmc;
  const bmcCore = [bmc?.segments, bmc?.value, bmc?.revenue].filter(bmcFilled).length; // 0..3
  const channels = d.marketing?.channels ?? [];
  const resItems = d.resources?.items ?? [];
  const fin = d.finance ?? [];
  // cityStats อ่านข้อมูลหลายส่วน — กันพังถ้า data บางส่วนขาด (fallback ค่าว่าง)
  let cityXp = 0;
  let cityTier = '—';
  try {
    const city = cityStats(d);
    cityXp = city.xp ?? 0;
    cityTier = city.tier?.label ?? '—';
  } catch { /* data partial → คงค่า default */ }

  const st = (cond: boolean, partial: boolean): FlowStatus => cond ? 'done' : partial ? 'partial' : 'empty';

  const stages: FlowStage[] = [
    {
      id: 'de24', page: 'bmc', icon: '🧭', label: '24-Step',
      status: st(de24Done >= 12, de24Done > 0), metric: `${de24Done}/24`,
      next: de24Done >= 12 ? 'ครบพอ — ไปออกแบบ BMC' : 'ทำ Disciplined Entrepreneurship ต่อ',
    },
    {
      id: 'bmc', page: 'bmc', icon: '🗺️', label: 'BMC',
      status: st(bmcCore === 3, bmcCore > 0), metric: `${bmcCore}/3 core`,
      next: bmcCore === 3 ? 'BMC ครบแกน — วางการตลาด' : 'ให้ CEO ตั้งต้น BMC จากผล 24-Step',
    },
    {
      id: 'marketing', page: 'marketing', icon: '🎯', label: 'การตลาด',
      status: st(channels.length >= 2, channels.length > 0), metric: `${channels.length} ช่องทาง`,
      next: channels.length ? 'เพิ่มแคมเปญ/เป้าหมาย' : 'สร้างช่องทางจากผล 24-Step',
    },
    {
      id: 'resources', page: 'resources', icon: '📦', label: 'ทรัพยากร',
      status: st(resItems.length >= 3, resItems.length > 0), metric: `${resItems.length} รายการ`,
      next: resItems.length ? 'ให้ AI จัดสรร/ขออนุมัติเพิ่ม' : 'เพิ่มทรัพยากรที่ธุรกิจต้องใช้',
    },
    {
      id: 'finance', page: 'city', icon: '💰', label: 'การเงิน',
      status: st(fin.length >= 3, fin.length > 0), metric: `${fin.length} รายการ`,
      next: fin.length ? 'บันทึกรายรับ-รายจ่ายต่อเนื่อง' : 'กรอกรายรับ-รายจ่ายก้อนแรก',
    },
    {
      id: 'city', page: 'city', icon: '🏙️', label: 'เมือง',
      status: st(cityXp >= 500, cityXp > 0), metric: cityTier,
      next: cityXp > 0 ? 'ทำงานจริงให้เมืองโตขึ้น' : 'เริ่มสะสม XP จากงานจริง',
    },
    {
      id: 'market', page: 'storefront', icon: '🏪', label: 'Marketplace',
      status: st(!!d.visitedMarket, !!d.visitedMarket), metric: d.visitedMarket ? 'เปิดร้านแล้ว' : 'ยังไม่เปิด',
      next: d.visitedMarket ? 'หา RFQ / คู่ค้า ปิดดีลแรก' : 'เปิดหน้าร้านให้ลูกค้าเจอ',
    },
  ];

  const doneCount = stages.filter(s => s.status === 'done').length;
  const nextStage = stages.find(s => s.status !== 'done') ?? null;
  return { stages, doneCount, total: stages.length, pct: Math.round((doneCount / stages.length) * 100), nextStage };
}
