/* growthAnalysis — แปลงข้อมูลพฤติกรรม first-party เป็น "บทวิเคราะห์ที่เชื่อได้" ให้แอดมิน
 *
 * ทำไมต้องมีชั้นนี้ ไม่ส่ง JSON ดิบให้ AI ตรง ๆ:
 *   AI จะหาเรื่องสรุปให้เสมอ แม้ข้อมูลมี 3 คน — และคำสรุปที่ฟังดูดีจากกลุ่มตัวอย่าง 3 คน
 *   อันตรายกว่าไม่มีคำสรุปเลย เพราะมันจะถูกเอาไปตัดสินใจจริง
 *   (เคยพลาดมาแล้ว: สรุป "hero drop 98%" จากผู้เข้าชม 60 คน — LESSONS-LEDGER ข้อ 1)
 *
 * ชั้นนี้จึงตัดสิน "อะไรพอเชื่อได้" ด้วยเลขคณิตก่อน แล้วค่อยให้ AI อธิบาย
 * โดยส่งไปพร้อมข้อห้ามที่ชัดเจน และรายการที่ห้ามสรุป
 *
 * PDPA: ทุกอย่างในไฟล์นี้เป็นตัวเลขรวม ไม่มี PII ไม่มี session id รายคน
 *
 * pure ทั้งไฟล์
 */

import { MIN_SAMPLE, type LandingAgg } from './landingFunnel';
import { brandBriefBlock } from './brandBrief';

/* ── ความสนใจรายส่วนของหน้า ─────────────────────────────────────────── */

export interface SectionStat {
  key: string;
  /** คนที่เห็นส่วนนี้อย่างน้อย 1 วินาที */
  viewers: number;
  /** วินาทีรวมของทุกคน */
  seconds: number;
  /** คนที่เห็นส่วนนี้แล้วสมัคร */
  signups: number;
  /** วินาทีเฉลี่ยต่อคน — ตัวชี้ "ความสนใจ" ที่แท้จริง */
  avgSeconds: number;
}

export type SectionsRaw = Record<string, { viewers?: number; seconds?: number; signups?: number }>;

/** ชื่อส่วนที่คนอ่านเข้าใจ — คีย์ในฐานข้อมูลเป็นภาษาอังกฤษสั้นเพื่อประหยัดที่ */
export const SECTION_LABEL: Record<string, string> = {
  hero: 'พาดหัวบนสุด',
  positioning: 'เราคืออะไร (จุดยืน)',
  quickcheck: 'ตรวจสินค้าเร็ว',
  roadmap: 'แผน 15 วัน',
  why_not_chatgpt: 'ต่างจาก ChatGPT ยังไง',
  try_ai: 'ลอง AI จริงก่อนสมัคร',
  credibility_bar: 'แถบความน่าเชื่อถือ',
  consultant_proof: 'เบื้องหลังคือที่ปรึกษาจริง',
  testimonials: 'เสียงจากผู้ใช้',
  how_it_works: 'เริ่มต้นใน 3 ขั้นตอน',
  features: 'สิ่งที่ธุรกิจได้',
  compare: 'ทำไมต้องเรา (ตารางเทียบ)',
  team: 'ทีม AI',
  self_serve: 'เริ่มเองในแอป',
  outcomes: 'ผลลัพธ์ที่จะได้',
  case_studies: 'เคสธุรกิจระดับโลก',
  trust: 'ความปลอดภัยและการควบคุม',
  pricing: 'แพ็กเกจและราคา',
  final_cta: 'ปุ่มปิดท้าย',
  returning: 'ทักกลับคนที่เคยกรอก',
};

export function sectionLabel(key: string): string {
  return SECTION_LABEL[key] ?? key;
}

export function sectionStats(raw: SectionsRaw | null | undefined): SectionStat[] {
  if (!raw) return [];
  return Object.entries(raw)
    .map(([key, v]) => {
      const viewers = Math.max(0, v?.viewers ?? 0);
      const seconds = Math.max(0, v?.seconds ?? 0);
      return {
        key,
        viewers,
        seconds,
        signups: Math.max(0, v?.signups ?? 0),
        avgSeconds: viewers > 0 ? Math.round((seconds / viewers) * 10) / 10 : 0,
      };
    })
    .sort((a, b) => b.avgSeconds - a.avgSeconds || b.viewers - a.viewers);
}

/** ต้องมีคนเห็นส่วนนั้นกี่คน ถึงจะจัดอันดับความสนใจได้
 *  ต่ำกว่านี้ = ความต่างเป็นเรื่องบังเอิญได้ง่ายเกินไป */
export const MIN_SECTION_VIEWERS = 30;

export function sectionsTrustworthy(stats: readonly SectionStat[]): boolean {
  return stats.length > 0 && stats.every(s => s.viewers >= MIN_SECTION_VIEWERS);
}

/* ── ผล A/B ที่ "พอเชื่อได้" ────────────────────────────────────────── */

export interface AbArm { variant: string; total: number; cta: number; signup: number; signupPct: number }
export interface AbResult {
  id: string;
  label: string;
  arms: AbArm[];
  /** เชื่อผลได้หรือยัง — ทุกกลุ่มต้องมีคนพอ */
  ready: boolean;
  /** ข้อความบอกสถานะแบบตรงไปตรงมา */
  note: string;
}

/** ต่อกลุ่มต้องมีกี่คน ถึงจะเทียบกันได้ (ค่าเดียวกับ landingAb.MIN_SAMPLE_PER_ARM) */
export const MIN_ARM = 30;

type ByAb = Record<string, { total?: number; cta?: number; signup?: number }> | null | undefined;

export function abResult(id: string, label: string, by: ByAb): AbResult {
  const arms: AbArm[] = Object.entries(by ?? {})
    .filter(([v]) => v !== 'unknown')
    .map(([variant, c]) => {
      const total = Math.max(0, c?.total ?? 0);
      const signup = Math.max(0, c?.signup ?? 0);
      return {
        variant,
        total,
        cta: Math.max(0, c?.cta ?? 0),
        signup,
        signupPct: total > 0 ? Math.round((signup / total) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  if (arms.length < 2) {
    return { id, label, arms, ready: false, note: 'ยังมีกลุ่มเดียว — ยังเทียบอะไรไม่ได้' };
  }
  const smallest = Math.min(...arms.map(a => a.total));
  if (smallest < MIN_ARM) {
    return {
      id, label, arms, ready: false,
      note: `กลุ่มเล็กสุดมี ${smallest} คน (ต้องการอย่างน้อย ${MIN_ARM} ต่อกลุ่ม) — ยังสรุปผู้ชนะไม่ได้`,
    };
  }
  const totalSignup = arms.reduce((n, a) => n + a.signup, 0);
  if (totalSignup === 0) {
    return { id, label, arms, ready: false, note: 'ยังไม่มีใครสมัครเลยทั้งสองกลุ่ม — วัดผลลัพธ์ปลายทางไม่ได้' };
  }
  return { id, label, arms, ready: true, note: 'จำนวนคนพอเทียบได้แล้ว' };
}

/* ── บทสรุปที่ส่งให้ AI ─────────────────────────────────────────────── */

export interface GrowthBrief {
  /** ข้อเท็จจริงที่คำนวณแล้ว — AI ห้ามคำนวณเอง */
  facts: string[];
  /** สิ่งที่ "ห้ามสรุป" เพราะข้อมูลไม่พอ — ส่งไปให้ AI รู้ตัว */
  cannotConclude: string[];
  /** ข้อมูลพอให้วิเคราะห์ได้ไหม */
  enough: boolean;
}

export function buildGrowthBrief(
  agg: LandingAgg | null,
  sections: readonly SectionStat[],
  abs: readonly AbResult[],
): GrowthBrief {
  const facts: string[] = [];
  const cannot: string[] = [];
  const total = agg?.total ?? 0;

  facts.push(`ช่วงเวลา ${agg?.days ?? 0} วัน · ผู้เข้าชมหน้า Landing ${total} คน`);
  if (agg) {
    facts.push(`กดปุ่มหลัก ${agg.cta} คน · เริ่มสมัคร ${agg.signup} คน`);
    facts.push(`เลื่อนเฉลี่ย ${agg.avg_scroll}% · หยุดดูเฉลี่ย ${agg.avg_dwell} วินาที`);
  }

  if (total < MIN_SAMPLE) {
    cannot.push(`ผู้เข้าชมรวม ${total} คน ยังไม่ถึง ${MIN_SAMPLE} — ห้ามสรุปอัตราการสมัครหรือเปรียบเทียบกลุ่มใด ๆ`);
  }

  const okSections = sections.filter(s => s.viewers >= MIN_SECTION_VIEWERS);
  if (okSections.length) {
    for (const s of okSections.slice(0, 5)) {
      facts.push(`ส่วน "${sectionLabel(s.key)}": ${s.viewers} คนเห็น · หยุดดูเฉลี่ย ${s.avgSeconds} วินาที`);
    }
  }
  const thin = sections.filter(s => s.viewers < MIN_SECTION_VIEWERS);
  if (thin.length) {
    cannot.push(
      `${thin.length} ส่วนมีคนเห็นน้อยกว่า ${MIN_SECTION_VIEWERS} คน (${thin.map(s => sectionLabel(s.key)).join(', ')}) — ห้ามจัดอันดับความสนใจของส่วนเหล่านี้`,
    );
  }

  for (const ab of abs) {
    if (ab.ready) {
      facts.push(
        `การทดลอง "${ab.label}": ` +
        ab.arms.map(a => `${a.variant} ${a.signup}/${a.total} คน (${a.signupPct}%)`).join(' · '),
      );
    } else {
      cannot.push(`การทดลอง "${ab.label}" — ${ab.note} · ห้ามบอกว่ากลุ่มไหนชนะ`);
    }
  }

  return { facts, cannotConclude: cannot, enough: total >= MIN_SAMPLE };
}

/** พรอมป์ตสำหรับ AI — ข้อห้ามอยู่ในพรอมป์ตเอง ไม่ใช่หวังให้ AI มีมารยาทเอง
 *  แปะ Brand Brief ไว้บนสุด (brandBrief.ts) ⇒ AI รู้ว่ากำลังพูดแทนใคร กับใคร และห้ามอ้างอะไร
 *  โดยเฉพาะ HONEST_STATE ที่กันไม่ให้ AI เขียนอ้างจำนวนลูกค้าที่เรายังไม่มี */
export function growthPrompt(brief: GrowthBrief): string {
  return [
    brandBriefBlock({ forPublicCopy: true }),
    '',
    'คุณคือนักวิเคราะห์การเติบโตของ CEO AI Thailand กำลังอ่านข้อมูลพฤติกรรมผู้เยี่ยมชมของเราเอง',
    '',
    '## ข้อเท็จจริงที่คำนวณมาแล้ว (ห้ามคำนวณใหม่ ห้ามเพิ่มตัวเลขที่ไม่มีในนี้)',
    ...brief.facts.map(f => `- ${f}`),
    '',
    '## สิ่งที่ข้อมูลยังไม่พอจะสรุป (ห้ามสรุปเด็ดขาด)',
    ...(brief.cannotConclude.length ? brief.cannotConclude.map(c => `- ${c}`) : ['- (ไม่มี)']),
    '',
    '## กติกา',
    '1. ห้ามสร้างตัวเลขใหม่ ห้ามอ้างค่าเฉลี่ยอุตสาหกรรมหรือเกณฑ์มาตรฐานใด ๆ ที่ไม่ได้ให้มา',
    '2. ถ้าข้อมูลไม่พอ ให้พูดตรง ๆ ว่า "ยังสรุปไม่ได้ เพราะขาด X" แล้วบอกว่าต้องเก็บอะไรเพิ่ม',
    '3. ห้ามแนะนำกลยุทธ์ที่ต้องรอให้ธุรกิจโตก่อน — จุดยืนเราคือทำได้ตั้งแต่ปีแรก',
    '4. ห้ามเสนอ dark pattern (นับถอยหลังปลอม จำนวนจำกัดปลอม รีวิวปลอม)',
    '5. ตอบภาษาไทย สั้น ตรง ไม่เกริ่น',
    '',
    '## สิ่งที่ต้องตอบ',
    'ก) สิ่งที่ข้อมูลบอกได้จริงตอนนี้ (ไม่เกิน 3 ข้อ)',
    'ข) สมมติฐานที่น่าทดสอบต่อ พร้อมบอกว่าจะรู้ผลเมื่อไหร่ (ต้องกี่คน)',
    'ค) สิ่งเดียวที่ควรลงมือทำก่อนสัปดาห์นี้ และเหตุผลจากตัวเลขข้างบน',
  ].join('\n');
}
