import { describe, it, expect } from 'vitest';
import {
  VIDEO_JOB, CLIP_STRUCTURE, PROOF, VIDEO_DONT,
  videoBriefFor, allVideoBriefs, videoScriptPrompt, checkVideoScript,
} from '../videoBrief';
import { VIDEO_TOPICS } from '../commentReply';
import { WHO, FORBIDDEN_PHRASES } from '../brandBrief';

/* ══════════════════════════════════════════════════════════════════════
 * บรีฟทำคลิปต้อง "ประกอบจากของที่มีอยู่" ไม่ใช่เขียนซ้ำ
 *
 * ถ้าเขียนตอนจบคลิปซ้ำในไฟล์นี้ มันจะค่อย ๆ เพี้ยนจาก videoEnding() ที่มีเทสต์คุมอยู่
 * แล้วเราจะได้คลิปที่สัญญาอย่างหนึ่ง แต่ปลายทางมีอีกอย่าง (ผิด content-link-contract)
 * ══════════════════════════════════════════════════════════════════════ */

describe('หน้าที่ของคลิป — กันการหลงไปทำคลิปอธิบายผลิตภัณฑ์', () => {
  it('งานของคลิปคือทำให้เขารู้ตัวว่าไม่รู้ตัวเลขตัวเอง ไม่ใช่บอกว่าเราขายอะไร', () => {
    expect(VIDEO_JOB).toContain('ตัวเลขของตัวเอง');
    expect(VIDEO_JOB).toMatch(/ไม่ใช่/);
  });
});

describe('โครงคลิป', () => {
  it('มีครบ 5 ช่วง และเรียงตามลำดับที่ห้ามสลับ', () => {
    expect(CLIP_STRUCTURE.map((b) => b.id)).toEqual(['hook', 'agree', 'give', 'show', 'gap']);
  });

  it('ทุกช่วงต้องบอกได้ว่า "พังเมื่อไร" ไม่ใช่บอกแค่ว่าต้องทำอะไร', () => {
    const weak = CLIP_STRUCTURE.filter((b) => !b.failsWhen || b.failsWhen.length < 20);
    expect(weak.map((b) => b.id)).toEqual([]);
  });

  it('ช่วง "ให้ของจริง" ต้องมาก่อนช่วง "ปิดแบบค้าง" — ให้ก่อนขอเสมอ', () => {
    const give = CLIP_STRUCTURE.findIndex((b) => b.id === 'give');
    const gap = CLIP_STRUCTURE.findIndex((b) => b.id === 'gap');
    expect(give).toBeLessThan(gap);
  });

  it('ช่วง "ทำให้ดูสด" ต้องเตือนว่าพูดว่ามีเครื่องมือ = โฆษณา', () => {
    const show = CLIP_STRUCTURE.find((b) => b.id === 'show');
    expect(show?.failsWhen).toContain('โฆษณา');
  });
});

describe('หลักฐาน — เรายังไม่มีลูกค้า จึงห้ามใช้เครื่องมือความน่าเชื่อถือแบบปกติ', () => {
  it('ห้ามใช้รีวิวลูกค้า', () => {
    expect(PROOF.banned.join(' ')).toContain('รีวิว');
  });

  it('ห้ามอ้างจำนวนผู้ใช้/ยอดขาย', () => {
    expect(PROOF.banned.join(' ')).toMatch(/จำนวนผู้ใช้|ยอดขาย/);
  });

  it('ทุกข้อที่ห้าม ต้องติดป้าย 🚫 (อ่านผ่าน ๆ ต้องเห็นทันที)', () => {
    expect(PROOF.banned.filter((p) => !p.includes('🚫'))).toEqual([]);
  });

  it('มีหลักฐานที่ใช้ได้จริงเสนอแทน ไม่ใช่ห้ามอย่างเดียว', () => {
    expect(PROOF.usable.length).toBeGreaterThanOrEqual(3);
    expect(PROOF.usable.join(' ')).toContain('สด');       // โชว์เครื่องมือทำงานสด
    expect(PROOF.usable.join(' ')).toContain('B.Training'); // เครดิตที่มีจริง
  });
});

describe('ข้อห้ามเฉพาะวิดีโอ — ผูกกับข้อมูลผู้ชมจริง', () => {
  it('ห้ามใส่ลิงก์ก่อนคำถามปิดท้าย', () => {
    expect(VIDEO_DONT.join(' ')).toContain('ลิงก์ก่อน');
  });

  it('ห้ามทำโทนแบบคลิปวัยรุ่น — และต้องอ้างตัวเลขผู้ชมจริงกำกับ', () => {
    const all = VIDEO_DONT.join(' ');
    expect(all).toContain('58.1%');
    expect(all).toContain('0.0%');
  });

  it('ห้ามขึ้นต้นด้วยการแนะนำตัว', () => {
    expect(VIDEO_DONT.join(' ')).toMatch(/แนะนำตัว/);
  });
});

describe('บรีฟรายคลิป — ต้องประกอบจากของที่มีอยู่ ไม่เขียนตอนจบซ้ำ', () => {
  const briefs = allVideoBriefs();

  it('มีบรีฟครบทุกหัวข้อที่มี', () => {
    expect(briefs.length).toBe(VIDEO_TOPICS.length);
    expect(briefs.length).toBeGreaterThanOrEqual(4);
  });

  it('ตอนจบของบรีฟ = ผลลัพธ์จาก videoEnding() ตัวจริง (ไม่ใช่ข้อความที่เขียนใหม่)', () => {
    for (const t of VIDEO_TOPICS) {
      const b = videoBriefFor(t);
      // openLoop คือคำถามค้างที่ผูกกับ FAQ จริงในบทความ — ต้องปรากฏในตอนจบทั้ง 3 ช่องทาง
      expect(b.ending.spoken).toContain(t.openLoop);
      expect(b.ending.onScreen).toContain(t.openLoop);
      expect(b.ending.pinned).toContain(t.openLoop);
    }
  });

  it('ทุกบรีฟมีลิงก์สั้นจริงและ seg สำหรับ Dynamic PLG', () => {
    for (const b of briefs) {
      expect(b.shortLink.startsWith('/')).toBe(true);
      expect(b.seg.length).toBeGreaterThan(0);
      expect(b.pinnedComment).toContain(`seg=${b.seg}`);
    }
  });

  it('คำบรรยายและคอมเมนต์ปักหมุดแยกช่องทางกันได้ (s=yt vs s=ytc)', () => {
    const b = briefs[0];
    expect(b.youtubeDescription).toContain('s=yt&');
    expect(b.pinnedComment).toContain('s=ytc');
  });
});

describe('พรอมป์ตให้ AI เขียนสคริปต์ — Brand Brief ต้องอยู่บนสุด', () => {
  const p = videoScriptPrompt(VIDEO_TOPICS[0]);

  it('มี Brand Brief นำหน้าคำสั่ง', () => {
    expect(p).toContain('Brand Brief');
    expect(p).toContain(WHO.oneLiner);
    expect(p.indexOf('Brand Brief')).toBeLessThan(p.indexOf('งานที่สั่ง'));
  });

  it('พกคำต้องห้ามไปด้วย (โหมดข้อความสาธารณะ)', () => {
    for (const w of FORBIDDEN_PHRASES) expect(p).toContain(w);
  });

  it('สั่งห้ามเขียนตอนจบใหม่ — ตอนจบผูกกับ FAQ จริงในบทความแล้ว', () => {
    expect(p).toMatch(/ห้ามเขียนใหม่/);
  });

  it('มีสถานะจริง (ยังไม่มีลูกค้าจ่ายเงิน) ติดไปด้วย', () => {
    expect(p).toContain('สถานะจริงตอนนี้');
  });
});

describe('checkVideoScript — ตรวจสคริปต์ก่อนถ่าย', () => {
  it('จับคำต้องห้ามของแบรนด์', () => {
    expect(checkVideoScript('เราการันตีว่าคุณจะกำไรขึ้น').join(' ')).toContain('การันตี');
  });

  it('จับการอ้างรีวิว/เคสลูกค้า', () => {
    expect(checkVideoScript('ลูกค้าของเราบอกว่าดีมาก').join(' ')).toMatch(/รีวิว|เคสลูกค้า/);
  });

  it('จับการขึ้นต้นด้วยการทักทาย/แนะนำตัว', () => {
    expect(checkVideoScript('สวัสดีครับ ผมมาจาก CEO AI Thailand').join(' ')).toMatch(/ทักทาย|แนะนำตัว/);
  });

  it('สคริปต์ที่ถูกต้องต้องผ่าน (ไม่จับผิดมั่ว)', () => {
    const ok = 'ขายดีทั้งเดือน แต่พอสิ้นเดือนเงินไม่เหลือ เคยเป็นไหมครับ '
      + 'ลองเอาราคาขายลบต้นทุนต่อชิ้นดู นั่นคือกำไรต่อชิ้นจริง ๆ ของคุณ '
      + 'กำไรต่อชิ้นของคุณตอนนี้เท่าไร คำนวณฟรีได้ที่ ceoaithailand.org/ราคา';
    expect(checkVideoScript(ok)).toEqual([]);
  });
});
