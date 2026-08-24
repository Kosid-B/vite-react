import { describe, it, expect } from 'vitest';
import type { AppData } from '../../types';
import {
  GOLDEN_QUESTION,
  assessReadiness,
  nextBestAction,
  passedCount,
  readinessStage,
  scaleCheck,
  SCALE_ACTIONS,
} from '../founderMindset';

/** ธุรกิจที่เพิ่งเริ่ม — ยังไม่มีอะไรเลย */
function blank(): AppData {
  return {
    stages: [], personas: [], contentPlan: [], actions: [], funnel: [],
    roi: {} as AppData['roi'],
    businessModel: { bmc: {} as never, de24: [] } as AppData['businessModel'],
    aiCompany: {} as AppData['aiCompany'],
    subscription: {} as AppData['subscription'],
    vrio: [],
    marketplace: { feePct: 3, partners: [], deals: [] },
    roadmap: [], winStories: [],
    marketing: {} as AppData['marketing'],
    feedback: {} as AppData['feedback'],
  } as AppData;
}

/** ธุรกิจที่พิสูจน์มาครบแล้ว */
function proven(): AppData {
  return {
    ...blank(),
    marketInsight: { savedAt: '2026-01-01', mode: 'b2b', segments: ['โรงงาน SME'] },
    personas: [{ name: 'เจ้าของโรงงาน' }] as unknown as AppData['personas'],
    audienceType: 'b2b',
    finance: [
      { id: '1', label: 'ลูกค้า A', amount: 15000, kind: 'revenue', date: '2026-01-05' },
      { id: '2', label: 'ลูกค้า B', amount: 15000, kind: 'revenue', date: '2026-01-12' },
      { id: '3', label: 'ลูกค้า C', amount: 20000, kind: 'revenue', date: '2026-01-20' },
    ],
    growthEco: { arpu: 1490, lifetimeMonths: 12, currentMRR: 45000, weeks: [] },
    funnelSource: 'real',
  };
}

describe('ด่านต้องอ่านจากข้อมูลจริง', () => {
  /**
   * ⚠️ ข้อที่สำคัญที่สุดของไฟล์นี้
   *
   * ถ้าด่านเป็นช่องติ๊ก มันก็คือความเห็นของเจ้าของอีกแบบ แค่มีกล่องล้อมไว้
   * เจ้าของทุกคนเชื่อว่าปัญหาของตัวเองจริงและลูกค้ารออยู่ — นั่นคือเหตุผลที่ต้องมีด่าน
   * ไม่ใช่เหตุผลที่จะให้เขาตอบเอง
   */
  it('ธุรกิจเปล่า ๆ ต้องไม่ผ่านสักด่าน', () => {
    const gates = assessReadiness(blank());

    expect(gates).toHaveLength(6);
    expect(passedCount(gates)).toBe(0);
    expect(readinessStage(gates)).toBe('validate');
  });

  it('ธุรกิจที่มีหลักฐานครบต้องผ่านทุกด่าน', () => {
    const gates = assessReadiness(proven());

    expect(passedCount(gates)).toBe(6);
    expect(readinessStage(gates)).toBe('scale');
  });

  it('ทุกด่านต้องบอกหลักฐานเสมอ ไม่ว่าผ่านหรือไม่ผ่าน', () => {
    for (const gates of [assessReadiness(blank()), assessReadiness(proven())]) {
      for (const gate of gates) {
        expect(gate.evidence.trim().length).toBeGreaterThan(0);
        expect(gate.action.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('แต่ละด่านแยกกันจริง', () => {
  it('มี persona แต่ยังไม่เลือก B2B/B2C ต้องไม่ผ่านด่านลูกค้า', () => {
    const d = { ...blank(), personas: [{ name: 'ก' }] as unknown as AppData['personas'] };
    const customer = assessReadiness(d).find((g) => g.id === 'customer');

    expect(customer?.passed).toBe(false);
    expect(customer?.evidence).toMatch(/B2B|B2C/);
  });

  /** ขายได้ครั้งเดียวกับขายได้ซ้ำ เป็นคนละเรื่อง — ด่านจึงต้องแยกกัน */
  it('ขายได้ครั้งเดียวต้องผ่านด่าน "มีคนจ่าย" แต่ไม่ผ่านด่าน "เกิดซ้ำ"', () => {
    const d: AppData = {
      ...blank(),
      finance: [{ id: '1', label: 'ลูกค้าแรก', amount: 5000, kind: 'revenue', date: '2026-01-05' }],
    };
    const gates = assessReadiness(d);

    expect(gates.find((g) => g.id === 'offer')?.passed).toBe(true);
    expect(gates.find((g) => g.id === 'evidence')?.passed).toBe(false);
  });

  it('ดีลที่ปิดได้ต้องนับเป็นหลักฐานเหมือนรายรับ', () => {
    const d: AppData = {
      ...blank(),
      marketplace: {
        feePct: 3,
        partners: [],
        deals: [
          { id: 'a', partnerId: 'p', title: 'ดีล 1', amount: 10000, status: 'closed' },
          { id: 'b', partnerId: 'p', title: 'ดีล 2', amount: 10000, status: 'closed' },
          { id: 'c', partnerId: 'p', title: 'ดีล 3', amount: 10000, status: 'closed' },
        ],
      },
    };

    expect(assessReadiness(d).find((g) => g.id === 'evidence')?.passed).toBe(true);
  });

  /** ดีลที่ยังไม่ปิด = ยังไม่มีใครจ่าย · นับเป็นหลักฐานเมื่อไรก็หลอกตัวเอง */
  it('ดีลที่ยังไม่ปิดต้องไม่นับเป็นหลักฐาน', () => {
    const d: AppData = {
      ...blank(),
      marketplace: {
        feePct: 3,
        partners: [],
        deals: [{ id: 'a', partnerId: 'p', title: 'คุยอยู่', amount: 99999, status: 'negotiating' }],
      },
    };

    expect(assessReadiness(d).find((g) => g.id === 'offer')?.passed).toBe(false);
  });

  it('funnel ที่ยังเป็นตัวเลขตัวอย่างต้องไม่ผ่านด่านวัดผล', () => {
    const d: AppData = { ...proven(), funnelSource: 'seed' };
    expect(assessReadiness(d).find((g) => g.id === 'tracking')?.passed).toBe(false);
  });

  it('กรอก LTV แล้วแต่ยังไม่มีรายรับต่อเดือน ต้องไม่ผ่านด่านต้นทุน', () => {
    const d: AppData = {
      ...blank(),
      growthEco: { arpu: 1490, lifetimeMonths: 12, currentMRR: 0, weeks: [] },
    };
    const eco = assessReadiness(d).find((g) => g.id === 'economics');

    expect(eco?.passed).toBe(false);
    expect(eco?.evidence).toMatch(/รายรับต่อเดือน/);
  });
});

/**
 * ⚠️ ข้อที่สอง: เตือน ไม่ใช่ห้าม
 *
 * ระบบไม่มีสิทธิ์บอกเจ้าของธุรกิจว่าห้ามใช้เงินตัวเอง
 * เจ้าของอาจรู้อะไรที่ระบบไม่รู้ (ลูกค้าเก่าโทรมาสั่ง สัญญาที่ยังไม่ได้กรอก)
 */
describe('ตรวจก่อนใช้เงินก้อน', () => {
  it('ธุรกิจที่ยังไม่พร้อม ต้องยังได้รับข้อความว่า "ยังทำได้" ไม่ใช่ห้าม', () => {
    const verdict = scaleCheck('ads', assessReadiness(blank()));

    expect(verdict.ready).toBe(false);
    expect(verdict.blockers.length).toBeGreaterThan(0);
    expect(verdict.message).toMatch(/ยัง.*ได้/);
    expect(verdict.message).not.toMatch(/ห้าม/);
  });

  it('ธุรกิจที่พร้อมแล้ว ต้องไม่มีข้อติดขัด', () => {
    const verdict = scaleCheck('ads', assessReadiness(proven()));

    expect(verdict.ready).toBe(true);
    expect(verdict.blockers).toEqual([]);
  });

  /** แต่ละงานเสี่ยงคนละแบบ — ใช้ด่านชุดเดียวกันหมดคือไม่ได้คิด */
  it('งานคนละอย่างต้องการหลักฐานคนละชุด', () => {
    const gates = assessReadiness(blank());
    const ads = scaleCheck('ads', gates);
    const inventory = scaleCheck('inventory', gates);

    expect(ads.blockers.length).toBeGreaterThan(inventory.blockers.length);
    // สต็อกของไม่ต้องรอ tracking แต่ลงโฆษณาต้องรอ
    expect(inventory.blockers.map((b) => b.id)).not.toContain('tracking');
    expect(ads.blockers.map((b) => b.id)).toContain('tracking');
  });

  it('ทุกงานที่ใช้เงินต้องผ่านด่าน "มีคนจ่ายจริง" ก่อนเสมอ', () => {
    for (const action of SCALE_ACTIONS) {
      expect(action.requires).toContain('offer');
    }
  });
});

describe('งานถัดไป', () => {
  /** รายการยาว ๆ อ่านแล้วรู้สึกดีแต่ไม่มีใครเริ่ม — เอาหนึ่งงานพอ */
  it('ธุรกิจเปล่า ๆ ต้องได้งานพิสูจน์ ไม่ใช่งานเร่งยอด', () => {
    const next = nextBestAction(assessReadiness(blank()));

    expect(next.isValidation).toBe(true);
    expect(next.goto).toBe('market');
  });

  it('ผ่านครบแล้วถึงจะบอกให้เร่งเครื่อง', () => {
    const next = nextBestAction(assessReadiness(proven()));
    expect(next.isValidation).toBe(false);
  });

  it('งานถัดไปต้องเป็นด่านแรกที่ยังไม่ผ่าน ไม่ใช่ด่านที่ง่ายที่สุด', () => {
    const d: AppData = {
      ...proven(),
      marketInsight: undefined,
      cmoValidation: undefined,
      funnelSource: 'seed',
    };
    // ทั้งด่านปัญหาและด่านวัดผลไม่ผ่าน — ต้องได้ด่านปัญหาซึ่งมาก่อน
    expect(nextBestAction(assessReadiness(d)).goto).toBe('market');
  });
});

describe('Golden Question', () => {
  /**
   * ตัดสิน "คำตอบ" ด้วยโค้ดไม่ได้ และห้ามแกล้งทำว่าได้
   * ระบบทำได้แค่บังคับให้มีคำตอบ — เทสต์นี้กันไม่ให้ใครมาเขียน regex ตัดสินคำตอบทีหลัง
   */
  it('ต้องเป็นคำถามที่ถามถึงลูกค้า หลักฐาน กำไร และ Scale', () => {
    expect(GOLDEN_QUESTION).toMatch(/ลูกค้า/);
    expect(GOLDEN_QUESTION).toMatch(/หลักฐาน/);
    expect(GOLDEN_QUESTION).toMatch(/กำไร/);
    expect(GOLDEN_QUESTION).toMatch(/Scale/);
  });
});
