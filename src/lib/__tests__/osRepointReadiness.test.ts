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
  APP_REPOINTED,
  IDENTITY_APPROACH,
  IDENTITY_FACTS,
  IDENTITY_IMPLEMENTED,
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
    expect(c.structureOnly).toBe(12);
    expect(c.absent).toBe(0);
    expect(c.present).toBe(17);
    expect(OS_REPOINT_MEASURED_AT).toBe('2026-11-26');
  });

  it('🟢 ตารางครบแล้ว — ห้ามถอยกลับไปมีตาราง absent โดยไม่รู้ตัว (migration 0070/0071)', () => {
    expect(OS_APP_TABLES.filter((t) => t.state === 'absent')).toEqual([]);
  });

  it('ทุกตารางต้องมีสถานะที่รู้จัก และห้ามชื่อซ้ำ', () => {
    const names = OS_APP_TABLES.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const t of OS_APP_TABLES) {
      expect(['has_data', 'structure_only', 'absent']).toContain(t.state);
    }
  });

  it('ยอดรวมของสามสถานะต้องเท่ากับจำนวนตารางทั้งหมด (ห้ามมีตัวไหนหายไปจากกอง)', () => {
    const c = osRepointCoverage();
    expect(c.hasData + c.structureOnly + c.absent).toBe(c.total);
  });

  it('ต้องบอกที่มาและวิธีนับไว้ ไม่ใช่ตัวเลขลอย (ledger #79)', () => {
    expect(OS_APP_TABLE_SOURCE).toContain('database.types.ts');
    expect(OS_REPOINT_HOW_TO_COUNT).toContain('information_schema.tables');
    expect(OS_REPOINT_HOW_TO_COUNT).toContain('count(*)');
  });
});

describe('osRepointReadiness — ด่านกั้น', () => {
  it('🔴 วันนี้ยังไม่พร้อม — และเหลือด่านเดียวคือ "แอปยังไม่ชี้มาฐานเรา"', () => {
    expect(osRepointReady()).toBe(false);
    const b = osRepointBlockers();
    expect(b).toHaveLength(1);
    expect(b[0]).toContain('แอป OS ยังชี้ไป project เดิม');
  });

  it('🟢 identity ทำแล้วจริง (ADR-0016) — ตารางครบ + identity จบ เหลือแค่แอป', () => {
    expect(IDENTITY_APPROACH).toBe('shared_auth_users');
    expect(IDENTITY_IMPLEMENTED).toBe(true);
    expect(APP_REPOINTED).toBe(false);
    // ถอย identity กลับ = ต้องมี blocker สองข้อ ไม่ใช่ข้อเดียว
    expect(osRepointBlockers(OS_APP_TABLES, { identityReady: false })).toHaveLength(2);
    // แอปชี้มาแล้ว = ผ่านครบ
    expect(osRepointReady(OS_APP_TABLES, { appRepointed: true })).toBe(true);
  });

  it('ด่านนี้ไม่ใช่ false ตายตัว — ครบทุกตาราง + ตัดสิน identity แล้ว = ผ่าน', () => {
    const allThere: OsAppTable[] = OS_APP_TABLES.map((t) => ({ ...t, state: 'has_data' }));
    expect(osRepointReady(allThere, { identityReady: true, appRepointed: true })).toBe(true);
    expect(osRepointBlockers(allThere, { identityReady: true, appRepointed: true })).toEqual([]);
  });

  it('แก้ identity อย่างเดียวไม่พอ · สร้างตารางอย่างเดียวก็ไม่พอ (ต้องครบทั้งคู่)', () => {
    const oneGone: OsAppTable[] = OS_APP_TABLES.map((t, i) =>
      i === 0 ? { ...t, state: 'absent' as const } : t,
    );
    expect(osRepointReady(oneGone, { identityReady: true, appRepointed: true })).toBe(false);
    expect(osRepointReady(OS_APP_TABLES, { identityReady: false, appRepointed: true })).toBe(false);
  });

  it('🟢 structure_only ไม่ใช่ blocker — 0 แถวเท่ากับฝั่งเขา ไม่ใช่ข้อมูลหาย', () => {
    const mixed: OsAppTable[] = [
      { name: 'a', state: 'has_data' },
      { name: 'b', state: 'structure_only' },
    ];
    expect(osRepointBlockers(mixed, { identityReady: true, appRepointed: true })).toEqual([]);
  });

  it('🔴 แต่ absent ยังเป็น blocker เสมอ แม้ identity จบแล้ว', () => {
    const gone: OsAppTable[] = [
      { name: 'a', state: 'has_data' },
      { name: 'b', state: 'absent' },
    ];
    const b = osRepointBlockers(gone, { identityReady: true, appRepointed: true });
    expect(b).toHaveLength(1);
    expect(b[0]).toContain('1 ตัวไม่มีในฐานเราเลย');
  });
});

describe('osRepointReadiness — ความจริงเรื่อง identity', () => {
  it('🔴 ล็อกตัวเลขที่วัดได้ และบังคับให้ "สมาชิกทั้งหมด" แยกจาก "ผู้ใช้จริง" เสมอ', () => {
    const f = IDENTITY_FACTS;
    expect(f.membersTotal).toBe(11);
    expect(f.realMembers).toBe(1);
    expect(f.fixtureMembers).toBe(10);
    expect(f.realMembers + f.fixtureMembers).toBe(f.membersTotal);
    expect(f.realWorkspaces).toBe(1);
    expect(f.fixtureWorkspaces).toBe(2);
    expect(f.realWorkspaces + f.fixtureWorkspaces).toBe(f.workspacesTotal);
    expect(f.realMembersInOurAuthUsers).toBe(0);
    expect(f.measuredAt).toBe('2026-11-26');
  });

  it('🔴 fixture ต้องไม่ถูกนับเป็นผู้ใช้จริง — ถ้าเท่ากันคือกลับไปสับสนเหมือนเดิม', () => {
    expect(IDENTITY_FACTS.realMembers).toBeLessThan(IDENTITY_FACTS.membersTotal);
  });

  it('ข้อความ blocker ต้องไม่อ้างจำนวนรวมเป็นจำนวนคนที่ต้องย้าย', () => {
    const b = osRepointBlockers(OS_APP_TABLES, { identityReady: false });
    expect(b.join(' ')).not.toContain('11 คน');
  });
});

describe('osRepointReadiness — เอกสารต้องพูดตรงกับตัวเลข', () => {
  it('🔴 CLAUDE.md ห้ามอ้าง workspace_members 11 คน แบบที่อ่านว่าเป็นคนจริง 11 คน', () => {
    const lines = read('CLAUDE.md')
      .split('\n')
      .filter((l) => /workspace_members/.test(l) && /11 คน/.test(l) && !l.includes('เคยเขียน'));
    expect(lines).toEqual([]);
  });

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
