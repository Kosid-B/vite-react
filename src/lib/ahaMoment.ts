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
