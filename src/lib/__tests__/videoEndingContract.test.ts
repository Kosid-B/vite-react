import { describe, it, expect } from 'vitest';
import { VIDEO_TOPICS, videoEnding } from '../commentReply';
import { SHORT_LINKS } from '../shortLinks';
import { blogPostBySlug } from '../blogData';

/* ทำให้ skill `content-link-contract` ข้อ B4 บังคับได้ด้วยเครื่อง ไม่ใช่ด้วยความจำคน
 *
 * B4: "ทุกประโยคในโพสต์ต้องชี้ได้ว่ามาจากหัวข้อไหนของบทความ
 *      ถ้าโพสต์สัญญา 5 ข้อ แต่บทความมี 3 ข้อ — คนที่กดเข้าไปคือคนที่สนใจที่สุด
 *      และเป็นคนที่จะผิดหวังที่สุด"
 *
 * ทำไมต้องเป็นเทสต์: ตอนจบคลิปแบบ "ค้าง" คือการเปิดช่องว่างในใจคนดู
 * ถ้าปลายทางไม่มีคำตอบ = clickbait = เสียความไว้ใจถาวร (skill ข้อ A2)
 * ความต่างระหว่าง "เปิดช่องว่าง" กับ "หลอกให้กด" อยู่ที่ปลายทางมีของจริงไหม — เท่านั้น
 */

describe('ตอนจบคลิปแบบค้าง ↔ บทความปลายทาง (content-link-contract B4)', () => {
  it.each(VIDEO_TOPICS)('$topic — ลิงก์สั้นต้องมีจริงและชี้ไปบทความที่มีอยู่', (t) => {
    const link = SHORT_LINKS[t.shortLink];
    expect(link, `${t.shortLink} ไม่มีใน SHORT_LINKS`).toBeDefined();
    const slug = link.path.replace('/blog/', '');
    expect(blogPostBySlug(slug), `ไม่มีบทความ ${slug}`).toBeDefined();
  });

  it.each(VIDEO_TOPICS)('$topic — คำถามที่ใช้ปิดคลิป ต้องมีคำตอบอยู่ในบทความจริง', (t) => {
    const slug = SHORT_LINKS[t.shortLink].path.replace('/blog/', '');
    const post = blogPostBySlug(slug)!;
    const questions = post.faq.map((f) => f.q);
    expect(questions, `บทความ ${slug} ไม่มี FAQ "${t.answeredBy}" — ตอนจบคลิปจะกลายเป็น clickbait`)
      .toContain(t.answeredBy);
  });

  it.each(VIDEO_TOPICS)('$topic — คำถามปิดคลิปต้องเป็นคำถามจริง ไม่ใช่คำโฆษณา', (t) => {
    expect(t.openLoop.length, 'สั้นเกินกว่าจะเป็นคำถามที่มีน้ำหนัก').toBeGreaterThan(25);
    // ต้องมีเครื่องหมายคำถาม หรือขึ้นต้นด้วยเงื่อนไข "ถ้า/ก่อน" ที่บังคับให้คิดถึงตัวเลขตัวเอง
    expect(/[?？]|^ถ้า|^ก่อน|^ราคาที่/.test(t.openLoop), t.openLoop).toBe(true);
  });

  it('ทุกตอนจบต้องพาไปปลายทางที่ถูก seg (Dynamic PLG) และบอกว่าฟรี', () => {
    for (const t of VIDEO_TOPICS) {
      const e = videoEnding(t);
      expect(e.pinned).toContain(`seg=${t.seg}`);
      expect(e.pinned).toContain('ฟรี ไม่ต้องสมัคร');
      expect(e.onScreen).toContain(t.shortLink);
      // คำถามต้องมาก่อนลิงก์เสมอ — ลิงก์ขึ้นก่อน = โฆษณา
      expect(e.spoken.indexOf(t.openLoop)).toBe(0);
    }
  });

  it('ห้ามบรรยายรูปแบบปลายทางเอง — ต้องใช้คำสัญญาที่ผูกกับบทความรายตัว', () => {
    // เคยพลาด: เขียน "ผมทำตารางไว้ให้แล้ว" ทุกหัวข้อ ทั้งที่ /ทุน กับ /ปาล์ม ไม่มีตาราง
    for (const t of VIDEO_TOPICS) {
      const sp = videoEnding(t).spoken;
      expect(sp, `${t.topic} ต้องพูดสิ่งที่ gives ระบุไว้`).toContain(t.gives);
      if (!t.gives.includes('ตาราง')) expect(sp, `${t.topic} อ้างว่ามีตาราง`).not.toContain('ตาราง');
    }
  });

  it('ห้ามสัญญาเกินจริงในตอนจบ (คำต้องห้ามชุดเดียวกับหน้าเว็บ)', () => {
    const banned = ['การันตี', 'รับรองว่า', 'รวยแน่', 'ได้เงินแน่', 'ปิดดีล'];
    for (const t of VIDEO_TOPICS) {
      const all = `${t.openLoop} ${videoEnding(t).spoken}`;
      for (const w of banned) expect(all, `${t.topic} มีคำต้องห้าม "${w}"`).not.toContain(w);
    }
  });
});
