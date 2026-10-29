import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  SKILL_CATALOG, SKILL_ACRONYMS, SKILL_TITLE_MAX,
  humanizeSkillId, skillTitle, skillBody, isUntranslated,
} from '../skillCatalog';

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 ที่มา: ภาพหน้าจอจริง 390×664 (29 ต.ค. 2569) — หัวการ์ดบนหน้าขายภาษาไทย
 *    แสดง id ของเครื่อง: "Iso From Day One" · "Ai Dark Marketing" · "Pdpa"
 *    เพราะ h3 = `id.replace(/-/g,' ')` + CSS `text-transform: capitalize`
 * ══════════════════════════════════════════════════════════════════════════ */

const TH = /[฀-๿]/;

describe('ชื่อทักษะต้องเป็นสิ่งที่คนไทยอ่านออก ไม่ใช่สลักของเครื่อง', () => {
  it('🔴 ชื่อที่มาจาก id ต้องไม่หลงเหลือเครื่องหมายขีด', () => {
    // ⚠️ ตรวจที่ humanizeSkillId ไม่ใช่ skillTitle — **ชื่อไทยมีขีดได้อย่างถูกต้อง**
    //    (เจอของจริงตอนเขียนเทสต์: 'Re-upload' ในชื่อของ video-originality-guard)
    //    เทสต์เดิมของผมเหมารวมจนจะไปบังคับให้ตัดขีดที่ถูกต้องทิ้ง
    for (const s of SKILL_CATALOG) expect(humanizeSkillId(s.id), s.id).not.toContain('-');
  });

  it('🔴 ตัวย่อต้องไม่ถูกทำพัง (ของเดิม capitalize ทำพัง 18 รายการ)', () => {
    expect(humanizeSkillId('iso-from-day-one')).toBe('ISO From Day One');
    expect(humanizeSkillId('ai-dark-marketing')).toBe('AI Dark Marketing');
    expect(humanizeSkillId('pdpa')).toBe('PDPA');
    expect(humanizeSkillId('saas-evaluation')).toBe('SaaS Evaluation');
    expect(humanizeSkillId('ab-test-plan')).toBe('A/B Test Plan');
    expect(humanizeSkillId('iso-9001')).toBe('ISO 9001');   // ตัวเลขต้องไม่ถูกแปลง
  });

  it('ทุกตัวย่อในตารางต้องถูกใช้จริงโดย id ที่มีอยู่ (ห้ามมีรายการตาย)', () => {
    const tokens = new Set(SKILL_CATALOG.flatMap((s) => s.id.split('-')));
    for (const k of Object.keys(SKILL_ACRONYMS)) expect(tokens.has(k), k).toBe(true);
  });
});

describe('หัวข้อไทยต้องมาจากข้อความที่เขียนไว้แล้ว — ห้ามแต่งขึ้นเอง', () => {
  it('ใช้ส่วนหน้า " — " เป็นชื่อ และตัดออกจากเนื้อ (ไม่แสดงซ้ำสองที่)', () => {
    const s = { id: 'x-y', desc: 'ตั้งราคาให้มีกำไรจริง — วิธีคิดทีละขั้น' };
    expect(skillTitle(s)).toBe('ตั้งราคาให้มีกำไรจริง');
    expect(skillBody(s)).toBe('วิธีคิดทีละขั้น');
  });

  it('🔴 ชื่อทุกอันต้องมีอยู่จริงในข้อมูลต้นทาง — พิสูจน์ว่าไม่ได้ประดิษฐ์', () => {
    for (const s of SKILL_CATALOG) {
      const t = skillTitle(s);
      expect(s.desc.includes(t) || t === humanizeSkillId(s.id), s.id).toBe(true);
    }
  });

  it('หัวข้อที่ยาวเกินเพดาน = ประโยค ไม่ใช่ชื่อ ⇒ ต้องตกไปใช้ id', () => {
    const longHead = 'ก'.repeat(SKILL_TITLE_MAX + 1);
    expect(skillTitle({ id: 'a-b', desc: `${longHead} — เนื้อ` })).toBe('A B');
    expect(skillBody({ id: 'a-b', desc: `${longHead} — เนื้อ` })).toContain(longHead);
  });

  it('🔒 สามรายการที่หัวข้อเป็นประโยคเต็ม ต้องถูกคัดออกเสมอ', () => {
    for (const id of ['emotional-reel', 'is-pdpa', 'market-insight-thailand']) {
      const s = SKILL_CATALOG.find((x) => x.id === id)!;
      expect(skillTitle(s), id).toBe(humanizeSkillId(id));
    }
  });

  it('ส่วนหน้าที่เป็นภาษาอังกฤษ ห้ามถูกยกเป็นชื่อ (ของ standard ที่ sync มา)', () => {
    const s = { id: 'ab-test-plan', desc: 'Designs A/B test plans — with hypothesis' };
    expect(skillTitle(s)).toBe('A/B Test Plan');
    expect(skillBody(s)).toBe(s.desc);          // ไม่ตัดเนื้อทิ้ง
  });

  it('ไม่มี " — " ก็ต้องคืนเนื้อครบ ไม่หายไปไหน', () => {
    const s = { id: 'a', desc: 'ข้อความสั้น ไม่มีขีด' };
    expect(skillBody(s)).toBe(s.desc);
  });
});

describe('🔴 หนี้ที่ประกาศไว้ — คำบรรยายที่ยังเป็นภาษาอังกฤษบนหน้าขายภาษาไทย', () => {
  /** วัดจากโค้ดจริง 29 ต.ค. 2569: **96 จาก 127 = 76%** ยังเป็นภาษาอังกฤษ
   *  ⚠️ ผมประเมินด้วย regex ครั้งแรกได้ 78 — **ต่ำกว่าความจริง** เพราะ regex อ่านไม่ครบทุกแถว
   *     ⇒ ตัวเลขในเทสต์ต้องมาจาก `isUntranslated()` ที่หน้าเว็บใช้จริง ไม่ใช่จากสคริปต์นับข้างนอก
   *  ⚠️ **ลดได้อย่างเดียว** — เพิ่มขึ้นเมื่อไรแปลว่ามีคน sync ของใหม่เข้ามาแล้วไม่เขียนคำบรรยายไทย
   *  🔴 ห้ามแก้ให้เขียวด้วยการให้ AI แปลเดาเอง — คำบรรยายสินค้าที่ไม่ตรงของจริง = โกหกคนซื้อ */
  const KNOWN_UNTRANSLATED = 96;

  it('จำนวนต้องไม่เพิ่มขึ้นจากที่ประกาศไว้', () => {
    const n = SKILL_CATALOG.filter(isUntranslated).length;
    expect(n, `ตอนนี้ ${n} · ประกาศไว้ ${KNOWN_UNTRANSLATED}`).toBeLessThanOrEqual(KNOWN_UNTRANSLATED);
  });

  /** 🔴 ข้อที่หนักที่สุด: **18 จาก 49 ทักษะที่ "ขายแยก" (รวม ฿24,900) คำบรรยายเป็นภาษาอังกฤษ**
   *  ⇒ หน้าเว็บกำลังขอให้คนไทยจ่าย ฿1,500–2,490 ให้ของที่เขาอ่านไม่ออกว่าคืออะไร
   *  ⚠️ **ลดได้อย่างเดียว** · ปิดได้ทางเดียวคือเจ้าของเขียนคำบรรยายไทยของจริง */
  const SIGNATURE_UNTRANSLATED = 18;

  it('🔴 จำนวนทักษะที่ "ขายแยก" แต่ยังอ่านไม่ออก ต้องไม่เพิ่ม', () => {
    const bad = SKILL_CATALOG.filter((s) => s.origin === 'signature' && isUntranslated(s)).map((s) => s.id);
    expect(bad.length, `ยังเป็นอังกฤษ: ${bad.join(', ')}`).toBeLessThanOrEqual(SIGNATURE_UNTRANSLATED);
  });

  it('ทุกชื่อที่แสดงต้องไม่ว่าง', () => {
    for (const s of SKILL_CATALOG) expect(skillTitle(s).length, s.id).toBeGreaterThan(0);
  });

  it('isUntranslated ดูที่ต้นข้อความ ไม่ใช่ทั้งก้อน (ไทยปนอังกฤษ = ไทย)', () => {
    expect(isUntranslated({ desc: 'หา Pain/Gain point ให้เจอ' })).toBe(false);
    expect(isUntranslated({ desc: 'Designs A/B test plans with hypothesis' })).toBe(true);
    expect(TH.test('หา')).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 ตัวอักษรไทยกับ CSS ที่ลอกมาจากดีไซน์ภาษาอังกฤษ
 *    เทสต์อ่าน `index.css` ตัวจริง — เพราะเทสต์ที่ตรวจแต่ TS จับเรื่องนี้ไม่ได้เลยสักข้อ
 * ══════════════════════════════════════════════════════════════════════════ */
describe('CSS ของบล็อกทักษะ ต้องไม่ใช้กฎที่ทำลายการอ่านภาษาไทย', () => {
  const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');
  /** เอาเฉพาะกฎที่ขึ้นต้นด้วย .ss- / .skill-showcase มาตรวจ */
  const rules = css.split('\n').filter((l) => /^\.(ss-|skill-showcase)/.test(l.trim()));

  it('มีกฎของบล็อกนี้ให้ตรวจจริง (กันเทสต์ที่เดินไม่ถึงแล้วรายงานเขียว)', () => {
    expect(rules.length).toBeGreaterThanOrEqual(20);
  });

  it('🔴 ห้าม letter-spacing บวก — ไทยมีสระ/วรรณยุกต์เกาะตัวอักษร ดึงห่างแล้วอ่านไม่เป็นคำ', () => {
    const bad = rules.filter((l) => /letter-spacing:\s*(?!0|normal)[.\d]/.test(l));
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('🔴 ห้าม text-transform — uppercase/capitalize ไม่มีผลกับอักษรไทย และทำตัวย่อพัง', () => {
    const bad = rules.filter((l) => /text-transform:\s*(uppercase|capitalize)/.test(l));
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('🔴 ห้าม font-style: italic — ฟอนต์ไทยไม่มีตัวเอียงจริง เบราว์เซอร์เอียงให้เอง', () => {
    const bad = rules.filter((l) => /font-style:\s*italic/.test(l));
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('ข้อความไทยหลายบรรทัดต้องมี line-height ≥ 1.5 (หางสระบน/ล่างไม่ถูกตัด)', () => {
    for (const sel of ['.ss-card h3', '.ss-card p', '.ss-stage-label', '.ss-stage-meta']) {
      const line = rules.find((l) => l.startsWith(sel + ' '));
      expect(line, `ไม่เจอกฎ ${sel}`).toBeTruthy();
      const m = /line-height:\s*([\d.]+)/.exec(line!);
      expect(m, `${sel} ไม่ได้กำหนด line-height`).toBeTruthy();
      expect(Number(m![1]), sel).toBeGreaterThanOrEqual(1.5);
    }
  });

  it('🔴 ห้ามใช้ #64748b บนการ์ดพื้น #0b1220 — วัดได้ 3.94:1 ตกเกณฑ์ 4.5', () => {
    const bad = rules.filter((l) => /#64748b/i.test(l));
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

describe('สีต้องสื่อความหมายเดียวกันทั้งหน้า — เขียว = ฟรี · ทอง = ของที่ต้องซื้อ', () => {
  const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');

  it('🔴 กฎสีของ "ทักษะเฉพาะ" ต้องเขียนให้ชนะ .ss-lead strong ได้จริง', () => {
    // เจอจากภาพหน้าจอ: ของเดิม `.ss-sig-count { color:#fbbf24 }` แพ้ `.ss-lead strong` (0,1,1)
    // ⇒ ตัวเลขทักษะที่ "ต้องซื้อ" ขึ้นเป็นสีเขียวซึ่งหน้านี้ใช้แทนคำว่า "ฟรี"
    // ⚠️ ต้องข้ามบรรทัดคอมเมนต์ก่อน — คอมเมนต์ที่อธิบายบั๊กก็มีคำว่า `.ss-sig-count {` อยู่ด้วย
    const rule = css.split('\n')
      .filter((l) => !/^\s*(\/\*|\*)/.test(l))
      .find((l) => l.includes('.ss-sig-count') && l.includes('{'));
    expect(rule, 'ไม่เจอกฎ .ss-sig-count').toBeTruthy();
    const sel = rule!.split('{')[0];
    expect(sel, `selector ที่เขียนไว้: ${sel.trim()}`).toContain('.ss-lead');
    expect(rule).toContain('#fbbf24');
  });
});
