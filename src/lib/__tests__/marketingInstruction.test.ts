import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REACH_FLOOR_PER_WEEK } from '../growthPdca';
import { INITIATIVES } from '../stageFit';
import { FORBIDDEN_PHRASES } from '../brandBrief';
import { VIDEO_TOPICS } from '../commentReply';
import { SHORT_LINKS } from '../shortLinks';

/* ══════════════════════════════════════════════════════════════════════
 * คำสั่งปฏิบัติงานที่ "จริงเมื่อวาน" อันตรายกว่าไม่มีคำสั่ง
 * เพราะคนจะทำตามโดยไม่ตรวจซ้ำ แล้วทำงานผิดเฟสไปทั้งสัปดาห์
 *
 * เทสต์นี้ผูก instruction เข้ากับของจริงในโค้ด:
 *   growthPdca.REACH_FLOOR_PER_WEEK  = เส้นแบ่งเฟส
 *   stageFit.INITIATIVES             = งานที่ทำได้ตอนนี้
 *   shortLinks.SHORT_LINKS           = ปลายทางที่มีอยู่จริง
 *   brandBrief.FORBIDDEN_PHRASES     = คำต้องห้าม
 * ══════════════════════════════════════════════════════════════════════ */

const SKILL = resolve(__dirname, '../../../.claude/skills/marketing-instruction/SKILL.md');
const text = readFileSync(SKILL, 'utf8').replace(/\r\n/g, '\n');

describe('instruction ต้องมีอยู่จริงและมีเนื้อ', () => {
  it('อ่านไฟล์เจอ (กันเทสต์ผ่านเพราะไฟล์หาย)', () => {
    expect(text.length).toBeGreaterThan(3000);
  });

  it('มี frontmatter description ยาวพอจะถูกจับคู่กับงานการตลาดจริง', () => {
    const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
    expect(fm).toBeTruthy();
    const desc = fm![1].match(/^description:[ \t]*(.*)$/m)?.[1] ?? '';
    expect(desc.length).toBeGreaterThan(120);
  });
});

describe('ผูกกับเส้นแบ่งเฟสจริง — แก้โค้ดแล้วไม่แก้ instruction = แดง', () => {
  it('ใช้เลข REACH_FLOOR_PER_WEEK ตัวเดียวกับโค้ด', () => {
    expect(text).toContain(`< ${REACH_FLOOR_PER_WEEK} คน/สัปดาห์`);
  });

  it('สั่งให้ตรวจเฟสก่อนทำอะไรก็ตาม', () => {
    expect(text).toContain('stageFit');
    expect(text).toMatch(/ตรวจเฟสก่อน/);
  });

  it('บอกชัดว่าเฟสเปลี่ยน = คำสั่งเปลี่ยน (กันคนทำตามแบบตายตัว)', () => {
    expect(text).toMatch(/เฟสเปลี่ยน.*คำสั่ง.*เปลี่ยน/);
  });
});

describe('ลำดับงาน — ต้องตรงกับงานที่ stageFit บอกว่าทำได้ตอนนี้', () => {
  it('งานลำดับ ② คือ Search Console ซึ่งอยู่ในกอง "ทำได้ตอนนี้" จริง', () => {
    const now = INITIATIVES.filter((i) => i.needs === 'reach').map((i) => i.id);
    expect(now).toContain('search-console');
    expect(text).toContain('Search Console');
  });

  it('ห้ามสั่งให้ทำงานที่ stageFit จัดเป็น "ยังไม่ถึงเวลา"', () => {
    const later = INITIATIVES.filter((i) => i.needs !== 'reach' && i.needs !== 'never');
    // instruction ต้องไม่สั่งให้ลงมือทำ Video Orchestrator / CRM ในเฟสนี้
    for (const i of later) {
      if (i.id === 'video-orchestrator') expect(text).not.toContain('สร้างระบบทำวิดีโออัตโนมัติ');
      if (i.id === 'crm-sync') expect(text).not.toContain('ต่อ HubSpot');
    }
  });

  it('ลำดับต้องเริ่มที่ "ไปหากลุ่มที่มีทริกเกอร์" ไม่ใช่เริ่มที่แอด', () => {
    expect(text).toMatch(/ห้ามสลับ ①②/);
    const trigger = text.indexOf('ไปหากลุ่มที่มีทริกเกอร์');
    const ads = text.indexOf('ยิงแอดงบเล็กใส่คำค้น');
    expect(trigger).toBeGreaterThan(-1);
    expect(trigger, 'งานหากลุ่มที่มีเงินต้องมาก่อนงานยิงแอด').toBeLessThan(ads);
  });
});

describe('กติกาที่ใช้กับทุกชิ้นงาน', () => {
  it('บังคับ "คำถามมาก่อนลิงก์"', () => {
    expect(text).toContain('คำถามมาก่อนลิงก์');
  });

  it('บังคับให้ลิงก์ติด seg + utm ไม่งั้นวัดผลไม่ได้', () => {
    expect(text).toContain('seg');
    expect(text).toContain('utm');
  });

  it('อ้างเครื่องมือตรวจที่มีอยู่จริงในโค้ด ไม่ใช่ชื่อลอย ๆ', () => {
    expect(text).toContain('violatesBrand');
    expect(text).toContain('checkVideoScript');
  });

  it('มีเช็กลิสต์ก่อนปล่อยงาน ไม่ใช่บอกกฎลอย ๆ', () => {
    expect(text).toMatch(/ก่อนกด "ปล่อย"/);
  });
});

describe('หัวข้อคลิปที่บอกว่า "พร้อมถ่าย" ต้องมีปลายทางจริงทุกตัว', () => {
  it('ลิงก์สั้นทุกตัวที่ instruction อ้าง มีอยู่ใน SHORT_LINKS จริง', () => {
    const claimed = ['/ราคา', '/ทุน', '/ลูกค้า', '/ปาล์ม'];
    const missing = claimed.filter((c) => !(c in SHORT_LINKS));
    expect(missing, `ลิงก์ที่ instruction อ้างแต่ไม่มีจริง: ${missing.join(', ')}`).toEqual([]);
  });

  it('ตรงกับหัวข้อใน VIDEO_TOPICS (ไม่ใช่รายการที่เขียนมือแล้วหลุดจากกัน)', () => {
    const real = VIDEO_TOPICS.map((t) => t.shortLink);
    for (const c of ['/ราคา', '/ทุน', '/ลูกค้า', '/ปาล์ม']) {
      expect(real, `${c} ไม่มีใน VIDEO_TOPICS`).toContain(c);
    }
  });
});

describe('ข้อห้าม — ต้องคงข้อที่เสียหายที่สุดถ้าใครลบออก', () => {
  it('ห้ามทำรีวิวลูกค้า (ยังไม่มีลูกค้าจ่ายจริง)', () => {
    expect(text).toMatch(/ห้าม.*รีวิว|รีวิว.*ปลอม/);
  });

  it('ห้ามยิงแอดเพื่อเร่งยอดขาย', () => {
    expect(text).toMatch(/ยิงแอดเพื่อเร่งยอดขาย/);
  });

  it('ห้ามตัดเนื้อหาที่ยังไม่เคยถูกเห็น (15 จาก 19 บล็อก)', () => {
    expect(text).toContain('15 จาก 19');
  });

  it('ห้ามใช้กฎ "พูดอะไรขึ้นหน้า" ชุดเดียวกับทุกกลุ่ม', () => {
    // 🔁 แก้ 22 ส.ค. 2569: ของเดิมล็อกกฎเหมารวมว่า "ห้ามพูดชื่อหมวดหมู่/ISO ขึ้นหน้า"
    //    ซึ่งถูกกับคนเพิ่งเริ่ม แต่ **ผิดกับคนที่กำลังพิมพ์คำว่า ISO ค้นหาอยู่**
    expect(text).toContain('ขึ้นกับว่าคุยกับกลุ่มไหน');
    expect(text).toMatch(/มีคนค้นหาทุกวัน/);
    // ยังต้องคงข้อที่จริงกับทุกกลุ่มไว้
    expect(text).toContain('AI Business Operating System');
  });
});

describe('ไม่เขียนซ้ำ — ต้องชี้ไป skill อื่นแทนการลอกกฎมา', () => {
  it('อ้างถึง skill ที่คุมกฎรายข้อครบ', () => {
    for (const s of ['content-link-contract', 'dynamic-plg', 'case-study-stage-fit',
      'experiment-reality-check', 'beachhead-who-not-what']) {
      expect(text, `ไม่ได้ชี้ไป ${s}`).toContain(s);
    }
  });

  it('ไม่ลอกรายการคำต้องห้ามทั้งชุดมาไว้ที่นี่ (จะเพี้ยนจากต้นทาง)', () => {
    // อ้างชื่อค่าคงที่ได้ แต่ห้ามลอกคำมาครบทุกคำ
    const copied = FORBIDDEN_PHRASES.filter((p) => text.includes(p));
    expect(copied.length,
      'ลอกคำต้องห้ามมาไว้ที่นี่ = อีกหน่อยจะเพี้ยนจาก brandBrief.ts ให้ชี้ไปที่ค่าคงที่แทน')
      .toBeLessThan(FORBIDDEN_PHRASES.length);
  });
});

describe('🔴 กฎแม่ — ต้องยึด Demand ไม่ใช่ยึด "เรามีลูกค้ากี่ราย"', () => {
  it('มีกฎแม่เขียนไว้ชัดว่าอะไรกำหนดอะไร', () => {
    // "เรามีเท่าไร" จำกัดสิ่งที่พูดได้ · "ตลาดมีเท่าไร" กำหนดสิ่งที่ทำ
    expect(text).toMatch(/จำกัดสิ่งที่พูดได้/);
    expect(text).toMatch(/กำหนดสิ่งที่ทำ/);
  });

  it('ระบุว่า "ลูกค้า 0 ราย" เป็นข้อเท็จจริงเกี่ยวกับเรา ไม่ใช่เกี่ยวกับตลาด', () => {
    expect(text).toMatch(/ไม่ใช่.*เกี่ยวกับตลาด|ไม่ใช่เกี่ยวกับตลาด/);
  });

  it('สั่งให้เปิดเอกสารขนาดตลาดจริงก่อนวางแผน (ห้ามวางแผนจากความจำ)', () => {
    expect(text).toContain('MARKET-SIZING-2026.md');
  });

  it('อ้างหลักฐาน WTP ที่พิสูจน์แล้ว — คนจ่ายที่ปรึกษาอยู่แล้ว', () => {
    expect(text).toMatch(/จ่ายที่ปรึกษาหลักหมื่น–แสน/);
    expect(text).toContain('B.Training');
  });

  it('มีตารางแยก "กลุ่มที่ demand มีอยู่แล้ว" ออกจาก "กลุ่มที่ต้องสร้าง demand"', () => {
    expect(text).toContain('กลุ่มที่ demand มีอยู่แล้ว');
    expect(text).toContain('ต้องสร้าง demand');
    expect(text).toMatch(/audit/);
  });

  it('บันทึกช่องว่างที่ยังไม่ได้แก้: ไม่มี seg สำหรับคนที่มี audit รออยู่', () => {
    expect(text).toContain('START_HEROES');
    expect(text).toMatch(/ไม่มี seg สำหรับคนที่มี audit/);
  });
});
