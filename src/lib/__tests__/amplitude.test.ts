import { describe, it, expect } from 'vitest';
import { buildAmplitudePayload } from '../amplitude';

describe('buildAmplitudePayload', () => {
  it('ประกอบ body ตามสเปก HTTP API v2', () => {
    const body = buildAmplitudePayload('KEY123', 'dev-abc', 'landing_cta_click', { seg: 'food', pct: 50 }, 1_700_000_000_000);
    expect(body.api_key).toBe('KEY123');
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({
      event_type: 'landing_cta_click',
      device_id: 'dev-abc',
      time: 1_700_000_000_000,
      platform: 'Web',
      event_properties: { seg: 'food', pct: 50 },
    });
  });

  it('event_properties ว่างได้ (ไม่พัง)', () => {
    const body = buildAmplitudePayload('K', 'd', 'landing_dwell', {}, 1);
    expect(body.events[0].event_properties).toEqual({});
  });
});
