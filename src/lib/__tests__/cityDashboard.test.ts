import { describe, it, expect, beforeEach } from 'vitest';
import { renderCityscape, plotHeightRatio, type CityPlot } from '../cityScape';

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 ที่มา: ฉาก 3 มิติเดิมใช้ seed คงที่ `mulberry32(20260705)` พร้อมคอมเมนต์
 *    "identical city layout for every combo" ⇒ **ทุกคนเห็นเมืองเหมือนกันเป๊ะ**
 *    ไม่ว่าธุรกิจจะโตแค่ไหน — ขัดกฎ `dynamic-plg` ที่โปรเจกต์ freeze ไว้เอง
 *    ("ระบบรู้อะไรแล้วยังแสดงเหมือนไม่รู้ = ผิดกฎ")
 * ══════════════════════════════════════════════════════════════════════════ */

const svgOf = () => document.createElementNS('http://www.w3.org/2000/svg', 'svg');
const plot = (o: Partial<CityPlot> = {}): CityPlot =>
  ({ id: 'hq', label: 'สำนักงานใหญ่', level: 2, max: 4, ...o });

describe('สูตรความสูง — ตึกต้องบอกความคืบหน้าจริง', () => {
  it('ยิ่งทำได้มาก ตึกยิ่งสูง (เพิ่มขึ้นเสมอ ไม่กระโดดถอยหลัง)', () => {
    const r = [0, 1, 2, 3, 4].map((l) => plotHeightRatio(l, 4));
    for (let i = 1; i < r.length; i++) expect(r[i], `level ${i}`).toBeGreaterThan(r[i - 1]);
  });

  it('ทำครบ = เต็มผัง (1.0) · เพิ่งเริ่มยังต้องเห็นว่ามีตึก ไม่แบนติดพื้น', () => {
    expect(plotHeightRatio(4, 4)).toBeCloseTo(1, 5);
    expect(plotHeightRatio(1, 4)).toBeGreaterThan(0.4);
  });

  it('ค่าเพี้ยน/เกินขอบ ต้องไม่ทำให้ตึกสูงเกินผังหรือติดลบ', () => {
    expect(plotHeightRatio(99, 4)).toBeCloseTo(1, 5);
    expect(plotHeightRatio(-5, 4)).toBeCloseTo(0.42, 5);
    expect(plotHeightRatio(1, 0)).toBeGreaterThan(0);     // max=0 ต้องไม่หารศูนย์
    expect(Number.isFinite(plotHeightRatio(1, 0))).toBe(true);
  });
});

describe('ฉาก 3 มิติต้องเปลี่ยนตามข้อมูลจริง', () => {
  let svg: SVGSVGElement;
  beforeEach(() => { svg = svgOf(); });

  it('ไม่ส่งข้อมูลมา = ฉากประดับเหมือนเดิม (ของเดิมยังเรียกได้ ไม่พัง)', () => {
    renderCityscape(svg, 'night', 'summer', 4);
    expect(svg.querySelectorAll('[data-plot]').length).toBe(0);
    expect(svg.childElementCount).toBeGreaterThan(10);     // ยังวาดเมืองอยู่
  });

  it('ส่งข้อมูลมา = อาคารถูกติดป้าย data-plot ให้กดได้', () => {
    const plots = [plot({ id: 'hq' }), plot({ id: 'skill' }), plot({ id: 'factory' })];
    renderCityscape(svg, 'night', 'summer', 4, plots);
    const ids = [...svg.querySelectorAll('[data-plot]')].map((e) => e.getAttribute('data-plot'));
    expect(ids.sort()).toEqual(['factory', 'hq', 'skill']);
  });

  it('🔴 level 0 = ที่ดินว่าง ไม่ใช่ตึกเตี้ย — "ยังไม่เริ่ม" ต้องดูต่างจาก "เริ่มแล้วนิดเดียว"', () => {
    renderCityscape(svg, 'night', 'summer', 4, [plot({ id: 'hq', level: 0 })]);
    expect(svg.querySelector('[data-plot="hq"]')).toBeNull();        // ไม่มีตึก
    const dashed = [...svg.querySelectorAll('polygon')]
      .filter((e) => e.getAttribute('stroke-dasharray'));
    expect(dashed.length, 'ต้องมีกรอบเส้นประของที่ดินว่าง').toBeGreaterThan(0);
  });

  /** พิกัดของรูปทรงทั้งหมดในอาคารนั้น — **ไม่รวมป้ายข้อความ**
   *  ⚠️ เทสต์เวอร์ชันแรกของผมเทียบ `innerHTML` ทั้งก้อน แล้ว**ผ่านทั้งที่ถอดสูตรความสูงออก**
   *     เพราะ data-level กับ <title> ("ระดับ 1/4") ต่างกันอยู่แล้ว ⇒ วัดป้าย ไม่ได้วัดตึก */
  const shapeOf = (svg: SVGSVGElement, id: string) =>
    [...svg.querySelectorAll(`[data-plot="${id}"] polygon`)]
      .map((e) => e.getAttribute('points')).join('|');

  it('🔴 ธุรกิจคนละระดับ ต้องได้ "ตึกคนละรูปทรง" จริง ไม่ใช่แค่ป้ายต่างกัน', () => {
    const a = svgOf(), b = svgOf();
    renderCityscape(a, 'night', 'summer', 4, [plot({ level: 1 })]);
    renderCityscape(b, 'night', 'summer', 4, [plot({ level: 4 })]);
    const sa = shapeOf(a, 'hq'), sb = shapeOf(b, 'hq');
    expect(sa.length, 'ต้องมีรูปทรงให้เทียบ').toBeGreaterThan(0);
    expect(sa, 'ตึก level 1 กับ level 4 ต้องไม่ใช่รูปทรงเดียวกัน').not.toBe(sb);
  });

  it('🔴 ตึกที่ทำได้มากกว่า ต้อง "สูงกว่า" บนจอจริง (ไม่ใช่แค่ต่างกัน)', () => {
    const topY = (svg: SVGSVGElement, id: string) => Math.min(
      ...[...svg.querySelectorAll(`[data-plot="${id}"] polygon`)]
        .flatMap((e) => (e.getAttribute('points') ?? '').split(' '))
        .map((pt) => Number(pt.split(',')[1]))
        .filter((n) => Number.isFinite(n)),
    );
    // ⚠️ ต้องวัดตึกธรรมดา ไม่ใช่แปลงแรก — แปลงแรกเป็น type 'hero' ที่มีลำแสงพุ่งขึ้นถึง y=-40
    //    ตายตัว ⇒ วัดแล้วได้ -40 เท่ากันทุกระดับ (เทสต์รอบแรกของผมพลาดตรงนี้: วัดลำแสง ไม่ได้วัดตึก)
    const lo = svgOf(), hi = svgOf();
    renderCityscape(lo, 'night', 'summer', 4, [plot({ id: 'hq' }), plot({ id: 'skill', level: 1 })]);
    renderCityscape(hi, 'night', 'summer', 4, [plot({ id: 'hq' }), plot({ id: 'skill', level: 4 })]);
    // แกน y ของ SVG ชี้ลง ⇒ ยอดตึกที่สูงกว่า = ค่า y น้อยกว่า
    expect(topY(hi, 'skill')).toBeLessThan(topY(lo, 'skill'));
  });

  it('ข้อมูลเท่ากัน ต้องได้ภาพเดิมเสมอ (ภาพต้องนิ่ง ไม่สุ่มใหม่ทุก render)', () => {
    const a = svgOf(), b = svgOf();
    renderCityscape(a, 'night', 'summer', 4, [plot({ level: 2 })]);
    renderCityscape(b, 'night', 'summer', 4, [plot({ level: 2 })]);
    expect(a.innerHTML).toBe(b.innerHTML);
  });

  it('อาคารที่ล็อกไว้ ต้องถูกทำเครื่องหมาย (กันผู้ใช้กดแล้วเจอกำแพง)', () => {
    renderCityscape(svg, 'night', 'summer', 4, [plot({ id: 'hq', locked: true })]);
    expect(svg.querySelector('[data-plot="hq"]')?.getAttribute('class')).toContain('clv-plot-locked');
  });

  it('ทุกอาคารที่กดได้ต้องมีชื่อให้อ่าน (<title> ของ SVG)', () => {
    renderCityscape(svg, 'night', 'summer', 4, [plot({ id: 'hq', label: 'สำนักงานใหญ่' })]);
    expect(svg.querySelector('[data-plot="hq"] title')?.textContent).toContain('สำนักงานใหญ่');
  });

  it('🔴 ที่ดินว่างต้องกดได้ — สถานะ "ยังไม่ได้เริ่ม" คือช่องที่ควรกดมากที่สุด ไม่ใช่ช่องที่กดไม่ได้', () => {
    const svg = svgOf();
    renderCityscape(svg, 'noon', 'summer', 4, [
      { id: 'hq', label: 'สำนักงานใหญ่', level: 2, max: 4 },
      { id: 'skill', label: 'ศูนย์ทักษะ', level: 0, max: 4 },
    ]);
    // ตัวจับคลิกใน CityLevelUp.tsx อ่าน [data-plot],[data-empty] — ถ้าช่องว่างไม่มีป้าย กดแล้วเงียบ
    const empty = svg.querySelector('[data-empty="skill"]');
    expect(empty, 'ที่ดินว่างต้องมี data-empty ให้ตัวจับคลิกเห็น').not.toBeNull();
    expect(svg.querySelector('[data-plot="skill"]'), 'ช่องว่างไม่ใช่อาคาร จึงต้องไม่มี data-plot').toBeNull();
    expect(svg.querySelector('[data-plot="hq"]'), 'อาคารที่สร้างแล้วยังต้องกดได้เหมือนเดิม').not.toBeNull();
  });

});
