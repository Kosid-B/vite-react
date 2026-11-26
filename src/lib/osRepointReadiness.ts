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
 * 🔁 **รอบวัดที่สอง (26 พ.ย. 2569 บ่าย) — เจ้าของสั่ง "ไปต่อ" แทนที่จะหยุด** (ADR-0014)
 *    ตารางถูกเติมครบแล้วด้วย migration 0070 (3 ตัว · เซสชันบนเครื่องเจ้าของ apply) + 0071 (9 ตัว)
 *    ⇒ `absent` เหลือ **0** · ทั้ง 17 ตารางมีในฐานเราแล้ว และ **fingerprint คอลัมน์ตรงกับฝั่งเขาเป๊ะทั้ง 17**
 *    ⇒ ด่านที่เหลือข้อเดียวคือ **identity** ซึ่งยังไม่ถูกตัดสิน
 *    🔴 `structure_only` = 0 แถว **แต่ฝั่งเขาก็ 0 แถว** ⇒ นี่คือ "เท่ากับต้นทาง" ไม่ใช่ "ข้อมูลหาย"
 *
 * pure ทั้งไฟล์ · ไม่เรียกฐานข้อมูลเอง (วัดด้วยมือผ่าน MCP แล้วบันทึก · วิธีนับติดอยู่ด้านล่าง)
 */

/** ตารางนี้อยู่สถานะไหนในฐานของ **เรา** (`waigsnxhrlwtiotspaim`) */
export type OsTableState =
  /** 🟢 อยู่ใน `marketing_os` และมีแถวจริง — ใช้ได้ทันที */
  | 'has_data'
  /** 🟢 สร้างใน `marketing_os` แล้ว · **0 แถว** ซึ่งเท่ากับฝั่งเขา ⇒ ไม่ใช่ข้อมูลหาย (migration 0070/0071) */
  | 'structure_only'
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
  // 🟢 3 ตัวจาก migration 0070 (เซสชันบนเครื่องเจ้าของ apply 08:14:17 UTC)
  { name: 'marketing_offers', state: 'structure_only' },
  { name: 'marketing_ctas', state: 'structure_only' },
  { name: 'marketing_action_items', state: 'structure_only' },
  // 🟢 9 ตัวจาก migration 0071
  { name: 'marketing_campaigns', state: 'structure_only' },
  { name: 'marketing_campaign_hypotheses', state: 'structure_only' },
  { name: 'marketing_content_items', state: 'structure_only' },
  { name: 'marketing_content_versions', state: 'structure_only' },
  { name: 'marketing_ai_jobs', state: 'structure_only' },
  { name: 'marketing_content_assets', state: 'structure_only' },
  { name: 'marketing_approval_requests', state: 'structure_only' },
  { name: 'marketing_compliance_findings', state: 'structure_only' },
  { name: 'marketing_tracking_links', state: 'structure_only' },
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
  structureOnly: number;
  absent: number;
  /** ตารางที่ "มีอยู่จริงในฐานเรา" = ใช้ query ได้ไม่ล้ม */
  present: number;
}

export function osRepointCoverage(
  tables: readonly OsAppTable[] = OS_APP_TABLES,
): OsRepointCoverage {
  const hasData = tables.filter((t) => t.state === 'has_data').length;
  const structureOnly = tables.filter((t) => t.state === 'structure_only').length;
  return {
    total: tables.length,
    hasData,
    structureOnly,
    absent: tables.filter((t) => t.state === 'absent').length,
    present: hasData + structureOnly,
  };
}

/** ข้อความที่เอกสารทุกฉบับต้องอ้างให้ตรงกัน — แก้ค่าแล้วไม่แก้เอกสาร = เทสต์แดง */
export const OS_REPOINT_COVERAGE_PHRASE = '17 จาก 17';

/**
 * 🔴 **ความจริงเรื่อง identity ที่เพิ่งวัดได้ 26 พ.ย. 2569 — ตัวเลข "11 คน" ที่อ้างกันมาตลอดเข้าใจผิด**
 *    (CLAUDE.md · ADR-0012 · ADR-0013 · ADR-0014 เขียนไว้ว่า "ผู้ใช้ของเขา 11 คน"
 *     เหมือนเป็นคน 11 คนที่ต้องย้าย — ความจริงคือ **1 คน + fixture ของเทสต์ RLS 10 คน**)
 *
 *    | workspace | สร้างเมื่อ | สมาชิก | brand | segment | rule |
 *    |---|---|---|---|---|---|
 *    | `RLS_TEST_WORKSPACE_A` | 24 ส.ค. 07:55:01 | 5 | 0 | 0 | 0 |
 *    | `RLS_TEST_WORKSPACE_B` | 24 ส.ค. 07:55:01 | 5 | 0 | 0 | 0 |
 *    | `ceo-ai-thailand` (`e82e7d93…`) | 4 ก.ย. | **1** | 1 | **6** | **7** |
 *
 *    🟢 ยืนยันสองฝั่ง (ฐานเขาและฐานเรา ตรงกันทุกแถว) · สอง fixture สร้าง**วินาทีเดียวกัน** และว่างเปล่าทั้งคู่
 *    🟢 `e82e7d93…` = **workspace ตัวเดียวกับที่ `marketing-behavior-ingest` hardcode ไว้**
 *    ⇒ แอป OS วันนี้เป็น **single-tenant ของเจ้าของ** ไม่ใช่ระบบหลายผู้ใช้
 *    ⇒ ต้นทุนของทาง (ข) *"ย้ายผู้ใช้เข้า auth.users ของเรา"* = **1 บัญชี ไม่ใช่ 11** (ADR-0015)
 */
export const IDENTITY_FACTS = {
  measuredAt: '2026-11-26',
  workspacesTotal: 3,
  /** workspace ที่มีข้อมูลจริง = `ceo-ai-thailand` (`e82e7d93-b88e-48ff-9364-b54bcff5278d`) */
  realWorkspaces: 1,
  /** `RLS_TEST_WORKSPACE_A` + `B` — สร้างวินาทีเดียวกัน · brand/segment/rule = 0 ทั้งคู่ */
  fixtureWorkspaces: 2,
  membersTotal: 11,
  /** owner ของ workspace จริง 1 คน (`e0063708-…`) */
  realMembers: 1,
  fixtureMembers: 10,
  /** 🔴 คนจริงคนนั้นก็ยังไม่มีใน `auth.users` ของเรา */
  realMembersInOurAuthUsers: 0,
  ourAuthUsers: 4,
} as const;

/** ทางที่เลือกเดินเรื่อง identity (ADR-0013 · ADR-0015) */
export type IdentityApproach =
  /** ยังไม่ตัดสิน */
  | 'undecided'
  /** (ก) ฝั่งเซิร์ฟเวอร์ใช้ service key + helper ตัวเดียวที่บังคับ workspace — เจ้าของเลือก (ADR-0015) */
  | 'service_key_scoped'
  /** (ข) ย้ายผู้ใช้ของเขาเข้า `auth.users` ของเรา แล้วเขียน RLS */
  | 'shared_auth_users';

/**
 * 🟢 เจ้าของเลือก **(ข)** 26 พ.ย. 2569 — ADR-0016 (แทน ADR-0015 ที่เคยเลือก (ก))
 *    เปลี่ยนเพราะวัดได้ว่าเป็นผู้ใช้จริง **1 คน** และคนนั้นคือ `support@b-tctraining.com`
 *    ซึ่ง **มีบัญชีในฐานเราอยู่แล้ว** ⇒ ต้นทุนของ (ข) = แมป 1 แถว ไม่ใช่ย้าย 11 บัญชี
 *    ⇒ ได้ **Postgres บังคับเส้นแบ่ง workspace** แทนโค้ดแอป ซึ่งแข็งแรงกว่า (ก) ทุกทาง
 */
export const IDENTITY_APPROACH: IdentityApproach = 'shared_auth_users';

/**
 * 🟢 **ทำแล้วและพิสูจน์แล้วบน production** (migration 0072 · 26 พ.ย. 2569)
 *    พิสูจน์ด้วยการ **สวมบทผู้ใช้จริงใน SQL** (`set local role authenticated`
 *    + `request.jwt.claims.sub`) ไม่ใช่แค่ดูว่า policy มีอยู่:
 *      · เจ้าของ (`d9c45d9c…`) เห็น `marketing_audience_segments` = **6** · brand 1 · pillar 7
 *        · workspace **1** (ไม่เห็น fixture 2 ก้อน) · สมาชิก 2
 *      · ลูกค้าคนอื่นของเรา = **0 ทุกตาราง**
 *      · `anon` · ตารางที่ไม่ได้เปิด · เพิ่มสมาชิก · คนนอกเขียนลง workspace = **ถูกปฏิเสธ 42501 ทั้ง 4 ข้อ**
 *    🔴 สิ่งที่ยังพิสูจน์ไม่ได้: ชั้น **HTTP/PostgREST** — proxy ของเซสชันคลาวด์ block `supabase.co`
 *       ⇒ ที่พิสูจน์แล้วคือ **ฐานบังคับถูก** ไม่ใช่ว่า supabase-js เรียกสำเร็จ
 */
export const IDENTITY_IMPLEMENTED = true;

/**
 * 🔴 **ด่านสุดท้ายที่เหลือ** — แอป OS ยังชี้ไป project เดิม `bjozpwdtqbpwcxnqguka`
 *    ต้องแก้ 3 ค่าในโค้ดแอป: `NEXT_PUBLIC_SUPABASE_URL` · anon key · `db: { schema: 'marketing_os' }`
 *    ⇒ อยู่บนเครื่องเจ้าของ · เซสชันคลาวด์เปิดโฟลเดอร์ไม่ได้ (`not_available`)
 *    เกณฑ์ยืนยัน: แอปแสดงกลุ่มเป้าหมาย **6** กลุ่ม (ของเขา) ไม่ใช่ **5** (ของเรา)
 */
export const APP_REPOINTED = false;

export interface OsRepointOpts {
  /** identity พร้อมใช้งานจริงแล้วหรือยัง (เลือกทาง **และ** ทำเสร็จ) — ค่าเริ่มต้นคือสถานะจริงวันนี้ */
  identityReady?: boolean;
  /** แอป OS ชี้มาฐานเราแล้วหรือยัง */
  appRepointed?: boolean;
}

/**
 * สิ่งที่ยังกั้นข้อ ① อยู่ — คืน **รายการว่าง** เมื่อไม่มีอะไรกั้นแล้วเท่านั้น
 * 🔴 fail-closed: ตราบใดที่ยังมีตาราง `absent` อยู่ การย้ายทำให้สำเร็จไม่ได้ ไม่ว่าสิทธิ์จะครบแค่ไหน
 */
export function osRepointBlockers(
  tables: readonly OsAppTable[] = OS_APP_TABLES,
  opts: OsRepointOpts = {},
): string[] {
  const identityReady =
    opts.identityReady ?? (IDENTITY_APPROACH !== 'undecided' && IDENTITY_IMPLEMENTED);
  const appRepointed = opts.appRepointed ?? APP_REPOINTED;
  const c = osRepointCoverage(tables);
  const out: string[] = [];
  if (c.absent > 0) {
    out.push(`ตาราง ${c.absent} ตัวไม่มีในฐานเราเลย ⇒ แอปจะได้ relation does not exist`);
  }
  if (!identityReady) {
    out.push(
      IDENTITY_APPROACH === 'undecided'
        ? `identity ยังไม่ตัดสิน: ผู้ใช้จริง ${IDENTITY_FACTS.realMembers} คน มีใน auth.users ของเรา ${IDENTITY_FACTS.realMembersInOurAuthUsers} คน`
        : `identity เลือกทางแล้ว (${IDENTITY_APPROACH}) แต่ยังไม่ได้ทำในโค้ดแอป OS`,
    );
  }
  if (!appRepointed) {
    out.push('แอป OS ยังชี้ไป project เดิมของเขา ⇒ ต้องแก้ URL + key + db.schema');
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
