import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifyHandoffToken, type HandoffPayload } from '../../../supabase/functions/_shared/handoff';

/**
 * พิสูจน์ว่า snippet §A (node:crypto) ใน docs/integrations/theossphere-activation-runbook.md
 * สร้าง token ที่ verifier ของ CEO AI (Web Crypto) ยอมรับ — กัน doc drift ระหว่าง 2 implementation
 */

const b64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const SECRET = 'runbook-secret-xyz';
const NOW = 1_800_000_000_000;

/** ตรงกับ §A ใน runbook (node:crypto) */
function signLikeRunbook(payload: HandoffPayload, secret: string): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = b64url(crypto.createHmac('sha256', secret).update(body).digest());
  return `${body}.${sig}`;
}

const payload: HandoffPayload = {
  source: 'theossphere', version: '1', issuedAt: '2026-07-08T00:00:00Z',
  exp: NOW + 600_000, nonce: 'n1', consent: { given: true, scope: 'plan+contact' },
  member: { refId: 'm1' },
  plan: { businessName: 'ร้าน A', sector: 'ค้าปลีก', valueProp: 'เร็ว', mvbp: 'ชุดเริ่มต้น', goal: 'โต' },
};

describe('runbook signing §A (node:crypto) ↔ verifyHandoffToken (Web Crypto)', () => {
  it('token จาก node:crypto ผ่าน verifier (cross-impl compatible)', async () => {
    const r = await verifyHandoffToken(signLikeRunbook(payload, SECRET), SECRET, NOW);
    expect(r.ok).toBe(true);
    expect(r.payload?.plan.businessName).toBe('ร้าน A');
  });
  it('secret ผิด → reject', async () => {
    expect((await verifyHandoffToken(signLikeRunbook(payload, SECRET), 'wrong', NOW)).ok).toBe(false);
  });
  it('หมดอายุ → reject (exp guard ทำงานกับ token จาก snippet)', async () => {
    const expired = { ...payload, exp: NOW - 1 };
    expect((await verifyHandoffToken(signLikeRunbook(expired, SECRET), SECRET, NOW)).error).toBe('expired');
  });
});
