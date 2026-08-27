/* searchOwnership — "ยึดพื้นที่ค้นหาตามลำดับ ห้ามข้ามขั้น"
 *
 * เจ้าของตัดสิน 27 ส.ค. 2569 หลังเห็น Google AI Overview แตกคำ `ceoaithailand`:
 *   **"PROCEED WITH CONTROLS"** — เดินหน้า แต่ต้องมีตัวควบคุม
 *   ⇒ ไฟล์นี้คือ "CONTROLS" ในรูปโค้ด · ไม่ใช่บันทึกกลยุทธ์
 *   (ผิดแล้วต้องเหลือ **กลไก** ไม่ใช่คำขอโทษ — skill `growth-mindset`)
 *
 * 🔴 เส้นแบ่งกับไฟล์ข้าง ๆ (ห้ามเขียนซ้ำ):
 *   · `brandEntity`     = ชื่อ canonical + โปรไฟล์ + schema        (เราคือใคร)
 *   · `brandVisibility` = วัดว่าเครื่องจำเราถูกหรือยัง               (ถึงไหนแล้ว)
 *   · ไฟล์นี้           = ลำดับการยึดพื้นที่ + ด่านกันความเสี่ยง      (ทำอะไรได้ตอนนี้)
 *
 * ⚠️ ความเสี่ยงที่เจ้าของระบุเอง และไฟล์นี้ต้องกันให้ได้:
 *   Risk 1 Brand Confusion · Risk 3 คนเข้าเยอะแต่ไม่ตรงกลุ่ม
 *   Risk 4 คอนเทนต์เปรียบเทียบกลายเป็นปัญหาแบรนด์ · Risk 5 โรงงานคอนเทนต์กลายเป็นสแปม
 *
 * pure ทั้งไฟล์ · ไม่แตะฐานข้อมูล · ไม่มี migration
 */

import { BRAND_NAME } from './brandEntity';
import { MIN_FOR_RATE } from './growthPdca';

/* ══════════════════════════════════════════════════════════════════
 * Risk 1 — Brand Confusion: ชื่อต้องสะกดแบบเดียว
 * ══════════════════════════════════════════════════════════════════ */

export interface ForbiddenNameForm {
  form: string;
  why: string;
  /** บริบทที่ใช้รูปนี้ได้จริง (handle/แฮชแท็ก/URL เว้นวรรคไม่ได้) — ตัวอักษรที่นำหน้า */
  allowedPrefixChars?: readonly string[];
  /** ใช้ได้ถ้าตามด้วยคำเหล่านี้ (กันกรณีเป็นส่วนหนึ่งของชื่อเต็ม) */
  allowedIfFollowedBy?: readonly string[];
}

/** 🔴 รูปชื่อที่เจ้าของสั่งห้ามใช้เป็น "ชื่อแบรนด์" (27 ส.ค. 2569)
 *  เหตุผลร่วม: ใช้หลายรูป = Google อาจสร้างหลาย entity แทนที่จะรวมเป็นตัวเดียว */
export const FORBIDDEN_NAME_FORMS: readonly ForbiddenNameForm[] = [
  {
    form: 'CEOAITHAILAND',
    why: 'ตัวพิมพ์ใหญ่ทั้งหมด — เป็นคนละสตริงกับชื่อ canonical ในสายตาเครื่อง',
  },
  {
    form: 'CEO Thailand AI',
    why: 'สลับลำดับคำ — ดึง entity ไปหา "CEO Thailand" ซึ่งเป็นคนละองค์กร',
  },
  {
    form: 'CEO AI',
    why: 'ตัดคำว่า Thailand ออก — เหลือคำ generic ที่ผูกกับใครก็ได้',
    allowedIfFollowedBy: [' Thailand', ' ไทย'],
  },
  {
    form: 'CEOAIThailand',
    why: 'ไม่มีเว้นวรรค — เป็น alias ได้ แต่ห้ามใช้แทนชื่อหลักในเนื้อความ',
    allowedPrefixChars: ['@', '#', '/'],
  },
];

export interface NameFormIssue {
  form: string;
  why: string;
  /** ตำแหน่งที่เจอ (ตัวอักษรที่เท่าไหร่ของข้อความ) */
  at: number;
  /** บริบทรอบ ๆ ให้คนหาเจอง่าย */
  context: string;
}

/** หา "รูปชื่อที่ห้ามใช้" ในข้อความ **ที่กำลังจะประกาศชื่อออกไปข้างนอก**
 *  (โพสต์ · ชื่อโปรไฟล์ · หัวข้อคลิป · ป้ายชื่อในตาราง)
 *
 *  🔴 **ห้ามเอาไปสแกนโค้ดทั้งรีโป** — ลองแล้วเมื่อ 27 ส.ค. 2569 ได้ผลบวกปลอม 20 จุด
 *     เพราะการเอ่ยถึงสั้น ๆ กลางประโยคไทย ("ให้ CEO AI จัดทีมให้") เป็นภาษาปกติ ไม่ใช่การประกาศชื่อ
 *     ⇒ เส้นแบ่งที่ใช้จริง: **ที่ประกาศชื่อต้องเป็นชื่อเต็ม · การเอ่ยถึงกลางประโยคสั้นได้**
 *     สำหรับพื้นผิวที่ประกาศชื่อให้เครื่องอ่าน ใช้ `declaredNameIssues()` ด้านล่างแทน
 *  🔴 กับดักที่ต้องระวัง: `CEO AI` เป็นส่วนหนึ่งของ `CEO AI Thailand` เสมอ
 *     ⇒ สแกนแบบไม่ดูบริบท จะฟ้องทุกครั้งที่เราสะกดถูก (เทสต์ล็อกกรณีนี้ไว้) */
export function nameFormIssues(text: string): NameFormIssue[] {
  const out: NameFormIssue[] = [];
  for (const rule of FORBIDDEN_NAME_FORMS) {
    let i = text.indexOf(rule.form);
    while (i !== -1) {
      const after = text.slice(i + rule.form.length);
      const before = i > 0 ? text[i - 1] : '';
      const okByFollow = (rule.allowedIfFollowedBy ?? []).some((s) => after.startsWith(s));
      const okByPrefix = (rule.allowedPrefixChars ?? []).includes(before);
      if (!okByFollow && !okByPrefix) {
        out.push({
          form: rule.form,
          why: rule.why,
          at: i,
          context: text.slice(Math.max(0, i - 25), i + rule.form.length + 25).replace(/\s+/g, ' '),
        });
      }
      i = text.indexOf(rule.form, i + 1);
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/** พื้นผิวใน HTML ที่ "ประกาศชื่อ" ให้เครื่องอ่าน — ค่าตรงนี้ต้องเป็นชื่อ canonical เป๊ะ ๆ
 *  ⚠️ `apple-mobile-web-app-title` = ชื่อที่ขึ้นใต้ไอคอนตอนคนบันทึกเว็บลงหน้าจอ iOS
 *     เป็นการประกาศชื่อเต็มรูปแบบ และเป็นจุดที่ลืมง่ายที่สุด (พบว่าเขียนผิดจริง 27 ส.ค. 2569) */
export const NAME_DECLARING_METAS: readonly string[] = [
  'og:site_name', 'apple-mobile-web-app-title', 'application-name',
];

export interface DeclaredNameIssue { where: string; found: string; expected: string; why: string }

/** ตรวจพื้นผิวที่ประกาศชื่อใน HTML — ที่ไหนที่บอกเครื่องว่า "เราชื่ออะไร" ต้องตรงกันหมด */
export function declaredNameIssues(html: string): DeclaredNameIssue[] {
  const out: DeclaredNameIssue[] = [];
  const title = /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim();
  if (title && !title.startsWith(BRAND_NAME)) {
    out.push({
      where: '<title>', found: title, expected: `ขึ้นต้นด้วย "${BRAND_NAME}"`,
      why: 'title คือสิ่งแรกที่เครื่องอ่าน — ขึ้นต้นด้วยชื่ออื่นทำให้ผูก entity ผิดตัว',
    });
  }
  for (const name of NAME_DECLARING_METAS) {
    const re = new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
    const found = re.exec(html)?.[1];
    if (found !== undefined && found.trim() !== BRAND_NAME) {
      out.push({
        where: name, found: found.trim(), expected: BRAND_NAME,
        why: 'จุดนี้ประกาศ "ชื่อของเรา" ตรง ๆ — ใช้ชื่อย่อ/ชื่ออื่นที่นี่ = เครื่องเห็นเราสองตัว',
      });
    }
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════════
 * ชั้นของคำค้น — 4 ชั้นตามที่เจ้าของแบ่ง
 * ══════════════════════════════════════════════════════════════════ */

export type LayerKey = 'brand' | 'category' | 'problem' | 'confusion';

export interface KeywordLayer {
  key: LayerKey;
  label: string;
  examples: readonly string[];
  /** ทำไมชั้นนี้ถึงอยู่ตำแหน่งนี้ */
  why: string;
}

export const KEYWORD_LAYERS: readonly KeywordLayer[] = [
  {
    key: 'brand', label: 'ชื่อแบรนด์',
    examples: [BRAND_NAME, 'ceoaithailand', 'ceo ai thailand'],
    why: 'ปลอมไม่ได้ ซื้อไม่ได้ และเป็นชั้นเดียวที่แพ้ไม่ได้ — คนที่จำชื่อเราได้แล้วต้องเจอเรา',
  },
  {
    key: 'category', label: 'หมวดหมู่',
    examples: ['AI สำหรับ SME ไทย', 'AI Business Operating System', 'AI ช่วยเริ่มธุรกิจ'],
    why: 'พื้นที่ที่มีมูลค่าเชิงพาณิชย์สูงสุด — และยังไม่มีเจ้าของที่ชัดเจนในไทย',
  },
  {
    key: 'problem', label: 'ปัญหา',
    examples: ['เริ่มธุรกิจยังไง', 'หาลูกค้ารายแรก', 'ตั้งราคายังไงไม่ขาดทุน'],
    why: 'ตรงกับกฎเดิมของโปรเจกต์: พาดหัวต้องเป็นปัญหา เพราะคนที่ไม่รู้ว่าตัวเองมีปัญหา ไม่ค้นหา',
  },
  {
    key: 'confusion', label: 'คำที่ปนกันอยู่',
    examples: ['CEO Thailand', 'Digital CEO', 'หลักสูตร CEO'],
    why: 'Google แสดงให้เห็นแล้วว่าผู้ใช้เชื่อมคำเหล่านี้เข้าด้วยกัน — แต่เป็นชั้นที่คนเข้ามาแล้ว "ไม่ตรงกลุ่ม" มากที่สุด',
  },
];

/* ══════════════════════════════════════════════════════════════════
 * 3 Rings — ยึดทีละวง ห้ามข้ามขั้น
 * ══════════════════════════════════════════════════════════════════ */

/** เกณฑ์ที่เจ้าของกำหนดเอง 27 ส.ค. 2569: Ring 1 ถือว่าชนะเมื่อครองผลค้นหาเกิน 70% */
export const RING1_OWNED_SERP_TARGET = 0.7;

export interface Ring {
  n: 1 | 2 | 3;
  label: string;
  layers: readonly LayerKey[];
  /** ตัวเลขที่ต้องถึงก่อนเปิดวงถัดไป — 🔴 ห้ามเขียนว่า "เมื่อโตกว่านี้" */
  unlockNext: string;
  why: string;
}

export const RINGS: readonly Ring[] = [
  {
    n: 1, label: 'ยึดชื่อตัวเอง', layers: ['brand'],
    unlockNext: `ครองผลค้นหาชื่อแบรนด์ ≥ ${Math.round(RING1_OWNED_SERP_TARGET * 100)}% (ownedSerpCoverage)`,
    why: 'แพ้ชั้นนี้ = ทุกบาททุกคลิปที่ทำให้คนจำชื่อเราได้ ไหลไปหาองค์กรอื่น',
  },
  {
    n: 2, label: 'ยึดหมวดหมู่', layers: ['category', 'problem'],
    unlockNext: `คำหมวดหมู่พาคนมาถึงเว็บ ≥ ${MIN_FOR_RATE} คน (ต่ำกว่านี้อ่านเป็นอัตราไม่ได้)`,
    why: 'ที่นี่คือที่ที่เรากำหนดความหมายของหมวดได้เอง ไม่ใช่แค่แข่งชื่อ',
  },
  {
    n: 3, label: 'ดึงคนจากคำข้างเคียง', layers: ['confusion'],
    unlockNext: '— (วงสุดท้าย)',
    why: 'ดึงคนใหม่เข้าหมวด แต่เป็นชั้นที่ "คนเข้าเยอะแต่ไม่ตรงกลุ่ม" ง่ายที่สุด ⇒ ต้องมีของรองรับก่อน',
  },
];

export interface RingVerdict {
  /** วงที่ทำได้ตอนนี้ */
  ring: 1 | 2 | 3;
  /** ชั้นคำค้นที่เปิดให้ทำได้ */
  openLayers: readonly LayerKey[];
  /** ชั้นที่ยังไม่ถึงเวลา */
  lockedLayers: readonly LayerKey[];
  /** เหตุผลหนึ่งประโยค */
  why: string;
  /** 🔴 `true` เมื่อยังตรวจไม่ได้ว่าผ่านวงนี้หรือยัง — fail-closed ไว้ที่วง 1 */
  blind: boolean;
}

/** วงไหนเปิดแล้ว — fail-closed: ตรวจไม่ได้ = อยู่วง 1 เสมอ
 *  (`null` = ตรวจไม่ได้ ≠ 0 · หลักเดียวกับ growthPdca.receiving) */
export function ringVerdict(inp: {
  ownedSerpCoverage?: number | null;
  categoryArrivals?: number | null;
} = {}): RingVerdict {
  const owned = inp.ownedSerpCoverage ?? null;
  const arrivals = inp.categoryArrivals ?? null;
  const all: LayerKey[] = ['brand', 'category', 'problem', 'confusion'];
  const open = (n: 1 | 2 | 3) => RINGS.filter((r) => r.n <= n).flatMap((r) => [...r.layers]);
  const mk = (n: 1 | 2 | 3, why: string, blind: boolean): RingVerdict => {
    const openLayers = open(n);
    return { ring: n, openLayers, lockedLayers: all.filter((l) => !openLayers.includes(l)), why, blind };
  };

  if (owned === null) {
    return mk(1, 'ยังตรวจไม่ได้ว่าเราครองผลค้นหาชื่อตัวเองแค่ไหน ⇒ ถือว่ายังอยู่วง 1 (fail-closed) · ' +
      'ค้นชื่อแบรนด์แล้วนับว่าใน 10 ผลแรก เป็นของเรากี่อัน', true);
  }
  if (owned < RING1_OWNED_SERP_TARGET) {
    return mk(1, `ครองผลค้นหาชื่อตัวเอง ${Math.round(owned * 100)}% · ต้องถึง ` +
      `${Math.round(RING1_OWNED_SERP_TARGET * 100)}% ก่อนไปวง 2`, false);
  }
  if (arrivals === null) {
    return mk(2, 'วง 1 ผ่านแล้ว · ยังตรวจไม่ได้ว่าคำหมวดหมู่พาคนมาถึงเว็บกี่คน ⇒ ยังไม่เปิดวง 3', true);
  }
  if (arrivals < MIN_FOR_RATE) {
    return mk(2, `คำหมวดหมู่พาคนมา ${arrivals} คน · ต้องถึง ${MIN_FOR_RATE} คนก่อนไปวง 3`, false);
  }
  return mk(3, 'วง 1 และ 2 ผ่านแล้ว — ขยายไปคำข้างเคียงได้ แต่ต้องวัด "คนที่ตรงกลุ่ม" ไม่ใช่จำนวนคนเข้า', false);
}

/* ══════════════════════════════════════════════════════════════════
 * Risk 3 — คนเข้าเยอะแต่ไม่ตรงกลุ่ม
 * ══════════════════════════════════════════════════════════════════ */

export type TrafficVerdict = 'win' | 'not-a-win' | 'unknown';

/** เจ้าของเขียนตัวอย่างไว้เอง: *Traffic +200% · Leads +5% แบบนี้ไม่ใช่ชัยชนะ*
 *  🔴 คืน 'unknown' อย่างซื่อสัตย์เมื่อวัดฝั่ง "ตรงกลุ่ม" ไม่ได้ — ห้ามเดาว่าชนะ */
export function trafficVerdict(v: {
  visitorsGrowthPct?: number | null;
  qualifiedGrowthPct?: number | null;
}): { verdict: TrafficVerdict; why: string } {
  const vis = v.visitorsGrowthPct ?? null;
  const qual = v.qualifiedGrowthPct ?? null;
  if (vis === null || qual === null) {
    return {
      verdict: 'unknown',
      why: 'วัด "คนที่ตรงกลุ่ม" ไม่ได้ ⇒ ตัวเลขคนเข้าอย่างเดียวบอกไม่ได้ว่าชนะหรือแพ้ · ' +
        'ห้ามรายงานว่าคนเข้าเพิ่ม = ได้ผล',
    };
  }
  if (vis > 0 && qual <= 0) {
    return { verdict: 'not-a-win', why: `คนเข้า +${vis}% แต่คนที่ตรงกลุ่ม ${qual}% ⇒ ได้คนผิดกลุ่มมาเพิ่ม ไม่ใช่ชัยชนะ` };
  }
  if (qual > 0) return { verdict: 'win', why: `คนที่ตรงกลุ่ม +${qual}% — นี่คือตัวเลขที่นับเป็นผล` };
  return { verdict: 'not-a-win', why: 'ทั้งคนเข้าและคนที่ตรงกลุ่มไม่ได้เพิ่ม' };
}

/* ══════════════════════════════════════════════════════════════════
 * Risk 4 — คอนเทนต์เปรียบเทียบต้องเป็นกลาง
 * ══════════════════════════════════════════════════════════════════ */

/** โครงที่บทความเปรียบเทียบต้องมีครบ (เจ้าของกำหนดรูปแบบเอง) */
export const COMPARISON_REQUIRED: readonly string[] = [
  'วัตถุประสงค์', 'กลุ่มเป้าหมาย', 'รูปแบบบริการ', 'use case',
];

/** ถ้อยคำที่ห้ามใช้ในบทความเปรียบเทียบ — เขียนเชิงตัดสินว่าใครดีกว่า = ความเสี่ยงทั้งแบรนด์และกฎหมาย */
export const COMPARISON_BANNED: readonly string[] = [
  'ดีกว่า', 'แย่กว่า', 'ล้าสมัย', 'เหนือกว่า', 'ด้อยกว่า', 'ไม่คุ้ม', 'หลอก', 'สู้ไม่ได้',
];

export function checkComparison(text: string): { ok: boolean; missing: string[]; banned: string[] } {
  const low = text.toLowerCase();
  const missing = COMPARISON_REQUIRED.filter((s) => !low.includes(s.toLowerCase()));
  const banned = COMPARISON_BANNED.filter((s) => text.includes(s));
  return { ok: missing.length === 0 && banned.length === 0, missing, banned };
}

/* ══════════════════════════════════════════════════════════════════
 * Risk 5 — โรงงานคอนเทนต์ห้ามกลายเป็นโรงงานสแปม
 * ══════════════════════════════════════════════════════════════════ */

/** ลำดับที่ถูก — ห้ามสลับ (สลับแล้วได้ปริมาณ ไม่ได้ของใหม่) */
export const CONTENT_CHAIN: readonly string[] = ['Evidence', 'Unique Insight', 'Useful Content'];

/** ลำดับที่ห้าม — เก็บไว้เพื่อให้เทสต์เทียบได้ว่าไม่ได้เผลอสลับกลับ */
export const CONTENT_ANTI_CHAIN: readonly string[] = ['Keyword', 'AI generate', 'ปริมาณ'];
