import { describe, it, expect } from 'vitest';
import { DEFAULT_DATA as SEED } from '../../data';
import type { AppData } from '../../types';
import {
  INDUSTRY_OPTIONS, GOAL_MIN_LEN, SETUP_STEPS,
  industryDone, goalDone, teamDone, setupProgress, firstIncompleteStep,
  pendingInputSteps, isSetupComplete, applyIndustry, applyGoal, initialFieldValue,
  matchIndustry, suggestGoal,
} from '../setupWizard';

/* deep clone กัน mutation ข้ามเทสต์ (SEED เป็น object ที่ import ร่วม) */
const clone = (): AppData => JSON.parse(JSON.stringify(SEED)) as AppData;

describe('setupWizard — done predicates (adaptive)', () => {
  it('ค่า seed ตัวอย่าง = ยังไม่ถือว่าตั้งค่า (industry/goal)', () => {
    const d = clone();
    expect(industryDone(d)).toBe(false);
    expect(goalDone(d)).toBe(false);
  });

  it('industryDone true เมื่อค่าต่างจาก seed และไม่ว่าง', () => {
    const d = applyIndustry(clone(), INDUSTRY_OPTIONS[0]);
    expect(industryDone(d)).toBe(true);
  });

  it('goalDone true เมื่อกรอกเป้าหมายของตัวเอง', () => {
    const d = applyGoal(clone(), 'ยอดขาย ฿100,000/เดือน ภายใน 90 วัน');
    expect(goalDone(d)).toBe(true);
  });

  it('goalDone false เมื่อค่าว่าง', () => {
    const d = applyGoal(clone(), '   ');
    expect(goalDone(d)).toBe(false);
  });
});

describe('setupWizard — progress & resume', () => {
  it('progress นับเฉพาะขั้นที่เสร็จ', () => {
    let d = clone();
    expect(setupProgress(d).done).toBe(0);
    d = applyIndustry(d, INDUSTRY_OPTIONS[1]);
    expect(setupProgress(d).done).toBe(1);
    d = applyGoal(d, 'เป้าหมายวัดผลได้จริงจัง');
    expect(setupProgress(d).done).toBe(2);
    expect(setupProgress(d).pct).toBe(Math.round((2 / SETUP_STEPS.length) * 100));
  });

  it('firstIncompleteStep คืนขั้นแรกที่ยังไม่เสร็จ (resume)', () => {
    let d = clone();
    expect(firstIncompleteStep(d)?.id).toBe('industry');
    d = applyIndustry(d, INDUSTRY_OPTIONS[0]);
    expect(firstIncompleteStep(d)?.id).toBe('goal');
  });

  it('pendingInputSteps ข้ามขั้นที่ทำแล้ว + ไม่รวมขั้น nav (team)', () => {
    let d = clone();
    expect(pendingInputSteps(d).map(s => s.id)).toEqual(['industry', 'goal']);
    d = applyIndustry(d, INDUSTRY_OPTIONS[0]);
    expect(pendingInputSteps(d).map(s => s.id)).toEqual(['goal']);
  });
});

describe('setupWizard — reducers ไม่ mutate ของเดิม', () => {
  it('applyIndustry/applyGoal คืน object ใหม่ (immutable)', () => {
    const d = clone();
    const d2 = applyIndustry(d, INDUSTRY_OPTIONS[0]);
    expect(d2).not.toBe(d);
    expect(d2.aiCompany).not.toBe(d.aiCompany);
    expect(d.aiCompany.industry).toBe(SEED.aiCompany.industry); // ของเดิมไม่เปลี่ยน
  });

  it('applyGoal trim ค่าก่อนเก็บ', () => {
    const d = applyGoal(clone(), '  โตให้ได้  ');
    expect(d.aiCompany.goal).toBe('โตให้ได้');
  });
});

describe('setupWizard — helpers', () => {
  it('GOAL_MIN_LEN เป็นเกณฑ์กันกรอกลวก', () => {
    expect('สั้น'.length < GOAL_MIN_LEN).toBe(true);
  });

  it('INDUSTRY_OPTIONS ไม่ว่าง + เป็น string ทั้งหมด', () => {
    expect(INDUSTRY_OPTIONS.length).toBeGreaterThan(0);
    expect(INDUSTRY_OPTIONS.every(o => typeof o === 'string' && o.length > 0)).toBe(true);
  });

  it('matchIndustry: จับคำที่พิมพ์บน Landing → หมวด DBD ที่ตรง (คืน label ใน INDUSTRY_OPTIONS)', () => {
    const cafe = matchIndustry('ร้านกาแฟเล็ก ๆ');
    expect(cafe).toBe('ที่พักแรมและบริการด้านอาหาร');
    expect(INDUSTRY_OPTIONS).toContain(cafe); // preselect ใน select ได้จริง
    expect(matchIndustry('รับทำบัญชี SME')).toBe('กิจกรรมวิชาชีพ วิทยาศาสตร์ และเทคนิค');
    expect(matchIndustry('โรงงานผลิตเฟอร์นิเจอร์')).toBe('การผลิต (Manufacturing)');
    expect(matchIndustry('ร้านขายเสื้อผ้าออนไลน์')).toBe('การขายส่งและขายปลีก การซ่อมยานยนต์');
    expect(matchIndustry('ฟาร์มเลี้ยงไก่')).toBe('เกษตรกรรม การป่าไม้ และการประมง');
  });

  it('matchIndustry: ว่าง/ไม่รู้จัก → คืน "" (ไม่เดามั่ว)', () => {
    expect(matchIndustry('')).toBe('');
    expect(matchIndustry('   ')).toBe('');
    expect(matchIndustry(null)).toBe('');
    expect(matchIndustry('xyzqwerty ไม่มีคำใบ้')).toBe('');
  });

  it('suggestGoal: ร่างเป้าหมายจากธุรกิจ (มี hint) + ยาวพอผ่านเกณฑ์ · ว่าง→""', () => {
    const g = suggestGoal('ร้านกาแฟ');
    expect(g).toContain('ร้านกาแฟ');
    expect(g.length).toBeGreaterThanOrEqual(GOAL_MIN_LEN);
    expect(suggestGoal('')).toBe('');
    expect(suggestGoal(null)).toBe('');
  });

  it('initialFieldValue ไม่คืนค่า seed (เริ่มช่องว่างสำหรับผู้ใช้ใหม่)', () => {
    const d = clone();
    expect(initialFieldValue(d, 'industry')).toBe('');
    expect(initialFieldValue(d, 'goal')).toBe('');
    const d2 = applyIndustry(d, INDUSTRY_OPTIONS[0]);
    expect(initialFieldValue(d2, 'industry')).toBe(INDUSTRY_OPTIONS[0]);
  });

  it('isSetupComplete true เฉพาะเมื่อครบทุกขั้น (รวม team)', () => {
    let d = clone();
    d = applyIndustry(d, INDUSTRY_OPTIONS[0]);
    d = applyGoal(d, 'เป้าหมายวัดผลได้');
    expect(isSetupComplete(d)).toBe(teamDone(d)); // team ยังใช้ roster ตัวอย่าง → ยังไม่ครบ
  });
});
