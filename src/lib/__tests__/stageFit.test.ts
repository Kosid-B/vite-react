import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  stageOf, fitOf, stageFitReport, INITIATIVES, LOCKIN_MIN_PAYING,
  STAGE_LABEL, STAGE_QUESTION, type Initiative, type StageMetrics,
} from '../stageFit';
import { REACH_FLOOR_PER_WEEK, MIN_FOR_RATE } from '../growthPdca';

const m = (o: Partial<StageMetrics> = {}): StageMetrics => ({
  visitorsPerWeek: 0, visitorsTotal: 0, payingCustomers: 0, ...o,
});

describe('stageOf — เฟสต้องมาจากตัวเลข ไม่ใช่ความรู้สึก', () => {
  it('คนเข้าน้อยกว่าเพดาน = เฟส reach เสมอ ต่อให้มีลูกค้าจ่ายแล้ว', () => {
    // สำคัญ: มีลูกค้าจ่าย 50 ราย แต่คนเข้าหยุด ⇒ คอขวดกลับมาที่ reach
    expect(stageOf(m({ visitorsPerWeek: 10, payingCustomers: 50 }))).toBe('reach');
  });

  it('คนมาถึงแล้วแต่ยังไม่มีใครจ่าย = convert', () => {
    expect(stageOf(m({ visitorsPerWeek: REACH_FLOOR_PER_WEEK, payingCustomers: 0 }))).toBe('convert');
  });

  it('มีคนจ่ายแล้วแต่ยังไม่ถึงเกณฑ์ lock-in = retain', () => {
    expect(stageOf(m({ visitorsPerWeek: 200, payingCustomers: LOCKIN_MIN_PAYING - 1 }))).toBe('retain');
  });

  it('ถึงเกณฑ์แล้ว = scale', () => {
    expect(stageOf(m({ visitorsPerWeek: 200, payingCustomers: LOCKIN_MIN_PAYING }))).toBe('scale');
  });

  it('เส้นแบ่ง reach ใช้ค่าเดียวกับ growthPdca ไม่ใช่เลขที่เขียนซ้ำ', () => {
    expect(stageOf(m({ visitorsPerWeek: REACH_FLOOR_PER_WEEK - 1 }))).toBe('reach');
    expect(stageOf(m({ visitorsPerWeek: REACH_FLOOR_PER_WEEK }))).not.toBe('reach');
  });
});

describe('fitOf — งานที่ต้องมีลูกค้าก่อน ต้องถูกกันออกตอนยังไม่มี', () => {
  const later: Initiative = { id: 'x', label: 'x', needs: 'retain', why: 'w', unlock: 'u' };
  const now: Initiative = { id: 'y', label: 'y', needs: 'reach', why: 'w' };
  const never: Initiative = { id: 'z', label: 'z', needs: 'never', why: 'w' };

  it('งานเฟสหลังถูกกันออกตอนอยู่เฟส reach', () => {
    expect(fitOf(later, 'reach')).toBe('later');
  });
  it('งานเฟสหลังเปิดเมื่อถึงเฟสนั้น', () => {
    expect(fitOf(later, 'retain')).toBe('now');
    expect(fitOf(later, 'scale')).toBe('now');
  });
  it('งานที่ทำได้ทุกเฟส เปิดตั้งแต่ reach', () => {
    expect(fitOf(now, 'reach')).toBe('now');
  });
  it("'never' ห้ามเปิดแม้ในเฟสสูงสุด", () => {
    expect(fitOf(never, 'scale')).toBe('never');
  });
});

describe('รายการงานจริง — บังคับตามกฎของ skill', () => {
  it('ทุกงานต้องบอกได้ว่าทำไม (ห้ามปล่อยลอย)', () => {
    const noWhy = INITIATIVES.filter((i) => !i.why || i.why.trim().length < 20);
    expect(noWhy.map((i) => i.id)).toEqual([]);
  });

  it('งานที่เลื่อนออกไปต้องมี "ตัวเลขปลดล็อก" ห้ามเขียนว่าเมื่อโตกว่านี้', () => {
    const deferred = INITIATIVES.filter((i) => i.needs !== 'reach' && i.needs !== 'never');
    expect(deferred.length).toBeGreaterThan(0);
    const noNumber = deferred.filter((i) => !i.unlock || !/\d/.test(i.unlock));
    expect(noNumber.map((i) => i.id), 'ต้องมีตัวเลขใน unlock').toEqual([]);
    const vague = deferred.filter((i) => /เมื่อโตกว่านี้|ในอนาคต|ทีหลัง/.test(i.unlock ?? ''));
    expect(vague.map((i) => i.id)).toEqual([]);
  });

  it("งานที่ 'ห้ามทำ' ต้องบอกเหตุผลและติดป้าย 🚫", () => {
    const banned = INITIATIVES.filter((i) => i.needs === 'never');
    expect(banned.length).toBeGreaterThanOrEqual(3);
    expect(banned.filter((i) => !i.why.includes('🚫')).map((i) => i.id)).toEqual([]);
  });

  it('id ห้ามซ้ำ', () => {
    expect(new Set(INITIATIVES.map((i) => i.id)).size).toBe(INITIATIVES.length);
  });

  it('ต้องยังมีข้อห้าม 3 ข้อหลักจากคลิป — ถ้าใครลบออกต้องรู้ตัว', () => {
    const ids = INITIATIVES.filter((i) => i.needs === 'never').map((i) => i.id);
    expect(ids).toContain('data-hostage');    // ล็อกด้วยการไม่ให้ export
    expect(ids).toContain('too-big-to-fail');
    expect(ids).toContain('stop-marketing');  // "ของดีไม่ต้องโฆษณา"
  });
});

describe('stageFitReport — ใช้กับตัวเลขจริงของเรา (22 ส.ค. 2569)', () => {
  // 🟢 ตัวเลขจริงจาก production waigsnxhrlwtiotspaim:
  //    landing_funnel 7 วันล่าสุด = 19 คน · สะสม 79 คน
  //    skill_purchases 146 รายการ = admin-free ทั้งหมด ⇒ ลูกค้าจ่ายจริง 0 ราย
  const real = m({ visitorsPerWeek: 19, visitorsTotal: 79, payingCustomers: 0 });

  it('บอกว่าเราอยู่เฟส reach', () => {
    expect(stageFitReport(real).stage).toBe('reach');
  });

  it('ยังอ่านอัตราส่วนไม่ได้ (79 < MIN_FOR_RATE)', () => {
    expect(stageFitReport(real).canReadRates).toBe(false);
    expect(MIN_FOR_RATE).toBeGreaterThan(79);
  });

  it('งานที่ควรทำตอนนี้ ต้องไม่มีอะไรที่สมมติว่ามีลูกค้าอยู่แล้ว', () => {
    const r = stageFitReport(real);
    expect(r.now.map((i) => i.id)).toContain('search-console');
    expect(r.now.map((i) => i.id)).toContain('content-shortlinks');
    expect(r.now.map((i) => i.id)).not.toContain('video-orchestrator');
    expect(r.now.map((i) => i.id)).not.toContain('crm-sync');
    expect(r.now.map((i) => i.id)).not.toContain('data-lockin');
  });

  it('พาดหัวต้องบอกตัวเลขจริง ไม่ใช่คำว่า "ยังน้อย"', () => {
    const h = stageFitReport(real).headline;
    expect(h).toContain('19');
    expect(h).toContain(String(REACH_FLOOR_PER_WEEK));
  });

  it('ทุกงานต้องอยู่กองใดกองหนึ่งเสมอ ห้ามหาย', () => {
    const r = stageFitReport(real);
    expect(r.now.length + r.later.length + r.never.length).toBe(INITIATIVES.length);
  });

  it('พอถึงเฟส scale งานที่เคยเลื่อนต้องเปิด แต่ "ห้ามทำ" ต้องยังห้ามอยู่', () => {
    const big = m({ visitorsPerWeek: 500, visitorsTotal: 5000, payingCustomers: 40 });
    const r = stageFitReport(big);
    expect(r.stage).toBe('scale');
    expect(r.now.map((i) => i.id)).toContain('video-orchestrator');
    expect(r.never.map((i) => i.id)).toContain('data-hostage');
    expect(r.later).toEqual([]);
  });
});

describe('ป้ายกำกับครบทุกเฟส (กัน UI พังเงียบ)', () => {
  it('ทุกเฟสมีทั้ง label และคำถามประจำเฟส', () => {
    for (const s of ['reach', 'convert', 'retain', 'scale'] as const) {
      expect(STAGE_LABEL[s]?.length).toBeGreaterThan(3);
      expect(STAGE_QUESTION[s]?.length).toBeGreaterThan(3);
    }
  });
});

describe('ต่อสายจริงหรือยัง (บั๊กที่เกิดซ้ำที่สุดของโปรเจกต์: สร้างไว้แต่ไม่ได้ต่อ)', () => {
  const read = (p: string) =>
    readFileSync(resolve(__dirname, '../..', p), 'utf8').replace(/\r\n/g, '\n');

  /** ตัดคอมเมนต์ออกก่อนตรวจ — ไม่งั้นโค้ดที่ถูก comment ทิ้งไว้ยังทำให้เทสต์เขียว
   *  (เจอจริงตอนเขียนเทสต์นี้: ครอบ <StageFitPanel/> ด้วย JSX comment แล้วเทสต์ยังผ่าน) */
  const live = (p: string) =>
    read(p).replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  it('StageFitPanel ถูก import และเรนเดอร์จริงใน GrowthDashboard', () => {
    const dash = live('pages/AdminTabs/GrowthDashboard.tsx');
    expect(dash).toContain("from '../../components/StageFitPanel'");
    expect(dash, 'ต้องถูกเรนเดอร์จริง ไม่ใช่แค่ import หรือถูก comment ทิ้งไว้')
      .toMatch(/<StageFitPanel\b/);
  });

  it('แผงเรียก stageFitReport จริง ไม่ได้คำนวณเองข้าง ๆ', () => {
    const panel = live('components/StageFitPanel.tsx');
    expect(panel).toContain('stageFitReport');
    expect(panel).toContain("from '../lib/stageFit'");
  });

  it('แผงนับลูกค้าจากตัวนับที่ตัด admin-free ออกแล้ว ไม่ใช่นับทุกแถว', () => {
    const panel = read('components/StageFitPanel.tsx');
    expect(panel).toContain('payingCustomerCount');
    const pay = read('lib/payments.ts');
    expect(pay).toContain('isRealPayment');
  });

  it('แยก "ตรวจไม่ได้" ออกจาก "เป็น 0" — และ fail-closed เมื่อตรวจไม่ได้', () => {
    const panel = read('components/StageFitPanel.tsx');
    // ตรวจไม่ได้ต้องไม่ปลดล็อกงานเฟสหลัง
    expect(panel).toContain('unreadable');
    expect(panel).toMatch(/payingCustomers: unreadable \? 0 :/);
  });

  it('ตัวนับคืน null (ไม่ใช่ 0) เมื่ออ่านไม่ได้', () => {
    const pay = read('lib/payments.ts');
    const fn = pay.slice(pay.indexOf('export async function payingCustomerCount'));
    expect(fn).toContain('return null');
  });
});
