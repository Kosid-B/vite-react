import { describe, it, expect } from 'vitest';
import { KEYWORD_OFFERS, VIDEO_TOPICS } from '../commentReply';
import { SHORT_LINKS } from '../shortLinks';
import { BLOG_POSTS, type BlogPost } from '../blogData';

/* กฎบังคับของโปรเจกต์ — skill `content-link-contract` ทำให้เครื่องตรวจแทนความจำคน
 *
 * ทุก "คำสัญญา" ที่เราปล่อยออกไป (คอมเมนต์ปักหมุด · คำบรรยายคลิป · ตอนจบคลิป)
 * ต้องชี้ได้ว่าบทความปลายทางส่งมอบตรงไหน — ไม่ใช่ "มันก็จริงอยู่แล้ว"
 *
 * ทำไมต้องเป็นเทสต์ (ของจริงที่หลุดมานาน — พบ 19 ส.ค. 2569):
 *   คอมเมนต์ปักหมุดคำว่า 'ราคา' สัญญา "ตาราง…+ เครื่องคำนวณของคุณเอง"
 *   แต่บทความ pricing-no-loss มีคำว่า "ตาราง" 0 ครั้ง และ "เครื่องคำนวณ" 0 ครั้ง
 *   คนที่กดเข้าไปคือคนที่สนใจที่สุด และเป็นคนที่จะผิดหวังที่สุด (skill A2/B4)
 */

/** คำนามที่ "ตรวจได้" — ถ้าคำสัญญาบอกว่ามีของพวกนี้ บทความต้องมีคำนั้นจริง */
const CONCRETE_NOUNS = ['ตาราง', 'เครื่องคำนวณ', 'เช็คลิสต์', 'เทมเพลต', 'แบบฟอร์ม', 'ไฟล์', 'วิดีโอ', 'คอร์ส'];

function postFor(shortLink: string): BlogPost {
  const link = SHORT_LINKS[shortLink];
  expect(link, `${shortLink} ไม่มีใน SHORT_LINKS`).toBeDefined();
  const slug = link.path.replace('/blog/', '');
  const p = BLOG_POSTS.find((b) => b.slug === slug);
  expect(p, `${shortLink} → ไม่พบบทความ ${slug}`).toBeDefined();
  return p!;
}

/** ข้อความทั้งหมดของบทความที่ผู้อ่านจะเห็นจริง */
function postText(p: BlogPost): string {
  return [p.title, p.lead, ...p.sections.map((s) => `${s.h2} ${s.paras.join(' ')} ${(s.bullets ?? []).join(' ')}`),
          ...p.faq.map((f) => `${f.q} ${f.a}`)].join(' ');
}

/** หัวข้อทั้งหมดที่ใช้อ้างอิงได้ (h2 + คำถามใน FAQ) */
function anchors(p: BlogPost): string[] {
  return [...p.sections.map((s) => s.h2), ...p.faq.map((f) => f.q)];
}

const SURFACES = [
  ...KEYWORD_OFFERS.map((o) => ({ label: `คอมเมนต์ปักหมุด "${o.keyword}"`, shortLink: o.shortLink, gives: o.gives, anchor: o.provenBy })),
  ...VIDEO_TOPICS.map((t) => ({ label: `คลิป "${t.topic}"`, shortLink: t.shortLink, gives: t.gives, anchor: t.answeredBy })),
];

describe('สัญญาส่งมอบคอนเทนต์ — ทุกคำสัญญาต้องมีของจริงที่ปลายทาง', () => {
  it('มีของให้ตรวจจริง (กันเทสต์ผ่านเพราะลิสต์ว่าง)', () => {
    expect(SURFACES.length).toBeGreaterThanOrEqual(8);
  });

  it.each(SURFACES)('$label — ปลายทางต้องเป็นบทความที่มีอยู่จริง', ({ shortLink }) => {
    expect(postFor(shortLink)).toBeDefined();
  });

  it.each(SURFACES)('$label — ต้องชี้ได้ว่าอยู่หัวข้อไหนของบทความ (B4)', ({ shortLink, anchor }) => {
    const p = postFor(shortLink);
    expect(anchors(p), `"${anchor}" ไม่ใช่หัวข้อหรือคำถามที่มีอยู่จริงใน ${p.slug}`).toContain(anchor);
  });

  it.each(SURFACES)('$label — ถ้าสัญญาว่ามี "ของ" บทความต้องมีของนั้นจริง', ({ shortLink, gives }) => {
    const text = postText(postFor(shortLink));
    for (const noun of CONCRETE_NOUNS) {
      if (gives.includes(noun)) {
        expect(text, `สัญญาว่ามี "${noun}" แต่บทความไม่มีคำนี้เลย — คนกดเข้าไปแล้วหาไม่เจอ`).toContain(noun);
      }
    }
  });

  it('ห้ามชี้ปลายทางเป็นหน้าแรกหรือหน้าสมัคร (skill B5)', () => {
    for (const s of SURFACES) {
      expect(['/', '/start', '/checkup'], `${s.label} ชี้ไป ${s.shortLink}`).not.toContain(SHORT_LINKS[s.shortLink].path);
    }
  });
});
