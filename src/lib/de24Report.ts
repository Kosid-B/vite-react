/** สรุปผล MIT 24-Step → Markdown/PDF + ตั้งต้น BMC — pure, ทดสอบได้
 *  ผู้ใช้เอาผล 24 ขั้นไปพัฒนาต่อ (export) และให้ CEO ใช้ออกแบบ Business Model Canvas
 *  อยู่ใน ecosystem: businessModel.de24 (ต้นทาง) → รายงาน + seed businessModel.bmc (ปลายทาง) */

import type { AppData, BMCData } from '../types';
import { DE24_DEFS, DE24_PHASE_LABELS } from './de24Sync';

export interface De24Summary {
  doneCount: number;
  pct: number;
  phases: Array<{ index: number; label: string; steps: Array<{ index: number; name: string; done: boolean; notes: string }> }>;
}

const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();

export function de24Summary(data: AppData): De24Summary {
  const de24 = data.businessModel?.de24 ?? [];
  const get = (i: number) => de24[i] ?? { done: false, notes: '' };
  const doneCount = DE24_DEFS.filter(d => get(d.index).done).length;
  const phases = DE24_PHASE_LABELS.map((label, pi) => ({
    index: pi,
    label,
    steps: DE24_DEFS.filter(d => d.phase === pi).map(d => {
      const s = get(d.index);
      return { index: d.index, name: d.name, done: !!s.done, notes: clean(s.notes) };
    }),
  }));
  return { doneCount, pct: Math.round((doneCount / DE24_DEFS.length) * 100), phases };
}

/** BMC block ← ขั้น DE24 ไหนป้อน (ใช้ทั้งใน markdown mapping และ seed) */
export const BMC_FROM_DE24: Array<{ block: keyof BMCData; label: string; steps: number[] }> = [
  { block: 'segments',      label: 'กลุ่มลูกค้า',       steps: [0, 1, 2, 4] },
  { block: 'value',         label: 'คุณค่าที่นำเสนอ',    steps: [6, 7, 9] },
  { block: 'channels',      label: 'ช่องทาง',           steps: [12, 17] },
  { block: 'relationships', label: 'ความสัมพันธ์ลูกค้า', steps: [5] },
  { block: 'revenue',       label: 'กระแสรายได้',       steps: [14, 15, 16] },
  { block: 'costs',         label: 'โครงสร้างต้นทุน',    steps: [18] },
  { block: 'activities',    label: 'กิจกรรมหลัก',       steps: [20, 21, 23] },
  { block: 'resources',     label: 'ทรัพยากรหลัก',      steps: [9] },
  { block: 'partners',      label: 'พันธมิตรหลัก',      steps: [10] },
];

const stepName = (i: number) => DE24_DEFS.find(d => d.index === i)?.name ?? `ขั้น ${i + 1}`;

/** ดึงโน้ตจากขั้นที่ "ทำแล้ว + มีโน้ต" มาเป็นค่าตั้งต้นของแต่ละ BMC block */
export function de24ToBmcSeed(data: AppData): Partial<BMCData> {
  const de24 = data.businessModel?.de24 ?? [];
  const seed: Partial<BMCData> = {};
  for (const m of BMC_FROM_DE24) {
    const items = m.steps
      .map(i => ({ i, note: clean(de24[i]?.notes ?? ''), done: !!de24[i]?.done }))
      .filter(x => x.done && x.note)
      .map(x => x.note);
    if (items.length) seed[m.block] = items;
  }
  return seed;
}

export interface ReportOpts { company?: string; date?: string; }

/** รายงาน Markdown เต็ม — หัวข้อ + ทุกขั้น (ทำแล้ว/โน้ต) + ตารางแมป → BMC */
export function de24Markdown(data: AppData, opts: ReportOpts = {}): string {
  const sum = de24Summary(data);
  const company = clean(opts.company ?? data.aiCompany?.name ?? 'บริษัทของฉัน');
  const L: string[] = [];
  L.push(`# สรุปผล MIT 24-Step (Disciplined Entrepreneurship)`);
  L.push('');
  L.push(`**บริษัท:** ${company}  `);
  if (opts.date) L.push(`**วันที่:** ${opts.date}  `);
  L.push(`**ความคืบหน้า:** ${sum.doneCount}/24 ขั้น (${sum.pct}%)`);
  L.push('');
  for (const ph of sum.phases) {
    L.push(`## ระยะ ${ph.index + 1}: ${ph.label}`);
    L.push('');
    for (const s of ph.steps) {
      L.push(`### ${s.index + 1}. ${s.name} ${s.done ? '✅' : '⬜️'}`);
      L.push(s.notes ? s.notes : '_(ยังไม่มีบันทึก)_');
      L.push('');
    }
  }
  L.push('## → นำไปออกแบบ Business Model Canvas (BMC)');
  L.push('');
  L.push('| BMC Block | มาจากขั้น | ข้อมูลที่ได้ |');
  L.push('|---|---|---|');
  const de24 = data.businessModel?.de24 ?? [];
  for (const m of BMC_FROM_DE24) {
    const notes = m.steps.filter(i => de24[i]?.done && clean(de24[i]?.notes ?? ''))
      .map(i => clean(de24[i].notes));
    const from = m.steps.map(i => `${i + 1}.${stepName(i)}`).join(', ');
    L.push(`| ${m.label} | ${from} | ${notes.length ? notes.join(' · ') : '—'} |`);
  }
  L.push('');
  L.push('_สร้างจาก CEO AI Thailand — ผล 24-Step ถูกแปลงเป็นค่าตั้งต้น BMC ให้อัตโนมัติในแอป_');
  return L.join('\n');
}
