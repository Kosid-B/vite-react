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

  it('ห้ามเริ่มที่แอด และห้ามข้ามงานหาลูกค้ารายแรก', () => {
    expect(text).toMatch(/ห้ามเริ่มที่ ④/);
    expect(text).toMatch(/ห้ามข้าม ①/);
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

  it('เตือนว่าคนที่ไม่รู้ว่าตัวเองมีปัญหา ไม่ค้นหา — จึงต้องพูดปัญหาขึ้นหน้า', () => {
    expect(text).toContain('ไม่ค้นหา');
    expect(text).toMatch(/ห้ามพูดชื่อหมวดหมู่สินค้าขึ้นหน้า/);
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
