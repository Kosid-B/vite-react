import { describe, it, expect } from 'vitest';
import {
  addOutcome, updateOutcome, removeOutcome, outcomesFor,
  outcomePct, outcomeStatus, outcomesSummary, BMC_BLOCKS,
} from '../bmcOutcomes';
import type { AppData } from '../../types';

const base = () => ({ businessModel: { bmc: {}, de24: [] } } as unknown as AppData);
const NOW = new Date('2026-07-18T00:00:00Z');

describe('bmcOutcomes', () => {
  it('มี 9 ช่อง BMC', () => {
    expect(BMC_BLOCKS).toHaveLength(9);
  });

  it('addOutcome เพิ่มผลลัพธ์ + ผูกกับช่องที่ถูก', () => {
    const d = addOutcome(base(), { block: 'revenue', metric: 'รายได้', target: 10000, actual: 7000, unit: 'บาท' }, NOW, 'oc-1');
    const items = outcomesFor(d, 'revenue');
    expect(items).toHaveLength(1);
    expect(items[0].metric).toBe('รายได้');
    expect(items[0].unit).toBe('บาท');
    expect(outcomesFor(d, 'costs')).toHaveLength(0);
  });

  it('metric ว่าง → ไม่เพิ่ม', () => {
    const d = addOutcome(base(), { block: 'value', metric: '   ', target: 5, actual: 1 }, NOW);
    expect(d.businessModel.outcomes ?? []).toHaveLength(0);
  });

  it('outcomePct + outcomeStatus คำนวณถูก', () => {
    expect(outcomePct({ target: 10, actual: 7 })).toBe(70);
    expect(outcomeStatus({ target: 10, actual: 7 })).toBe('ontrack');
    expect(outcomeStatus({ target: 10, actual: 10 })).toBe('done');
    expect(outcomeStatus({ target: 10, actual: 3 })).toBe('behind');
    expect(outcomeStatus({ target: 0, actual: 3 })).toBe('none');
    expect(outcomePct({ target: 0, actual: 3 })).toBe(0);
  });

  it('updateOutcome patch ผลจริง + อัปเดต updatedAt', () => {
    const d1 = addOutcome(base(), { block: 'segments', metric: 'ลูกค้าใหม่', target: 10, actual: 2 }, NOW, 'oc-x');
    const later = new Date('2026-07-19T00:00:00Z');
    const d2 = updateOutcome(d1, 'oc-x', { actual: 10 }, later);
    const o = outcomesFor(d2, 'segments')[0];
    expect(o.actual).toBe(10);
    expect(outcomeStatus(o)).toBe('done');
    expect(o.updatedAt).toBe(later.toISOString());
  });

  it('removeOutcome ลบออก', () => {
    const d1 = addOutcome(base(), { block: 'channels', metric: 'reach', target: 100, actual: 50 }, NOW, 'oc-rm');
    const d2 = removeOutcome(d1, 'oc-rm');
    expect(d2.businessModel.outcomes ?? []).toHaveLength(0);
  });

  it('outcomesSummary รวม done/ontrack/behind + avgPct', () => {
    let d = base();
    d = addOutcome(d, { block: 'revenue', metric: 'a', target: 10, actual: 10 }, NOW, 'o1'); // done 100
    d = addOutcome(d, { block: 'revenue', metric: 'b', target: 10, actual: 8 }, NOW, 'o2');  // ontrack 80
    d = addOutcome(d, { block: 'costs',   metric: 'c', target: 10, actual: 2 }, NOW, 'o3');  // behind 20
    const s = outcomesSummary(d);
    expect(s.total).toBe(3);
    expect(s.done).toBe(1);
    expect(s.ontrack).toBe(1);
    expect(s.behind).toBe(1);
    expect(s.avgPct).toBe(Math.round((100 + 80 + 20) / 3)); // 67
    expect(s.perBlock).toHaveLength(9);
  });
});
