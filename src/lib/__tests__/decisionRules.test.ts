import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  evaluateRules, diagnose, stateSafely, zeroIsNotProof, decisionRulesBlock,
  BOTTLENECK_ORDER, THRESHOLD_STATUS, MIN_SAMPLE_FOR_RATE,
  UTM_COVERAGE_REQUIRED, LEADS_BEFORE_PAID_SCALE,
  type BusinessState,
} from '../decisionRules';

/** สภาพจริงของ CEO AI Thailand เอง 11–24 ส.ค. 2569 (Case #001 · ตรวจสดจาก production) */
const CASE_001: BusinessState = {
  sessions: 85,
  sessionsWithUtm: 2,
  sessionsDefaultSegment: 81,
  definedSegments: 5,
  leadCaptureMechanism: false,
  leads: 0,
  offerEvidence: 0,
};

describe('🔴 Measurement Safety — นับได้ ≠ อัตราจริง (เจ้าของแก้ 24 ส.ค. 2569)', () => {
  it('ตัวอย่างน้อยกว่าเกณฑ์ → ห้ามพูดเป็นเปอร์เซ็นต์', () => {
    const s = stateSafely({ kind: 'inferred-rate', label: 'social signup', numerator: 0, denominator: 32 });
    expect(s).toMatch(/ในข้อมูลที่สังเกต 32 ครั้ง พบ 0 ครั้ง/);
    expect(s).not.toMatch(/%/);
    expect(s).toContain(String(MIN_SAMPLE_FOR_RATE));
  });

  it('ตัวอย่างพอแล้ว จึงพูดเป็นอัตราได้', () => {
    expect(stateSafely({ kind: 'inferred-rate', label: 'x', numerator: 5, denominator: 200 })).toContain('2.5%');
  });

  it('🔴 "0 จาก 32" ห้ามถูกแปลว่าอัตราจริงเป็นศูนย์', () => {
    const s = zeroIsNotProof('การสมัคร', 0, 32);
    expect(s).toMatch(/ยังไม่พบ/);
    expect(s).toMatch(/ยังไม่ได้แปลว่าอัตราจริงเป็นศูนย์/);
  });

  it('การนับตรง ๆ พูดได้ทันที ไม่ต้องรอ sample', () => {
    expect(stateSafely({ kind: 'observed-count', label: 'แคมเปญ', n: 0 })).toBe('แคมเปญ: นับได้ 0');
  });

  it('🏷️ ทุกเกณฑ์ต้องติดป้ายว่าเป็น policy/hypothesis — ห้ามมีตัวไหนอ้างว่า validated', () => {
    expect(Object.keys(THRESHOLD_STATUS).length).toBeGreaterThanOrEqual(4);
    expect(Object.values(THRESHOLD_STATUS)).not.toContain('validated');
    // เกณฑ์ lead ก่อนเพิ่มงบ เป็นสมมติฐาน ไม่ใช่หลักฐาน
    expect(THRESHOLD_STATUS.LEADS_BEFORE_PAID_SCALE).toBe('hypothesis');
  });
});

describe('Decision Rules — Case #001 ของเราเอง', () => {
  it('RULE: MEASUREMENT_NOT_READY ติด และบล็อกข้อสรุปเรื่องช่องทาง', () => {
    const hit = evaluateRules(CASE_001).find((h) => h.rule === 'MEASUREMENT_NOT_READY')!;
    expect(hit).toBeTruthy();
    expect(hit.because).toContain('2 จาก 85');
    expect(hit.nextBestAction).toMatch(/ซ่อมการวัด/);
    expect(hit.blocks.join(' ')).toMatch(/ช่องทางไหนได้ผล/);
  });

  it('RULE: NO_LEAD_CAPTURE ติดเมื่อไม่มีกลไก และ lead = 0', () => {
    expect(evaluateRules(CASE_001).some((h) => h.rule === 'NO_LEAD_CAPTURE')).toBe(true);
    expect(evaluateRules({ ...CASE_001, leadCaptureMechanism: true, leads: 12 })
      .some((h) => h.rule === 'NO_LEAD_CAPTURE')).toBe(false);
  });

  it('RULE: SEGMENTATION_NOT_ACTIVATED ติดเมื่อ default ครองทราฟฟิก ทั้งที่นิยาม segment ไว้แล้ว', () => {
    const hit = evaluateRules(CASE_001).find((h) => h.rule === 'SEGMENTATION_NOT_ACTIVATED')!;
    expect(hit.because).toContain('81 จาก 85');
    expect(hit.blocks.join(' ')).toMatch(/คอนเทนต์เพิ่มแบบกว้าง/);
  });

  it('มี segment เดียว = ไม่ใช่ปัญหาเรื่อง routing', () => {
    expect(evaluateRules({ ...CASE_001, definedSegments: 1 })
      .some((h) => h.rule === 'SEGMENTATION_NOT_ACTIVATED')).toBe(false);
  });

  it('🔴 คอขวดต้องเป็น "ซ่อมการวัด" ไม่ใช่ "ทำคอนเทนต์เพิ่ม"', () => {
    const d = diagnose(CASE_001);
    expect(d.bottleneck).toBe('measurement-readiness');
    expect(d.nextBestAction).toMatch(/ซ่อมการวัด/);
  });

  it('คอขวดต้องเรียงตามลำดับที่ freeze ไว้ ห้ามข้ามขั้น', () => {
    expect(BOTTLENECK_ORDER[0]).toBe('measurement-readiness');
    expect(BOTTLENECK_ORDER[1]).toBe('lead-capture');
    expect(BOTTLENECK_ORDER[BOTTLENECK_ORDER.length - 1]).toBe('scale');
    expect(BOTTLENECK_ORDER.indexOf('paid-validation'))
      .toBeLessThan(BOTTLENECK_ORDER.indexOf('scale'));
    expect(BOTTLENECK_ORDER.indexOf('evidence-accumulation'))
      .toBeLessThan(BOTTLENECK_ORDER.indexOf('paid-validation'));
  });
});

describe('🔬 paid_validation ≠ paid_scale — ห้าม hard-block ทุกกรณี', () => {
  it('วัดผลไม่ได้ → ทดลองด้วยเงินก็ยังไม่ควร (เพราะจะไม่รู้ผล)', () => {
    expect(diagnose(CASE_001).paidValidationAllowed).toBe(false);
  });

  it('🔴 วัดผลได้แล้ว → ทดลองก้อนเล็กทำได้ แม้ยังไม่มี lead ครบเกณฑ์', () => {
    const measured: BusinessState = { ...CASE_001, sessionsWithUtm: 85 };
    const d = diagnose(measured);
    expect(d.paidValidationAllowed).toBe(true);
    expect(d.paidScaleAllowed).toBe(false);      // แต่เพิ่มงบยังไม่ได้
  });

  it('ผ่านครบทุกอย่าง → เพิ่มงบได้', () => {
    const ready: BusinessState = {
      sessions: 500, sessionsWithUtm: 500, sessionsDefaultSegment: 100, definedSegments: 5,
      leadCaptureMechanism: true, leads: LEADS_BEFORE_PAID_SCALE, offerEvidence: 3,
    };
    const d = diagnose(ready);
    expect(d.paidScaleAllowed).toBe(true);
    expect(d.bottleneck).toBeNull();
  });

  it('เหตุผลที่ยังเพิ่มงบไม่ได้ ต้องบอกครบทุกข้อ ไม่ใช่ข้อเดียว', () => {
    const hit = evaluateRules(CASE_001).find((h) => h.rule === 'PAID_SCALE_NOT_READY')!;
    expect(hit.because).toMatch(/วัดผลยังไม่พร้อม/);
    expect(hit.because).toMatch(/lead 0 ยังไม่ถึง/);
    expect(hit.because).toMatch(/ข้อเสนอ/);
    // 🔴 ต้องบล็อกแค่การเพิ่มงบ ไม่ใช่ห้ามใช้เงินทุกรูปแบบ
    expect(hit.blocks.join(' ')).toMatch(/paid scale/);
    expect(hit.nextBestAction).toMatch(/ทดลองก้อนเล็ก/);
  });
});

describe('🔴 กฎต้องเดินทางไปกับ prompt และผูกกับเอกสาร Case #001', () => {
  it('decisionRulesBlock สั่งให้วินิจฉัยก่อน และแยกทดลอง/เพิ่มงบ', () => {
    const b = decisionRulesBlock();
    expect(b).toMatch(/วินิจฉัยก่อน/);
    expect(b).toMatch(/การทดลองด้วยงบเล็ก ≠ การเพิ่มงบ/);
    expect(b).toMatch(/นับได้ ≠ อัตราจริง/);
    for (const step of BOTTLENECK_ORDER) expect(b).toContain(step);
  });

  it('brandBriefBlock() ต้องพากฎการตัดสินใจติดไปด้วย', async () => {
    const { brandBriefBlock } = await import('../brandBrief');
    expect(brandBriefBlock({ forPublicCopy: true })).toMatch(/วินิจฉัยก่อน/);
  });

  it('เอกสาร Case #001 ต้องมีอยู่ และแยก observed ออกจาก hypothesis ชัดเจน', () => {
    const doc = readFileSync(resolve(__dirname, '../../../docs/product/CEOAI-MKT-CASE-001.md'), 'utf8');
    expect(doc).toContain('CEOAI-MKT-CASE-001');
    expect(doc).toMatch(/Observed/);
    expect(doc).toMatch(/Hypothesis/);
    expect(doc).toMatch(/Not yet validated|ยังพิสูจน์ไม่ได้/);
    // ตัวเลขในเอกสารต้องตรงกับที่เทสต์ใช้ — เอกสารกับโค้ดห้ามเล่าคนละเรื่อง
    expect(doc).toContain(String(CASE_001.sessions));
    expect(doc).toContain(String(CASE_001.sessionsWithUtm) + '/' + String(CASE_001.sessions));
    expect(doc).toContain(String(UTM_COVERAGE_REQUIRED * 100) + '%');
  });
});
