import { describe, it, expect } from 'vitest';
import { segmentFor, pickHeroVariant, HERO_VARIANTS } from '../heroVariant';

describe('segmentFor', () => {
  it('ไม่มี signal → default', () => {
    expect(segmentFor('')).toBe('default');
    expect(segmentFor('?utm_source=fb')).toBe('default');
  });

  it('?seg= ระบุตรง ๆ ชนะทุกอย่าง', () => {
    expect(segmentFor('?seg=seller')).toBe('seller');
    expect(segmentFor('?seg=newbie')).toBe('newbie');
    expect(segmentFor('?seg=owner')).toBe('owner');
    expect(segmentFor('?seg=palm')).toBe('palm');
    expect(segmentFor('?seg=food')).toBe('food');
    // seg ไม่รู้จัก → ตกไปดู signal อื่น (ไม่มี) → default
    expect(segmentFor('?seg=bogus')).toBe('default');
  });

  it('?goal= map เข้ากลุ่มถูก', () => {
    expect(segmentFor('?goal=storefront')).toBe('seller');
    expect(segmentFor('?goal=validate')).toBe('newbie');
    expect(segmentFor('?goal=aicompany')).toBe('owner');
  });

  it('utm keyword จับกลุ่ม', () => {
    expect(segmentFor('?utm_campaign=sprint_shop')).toBe('seller');
    expect(segmentFor('?utm_content=sme_owner')).toBe('owner');
    expect(segmentFor('?utm_campaign=newbie_idea')).toBe('newbie');
    expect(segmentFor('?utm_campaign=palm_drama')).toBe('palm');
    expect(segmentFor('?utm_content=ไบโอดีเซล')).toBe('palm');
    expect(segmentFor('?utm_campaign=food_cost')).toBe('food');
    expect(segmentFor('?utm_content=แม่ค้าแกงถุง')).toBe('food');
  });

  it('referrer/utm_source heuristic', () => {
    expect(segmentFor('?utm_source=tiktok')).toBe('newbie');
    expect(segmentFor('', 'https://www.linkedin.com/feed/')).toBe('owner');
    expect(segmentFor('', 'https://www.instagram.com/')).toBe('newbie');
  });

  it('ลำดับความชัดเจน: seg > goal > utm > referrer', () => {
    // seg=owner ชนะ goal=storefront
    expect(segmentFor('?seg=owner&goal=storefront')).toBe('owner');
    // goal ชนะ referrer
    expect(segmentFor('?goal=storefront', 'https://linkedin.com')).toBe('seller');
  });
});

describe('pickHeroVariant', () => {
  it('คืน variant ตรงกับ segment + มี field ครบ', () => {
    const v = pickHeroVariant('?seg=seller');
    expect(v.seg).toBe('seller');
    expect(v.goal).toBe('sell');
    expect(v.page).toBe('storefront');
    expect(v.h1a.length).toBeGreaterThan(0);
    expect(v.h1bLines.length).toBeGreaterThan(0);
    expect(v.ctaLabel).toContain('เปิดหน้าร้าน');
  });

  it('palm variant พาไป validate (bmc) + ข้อความปาล์ม', () => {
    const v = pickHeroVariant('?seg=palm');
    expect(v.seg).toBe('palm');
    expect(v.goal).toBe('validate');
    expect(v.page).toBe('bmc');
    expect(v.ctaLabel).toContain('ปาล์ม');
  });

  it('food variant พาไปทีม AI (aicompany) + ข้อความต้นทุน', () => {
    const v = pickHeroVariant('?seg=food');
    expect(v.seg).toBe('food');
    expect(v.goal).toBe('aicompany');
    expect(v.page).toBe('aicompany');
    expect(v.ctaLabel).toContain('ต้นทุน');
  });

  it('default variant ไม่บังคับ goal (ให้ GoalChooser ถาม)', () => {
    const v = pickHeroVariant('');
    expect(v.seg).toBe('default');
    expect(v.goal).toBeNull();
    expect(v.page).toBeNull();
  });

  it('ทุก variant มี badge + subLead ไม่ว่าง (default ctaLabel ว่างได้)', () => {
    (Object.keys(HERO_VARIANTS) as (keyof typeof HERO_VARIANTS)[]).forEach((k) => {
      const v = HERO_VARIANTS[k];
      expect(v.badge.length).toBeGreaterThan(0);
      expect(v.subLead.length).toBeGreaterThan(0);
      if (k !== 'default') expect(v.ctaLabel.length).toBeGreaterThan(0);
    });
  });
});

/* 🔀 ลิงก์ที่เข้ามาจาก Marketing OS ต้องถึงพาดหัวที่ถูกกลุ่ม (19 พ.ย. 2569)
 *    เทสต์นี้วัดจาก **ผลที่ผู้ใช้เห็น** (HeroSeg ที่ได้) ไม่ใช่ว่า alias มีคีย์ครบไหม
 *    — ความตรงของตัว alias เองอยู่ใน brandSync.test.ts */
describe('🔀 segmentFor รับรหัสของ Marketing OS', () => {
  it('?seg=growth → owner · ?seg=employee → sidebiz', () => {
    expect(segmentFor('?seg=growth')).toBe('owner');
    expect(segmentFor('?seg=employee')).toBe('sidebiz');
  });

  it('ไม่สนตัวพิมพ์เล็กใหญ่ (แคปชั่นคนพิมพ์มือ)', () => {
    expect(segmentFor('?seg=GROWTH')).toBe('owner');
    expect(segmentFor('?seg=Employee')).toBe('sidebiz');
  });

  it('🔴 รหัสของเราเองต้องชนะ alias เสมอ — alias อยู่หลังด่าน 1', () => {
    expect(segmentFor('?seg=owner')).toBe('owner');
    expect(segmentFor('?seg=sidebiz')).toBe('sidebiz');
    expect(segmentFor('?seg=seller')).toBe('seller');
  });

  it('🔴 ?seg=graduate ต้องเป็น default — เรายังไม่มีพาดหัวให้ ห้ามเดา', () => {
    // พาดหัวผิดกลุ่ม แย่กว่าพาดหัวกลาง ๆ · วันที่มี HeroSeg ให้ graduate ค่อยแก้เทสต์นี้
    expect(segmentFor('?seg=graduate')).toBe('default');
  });

  it('alias ต้องไม่กลืนด่านถัด ๆ ไป — รหัสที่ไม่รู้จักยังตกไปอ่าน goal/utm ได้', () => {
    expect(segmentFor('?seg=ไม่มีจริง&goal=validate')).toBe('newbie');
    expect(segmentFor('?seg=&utm_content=ปาล์ม')).toBe('palm');
  });

  it('พาดหัวที่ได้ต้องเป็นของกลุ่มนั้นจริง ไม่ใช่แค่ชื่อ seg ตรง', () => {
    // 🔴 ชั้นนี้คือสิ่งที่ผู้ใช้เห็นจริง — เทียบกับพาดหัวของ owner/sidebiz ตัวจริง
    expect(pickHeroVariant('?seg=growth').h1a).toBe(pickHeroVariant('?seg=owner').h1a);
    expect(pickHeroVariant('?seg=employee').h1a).toBe(pickHeroVariant('?seg=sidebiz').h1a);
    expect(pickHeroVariant('?seg=growth').h1a).not.toBe(pickHeroVariant('').h1a);
  });
});
