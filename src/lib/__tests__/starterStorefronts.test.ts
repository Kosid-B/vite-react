import { describe, it, expect } from 'vitest';
import { STARTER_LISTINGS } from '../starterStorefronts';

describe('STARTER_LISTINGS — seed จริง (ไม่ใช่ร้านปลอม)', () => {
  it('มีรายการ + ทุกอันมี field ครบ + href จริง', () => {
    expect(STARTER_LISTINGS.length).toBeGreaterThanOrEqual(3);
    for (const l of STARTER_LISTINGS) {
      expect(l.id).toBeTruthy();
      expect(l.name).toBeTruthy();
      expect(l.vp.length).toBeGreaterThan(10);
      expect(l.services.length).toBeGreaterThan(0);
      expect(l.href).toMatch(/^(https?:\/\/|\/)/);   // URL จริงหรือ path ในแอป
    }
  });
  it('id ไม่ซ้ำ', () => {
    const ids = STARTER_LISTINGS.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
