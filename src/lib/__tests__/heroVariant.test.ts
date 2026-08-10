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
