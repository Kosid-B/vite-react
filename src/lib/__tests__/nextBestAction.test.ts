import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { genomeFromApp } from '../genomeFromApp';
import { nextBestAction } from '../nextBestAction';
import { genomeStatus, stuckBranch } from '../businessGenome';
import { readinessFromGenome } from '../founderMindset';
import type { AppData } from '../../types';
import type { BusinessState } from '../decisionRules';

/** AppData เปล่า ๆ แบบที่ผู้ใช้ใหม่จริง ๆ มี — ใช้ cast เพราะเราสนใจแค่ช่องที่ mapper อ่าน */
const empty = (over: Partial<AppData> = {}) => ({ ...over } as AppData);

const CASE_001_ACQ: BusinessState = {
  sessions: 85, sessionsWithUtm: 2, sessionsDefaultSegment: 81, definedSegments: 5,
  leadCaptureMechanism: false, leads: 0, offerEvidence: 0,
};

describe('🔴 สะพานที่หายไป — ข้อมูลจริงในแอปต้องไหลเข้าจีโนม', () => {
  it('แอปว่าง = จีโนมว่าง (ห้ามเดาแทนผู้ใช้)', () => {
    const g = genomeFromApp(empty());
    expect(genomeStatus(g).every((b) => !b.complete)).toBe(true);
    expect(stuckBranch(g)?.key).toBe('business');
  });

  it('กรอก BMC + persona แล้ว กิ่ง customer ต้องขยับเอง ไม่ต้องถามซ้ำ (Dynamic PLG)', () => {
    const d = empty({
      businessModel: { bmc: { segments: ['เจ้าของร้านอาหาร'], value: ['รู้ต้นทุนต่อจานจริง'] } },
      personas: [{ name: 'พี่หน่อย', role: 'เจ้าของร้าน', goal: ['ลดต้นทุน'], pains: ['ไม่รู้ต้นทุนจริง'], fear: ['กลัวขาดทุน'] }],
    } as unknown as Partial<AppData>);
    const g = genomeFromApp(d);
    expect(g.customer?.segment).toBe('เจ้าของร้านอาหาร');
    expect(g.customer?.persona).toBe('พี่หน่อย');
    expect(g.customer?.jtbd).toBe('ลดต้นทุน');
    expect(g.offer?.valueProposition).toContain('รู้ต้นทุนต่อจานจริง');
  });

  it('🔴 ช่องที่ไม่มีข้อมูลจริง ต้องว่าง ไม่ใช่ใส่ค่าเริ่มต้น', () => {
    const g = genomeFromApp(empty({ personas: [{ name: 'x', role: 'y', goal: [], pains: [] }] } as unknown as Partial<AppData>));
    expect(g.acquisition?.cac).toBeUndefined();      // ไม่มีข้อมูลค่าโฆษณา = ห้ามคำนวณ
    expect(g.economics?.margin).toBeUndefined();     // มีด้านเดียวคำนวณอัตรากำไรไม่ได้
    expect(g.customer?.buyingTrigger).toBeUndefined();
  });

  it('🔴 มีรายรับด้านเดียว ยังไม่ถือว่ารู้เศรษฐศาสตร์', () => {
    const rev = genomeFromApp(empty({ finance: [{ id: '1', label: 'ขาย', amount: 500, kind: 'revenue', date: '2026-08-01' }] }));
    expect(rev.economics?.margin).toBeUndefined();
    const both = genomeFromApp(empty({ finance: [
      { id: '1', label: 'ขาย', amount: 500, kind: 'revenue', date: '2026-08-01' },
      { id: '2', label: 'ของ', amount: 200, kind: 'expense', date: '2026-08-01' },
    ] }));
    expect(both.economics?.margin).toContain('500');
  });

  it('🔴 KPI นับก็ต่อเมื่อตัววัดตอบได้ว่ามาจากอะไร (มาตรฐานเดียวกับ processRegister)', () => {
    const noWhy = genomeFromApp(empty({ processRegister: { standard: 'iso9001', processes: [
      { id: 'p1', name: 'รับออเดอร์', owner: '', clauses: [], metrics: [{ id: 'm1', name: 'จำนวนออเดอร์' }] },
    ] } } as unknown as Partial<AppData>));
    expect(noWhy.scale?.kpi).toBeUndefined();

    const withWhy = genomeFromApp(empty({ processRegister: { standard: 'iso9001', processes: [
      { id: 'p1', name: 'รับออเดอร์', owner: '', clauses: [], metrics: [{ id: 'm1', name: 'เวลาตอบกลับ', whyFrom: 'ความเสี่ยง R-03 ตอบช้าแล้วลูกค้าย้าย' }] },
    ] } } as unknown as Partial<AppData>));
    expect(withWhy.scale?.kpi).toBeTruthy();
  });

  it('🔴 outcome ที่ไม่มีบทเรียน ห้ามถูกเติมให้ครบ — ช่องนั้นตัดสินว่า validated หรือยัง', () => {
    const g = genomeFromApp(empty({ businessModel: { bmc: {}, de24: [], outcomes: [
      { id: 'o1', block: 'value', metric: 'ลูกค้าใหม่', target: 10, actual: 4, updatedAt: '2026-08-01' },
    ] } } as unknown as Partial<AppData>));
    expect(g.experiment?.result).toContain('4');
    expect(g.experiment?.learning).toBeUndefined();
  });
});

describe('🎯 Next Best Action — ตอบข้อเดียว ไม่ใช่รายการปัญหา', () => {
  it('ผู้ใช้ใหม่ → ขั้น "ไอเดีย" และงานแรกคือพิสูจน์ว่าปัญหามีจริง', () => {
    const r = nextBestAction(empty());
    expect(r.stage).toBe('ไอเดีย');
    expect(r.action).toMatch(/สัมภาษณ์ลูกค้าเป้าหมาย 10 คน/);
    expect(r.because).toMatch(/Problem validated\?/);
    expect(r.gaps.length).toBe(6);
  });

  it('🔴 ธุรกิจยังไม่พร้อม ต้องไม่ถูกส่งไปแก้เรื่องช่องทาง แม้ข้อมูลช่องทางจะแย่กว่า', () => {
    const r = nextBestAction(empty(), CASE_001_ACQ);
    // คอขวดฝั่งช่องทางถูกคำนวณไว้ให้ดูได้ แต่ "สิ่งที่ต้องทำ" ยังเป็นเรื่องธุรกิจ
    expect(r.bottleneck).toBe('measurement-readiness');
    expect(r.action).toMatch(/สัมภาษณ์ลูกค้า/);
  });

  /* 🟡 ผลจริงของ mapper (ตรวจ 24 ส.ค. 2569) — บันทึกไว้เป็นข้อเท็จจริง ไม่ใช่เป้าหมาย
   * เติมได้ครบ: business · problem · offer · experiment
   * เติมไม่ได้: customer.buyingTrigger · acquisition.cac · economics.cac · scale ทั้งกิ่ง
   * ⇒ นี่คือรายการช่องที่ "แบบเช็ก 6 ข้อ" ต้องถาม เพราะแอปยังไม่มีที่เก็บ
   *   (ห้ามเติมมั่วให้ครบ — จีโนมที่ถูกเดา ทำให้ stuckBranch ชี้ผิดกิ่ง) */
  it('mapper เติมด่านที่ข้อมูลพอจริง ๆ และปล่อยด่านที่ยังไม่มีที่เก็บไว้ว่าง', () => {
    const full = empty({
      aiCompany: { goal: 'มีรายได้เสริม', industry: 'อาหาร' },
      businessModel: { bmc: {
        segments: ['เจ้าของร้าน'], value: ['รู้ต้นทุนจริง'], revenue: ['ขายรายเดือน'], channels: ['เฟซบุ๊ก'],
      }, de24: [], outcomes: [{ id: 'o', block: 'value', metric: 'ลูกค้าใหม่', target: 10, actual: 6, note: 'คนสนใจเรื่องต้นทุนมากกว่าเรื่องระบบ', updatedAt: '2026-08-01' }] },
      personas: [{ name: 'พี่หน่อย', role: 'เจ้าของร้าน', goal: ['ลดต้นทุน'], pains: ['ไม่รู้ต้นทุน'], fear: ['กลัวขาดทุน'] }],
      marketInsight: { savedAt: '2026-08-01', segments: [{ name: 'ร้านอาหาร' }] },
      feedback: { period: 'ส.ค.', themes: [{ id: 't', name: 'ต้นทุน' }], entries: [] },
      finance: [
        { id: '1', label: 'ขาย', amount: 5000, kind: 'revenue', date: '2026-08-01' },
        { id: '2', label: 'ของ', amount: 2000, kind: 'expense', date: '2026-08-01' },
      ],
      roi: { avgDealValue: 1500, teamHourlyRate: 0, monthlyRevenueTarget: 0, stageCosts: [] },
    } as unknown as Partial<AppData>);
    const ready = readinessFromGenome(genomeFromApp(full));
    expect(ready.problem).toBe(true);
    expect(ready.offer).toBe(true);
    expect(ready.evidence).toBe(true);
    // 🔴 ด่านที่ยังต้องถามผู้ใช้ — แอปไม่มีช่องเก็บทริกเกอร์การซื้อ / CAC / ทะเบียนกระบวนการ
    expect(ready.customer).toBe(false);
    expect(ready.unitEconomics).toBe(false);
    expect(ready.tracking).toBe(false);
  });

  it('กรอกทะเบียนกระบวนการแล้ว กิ่ง scale ต้องขยับ — สายจากหน้าอื่นต้องถึงจีโนมจริง', () => {
    const withProcess = empty({
      processRegister: { standard: 'iso9001', processes: [
        { id: 'p1', name: 'รับออเดอร์', owner: 'เจ้าของ', clauses: ['8.2'],
          metrics: [{ id: 'm1', name: 'เวลาตอบกลับ', whyFrom: 'ความเสี่ยง R-03 ตอบช้าแล้วลูกค้าย้ายไปเจ้าอื่น' }] },
      ] },
      iso9001: { enabled: true, nonconformities: [{ id: 'n1' }] },
    } as unknown as Partial<AppData>);
    const g = genomeFromApp(withProcess);
    expect(g.scale?.process).toContain('1 กระบวนการ');
    expect(g.scale?.kpi).toBeTruthy();
    expect(g.scale?.managementSystem).toBe('ISO 9001');
  });

  it('🔴 ไม่มีข้อมูลฝั่งช่องทาง = ต้องประกาศเป็นจุดบอด ห้ามเงียบ', () => {
    const r = nextBestAction(empty());
    expect(r.blindSpots.join(' ')).toMatch(/ตรวจไม่ได้/);
    expect(r.bottleneck).toBeNull();
  });

  it('ความคืบหน้าจีโนมต้องเป็น 0 เมื่อยังไม่กรอกอะไร และเพิ่มขึ้นเมื่อกรอก', () => {
    expect(nextBestAction(empty()).genomeCompletePct).toBe(0);
    const some = nextBestAction(empty({
      aiCompany: { goal: 'มีรายได้เสริม', industry: 'อาหาร' },
      businessModel: { bmc: { segments: ['เจ้าของร้าน'] } },
    } as unknown as Partial<AppData>));
    expect(some.genomeCompletePct).toBeGreaterThan(0);
    expect(some.genomeCompletePct).toBeLessThan(100);
  });
});

/* ── 🔴 "เขียนถูก ≠ ถูกเรียกใช้" — ชั้นที่เอนจินก่อนหน้านี้ทั้งหมดตกม้าตาย ────────
 * Architecture Consolidation Audit พบว่าเอนจินถูกเขียนครบ มีเทสต์ครบ
 * แต่ไม่มีผู้ใช้คนไหนเคยเห็นผลของมัน ⇒ เทสต์นี้เฝ้าว่าสายไปถึงหน้าจอจริง
 * ──────────────────────────────────────────────────────────────────────── */
describe('🔴 Next Best Action ต้องไปถึงผู้ใช้จริง ไม่ใช่อยู่แต่ใน lib', () => {
  const read = (rel: string) => readFileSync(resolve(__dirname, '../..', rel), 'utf8');

  it('มีการ์ดที่เรียก nextBestAction จริง', () => {
    expect(read('components/NextBestActionCard.tsx')).toMatch(/nextBestAction\(/);
  });

  it('การ์ดถูกวางในหน้า Dashboard จริง', () => {
    expect(read('pages/Dashboard.tsx')).toMatch(/<NextBestActionCard\b/);
  });

  it('🔴 ข้อเสนอต้องมาก่อนที่มา — ที่มาอยู่ใน <details> ไม่ใช่ข้อความที่ต้องอ่านผ่าน', () => {
    const tsx = read('components/NextBestActionCard.tsx');
    expect(tsx.indexOf('nba-action')).toBeLessThan(tsx.indexOf('nba-why'));
    expect(tsx).toMatch(/<details/);
  });

  it('ทุกกิ่งจีโนมต้องมีหน้าปลายทางจริง — ห้ามชี้ไปหน้าที่ไม่มีอยู่', async () => {
    const { GENOME_BRANCHES } = await import('../businessGenome');
    const tsx = read('components/NextBestActionCard.tsx');
    for (const b of GENOME_BRANCHES) {
      expect(tsx, `ไม่มีปลายทางของกิ่ง ${b.key}`).toContain(`${b.key}:`);
    }
  });
});
