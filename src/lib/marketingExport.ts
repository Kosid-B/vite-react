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

import { SEG_CODE_MAP, type AudienceLayer } from './brandSync';
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
  const unmapped = segments.filter((s) => s.marketingCode === null && s.seg !== 'default').map((s) => s.seg);

  const blindSpots: string[] = [
    `seg=default ${defPct}% ของทั้งหมด — ตัวเลขนี้ **วัดการติดแท็กของเรา ไม่ได้วัดตลาด** (ledger #43/#73) ห้ามอ่านว่า "คนที่เข้ามาไม่มีกลุ่ม"`,
    'ข้อมูลนี้เห็นเฉพาะคนที่มาถึงหน้า `/` เท่านั้น — คนที่อ่านบทความหรือหน้า `/start` ไม่ถูกบันทึกที่นี่ (ledger #74)',
    'ไม่มีข้อมูลฝั่งแพลตฟอร์ม (ยอดเข้าถึง FB/YT) ⇒ คำนวณ "สะพาน" จากข้อมูลชุดนี้อย่างเดียวไม่ได้',
  ];
  if (unmapped.length) {
    blindSpots.push(`รหัสที่ทะเบียนของ Marketing OS ยังไม่มี: ${unmapped.join(', ')} ⇒ ถ้า join ด้วยทะเบียนเดิมจะทิ้งแถวเหล่านี้เงียบ ๆ`);
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
    blindSpots,
  };
}
