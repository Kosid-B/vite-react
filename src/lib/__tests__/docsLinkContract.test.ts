import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { SHORT_LINKS, SOURCE_PRESETS, resolveShortLinkWithSource, shortLinkTarget } from '../shortLinks';
import { KEYWORD_OFFERS, tiktokPinnedComment, VIDEO_TOPICS, videoEnding } from '../commentReply';

/* ══════════════════════════════════════════════════════════════════════
 * สัญญาของ "ลิงก์ในเอกสารการตลาด" — เอกสารคือสิ่งที่คนหยิบไปโพสต์จริง
 *
 * 🔴 เกิดขึ้นจริง (เห็นจากภาพหน้าจอ TikTok 20 ส.ค. 2569): โพสต์บน TikTok ออกไปด้วยลิงก์
 *    `ceoaithailand.org/start?utm_source=youtube&utm_medium=shorts&utm_campaign=quote_ux`
 *    เพราะเอกสาร `quote-ux-capcut-copypaste.md` เขียน "bio link ทุกคลิป" ไว้เป็น URL เดียว
 *    ⇒ ① ถ้ามีคนกด รายงานจะโยนเครดิตให้ YouTube ทั้งที่มาจาก TikTok
 *      ② URL ยาวขนาดนั้นบน TikTok กดไม่ได้และพิมพ์ตามไม่ไหว = เท่ากับไม่มีลิงก์
 *
 * เทสต์นี้อ่านเอกสารตัวจริง ไม่ใช่โค้ด — เพราะจุดที่พลาดคือเอกสาร
 * ══════════════════════════════════════════════════════════════════════ */

const ROOT = resolve(__dirname, '../../../');
const MARKETING = join(ROOT, 'docs/marketing');

function mdFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return mdFiles(p);
    return name.endsWith('.md') ? [p] : [];
  });
}

const FILES = mdFiles(MARKETING);
const LINK_RE = /ceoaithailand\.org(\/[^\s"`)\]<>|*]*)/g;

interface Found { file: string; raw: string; path: string; query: string }

const links: Found[] = FILES.flatMap((f) => {
  const text = readFileSync(f, 'utf8');
  return [...text.matchAll(LINK_RE)].map((m) => {
    const [path, query = ''] = m[1].split('?') as [string, string?];
    return { file: relative(ROOT, f), raw: m[0], path, query };
  });
});

describe('ลิงก์ในเอกสารการตลาด', () => {
  it('มีลิงก์ให้ตรวจจริง (กันเทสต์ผ่านเพราะไม่เจออะไรเลย)', () => {
    expect(links.length).toBeGreaterThan(100);
  });

  it('ทุก `?s=` ต้องเป็นตัวย่อที่ระบบรู้จัก — ไม่งั้นถูกเหมาเป็น social ก้อนเดียว', () => {
    const bad = links
      .flatMap((l) => l.query.split('&').filter((kv) => kv.startsWith('s=')).map((kv) => ({ ...l, s: kv.slice(2) })))
      .filter((l) => !SOURCE_PRESETS[l.s]);
    expect(bad.map((b) => `${b.file}: ${b.raw}`)).toEqual([]);
  });

  it('ตัวย่อท้าย path (`/ราคา/ttc`) ต้องเป็นตัวย่อจริง และลิงก์สั้นต้องมีอยู่จริง', () => {
    const bad: string[] = [];
    for (const l of links) {
      const parts = l.path.split('/').filter(Boolean);
      if (parts.length < 2) continue;
      const head = '/' + parts[0];
      if (!SHORT_LINKS[head]) continue;           // ไม่ใช่ลิงก์สั้น = คนละเรื่อง (เช่น /oauth/google)
      if (!SOURCE_PRESETS[parts[1]]) bad.push(`${l.file}: ${l.raw}`);
    }
    expect(bad).toEqual([]);
  });

  it('ลิงก์สั้นทุกตัวที่เอกสารสั่งให้ใช้ ต้องพา Worker ไปที่ปลายทางจริงได้', () => {
    const shortLinkUses = links.filter((l) => SHORT_LINKS['/' + l.path.split('/').filter(Boolean)[0]]);
    expect(shortLinkUses.length).toBeGreaterThan(50);
    for (const l of shortLinkUses) {
      const { link, src } = resolveShortLinkWithSource(l.path);
      expect(link, `${l.file}: ${l.raw}`).toBeTruthy();
      const target = shortLinkTarget(link!, 'https://ceoaithailand.org', l.query ? `?${l.query}` : '', src);
      expect(target, `${l.file}: ${l.raw}`).toContain('utm_source=');
    }
  });
});

describe('🔴 ห้ามเขียน utm เองในชุดโพสต์ — นี่คือจุดที่ลิงก์ TikTok ติดแท็ก youtube', () => {
  const social = FILES.filter((f) => f.includes('/social/'));

  it.each(social.map((f) => relative(ROOT, f)))('%s', (rel) => {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    const handwritten = [...text.matchAll(/ceoaithailand\.org\/[^\s"`)\]<>|]*utm_source=[a-z_]+/g)].map((m) => m[0]);
    expect(
      handwritten,
      'ให้ใช้ลิงก์สั้น + ตัวย่อแพลตฟอร์ม (Worker ติด utm ให้เอง) แทนการเขียน utm ด้วยมือ ' +
      'เพราะลิงก์ที่เขียนมือจะถูกก๊อปข้ามแพลตฟอร์มแล้วเครดิตผิด',
    ).toEqual([]);
  });
});

describe('⭐ คอมเมนต์ปักหมุดต้องเป็นทางหลัก — ไบโอมีเพดาน ~13 คน/คลิป', () => {
  const packs = FILES.filter((f) => /READY-TO-POST|capcut-copypaste|LINK-SHEET/.test(f));

  it('มีชุดโพสต์ให้ตรวจ', () => expect(packs.length).toBeGreaterThanOrEqual(5));

  it.each(packs.map((f) => relative(ROOT, f)))('%s — ถ้ามีลิงก์ TikTok ต้องมีเส้นทางคอมเมนต์ (/ttc) ด้วย', (rel) => {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    // เกณฑ์คือ "มีลิงก์ไบโอของ TikTok อยู่จริง" ไม่ใช่ "เอ่ยถึง TikTok"
    // (บางไฟล์พูดถึง TikTok เพื่อบอกว่ากลุ่มเป้าหมายไม่ได้อยู่ที่นั่น — ไม่ต้องมีลิงก์)
    if (!/ceoaithailand\.org\/[^\s]*\?s=tt\b/.test(text)) return;
    expect(/ceoaithailand\.org\/[^\s]*\/ttc\b/.test(text), 'ต้องมีลิงก์แบบ /ttc (คอมเมนต์ปักหมุด) ไม่ใช่ไบโออย่างเดียว').toBe(true);
  });
});

describe('ข้อความคอมเมนต์ปักหมุดที่โค้ดสร้าง ต้องแยกช่องทางได้', () => {
  it('TikTok — ต้องติด /ttc ไม่งั้นวัดไม่ได้ว่าคอมเมนต์ชนะไบโอไหม', () => {
    for (const o of KEYWORD_OFFERS) {
      const t = tiktokPinnedComment(o);
      expect(t, o.keyword).toContain(`${o.shortLink}/ttc`);
      expect(t, `${o.keyword}: ห้ามมี https:// (พิมพ์ตามยากขึ้นเปล่า ๆ)`).not.toContain('https://');
      const { link, src } = resolveShortLinkWithSource(`${o.shortLink}/ttc`);
      expect(link, o.keyword).toBeTruthy();
      expect(src, o.keyword).toBe('ttc');
    }
  });

  it('ตัวหนังสือบนจอตอนจบคลิป ต้องติดตัวย่อด้วย — คนพิมพ์ตามจากที่เห็น', () => {
    for (const t of VIDEO_TOPICS) {
      const e = videoEnding(t);
      expect(e.onScreen, t.topic).toContain(`${t.shortLink}/ytv`);
      // ตรวจเฉพาะ "บรรทัดที่เป็นลิงก์" — คำถามปิดคลิปมีเครื่องหมาย ? ได้ตามปกติ
      const urlLine = e.onScreen.split('\n').find((x) => x.includes('ceoaithailand.org')) ?? '';
      expect(urlLine, `${t.topic}: ลิงก์บนจอห้ามมี ? หรือ = (มีอะไรให้ลืมพิมพ์)`).not.toMatch(/[?=]/);
    }
  });

  it('สามช่องทางของคลิปเดียวกันต้องแยกออกจากกันในรายงาน', () => {
    const t = VIDEO_TOPICS[0];
    const srcOf = (s: string) => new URL(s).searchParams.get('utm_medium');
    const desc = shortLinkTarget(SHORT_LINKS[t.shortLink], 'https://ceoaithailand.org', '?s=yt');
    const pin = shortLinkTarget(SHORT_LINKS[t.shortLink], 'https://ceoaithailand.org', '?s=ytc');
    const scr = shortLinkTarget(SHORT_LINKS[t.shortLink], 'https://ceoaithailand.org', '', 'ytv');
    expect(new Set([srcOf(desc), srcOf(pin), srcOf(scr)]).size).toBe(3);
  });
});
