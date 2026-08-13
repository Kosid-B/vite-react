import { describe, it, expect } from 'vitest';
import { CHECKUP_QUESTIONS, CHECKUP_DISCLAIMER, assessCheckup, type CheckupChoice } from '../checkup';
import { ISO_CLAUSE_GUIDE } from '../isoGapAssessment';
import { LADDER, ISO_ONLY_CLAUSES, isoClausesCoveredByDe24, headStartFromDe24, ladderForClause } from '../growthLadder';
import { DE24_DEFS } from '../de24Sync';

const all = (v: CheckupChoice) => Object.fromEntries(CHECKUP_QUESTIONS.map((q) => [q.id, v]));

describe('checkup — ชุดคำถาม', () => {
  it('12 ข้อ · id ไม่ซ้ำ · ตัวเลือกครบ 4 · มีวิธีแก้ทุกข้อ', () => {
    expect(CHECKUP_QUESTIONS).toHaveLength(12);
    expect(new Set(CHECKUP_QUESTIONS.map((q) => q.id)).size).toBe(12);
    for (const q of CHECKUP_QUESTIONS) {
      expect(q.choices).toHaveLength(4);
      expect(q.q.length).toBeGreaterThan(10);
      expect(q.fix.length).toBeGreaterThan(10);
    }
  });

  it('ทุกคำถามผูกกับข้อ ISO ที่มีอยู่จริงในคู่มือ (กันสะกดผิด/ข้อที่ไม่มี)', () => {
    for (const q of CHECKUP_QUESTIONS) {
      expect(ISO_CLAUSE_GUIDE[q.clause], `ไม่พบข้อ ${q.clause}`).toBeDefined();
    }
  });

  it('ข้อที่ทำเครื่องหมายเอกสารบังคับ ตรงกับคู่มือ ISO จริง', () => {
    for (const q of CHECKUP_QUESTIONS) {
      if (q.mandatory) expect(ISO_CLAUSE_GUIDE[q.clause].mandatoryDoc, q.clause).toBe(true);
    }
  });

  it('คำถามไม่ใช้ภาษามาตรฐาน — คนทำธุรกิจอ่านแล้วตอบได้เอง', () => {
    for (const q of CHECKUP_QUESTIONS) {
      expect(q.q).not.toMatch(/ข้อ \d|clause|QMS|documented information/i);
    }
  });
});

describe('checkup — การให้คะแนน', () => {
  it('ตอบดีสุดทุกข้อ = เต็ม 36 · พร้อมตรวจ · ไม่มีช่องว่าง', () => {
    const r = assessCheckup(all(3));
    expect(r.score).toBe(36);
    expect(r.pct).toBe(100);
    expect(r.band).toBe('ready');
    expect(r.gaps).toHaveLength(0);
    expect(r.missingMandatory).toBe(0);
  });

  it('ตอบแย่สุดทุกข้อ = 0 · critical · ช่องว่างครบ 12', () => {
    const r = assessCheckup(all(0));
    expect(r.score).toBe(0);
    expect(r.band).toBe('critical');
    expect(r.gaps).toHaveLength(12);
    expect(r.missingMandatory).toBe(CHECKUP_QUESTIONS.filter((q) => q.mandatory).length);
  });

  it('ไม่ตอบ = 0 ไม่ใช่เดา (ปลอดภัยกว่าให้คะแนนฟรี)', () => {
    expect(assessCheckup({}).score).toBe(0);
    expect(assessCheckup({}).gaps).toHaveLength(12);
  });

  it('ค่านอกช่วง 0-3 ถูกปัดเป็น 0 ไม่ทำให้คะแนนเพี้ยน', () => {
    const bad = { ...all(3), scope: 99 as unknown as CheckupChoice, policy: -5 as unknown as CheckupChoice };
    const r = assessCheckup(bad);
    expect(r.score).toBe(30);           // 10 ข้อ × 3
    expect(r.pct).toBeLessThan(100);
  });

  it('เอกสารบังคับที่ขาด ถูกจัดให้เร่งด่วนกว่าข้อทั่วไปที่คะแนนเท่ากัน', () => {
    const a = { ...all(3), policy: 0 as CheckupChoice, process: 0 as CheckupChoice };
    const r = assessCheckup(a);
    expect(r.gaps[0].id).toBe('policy');  // 5.2 เป็นเอกสารบังคับ
    expect(r.gaps[0].weight).toBeGreaterThan(r.gaps[1].weight);
  });

  it('topGaps = 3 อันดับแรกเสมอ (ส่วนที่โชว์ฟรี)', () => {
    const r = assessCheckup(all(0));
    expect(r.topGaps).toHaveLength(3);
    expect(r.topGaps).toEqual(r.gaps.slice(0, 3));
  });

  it('ระดับผลลัพธ์ไล่ตามคะแนน และมีคำอธิบายทุกระดับ', () => {
    const bands = [all(0), all(1), all(2), all(3)].map((a) => assessCheckup(a));
    expect(bands.map((b) => b.band)).toEqual(['critical', 'weak', 'developing', 'ready']);
    for (const b of bands) {
      expect(b.bandLabel.length).toBeGreaterThan(5);
      expect(b.summary.length).toBeGreaterThan(30);
    }
  });

  it('ประมาณการวันทำงานสมเหตุสมผล — ยิ่งขาดยิ่งนาน และ lo ≤ hi เสมอ', () => {
    const worst = assessCheckup(all(0));
    const best = assessCheckup(all(3));
    expect(worst.effortDays[0]).toBeLessThanOrEqual(worst.effortDays[1]);
    expect(best.effortDays[0]).toBeLessThanOrEqual(best.effortDays[1]);
    expect(worst.effortDays[0]).toBeGreaterThan(best.effortDays[0]);
  });

  it('ทุกระดับผลลัพธ์ไม่มีคำที่ทำให้ตกใจเกินจริง', () => {
    for (const a of [all(0), all(1), all(2), all(3)]) {
      const s = assessCheckup(a).summary;
      expect(s).not.toMatch(/ผิดกฎหมาย|โดนปรับ|ใบรับรองถูกยกเลิก|เร่งด่วนที่สุด/);
    }
  });

  it('มีข้อความกำกับว่าไม่ใช่การตรวจประเมินจริง', () => {
    expect(CHECKUP_DISCLAIMER).toMatch(/คัดกรองเบื้องต้น/);
    expect(CHECKUP_DISCLAIMER).toMatch(/ไม่ใช่การตรวจประเมิน/);
  });
});

describe('growthLadder — สะพาน MIT 24 ↔ ISO ↔ GRI', () => {
  it('ทุกสะพานชี้ไปข้อ ISO ที่มีอยู่จริง และขั้น MIT ที่มีอยู่จริง', () => {
    for (const l of LADDER) {
      expect(l.isoClauses.length).toBeGreaterThan(0);
      for (const c of l.isoClauses) expect(ISO_CLAUSE_GUIDE[c], `ไม่พบข้อ ${c}`).toBeDefined();
      for (const s of l.de24) {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThan(DE24_DEFS.length);
      }
    }
  });

  it('ข้อมูลกลางไม่ซ้ำกัน และมีคำอธิบายการส่งต่อทุกอัน', () => {
    expect(new Set(LADDER.map((l) => l.shared)).size).toBe(LADDER.length);
    for (const l of LADDER) expect(l.note.length).toBeGreaterThan(20);
  });

  it('ข้อที่ MIT ครอบคลุม กับข้อที่ต้องทำใหม่ ต้องไม่ทับกัน (กันขายเกินจริง)', () => {
    const covered = new Set(isoClausesCoveredByDe24());
    for (const c of ISO_ONLY_CLAUSES) expect(covered.has(c), `${c} ซ้ำสองฝั่ง`).toBe(false);
  });

  it('ทำ MIT ครบทุกขั้น ก็ยังไม่ครอบคลุม ISO ทั้งหมด — ต้องต่ำกว่า 100%', () => {
    const h = headStartFromDe24(DE24_DEFS.map((d) => d.index));
    expect(h.pct).toBeGreaterThan(0);
    expect(h.pct).toBeLessThan(100);
  });

  it('ยังไม่ได้ทำ MIT เลย = ไม่มีข้อไหนได้เปรียบ', () => {
    expect(headStartFromDe24([]).clausesWithHeadStart).toHaveLength(0);
    expect(headStartFromDe24([]).pct).toBe(0);
  });

  it('หาสะพานจากข้อ ISO ได้ และคืน undefined เมื่อไม่มีคู่', () => {
    expect(ladderForClause('4.3')?.shared).toBe('scope');
    expect(ladderForClause('6.1')?.shared).toBe('risks');
    expect(ladderForClause('9.2')).toBeUndefined(); // ตรวจติดตามภายใน ไม่มีคู่ใน MIT
  });
});
