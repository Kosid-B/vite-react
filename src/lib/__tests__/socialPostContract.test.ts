import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { priceScenario } from '../pricingAnalysis';
import type { ProductInput } from '../quickCalcCore';
import { violatesBrand } from '../brandBrief';
import { SHORT_LINKS } from '../shortLinks';

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 ปัญหาที่เทสต์ชุดนี้กัน (จากภาพอ้างอิงที่เจ้าของส่งมา 2 ก.ย. 2569):
 *   โพสต์ตัวอย่างในตลาดใช้ **โลโก้สถาบัน** + **"ได้เกิน 200 ล้าน"** เป็นตัวดึง
 *   ⇒ เราลอก **รูปแบบ** ได้ แต่ลอก **วิธีสร้างความน่าเชื่อถือ** ไม่ได้
 *      เพราะเรายังมีลูกค้าจ่ายจริง 0 ราย (videoBrief.PROOF.banned)
 *
 * ⇒ ความน่าเชื่อถือของเราต้องมาจาก **เลขคณิตที่ผู้อ่านตรวจเองได้** เท่านั้น
 *   เทสต์นี้จึงผูก "ตัวเลขที่พิมพ์อยู่ในภาพ" เข้ากับ `priceScenario()` ตัวจริง
 *   ⇒ แก้สูตรแล้วไม่แก้ภาพ = แดงทันที (ภาพโกหกไม่ได้โดยไม่มีใครรู้)
 * ══════════════════════════════════════════════════════════════════════════ */

const SCRIPT = readFileSync(join(process.cwd(), 'scripts/build-social-post.mjs'), 'utf8');
const ASSET = join(process.cwd(), 'docs/marketing/social/assets/post-5-numbers.png');

/** ตัวอย่างที่ใช้ในภาพ — ต้องตรงกับที่เขียนไว้ในสคริปต์ */
const EXAMPLE: ProductInput = { biz: 'retail', price: 150, cost: 90, unitsPerMonth: 300, fixedCostPerMonth: 12000 };

describe('โพสต์ "5 ตัวเลข" — ตัวเลขในภาพต้องมาจากฟังก์ชันจริง', () => {
  it('ขึ้นราคา 10% → เปอร์เซ็นต์ในภาพตรงกับ priceScenario()', () => {
    const up = priceScenario(EXAMPLE, 10);
    expect(up.breakEvenVolumePct).not.toBeNull();
    expect(SCRIPT).toContain(`เสียลูกค้าได้ ${up.breakEvenVolumePct}%`);
  });

  it('ลดราคา 10% → เปอร์เซ็นต์ในภาพตรงกับ priceScenario() (ปัดเป็นจำนวนเต็ม)', () => {
    const down = priceScenario(EXAMPLE, -10);
    expect(down.breakEvenVolumePct).not.toBeNull();
    const need = Math.round(Math.abs(down.breakEvenVolumePct as number));
    expect(SCRIPT).toContain(`ต้องขายเพิ่ม ${need}%`);
  });

  it('กำไรต่อหน่วยในภาพ = ราคา − ต้นทุน จริง', () => {
    const m = EXAMPLE.price - EXAMPLE.cost;
    expect(SCRIPT).toContain(`${EXAMPLE.price} − ${EXAMPLE.cost} = ${m} บาท`);
  });

  it('ตัวอย่างที่ประกาศในเทสต์ ต้องตรงกับที่สคริปต์ใช้จริง', () => {
    expect(SCRIPT).toContain(`ราคา ${EXAMPLE.price} · ทุน ${EXAMPLE.cost}`);
  });
});

describe('โพสต์ "5 ตัวเลข" — ห้ามลอกวิธีสร้างความน่าเชื่อถือแบบที่เราพิสูจน์ไม่ได้', () => {
  it('ห้ามมีตัวเลขผลลัพธ์ทางธุรกิจที่เราไม่มีหลักฐาน', () => {
    // "ได้เกิน 200 ล้าน" · "รายได้ X ล้าน" — คำกล่าวอ้างชนิดที่เราใช้ไม่ได้
    expect(SCRIPT).not.toMatch(/\d+\s*ล้าน/);
  });

  it('ห้ามยืมชื่อสถาบัน/มหาวิทยาลัยมาเป็นเครื่องรับรอง', () => {
    expect(SCRIPT).not.toMatch(/Harvard|MIT Sloan|Stanford|มหาวิทยาลัย/i);
  });

  it('ข้อความทั้งภาพต้องผ่านด่านเดียวกับคอนเทนต์ทุกชิ้น', () => {
    // ดึงเฉพาะข้อความไทยที่ปรากฏบนภาพ (ในบล็อก STEPS + พาดหัว)
    const thai = (SCRIPT.match(/[ก-๙][ก-๙\s%·—–?"]*/g) ?? []).join(' ');
    expect(violatesBrand(thai)).toEqual([]);
  });
});

describe('โพสต์ "5 ตัวเลข" — สัญญาส่งมอบคอนเทนต์', () => {
  it('ลิงก์ปลายทางต้องมีอยู่จริงใน SHORT_LINKS', () => {
    expect(SCRIPT).toContain('/ราคา');
    expect(SHORT_LINKS['/ราคา']).toBeTruthy();
    expect(SHORT_LINKS['/ราคา'].path).toBe('/calc');
  });

  it('พาดหัวต้องเป็นคำถาม/ปัญหา ไม่ใช่ชื่อหมวดหมู่สินค้า', () => {
    expect(SCRIPT).toContain('คุณตอบได้กี่ข้อ?');
    expect(SCRIPT).not.toMatch(/AI Business Operating System/); // ป้ายภายใน ห้ามขึ้นภาพ
  });

  it('ไฟล์ภาพที่สคริปต์สร้าง ต้องมีอยู่จริง (ไม่ใช่แค่สคริปต์ลอย ๆ)', () => {
    expect(existsSync(ASSET)).toBe(true);
  });
});
