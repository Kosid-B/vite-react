import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { APP_BEATS, FAKE_RELIEF, OPEN_LOOP_QUESTIONS, openLoopFor, appArcBlock, gapProgress } from '../appArc';
import { arcIssues, flatnessDebt } from '../emotionalArc';
import { READINESS_CHECKS } from '../founderMindset';
import { violatesBrand } from '../brandBrief';
import { DEFAULT_DATA } from '../../data';
import type { AppData } from '../../types';

const src = (f: string) => readFileSync(resolve(__dirname, '..', f), 'utf8');
const file = (p: string) => readFileSync(resolve(__dirname, '../..', p), 'utf8');

describe('จังหวะในระบบ — โครงสร้าง', () => {
  it('ต้องเริ่มด้วยความตึง และสลับ ไม่ใช่ตึงรวดเดียวหรือโล่งรวดเดียว', () => {
    expect(APP_BEATS[0].phase).toBe('tension');
    expect(APP_BEATS.filter((b) => b.phase === 'tension').length).toBeGreaterThanOrEqual(2);
    expect(APP_BEATS.filter((b) => b.phase === 'relief').length).toBeGreaterThanOrEqual(3);
  });

  it('🔴 ใช้ตัวตรวจตัวเดียวกับหน้า Landing — ห้ามเขียนตรรกะจังหวะซ้ำสองที่', () => {
    const order = APP_BEATS.map((b) => ({ sec: b.key, phase: b.phase }));
    expect(arcIssues(order).filter((i) => i.level === 'blocker')).toEqual([]);
    expect(flatnessDebt(order)).toBe(0);
    // ไฟล์ต้องนำเข้าจาก emotionalArc จริง ไม่ใช่ประกาศ type เองแล้วบังเอิญชื่อตรงกัน
    expect(src('appArc.ts')).toMatch(/from '\.\/emotionalArc'/);
  });

  it('🔴 ทุกจังหวะต้องมีของจริงในโค้ดทำหน้าที่ — ห้ามอ้างของที่ยังไม่ได้สร้าง', () => {
    for (const b of APP_BEATS) {
      expect(b.deliveredBy.length, b.key).toBeGreaterThan(15);
      expect(b.honestBecause.length, `${b.key} ไม่ได้บอกว่าซื่อสัตย์ได้เพราะอะไร`).toBeGreaterThan(25);
      expect(b.when.length, b.key).toBeGreaterThan(5);
    }
    // สุ่มตรวจว่าของที่อ้างมีอยู่จริง
    expect(src('appArc.ts')).toMatch(/openLoopFor/);
    expect(src('nextBestAction.ts')).toMatch(/action:/);
    expect(src('businessGenome.ts')).toMatch(/stuckBranch/);
    expect(src('opsMetrics.ts')).toMatch(/evaluatePerformance|MIN_ENTRIES_FOR_SCORE/);
    // 🔴 จังหวะ next-gap ต้องมี "ของบนหน้าจอ" จริง ไม่ใช่แค่ฟังก์ชัน
    expect(file('components/NextBestActionCard.tsx'), 'ไม่มีป้าย "ปิดได้แล้ว" บนการ์ด').toMatch(/nba-closed/);
    expect(file('components/NextBestActionCard.tsx')).toMatch(/gapProgress/);
  });
});

describe('คำถามเปิดวง', () => {
  it('ต้องมีคำถามครบทุกด่านความพร้อม — เพิ่มด่านแล้วไม่เพิ่มคำถาม = แดง', () => {
    for (const c of READINESS_CHECKS) {
      expect(OPEN_LOOP_QUESTIONS[c.key], `ไม่มีคำถามสำหรับด่าน ${c.key}`).toBeTruthy();
    }
  });

  it('🔴 ต้องเป็น "คำถาม" ที่ตอบไม่ได้ถ้าไม่รู้ตัวเลขตัวเอง ไม่ใช่คำแถลง', () => {
    for (const [k, q] of Object.entries(OPEN_LOOP_QUESTIONS)) {
      expect(q, `${k} สั้นเกินกว่าจะเป็นคำถามจริง`).toMatch(/ไหม|เท่าไหร่|กี่|ยังไง|อะไร/);
      expect(q.length, k).toBeGreaterThan(20);
      // ต้องพูดกับ "เขา" ไม่ใช่พูดถึงระบบเรา
      expect(q, `${k} ไม่ได้พูดถึงธุรกิจของผู้ใช้`).toMatch(/คุณ/);
    }
  });

  it('🔴 ห้ามเป็นการเอาชื่อด่านภายในมาเขียนใหม่ (ป้ายภายใน ≠ คำถามกับคน)', () => {
    for (const c of READINESS_CHECKS) {
      expect(OPEN_LOOP_QUESTIONS[c.key].toLowerCase()).not.toContain(c.q.toLowerCase());
    }
  });

  it('คำถามทุกข้อต้องผ่านด่านคำต้องห้ามของแบรนด์', () => {
    for (const [k, q] of Object.entries(OPEN_LOOP_QUESTIONS)) {
      expect(violatesBrand(q), `${k}: ${q}`).toEqual([]);
    }
  });

  it('🔴 ไม่มีช่องว่าง = ไม่มีคำถาม — ห้ามแต่งความตึงขึ้นมา', () => {
    // ธุรกิจที่ยังไม่กรอกอะไรเลย ต้องมีคำถาม
    expect(openLoopFor(DEFAULT_DATA as AppData)).not.toBeNull();
    // และคำถามที่ได้ต้องเป็นตัวจริงจากตาราง ไม่ใช่ข้อความที่ประกอบขึ้นมาสด ๆ
    const loop = openLoopFor(DEFAULT_DATA as AppData)!;
    expect(Object.values(OPEN_LOOP_QUESTIONS)).toContain(loop.question);
    expect(loop.why.length).toBeGreaterThan(20);
  });
});

describe('ความโล่งปลอม', () => {
  it('🔴 ทุกข้อต้องมี "ใช้อะไรแทน" — กฎที่ห้ามเฉย ๆ จะถูกละเมิดตอนตัวเลขการใช้งานตก', () => {
    expect(FAKE_RELIEF.length).toBeGreaterThanOrEqual(4);
    for (const f of FAKE_RELIEF) {
      expect(f.insteadUse.length, f.trick).toBeGreaterThan(25);
      expect(f.why.length, f.trick).toBeGreaterThan(20);
    }
  });

  it('🔴 อย่างน้อยครึ่งหนึ่งต้องอ้างของที่เคยเกิดกับระบบนี้จริง ไม่ใช่ตัวอย่างลอย ๆ', () => {
    const real = FAKE_RELIEF.filter((f) => f.happenedHere && f.happenedHere.length > 20);
    expect(real.length).toBeGreaterThanOrEqual(2);
  });
});

describe('🔴 ป้ายต้องมีของจริงรองรับ — อ่านไฟล์หน้าจอตัวจริง', () => {
  const card = file('components/NextBestActionCard.tsx');

  it('การ์ดบนสุดของ Dashboard ต้องแสดงคำถามก่อนสถานะและก่อนข้อเสนอ', () => {
    const iLoop = card.indexOf('nba-loop');
    const iHd = card.indexOf('nba-hd');
    const iAction = card.indexOf('nba-action');
    expect(iLoop, 'การ์ดไม่มีจุดตึงเลย').toBeGreaterThan(-1);
    expect(iLoop, 'คำถามอยู่หลังสถานะ = เปิดด้วยความโล่ง').toBeLessThan(iHd);
    expect(iLoop, 'คำถามอยู่หลังข้อเสนอ').toBeLessThan(iAction);
  });

  it('การ์ดต้องเรียกคำถามจาก openLoopFor จริง ไม่ใช่เขียนข้อความตายตัว', () => {
    expect(card).toMatch(/openLoopFor/);
  });

  it('การ์ดยังคงแสดง "ข้อเสนอข้อเดียว" ตามกฎ DMAIC', () => {
    expect(card).toMatch(/r\.action/);
  });

  it('Dashboard ต้องยังวางการ์ดนี้ไว้บนสุด', () => {
    const dash = file('pages/Dashboard.tsx');
    const iCard = dash.indexOf('<NextBestActionCard');
    const iKpi = dash.indexOf('KPI Cards');
    expect(iCard).toBeGreaterThan(-1);
    expect(iCard, 'ตัวเลขมาก่อนข้อเสนอ').toBeLessThan(iKpi);
  });
});

describe('จังหวะในระบบต้องเดินทางไปกับ prompt', () => {
  it('appArcBlock มีทั้งจังหวะ ของแทนที่ และกฎเรื่องรางวัล', () => {
    const b = appArcBlock();
    for (const beat of APP_BEATS) expect(b).toContain(beat.key);
    for (const f of FAKE_RELIEF) expect(b).toContain(f.insteadUse);
    expect(b).toMatch(/รางวัลทุกชิ้นต้องผูกกับสิ่งที่ผู้ใช้สร้างขึ้นจริง/);
  });
});


/* ══════════════════════════════════════════════════════════════════════════
 * จังหวะ `next-gap` — "ปิดได้แล้ว → แต่ยังเหลืออีก" (คือจังหวะที่ทำให้กลับมาใช้ซ้ำ)
 * 🔴 สิ่งที่กัน: อ้างว่าผู้ใช้ "เพิ่งทำอะไรสำเร็จ" ทั้งที่เราแค่ไม่มีค่าเทียบ
 * ══════════════════════════════════════════════════════════════════════════ */
describe('ความคืบหน้าของด่าน', () => {
  const d = DEFAULT_DATA as AppData;

  it('ตัวหารต้องเท่ากับจำนวนด่านจริง — เพิ่มด่านแล้วตัวเลขต้องขยับเอง', () => {
    expect(gapProgress(d, null).total).toBe(READINESS_CHECKS.length);
  });

  it('ปิด + เหลือ ต้องรวมกันได้เท่าทั้งหมดเสมอ', () => {
    const g = gapProgress(d, null);
    expect(g.closed + g.remaining).toBe(g.total);
  });

  it('🔴 ไม่มีค่าเทียบ = ห้ามอ้างว่าเพิ่งปิดอะไร (fail-closed)', () => {
    expect(gapProgress(d, null).justClosed).toBe(0);
    expect(gapProgress(d, Number.NaN).justClosed).toBe(0);
  });

  it('ผ่านเพิ่มขึ้นจริง → บอกจำนวนที่เพิ่ม', () => {
    const g = gapProgress(d, null);
    expect(gapProgress(d, g.closed - 2).justClosed).toBe(2);
  });

  it('🔴 ข้อมูลถูกลบจนถอยหลัง → 0 ไม่ใช่ค่าติดลบ (ห้ามโชว์ "ปิดเพิ่ม -1")', () => {
    const g = gapProgress(d, null);
    expect(gapProgress(d, g.closed + 3).justClosed).toBe(0);
  });
});
