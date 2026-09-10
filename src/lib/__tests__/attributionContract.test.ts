import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  pickUtm, utmQuery, appendUtm, mergeUtm, shouldStoreFirstTouch, readFirstTouch,
  utmForwardScript, UTM_FIRST_TOUCH_KEY, UTM_FIRST_TOUCH_MS,
} from '../utmForward';
import { sectionInView } from '../funnelTrace';
import { faqPageHtml, blogPostHtml, sellPageHtml } from '../seoData';
import { calcPageHtml } from '../calcPage';
import { BLOG_POSTS } from '../blogData';

const src = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');
const ORIGIN = 'https://ceoaithailand.org';

/* ══════════════════════════════════════════════════════════════════════
 * สัญญาการวัด "ที่มาของคน" — ทั้งสองข้อนี้พังเงียบมาตลอดโดยที่ tsc/vitest/CI ไม่มีทางจับได้
 *   ① utm ตายที่ปุ่ม CTA ของหน้าที่ server เรนเดอร์  (75 แถวใน production มี utm 1 แถว)
 *   ② เวลาที่คนใช้กับบล็อกสูง ๆ ถูกบันทึกเป็น 0 เพราะ threshold ที่เป็นไปไม่ได้ทางเรขาคณิต
 * ══════════════════════════════════════════════════════════════════════ */

describe('utm — ตรรกะ pure', () => {
  it('ยอมเฉพาะค่าที่สะอาด และทิ้งค่าที่ยัดมาทาง query string', () => {
    expect(pickUtm('?utm_source=facebook&utm_campaign=first_customers')).toEqual({
      utm_source: 'facebook', utm_campaign: 'first_customers',
    });
    expect(pickUtm('?utm_source=<script>alert(1)</script>')).toEqual({});
    expect(pickUtm('?utm_source=' + 'x'.repeat(40))).toEqual({ utm_source: 'x'.repeat(32) });
  });

  it('ต่อ utm เข้า href โดยไม่ทับของเดิม', () => {
    const u = { utm_source: 'youtube', utm_campaign: 'pricing' };
    expect(appendUtm('/start', u)).toBe('/start?utm_source=youtube&utm_campaign=pricing');
    expect(appendUtm('/start?x=1', u)).toBe('/start?x=1&utm_source=youtube&utm_campaign=pricing');
    expect(appendUtm('/start?utm_source=calc', u)).toBe('/start?utm_source=calc');
    expect(utmQuery({})).toBe('');
  });

  it('"ใครส่งมา" ใช้ที่มาแรกเสมอ · "อ่านอะไรอยู่ตอนกด" ใช้ของหน้าปัจจุบัน', () => {
    // เคสจริง: มาจาก Facebook → อ่านบทความ → ปุ่มในบทความเขียน utm_source=blog ทับไว้
    const stored = { utm_source: 'facebook', utm_medium: 'comment', utm_campaign: 'first_customers' };
    const onArticle = { utm_source: 'blog', utm_campaign: 'ai-era-hardware-cost' };
    expect(mergeUtm(onArticle, stored)).toEqual({
      utm_source: 'facebook',                  // เครดิตต้องไม่ตกไปเป็นของ blog
      utm_medium: 'comment',
      utm_campaign: 'ai-era-hardware-cost',    // แต่ "บทความที่ทำให้เขากด" คือค่าที่มีประโยชน์กว่า
    });
    // ไม่มีที่มาจากนอกเลย → อย่างน้อยต้องบอกได้ว่ามาจากหน้าของเราเอง ไม่ใช่ direct ลอย ๆ
    expect(mergeUtm({}, null, 'faq')).toEqual({ utm_source: 'site', utm_medium: 'internal', utm_campaign: 'faq' });
  });

  it('จำ first-touch เฉพาะที่มาจากนอกเว็บเรา — ห้ามให้หน้าของเราเองกลบที่มาจริง', () => {
    expect(shouldStoreFirstTouch({ utm_source: 'tiktok' }, null)).toBe(true);
    expect(shouldStoreFirstTouch({ utm_source: 'site' }, null)).toBe(false);   // 'site' = หน้าของเราเอง
    expect(shouldStoreFirstTouch({ utm_campaign: 'x' }, null)).toBe(false);    // ไม่มี source = ไม่ใช่ที่มา
    expect(shouldStoreFirstTouch({ utm_source: 'line' }, { utm_source: 'facebook' })).toBe(false); // มีของเดิมแล้ว
  });

  it('first-touch หมดอายุแล้วต้องไม่ถูกใช้ (คนละทริป ไม่ใช่คนละหน้า)', () => {
    const now = 1_700_000_000_000;
    const fresh = JSON.stringify({ t: now - 1000, u: { utm_source: 'facebook' } });
    const old = JSON.stringify({ t: now - UTM_FIRST_TOUCH_MS - 1, u: { utm_source: 'facebook' } });
    expect(readFirstTouch(fresh, now)).toEqual({ utm_source: 'facebook' });
    expect(readFirstTouch(old, now)).toBeNull();
    expect(readFirstTouch('ขยะ', now)).toBeNull();
    expect(readFirstTouch(null, now)).toBeNull();
  });
});

describe('utm — สคริปต์ที่ฝังจริงในหน้า (รันของจริงใน jsdom ไม่ใช่แค่จับคำ)', () => {
  beforeEach(() => { localStorage.clear(); document.body.innerHTML = ''; });

  /* ⚠️ ลิงก์ต้องเป็น origin เดียวกับหน้าที่กำลังเปิดอยู่ — สคริปต์ตั้งใจไม่แตะลิงก์ข้ามโดเมน
   *    (บนของจริง หน้าเสิร์ฟจาก ceoaithailand.org และปุ่มก็ชี้โดเมนเดียวกัน) */
  const O = () => window.location.origin;

  const run = (search: string, camp = 'first_customers') => {
    window.history.replaceState({}, '', '/blog/first-customers-no-ads' + search);
    new Function(utmForwardScript(camp))();
  };

  it('เติม utm ที่ติดมากับ URL ให้ปุ่มที่ชี้ไปหน้าปลายทาง', () => {
    document.body.innerHTML = `<a id="cta" href="${O()}/start">เริ่มฟรี</a><a id="other" href="${O()}/blog">อ่านต่อ</a>`;
    run('?utm_source=facebook&utm_campaign=first_customers');
    const href = document.getElementById('cta')!.getAttribute('href')!;
    expect(href).toContain('utm_source=facebook');
    expect(href).toContain('utm_campaign=first_customers');
    // ลิงก์ที่ไม่ใช่หน้าปลายทาง ต้องไม่ถูกแตะ
    expect(document.getElementById('other')!.getAttribute('href')).toBe(`${O()}/blog`);
  });

  it('🔴 ปุ่มในบทความที่เขียน utm_source=blog ทับไว้ ต้องไม่กลบเครดิตของ Facebook', () => {
    // เส้นทางจริง: /ลูกค้า?s=fb → /blog/<slug>?utm_source=facebook → ปุ่มชี้ /calc?utm_source=blog&…
    document.body.innerHTML =
      `<a id="cta" href="${O()}/calc?seg=seller&utm_source=blog&utm_medium=article_cta&utm_campaign=ai-era-hardware-cost">คำนวณ</a>`;
    run('?utm_source=facebook&utm_medium=comment&utm_campaign=first_customers');
    const u = new URL(document.getElementById('cta')!.getAttribute('href')!);
    expect(u.searchParams.get('utm_source')).toBe('facebook');            // ที่มาจริงรอด
    expect(u.searchParams.get('utm_medium')).toBe('comment');
    expect(u.searchParams.get('utm_campaign')).toBe('ai-era-hardware-cost'); // บทความที่ทำให้กด
    expect(u.searchParams.get('seg')).toBe('seller');                     // พารามิเตอร์อื่นต้องไม่หาย
  });

  it('หน้าถัดไปที่ utm บอกว่ามาจาก blog ต้องไม่ทับ first-touch ที่เก็บไว้', () => {
    document.body.innerHTML = `<a id="a" href="${O()}/calc">x</a>`;
    run('?utm_source=facebook&utm_medium=comment');           // หน้าบทความ — เก็บ first-touch
    document.body.innerHTML = `<a id="cta" href="${O()}/start">x</a>`;
    run('?utm_source=blog&utm_campaign=pricing', 'calc');     // หน้า /calc ที่ถูกส่งต่อมา
    const u = new URL(document.getElementById('cta')!.getAttribute('href')!);
    expect(u.searchParams.get('utm_source')).toBe('facebook');
    expect(u.searchParams.get('utm_campaign')).toBe('pricing');
  });

  it('เก็บ first-touch แล้วใช้ต่อได้ในหน้าถัดไปที่ไม่มี utm', () => {
    document.body.innerHTML = `<a id="cta" href="${O()}/start">x</a>`;
    run('?utm_source=youtube&utm_content=6a');
    expect(JSON.parse(localStorage.getItem(UTM_FIRST_TOUCH_KEY)!).u.utm_source).toBe('youtube');

    document.body.innerHTML = `<a id="cta" href="${O()}/start">x</a>`;
    run(''); // หน้าถัดไป ไม่มี utm ติดมา
    expect(document.getElementById('cta')!.getAttribute('href')).toContain('utm_source=youtube');
  });

  it('🔴 สิ่งที่สคริปต์เก็บ ต้องอ่านได้ด้วย readFirstTouch ของฝั่งแอป (คนละไฟล์ คนละภาษา)', () => {
    // บั๊กที่เจอตอนเขียนเทสต์นี้: สคริปต์เก็บคีย์ย่อ {s,m,c,t} แต่ฝั่ง TypeScript อ่าน {utm_source,…}
    // ⇒ first-touch ถูกเก็บครบทุกครั้ง แต่ไม่มีใครอ่านได้เลย — เงียบสนิท ไม่มี error
    document.body.innerHTML = `<a href="${O()}/start">x</a>`;
    run('?utm_source=tiktok&utm_medium=comment&utm_campaign=pricing&utm_content=6a');
    const back = readFirstTouch(localStorage.getItem(UTM_FIRST_TOUCH_KEY), Date.now());
    expect(back).toEqual({
      utm_source: 'tiktok', utm_medium: 'comment', utm_campaign: 'pricing', utm_content: '6a',
    });
  });

  it('ไม่มี utm เลย → ยังต้องแยก "มาจากหน้าของเราเอง" ออกจาก direct', () => {
    document.body.innerHTML = `<a id="cta" href="${O()}/start">x</a>`;
    run('');
    const href = document.getElementById('cta')!.getAttribute('href')!;
    expect(href).toContain('utm_source=site');
    expect(href).toContain('utm_campaign=first_customers');
    expect(href).toContain('utm_medium=internal');
  });
});

describe('หน้าที่ server เรนเดอร์ ต้องส่งต่อที่มาได้จริง', () => {
  const pages: [string, string][] = [
    ['faq', faqPageHtml(ORIGIN)],
    ['sell', sellPageHtml(ORIGIN)],
    ['calc', calcPageHtml(ORIGIN, '')],
    ...BLOG_POSTS.slice(0, 3).map((p) => [`blog/${p.slug}`, blogPostHtml(ORIGIN, p.slug) ?? ''] as [string, string]),
  ];

  it.each(pages)('%s — ฝังสคริปต์ส่งต่อ utm', (_name, html) => {
    expect(html).toContain(UTM_FIRST_TOUCH_KEY);
    expect(html).toContain("utm_source");
  });

  it.each(pages)('%s — สคริปต์ต้องครอบคลุมหน้าปลายทางที่ปุ่มในหน้านี้ชี้ไปจริง', (_name, html) => {
    expect(html).toContain("TARGETS=['/start','/calc','/checkup']");
    const dests = [...html.matchAll(/href="https?:\/\/[^"/]+(\/(?:start|calc|checkup))\b/g)].map((m) => m[1]);
    for (const d of new Set(dests)) expect(html).toContain(`'${d}'`);
  });
});

describe('เวลาที่คนใช้กับแต่ละบล็อก — ต้องวัดบล็อกที่สูงกว่าจอได้', () => {
  const VH = 664; // iPhone 13 (ค่าจริงจาก Playwright ไม่ใช่สเปกเครื่อง 844)

  it('บล็อกสูง 2045px (quickcheck บนมือถือ) ที่เต็มจออยู่ = กำลังดูอยู่', () => {
    // เห็นเต็มจอ 664px จากบล็อกสูง 2045px ⇒ ratio = 0.32 → เกณฑ์เก่า (>=0.5) ตกทันที
    expect(sectionInView(664 / 2045, 664, VH)).toBe(true);
  });

  it('บล็อกเตี้ยกว่าจอ ยังใช้เกณฑ์ "เห็นครึ่งบล็อก" เหมือนเดิม', () => {
    expect(sectionInView(0.5, 179, VH)).toBe(true);   // บล็อก 358px เห็นครึ่งหนึ่ง
    expect(sectionInView(0.2, 72, VH)).toBe(false);   // โผล่มานิดเดียว = ไม่นับ
  });

  it('เลื่อนผ่านเร็ว ๆ / ไม่อยู่ในจอ = ไม่นับ', () => {
    expect(sectionInView(0, 0, VH)).toBe(false);
    expect(sectionInView(0.1, 100, VH)).toBe(false);
  });

  it('ไม่มีข้อมูลความสูงจอ ก็ยังต้องไม่พัง', () => {
    expect(sectionInView(0.8, 500, 0)).toBe(true);
    expect(sectionInView(0.1, 500, NaN)).toBe(false);
  });

  it('hook ต้องไม่กลับไปใช้ threshold 0.5 ล้วนอีก (บล็อกสูงเกิน 2 เท่าจอเข้าเกณฑ์ไม่ได้)', () => {
    const hook = src('hooks/useLandingTrace.ts');
    expect(hook).not.toMatch(/\{\s*threshold:\s*0\.5\s*\}/);
    expect(hook).toContain('sectionInView');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 seg = "ปัญหาที่เขามาด้วย" — วัดจริงใน production 10 ก.ย. 2569:
 *   `seg = default` **154 จาก 158 คน (97.5%)**
 *   ⇒ พาดหัวที่พูดกับ pain เฉพาะกลุ่ม **9 แบบ** (มีเทสต์ครบแล้ว) แทบไม่เคยถูกส่งถึงใคร
 *   รากของปัญหา: `seg` ไม่ได้อยู่ในคีย์ที่ส่งต่อ ⇒ ตายที่ hop บทความ → /start ทุกครั้ง
 *   (ฝั่งรับพร้อมมานาน: `homeSeo(origin, agg, seg)` + `heroVariant` 9 แบบ)
 * ══════════════════════════════════════════════════════════════════════════ */
describe('seg ต้องเดินทางข้ามหน้าได้ ไม่งั้น Dynamic PLG ไม่มีวันทำงาน', () => {
  beforeEach(() => { localStorage.clear(); document.body.innerHTML = ''; });
  const O = () => window.location.origin;
  const run = (search: string, camp = 'first_customers') => {
    window.history.replaceState({}, '', '/blog/palm-price-what-you-control' + search);
    new Function(utmForwardScript(camp))();
  };

  it('seg อยู่ในคีย์ที่ส่งต่อ แต่ไม่ใช่คีย์รายงานที่มา (คนละคำถาม)', async () => {
    const m = await import('../utmForward');
    expect(m.FORWARD_KEYS).toContain('seg');
    expect(m.UTM_KEYS as readonly string[]).not.toContain('seg');
  });

  it('อ่าน seg จาก query ได้ และใส่กลับลง query string', async () => {
    const { pickUtm, utmQuery, appendUtm } = await import('../utmForward');
    const u = pickUtm('?utm_source=facebook&seg=seller');
    expect(u.seg).toBe('seller');
    expect(utmQuery(u)).toContain('seg=seller');
    expect(appendUtm('/start', u)).toContain('seg=seller');
  });

  it('ค่าที่ไม่ผ่านกติกาถูกทิ้ง (กติกาเดียวกับ utm)', async () => {
    const { pickUtm } = await import('../utmForward');
    expect(pickUtm('?seg=<script>').seg).toBeUndefined();
  });

  it('🔴 href ที่ระบุ seg ของตัวเองไว้แล้ว ห้ามถูกทับ (เจตนาชัดกว่า)', async () => {
    const { appendUtm, pickUtm } = await import('../utmForward');
    const u = pickUtm('?seg=newbie');
    expect(appendUtm('/start?seg=food', u)).toBe('/start?seg=food');
  });

  it('🔴 hop ①: ลิงก์สั้นต้องไม่ทิ้ง seg ตอน redirect (จุดที่มันตายจุดแรก)', async () => {
    const { SHORT_LINKS, shortLinkTarget } = await import('../shortLinks');
    // ของจริงที่แคปชั่นเราปล่อยออกไป: ceoaithailand.org/ราคา?s=ytc&seg=seller
    const u = new URL(shortLinkTarget(SHORT_LINKS['/ราคา'], ORIGIN, '?s=ytc&seg=seller'));
    expect(u.searchParams.get('seg')).toBe('seller');
    expect(u.searchParams.get('utm_source')).toBe('youtube');   // ที่มายังต้องรอดเหมือนเดิม
  });

  it('ลิงก์สั้นที่รู้ว่าใครกด ส่ง seg ประจำลิงก์ให้เอง แม้ไม่ได้พิมพ์ ?seg=', async () => {
    const { SHORT_LINKS, shortLinkTarget } = await import('../shortLinks');
    const u = new URL(shortLinkTarget(SHORT_LINKS['/ปาล์ม'], ORIGIN, '?s=yt'));
    expect(u.searchParams.get('seg')).toBe('palm');
    // ค่าที่ผู้ใช้พามาเจาะจงกว่า ⇒ ต้องชนะค่าประจำลิงก์
    const v = new URL(shortLinkTarget(SHORT_LINKS['/ปาล์ม'], ORIGIN, '?seg=owner'));
    expect(v.searchParams.get('seg')).toBe('owner');
  });

  it('🔴 ลิงก์กลาง ๆ ห้ามเดา seg — ยัดพาดหัวผิดกลุ่ม แย่กว่าพาดหัวกลาง ๆ', async () => {
    const { SHORT_LINKS, shortLinkTarget } = await import('../shortLinks');
    for (const key of ['/ai', '/ตรวจ', '/ซิม']) {
      expect(SHORT_LINKS[key].seg, key).toBeUndefined();
      expect(new URL(shortLinkTarget(SHORT_LINKS[key], ORIGIN, '?s=yt')).searchParams.get('seg')).toBeNull();
    }
  });

  it('🔒 seg ของลิงก์สั้น ต้องตรงกับ seg ที่คลิปสัญญาไว้ (VIDEO_TOPICS)', async () => {
    const { SHORT_LINKS } = await import('../shortLinks');
    const { VIDEO_TOPICS } = await import('../commentReply');
    for (const t of VIDEO_TOPICS) {
      // คลิปบอกว่าคุยเรื่องของกลุ่มนี้ แล้วลิงก์พาไปเจอพาดหัวอีกกลุ่ม = ผิดสัญญาเงียบ ๆ
      expect(SHORT_LINKS[t.shortLink]?.seg, t.shortLink).toBe(t.seg);
    }
  });

  it('🔴 hop ②: สคริปต์ในบทความต้องส่ง seg ต่อไป /start (รันของจริงใน jsdom)', () => {
    document.body.innerHTML = `<a id="cta" href="${O()}/start">เริ่มฟรี</a>`;
    run('?utm_source=youtube&seg=palm');
    const u = new URL(document.getElementById('cta')!.getAttribute('href')!);
    expect(u.searchParams.get('seg')).toBe('palm');
  });

  it('🔴 เส้นทางเต็ม: คลิป → ลิงก์สั้น → บทความ → บทความที่สอง → /start ต้องยังเป็น palm', async () => {
    const { SHORT_LINKS, shortLinkTarget } = await import('../shortLinks');
    // ① คนพิมพ์ ceoaithailand.org/ปาล์ม ตามที่เห็นในคลิป
    const afterRedirect = new URL(shortLinkTarget(SHORT_LINKS['/ปาล์ม'], ORIGIN, '?s=yt'));
    expect(afterRedirect.searchParams.get('seg')).toBe('palm');

    // ② ลงบทความแรก — สคริปต์เก็บ first-touch
    document.body.innerHTML = `<a id="cta" href="${O()}/start">x</a>`;
    run(afterRedirect.search, 'palm_price');
    expect(new URL(document.getElementById('cta')!.getAttribute('href')!).searchParams.get('seg')).toBe('palm');

    // ③ เดินไปบทความที่สองโดยไม่มี query ติดมาเลย (ลิงก์ในเนื้อบทความไม่ถูกเติม seg)
    document.body.innerHTML = `<a id="cta" href="${O()}/start">x</a>`;
    run('', 'first_customers');
    const final = new URL(document.getElementById('cta')!.getAttribute('href')!);
    expect(final.searchParams.get('seg')).toBe('palm');          // ← first-touch ต้องจำไว้
    expect(final.searchParams.get('utm_source')).toBe('youtube');

    // ④ /start อ่านค่านั้นแล้วได้พาดหัวของชาวสวนปาล์มจริง ไม่ใช่พาดหัวกลาง ๆ
    const { segmentFor, HERO_VARIANTS } = await import('../heroVariant');
    expect(segmentFor(final.search)).toBe('palm');
    expect(HERO_VARIANTS[segmentFor(final.search)].h1a).toContain('ปาล์ม');
  });

  it('🔴 สิ่งที่สคริปต์เก็บเป็น first-touch ต้องอ่านกลับได้ครบ รวม seg', () => {
    document.body.innerHTML = `<a href="${O()}/start">x</a>`;
    run('?utm_source=tiktok&seg=food');
    expect(readFirstTouch(localStorage.getItem(UTM_FIRST_TOUCH_KEY), Date.now()))
      .toEqual({ utm_source: 'tiktok', seg: 'food' });
  });
});
