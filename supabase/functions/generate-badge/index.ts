// supabase/functions/generate-badge/index.ts
// Server-side badge PNG generator — supports GET (og:image) and POST (frontend)
//
// GET  /generate-badge?company=xxx&score=98&subtitle=yyy&fmt=square
// POST /generate-badge  { companyName, score, subtitle, fmt }
//
// Returns: image/png

import { createCanvas } from 'https://deno.land/x/canvas@v1.4.1/mod.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// ── Colour helpers ──────────────────────────────────────────────────────────

function hex(h: string, a = 1): string {
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function cyanGrad(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0,   '#0284c7');
  g.addColorStop(0.5, '#06B6D4');
  g.addColorStop(1,   '#0284c7');
  return g;
}

function goldGrad(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0,    '#92611e');
  g.addColorStop(0.3,  '#F59E0B');
  g.addColorStop(0.55, '#fde68a');
  g.addColorStop(0.8,  '#F59E0B');
  g.addColorStop(1,    '#92611e');
  return g;
}

// ── Shape helpers ──────────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function shieldPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const top    = cy - r * 0.9;
  const mid    = cy - r * 0.1;
  const bottom = cy + r * 0.95;
  ctx.beginPath();
  ctx.moveTo(cx - r, top);
  ctx.lineTo(cx + r, top);
  ctx.lineTo(cx + r, mid);
  ctx.bezierCurveTo(cx + r, cy + r * 0.6, cx, bottom, cx, bottom);
  ctx.bezierCurveTo(cx, bottom, cx - r, cy + r * 0.6, cx - r, mid);
  ctx.closePath();
}

function hSep(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, halfW: number,
  color: string | CanvasGradient,
) {
  ctx.save();
  [[x - halfW, x - 28], [x + 28, x + halfW]].forEach(([x0, x1]) => {
    ctx.beginPath();
    ctx.moveTo(x0, y); ctx.lineTo(x1, y);
    ctx.strokeStyle = color as string;
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(x, y - 7); ctx.lineTo(x + 10, y);
  ctx.lineTo(x, y + 7); ctx.lineTo(x - 10, y);
  ctx.closePath();
  ctx.fillStyle = color as string;
  ctx.fill();
  ctx.restore();
}

// ── Deterministic particles ────────────────────────────────────────────────

function drawParticles(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const pts = 60;
  for (let i = 0; i < pts; i++) {
    const x = ((i * 37 + 17) * 31337) % W;
    const y = ((i * 71 + 53) * 13337) % H;
    const r = (i % 3) + 1;
    const a = 0.08 + (i % 5) * 0.06;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = i % 3 !== 2 ? hex('#06B6D4', a) : hex('#F59E0B', a * 0.7);
    ctx.fill();
  }
  for (let i = 0; i < pts; i += 4) {
    const x1 = ((i * 37 + 17) * 31337) % W;
    const y1 = ((i * 71 + 53) * 13337) % H;
    const x2 = (((i + 4) * 37 + 17) * 31337) % W;
    const y2 = (((i + 4) * 71 + 53) * 13337) % H;
    if (Math.hypot(x2 - x1, y2 - y1) < 300) {
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = hex('#06B6D4', 0.05);
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
}

// ── Neural network ─────────────────────────────────────────────────────────

function drawNeuralNet(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const nodes: [number, number][] = [
    [cx,              cy - r * 0.55],
    [cx - r * 0.45,  cy - r * 0.2],
    [cx + r * 0.45,  cy - r * 0.2],
    [cx - r * 0.6,   cy + r * 0.25],
    [cx + r * 0.6,   cy + r * 0.25],
    [cx - r * 0.2,   cy + r * 0.55],
    [cx + r * 0.2,   cy + r * 0.55],
    [cx,              cy + r * 0.1],
  ];
  const edges: [number, number][] = [
    [0,1],[0,2],[1,2],[1,3],[2,4],[1,7],[2,7],[3,5],[4,6],[5,7],[6,7],[3,7],[4,7],
  ];
  ctx.save();
  edges.forEach(([a, b]) => {
    const [ax, ay] = nodes[a], [bx, by] = nodes[b];
    const g = ctx.createLinearGradient(ax, ay, bx, by);
    g.addColorStop(0, hex('#06B6D4', 0.5));
    g.addColorStop(1, hex('#0284c7', 0.2));
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
    ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.stroke();
  });
  nodes.forEach(([nx, ny], i) => {
    const nr = i === 7 ? 10 : 6;
    const glow = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr * 3);
    glow.addColorStop(0, hex('#06B6D4', 0.4));
    glow.addColorStop(1, hex('#06B6D4', 0));
    ctx.beginPath(); ctx.arc(nx, ny, nr * 3, 0, Math.PI * 2);
    ctx.fillStyle = glow; ctx.fill();
    ctx.beginPath(); ctx.arc(nx, ny, nr, 0, Math.PI * 2);
    ctx.fillStyle = '#06B6D4'; ctx.fill();
  });
  ctx.restore();
}

// ── ISO Seal ───────────────────────────────────────────────────────────────

function drawIsoSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 2; ctx.stroke();

  ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  const fill = ctx.createRadialGradient(cx, cy - r * 0.3, 0, cx, cy, r);
  fill.addColorStop(0, 'rgba(6,182,212,0.15)');
  fill.addColorStop(1, 'rgba(6,182,212,0.04)');
  ctx.fillStyle = fill; ctx.fill();

  ctx.beginPath(); ctx.arc(cx, cy, r - 10, 0, Math.PI * 2);
  ctx.strokeStyle = hex('#06B6D4', 0.4); ctx.lineWidth = 0.8; ctx.stroke();

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(r * 0.22)}px Arial`;
  ctx.fillStyle = '#06B6D4';
  ctx.fillText('ISO 9001:2015', cx, cy - r * 0.14);
  ctx.font = `500 ${Math.round(r * 0.18)}px Arial`;
  ctx.fillStyle = '#F59E0B';
  ctx.fillText('READY', cx, cy + r * 0.15);
  ctx.restore();
}

// ── Main render ────────────────────────────────────────────────────────────

function renderBadge(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  company: string,
  subtitle: string,
  score: number,
  isStory: boolean,
) {
  const cx = W / 2;

  // Background
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, W, H);

  const bgG = ctx.createRadialGradient(cx, H * 0.42, 0, cx, H * 0.42, H * 0.55);
  bgG.addColorStop(0,   'rgba(6,182,212,0.08)');
  bgG.addColorStop(0.5, 'rgba(6,182,212,0.03)');
  bgG.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(6,182,212,0.04)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  drawParticles(ctx, W, H);

  // Outer border
  const pad = 32;
  roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 28);
  ctx.strokeStyle = hex('#06B6D4', 0.5); ctx.lineWidth = 1.5; ctx.stroke();

  roundRect(ctx, pad + 6, pad + 6, W - (pad + 6) * 2, H - (pad + 6) * 2, 22);
  ctx.strokeStyle = hex('#06B6D4', 0.18); ctx.lineWidth = 0.8; ctx.stroke();

  // Corner accents
  const clen = 60, cop = 48;
  [[cop, cop], [W - cop, cop], [cop, H - cop], [W - cop, H - cop]].forEach(([bx, by], i) => {
    const sx = i % 2 === 0 ? 1 : -1, sy = i < 2 ? 1 : -1;
    ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + sx * clen, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + sy * clen); ctx.stroke();
  });

  // "OFFICIALLY POWERED BY" ribbon
  const ribY = H * 0.12, ribH = H * 0.048, ribW = W * 0.62;
  roundRect(ctx, cx - ribW / 2, ribY - ribH / 2, ribW, ribH, ribH / 2);
  const ribFill = ctx.createLinearGradient(cx - ribW / 2, 0, cx + ribW / 2, 0);
  ribFill.addColorStop(0,    'rgba(6,182,212,0.0)');
  ribFill.addColorStop(0.15, 'rgba(6,182,212,0.18)');
  ribFill.addColorStop(0.85, 'rgba(6,182,212,0.18)');
  ribFill.addColorStop(1,    'rgba(6,182,212,0.0)');
  ctx.fillStyle = ribFill; ctx.fill();
  ctx.strokeStyle = hex('#06B6D4', 0.6); ctx.lineWidth = 1; ctx.stroke();

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(ribH * 0.48)}px Arial`;
  ctx.fillStyle = '#06B6D4';
  ctx.fillText('✦   OFFICIALLY POWERED BY   ✦', cx, ribY);
  ctx.restore();

  // Shield
  const shCY = H * (isStory ? 0.33 : 0.365);
  const shR  = Math.min(W, H) * (isStory ? 0.145 : 0.19);

  shieldPath(ctx, cx, shCY, shR);
  const shFill = ctx.createLinearGradient(cx, shCY - shR, cx, shCY + shR);
  shFill.addColorStop(0,   'rgba(6,182,212,0.14)');
  shFill.addColorStop(0.5, 'rgba(6,182,212,0.06)');
  shFill.addColorStop(1,   'rgba(6,182,212,0.02)');
  ctx.fillStyle = shFill; ctx.fill();

  shieldPath(ctx, cx, shCY, shR);
  ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 2.5; ctx.stroke();

  shieldPath(ctx, cx, shCY, shR * 0.85);
  ctx.strokeStyle = hex('#06B6D4', 0.3); ctx.lineWidth = 1; ctx.stroke();

  drawNeuralNet(ctx, cx, shCY, shR * 0.72);

  // Company name
  const nameY = H * (isStory ? 0.51 : 0.565);
  const displayName = company.trim() || 'บริษัทของคุณ';

  hSep(ctx, cx, nameY - H * 0.04, W * 0.28,
    goldGrad(ctx, cx - W * 0.28, nameY, cx + W * 0.28, nameY));

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const nLen = displayName.length;
  const nFS  = nLen > 22 ? Math.round(W * 0.042) : nLen > 14 ? Math.round(W * 0.052) : Math.round(W * 0.06);
  ctx.font = `700 ${nFS}px Arial`;
  ctx.fillStyle = goldGrad(ctx, cx - W * 0.35, nameY, cx + W * 0.35, nameY);
  ctx.fillText(displayName, cx, nameY);
  ctx.restore();

  if (subtitle.trim()) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `400 ${Math.round(W * 0.025)}px Arial`;
    ctx.fillStyle = hex('#06B6D4', 0.85);
    ctx.fillText(subtitle.trim(), cx, nameY + nFS * 0.9);
    ctx.restore();
  }

  // Compliance Readiness
  const scoreY = nameY + nFS * (subtitle.trim() ? 1.6 : 0.95);
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `500 ${Math.round(W * 0.022)}px Arial`;
  ctx.fillStyle = hex('#06B6D4', 0.7);
  ctx.fillText(`Compliance Readiness: ${score}%`, cx, scoreY);
  ctx.restore();

  hSep(ctx, cx, scoreY + H * 0.038, W * 0.28,
    goldGrad(ctx, cx - W * 0.28, scoreY, cx + W * 0.28, scoreY));

  // CEO AI THAILAND footer
  const footY = H * (isStory ? 0.82 : 0.79);
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(W * 0.05)}px Arial`;
  ctx.fillStyle = cyanGrad(ctx, cx - W * 0.3, footY, cx + W * 0.3, footY);
  ctx.fillText('CEO AI THAILAND', cx, footY);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(W * 0.03)}px Arial`;
  ctx.fillStyle = goldGrad(ctx, cx - W * 0.15, footY + H * 0.05, cx + W * 0.15, footY + H * 0.05);
  ctx.fillText('2026', cx, footY + H * 0.05);
  ctx.restore();

  // ISO Seal
  const sealR = Math.round(W * 0.085);
  drawIsoSeal(ctx, W - pad - sealR - 10, H - pad - sealR - 10, sealR);

  // Watermark
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `400 ${Math.round(W * 0.014)}px Arial`;
  ctx.fillStyle = hex('#06B6D4', 0.2);
  ctx.fillText('ceoaithailand.org', cx, H - 18);
  ctx.restore();
}

// ── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    let company  = 'บริษัทของคุณ';
    let subtitle = '';
    let score    = 98;
    let fmt      = 'square';

    if (req.method === 'GET') {
      const p = new URL(req.url).searchParams;
      company  = p.get('company')  || company;
      subtitle = p.get('subtitle') || subtitle;
      score    = Math.min(100, Math.max(0, parseInt(p.get('score') || '98')));
      fmt      = p.get('fmt') || fmt;
    } else {
      const body = await req.json().catch(() => ({}));
      company  = body.companyName || body.company || company;
      subtitle = body.subtitle    || subtitle;
      score    = body.score != null ? body.score : score;
      fmt      = body.fmt         || fmt;
    }

    const isStory = fmt === 'story';
    const W = 1080, H = isStory ? 1920 : 1080;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;

    renderBadge(ctx, W, H, company, subtitle, score, isStory);

    const buffer = (canvas as unknown as { toBuffer(type: string): Uint8Array }).toBuffer('image/png');

    return new Response(buffer, {
      headers: {
        ...CORS,
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'Content-Disposition': `inline; filename="badge-${encodeURIComponent(company.slice(0, 30))}.png"`,
      },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
