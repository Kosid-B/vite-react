import { describe, it, expect } from 'vitest';
import { livePersonas } from '../dynamicPersona';
import type { Lead } from '../platformLead';

const mk = (over: Partial<Lead>): Lead => ({
  id: Math.random().toString(36), contact: 'a@b.com', name: '', interest: '',
  source: '', medium: '', campaign: '', seg: '', at: '2026-08-01', ...over,
});

describe('livePersonas', () => {
  it('ไม่มี lead → [] (ไม่ปั้นข้อมูล)', () => {
    expect(livePersonas([])).toEqual([]);
  });

  it('จัดกลุ่มตาม seg + เรียงกลุ่มใหญ่ก่อน + คิด %', () => {
    const leads = [
      mk({ seg: 'newbie' }), mk({ seg: 'newbie' }), mk({ seg: 'newbie' }),
      mk({ seg: 'seller' }),
    ];
    const p = livePersonas(leads);
    expect(p.map(x => x.seg)).toEqual(['newbie', 'seller']);
    expect(p[0].size).toBe(3);
    expect(p[0].pct).toBe(75);
    expect(p[0].label).toContain('มือใหม่');
    expect(p[0].painHook).toContain('กลัวเจ๊ง');
  });

  it('seg ที่ไม่รู้จัก/default → รวมเป็นกลุ่ม "ไม่ระบุกลุ่ม"', () => {
    const p = livePersonas([mk({ seg: 'default' }), mk({ seg: '' }), mk({ seg: 'bogus' })]);
    expect(p).toHaveLength(1);
    expect(p[0].seg).toBe('');
    expect(p[0].label).toContain('ไม่ระบุ');
  });

  it('สรุป topInterests ตามความถี่ (ตัดว่าง)', () => {
    const p = livePersonas([
      mk({ seg: 'newbie', interest: 'ร้านกาแฟ' }),
      mk({ seg: 'newbie', interest: 'ร้านกาแฟ' }),
      mk({ seg: 'newbie', interest: 'ขายเสื้อผ้า' }),
      mk({ seg: 'newbie', interest: '' }),  // ว่าง → ไม่นับ
    ]);
    expect(p[0].topInterests[0]).toEqual({ text: 'ร้านกาแฟ', count: 2 });
    expect(p[0].topInterests.find(i => i.text === '')).toBeUndefined();
  });

  it('สรุป topChannels จาก medium (label อ่านง่าย)', () => {
    const p = livePersonas([
      mk({ seg: 'seller', medium: 'fb' }),
      mk({ seg: 'seller', medium: 'fb' }),
      mk({ seg: 'seller', medium: 'tiktok' }),
    ]);
    expect(p[0].topChannels[0]).toEqual({ label: 'Facebook', count: 2 });
    expect(p[0].topChannels[1]).toEqual({ label: 'TikTok', count: 1 });
  });
});
