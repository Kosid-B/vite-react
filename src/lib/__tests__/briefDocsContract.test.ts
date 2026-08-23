import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MESSAGE_HIERARCHY } from '../brandBrief';

/**
 * กลไกกัน "ความเข้าใจผิดที่แก้ไปแล้ว กลับมาใหม่" (ตั้ง 23 ส.ค. 2569)
 *
 * ทำไมต้องมีเทสต์อ่านไฟล์ .md: ความผิด 4 ข้อที่แก้ในรอบนี้ **ไม่ได้อยู่ในโค้ด** — มันอยู่ในเอกสาร
 * ที่ผมเขียนเองแล้วเชื่อเองในรอบถัดมา (Search Console · CPC · ลำดับงาน · ขอบเขตพื้นที่)
 * เทสต์ที่ตรวจแต่โค้ดจึงจับไม่ได้เลยสักข้อ ⇒ ต้องตรวจที่ตัวเอกสารจริง
 *
 * ⚠️ ห้ามแก้เทสต์นี้ให้ผ่านโดยการลบข้อความออกจากเอกสาร — ถ้าข้อเท็จจริงเปลี่ยนจริง
 *    ให้แก้ทั้งเอกสาร + แก้เทสต์ + เขียนเหตุผลลง LESSONS-LEDGER ในคอมมิตเดียวกัน
 */

const read = (rel: string) => readFileSync(resolve(__dirname, '../../..', rel), 'utf8');

const BRIEF = 'docs/marketing/BRAND-BRIEF-FORM.md';
const CALENDAR = 'docs/review/WEEKLY-CALENDAR-2026-08-23.md';
const SKILL = '.claude/skills/marketing-instruction/SKILL.md';
const START_LANDING = 'src/pages/StartLanding.tsx';

describe('เอกสารบรีฟ/ปฏิทิน — ห้ามย้อนกลับไปพูดสิ่งที่พิสูจน์แล้วว่าผิด', () => {
  it('① Search Console: ห้ามเขียนว่า "ยังไม่ได้ยืนยัน" — ยืนยันแล้วตั้งแต่ ~20 ก.ค. 2569', () => {
    for (const f of [BRIEF, CALENDAR]) {
      const text = read(f);
      // อนุญาตให้ *อ้างถึง* ประโยคเก่าได้ในตารางเปรียบเทียบ (ต้องอยู่ในเครื่องหมายคำพูด)
      const bare = text.replace(/["“][^"”]*["”]/g, '');
      expect(bare, `${f} ยังพูดว่า Search Console ยังไม่ได้ยืนยัน`).not.toMatch(/ยังไม่ได้ยืนยัน\s*Search Console/);
      expect(text, `${f} ต้องระบุว่า GSC ยืนยันแล้ว`).toMatch(/ยืนยันแล้ว/);
    }
  });

  it('② ต้นทุนต่อผู้อ่าน: บรีฟต้องมีตัวเลขจริง ฿28 และห้ามบอกว่า "ไม่เคยยิงแอด"', () => {
    const text = read(BRIEF);
    expect(text).toContain('฿28');
    const bare = text.replace(/["“][^"”]*["”]/g, '');
    expect(bare, 'บรีฟยังบอกว่าเราไม่เคยยิงแอด ทั้งที่วัด ฿28/คน ไว้แล้ว').not.toContain('ไม่เคยยิงแอด');
  });

  it('③ ขอบเขตพื้นที่: /start ห้ามจำกัดพื้นที่เป็น EEC — เจ้าของยืนยัน "ทั่วประเทศ"', () => {
    // ⚠️ ต้องลบคอมเมนต์ก่อนตรวจ — ไม่งั้นคอมเมนต์ที่ *อธิบายว่าเอา EEC ออกแล้ว* จะทำให้เทสต์แดงเอง
    //    (บทเรียนเดียวกับ ciGate.test.ts ที่เคยจับคำใน comment ของตัวเอง)
    const live = read(START_LANDING)
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(live.includes('EEC'), 'StartLanding ยังติดป้ายจำกัดพื้นที่ EEC').toBe(false);
    expect(read(BRIEF)).toMatch(/ทั่วประเทศ/);
  });

  it('④ ลำดับงาน: ปฏิทินต้องเรียงเหมือน skill — ① คอนเทนต์ธุรกิจ มาก่อน ③ Pilot', () => {
    for (const f of [CALENDAR, SKILL]) {
      const text = read(f);
      const content = text.indexOf('**①**');
      const pilot = text.indexOf('**③**');
      expect(content, `${f} ไม่มีลำดับ ①`).toBeGreaterThan(-1);
      expect(pilot, `${f} ไม่มีลำดับ ③`).toBeGreaterThan(-1);
      expect(content, `${f} เอา Pilot มาก่อนคอนเทนต์ธุรกิจ`).toBeLessThan(pilot);
    }
    // Pilot ต้องถูกกำกับว่าเป็นงานคู่ขนาน ไม่ใช่สารหลักบนเว็บ
    expect(read(CALENDAR)).toMatch(/ห้ามเอา ③ ขึ้น(มาเป็น|เป็น)สารหลัก/);
  });

  it('⑤ ลำดับของสาร: บรีฟต้องพูดตรงกับ brandBrief.MESSAGE_HIERARCHY (ธุรกิจนำ · ISO ตาม)', () => {
    const text = read(BRIEF);
    expect(text).toMatch(/ธุรกิจนำ\s*·\s*ISO ตาม/);
    // เหตุผลที่ลืมง่ายที่สุดและแพงที่สุด — ต้องอยู่ในบรีฟ ไม่ใช่อยู่แต่ในโค้ด
    expect(text, 'บรีฟไม่ได้บอกว่าทำไมห้ามนำด้วย ISO').toContain('50,000');
    expect(MESSAGE_HIERARCHY.whyNotSwap).toContain('50,000');
  });

  it('⑥ ปฏิทินฉบับเก่าต้องชี้ไปฉบับใหม่ (กันคนหยิบแผนที่มี 4 ข้อผิดไปใช้)', () => {
    expect(read('docs/review/WEEKLY-CALENDAR-2026-08-22.md')).toContain('WEEKLY-CALENDAR-2026-08-23.md');
  });
});
