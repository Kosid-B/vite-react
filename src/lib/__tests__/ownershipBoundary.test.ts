import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
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


  /** 🔑 ไฟล์ท่อ = edge function ที่รับ event เข้ามา
   *
   *  🔴 **แก้กติกา 26 พ.ย. 2569 (ADR-0012 · ledger #105)** — เดิมอนุญาตให้ไฟล์นี้แตะตาราง
   *     ได้ถ้าเขียน `.schema('marketing_os')` นำหน้า · **ของจริงพังเงียบบน production**:
   *     batch `mode:'live'` 2 ก้อน (23 + 25 พ.ย.) มี `archived_at = NULL` ทั้งคู่ ทั้งที่
   *     rpc เขียนแถวแล้ว · bucket สร้างแล้ว · ไฟล์ขึ้นคลังครบ 2/2
   *     ⇒ PostgREST รับเฉพาะ schema ที่อยู่ใน "Exposed schemas" ซึ่งเป็น **config ของ
   *       แพลตฟอร์ม ไม่ได้อยู่ในฐานข้อมูล** ⇒ เทสต์ในรีโปตรวจไม่ได้ และไม่มีใครเห็นว่ามันพัง
   *  ⇒ กติกาใหม่: **ห้ามแตะตาราง `marketing_*` ตรง ๆ ทุกไฟล์** — เข้าได้ทางเดียวคือ rpc ใน `public`
   *     (rpc ถูก expose เสมอ · และ `marketing_os` ยังไม่ต้องเปิดให้ใครมองเห็น) */
  const OS_PIPE_FILE = 'supabase/functions/marketing-behavior-ingest/index.ts';

  it('โค้ดในรีโปนี้ต้องไม่อ่าน/เขียนตาราง marketing_* โดยตรง (ไม่มีไฟล์ไหนได้รับยกเว้นแล้ว)', () => {
    const offenders = [...walk(resolve(ROOT, 'src')), ...walk(resolve(ROOT, 'supabase/functions'))]
      .map((p) => p.slice(ROOT.length + 1))
      .filter((rel) => /\.from\(\s*['"`]marketing_|rpc\(\s*['"`]marketing_/.test(codeOf(resolve(ROOT, rel))));
    expect(offenders, `ไฟล์ที่แตะตารางของอีกระบบ: ${offenders.join(', ')}`).toEqual([]);
  });

  it('🔴 ไฟล์ท่อห้ามพึ่ง "Exposed schemas" — ห้ามมี .schema() เลย', () => {
    const file = resolve(ROOT, OS_PIPE_FILE);
    expect(existsSync(file), `${OS_PIPE_FILE} ไม่มีอยู่จริง — ยกเว้นไฟล์ที่ไม่มีตัวตน = ช่องโหว่`).toBe(true);
    const code = codeOf(file);
    expect(/\.schema\(/.test(code),
      'กลับไปใช้ .schema() = พึ่งค่าที่อยู่นอกรีโป ซึ่งพังเงียบมาแล้วบน production').toBe(false);
    // และต้องยังเข้าถึง marketing_os ได้จริงผ่าน rpc — ไม่ใช่เขียวเพราะไม่ได้ทำอะไรเลย
    expect(code).toMatch(/rpc\(\s*['"`]receive_marketing_behavior['"`]/);
    expect(code).toMatch(/rpc\(\s*['"`]mark_marketing_behavior_archived['"`]/);
  });

  it('🔴 rpc ที่ไฟล์ท่อเรียก ต้องมี migration รองรับจริง (ห้ามเรียกของที่ไม่มี)', () => {
    const sql = readdirSync(resolve(ROOT, 'supabase/migrations'))
      .filter((f) => f.endsWith('.sql'))
      .map((f) => readFileSync(resolve(ROOT, 'supabase/migrations', f), 'utf8'))
      .join('\n');
    for (const fn of ['receive_marketing_behavior', 'mark_marketing_behavior_archived']) {
      expect(sql, `ไม่มี migration สร้าง ${fn}`).toContain(`function public.${fn}`);
      expect(sql, `${fn} ต้อง grant ให้ service_role เท่านั้น`)
        .toMatch(new RegExp(`grant execute on function public\\.${fn}[^;]*to service_role`));
    }
  });

  /** 🔴 B1 — สิทธิ์ของ `marketing_os` บน browser role
   *
   *  🔁 **แก้อย่างจงใจ 26 พ.ย. 2569 (ADR-0016 แทน ADR-0013/0015) — ไม่ใช่การผ่อนด่าน**
   *  กฎเดิม: *ห้าม grant ให้ `anon`/`authenticated` เลย* · เหตุผลที่เขียนไว้คือ
   *  *"`workspace_members` 11 คน มีใน `auth.users` ของเรา 0 ⇒ policy อิง `auth.uid()` แมตช์ศูนย์แถว"*
   *  🔴 ตัวเลขนั้น **อ่านผิด** (ledger #109): เป็นผู้ใช้จริง **1 คน** + fixture ของเทสต์ RLS 10 คน
   *     และคนจริงคนนั้นคือ `support@b-tctraining.com` ซึ่ง **มีบัญชีในฐานเราอยู่แล้ว**
   *  ⇒ เงื่อนไขที่กฎเดิมรออยู่ (*"จนกว่าจะตัดสินเรื่อง identity"*) **เกิดขึ้นแล้ว**
   *
   *  กฎใหม่ — **แคบลงกว่าเดิมในสองแกน ไม่ได้กว้างขึ้น**:
   *   ① `anon` **ห้ามได้สิทธิ์ตลอดกาล** ไม่มีเงื่อนไขใด ๆ มายกเว้นได้
   *   ② `authenticated` ได้เฉพาะเมื่อ migration เดียวกัน **สร้าง RLS policy ด้วย**
   *      ⇒ สิทธิ์เปล่าที่ไม่มี policy คุม = ของเดิมที่เราห้าม และยังห้ามอยู่
   *   ③ ห้าม `on all tables in schema` และห้าม `alter default privileges` กับ `authenticated`
   *      ⇒ ต้องระบุชื่อตารางทีละตัว (บทเรียน 0069: ตารางที่สร้างทีหลังได้สิทธิ์ติดมาเงียบ ๆ) */
  const scanBrowserGrants = (sql: string): string[] => {
    const hasPolicy = /create\s+policy[\s\S]*?marketing_os/i.test(sql);
    const bad: string[] = [];
    for (const stmt of sql.split(';')) {
      if (!/marketing_os/i.test(stmt)) continue;
      const head = stmt.replace(/^[\s\S]*?\n(?=\s*(grant|alter))/i, '');
      if (!/^\s*(grant|alter\s+default\s+privileges)/i.test(head)) continue;
      if (!/\bto\b[^;]*\b(anon|authenticated)\b/i.test(stmt)) continue;
      // ① anon = ห้ามเสมอ
      if (/\bto\b[^;]*\banon\b/i.test(stmt)) {
        bad.push(`anon: ${stmt.trim().slice(0, 70)}`);
        continue;
      }
      // ③ ห้ามเหวี่ยงกว้าง
      if (/all\s+tables\s+in\s+schema/i.test(stmt) || /^\s*alter\s+default\s+privileges/i.test(head)) {
        bad.push(`กว้างเกิน: ${stmt.trim().slice(0, 70)}`);
        continue;
      }
      // ② authenticated ต้องมี policy คู่กันในไฟล์เดียวกัน
      if (!hasPolicy) bad.push(`ไม่มี policy คู่กัน: ${stmt.trim().slice(0, 70)}`);
    }
    return bad;
  };

  it('🔴 migration: `anon` ห้ามได้สิทธิ์บน `marketing_os` · `authenticated` ต้องมี policy คู่กัน', () => {
    const bad: string[] = [];
    for (const f of readdirSync(resolve(ROOT, 'supabase/migrations')).filter((x) => x.endsWith('.sql'))) {
      for (const b of scanBrowserGrants(readFileSync(resolve(ROOT, 'supabase/migrations', f), 'utf8'))) {
        bad.push(`${f} → ${b}`);
      }
    }
    expect(bad, `สิทธิ์ browser role ที่ไม่ผ่านกฎ: ${bad.join(' | ')}`).toEqual([]);
  });

  it('🔴 ด่าน B1 ต้องจับของผิดได้จริง และต้องไม่จับของที่ถูก (ตัวอย่างสังเคราะห์)', () => {
    const POLICY =
      'create policy p on marketing_os.t for all to authenticated using (marketing_os.is_workspace_member(workspace_id));';
    // ① anon ห้ามเสมอ แม้มี policy
    expect(scanBrowserGrants(`grant usage on schema marketing_os to anon; ${POLICY}`)).toHaveLength(1);
    expect(scanBrowserGrants('grant select on marketing_os.t to anon;')).toHaveLength(1);
    // ② authenticated ไม่มี policy = ห้าม
    expect(scanBrowserGrants('grant select on marketing_os.t to authenticated;')).toHaveLength(1);
    // ② authenticated + policy = ผ่าน
    expect(scanBrowserGrants(`grant select on marketing_os.t to authenticated; ${POLICY}`)).toHaveLength(0);
    // ③ กว้างเกิน = ห้าม แม้มี policy
    expect(
      scanBrowserGrants(`grant select on all tables in schema marketing_os to authenticated; ${POLICY}`),
    ).toHaveLength(1);
    expect(
      scanBrowserGrants(
        `alter default privileges in schema marketing_os grant select on tables to authenticated; ${POLICY}`,
      ),
    ).toHaveLength(1);
    // service_role ยังผ่านทุกแบบเหมือนเดิม
    expect(scanBrowserGrants('grant select on all tables in schema marketing_os to service_role;')).toHaveLength(0);
    // revoke ต้องไม่ถูกนับเป็นการเปิด
    expect(scanBrowserGrants('revoke all on marketing_os.x from anon, authenticated;')).toHaveLength(0);
  });

  it('🔴 0072 ต้องปิด `anon` ไว้จริง และระบุชื่อตารางทีละตัว ไม่เหวี่ยงทั้ง schema', () => {
    const sql = readFileSync(resolve(ROOT, 'supabase/migrations/0072_marketing_os_member_rls.sql'), 'utf8');
    const code = sql.replace(/^\s*--.*$/gm, '');
    expect(/\bto\b[^;]*\banon\b/i.test(code), 'ห้าม grant ให้ anon').toBe(false);
    expect(/all\s+tables\s+in\s+schema/i.test(code), 'ห้ามเหวี่ยงทั้ง schema').toBe(false);
    expect(/alter\s+default\s+privileges/i.test(code), 'ห้ามตั้ง default ให้ตารางอนาคต').toBe(false);
    // ตารางที่ไม่ได้อยู่ใน 17 ตัวของแอป ต้องไม่ถูกเปิดให้ authenticated
    for (const t of ['marketing_behavior_events', 'marketing_behavior_batches', 'marketing_brand_rules', 'workspace_state']) {
      expect(code.includes(`${t} to authenticated`), `${t} ต้องไม่ถูกเปิด`).toBe(false);
    }
    // workspaces / workspace_members = อ่านเท่านั้น (กัน privilege escalation)
    expect(code).toMatch(/grant select on marketing_os\.workspace_members to authenticated/);
    expect(/insert[^;]*marketing_os\.workspace_members to authenticated/i.test(code)).toBe(false);
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
  });

  /* 🔁 แก้พร้อมเหตุผล 26 พ.ย. 2569 — เดิม "ห้ามใช้ service-role" เพราะสคริปต์อ่านฐานของอีกระบบด้วย publishable key
   *    หลังรวมฐาน (ADR-0011) schema ของ OS revoke anon ทั้งหมด (B1 · ADR-0013) ⇒ publishable key อ่านไม่ได้แล้ว
   *    เจ้าของเลือก "ทาง 2": ใช้ service key แทนการเปิด rpc ให้ anon (= ข้อมูลกลยุทธ์หลุดเป็นสาธารณะ)
   *    ⇒ ความเสี่ยงย้ายจาก "สิทธิ์กว้าง" ไปที่ "คีย์รั่ว" ⇒ ด่านใหม่เฝ้าที่ตัวคีย์ */
  it('🔴 service key ต้องมาจาก env ชื่อเฉพาะเท่านั้น — ห้ามฝัง ห้ามเป็น VITE_*', () => {
    const js = readFileSync(resolve(ROOT, SYNC_SCRIPT), 'utf8');
    expect(js).toMatch(/process\.env\.BRAND_SYNC_SERVICE_KEY/);
    expect(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./.test(js), 'มี JWT ฝังในสคริปต์').toBe(false);
    expect(/sb_secret_[A-Za-z0-9]/.test(js), 'มี secret key ฝังในสคริปต์').toBe(false);
    expect(/VITE_[A-Z_]*KEY/.test(js), 'คีย์ชื่อ VITE_* = หลุดไปเบราว์เซอร์').toBe(false);
  });

  /* 🔁 แก้พร้อมเหตุผล 26 พ.ย. 2569 — เดิม "ห้ามแตะ production ของเรา · ต้องชี้ project อีกระบบ"
   *    project นั้นถูกเลิกใช้ (นิ่งตั้งแต่ 21 พ.ย.) และแหล่งจริงย้ายมา `marketing_os` แล้ว
   *    ⇒ เส้นที่ยังต้องเฝ้า: เข้าได้ทาง **rpc เท่านั้น** (ADR-0012) และห้ามชี้กลับ project เดิมโดยไม่รู้ตัว */
  /**
   * 🔁 **อุดรูของด่านนี้ 26 พ.ย. 2569 (commit ตามหลัง #463 · เจ้าของสั่ง)**
   *
   * รุ่นแรกเขียนว่า `/\/rest\/v1\/\$\{(?!.*rpc)/` — เจตนาถูก แต่ `(?!.*rpc)` มองทั้ง**บรรทัด**
   * ⇒ ถ้าใครเพิ่มการอ่านตารางตรง **บนบรรทัดที่มีคำว่า `rpc` อยู่ด้วย** (แม้แค่ในคอมเมนต์ท้ายบรรทัด)
   *    lookahead จะล้มเหลว ⇒ regex ไม่แมตช์ ⇒ **ด่านผ่านฟรี**
   * 🔴 ทดสอบแล้วว่าหลุดจริง ไม่ใช่ความกังวลลอย ๆ (ดูเคสสังเคราะห์ในเทสต์ถัดไป)
   *
   * กฎที่ใช้แทน: **ทุก `/rest/v1/` ต้องตามด้วย `rpc/` เท่านั้น** — ไม่สนว่าบรรทัดนั้นมีคำอะไรอีก
   */
  const readsTableDirectly = (code: string) => /\/rest\/v1\/(?!rpc\/)/.test(code);

  it('🔴 สคริปต์ต้องอ่านแหล่งจริงผ่าน rpc เท่านั้น — ห้ามอ่านตารางตรง ห้ามพึ่ง Exposed schemas', () => {
    const js = readFileSync(resolve(ROOT, SYNC_SCRIPT), 'utf8');
    const code = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).toContain('waigsnxhrlwtiotspaim');
    expect(code).toMatch(/\/rest\/v1\/rpc\//);
    expect(readsTableDirectly(code), 'อ่านตารางตรงผ่าน REST').toBe(false);
    expect(/Accept-Profile|Content-Profile|\.schema\(/i.test(code), 'พึ่ง Exposed schemas (ADR-0012)').toBe(false);
  });

  it('🔴 ด่าน "ห้ามอ่านตารางตรง" ต้องไม่หลุดเมื่อบรรทัดนั้นมีคำว่า rpc อยู่ด้วย', () => {
    // ของที่ถูก — ต้องไม่ถูกจับ
    expect(readsTableDirectly('fetch(`${URL_}/rest/v1/rpc/${RPC}`, { headers })')).toBe(false);
    // ของที่ผิด 3 แบบ — ต้องถูกจับทุกแบบ
    expect(readsTableDirectly('fetch(`${URL_}/rest/v1/${table}?select=code`)')).toBe(true);
    expect(
      readsTableDirectly('fetch(`${URL_}/rest/v1/${t}?select=x`); // ไม่ใช่ rpc'),
      'รูเดิม: คำว่า rpc บนบรรทัดเดียวกันทำให้หลุด',
    ).toBe(true);
    expect(readsTableDirectly('fetch(`${URL_}/rest/v1/marketing_brands?select=*`)')).toBe(true);
  });

  it('🔴 project เดิมโผล่ในโค้ดได้แค่ในตัวกัน "ห้ามชี้กลับ" เท่านั้น', () => {
    const js = readFileSync(resolve(ROOT, SYNC_SCRIPT), 'utf8');
    const code = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).toMatch(/const RETIRED = 'bjozpwdtqbpwcxnqguka'/);
    expect(code).toMatch(/URL_\.includes\(RETIRED\)/);
    expect(code.split('bjozpwdtqbpwcxnqguka').length - 1, 'project เดิมถูกใช้ที่อื่นนอกตัวกัน').toBe(1);
  });

  it('🔴 rpc ที่สคริปต์เรียก ต้องมี migration รองรับ และ grant ให้ service_role เท่านั้น', () => {
    const sql = readdirSync(resolve(ROOT, 'supabase/migrations'))
      .filter((f) => f.endsWith('.sql'))
      .map((f) => readFileSync(resolve(ROOT, 'supabase/migrations', f), 'utf8'))
      .join('\n');
    expect(sql).toContain('function public.os_brand_sync_segments');
    expect(sql).toMatch(/grant execute on function public\.os_brand_sync_segments[^;]*to service_role/);
    expect(sql, 'ห้ามเปิด rpc นี้ให้ browser role').not.toMatch(
      /grant execute on function public\.os_brand_sync_segments[^;]*\b(anon|authenticated)\b/,
    );
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
