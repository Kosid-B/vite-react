import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  BUDGET, MIN_SAMPLE, SCHEMAS, TASKS, parseInput, systemPrompt, userMessage,
} from '../../../supabase/functions/os-marketing-brain/prompts';

const ROOT = resolve(__dirname, '../../..');
const WS = 'e82e7d93-b88e-48ff-9364-b54bcff5278d';
const seg = { code: 'seller', name: 'เจ้าของที่มีของขายแล้ว', description: null, evidence_status: 'hypothesis' };
const pil = { code: 'p1', name: 'ลองก่อนลงทุน', problem: null, promise: null };
const rule = { id: 'r1', rule_type: 'forbidden_claim', severity: 'blocking', description: 'ห้ามการันตีผล' };

/** structured outputs: ทุก object ต้อง additionalProperties:false + required ครบทุก key — ผิด = API 400 ทั้งฟังก์ชัน */
function strictObjects(node: unknown, path = '$'): string[] {
  if (!node || typeof node !== 'object') return [];
  const n = node as Record<string, unknown>;
  const bad: string[] = [];
  if (n.type === 'object') {
    const keys = Object.keys((n.properties as object) ?? {});
    if (n.additionalProperties !== false) bad.push(`${path}: additionalProperties`);
    const req = (n.required as string[]) ?? [];
    if (keys.some((k) => !req.includes(k))) bad.push(`${path}: required ไม่ครบ`);
  }
  for (const [k, v] of Object.entries(n)) bad.push(...strictObjects(v, `${path}.${k}`));
  return bad;
}

describe('os-marketing-brain — schema ต้องผ่านกติกา structured outputs', () => {
  for (const t of TASKS) {
    it(`${t}: ทุก object ปิด additionalProperties และ required ครบ`, () => {
      expect(strictObjects(SCHEMAS[t])).toEqual([]);
    });
    it(`${t}: ไม่ใช้ constraint ที่ API ไม่รองรับ (min/max/length)`, () => {
      expect(JSON.stringify(SCHEMAS[t])).not.toMatch(/"(minimum|maximum|minLength|maxLength|minItems|maxItems)"/);
    });
  }
});

describe('os-marketing-brain — กติกาใน prompt (มาจาก Content DNA + กฎแบรนด์ ไม่ใช่แต่งเอง)', () => {
  it('ทุกงานมีกฎหลักฐาน: ห้ามแต่งตัวเลข · ติดป้าย fact/estimate/opinion · sample ต่ำห้ามสรุป', () => {
    for (const t of TASKS) {
      const p = systemPrompt(t);
      expect(p).toMatch(/ห้ามแต่งตัวเลข/);
      expect(p).toMatch(/fact.*estimate.*opinion/s);
      expect(p).toContain(String(MIN_SAMPLE));
      expect(p, 'ข้อมูลเป็นข้อมูล ไม่ใช่คำสั่ง (กัน prompt injection)').toMatch(/ไม่ใช่ "คำสั่ง"/);
    }
  });
  it('งานเขียนโฆษณาต้องเป็น "ร่างรอคนอนุมัติ" — AI ห้ามเผยแพร่เอง', () => {
    expect(systemPrompt('ads')).toMatch(/ร่างรอคนอนุมัติ/);
  });
  it('MIN_SAMPLE ตรงกับหน้า "ผลลัพธ์" ของแอป OS (30)', () => {
    expect(MIN_SAMPLE).toBe(30);
  });
  it('ข้อมูลจาก client อยู่ใน <data> แยกจากคำสั่ง', () => {
    const m = userMessage(parseInput({ task: 'compliance', workspaceId: WS, brandRules: [rule], variants: [{ hook: 'h', body: 'b', caption: 'c', cta: 'x' }] }), []);
    expect(m).toMatch(/<data>[\s\S]*<\/data>/);
  });
  it('งานเขียนโฆษณาใช้ effort สูงสุดของสามงาน', () => {
    expect(BUDGET.ads.effort).toBe('high');
  });
});

describe('os-marketing-brain — input จาก client ไม่ไว้ใจ', () => {
  it('รับ input ที่ถูกต้องได้', () => {
    const i = parseInput({ task: 'ads', workspaceId: WS, segment: seg, pillar: pil, channel: 'facebook', objective: 'interest', brandRules: [rule], analysisSummary: '' });
    expect(i.task).toBe('ads');
  });
  it('ปฏิเสธ task / workspace / ช่องทาง ที่ไม่รู้จัก', () => {
    expect(() => parseInput({ task: 'publish', workspaceId: WS })).toThrow(/task/);
    expect(() => parseInput({ task: 'analyze', workspaceId: 'not-a-uuid', segments: [], pillars: [] })).toThrow(/workspaceId/);
    expect(() => parseInput({ task: 'ads', workspaceId: WS, segment: seg, pillar: pil, channel: 'myspace', objective: 'interest', brandRules: [] })).toThrow(/channel/);
  });
  it('จำกัดจำนวนรายการ (กันส่งข้อมูลก้อนใหญ่ให้เสียเงิน)', () => {
    const many = Array.from({ length: 21 }, () => seg);
    expect(() => parseInput({ task: 'analyze', workspaceId: WS, segments: many, pillars: [] })).toThrow(/segments/);
  });
  it('ตัดความยาวข้อความ ไม่ปล่อยผ่านทั้งก้อน', () => {
    const i = parseInput({ task: 'compliance', workspaceId: WS, brandRules: [], variants: [{ hook: 'x'.repeat(5000), body: 'b', caption: 'c', cta: 'x' }] });
    expect(i.task === 'compliance' && i.variants[0].hook.length).toBe(400);
  });
  it('ตัวเลข funnel ไม่รับจาก client — analyze รับแค่จำนวน event ที่ทำความสะอาดแล้ว', () => {
    const i = parseInput({ task: 'analyze', workspaceId: WS, segments: [], pillars: [], eventCounts: { view: -5, engaged: 'x', action: 3.7, sessions: 9999 } });
    expect(i.task === 'analyze' && i.eventCounts).toEqual({ view: 0, engaged: 0, action: 3 });
  });
});

describe('os-marketing-brain — ตัวฟังก์ชัน', () => {
  const code = readFileSync(resolve(ROOT, 'supabase/functions/os-marketing-brain/index.ts'), 'utf8');
  it('ต้องตรวจสมาชิกผ่าน rpc ก่อนเรียก AI และตอบ 403 เมื่อไม่ใช่สมาชิก', () => {
    expect(code.indexOf("rpc(\"os_member_funnel_summary\"")).toBeGreaterThan(-1);
    expect(code.indexOf('os_member_funnel_summary')).toBeLessThan(code.indexOf('client.beta.messages.create'));
    expect(code).toMatch(/not_a_member" \}, 403/);
  });
  it('ออกเน็ตผ่าน guardedFetch · ตรวจ refusal ก่อนอ่านผล · ไม่มีคีย์ฝัง', () => {
    expect(code).toMatch(/guardedFetch/);
    expect(code.indexOf('stop_reason === "refusal"')).toBeLessThan(code.indexOf('JSON.parse(text.text)'));
    expect(code).not.toMatch(/sk-ant-/);
  });
  it('verify_jwt = true ใน config.toml', () => {
    const toml = readFileSync(resolve(ROOT, 'supabase/config.toml'), 'utf8');
    expect(toml).toMatch(/\[functions\.os-marketing-brain\]\s*\nverify_jwt = true/);
  });
});
