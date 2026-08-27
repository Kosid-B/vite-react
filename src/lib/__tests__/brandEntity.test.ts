import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BRAND_NAME, ALTERNATE_NAMES, SEARCH_CATEGORY, HOME_TITLE_ENTITY, HOME_DESC_ENTITY,
  entityProfiles, sameAsUrls, entityIssues,
} from '../brandEntity';
import { organizationJsonLd, webSiteJsonLd, homeSeo, aboutPageHtml, llmsTxt, sitemapXml } from '../seoData';
import { CATEGORY } from '../competitiveStrategy';

const ROOT = resolve(__dirname, '../../..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');
const ORIGIN = 'https://ceoaithailand.org';

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 ก่อนจะให้ Google เข้าใจว่าเราคือใคร รีโปของเราเองต้องพูดตรงกันก่อน
 *    ตรวจ 27 ส.ค. 2569: มีคำอธิบายแบรนด์ 4 แบบใน 4 ไฟล์ และ 2 แบบเป็น "สารเก่า"
 *    ที่เจ้าของยกเลิกไปแล้ว — แต่ยังเป็นสิ่งที่ Google อ่านอยู่ทุกวัน
 * ══════════════════════════════════════════════════════════════════════════ */

describe('ชื่อแบรนด์ต้องสะกดเหมือนกันทุกพื้นผิว', () => {
  it('ชื่อในทุก schema ต้องมาจากค่าคงที่ตัวเดียว', () => {
    const org = organizationJsonLd(ORIGIN) as Record<string, unknown>;
    const site = webSiteJsonLd(ORIGIN) as Record<string, unknown>;
    expect(org.name).toBe(BRAND_NAME);
    expect(site.name).toBe(BRAND_NAME);
  });

  it('title ของหน้าแรกต้องขึ้นต้นด้วยชื่อแบรนด์ (คนค้นชื่อเราต้องเจอเราเป็นอันดับแรก)', () => {
    expect(homeSeo(ORIGIN).title.startsWith(BRAND_NAME)).toBe(true);
    expect(HOME_TITLE_ENTITY.startsWith(BRAND_NAME)).toBe(true);
  });

  it('index.html ต้องพูดตรงกับ title/description ที่ Worker เสิร์ฟ', () => {
    const html = read('index.html');
    expect(html, 'title ใน index.html ไม่ตรงกับที่ Worker เสิร์ฟ').toContain(HOME_TITLE_ENTITY);
    expect(html).toContain('og:site_name" content="' + BRAND_NAME);
  });

  it('🔴 ห้ามเหลือ "สารเก่า" ที่เจ้าของยกเลิกแล้วในพื้นผิวที่ Google อ่าน', () => {
    const html = read('index.html');
    const seo = read('src/lib/seoData.ts');
    // CLAUDE.md: สารหลัก "ไม่ใช่" จ้างทีม AI ทั้งบริษัท
    // 🔴 ครอบทุกพื้นผิวใน head ไม่ใช่แค่ <title> — เจอจริงว่ามีสำเนาซ่อนอยู่ใน og: และ twitter:
    expect(html, 'index.html ยังใช้สารเก่า').not.toMatch(/จ้าง AI เป็นทีมงาน|ทีมผู้บริหาร AI|บริษัท AI อัตโนมัติ/);
    // ทุกพื้นผิวที่ตัวอย่างลิงก์ใช้ ต้องพูดตรงกัน (Google/FB/X อ่านคนละช่อง)
    for (const k of ['og:title', 'twitter:title']) {
      expect(html, `${k} ไม่ตรงกับ title`).toContain(`content="${HOME_TITLE_ENTITY}"`);
    }
    expect(seo.match(/const HOME_TITLE = HOME_TITLE_ENTITY/), 'หน้าแรกไม่ได้ดึงจากแหล่งเดียว').toBeTruthy();
  });
});

describe('สัญญาณที่ทำให้ Google แยก entity ออกจาก "CEO Thailand" ทั่วไป', () => {
  it('ต้องมี alternateName ที่คนพิมพ์จริง (ceoaithailand ติดกัน)', () => {
    expect(ALTERNATE_NAMES).toContain('ceoaithailand');
    const org = organizationJsonLd(ORIGIN) as Record<string, unknown>;
    expect(org.alternateName).toEqual([...ALTERNATE_NAMES]);
  });

  it('ต้องมี WebSite schema ผูกชื่อเว็บเข้ากับ entity เดียวกัน', () => {
    const site = webSiteJsonLd(ORIGIN) as Record<string, unknown>;
    expect(site['@type']).toBe('WebSite');
    expect(site.url).toBe(ORIGIN);
    expect(site.inLanguage).toBe('th-TH');
  });

  it('🔴 sameAs ต้องมาจากแหล่งเดียว และใส่เฉพาะ URL ที่มีจริง', () => {
    const org = organizationJsonLd(ORIGIN) as Record<string, unknown>;
    expect(org.sameAs).toEqual(sameAsUrls());
    for (const u of sameAsUrls()) expect(u, 'มี URL ว่างหลุดเข้า sameAs').toMatch(/^https?:\/\//);
  });

  it('🔴 ช่องที่ยังไม่มี URL ต้องถูกรายงานเป็น blocker ไม่ใช่ปล่อยเงียบ', () => {
    const missing = entityProfiles().filter((p) => p.required && !p.url);
    const blockers = entityIssues().filter((i) => i.level === 'blocker');
    expect(blockers).toHaveLength(missing.length);
    for (const b of blockers) expect(b.fix.length, 'บอกปัญหาแต่ไม่บอกทางแก้').toBeGreaterThan(20);
  });

  /* 🔴 รีโปพิสูจน์ไม่ได้ว่า URL "มีอยู่จริง" — เทสต์จึงกันสิ่งที่กันได้แทน:
   *    URL ของโปรไฟล์โซเชียลต้องมาจาก `config.SOCIAL` ที่เดียว ซึ่งเจ้าของเป็นคนกรอก
   *    ⇒ ใครจะใส่ URL ต้องไปใส่ที่นั่น ไม่ใช่พิมพ์ทิ้งไว้กลางไฟล์นี้
   *    (พบตอนยืนยันแดง 27 ส.ค. 2569: ยัด URL ปลอมลงไปแล้วเทสต์ชุดเดิมยังเขียว) */
  it('🔴 URL โปรไฟล์ต้องมาจาก config.SOCIAL เท่านั้น — ห้ามพิมพ์ทิ้งไว้ในไฟล์นี้', () => {
    const src = read('src/lib/brandEntity.ts');
    const social = src.slice(src.indexOf('export function entityProfiles'));
    const literals = social.match(/https?:\/\/(?!www\.b-tctraining|ceoaithailand)[^'"\s]+/g) ?? [];
    expect(literals, `URL ที่ไม่ได้มาจาก config: ${literals.join(' ')}`).toEqual([]);
    expect(social, 'ไม่ได้ดึงจาก SOCIAL').toMatch(/SOCIAL\./);
  });

  it('🔴 ของที่ตรวจจากรีโปไม่ได้ ต้องเป็น blind ไม่ใช่คะแนน 0', () => {
    const blind = entityIssues().filter((i) => i.level === 'blind');
    expect(blind.length).toBeGreaterThan(0);
    expect(blind[0].what).toMatch(/ตรวจจากรีโปไม่ได้/);
  });
});

describe('🔴 พูดกับคน กับ พูดกับเครื่อง เป็นคนละพื้นผิว', () => {
  it('หมวดหมู่สำหรับเครื่อง ต้องไม่ถูกใช้เป็นพาดหัวบนหน้าเว็บ', () => {
    const landing = read('src/pages/LandingPage.tsx');
    expect(landing, 'ชื่อหมวดหมู่หลุดขึ้นเป็นพาดหัว — คนที่ไม่รู้ว่าตัวเองมีปัญหา ไม่ค้นหาชื่อหมวด')
      .not.toContain(SEARCH_CATEGORY);
  });

  it('กฎเดิมของ competitiveStrategy ยังอยู่ครบ (ไม่ได้ถูกลบเพื่อให้ผ่าน)', () => {
    expect(CATEGORY.whyNotLeadWithCategory).toMatch(/ไม่มีใครค้นหาชื่อหมวดหมู่/);
    expect(CATEGORY.publicHook.length).toBeGreaterThan(10);
  });

  it('คำอธิบายสำหรับเครื่อง ต้องบอกว่าเราทำอะไรให้ใคร ไม่ใช่แค่ชื่อหมวด', () => {
    expect(HOME_DESC_ENTITY).toContain('SME');
    expect(HOME_DESC_ENTITY.length).toBeGreaterThan(80);
    expect(HOME_DESC_ENTITY.length, 'ยาวเกิน Google จะตัดกลางประโยค').toBeLessThan(320);
  });
});


/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 หน้า /about — เกิดจากหลักฐานจริง ไม่ใช่จากทฤษฎี SEO
 *    Google AI Overview ของคำค้น "ceoaithailand" (27 ส.ค. 2569) แตกคำเป็น
 *    "CEO และ AI ในประเทศไทย" แล้วอ้างอิงนิตยสาร/รางวัล/หลักสูตร 4 แห่ง โดยไม่มีเราเลย
 *    ⇒ เครื่องต้องมี "ประโยคนิยาม" กับ "รายการไม่ใช่อะไร" ให้หยิบไปอ้าง
 * ══════════════════════════════════════════════════════════════════════════ */
describe('หน้า /about — ให้เครื่องอ้างเราได้ถูกตัว', () => {
  const ORIGIN2 = 'https://ceoaithailand.org';
  const html = aboutPageHtml(ORIGIN2);

  it('ต้องขึ้นต้นด้วยประโยคนิยาม ไม่ใช่คำโฆษณา', () => {
    expect(html).toMatch(/<h1>CEO AI Thailand คืออะไร<\/h1>/);
    expect(html).toMatch(/คือ <strong>ซอฟต์แวร์ \(SaaS\)<\/strong>/);
  });

  it('🔴 ต้องระบุชุดที่ "สับสนจริง" ตามที่เห็นใน AI Overview ครบทุกตัว', () => {
    for (const n of ['CEO THAILAND', 'Thailand Top CEO of the Year', 'Digital CEO', 'CEO Idol Thailand']) {
      expect(html, `ไม่ได้แยกตัวเองออกจาก ${n}`).toContain(n);
    }
  });

  it('🔴 ต้องเป็นการบอกว่า "คนละองค์กร" เท่านั้น ห้ามเปรียบเทียบว่าใครดีกว่า', () => {
    expect(html).not.toMatch(/ดีกว่า|เหนือกว่า|แย่กว่า|ไม่ดีเท่า/);
  });

  it('canonical + schema ชี้ที่ /about และผูกกับ Organization เดียวกัน', () => {
    expect(html).toContain(`<link rel="canonical" href="${ORIGIN2}/about">`);
    expect(html).toContain('"@type":"AboutPage"');
    expect(html).toContain(`"name":"${BRAND_NAME}"`);
  });

  it('ต้องลิงก์ออกไปทุกโปรไฟล์ที่มี URL จริง (rel=me)', () => {
    for (const p of entityProfiles().filter((x) => x.url)) {
      expect(html, `ไม่ได้ลิงก์ไป ${p.label}`).toContain(p.url);
    }
    expect(html).toContain('rel="me"');
  });

  it('🔴 ต้องอยู่ใน sitemap — ไม่งั้น Google ไม่รู้ว่ามีหน้านี้', () => {
    expect(sitemapXml([], ORIGIN2)).toContain(`${ORIGIN2}/about`);
  });

  it('llms.txt ต้องมีบล็อกนิยาม + รายการ "ไม่ใช่" ชุดเดียวกัน', () => {
    const t = llmsTxt(ORIGIN2);
    expect(t).toMatch(/CEO AI Thailand คืออะไร/);
    expect(t).toContain('CEO Idol Thailand');
    expect(t).toContain('Digital CEO');
  });
});
