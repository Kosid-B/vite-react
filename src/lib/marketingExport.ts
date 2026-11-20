/* ══════════════════════════════════════════════════════════════════════════
 * marketingExport — ส่ง "ข้อมูลหลังบ้านของ CEO AI Thailand" ให้ Marketing OS ใช้
 *
 * ทิศทาง (เจ้าของยืนยัน 15 พ.ย. 2569):
 *   CEO AI Thailand (production)  ──export──▶  Marketing OS (bjozpwdtqbpwcxnqguka)
 *   "marketing เป็นการนำข้อมูลหลังบ้าน CEO มาใช้ในการพัฒนาการตลาด"
 *
 * 🔴 หัวใจของไฟล์นี้ไม่ใช่ตัวเลข — ตัวเลขดึงมาตรง ๆ ก็ได้
 *    หัวใจคือ **ป้ายความจริงที่ติดไปกับตัวเลข** เพราะอีกระบบไม่รู้กฎของเรา:
 *      · MIN_FOR_RATE = 100 — ต่ำกว่านี้ "อัตรา" เป็นความบังเอิญ ไม่ใช่ผลงาน
 *      · 0/7 แปลว่า "ยังไม่พบ" ไม่ใช่ "อัตราจริงเป็นศูนย์" (zeroIsNotProof)
 *      · seg=default 94.7% วัดบั๊กการติดแท็กของเรา ไม่ได้วัดตลาด (ledger #43/#73)
 *    ถ้าส่งแต่ตัวเลขเปล่า อีกระบบจะสรุปผิดแทนเรา แล้วเราจะไม่มีวันรู้
 *
 * 🧱 ไม่มี PII — `landing_funnel` ออกแบบมาแบบ PDPA-safe ตั้งแต่ต้น
 *    (session uuid สุ่มฝั่ง client · ไม่เก็บ IP/user id/cursor path)
 * ══════════════════════════════════════════════════════════════════════════ */

import { SEG_CODE_MAP, PENDING_UPSTREAM, BUSINESS_TYPE_SEGS, type AudienceLayer } from './brandSync';
import { AUDIENCE } from './brandBrief';
import { BIZ_LABEL } from './skillCatalog';
import {
  PLAN_NAME, PLAN_PRICE, PLAN_PRICE_NUM, ANNUAL_MONTHS_CHARGED,
  annualPrice, annualSavingPct,
} from './access';
import type { PlanId } from '../types';
import { MIN_FOR_RATE } from './growthPdca';

/** แถวดิบจาก landing_funnel ที่ aggregate มาแล้วฝั่ง SQL */
export interface SegRow {
  seg: string;
  visitors: number;
  cta: number;
  signup: number;
}

/** ทำไมตัวเลขนี้เชื่อได้แค่ไหน — ภาษาที่อีกระบบอ่านแล้วตัดสินใจถูก */
export type RateTrust = 'conclusive' | 'too-few' | 'not-found-yet';

export interface SegExport {
  /** รหัสฝั่งเรา (landing_funnel.seg) */
  seg: string;
  /** รหัสฝั่ง Marketing OS — null = ทะเบียนของเขายังไม่มีกลุ่มนี้ */
  marketingCode: string | null;
  layer: AudienceLayer | null;
  visitors: number;
  cta: number;
  signup: number;
  /** 🔴 อัตราคำนวณให้ก็ต่อเมื่อเชื่อได้ — ไม่งั้นเป็น null ห้ามเป็น 0 */
  signupRate: number | null;
  trust: RateTrust;
  note: string;
}

export interface ExportBundle {
  generatedAt: string;
  source: { project: string; table: string; totalRows: number };
  /** กติกาที่อีกระบบต้องถือตามเวลาใช้ข้อมูลชุดนี้ */
  rules: string[];
  segments: SegExport[];
  /** persona ตามชั้นกลุ่มเป้าหมาย → marketing_personas (ปลายทางยังว่าง 0 แถว) */
  personas: PersonaExport[];
  /** ประเภทธุรกิจที่เราเก็บจริง → marketing_business_types (ปลายทางยังว่าง 0 แถว) */
  businessTypes: BusinessTypeExport[];
  /** ข้อเสนอจริงที่ขายอยู่ → marketing_offers (ปลายทางยังว่าง 0 แถว) */
  offers: OfferExport[];
  /** ตารางปลายทางของแต่ละก้อน — ให้ตัว import ของเขารู้ว่าอะไรไปไหน */
  targetTables: Record<string, string>;
  /** 🔴 สิ่งที่ข้อมูลชุดนี้ตอบไม่ได้ — ประกาศไว้ ไม่ให้เดาเอง */
  blindSpots: string[];
}

/** รหัสฝั่งเรา → รหัสฝั่งเขา (กลับทิศจาก SEG_CODE_MAP) */
export function toMarketingCode(seg: string): { code: string | null; layer: AudienceLayer | null } {
  for (const [code, m] of Object.entries(SEG_CODE_MAP)) {
    if (m.localSeg === seg) return { code, layer: m.layer };
  }
  return { code: null, layer: null };
}

export function describeSeg(r: SegRow): SegExport {
  const { code, layer } = toMarketingCode(r.seg);
  let trust: RateTrust;
  let note: string;

  if (r.visitors >= MIN_FOR_RATE) {
    trust = 'conclusive';
    note = `คนมากพอ (≥ ${MIN_FOR_RATE}) ⇒ อ่านอัตราได้`;
  } else if (r.signup > 0) {
    trust = 'too-few';
    note = `คนน้อยกว่า ${MIN_FOR_RATE} ⇒ มีคนสมัครจริง แต่ "อัตรา" ยังเป็นความบังเอิญ ห้ามเอาไปเทียบกลุ่มอื่น`;
  } else {
    trust = 'not-found-yet';
    note = `0 จาก ${r.visitors} = **ยังไม่พบ** ไม่ใช่ "กลุ่มนี้ไม่เวิร์ก" — ต้องมีอย่างน้อย ${MIN_FOR_RATE} คนถึงจะสรุปได้`;
  }

  return {
    seg: r.seg,
    marketingCode: code,
    layer,
    visitors: r.visitors,
    cta: r.cta,
    signup: r.signup,
    signupRate: trust === 'conclusive' ? r.signup / r.visitors : null,
    trust,
    note,
  };
}

export function buildExport(rows: SegRow[], generatedAt: string): ExportBundle {
  const segments = rows.map(describeSeg).sort((a, b) => b.visitors - a.visitors);
  const total = rows.reduce((s, r) => s + r.visitors, 0);
  const def = segments.find((s) => s.seg === 'default');
  const defPct = total ? Math.round(((def?.visitors ?? 0) / total) * 1000) / 10 : 0;
  /* 🔴 "แมปไม่ได้" ไม่ได้แปลว่าเรื่องเดียวกันทั้งหมด — แยก 3 กองคนละทางออก
   *    ถ้ากองรวมกัน คำเตือนที่ต้องลงมือ (trulyUnknown) จะจมอยู่กับของที่ตัดสินใจไปแล้ว */
  const unmappedAll = segments.filter((s) => s.marketingCode === null && s.seg !== 'default').map((s) => s.seg);
  const businessType = unmappedAll.filter((g) => (BUSINESS_TYPE_SEGS as readonly string[]).includes(g));
  const pending = unmappedAll.filter((g) => g in PENDING_UPSTREAM);
  const unmapped = unmappedAll.filter((g) => !businessType.includes(g) && !pending.includes(g));

  const blindSpots: string[] = [
    `seg=default ${defPct}% ของทั้งหมด — ตัวเลขนี้ **วัดการติดแท็กของเรา ไม่ได้วัดตลาด** (ledger #43/#73) ห้ามอ่านว่า "คนที่เข้ามาไม่มีกลุ่ม"`,
    'ข้อมูลนี้เห็นเฉพาะคนที่มาถึงหน้า `/` เท่านั้น — คนที่อ่านบทความหรือหน้า `/start` ไม่ถูกบันทึกที่นี่ (ledger #74)',
    'ไม่มีข้อมูลฝั่งแพลตฟอร์ม (ยอดเข้าถึง FB/YT) ⇒ คำนวณ "สะพาน" จากข้อมูลชุดนี้อย่างเดียวไม่ได้',
  ];
  if (pending.length) {
    blindSpots.push(
      `🤝 ตกลงแล้วว่าฝั่ง Marketing OS จะเพิ่มเข้าทะเบียน แต่ **ยังไม่ยืนยันว่ามีจริง**: ${pending.join(', ')} ` +
      '⇒ จนกว่าจะขึ้นจริง แถวเหล่านี้ยังหล่นตอน join ("ตกลงแล้ว" ≠ "มีแล้ว")',
    );
  }
  if (businessType.length) {
    blindSpots.push(
      `📐 ${businessType.join(', ')} เป็น **ประเภทธุรกิจ ไม่ใช่กลุ่มเป้าหมาย** — คนละแกนกับทะเบียน segment ` +
      '⇒ ห้ามยัดเข้าทะเบียนกลุ่ม (ทะเบียนจะปนสองแกนแล้วงอกไม่จบ) ให้ไปอยู่ฟิลด์ "ประเภทธุรกิจ" แยกต่างหาก',
    );
  }
  blindSpots.push(
    '🔑 ไฟล์นี้ **ไม่มี** workspace_id / brand_id / UUID ใด ๆ **โดยเจตนา** — เป็นกุญแจ tenancy ของคุณ ' +
    'ตัว import ต้องเติมเอง ⇒ เราเดาแล้วข้อมูลจะไปลงผิด tenant',
  );
  blindSpots.push(
    '🏷️ `personas[].evidenceStatus` เป็น `hypothesis` ทุกตัว **ไม่ใช่ค่าตั้งต้นที่ลืมแก้** — ' +
    'เรายังไม่มีลูกค้าจ่ายจริงและยังไม่มีผลการทดลองซ้ำ ⇒ ส่งค่าอื่นไป = โกหกผ่าน schema ที่ถูกต้อง',
  );
  blindSpots.push(
    '💰 ตาราง `marketing_offers` ของคุณ **ไม่มีคอลัมน์ราคา** ⇒ ราคาอยู่ใน `description` ' +
    'เป็นข้อความ ไม่ใช่ตัวเลขที่คำนวณต่อได้ · ถ้าต้องใช้ราคาเชิงตัวเลข ต้องเพิ่มคอลัมน์ฝั่งคุณ',
  );
  blindSpots.push(
    `🚪 ข้อเสนอที่ **ไม่ได้ส่งไป**: ${OFFERS_NOT_EXPORTED.join(' · ')}`,
  );
  blindSpots.push(
    '🔴 ยังไม่มีข้อเสนอไหนพิสูจน์แล้ว — ลูกค้าจ่ายจริง **0 ราย** ⇒ ห้ามอ่านว่าแพ็กไหนขายดี',
  );
  const gaps = bizVocabGaps();
  if (gaps.length) {
    blindSpots.push(
      `🔴 คำศัพท์ประเภทธุรกิจของเราเองยังไม่ตรงกัน: ${gaps.join(', ')} ถูกใช้เป็น seg บนหน้าเว็บ ` +
      'แต่ไม่มีในแคตาล็อก (`BIZ_LABEL`) ⇒ **ไม่ได้ส่งไปในก้อน businessTypes** เพราะยังไม่มีชื่อที่ยืนยันได้ ' +
      '— ประกาศไว้แทนการเดาชื่อให้',
    );
  }
  if (unmapped.length) {
    blindSpots.push(`🔴 รหัสที่ยังไม่มีใครตัดสินใจเลย: ${unmapped.join(', ')} ⇒ ถ้า join ด้วยทะเบียนเดิมจะทิ้งแถวเหล่านี้เงียบ ๆ`);
  }

  return {
    generatedAt,
    source: { project: 'waigsnxhrlwtiotspaim', table: 'landing_funnel', totalRows: total },
    rules: [
      `อัตราใด ๆ เชื่อได้เมื่อฐาน ≥ ${MIN_FOR_RATE} คนเท่านั้น (MIN_FOR_RATE) — ต่ำกว่านี้ \`signupRate\` จะเป็น null โดยตั้งใจ`,
      '`signupRate: null` ≠ 0 — แปลว่า **ยังสรุปไม่ได้** ห้ามเติม 0 แทน',
      'ห้ามสร้างข้อมูลตัวอย่างเพื่อเติมช่องว่าง — ถ้าไม่มีข้อมูล ให้แสดงว่าไม่มี',
      'ทุกเกณฑ์ที่สร้างจากข้อมูลชุดนี้มีสถานะได้แค่ hypothesis — ห้าม validated จนกว่าจะมีผลซ้ำ',
    ],
    segments,
    personas: buildPersonas(),
    businessTypes: buildBusinessTypes(),
    offers: buildOffers(),
    targetTables: {
      segments: 'marketing_audience_segments (อ้างอิง — ไม่ใช่ของใหม่)',
      personas: 'marketing_personas',
      businessTypes: 'marketing_business_types',
      offers: 'marketing_offers',
    },
    blindSpots,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 🧩 ขยายขอบเขต 20 พ.ย. 2569 — ส่ง persona + ประเภทธุรกิจ ไปเติมตารางที่ยังว่าง
 *
 * เจ้าของขยายสิทธิ์: **อ่านฐาน Marketing OS ได้ทุกตาราง · ห้ามเขียน** และยืนยัน
 * กลไกคือ **ไฟล์ export ทางเดียว** (ไม่เปิดให้เขาต่อฐานเรา · ไม่เขียนฐานเขา)
 *
 * สถานะปลายทางที่วัดสดได้ (ไม่ใช่เดา · `count(*)` จริง):
 *   marketing_brand_rules 7 · message_pillars 7 · audience_segments 6 · brands 1
 *   🔴 personas 0 · business_types 0 · segment_business_types 0 · campaigns 0 · offers 0
 *   ⇒ "ตารางมีอยู่ ≠ มีใครใช้มัน" (บทเรียน ledger #79 — ต่างกันแค่ count ครั้งเดียว)
 *
 * 🔴 กติกาการออกแบบไฟล์ (ห้ามละเมิด):
 *   ① **ส่งรหัสข้อความ ไม่ส่ง UUID** — `workspace_id`/`brand_id`/`segment_id` เป็นกุญแจ
 *      tenancy ของเขา ⇒ ตัว import ของเขาเติมเอง · เราเดา = ข้อมูลไปลงผิด tenant
 *   ② **`evidenceStatus` ได้แค่ `hypothesis`** — CHECK ของเขายอม 4 ค่า
 *      (hypothesis|research|observed|validated) ตรงกับ ClaimStatus ของเรา
 *      แต่เรายังไม่มีผลจริงสักตัว ⇒ ส่งค่าอื่นไป = โกหกผ่าน schema ที่ถูกต้อง
 *   ③ **ไม่สร้างคำบรรยายใหม่** — ทุกข้อความมาจาก AUDIENCE / BIZ_LABEL ของจริง
 * ══════════════════════════════════════════════════════════════════════════ */

/** คอลัมน์จริงของตารางปลายทาง — อ่านจาก information_schema 20 พ.ย. 2569
 *  🔴 ใช้เป็นสัญญา: ชื่อฟิลด์ที่เราส่งต้องเป็นสับเซตของรายการนี้ (เทสต์บังคับ) */
export const UPSTREAM_COLUMNS = {
  marketing_personas: ['id', 'workspace_id', 'brand_id', 'audience_segment_id', 'name',
    'summary', 'business_stage', 'awareness_stage', 'evidence_status', 'metadata',
    'created_at', 'updated_at'],
  marketing_business_types: ['id', 'workspace_id', 'code', 'name', 'description',
    'active', 'created_at', 'updated_at'],
  marketing_segment_business_types: ['workspace_id', 'segment_id', 'business_type_id', 'created_at'],
} as const;

/** กุญแจที่ **ห้าม** อยู่ในไฟล์ของเรา — ของเขาเติมเอง */
export const TENANCY_KEYS: readonly string[] = ['id', 'workspace_id', 'brand_id',
  'audience_segment_id', 'segment_id', 'business_type_id'] as const;

export interface BusinessTypeExport {
  /** → marketing_business_types.code (UNIQUE ร่วมกับ workspace_id) */
  code: string;
  /** → .name */
  name: string;
}

export interface PersonaExport {
  /** → marketing_personas.name */
  name: string;
  /** → .summary — ข้อความจาก AUDIENCE ตัวจริง ไม่เขียนใหม่ */
  summary: string;
  /** รหัสกลุ่มฝั่งเขา ให้ resolve เป็น audience_segment_id · null = ทะเบียนเขายังไม่มี */
  segmentCode: string | null;
  /** ชั้นกลุ่มเป้าหมายฝั่งเรา (เรียงแล้ว หัวหาด = primary) */
  layer: AudienceLayer;
  /** หน้าที่เชิงธุรกิจ — เจ้าของตัดสิน 24 ส.ค. 2569 */
  role: 'revenueEngine' | 'baseBuilding' | 'neverTheEngine' | null;
  /** 🔴 ได้แค่ hypothesis — เรายังไม่มีผลจริงสักตัว */
  evidenceStatus: 'hypothesis';
}

/** ประเภทธุรกิจที่เราเก็บจริง — จาก BIZ_LABEL ตัวเดียวกับ dropdown ของ "ตรวจสินค้าเร็ว"
 *  ⚠️ ตัด `all` ออก: เป็นค่า wildcard ของแคตาล็อก **ไม่ใช่ประเภทธุรกิจ** */
export function buildBusinessTypes(): BusinessTypeExport[] {
  return Object.entries(BIZ_LABEL)
    .filter(([code]) => code !== 'all')
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

/** รหัสฝั่งเขาที่เป็นตัวแทนของชั้นนี้ — ชั้น growth มีสองรหัส (growth, seller)
 *  ⇒ เลือกตัวที่ชื่อตรงกับชั้นก่อน แล้วค่อยเรียงตามตัวอักษร (deterministic) */
function upstreamCodeForLayer(layer: AudienceLayer): string | null {
  const codes = Object.entries(SEG_CODE_MAP)
    .filter(([, m]) => m.layer === layer)
    .map(([code]) => code)
    .sort();
  if (!codes.length) return null;
  return codes.includes(layer) ? layer : codes[0];
}

const LAYERS: AudienceLayer[] = ['primary', 'secondary', 'broad', 'growth', 'sideDoor'];

/** persona 5 ตัวจากชั้นกลุ่มเป้าหมายจริง — ข้อความมาจาก AUDIENCE ทั้งหมด */
export function buildPersonas(): PersonaExport[] {
  const roleOf = (l: AudienceLayer): PersonaExport['role'] =>
    AUDIENCE.revenueEngine === l ? 'revenueEngine'
      : AUDIENCE.baseBuilding === l ? 'baseBuilding'
        : AUDIENCE.neverTheEngine === l ? 'neverTheEngine' : null;
  return LAYERS.map((layer) => ({
    name: `${layer} — ${String(AUDIENCE[layer]).slice(0, 60)}`,
    summary: String(AUDIENCE[layer]),
    segmentCode: upstreamCodeForLayer(layer),
    layer,
    role: roleOf(layer),
    evidenceStatus: 'hypothesis' as const,
  }));
}

/** 🔴 คำศัพท์สองชุดของเราเองที่ไม่ตรงกัน — ประกาศไว้ ห้ามปิดด้วยการเดา
 *  `BUSINESS_TYPE_SEGS` (HeroSeg ที่เป็นประเภทธุรกิจ) ต้องมีอยู่ใน BIZ_LABEL ด้วย
 *  ไม่งั้นแปลว่าเรามีประเภทธุรกิจที่แคตาล็อกไม่รู้จัก ⇒ ส่งไปเขาจะ map ไม่ได้ */
export function bizVocabGaps(): string[] {
  const known = new Set(Object.keys(BIZ_LABEL));
  return (BUSINESS_TYPE_SEGS as readonly string[]).filter((s) => !known.has(s)).sort();
}

/* ══════════════════════════════════════════════════════════════════════════
 * 💰 Product Data → marketing_offers (ปลายทางยังว่าง 0 แถว)
 *
 * 🔴 ข้อแรกที่ต้องรู้: **ตาราง offers ของเขาไม่มีคอลัมน์ราคา**
 *    (id · workspace_id · brand_id · code · name · description · offer_type ·
 *     destination_url · active · created_at — อ่านจาก information_schema 20 พ.ย. 69)
 *    ⇒ ราคาต้องไปอยู่ใน `description` · **ห้ามเดาว่ามีคอลัมน์ price แล้วส่งไป**
 *
 * แหล่งราคา = `access.ts` **ที่เดียว** (PLAN_PRICE_NUM + annualPrice + annualSavingPct)
 *    ⇒ แก้ราคาในระบบแล้วไฟล์ที่ส่งออกเปลี่ยนตามเอง ไม่ต้องจำว่าต้องไปแก้ที่ไหนอีก
 *    (เคยพลาด: SalePage.tsx เขียนราคาตายตัวแล้วเรียกมันว่า mirror — ledger #76)
 * ══════════════════════════════════════════════════════════════════════════ */

/** คอลัมน์จริงของ marketing_offers — อ่านจาก information_schema 20 พ.ย. 2569 */
export const OFFERS_COLUMNS: readonly string[] = ['id', 'workspace_id', 'brand_id', 'code',
  'name', 'description', 'offer_type', 'destination_url', 'active', 'created_at'] as const;

export interface OfferExport {
  /** → marketing_offers.code */
  code: string;
  /** → .name */
  name: string;
  /** → .description — ราคาอยู่ในนี้ เพราะตารางเขาไม่มีคอลัมน์ราคา */
  description: string;
  /** → .offer_type */
  offerType: 'trial' | 'subscription-monthly' | 'subscription-annual';
  /** → .destination_url — **เส้นทางสัมพัทธ์** ให้ปลายทางเติม origin เอง */
  destinationPath: string;
}

const PAID: PlanId[] = ['starter', 'growth', 'scale'];

/** ข้อเสนอจริงที่ขายอยู่ — ทุกตัวเลขคำนวณสดจาก access.ts ไม่มี hardcode */
export function buildOffers(): OfferExport[] {
  const offers: OfferExport[] = [{
    code: 'free-trial',
    name: `ทดลองใช้ ${PLAN_PRICE.free}`,
    description: 'ปลดล็อกทุกฟีเจอร์ระดับ Scale · ไม่ต้องใช้บัตร · หมดอายุแล้วลดเป็นชั้นฟรีอัตโนมัติ',
    offerType: 'trial',
    destinationPath: '/start',
  }];
  for (const plan of PAID) {
    offers.push({
      code: `${plan}-monthly`,
      name: `${PLAN_NAME[plan]} (รายเดือน)`,
      description: `${PLAN_PRICE_NUM[plan].toLocaleString('th-TH')} บาท/เดือน`,
      offerType: 'subscription-monthly',
      destinationPath: '/sale',
    });
    offers.push({
      code: `${plan}-annual`,
      name: `${PLAN_NAME[plan]} (รายปี)`,
      description: `${annualPrice(plan).toLocaleString('th-TH')} บาท/ปี ` +
        `(จ่าย ${ANNUAL_MONTHS_CHARGED} เดือน ใช้ 12 เดือน ≈ ลด ${annualSavingPct(plan)}%)`,
      offerType: 'subscription-annual',
      destinationPath: '/sale',
    });
  }
  return offers;
}

/** 🔴 ข้อเสนอที่ **อ้างในเอกสารแต่ไม่มีค่าคงที่ในโค้ด** ⇒ ไม่ส่งไป ประกาศไว้แทน
 *  `฿1,990 ISO Readiness Pilot` — CLAUDE.md เองก็เขียนว่า "ยังไม่ฝังลงโค้ด · รอเจ้าของตัดสิน"
 *  และมันเป็น **ประตูข้าง** ที่กฎ `AUDIENCE.neverTheEngine` ห้ามยกเป็นเครื่องยนต์
 *  ⇒ ส่งไปโดยไม่มีแหล่ง = เสี่ยงให้ปลายทางยกขึ้นเป็นสารหลัก */
export const OFFERS_NOT_EXPORTED: readonly string[] = [
  'ISO Readiness Pilot ฿1,990 — ไม่มีค่าคงที่ในโค้ด (เอกสารอ้างไว้ แต่ยังไม่ฝัง) ' +
  'และเป็นประตูข้างที่ห้ามเป็นเครื่องยนต์หลัก (AUDIENCE.neverTheEngine)',
] as const;
