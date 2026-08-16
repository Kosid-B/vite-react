import { describe, it, expect } from 'vitest';
import { aggregateExperiments, EXPERIMENTS, MIN_EXPOSED_PER_VARIANT, variantFor } from '../experiments';
import type { ExperimentsState } from '../experiments';

/* ใช้ skill experiment-reality-check กับการทดลองในแอป (Pulse)
 *
 * เคยพลาดจริง: โค้ดประกาศผู้ชนะเมื่อทั้งสองกลุ่มมีคนเห็น >= 1 คน
 *   พร้อมคอมเมนต์ว่า "กัน noise ตอนข้อมูลน้อย" ซึ่งไม่จริงเลย
 *   เห็นฝั่งละ 1 คน ฝั่งหนึ่งกดต่อ → ประกาศชนะ 100% ต่อ 0%
 *   (ตอนตรวจ 16 ส.ค. 2569 คนเปิดใช้ Pulse จริง = 0 คน) */

const exp = EXPERIMENTS[0];

/** สร้าง workspace จำลอง n คน ที่ถูก assign variant ตาม uid และกดทำต่อตามที่กำหนด */
function makeStates(n: number, activateFor: (v: string, i: number) => boolean): ExperimentsState[] {
  const out: ExperimentsState[] = [];
  for (let i = 0; i < n; i++) {
    const uid = `u${i}`;
    const v = variantFor({ enabled: true, seenConsent: true, uid, assignments: {}, pulses: [], activations: [], activeDays: [] }, exp);
    out.push({
      enabled: true, seenConsent: true, uid,
      assignments: { [exp.id]: v.id },
      pulses: [],
      activations: activateFor(v.id, i) ? [exp.id] : [],
      activeDays: [],
    });
  }
  return out;
}

describe('ประกาศผู้ชนะได้ ต่อเมื่อคนพอจริง', () => {
  it('คนละ 1 คน แล้วฝั่งหนึ่งกดต่อ → ห้ามประกาศผู้ชนะ (เคสที่เคยหลุด)', () => {
    const states = makeStates(2, (_v, i) => i === 0);
    const r = aggregateExperiments(states).reports.find(x => x.experiment === exp.id)!;
    expect(r.winner).toBeUndefined();
    expect(r.verdict).toContain('ยังสรุปผู้ชนะไม่ได้');
  });

  it('ไม่มีใครเปิดใช้เลย → ไม่มีผู้ชนะ และบอกเหตุผล', () => {
    const r = aggregateExperiments([]).reports.find(x => x.experiment === exp.id)!;
    expect(r.winner).toBeUndefined();
    expect(r.verdict).toBeTruthy();
  });

  it('คนพอต่อกลุ่มแต่แทบไม่มีใครกดทำต่อ → ยังไม่ประกาศ', () => {
    const states = makeStates(MIN_EXPOSED_PER_VARIANT * 4, (_v, i) => i < 3);
    const r = aggregateExperiments(states).reports.find(x => x.experiment === exp.id)!;
    expect(r.winner).toBeUndefined();
    expect(r.verdict).toContain('น้อยเกิน');
  });

  it('คนพอ + คนกดทำต่อพอ + กลุ่มหนึ่งดีกว่าชัด → ประกาศได้', () => {
    const target = variantFor({ enabled: true, seenConsent: true, uid: 'u0', assignments: {}, pulses: [], activations: [], activeDays: [] }, exp).id;
    const states = makeStates(MIN_EXPOSED_PER_VARIANT * 6, v => v === target);
    const r = aggregateExperiments(states).reports.find(x => x.experiment === exp.id)!;
    expect(r.winner).toBe(target);
    expect(r.verdict).toContain('พอเทียบได้');
  });

  it('ทุกการทดลองมีคำอธิบายสถานะเสมอ ไม่ปล่อยว่าง', () => {
    for (const rep of aggregateExperiments([]).reports) {
      expect(rep.verdict, rep.experiment).toBeTruthy();
    }
  });
});
