import { describe, it, expect } from 'vitest';
import { buildUvp, MOAT_LABEL, type UvpInput } from '../uvpBuilder';

const full: UvpInput = {
  segment: 'ร้านกาแฟ SME', pain: 'ไม่มีเวลาทำการตลาด', benefit: 'ได้ลูกค้าประจำเพิ่ม',
  quantified: '+20 ลูกค้า/เดือน', competitor: 'จ้างเอเจนซี่', differentiator: 'AI ทำให้ 24 ชม. ราคาเศษเสี้ยว',
  moatType: 'data',
};

describe('uvpBuilder', () => {
  it('full input → grade strong + score สูง', () => {
    const r = buildUvp(full);
    expect(r.score).toBe(100);
    expect(r.grade).toBe('strong');
    expect(r.statement).toContain('ร้านกาแฟ SME');
    expect(r.statement).toContain('+20 ลูกค้า/เดือน');
    expect(r.variants.length).toBe(3);
  });

  it('ไม่มี moat → defensibility 0 + โค้ชเรื่อง moat', () => {
    const r = buildUvp({ ...full, moatType: 'none' });
    const d = r.dimensions.find(x => x.key === 'defensibility')!;
    expect(d.level).toBe(0);
    expect(d.note).toBe(MOAT_LABEL.none);
    expect(r.coaching.some(c => c.includes('moat'))).toBe(true);
    expect(r.grade).not.toBe('strong');
  });

  it('ไม่มีตัวเลขคุณค่า → value = 1 + โค้ชให้ทำเป็นตัวเลข', () => {
    const r = buildUvp({ ...full, quantified: '' });
    expect(r.dimensions.find(x => x.key === 'value')!.level).toBe(1);
    expect(r.coaching.some(c => c.includes('ตัวเลข'))).toBe(true);
  });

  it('ว่างทั้งหมด → weak + statement มี placeholder', () => {
    const r = buildUvp({ segment: '', pain: '', benefit: '', quantified: '', competitor: '', differentiator: '', moatType: 'none' });
    expect(r.grade).toBe('weak');
    expect(r.score).toBe(0);
    expect(r.statement).toContain('[ลูกค้าเป้าหมาย]');
  });

  it('network moat = ยั่งยืน (level 2)', () => {
    expect(buildUvp({ ...full, moatType: 'network' }).dimensions.find(x => x.key === 'defensibility')!.level).toBe(2);
    expect(buildUvp({ ...full, moatType: 'brand' }).dimensions.find(x => x.key === 'defensibility')!.level).toBe(1);
  });
});
