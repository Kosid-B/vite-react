import { describe, it, expect } from 'vitest';
import { grantWelcomeKit, WELCOME_KIT_SKILLS } from '../welcomeKit';
import { SKILL_CATALOG } from '../../data/skillCatalog';

describe('welcomeKit', () => {
  it('skill id ในชุดต้องมีจริงใน SKILL_CATALOG (กัน id ผี)', () => {
    const ids = new Set(SKILL_CATALOG.map((s) => s.id));
    WELCOME_KIT_SKILLS.forEach((id) => expect(ids.has(id)).toBe(true));
  });

  it('ผู้ที่ยังไม่มี skill → เพิ่มครบทั้งชุด', () => {
    const r = grantWelcomeKit([]);
    expect(r.added).toEqual([...WELCOME_KIT_SKILLS]);
    expect(r.skills).toEqual([...WELCOME_KIT_SKILLS]);
  });

  it('idempotent — มีอยู่แล้วบางส่วน เพิ่มเฉพาะที่ขาด ไม่ซ้ำ', () => {
    const r = grantWelcomeKit([WELCOME_KIT_SKILLS[0], 'other-skill']);
    expect(r.added).toEqual(WELCOME_KIT_SKILLS.slice(1));
    expect(r.skills).toContain('other-skill');
    expect(r.skills.filter((s) => s === WELCOME_KIT_SKILLS[0]).length).toBe(1);
  });

  it('มีครบแล้ว → ไม่เพิ่ม + คืน array เดิม (ไม่ dirty)', () => {
    const owned = [...WELCOME_KIT_SKILLS];
    const r = grantWelcomeKit(owned);
    expect(r.added).toEqual([]);
    expect(r.skills).toBe(owned); // อ้างอิงเดิม — ไม่สร้างใหม่โดยไม่จำเป็น
  });

  it('undefined = เริ่มจากว่าง', () => {
    expect(grantWelcomeKit(undefined).added.length).toBe(WELCOME_KIT_SKILLS.length);
  });
});
