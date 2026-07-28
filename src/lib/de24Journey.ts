/** MIT 24-Step Guided Journey — คำนวณ "ขั้นถัดไปที่ต้องทำ" จากข้อมูลจริง (businessModel.de24)
 *  ทำให้ 24 ขั้นเป็น "เส้นทางเดินทีละขั้น" (ไม่ข้ามขั้น) แทน checklist ที่โผล่มาทั้ง 24 พร้อมกัน
 *  pure · ทดสอบได้ · ใช้โดย components/De24Guide.tsx บนหน้า bmc */

import type { AppData } from '../types';
import { DE24_DEFS, DE24_PHASE_LABELS, type De24StepDef } from './de24Sync';

/** เจตนาของแต่ละระยะ — ทำไมต้องทำระยะนี้ก่อนไปต่อ (เสริม "สร้างต้นน้ำให้แข็งแรงก่อน") */
export const DE24_PHASE_INTENT = [
  'รู้ให้ชัดก่อนว่า “ลูกค้าคือใคร” — ทั้งธุรกิจสร้างจากจุดนี้ ถ้าเลือกลูกค้าผิด ที่เหลือพังหมด',
  'ออกแบบ “คุณค่า” ที่ลูกค้ากลุ่มนี้ยอมจ่าย — และพิสูจน์ว่าเราต่างจากคู่แข่งจริง',
  'ทำให้ธุรกิจ “อยู่ได้” — ขายอย่างไร ตั้งราคาเท่าไร คุ้มทุนไหม (LTV:COCA ≥ 3:1)',
  'ทดสอบกับของจริงก่อนทุ่มสุดตัว — แล้ววางแผนขยายอย่างมีระบบ',
];

export interface De24JourneyStep {
  index: number;      // 0..23
  num: number;        // 1..24 (index+1)
  phase: number;      // 0..3
  phaseLabel: string;
  name: string;
  guide: string;
}

export interface De24Journey {
  total: number;              // 24
  done: number;               // จำนวนขั้นที่ทำเสร็จ
  pct: number;                // % รวม
  complete: boolean;          // ครบ 24 ขั้นแล้ว
  started: boolean;           // เริ่มแล้วอย่างน้อย 1 ขั้น
  current: De24JourneyStep | null;   // ขั้นถัดไปที่ต้องทำ (ขั้นแรกที่ยัง !done) — null เมื่อ complete
  next: De24JourneyStep | null;      // ขั้นถัดจาก current (พรีวิว) — null ถ้าไม่มี/complete
  phaseIntent: string;               // เจตนาของระยะปัจจุบัน ('' เมื่อ complete)
  phaseProgress: { index: number; label: string; done: number; total: number } | null;
}

const toStep = (d: De24StepDef): De24JourneyStep => ({
  index: d.index, num: d.index + 1, phase: d.phase,
  phaseLabel: DE24_PHASE_LABELS[d.phase] ?? '', name: d.name, guide: d.guide,
});

export function de24Journey(data: AppData): De24Journey {
  const de24 = data.businessModel?.de24 ?? [];
  const isDone = (i: number) => !!de24[i]?.done;
  const done = DE24_DEFS.filter(d => isDone(d.index)).length;
  const total = DE24_DEFS.length;

  // ขั้นถัดไป = ขั้นแรก (ตามลำดับ) ที่ยังไม่ done — บังคับเดินทีละขั้น ไม่ข้าม
  const currentDef = DE24_DEFS.find(d => !isDone(d.index)) ?? null;
  const current = currentDef ? toStep(currentDef) : null;
  const nextDef = current ? DE24_DEFS.find(d => d.index > current.index) ?? null : null;

  const phaseProgress = current
    ? {
        index: current.phase,
        label: current.phaseLabel,
        done: DE24_DEFS.filter(d => d.phase === current.phase && isDone(d.index)).length,
        total: DE24_DEFS.filter(d => d.phase === current.phase).length,
      }
    : null;

  return {
    total, done,
    pct: Math.round((done / total) * 100),
    complete: current === null,
    started: done > 0,
    current,
    next: nextDef ? toStep(nextDef) : null,
    phaseIntent: current ? (DE24_PHASE_INTENT[current.phase] ?? '') : '',
    phaseProgress,
  };
}
