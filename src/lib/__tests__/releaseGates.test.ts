import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { GATE_CHAIN, schemaChangeAllowed, gateBlock, type ReleaseGate } from '../releaseGates';

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 สิ่งที่เทสต์นี้กัน: สถานะด่านเปลี่ยนในแชต แต่เอกสาร/โค้ดยังบอกของเก่า
 *    (ledger #41 — บทสนทนาหายไปกับ context window แต่ไฟล์อยู่ต่อ
 *     แล้วรอบถัดไปเราจะอ่านไฟล์นั้นแล้วเชื่อมันอีก)
 * ══════════════════════════════════════════════════════════════════════════ */

const ROOT = resolve(__dirname, '../../..');
const SKIP = new Set(['node_modules', 'dist', '.git', 'coverage', '.wrangler']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|md)$/.test(name)) out.push(p);
  }
  return out;
}

describe('ห่วงโซ่ด่าน', () => {
  it('เรียงตามลำดับที่เอกสารกำหนด และห้ามข้ามขั้น', () => {
    expect(GATE_CHAIN.map((g) => g.key)).toEqual([
      'gate-b',
      'phase1-acceptance-2',
      'freeze-phase1-baseline',
    ]);
  });

  it('🔴 ด่านที่ "รู้สถานะ" ต้องบอกได้ว่าใครยืนยันเมื่อไร — ทั้ง closed และ open', () => {
    /* ไม่ใช่แค่ closed: การประกาศว่า "ยังไม่ผ่าน" ก็เป็นการอ้างความรู้เหมือนกัน
     * ถ้าไม่มีที่มา แปลว่าเราเดา แล้วเราจะแยกไม่ออกจาก unknown ในรอบถัดไป */
    for (const g of GATE_CHAIN.filter((x) => x.status !== 'unknown')) {
      expect(g.confirmedBy, `${g.key} = ${g.status} แต่ไม่มีที่มา`).toBeTruthy();
      expect(g.confirmedBy!).toMatch(/25\d\d|256\d/);
    }
  });

  it('🔴 ด่านที่ตรวจไม่ได้ต้องบอกว่าเพราะอะไร — ห้ามปล่อยว่าง', () => {
    for (const g of GATE_CHAIN.filter((x) => x.status === 'unknown')) {
      expect(g.whyUnknown, `${g.key} เป็น unknown แต่ไม่บอกเหตุผล`).toBeTruthy();
      expect(g.whyUnknown!.length).toBeGreaterThan(30);
    }
  });

  it('ทุกด่านต้องบอกว่าผ่านแล้วปลดอะไร', () => {
    for (const g of GATE_CHAIN) expect(g.unlocks.length, g.key).toBeGreaterThan(15);
  });
});

describe('การตัดสินว่าแตะ schema ได้ไหม', () => {
  const gate = (status: ReleaseGate['status'], key = 'x'): ReleaseGate => ({
    key, name: key, status, verifiable: 'owner-only', unlocks: 'ปลดล็อกอะไรบางอย่างที่ยาวพอ',
    ...(status === 'unknown' ? { whyUnknown: 'ตรวจไม่ได้' } : {}),
    ...(status === 'closed' ? { confirmedBy: 'เจ้าของ 2569' } : {}),
  });

  it('🔴 unknown ต้องกั้น เท่ากับ open — ไม่ใช่ "ไม่มีใครห้าม = ทำได้"', () => {
    expect(schemaChangeAllowed([gate('closed', 'a'), gate('unknown', 'b')]).allowed).toBe(false);
    expect(schemaChangeAllowed([gate('closed', 'a'), gate('open', 'b')]).allowed).toBe(false);
  });

  it('ผ่านครบ = ทำได้', () => {
    expect(schemaChangeAllowed([gate('closed', 'a'), gate('closed', 'b')]).allowed).toBe(true);
  });

  it('ชี้ด่านแรกที่ติด ไม่ใช่ด่านสุดท้าย', () => {
    const v = schemaChangeAllowed([gate('closed', 'a'), gate('unknown', 'b'), gate('open', 'c')]);
    expect(v.blockedBy?.key).toBe('b');
  });

  it('🔴 ติดแล้วต้องบอกว่าทำอะไรต่อ — ห้ามคืน "ทำไม่ได้" เปล่า ๆ', () => {
    const v = schemaChangeAllowed([gate('closed', 'a'), gate('open', 'b')]);
    expect(v.allowed).toBe(false);
    expect(v.nextAction.length).toBeGreaterThan(30);
    expect(v.nextAction).toMatch(/ถามเจ้าของ|ปิด/);
    // ต้องบอกด้วยว่าระหว่างรอ ทำอะไรได้ — ไม่ใช่หยุดทั้งโปรเจกต์
    expect(v.nextAction).toMatch(/ระหว่างรอ/);
  });

  /* 🔴 กฎนี้ยังอยู่และยังสำคัญ แม้ตอนนี้ห่วงโซ่จะปิดครบแล้ว —
   *    วันที่มีด่านใหม่เพิ่มเข้ามา มันต้องกั้นทันทีโดยไม่ต้องมีใครจำ */
  it('🔴 ปิดด่านแรกแล้วห้ามเหมาว่าทั้งห่วงโซ่เปิด', () => {
    expect(schemaChangeAllowed([gate('closed', 'a'), gate('open', 'b')]).allowed).toBe(false);
    expect(schemaChangeAllowed([gate('closed', 'a'), gate('unknown', 'b')]).allowed).toBe(false);
  });

  /* ── สถานะจริง 22 พ.ย. 2569 ──────────────────────────────────────────
   * ด่านที่ 3 เปลี่ยนเป็น in-repo และ baseline ถูกเขียนลงรีโปแล้ว ⇒ ห่วงโซ่ปิดครบ
   * ⚠️ "ปิดครบ" ไม่ได้แปลว่าแก้ schema ได้ตามใจ — ข้อความ verdict ยังผูกกับ regression gate */
  it('สถานะจริง: ทั้งสามด่านปิดแล้ว และด่านที่ 3 ตรวจได้จากรีโป', () => {
    expect(GATE_CHAIN.map((g) => g.status)).toEqual(['closed', 'closed', 'closed']);
    expect(GATE_CHAIN[2].verifiable).toBe('in-repo');
  });

  it('สถานะจริง: แก้ schema ได้แล้ว แต่ต้องพ่วง regression gate เสมอ', () => {
    const v = schemaChangeAllowed();
    expect(v.allowed).toBe(true);
    expect(v.blockedBy).toBeNull();
    expect(v.nextAction).toMatch(/regression gate/);
  });

  /* 🔴 ด่านที่บอกว่า "ตรวจได้จากรีโป" แล้วยังเป็น unknown = ไม่ได้ตรวจจริง */
  it('🔴 ด่าน in-repo ห้ามมีสถานะ unknown', () => {
    for (const g of GATE_CHAIN.filter((x) => x.verifiable === 'in-repo')) {
      expect(g.status, `${g.key} ตรวจได้แต่ยังไม่ตรวจ`).not.toBe('unknown');
    }
  });
});

describe('🔴 เอกสารกับโค้ดต้องไม่ค้างสถานะเก่า', () => {
  const files = walk(ROOT);

  it('อ่านไฟล์ได้จริง (กันเทสต์ผ่านเพราะเดินไม่เจออะไรเลย)', () => {
    expect(files.length).toBeGreaterThan(200);
  });

  /* ⚠️ ประกอบ regex จากชิ้นส่วน เพื่อไม่ให้ "ตัวเทสต์เอง" มีประโยคสถานะเก่าอยู่ในไฟล์
   *    (ไม่งั้นตัวตรวจจะจับตัวเองตลอดกาล แล้วเราจะแก้ด้วยการยกเว้นตัวเอง = ช่องโหว่ถาวร) */
  const STALE = new RegExp('Gate B\\s*(' + ['ยังไม่' + 'ปิด', 'ไม่' + 'ปรากฏ', 'ยังไม่' + 'ผ่าน'].join('|') + ')');

  it('ห้ามมีไฟล์ไหนยังบันทึกสถานะเก่าของ Gate B ไว้เป็นข้อความ', () => {
    const stale = files.filter((f) => STALE.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(ROOT.length + 1));
    expect(stale, `ไฟล์ที่ยังบอกสถานะเก่า: ${stale.join(', ')}`).toEqual([]);
  });

  /* 🔴 21 พ.ย. 2569 — ด่านเฝ้าเดิมครอบแค่ "Gate B" ชื่อเดียว (เขียนตอนที่ Gate B เป็นด่านเดียวที่เพิ่งปิด)
   *    พอ `Phase 1 Acceptance #2` ปิดบ้าง มันจับประโยคค้างในเอกสารไม่ได้เลยสักไฟล์
   *    ⇒ ทำให้ทั่วไปจาก `GATE_CHAIN` เอง: **ด่านไหนก็ตามที่ปิดแล้ว ห้ามมีไฟล์ไหนบอกว่ายังไม่ผ่าน**
   *    ⇒ ครั้งหน้ามีด่านปิดเพิ่ม ตัวตรวจขยายตัวเอง ไม่ต้องมีใครจำ */
  const NOT_PASSED = ['ยังไม่' + 'ผ่าน', 'ยังไม่' + 'ปิด', '= `' + 'open`'];
  /* ⚠️ ยกเว้น ledger ไฟล์เดียว และบอกเหตุผลไว้ตรงนี้: มันเป็น **บันทึกอดีต** (append-only)
   *    ประโยค "ตอนนั้นยังไม่ผ่าน" คือเนื้อหาที่ถูกต้องของมัน — แก้ = ลบประวัติ (หลักเดียวกับ ADR)
   *    🔴 ไม่ได้ยกเว้น "ตัวเทสต์เอง" (นั่นคือช่องโหว่ถาวร) — regex ยังประกอบจากชิ้นส่วนเหมือนเดิม */
  /* 🔁 22 พ.ย. 2569 — เพิ่ม `docs/adr/` ด้วยเหตุผลเดียวกันเป๊ะ: ADR เป็นบันทึกอดีตตามกฎโปรเจกต์
   *    ("ADR ไม่แก้ย้อนหลัง — ตัดสินใจใหม่ให้เขียนฉบับใหม่/ต่อท้าย") ⇒ หัวข้อ "อัปเดตสถานะ" ลงวันที่
   *    ต้องเก็บประโยคของวันนั้นไว้ได้ · **สถานะปัจจุบัน** ของ ADR ถูกเฝ้าด้วย `adr.test.ts` แทน
   *    (บรรทัด `**สถานะ**:` ต้องตรงกับ README) ⇒ ไม่ได้ปล่อยช่องว่าง ย้ายผู้เฝ้าเท่านั้น */
  const HISTORY_ONLY = ['docs/LESSONS-LEDGER.md', 'docs/adr/'];

  it('🔴 ด่านที่ปิดแล้วทุกด่าน ห้ามมีไฟล์ไหนยังบอกว่ายังไม่ผ่าน', () => {
    const closed = GATE_CHAIN.filter((g) => g.status === 'closed');
    expect(closed.length, 'ไม่มีด่านปิดเลย = เทสต์นี้ไม่ได้ตรวจอะไร').toBeGreaterThan(0);
    const bad: string[] = [];
    for (const f of files) {
      const rel = f.slice(ROOT.length + 1);
      if (HISTORY_ONLY.some((h) => rel === h || rel.startsWith(h)) || rel.includes('releaseGates')) continue;
      const src = readFileSync(f, 'utf8');
      for (const g of closed) {
        const re = new RegExp(g.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^\\n]{0,40}(' + NOT_PASSED.join('|') + ')');
        if (re.test(src)) bad.push(`${rel} (${g.name})`);
      }
    }
    expect(bad, `ยังค้างสถานะเก่า: ${bad.join(', ')}`).toEqual([]);
  });

  it('ทุกไฟล์ที่พูดถึง Gate B ต้องชี้มาที่แหล่งเดียว (releaseGates)', () => {
    const orphan = files.filter((f) => {
      const rel = f.slice(ROOT.length + 1);
      if (rel.startsWith('src/lib/releaseGates') || rel.includes('releaseGates.test')) return false;
      const src = readFileSync(f, 'utf8');
      return /Gate B/.test(src) && !/releaseGates/.test(src);
    }).map((f) => f.slice(ROOT.length + 1));
    expect(orphan, `พูดถึง Gate B โดยไม่ชี้แหล่งความจริง: ${orphan.join(', ')}`).toEqual([]);
  });
});

/* ⚠️ พูดให้ตรง: `gateBlock()` **ยังไม่ได้ถูกต่อเข้า prompt ไหน** — มันเป็นกฎสำหรับผู้ช่วย
 *    (CLAUDE.md · AGENTS.md · SKILL.md) ไม่ใช่บริบทที่ผู้ใช้ต้องเห็น
 *    เทสต์นี้จึงตรวจแค่ว่า "ถ้าเอาไปแปะ จะอ่านรู้เรื่องและครบ" ห้ามตีความว่าเดินทางไปกับทุก prompt */
describe('บล็อกสรุปสถานะด่าน', () => {
  it('gateBlock บอกสถานะครบทุกด่าน + กฎว่า unknown ไม่ใช่ closed', () => {
    const b = gateBlock();
    for (const g of GATE_CHAIN) expect(b).toContain(g.name);
    expect(b).toMatch(/unknown ไม่ใช่ closed/);
  });
});
