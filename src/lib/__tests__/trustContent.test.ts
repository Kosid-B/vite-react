import { describe, it, expect } from 'vitest';
import { TRUST_STEPS, trustBriefReady, trustLocalScaffold, buildTrustPrompt, type TrustBrief } from '../trustContent';

const brief: TrustBrief = { topic: 'คอร์สทำขนม', audience: 'แม่บ้านวัย 30-45', goal: 'เก็บรายชื่อ', channel: 'Facebook' };

describe('trustContent', () => {
  it('TRUST_STEPS มี 5 ขั้น สะกด T-R-U-S-T', () => {
    expect(TRUST_STEPS).toHaveLength(5);
    expect(TRUST_STEPS.map(s => s.letter).join('')).toBe('TRUST');
    expect(TRUST_STEPS.map(s => s.key)).toEqual(['target', 'resonate', 'unique', 'social', 'track']);
  });

  it('trustBriefReady ต้องมีหัวข้อ', () => {
    expect(trustBriefReady(brief)).toBe(true);
    expect(trustBriefReady({ ...brief, topic: '   ' })).toBe(false);
  });

  it('trustLocalScaffold คืน 5 ขั้น + interpolate brief', () => {
    const s = trustLocalScaffold(brief);
    expect(s).toHaveLength(5);
    expect(s.map(x => x.letter).join('')).toBe('TRUST');
    expect(s[0].prompt).toContain('คอร์สทำขนม');
    expect(s[0].prompt).toContain('แม่บ้านวัย 30-45');
    expect(s[4].prompt).toContain('เก็บรายชื่อ');
  });

  it('trustLocalScaffold ใช้ fallback เมื่อ brief ว่าง (ไม่พัง)', () => {
    const s = trustLocalScaffold({ topic: '', audience: '', goal: '', channel: '' });
    expect(s).toHaveLength(5);
    expect(s[0].prompt.length).toBeGreaterThan(0);
  });

  it('buildTrustPrompt มี brief + guardrail ห้ามแต่งตัวเลข/รีวิว', () => {
    const p = buildTrustPrompt(brief);
    expect(p).toContain('คอร์สทำขนม');
    expect(p).toContain('T.R.U.S.T.');
    expect(p).toContain('ห้ามแต่งตัวเลข');
    expect(p).toContain('Social proof');
  });
});
