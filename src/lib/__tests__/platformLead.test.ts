import { describe, it, expect } from 'vitest';
import { validateLead, readUtm, channelBreakdown, channelLabel, leadStats, leadsCsv, type Lead } from '../platformLead';

const lead = (o: Partial<Lead>): Lead => ({
  id: o.id ?? 'x', contact: o.contact ?? 'a@b.com', name: o.name ?? '', interest: o.interest ?? '',
  source: o.source ?? '', medium: o.medium ?? '', campaign: o.campaign ?? '', at: o.at ?? '2026-08-01',
});

describe('validateLead', () => {
  it('ผ่านเมื่อมี contact + ยินยอม', () => {
    expect(validateLead({ contact: 'me@mail.com', consent: true }).ok).toBe(true);
  });
  it('ปฏิเสธ contact สั้นเกินไป', () => {
    expect(validateLead({ contact: 'a@b', consent: true }).ok).toBe(false);
  });
  it('ปฏิเสธเมื่อไม่ยินยอม (PDPA)', () => {
    const r = validateLead({ contact: 'me@mail.com', consent: false });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('ยินยอม');
  });
  it('ปฏิเสธ contact ยาวเกิน', () => {
    expect(validateLead({ contact: 'x'.repeat(201), consent: true }).ok).toBe(false);
  });
});

describe('readUtm', () => {
  it('ดึง utm จาก query', () => {
    expect(readUtm('?utm_source=btraining&utm_medium=fb&utm_campaign=founding50'))
      .toEqual({ source: 'btraining', medium: 'fb', campaign: 'founding50' });
  });
  it('ไม่มี utm → ค่าว่าง', () => {
    expect(readUtm('')).toEqual({ source: '', medium: '', campaign: '' });
  });
});

describe('channelLabel', () => {
  it('แปลงชื่อช่องที่รู้จัก', () => {
    expect(channelLabel('fb')).toBe('Facebook');
    expect(channelLabel('TIKTOK')).toBe('TikTok');
  });
  it('ค่าว่าง = ตรง (ไม่มี utm)', () => {
    expect(channelLabel('')).toBe('ตรง (ไม่มี utm)');
  });
});

describe('channelBreakdown', () => {
  it('นับตาม medium เรียงมากไปน้อย + %', () => {
    const leads = [
      lead({ medium: 'fb' }), lead({ medium: 'fb' }), lead({ medium: 'tiktok' }), lead({ medium: '' }),
    ];
    const r = channelBreakdown(leads, 'medium');
    expect(r[0]).toMatchObject({ key: 'fb', label: 'Facebook', count: 2, pct: 50 });
    expect(r.find(x => x.key === '(direct)')?.count).toBe(1);
  });
  it('list ว่าง → []', () => {
    expect(channelBreakdown([], 'source')).toEqual([]);
  });
});

describe('leadStats', () => {
  it('นับ 7 วันล่าสุดจาก todayIso', () => {
    const leads = [
      lead({ at: '2026-08-05' }), lead({ at: '2026-08-01' }), lead({ at: '2026-07-01' }),
    ];
    const s = leadStats(leads, '2026-08-05');
    expect(s.total).toBe(3);
    expect(s.last7).toBe(2); // 08-05 และ 08-01 อยู่ใน 7 วัน, 07-01 ไม่อยู่
  });
});

describe('leadsCsv', () => {
  it('escape เครื่องหมายคำพูด + มี header', () => {
    const csv = leadsCsv([lead({ contact: 'me@x.com', interest: 'ขาย "ของ"' })]);
    expect(csv.split('\n')[0]).toContain('ติดต่อ');
    expect(csv).toContain('""ของ""');
  });
});
