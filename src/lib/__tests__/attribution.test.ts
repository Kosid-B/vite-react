import { describe, it, expect } from 'vitest';
import {
  channelFromUtm, channelFromReferrer, resolveChannel, sourceFrom,
  aggregateSignups, signupsForWeek, type SignupRecord,
} from '../attribution';
import { isoWeekTag, G_CHANNELS } from '../growthEconomics';

describe('channelFromUtm', () => {
  it('map แหล่งหลัก', () => {
    expect(channelFromUtm({ source: 'youtube' })).toBe('youtube');
    expect(channelFromUtm({ source: 'line' })).toBe('line');
    expect(channelFromUtm({ source: 'facebook', medium: 'group' })).toBe('fb_group');
    expect(channelFromUtm({ medium: 'organic', source: 'google' })).toBe('seo');
    expect(channelFromUtm({ source: 'share', medium: 'app' })).toBe('word_of_mouth');
  });
  it('จับไม่ได้ → ว่าง', () => {
    expect(channelFromUtm({ source: 'newsletter' })).toBe('');
  });
});

describe('channelFromReferrer', () => {
  it('map host', () => {
    expect(channelFromReferrer('https://www.youtube.com/watch?v=x')).toBe('youtube');
    expect(channelFromReferrer('https://m.facebook.com/groups/1')).toBe('fb_group');
    expect(channelFromReferrer('https://www.google.com/search')).toBe('seo');
    expect(channelFromReferrer('https://line.me/')).toBe('line');
  });
  it('direct/unknown → ว่าง', () => {
    expect(channelFromReferrer('')).toBe('');
    expect(channelFromReferrer('https://example.com')).toBe('');
  });
});

describe('resolveChannel', () => {
  it('utm ก่อน → referrer → other', () => {
    expect(resolveChannel({ source: 'youtube' }, 'https://google.com')).toBe('youtube');
    expect(resolveChannel({}, 'https://youtube.com')).toBe('youtube');
    expect(resolveChannel({}, '')).toBe('other');
  });
});

describe('sourceFrom', () => {
  it('อ่าน utm จาก query + จับช่องทาง', () => {
    const s = sourceFrom('?utm_source=youtube&utm_medium=video&utm_campaign=ep1', 'https://x.com');
    expect(s.channel).toBe('youtube');
    expect(s.source).toBe('youtube');
    expect(s.campaign).toBe('ep1');
  });
  it('ไม่มี utm → ใช้ referrer', () => {
    expect(sourceFrom('', 'https://www.google.com/search').channel).toBe('seo');
  });
});

describe('aggregateSignups + signupsForWeek', () => {
  const wk = isoWeekTag(new Date('2026-08-05T00:00:00Z'));
  const records: SignupRecord[] = [
    { at: '2026-08-05', channel: 'youtube' },
    { at: '2026-08-06', channel: 'youtube' },
    { at: '2026-08-06', channel: 'line' },
    { at: 'invalid', channel: 'seo' },   // ข้าม
  ];

  it('รวมต่อสัปดาห์ต่อช่องทาง', () => {
    const agg = aggregateSignups(records);
    expect(agg[wk].youtube).toBe(2);
    expect(agg[wk].line).toBe(1);
  });

  it('signupsForWeek เติมครบทุกช่องทาง (ว่าง=0)', () => {
    const w = signupsForWeek(records, wk);
    expect(w.youtube).toBe(2);
    expect(w.seo).toBe(0);
    // ⚠️ ห้าม hardcode จำนวนช่องทาง — เดิมล็อกไว้ที่ 6 แล้วพอเพิ่ม TikTok/Instagram/
    // LinkedIn/ออฟไลน์ (19 ส.ค. 2569) เทสต์ล้มทั้งที่โค้ดถูก · ต้องเทียบกับรายการจริง
    expect(Object.keys(w).sort()).toEqual(G_CHANNELS.map((c) => c.id).sort());
  });

  it('สัปดาห์ที่ไม่มีข้อมูล → ทุกช่อง 0', () => {
    expect(signupsForWeek(records, '1999-W01').youtube).toBe(0);
  });
});
