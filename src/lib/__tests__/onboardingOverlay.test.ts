import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* 🔴 ผู้ใช้ใหม่เจอหน้าต่างซ้อนกัน 2 ชั้นตั้งแต่นาทีแรก (จับได้ 20 ส.ค. 2569 ตอนเดินระบบจริงบน iPhone 390px)
 *
 *   ด่านถามกลุ่มลูกค้า "คุณขายให้ใครเป็นหลัก?" ขึ้นมา
 *   แล้วทัวร์ต้อนรับ "ยินดีต้อนรับสู่ CEO AI Thailand" **เด้งทับ** ทันที
 *   ⇒ กดการ์ดข้างหลังไม่ได้ · ต้องปิดทัวร์ก่อนถึงจะตอบคำถามได้
 *
 * ต้นเหตุ: `showTour` กันแค่ `!showGoalChooser` แต่ด่านแรกคือ `showAudienceChooser`
 *   ซึ่งถูกเพิ่มเข้ามาทีหลังแล้วไม่ได้กลับมาแก้เงื่อนไขนี้
 *   คอมเมนต์ในโค้ดตอนนั้นเขียนว่า "กัน modal ซ้อนแล้ว" — กันจริงแค่ครึ่งเดียว
 */

const app = readFileSync(join(process.cwd(), 'src', 'App.tsx'), 'utf8');

/** ด่านถามทุกด่านที่ขึ้นเป็น overlay เต็มจอก่อนผู้ใช้ได้ใช้งานจริง */
const BLOCKING_CHOOSERS = ['showGoalChooser', 'showAudienceChooser'] as const;

describe('ทัวร์ต้อนรับ ห้ามโผล่ทับด่านถาม', () => {
  const line = app.match(/const showTour = [^;]+;/);

  it('มีเงื่อนไข showTour ให้ตรวจจริง', () => {
    expect(line, 'ไม่พบการประกาศ showTour').toBeTruthy();
  });

  it.each(BLOCKING_CHOOSERS)('showTour ต้องกัน %s ด้วย', (chooser) => {
    expect(line![0], `showTour ไม่ได้กัน ${chooser} → ทัวร์จะเด้งทับด่านนี้`)
      .toContain(`!${chooser}`);
  });

  it('ด่านถามทุกด่านที่ประกาศไว้ในไฟล์ ต้องถูกกันครบ (เพิ่มด่านใหม่แล้วห้ามลืม)', () => {
    // หา const show*Chooser ทั้งหมดที่มีจริงในไฟล์ แล้วบังคับว่า showTour ต้องกันทุกตัว
    const declared = [...app.matchAll(/const (show\w*Chooser)\s*=/g)].map((m) => m[1]);
    expect(declared.length, 'ไม่พบด่านถามเลย — เทสต์นี้จะไม่ได้ตรวจอะไร').toBeGreaterThanOrEqual(2);
    const missing = declared.filter((d) => !line![0].includes(`!${d}`));
    expect(missing, `showTour ลืมกัน: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('เครื่องมือชิ้นแรกต้องอยู่ใกล้บนสุด — คนไม่เลื่อน', () => {
  const lp = readFileSync(join(process.cwd(), 'src', 'pages', 'LandingPage.tsx'), 'utf8');
  const order = [...lp.matchAll(/data-sec="([\w_]+)"/g)].map((m) => m[1]);

  it('อ่านลำดับส่วนของหน้า Landing ได้จริง', () => {
    expect(order.length).toBeGreaterThan(8);
    expect(order[0]).toBe('hero');
  });

  it('🔴 quickcheck ต้องเป็นส่วนถัดจาก hero ทันที', () => {
    // ข้อมูลจริง 20 ส.ค. 2569: ผู้เข้าชม 72 คน เลื่อนเกินครึ่งหน้าแค่ 2 คน (2.8%)
    // hero สูง 90vh ⇒ ทุกส่วนที่อยู่ถัดลงไปอีกชั้น แทบไม่มีใครเห็น
    expect(order.indexOf('quickcheck'), 'quickcheck ต้องอยู่ตำแหน่งที่ 2 (ถัดจาก hero)').toBe(1);
  });

  it('ราคาต้องไม่ใช่สิ่งแรกที่เจอก่อนได้คุณค่า', () => {
    expect(order.indexOf('pricing')).toBeGreaterThan(order.indexOf('quickcheck'));
  });
});
