import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { withGuardrails } from '../aiAssist';
import { governingBlock, UNGOVERNED_REASON } from '../aiGuardrails';
import { GOLDEN_QUESTION, VISION } from '../founderConstitution';

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 ความผิดที่เทสต์นี้กัน (Architecture Consolidation Audit · 24 ส.ค. 2569)
 *
 *   ผมเขียนใน CLAUDE.md ว่า "Vision เดินทางไปกับทุก prompt"
 *   ตรวจจริง: 15 จุดส่งคำสั่งเข้า AI · **ได้รับรัฐธรรมนูญ 1 จุด**
 *   ต้นเหตุเชิงโครงสร้าง: แต่ละจุดเรียก `invoke('ai-assist')` เอง
 *   ⇒ ไม่มีที่เดียวให้บังคับ และเพิ่มจุดใหม่ก็ไม่มีใครรู้
 *
 * วิธีกัน: บังคับให้ **ทุกจุดผ่านประตูเดียว** (`lib/aiAssist.callAiAssist`)
 *          จะไม่รับกติกาก็ได้ แต่ต้องระบุเหตุผลจากรายการที่กำหนดไว้ (เขียนมั่วไม่ได้)
 * ══════════════════════════════════════════════════════════════════════════ */

const SRC = resolve(__dirname, '../..');
const GATEWAY = 'lib/aiAssist.ts';

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== '__tests__') walk(p, out); }
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

const files = walk(SRC).map((p) => ({ rel: p.slice(SRC.length + 1), text: readFileSync(p, 'utf8') }));
const callSites = files.filter((f) => /\bcallAiAssist\s*\(/.test(f.text) && f.rel !== GATEWAY);

describe('🔴 ทุกคำสั่งที่ส่งเข้า AI ต้องผ่านประตูเดียว', () => {
  it('เจอจุดเรียกจริง (กันเทสต์ผ่านเพราะสแกนไม่เจอ)', () => {
    expect(callSites.length).toBeGreaterThanOrEqual(12);
  });

  it('🔴 ห้ามมีใครเรียก invoke("ai-assist") เองนอกประตู — เพิ่มจุดใหม่ต้องผ่านกติกา', () => {
    const rogue = files
      .filter((f) => f.rel !== GATEWAY && f.rel !== 'lib/aiGuardrails.ts')
      .filter((f) => /\.functions\.invoke\(\s*['"]ai-assist['"]/.test(f.text))
      .map((f) => f.rel);
    expect(rogue, `เรียกตรงโดยไม่ผ่านประตู: ${rogue.join(', ')}`).toEqual([]);
  });

  it('ทุกจุดที่ไม่รับกติกา ต้องระบุเหตุผลจากรายการที่กำหนดไว้', () => {
    for (const f of callSites) {
      const ung = [...f.text.matchAll(/ungoverned:\s*'([a-zA-Z]+)'/g)].map((m) => m[1]);
      for (const r of ung) {
        expect(Object.keys(UNGOVERNED_REASON), `${f.rel}: เหตุผล "${r}" ไม่มีในรายการ`).toContain(r);
      }
    }
  });

  it('🔴 ทุกเหตุผลที่อนุญาตให้ข้ามกติกา ต้องอธิบายได้ว่าทำไม', () => {
    for (const [k, why] of Object.entries(UNGOVERNED_REASON)) {
      expect(why.length, k).toBeGreaterThan(20);
    }
  });
});

describe('กติกาที่ติดไปกับคำสั่ง', () => {
  it('เติมกติกาเข้าไปในบริบทจริง และไม่ทับบริบทเดิม', () => {
    const out = withGuardrails({ page: 'x', instruction: 'y', context: 'ข้อมูลเดิม' });
    expect(out.context).toContain(GOLDEN_QUESTION);
    expect(out.context).toContain('ข้อมูลเดิม');
    expect(out.instruction).toBe('y');
  });

  it('ไม่มีบริบทเดิมก็ยังต้องได้กติกา', () => {
    expect(withGuardrails({ page: 'x', instruction: 'y' }).context).toContain(VISION.core);
  });

  it('🔴 กติกาต้องมีข้อที่ผิดแล้วเสียหายจริงครบ', () => {
    const b = governingBlock();
    expect(b).toContain(GOLDEN_QUESTION);
    expect(b).toMatch(/Validation ก่อน Scale/);
    expect(b).toMatch(/ห้ามอ้างจำนวนลูกค้า รีวิว/);
    expect(b).toMatch(/นับได้ ≠ อัตราจริง/);
    expect(b).toMatch(/ข้อเสนอที่ลงมือได้ ไม่ใช่รายการปัญหา/);
  });

  it('⚠️ ต้องสั้นพอจะแปะทุกคำขอ — brandBriefBlock เต็มก้อนใหญ่เกินไป (11k ตัวอักษร)', () => {
    expect(governingBlock().length).toBeLessThan(1500);
  });
});

describe('🟢 AI ที่ผู้ใช้คุยด้วยจริง (CeoAiAgent)', () => {
  it('ต้องได้รับรัฐธรรมนูญ และห้ามกลับไปใช้จุดยืนเก่า', () => {
    const agent = readFileSync(resolve(SRC, 'agent/CeoAiAgent.ts'), 'utf8');
    expect(/constitutionBlock\(\)/.test(agent)).toBe(true);
    expect(agent).not.toMatch(/แพลตฟอร์มสร้างบริษัท AI อัตโนมัติ/);
    expect(agent).toMatch(/AI Business Builder สำหรับคนไทย/);
    expect(agent).toMatch(/Validation ก่อน Scale/);
  });
});

describe('🔴 เส้นแบ่งเจ้าของ + เอกสาร audit ต้องตรงกับของจริง', () => {
  it('รีโปนี้ยังไม่มี migration marketing_* (Marketing OS = อีกระบบ)', () => {
    const owns = readdirSync(resolve(SRC, '../supabase/migrations')).some((f) => /marketing/.test(f));
    expect(owns, 'รีโปเริ่มมี migration marketing_* แล้ว → อัปเดต audit §0').toBe(false);
  });

  it('เอกสาร audit ต้องบันทึก migration ของ production ที่รีโปไม่ได้เป็นเจ้าของ', () => {
    const doc = readFileSync(resolve(SRC, '../docs/product/ARCHITECTURE-CONSOLIDATION-AUDIT.md'), 'utf8');
    expect(doc).toMatch(/20260823073854/);
    expect(doc).toMatch(/20260823083627/);
    expect(doc).toMatch(/33 ตาราง/);
  });
});
