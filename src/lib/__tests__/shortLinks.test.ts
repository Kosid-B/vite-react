import { describe, it, expect } from 'vitest';
import { SHORT_LINKS, SOURCE_PRESETS, resolveShortLink, resolveShortLinkWithSource, shortLinkTarget } from '../shortLinks';
import { BLOG_POSTS } from '../blogData';

const ORIGIN = 'https://ceoaithailand.org';

describe('shortLinks — หาลิงก์', () => {
  it('พาธตรง ๆ หาเจอ', () => {
    expect(resolveShortLink('/sms')?.path).toBe('/blog/sim-update-scam-check');
    expect(resolveShortLink('/ai')?.path).toBe('/start');
  });

  it('พาธภาษาไทยที่ถูก percent-encode ต้องหาเจอ (เบราว์เซอร์ encode ให้เสมอ)', () => {
    const encoded = '/' + encodeURIComponent('ซิม');
    expect(encoded).not.toBe('/ซิม');            // ยืนยันว่ามันถูก encode จริง
    expect(resolveShortLink(encoded)?.campaign).toBe('sim_scam');
    expect(resolveShortLink('/' + encodeURIComponent('ราคา'))?.campaign).toBe('pricing');
    expect(resolveShortLink('/' + encodeURIComponent('ลูกค้า'))?.campaign).toBe('first_customers');
  });

  it('ทนต่อ slash ท้าย และตัวพิมพ์ใหญ่', () => {
    expect(resolveShortLink('/sms/')?.campaign).toBe('sim_scam');
    expect(resolveShortLink('/SMS')?.campaign).toBe('sim_scam');
    expect(resolveShortLink('/Price///')?.campaign).toBe('pricing');
  });

  it('ไม่ใช่ลิงก์สั้น → คืน null ให้ router เดินต่อ', () => {
    expect(resolveShortLink('/')).toBeNull();
    expect(resolveShortLink('/blog')).toBeNull();
    expect(resolveShortLink('/blog/sim-update-scam-check')).toBeNull();
    expect(resolveShortLink('/b/some-shop')).toBeNull();
    expect(resolveShortLink('/sitemap.xml')).toBeNull();
  });

  it('encoding พัง → ไม่ throw', () => {
    expect(() => resolveShortLink('/%E0%A4%A')).not.toThrow();
    expect(resolveShortLink('/%E0%A4%A')).toBeNull();
  });
});

describe('shortLinks — ปลายทางต้องมีจริง', () => {
  it('ทุกลิงก์ที่ชี้ไปบล็อก ต้องมีบทความนั้นอยู่จริง (กันลิงก์ตาย)', () => {
    const slugs = new Set(BLOG_POSTS.map((p) => p.slug));
    for (const [key, link] of Object.entries(SHORT_LINKS)) {
      const m = link.path.match(/^\/blog\/(.+)$/);
      if (m) expect(slugs.has(m[1]), `${key} → ${link.path} ไม่มีบทความนี้`).toBe(true);
    }
  });

  it('ทุกคีย์ขึ้นต้นด้วย / เป็นตัวพิมพ์เล็ก และไม่มี slash ท้าย', () => {
    for (const key of Object.keys(SHORT_LINKS)) {
      expect(key.startsWith('/')).toBe(true);
      expect(key).toBe(key.toLowerCase());
      expect(key.endsWith('/')).toBe(false);
      expect(key.length).toBeLessThanOrEqual(12); // สั้นพอให้พิมพ์ตามจากการเห็นครั้งเดียว
    }
  });

  it('ทุกปลายทางเป็นพาธภายในเว็บเรา (กัน open redirect)', () => {
    for (const link of Object.values(SHORT_LINKS)) {
      expect(link.path.startsWith('/')).toBe(true);
      expect(link.path.startsWith('//')).toBe(false);
      expect(shortLinkTarget(link, ORIGIN).startsWith(ORIGIN + '/')).toBe(true);
    }
  });
});

describe('shortLinks — ติด utm ให้อัตโนมัติ', () => {
  it('ปลายทางมี utm ครบ 3 ตัว โดยผู้ใช้ไม่ต้องพิมพ์เอง', () => {
    const u = new URL(shortLinkTarget(SHORT_LINKS['/sms'], ORIGIN));
    expect(u.pathname).toBe('/blog/sim-update-scam-check');
    expect(u.searchParams.get('utm_source')).toBe('social');
    expect(u.searchParams.get('utm_medium')).toBe('organic');
    expect(u.searchParams.get('utm_campaign')).toBe('sim_scam');
  });

  it('คอนเทนต์คนละชิ้นได้ campaign คนละค่า (แยกผลได้)', () => {
    const c = new Set(Object.values(SHORT_LINKS).map((l) => l.campaign));
    expect(c.size).toBeGreaterThanOrEqual(5);
  });

  it('`?s=yt` แยกที่มาเป็น youtube/shorts (ไม่ใช่ social/organic ก้อนเดียว)', () => {
    const u = new URL(shortLinkTarget(SHORT_LINKS['/price'], ORIGIN, '?s=yt'));
    expect(u.searchParams.get('utm_source')).toBe('youtube');
    expect(u.searchParams.get('utm_medium')).toBe('shorts');
    expect(u.searchParams.get('utm_campaign')).toBe('pricing'); // campaign ยังตามคอนเทนต์
  });

  it('ทุก preset ให้ source/medium ไม่ซ้ำกับค่าเริ่มต้น', () => {
    for (const [key, p] of Object.entries(SOURCE_PRESETS)) {
      const u = new URL(shortLinkTarget(SHORT_LINKS['/ai'], ORIGIN, `?s=${key}`));
      expect(u.searchParams.get('utm_source')).toBe(p.source);
      expect(u.searchParams.get('utm_medium')).toBe(p.medium);
    }
  });

  it('`c=` แยกคลิปย่อยในแคมเปญเดียวกันได้', () => {
    const u = new URL(shortLinkTarget(SHORT_LINKS['/price'], ORIGIN, '?s=yt&c=1a'));
    expect(u.searchParams.get('utm_content')).toBe('1a');
  });

  it('utm ที่เขียนเต็มมาเอง ไม่ถูกเขียนทับ (เดิมโดนทับทุกครั้ง)', () => {
    const u = new URL(
      shortLinkTarget(SHORT_LINKS['/sms'], ORIGIN, '?utm_source=newsletter&utm_medium=email'),
    );
    expect(u.searchParams.get('utm_source')).toBe('newsletter');
    expect(u.searchParams.get('utm_medium')).toBe('email');
  });

  it('ค่าขยะ/อักขระแปลก ตกกลับไปค่าเริ่มต้น ไม่หลุดเข้ารายงาน', () => {
    for (const bad of ['?s=ไม่มีจริง', '?s=<script>', '?utm_source=a b c', '?s=' + 'x'.repeat(80)]) {
      const u = new URL(shortLinkTarget(SHORT_LINKS['/ai'], ORIGIN, bad));
      expect(u.searchParams.get('utm_source')).toBe('social');
      expect(u.searchParams.get('utm_medium')).toBe('organic');
    }
  });

  it('query แปลก ๆ ไม่ทำให้ล้ม และไม่พาออกนอกเว็บเรา', () => {
    for (const q of ['', '?', '?s', '?%', '?s=yt&s=tt']) {
      expect(() => shortLinkTarget(SHORT_LINKS['/ai'], ORIGIN, q)).not.toThrow();
      expect(shortLinkTarget(SHORT_LINKS['/ai'], ORIGIN, q).startsWith(ORIGIN + '/')).toBe(true);
    }
  });

  it('ไทยกับอังกฤษของเรื่องเดียวกัน ชี้ปลายทาง+campaign เดียวกัน', () => {
    for (const [th, en] of [['/ซิม', '/sms'], ['/ราคา', '/price'], ['/ทุน', '/tun'], ['/ลูกค้า', '/customer']]) {
      expect(SHORT_LINKS[th]).toEqual(SHORT_LINKS[en]);
    }
  });
});

/* ── ตัวย่อแพลตฟอร์มแบบ "ส่วนท้ายของ path" (19 ส.ค. 2569) ───────────────────
 * เหตุผล: คอมเมนต์ TikTok/IG ลิงก์กดไม่ได้ คนต้องพิมพ์ตาม
 *   `?s=ttc` จึงมีโอกาสสูงที่จะถูกพิมพ์ตกหล่น → utm_source กลายเป็น social
 *   = ติดแท็กไว้แต่ได้ข้อมูลเหมือนไม่ได้ติด
 * `/ราคา/tt` พิมพ์ง่ายกว่า ไม่มี ? หรือ = และไม่มีอะไรให้ลืม
 */
describe('ตัวย่อแพลตฟอร์มท้าย path — สำหรับคอมเมนต์ที่คนต้องพิมพ์เอง', () => {
  const O = 'https://ceoaithailand.org';

  it('/ราคา/tt → บทความราคา + utm_source=tiktok (ไม่ต้องมี ?s=)', () => {
    const r = resolveShortLinkWithSource('/ราคา/tt');
    expect(r.link?.path).toBe('/blog/pricing-no-loss');
    expect(r.src).toBe('tt');
    const u = new URL(shortLinkTarget(r.link!, O, '', r.src));
    expect(u.searchParams.get('utm_source')).toBe('tiktok');
    expect(u.searchParams.get('utm_campaign')).toBe('pricing');
  });

  it('ใช้ได้ทุกตัวย่อใน SOURCE_PRESETS และกับ path ที่ถูก encode', () => {
    for (const key of Object.keys(SOURCE_PRESETS)) {
      const r = resolveShortLinkWithSource(`/ราคา/${key}`);
      expect(r.src, `/ราคา/${key} ต้องอ่านตัวย่อออก`).toBe(key);
    }
    // path ไทยถูก encode เสมอเมื่อมาจากเบราว์เซอร์จริง
    const enc = resolveShortLinkWithSource('/%E0%B8%A3%E0%B8%B2%E0%B8%84%E0%B8%B2/ttc');
    expect(enc.link?.path).toBe('/blog/pricing-no-loss');
    expect(enc.src).toBe('ttc');
  });

  it('?s= ชนะ path suffix เมื่อใส่มาทั้งคู่ (ผู้ใช้เขียนเจาะจงกว่า)', () => {
    const r = resolveShortLinkWithSource('/ราคา/tt');
    const u = new URL(shortLinkTarget(r.link!, O, '?s=ytc', r.src));
    expect(u.searchParams.get('utm_source')).toBe('youtube');
    expect(u.searchParams.get('utm_medium')).toBe('comment');
  });

  it('ของเก่าต้องไม่พัง — /ราคา เปล่า ๆ และ /ราคา?s=ttc ยังทำงานเหมือนเดิม', () => {
    expect(resolveShortLinkWithSource('/ราคา').src).toBeNull();
    expect(resolveShortLink('/ราคา')?.path).toBe('/blog/pricing-no-loss');
  });

  it('ส่วนท้ายที่ไม่ใช่ตัวย่อ = ไม่ใช่ลิงก์สั้น (ห้ามเดา)', () => {
    expect(resolveShortLinkWithSource('/ราคา/xyz').link).toBeNull();
    expect(resolveShortLinkWithSource('/ไม่มีจริง/tt').link).toBeNull();
    expect(resolveShortLinkWithSource('/tt').link).toBeNull();
  });
});
