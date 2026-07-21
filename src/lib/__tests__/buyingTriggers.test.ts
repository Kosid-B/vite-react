import { describe, it, expect } from 'vitest';
import { TRIGGERS, emptyTriggers, getTriggers, triggersSummary, SCORE_LABEL } from '../buyingTriggers';

describe('buyingTriggers', () => {
  it('มี 3 แรงขับ + emotion น้ำหนักสูงสุด', () => {
    expect(TRIGGERS).toHaveLength(3);
    const emo = TRIGGERS.find(t => t.key === 'emotion')!;
    expect(emo.weight).toBeGreaterThan(TRIGGERS.find(t => t.key === 'pain')!.weight);
  });

  it('emptyTriggers = score 0 ทุกด้าน', () => {
    const e = emptyTriggers();
    expect(e.pain.score).toBe(0);
    expect(e.convenience.score).toBe(0);
    expect(e.emotion.score).toBe(0);
  });

  it('getTriggers เติมค่าเริ่มต้นเมื่อ partial/undefined', () => {
    expect(getTriggers(undefined).emotion.score).toBe(0);
    const g = getTriggers({ pain: { note: 'x', score: 2 } });
    expect(g.pain.score).toBe(2);
    expect(g.convenience.score).toBe(0);
  });

  it('pct 0 → diagnosis ชวนเริ่มประเมิน', () => {
    const s = triggersSummary(undefined);
    expect(s.pct).toBe(0);
    expect(s.diagnosis).toMatch(/เริ่มประเมิน/);
  });

  it('เต็มทุกด้าน → pct 100', () => {
    const s = triggersSummary({ pain: { note: '', score: 3 }, convenience: { note: '', score: 3 }, emotion: { note: '', score: 3 } });
    expect(s.pct).toBe(100);
  });

  it('emotion อ่อน → เตือนเรื่องอารมณ์', () => {
    const s = triggersSummary({ pain: { note: '', score: 3 }, convenience: { note: '', score: 3 }, emotion: { note: '', score: 1 } });
    expect(s.diagnosis).toMatch(/อารมณ์|ประสบการณ์/);
    expect(s.weakest).toBe('emotion');
  });

  it('weakest/strongest ถูกต้อง', () => {
    const s = triggersSummary({ pain: { note: '', score: 1 }, convenience: { note: '', score: 3 }, emotion: { note: '', score: 2 } });
    expect(s.weakest).toBe('pain');
    expect(s.strongest).toBe('convenience');
  });

  it('SCORE_LABEL ครบ 0–3', () => {
    expect(SCORE_LABEL[0]).toBeTruthy();
    expect(SCORE_LABEL[3]).toBe('แข็งแรง');
  });
});
