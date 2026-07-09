import { describe, it, expect } from 'vitest';
import type { Agent } from '../../types';
import { detectAreas, pickAgent, findCeo, routeIntake, INTAKE_CATEGORIES } from '../intakeRouter';

const ag = (over: Partial<Agent>): Agent => ({
  id: over.id ?? 'a', role: over.role ?? 'Staff', name: 'x', avatar: '🤖', color: '#000',
  mandate: over.mandate ?? '', model: 'm', status: 'idle', reportsTo: null, ...over,
});

const TEAM: Agent[] = [
  ag({ id: 'ceo', role: 'CEO' }),
  ag({ id: 'cmo', role: 'CMO (การตลาด)' }),
  ag({ id: 'cfo', role: 'CFO', mandate: 'ดูแลการเงินและบัญชี' }),
  ag({ id: 'coo', role: 'COO ปฏิบัติการ' }),
];

describe('detectAreas', () => {
  it('จับหมวดจากคำในเนื้อหา (ไทย+อังกฤษ) เรียงตาม hit', () => {
    const areas = detectAreas('ยอดขายตก อยากได้แคมเปญการตลาดใหม่ และตรวจต้นทุนกำไร');
    const keys = areas.map(a => a.category.key);
    expect(keys).toContain('marketing');
    expect(keys).toContain('finance');
  });
  it('เนื้อหาว่าง → ไม่มีหมวด', () => {
    expect(detectAreas('   ')).toEqual([]);
  });
});

describe('pickAgent / findCeo', () => {
  it('เลือกเอเจนต์ตาม role ก่อน', () => {
    const cat = INTAKE_CATEGORIES.find(c => c.key === 'marketing')!;
    expect(pickAgent(TEAM, cat)?.id).toBe('cmo');
  });
  it('ไม่มี role ตรง → หา mandate → fallback CEO', () => {
    const cat = INTAKE_CATEGORIES.find(c => c.key === 'finance')!;
    expect(pickAgent(TEAM, cat)?.id).toBe('cfo'); // ตรงที่ mandate 'การเงินและบัญชี'
    const noFin = [ag({ id: 'ceo', role: 'CEO' }), ag({ id: 's', role: 'Staff' })];
    expect(pickAgent(noFin, cat)?.id).toBe('ceo'); // fallback CEO
  });
  it('findCeo หา CEO ได้', () => {
    expect(findCeo(TEAM)?.id).toBe('ceo');
    expect(findCeo([ag({ id: 's', role: 'Staff' })])).toBe(null);
  });
});

describe('routeIntake', () => {
  it('มอบงานให้ตำแหน่งที่เกี่ยวข้อง (dedupe 1 เอเจนต์ = 1 งาน)', () => {
    const tasks = routeIntake('อยากได้แคมเปญการตลาด + ตรวจต้นทุนการเงิน + วางแผนผลิตในโรงงาน', TEAM);
    const agentIds = tasks.map(t => t.agentId).sort();
    expect(agentIds).toEqual(['cfo', 'cmo', 'coo']);
    tasks.forEach(t => {
      expect(t.title).toContain(t.areaLabels[0].split('/')[0]);
      expect(t.detail).toContain('รับข้อมูลจากผู้ใช้');
    });
  });

  it('เอเจนต์เดียวรับหลายหมวด → รวมเป็นงานเดียว', () => {
    const solo = [ag({ id: 'ceo', role: 'CEO' })];
    const tasks = routeIntake('การตลาด การเงิน ปฏิบัติการ', solo);
    expect(tasks.length).toBe(1);
    expect(tasks[0].agentId).toBe('ceo');
    expect(tasks[0].areaLabels.length).toBeGreaterThan(1);
  });

  it('ไม่พบหมวดตรง → มอบให้ CEO ทบทวน', () => {
    const tasks = routeIntake('สวัสดีครับ วันนี้อากาศดีมาก', TEAM);
    expect(tasks.length).toBe(1);
    expect(tasks[0].agentId).toBe('ceo');
    expect(tasks[0].areaLabels).toContain('ทบทวนทั่วไป');
  });

  it('ไม่มีทีม หรือ ข้อความว่าง → ไม่สร้างงาน', () => {
    expect(routeIntake('การตลาด', [])).toEqual([]);
    expect(routeIntake('   ', TEAM)).toEqual([]);
  });

  it('sourceLabel ปรากฏใน detail (บอกที่มา ไฟล์/พิมพ์)', () => {
    const tasks = routeIntake('แคมเปญการตลาด', TEAM, 'ไฟล์ plan.txt');
    expect(tasks[0].detail).toContain('ไฟล์ plan.txt');
  });
});
