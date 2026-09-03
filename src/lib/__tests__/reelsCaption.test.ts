import { describe, it, expect } from 'vitest';
import {
  reelsCaption, captionsFor, checkCaption, questionAt,
  CAPTION_PLATFORMS, TOPIC_HASHTAGS, BASE_HASHTAGS, TH_QUESTION_WORDS,
  type CaptionPlatform,
} from '../reelsCaption';
import { VIDEO_TOPICS } from '../commentReply';
import { SHORT_LINKS, SOURCE_PRESETS } from '../shortLinks';
import { blogPostBySlug } from '../blogData';

/* ══════════════════════════════════════════════════════════════════════════
 * เจ้าของส่งกรอบ "วิธีเขียนแคปชั่น Reels" มา (3 ก.ย. 2569) พร้อมตัวอย่าง 3 ชิ้น
 * กรอบใช้ได้ — แต่ตัวอย่างมีจุดที่จะติดด่านของเราเอง ⇒ ทำเป็น **กลไก** ไม่ใช่คำเตือนในแชต
 * (แชตหายไปกับ context window · โค้ดอยู่ต่อ — ledger #41)
 * ══════════════════════════════════════════════════════════════════════════ */

const PLATFORMS = Object.keys(CAPTION_PLATFORMS) as CaptionPlatform[];

describe('แคปชั่นประกอบจากหัวข้อจริง ไม่เขียนคำใหม่', () => {
  it('ทุกหัวข้อใน VIDEO_TOPICS สร้างแคปชั่นได้ครบทุกแพลตฟอร์ม', () => {
    for (const p of PLATFORMS) expect(captionsFor(p).length).toBe(VIDEO_TOPICS.length);
  });

  it('hook = openLoop ตัวเดิม · คุณค่า = gives ตัวเดิม (แก้ที่เดียว เปลี่ยนทุกที่)', () => {
    for (const t of VIDEO_TOPICS) {
      const c = reelsCaption(t, 'fbc');
      expect(c.text.startsWith(t.openLoop)).toBe(true);
      expect(c.text).toContain(t.gives);
    }
  });

  it('ตัวย่อแพลตฟอร์มทุกตัวต้องมีจริงใน SOURCE_PRESETS', () => {
    for (const p of PLATFORMS) expect(SOURCE_PRESETS[CAPTION_PLATFORMS[p].src]).toBeTruthy();
  });

  it('ลิงก์ปลายทางทุกอันต้องมีจริงใน SHORT_LINKS', () => {
    for (const t of VIDEO_TOPICS) expect(SHORT_LINKS[t.shortLink]).toBeTruthy();
  });

  it('ทุกหัวข้อต้องมีแฮชแท็กเฉพาะของตัวเอง — ห้ามใช้แต่แท็กกลาง', () => {
    for (const t of VIDEO_TOPICS) {
      expect(TOPIC_HASHTAGS[t.shortLink], `${t.shortLink} ไม่มีแฮชแท็ก`).toBeTruthy();
    }
    expect(BASE_HASHTAGS.length).toBeGreaterThan(0);
  });
});

describe('แคปชั่นที่ระบบสร้างเอง ต้องผ่านด่านของตัวเอง', () => {
  it('ทุกแคปชั่น × ทุกแพลตฟอร์ม ต้องไม่มี blocker', () => {
    for (const p of PLATFORMS) {
      for (const t of VIDEO_TOPICS) {
        const c = reelsCaption(t, p);
        const blockers = checkCaption(c.text, t.shortLink).filter((i) => i.level === 'blocker');
        expect(blockers, `${t.topic}/${p}: ${JSON.stringify(blockers)}`).toEqual([]);
      }
    }
  });

  it('แฮชแท็กอยู่ในช่วง 5–8 คำทุกชิ้น', () => {
    for (const t of VIDEO_TOPICS) {
      const tags = reelsCaption(t, 'fb').text.match(/#[^\s#]+/g) ?? [];
      expect(tags.length).toBeGreaterThanOrEqual(5);
      expect(tags.length).toBeLessThanOrEqual(8);
    }
  });
});

describe('🔴 คำถามไทยไม่ต้องมีเครื่องหมาย ? (บั๊กที่เจอตอนสร้างของจริง)', () => {
  it('"…จะมาจากไหน" ต้องนับเป็นคำถาม', () => {
    expect(questionAt('ลูกค้า 10 คนถัดไปของคุณจะมาจากไหน')).toBeGreaterThanOrEqual(0);
  });

  it('ประโยคบอกเล่าล้วน ต้องไม่ถูกนับเป็นคำถาม', () => {
    expect(questionAt('เราขายของราคาถูก')).toBe(-1);
  });

  it('รายการคำถามไทยต้องครอบคลุมคำที่ใช้จริงในหัวข้อทั้งหมด', () => {
    for (const t of VIDEO_TOPICS) {
      expect(questionAt(t.openLoop), `openLoop ไม่เป็นคำถาม: ${t.topic}`).toBeGreaterThanOrEqual(0);
    }
    expect(TH_QUESTION_WORDS).toContain('ไหน');
  });
});

describe('ด่านที่กันความผิดจากกรอบแคปชั่นทั่วไปในตลาด', () => {
  const LINK = 'ceoaithailand.org/ลูกค้า?s=fbc&seg=seller';

  it('ลิงก์เปล่าไม่ติดตัวย่อ = blocker (กองระบุแพลตฟอร์มไม่ได้ วันนี้ 97.5%)', () => {
    const bad = `ลูกค้าคนถัดไปมาจากไหน\n\n👉 ceoaithailand.org/ลูกค้า`;
    expect(checkCaption(bad).some((i) => i.level === 'blocker' && /ตัวย่อ/.test(i.what))).toBe(true);
  });

  it('ลิงก์มาก่อนคำถาม = blocker (ลิงก์ก่อน = โฆษณา)', () => {
    const bad = `กดเลย 👉 ${LINK}\n\nแล้วลูกค้าคุณมาจากไหน`;
    expect(checkCaption(bad).some((i) => /ลิงก์มาก่อนคำถาม/.test(i.what))).toBe(true);
  });

  it('บรรทัดแรกเป็นคำทักทาย = blocker', () => {
    const bad = `สวัสดีครับ วันนี้มาคุยเรื่องลูกค้า\n\nมาจากไหน\n👉 ${LINK}`;
    expect(checkCaption(bad).some((i) => /คำทักทาย/.test(i.what))).toBe(true);
  });

  it('🔴 อ้างตัวเลขที่บทความปลายทางไม่มี = blocker (หลอกให้กด)', () => {
    const bad = `ลูกค้าคุณมาจากไหน\n\nผู้ประกอบการ 93.7% ทำผิดข้อนี้\n👉 ${LINK}`;
    const found = checkCaption(bad, '/ลูกค้า');
    expect(found.some((i) => i.level === 'blocker' && /93.7/.test(i.what))).toBe(true);
  });

  it('🟢 อ้างตัวเลขที่บทความปลายทางมีจริง = ผ่าน (สถิติ CMMU อยู่ในบทความเราแล้ว)', () => {
    const post = blogPostBySlug('why-ai-doesnt-recommend-you');
    expect(post?.description).toContain('56.2');   // ยืนยันว่ามีจริงก่อนใช้
    const ok = `คนไทย 56.2% พร้อมเปลี่ยนแบรนด์ตามที่ AI แนะนำ — แล้ว AI พูดถึงร้านคุณว่าอะไร\n\n👉 ceoaithailand.org/ค้นเจอ?s=fbc&seg=newbie`;
    expect(checkCaption(ok, '/ค้นเจอ').filter((i) => i.level === 'blocker')).toEqual([]);
  });

  it('ตัวเลขที่ชี้ไปเครื่องคำนวณ ไม่ถือเป็นคำกล่าวอ้าง (คำนวณจากเลขที่ผู้ใช้ใส่เอง)', () => {
    const ok = `ขึ้นราคา 10% เสียลูกค้าได้กี่ %\n\n👉 ceoaithailand.org/ราคา?s=fbc&seg=seller`;
    expect(checkCaption(ok, '/ราคา').filter((i) => i.level === 'blocker')).toEqual([]);
  });
});
