import { describe, it, expect } from 'vitest';
import {
  parseNumbers, buildReply, replySwapped, REPLY_NEED_NUMBERS,
  KEYWORD_OFFERS, dmForKeyword,
} from '../commentReply';
import { SHORT_LINKS } from '../shortLinks';

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

describe('จุลภาค — เคยพลาดจริง (1,500 อ่านเป็น 1)', () => {
  it('จุลภาคคั่นหลักพันต้องถูกลบ ไม่ใช่แทนด้วยช่องว่าง', () => {
    expect(parseNumbers('1,500/900')).toMatchObject({ price: 1500, cost: 900 });
    expect(parseNumbers('ราคา 1,250,000 ทุน 980,000')).toMatchObject({ price: 1250000, cost: 980000 });
  });

  it('จุลภาคที่ใช้คั่นค่า (มีช่องว่างตาม) ยังแยกได้ถูก', () => {
    expect(parseNumbers('50, 30')).toMatchObject({ price: 50, cost: 30 });
  });
});
