import { describe, it, expect } from 'vitest';
import {
  scoreLead, rankLeads, checkupLeadStats, checkupLeadsCsv, sourceLabel,
  type CheckupLead,
} from '../checkupLeads';

const base: CheckupLead = {
  id: '1', email: 'a@b.com', company: null, pct: 50, band: 'weak',
  source: 'quick12', created_at: '2026-08-13T00:00:00Z',
};
const mk = (o: Partial<CheckupLead>): CheckupLead => ({ ...base, ...o });

describe('checkupLeads — จัดลำดับว่าควรติดต่อใครก่อน', () => {
  it('ทำแบบเต็มจนจบ + คะแนนต่ำ + ระบุบริษัท = ร้อนที่สุด', () => {
    const l = scoreLead(mk({ source: 'iso9001', pct: 20, company: 'บริษัททดสอบ' }));
    expect(l.heat).toBe('hot');
    expect(l.heatReason.length).toBeGreaterThan(10);
  });

  it('คะแนนเต็มแล้ว = ไม่ควรรบกวน (ระบบเขาพร้อมอยู่แล้ว)', () => {
    const l = scoreLead(mk({ pct: 95, source: 'quick12' }));
    expect(l.heat).toBe('cold');
  });

  it('ทำแบบเต็มได้คะแนนความสำคัญสูงกว่าทำแบบเร็ว เมื่อคะแนนเท่ากัน', () => {
    const full = scoreLead(mk({ source: 'iso14001', pct: 40 }));
    const quick = scoreLead(mk({ source: 'quick12', pct: 40 }));
    expect(full.score).toBeGreaterThan(quick.score);
  });

  it('ระบุชื่อบริษัท = ตั้งใจกว่าคนที่ไม่ระบุ', () => {
    const withCo = scoreLead(mk({ company: 'ร้านทดสอบ' }));
    const without = scoreLead(mk({ company: null }));
    expect(withCo.score).toBeGreaterThan(without.score);
  });

  it('คะแนนยิ่งต่ำ ยิ่งมีงานให้ทำ ยิ่งควรติดต่อก่อน', () => {
    expect(scoreLead(mk({ pct: 10 })).score).toBeGreaterThan(scoreLead(mk({ pct: 70 })).score);
  });

  it('เรียงลำดับ: ร้อนก่อนเย็น · คะแนนเท่ากันเอาคนที่เพิ่งทำก่อน', () => {
    const ranked = rankLeads([
      mk({ id: 'cold', pct: 95 }),
      mk({ id: 'hot', pct: 15, source: 'iso9001', company: 'X' }),
      mk({ id: 'mid', pct: 55, company: 'Y' }),
    ]);
    expect(ranked[0].id).toBe('hot');
    expect(ranked[ranked.length - 1].id).toBe('cold');
  });

  it('คนที่ทำวันเดียวกันและคะแนนเท่ากัน เรียงคนล่าสุดขึ้นก่อน', () => {
    const ranked = rankLeads([
      mk({ id: 'old', created_at: '2026-08-01T00:00:00Z' }),
      mk({ id: 'new', created_at: '2026-08-12T00:00:00Z' }),
    ]);
    expect(ranked[0].id).toBe('new');
  });

  it('รายการว่างไม่ทำให้พัง', () => {
    expect(rankLeads([])).toEqual([]);
    const s = checkupLeadStats([], '2026-08-13T00:00:00Z');
    expect(s.total).toBe(0);
    expect(s.avgPct).toBe(0);
  });
});

describe('checkupLeads — สรุปตัวเลข', () => {
  it('นับแยกร้อน/อุ่น/เย็น และค่าเฉลี่ยถูกต้อง', () => {
    const ranked = rankLeads([
      mk({ id: '1', pct: 20, source: 'iso9001', company: 'A' }),
      mk({ id: '2', pct: 90 }),
      mk({ id: '3', pct: 40, company: 'C' }),
    ]);
    const s = checkupLeadStats(ranked, '2026-08-13T00:00:00Z');
    expect(s.total).toBe(3);
    expect(s.hot + s.warm + s.cold).toBe(3);
    expect(s.avgPct).toBe(50);
    expect(s.full).toBe(1);
    expect(s.withCompany).toBe(2);
  });

  it('นับ 7 วันล่าสุดจากวันที่จริง ไม่ใช่ทั้งหมด', () => {
    const ranked = rankLeads([
      mk({ id: 'recent', created_at: '2026-08-12T00:00:00Z' }),
      mk({ id: 'old', created_at: '2026-07-01T00:00:00Z' }),
    ]);
    expect(checkupLeadStats(ranked, '2026-08-13T00:00:00Z').last7d).toBe(1);
  });

  it('วันที่พังไม่ทำให้ตัวเลขเพี้ยน', () => {
    const ranked = rankLeads([mk({ created_at: 'ไม่ใช่วันที่' })]);
    expect(() => checkupLeadStats(ranked, '2026-08-13T00:00:00Z')).not.toThrow();
    expect(checkupLeadStats(ranked, '2026-08-13T00:00:00Z').last7d).toBe(0);
  });
});

describe('checkupLeads — ส่งออก CSV', () => {
  it('มีหัวตารางครบและหนึ่งแถวต่อหนึ่งลีด', () => {
    const csv = checkupLeadsCsv(rankLeads([mk({}), mk({ id: '2' })]));
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('อีเมล');
    expect(lines[0]).toContain('ความน่าติดต่อ');
  });

  it('escape เครื่องหมายคำพูดในชื่อบริษัท ไม่ทำให้คอลัมน์เพี้ยน', () => {
    const csv = checkupLeadsCsv(rankLeads([mk({ company: 'ร้าน "ทดสอบ" จำกัด' })]));
    expect(csv).toContain('""ทดสอบ""');
  });

  it('ชื่อแบบที่ทำแปลเป็นไทย และค่าที่ไม่รู้จักไม่หายไป', () => {
    expect(sourceLabel('iso9001')).toContain('ISO 9001');
    expect(sourceLabel('quick12')).toContain('12');
    expect(sourceLabel(null)).toBe('ไม่ระบุ');
    expect(sourceLabel('อะไรก็ไม่รู้')).toBe('อะไรก็ไม่รู้');
  });
});
