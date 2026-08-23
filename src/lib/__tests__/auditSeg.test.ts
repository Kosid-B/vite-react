import { describe, it, expect } from 'vitest';
import { HERO_VARIANTS, segmentFor } from '../heroVariant';
import { violatesBrand } from '../brandBrief';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/* ══════════════════════════════════════════════════════════════════════
 * seg 'audit' = ประตูสำหรับกลุ่มที่ "demand มีอยู่แล้ว" (มีวันตรวจรออยู่)
 *
 * 🔴 บั๊กที่เทสต์นี้กันโดยตรง: เคยพลาดมาแล้ว (คอมเมนต์ใน ctaContext.ts เตือนไว้เอง)
 *    "เติม ?seg= ให้ CTA แล้ว แต่ /start ไม่ได้อ่านค่านั้นเลย"
 *    ⇒ เพิ่ม hero ใหม่แล้วลืมเติมใน segmentFor() = ประตูที่ล็อกอยู่
 * ══════════════════════════════════════════════════════════════════════ */

describe('ประตูต้องเปิดจริง — segmentFor ต้องรู้จัก audit', () => {
  it('?seg=audit ใช้ได้ตรง ๆ', () => {
    expect(segmentFor('?seg=audit')).toBe('audit');
  });

  it('มาจากคอนเทนต์/แอดที่ติด utm เรื่องมาตรฐาน → เข้า audit', () => {
    for (const kw of ['iso', 'ไอเอสโอ', 'audit', 'ตรวจประเมิน', 'มอก', 'pdpa', 'ใบรับรอง']) {
      expect(segmentFor(`?utm_campaign=${encodeURIComponent(kw)}`), `คำว่า "${kw}" ต้องเข้า audit`)
        .toBe('audit');
    }
  });

  it('ต้องชนะคำที่เคยกินมันไป — "ระบบ ISO" ห้ามตกไปเข้า owner', () => {
    // 'ระบบ' แมตช์ owner · ถ้า audit ไม่ได้ถูกเช็คก่อน คนกลุ่มนี้จะเจอพาดหัวผิดกลุ่ม
    expect(segmentFor('?utm_campaign=' + encodeURIComponent('วางระบบ iso'))).toBe('audit');
  });

  it('ไม่จับผิดกลุ่มอื่น', () => {
    expect(segmentFor('?seg=seller')).toBe('seller');
    expect(segmentFor('?utm_campaign=' + encodeURIComponent('ต้นทุนอาหาร'))).toBe('food');
  });
});

describe('เนื้อหาของประตู — ต้องพูดกับคนที่รู้ปัญหาแล้ว', () => {
  const h = HERO_VARIANTS.audit;

  it('มีใน HERO_VARIANTS (ใช้สร้าง title/description ของหน้าให้ตรงกลุ่ม)', () => {
    expect(h).toBeTruthy();
  });

  it('พูดถึง "วันตรวจ" ตรง ๆ — ไม่ต้องอ้อมเหมือนกลุ่มที่ยังไม่รู้ตัว', () => {
    expect(`${h.badge} ${h.h1a}`).toContain('วันตรวจ');
  });

  it('🚫 ห้ามสัญญาว่าจะได้ใบรับรอง — การรับรองเป็นอำนาจของหน่วยรับรอง', () => {
    const all = [h.badge, h.h1a, ...h.h1bLines, h.subLead, h.subRest, h.ctaLabel].join(' ');
    expect(all).not.toMatch(/ได้ใบรับรอง|ผ่านการรับรอง|รับรองว่าได้ใบ/);
  });

  it('ผ่านกฎคำต้องห้ามของแบรนด์ทั้งชุด', () => {
    const all = [h.badge, h.h1a, ...h.h1bLines, h.subLead, h.subRest].join(' ');
    expect(violatesBrand(all)).toEqual([]);
  });

  it('ชี้ไปหน้าที่มีอยู่จริงและตอบโจทย์กลุ่มนี้ (ทะเบียนกระบวนการ)', () => {
    expect(h.page).toBe('process');
  });
});

describe('🔴 มีกลไกเดียวที่ตัดสินว่าใครเป็นกลุ่ม "มีวันตรวจ"', () => {
  const start = readFileSync(resolve(__dirname, '../../pages/StartLanding.tsx'), 'utf8')
    .replace(/\r\n/g, '\n');

  it('/start ต้องไม่มี matcher ของตัวเองแยกจาก segmentFor', () => {
    // เดิม: utm_campaign ที่มีคำว่า 'iso' เท่านั้น ⇒ audit/มอก/pdpa ไม่เข้าประตู
    expect(start, 'ห้ามเช็ค utm_campaign เองในหน้านี้ — ให้ segmentFor ตัดสินที่เดียว')
      .not.toMatch(/utm_campaign.*includes\('iso'\)/);
    expect(start).toContain("seg === 'audit'");
  });

  it('สะพานจากเว็บบริษัทยังใช้ได้ (ref=btctraining ไม่ได้มาทาง utm)', () => {
    expect(start).toContain("'btctraining'");
  });

  it('ไม่มี START_HEROES.audit ที่เป็นโค้ดตาย (isIso ชนะเสมอ ⇒ ไม่มีวันเรนเดอร์)', () => {
    const sh = readFileSync(resolve(__dirname, '../startHero.ts'), 'utf8');
    expect(sh).not.toContain('audit:');
  });
});
