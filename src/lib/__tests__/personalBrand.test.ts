import { describe, it, expect } from 'vitest';
import { pickArchetype, brandKit } from '../personalBrand';
import { DEFAULT_DATA } from '../../data';
import type { AppData } from '../../types';

function withCompany(patch: Partial<AppData['aiCompany']>): AppData {
  return { ...DEFAULT_DATA, aiCompany: { ...DEFAULT_DATA.aiCompany, ...patch } };
}

describe('pickArchetype', () => {
  it('อุตสาหกรรม ISO/ที่ปรึกษา → Sage', () => {
    expect(pickArchetype(withCompany({ industry: 'ที่ปรึกษา ISO 9001', goal: '', productDesc: '' })).key).toBe('sage');
  });
  it('อาหาร/คอนเทนต์/ดีไซน์ → Creator', () => {
    expect(pickArchetype(withCompany({ industry: 'ร้านอาหาร', goal: '', productDesc: '' })).key).toBe('creator');
  });
  it('ขาย/เติบโต/startup → Hero', () => {
    expect(pickArchetype(withCompany({ industry: 'อีคอมเมิร์ซ', goal: 'เพิ่มยอดขาย เติบโต', productDesc: '' })).key).toBe('hero');
  });
  it('บริการ/ดูแล/สุขภาพ → Caregiver', () => {
    expect(pickArchetype(withCompany({ industry: 'บริการดูแลสุขภาพ', goal: '', productDesc: '' })).key).toBe('caregiver');
  });
});

describe('brandKit', () => {
  it('คืน pillars 4 ด้าน · 3 tagline · voice ไม่ว่าง', () => {
    const b = brandKit(DEFAULT_DATA);
    expect(b.pillars).toHaveLength(4);
    expect(b.taglines).toHaveLength(3);
    expect(b.voice.length).toBeGreaterThan(0);
    expect(b.channels.length).toBe(3);
    expect(b.positioning).toContain(b.name);
  });
});
