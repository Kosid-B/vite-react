/** Aha Moment ใน 5 นาที — เส้นทางสั้นที่สุดสู่ "คุณค่าหลัก" ของแอป
 *  (ผู้ใช้ใหม่เห็นบริษัท AI ทำงานเองได้จริงภายใน ~5 นาที) — pure, ทดสอบได้
 *  ต่างจาก Setup Quest (เช็กลิสต์เต็มระบบ 7 ข้อ) — อันนี้โฟกัส 3 ก้าวสู่ aha เท่านั้น */

import type { AppData, PageId } from '../types';

export interface AhaStep {
  id: string;
  icon: string;
  label: string;
  hint: string;
  mins: number;          // เวลาโดยประมาณต่อก้าว
  page: PageId;          // คลิกแล้วพาไปทำก้าวนั้น
  done: (d: AppData) => boolean;
}

/** 3 ก้าวสู่ Aha: บอกเป้าหมาย → ตั้งทีม → เริ่มทำงาน */
export const AHA_STEPS: AhaStep[] = [
  {
    id: 'goal', icon: '🎯', label: 'บอกเป้าหมายธุรกิจ',
    hint: 'ประเภทธุรกิจ + เป้าหมาย 1 ประโยค ให้ AI รู้ทิศทาง', mins: 2, page: 'aicompany',
    done: d => !!d.aiCompany?.industry?.trim() && !!d.aiCompany?.goal?.trim(),
  },
  {
    id: 'team', icon: '👥', label: 'ให้ CEO สร้างทีม AI',
    hint: 'กด "แนะนำทีม" — CEO จัดผังผู้บริหารให้อัตโนมัติ', mins: 2, page: 'aicompany',
    done: d => (d.aiCompany?.agents?.length ?? 0) >= 3,
  },
  {
    id: 'run', icon: '▶️', label: 'เริ่มให้บริษัททำงาน',
    hint: 'มอบงานให้ทีม — เห็นบริษัทเดินเอง + เมืองเริ่มโต', mins: 1, page: 'aicompany',
    done: d => Boolean(d.aiCompany?.running) || (d.aiCompany?.tasks?.length ?? 0) >= 1,
  },
];

export interface AhaState {
  steps: Array<AhaStep & { complete: boolean }>;
  doneCount: number;
  total: number;
  minsLeft: number;      // เวลาที่เหลือโดยประมาณ (รวม mins ของก้าวที่ยังไม่เสร็จ)
  pct: number;
  activated: boolean;    // ครบทุกก้าว = ถึง Aha แล้ว
  nextStep: AhaStep | null;
}

export function ahaProgress(d: AppData): AhaState {
  const steps = AHA_STEPS.map(s => ({ ...s, complete: s.done(d) }));
  const doneCount = steps.filter(s => s.complete).length;
  const minsLeft = steps.filter(s => !s.complete).reduce((n, s) => n + s.mins, 0);
  const next = steps.find(s => !s.complete) ?? null;
  return {
    steps,
    doneCount,
    total: steps.length,
    minsLeft,
    pct: Math.round((doneCount / steps.length) * 100),
    activated: doneCount === steps.length,
    nextStep: next,
  };
}

/* ===== Seller Aha (<5 นาที) — เปิดหน้าร้าน B2B พร้อมรับ RFQ =====
 * seed supply: ผู้ขาย (ที่ปรึกษา/ผู้ให้บริการ) เปิดร้านให้เสร็จเร็วสุด — วัดจากสถานะหน้าร้าน */

export interface SellerAhaInput { dbd: string; vp: string; published: boolean }

export interface SellerAhaStep {
  id: string; icon: string; label: string; hint: string; mins: number;
  done: (s: SellerAhaInput) => boolean;
}

/** 3 ก้าวสู่ "ร้านพร้อมรับ RFQ": ยืนยันหมวด → ให้ AI เขียนจุดขาย → เผยแพร่ (รวม ~5 นาที) */
export const SELLER_AHA_STEPS: SellerAhaStep[] = [
  {
    id: 'sector', icon: '🏷️', label: 'ยืนยันหมวดธุรกิจ (DBD)',
    hint: 'ให้ลูกค้า/ผู้ซื้อค้นเจอถูกหมวดในสารบัญตลาด', mins: 1,
    done: s => !!s.dbd.trim(),
  },
  {
    id: 'vp', icon: '✨', label: 'ให้ AI เขียนจุดขาย (VP)',
    hint: 'ประโยคแรกที่ผู้ซื้อเห็น — กด "ให้ AI Agent เขียน"', mins: 2,
    done: s => s.vp.trim().length >= 10,
  },
  {
    id: 'publish', icon: '🚀', label: 'เผยแพร่หน้าร้าน',
    hint: 'ออนไลน์ให้ค้นเจอ + เปิดรับ RFQ จากผู้ซื้อ', mins: 2,
    done: s => s.published,
  },
];

export interface SellerAhaState {
  steps: Array<SellerAhaStep & { complete: boolean }>;
  doneCount: number;
  total: number;
  minsLeft: number;
  pct: number;
  activated: boolean;
  nextStep: SellerAhaStep | null;
}

export function sellerAhaProgress(s: SellerAhaInput): SellerAhaState {
  const steps = SELLER_AHA_STEPS.map(st => ({ ...st, complete: st.done(s) }));
  const doneCount = steps.filter(st => st.complete).length;
  const minsLeft = steps.filter(st => !st.complete).reduce((n, st) => n + st.mins, 0);
  const next = steps.find(st => !st.complete) ?? null;
  return {
    steps,
    doneCount,
    total: steps.length,
    minsLeft,
    pct: Math.round((doneCount / steps.length) * 100),
    activated: doneCount === steps.length,
    nextStep: next,
  };
}
