import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 ความลับห้ามอยู่ใน `vars` ของ wrangler.jsonc
 *
 * บั๊กจริง (20 พ.ย. 2569 · ledger #82): `"ANTHROPIC_API_KEY": ""` อยู่ใน `vars`
 *   เอกสาร Cloudflare: *"If you change your environment variables in the Cloudflare dashboard,
 *   Wrangler will override them the next time you deploy ... Wrangler will delete all vars
 *   before setting those found in the Wrangler configuration file"*
 *   ⇒ ค่าที่เจ้าของตั้งไว้ในแดชบอร์ดแบบ Text **ถูกล้างทุกครั้งที่ merge เข้า main**
 *   ส่วน Secret (encrypted) *"are never deleted by a deployment"*
 *
 * อาการที่เกิดจริง: กล่อง "ลอง AI" บนหน้าแรกตอบ "ทีม AI ไม่ว่างชั่วครู่" ทุกครั้ง
 *   โดยหักโควตา token ไปแล้ว — และ **ไม่มี log ใดเลย** (console.error = 0 ในไฟล์ DO)
 *
 * ⚠️ ไม่ได้ห้าม `vars` ว่าง ทุกตัว — `GOOGLE_SITE_VERIFICATION: ""` ตั้งใจให้ว่าง
 *    และไม่ใช่ความลับ ⇒ ด่านนี้ดูที่ **ชื่อที่บ่งว่าเป็นความลับ** เท่านั้น
 * ══════════════════════════════════════════════════════════════════════════ */

const root = process.cwd();
const wrangler = readFileSync(join(root, 'wrangler.jsonc'), 'utf8');
const cfg = JSON.parse(
  wrangler.replace(/^\s*\/\/.*$/gm, '').replace(/\s+\/\/.*$/gm, ''),
) as { vars?: Record<string, string> };

/** ชื่อที่บ่งว่าถือความลับ */
const SECRETISH = /(_KEY|_SECRET|_TOKEN|_PASSWORD)$/;

/** ข้อยกเว้นที่ public โดยดีไซน์ — ต้องมีเหตุผลกำกับทุกตัว ห้ามเติมลอย ๆ */
const PUBLIC_BY_DESIGN: Record<string, string> = {
  // publishable key ของ Supabase = public โดยดีไซน์ (ฝังในบันเดิลได้ · rotate แยกได้)
  SUPABASE_ANON_KEY: 'publishable key — public โดยดีไซน์ ตรงกับที่ฝังใน client',
};

describe('🔴 wrangler.jsonc — ความลับห้ามอยู่ใน vars', () => {
  const names = Object.keys(cfg.vars ?? {});

  it('อ่าน vars ได้จริง — อ่านไม่ได้ = ตัวตรวจพัง ไม่ใช่ "ไม่มีปัญหา"', () => {
    expect(names.length, 'parse wrangler.jsonc แล้วไม่เจอ vars เลย').toBeGreaterThanOrEqual(3);
  });

  it('ANTHROPIC_API_KEY ต้องไม่อยู่ใน vars — ต้องเป็น Cloudflare Secret', () => {
    expect(
      names,
      'อยู่ใน vars = ถูกล้างทุกครั้งที่ deploy ⇒ AI พังเงียบ ๆ · ที่ถูก: npx wrangler secret put ANTHROPIC_API_KEY',
    ).not.toContain('ANTHROPIC_API_KEY');
  });

  it('ชื่อที่ลงท้าย _KEY/_SECRET/_TOKEN/_PASSWORD ห้ามอยู่ใน vars (เว้นที่ public โดยดีไซน์)', () => {
    const bad = names.filter((n) => SECRETISH.test(n) && !(n in PUBLIC_BY_DESIGN));
    expect(bad, `ชื่อเหล่านี้ดูเหมือนความลับแต่อยู่ใน vars: ${bad.join(', ')}`).toEqual([]);
  });

  it('🔴 ข้อยกเว้นทุกตัวต้องมีเหตุผลเขียนไว้ และต้องยังอยู่ใน vars จริง', () => {
    for (const [n, why] of Object.entries(PUBLIC_BY_DESIGN)) {
      expect(why.length, `${n} ไม่มีเหตุผลกำกับ`).toBeGreaterThan(20);
      // ถ้าตัวนั้นถูกย้ายออกไปแล้ว ให้ลบออกจากรายการข้อยกเว้นด้วย — ไม่งั้นรายการจะโตเรื่อย ๆ
      expect(names, `${n} อยู่ในรายการข้อยกเว้น แต่ไม่อยู่ใน vars แล้ว ⇒ ลบออกจากรายการ`).toContain(n);
    }
  });

  it('เอกสารต้องบอกวิธีที่ถูกไว้ในไฟล์เอง (คนอ่านโค้ดต้องเจอ ไม่ใช่ต้องมาจำ)', () => {
    expect(wrangler).toContain('wrangler secret put ANTHROPIC_API_KEY');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 ความล้มเหลวของ AI ฝั่ง Worker ต้องมองเห็นได้
 *
 * ที่เกิดจริง 20 พ.ย. 2569: ยิง `/api/guest-ask` บน production แล้วได้
 *   {"summary":"ตอนนี้ทีม AI ไม่ว่างชั่วครู่...","guestTokensLeft":18800}
 *   = หักโควตา token ไปแล้ว แต่ไม่ได้คำตอบ · และ **ไม่มีร่องรอยสาเหตุที่ไหนเลย**
 *   เพราะ `console.error` ในไฟล์ DO มี 0 ครั้ง และ `catch {}` กลืน error 8 จุด
 *
 * เทสต์ชุดนี้อ่าน **ซอร์สตัวจริง** เพราะไม่มีเครื่องมือไหนตรวจได้ว่า
 * "โค้ดที่เขียนไว้ถูกเรียกใช้จริง" (skill shipped-not-written ชั้น ①)
 * ══════════════════════════════════════════════════════════════════════════ */
describe('🔴 Worker AI ต้องไม่ล้มเงียบ', () => {
  const src = readFileSync(join(root, 'src/agent/CeoAiAgent.ts'), 'utf8');
  /* 🔴 ต้องตัดคอมเมนต์ก่อนนับ — ไม่งั้นคำที่ "เอ่ยถึง" ในคอมเมนต์ทำให้เทสต์ผ่านฟรี
   *    พลาดจริงรอบนี้: คอมเมนต์อธิบายบั๊กมีคำว่า console.error อยู่ ⇒ ลบโค้ดจริงออกแล้วยังเขียว
   *    (ความผิดแบบเดียวกับที่เคยเจอใน ownershipBoundary.test.ts) */
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('ต้องมี console.error ใน **โค้ดจริง** อย่างน้อย 1 จุด (เดิมเป็น 0)', () => {
    expect((code.match(/console\.error/g) ?? []).length, 'คอมเมนต์ไม่นับ').toBeGreaterThanOrEqual(1);
  });

  it('catch ของ guestAsk ต้องรับ error ไว้ ไม่ใช่ `catch {}` เปล่า', () => {
    // จับบล็อก guestAsk ตั้งแต่ชื่อเมธอดถึงปลายของ fallback
    const i = src.indexOf('private async guestAsk');
    const block = src.slice(i, src.indexOf('private async checkGuestTokens', i));
    expect(block, 'ยัง catch แบบไม่รับ error = สาเหตุหายเหมือนเดิม').toContain('} catch (e) {');
    expect(block, 'รับ error มาแล้วต้องรายงานด้วย').toContain('reportAiFailure');
  });

  it('ทุกทางที่เรียก Anthropic ต้องผ่านด่านตรวจคีย์ก่อน', () => {
    const calls = (src.match(/api\.anthropic\.com/g) ?? []).length;
    const guards = (src.match(/this\.requireKey\(\)/g) ?? []).length;
    expect(calls, 'ไม่เจอจุดเรียก Anthropic = ตัวตรวจพัง').toBeGreaterThanOrEqual(2);
    expect(guards, `เรียก Anthropic ${calls} ทาง แต่มีด่านตรวจคีย์ ${guards} ด่าน`).toBe(calls);
  });

  it('🔴 รายงานต้องไม่พาคีย์หรือคำถามของผู้ใช้ออกไปด้วย', () => {
    const i = src.indexOf('private async reportAiFailure');
    const block = src.slice(i, src.indexOf('private requireKey', i));
    expect(block, 'ห้ามใส่คีย์ลงรายงาน').not.toContain('ANTHROPIC_API_KEY');
    expect(block, 'ห้ามส่งข้อความที่ผู้ใช้พิมพ์ลงรายงาน').not.toMatch(/\bbody\.text\b|\bq\b/);
    expect(block, 'ต้องตัดความยาวกันข้อมูลล้น').toMatch(/slice\(0,\s*\d+\)/);
  });

  it('ข้อความที่ผู้ใช้เห็นต้องยังสุภาพ ไม่โปะ error ดิบใส่หน้า', () => {
    expect(src, 'fallback ที่ผู้ใช้เห็นต้องคงเดิม').toContain('ตอนนี้ทีม AI ไม่ว่างชั่วครู่');
  });
});
