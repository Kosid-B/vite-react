/* ══════════════════════════════════════════════════════════════════════════
 * brandSync — เทียบ "ความจริงเรื่องแบรนด์" ของเรา กับแหล่งจริงใน Marketing OS
 *
 * 🧱 เส้นแบ่งที่ยังอยู่: Marketing OS = อีกระบบ (เจ้าของ freeze 24 ส.ค. 2569)
 *    เจ้าของยกเลิกข้อห้ามให้เฉพาะ **อ่านอย่างเดียว 3 ตาราง** (15 พ.ย. 2569)
 *    ⇒ ไฟล์นี้ไม่ต่อฐานข้อมูลเอง · เป็น pure logic ล้วน
 *       ตัวที่ยิง REST คือ `scripts/brand-sync-check.mjs` เท่านั้น
 *
 * 🔴 ทำไมไม่ย้าย brandBrief ไปอ่านจากฐานของอีกระบบตรง ๆ:
 *    ผลิตภัณฑ์ต้องทำงานได้แม้อีกระบบล่ม และ `brandBrief.ts` ถูกบังคับให้ pure
 *    (มีเทสต์เทียบทีละข้อกับ seoData/ctaContext) ⇒ ถ้าทำให้มันเป็น async
 *    เราจะได้ผลิตภัณฑ์ที่พังเพราะระบบที่เราไม่ได้เป็นเจ้าของ
 *    ⇒ ท่าที่เลือก: **เก็บสำเนาไว้ที่เราเหมือนเดิม แต่จับได้เมื่อสำเนาเพี้ยนจากแหล่งจริง**
 * ══════════════════════════════════════════════════════════════════════════ */

import type { HeroSeg } from './heroVariant';

/** แหล่งจริงของ Marketing OS
 *
 *  🔁 **ย้ายแล้ว 26 พ.ย. 2569** (ข้อ ② ของลำดับรวมฐาน · เจ้าของเลือก "ทาง 2")
 *     เดิม = project แยก `bjozpwdtqbpwcxnqguka` (ยืนยันสด 15 พ.ย.) · **นิ่งตั้งแต่ 21 พ.ย. 09:34**
 *     ⇒ เทียบกับมัน = เทียบกับของที่ไม่มีใครแก้อีก · drift หลังจากนั้นจะไม่มีวันถูกจับ
 *     ตอนนี้ = schema `marketing_os` ใน production ของเรา · อ่านผ่าน rpc เท่านั้น (ADR-0012)
 *  ⚠️ ทำ ② ได้เพราะแหล่งจริงย้ายแล้ว: แอป OS บนเครื่องเจ้าของชี้ฐานนี้และอ่านผ่านเกณฑ์ในเครื่อง
 *     (brand_rules 7 · segments 6 ไม่ใช่ 10/5 ของ public — วัดด้วย service key ก่อนเปลี่ยนเป็น ADR-0016)
 *     ส่วน project เดิมไม่มีใครเขียนอีกแล้ว · แอป OS **ยังไม่ deploy** (ดู osRepointReadiness) */
export const MARKETING_SOURCE = {
  projectRef: 'waigsnxhrlwtiotspaim',
  schema: 'marketing_os',
  /** rpc ใน `public` ที่สคริปต์เรียก (migration 0074 · service_role เท่านั้น) */
  rpc: 'os_brand_sync_segments',
  /** project เดิม — คงไว้เป็นหลักฐาน + ให้เทสต์กันไม่ให้ใครชี้กลับไปโดยไม่รู้ตัว */
  retiredProjectRef: 'bjozpwdtqbpwcxnqguka',
  projectName: 'CEOAITHAILAND Marketing',
  /** 🔒 อ่านได้เท่านี้ — เจ้าของอนุญาตเฉพาะสามตารางนี้ และเฉพาะการอ่าน */
  readOnlyTables: ['marketing_brands', 'marketing_audience_segments', 'marketing_message_pillars'],
  /** 🔴 ห้ามเขียนทุกกรณี — brandSync มีไว้จับ drift ไม่ใช่แก้ข้อมูลของอีกฝั่ง */
  writeAllowed: false,
} as const;

/** ข้อมูลทดสอบ RLS ที่ค้างอยู่ในฐานของอีกระบบ (พบ 15 พ.ย. 2569)
 *  เรา **กรองออก ไม่ลบ** — มันเป็นขยะของอีกระบบ ให้เจ้าของระบบนั้นเก็บเอง */
export const TEST_FIXTURE_PREFIX = 'RLS_TEST';
export function isTestFixture(name: string | null | undefined): boolean {
  return typeof name === 'string' && name.trim().toUpperCase().startsWith(TEST_FIXTURE_PREFIX);
}

/** ชั้นกลุ่มเป้าหมายของเรา (เรียงแล้ว — ดู brandBrief.AUDIENCE) */
export type AudienceLayer = 'primary' | 'secondary' | 'broad' | 'growth' | 'sideDoor';

/** 🔴 แมปรหัสของอีกระบบ → ชั้น + seg ของเรา
 *  **ประกาศไว้ตรง ๆ ไม่เดาจากชื่อ** — ชื่อกลุ่มสองฝั่งเขียนคนละสำนวน
 *  การเดาจากข้อความไทยเคยพังมาแล้วใน positioningEngine (ตัดคำแล้วจำแนกผิดชั้น) */
export const SEG_CODE_MAP: Record<string, { layer: AudienceLayer; localSeg: HeroSeg | null }> = {
  employee: { layer: 'primary', localSeg: 'sidebiz' },
  graduate: { layer: 'secondary', localSeg: null },
  newbie: { layer: 'broad', localSeg: 'newbie' },
  /* 🔁 แก้ 15 พ.ย. 2569 — เดิมแมป growth → 'seller' ซึ่งผิด
   *    เทียบพาดหัวจริงแล้ว: 'เจ้าของธุรกิจที่ต้องการเติบโต' (เขา)
   *      ↔ owner  = "ถ้าคุณหยุดสักวัน ธุรกิจหยุดตามไหม?"  — โตแบบมีระบบ  ✅ ตรง
   *      ↔ seller = "ของคุณดีกว่า แต่ร้านอื่นขายดีกว่า?"  — คนหาไม่เจอ   ❌ คนละ pain
   *    อยู่ช่วงชีวิตธุรกิจเดียวกัน แต่มาด้วยปัญหาคนละข้อ ⇒ แมปผิดจะส่งพาดหัวผิดให้คนทั้งกลุ่ม */
  growth: { layer: 'growth', localSeg: 'owner' },
  /* 🟢 ย้ายเข้ามาจาก PENDING_UPSTREAM เมื่อ 19 พ.ย. 2569 — ปลายทางเพิ่มให้แล้วจริง
   *    ยืนยันสดผ่าน MCP: code='seller' · name='เจ้าของที่มีของขายแล้ว แต่ลูกค้าหาไม่เจอ'
   *    · evidence_status='hypothesis' · active=true  ⇒ "ตกลงแล้ว" กลายเป็น "มีแล้ว" ตามกลไกที่วางไว้ */
  seller: { layer: 'growth', localSeg: 'seller' },
  audit: { layer: 'sideDoor', localSeg: 'audit' },
};

/** 🤝 รหัสที่ **ตกลงกันแล้ว** ว่าฝั่ง Marketing OS จะเพิ่มเข้าทะเบียน แต่ยังไม่ยืนยันว่ามีจริง
 *  🔴 ห้ามเอาไปใส่ SEG_CODE_MAP ก่อนที่มันจะมีจริง — ถ้าใส่ ระบบจะเลิกเตือนทั้งที่ join ยังพัง
 *     "ตกลงแล้ว" ≠ "มีแล้ว" (หลักเดียวกับ unknown ≠ open ≠ closed)
 *  `check:brand-sync` บอกเองเมื่อมันขึ้นจริงที่ปลายทาง (ฟิลด์ `pendingLanded`)
 *
 *  🟢 **ว่างอยู่ตอนนี้ (19 พ.ย. 2569)** — `seller` เป็นรายการแรกและเดียวที่เคยอยู่ในคิวนี้
 *     กลไกเดินครบรอบแล้ว: ขอ → เขาเพิ่ม → `pendingLanded` จับได้ → ย้ายเข้า SEG_CODE_MAP
 *  ⚠️ **ห้ามลบ map นี้ทิ้งเพราะมันว่าง** — มันคือที่พักของ "ของที่ตกลงแล้วแต่ยังไม่มี" รอบหน้า
 *     ถ้าลบ ครั้งต่อไปจะไม่มีที่ให้เขียน แล้วรหัสที่เพิ่งตกลงจะถูกยัดเข้า SEG_CODE_MAP ทันทีทั้งที่ยังไม่มีจริง
 */
export const PENDING_UPSTREAM: Record<string, { localSeg: HeroSeg; layer: AudienceLayer; why: string }> = {};

/** 🔀 **รหัสที่สองฝั่งใช้คนละคำ แต่หมายถึงกลุ่มเดียวกัน** — ใช้แปลลิงก์ที่เข้ามาจากอีกระบบ
 *
 * 🔴 ปัญหาที่แก้ (ตรวจสด 19 พ.ย. 2569): ทะเบียนของเขาใช้ `growth`/`employee`
 *    ฝั่งเราใช้ `owner`/`sidebiz` ⇒ ลิงก์แคมเปญ `/?seg=growth` ของเขา
 *    **ตกเป็นพาดหัว default** เพราะ `segmentFor()` ไม่รู้จักคำนั้น
 *    = บั๊กตระกูลเดียวกับที่วัดได้ว่า `landing_funnel.seg='default'` 97.5% (ledger #73/#74)
 *    ⚠️ ไม่ใช่ปัญหา join — พจนานุกรมแปลตอนส่งออกถูกอยู่แล้ว · ที่พังคือ **ตอนคนกดลิงก์เข้ามา**
 *
 * ⚠️ **ไม่ประกาศซ้ำ — derive จาก SEG_CODE_MAP ตัวเดียว** ⇒ แก้พจนานุกรมที่เดียว ลิงก์ตามทันที
 *    เข้าข่าย alias เมื่อ ① ฝั่งเรามี HeroSeg รองรับ (`localSeg !== null`) ② คำสองฝั่งไม่ตรงกัน
 *    ⇒ `graduate` ไม่เข้า (เรายังไม่มีพาดหัวให้ — เดาไปจะส่งพาดหัวผิดกลุ่ม)
 *    ⇒ `newbie`/`audit` ไม่เข้า (ตรงกันอยู่แล้ว)
 *
 * 🔴 **ห้าม alias รหัสที่ชนกับ HeroSeg ที่มีอยู่** — จะแย่งความหมายของ seg ตัวเอง (เทสต์กันไว้)
 */
export const UPSTREAM_SEG_ALIAS: Readonly<Record<string, HeroSeg>> = Object.freeze(
  Object.fromEntries(
    Object.entries(SEG_CODE_MAP)
      .filter(([code, m]) => m.localSeg !== null && m.localSeg !== code)
      .map(([code, m]) => [code, m.localSeg as HeroSeg]),
  ),
);

/** 🔴 seg ที่เป็น **ประเภทธุรกิจ ไม่ใช่กลุ่มเป้าหมาย** — คนละแกนกับทะเบียน segment
 *  ยัดเข้าทะเบียนกลุ่มเป้าหมาย = ทะเบียนปนสองแกน แล้วจะงอกไม่จบ (ตอนนี้ 2 ตัว พรุ่งนี้มีอีก)
 *  ที่ถูกคือไปอยู่ฟิลด์ "ประเภทธุรกิจ" แยกต่างหากฝั่ง Marketing OS (เจ้าของตัดสิน 15 พ.ย. 2569) */
export const BUSINESS_TYPE_SEGS: readonly HeroSeg[] = ['food', 'palm'] as const;

export interface RemoteSegment {
  code: string;
  name: string;
  /** hypothesis | research | observed | validated — ต้องไม่เป็น validated จนกว่าจะมีผลจริง */
  evidence_status?: string | null;
  active?: boolean | null;
}

export interface SegDrift {
  /** รหัสที่อีกระบบใช้ */
  code: string;
  layer: AudienceLayer | null;
  /** seg ที่ฝั่งเรารู้จัก — null = เราไม่มีรหัสนี้เลย */
  localSeg: HeroSeg | null;
  /** true = ลิงก์ `?seg=<code>` จากอีกระบบจะตกเป็นพาดหัว default ที่ฝั่งเรา */
  fallsBackToDefault: boolean;
  why: string;
}

export interface SyncReport {
  /** รหัสที่ทั้งสองฝั่งใช้คำเดียวกัน ⇒ ลิงก์ข้ามระบบทำงานได้ */
  aligned: string[];
  /** 🔀 คำต่างกัน **แต่ `UPSTREAM_SEG_ALIAS` พาถึงแล้ว** ⇒ ลิงก์ทำงานได้เหมือนกัน
   *  🔴 แยกออกจาก `drift` โดยเจตนา (19 พ.ย. 2569): ถ้านับรวมเป็น drift ตัวตรวจจะขึ้น 🔴
   *     ค้างตลอดทั้งที่ของถูกซ่อมแล้ว = เครื่องมือที่สอนให้เราเลิกเชื่อมัน
   *     (บทเรียนเดียวกับ `contrast-audit` ที่เดินไม่ครบแล้วรายงานเขียว — ledger #4b) */
  bridged: SegDrift[];
  /** รหัสที่ไม่ตรง **และยังไม่มีอะไรพาถึง** ⇒ กับดักจริง */
  drift: SegDrift[];
  /** ชั้นที่แหล่งจริงไม่มี แต่เรามี ⇒ เราพูดกับกลุ่มที่อีกระบบไม่รู้จัก */
  missingUpstream: AudienceLayer[];
  /** แถวที่เป็นข้อมูลทดสอบ และถูกกรองทิ้ง — ประกาศไว้ ไม่ซ่อน */
  filteredFixtures: string[];
  /** 🔴 เกณฑ์ที่ประกาศว่าพิสูจน์แล้วทั้งที่ยังไม่มีผลจริง — ห้ามมี */
  illegalValidated: string[];
  /** 🟢 รหัสที่เคยค้างรอ และตอนนี้ปลายทางเพิ่มให้แล้ว ⇒ ย้ายเข้า SEG_CODE_MAP ได้ */
  pendingLanded: string[];
}

const ALL_LAYERS: AudienceLayer[] = ['primary', 'secondary', 'broad', 'growth', 'sideDoor'];

/** เทียบรหัสกลุ่มของอีกระบบกับของเรา — pure ทั้งหมด
 *  🔴 ไม่ "ทำให้ตรงกันเอง" — หน้าที่ของมันคือ **ทำให้ความไม่ตรงมองเห็นได้** */
export function compareSegments(remote: RemoteSegment[]): SyncReport {
  const filteredFixtures: string[] = [];
  const real: RemoteSegment[] = [];
  for (const r of remote) {
    if (isTestFixture(r.name) || isTestFixture(r.code)) filteredFixtures.push(r.name || r.code);
    else real.push(r);
  }

  const aligned: string[] = [];
  const bridged: SegDrift[] = [];
  const drift: SegDrift[] = [];
  const seenLayers = new Set<AudienceLayer>();

  for (const r of real) {
    const m = SEG_CODE_MAP[r.code];
    if (m) seenLayers.add(m.layer);
    if (m && m.localSeg === r.code) {
      aligned.push(r.code);
      continue;
    }
    /* 🔀 คำต่างกันแต่มี alias พาถึง ⇒ ลิงก์ `?seg=<code>` ใช้ได้จริง ไม่ใช่กับดัก
     *    เงื่อนไขตรงกับที่ UPSTREAM_SEG_ALIAS ใช้ derive (localSeg มีจริง และคำไม่ตรง) */
    if (m && m.localSeg !== null && r.code in UPSTREAM_SEG_ALIAS) {
      bridged.push({
        code: r.code,
        layer: m.layer,
        localSeg: m.localSeg,
        fallsBackToDefault: false,
        why: `คำต่างกัน (เขา '${r.code}' · เรา '${m.localSeg}') แต่ alias พาถึงแล้ว ⇒ ลิงก์ใช้ได้`,
      });
      continue;
    }
    drift.push({
      code: r.code,
      layer: m?.layer ?? null,
      localSeg: m?.localSeg ?? null,
      fallsBackToDefault: true,
      why: !m
        ? (r.code in PENDING_UPSTREAM
            ? `รหัส '${r.code}' เพิ่งขึ้นที่ปลายทางตามที่ตกลงไว้ — ย้ายเข้า SEG_CODE_MAP ได้แล้ว`
            : `อีกระบบมีรหัส '${r.code}' ที่เราไม่เคยแมปไว้เลย`)
        : m.localSeg === null
          ? `ชั้น ${m.layer} ยังไม่มี HeroSeg ของตัวเองที่ฝั่งเรา`
          : `ชั้น ${m.layer} ใช้คนละคำ — อีกระบบ '${r.code}' · ฝั่งเรา '${m.localSeg}'`,
    });
  }

  // 🔴 งานวิจัย/สมมติฐานของอีกระบบ ห้ามถูกอ่านเป็น validated (กฎ ClaimStatus ของเรา)
  const illegalValidated = real
    .filter((r) => (r.evidence_status ?? '').toLowerCase() === 'validated')
    .map((r) => r.code);

  return {
    pendingLanded: real.map((r) => r.code).filter((c) => c in PENDING_UPSTREAM).sort(),
    aligned: aligned.sort(),
    bridged: bridged.sort((a, b) => a.code.localeCompare(b.code)),
    drift: drift.sort((a, b) => a.code.localeCompare(b.code)),
    missingUpstream: ALL_LAYERS.filter((l) => !seenLayers.has(l)),
    filteredFixtures: filteredFixtures.sort(),
    illegalValidated: illegalValidated.sort(),
  };
}

/** สรุปเป็นบรรทัดเดียวสำหรับรายงาน — ไม่มีตัวเลขไหนถูกปัดให้ดูดี */
export function syncVerdict(r: SyncReport): { ok: boolean; line: string } {
  const ok = r.drift.length === 0 && r.illegalValidated.length === 0;
  if (r.illegalValidated.length) {
    return { ok: false, line: `🔴 อีกระบบประกาศ validated ทั้งที่ยังไม่มีผลจริง: ${r.illegalValidated.join(', ')}` };
  }
  if (!ok) {
    const total = r.drift.length + r.aligned.length + r.bridged.length;
    return { ok: false, line: `🔴 รหัสกลุ่มที่ยังไม่มีอะไรพาถึง ${r.drift.length} จาก ${total} — ลิงก์จากอีกระบบจะตกเป็นพาดหัว default` };
  }
  const via = r.bridged.length ? ` (ตรงคำ ${r.aligned.length} · alias พาถึง ${r.bridged.length})` : '';
  return { ok: true, line: `🟢 ลิงก์ข้ามระบบใช้ได้ครบ ${r.aligned.length + r.bridged.length} รายการ${via}` };
}
