import { describe, it, expect } from 'vitest';
import { layoutAbVariant, LAYOUT_AB_LABEL, type LayoutAb } from '../landingLayoutExperiment';

describe('landingLayoutExperiment', () => {
  it('คืนค่าเป็น variant ที่ถูกต้องเสมอ', () => {
    for (const id of ['a', 'b', 'c', 'anon', '', 'ab-xyz123']) {
      const v = layoutAbVariant(id);
      expect(v === 'explain_first' || v === 'proof_first').toBe(true);
    }
  });

  it('deterministic — id เดิมได้ variant เดิมเสมอ', () => {
    const id = 'ab-stable-9f2';
    const first = layoutAbVariant(id);
    for (let i = 0; i < 20; i++) expect(layoutAbVariant(id)).toBe(first);
  });

  it('แบ่งกลุ่มได้ทั้งสองฝั่ง (ไม่เท stay ข้างเดียว) จากหลาย id', () => {
    const seen = new Set<LayoutAb>();
    for (let i = 0; i < 200; i++) seen.add(layoutAbVariant('ab-' + i));
    expect(seen.has('explain_first')).toBe(true);
    expect(seen.has('proof_first')).toBe(true);
  });

  it('ทุก variant มี label โปร่งใส (ผู้ใช้/แอดมินอ่านเข้าใจ)', () => {
    (['explain_first', 'proof_first'] as LayoutAb[]).forEach(v => {
      expect(LAYOUT_AB_LABEL[v].length).toBeGreaterThan(0);
    });
  });
});
