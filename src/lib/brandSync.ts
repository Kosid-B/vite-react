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

/** project ของอีกระบบ — ยืนยันสดผ่าน MCP 15 พ.ย. 2569 */
export const MARKETING_SOURCE = {
  projectRef: 'bjozpwdtqbpwcxnqguka',
  projectName: 'CEOAITHAILAND Marketing',
  /** 🔒 อ่านได้เท่านี้ — เจ้าของอนุญาตเฉพาะสามตารางนี้ และเฉพาะการอ่าน */
  readOnlyTables: ['marketing_brands', 'marketing_audience_segments', 'marketing_message_pillars'],
  /** 🔴 ห้ามเขียนทุกกรณี — ลบ/แก้ของในฐานอีกระบบ = ข้ามเส้นที่กว้างกว่าที่ได้รับอนุญาต */
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
  audit: { layer: 'sideDoor', localSeg: 'audit' },
};

/** 🤝 รหัสที่ **ตกลงกันแล้ว** ว่าฝั่ง Marketing OS จะเพิ่มเข้าทะเบียน แต่ยังไม่ยืนยันว่ามีจริง
 *  🔴 ห้ามเอาไปใส่ SEG_CODE_MAP ก่อนที่มันจะมีจริง — ถ้าใส่ ระบบจะเลิกเตือนทั้งที่ join ยังพัง
 *     "ตกลงแล้ว" ≠ "มีแล้ว" (หลักเดียวกับ unknown ≠ open ≠ closed)
 *  `check:brand-sync` จะบอกเองเมื่อมันขึ้นจริงที่ปลายทาง */
export const PENDING_UPSTREAM: Record<string, { localSeg: HeroSeg; layer: AudienceLayer; why: string }> = {
  seller: {
    localSeg: 'seller',
    layer: 'growth',
    why: 'มีของขายอยู่แล้วแต่คนหาไม่เจอ — คนละปัญหากับ growth ที่เป็นเรื่องโตแบบมีระบบ (เจ้าของตัดสิน 15 พ.ย. 2569)',
  },
};

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
  /** รหัสที่ไม่ตรง ⇒ กับดัก */
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
  const drift: SegDrift[] = [];
  const seenLayers = new Set<AudienceLayer>();

  for (const r of real) {
    const m = SEG_CODE_MAP[r.code];
    if (m) seenLayers.add(m.layer);
    if (m && m.localSeg === r.code) {
      aligned.push(r.code);
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
    return { ok: false, line: `🔴 รหัสกลุ่มไม่ตรงกัน ${r.drift.length} จาก ${r.drift.length + r.aligned.length} — ลิงก์จากอีกระบบจะตกเป็นพาดหัว default` };
  }
  return { ok: true, line: `🟢 รหัสกลุ่มตรงกันครบ ${r.aligned.length} รายการ` };
}
