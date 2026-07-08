import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock analytics.track เพื่อเช็คว่า reportError เรียกจริง
const trackMock = vi.fn();
vi.mock('../analytics', () => ({ track: (...a: unknown[]) => trackMock(...a) }));

describe('errorReport — รายงาน error แบบพังไม่ได้', () => {
  beforeEach(() => { trackMock.mockClear(); });

  it('เรียก GA4 track(js_error) พร้อม message ที่ตัดความยาว', async () => {
    const { reportError } = await import('../errorReport');
    reportError(new Error('บูมตอนทดสอบ'), 'unit-test');
    expect(trackMock).toHaveBeenCalledTimes(1);
    const [ev, params] = trackMock.mock.calls[0];
    expect(ev).toBe('js_error');
    expect((params as Record<string, string>).message).toContain('บูม');
    expect((params as Record<string, string>).source).toBe('unit-test');
  });

  it('dedupe — error เดิม+source เดิม รายงานครั้งเดียว', async () => {
    const { reportError } = await import('../errorReport');
    trackMock.mockClear();
    reportError(new Error('ซ้ำ ๆ'), 'dupe');
    reportError(new Error('ซ้ำ ๆ'), 'dupe');
    reportError(new Error('ซ้ำ ๆ'), 'dupe');
    expect(trackMock).toHaveBeenCalledTimes(1);
  });

  it('ไม่ throw แม้ส่งค่าแปลก (null/ไม่ใช่ Error)', async () => {
    const { reportError } = await import('../errorReport');
    expect(() => reportError(null, 'weird')).not.toThrow();
    expect(() => reportError({ x: 1 }, 'weird2')).not.toThrow();
  });
});
