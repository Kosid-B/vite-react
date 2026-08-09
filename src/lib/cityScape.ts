/* ============================================================
   Cityscape — isometric procedural city (framework-agnostic)
   Renders directly into an <svg> element via the DOM.
   — directional sun shadows per time of day
   — seasons: vegetation, weather particles, snow caps
   Ported from the standalone "Company City · Level Up" prototype
   so it can be embedded as a React page inside the SPA.
   ============================================================ */

import { eraByIndex, agentsByIndex, type EraDef, type EraAgents } from './cityEra';

const SVG_NS = 'http://www.w3.org/2000/svg';
const TW = 66, THh = 33;
const OX = 560, OY = 250;
const GRID = 11;
const VIEW_W = 1120, VIEW_H = 760;

export type TimeName = 'morning' | 'noon' | 'evening' | 'night' | 'cyber';
export type SeasonName = 'summer' | 'rainy' | 'spring' | 'winter';

type Pt = { x: number; y: number };
type Col = { h: number; s: number; l: number };

function mulberry32(a: number) {
  return function () {
    a |= 0; a = a + 0x6d2b79f5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let rnd: () => number;

function iso(gx: number, gy: number, z = 0): Pt {
  return { x: OX + (gx - gy) * TW / 2, y: OY + (gx + gy) * THh / 2 - z };
}
function P(pts: Pt[]): string { return pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '); }
function hsl(h: number, s: number, l: number, a = 1): string {
  l = Math.max(4, Math.min(96, l));
  return a === 1 ? `hsl(${h} ${s}% ${l}%)` : `hsl(${h} ${s}% ${l}% / ${a})`;
}
function vhsl(o: Col, dl = 0): string { return hsl(o.h, o.s, o.l + dl); }
function lerp(a: Pt, b: Pt, t: number): Pt { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }

/* convex hull (monotone chain) for projected shadows */
function hull(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  const cr = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo: Pt[] = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  const up: Pt[] = [];
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop(); return lo.concat(up);
}

/* ============================================================ TIME OF DAY */
interface TimeDef {
  floorA: string; floorB: string; grid: string; shadow: string;
  road: string; roadLine: string;
  sun: { dx: number; dy: number; f: number };
  face: { top: number; right: number; left: number };
  litProb: number; lamps: boolean; vegDL: number;
  hero: Col; heroWin: string; beam: [string, string];
  palette: Col[]; winLit: string[]; winOff: string; glass: [string, string]; lampColor: string;
  _glassGrad?: string; _glassGrad2?: string; _beamGrad?: string;
}

const TIMES: Record<TimeName, TimeDef> = {
  morning: {
    floorA: '#cdb99f', floorB: '#e8ddc8', grid: 'rgba(120,90,50,.16)', shadow: 'rgba(90,60,90,.30)',
    road: '#b3a48e', roadLine: 'rgba(255,255,255,.75)',
    sun: { dx: -0.72, dy: 0.30, f: 0.62 }, face: { top: 14, right: 8, left: -20 },
    litProb: 0.22, lamps: false, vegDL: 0, hero: { h: 36, s: 95, l: 58 }, heroWin: '#fff4dd',
    beam: ['rgba(255,190,110,.40)', 'rgba(255,190,110,0)'],
    palette: [{ h: 24, s: 44, l: 62 }, { h: 206, s: 36, l: 60 }, { h: 38, s: 40, l: 58 }, { h: 180, s: 26, l: 56 }, { h: 340, s: 30, l: 64 }, { h: 214, s: 30, l: 52 }],
    winLit: ['#ffedc2', '#fff6e0'], winOff: 'rgba(90,70,60,.35)', glass: ['#ffd9b0', '#9cc2e8'], lampColor: '#ffd27a',
  },
  noon: {
    floorA: '#bcd9f2', floorB: '#d7ecfb', grid: 'rgba(40,90,160,.14)', shadow: 'rgba(30,60,110,.24)',
    road: '#9db4cc', roadLine: 'rgba(255,255,255,.85)',
    sun: { dx: 0.16, dy: 0.24, f: 0.18 }, face: { top: 22, right: -4, left: -12 },
    litProb: 0.10, lamps: false, vegDL: 4, hero: { h: 40, s: 96, l: 56 }, heroWin: '#fff8e0',
    beam: ['rgba(255,196,60,.40)', 'rgba(255,196,60,0)'],
    palette: [{ h: 206, s: 42, l: 66 }, { h: 18, s: 52, l: 64 }, { h: 158, s: 34, l: 60 }, { h: 262, s: 30, l: 68 }, { h: 346, s: 42, l: 70 }, { h: 36, s: 48, l: 66 }],
    winLit: ['#fff6cf', '#eaf6ff'], winOff: 'rgba(50,70,110,.30)', glass: ['#e6f5ff', '#7cc4ff'], lampColor: '#ffd27a',
  },
  evening: {
    floorA: '#2a1038', floorB: '#5a2148', grid: 'rgba(255,170,140,.16)', shadow: 'rgba(20,0,25,.45)',
    road: '#241031', roadLine: 'rgba(255,230,200,.30)',
    sun: { dx: 0.72, dy: 0.30, f: 0.60 }, face: { top: 12, right: -20, left: 6 },
    litProb: 0.52, lamps: true, vegDL: -8, hero: { h: 28, s: 96, l: 58 }, heroWin: '#fff1dd',
    beam: ['rgba(255,170,100,.55)', 'rgba(255,170,100,0)'],
    palette: [{ h: 340, s: 52, l: 52 }, { h: 14, s: 62, l: 52 }, { h: 288, s: 36, l: 48 }, { h: 356, s: 48, l: 44 }, { h: 30, s: 58, l: 50 }, { h: 312, s: 34, l: 42 }],
    winLit: ['#ffe4b8', '#ffc4d0', '#ffd9a0'], winOff: 'rgba(40,10,35,.55)', glass: ['#ffb08a', '#ff5e7e'], lampColor: '#ffbe6a',
  },
  night: {
    floorA: '#0a1230', floorB: '#111d48', grid: 'rgba(120,150,255,.16)', shadow: 'rgba(0,0,10,.45)',
    road: '#0c142e', roadLine: 'rgba(255,255,255,.28)',
    sun: { dx: 0, dy: 0, f: 0 }, face: { top: 10, right: -6, left: -20 },
    litProb: 0.72, lamps: true, vegDL: -16, hero: { h: 44, s: 92, l: 55 }, heroWin: '#fff3c4',
    beam: ['rgba(255,215,120,.55)', 'rgba(255,215,120,0)'],
    palette: [{ h: 228, s: 44, l: 52 }, { h: 214, s: 52, l: 46 }, { h: 250, s: 38, l: 56 }, { h: 196, s: 48, l: 44 }, { h: 262, s: 34, l: 48 }, { h: 222, s: 40, l: 38 }],
    winLit: ['#ffe9a8', '#a8f4ff', '#ffd27a'], winOff: 'rgba(10,16,40,.55)', glass: ['#7fd8ff', '#4a6cff'], lampColor: '#ffdf94',
  },
  cyber: {
    floorA: '#07031a', floorB: '#100736', grid: 'rgba(0,240,255,.15)', shadow: 'rgba(0,0,8,.55)',
    road: '#0a0424', roadLine: 'rgba(0,240,255,.35)',
    sun: { dx: 0, dy: 0, f: 0 }, face: { top: 10, right: -6, left: -20 },
    litProb: 0.80, lamps: true, vegDL: -18, hero: { h: 186, s: 100, l: 52 }, heroWin: '#d8fbff',
    beam: ['rgba(0,240,255,.5)', 'rgba(0,240,255,0)'],
    palette: [{ h: 300, s: 70, l: 46 }, { h: 255, s: 60, l: 50 }, { h: 190, s: 72, l: 42 }, { h: 330, s: 66, l: 48 }, { h: 270, s: 52, l: 40 }, { h: 210, s: 64, l: 44 }],
    winLit: ['#00f0ff', '#ff7ae8', '#c4b5ff'], winOff: 'rgba(6,2,22,.6)', glass: ['#ff3cdc', '#00f0ff'], lampColor: '#ff5ce4',
  },
};

/* ============================================================ SEASONS */
interface SeasonDef {
  tree: Col; treeDark: Col; park: Col;
  effect: 'rain' | 'snow' | 'petals' | null;
  snowCaps: boolean; overlay: string | null; clouds: boolean; puddles: boolean;
}
const SEASONS: Record<SeasonName, SeasonDef> = {
  summer: { tree: { h: 150, s: 56, l: 46 }, treeDark: { h: 152, s: 58, l: 33 }, park: { h: 140, s: 38, l: 34 }, effect: null, snowCaps: false, overlay: null, clouds: false, puddles: false },
  rainy: { tree: { h: 150, s: 46, l: 40 }, treeDark: { h: 152, s: 48, l: 28 }, park: { h: 145, s: 32, l: 30 }, effect: 'rain', snowCaps: false, overlay: 'rgba(18,28,58,.30)', clouds: true, puddles: true },
  spring: { tree: { h: 335, s: 72, l: 74 }, treeDark: { h: 328, s: 56, l: 62 }, park: { h: 118, s: 42, l: 40 }, effect: 'petals', snowCaps: false, overlay: null, clouds: false, puddles: false },
  winter: { tree: { h: 210, s: 22, l: 78 }, treeDark: { h: 212, s: 18, l: 62 }, park: { h: 210, s: 28, l: 78 }, effect: 'snow', snowCaps: true, overlay: 'rgba(190,215,255,.10)', clouds: false, puddles: false },
};

/* render-scope state */
let T: TimeDef, S: SeasonDef, SUN: TimeDef['sun'], FACE: TimeDef['face'], LIT_PROB: number, SNOWY: boolean;
let ERA: EraDef, ERA_AGENTS: EraAgents;
let svg: SVGSVGElement;
let defsId = 0;
let DEFS: SVGDefsElement;

function el<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number>, parent?: Element): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVG_NS, name);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  (parent || svg).appendChild(e);
  return e;
}
function gradient(stops: [string, string][], x1 = 0, y1 = 0, x2 = 0, y2 = 1): string {
  const id = 'clvg' + (defsId++);
  const g = el('linearGradient', { id, x1, y1, x2, y2 }, DEFS);
  stops.forEach(([off, color]) => el('stop', { offset: off, 'stop-color': color }, g));
  return `url(#${id})`;
}

/* ============================================================ CITY LAYOUT */
const ROAD_ROW = 5, ROAD_COL = 6;
const PARKS: [number, number][] = [[1, 7], [2, 7], [1, 8], [8, 1], [9, 2], [8, 8]];
interface Bldg { x: number; y: number; w: number; d: number; h: number; type: string; c?: number; }
const BUILDINGS: Bldg[] = [
  { x: 4, y: 0, w: 1, d: 1, h: 275, type: 'hero' },
  { x: 1, y: 1, w: 1, d: 2, h: 180, type: 'glass', c: 0 },
  { x: 3, y: 2, w: 1, d: 1, h: 150, type: 'tower', c: 1 },
  { x: 7, y: 0, w: 2, d: 1, h: 200, type: 'step', c: 2 },
  { x: 0, y: 3, w: 1, d: 1, h: 96, type: 'block', c: 3 },
  { x: 2, y: 4, w: 2, d: 1, h: 120, type: 'block', c: 4 },
  { x: 5, y: 2, w: 1, d: 2, h: 230, type: 'antenna', c: 5 },
  { x: 8, y: 3, w: 1, d: 1, h: 140, type: 'glass', c: 1 },
  { x: 9, y: 4, w: 1, d: 1, h: 76, type: 'low', c: 2 },
  { x: 0, y: 6, w: 2, d: 1, h: 64, type: 'low', c: 0 },
  { x: 3, y: 6, w: 1, d: 1, h: 170, type: 'step', c: 3 },
  { x: 4, y: 7, w: 2, d: 1, h: 110, type: 'block', c: 5 },
  { x: 7, y: 6, w: 1, d: 2, h: 190, type: 'glass', c: 4 },
  { x: 9, y: 6, w: 1, d: 1, h: 88, type: 'block', c: 1 },
  { x: 5, y: 9, w: 1, d: 1, h: 58, type: 'low', c: 3 },
  { x: 7, y: 9, w: 2, d: 1, h: 130, type: 'tower', c: 0 },
  { x: 2, y: 9, w: 1, d: 1, h: 100, type: 'tower', c: 2 },
];

/* ============================================================ DRAW HELPERS */
interface Box { A: Pt; B: Pt; C: Pt; D: Pt; Cb: Pt; Bb: Pt; Db: Pt; }
function drawBox(parent: Element, gx: number, gy: number, w: number, d: number, z0: number, h: number, col: Col): Box {
  const A = iso(gx, gy, z0 + h), B = iso(gx + w, gy, z0 + h), C = iso(gx + w, gy + d, z0 + h), D = iso(gx, gy + d, z0 + h);
  const Cb = iso(gx + w, gy + d, z0), Bb = iso(gx + w, gy, z0), Db = iso(gx, gy + d, z0);
  el('polygon', { points: P([D, C, Cb, Db]), fill: hsl(col.h, col.s, col.l + FACE.left) }, parent);
  el('polygon', { points: P([C, B, Bb, Cb]), fill: hsl(col.h, col.s, col.l + FACE.right) }, parent);
  el('polygon', { points: P([A, B, C, D]), fill: hsl(col.h, Math.max(col.s - 8, 8), col.l + FACE.top) }, parent);
  if (SNOWY && h > 18) {
    el('polygon', { points: P([A, B, C, D]), fill: '#edf3fc', opacity: .92 }, parent);
    el('polyline', { points: P([D, C, B]), fill: 'none', stroke: '#ffffff', 'stroke-width': 2.4, opacity: .85 }, parent);
  } else {
    el('polyline', { points: P([D, C, B]), fill: 'none', stroke: hsl(col.h, col.s, col.l + FACE.top + 8, .5), 'stroke-width': 1 }, parent);
  }
  return { A, B, C, D, Cb, Bb, Db };
}
function dotWindows(parent: Element, b0: Pt, b1: Pt, h: number) {
  const len = Math.hypot(b1.x - b0.x, b1.y - b0.y);
  const cols = Math.max(2, Math.floor(len / 13));
  const rows = Math.max(2, Math.floor(h / 17));
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const p = lerp(b0, b1, (i + 0.5) / cols);
      const y = p.y - (j + 0.6) * (h / rows);
      const lit = rnd() < LIT_PROB;
      const c = el('circle', { cx: p.x.toFixed(1), cy: y.toFixed(1), r: 2.4, fill: lit ? T.winLit[Math.floor(rnd() * T.winLit.length)] : T.winOff, opacity: lit ? 0.95 : 0.8 }, parent);
      if (lit && rnd() < 0.05) c.setAttribute('class', 'clv-flicker');
    }
  }
}
function glassStripes(parent: Element, b0: Pt, b1: Pt, h: number) {
  const n = Math.max(3, Math.floor(Math.hypot(b1.x - b0.x, b1.y - b0.y) / 16));
  for (let i = 0; i < n; i++) {
    const p0 = lerp(b0, b1, i / n + 0.08 / n), p1 = lerp(b0, b1, (i + 1) / n - 0.08 / n);
    el('polygon', { points: P([{ x: p0.x, y: p0.y - h + 6 }, { x: p1.x, y: p1.y - h + 6 }, { x: p1.x, y: p1.y - 4 }, { x: p0.x, y: p0.y - 4 }]), fill: i % 2 ? T._glassGrad! : T._glassGrad2!, opacity: .85 }, parent);
    if (rnd() < LIT_PROB * 0.85) {
      const fy = 8 + rnd() * (h - 24);
      el('rect', { x: Math.min(p0.x, p1.x), y: (p0.y - fy).toFixed(1), width: Math.abs(p1.x - p0.x), height: 3.4, fill: T.winLit[0], opacity: .75 }, parent);
    }
  }
}
function roofAC(parent: Element, gx: number, gy: number, w: number, d: number, z: number, col: Col) {
  const n = 1 + Math.floor(rnd() * 2);
  for (let i = 0; i < n; i++) {
    const ax = gx + 0.18 + rnd() * (w - 0.5), ay = gy + 0.18 + rnd() * (d - 0.5);
    drawBox(parent, ax, ay, 0.22, 0.22, z, 8 + rnd() * 5, { h: col.h, s: Math.max(col.s - 16, 6), l: col.l + 6 });
  }
}
function roofHelipad(parent: Element, gx: number, gy: number, w: number, d: number, z: number) {
  const c = iso(gx + w / 2, gy + d / 2, z);
  const ink = SNOWY ? 'rgba(70,100,150,.8)' : T.roadLine;
  el('ellipse', { cx: c.x, cy: c.y, rx: TW * 0.32, ry: THh * 0.32, fill: 'none', stroke: ink, 'stroke-width': 2 }, parent);
  el('text', { x: c.x, y: c.y + 4, fill: ink, 'font-size': '12', 'font-weight': '800', 'text-anchor': 'middle', 'font-family': 'sans-serif' }, parent).textContent = 'H';
}
function roofAntenna(parent: Element, gx: number, gy: number, w: number, d: number, z: number) {
  const c = iso(gx + w / 2, gy + d / 2, z);
  el('line', { x1: c.x, y1: c.y, x2: c.x, y2: c.y - 34, stroke: '#c8d2f0', 'stroke-width': 2.2 }, parent);
  el('line', { x1: c.x - 7, y1: c.y - 20, x2: c.x + 7, y2: c.y - 20, stroke: '#c8d2f0', 'stroke-width': 1.6 }, parent);
  el('circle', { cx: c.x, cy: c.y - 36, r: 3.4, fill: '#ff4d5e', class: 'clv-blink' }, parent);
}
function roofTank(parent: Element, gx: number, gy: number, w: number, d: number, z: number, col: Col) {
  const ax = gx + 0.2 + rnd() * (w - 0.55), ay = gy + 0.2 + rnd() * (d - 0.55);
  drawBox(parent, ax, ay, 0.26, 0.26, z, 14, { h: col.h, s: 20, l: 58 });
  const c = iso(ax + 0.13, ay + 0.13, z + 14);
  el('ellipse', { cx: c.x, cy: c.y, rx: 8, ry: 4, fill: SNOWY ? '#edf3fc' : hsl(col.h, 14, 70) }, parent);
}
function castShadow(parent: Element, gx: number, gy: number, w: number, d: number, h: number) {
  if (SUN.f <= 0) {
    const c = iso(gx + w / 2 + 0.15, gy + d / 2 + 0.15, 0);
    el('ellipse', { cx: c.x, cy: c.y, rx: (w + d) * TW * 0.30, ry: (w + d) * THh * 0.30, fill: T.shadow, filter: 'url(#clvBlurS)' }, parent);
    return;
  }
  const hEff = Math.min(h, 235) * SUN.f;
  const off = { x: SUN.dx * hEff, y: SUN.dy * hEff };
  const base = [iso(gx, gy), iso(gx + w, gy), iso(gx + w, gy + d), iso(gx, gy + d)];
  const proj = base.map(p => ({ x: p.x + off.x, y: p.y + off.y }));
  el('polygon', { points: P(hull(base.concat(proj))), fill: T.shadow, filter: 'url(#clvBlurS)' }, parent);
}
function smallShadow(parent: Element, p: Pt, r: number) {
  const off = SUN.f > 0 ? { x: SUN.dx * 14 * SUN.f * 2, y: SUN.dy * 14 * SUN.f * 2 } : { x: 0, y: 2 };
  el('ellipse', { cx: p.x + off.x, cy: p.y + off.y, rx: r, ry: r * 0.45, fill: T.shadow }, parent);
}

function drawBuilding(parent: Element, b0: Bldg) {
  // ความสูงตามยุค — ยุคแรกเตี้ย/มินิมอล (เพดาน ERA.maxH), ยุคหลังสูงเสียดฟ้า (hero สูงกว่าเพดานเล็กน้อยเป็นแลนด์มาร์ก)
  const cap = b0.type === 'hero' ? ERA.maxH * 1.12 : ERA.maxH;
  const b: Bldg = { ...b0, h: Math.min(b0.h * ERA.floorScale, cap) };
  const col = b.type === 'hero' ? T.hero : T.palette[(b.c ?? 0) % T.palette.length];
  castShadow(parent, b.x, b.y, b.w, b.d, b.h);
  const g = el('g', {}, parent);
  if (b.type === 'step') {
    const tiers: [number, number][] = [[0, 0.52], [0.14, 0.32], [0.26, 0.18]];
    let z = 0;
    tiers.forEach(([inset, frac], ti) => {
      const hh = b.h * frac;
      const f = drawBox(g, b.x + inset, b.y + inset, b.w - 2 * inset, b.d - 2 * inset, z, hh, col);
      dotWindows(g, f.Db, f.Cb, hh);
      dotWindows(g, f.Cb, f.Bb, hh);
      z += hh;
      if (ti === tiers.length - 1) roofAC(g, b.x + 0.26, b.y + 0.26, b.w - 0.52, b.d - 0.52, z, col);
    });
    return;
  }
  const f = drawBox(g, b.x, b.y, b.w, b.d, 0, b.h, col);
  if (b.type === 'glass') {
    glassStripes(g, f.Db, f.Cb, b.h);
    glassStripes(g, f.Cb, f.Bb, b.h);
    if (b.h > 160) roofHelipad(g, b.x, b.y, b.w, b.d, b.h);
    else roofAC(g, b.x, b.y, b.w, b.d, b.h, col);
  } else if (b.type === 'hero') {
    dotWindows(g, f.Db, f.Cb, b.h);
    dotWindows(g, f.Cb, f.Bb, b.h);
    el('polygon', { points: P([f.A, f.B, { x: f.B.x, y: -40 }, { x: f.A.x, y: -40 }]), fill: T._beamGrad!, class: 'clv-beam-pulse' }, g);
    const c0 = iso(b.x + b.w / 2, b.y + b.d / 2, 0);
    el('ellipse', { cx: c0.x, cy: c0.y, rx: TW * 0.85, ry: THh * 0.85, fill: 'none', stroke: hsl(col.h, col.s, 70, .5), 'stroke-width': 2.5 }, g);
    el('ellipse', { cx: c0.x, cy: c0.y, rx: TW * 0.62, ry: THh * 0.62, fill: hsl(col.h, col.s, 60, .14) }, g);
    roofAntenna(g, b.x, b.y, b.w, b.d, b.h);
  } else if (b.type === 'antenna') {
    dotWindows(g, f.Db, f.Cb, b.h);
    dotWindows(g, f.Cb, f.Bb, b.h);
    roofAntenna(g, b.x, b.y, b.w, b.d, b.h);
  } else if (b.type === 'low') {
    dotWindows(g, f.Db, f.Cb, b.h);
    dotWindows(g, f.Cb, f.Bb, b.h);
    roofAC(g, b.x, b.y, b.w, b.d, b.h, col);
    if (rnd() < 0.7) roofTank(g, b.x, b.y, b.w, b.d, b.h, col);
  } else {
    dotWindows(g, f.Db, f.Cb, b.h);
    dotWindows(g, f.Cb, f.Bb, b.h);
    if (b.h > 150) roofHelipad(g, b.x, b.y, b.w, b.d, b.h);
    else if (rnd() < 0.6) roofTank(g, b.x, b.y, b.w, b.d, b.h, col);
    else roofAC(g, b.x, b.y, b.w, b.d, b.h, col);
  }
}

function drawPark(parent: Element, gx: number, gy: number) {
  el('polygon', { points: P([iso(gx, gy), iso(gx + 1, gy), iso(gx + 1, gy + 1), iso(gx, gy + 1)]), fill: vhsl(S.park, T.vegDL) }, parent);
  const n = 2 + Math.floor(rnd() * 2);
  for (let i = 0; i < n; i++) {
    const p = iso(gx + 0.25 + rnd() * 0.5, gy + 0.25 + rnd() * 0.5, 0);
    smallShadow(parent, p, 7);
    el('line', { x1: p.x, y1: p.y, x2: p.x, y2: p.y - 9, stroke: vhsl(S.treeDark, T.vegDL), 'stroke-width': 2 }, parent);
    el('circle', { cx: p.x, cy: p.y - 13, r: 6.5, fill: vhsl(S.tree, T.vegDL) }, parent);
    el('circle', { cx: p.x - 3, cy: p.y - 10, r: 4.5, fill: vhsl(S.treeDark, T.vegDL) }, parent);
    if (SNOWY) el('circle', { cx: p.x + 1, cy: p.y - 15.5, r: 4.2, fill: '#f2f7ff', opacity: .95 }, parent);
  }
}
function drawRoad(parent: Element, gx: number, gy: number, dir: 'row' | 'col') {
  el('polygon', { points: P([iso(gx, gy), iso(gx + 1, gy), iso(gx + 1, gy + 1), iso(gx, gy + 1)]), fill: T.road }, parent);
  const a = dir === 'row' ? iso(gx, gy + 0.5) : iso(gx + 0.5, gy);
  const b = dir === 'row' ? iso(gx + 1, gy + 0.5) : iso(gx + 0.5, gy + 1);
  el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: T.roadLine, 'stroke-width': 1.6, 'stroke-dasharray': '7 7' }, parent);
  if (S.puddles && rnd() < 0.4) {
    const p = iso(gx + 0.3 + rnd() * 0.4, gy + 0.3 + rnd() * 0.4);
    el('ellipse', { cx: p.x, cy: p.y, rx: 9 + rnd() * 6, ry: 3.6, fill: T._glassGrad!, opacity: .45 }, parent);
  }
}
function drawLamps(parent: Element) {
  const spots: Pt[] = [];
  for (let gx = 1; gx < GRID; gx += 3) spots.push(iso(gx + 0.5, ROAD_ROW - 0.08));
  for (let gy = 1; gy < GRID; gy += 3) if (Math.abs(gy - ROAD_ROW) > 1) spots.push(iso(ROAD_COL - 0.08, gy + 0.5));
  spots.forEach(p => {
    smallShadow(parent, p, 4);
    el('line', { x1: p.x, y1: p.y, x2: p.x, y2: p.y - 26, stroke: '#9aa4c2', 'stroke-width': 2 }, parent);
    el('line', { x1: p.x, y1: p.y - 26, x2: p.x + 7, y2: p.y - 28, stroke: '#9aa4c2', 'stroke-width': 2 }, parent);
    if (T.lamps) {
      el('circle', { cx: p.x + 8, cy: p.y - 28, r: 2.8, fill: T.lampColor }, parent);
      el('circle', { cx: p.x + 8, cy: p.y - 28, r: 8, fill: T.lampColor, opacity: .22 }, parent);
      el('ellipse', { cx: p.x + 8, cy: p.y - 2, rx: 16, ry: 6.5, fill: T.lampColor, opacity: .12 }, parent);
    } else {
      el('circle', { cx: p.x + 8, cy: p.y - 28, r: 2.8, fill: '#7d879f' }, parent);
    }
  });
}
function drawClouds(parent: Element) {
  const cs: [number, number][] = [[220, 54], [560, 34], [880, 64]];
  cs.forEach(([cx, cy], i) => {
    const g = el('g', { class: 'clv-cloud', style: `animation-delay:${-i * 4}s` }, parent);
    ([[0, 0, 44], [36, 6, 32], [-34, 8, 30], [10, -12, 30]] as [number, number, number][]).forEach(([dx, dy, r]) =>
      el('ellipse', { cx: cx + dx, cy: cy + dy, rx: r, ry: r * 0.55, fill: 'rgba(90,105,140,.55)' }, g));
  });
}
function drawWeather(parent: Element) {
  if (S.overlay) el('rect', { x: 0, y: 0, width: VIEW_W, height: VIEW_H, fill: S.overlay, 'pointer-events': 'none' }, parent);
  if (S.clouds) drawClouds(parent);
  const g = el('g', { 'pointer-events': 'none' }, parent);
  if (S.effect === 'rain') {
    for (let i = 0; i < 70; i++) {
      const x = rnd() * VIEW_W, dur = 0.65 + rnd() * 0.6, del = -rnd() * 2;
      el('line', { x1: x, y1: 0, x2: x - 6, y2: 17, stroke: 'rgba(170,200,255,.55)', 'stroke-width': 1.4, class: 'clv-drop', style: `animation-duration:${dur}s;animation-delay:${del}s` }, g);
    }
  } else if (S.effect === 'snow') {
    for (let i = 0; i < 52; i++) {
      const x = rnd() * VIEW_W, r = 1.6 + rnd() * 2.2, dur = 6 + rnd() * 7, del = -rnd() * 12;
      el('circle', { cx: x, cy: 0, r, fill: 'rgba(255,255,255,.9)', class: 'clv-flake', style: `animation-duration:${dur}s;animation-delay:${del}s` }, g);
    }
  } else if (S.effect === 'petals') {
    for (let i = 0; i < 26; i++) {
      const x = rnd() * VIEW_W, dur = 7 + rnd() * 6, del = -rnd() * 12;
      el('ellipse', { cx: x, cy: 0, rx: 4.2, ry: 2.4, fill: 'rgba(255,170,200,.85)', class: 'clv-petal', style: `animation-duration:${dur}s;animation-delay:${del}s` }, g);
    }
  }
}

/* ============================================================ LIVING CITY (agents + eras)
   ผู้คน/รถ/รถไร้คนขับ/โดรน/humanoid ที่ "เคลื่อนไหว" ผ่าน CSS keyframes (translate ตามเวกเตอร์ถนน)
   วาดที่จุดเริ่ม (pixel) แล้ว .clv-move เลื่อนไปตาม --dx/--dy · เดินหน้าเป็น deterministic ด้วย rnd */

/** ต้นไม้ริมถนนเพิ่มตามยุค (greenBoost) — เมืองไฮเทคที่ยังกลมกลืนธรรมชาติ */
function drawStreetTrees(parent: Element, n: number) {
  for (let i = 0; i < n; i++) {
    const along = 0.5 + Math.floor(rnd() * (GRID - 1));
    const onRow = rnd() < 0.5;
    const p = onRow ? iso(along, ROAD_ROW + (rnd() < 0.5 ? -0.16 : 1.16)) : iso(ROAD_COL + (rnd() < 0.5 ? -0.16 : 1.16), along);
    smallShadow(parent, p, 6);
    el('line', { x1: p.x, y1: p.y, x2: p.x, y2: p.y - 10, stroke: vhsl(S.treeDark, T.vegDL), 'stroke-width': 2 }, parent);
    el('circle', { cx: p.x, cy: p.y - 14, r: 6, fill: vhsl(S.tree, T.vegDL) }, parent);
    el('circle', { cx: p.x - 3, cy: p.y - 11, r: 4, fill: vhsl(S.treeDark, T.vegDL) }, parent);
    if (SNOWY) el('circle', { cx: p.x + 1, cy: p.y - 16, r: 3.8, fill: '#f2f7ff', opacity: .95 }, parent);
  }
}

/** กลุ่มที่ "เดินทาง" ข้ามเมืองด้วย CSS (translate 0→dx,dy วนไม่จบ · delay ลบ = กระจายตำแหน่งบนเส้นทาง) */
function travelGroup(parent: Element, dx: number, dy: number, dur: number, phase: number): SVGGElement {
  return el('g', {
    class: 'clv-move',
    style: `--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;--dur:${dur.toFixed(1)}s;animation-delay:${(-phase * dur).toFixed(2)}s`,
  }, parent) as SVGGElement;
}

const PERSON_COLORS = ['#e8935a', '#5aa0e8', '#6ac28a', '#d97ab0', '#c56aa0', '#e8c15a', '#8a7de8'];
function personArt(parent: Element, p: Pt, humanoid: boolean, accent: string) {
  smallShadow(parent, p, 3);
  const body = humanoid ? '#cfe6ff' : PERSON_COLORS[Math.floor(rnd() * PERSON_COLORS.length)];
  if (humanoid) el('circle', { cx: p.x, cy: p.y - 7, r: 5.5, fill: accent, opacity: .16 }, parent);           // glow
  el('line', { x1: p.x, y1: p.y - 2.5, x2: p.x, y2: p.y - 11, stroke: body, 'stroke-width': 3.4, 'stroke-linecap': 'round' }, parent);
  el('circle', { cx: p.x, cy: p.y - 13.4, r: 2.5, fill: humanoid ? '#eaf6ff' : '#f0c9a0' }, parent);            // head
  if (humanoid) {
    el('line', { x1: p.x, y1: p.y - 15.6, x2: p.x, y2: p.y - 17.4, stroke: accent, 'stroke-width': 1 }, parent); // antenna
    el('circle', { cx: p.x, cy: p.y - 18, r: 1.2, fill: accent, class: 'clv-blink' }, parent);
  }
}

function carArt(parent: Element, p: Pt, angleDeg: number, color: string, selfDriving: boolean, accent: string) {
  const g = el('g', { transform: `translate(${p.x.toFixed(1)},${p.y.toFixed(1)}) rotate(${angleDeg.toFixed(1)})` }, parent);
  el('ellipse', { cx: 0, cy: 5, rx: 13, ry: 4, fill: T.shadow }, g);
  if (T.lamps) {  // เส้นแสงท้ายรถ (motion streak) ตอนกลางคืน/เย็น/ไซเบอร์
    const streak = selfDriving ? accent : '#fff';
    el('polygon', { points: '-12,-2.6 -34,-1 -34,1 -12,2.6', fill: streak, opacity: .16 }, g);
  }
  el('rect', { x: -12, y: -5, width: 24, height: 10, rx: 5, fill: color }, g);                                   // body
  el('rect', { x: -5, y: -4, width: 11, height: 8, rx: 3, fill: 'rgba(255,255,255,.55)' }, g);                   // cabin
  if (T.lamps) {
    el('circle', { cx: 12, cy: 0, r: 1.8, fill: '#fff3b0' }, g); el('circle', { cx: 12, cy: 0, r: 4, fill: '#fff3b0', opacity: .3 }, g);  // headlight
    el('circle', { cx: -11.5, cy: -3, r: 1.1, fill: '#ff4d4d' }, g); el('circle', { cx: -11.5, cy: 3, r: 1.1, fill: '#ff4d4d' }, g);       // tail lights
  }
  if (selfDriving) {
    el('circle', { cx: 0, cy: -6, r: 2.4, fill: accent, class: 'clv-lidar' }, g);                                // LiDAR dome
    el('circle', { cx: 0, cy: -6, r: 6.5, fill: accent, opacity: .18, class: 'clv-lidar' }, g);                  // sensor sweep
    el('rect', { x: -12, y: -5, width: 24, height: 10, rx: 5, fill: 'none', stroke: accent, 'stroke-width': 1, opacity: .5 }, g);
  }
}

function airTaxiArt(parent: Element, p: Pt, accent: string) {
  const g = el('g', { class: 'clv-drone' }, parent);
  el('polygon', { points: `${p.x - 9},${p.y + 3} ${p.x - 15},${p.y + 34} ${p.x + 15},${p.y + 34} ${p.x + 9},${p.y + 3}`, fill: accent, opacity: .1 }, g); // downglow
  el('rect', { x: p.x - 13, y: p.y - 4.5, width: 26, height: 9, rx: 4.5, fill: '#2f3a5c' }, g);                  // body
  el('rect', { x: p.x - 7, y: p.y - 3.4, width: 14, height: 6.8, rx: 3, fill: accent, opacity: .85 }, g);        // cabin glow
  for (const dx of [-15, 15]) {
    el('line', { x1: p.x + (dx < 0 ? -11 : 11), y1: p.y - 3, x2: p.x + dx, y2: p.y - 7, stroke: '#4a5578', 'stroke-width': 1.5 }, g);
    el('circle', { cx: p.x + dx, cy: p.y - 7.5, r: 2.6, fill: accent, opacity: .9 }, g);
    el('circle', { cx: p.x + dx, cy: p.y - 7.5, r: 5.5, fill: accent, opacity: .2 }, g);
  }
  el('circle', { cx: p.x, cy: p.y + 2, r: 1.2, fill: '#7bd0ff', class: 'clv-blink' }, g);
}

/** อนุภาคเรืองแสงลอยในอากาศ — หิ่งห้อยสีทอง (ยุคธรรมชาติ) / data motes สี accent (ยุคนีออน) */
function drawMotes(parent: Element, n: number, natureEra: boolean, accent: string) {
  for (let i = 0; i < n; i++) {
    const x = 80 + rnd() * (VIEW_W - 160), y = 130 + rnd() * 360;
    const t = travelGroup(parent, (rnd() - 0.5) * 90, (rnd() - 0.5) * 60, 10 + rnd() * 9, rnd());
    el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: natureEra ? 1.9 : 1.5, fill: natureEra ? '#ffe08a' : accent, opacity: .72, class: 'clv-flicker' }, t);
  }
}

function droneArt(parent: Element, p: Pt, accent: string) {
  const g = el('g', { class: 'clv-drone' }, parent);
  const cone = el('polygon', { points: `${p.x},${p.y + 2} ${p.x - 5},${p.y + 22} ${p.x + 5},${p.y + 22}`, fill: accent, opacity: .12 }, g);
  cone.setAttribute('opacity', '.12');
  el('ellipse', { cx: p.x, cy: p.y, rx: 5, ry: 2.4, fill: '#2b3350' }, g);                                       // body
  for (const dx of [-6, 6]) {
    el('line', { x1: p.x, y1: p.y - 1, x2: p.x + dx, y2: p.y - 3, stroke: '#4a5578', 'stroke-width': 1.4 }, g);
    el('circle', { cx: p.x + dx, cy: p.y - 3.4, r: 2.2, fill: accent, opacity: .85 }, g);
    el('circle', { cx: p.x + dx, cy: p.y - 3.4, r: 4, fill: accent, opacity: .2 }, g);
  }
  el('circle', { cx: p.x, cy: p.y + 1.6, r: 1.1, fill: '#ff5b6e', class: 'clv-blink' }, g);
}

/** สร้าง agent ทั้งหมดของยุค (คน/รถ/รถไร้คนขับ/โดรน/humanoid) ในเลเยอร์บนสุดของพื้น */
function drawAgents(parent: Element) {
  const A = ERA_AGENTS, accent = ERA.accent;
  // เส้นทางถนนหลัก: แถวนอน (ROAD_ROW) 2 เลน + แนวตั้ง (ROAD_COL) 2 เลน
  type Lane = { s: Pt; dx: number; dy: number; ang: number };
  const lanes: Lane[] = [];
  const mk = (a: Pt, b: Pt): Lane => ({ s: a, dx: b.x - a.x, dy: b.y - a.y, ang: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI });
  lanes.push(mk(iso(0, ROAD_ROW + 0.32), iso(GRID, ROAD_ROW + 0.32)));
  lanes.push(mk(iso(GRID, ROAD_ROW + 0.68), iso(0, ROAD_ROW + 0.68)));
  lanes.push(mk(iso(ROAD_COL + 0.32, GRID), iso(ROAD_COL + 0.32, 0)));
  lanes.push(mk(iso(ROAD_COL + 0.68, 0), iso(ROAD_COL + 0.68, GRID)));
  const walks: Lane[] = [
    mk(iso(0, ROAD_ROW - 0.14), iso(GRID, ROAD_ROW - 0.14)),
    mk(iso(GRID, ROAD_ROW + 1.14), iso(0, ROAD_ROW + 1.14)),
    mk(iso(ROAD_COL - 0.14, GRID), iso(ROAD_COL - 0.14, 0)),
  ];
  const pick = <X,>(arr: X[]): X => arr[Math.floor(rnd() * arr.length)];

  // อนุภาคเรืองแสง (วาดก่อน = อยู่ด้านหลัง agent อื่น)
  if (A.motes > 0) drawMotes(parent, A.motes, ERA.id === 'seed' || ERA.id === 'rise', accent);

  // รถยนต์ + รถไร้คนขับ (บนเลนถนน)
  const spawnCar = (self: boolean) => {
    const L = pick(lanes);
    const t = travelGroup(parent, L.dx, L.dy, 9 + rnd() * 6, rnd());
    const col = self ? '#e8f4ff' : pick(['#d95a5a', '#5a86d9', '#5ab887', '#e8b24a', '#8a5ad9', '#e0e0e6']);
    carArt(t, L.s, L.ang, col, self, accent);
  };
  for (let i = 0; i < A.cars; i++) spawnCar(false);
  for (let i = 0; i < A.selfDriving; i++) spawnCar(true);

  // จักรยาน/มอไซค์ = จุดเล็กวิ่งเร็วบนเลน
  for (let i = 0; i < A.bikes; i++) {
    const L = pick(lanes);
    const t = travelGroup(parent, L.dx, L.dy, 7 + rnd() * 4, rnd());
    const g = el('g', { transform: `translate(${L.s.x.toFixed(1)},${L.s.y.toFixed(1)}) rotate(${L.ang.toFixed(1)})` }, t);
    el('ellipse', { cx: 0, cy: 3, rx: 6, ry: 2, fill: T.shadow }, g);
    el('rect', { x: -6, y: -3, width: 12, height: 5, rx: 2.5, fill: pick(['#d97a3a', '#3aa0d9', '#54c072']) }, g);
  }

  // คนเดิน + humanoid (บนทางเท้า, เดินช้า + bob)
  const spawnPerson = (humanoid: boolean) => {
    const L = pick(walks);
    const t = travelGroup(parent, L.dx, L.dy, 26 + rnd() * 14, rnd());
    const bob = el('g', { class: 'clv-walk', style: `animation-delay:${(-rnd() * 0.5).toFixed(2)}s` }, t);
    personArt(bob, L.s, humanoid, accent);
  };
  for (let i = 0; i < A.people; i++) spawnPerson(false);
  for (let i = 0; i < A.humanoids; i++) spawnPerson(true);

  // โดรน (บินบนฟ้า — เส้นทางแนวทแยงเหนือเมือง + hover)
  for (let i = 0; i < A.drones; i++) {
    const y = 70 + rnd() * 150;
    const left = rnd() < 0.5;
    const s: Pt = { x: left ? -30 : VIEW_W + 30, y };
    const dx = left ? VIEW_W + 60 : -(VIEW_W + 60);
    const t = travelGroup(parent, dx, (rnd() - 0.5) * 60, 16 + rnd() * 10, rnd());
    droneArt(t, s, accent);
  }

  // แท็กซี่บินได้ VTOL (ยุคอนาคต — บินสูงกว่าโดรน ช้ากว่า ใหญ่กว่า)
  for (let i = 0; i < A.airtaxi; i++) {
    const y = 44 + rnd() * 90;
    const left = rnd() < 0.5;
    const s: Pt = { x: left ? -40 : VIEW_W + 40, y };
    const dx = left ? VIEW_W + 80 : -(VIEW_W + 80);
    const t = travelGroup(parent, dx, (rnd() - 0.5) * 40, 22 + rnd() * 12, rnd());
    airTaxiArt(t, s, accent);
  }
}

/** Render the whole cityscape into `target`. Deterministic per (time, season, era). */
export function renderCityscape(target: SVGSVGElement, timeName: TimeName, seasonName: SeasonName, eraIndex = 4) {
  svg = target;
  rnd = mulberry32(20260705);           // identical city layout for every combo
  T = TIMES[timeName]; S = SEASONS[seasonName];
  ERA = eraByIndex(eraIndex); ERA_AGENTS = agentsByIndex(eraIndex);
  SUN = T.sun; FACE = T.face; LIT_PROB = T.litProb; SNOWY = S.snowCaps;

  svg.innerHTML = '';
  defsId = 0;
  DEFS = el('defs', {});
  const blur = el('filter', { id: 'clvBlurS', x: '-40%', y: '-40%', width: '180%', height: '180%' }, DEFS);
  el('feGaussianBlur', { stdDeviation: '4' }, blur);
  T._glassGrad = gradient([['0%', T.glass[0]], ['100%', T.glass[1]]]);
  T._glassGrad2 = gradient([['0%', T.glass[1]], ['100%', T.glass[0]]]);
  T._beamGrad = gradient([['0%', T.beam[1]], ['100%', T.beam[0]]]);
  const floorGrad = gradient([['0%', T.floorB], ['100%', T.floorA]]);
  const floorFill = SNOWY ? gradient([['0%', '#e9f0fb'], ['100%', '#c3d3ea']]) : floorGrad;

  const F0 = iso(-0.6, -0.6), F1 = iso(GRID + 0.6, -0.6), F2 = iso(GRID + 0.6, GRID + 0.6), F3 = iso(-0.6, GRID + 0.6);
  el('polygon', { points: P([F0, F1, F2, F3]), fill: floorFill });
  for (let i = 0; i <= GRID; i++) {
    el('line', { x1: iso(i, 0).x, y1: iso(i, 0).y, x2: iso(i, GRID).x, y2: iso(i, GRID).y, stroke: T.grid, 'stroke-width': 1 });
    el('line', { x1: iso(0, i).x, y1: iso(0, i).y, x2: iso(GRID, i).x, y2: iso(GRID, i).y, stroke: T.grid, 'stroke-width': 1 });
  }
  for (let gx = 0; gx < GRID; gx++) drawRoad(svg, gx, ROAD_ROW, 'row');
  for (let gy = 0; gy < GRID; gy++) if (gy !== ROAD_ROW) drawRoad(svg, ROAD_COL, gy, 'col');
  PARKS.forEach(([px, py]) => drawPark(svg, px, py));
  if (ERA.greenBoost > 0) drawStreetTrees(svg, ERA.greenBoost * 2);
  drawLamps(svg);
  const sorted = [...BUILDINGS].sort((a, b) => (a.x + a.y + a.w + a.d) - (b.x + b.y + b.w + b.d));
  sorted.forEach(b => drawBuilding(svg, b));
  drawAgents(el('g', { class: 'clv-agents' }));   // ผู้คน/รถ/รถไร้คนขับ/โดรน/humanoid (บนสุดของพื้น)
  drawWeather(svg);
}

/* ---- auto detection: real clock + Thai-climate months ---- */
export const TIME_LABEL: Record<TimeName, string> = { morning: 'เช้า', noon: 'กลางวัน', evening: 'เย็น', night: 'กลางคืน', cyber: 'ไซเบอร์' };
export const SEASON_LABEL: Record<SeasonName, string> = { summer: 'ฤดูร้อน', rainy: 'ฤดูฝน', spring: 'ใบไม้ผลิ', winter: 'ฤดูหนาว' };

export function detectTime(h: number): TimeName {
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 16) return 'noon';
  if (h >= 16 && h < 19) return 'evening';
  return 'night';
}
export function detectSeason(m: number): SeasonName {   // month 1–12, Thai climate
  if (m >= 3 && m <= 5) return 'summer';    // มี.ค.–พ.ค. ร้อน
  if (m >= 6 && m <= 10) return 'rainy';    // มิ.ย.–ต.ค. ฝน
  if (m === 2) return 'spring';             // ก.พ. ช่วงดอกไม้บาน
  return 'winter';                          // พ.ย.–ม.ค. หนาว
}
