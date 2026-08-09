import { describe, it, expect } from 'vitest';
import { renderCityscape } from '../cityScape';

/** เอนจินวาดเมืองลง SVG จริง (jsdom) — ยืนยันว่า "เมืองมีชีวิต" (agents) ออกมาตามยุค
 *  ยุคแรก: มีคนเดินแต่ไม่มีรถไร้คนขับ/โดรน · ยุคอนาคต: มีครบ + agent เยอะกว่า */

function mkSvg(): SVGSVGElement {
  return document.createElementNS('http://www.w3.org/2000/svg', 'svg');
}

describe('renderCityscape — living city agents', () => {
  it('วาดได้ไม่ throw + มี agent เคลื่อนไหว (.clv-move)', () => {
    const svg = mkSvg();
    renderCityscape(svg, 'night', 'summer', 4);
    expect(svg.querySelectorAll('.clv-move').length).toBeGreaterThan(0);
  });

  it('ยุคบุกเบิก (0): ไม่มีรถไร้คนขับ (LiDAR) และไม่มีโดรน', () => {
    const svg = mkSvg();
    renderCityscape(svg, 'noon', 'summer', 0);
    expect(svg.querySelectorAll('.clv-lidar').length).toBe(0);
    expect(svg.querySelectorAll('.clv-drone').length).toBe(0);
  });

  it('ยุคอนาคต (4): มี LiDAR (รถไร้คนขับ) + โดรน', () => {
    const svg = mkSvg();
    renderCityscape(svg, 'cyber', 'summer', 4);
    expect(svg.querySelectorAll('.clv-lidar').length).toBeGreaterThan(0);
    expect(svg.querySelectorAll('.clv-drone').length).toBeGreaterThan(0);
  });

  it('agent เยอะขึ้นตามยุค (อนาคต > บุกเบิก)', () => {
    const a = mkSvg(), b = mkSvg();
    renderCityscape(a, 'night', 'summer', 0);
    renderCityscape(b, 'night', 'summer', 4);
    expect(b.querySelectorAll('.clv-move').length).toBeGreaterThan(a.querySelectorAll('.clv-move').length);
  });

  it('deterministic: render ซ้ำด้วยพารามิเตอร์เดิม → จำนวน element เท่ากัน', () => {
    const a = mkSvg(), b = mkSvg();
    renderCityscape(a, 'evening', 'rainy', 3);
    renderCityscape(b, 'evening', 'rainy', 3);
    expect(a.querySelectorAll('*').length).toBe(b.querySelectorAll('*').length);
  });

  it('eraIndex เกินช่วง (clamp) ไม่พัง', () => {
    const svg = mkSvg();
    expect(() => renderCityscape(svg, 'morning', 'winter', 99)).not.toThrow();
    expect(svg.querySelectorAll('.clv-move').length).toBeGreaterThan(0);
  });
});
