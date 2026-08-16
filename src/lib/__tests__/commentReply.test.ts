import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  parseNumbers, buildReply, replySwapped, REPLY_NEED_NUMBERS,
  KEYWORD_OFFERS, FOCUS_OFFERS, dmForKeyword, tiktokPinnedComment,
  VIDEO_TOPICS, youtubeDescription, youtubePinnedComment,
} from '../commentReply';
import { SHORT_LINKS, SOURCE_PRESETS } from '../shortLinks';
import { BLOG_POSTS } from '../blogData';
import { priceScenario } from '../pricingAnalysis';
import { startHeroFor } from '../startHero';
import { segmentFor } from '../heroVariant';

describe('อ่านตัวเลขจากคอมเมนต์ที่คนพิมพ์จริง', () => {
  it.each([
    ['50/30', 50, 30],
    ['50 30', 50, 30],
    ['ขาย 50 ทุน 30', 50, 30],
    ['ราคา 1,500 ต้นทุน 900', 1500, 900],
    ['๕๐/๓๐', 50, 30],                      // เลขไทย
    ['ขายชิ้นละ 89.50 ต้นทุน 42.25 ครับ', 89.5, 42.25],
  ])('อ่าน "%s" ได้ราคา %i ต้นทุน %i', (text, price, cost) => {
    const p = parseNumbers(text);
    expect(p?.price).toBe(price);
    expect(p?.cost).toBe(cost);
    expect(p?.suspectSwapped).toBe(false);
  });

  it('ข้ามตัวเลขที่ติด % (เช่น "ลด 10%") เพราะไม่ใช่ราคา', () => {
    expect(parseNumbers('ลด 10% แล้วขาย 50 ทุน 30')).toMatchObject({ price: 50, cost: 30 });
  });

  it('มีเลขไม่ครบ 2 ตัว → null (ห้ามเดา — ตอบผิดในที่สาธารณะเสียหายกว่าไม่ตอบ)', () => {
    expect(parseNumbers('สนใจครับ')).toBeNull();
    expect(parseNumbers('ขาย 50')).toBeNull();
    expect(parseNumbers('')).toBeNull();
    expect(REPLY_NEED_NUMBERS).toContain('50/30');
  });

  it('ต้นทุนมากกว่าราคา → ตั้งธงว่าอาจพิมพ์สลับ ไม่คำนวณให้เลย', () => {
    const p = parseNumbers('30/50');
    expect(p?.suspectSwapped).toBe(true);
    const r = buildReply(p!, { channel: 'comment' });
    expect(r).toBe(replySwapped(p!));
    expect(r).toContain('ใช่ไหมครับ');
    // ต้องไม่สรุปว่าเขาขาดทุน
    expect(r).not.toContain('ขาดทุน');
  });
});

describe('คำตอบในคอมเมนต์ — ตัวเลขต้องตรงกับที่คำนวณบนหน้าเว็บ', () => {
  const p = parseNumbers('50/30')!;

  it('กำไรต่อชิ้นและ % ถูก', () => {
    const r = buildReply(p, { channel: 'comment' });
    expect(r).toContain('กำไรต่อชิ้น 20 บาท (40%)');
  });

  it('ขึ้นราคา 10% → เสียลูกค้าได้ 20% (ตรงกับสูตร y = 1 − m/m′)', () => {
    expect(buildReply(p, { channel: 'comment' })).toContain('เสียลูกค้าได้ถึง 20%');
  });

  it('ลดราคา 10% → ต้องขายเพิ่ม 33.33%', () => {
    expect(buildReply(p, { channel: 'comment' })).toContain('ต้องขายเพิ่มอีก 33.33%');
  });

  it('ลดแล้วต่ำกว่าทุน → บอกตรง ๆ ว่าทำไม่ได้ ไม่คืนตัวเลขหลอก', () => {
    const thin = parseNumbers('50/48')!;
    const r = buildReply(thin, { channel: 'comment' });
    expect(r).toContain('ต่ำกว่าต้นทุนแล้ว');
  });

  it('บอกที่มาของตัวเลขเสมอ — กันคนเข้าใจว่าเป็นค่าเฉลี่ยตลาด', () => {
    expect(buildReply(p, { channel: 'comment' })).toContain('ไม่ใช่ค่าเฉลี่ยของใคร');
  });
});

describe('กฎของช่องทาง — คอมเมนต์ห้ามมีลิงก์', () => {
  const p = parseNumbers('50/30')!;

  it('คำตอบในคอมเมนต์ต้องไม่มีลิงก์เลย (เฟซบุ๊กลดการมองเห็นโพสต์ที่พาคนออกนอก)', () => {
    const r = buildReply(p, { channel: 'comment', link: 'https://ceoaithailand.org/ราคา' });
    expect(r).not.toContain('http');
    expect(r).not.toContain('ceoaithailand');
    expect(r).toContain('ทักแชท');   // ดึงเข้าแชทแทน
  });

  it('คำตอบในแชทใส่ลิงก์ได้', () => {
    const r = buildReply(p, { channel: 'dm', link: 'https://ceoaithailand.org/ราคา?s=fb' });
    expect(r).toContain('https://ceoaithailand.org/ราคา?s=fb');
  });

  it('ไม่สัญญาผลลัพธ์ทางธุรกิจ และไม่อ้างค่าเฉลี่ยตลาด', () => {
    const all = [
      buildReply(p, { channel: 'comment' }),
      buildReply(p, { channel: 'dm', link: 'x' }),
      replySwapped(p), REPLY_NEED_NUMBERS,
    ].join(' ');
    for (const bad of ['การันตี', 'รับรองว่า', 'ค่าเฉลี่ยอุตสาหกรรม', 'ราคาตลาด', 'ยอดขายเพิ่มแน่นอน']) {
      expect(all, `มีคำว่า "${bad}"`).not.toContain(bad);
    }
  });
});

describe('โพสต์แบบคอมเมนต์คำเดียว — ลิงก์ต้องมีอยู่จริง', () => {
  it('ทุกคำที่ให้คนพิมพ์ ผูกกับลิงก์สั้นที่มีจริงใน SHORT_LINKS', () => {
    for (const o of KEYWORD_OFFERS) {
      expect(SHORT_LINKS[o.shortLink], `${o.keyword} → ${o.shortLink}`).toBeTruthy();
    }
  });

  it('คำสั้น พิมพ์ง่าย (ไม่เกิน 8 ตัวอักษร) และไม่ซ้ำกัน', () => {
    for (const o of KEYWORD_OFFERS) expect(o.keyword.length, o.keyword).toBeLessThanOrEqual(8);
    expect(new Set(KEYWORD_OFFERS.map((o) => o.keyword)).size).toBe(KEYWORD_OFFERS.length);
  });

  it('ข้อความในแชทมีลิงก์เต็ม + ติด ?s=fb เพื่อวัดที่มาได้', () => {
    const dm = dmForKeyword(KEYWORD_OFFERS[0]);
    expect(dm).toContain('https://ceoaithailand.org/ราคา?s=fb');
    expect(dm).toContain('อ่านฟรี ไม่ต้องสมัคร');
  });

  it('ข้อความในแชทสั้น — ให้ของก่อน ไม่ขายทันที', () => {
    for (const o of KEYWORD_OFFERS) {
      const dm = dmForKeyword(o);
      expect(dm.length, o.keyword).toBeLessThan(260);
      expect(dm).not.toContain('฿');       // ไม่พูดเรื่องราคาแพ็กในข้อความแรก
      expect(dm).not.toContain('สมัครเลย');
    }
  });
});

describe('โฟกัสกลุ่มเป้าหมาย — Gen X/Y/Z + SME ที่กำลังเริ่ม/ทำธุรกิจ', () => {
  /* ทำไมต้องมีเทสต์: ถ้าโพสต์คำที่พูดกับคนละกลุ่มพร้อมกัน จะอ่านผลไม่ออกว่าคำไหนดึงใครมา
   * (บทเรียนเดียวกับที่เคยสรุปผิดจากกลุ่มตัวอย่างเล็ก — LESSONS-LEDGER ข้อ 1)
   * ธง focus จึงต้องตรงกับเอกสารที่ User ใช้โพสต์จริงเสมอ */
  const PACK = 'docs/marketing/social/FB-LEAD-MAGNET-PACK.md';
  const pack = readFileSync(PACK, 'utf8');

  it('รอบนี้โฟกัส 3 คำ: ราคา · ทุน · ลูกค้า (ระบบ = คนละจังหวะ เก็บรอบถัดไป)', () => {
    expect(FOCUS_OFFERS.map((o) => o.keyword)).toEqual(['ราคา', 'ทุน', 'ลูกค้า']);
    expect(KEYWORD_OFFERS.find((o) => o.keyword === 'ระบบ')?.focus).toBe(false);
  });

  it('ทุกคำที่โฟกัส มีโพสต์จริงในชุดที่ใช้โพสต์', () => {
    for (const o of FOCUS_OFFERS) {
      expect(pack, `ไม่มีโพสต์สำหรับคำว่า "${o.keyword}"`)
        .toContain(`พิมพ์คำว่า "${o.keyword}" ในคอมเมนต์`);
    }
  });

  it('คำที่ยังไม่โฟกัส ต้องอยู่ใต้หัวข้อ "เก็บไว้รอบถัดไป" ไม่ปนในลำดับโพสต์สัปดาห์แรก', () => {
    const later = pack.indexOf('## 🕓 เก็บไว้รอบถัดไป');
    expect(later, 'ไม่พบหัวข้อเก็บไว้รอบถัดไป').toBeGreaterThan(0);
    const schedule = pack.slice(pack.indexOf('## ลำดับการโพสต์ที่แนะนำ'), later);
    for (const o of KEYWORD_OFFERS.filter((x) => !x.focus)) {
      expect(pack.indexOf(`พิมพ์คำว่า "${o.keyword}" ในคอมเมนต์`), o.keyword).toBeGreaterThan(later);
      expect(schedule, `${o.keyword} ยังอยู่ในตารางโพสต์สัปดาห์แรก`)
        .not.toContain(`โพสต์ C (\`${o.keyword}\`)`);
    }
  });

  it('เอกสารต้องไม่บอกให้ "รอให้ธุรกิจโตก่อน" (ขัดหลัก iso-from-day-one)', () => {
    for (const bad of ['รอให้ธุรกิจโตก่อน', 'ค่อยทำ ISO ตอนโต', 'ธุรกิจเล็กยังไม่ต้อง']) {
      expect(pack, `มีคำว่า "${bad}"`).not.toContain(bad);
    }
  });
});

describe('สัญญาในโพสต์ ต้องมีอยู่จริงในบทความปลายทาง', () => {
  /* เคยพลาดจริง (16 ส.ค. 2569): โพสต์คำว่า "ราคา" สัญญา 3 ข้อ
   *   — ขึ้นราคาเสียลูกค้าได้กี่ % / ลดราคาต้องขายเพิ่มเท่าไหร่ / ตั้งราคาจากคุณค่า
   * แต่บทความ pricing-no-loss มีแค่ข้อสุดท้าย → คนกดเข้ามาแล้วไม่เจอสิ่งที่สัญญา
   * เทสต์นี้ผูก "คำสัญญาในชุดโพสต์" เข้ากับ "เนื้อหาบทความจริง" ให้ drift ไม่เงียบ */
  const post = BLOG_POSTS.find((p) => p.slug === 'pricing-no-loss')!;
  const body = [post.lead, ...post.sections.flatMap((s) => [s.h2, ...s.paras, ...(s.bullets ?? [])]),
    ...post.faq.flatMap((f) => [f.q, f.a])].join('\n');

  it('บทความราคาต้องตอบทั้งขึ้นราคาและลดราคา ไม่ใช่แค่สูตรต้นทุน', () => {
    expect(body).toContain('เสียลูกค้าได้');
    expect(body).toContain('ต้องขายเพิ่ม');
  });

  it('ตัวเลขตัวอย่างในบทความ ตรงกับที่โมดูลคำนวณจริง (ห้ามเขียนเลขด้วยมือ)', () => {
    const input = { biz: 'all' as const, price: 50, cost: 30 };
    const up = priceScenario(input, 10);
    const down = priceScenario(input, -10);
    // ตัวเลขที่พิมพ์ไว้ในบทความต้องเป็นตัวเดียวกับที่ระบบตอบในคอมเมนต์/หน้าเว็บ
    expect(body).toContain(`${up.breakEvenVolumePct}%`);
    expect(body).toContain(`${Math.abs(down.breakEvenVolumePct!)}%`);
    expect(buildReply(parseNumbers('50/30')!, { channel: 'comment' }))
      .toContain(`${up.breakEvenVolumePct}%`);
  });

  it('บทความปลายทางทั้ง 3 คำ พูดกับคนที่กำลังเริ่ม/ทำธุรกิจ ไม่ใช่องค์กรที่ระบบเดินแล้ว', () => {
    for (const o of FOCUS_OFFERS) {
      const slug = SHORT_LINKS[o.shortLink].path.replace('/blog/', '');
      const p = BLOG_POSTS.find((b) => b.slug === slug);
      expect(p, `${o.keyword} → ไม่พบบทความ ${slug}`).toBeTruthy();
      // ห้ามใช้ศัพท์มาตรฐาน/ข้อกำหนดในบทความประตูหน้า (ตกลงกับ User 16 ส.ค. 2569)
      const text = [p!.title, p!.lead, ...p!.sections.map((s) => s.h2)].join(' ');
      for (const jargon of ['ข้อกำหนด', 'ISO 9001', 'มาตรฐานสากล', 'ผู้ตรวจประเมิน']) {
        expect(text, `${slug} มีศัพท์ "${jargon}" ในหัวข้อ`).not.toContain(jargon);
      }
    }
  });
});

describe('จุลภาค — เคยพลาดจริง (1,500 อ่านเป็น 1)', () => {
  it('จุลภาคคั่นหลักพันต้องถูกลบ ไม่ใช่แทนด้วยช่องว่าง', () => {
    expect(parseNumbers('1,500/900')).toMatchObject({ price: 1500, cost: 900 });
    expect(parseNumbers('ราคา 1,250,000 ทุน 980,000')).toMatchObject({ price: 1250000, cost: 980000 });
  });

  it('จุลภาคที่ใช้คั่นค่า (มีช่องว่างตาม) ยังแยกได้ถูก', () => {
    expect(parseNumbers('50, 30')).toMatchObject({ price: 50, cost: 30 });
  });
});

describe('TikTok — คอมเมนต์คือทางเดียวที่ข้ามเพดาน "ต้องเข้าโปรไฟล์ก่อน"', () => {
  /* วัดได้จริง 16 ส.ค. 2569: คลิปได้ 15,900 วิว แต่เข้าโปรไฟล์แค่ 11 คน
   * ลิงก์อยู่ในไบโอเท่านั้น → เพดานคนกดลิงก์ = 11 ไม่ว่าคลิปจะดังแค่ไหน */

  it('คอมเมนต์ปักหมุดต้องมีลิงก์ที่ "พิมพ์ตามได้" ไม่ใช่ลิงก์ยาว', () => {
    for (const o of FOCUS_OFFERS) {
      const t = tiktokPinnedComment(o);
      expect(t, o.keyword).toContain(`ceoaithailand.org${o.shortLink}`);
      expect(t, `${o.keyword} มี https:// ทำให้พิมพ์ตามยากขึ้นโดยไม่จำเป็น`).not.toContain('https://');
      expect(t.length, `${o.keyword} ยาวเกินกว่าจะอ่านจบใน 2 วินาที`).toBeLessThan(140);
      expect(t).toContain('ไม่ต้องสมัคร');
    }
  });

  it('ลิงก์ในคอมเมนต์ปักหมุดต้องมีอยู่จริงใน SHORT_LINKS', () => {
    for (const o of FOCUS_OFFERS) expect(SHORT_LINKS[o.shortLink], o.keyword).toBeTruthy();
  });

  it('คำตอบช่อง tiktok ให้ลิงก์แบบพิมพ์ตาม (ต่างจาก FB คอมเมนต์ที่ห้ามมีลิงก์เลย)', () => {
    const p = parseNumbers('50/30')!;
    const tt = buildReply(p, { channel: 'tiktok' });
    expect(tt).toContain('ceoaithailand.org/ราคา');
    expect(tt).not.toContain('https://');
    // FB คอมเมนต์ยังห้ามมีลิงก์เหมือนเดิม — กฎคนละแพลตฟอร์มต้องไม่ปนกัน
    expect(buildReply(p, { channel: 'comment' })).not.toContain('ceoaithailand.org');
  });

  it('มีแหล่งที่มาแยก "คอมเมนต์" ออกจาก "ไบโอ" ไม่งั้นพิสูจน์ไม่ได้ว่ากลไกใหม่ได้ผล', () => {
    expect(SOURCE_PRESETS.ttc, 'ไม่มี ttc = แยกคอมเมนต์ออกจากไบโอไม่ได้').toBeTruthy();
    expect(SOURCE_PRESETS.ttc.medium).toBe('comment');
    expect(SOURCE_PRESETS.tt.medium).toBe('bio');
    expect(SOURCE_PRESETS.ttc.source).toBe(SOURCE_PRESETS.tt.source);
  });
});

describe('YouTube Shorts — ลิงก์กดได้จริง จึงต้องใช้คนละแบบกับ TikTok', () => {
  it('ทุกหัวข้อคลิปมีบทความรองรับจริง', () => {
    for (const t of VIDEO_TOPICS) {
      expect(SHORT_LINKS[t.shortLink], t.topic).toBeTruthy();
    }
  });

  it('คำบรรยายและคอมเมนต์ปักหมุดใช้ลิงก์เต็ม + ติด ?s=yt (กดได้ทันที)', () => {
    for (const t of VIDEO_TOPICS) {
      for (const text of [youtubeDescription(t), youtubePinnedComment(t)]) {
        expect(text, t.topic).toContain(`https://ceoaithailand.org${t.shortLink}?s=yt&seg=${t.seg}`);
      }
    }
  });

  it('YouTube ใช้ลิงก์กดได้ · TikTok ใช้ลิงก์พิมพ์ตาม — ห้ามสลับกัน', () => {
    const yt = youtubePinnedComment(VIDEO_TOPICS[0]);
    const tt = tiktokPinnedComment(FOCUS_OFFERS[0]);
    expect(yt).toContain('https://');       // YouTube กดได้ ใส่ลิงก์เต็มคุ้ม
    expect(tt).not.toContain('https://');   // TikTok กดไม่ได้ ใส่ไปก็แค่ยาวขึ้น
    expect(yt).toContain('?s=yt');
  });

  it('บรรทัดแรกของคำบรรยายต้องบอกสิ่งที่ได้ ไม่ใช่ขึ้นต้นด้วยลิงก์', () => {
    for (const t of VIDEO_TOPICS) {
      const first = youtubeDescription(t).split('\n')[0];
      expect(first, t.topic).not.toContain('http');
      expect(first.length, `${t.topic} บรรทัดแรกยาวเกินกว่าจะเห็นก่อนกด "เพิ่มเติม"`).toBeLessThan(110);
    }
  });

  it('ไม่สัญญาผลลัพธ์ และย้ำว่าฟรี/ไม่ต้องสมัคร', () => {
    const all = VIDEO_TOPICS.flatMap(t => [youtubeDescription(t), youtubePinnedComment(t)]).join(' ');
    for (const bad of ['การันตี', 'รับรองว่า', 'รวยแน่', 'ยอดขายเพิ่มแน่นอน']) {
      expect(all, bad).not.toContain(bad);
    }
    expect(all).toContain('ไม่ต้องสมัคร');
  });
});

describe('คลิปต้องพา seg ไปด้วย (Dynamic PLG) — คนดูคลิปต้นทุน ต้องเจอหน้าที่พูดเรื่องต้นทุน', () => {
  it('ทุกหัวข้อคลิปมี seg และ /start มีพาดหัวของ seg นั้นจริง', () => {
    for (const t of VIDEO_TOPICS) {
      expect(t.seg, t.topic).toBeTruthy();
      expect(startHeroFor(t.seg), `คลิป "${t.topic}" ส่ง seg=${t.seg} แต่ปลายทางไม่มีพาดหัวของ seg นี้`).toBeTruthy();
    }
  });

  it('seg ที่ส่งไป segmentFor อ่านออกจริง', () => {
    for (const t of VIDEO_TOPICS) {
      expect(segmentFor(`?seg=${t.seg}`), t.topic).toBe(t.seg);
    }
  });
});
