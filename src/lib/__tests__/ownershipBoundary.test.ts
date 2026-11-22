import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/** โค้ดจริงโดยไม่นับคอมเมนต์ — ด่านนี้ห้าม "การเรียกใช้" ไม่ใช่ห้าม "การเอ่ยถึงในเอกสาร"
 *  (เอกสารต้องพูดถึง `.from('marketing_…')` ได้ ไม่งั้นเขียนกฎอธิบายตัวเองไม่ได้) */
function codeOf(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

/* ══════════════════════════════════════════════════════════════════════════
 * เส้นแบ่งความเป็นเจ้าของ (เจ้าของตัดสิน 24 ส.ค. 2569)
 *
 *   Marketing OS (ตาราง marketing_* 33 ตาราง) = **อีกระบบเป็นเจ้าของ**
 *   รีโปนี้ = ตัวผลิตภัณฑ์ + สมองที่ทำงานให้ "ธุรกิจของผู้ใช้"
 *
 * ทำไมต้องมีเทสต์: ของสองระบบอยู่ใน org Supabase เดียวกัน และ production (waigsnxhrlwtiotspaim)
 *   มีตาราง marketing_* 33 ตารางค้างอยู่จริง (apply ไว้ · 🔴 แก้ 20 พ.ย. 69: มีข้อมูลตั้งต้นแล้ว 8 ตาราง
 *   แต่ marketing_events ยังเป็น 0 — ดูตัวเลขที่นับสดใน CLAUDE.md · ห้ามอ้าง "0 แถวทุกตาราง" อีก)
 *   ส่วนข้อมูลจริงของอีกระบบอยู่คนละ project: bjozpwdtqbpwcxnqguka "CEOAITHAILAND Marketing"
 *   ⇒ ถ้ารีโปนี้เผลอสร้างตาราง/อ่านตารางของอีกฝั่ง จะได้ของซ้ำสองที่ทันที
 *      ซึ่งเป็นความสิ้นเปลืองที่ Architecture Consolidation Audit ถูกสั่งให้มาหาพอดี
 *
 * 🔓 ข้อยกเว้นเดียวที่ได้รับอนุญาต (เจ้าของยืนยัน 15 พ.ย. 2569):
 *    **อ่านอย่างเดียว** 3 ตารางของ project bjozpwdtqbpwcxnqguka —
 *    marketing_brands · marketing_audience_segments · marketing_message_pillars
 *    เพื่อจับว่าสำเนา brand truth ฝั่งเราเพี้ยนจากแหล่งจริงหรือยัง
 *    ✅ ทำได้เฉพาะใน scripts/brand-sync-check.mjs  ❌ ห้ามเขียน ❌ ห้ามอยู่ในโค้ดแอป
 *    (เหตุผลที่ไม่ให้อยู่ในแอป: ผลิตภัณฑ์ต้องทำงานได้แม้อีกระบบล่ม)
 *
 * ⚠️ ห้ามแก้เทสต์นี้ให้ผ่านโดยไม่มีคำสั่งใหม่จากเจ้าของ — ถ้าเส้นแบ่งเปลี่ยนจริง
 *    ให้แก้ทั้งเทสต์ + §0 ของเอกสาร audit + CLAUDE.md ในคอมมิตเดียวกัน
 * ══════════════════════════════════════════════════════════════════════════ */

const ROOT = resolve(__dirname, '../../..');
const AUDIT = 'docs/product/ARCHITECTURE-CONSOLIDATION-AUDIT.md';

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== '__tests__' && e !== 'node_modules') walk(p, out); }
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

describe('🔴 เส้นแบ่งเจ้าของ — Marketing OS เป็นของอีกระบบ', () => {
  /** 0016–0018 = TIS Automate (project galtbbkcddugnsfkgyqm) — คนละฐานข้อมูลกันคนละใบ
   *  เก็บไว้ในรีโปเพื่อประวัติเท่านั้น และ **ห้าม apply กับ production หลัก** (กฎใน CLAUDE.md)
   *  มันมีตาราง `marketing_events` ของตัวเอง ซึ่งบังเอิญชื่อชนกับของ Marketing OS — คนละใบ ไม่ใช่การข้ามเส้น */
  const TIS_ONLY = /_tis_|tis_automate/;

  /* 🔁 **22 พ.ย. 2569 — เส้นแบ่งย้าย ไม่ได้หายไป** (เจ้าของสั่ง "ย้าย DB ไปอยู่ supabase เดียวกับ ceo")
   *  ของเดิม: ห้ามแตะ `marketing_*` ทุกตัว เพราะฐานเป็นของอีก project
   *  ของใหม่: ฐานรวมเป็น project เดียวแล้ว ⇒ **เราเป็นเจ้าของ schema `marketing_os`**
   *    ⇒ migration ที่สร้าง/แก้ `marketing_os.*` = ทำได้ (0066/0067 คือการย้ายนั้นเอง)
   *  🔴 แต่ `public.marketing_*` (33 ตารางที่อีกระบบสร้างไว้ในฐานเรา) **ยังไม่ใช่ของเรา**
   *    ⇒ ยังห้ามสร้าง/แก้/ลบเหมือนเดิมทุกข้อ · เส้นแบ่งจึงยังบังคับได้จริง ไม่ใช่ยกเลิกไปเฉย ๆ
   *  ⚠️ ต้องแยก **schema** ออกจาก **ชื่อตาราง** จริง ๆ ไม่ใช่จับสตริง `marketing_` ลอย ๆ
   *    (รอบแรกผมเขียนแบบจับสตริง แล้วมันไปสะดุด `format('alter table marketing_os.%I …')`
   *     ของตัว migration เอง = ผลบวกปลอม · เลยต้องอ่านโครงประโยคให้ออก) */
  const OWNED_SCHEMA = 'marketing_os';
  const TABLE_RE = /\b(?:create|alter|drop)\s+table\s+(?:if\s+(?:not\s+)?exists\s+)?(?:([a-z_]+)\.)?([a-z_%]+)/gi;
  /** มี statement ไหนแตะตาราง `marketing_*` ที่ไม่ได้อยู่ใน schema ที่เราเป็นเจ้าของไหม */
  const crossesLine = (sql: string): boolean =>
    [...sql.matchAll(TABLE_RE)].some(
      ([, schema, table]) =>
        table.toLowerCase().startsWith('marketing_') && schema?.toLowerCase() !== OWNED_SCHEMA,
    );

  it('migration ห้ามสร้าง/แก้ `public.marketing_*` ของอีกระบบ (แต่ `marketing_os.*` ทำได้)', () => {
    const dir = resolve(ROOT, 'supabase/migrations');
    const offenders = readdirSync(dir).filter((f) => {
      if (!f.endsWith('.sql') || TIS_ONLY.test(f)) return false;
      return crossesLine(readFileSync(join(dir, f), 'utf8'));
    });
    expect(offenders, `migration ที่ข้ามเส้นแบ่ง: ${offenders.join(', ')}`).toEqual([]);
  });

  it('🔴 ด่านนี้ต้องยังจับของผิดได้จริง — ไม่ใช่ปล่อยผ่านทุกอย่างหลังย้ายเส้น', () => {
    expect(crossesLine('create table if not exists public.marketing_campaigns (id uuid);'),
      'public.marketing_* ต้องยังถูกจับ').toBe(true);
    expect(crossesLine('alter table marketing_brands add column x text;'),
      'ชื่อเปล่า (= public) ต้องถูกจับ').toBe(true);
    expect(crossesLine('drop table marketing_events;'),
      'ลบตารางของอีกระบบต้องถูกจับ').toBe(true);
    expect(crossesLine('create table if not exists marketing_os.marketing_campaigns (id uuid);'),
      'marketing_os.* ต้องผ่าน').toBe(false);
  });

  it('ไฟล์ที่ยกเว้นต้องเป็นของ TIS จริง ๆ — ห้ามใช้ชื่อไฟล์เลี่ยงเทสต์', () => {
    const dir = resolve(ROOT, 'supabase/migrations');
    const skipped = readdirSync(dir).filter((f) => f.endsWith('.sql') && TIS_ONLY.test(f));
    expect(skipped.length, 'ไม่เจอไฟล์ TIS — รูปแบบชื่อเปลี่ยนไปแล้ว ให้ตรวจซ้ำ').toBeGreaterThan(0);
    for (const f of skipped) {
      expect(f, `${f} ไม่ใช่ไฟล์ในช่วง 0016–0018 ของ TIS`).toMatch(/^001[678]_/);
    }
  });


  it('โค้ดในรีโปนี้ต้องไม่อ่าน/เขียนตาราง marketing_* โดยตรง', () => {
    const offenders = [...walk(resolve(ROOT, 'src')), ...walk(resolve(ROOT, 'supabase/functions'))]
      .filter((p) => /\.from\(\s*['"`]marketing_|rpc\(\s*['"`]marketing_/.test(codeOf(p)))
      .map((p) => p.slice(ROOT.length + 1));
    expect(offenders, `ไฟล์ที่แตะตารางของอีกระบบ: ${offenders.join(', ')}`).toEqual([]);
  });

  /* ── ข้อยกเว้น 15 พ.ย. 2569 — อ่านอย่างเดียว 3 ตาราง ───────────────────
   * 🔴 ข้อยกเว้นที่ไม่มีเทสต์ล้อม = ประตูที่เปิดแล้วลืมปิด
   *    สามข้อล่างนี้บังคับว่า "เปิดแค่ที่เปิด" ไม่ใช่ "เปิดแล้วปล่อย" */
  const SYNC_SCRIPT = 'scripts/brand-sync-check.mjs';

  it('🔓 ข้อยกเว้นต้องอยู่ในสคริปต์เดียว และอ่านได้แค่ 3 ตารางที่เจ้าของอนุญาต', () => {
    const js = readFileSync(resolve(ROOT, SYNC_SCRIPT), 'utf8');
    const lib = readFileSync(resolve(ROOT, 'src/lib/brandSync.ts'), 'utf8');
    for (const t of ['marketing_brands', 'marketing_audience_segments', 'marketing_message_pillars']) {
      expect(js, `${SYNC_SCRIPT} ต้องประกาศ ${t} ไว้ในรายการที่อนุญาต`).toContain(t);
      expect(lib).toContain(t);
    }
    // ตารางอื่นของอีกระบบต้องไม่โผล่ในสคริปต์เลย
    const others = js.match(/marketing_[a-z_]+/g) ?? [];
    const illegal = [...new Set(others)].filter(
      (t) => !['marketing_brands', 'marketing_audience_segments', 'marketing_message_pillars'].includes(t),
    );
    expect(illegal, `สคริปต์แตะตารางนอกขอบเขต: ${illegal.join(', ')}`).toEqual([]);
  });

  it('🔴 ข้อยกเว้นเป็น "อ่าน" เท่านั้น — ห้ามมีคำสั่งเขียนในสคริปต์', () => {
    const js = readFileSync(resolve(ROOT, SYNC_SCRIPT), 'utf8');
    expect(/method:\s*['"`](POST|PATCH|PUT|DELETE)/i.test(js), 'พบ HTTP method ที่เขียนข้อมูล').toBe(false);
    expect(/service[_-]?role/i.test(js) && !/ห้ามใช้ service-role/.test(js), 'ใช้ service-role key').toBe(false);
  });

  it('🔴 ห้ามแตะ production ของเราจากสคริปต์นี้ — คนละฐาน คนละเจ้าของ', () => {
    const js = readFileSync(resolve(ROOT, SYNC_SCRIPT), 'utf8');
    expect(js).toContain('bjozpwdtqbpwcxnqguka');
    /* ⚠️ เจตนาคือห้าม **ใช้** production ไม่ใช่ห้าม **เอ่ยถึง** —
     *    คอมเมนต์ที่เตือนว่า "ไม่แตะ production <ref>" คือสิ่งที่เราอยากให้มี ไม่ใช่สิ่งที่ต้องห้าม
     *    (เทสต์เวอร์ชันแรกจับคอมเมนต์ตัวเองแล้วแดง — ตัดคอมเมนต์ออกก่อนตรวจ) */
    const code = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code, 'สคริปต์ใช้ production หลักจริง = ข้ามเส้นคนละเส้น').not.toContain('waigsnxhrlwtiotspaim');
  });

  it('เอกสาร audit ต้องบันทึกคำตัดสินและเส้นแบ่งไว้ ไม่ใช่อยู่แค่ในแชต (ledger #41)', () => {
    const doc = readFileSync(resolve(ROOT, AUDIT), 'utf8');
    expect(doc).toMatch(/เจ้าของตัดสินแล้ว \(24 ส\.ค\. 2569\)/);
    expect(doc).toMatch(/"อีกระบบ" เป็นเจ้าของ Marketing OS/);
    expect(doc).toMatch(/ห้ามพัฒนาต่อ/);
  });

  it('CLAUDE.md ต้องบอกเส้นแบ่งด้วย — รอบถัดไปอ่าน CLAUDE.md ก่อนเสมอ', () => {
    const md = readFileSync(resolve(ROOT, 'CLAUDE.md'), 'utf8');
    expect(md).toMatch(/Marketing OS/);
    expect(md).toMatch(/อีกระบบ/);
    expect(md).toMatch(/marketing_\*/);
  });

  it('🟢 สิ่งที่รีโปนี้ยังเป็นเจ้าของ ต้องยังอยู่ครบ — เส้นแบ่งห้ามกินสมองของผลิตภัณฑ์', () => {
    for (const f of ['founderConstitution.ts', 'founderMindset.ts', 'dmaic.ts', 'businessGenome.ts']) {
      expect(() => readFileSync(resolve(ROOT, 'src/lib', f), 'utf8'), f).not.toThrow();
    }
  });
});

/* ══════════════════════════════════════════════════════════════════════
 * 🧱 เส้นแบ่งฉบับแก้ไข — เจ้าของอนุมัติให้ข้าม 20 พ.ย. 2569 ("ลุย A ต่อ B")
 *
 * เหตุผลที่อนุมัติ: `marketing_measurement_health_live.score = 0` · `event_count = 0`
 *   และ `marketing_measurement_config.block_strategic_recommendations_below_score = true`
 *   ⇒ OS ปฏิเสธการให้คำแนะนำกลยุทธ์เองจนกว่าจะมี event ⇒ ต้องมีใครส่งให้มัน
 *
 * ที่อนุญาต (แคบที่สุดเท่าที่ทำงานได้): **ส่ง event ผ่าน edge function `marketing-track`**
 *   และต้องอยู่ใน **ไฟล์เดียว** คือ `src/lib/marketingOs.ts`
 * ที่ยังห้ามเหมือนเดิม: แตะตาราง/สคีมา `marketing_*` · migration · เรียก rpc ของเขาตรง
 *
 * 🔴 ช่องที่ด่านเดิมมองไม่เห็นและปิดในรอบนี้: regex เดิมจับแค่ `rpc('marketing_…`
 *    แต่ rpc ตัวจริงชื่อ **`ingest_marketing_event`** (ขึ้นต้นด้วย ingest_) ⇒ เลี่ยงได้ฟรี
 * ══════════════════════════════════════════════════════════════════════ */
describe('🧱 เส้นแบ่งฉบับ 20 พ.ย. 2569 — ส่ง event ได้ทางเดียว', () => {
  const SRC = resolve(__dirname, '../..');
  const ALLOWED_FILE = 'lib/marketingOs.ts';

  /** ไฟล์ .ts/.tsx ทั้ง src/ (ไม่นับเทสต์) */
  function walk(dir: string, out: string[] = []): string[] {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) { if (e !== '__tests__') walk(p, out); }
      else if (/\.tsx?$/.test(e)) out.push(p);
    }
    return out;
  }
  const files = walk(SRC);

  it('อ่านไฟล์เจอจริง (กันเทสต์ผ่านเพราะไม่เจออะไร)', () => {
    expect(files.length).toBeGreaterThan(50);
    expect(files.some((f) => f.endsWith(ALLOWED_FILE))).toBe(true);
  });

  /** ปลายทางของอีกระบบ → ไฟล์เดียวที่มีสิทธิ์รู้จักมัน
   *  🔴 สองปลายทางคนละฐานข้อมูล (ledger #94): `marketing-track` ลงฐานเรา ·
   *     `marketing-behavior-ingest` ลงฐานเขา ⇒ ห้ามปนไฟล์กัน ไม่งั้นอ่านไม่ออกว่าอะไรไปไหน */
  const DESTINATIONS: ReadonlyArray<[RegExp, string]> = [
    [/marketing-track|ingest_marketing_event/, ALLOWED_FILE],
    [/marketing-behavior-ingest/, 'lib/behaviorOs.ts'],
  ];

  /** ไฟล์ที่มีสิทธิ์เอ่ยถึง **รหัส project ของเขา** — กว้างกว่า "ชื่อปลายทาง" เพราะ
   *  `brandSync` ใช้รหัสนี้ตาม **ข้อยกเว้นอ่านอย่างเดียว 3 ตาราง** ที่เจ้าของอนุมัติ 15 พ.ย. 2569
   *  🔴 รายการนี้ต้องสั้น และทุกชื่อในนี้ต้องมีเหตุผลที่เขียนไว้ที่อื่นแล้ว */
  const MAY_NAME_THEIR_PROJECT = ['lib/behaviorOs.ts', 'lib/brandSync.ts'];

  it.each(DESTINATIONS.map(([, owner]) => owner))('ไฟล์เจ้าของปลายทาง %s ต้องมีอยู่จริง', (owner) => {
    expect(files.some((f) => f.endsWith(owner)), `ไม่เจอ ${owner}`).toBe(true);
  });

  it('🔴 ปลายทางแต่ละตัวมีไฟล์เจ้าของไฟล์เดียว — ไฟล์อื่นห้ามเอ่ยถึงเลย', () => {
    const offenders: string[] = [];
    for (const [re, owner] of DESTINATIONS) {
      for (const f of files) {
        if (f.endsWith(owner)) continue;
        if (re.test(codeOf(f))) offenders.push(`${f.replace(SRC + '/', '')} (ปลายทางของ ${owner})`);
      }
    }
    expect(offenders, `ไฟล์ที่ยิงไป OS เองนอกไฟล์เจ้าของ: ${offenders.join(', ')}`).toEqual([]);
  });

  it('🔴 รหัส project ของเขาโผล่ได้เฉพาะไฟล์ที่มีเหตุผลรองรับ', () => {
    const offenders = files
      .filter((f) => !MAY_NAME_THEIR_PROJECT.some((a) => f.endsWith(a)))
      .filter((f) => /bjozpwdtqbpwcxnqguka/.test(codeOf(f)))
      .map((f) => f.replace(SRC + '/', ''));
    expect(offenders, `เอ่ยถึง project ของเขานอกรายการ: ${offenders.join(', ')}`).toEqual([]);
  });

  /** 🔴 ledger #96 — ผมฝัง JWT (คีย์ anon ของอีกระบบ) ลงรีโปสาธารณะ โดยอ้างว่า
   *  "คีย์ของเราก็อยู่ในรีโป" · **ผิด**: ของเราเป็นรูป `sb_publishable_…` ไม่ใช่ JWT
   *  และรีโปนี้ไม่เคยมี JWT อยู่เลย ⇒ GitGuardian จับได้ ไม่ใช่ผม
   *  ⇒ ด่านนี้ทำให้ความผิดแบบนั้นแดงที่เครื่องก่อนถึง GitHub */
  it('🔴 ห้ามมี JWT ฝังในโค้ดทั้งรีโป — คีย์ต้องมาจาก env เท่านั้น', () => {
    const offenders = files
      .filter((f) => /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./.test(readFileSync(f, 'utf8')))
      .map((f) => f.replace(SRC + '/', ''));
    expect(offenders, `มี JWT ฝังอยู่: ${offenders.join(', ')}`).toEqual([]);
  });

  it('🔴 ห้ามมี service_role key ในโค้ดฝั่งเบราว์เซอร์ (คีย์ที่ยกสิทธิ์ทั้งฐาน)', () => {
    for (const f of files) {
      expect(codeOf(f), `${f.replace(SRC + '/', '')} มี service role key`).not.toMatch(/service_role/);
    }
  });

  it('🔴 ห้ามเรียก rpc ของเขาตรง ๆ จากรีโปนี้ (รวมชื่อที่ไม่ขึ้นต้นด้วย marketing_)', () => {
    const offenders = files
      .filter((f) => /rpc\(\s*['"`](ingest_marketing_event|marketing_)/.test(codeOf(f)))
      .map((f) => f.replace(SRC + '/', ''));
    expect(offenders, `เรียก rpc ของ OS ตรง: ${offenders.join(', ')}`).toEqual([]);
  });

  it('สะพานต้องยิงผ่าน edge function เท่านั้น ไม่ใช่ REST ตาราง', () => {
    const bridge = readFileSync(resolve(SRC, ALLOWED_FILE), 'utf8');
    expect(bridge).toContain('/functions/v1/');
    expect(bridge, 'ห้ามยิง /rest/v1/ ไปที่ตารางของเขา').not.toContain('/rest/v1/');
  });

  it('CLAUDE.md ต้องบันทึกกฎใหม่ไว้ ไม่ใช่อยู่แค่ในแชต (ledger #41)', () => {
    const md = readFileSync(resolve(SRC, '../CLAUDE.md'), 'utf8');
    expect(md, 'ต้องบอกว่าอนุญาตอะไร').toMatch(/marketing-track/);
    expect(md, 'ต้องบอกว่ายังห้ามอะไร').toMatch(/ห้ามสร้าง migration `marketing_\*`/);
  });
});
