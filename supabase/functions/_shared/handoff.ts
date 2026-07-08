// ===== Context Handoff (theossphere → CEO AI) — pure logic, ทดสอบได้ =====
// รับ "แผน 24 ขั้น" ที่ลงนาม (signed) จาก theossphere → verify → map เป็น AppData.aiCompany
// ใช้ Web Crypto (มีทั้ง Deno / เบราว์เซอร์ / Node) — token = base64url(payload).base64url(HMAC-SHA256)
// ความปลอดภัย: ตรวจ signature + หมดอายุ (exp) + consent · nonce dedup ทำฝั่ง edge (ต้องมี storage)

/* ---------- ชนิดข้อมูล ---------- */
export interface HandoffPlan {
  businessName?: string;
  sector?: string;          // → aiCompany.industry (หมวด DBD)
  beachheadMarket?: string;
  persona?: { who?: string; jtbd?: string; pains?: string[] };
  valueProp?: string;
  mvbp?: string;
  goal?: string;
}

export interface HandoffPayload {
  source: string;           // 'theossphere'
  version: string;
  issuedAt: string;
  exp: number;              // epoch ms หมดอายุ
  nonce: string;
  consent: { given: boolean; scope?: string; at?: string };
  member?: { refId?: string; email?: string };
  plan: HandoffPlan;
}

/* ---------- base64url + HMAC (Web Crypto) ---------- */
function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const enc = (s: string) => new TextEncoder().encode(s);

async function hmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc(message));
  return b64urlEncode(new Uint8Array(sig));
}

/** เทียบสตริงแบบ constant-time (กัน timing attack) */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** สร้าง token (ใช้ฝั่ง theossphere — มีที่นี่เพื่อทดสอบ round-trip) */
export async function signHandoff(payload: HandoffPayload, secret: string): Promise<string> {
  const body = b64urlEncode(enc(JSON.stringify(payload)));
  const sig = await hmac(body, secret);
  return `${body}.${sig}`;
}

export interface VerifyResult { ok: boolean; error?: string; payload?: HandoffPayload }

/** verify token: signature ถูก + ยังไม่หมดอายุ + มี consent */
export async function verifyHandoffToken(token: string, secret: string, nowMs: number): Promise<VerifyResult> {
  if (!token || !secret) return { ok: false, error: 'missing_token_or_secret' };
  const dot = token.indexOf('.');
  if (dot < 1) return { ok: false, error: 'malformed' };
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = await hmac(body, secret);
  if (!safeEqual(sig, expected)) return { ok: false, error: 'bad_signature' };

  let payload: HandoffPayload;
  try { payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(body))) as HandoffPayload; }
  catch { return { ok: false, error: 'bad_payload' }; }

  if (!(typeof payload.exp === 'number' && payload.exp > nowMs)) return { ok: false, error: 'expired' };
  if (!payload.consent?.given) return { ok: false, error: 'no_consent' };
  return { ok: true, payload };
}

/* ---------- mapper: 24-step plan → AppData.aiCompany ---------- */
const clip = (s: string | undefined, n: number): string => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

/** merge แผนเข้า AppData (pure) — ใส่เฉพาะช่องที่มีค่า, cap ความยาว (กัน payload บวม/abuse) */
export function planToAppData<T extends { aiCompany: Record<string, unknown> }>(plan: HandoffPlan, base: T): T {
  const ai = base.aiCompany;
  const productDesc = [clip(plan.valueProp, 500), clip(plan.mvbp, 500)].filter(Boolean).join(' — ');
  return {
    ...base,
    aiCompany: {
      ...ai,
      name: clip(plan.businessName, 120) || ai.name,
      industry: clip(plan.sector, 160) || ai.industry,
      goal: clip(plan.goal, 500) || ai.goal,
      productDesc: productDesc || ai.productDesc,
    },
  };
}
