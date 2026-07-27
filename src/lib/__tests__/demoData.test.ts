import { describe, it, expect } from 'vitest';
import { DEFAULT_DATA } from '../../data';
import { isDemoCompany, isDemoRoster, isDemoPersonas } from '../demoData';

describe('demoData — ตรวจว่ายังเป็นข้อมูลตัวอย่าง (#3 PLG)', () => {
  it('DEFAULT_DATA (seed) → เป็น demo ทุกส่วน', () => {
    expect(isDemoCompany(DEFAULT_DATA)).toBe(true);
    expect(isDemoRoster(DEFAULT_DATA)).toBe(true);
    expect(isDemoPersonas(DEFAULT_DATA)).toBe(true);
  });

  it('เปลี่ยน goal/industry → ไม่ใช่ demo company แล้ว', () => {
    const d = { ...DEFAULT_DATA, aiCompany: { ...DEFAULT_DATA.aiCompany, goal: 'เป้าหมายของฉันเอง' } };
    expect(isDemoCompany(d)).toBe(false);
  });

  it('เปลี่ยน roster (ลบ/เพิ่มเอเจนต์) → ไม่ใช่ demo roster แล้ว', () => {
    const d = { ...DEFAULT_DATA, aiCompany: { ...DEFAULT_DATA.aiCompany, agents: DEFAULT_DATA.aiCompany.agents.slice(1) } };
    expect(isDemoRoster(d)).toBe(false);
  });

  it('เปลี่ยนรายชื่อ persona → ไม่ใช่ demo personas แล้ว', () => {
    const d = { ...DEFAULT_DATA, personas: DEFAULT_DATA.personas.map((p, i) => i === 0 ? { ...p, name: 'ลูกค้าจริงของฉัน' } : p) };
    expect(isDemoPersonas(d)).toBe(false);
  });
});
