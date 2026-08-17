import { describe, it, expect } from 'vitest';
import {
  isDeployArtifact, isActive, severityOf, rankedGroups, activeBugCount, errorCaveats,
  ACTIVE_WINDOW_HOURS, type ClientErrorAgg, type ErrorGroup,
} from '../clientErrors';

const NOW = Date.parse('2026-08-17T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString();

function g(p: Partial<ErrorGroup> & { fingerprint: string }): ErrorGroup {
  return {
    message: 'บูม', source: 'react.ErrorBoundary', path: '/start', stack: null, ua: null,
    count: 1, first_seen: hoursAgo(10), last_seen: hoursAgo(1), ...p,
  };
}

describe('clientErrors — แยกบั๊กจริงออกจากเสียงรบกวน', () => {
  it('chunk error = ผลข้างเคียงของ deploy ไม่ใช่บั๊กในโค้ด', () => {
    expect(isDeployArtifact(g({ fingerprint: 'a', message: 'Failed to fetch dynamically imported module: /assets/x.js' }))).toBe(true);
    expect(isDeployArtifact(g({ fingerprint: 'b', message: 'ChunkLoadError: Loading chunk 42 failed' }))).toBe(true);
    expect(isDeployArtifact(g({ fingerprint: 'c', message: "Cannot read properties of undefined (reading 'map')" }))).toBe(false);
  });

  it('ยังเกิดอยู่ = เห็นล่าสุดภายในหน้าต่างที่กำหนด — เกินนั้นถือว่าเงียบ', () => {
    expect(isActive(g({ fingerprint: 'a', last_seen: hoursAgo(ACTIVE_WINDOW_HOURS - 1) }), NOW)).toBe(true);
    expect(isActive(g({ fingerprint: 'b', last_seen: hoursAgo(ACTIVE_WINDOW_HOURS + 1) }), NOW)).toBe(false);
  });

  it('วันที่เพี้ยนต้องไม่ทำให้กลายเป็น "ยังเกิดอยู่" โดยบังเอิญ', () => {
    expect(isActive(g({ fingerprint: 'a', last_seen: 'ไม่ใช่วันที่' }), NOW)).toBe(false);
  });

  it('severity: บั๊กจริงที่ยังเกิด / จาก deploy / เงียบแล้ว', () => {
    expect(severityOf(g({ fingerprint: 'a' }), NOW)).toBe('active-bug');
    expect(severityOf(g({ fingerprint: 'b', message: 'Loading chunk 3 failed' }), NOW)).toBe('deploy');
    expect(severityOf(g({ fingerprint: 'c', last_seen: hoursAgo(200) }), NOW)).toBe('quiet');
  });

  it('chunk error ที่ยังเกิดอยู่ ต้องยังนับเป็น deploy ไม่ใช่บั๊กจริง (ไม่งั้นตกใจผิดตัว)', () => {
    expect(severityOf(g({ fingerprint: 'a', message: 'Loading CSS chunk 9 failed', last_seen: hoursAgo(1) }), NOW)).toBe('deploy');
  });

  it('เรียงลำดับ: บั๊กที่ยังเกิดมาก่อนเสมอ แม้จำนวนจะน้อยกว่า', () => {
    const agg: ClientErrorAgg = {
      days: 7, total: 0, by_source: {}, by_path: {},
      groups: [
        g({ fingerprint: 'quiet-big', count: 500, last_seen: hoursAgo(300) }),
        g({ fingerprint: 'deploy-big', count: 200, message: 'Loading chunk 1 failed' }),
        g({ fingerprint: 'active-small', count: 3 }),
      ],
    };
    expect(rankedGroups(agg, NOW).map(x => x.fingerprint))
      .toEqual(['active-small', 'deploy-big', 'quiet-big']);
  });

  it('activeBugCount นับเฉพาะบั๊กจริงที่ยังเกิด — ไม่รวม deploy/เงียบแล้ว', () => {
    const agg: ClientErrorAgg = {
      days: 7, total: 708, by_source: {}, by_path: {},
      groups: [
        g({ fingerprint: 'quiet', count: 500, last_seen: hoursAgo(300) }),
        g({ fingerprint: 'deploy', count: 200, message: 'Loading chunk 1 failed' }),
        g({ fingerprint: 'real1', count: 5 }),
        g({ fingerprint: 'real2', count: 3 }),
      ],
    };
    expect(activeBugCount(agg, NOW)).toBe(8);
  });

  it('ไม่มีข้อมูล → ไม่พัง คืนค่าว่าง', () => {
    expect(rankedGroups(null)).toEqual([]);
    expect(activeBugCount(null)).toBe(0);
  });

  it('ต้องเตือนเสมอว่า chunk error ที่ reload แก้ได้เองจะไม่ถูกนับ (จุดที่เคยตีความผิด)', () => {
    const c = errorCaveats(null).join(' ');
    expect(c).toContain('reload');
    expect(c).toMatch(/ครั้ง.*ไม่ใช่.*คน/);
  });

  it('ตารางว่าง → บอกตรง ๆ ว่ายังไม่มีข้อมูล ไม่ใช่ปล่อยให้เข้าใจว่า "ไม่มีบั๊ก"', () => {
    const agg: ClientErrorAgg = { days: 7, total: 0, by_source: {}, by_path: {}, groups: [] };
    expect(errorCaveats(agg).some(c => c.includes('ยังไม่มีข้อมูล'))).toBe(true);
  });
});
