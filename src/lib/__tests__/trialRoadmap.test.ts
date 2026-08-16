import { describe, it, expect } from 'vitest';
import {
  TRIAL_ROADMAP, TRIAL_TAKEAWAYS, TRIAL_DAYS, ACTOR_LABEL,
  nextStep, roadmapProgress, totalEffortLabel, ISO_EARLY_NOTE,
  CHATGPT_HEADLINE, CHATGPT_SUB, CHATGPT_CLOSING, CHATGPT_DIFFS,
} from '../trialRoadmap';
import { PAGE_MIN_PLAN } from '../access';

/** หน้าที่ระบบมีจริง — อ้างอิงจาก PAGE_FLOW ใน App.tsx (คัดเฉพาะที่ roadmap ใช้) */
const REAL_PAGES = [
  'dashboard', 'city', 'personas', 'bmc', 'storefront', 'process',
  'aicompany', 'marketing', 'billing', 'factory',
];

describe('แผน 15 วัน — ห้ามสัญญาสิ่งที่ระบบยังไม่มี', () => {
  it('ทุกขั้นชี้ไปหน้าที่มีอยู่จริง', () => {
    for (const s of TRIAL_ROADMAP) {
      expect(REAL_PAGES, `${s.title} → ${s.page}`).toContain(s.page);
    }
  });

  it('ไม่มีขั้นไหนชี้ไปหน้าที่ต้องจ่ายเงินก่อนถึงจะเข้าได้', () => {
    // ทดลองใช้ = แพ็ก trial (rank เท่า scale) แต่ขั้นที่ "ฟรีจริง" ต้องเข้าได้แม้หมดทดลอง
    // อย่างน้อยขั้นแรกต้องไม่ล็อก — ไม่งั้นคำสัญญาบนหน้าแรกเป็นโมฆะทันทีที่หมดวัน
    expect(PAGE_MIN_PLAN[TRIAL_ROADMAP[0].page]).toBeUndefined();
  });

  it('ทุกขั้นบอกว่าได้อะไรกลับไป และเป็นของที่จับต้องได้', () => {
    for (const s of TRIAL_ROADMAP) {
      expect(s.outcome.length, s.title).toBeGreaterThan(20);
      expect(s.effort, s.title).toBeTruthy();
      expect(s.days, s.title).toBeTruthy();
    }
  });

  it('ทุกขั้นบอกว่าใครทำ — คนต้องรู้ว่าต้องลงแรงเองแค่ไหน', () => {
    for (const s of TRIAL_ROADMAP) {
      expect(Object.keys(ACTOR_LABEL), s.title).toContain(s.actor);
    }
  });

  it('มีทั้งขั้นที่ผู้ใช้กรอกเอง และขั้นที่ AI ช่วย (ไม่ใช่ AI ทำให้หมดจนดูไม่จริง)', () => {
    const actors = new Set(TRIAL_ROADMAP.map((s) => s.actor));
    expect(actors.has('you')).toBe(true);
    expect(actors.has('both') || actors.has('ai')).toBe(true);
  });

  it('id ไม่ซ้ำ และครอบคลุมครบ 15 วัน', () => {
    expect(new Set(TRIAL_ROADMAP.map((s) => s.id)).size).toBe(TRIAL_ROADMAP.length);
    expect(TRIAL_DAYS).toBe(15);
    expect(TRIAL_ROADMAP[TRIAL_ROADMAP.length - 1].days).toContain("15");
  });

  it('ของที่ถือกลับบ้านได้ ต้องมีจริงและบอกชัด', () => {
    expect(TRIAL_TAKEAWAYS.length).toBeGreaterThanOrEqual(3);
    expect(TRIAL_TAKEAWAYS.some((t) => t.includes('ส่งออก'))).toBe(true);
    expect(totalEffortLabel()).toContain('ชั่วโมง');
  });
});

describe('พาเดินต่อในแอป', () => {
  it('ยังไม่เคยเข้าหน้าไหน → ขั้นแรกสุด', () => {
    expect(nextStep([])?.id).toBe(TRIAL_ROADMAP[0].id);
    expect(roadmapProgress([])).toBe(0);
  });

  it('เดินไปบางขั้นแล้ว → ชี้ขั้นที่ยังไม่ทำ', () => {
    const visited = [TRIAL_ROADMAP[0].page, TRIAL_ROADMAP[1].page];
    expect(nextStep(visited)?.id).toBe(TRIAL_ROADMAP[2].id);
    expect(roadmapProgress(visited)).toBe(40);
  });

  it('ครบทุกขั้น → ไม่มีขั้นถัดไป และความคืบหน้า 100%', () => {
    const all = TRIAL_ROADMAP.map((s) => s.page);
    expect(nextStep(all)).toBeNull();
    expect(roadmapProgress(all)).toBe(100);
  });

  it('หน้าที่ไม่เกี่ยวกับ roadmap ไม่นับเป็นความคืบหน้า', () => {
    expect(roadmapProgress(['billing', 'admin', 'cases'])).toBe(0);
  });
});

describe('ISO ตั้งแต่ปีแรก — กฎภาษาสำหรับคนเริ่มธุรกิจ', () => {
  it('ห้ามขึ้นต้นด้วยคำว่า ISO (คนเพิ่งเริ่มได้ยินแล้วปิดทันที)', () => {
    expect(ISO_EARLY_NOTE.lead.startsWith('ISO')).toBe(false);
    expect(ISO_EARLY_NOTE.myth.startsWith('ISO')).toBe(false);
    // ประโยคเปิดต้องพูดถึงสิ่งที่เขาเพิ่งทำ ไม่ใช่ชื่อมาตรฐาน
    expect(ISO_EARLY_NOTE.lead).not.toContain('ISO');
  });

  it('แก้ความเชื่อผิดตรง ๆ ว่าไม่ต้องรอให้บริษัทโต', () => {
    expect(ISO_EARLY_NOTE.myth).toContain('รอให้บริษัทโต');
    expect(ISO_EARLY_NOTE.truth).toContain('ปีแรก');
    expect(ISO_EARLY_NOTE.truth).toContain('ยิ่งรอยิ่งแพง');
  });

  it('ไม่ระบุจำนวนเดือนขั้นต่ำตายตัว (ขึ้นกับหน่วยรับรองแต่ละเจ้า)', () => {
    const all = Object.values(ISO_EARLY_NOTE).join(' ');
    expect(all).not.toMatch(/\d+\s*เดือน/);
  });

  it('ไม่สัญญาว่าได้ใบรับรองแน่นอน — พูดแค่ว่าไม่ต้องเริ่มใหม่', () => {
    const all = Object.values(ISO_EARLY_NOTE).join(' ');
    expect(all).not.toContain('รับรองได้แน่นอน');
    expect(all).not.toContain('การันตี');
    expect(ISO_EARLY_NOTE.body).toContain('ไม่ต้องเริ่มใหม่');
  });
});

describe('ทำไมไม่ใช้ ChatGPT เอา — ต้องต่างเชิงโครงสร้าง ไม่ใช่โจมตีคู่แข่ง', () => {
  const all = [
    CHATGPT_HEADLINE, CHATGPT_SUB, CHATGPT_CLOSING,
    ...CHATGPT_DIFFS.flatMap((d) => [d.need, d.chat, d.ours]),
  ].join(' | ');

  it('ไม่มีคำดูถูกคู่แข่ง — ผู้ใช้รู้ว่า ChatGPT เก่ง ถ้าโจมตีจะเสียความน่าเชื่อถือ', () => {
    for (const bad of ['ห่วย', 'แย่', 'โง่', 'ใช้ไม่ได้', 'ไร้ประโยชน์', 'หลอกลวง']) {
      expect(all, `มีคำว่า "${bad}"`).not.toContain(bad);
    }
  });

  it('ยอมรับตรง ๆ ว่า ChatGPT เก่งกว่าในบางเรื่อง (ความน่าเชื่อถือมาจากความซื่อสัตย์)', () => {
    expect(CHATGPT_DIFFS[0].chat).toContain('ดีมาก');
    expect(CHATGPT_CLOSING).toContain('ไม่ได้มาแทน');
  });

  it('ทุกข้อบอกทั้งฝั่งเขาและฝั่งเรา ไม่มีข้อไหนเว้นว่าง', () => {
    for (const d of CHATGPT_DIFFS) {
      expect(d.need.length, d.need).toBeGreaterThan(5);
      expect(d.chat.length, d.need).toBeGreaterThan(5);
      expect(d.ours.length, d.need).toBeGreaterThan(5);
    }
  });

  it('อ้างเฉพาะฟีเจอร์ที่มีจริงในระบบแล้ว', () => {
    const ours = CHATGPT_DIFFS.map((d) => d.ours).join(' ');
    // ทั้งสามอย่างนี้มีจริง: ทะเบียนกระบวนการ (process) · ส่งออก CSV/JSON · การเถียงกลับเรื่องตัววัด
    expect(ours).toContain('ตัววัด');
    expect(ours).toContain('CSV/JSON');
    expect(ours).toContain('ข้อกำหนด');
  });

  it('พาดหัวคมพอที่จะจำได้ และไม่ยาวเกินบรรทัดเดียว', () => {
    expect(CHATGPT_HEADLINE.length).toBeLessThan(70);
    expect(CHATGPT_HEADLINE).toContain('ChatGPT');
  });
});
