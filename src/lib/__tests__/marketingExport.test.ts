import { describe, it, expect } from 'vitest';
import { buildExport, describeSeg, toMarketingCode, type SegRow } from '../marketingExport';
import { MIN_FOR_RATE } from '../growthPdca';

/* ══════════════════════════════════════════════════════════════════════════
 * ทิศทาง: CEO AI Thailand ──export──▶ Marketing OS (เจ้าของยืนยัน 15 พ.ย. 2569)
 *
 * 🔴 สิ่งที่เทสต์ชุดนี้กัน ไม่ใช่ "ตัวเลขผิด" แต่คือ **อีกระบบสรุปผิดแทนเรา**
 *    อีกระบบไม่รู้กฎของเรา (MIN_FOR_RATE · zeroIsNotProof · ledger #43)
 *    ⇒ ถ้าส่งตัวเลขเปล่าไป 0/7 จะถูกอ่านเป็น "กลุ่มนี้ไม่เวิร์ก" แล้วถูกตัดทิ้ง
 * ══════════════════════════════════════════════════════════════════════════ */

/** ของจริงจาก production 15 พ.ย. 2569 (landing_funnel 361 แถว) */
const REAL: SegRow[] = [
  { seg: 'default', visitors: 342, cta: 8, signup: 4 },
  { seg: 'newbie', visitors: 7, cta: 0, signup: 0 },
  { seg: 'owner', visitors: 6, cta: 0, signup: 0 },
  { seg: 'seller', visitors: 5, cta: 0, signup: 0 },
  { seg: 'food', visitors: 1, cta: 1, signup: 0 },
];

describe('🔴 ห้ามส่งอัตราที่ยังสรุปไม่ได้ออกไป', () => {
  it(`คนน้อยกว่า ${MIN_FOR_RATE} ⇒ signupRate ต้องเป็น null ห้ามเป็น 0`, () => {
    const r = describeSeg({ seg: 'newbie', visitors: 7, cta: 0, signup: 0 });
    expect(r.signupRate).toBeNull();
    expect(r.signupRate).not.toBe(0);
    expect(r.trust).toBe('not-found-yet');
  });

  it('0 จาก 7 ต้องอธิบายว่า "ยังไม่พบ" ไม่ใช่ "ไม่เวิร์ก"', () => {
    const r = describeSeg({ seg: 'newbie', visitors: 7, cta: 0, signup: 0 });
    expect(r.note).toContain('ยังไม่พบ');
    expect(r.note).toContain(String(MIN_FOR_RATE));
  });

  it('มีคนสมัครจริงแต่ฐานน้อย = too-few · ยังต้องไม่ให้อัตรา', () => {
    const r = describeSeg({ seg: 'x', visitors: 10, cta: 3, signup: 2 });
    expect(r.trust).toBe('too-few');
    expect(r.signupRate).toBeNull();
    expect(r.note).toContain('ความบังเอิญ');
  });

  it(`ฐาน ≥ ${MIN_FOR_RATE} ⇒ ให้อัตราได้ และต้องคำนวณถูก`, () => {
    const r = describeSeg({ seg: 'default', visitors: 342, cta: 8, signup: 4 });
    expect(r.trust).toBe('conclusive');
    expect(r.signupRate).toBeCloseTo(4 / 342, 10);
  });

  it('🔴 ของจริงวันนี้: มีแค่ default ที่สรุปได้ — อีก 4 กลุ่มห้ามมีอัตรา', () => {
    const b = buildExport(REAL, '2026-11-15T00:00:00Z');
    const withRate = b.segments.filter((s) => s.signupRate !== null).map((s) => s.seg);
    expect(withRate).toEqual(['default']);
  });
});

describe('แมปรหัสกลุ่มข้ามระบบ', () => {
  it('รหัสฝั่งเรา → รหัสฝั่ง Marketing OS', () => {
    expect(toMarketingCode('newbie').code).toBe('newbie');
    expect(toMarketingCode('owner').code).toBe('growth');   // แก้ 15 พ.ย. 69 — เดิมแมป seller ผิด
    expect(toMarketingCode('sidebiz').code).toBe('employee');
    expect(toMarketingCode('audit').code).toBe('audit');
  });

  /* 🟢 แก้ 19 พ.ย. 2569 — `seller` **ขึ้นที่ปลายทางจริงแล้ว**
   *    ยืนยันสดผ่าน MCP: marketing_audience_segments มี code='seller'
   *    ⇒ เลิกเป็น PENDING_UPSTREAM · ย้ายเข้า SEG_CODE_MAP แล้ว
   *    เทสต์เดิมเคยบังคับว่าต้องคืน null ("ตกลงแล้ว ≠ มีแล้ว") — ตอนนี้ "มีแล้ว" จริง */
  it('🟢 seller แมปได้แล้ว — ปลายทางเพิ่มให้จริง (ตรวจสด 19 พ.ย. 69)', () => {
    expect(toMarketingCode('seller').code).toBe('seller');
    expect(toMarketingCode('seller').layer).toBe('growth');
  });

  it('🔴 รหัสที่ทะเบียนของเขาไม่มี ต้องคืน null — ห้ามเดาให้ใกล้เคียง', () => {
    // food/palm = ประเภทธุรกิจ คนละแกนกับทะเบียนกลุ่ม ⇒ ต้องไม่มีรหัสฝั่งเขาตลอดไป
    expect(toMarketingCode('food').code).toBeNull();
    expect(toMarketingCode('palm').code).toBeNull();
    expect(toMarketingCode('ไม่มีจริง').code).toBeNull();
  });

  it('🔴 รหัสที่แมปไม่ได้ ต้องถูกประกาศเป็นจุดบอด ไม่ใช่หายเงียบ', () => {
    const b = buildExport(REAL, '2026-11-19T00:00:00Z');
    // 🔴 แยก 3 กอง — ของที่ตัดสินใจไปแล้ว ต้องไม่จมปนกับของที่ยังไม่มีใครตัดสิน
    const bizType = b.blindSpots.find((s) => s.includes('ประเภทธุรกิจ ไม่ใช่กลุ่มเป้าหมาย'));
    expect(bizType, 'food = คนละแกน ห้ามเข้าทะเบียน segment').toContain('food');
    // 🟢 กองที่รอปลายทางเพิ่ม ต้องว่างแล้ว — seller ขึ้นจริงแล้ว
    expect(b.blindSpots.find((s) => s.includes('ยังไม่ยืนยันว่ามีจริง')), 'ไม่มีรหัสไหนค้างรอแล้ว').toBeUndefined();
    // 🔴 `default` ไม่ใช่ "กลุ่มที่ทะเบียนขาด" แต่คือ "ยังไม่ติดแท็ก" — คนละปัญหา
    //    ถ้านับรวม จะมี 342/361 แถวติดธงจนคำเตือนจริงถูกกลบ
    expect(b.blindSpots.join(' '), 'default ต้องไม่ถูกนับเป็นกลุ่มที่ทะเบียนขาด').not.toMatch(/ยังไม่มีใครตัดสินใจเลย:.*default/);
  });

  /* 🔴 กลไก PENDING_UPSTREAM ต้องยังทำงาน แม้ตอนนี้จะว่าง
   *    ถ้าใครลบ map ทิ้งเพราะ "ไม่มีใครใช้" รอบหน้าจะไม่มีที่พักให้ของที่ตกลงแต่ยังไม่มี
   *    แล้วมันจะถูกยัดเข้า SEG_CODE_MAP ทันทีทั้งที่ปลายทางยังไม่มี = join หล่นเงียบ ๆ */
  it('🔴 กองรอปลายทางยังต้องทำงาน — ใส่ของเข้าไปแล้วต้องขึ้นเป็นจุดบอดทันที', () => {
    const b = buildExport([...REAL, { seg: 'ทดลองรอ', visitors: 3, cta: 0, signup: 0 }], '2026-11-19T00:00:00Z');
    const line = b.blindSpots.find((s) => s.includes('ยังไม่มีใครตัดสินใจเลย'));
    expect(line, 'รหัสที่ไม่มีใครตัดสินใจ ต้องไม่หายเงียบ').toContain('ทดลองรอ');
  });
});

describe('🔴 กติกาและจุดบอดต้องเดินทางไปกับข้อมูลเสมอ', () => {
  const b = buildExport(REAL, '2026-11-15T00:00:00Z');

  it('ต้องบอกกติกาเรื่อง MIN_FOR_RATE และ null ≠ 0', () => {
    expect(b.rules.join(' ')).toContain(String(MIN_FOR_RATE));
    expect(b.rules.some((r) => r.includes('null') && r.includes('0'))).toBe(true);
  });

  it('ต้องห้ามอีกระบบสร้างข้อมูลตัวอย่างเติมช่องว่าง', () => {
    expect(b.rules.some((r) => r.includes('ห้ามสร้างข้อมูลตัวอย่าง'))).toBe(true);
  });

  it('ต้องเตือนว่า seg=default วัดบั๊กของเรา ไม่ได้วัดตลาด', () => {
    const line = b.blindSpots.find((s) => s.includes('default'));
    expect(line).toContain('ไม่ได้วัดตลาด');
    expect(line).toContain('94.7');
  });

  it('ต้องเตือนว่าเห็นแค่หน้า / ไม่เห็นบทความ//start (ledger #74)', () => {
    expect(b.blindSpots.some((s) => s.includes('/start'))).toBe(true);
  });

  it('บอกแหล่งที่มาให้ตรวจย้อนได้ และนับยอดรวมถูก', () => {
    expect(b.source.project).toBe('waigsnxhrlwtiotspaim');
    expect(b.source.totalRows).toBe(361);
  });
});

describe('กรณีขอบ', () => {
  it('ไม่มีข้อมูลเลย ต้องไม่พัง และยังต้องส่งกติกาไปด้วย', () => {
    const b = buildExport([], '2026-11-15T00:00:00Z');
    expect(b.segments).toEqual([]);
    expect(b.rules.length).toBeGreaterThan(0);
    expect(b.source.totalRows).toBe(0);
  });

  it('เรียงจากกลุ่มที่มีคนมากสุดก่อน', () => {
    const b = buildExport(REAL, '2026-11-15T00:00:00Z');
    expect(b.segments.map((s) => s.seg)).toEqual(['default', 'newbie', 'owner', 'seller', 'food']);
  });
});
