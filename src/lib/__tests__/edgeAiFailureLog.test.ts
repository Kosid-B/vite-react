import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 AI ล้มฝั่ง Edge Function ต้องไม่ล้มเงียบ (20 พ.ย. 2569 · ledger #82)
 *
 * ที่มา: กล่อง "ลอง AI" ฝั่ง Worker พังอยู่บน production โดยไม่มีใครรู้ เพราะไม่มี log
 *   พอใส่ท่อแล้วรู้สาเหตุใน 1 นาที (`Anthropic 401 invalid x-api-key`)
 *   ฝั่ง Edge Function ตาบอดแบบเดียวกัน — และ **ไม่มีเครื่องมือไหนในรีโปตรวจมันเลย**
 *   (`tsc` ไม่แตะ `supabase/functions/` · `vitest` ไม่รันโค้ด Deno)
 *   ⇒ เทสต์ชุดนี้คือกลไกเดียวที่เหลือ: **อ่านซอร์สจริง**
 *
 * ⚠️ ด่านนี้ตรวจว่า "ถูกเรียกใช้" ไม่ใช่แค่ "มีไฟล์อยู่" (shipped-not-written ชั้น ①)
 * ══════════════════════════════════════════════════════════════════════════ */

const root = process.cwd();
const FN_DIR = 'supabase/functions';
const read = (p: string) => readFileSync(join(root, p), 'utf8');
/** ตัดคอมเมนต์ก่อนตรวจทุกครั้ง — คำที่ "เอ่ยถึง" ในคอมเมนต์ทำให้ผ่านฟรี (พลาดมาแล้ววันเดียวกัน) */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** ฟังก์ชันที่เรียก AI และต้องมีท่อรายงาน */
const AI_FUNCTIONS = ['ai-assist', 'ai-plan', 'agent-run'] as const;

describe('🔴 ท่อรายงาน AI ล้ม ฝั่ง Edge Function', () => {
  it('ตัวท่อต้องมีอยู่จริง', () => {
    expect(existsSync(join(root, FN_DIR, '_shared/aiFailure.ts')), 'ไม่มี _shared/aiFailure.ts').toBe(true);
  });

  it.each(AI_FUNCTIONS)('%s ต้องเรียก reportAiFailure จริง (ไม่ใช่แค่ import)', (fn) => {
    const c = code(read(`${FN_DIR}/${fn}/index.ts`));
    expect(c, `${fn} ไม่ได้ import ท่อ`).toContain('aiFailure.ts');
    const calls = (c.match(/reportAiFailure\(/g) ?? []).length;
    // import 1 ครั้งไม่นับเป็นการเรียก — ต้องมีจุดเรียกอย่างน้อย 1
    expect(calls, `${fn} import ท่อแล้วแต่ไม่เคยเรียก = ล้มเงียบเหมือนเดิม`).toBeGreaterThanOrEqual(1);
  });

  it('🔴 ทุกจุดที่คืน anthropic_error ต้องรายงานก่อน — ห้ามคืน 502 เงียบ ๆ', () => {
    const c = code(read(`${FN_DIR}/ai-assist/index.ts`));
    const returns = (c.match(/anthropic_error/g) ?? []).length;
    const reports = (c.match(/reportAiFailure\(/g) ?? []).length;
    expect(returns, 'ไม่เจอจุดคืน anthropic_error = ตัวตรวจพัง').toBeGreaterThanOrEqual(2);
    expect(reports, `คืน error ${returns} จุด แต่รายงาน ${reports} จุด`).toBe(returns);
  });

  it('ต้องใช้ท่อเดิม (rpc track_client_error) ไม่สร้างตารางใหม่ — ด่านปล่อยของกั้น schema', () => {
    expect(code(read(`${FN_DIR}/_shared/aiFailure.ts`))).toContain('rpc/track_client_error');
  });
});

describe('🔒 ท่อรายงานห้ามพาข้อมูลอ่อนไหวออกไป', () => {
  const c = code(read(`${FN_DIR}/_shared/aiFailure.ts`));

  it('ห้ามใส่คีย์ลงรายงาน', () => {
    expect(c, 'ท่อแตะ ANTHROPIC_API_KEY').not.toContain('ANTHROPIC_API_KEY');
  });

  it('ห้ามส่งข้อความที่ผู้ใช้พิมพ์ (instruction/goal/context/body)', () => {
    for (const k of ['instruction', 'goal', 'context', 'body.']) {
      expect(c, `ท่ออ้างถึง ${k} = เสี่ยงพาคำถามผู้ใช้ลง DB`).not.toContain(k);
    }
  });

  it('ต้องตัดความยาวเสมอ', () => {
    expect(c).toMatch(/slice\(0,\s*\w+\)/);
  });

  it('ต้องมี console.error ด้วย (เผื่อ DB เขียนไม่ได้ ยังเหลือ log ชั่วคราว)', () => {
    expect((c.match(/console\.error/g) ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it('🔴 รายงานล้มต้องไม่ทำให้คำขอหลักล้ม — ต้องมี try/catch ห่อ fetch', () => {
    const i = c.indexOf('fetch(');
    expect(i, 'ไม่เจอ fetch ในท่อ').toBeGreaterThan(-1);
    expect(c.slice(0, i), 'fetch ไม่ได้อยู่ใน try').toContain('try');
  });
});
