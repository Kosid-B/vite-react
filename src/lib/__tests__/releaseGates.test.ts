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
    const v = schemaChangeAllowed();
    expect(v.allowed, 'สถานะจริงตอนนี้ควรยังกั้นอยู่').toBe(false);
    expect(v.nextAction.length).toBeGreaterThan(30);
    expect(v.nextAction).toMatch(/ถามเจ้าของ|ปิด/);
    // ต้องบอกด้วยว่าระหว่างรอ ทำอะไรได้ — ไม่ใช่หยุดทั้งโปรเจกต์
    expect(v.nextAction).toMatch(/ระหว่างรอ/);
  });

  it('สถานะจริง: Gate B ปิดแล้ว แต่ด่านที่กั้นอยู่ต้องไม่ใช่ Gate B', () => {
    expect(GATE_CHAIN[0].status).toBe('closed');
    expect(schemaChangeAllowed().blockedBy?.key).not.toBe('gate-b');
  });

  it('🔴 ปิดด่านแรกแล้วห้ามเหมาว่าทั้งห่วงโซ่เปิด', () => {
    // ความเสี่ยงจริงหลัง 26 ส.ค. 2569: "Gate B ปิดแล้ว" ถูกอ่านเป็น "แตะ schema ได้แล้ว"
    expect(schemaChangeAllowed().allowed).toBe(false);
    expect(GATE_CHAIN.filter((g) => g.status !== 'closed').length).toBeGreaterThan(0);
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
