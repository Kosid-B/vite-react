import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ALLOWED_HOSTS } from '../../../supabase/functions/_shared/egressGuard';
import { GATE_CHAIN } from '../releaseGates';
import { KNOWLEDGE, retrieve, buildContext, ragInstruction } from '../knowledgeBase';

/* ══════════════════════════════════════════════════════════════════════
 * skill `rag-data-streaming` อ้าง "สถานะโค้ดจริง" หลายข้อ
 *
 * 🔴 เอกสารที่อ้างสถานะแล้วไม่มีใครเฝ้า = เอกสารที่จะหลอกเราเองรอบหน้า
 *    (ledger #41 — บทสนทนาหายไปกับ context window แต่เอกสารอยู่ต่อ
 *     แล้วรอบถัดไปเราจะอ่านมันแล้วเชื่อมันอีก)
 * ⇒ เทสต์นี้อ่าน SKILL.md **ตัวจริง** แล้วเทียบกับโค้ดตัวจริง
 *   แก้โค้ดแล้วไม่แก้ skill = แดงทันที
 * ══════════════════════════════════════════════════════════════════════ */

const root = resolve(__dirname, '../../..');
const skill = readFileSync(resolve(root, '.claude/skills/rag-data-streaming/SKILL.md'), 'utf8');

describe('skill rag-data-streaming ต้องตรงกับโค้ดจริง', () => {
  it('อ่าน SKILL.md เจอจริง (กันเทสต์ผ่านเพราะไฟล์ว่าง)', () => {
    expect(skill.length, 'ไฟล์สั้นผิดปกติ').toBeGreaterThan(3000);
    expect(skill).toContain('rag-data-streaming');
  });

  /* ── ① ด่าน egress ── */
  it('🔴 จำนวนโฮสต์ที่อนุญาตเปลี่ยน = skill ต้องถูกแก้ด้วย', () => {
    expect(ALLOWED_HOSTS.length, 'เพิ่ม/ลดโฮสต์แล้วต้องแก้ skill ข้อ 5').toBe(2);
    expect(skill, 'skill ต้องบอกจำนวนโฮสต์ให้ตรง').toContain('2 โฮสต์เท่านั้น');
    for (const h of ALLOWED_HOSTS) {
      expect(skill, `skill ต้องระบุโฮสต์ ${h}`).toContain(h);
    }
  });

  /* ── ② RAG ตัวจริงยังอยู่และยังทำงานอย่างที่ skill บอก ── */
  it('ฟังก์ชันที่ skill อ้างต้องมีจริงและทำงานตามที่อ้าง', () => {
    expect(KNOWLEDGE.length).toBeGreaterThan(0);
    expect(retrieve('', 4), 'คำถามว่างต้องคืน [] ไม่ใช่เดา').toEqual([]);
    expect(retrieve('zzzqqq', 4), 'คำที่ไม่มีในฐานเลยต้องคืน []').toEqual([]);
    const hits = retrieve('internal audit', 4, 'iso9001');
    expect(hits.length, 'คำอังกฤษเทคนิคต้องค้นเจอ').toBeGreaterThan(0);
    expect(buildContext(hits), 'ต้องมีหมายเลขอ้างอิงให้ AI').toContain('[1]');
    expect(ragInstruction('ถามอะไรก็ได้'), 'ต้องห้าม AI เดา').toContain('อย่าเดา');
  });

  /* 🔴 ล็อก "จุดบอดที่วัดเจอ" ของ skill ข้อ 1.1 ให้เป็นของจริง ไม่ใช่คำบรรยาย
   *    ตัวกรองเดียวคือ score > 0 + ไทยเป็น n-gram 3–4 ตัวอักษร
   *    ⇒ ประโยคไทยที่มีคำทั่วไปลาก chunk ที่ไม่เกี่ยวเข้ามาได้
   *    วันที่มีคนแก้ (ใส่เกณฑ์คะแนนขั้นต่ำ) เทสต์นี้แดง = ต้องไปลบหัวข้อ 1.1 ออกจาก skill
   *    (เอกสารที่ยังเตือนเรื่องที่แก้แล้ว ทำให้คนไม่เชื่อเอกสารทั้งฉบับ) */
  it('จุดบอด retrieval ที่ skill ประกาศไว้ ต้องยังเป็นจริง (แดง = แก้แล้ว ⇒ ไปลบข้อ 1.1)', () => {
    const noise = retrieve('zzzqqq ไม่มีคำนี้ในฐานความรู้', 4);
    expect(skill, 'skill ต้องยังประกาศจุดบอดนี้').toContain('1.1 จุดบอดของ retrieval');
    expect(
      noise.length,
      'retrieval แม่นขึ้นแล้ว — ข่าวดี แต่ต้องไปลบหัวข้อ 1.1 ใน SKILL.md ด้วย',
    ).toBeGreaterThan(0);
    expect(skill, 'ตารางใน skill ต้องเขียน id ที่คืนมาจริง').toContain(noise[0].id);
  });

  it('🔴 สาย RAG ต้องยังถูกเรียกใช้จริงใน Knowledge.tsx (skill ติดป้าย 🟢 ไว้)', () => {
    const page = readFileSync(resolve(root, 'src/pages/Knowledge.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const fn of ['retrieve(', 'buildContext(', 'ragInstruction(', 'callAiAssist(']) {
      expect(page, `${fn} ไม่ถูกเรียกแล้ว — ป้าย 🟢 ใน skill กลายเป็นคำโกหก`).toContain(fn);
    }
  });

  it('ฐานความรู้ยังไม่ใช้เวกเตอร์ — ถ้าเปลี่ยน ต้องแก้ skill ทั้งข้อ 1 และ 3', () => {
    const kb = readFileSync(resolve(root, 'src/lib/knowledgeBase.ts'), 'utf8');
    const code = kb.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code, 'เริ่มใช้ embedding แล้ว = skill เล่าผิด').not.toMatch(/embedding|pgvector|ML_PREDICT/i);
  });

  /* ── ③ ด่านปล่อยของ ── */
  /* 🔁 22 พ.ย. 2569 — เดิมผูกกับด่านเดียว (`phase1-acceptance-2`) · บทเรียน ledger #99:
   *    ด่านเฝ้าที่ผูกกับ "ชื่อที่เคยเปลี่ยน" จะเงียบเมื่อด่านอื่นเปลี่ยนบ้าง
   *    ⇒ อ่าน `GATE_CHAIN` เอง · ทุกสถานะที่มีอยู่จริงต้องปรากฏใน skill */
  it('🔴 สถานะของทุกด่านใน GATE_CHAIN ต้องตรงกับที่ skill เขียน', () => {
    expect(GATE_CHAIN.length, 'ไม่มีด่านให้ตรวจ').toBeGreaterThan(0);
    for (const g of GATE_CHAIN) {
      expect(skill, `${g.key} อยู่สถานะ ${g.status} แต่ skill เขียนอย่างอื่น`)
        .toContain(`\`status: '${g.status}'\``);
    }
  });

  /* ── ④ ของที่ต้องอยู่กองไหน ── */
  it('ของที่ยังไม่ถึงเวลา ต้องมีตัวเลข/เงื่อนไขปลดล็อก ห้ามเขียน "เมื่อโตกว่านี้"', () => {
    const sec = skill.slice(skill.indexOf('### ⏳'), skill.indexOf('### 🚫'));
    const deferred = sec.slice(sec.indexOf('\n')); // ตัดหัวข้อออก — หัวข้ออ้างคำต้องห้ามเพื่อ "ห้าม" มัน
    expect(deferred.length, 'ไม่เจอกอง ⏳').toBeGreaterThan(200);
    expect(deferred, 'pgvector ต้องอยู่กองที่ยังไม่ถึงเวลา').toContain('pgvector');
    expect(deferred, 'ต้องมีเงื่อนไขปลดล็อกที่ตรวจได้').toContain('ผู้ใช้อัปโหลดเอกสารเองได้');
    expect(deferred, 'ห้ามเลื่อนงานด้วยคำคลุมเครือ').not.toMatch(/เมื่อโตกว่านี้|ในอนาคตค่อย|ไว้ก่อน/);
  });

  it('🔴 Confluent/Kafka/Flink ต้องอยู่กองห้ามลอก ไม่ใช่กองทำได้ตอนนี้', () => {
    const now = skill.slice(skill.indexOf('### ✅'), skill.indexOf('### ⏳'));
    for (const w of ['Confluent', 'Kafka', 'Flink', 'vector store']) {
      expect(now, `${w} ไปโผล่ในกอง "ทำได้ตอนนี้" — ผิดเฟส`).not.toContain(w);
    }
    const banned = skill.slice(skill.indexOf('### 🚫'));
    for (const w of ['Confluent Cloud', 'Flink']) {
      expect(banned, `${w} ต้องถูกประกาศว่าห้ามลอกพร้อมเหตุผล`).toContain(w);
    }
  });

  it('ตัวเลขของผู้ขายต้องติดป้ายว่าไม่ใช่สิ่งที่เราวัดเอง', () => {
    expect(skill, 'ตัวเลข 90% ของ IDC ต้องไม่ถูกยกเป็นข้อเท็จจริงของเรา').toContain('90%');
    expect(skill).toMatch(/ห้ามเป็น `validated`/);
  });
});
