import { describe, it, expect } from 'vitest';
import { renderCheckupReport, openingLine, firstThreeSteps, type CheckupReportInput } from '../checkupReport';

const base: CheckupReportInput = {
  company: 'บริษัททดสอบ',
  standardCode: 'ISO 9001:2015',
  pct: 40,
  bandLabel: 'มีบางส่วน แต่ยังไม่ครบ',
  summary: 'มีของอยู่บ้างแล้ว แต่กระจัดกระจายและไม่ต่อกัน',
  gaps: [
    { id: '9.2', title: 'ตรวจติดตามภายใน', fix: 'วางแผนตรวจปีละ 1 รอบ', mandatory: true },
    { id: '6.1', title: 'ทะเบียนความเสี่ยง', fix: 'เริ่มจาก 10 ข้อที่กระทบจริง', mandatory: false },
    { id: '7.5', title: 'ควบคุมเอกสาร', fix: 'ทำที่เก็บกลางที่เดียว', mandatory: true },
    { id: '10.2', title: 'แก้ไขที่รากเหง้า', fix: 'ใช้แบบฟอร์ม 1 หน้า', mandatory: true },
  ],
  effortDays: [6, 12],
  checkupUrl: 'https://ceoaithailand.org/checkup',
  contactEmail: 'support@b-tctraining.com',
  disclaimer: 'ผลนี้เป็นการคัดกรองเบื้องต้น ไม่ใช่การตรวจประเมินตามมาตรฐาน',
};

describe('checkupReport — ประโยคเปิด', () => {
  it('เปิดด้วยสิ่งที่ทำได้เสมอ ไม่ใช่เปิดด้วยสิ่งที่ขาด', () => {
    for (const pct of [0, 20, 40, 60, 90]) {
      const line = openingLine(pct, 5);
      expect(line.length).toBeGreaterThan(15);
      expect(line).not.toMatch(/คุณขาด|ยังไม่ผ่าน|แย่|ล้มเหลว/);
    }
  });

  it('คะแนนต่ำได้ประโยคที่ให้กำลังใจ ไม่ใช่ประโยคที่ทำให้ท้อ', () => {
    expect(openingLine(10, 12)).toMatch(/น้อยกว่าที่คิด|ไม่ต้องรื้อ/);
  });

  it('คะแนนสูงไม่โม้เกินจริง', () => {
    expect(openingLine(90, 1)).not.toMatch(/สมบูรณ์แบบ|ดีที่สุด|การันตี/);
  });
});

describe('checkupReport — เนื้อรายงาน', () => {
  it('ตัดเหลือ 3 ข้อแรกเสมอ (รายการยาวคือรายการที่ไม่มีใครเริ่ม)', () => {
    expect(firstThreeSteps(base.gaps)).toHaveLength(3);
    expect(firstThreeSteps(base.gaps.slice(0, 2))).toHaveLength(2);
  });

  it('หัวเรื่องมีชื่อบริษัทและคะแนน', () => {
    const r = renderCheckupReport(base);
    expect(r.subject).toContain('บริษัททดสอบ');
    expect(r.subject).toContain('40%');
  });

  it('ไม่ระบุบริษัท ยังใช้ได้และไม่มีคำว่า null/undefined', () => {
    const r = renderCheckupReport({ ...base, company: null });
    expect(r.subject).toContain('ธุรกิจของคุณ');
    expect(r.html).not.toMatch(/null|undefined/);
    expect(r.text).not.toMatch(/null|undefined/);
  });

  it('บอกจำนวนที่เหลือ แทนที่จะเทรายการทั้งหมดใส่อีเมล', () => {
    const r = renderCheckupReport(base);
    expect(r.text).toContain('ยังมีอีก 1 จุด');
    expect(r.text).not.toContain('แก้ไขที่รากเหง้า'); // ข้อที่ 4 ต้องไม่อยู่ในเนื้อ
  });

  it('มีทั้ง text และ html และมีข้อความกำกับครบทั้งสองแบบ', () => {
    const r = renderCheckupReport(base);
    expect(r.text).toContain(base.disclaimer);
    expect(r.html).toContain('คัดกรองเบื้องต้น');
    expect(r.html).toContain('<!doctype html>');
  });

  it('escape HTML ในชื่อบริษัท — กัน markup หลุดเข้าอีเมล', () => {
    const r = renderCheckupReport({ ...base, company: '<script>x</script>ร้าน' });
    expect(r.html).not.toContain('<script>');
    expect(r.html).toContain('&lt;script&gt;');
  });

  it('คะแนนต่ำ = เสนอคุยต่อ · คะแนนสูง = ไม่เสนอขาย', () => {
    const low = renderCheckupReport({ ...base, pct: 35 });
    const high = renderCheckupReport({ ...base, pct: 88, gaps: base.gaps.slice(0, 1) });
    expect(low.text).toContain('ไม่มีค่าใช้จ่ายในการคุยครั้งแรก');
    expect(high.text).not.toContain('ไม่มีค่าใช้จ่ายในการคุยครั้งแรก');
  });

  it('ไม่มีเส้นตายปลอมหรือคำเร่งเร้าในรายงาน', () => {
    const r = renderCheckupReport(base);
    for (const bad of ['รีบ', 'ด่วน', 'เหลือเวลาอีก', 'สิทธิพิเศษ', 'จำกัดจำนวน']) {
      expect(r.text).not.toContain(bad);
      expect(r.html).not.toContain(bad);
    }
  });

  it('ระบุเอกสารบังคับที่ขาดเป็นตัวเลข ไม่ใช่คำขู่', () => {
    const r = renderCheckupReport(base);
    expect(r.text).toContain('3 รายการ');
    expect(r.text).not.toMatch(/ผิดกฎหมาย|ถูกเพิกถอน|โดนปรับ/);
  });

  it('ไม่มีช่องว่าง ก็ยังส่งรายงานได้ (คนคะแนนเต็ม)', () => {
    const r = renderCheckupReport({ ...base, pct: 100, gaps: [], effortDays: [0, 2] });
    expect(r.subject).toContain('100%');
    expect(() => renderCheckupReport({ ...base, gaps: [] })).not.toThrow();
  });

  it('มีลิงก์กลับและอีเมลติดต่อทั้งใน text และ html', () => {
    const r = renderCheckupReport(base);
    expect(r.text).toContain(base.checkupUrl);
    expect(r.text).toContain(base.contactEmail);
    expect(r.html).toContain(base.checkupUrl);
    expect(r.html).toContain(base.contactEmail);
  });
});
