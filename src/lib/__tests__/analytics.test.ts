import { describe, it, expect, beforeEach } from 'vitest';
import { track } from '../analytics';

type GtagCall = [string, string, Record<string, string | number>];

describe('analytics.track — กัน GA4 reserved attribution params ปนแหล่งที่มา', () => {
  let calls: GtagCall[];
  beforeEach(() => {
    calls = [];
    (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag = (...args: unknown[]) => {
      calls.push(args as GtagCall);
    };
  });

  it('remap source → ev_source (กัน js_error ปน session source)', () => {
    track('js_error', { message: 'boom', source: 'react.ErrorBoundary', path: '/' });
    const [, event, params] = calls[0];
    expect(event).toBe('js_error');
    expect(params.source).toBeUndefined();
    expect(params.ev_source).toBe('react.ErrorBoundary');
    expect(params.message).toBe('boom');
    expect(params.path).toBe('/');
  });

  it('remap ทุก reserved key (medium/campaign/term/content)', () => {
    track('x', { medium: 'a', campaign: 'b', term: 'c', content: 'd', ok: 1 });
    const params = calls[0][2];
    expect(params.medium).toBeUndefined();
    expect(params.ev_medium).toBe('a');
    expect(params.ev_campaign).toBe('b');
    expect(params.ev_term).toBe('c');
    expect(params.ev_content).toBe('d');
    expect(params.ok).toBe(1);
  });

  it('ไม่แตะ param ปกติ + ไม่ mutate ของเดิม', () => {
    const orig = { count: 3, label: 'hi' };
    track('safe_event', orig);
    expect(calls[0][2]).toEqual({ count: 3, label: 'hi' });
    expect(orig).toEqual({ count: 3, label: 'hi' });
  });

  it('ไม่ทำ UX พังถ้า gtag ไม่มี (local/ad-block)', () => {
    (window as unknown as { gtag?: unknown }).gtag = undefined;
    expect(() => track('e', { source: 'x' })).not.toThrow();
  });
});
