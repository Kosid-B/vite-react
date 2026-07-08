import { describe, it, expect } from 'vitest';
import {
  signHandoff, verifyHandoffToken, planToAppData,
  type HandoffPayload, type HandoffPlan,
} from '../../../supabase/functions/_shared/handoff';

/* Context Handoff — verify signed token (HMAC + exp + consent) + map แผน→AppData */

const SECRET = 'test-secret-abc';
const NOW = 1_800_000_000_000;      // epoch ms คงที่
const okPayload = (over: Partial<HandoffPayload> = {}): HandoffPayload => ({
  source: 'theossphere', version: '1', issuedAt: '2026-07-08T00:00:00Z',
  exp: NOW + 600_000, nonce: 'n1',
  consent: { given: true, scope: 'plan+contact', at: '2026-07-08T00:00:00Z' },
  member: { refId: 'm1' },
  plan: { businessName: 'ร้านทดสอบ', sector: '[I] อาหาร', valueProp: 'อร่อยเร็ว', mvbp: 'ชุดเซ็ต', goal: 'ยอด 1 ล้าน/ปี' },
  ...over,
});

describe('sign + verify (round-trip)', () => {
  it('token ที่ลงนามถูก secret + ยังไม่หมดอายุ + มี consent → ok', async () => {
    const token = await signHandoff(okPayload(), SECRET);
    const r = await verifyHandoffToken(token, SECRET, NOW);
    expect(r.ok).toBe(true);
    expect(r.payload?.plan.businessName).toBe('ร้านทดสอบ');
  });

  it('secret ผิด → bad_signature', async () => {
    const token = await signHandoff(okPayload(), SECRET);
    expect((await verifyHandoffToken(token, 'wrong', NOW)).error).toBe('bad_signature');
  });

  it('token ถูกแก้ (tamper payload) → bad_signature', async () => {
    const token = await signHandoff(okPayload(), SECRET);
    const tampered = 'x' + token.slice(1);
    const r = await verifyHandoffToken(tampered, SECRET, NOW);
    expect(r.ok).toBe(false);
  });

  it('หมดอายุ (exp < now) → expired', async () => {
    const token = await signHandoff(okPayload({ exp: NOW - 1 }), SECRET);
    expect((await verifyHandoffToken(token, SECRET, NOW)).error).toBe('expired');
  });

  it('ไม่มี consent → no_consent (PDPA)', async () => {
    const token = await signHandoff(okPayload({ consent: { given: false } }), SECRET);
    expect((await verifyHandoffToken(token, SECRET, NOW)).error).toBe('no_consent');
  });

  it('token ว่าง/รูปแบบผิด → error ไม่ throw', async () => {
    expect((await verifyHandoffToken('', SECRET, NOW)).ok).toBe(false);
    expect((await verifyHandoffToken('nodot', SECRET, NOW)).error).toBe('malformed');
  });
});

describe('planToAppData — mapper', () => {
  const base = { aiCompany: { name: 'เดิม', industry: 'เดิม', goal: 'เดิม', productDesc: 'เดิม', other: 'คงไว้' } };

  it('map ช่องที่มีค่า + รวม valueProp/mvbp เป็น productDesc + คงช่องอื่น', () => {
    const plan: HandoffPlan = { businessName: 'ใหม่', sector: 'ค้าปลีก', valueProp: 'VP', mvbp: 'MVBP', goal: 'โต' };
    const out = planToAppData(plan, base);
    expect(out.aiCompany.name).toBe('ใหม่');
    expect(out.aiCompany.industry).toBe('ค้าปลีก');
    expect(out.aiCompany.goal).toBe('โต');
    expect(out.aiCompany.productDesc).toBe('VP — MVBP');
    expect(out.aiCompany.other).toBe('คงไว้');       // ไม่ลบข้อมูลเดิม
  });

  it('ช่องว่าง → คงค่าเดิม (ไม่ทับด้วยค่าว่าง)', () => {
    const out = planToAppData({}, base);
    expect(out.aiCompany.name).toBe('เดิม');
    expect(out.aiCompany.productDesc).toBe('เดิม');
  });

  it('cap ความยาว (กัน payload บวม)', () => {
    const out = planToAppData({ businessName: 'ก'.repeat(500) }, base);
    expect((out.aiCompany.name as string).length).toBeLessThanOrEqual(120);
  });

  it('ไม่กลายพันธุ์ base เดิม (immutability)', () => {
    planToAppData({ businessName: 'x' }, base);
    expect(base.aiCompany.name).toBe('เดิม');
  });
});
