import { describe, it, expect } from 'vitest';
import {
  MARKETING_SOURCE, SEG_CODE_MAP, isTestFixture, compareSegments, syncVerdict,
  PENDING_UPSTREAM, UPSTREAM_SEG_ALIAS,
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

  /* 🔁 แก้พร้อมเหตุผล 26 พ.ย. 2569 (ไม่ใช่แก้ค่าเงียบ ๆ — ตามที่ CLAUDE.md สั่งไว้):
   *    เดิมล็อกว่า "ต้องเป็นของอีกระบบ ไม่ใช่ production ของเรา" เพราะตอนนั้น Marketing OS รันบน project แยก
   *    ADR-0011 ย้ายข้อมูลเข้ามา `marketing_os` · ① แอป OS อ่านฐานนี้ผ่านเกณฑ์แล้ว (7/6) · เจ้าของเลือก "ทาง 2"
   *    ⇒ แหล่งจริงย้ายมาแล้ว · project เดิมนิ่งตั้งแต่ 21 พ.ย. — เทียบกับมันต่อ = จับ drift ไม่ได้อีกเลย
   *    ⇒ ล็อกสองทางเหมือนเดิม: ต้องเป็นแหล่งใหม่ **และ** ห้ามชี้กลับไปที่เลิกใช้โดยไม่รู้ตัว */
  it('แหล่งจริง = schema marketing_os ใน production ผ่าน rpc (ไม่ใช่ project เดิมที่เลิกใช้)', () => {
    expect(MARKETING_SOURCE.projectRef).toBe('waigsnxhrlwtiotspaim');
    expect(MARKETING_SOURCE.schema).toBe('marketing_os');
    expect(MARKETING_SOURCE.rpc).toBe('os_brand_sync_segments');
    expect(MARKETING_SOURCE.retiredProjectRef).toBe('bjozpwdtqbpwcxnqguka');
    expect(MARKETING_SOURCE.projectRef).not.toBe(MARKETING_SOURCE.retiredProjectRef);
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
    /* 🔁 แก้ 19 พ.ย. 2569 — employee/growth ย้ายไปชั้น `bridged` แล้ว (alias พาถึง)
     *    เหลือ drift จริงแค่ graduate ที่ฝั่งเรายังไม่มีพาดหัวให้ */
    expect(r.drift.map((d) => d.code)).toEqual(['graduate']);
    for (const d of r.drift) expect(d.fallsBackToDefault).toBe(true);
    expect(r.bridged.map((d) => d.code)).toEqual(['employee', 'growth']);
    for (const b of r.bridged) expect(b.fallsBackToDefault, 'alias พาถึงแล้ว ห้ามบอกว่าตกเป็น default').toBe(false);
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
    expect(v.ok, 'ยังมี graduate ที่ไม่มีอะไรพาถึง ⇒ ยังไม่ผ่าน').toBe(false);
    // 🔁 19 พ.ย. 2569 — ฐานยังนับทุกรหัส แต่ตัวเศษนับเฉพาะ "ที่ยังไม่มีอะไรพาถึง"
    //    (employee/growth มี alias แล้ว ⇒ ไม่ควรถูกนับเป็นของที่พัง)
    expect(v.line).toContain('1 จาก 5');
  });

  /* 🔴 ด่านสำคัญ: `bridged` ต้องไม่กลายเป็นที่ซ่อนปัญหา
   *    ถ้าวันหนึ่งมีคนยัดรหัสที่ยังไม่มี alias จริงเข้าไปในกอง bridged
   *    ตัวตรวจจะขึ้นเขียวทั้งที่ลิงก์ยังพัง — เทสต์นี้กันไว้ */
  it('🔴 ทุกตัวในกอง bridged ต้องมี alias จริงรองรับ ไม่ใช่แค่ถูกจัดกอง', () => {
    for (const b of r.bridged) {
      expect(UPSTREAM_SEG_ALIAS, `${b.code} อยู่ในกอง bridged แต่ไม่มี alias`).toHaveProperty(b.code);
      expect(UPSTREAM_SEG_ALIAS[b.code], `alias ของ ${b.code} ชี้ผิดที่`).toBe(b.localSeg);
    }
    expect(r.bridged.length, 'ไม่มีอะไรในกองนี้ = เทสต์ไม่ได้ตรวจอะไร').toBeGreaterThan(0);
  });

  it('🔴 รหัสเดียวกันห้ามอยู่สองกอง — aligned/bridged/drift ต้องแยกขาด', () => {
    const all = [...r.aligned, ...r.bridged.map((b) => b.code), ...r.drift.map((d) => d.code)];
    expect(new Set(all).size, `มีรหัสซ้ำข้ามกอง: ${all.join(', ')}`).toBe(all.length);
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

/* ══════════════════════════════════════════════════════════════════════════
 * 🔀 alias รหัสกลุ่มของ Marketing OS → HeroSeg ของเรา (19 พ.ย. 2569)
 *
 * 🔴 ปัญหาที่กัน: ทะเบียนของเขาใช้ `growth`/`employee` ฝั่งเราใช้ `owner`/`sidebiz`
 *    ⇒ ลิงก์แคมเปญ `/?seg=growth` ของเขาตกเป็นพาดหัว default ทั้งที่เรารู้กลุ่มเขาแล้ว
 *    (บั๊กตระกูลเดียวกับ `landing_funnel.seg='default'` 97.5% — ledger #73/#74)
 *
 * ⚠️ เทสต์ชุดนี้บังคับ **ความสัมพันธ์** ไม่ใช่ค่า — alias ต้อง derive จาก SEG_CODE_MAP
 *    เสมอ ⇒ แก้พจนานุกรมแล้วลืมแก้ alias เป็นไปไม่ได้โดยโครงสร้าง
 * ══════════════════════════════════════════════════════════════════════════ */
describe('🔀 alias รหัสของอีกระบบ', () => {
  it('ต้อง derive จาก SEG_CODE_MAP ครบทุกตัวที่คำไม่ตรงกัน — ห้ามขาด', () => {
    const should = Object.entries(SEG_CODE_MAP)
      .filter(([code, m]) => m.localSeg !== null && m.localSeg !== code)
      .map(([code]) => code)
      .sort();
    expect(Object.keys(UPSTREAM_SEG_ALIAS).sort()).toEqual(should);
    expect(should.length, 'ไม่มีรหัสที่ต่างกันเลย = ตัวตรวจนี้ไม่ได้ตรวจอะไร').toBeGreaterThanOrEqual(2);
  });

  it('ของจริงวันนี้: growth→owner · employee→sidebiz', () => {
    expect(UPSTREAM_SEG_ALIAS.growth).toBe('owner');
    expect(UPSTREAM_SEG_ALIAS.employee).toBe('sidebiz');
  });

  it('🔴 รหัสที่ไม่มี HeroSeg รองรับ ห้ามอยู่ใน alias — เดาไป = ส่งพาดหัวผิดกลุ่ม', () => {
    // graduate (นักศึกษาจบใหม่) ฝั่งเรายังไม่มีพาดหัวให้ ⇒ ต้องตกเป็น default อย่างซื่อสัตย์
    expect(SEG_CODE_MAP.graduate.localSeg, 'ถ้าวันหนึ่งเพิ่ม HeroSeg ให้ graduate ให้แก้เทสต์นี้ด้วย').toBeNull();
    expect(UPSTREAM_SEG_ALIAS).not.toHaveProperty('graduate');
  });

  it('🔴 alias ห้ามชนกับ HeroSeg ที่มีอยู่ — จะแย่งความหมายของ seg ตัวเอง', () => {
    const ours: string[] = ['default', 'seller', 'newbie', 'sidebiz', 'owner', 'palm', 'food', 'audit', 'btc'];
    const clash = Object.keys(UPSTREAM_SEG_ALIAS).filter((k) => ours.includes(k));
    expect(clash, `รหัส alias ชนกับ HeroSeg ของเรา: ${clash.join(', ')}`).toEqual([]);
  });

  it('🔴 ค่าปลายทางของ alias ต้องเป็น HeroSeg จริงเท่านั้น', () => {
    const ours: string[] = ['default', 'seller', 'newbie', 'sidebiz', 'owner', 'palm', 'food', 'audit', 'btc'];
    for (const [code, target] of Object.entries(UPSTREAM_SEG_ALIAS)) {
      expect(ours, `${code} → ${target} ไม่ใช่ HeroSeg`).toContain(target);
    }
  });
});

describe('🟢 seller ย้ายออกจากคิวรอแล้ว (19 พ.ย. 2569)', () => {
  it('seller อยู่ใน SEG_CODE_MAP และชี้กลับมาที่ seller ของเรา', () => {
    expect(SEG_CODE_MAP.seller?.localSeg).toBe('seller');
    expect(SEG_CODE_MAP.seller?.layer).toBe('growth');
  });

  it('🔴 รหัสเดียวกันห้ามอยู่ทั้งสองที่ — อยู่ในคิวรอ = ยังไม่มีจริง', () => {
    const both = Object.keys(SEG_CODE_MAP).filter((c) => c in PENDING_UPSTREAM);
    expect(both, `อยู่ทั้ง SEG_CODE_MAP และ PENDING_UPSTREAM: ${both.join(', ')}`).toEqual([]);
  });

  it('🔴 ของในคิวรอ ต้องไม่ถูก alias — ปลายทางยังไม่มี ลิงก์ยังใช้ไม่ได้', () => {
    for (const code of Object.keys(PENDING_UPSTREAM)) {
      expect(UPSTREAM_SEG_ALIAS, `${code} ยังไม่มีจริงที่ปลายทาง แต่ถูก alias แล้ว`).not.toHaveProperty(code);
    }
  });

  it('compareSegments กับทะเบียนสดจริง: seller = aligned · ไม่มีอะไรค้างรอ', () => {
    /* ข้อมูลสดจาก bjozpwdtqbpwcxnqguka อ่านผ่าน MCP 19 พ.ย. 2569 */
    const live = [
      { code: 'audit', name: 'ISO / Audit intent' },
      { code: 'employee', name: 'คนทำงานประจำที่ต้องการเริ่มธุรกิจ' },
      { code: 'graduate', name: 'นักศึกษาจบใหม่ที่ต้องการเริ่มธุรกิจ' },
      { code: 'growth', name: 'เจ้าของธุรกิจที่ต้องการเติบโต' },
      { code: 'newbie', name: 'คนที่ต้องการเริ่มทำธุรกิจ' },
      { code: 'seller', name: 'เจ้าของที่มีของขายแล้ว แต่ลูกค้าหาไม่เจอ' },
    ].map((r) => ({ ...r, evidence_status: 'hypothesis', active: true }));
    const r = compareSegments(live);
    expect(r.aligned, 'seller ใช้คำเดียวกันทั้งสองฝั่งแล้ว').toContain('seller');
    expect(r.pendingLanded, 'ไม่มีอะไรค้างในคิวรอแล้ว').toEqual([]);
    expect(r.illegalValidated, 'ห้ามมีตัวไหนประกาศ validated').toEqual([]);
    expect(r.filteredFixtures, 'ข้อมูลทดสอบถูกเก็บไปแล้ว').toEqual([]);
  });
});
