import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { HERO_VARIANTS } from '../heroVariant';
import { HERO_AB_COPY } from '../heroExperiment';
import { TRIAL_ROADMAP, TRIAL_TAKEAWAYS, ISO_EARLY_NOTE, totalEffortLabel } from '../trialRoadmap';
import { QUICK_TOPICS } from '../productQuickCheck';

/* ══════════════════════════════════════════════════════════════════════
 * ยามเฝ้าคำสัญญาบนหน้า Landing
 *
 * มีอยู่เพราะเคยพลาดจริง (ดู docs/LESSONS-LEDGER.md ข้อ 8):
 *   ข้อความ "จ่ายเฉพาะเมื่อปิดดีลได้จริง" โผล่ซ้ำในดราฟต์หลายรอบและเกือบขึ้นหน้าเว็บ
 *   ทั้งที่ระบบคิดเงินรายเดือน (฿590–5,900) และค่าธรรมเนียม marketplace ยังปิดอยู่ (FEE.live = false)
 *   = คำสัญญาที่ระบบทำไม่ได้ บนหน้าสาธารณะ
 *
 * เทสต์นี้ไม่ได้กัน "คำหยาบ" — กัน **คำสัญญาที่เราทำไม่ได้จริง**
 * ถ้าวันหนึ่งระบบทำได้จริง (เช่น เปิด FEE.live) ให้ลบคำนั้นออกจากรายการพร้อมกับที่เปิดใช้งาน
 * ══════════════════════════════════════════════════════════════════════ */

/** คำสัญญาที่ระบบยัง "ทำไม่ได้จริง" — ห้ามปรากฏใน copy ที่คนนอกเห็น */
const FORBIDDEN: { phrase: string; why: string }[] = [
  { phrase: 'จ่ายเฉพาะเมื่อปิดดีล', why: 'SaaS คิดรายเดือน ลูกค้าจ่ายไม่ว่าจะปิดดีลได้หรือไม่ · FEE.live = false' },
  { phrase: 'จ่ายเมื่อปิดดีล', why: 'เหตุผลเดียวกัน' },
  { phrase: 'ไม่ปิดดีลไม่ต้องจ่าย', why: 'เหตุผลเดียวกัน' },
  { phrase: 'การันตี', why: 'เราไม่การันตีผลลัพธ์ทางธุรกิจใด ๆ' },
  { phrase: 'รับรองว่าได้ใบ', why: 'การรับรองเป็นอำนาจของหน่วยรับรอง ไม่ใช่ของเรา' },
  { phrase: 'ฟรีตลอดชีพ', why: 'ไม่มีแพ็กฟรีตลอดชีพ' },
  { phrase: 'อันดับ 1 ของไทย', why: 'ไม่มีแหล่งอ้างอิงที่ตรวจสอบได้' },
  { phrase: 'ดีที่สุดในประเทศ', why: 'ไม่มีแหล่งอ้างอิงที่ตรวจสอบได้' },
  { phrase: 'ลูกค้ากว่า', why: 'ผู้ใช้จริงยังนับได้ด้วยนิ้วมือ — ห้ามอ้างจำนวนลูกค้าจนกว่าจะมีจริง' },
];

/** รวม copy ทุกชิ้นที่ผู้เยี่ยมชมหน้า Landing มีโอกาสเห็น */
function landingCopy(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  for (const [seg, v] of Object.entries(HERO_VARIANTS)) {
    out.push({ where: `hero:${seg}`, text: [v.badge, v.h1a, ...v.h1bLines, v.subLead, v.subRest, v.ctaLabel].join(' ') });
  }
  for (const [ab, v] of Object.entries(HERO_AB_COPY)) {
    out.push({ where: `heroAb:${ab}`, text: [v.h1a, ...v.h1bLines, v.subLead].join(' ') });
  }
  for (const s of TRIAL_ROADMAP) out.push({ where: `roadmap:${s.id}`, text: `${s.title} ${s.outcome}` });
  out.push({ where: 'takeaways', text: TRIAL_TAKEAWAYS.join(' ') });
  out.push({ where: 'isoNote', text: Object.values(ISO_EARLY_NOTE).join(' ') });
  out.push({ where: 'effort', text: totalEffortLabel() });
  for (const t of QUICK_TOPICS) out.push({ where: `topic:${t.id}`, text: `${t.label} ${t.answers}` });
  return out;
}

describe('คำสัญญาบนหน้า Landing — ห้ามสัญญาสิ่งที่ระบบทำไม่ได้', () => {
  it.each(FORBIDDEN)('ไม่มีคำว่า "$phrase" ที่ไหนเลย', ({ phrase, why }) => {
    for (const c of landingCopy()) {
      expect(c.text, `${c.where} มีคำต้องห้าม "${phrase}" — ${why}`).not.toContain(phrase);
    }
  });

  // ครอบไฟล์คอมโพเนนต์ด้วย เพราะข้อความบางส่วนเขียนตรงใน JSX ไม่ได้อยู่ใน lib
  const FILES = [
    'src/components/TrialRoadmap.tsx',
    'src/components/ProductQuickCheck.tsx',
    'src/pages/LandingPage.tsx',
  ];
  it.each(FILES)('%s ไม่มีคำสัญญาต้องห้าม', (file) => {
    const src = readFileSync(file, 'utf8');
    for (const { phrase, why } of FORBIDDEN) {
      expect(src, `${file} มี "${phrase}" — ${why}`).not.toContain(phrase);
    }
  });
});

describe('คำที่ผู้ใช้สั่งให้เลิกใช้ — "สมัคร" บนปุ่มหลัก', () => {
  // เจ้าของสั่ง 16 ส.ค. 2569: คนรู้สึกว่าถูกบังคับ/มีข้อผูกมัด → ปุ่มต้องพูดถึงประโยชน์ของเขา
  it('ปุ่มหลักของ hero ทุก variant ไม่ใช้คำว่า "สมัคร"', () => {
    for (const [seg, v] of Object.entries(HERO_VARIANTS)) {
      expect(v.ctaLabel, `hero:${seg} ctaLabel`).not.toContain('สมัคร');
    }
  });
});
