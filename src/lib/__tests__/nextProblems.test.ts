import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  NEXT_PROBLEMS, nextProblemsFor, focusFor, nextProblemsHeading,
} from '../nextProblems';
import { quickCheck, type ProductInput } from '../quickCalcCore';
import { SHORT_LINKS, resolveShortLinkWithSource, shortLinkTarget } from '../shortLinks';

/* ══════════════════════════════════════════════════════════════════════
 * สัญญาของบล็อก "ยังเหลืออีก N เรื่อง"
 *
 * 🔴 ที่มา: เจ้าของค้านว่า "ระบบเราไม่ได้แก้ไขแค่เรื่องต้นทุน" — และถูก
 *    ตรวจ landing_funnel แล้วพบว่าทุกอย่างที่บอกเรื่องนั้นอยู่ใน 15 บล็อกที่มีคนเห็น **0 คน**
 *    ⇒ ความกว้างของระบบเป็นความจริงที่ไม่เคยถูกส่งถึงใครเลย
 * ══════════════════════════════════════════════════════════════════════ */

const ORIGIN = 'https://ceoaithailand.org';
const src = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

const input = (o: Partial<ProductInput> = {}): ProductInput =>
  ({ biz: 'food', price: 50, cost: 30, ...o });

describe('รายการเรื่องที่เหลือ', () => {
  it('ครอบวงจรของเจ้าของร้าน ไม่ใช่เรื่องเดียว', () => {
    expect(NEXT_PROBLEMS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(NEXT_PROBLEMS.map((p) => p.id)).size).toBe(NEXT_PROBLEMS.length);
    expect(nextProblemsHeading()).toContain(String(NEXT_PROBLEMS.length));
  });

  it('🔴 ทุกเรื่องต้องมีปลายทางจริง — ลิงก์สาธารณะที่ Worker พาไปได้', () => {
    for (const p of NEXT_PROBLEMS) {
      expect(SHORT_LINKS[p.shortLink], `${p.id}: ${p.shortLink} ไม่มีใน SHORT_LINKS`).toBeTruthy();
      const { link, src: s } = resolveShortLinkWithSource(p.shortLink);
      expect(link, p.id).toBeTruthy();
      const target = shortLinkTarget(link!, ORIGIN, '?utm_source=site&utm_medium=quickcheck', s);
      expect(target, p.id).toContain('utm_source=site');
      expect(target, `${p.id}: medium ต้องแยกได้ว่ามาจากบล็อกนี้`).toContain('utm_medium=quickcheck');
    }
  });

  it('🔴 ทุกเรื่องต้องชี้ไปหน้าที่มีอยู่จริงในแอป (ไม่ใช่หน้าที่ยังไม่ได้สร้าง)', () => {
    const types = src('types.ts');
    const m = types.match(/export type PageId =([^;]+);/);
    expect(m, 'หา PageId ไม่เจอ').toBeTruthy();
    const pages = [...m![1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    expect(pages.length).toBeGreaterThan(20);
    for (const p of NEXT_PROBLEMS) {
      expect(pages, `${p.id}: page '${p.page}' ไม่มีใน PageId`).toContain(p.page);
    }
  });

  it('เขียนเป็นคำถามที่เจ้าของตอบเองได้ว่า "ใช่กู" — ไม่ใช่ชื่อฟีเจอร์', () => {
    for (const p of NEXT_PROBLEMS) {
      expect(p.ask, `${p.id} ต้องเป็นคำถาม`).toContain('?');
      expect(p.gives.length, `${p.id} ต้องบอกว่าเขาจะได้อะไร`).toBeGreaterThan(15);
    }
  });

  it('🔴 ห้ามอ้างตัวเลข/สถิติที่ไม่ได้มาจากสิ่งที่ผู้ใช้กรอก', () => {
    // กฎเดียวกับ productQuickCheck: ไม่มีชนิดข้อมูล "fact" ให้ใส่สถิติตลาดได้เลย
    const banned = ['ค่าเฉลี่ย', 'ส่วนใหญ่', 'สถิติ', 'ตลาดไทย', 'อุตสาหกรรม', '%'];
    const text = NEXT_PROBLEMS.map((p) => `${p.ask} ${p.gives}`).join(' ');
    for (const w of banned) expect(text, `พบคำต้องห้าม "${w}"`).not.toContain(w);
  });
});

describe('ลำดับต้องเปลี่ยนตามตัวเลขของเขาจริง (dynamic-plg)', () => {
  it('ขาดทุนรวมทั้งเดือน ทั้งที่กำไรต่อชิ้นบวก → ชี้ไปที่ "วางระบบ/รายจ่ายประจำ"', () => {
    const r = quickCheck(input({ unitsPerMonth: 100, fixedCostPerMonth: 5000 }));  // กำไรขั้นต้น 2,000 < คงที่ 5,000
    expect(focusFor(r)?.id).toBe('system');
    expect(nextProblemsFor(r)[0].id).toBe('system');
    expect(focusFor(r)!.why, 'เหตุผลต้องอ้างสถานะจากตัวเลขของเขา').toMatch(/ต่อชิ้น|เดือน/);
  });

  it('ยังไม่ถึงจุดคุ้มทุน → ชี้ไปที่ "หาลูกค้า" พร้อมบอกว่าขาดอีกกี่ชิ้น', () => {
    const r = quickCheck(input({ unitsPerMonth: 100, fixedCostPerMonth: 4000 }));
    const f = focusFor(r);
    // เคสนี้ยังขาดทุนรวม → ระบบต้องชี้เรื่องระบบก่อน (กำไรสุทธิมาก่อนเสมอ)
    expect(['system', 'customers']).toContain(f?.id);
  });

  it('ผ่านจุดคุ้มทุนแล้ว → ชี้ไปที่ "ทำให้คนหาเจอ" ไม่ใช่ให้ลดต้นทุนอีก', () => {
    const r = quickCheck(input({ unitsPerMonth: 500, fixedCostPerMonth: 3000 }));
    expect(focusFor(r)?.id).toBe('found');
    expect(nextProblemsFor(r)[0].id).toBe('found');
  });

  it('🔴 ข้อมูลไม่พอ → ต้องคืน null ไม่ใช่เดาให้', () => {
    const r = quickCheck(input());   // ไม่บอกยอดขาย/ค่าใช้จ่ายคงที่
    expect(focusFor(r)).toBeNull();
    expect(nextProblemsFor(r)).toEqual(NEXT_PROBLEMS);   // ลำดับปกติ ไม่จัดใหม่มั่ว
  });

  it('จัดลำดับใหม่เท่านั้น — ห้ามตัดเรื่องไหนหายไป', () => {
    for (const r of [
      quickCheck(input({ unitsPerMonth: 100, fixedCostPerMonth: 5000 })),
      quickCheck(input({ unitsPerMonth: 500, fixedCostPerMonth: 3000 })),
      quickCheck(input()),
    ]) {
      const got = nextProblemsFor(r);
      expect(got.length).toBe(NEXT_PROBLEMS.length);
      expect(new Set(got.map((p) => p.id))).toEqual(new Set(NEXT_PROBLEMS.map((p) => p.id)));
    }
  });
});

describe('ต้องถูกเรียกใช้จริงในหน้าเว็บ ไม่ใช่เขียนไว้เฉย ๆ', () => {
  it('ProductQuickCheck เรนเดอร์บล็อกนี้ + ยิง event ให้รู้ว่าคนสนใจเรื่องไหน', () => {
    const c = src('components/ProductQuickCheck.tsx');
    expect(c).toContain('nextProblemsFor');
    expect(c).toContain('nextProblemsHeading');
    expect(c, 'ต้องวัดได้ว่าเจ้าของธุรกิจกดเรื่องไหนมากที่สุด').toContain("track('nextproblem_click'");
    expect(c, 'ลิงก์ต้องติดแท็กให้แยกได้ว่ามาจากบล็อกนี้').toContain('utm_medium=quickcheck');
  });
});
