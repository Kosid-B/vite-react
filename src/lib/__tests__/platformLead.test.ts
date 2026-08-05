import { describe, it, expect } from 'vitest';
import { validateLead, readUtm } from '../platformLead';

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
