import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import {
  OS_SAFE_EVENTS, OS_BUSINESS_EVENTS, EVENT_MAP, NOT_SENT_YET,
  MAX_VALUE_LEN, safeProps, osEventFor, buildOsEvent, SENT_DIRECT,
} from '../marketingOs';

/* ══════════════════════════════════════════════════════════════════════
 * สะพานไป Marketing OS (ท่า A) — เจ้าของอนุมัติให้ข้ามเส้นแบ่ง 20 พ.ย. 2569
 *
 * ด่านนี้เฝ้า 3 อย่าง:
 *   ① ส่งแล้วปลายทางรับจริงไหม (ชื่อ event ต้องอยู่ใน 10 ตัวที่ฟังก์ชันยอมรับ)
 *   ② ไม่พา PII ออกไป (เรากันที่ต้นทาง ไม่ฝากความปลอดภัยไว้กับฟังก์ชันที่เราแก้ไม่ได้)
 *   ③ โค้ดถูกเรียกใช้จริง ไม่ใช่เขียนไว้ (shipped-not-written ชั้น ①)
 * ══════════════════════════════════════════════════════════════════════ */

const root = resolve(__dirname, '../../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');
/** ตัดคอมเมนต์ก่อนนับคำ — ไม่งั้นคอมเมนต์ที่เอ่ยชื่อทำให้ผ่านฟรี (ledger #84) */
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** ไล่ไฟล์ .ts/.tsx ทั้ง src/ (ไม่นับเทสต์) */
function srcFiles(dir = join(root, 'src'), out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== '__tests__') srcFiles(p, out); }
    else if (/\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}

describe('① ชื่อ event ต้องเป็นตัวที่ marketing-track ยอมรับ', () => {
  it('รายการ safe event ถูกล็อกไว้ 10 ตัว (ตรงกับ SAFE_BROWSER_EVENTS ที่อ่านจากฟังก์ชันที่ deploy อยู่)', () => {
    expect([...OS_SAFE_EVENTS].sort()).toEqual([
      'assessment_complete', 'assessment_start', 'calculator_complete', 'calculator_start',
      'content_view', 'cta_click', 'cta_view', 'landing_view', 'page_view', 'signup_start',
    ]);
  });

  it('🔴 ทุกค่าใน EVENT_MAP ต้องอยู่ในรายการ safe — ไม่งั้นปลายทางคืน 400 event_not_allowed', () => {
    const bad = Object.entries(EVENT_MAP).filter(([, v]) => !OS_SAFE_EVENTS.includes(v));
    expect(bad, `แมปไป event ที่ปลายทางไม่รับ: ${bad.map(([k, v]) => `${k}→${v}`).join(', ')}`).toEqual([]);
  });

  it('🔴 event ขั้น business ห้ามอยู่ในสายเบราว์เซอร์เลย (เบราว์เซอร์อ้าง "ซื้อสำเร็จ" เองไม่ได้)', () => {
    for (const b of OS_BUSINESS_EVENTS) {
      expect(OS_SAFE_EVENTS as readonly string[], `${b} ต้องไม่อยู่ในรายการ safe`).not.toContain(b);
      expect(Object.values(EVENT_MAP) as string[], `${b} ต้องไม่ถูกแมปจาก GA`).not.toContain(b);
    }
    expect(OS_BUSINESS_EVENTS.length, 'OS นิยาม business event ไว้ 7 ตัว').toBe(7);
  });

  it('safe event ทุกตัวต้อง "ถูกส่ง" หรือ "มีเหตุผลว่าทำไมยังไม่ส่ง" — ห้ามเงียบ', () => {
    const sent = new Set<string>([...Object.values(EVENT_MAP), ...Object.keys(SENT_DIRECT)]);
    const unexplained = OS_SAFE_EVENTS.filter((e) => !sent.has(e) && !NOT_SENT_YET[e]);
    expect(unexplained, `ไม่ส่งและไม่บอกเหตุผล: ${unexplained.join(', ')}`).toEqual([]);
  });

  it('เหตุผลใน NOT_SENT_YET ต้องเป็นของจริง ไม่ใช่คำคลุมเครือ', () => {
    for (const [k, why] of Object.entries(NOT_SENT_YET)) {
      expect(OS_SAFE_EVENTS as readonly string[], `${k} ไม่ใช่ safe event`).toContain(k);
      expect(why.length, `${k}: เหตุผลสั้นเกินไป`).toBeGreaterThan(25);
      expect(why, `${k}: ห้ามเลื่อนด้วยคำคลุมเครือ`).not.toMatch(/ทีหลัง|ไว้ก่อน|ภายหลัง|เมื่อโตกว่านี้/);
    }
  });
});

describe('② ห้ามพา PII ออกไป', () => {
  it.each(['email', 'user_email', 'phone', 'mobile', 'national_id', 'full_name', 'name', 'first_name', 'address', 'password'])(
    'คีย์ %s ต้องไม่ถูกส่ง',
    (k) => { expect(safeProps({ [k]: 'x' })).toEqual({}); },
  );

  it('🔴 ค่าที่ยาวเกิน = ข้อความอิสระ ⇒ ไม่ส่ง (ชื่อร้าน/เบอร์มักมาทางนี้)', () => {
    expect(safeProps({ note: 'x'.repeat(MAX_VALUE_LEN + 1) })).toEqual({});
    expect(safeProps({ note: 'x'.repeat(MAX_VALUE_LEN) })).toEqual({ note: 'x'.repeat(MAX_VALUE_LEN) });
  });

  it('ค่าปกติยังส่งได้ (ป้ายหมวด/ตัวเลข)', () => {
    expect(safeProps({ biz: 'food', verdict: 'ok', units: 120 })).toEqual({ biz: 'food', verdict: 'ok', units: 120 });
  });

  it('ค่าว่าง/NaN/ชนิดแปลก ถูกทิ้ง', () => {
    expect(safeProps({ a: '', b: '   ', c: Number.NaN })).toEqual({});
  });

  it('🔴 payload ห้ามมีฟิลด์ UUID — เราไม่มีค่าจริง และปลายทางคืน invalid_uuid', () => {
    const p = buildOsEvent({ event: 'cta_click', session: 's-1' }) as unknown as Record<string, unknown>;
    for (const k of ['campaignId', 'contentItemId', 'experimentId', 'variantId', 'audienceSegmentId']) {
      expect(p[k], `${k} ต้องไม่ถูกส่ง`).toBeUndefined();
    }
  });

  it('ใช้ session เดียวกับ landing_funnel ทั้ง anonymousId และ sessionId ⇒ join ข้อมูลสองฝั่งได้', () => {
    const p = buildOsEvent({ event: 'landing_view', session: 'sess-abc' });
    expect(p.anonymousId).toBe('sess-abc');
    expect(p.sessionId).toBe('sess-abc');
  });

  it('utm/seg/path ถูกแปลงชื่อฟิลด์ให้ตรงกับที่ปลายทางรับ', () => {
    const p = buildOsEvent({
      event: 'cta_click', session: 's', seg: 'owner', pagePath: '/', referrer: 'https://x.test',
      utm: { utm_source: 'facebook', utm_medium: 'comment', utm_campaign: 'c1', utm_content: 'v2' },
    });
    expect(p).toMatchObject({
      segmentCode: 'owner', pagePath: '/', referrer: 'https://x.test',
      utmSource: 'facebook', utmMedium: 'comment', utmCampaign: 'c1', utmContent: 'v2',
    });
  });
});

describe('③ โค้ดถูกเรียกใช้จริง ไม่ใช่เขียนไว้', () => {
  it('🔴 analytics.track() ต้องเรียก sendOsEvent จริง (sink ที่ 3)', () => {
    const a = code(read('src/lib/analytics.ts'));
    expect(a, 'ต้อง import').toContain("from './marketingOs'");
    expect(a, 'ต้องเรียก osEventFor ใน track()').toContain('osEventFor(');
    expect(a, 'ต้องเรียก sendOsEvent').toContain('sendOsEvent(');
  });

  it('🔴 ทุกชื่อ GA ใน EVENT_MAP ต้องมี track() ของจริงในโค้ด — ไม่ใช่ชื่อที่เราคิดขึ้น', () => {
    const all = srcFiles().map((p) => readFileSync(p, 'utf8')).join('\n');
    const missing = Object.keys(EVENT_MAP).filter((g) => !all.includes(`track('${g}'`));
    expect(missing, `แมปจาก event ที่ไม่มีใครยิง: ${missing.join(', ')}`).toEqual([]);
  });

  it('ทุกตัวใน SENT_DIRECT ต้องเป็น safe event และต้องถูกส่งจริงในโค้ด', () => {
    const all = srcFiles().map((p) => readFileSync(p, 'utf8')).join('\n');
    for (const e of Object.keys(SENT_DIRECT)) {
      expect(OS_SAFE_EVENTS as readonly string[], `${e} ไม่ใช่ safe event`).toContain(e);
      expect(all, `ประกาศว่าส่งตรง แต่ไม่มีใครเรียก sendOsEvent('${e}')`).toContain(`sendOsEvent('${e}'`);
    }
  });

  it('Landing ต้องส่ง landing_view ครั้งเดียวต่อการโหลดหน้า', () => {
    const h = code(read('src/hooks/useLandingTrace.ts'));
    expect(h).toMatch(/sendOsEvent\(\s*'landing_view'/);
    expect(h, 'ต้องกันซ้ำ (StrictMode รัน effect สองรอบ)').toMatch(/sendOsEvent\([^)]*true\s*\)/s);
  });

  it('🔴 calculator_start ต้องมีจริง — ไม่งั้น completion_rate ของ OS ไม่มีตัวหาร', () => {
    expect(code(read('src/components/ProductQuickCheck.tsx'))).toContain("track('quickcheck_started'");
    expect(osEventFor('quickcheck_started')).toBe('calculator_start');
    expect(osEventFor('quickcheck_submitted')).toBe('calculator_complete');
  });

  it('event ที่ไม่ได้แมป ต้องไม่ถูกส่ง', () => {
    expect(osEventFor('theme_changed')).toBeNull();
    expect(osEventFor('landing_scroll_depth')).toBeNull();
  });
});

describe('🧱 เส้นแบ่ง: ส่งผ่าน edge function เท่านั้น', () => {
  const src = read('src/lib/marketingOs.ts');

  it('ปลายทางคือ edge function ที่เขามีอยู่ ไม่ใช่ตารางของเขา', () => {
    // ชื่อปลายทางอยู่ในไฟล์สะพานไฟล์เดียว (ไม่ใช่ใน config — `ownershipBoundary` บังคับ)
    expect(code(src), 'ไฟล์นี้ต้องถือชื่อ edge function เอง').toMatch(/OS_FN\s*=\s*'marketing-track'/);
    expect(code(src), 'ต้องยิงไป /functions/v1/<fn>').toContain('/functions/v1/${OS_FN}');
  });

  it('🔴 ห้ามแตะตาราง marketing_* โดยตรง (กฎเดิมที่ยังอยู่)', () => {
    const c = code(src);
    expect(c).not.toMatch(/\.from\(\s*['"`]marketing_/);
    expect(c).not.toMatch(/rpc\(\s*['"`]marketing_/);
  });

  it('มี kill switch และปิดเองใน local/preview', () => {
    const c = code(src);
    expect(c, 'ต้องเช็ก flag').toContain('MARKETING_OS.live');
    expect(c, 'ต้องข้ามเมื่อไม่มี Supabase (local/preview)').toContain('isSupabaseEnabled');
    expect(c, 'ต้องข้ามเมื่อไม่มี URL').toContain('VITE_SUPABASE_URL');
  });

  it('🔴 ล้มเหลวต้องเงียบ — ห้ามทำหน้าเว็บพังเพราะระบบอื่น', () => {
    const c = code(src);
    expect((c.match(/catch\b/g) ?? []).length, 'ต้องห่อ try/catch ทั้งขาส่งและขาเตรียม').toBeGreaterThanOrEqual(2);
    expect(c, 'ต้องไม่ await แบบบล็อกผู้เรียก').toContain('void deliver(');
  });

  it('โมดูลนี้ต้อง pure ที่ระดับ import — ของหนักโหลดตอนส่งเท่านั้น', () => {
    const topImports = (code(src).match(/^import .*$/gm) ?? []).join('\n');
    expect(topImports, 'ห้าม import supabase/landingFunnel ที่หัวไฟล์ (กันวงจร + บันเดิลบวม)')
      .not.toMatch(/supabase|landingFunnel|config/);
  });
});
