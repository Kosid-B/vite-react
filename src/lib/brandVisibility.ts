/* brandVisibility — "ตลาดและ Search Engine เริ่มจำแบรนด์เราถูกหรือยัง"
 *
 * 🔴 ปัญหาที่ตอบ (เจ้าของตั้งโจทย์ 27 ส.ค. 2569 จากภาพ Google AI Overview):
 *   AI แตกคำว่า `ceoaithailand` เป็น "CEO และ AI ในประเทศไทย" แล้วอ้างนิตยสาร/รางวัล/หลักสูตร
 *   ⇒ ต้องมี **ระบบตรวจ** ว่าเรื่องนี้ดีขึ้นหรือแย่ลง ไม่ใช่ดูภาพหน้าจอเป็นครั้ง ๆ
 *
 * 🔴 หลักที่ทั้งไฟล์นี้ยืนอยู่บน — เหมือน `growthPdca.receiving: null`:
 *   **`null` = ตรวจไม่ได้ ≠ 0** · ตัวชี้วัดที่เราอ่านเองไม่ได้ ต้องประกาศเป็นจุดบอด
 *   ห้ามเติม 0 ให้ครบตารางเพื่อให้คำนวณคะแนนออกมาสวย — คะแนนที่คำนวณจากศูนย์ปลอม
 *   จะทำให้เราตัดสินใจผิดแล้วไม่มีทางรู้ตัว
 *
 * 🔴 และ **ห้ามให้คะแนนรวม ถ้าตาบอดเกินครึ่ง** (เหมือน `bottleneckOf` ที่คืน 'unknown')
 *   `Brand Entity Health: 41/100` ที่ดูน่าเชื่อ แต่คำนวณจากช่องว่าง = ตัวเลขที่อันตรายที่สุด
 *
 * 🔴 และ **ตัวชี้วัดที่ไม่มีเป้าหมาย ห้ามเข้าคะแนน** — ของเดิมที่เขียนไว้รอบแรกเฉลี่ย
 *   `min(1, value)` ข้ามหน่วย ⇒ จัดทำดัชนี 1 หน้า กับ 30 หน้า ได้คะแนนเท่ากัน (เต็ม)
 *   ⇒ คะแนนต้องมาจาก `target` ที่เขียนไว้ชัด และทุก target ติดป้าย `ThresholdStatus`
 *
 * ⚠️ ขอบเขตความเป็นเจ้าของ: ไฟล์นี้เป็น **สมองที่ตัดสินใจ** (ของรีโปนี้)
 *    ส่วน **ที่เก็บข้อมูล** และ **ตัวเชื่อม connector** ยังทำไม่ได้ — ดู `releaseGates`
 *    และการตลาดของเราเอง (แคมเปญ/attribution) เป็นของอีกระบบ
 *
 * pure ทั้งไฟล์ · ไม่แตะฐานข้อมูล · ไม่มี migration
 */

import { MIN_FOR_RATE } from './growthPdca';
import { entityProfiles } from './brandEntity';
import type { ThresholdStatus } from './decisionRules';

/** ใครอ่านค่านี้ได้ — ตัวที่ผู้ช่วยอ่านเองไม่ได้ ต้องรอเจ้าของกรอก/ส่งออกมา */
export type ReadableBy = 'in-repo' | 'owner-only';

export interface BrandMetric {
  key: string;
  label: string;
  /** ค่าที่อ่านได้จริง — 🔴 `null` = ตรวจไม่ได้ ห้ามแปลว่า 0 */
  value: number | null;
  unit: string;
  source: string;
  readableBy: ReadableBy;
  /** ต้องมีข้อมูลกี่หน่วยก่อนถึงจะอ่านค่าเป็น "อัตรา" ได้ (null = ไม่ใช่อัตรา) */
  minSample: number | null;
  /** เป้าที่ถือว่า "เต็ม" — `null` = ตัวประกอบบริบท **ไม่เข้าคะแนน** */
  target: number | null;
  /** ทิศทางที่ดี — 'down' สำหรับอันดับ (1 ดีกว่า 10) */
  direction: 'up' | 'down';
  /** ที่มาของเกณฑ์ — 🔴 ห้ามเป็น 'validated' จนกว่าจะมีผลจริงของเราเอง */
  thresholdStatus: ThresholdStatus | null;
  /** ทำอะไรถึงจะอ่านค่านี้ได้ — ห้ามคืนจุดบอดเปล่า ๆ */
  howToGet: string;
}

export interface BrandVisibilityInput {
  /** อันดับของหน้าเราเมื่อค้นชื่อแบรนด์ (1 = อันดับแรก) — จาก Search Console */
  brandedRank?: number | null;
  /** ยอดแสดงผลของคำค้นแบรนด์ในช่วงที่ดู */
  brandedImpressions?: number | null;
  /** คลิก ÷ แสดงผล ของคำค้นแบรนด์ (0–1) */
  brandedCtr?: number | null;
  /** จำนวนหน้าที่ถูกจัดทำดัชนี */
  indexedPages?: number | null;
  /** ใน 10 ผลแรกของการค้นชื่อแบรนด์ เป็นของเรากี่ส่วน (0–1) */
  ownedSerpCoverage?: number | null;
  /** จำนวนเว็บอื่นที่พูดถึงแบรนด์เราในความหมายเดียวกัน */
  externalMentions?: number | null;
  /** ส่วนแบ่งการค้นหาเทียบชื่อที่สับสนกัน (0–1) */
  shareOfSearch?: number | null;
  /** ผู้ติดตาม/การเข้าถึงของช่องทางการ */
  facebookFollowers?: number | null;
  youtubeSubscribers?: number | null;
}

/** สัญญาณ entity ที่รีโปคุมเองได้ = โปรไฟล์ที่ต้องมี URL ครบเพื่อใส่ `sameAs`
 *  🔴 คำนวณจาก `entityProfiles()` จริง — ห้ามเขียนจำนวนตายตัวไว้ที่นี่
 *     (เพิ่มช่องทางใหม่แล้วลืมแก้เลข = คะแนนโกหกทันที) */
export function entityConsistency(): { value: number; missing: number; total: number } {
  const req = entityProfiles().filter((p) => p.required);
  const have = req.filter((p) => !!p.url).length;
  return { value: req.length ? have / req.length : 0, missing: req.length - have, total: req.length };
}

/** เกณฑ์ "เต็ม" ของแต่ละตัว — ทุกตัวเป็น policy/hypothesis เท่านั้น
 *  🔴 ห้ามมีตัวไหนเป็น 'validated' จนกว่าจะมีผลจริงของธุรกิจเราเอง (decisionRules) */
export const BRAND_TARGETS = {
  entityConsistency: { target: 1, status: 'policy' as ThresholdStatus },
  indexedPages: { target: 30, status: 'hypothesis' as ThresholdStatus },
  brandedRank: { target: 1, status: 'policy' as ThresholdStatus },
  ownedSerpCoverage: { target: 0.7, status: 'policy' as ThresholdStatus },
  externalMentions: { target: 5, status: 'hypothesis' as ThresholdStatus },
  shareOfSearch: { target: 0.5, status: 'hypothesis' as ThresholdStatus },
} as const;

export function brandMetrics(inp: BrandVisibilityInput = {}): BrandMetric[] {
  const ec = entityConsistency();
  const n = (v: number | null | undefined): number | null => (v === undefined ? null : v);
  return [
    {
      key: 'entityConsistency', label: 'ความสอดคล้องของสัญญาณ entity', value: ec.value, unit: 'สัดส่วน',
      source: 'brandEntity.entityProfiles (ตรวจจากรีโป)', readableBy: 'in-repo', minSample: null,
      target: BRAND_TARGETS.entityConsistency.target, direction: 'up',
      thresholdStatus: BRAND_TARGETS.entityConsistency.status,
      howToGet: 'อ่านได้เลย — คำนวณจากไฟล์จริงในรีโป',
    },
    {
      key: 'indexedPages', label: 'หน้าที่ถูกจัดทำดัชนี', value: n(inp.indexedPages), unit: 'หน้า',
      source: 'Google Search Console', readableBy: 'owner-only', minSample: null,
      target: BRAND_TARGETS.indexedPages.target, direction: 'up',
      thresholdStatus: BRAND_TARGETS.indexedPages.status,
      howToGet: 'Search Console → Pages → "จัดทำดัชนีแล้ว"',
    },
    {
      key: 'brandedRank', label: 'อันดับเมื่อค้นชื่อแบรนด์', value: n(inp.brandedRank), unit: 'อันดับ',
      source: 'Google Search Console', readableBy: 'owner-only', minSample: null,
      target: BRAND_TARGETS.brandedRank.target, direction: 'down',
      thresholdStatus: BRAND_TARGETS.brandedRank.status,
      howToGet: 'Search Console → Performance → กรองคำค้น "ceoaithailand" → ดู Position',
    },
    {
      key: 'ownedSerpCoverage', label: 'ส่วนของผลค้นหาชื่อแบรนด์ที่เป็นของเรา', value: n(inp.ownedSerpCoverage), unit: 'สัดส่วน',
      source: 'ค้นชื่อแบรนด์แล้วนับเอง', readableBy: 'owner-only', minSample: null,
      target: BRAND_TARGETS.ownedSerpCoverage.target, direction: 'up',
      thresholdStatus: BRAND_TARGETS.ownedSerpCoverage.status,
      howToGet: 'ค้น "CEO AI Thailand" ในหน้าต่างส่วนตัว → นับว่าใน 10 ผลแรก เป็นเว็บ/โปรไฟล์ของเรากี่อัน',
    },
    {
      key: 'externalMentions', label: 'เว็บอื่นที่พูดถึงเราในความหมายเดียวกัน', value: n(inp.externalMentions), unit: 'แหล่ง',
      source: 'ค้นด้วยมือ / เครื่องมือ backlink', readableBy: 'owner-only', minSample: null,
      target: BRAND_TARGETS.externalMentions.target, direction: 'up',
      thresholdStatus: BRAND_TARGETS.externalMentions.status,
      howToGet: 'ค้น "CEO AI Thailand" แล้วนับเว็บที่พูดถึงในความหมายที่ถูกต้อง',
    },
    {
      key: 'shareOfSearch', label: 'ส่วนแบ่งการค้นหาเทียบชื่อที่สับสนกัน', value: n(inp.shareOfSearch), unit: 'สัดส่วน',
      source: 'Google Trends / Search Console', readableBy: 'owner-only', minSample: MIN_FOR_RATE,
      target: BRAND_TARGETS.shareOfSearch.target, direction: 'up',
      thresholdStatus: BRAND_TARGETS.shareOfSearch.status,
      howToGet: 'เทียบยอดค้นหา "ceo ai thailand" กับ "ceo thailand" ใน Google Trends',
    },
    // ── ต่อจากนี้ = ตัวประกอบบริบท ไม่เข้าคะแนน (ไม่มีเป้าที่พิสูจน์ได้ว่าเท่าไหร่ถึงพอ) ──
    {
      key: 'brandedImpressions', label: 'ยอดแสดงผลของคำค้นแบรนด์', value: n(inp.brandedImpressions), unit: 'ครั้ง',
      source: 'Google Search Console', readableBy: 'owner-only', minSample: null,
      target: null, direction: 'up', thresholdStatus: null,
      howToGet: 'Search Console → Performance → กรองคำค้นที่มี "ceoai"',
    },
    {
      key: 'brandedCtr', label: 'อัตราคลิกของคำค้นแบรนด์', value: n(inp.brandedCtr), unit: 'สัดส่วน',
      source: 'Google Search Console', readableBy: 'owner-only', minSample: MIN_FOR_RATE,
      target: null, direction: 'up', thresholdStatus: null,
      howToGet: `Search Console → CTR ของคำค้นแบรนด์ (ต้องมีแสดงผล ≥ ${MIN_FOR_RATE} ครั้งก่อนอ่านเป็นอัตรา)`,
    },
    {
      key: 'facebookFollowers', label: 'ผู้ติดตาม Facebook', value: n(inp.facebookFollowers), unit: 'คน',
      source: 'Facebook Page Insights', readableBy: 'owner-only', minSample: null,
      target: null, direction: 'up', thresholdStatus: null,
      howToGet: 'เปิดเพจ → Insights → Followers',
    },
    {
      key: 'youtubeSubscribers', label: 'ผู้ติดตาม YouTube', value: n(inp.youtubeSubscribers), unit: 'คน',
      source: 'YouTube Studio', readableBy: 'owner-only', minSample: null,
      target: null, direction: 'up', thresholdStatus: null,
      howToGet: 'YouTube Studio → Analytics → Subscribers',
    },
  ];
}

/** คะแนนของตัวชี้วัดเดียว (0–1) — `null` เมื่ออ่านค่าไม่ได้ หรือไม่ใช่ตัวที่เข้าคะแนน */
export function metricScore(m: BrandMetric): number | null {
  if (m.value === null || m.target === null) return null;
  if (m.direction === 'down') {
    if (m.value <= 0) return null; // อันดับ 0 ไม่มีจริง — ถือว่าอ่านค่าไม่ได้ ดีกว่าให้เต็ม
    return Math.max(0, Math.min(1, m.target / m.value));
  }
  if (m.target <= 0) return null;
  return Math.max(0, Math.min(1, m.value / m.target));
}

/** สัดส่วนตัวชี้วัด "ที่เข้าคะแนน" ซึ่งยังตรวจไม่ได้ — เกินนี้ห้ามให้คะแนนรวม */
export const MAX_BLIND_RATIO = 0.5;

export interface BrandHealth {
  /** คะแนน 0–100 — 🔴 `null` เมื่อตาบอดเกินครึ่ง (ห้ามเดาให้ตัวเลขออกมาสวย) */
  score: number | null;
  /** ทำไมถึงยังให้คะแนนไม่ได้ / คะแนนนี้มาจากอะไร */
  why: string;
  /** ตัวที่อ่านค่าไม่ได้ (ทั้งหมด รวมตัวประกอบบริบท) */
  blind: BrandMetric[];
  readable: BrandMetric[];
  /** ทำอะไรต่อ — หนึ่งข้อ ตามลำดับคอขวด */
  nextAction: string;
  /** คอขวดปัจจุบัน — `null` เมื่อผ่านครบทุกขั้น */
  bottleneck: string | null;
}

/** ลำดับคอขวดของ "การถูกจำถูกตัว" — ห้ามข้ามขั้น
 *  สัญญาณของเราเองต้องตรงก่อน แล้วค่อยไปหวังให้คนนอกยืนยัน */
export const BRAND_BOTTLENECK_ORDER: readonly string[] = [
  'entityConsistency',   // เราพูดตรงกันเองหรือยัง
  'indexedPages',        // Google เห็นหน้าเราหรือยัง
  'brandedRank',         // ค้นชื่อเราแล้วเจอเราไหม
  'ownedSerpCoverage',   // เจอแล้ว...แต่ครองทั้งหน้าหรือแค่อันเดียว
  'externalMentions',    // มีคนอื่นยืนยันไหม
  'shareOfSearch',       // คนเริ่มค้นชื่อเรามากขึ้นไหม
];

export function brandHealth(inp: BrandVisibilityInput = {}): BrandHealth {
  const ms = brandMetrics(inp);
  const byKey = new Map(ms.map((m) => [m.key, m]));
  const blind = ms.filter((m) => m.value === null);
  const readable = ms.filter((m) => m.value !== null);

  // ── คอขวด: ตัวแรกตามลำดับที่ยัง "ไม่เต็ม" หรือ "อ่านไม่ได้" ──
  let bottleneck: string | null = null;
  let nextAction = 'ผ่านครบทุกขั้นแล้ว — เทียบกับรอบก่อนเพื่อดูว่ายังทรงตัวอยู่ไหม';
  for (const key of BRAND_BOTTLENECK_ORDER) {
    const m = byKey.get(key);
    if (!m) continue;
    if (m.value === null) {
      bottleneck = key;
      nextAction = `ยังอ่าน "${m.label}" ไม่ได้ ⇒ ${m.howToGet}`;
      break;
    }
    const s = metricScore(m);
    if (s !== null && s < 1) {
      bottleneck = key;
      nextAction =
        key === 'entityConsistency'
          ? `สัญญาณ entity ของเราเองยังไม่ครบ — ขาด ${entityConsistency().missing} ช่องทาง (ให้เจ้าของส่ง URL มาใส่ config.SOCIAL · ห้ามเดา URL เอง)`
          : `"${m.label}" อยู่ที่ ${m.value} · เป้า ${m.target} ${m.unit} (เกณฑ์ = ${m.thresholdStatus}) — ทำข้อนี้ให้ถึงก่อนไปขั้นถัดไป`;
      break;
    }
  }

  const scored = ms.filter((m) => m.target !== null);
  const scoredBlind = scored.filter((m) => metricScore(m) === null);
  const blindRatio = scored.length ? scoredBlind.length / scored.length : 1;

  if (blindRatio > MAX_BLIND_RATIO) {
    return {
      score: null,
      why:
        `ตรวจไม่ได้ ${scoredBlind.length} จาก ${scored.length} ตัวชี้วัดที่เข้าคะแนน ` +
        `(เกิน ${Math.round(MAX_BLIND_RATIO * 100)}%) ⇒ ให้คะแนนรวมไม่ได้ · ` +
        'คะแนนที่คำนวณจากช่องว่างคือตัวเลขที่อันตรายที่สุด',
      blind, readable, nextAction, bottleneck,
    };
  }
  const got = scored.map(metricScore).filter((s): s is number => s !== null);
  const avg = got.reduce((s, v) => s + v, 0) / got.length;
  return {
    score: Math.round(avg * 100),
    why: `คำนวณจาก ${got.length} ตัวชี้วัดที่อ่านได้จริง (ตรวจไม่ได้ ${scoredBlind.length} ตัว · เกณฑ์ทุกตัวยังเป็น policy/hypothesis)`,
    blind, readable, nextAction, bottleneck,
  };
}

/** ผลของสถานะ entity ต่อ **วงจรการเติบโต** — ไม่ใช่แค่ตัวเลขในแผงของตัวเอง
 *
 * 🔴 เหตุผลที่ต้องมีฟังก์ชันนี้ (เจ้าของสั่ง 27 ส.ค. 2569 ว่าต้องเชื่อม
 *   Website + Google + Facebook + YouTube กลับเข้า **Growth Loop เดียวกัน**):
 *   งานเฟส `reach` ผลิตของอย่างเดียวคือ **"คนที่จำชื่อเราได้"**
 *   ถ้าคนที่จำได้ไปค้นชื่อแล้วเจอองค์กรอื่นที่ชื่อคล้ายกัน ⇒ แรงที่ลงไปหายที่ปลายทาง
 *   และ `growthPdca`/`stageFit` มองไม่เห็นเลย เพราะทั้งคู่รับแต่ตัวเลขฝั่งเว็บ
 *
 * ⚠️ **ห้ามอ่านว่าเป็นความสูญเสียที่วัดแล้ว** — `measurable:false` แปลว่า
 *   เราวัดขนาดของมันไม่ได้ (อันดับคำค้นแบรนด์ + ส่วนแบ่งการค้นหา = ตรวจไม่ได้)
 *   ⇒ นี่คือ **ความเสี่ยงที่ยังไม่ได้วัด** ไม่ใช่ตัวเลขที่พิสูจน์แล้ว
 *
 * ⚠️ และเป็น **คำเตือน ไม่ใช่ด่านกั้น** — งานพิสูจน์ (ปล่อยคอนเทนต์) ห้ามถูกกั้น
 *   (`REQUIRED_BY_INTENT.validate = []` ของ founderMindset) · การซ่อมสัญญาณ entity
 *   ใช้เวลาไม่กี่นาที และทำคู่ขนานไปกับงานคอนเทนต์ได้
 */
export interface ReachLeakNote {
  level: 'warn';
  /** วัดขนาดของรอยรั่วได้หรือยัง — วันนี้ยัง `false` */
  measurable: boolean;
  /** 🔴 ต้องเป็น false เสมอ — ฟังก์ชันนี้ห้ามกั้นงานพิสูจน์ */
  blocks: false;
  text: string;
}

export function reachLeakNote(inp: BrandVisibilityInput = {}): ReachLeakNote | null {
  const ec = entityConsistency();
  if (ec.missing === 0) return null; // สัญญาณครบแล้ว — ไม่มีอะไรต้องเตือน
  const measurable = inp.brandedRank != null && inp.shareOfSearch != null;
  const sizeNote = measurable
    ? `วัดขนาดได้แล้วจากอันดับคำค้นแบรนด์และส่วนแบ่งการค้นหา — ดูตัวเลขในแผง "เครื่องมือค้นหาจำแบรนด์ถูกตัวหรือยัง"`
    : '🔴 และตอนนี้ **วัดไม่ได้ว่ากี่คน** (อันดับคำค้นแบรนด์ + ส่วนแบ่งการค้นหา = ตรวจไม่ได้) '
      + '⇒ อ่านเป็น **ความเสี่ยงที่ยังไม่ได้วัด** ห้ามอ่านเป็นความสูญเสียที่พิสูจน์แล้ว';
  return {
    level: 'warn',
    measurable,
    blocks: false,
    text:
      `งานเฟส reach ผลิตของอย่างเดียวคือ "คนที่จำชื่อเราได้" — แต่สัญญาณ entity ของเรายังขาด ${ec.missing} ` +
      `จาก ${ec.total} ช่องทาง ⇒ คนที่จำชื่อได้แล้วไปค้น อาจไปเจอองค์กรอื่นที่ชื่อคล้ายกันแทน · ${sizeNote} · ` +
      'ซ่อมได้ในไม่กี่นาทีและ**ไม่ต้องหยุดงานคอนเทนต์** — ทำคู่ขนานกันได้',
  };
}

/** ป้าย "ความสับสนของ entity" ที่เจ้าของขอไว้ (Entity Confusion Index)
 *
 * 🔴 **เป็นค่าที่ derive มา ไม่ใช่ตัวชี้วัดแยก** — ความสับสนคือด้านกลับของ
 *   "ผลค้นหาชื่อแบรนด์เป็นของเรากี่ส่วน" ⇒ ถ้าเก็บเป็นอีกช่องให้กรอกเอง
 *   จะกลายเป็นการนับเรื่องเดียวกันสองครั้ง แล้วคะแนนรวมจะเอียงโดยไม่มีใครรู้
 *
 * 🔴 `null` = ตรวจไม่ได้ ≠ "ไม่สับสน" — ต้องคืน 'ตรวจไม่ได้' ตรง ๆ
 */
export type ConfusionLabel = 'ตรวจไม่ได้' | 'HIGH' | 'MEDIUM' | 'LOW';

export function entityConfusionLabel(inp: BrandVisibilityInput = {}): ConfusionLabel {
  const owned = inp.ownedSerpCoverage ?? null;
  if (owned === null) return 'ตรวจไม่ได้';
  if (owned >= BRAND_TARGETS.ownedSerpCoverage.target) return 'LOW';
  if (owned >= 0.4) return 'MEDIUM';
  return 'HIGH';
}
