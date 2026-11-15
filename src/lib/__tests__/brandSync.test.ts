import { describe, it, expect } from 'vitest';
import {
  MARKETING_SOURCE, SEG_CODE_MAP, isTestFixture, compareSegments, syncVerdict,
  type RemoteSegment,
} from '../brandSync';
import { HERO_VARIANTS } from '../heroVariant';

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 ที่มา (15 พ.ย. 2569): เจ้าของสั่งให้เชื่อมฐานสองตัวให้ใช้งานร่วมกัน
 *    ตรวจสดแล้วพบว่า **รหัสกลุ่มเป้าหมายของสองระบบตรงกันแค่ 2 จาก 5**
 *    ⇒ วันที่อีกระบบเริ่มปล่อยลิงก์ `?seg=<code>` ของมัน 3 กลุ่มจะตกเป็นพาดหัว default
 *       ซึ่งเป็นอาการเดียวกับ ledger #73/#74 ที่เพิ่งแก้ไปเป๊ะ
 *    🟡 ยังไม่เสียหายจริงวันนี้ — `marketing_tracking_links` = 0 แถว (ยังไม่เคยปล่อยลิงก์)
 * ══════════════════════════════════════════════════════════════════════════ */

/** ของจริงที่อ่านจาก bjozpwdtqbpwcxnqguka เมื่อ 15 พ.ย. 2569 */
const REMOTE_REAL: RemoteSegment[] = [
  { code: 'audit', name: 'ISO / Audit intent', evidence_status: 'hypothesis', active: true },
  { code: 'employee', name: 'คนทำงานประจำที่ต้องการเริ่มธุรกิจ', evidence_status: 'hypothesis', active: true },
  { code: 'graduate', name: 'นักศึกษาจบใหม่ที่ต้องการเริ่มธุรกิจ', evidence_status: 'hypothesis', active: true },
  { code: 'growth', name: 'เจ้าของธุรกิจที่ต้องการเติบโต', evidence_status: 'hypothesis', active: true },
  { code: 'newbie', name: 'คนที่ต้องการเริ่มทำธุรกิจ', evidence_status: 'hypothesis', active: true },
];

describe('เส้นแบ่งที่ยังอยู่ — อนุญาตแค่อ่าน 3 ตาราง', () => {
  it('🔴 ห้ามเขียนลงฐานของอีกระบบทุกกรณี', () => {
    expect(MARKETING_SOURCE.writeAllowed).toBe(false);
  });

  it('🔴 รายการตารางที่อ่านได้ต้องเป็น 3 ตัวนี้เป๊ะ — ห้ามขยายเงียบ ๆ', () => {
    expect([...MARKETING_SOURCE.readOnlyTables].sort()).toEqual([
      'marketing_audience_segments', 'marketing_brands', 'marketing_message_pillars',
    ]);
  });

  it('project ref ต้องเป็นของอีกระบบ ไม่ใช่ production ของเรา', () => {
    expect(MARKETING_SOURCE.projectRef).toBe('bjozpwdtqbpwcxnqguka');
    expect(MARKETING_SOURCE.projectRef).not.toBe('waigsnxhrlwtiotspaim');
  });
});

describe('ข้อมูลทดสอบของอีกระบบ — กรองออก ไม่ลบ', () => {
  it('จับ RLS_TEST_* ได้ทุกแบบ', () => {
    expect(isTestFixture('RLS_TEST_A_AUDIENCE')).toBe(true);
    expect(isTestFixture('rls_test_b_brand')).toBe(true);
    expect(isTestFixture(' RLS_TEST_X ')).toBe(true);
    expect(isTestFixture('คนที่ต้องการเริ่มทำธุรกิจ')).toBe(false);
    expect(isTestFixture(null)).toBe(false);
  });

  it('🔴 ของที่กรองทิ้งต้องถูกประกาศ ไม่ใช่หายเงียบ', () => {
    const r = compareSegments([
      ...REMOTE_REAL,
      { code: 'x1', name: 'RLS_TEST_A_AUDIENCE' },
      { code: 'x2', name: 'RLS_TEST_B_AUDIENCE' },
    ]);
    expect(r.filteredFixtures).toEqual(['RLS_TEST_A_AUDIENCE', 'RLS_TEST_B_AUDIENCE']);
    // และต้องไม่ถูกนับเป็น drift จนบังหน้าปัญหาจริง
    expect(r.drift.map((d) => d.code)).not.toContain('x1');
  });
});

describe('🔴 รหัสกลุ่มของสองระบบ — ต้องทำให้ความไม่ตรงมองเห็นได้', () => {
  const r = compareSegments(REMOTE_REAL);

  it('ตรงกันแค่ newbie กับ audit (สถานะจริง 15 พ.ย. 69)', () => {
    expect(r.aligned).toEqual(['audit', 'newbie']);
  });

  it('employee / graduate / growth = กับดักที่จะตกเป็นพาดหัว default', () => {
    expect(r.drift.map((d) => d.code)).toEqual(['employee', 'graduate', 'growth']);
    for (const d of r.drift) expect(d.fallsBackToDefault).toBe(true);
  });

  it('ทุก drift ต้องบอกเหตุผล ไม่ใช่แค่ชี้ว่าไม่ตรง', () => {
    for (const d of r.drift) expect(d.why.length).toBeGreaterThan(10);
  });

  it('🔴 รหัสที่บอกว่า "ตรง" ต้องเป็น HeroSeg ที่มีอยู่จริงในผลิตภัณฑ์', () => {
    for (const code of r.aligned) expect(HERO_VARIANTS).toHaveProperty(code);
  });

  it('🔴 localSeg ทุกตัวใน SEG_CODE_MAP ต้องมีอยู่จริง — ห้ามแมปไปที่ seg ที่ไม่มี', () => {
    for (const [code, m] of Object.entries(SEG_CODE_MAP)) {
      if (m.localSeg !== null) expect(HERO_VARIANTS, `${code} → ${m.localSeg}`).toHaveProperty(m.localSeg);
    }
  });

  it('ครบทั้ง 5 ชั้น — ไม่มีชั้นไหนหายไปจากแหล่งจริง', () => {
    expect(r.missingUpstream).toEqual([]);
  });

  it('สรุปต้องบอกว่าไม่ผ่าน และบอกจำนวนตามจริง', () => {
    const v = syncVerdict(r);
    expect(v.ok).toBe(false);
    expect(v.line).toContain('3 จาก 5');
  });
});

describe('🔴 สถานะหลักฐานของอีกระบบ ห้ามถูกอ่านเป็น validated', () => {
  it('ของจริงวันนี้เป็น hypothesis ทั้งหมด ⇒ ไม่มีข้อห้ามถูกละเมิด', () => {
    expect(compareSegments(REMOTE_REAL).illegalValidated).toEqual([]);
  });

  it('ถ้าอีกระบบประกาศ validated ต้องดักได้ และต้องชนะ drift ในการรายงาน', () => {
    const r = compareSegments([{ code: 'newbie', name: 'x', evidence_status: 'validated' }]);
    expect(r.illegalValidated).toEqual(['newbie']);
    expect(syncVerdict(r).ok).toBe(false);
    expect(syncVerdict(r).line).toContain('validated');
  });
});

describe('กรณีขอบ', () => {
  it('ไม่มีข้อมูลเลย = ไม่ผ่านแบบเงียบไม่ได้ · ต้องบอกว่าทุกชั้นหายไป', () => {
    const r = compareSegments([]);
    expect(r.aligned).toEqual([]);
    expect(r.drift).toEqual([]);
    expect(r.missingUpstream).toHaveLength(5);
  });

  it('รหัสที่เราไม่รู้จักเลย ต้องไม่ทำให้พัง และต้องรายงานว่าไม่เคยแมป', () => {
    const r = compareSegments([{ code: 'unknown_seg', name: 'กลุ่มใหม่' }]);
    expect(r.drift[0].layer).toBeNull();
    expect(r.drift[0].why).toContain('ไม่เคยแมป');
  });
});
