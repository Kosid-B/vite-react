import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ALLOWED_HOSTS } from '../../../supabase/functions/_shared/egressGuard';

/* ══════════════════════════════════════════════════════════════════════
 * skill `agent-action-permissions` อ้าง "ช่องว่างจริง" ของเราไว้หลายข้อ
 *
 * 🔴 ข้ออ้างที่สำคัญที่สุด: "ยังไม่มีระดับสิทธิ์ของการกระทำในโค้ดเลย"
 *    วันที่มีคนสร้างขึ้นมา เทสต์นี้ต้องแดง เพื่อบังคับให้ไปแก้เอกสาร
 *    (เอกสารที่ยังบอกว่า "ไม่มี" ทั้งที่มีแล้ว = คนอ่านจะไปสร้างตัวที่สอง)
 * ══════════════════════════════════════════════════════════════════════ */

const root = resolve(__dirname, '../../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');
const skill = read('.claude/skills/agent-action-permissions/SKILL.md');
/** ตัดคอมเมนต์ก่อนนับคำ — ไม่งั้นคอมเมนต์ที่เอ่ยชื่อทำให้เทสต์ผ่านฟรี (ledger #84) */
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('skill agent-action-permissions ต้องตรงกับโค้ดจริง', () => {
  it('อ่าน SKILL.md เจอจริง (กันเทสต์ผ่านเพราะไฟล์ว่าง)', () => {
    expect(skill.length).toBeGreaterThan(3000);
    expect(skill).toContain('agent-action-permissions');
  });

  /* ── ① ด่านจริงตัวเดียวที่เรามี ── */
  it('🔴 egressGuard ยังเป็นด่านที่ "บังคับได้" จริง — ไม่ใช่แค่คำเตือน', () => {
    const g = code(read('supabase/functions/_shared/egressGuard.ts'));
    expect(g, 'guardedFetch ต้องโยน error ไม่ใช่แค่ log').toMatch(/throw/);
    expect(ALLOWED_HOSTS.length, 'จำนวนโฮสต์เปลี่ยน = ต้องแก้ skill ข้อ 2').toBe(2);
    expect(skill, 'skill ต้องบอกจำนวนโฮสต์ให้ตรง').toContain(`${ALLOWED_HOSTS.length} โฮสต์`);
  });

  /* ── ② ช่องว่าง: ยังไม่มีระดับสิทธิ์ของการกระทำ ── */
  const PERMISSION_TOKENS = ['askFirst', 'ask_first', 'requireApproval', 'needsApproval', 'ActionPermission'];
  it('🔴 ถ้ามีคนสร้างระดับสิทธิ์ขึ้นมาแล้ว ต้องไปลบข้ออ้าง "ไม่มี" ออกจาก skill', () => {
    const files = ['src/types.ts', 'src/lib/resources.ts', 'src/lib/boardRoom.ts'];
    const found = PERMISSION_TOKENS.filter((t) => files.some((f) => code(read(f)).includes(t)));
    expect(
      found,
      `เจอ ${found.join(',')} ในโค้ดแล้ว — skill ยังเขียนว่า "0 แห่ง" ⇒ แก้ตาราง ข้อ 2 ด้วย`,
    ).toEqual([]);
    expect(skill, 'skill ต้องยังประกาศช่องว่างนี้').toContain('0 แห่ง');
  });

  it('Agent.mandate ยังเป็นข้อความอิสระ (skill อ้างไว้) — เปลี่ยนเป็น type ที่บังคับได้ = ต้องแก้ skill', () => {
    const t = read('src/types.ts');
    expect(t, 'mandate ต้องยังเป็น string เปล่า').toMatch(/mandate:\s*string;/);
  });

  /* ── ③ กลไกอนุมัติที่มีอยู่จริง ต้องยังอยู่ ── */
  it('กลไกอนุมัติที่ skill อ้างต้องมีจริง', () => {
    expect(code(read('src/lib/resources.ts'))).toContain('export function applyApproval');
    expect(code(read('src/lib/boardRoom.ts'))).toContain('export const AGENDA');
  });

  /* ── ④ ตารางข้อ 5: ทุกบรรทัดต้องชี้ไปของที่มีจริง ── */
  it.each([
    ['appliedPaymentIds', 'src/lib/payments.ts'],
    ['reminderSentFor', 'supabase/functions/billing-cron/index.ts'],
    ['balanceClose', 'supabase/functions/ai-plan/index.ts'],
    ['reportedMissing', 'supabase/functions/_shared/aiFailure.ts'],
  ])('%s ต้องยังอยู่ใน %s (skill อ้างเป็นหลักฐาน)', (sym, file) => {
    expect(existsSync(resolve(root, file)), `${file} หาย`).toBe(true);
    expect(code(read(file)), `${sym} หายไปแล้ว — skill เล่าผิด`).toContain(sym);
  });

  it.each(['rpcContract', 'workerRouting', 'deployToolchain', 'ownershipBoundary'])(
    'เทสต์ %s ที่ skill อ้างเป็น Data Contract ต้องมีจริง',
    (name) => {
      expect(existsSync(resolve(root, `src/lib/__tests__/${name}.test.ts`))).toBe(true);
    },
  );

  /* ── ⑤ AI_GUARDRAILS อยู่ใน prompt = คำขอ ไม่ใช่ด่าน (ข้ออ้างหลักของ skill) ── */
  it('🔴 ขอบเขตของเอเจนต์ยังอยู่ใน prompt ไม่ใช่ด่าน', () => {
    const g = read('supabase/functions/_shared/aiGuardrails.ts');
    expect(g, 'ยังเป็นสตริงที่ต่อท้าย system prompt').toMatch(/export const AI_GUARDRAILS\s*=/);
    expect(g, 'ข้อ 6 เรื่องขอบเขตต้องยังอยู่').toContain('ขอบเขตความปลอดภัย');
    expect(code(g), 'ถ้ามีการบังคับใช้จริงในไฟล์นี้ = skill เล่าผิด').not.toMatch(/throw|return\s+new Response/);
  });

  /* ── ⑥ ค่าเริ่มต้นของสิทธิ์ และการเชื่อมกับ skill พี่น้อง ── */
  it('ค่าเริ่มต้นต้องเป็น Ask first ไม่ใช่ Allowed', () => {
    expect(skill).toMatch(/ค่าเริ่มต้นคือ\s*`Ask first`/);
  });

  it('🔗 ต้องชี้ไป rag-data-streaming ทั้งสองทาง ไม่ให้สองไฟล์เล่าคนละเรื่องเรื่อง Kafka', () => {
    expect(skill, 'ตัวนี้ต้องอ้างถึงอีกตัว').toContain('rag-data-streaming');
    const rag = read('.claude/skills/rag-data-streaming/SKILL.md');
    expect(rag, 'อีกตัวต้องอ้างกลับ').toContain('agent-action-permissions');
  });

  it('ต้องบันทึกบทเรียน alter_configs ที่ตรงกับ ledger #82 ของเราเอง', () => {
    expect(skill).toContain('alter_configs');
    expect(skill).toContain('ledger #82');
    expect(read('wrangler.jsonc'), 'wrangler.jsonc ต้องยังเตือนเรื่อง vars ถูกลบ').toMatch(/vars/);
  });
});
