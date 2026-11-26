/* osRepointReadiness — ความพร้อมจริงของการย้ายแอป Marketing OS มาชี้ฐานเรา (ADR-0011 ข้อ ①)
 *
 * 🔴 ปัญหาที่ไฟล์นี้แก้ — CLAUDE.md เคยเขียนว่า *"ฝั่งฐานพร้อมหมดแล้ว · เหลือแค่แก้ปลายทางในโค้ด"*
 *    คำกล่าวอ้างนั้นวัดจาก **จำนวนแถวที่คัดลอกมาได้** (48 แถว · 11 ตาราง · ตรงกันสองฝั่ง)
 *    ซึ่งเป็นความจริง — **แต่ไม่ใช่คำถามที่ควรถาม** · คำถามที่ควรถามคือ
 *    **"ตารางที่แอปเขา query จริง มีอยู่ในฐานเราครบไหม"** ⇒ วัดแล้ววันที่ 26 พ.ย. 2569: **ไม่ครบ**
 *
 *    migration 0066 คัดลอกตาราง **ที่มีข้อมูล** (11 ตัว) ไม่ได้คัดลอกตาราง **ที่แอปใช้**
 *    ⇒ รากของทุกข้อที่ตามมาอยู่ที่การเลือกนั้นข้อเดียว
 *
 * 📌 กฎที่ไฟล์นี้บังคับ (จาก ledger #79 — *"ห้ามเขียนข้ออ้างเรื่องข้อมูลใน DB โดยไม่แนบจำนวนแถวที่นับจริง"*
 *    ซึ่งตั้งไว้แล้วแต่ **ไม่เคยมีกลไกบังคับ** จนมันกัดซ้ำที่นี่):
 *    ตัวเลขความพร้อมต้องอยู่ในรีโป พร้อม **วิธีนับ** + **วันที่** + **ที่มา** แล้วล็อกด้วยเทสต์
 *    (นิยามเดียวกับ `phase1Baseline.ts`)
 *
 * pure ทั้งไฟล์ · ไม่เรียกฐานข้อมูลเอง (วัดด้วยมือผ่าน MCP แล้วบันทึก · วิธีนับติดอยู่ด้านล่าง)
 */

/** ตารางนี้อยู่สถานะไหนในฐานของ **เรา** (`waigsnxhrlwtiotspaim`) */
export type OsTableState =
  /** 🟢 อยู่ใน `marketing_os` และมีแถวจริง — ใช้ได้ทันที */
  | 'has_data'
  /** 🟡 ไม่มีใน `marketing_os` · มีใน `public` แต่ **0 แถว** — และ `public.marketing_*` ยังไม่ใช่ของเรา (ห้ามแตะ) */
  | 'empty_shell_public'
  /** 🔴 ไม่มีในฐานเราเลยทั้งสอง schema — มีอยู่แค่ใน project เดิม `bjozpwdtqbpwcxnqguka` */
  | 'absent';

export interface OsAppTable {
  /** ชื่อตารางตามที่แอป query (ชื่อไม่ถูกเปลี่ยนตอนย้าย — ADR-0011 ข้อ 1) */
  name: string;
  state: OsTableState;
}

/** วันที่วัด — ตัวเลขทุกตัวในไฟล์นี้มาจากการนับสดวันนี้ ไม่ได้คัดลอกจากเอกสารเก่า */
export const OS_REPOINT_MEASURED_AT = '2026-11-26';

/**
 * 🟡 **ที่มาของ "แอป query ตารางอะไร" ยังไม่ถูกตรวจจากรีโปนี้** — มาจากรายงานของเซสชัน
 * Claude Code ที่รันบนเครื่องเจ้าของ 26 พ.ย. 2569 (อ่าน `apps/marketing-os/src/types/database.types.ts`)
 * เซสชันคลาวด์เปิดโฟลเดอร์นั้นไม่ได้ (`not_available`) ⇒ **ห้ามอ้างรายการนี้ว่าตรวจแล้ว**
 * 🟢 ส่วนที่ตรวจแล้วจริงคือ **สถานะในฐานเรา** (`information_schema` + นับแถว ผ่าน Supabase MCP)
 */
export const OS_APP_TABLE_SOURCE = 'laptop-session-report:apps/marketing-os/src/types/database.types.ts';

/** วิธีนับซ้ำ (รันกับ project `waigsnxhrlwtiotspaim`) */
export const OS_REPOINT_HOW_TO_COUNT =
  "information_schema.tables where table_schema in ('marketing_os','public') เทียบกับรายชื่อด้านล่าง " +
  '+ select count(*) ของตัวที่เจอ';

export const OS_APP_TABLES: readonly OsAppTable[] = [
  // 🟢 5 ตัวที่ใช้ได้ทันที
  { name: 'workspaces', state: 'has_data' },
  { name: 'workspace_members', state: 'has_data' },
  { name: 'marketing_brands', state: 'has_data' },
  { name: 'marketing_audience_segments', state: 'has_data' },
  { name: 'marketing_message_pillars', state: 'has_data' },
  // 🟡 4 ตัวที่มีใน public แต่ 0 แถว (และ public ไม่ใช่ของเรา)
  { name: 'marketing_campaigns', state: 'empty_shell_public' },
  { name: 'marketing_content_items', state: 'empty_shell_public' },
  { name: 'marketing_content_versions', state: 'empty_shell_public' },
  { name: 'marketing_offers', state: 'empty_shell_public' },
  // 🔴 8 ตัวที่ไม่มีในฐานเราเลย
  { name: 'marketing_action_items', state: 'absent' },
  { name: 'marketing_ai_jobs', state: 'absent' },
  { name: 'marketing_approval_requests', state: 'absent' },
  { name: 'marketing_campaign_hypotheses', state: 'absent' },
  { name: 'marketing_compliance_findings', state: 'absent' },
  { name: 'marketing_content_assets', state: 'absent' },
  { name: 'marketing_ctas', state: 'absent' },
  { name: 'marketing_tracking_links', state: 'absent' },
];

/**
 * 🔴 เกณฑ์ "สำเร็จ" ที่ `OS-APP-REPOINT-CHECKLIST.md` เคยเขียนไว้ **วัดไม่ได้**
 *    เกณฑ์เดิมคือ *"แอปแสดง `marketing_brand_rules` 7 ข้อ"* — แต่ `marketing_brand_rules`
 *    **ไม่ได้อยู่ในรายการตารางที่แอป query เลย** ⇒ ไม่มีหน้าไหนที่จะแสดงเลข 7 ให้เห็นได้
 *    ⇒ สัญญาณที่สังเกตได้จริงเหลือตัวเดียว: จำนวนกลุ่มเป้าหมาย (ของเขา 6 · ของเรา 5)
 */
export const OS_REPOINT_OBSERVABLE_SIGNAL = {
  table: 'marketing_audience_segments',
  theirs: 6,
  ours: 5,
  unobservable: 'marketing_brand_rules', // แอปไม่ query ตารางนี้ ⇒ เลข 7 โชว์ไม่ได้
} as const;

export interface OsRepointCoverage {
  total: number;
  hasData: number;
  emptyShellPublic: number;
  absent: number;
}

export function osRepointCoverage(
  tables: readonly OsAppTable[] = OS_APP_TABLES,
): OsRepointCoverage {
  return {
    total: tables.length,
    hasData: tables.filter((t) => t.state === 'has_data').length,
    emptyShellPublic: tables.filter((t) => t.state === 'empty_shell_public').length,
    absent: tables.filter((t) => t.state === 'absent').length,
  };
}

/** ข้อความที่เอกสารทุกฉบับต้องอ้างให้ตรงกัน — แก้ค่าแล้วไม่แก้เอกสาร = เทสต์แดง */
export const OS_REPOINT_COVERAGE_PHRASE = '5 จาก 17';

/** 🔴 ยังไม่ถูกตัดสิน (26 พ.ย. 2569) — ผู้ใช้ของเขา 11 คน มีใน `auth.users` ของเรา 0 คน (ADR-0013) */
export const IDENTITY_DECIDED = false;

export interface OsRepointOpts {
  /** เรื่อง identity ถูกตัดสินแล้วหรือยัง — ค่าเริ่มต้นคือสถานะจริงวันนี้ */
  identityDecided?: boolean;
}

/**
 * สิ่งที่ยังกั้นข้อ ① อยู่ — คืน **รายการว่าง** เมื่อไม่มีอะไรกั้นแล้วเท่านั้น
 * 🔴 fail-closed: ตราบใดที่ยังมีตาราง `absent` อยู่ การย้ายทำให้สำเร็จไม่ได้ ไม่ว่าสิทธิ์จะครบแค่ไหน
 */
export function osRepointBlockers(
  tables: readonly OsAppTable[] = OS_APP_TABLES,
  opts: OsRepointOpts = {},
): string[] {
  const identityDecided = opts.identityDecided ?? IDENTITY_DECIDED;
  const c = osRepointCoverage(tables);
  const out: string[] = [];
  if (c.absent > 0) {
    out.push(`ตาราง ${c.absent} ตัวไม่มีในฐานเราเลย ⇒ แอปจะได้ relation does not exist`);
  }
  if (c.emptyShellPublic > 0) {
    out.push(
      `ตาราง ${c.emptyShellPublic} ตัวมีแค่ใน public และ 0 แถว ⇒ ย้ายมา marketing_os ไม่ได้โดยไม่แตะของที่ไม่ใช่ของเรา`,
    );
  }
  if (!identityDecided) {
    out.push('identity ยังไม่ตัดสิน: workspace_members 11 คน มีใน auth.users ของเรา 0 คน');
  }
  return out;
}

/** 🔴 ตราบใดที่ยังมี blocker = ห้ามเขียนที่ไหนว่าฝั่งฐานพร้อม */
export function osRepointReady(
  tables: readonly OsAppTable[] = OS_APP_TABLES,
  opts: OsRepointOpts = {},
): boolean {
  return osRepointBlockers(tables, opts).length === 0;
}
