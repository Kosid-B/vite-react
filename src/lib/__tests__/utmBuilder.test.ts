import { describe, it, expect } from 'vitest';
import { buildUtmUrl, presetFor, UTM_PRESETS } from '../utmBuilder';
import { channelFromUtm } from '../attribution';

describe('buildUtmUrl', () => {
  it('ต่อ utm ครบ 3 ตัว + encode', () => {
    expect(buildUtmUrl('https://ceoaithailand.org/', { source: 'youtube', medium: 'video', campaign: 'ep 1' }))
      .toBe('https://ceoaithailand.org/?utm_source=youtube&utm_medium=video&utm_campaign=ep%201');
  });
  it('ข้ามค่าว่าง', () => {
    expect(buildUtmUrl('https://x.org/start', { source: 'line' })).toBe('https://x.org/start?utm_source=line');
  });
  it('ไม่มี param → คืน base เดิม', () => {
    expect(buildUtmUrl('https://x.org/', {})).toBe('https://x.org/');
  });
  it('base มี query อยู่แล้ว → ใช้ &', () => {
    expect(buildUtmUrl('https://x.org/?a=1', { source: 'fb' })).toBe('https://x.org/?a=1&utm_source=fb');
  });
});

describe('UTM presets ↔ attribution (ต้อง resolve กลับช่องเดิม)', () => {
  it('preset ที่ taggable → channelFromUtm คืนช่องเดิม', () => {
    (['youtube', 'fb_group', 'line', 'word_of_mouth'] as const).forEach(ch => {
      const p = presetFor(ch);
      expect(channelFromUtm({ source: p.source, medium: p.medium })).toBe(ch);
    });
  });
  it('seo = ไม่ taggable (organic)', () => {
    expect(UTM_PRESETS.seo.taggable).toBe(false);
  });
});
