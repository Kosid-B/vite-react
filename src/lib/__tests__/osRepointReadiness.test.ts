import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  OS_APP_TABLES,
  OS_APP_TABLE_SOURCE,
  OS_REPOINT_COVERAGE_PHRASE,
  OS_REPOINT_HOW_TO_COUNT,
  OS_REPOINT_MEASURED_AT,
  OS_REPOINT_OBSERVABLE_SIGNAL,
  IDENTITY_DECIDED,
  osRepointBlockers,
  osRepointCoverage,
  osRepointReady,
  type OsAppTable,
} from '../osRepointReadiness';

const root = resolve(__dirname, '../../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf-8');

const CHECKLIST = 'docs/product/OS-APP-REPOINT-CHECKLIST.md';

/**
 * บรรทัดที่ยัง "อ้างว่าจริงวันนี้" — ไม่นับบรรทัดที่ยกคำผิดมาอ้างอิงเพื่อแก้
 * 🔴 ด่านรอบแรกของเทสต์นี้แดงใส่ **ประโยคแก้คำผิดของตัวเอง** (ความผิดชุดเดียวกับ ledger #82
 *    ที่ไปนับคำในคอมเมนต์) ⇒ เส้นแบ่งที่ถูก: คำที่เสียเครดิตแล้วปรากฏได้
 *    **เฉพาะเมื่อบรรทัดนั้นประกาศว่ามันเคยเขียนผิด** ("เคยเขียน")
 */
export function liveClaimLines(md: string, phrase: string): string[] {
  return md
    .split('\n')
    .filter((l) => l.includes(phrase) && !l.includes('เคยเขียน'));
}

describe('osRepointReadiness — ตัวเลขที่ล็อกไว้', () => {
  it('ล็อกค่าที่วัดได้ 26 พ.ย. 2569 ทีละตัว (เปลี่ยนแล้วต้องรู้ตัว)', () => {
    const c = osRepointCoverage();
    expect(c.total).toBe(17);
    expect(c.hasData).toBe(5);
    expect(c.emptyShellPublic).toBe(4);
    expect(c.absent).toBe(8);
    expect(OS_REPOINT_MEASURED_AT).toBe('2026-11-26');
  });

  it('ทุกตารางต้องมีสถานะที่รู้จัก และห้ามชื่อซ้ำ', () => {
    const names = OS_APP_TABLES.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const t of OS_APP_TABLES) {
      expect(['has_data', 'empty_shell_public', 'absent']).toContain(t.state);
    }
  });

  it('ยอดรวมของสามสถานะต้องเท่ากับจำนวนตารางทั้งหมด (ห้ามมีตัวไหนหายไปจากกอง)', () => {
    const c = osRepointCoverage();
    expect(c.hasData + c.emptyShellPublic + c.absent).toBe(c.total);
  });

  it('ต้องบอกที่มาและวิธีนับไว้ ไม่ใช่ตัวเลขลอย (ledger #79)', () => {
    expect(OS_APP_TABLE_SOURCE).toContain('database.types.ts');
    expect(OS_REPOINT_HOW_TO_COUNT).toContain('information_schema.tables');
    expect(OS_REPOINT_HOW_TO_COUNT).toContain('count(*)');
  });
});

describe('osRepointReadiness — ด่านกั้น', () => {
  it('🔴 วันนี้ยังไม่พร้อม และต้องบอกได้ว่าเพราะอะไร', () => {
    expect(IDENTITY_DECIDED).toBe(false);
    expect(osRepointReady()).toBe(false);
    const b = osRepointBlockers();
    expect(b.join(' ')).toContain('8 ตัวไม่มีในฐานเราเลย');
    expect(b.join(' ')).toContain('identity ยังไม่ตัดสิน');
  });

  it('ด่านนี้ไม่ใช่ false ตายตัว — ครบทุกตาราง + ตัดสิน identity แล้ว = ผ่าน', () => {
    const allThere: OsAppTable[] = OS_APP_TABLES.map((t) => ({ ...t, state: 'has_data' }));
    expect(osRepointReady(allThere, { identityDecided: true })).toBe(true);
    expect(osRepointBlockers(allThere, { identityDecided: true })).toEqual([]);
  });

  it('แก้ identity อย่างเดียวไม่พอ · สร้างตารางอย่างเดียวก็ไม่พอ (ต้องครบทั้งคู่)', () => {
    const allThere: OsAppTable[] = OS_APP_TABLES.map((t) => ({ ...t, state: 'has_data' }));
    expect(osRepointReady(OS_APP_TABLES, { identityDecided: true })).toBe(false);
    expect(osRepointReady(allThere, { identityDecided: false })).toBe(false);
  });

  it('ตารางที่มีแค่ใน public ก็ยังเป็น blocker (public.marketing_* ไม่ใช่ของเรา)', () => {
    const onlyShells: OsAppTable[] = [
      { name: 'a', state: 'has_data' },
      { name: 'b', state: 'empty_shell_public' },
    ];
    const b = osRepointBlockers(onlyShells, { identityDecided: true });
    expect(b).toHaveLength(1);
    expect(b[0]).toContain('1 ตัวมีแค่ใน public');
  });
});

describe('osRepointReadiness — เอกสารต้องพูดตรงกับตัวเลข', () => {
  it(`${CHECKLIST} ต้องอ้างสัดส่วนที่วัดได้ "${OS_REPOINT_COVERAGE_PHRASE}"`, () => {
    expect(read(CHECKLIST)).toContain(OS_REPOINT_COVERAGE_PHRASE);
  });

  it('🔴 CLAUDE.md ห้ามประกาศว่าฝั่งฐานพร้อมหมดแล้ว และต้องแนบสัดส่วนที่วัดได้', () => {
    const md = read('CLAUDE.md');
    expect(liveClaimLines(md, 'ฝั่งฐานพร้อมหมดแล้ว')).toEqual([]);
    expect(md).toContain(OS_REPOINT_COVERAGE_PHRASE);
  });

  it('🔴 เช็กลิสต์ห้ามเขียนว่าฝั่งฐาน "ไม่ต้องทำอะไรเพิ่ม"', () => {
    expect(liveClaimLines(read(CHECKLIST), 'ไม่ต้องทำอะไรเพิ่ม')).toEqual([]);
  });

  it('ด่านนี้ต้องยังจับของจริงได้ · และต้องไม่จับประโยคที่ยกคำผิดมาแก้', () => {
    // จับ: อ้างว่าจริงวันนี้
    expect(
      liveClaimLines('🟢 **ฝั่งฐานพร้อมหมดแล้ว** — ไม่เหลืออะไร', 'ฝั่งฐานพร้อมหมดแล้ว'),
    ).toHaveLength(1);
    // ไม่จับ: ยกมาอ้างอิงว่าเคยเขียนผิด
    expect(
      liveClaimLines('⚠️ เคยเขียนว่า "ฝั่งฐานพร้อมหมดแล้ว" — ผิด', 'ฝั่งฐานพร้อมหมดแล้ว'),
    ).toEqual([]);
    // ไม่จับ: ไม่มีคำนั้นเลย
    expect(liveClaimLines('อะไรก็ว่าไป', 'ฝั่งฐานพร้อมหมดแล้ว')).toEqual([]);
  });

  it('เกณฑ์สำเร็จต้องบอกว่าตัวไหนวัดไม่ได้ ห้ามปล่อยเกณฑ์ที่สังเกตไม่ได้ค้างไว้', () => {
    const doc = read(CHECKLIST);
    expect(OS_REPOINT_OBSERVABLE_SIGNAL.unobservable).toBe('marketing_brand_rules');
    expect(OS_REPOINT_OBSERVABLE_SIGNAL.theirs).toBe(6);
    expect(OS_REPOINT_OBSERVABLE_SIGNAL.ours).toBe(5);
    // เอกสารต้องระบุว่า brand_rules วัดไม่ได้ (แอปไม่ query) ไม่ใช่ยังใช้มันเป็นเกณฑ์ผ่าน
    expect(doc).toContain('แอปไม่ query');
  });
});
