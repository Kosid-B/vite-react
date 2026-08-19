import type { LandingAgg, FunnelCell } from './landingFunnel';
import { SHORT_LINKS, SOURCE_PRESETS } from './shortLinks';

/* contentPerformance — ตอบคำถามเดียวที่การตลาดต้องตอบให้ได้:
 * **"คอนเทนต์ชิ้นไหนพาคนมา และคนจากชิ้นไหนกด CTA"**
 *
 * ทำไมเพิ่งมี (ตรวจ 19 ส.ค. 2569): เรามีเอกสารการตลาด 55 ชิ้น + ชุดพร้อมโพสต์ 6 ชุด
 * และติดแท็กลิงก์ละเอียดมาก (`?s=yt&c=6a` → utm_source/campaign/content)
 * แต่ `landing_funnel` เก็บแค่ `ref_kind = 'social'` แล้วทิ้งที่เหลือ
 * ⇒ ปล่อยคอนเทนต์ไปเท่าไรก็ยังตอบไม่ได้ว่าชิ้นไหนได้ผล = ลงแรงแล้วไม่ได้เรียนรู้
 *
 * ทุกฟังก์ชัน pure — เทสต์ได้โดยไม่ต้องมี DB
 */

export interface ContentRow {
  /** ค่าดิบจาก utm */
  key: string;
  /** ชื่อที่คนอ่านรู้เรื่อง */
  label: string;
  total: number;
  cta: number;
  signup: number;
  /** % ของคนจากชิ้นนี้ที่กด CTA — ตัววัดคุณภาพของทราฟฟิก ไม่ใช่ปริมาณ */
  ctaPct: number;
}

/** ผู้เข้าชมขั้นต่ำต่อชิ้น ถึงจะเทียบ ctaPct กันได้ (ต่ำกว่านี้ = คนเดียวขยับหลายสิบ %) */
export const MIN_PER_CONTENT = 20;

const UNKNOWN = '(ไม่ระบุ)';

/** utm_campaign มาจาก SHORT_LINKS[].campaign → แปลงกลับเป็นลิงก์สั้นที่คนจำได้ */
const CAMPAIGN_TO_LINK: Record<string, string> = Object.entries(SHORT_LINKS)
  .reduce((acc, [path, link]) => {
    // เก็บคีย์ภาษาไทยไว้ก่อน (จำง่ายกว่า) — ถ้ายังไม่มีค่อยใช้ตัวอังกฤษ
    if (!acc[link.campaign] || /[ก-๙]/.test(path)) acc[link.campaign] = path;
    return acc;
  }, {} as Record<string, string>);

/** ตัวย่อแพลตฟอร์ม (?s=) → ชื่อช่องทางที่อ่านรู้เรื่อง */
const SOURCE_LABEL: Record<string, string> = Object.values(SOURCE_PRESETS)
  .reduce((acc, p) => { acc[p.source] = p.source; return acc; }, {} as Record<string, string>);

function rowsFrom(by: Record<string, FunnelCell> | undefined, label: (k: string) => string): ContentRow[] {
  return Object.entries(by ?? {})
    .map(([key, c]) => ({
      key, label: label(key),
      total: c.total, cta: c.cta, signup: c.signup,
      ctaPct: c.total > 0 ? Math.round((c.cta / c.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/** แพลตฟอร์มไหนพาคนมา (youtube/tiktok/facebook/…) */
export function bySource(agg: LandingAgg | null): ContentRow[] {
  return rowsFrom(agg?.by_utm_source, (k) => (k === UNKNOWN ? 'ไม่ได้ติดแท็ก' : SOURCE_LABEL[k] ?? k));
}

/** หัวข้อ/บทความไหนพาคนมา — แปลง campaign กลับเป็นลิงก์สั้นที่จำได้ */
export function byCampaign(agg: LandingAgg | null): ContentRow[] {
  return rowsFrom(agg?.by_campaign, (k) => (k === UNKNOWN ? 'ไม่ได้ติดแท็ก' : CAMPAIGN_TO_LINK[k] ?? k));
}

/** ชิ้นงานย่อย (c=) — แยกคลิปต่อคลิปในหัวข้อเดียวกัน */
export function byContent(agg: LandingAgg | null): ContentRow[] {
  return rowsFrom(agg?.by_content, (k) => (k === UNKNOWN ? 'ไม่ได้ระบุชิ้นงาน' : k));
}

/**
 * สัดส่วนคนที่ "ไม่ได้ติดแท็ก" — ตัวเลขสุขภาพของการตลาดเราเอง
 * สูง = เราปล่อยคอนเทนต์โดยไม่ติดแท็ก หรือคนมาทางที่เราไม่ได้วางไว้
 * ⇒ ยิ่งสูง ยิ่งตอบไม่ได้ว่าอะไรได้ผล
 */
export function untaggedPct(agg: LandingAgg | null): number {
  const total = agg?.total ?? 0;
  if (total === 0) return 0;
  // ⚠️ นับจาก "คนที่ติดแท็กจริง" แล้วลบออก — ไม่ใช่อ่านช่อง UNKNOWN ตรง ๆ
  //    บั๊กเดิม (พบ 19 ส.ค. 2569): ถ้า by_utm_source ไม่มีมาเลย (สคีมาเก่า/ยังไม่มีใครติดแท็ก)
  //    ช่อง UNKNOWN จะไม่มี → `?? 0` ทำให้คืน "ไม่ติดแท็ก 0%" = อ่านว่า "ติดแท็กครบทุกคน"
  //    ทั้งที่ความจริงคือ **ไม่มีใครติดแท็กเลย** — คีย์ที่หายกลายเป็นข่าวดีปลอม
  //    (บั๊กพันธุ์เดียวกับ migration 0057 ที่ทำ engaged/bounce หาย แล้วโชว์ 0)
  const buckets = agg?.by_utm_source ?? {};
  let tagged = 0;
  for (const [k, v] of Object.entries(buckets)) {
    if (k === UNKNOWN) continue;
    tagged += v?.total ?? 0;
  }
  return Math.round(((total - Math.min(tagged, total)) / total) * 100);
}

/** ข้อความบอกสถานะแบบตรงไปตรงมา — ห้ามชวนให้อ่านตัวเลขที่ยังเชื่อไม่ได้ */
export function contentVerdict(agg: LandingAgg | null): { ready: boolean; message: string } {
  const rows = byCampaign(agg).filter((r) => r.key !== UNKNOWN);
  const untag = untaggedPct(agg);
  if (rows.length === 0) {
    return { ready: false, message: `ยังไม่มีใครมาจากลิงก์ที่ติดแท็กเลย — ${untag}% ของผู้เข้าชมมาแบบไม่รู้ที่มา` };
  }
  const biggest = Math.max(...rows.map((r) => r.total));
  if (biggest < MIN_PER_CONTENT) {
    return {
      ready: false,
      message: `ชิ้นที่มีคนมากสุดยังมีแค่ ${biggest} คน (ต้องการ ${MIN_PER_CONTENT}/ชิ้น) — เทียบว่าชิ้นไหนดีกว่ายังไม่ได้`,
    };
  }
  const best = rows.filter((r) => r.total >= MIN_PER_CONTENT).sort((a, b) => b.ctaPct - a.ctaPct)[0];
  return { ready: true, message: `ชิ้นที่คนกด CTA มากที่สุดคือ ${best.label} (${best.ctaPct}% จาก ${best.total} คน)` };
}
