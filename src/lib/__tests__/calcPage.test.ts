import { describe, it, expect } from 'vitest';
import { calcPageHtml, parseCalcParams } from '../calcPage';
import { SHORT_LINKS } from '../shortLinks';
import { quickCheck } from '../quickCalcCore';
import { sitemapXml } from '../seoData';

/* หน้า /calc มีเพราะตัวเลขจริงจาก GA4 (22 ก.ค.–18 ส.ค. 2569):
 *   คลิป TikTok 14,500 วิว → เปิดบทความ 8 คน → อยู่เฉลี่ย **2 วินาที** แล้วปิด
 *   คลิปสัญญา "คำนวณฟรี" แต่ปลายทางเป็นบทความให้อ่าน — เขามาเพื่อทำ ไม่ใช่อ่าน
 * เทสต์ชุดนี้ล็อกไว้ว่าปลายทางต้องเป็น "ของที่ใช้ได้ทันที" จริง ๆ
 */

const O = 'https://ceoaithailand.org';

describe('parseCalcParams — ทนค่าขยะ ไม่ throw', () => {
  it('อ่านตัวเลขปกติ + รูปแบบมีคอมมา', () => {
    const p = parseCalcParams('?price=50&cost=30&units=1,000&fixed=30000');
    expect(p).toMatchObject({ price: 50, cost: 30, units: 1000, fixed: 30000, filled: true });
  });
  it('ค่าติดลบ/ตัวหนังสือ/ใหญ่เกินจริง → 0 ไม่ใช่ NaN', () => {
    const p = parseCalcParams('?price=-5&cost=abc&units=999999999999&fixed=');
    expect(p).toMatchObject({ price: 0, cost: 0, units: 0, fixed: 0, filled: false });
  });
  it('ไม่มี query เลย ต้องไม่พัง', () => {
    expect(() => parseCalcParams('')).not.toThrow();
    expect(parseCalcParams('').filled).toBe(false);
  });
});

describe('calcPageHtml — ต้องกรอกได้ทันทีตั้งแต่วินาทีแรก', () => {
  it('🔴 ห้ามมี JavaScript ที่จำเป็นต่อการใช้งาน — ฟอร์มต้องเป็น GET ธรรมดา', () => {
    const html = calcPageHtml(O, '');
    expect(html).toContain('<form method="get"');
    // มีได้เฉพาะ gtag (analytics · โหลดตอน idle) — ห้ามมี framework/bundle
    expect(html).not.toMatch(/<script[^>]*src="[^"]*\.js"/);
    expect(html).not.toContain('type="module"');
  });

  it('เปิดมาเปล่า ๆ ต้องเห็นช่องกรอกครบ ไม่ใช่หน้าว่าง', () => {
    const html = calcPageHtml(O, '');
    for (const n of ['price', 'cost', 'units', 'fixed']) {
      expect(html).toContain(`name="${n}"`);
    }
    expect(html).toContain('autofocus');
  });

  it('ตัวเลขที่แสดงต้องตรงกับ quickCheck เป๊ะ — ห้ามมีสูตรชุดที่สอง', () => {
    const html = calcPageHtml(O, '?price=50&cost=30&units=1000&fixed=30000');
    const r = quickCheck({ biz: 'other' as never, price: 50, cost: 30, unitsPerMonth: 1000, fixedCostPerMonth: 30000 });
    expect(r.marginPerUnit).toBe(20);
    expect(html).toContain('20 ฿');                 // กำไรต่อชิ้น
    // หน้าเว็บจัดรูปแบบเลขไทย (1,500) — เทียบด้วยรูปแบบเดียวกัน ไม่ใช่ String()
    expect(html).toContain(r.breakEvenUnits!.toLocaleString('th-TH')); // 1,500
    // netPerMonth = 20*1000 - 30000 = -10000 → ต้องขึ้นป้ายลบ ไม่ใช่ป้ายเขียว
    expect(r.netPerMonth).toBe(-10000);
    expect(html).toContain('verdict bad');
  });

  it('กำไรต่อหน่วยดีแต่รวมทั้งเดือนขาดทุน ต้องไม่ขึ้นป้ายเขียว (บทเรียน 16 ส.ค. 69)', () => {
    const html = calcPageHtml(O, '?price=100&cost=60&units=100&fixed=10000');
    expect(html).toContain('verdict bad');
    expect(html).not.toContain('verdict good');
  });

  it('ยังไม่กรอกราคา = ไม่แสดงผลลัพธ์มั่ว ๆ', () => {
    const html = calcPageHtml(O, '?cost=30');
    expect(html).not.toContain('class="res"');
  });

  it('ขายต่ำกว่าทุน — ตารางราคาต้องบอกตรง ๆ ว่าคำนวณไม่ได้ ไม่ใช่โชว์ NaN', () => {
    const html = calcPageHtml(O, '?price=30&cost=50');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('null');
  });

  it('escape ค่าที่ผู้ใช้ส่งมา — ห้าม XSS ผ่าน query string', () => {
    const html = calcPageHtml(O, '?price=50&cost=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
    expect(html).not.toContain('<script>alert');
  });

  it('ต้องมีทางไปอ่านบทความเต็ม — เปลี่ยนปลายทางแล้วห้ามทิ้งคนที่อยากอ่าน', () => {
    expect(calcPageHtml(O, '')).toContain('/blog/pricing-no-loss');
  });
});

describe('ลิงก์การตลาดเรื่องราคา ต้องพาไปที่ "ของที่ใช้ได้" ไม่ใช่ "ของที่ให้อ่าน"', () => {
  // ไม่เพิ่ม alias เกินจำเป็น — ยิ่งมีชื่อพ้อง รายงานยิ่งเรียกชิ้นงานผิดชื่อจากที่เขียนในคลิป
  it.each(['/ราคา', '/price'])('%s → /calc', (key) => {
    expect(SHORT_LINKS[key].path).toBe('/calc');
  });
});

describe('/calc ต้องถูกค้นเจอเองได้ ไม่ใช่เข้าถึงได้เฉพาะคนที่ดูคลิป', () => {
  it('อยู่ใน sitemap.xml', () => {
    expect(sitemapXml([], 'https://ceoaithailand.org')).toContain('<loc>https://ceoaithailand.org/calc</loc>');
  });
});
