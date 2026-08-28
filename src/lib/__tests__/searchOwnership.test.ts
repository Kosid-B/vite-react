import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FORBIDDEN_NAME_FORMS, nameFormIssues, declaredNameIssues, NAME_DECLARING_METAS,
  manifestNameIssues, MANIFEST_NAME_FIELDS,
  KEYWORD_LAYERS, RINGS, RING1_OWNED_SERP_TARGET,
  ringVerdict, trafficVerdict, checkComparison, COMPARISON_REQUIRED, COMPARISON_BANNED,
  CONTENT_CHAIN, isComparisonContent, CONFUSABLE_ORGS,
} from '../searchOwnership';
import { violatesBrand } from '../brandBrief';
import { BRAND_NAME, ALTERNATE_NAMES } from '../brandEntity';
import { MIN_FOR_RATE } from '../growthPdca';

/* ══════════════════════════════════════════════════════════════════════════
 * เจ้าของตัดสิน 27 ส.ค. 2569: "PROCEED WITH CONTROLS"
 * ⇒ เทสต์ชุดนี้คือ CONTROLS · ถ้ามันไม่แดงเวลาเราทำผิด แปลว่าไม่มี control จริง
 * ══════════════════════════════════════════════════════════════════════════ */

describe('Risk 1 — ชื่อต้องสะกดแบบเดียว', () => {
  it('สะกดถูกต้องไม่โดนฟ้อง — แม้ชื่อเต็มจะมีรูปที่ห้ามซ่อนอยู่ข้างใน', () => {
    // 🔴 กับดัก: รูปที่ห้าม 'CEO AI' เป็นสตริงย่อยของชื่อเต็มเสมอ
    expect(nameFormIssues(`${BRAND_NAME} ช่วย SME ไทยวางกลยุทธ์`)).toEqual([]);
    expect(nameFormIssues('CEO AI ไทย คือชื่อเรียกเดียวกัน')).toEqual([]);
  });

  it('ตัดคำว่า Thailand ออก = ฟ้อง', () => {
    const found = nameFormIssues('ใช้ CEO AI ในการทำธุรกิจ');
    expect(found.length).toBe(1);
    expect(found[0].form).toBe('CEO AI');
    expect(found[0].why).toMatch(/generic/);
  });

  it('สลับลำดับคำ / พิมพ์ใหญ่ทั้งหมด = ฟ้อง', () => {
    expect(nameFormIssues('CEO Thailand AI').length).toBeGreaterThan(0);
    expect(nameFormIssues('CEOAITHAILAND').length).toBe(1);
  });

  it('รูปไม่มีเว้นวรรคใช้ได้เฉพาะ handle / แฮชแท็ก / URL', () => {
    expect(nameFormIssues('https://www.youtube.com/@CEOAIThailand')).toEqual([]);
    expect(nameFormIssues('#CEOAIThailand')).toEqual([]);
    // แต่ใช้แทนชื่อในเนื้อความไม่ได้
    const bad = nameFormIssues('บริการของ CEOAIThailand ช่วยคุณได้');
    expect(bad.map((i) => i.form)).toContain('CEOAIThailand');
  });

  it('ทุกรูปที่ห้าม ต้องบอกเหตุผล — ห้ามห้ามลอย ๆ', () => {
    for (const f of FORBIDDEN_NAME_FORMS) expect(f.why.length).toBeGreaterThan(15);
  });

  it('alias ที่ประกาศไว้ ต้องไม่ขัดกับรูปที่ห้ามใช้เป็นชื่อหลัก', () => {
    // ceoaithailand / CEO AI ไทย เป็น alias ที่ใช้ได้ — ต้องไม่ถูกฟ้อง
    expect(nameFormIssues('ceoaithailand')).toEqual([]);
    expect(ALTERNATE_NAMES).toContain('CEO AI ไทย');
  });
});

describe('Risk 1 — พื้นผิวที่ "ประกาศชื่อ" ให้เครื่องอ่าน ต้องตรงกันหมด', () => {
  const HTML = readFileSync(join(process.cwd(), 'index.html'), 'utf8');

  it('index.html — ทุกจุดที่ประกาศชื่อ ต้องเป็นชื่อ canonical', () => {
    expect(declaredNameIssues(HTML)).toEqual([]);
  });

  it('ชื่อที่ขึ้นใต้ไอคอนบนหน้าจอ iOS ก็เป็นการประกาศชื่อ (จุดที่ลืมง่ายที่สุด)', () => {
    expect(NAME_DECLARING_METAS).toContain('apple-mobile-web-app-title');
    // เคยเขียนผิดจริง 27 ส.ค. 2569 — จำลองของเดิมกลับมาแล้วต้องจับได้
    const broken = HTML.replace(
      /(<meta name="apple-mobile-web-app-title" content=")[^"]*(")/,
      '$1' + BRAND_NAME.split(' ').slice(0, 2).join(' ') + '$2',
    );
    const found = declaredNameIssues(broken);
    expect(found.map((i) => i.where)).toContain('apple-mobile-web-app-title');
  });

  it('manifest.json — ทุกช่องที่ประกาศชื่อต้องเป็นชื่อ canonical', () => {
    const mf = readFileSync(join(process.cwd(), 'public/manifest.json'), 'utf8');
    expect(manifestNameIssues(mf)).toEqual([]);
  });

  it('🔴 short_name เป็นที่ที่ชื่อย่อแอบเข้ามาง่ายที่สุด — ต้องจับได้', () => {
    expect(MANIFEST_NAME_FIELDS).toContain('short_name');
    // จำลองของเดิมที่เขียนผิดจริง 28 ส.ค. 2569
    const broken = JSON.stringify({ name: BRAND_NAME, short_name: BRAND_NAME.split(' ').slice(0, 2).join(' ') });
    expect(manifestNameIssues(broken).map((i) => i.where)).toContain('manifest.short_name');
  });

  it('title ที่ไม่ได้ขึ้นต้นด้วยชื่อแบรนด์ = ฟ้อง', () => {
    const bad = HTML.replace(/<title>[\s\S]*?<\/title>/i, '<title>ระบบ AI สำหรับ SME</title>');
    expect(declaredNameIssues(bad).map((i) => i.where)).toContain('<title>');
  });

  it('🔴 ห้ามใช้ตัวสแกนชื่อกับโค้ดทั้งรีโป — การเอ่ยถึงกลางประโยคไทยเป็นภาษาปกติ', () => {
    // เส้นแบ่ง: "ที่ประกาศชื่อ" ต้องเต็ม · "เอ่ยถึงกลางประโยค" สั้นได้
    // ถ้าใครเผลอเอา nameFormIssues ไปไล่ทั้งรีโป จะได้ผลบวกปลอมแบบนี้
    expect(nameFormIssues('ให้ CEO AI จัดทีมผู้บริหารให้').length).toBeGreaterThan(0);
    expect(declaredNameIssues('<p>ให้ CEO AI จัดทีมผู้บริหารให้</p>')).toEqual([]);
  });
});

describe('3 Rings — ยึดทีละวง ห้ามข้ามขั้น', () => {
  it('ตรวจไม่ได้ = อยู่วง 1 เสมอ (fail-closed) และประกาศว่าตาบอด', () => {
    const v = ringVerdict();
    expect(v.ring).toBe(1);
    expect(v.blind).toBe(true);
    expect(v.openLayers).toEqual(['brand']);
    expect(v.lockedLayers).toContain('category');
  });

  it('ยังไม่ถึงเป้าของวง 1 ⇒ ห้ามเปิดคำหมวดหมู่', () => {
    const v = ringVerdict({ ownedSerpCoverage: 0.3 });
    expect(v.ring).toBe(1);
    expect(v.blind).toBe(false);
    expect(v.lockedLayers).toContain('category');
    expect(v.why).toMatch(/30%/);
  });

  it('ผ่านวง 1 ⇒ เปิดหมวดหมู่ + ปัญหา แต่ยังไม่เปิดคำที่ปนกัน', () => {
    const v = ringVerdict({ ownedSerpCoverage: 0.8, categoryArrivals: 10 });
    expect(v.ring).toBe(2);
    expect(v.openLayers).toContain('category');
    expect(v.openLayers).toContain('problem');
    expect(v.lockedLayers).toEqual(['confusion']);
  });

  it('เปิดวง 3 ได้ก็ต่อเมื่อคำหมวดหมู่พาคนมาถึงเกณฑ์ที่อ่านเป็นอัตราได้', () => {
    expect(ringVerdict({ ownedSerpCoverage: 0.8, categoryArrivals: MIN_FOR_RATE - 1 }).ring).toBe(2);
    expect(ringVerdict({ ownedSerpCoverage: 0.8, categoryArrivals: MIN_FOR_RATE }).ring).toBe(3);
  });

  it('ทุกวงต้องมี "ตัวเลขปลดล็อก" — ห้ามเขียนว่าเมื่อโตกว่านี้', () => {
    for (const r of RINGS.filter((x) => x.n < 3)) {
      expect(r.unlockNext).toMatch(/\d/);
      expect(r.unlockNext).not.toMatch(/โตกว่านี้|พร้อมแล้ว|เมื่อเหมาะสม/);
    }
  });

  it('ทุกชั้นคำค้นต้องอยู่ในวงใดวงหนึ่ง ห้ามหาย', () => {
    const inRings = RINGS.flatMap((r) => [...r.layers]).sort();
    expect(inRings).toEqual(KEYWORD_LAYERS.map((l) => l.key).sort());
  });

  it('เกณฑ์วง 1 ใช้ค่าที่เจ้าของกำหนด และวง 2 ใช้ MIN_FOR_RATE ตัวเดียวกับ growthPdca', () => {
    expect(RING1_OWNED_SERP_TARGET).toBe(0.7);
    expect(RINGS[1].unlockNext).toContain(String(MIN_FOR_RATE));
  });
});

describe('Risk 3 — คนเข้าเยอะแต่ไม่ตรงกลุ่ม ไม่ใช่ชัยชนะ', () => {
  it('วัดฝั่ง "ตรงกลุ่ม" ไม่ได้ ⇒ unknown ห้ามเดาว่าชนะ', () => {
    const r = trafficVerdict({ visitorsGrowthPct: 200 });
    expect(r.verdict).toBe('unknown');
    expect(r.why).toMatch(/ห้ามรายงานว่าคนเข้าเพิ่ม/);
  });

  it('ตัวอย่างที่เจ้าของยกมาเอง: คนเข้า +200% · ตรงกลุ่ม +0% = ไม่ใช่ชัยชนะ', () => {
    expect(trafficVerdict({ visitorsGrowthPct: 200, qualifiedGrowthPct: 0 }).verdict).toBe('not-a-win');
  });

  it('คนที่ตรงกลุ่มเพิ่ม = นับเป็นผล', () => {
    expect(trafficVerdict({ visitorsGrowthPct: 10, qualifiedGrowthPct: 8 }).verdict).toBe('win');
  });
});

describe('Risk 4 — คอนเทนต์เปรียบเทียบต้องเป็นกลาง', () => {
  it('ขาดหัวข้อที่ต้องมี = ยังปล่อยไม่ได้', () => {
    const r = checkComparison('เราต่างจากเขาเพราะเราใช้ AI');
    expect(r.ok).toBe(false);
    expect(r.missing.length).toBe(COMPARISON_REQUIRED.length);
  });

  it('เขียนเชิงตัดสินว่าใครดีกว่า = ฟ้องทันที', () => {
    const full = COMPARISON_REQUIRED.join(' · ');
    expect(checkComparison(full).ok).toBe(true);
    const judged = checkComparison(`${full} · ของเราดีกว่า`);
    expect(judged.ok).toBe(false);
    expect(judged.banned).toContain('ดีกว่า');
  });

  it('รายการคำต้องห้ามต้องไม่ว่าง (ใครลบออกต้องรู้ตัว)', () => {
    expect(COMPARISON_BANNED.length).toBeGreaterThanOrEqual(6);
  });
});

describe('Risk 5 — โรงงานคอนเทนต์ห้ามกลายเป็นโรงงานสแปม', () => {
  it('ลำดับต้องเริ่มที่หลักฐาน ไม่ใช่คำค้น', () => {
    expect(CONTENT_CHAIN[0]).toBe('Evidence');
    expect(CONTENT_CHAIN[CONTENT_CHAIN.length - 1]).toMatch(/Content/);
    expect(CONTENT_CHAIN).not.toContain('Keyword');
  });
});

describe('กฎต้องถูกเรียกใช้จริง — ไม่ใช่แค่เขียนไว้ใน lib', () => {
  it('ชื่อของเราเองต้องไม่ถูกจับว่าเป็นคอนเทนต์เปรียบเทียบ', () => {
    expect(isComparisonContent(`${BRAND_NAME} ช่วย SME ไทยวางกลยุทธ์`)).toBe(false);
  });

  it('เอ่ยชื่อองค์กรที่ถูกเอามาปนกับเรา = เข้าข่ายเปรียบเทียบทันที', () => {
    for (const org of CONFUSABLE_ORGS) expect(isComparisonContent(`เราต่างจาก ${org}`)).toBe(true);
  });

  it('🔗 ต่อเข้า violatesBrand แล้ว — ด่านที่คอนเทนต์ทุกชิ้นผ่านอยู่แล้ว', () => {
    const judged = violatesBrand('เราต่างจาก Digital CEO เพราะของเราดีกว่า');
    expect(judged.join(' ')).toMatch(/ถ้อยคำตัดสิน/);
    expect(judged.join(' ')).toMatch(/ขาดหัวข้อ/);
  });

  it('คอนเทนต์ปกติที่ไม่ได้เปรียบเทียบ ต้องไม่ถูกเรียกร้อง 4 หัวข้อ', () => {
    expect(violatesBrand('ตั้งราคายังไงไม่ให้ขาดทุน — ลองคำนวณดู')).toEqual([]);
  });

  it('บทความเปรียบเทียบที่เขียนถูกรูปแบบ ต้องผ่าน', () => {
    const ok = `เทียบกับ Digital CEO · วัตถุประสงค์ · กลุ่มเป้าหมาย · รูปแบบบริการ · use case`;
    expect(violatesBrand(ok)).toEqual([]);
  });
});
