/* reelsCaption — แคปชั่น Reels/โพสต์สั้น (Facebook · Instagram · TikTok)
 *
 * 🔴 ช่องว่างที่ไฟล์นี้ปิด: `commentReply.ts` มีตอนจบคลิป + คำบรรยาย/คอมเมนต์ **YouTube** ครบแล้ว
 *    แต่ **แคปชั่นฝั่ง Reels ยังไม่มี** ⇒ เวลาลงจริงต้องเขียนมือทุกครั้ง = หลุดกฎทีละนิด
 *
 * ⚠️ **ไม่เขียนคำโฆษณาใหม่ในไฟล์นี้** — ประกอบจาก `VIDEO_TOPICS` ตัวเดิมทั้งหมด
 *    (`openLoop` = hook · `gives` = คุณค่า · `shortLink`+`seg` = ปลายทาง)
 *    ⇒ แก้หัวข้อที่เดียว แคปชั่นทุกแพลตฟอร์มเปลี่ยนตาม · ไม่มีทางพูดไม่ตรงกัน
 *
 * 🔴 กฎที่ต่างจากกรอบแคปชั่นทั่วไปในตลาด (และเป็นเหตุผลที่ต้องมี `checkCaption`):
 *   ① **คำถามมาก่อนลิงก์เสมอ** — ลิงก์ก่อน = โฆษณา · คำถามก่อน = บทสนทนา
 *   ② **ลิงก์ต้องติดตัวย่อแพลตฟอร์ม** (`?s=fbc`) — ไม่งั้นเข้ากอง "ระบุแพลตฟอร์มไม่ได้"
 *      ซึ่งวันนี้อยู่ที่ **97.5%** ของผู้เข้าชมทั้งหมด (ลิงก์เปล่า = ปล่อยแล้ววัดไม่ได้)
 *   ③ **อ้างตัวเลขได้ก็ต่อเมื่อตัวเลขนั้นอยู่ในบทความปลายทางจริง** (`content-link-contract`)
 *      ⇒ "กดอ่านสรุปงานวิจัยฉบับเต็ม" ที่ปลายทางไม่มีงานวิจัย = หลอกให้กด
 *
 * pure ทั้งไฟล์ · ไม่แตะฐานข้อมูล
 */

import { VIDEO_TOPICS, type VideoTopic } from './commentReply';
import { SHORT_LINKS } from './shortLinks';
import { blogPostBySlug } from './blogData';
import { violatesBrand } from './brandBrief';

/** ตัวย่อช่องทางของแต่ละแพลตฟอร์ม — ต้องมีจริงใน `SOURCE_PRESETS` */
export const CAPTION_PLATFORMS = {
  fbc: { label: 'Facebook — คอมเมนต์ปักหมุด', src: 'fbc' },
  fb: { label: 'Facebook — โพสต์', src: 'fb' },
  ttc: { label: 'TikTok — คอมเมนต์', src: 'ttc' },
  tt: { label: 'TikTok — ไบโอ', src: 'tt' },
} as const;
export type CaptionPlatform = keyof typeof CAPTION_PLATFORMS;

/** แฮชแท็กกลางที่ใช้ได้ทุกชิ้น — 5–8 คำพอดี เกินนั้นไม่ช่วยและอ่านยาก */
export const BASE_HASHTAGS: readonly string[] = ['#ธุรกิจ', '#SME', '#Thailand'];

/** แฮชแท็กเฉพาะหัวข้อ — ผูกกับ `VIDEO_TOPICS[].shortLink` เพื่อไม่ให้หลุดจากหัวข้อจริง */
export const TOPIC_HASHTAGS: Record<string, readonly string[]> = {
  '/ราคา': ['#ตั้งราคา', '#ต้นทุน', '#กำไร'],
  '/ทุน': ['#เริ่มธุรกิจ', '#ไม่มีทุน', '#อาชีพเสริม'],
  '/ลูกค้า': ['#หาลูกค้า', '#การตลาดออนไลน์', '#ไม่ยิงแอด'],
  '/ปาล์ม': ['#สวนปาล์ม', '#เกษตรกร', '#ราคาผลผลิต'],
};

export interface Caption {
  topic: string;
  platform: CaptionPlatform;
  /** ข้อความเต็มพร้อมวาง */
  text: string;
  /** ลิงก์ปลายทางที่ประกอบแล้ว */
  url: string;
}

/** ประกอบแคปชั่นจากหัวข้อจริง — โครง: hook → คุณค่า → คำถาม → CTA+ลิงก์ → แฮชแท็ก */
export function reelsCaption(
  t: VideoTopic,
  platform: CaptionPlatform,
  origin = 'ceoaithailand.org',
): Caption {
  const url = `${origin}${t.shortLink}?s=${CAPTION_PLATFORMS[platform].src}&seg=${t.seg}`;
  const tags = [...(TOPIC_HASHTAGS[t.shortLink] ?? []), ...BASE_HASHTAGS];
  const text = [
    // ① hook = บรรทัดแรก · ใช้ openLoop ตัวเดิม (คำถามที่ตอบไม่ได้ถ้าไม่รู้ตัวเลขตัวเอง)
    t.openLoop,
    '',
    // ② คุณค่า — สิ่งที่เขาจะได้ · ไม่ใช่สิ่งที่ระบบเรามี
    `${t.gives} — ฟรี ไม่ต้องสมัคร`,
    '',
    // ③ CTA เดียว พร้อมลิงก์ที่ติดตัวย่อแพลตฟอร์มแล้ว
    `👉 ${url}`,
    '',
    tags.join(' '),
  ].join('\n');
  return { topic: t.topic, platform, text, url };
}

/** แคปชั่นทุกหัวข้อ × แพลตฟอร์มเดียว — ใช้ตอนวางแผนลงคอนเทนต์ */
export function captionsFor(platform: CaptionPlatform, origin?: string): Caption[] {
  return VIDEO_TOPICS.map((t) => reelsCaption(t, platform, origin));
}

export interface CaptionIssue { level: 'blocker' | 'warn'; what: string; fix: string }

/** สแกนหาตัวเลขที่เป็น "คำกล่าวอ้าง" — เปอร์เซ็นต์ และจำนวนเงิน/จำนวนคนหลักพันขึ้นไป */
function claimedNumbers(text: string): string[] {
  return [...text.matchAll(/\d+(?:\.\d+)?\s*%/g)].map((m) => m[0].replace(/\s+/g, ''));
}

/** คำที่ทำให้ประโยคไทยเป็นคำถาม — ภาษาไทยไม่บังคับเครื่องหมาย `?` */
export const TH_QUESTION_WORDS: readonly string[] = [
  'ไหม', 'หรือเปล่า', 'รึเปล่า', 'ที่ไหน', 'ไหน', 'อะไร', 'ยังไง', 'อย่างไร',
  'เท่าไหร่', 'เท่าไร', 'กี่', 'ทำไม', 'เมื่อไร', 'เมื่อไหร่', 'ใคร',
];

/** ตำแหน่งคำถามแรกในข้อความ — `-1` เมื่อไม่พบ */
export function questionAt(text: string): number {
  const marks = [text.indexOf('?'), ...TH_QUESTION_WORDS.map((w) => text.indexOf(w))];
  const found = marks.filter((i) => i >= 0);
  return found.length ? Math.min(...found) : -1;
}

/** ข้อความทั้งหมดของบทความปลายทาง (ไว้ตรวจว่าตัวเลขที่อ้างมีอยู่จริง)
 *  คืน `null` เมื่อปลายทาง **ไม่ใช่บทความ** (เช่น `/calc` = เครื่องคำนวณ)
 *  ⚠️ เครื่องคำนวณไม่ได้ "อ้างสถิติ" — มันคำนวณเลขที่ผู้ใช้ใส่เอง
 *     ⇒ ตัวเลขในแคปชั่นที่ชี้ไปเครื่องคำนวณ เป็นตัวอย่างให้ลองกด ไม่ใช่คำกล่าวอ้างเรื่องตลาด */
function destinationText(shortLink: string): string | null {
  const link = SHORT_LINKS[shortLink];
  if (!link || !link.path.startsWith('/blog/')) return null;
  const slug = link.path.replace(/^\/blog\//, '');
  const post = blogPostBySlug(slug);
  if (!post) return null;
  return [
    post.title, post.description, post.lead,
    ...post.sections.flatMap((s) => [s.h2, ...s.paras, ...(s.bullets ?? [])]),
    ...post.faq.flatMap((f) => [f.q, f.a]),
  ].join(' ');
}

/** ตรวจแคปชั่นก่อนปล่อย — คืนรายการปัญหา (ว่าง = ผ่าน) */
export function checkCaption(text: string, shortLink?: string): CaptionIssue[] {
  const out: CaptionIssue[] = [];
  const lines = text.split('\n');
  const hook = (lines[0] ?? '').trim();

  // ① hook
  if (!hook) {
    out.push({ level: 'blocker', what: 'ไม่มีบรรทัดแรก', fix: 'ขึ้นต้นด้วยคำถาม/ปัญหาทันที' });
  } else {
    // ⚠️ ห้ามใช้ `\b` กับคำไทย — อักษรไทยไม่ใช่ word character ใน regex ของ JS
    //    ⇒ /^สวัสดี\b/ ไม่แมตช์ "สวัสดีครับ" (ระหว่าง "ี" กับ "ค" ไม่มีขอบคำ)
    if (/^(สวัสดี|ทักทาย|วันนี้เรามาดู)/.test(hook) || /^(hello|hi)\b/i.test(hook)) {
      out.push({ level: 'blocker', what: 'บรรทัดแรกเป็นคำทักทาย', fix: 'ตัดคำเกริ่นทิ้ง ยิงปัญหา/คำถามเลย' });
    }
    if (hook.length > 90) {
      out.push({ level: 'warn', what: `บรรทัดแรกยาว ${hook.length} ตัวอักษร`, fix: 'สั้นลงให้จบใน 1 บรรทัด ไม่ต้องกด "ดูเพิ่มเติม"' });
    }
  }

  // ② คำต้องห้ามของแบรนด์ (ด่านเดียวกับคอนเทนต์ทุกชิ้น)
  for (const v of violatesBrand(text)) {
    out.push({ level: 'blocker', what: `คำต้องห้าม: ${v}`, fix: 'ดู brandBrief.FORBIDDEN_PHRASES' });
  }

  // ③ ลิงก์ต้องติดตัวย่อแพลตฟอร์ม
  const hasLink = /ceoaithailand\.org\//.test(text);
  if (!hasLink) {
    out.push({ level: 'blocker', what: 'ไม่มีลิงก์ปลายทาง', fix: 'ใส่ลิงก์สั้นที่มีจริงใน SHORT_LINKS' });
  } else if (!/\?s=/.test(text)) {
    out.push({
      level: 'blocker', what: 'ลิงก์ไม่ติดตัวย่อแพลตฟอร์ม',
      fix: 'เติม ?s=fbc / ?s=ttc — ลิงก์เปล่าเข้ากอง "ระบุแพลตฟอร์มไม่ได้" (วันนี้ 97.5%)',
    });
  }

  // ④ คำถามต้องมาก่อนลิงก์
  //    🔴 คำถามไทยส่วนใหญ่ไม่มีเครื่องหมาย `?` — ตัวตรวจรุ่นแรกหาแค่ `?`/"ไหม"
  //       แล้วฟ้องแคปชั่นที่ลงท้ายว่า "…จะมาจากไหน" ซึ่งเป็นคำถามเต็มตัว
  //       (เจอตอนสร้างของจริง ไม่ใช่ตอนคิดกฎ — ledger #68)
  const qAt = questionAt(text);
  const linkAt = text.search(/ceoaithailand\.org/);
  if (hasLink && (qAt === -1 || qAt > linkAt)) {
    out.push({
      level: 'blocker', what: 'ลิงก์มาก่อนคำถาม',
      fix: 'ลิงก์ก่อน = โฆษณา · คำถามก่อน = บทสนทนา (videoEndingContract)',
    });
  }

  // ⑤ แฮชแท็ก 5–8
  const tags = text.match(/#[^\s#]+/g) ?? [];
  if (tags.length > 0 && (tags.length < 5 || tags.length > 8)) {
    out.push({ level: 'warn', what: `แฮชแท็ก ${tags.length} คำ`, fix: 'ใช้ 5–8 คำ' });
  }

  // ⑥ 🔴 ตัวเลขที่อ้าง ต้องมีในบทความปลายทางจริง
  if (shortLink) {
    const dest = destinationText(shortLink);
    for (const n of claimedNumbers(text)) {
      // ปลายทางไม่ใช่บทความ (เครื่องมือ) = ไม่มีคำกล่าวอ้างให้ตรวจ ⇒ ข้าม
      if (dest === null) continue;
      if (!dest.includes(n.replace('%', ''))) {
        out.push({
          level: 'blocker', what: `อ้างตัวเลข ${n} ที่บทความปลายทางไม่มี`,
          fix: 'ตัวเลขที่ปลายทางไม่มี = หลอกให้กด · ใส่ตัวเลขลงบทความก่อน หรือตัดออกจากแคปชั่น',
        });
      }
    }
  }

  return out;
}
