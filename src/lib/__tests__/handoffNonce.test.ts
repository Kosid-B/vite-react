import { describe, it, expect } from 'vitest';
import { claimNonce, type HandoffPayload, type NonceStore } from '../../../supabase/functions/_shared/handoff';

/* nonce dedup — กัน replay token เดิมภายใน window ที่ exp ยังไม่หมด
 * ทดสอบ claimNonce ด้วย in-memory store (atomic แบบเดียวกับ RPC consume_handoff_nonce) */

function memStore(): NonceStore {
  const used = new Set<string>();
  return {
    // atomic: add คืน false ถ้ามีอยู่แล้ว → tryConsume=false (replay)
    tryConsume(nonce: string) {
      if (used.has(nonce)) return Promise.resolve(false);
      used.add(nonce);
      return Promise.resolve(true);
    },
  };
}

const payload = (nonce: string): HandoffPayload => ({
  source: 'theossphere', version: '1', issuedAt: '2026-07-09T00:00:00Z',
  exp: 1_800_000_600_000, nonce, consent: { given: true },
  member: { refId: 'm1' }, plan: { businessName: 'ร้าน A' },
});

describe('claimNonce — replay guard', () => {
  it('ใช้ครั้งแรก → ok', async () => {
    const store = memStore();
    expect(await claimNonce(payload('n1'), store)).toEqual({ ok: true });
  });

  it('nonce เดิมซ้ำ → replay (reject)', async () => {
    const store = memStore();
    await claimNonce(payload('n1'), store);           // ครั้งแรก
    const r = await claimNonce(payload('n1'), store);  // replay
    expect(r.ok).toBe(false);
    expect(r.error).toBe('replay');
  });

  it('nonce ต่างกัน → ผ่านทั้งคู่', async () => {
    const store = memStore();
    expect((await claimNonce(payload('a'), store)).ok).toBe(true);
    expect((await claimNonce(payload('b'), store)).ok).toBe(true);
  });

  it('nonce ว่าง/หาย → missing_nonce (ไม่แตะ store)', async () => {
    const store = memStore();
    expect((await claimNonce(payload(''), store)).error).toBe('missing_nonce');
    expect((await claimNonce(payload('   '), store)).error).toBe('missing_nonce');
  });
});
