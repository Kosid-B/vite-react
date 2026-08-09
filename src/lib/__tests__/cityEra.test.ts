import { describe, it, expect } from 'vitest';
import { ERAS, ERA_COUNT, clampEra, eraByIndex, agentsByIndex } from '../cityEra';

describe('cityEra', () => {
  it('มี 5 ยุค เรียงตามความเจริญ + ฟิลด์ครบ', () => {
    expect(ERAS).toHaveLength(5);
    expect(ERA_COUNT).toBe(5);
    ERAS.forEach(e => {
      expect(e.name.length).toBeGreaterThan(0);
      expect(e.maxH).toBeGreaterThan(0);
      expect(e.accent).toMatch(/^hsl\(/);
    });
  });

  it('เมืองสูงขึ้น + สเกลเพิ่มตามยุค (บุกเบิกเตี้ยสุด อนาคตสูงสุด)', () => {
    for (let i = 1; i < ERAS.length; i++) {
      expect(ERAS[i].maxH).toBeGreaterThan(ERAS[i - 1].maxH);
      expect(ERAS[i].floorScale).toBeGreaterThanOrEqual(ERAS[i - 1].floorScale);
    }
  });

  it('clampEra: กันค่าเกินช่วง / NaN', () => {
    expect(clampEra(-3)).toBe(0);
    expect(clampEra(99)).toBe(4);
    expect(clampEra(2)).toBe(2);
    expect(clampEra(NaN)).toBe(0);
    expect(clampEra(2.9)).toBe(2);   // floor
  });

  it('eraByIndex clamp + ตรงกับ ERAS', () => {
    expect(eraByIndex(0).id).toBe('seed');
    expect(eraByIndex(4).id).toBe('neo');
    expect(eraByIndex(100).id).toBe('neo');
  });

  it('agents วิวัฒน์: ยุคแรกไม่มีรถไร้คนขับ/โดรน/humanoid · ยุคสุดท้ายมีครบ', () => {
    const first = agentsByIndex(0), last = agentsByIndex(4);
    expect(first.people).toBeGreaterThan(0);       // มีคนเดินตั้งแต่ยุคแรก
    expect(first.selfDriving).toBe(0);
    expect(first.drones).toBe(0);
    expect(first.humanoids).toBe(0);
    expect(last.selfDriving).toBeGreaterThan(0);
    expect(last.drones).toBeGreaterThan(0);
    expect(last.humanoids).toBeGreaterThan(0);
  });

  it('รถไร้คนขับปรากฏยุคสมาร์ทซิตี้ (index 3) เป็นต้นไป', () => {
    expect(agentsByIndex(2).selfDriving).toBe(0);
    expect(agentsByIndex(3).selfDriving).toBeGreaterThan(0);
  });

  it('humanoid ปรากฏชัดในยุคอนาคต (index 4)', () => {
    expect(agentsByIndex(4).humanoids).toBeGreaterThanOrEqual(agentsByIndex(3).humanoids);
    expect(agentsByIndex(4).humanoids).toBeGreaterThan(0);
  });
});
