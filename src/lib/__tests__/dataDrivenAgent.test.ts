import { describe, it, expect } from 'vitest';
import {
  DATA_DRIVEN_AGENT,
  DATA_DRIVEN_COMPETENCIES,
  DATA_DRIVEN_RULES,
  DATA_DRIVEN_WORKFLOW,
  dataDrivenInstruction,
} from '../dataDrivenAgent';
import { DEFAULT_DATA } from '../../data';

describe('DATA_DRIVEN_AGENT', () => {
  it('เป็น agent ครบ field + ขึ้นตรงต่อ CEO', () => {
    expect(DATA_DRIVEN_AGENT.id).toBe('a-cdo');
    expect(DATA_DRIVEN_AGENT.role).toBe('CDO');
    expect(DATA_DRIVEN_AGENT.reportsTo).toBe('a-ceo');
    expect(DATA_DRIVEN_AGENT.mandate.length).toBeGreaterThan(0);
    expect(DATA_DRIVEN_AGENT.knowledgeBase ?? '').toContain('กฎการตัดสินใจ');
  });

  it('mandate เข้ารหัสกฎหลัก (ธุรกิจ ไม่ใช่โรงงาน / TIS ก่อน ISO / Supabase)', () => {
    const m = DATA_DRIVEN_AGENT.mandate;
    expect(m).toContain('ธุรกิจ');
    expect(m).toContain('TIS');
    expect(m).toContain('Supabase');
  });

  it('ถูกฝังในทีมเริ่มต้นของ data.ts', () => {
    const ids = DEFAULT_DATA.aiCompany.agents.map((a) => a.id);
    expect(ids).toContain('a-cdo');
  });
});

describe('constants', () => {
  it('มีความสามารถ 4 ด้าน + กฎ 4 ข้อ + workflow 5 ขั้น', () => {
    expect(DATA_DRIVEN_COMPETENCIES).toHaveLength(4);
    expect(DATA_DRIVEN_RULES).toHaveLength(4);
    expect(DATA_DRIVEN_WORKFLOW).toHaveLength(5);
  });
});

describe('dataDrivenInstruction', () => {
  it('รวมหัวข้อ + มาตรฐาน + กฎ + workflow', () => {
    const out = dataDrivenInstruction({ topic: 'ระบบจัดการเอกสาร', standard: 'TIS 50-2565' });
    expect(out).toContain('ระบบจัดการเอกสาร');
    expect(out).toContain('TIS 50-2565');
    expect(out).toContain('ธุรกิจ'); // กฎ terminology ต้องอยู่ใน prompt
    expect(out).toContain('Actionable');
  });

  it('focus กรองเฉพาะความสามารถที่เลือก', () => {
    const out = dataDrivenInstruction({ topic: 'ออกแบบ DB', focus: 'architecture' });
    expect(out).toContain('System Architecture');
    expect(out).not.toContain('Strategic Marketing');
  });

  it('ไม่ระบุมาตรฐาน → สั่งให้เลือกเอง (TIS ก่อน ISO)', () => {
    const out = dataDrivenInstruction({ topic: 'x' });
    expect(out).toContain('TIS ก่อน ISO');
  });
});
