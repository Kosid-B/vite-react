import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MESSAGE_HIERARCHY, AUDIENCE, CUSTOMER_JOURNEY, ISO_ENTERS_AT_STEP } from '../brandBrief';

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
const STRATEGY = 'docs/marketing/AWARENESS-STRATEGY-2026-08-23.md';

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

  it('⑦ กลยุทธ์การรับรู้: ต้องประกาศว่าตัวเลขชุด 80 คน "วัดบั๊กเรา ไม่ได้วัดตลาด"', () => {
    const text = read(STRATEGY);
    // ทั้ง 4 ตัวเลขที่เคยถูกตีความผิด ต้องมีคำอธิบายว่าอะไรทำให้มันเป็นแบบนั้น
    for (const n of ['quickcheck = 0', 'search = 0', 'utm', 'MIN_FOR_RATE']) {
      expect(text, `กลยุทธ์ไม่ได้อธิบายที่มาของ "${n}"`).toContain(n);
    }
    expect(text).toMatch(/วัด.*(บั๊ก|คุณภาพการทำงาน).*ไม่ได้วัด.*ตลาด|ไม่ได้วัด "?ความต้องการของตลาด/);
  });

  it('⑧ กลยุทธ์ต้องยึด invisible-influence — 39% เงียบ + ห้ามวัด Be Remembered รายสัปดาห์', () => {
    const text = read(STRATEGY);
    expect(text, 'ไม่มีตัวเลขกลุ่มพลังเงียบ').toContain('39%');
    expect(text, 'ไม่ได้ห้ามวัดรายสัปดาห์').toMatch(/ห้ามวัดผลรายสัปดาห์|ห้ามดูผลลัพธ์/);
    // branded search = ตัวชี้วัดการรับรู้ตัวจริง ต้องอยู่ทั้งในกลยุทธ์และในบรีฟ
    for (const f of [STRATEGY, BRIEF]) {
      expect(read(f), `${f} ไม่มี branded search`).toMatch(/branded search/i);
    }
  });

  it('⑨ ทุกลิงก์สั้นที่กลยุทธ์สั่งใช้ ต้องมีอยู่จริงใน SHORT_LINKS', () => {
    const links = read('src/lib/shortLinks.ts');
    for (const l of ['/ราคา', '/ปาล์ม', '/ทุน', '/ลูกค้า']) {
      expect(links.includes(`'${l}'`), `SHORT_LINKS ไม่มี ${l} แต่กลยุทธ์สั่งให้ใช้`).toBe(true);
      // ต้องเป็น code span พอดีเป๊ะ — `toContain(l)` เฉย ๆ ยอมให้ `/ปาล์มxx` ผ่านได้ (พิสูจน์แล้ว)
      expect(read(STRATEGY).includes(`\`${l}\``), `กลยุทธ์ไม่ได้สั่งใช้ ${l}`).toBe(true);
    }
  });

  it('⑩ บรีฟต้องแยก Current Audience ออกจาก Target Market และมี Journey 10 ขั้น', () => {
    const text = read(BRIEF);
    expect(text).toContain('Current Audience');
    expect(text).toContain('Target Market');
    // persona ต้องเป็นเชิงสถานะ — ห้ามกลับไปผูกกับช่วงอายุอีก
    expect(text, 'บรีฟยังใช้ persona เชิงอายุ').not.toMatch(/Core Persona[\s\S]{0,200}อายุ 40–55/);
    for (const step of ['Idea', 'ลูกค้าที่ใช่', 'ลูกค้ารายแรก', 'Scale']) {
      expect(text, `Journey ขาดขั้น ${step}`).toContain(step);
    }
    // ISO ต้องถูกกำกับว่าอยู่ขั้นหลัง ไม่ใช่ประตูหน้า
    expect(text).toMatch(/ISO[^\n]*ขั้น 7|ขั้น 7[^\n]*ISO/);
  });

  it('⑪ โค้ดกับบรีฟต้องพูดตรงกันเรื่องกลุ่มเป้าหมาย (แก้ที่เดียวไม่พอ = แดง)', () => {
    const brief = read(BRIEF);
    for (const v of [AUDIENCE.primary, AUDIENCE.secondary, AUDIENCE.growth]) {
      expect(brief, `บรีฟไม่มีกลุ่ม "${v}" ที่โค้ดประกาศไว้`).toContain(v);
    }
    expect(CUSTOMER_JOURNEY).toHaveLength(10);
    expect(ISO_ENTERS_AT_STEP).toBe(7);
  });

  it('⑫ ลิงก์ทุกบรรทัดใน LINKS-TO-POST ต้องประกอบจากของจริง (เรื่อง + ตัวย่อแพลตฟอร์ม)', () => {
    const doc = read('docs/marketing/LINKS-TO-POST.md');
    const links = read('src/lib/shortLinks.ts');
    const found = [...doc.matchAll(/ceoaithailand\.org(\/[^/`\s?]+)\/([a-z]+)/g)];
    expect(found.length, 'ไม่เจอลิงก์สักบรรทัดในเอกสาร').toBeGreaterThan(10);
    for (const [full, topic, src] of found) {
      expect(links.includes(`'${topic}'`), `${full}: SHORT_LINKS ไม่มีเรื่อง ${topic}`).toBe(true);
      expect(links.includes(`  ${src}:`), `${full}: SOURCE_PRESETS ไม่มีตัวย่อ ${src}`).toBe(true);
    }
  });

  it('⑥ ปฏิทินฉบับเก่าต้องชี้ไปฉบับใหม่ (กันคนหยิบแผนที่มี 4 ข้อผิดไปใช้)', () => {
    expect(read('docs/review/WEEKLY-CALENDAR-2026-08-22.md')).toContain('WEEKLY-CALENDAR-2026-08-23.md');
  });
});
