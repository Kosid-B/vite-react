import { useRef, useEffect, useState, useCallback } from 'react';

interface Props {
  defaultName?: string;
  complianceScore?: number;
  onClose: () => void;
}

type Format = 'square' | 'story' | 'banner';

const FORMATS: Record<Format, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: '1:1 · LinkedIn' },
  story:  { w: 1080, h: 1920, label: '9:16 · Story' },
  banner: { w: 1200, h: 630,  label: '1.91:1 · Facebook' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  g.addColorStop(0,   '#92611e');
  g.addColorStop(0.3, '#F59E0B');
  g.addColorStop(0.55,'#fde68a');
  g.addColorStop(0.8, '#F59E0B');
  g.addColorStop(1,   '#92611e');
  return g;
}

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

function drawParticles(ctx: CanvasRenderingContext2D, W: number, H: number, count = 60) {
  for (let i = 0; i < count; i++) {
    const x = ((i * 37 + 17) * 31337) % W;
    const y = ((i * 71 + 53) * 13337) % H;
    const r = (i % 3) + 1;
    const a = 0.08 + (i % 5) * 0.06;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = i % 3 !== 2 ? hex('#06B6D4', a) : hex('#F59E0B', a * 0.7);
    ctx.fill();
  }
  for (let i = 0; i < count; i += 4) {
    const x1 = ((i * 37 + 17) * 31337) % W;
    const y1 = ((i * 71 + 53) * 13337) % H;
    const x2 = (((i + 4) * 37 + 17) * 31337) % W;
    const y2 = (((i + 4) * 71 + 53) * 13337) % H;
    if (Math.hypot(x2 - x1, y2 - y1) < 300) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = hex('#06B6D4', 0.05);
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
}

function drawNeuralNet(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const nodes: [number, number][] = [
    [cx, cy - r * 0.55],
    [cx - r * 0.45, cy - r * 0.2],
    [cx + r * 0.45, cy - r * 0.2],
    [cx - r * 0.6, cy + r * 0.25],
    [cx + r * 0.6, cy + r * 0.25],
    [cx - r * 0.2, cy + r * 0.55],
    [cx + r * 0.2, cy + r * 0.55],
    [cx, cy + r * 0.1],
  ];
  const edges: [number, number][] = [
    [0,1],[0,2],[1,2],[1,3],[2,4],[1,7],[2,7],[3,5],[4,6],[5,7],[6,7],[3,7],[4,7],
  ];

  ctx.save();
  edges.forEach(([a, b]) => {
    const [ax, ay] = nodes[a];
    const [bx, by] = nodes[b];
    const g = ctx.createLinearGradient(ax, ay, bx, by);
    g.addColorStop(0, hex('#06B6D4', 0.5));
    g.addColorStop(1, hex('#0284c7', 0.2));
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
  nodes.forEach(([nx, ny], i) => {
    const nr = i === 7 ? 10 : 6;
    const glow = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr * 3);
    glow.addColorStop(0, hex('#06B6D4', 0.4));
    glow.addColorStop(1, hex('#06B6D4', 0));
    ctx.beginPath();
    ctx.arc(nx, ny, nr * 3, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(nx, ny, nr, 0, Math.PI * 2);
    ctx.fillStyle = '#06B6D4';
    ctx.shadowColor = '#06B6D4';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  });
  ctx.restore();
}

function drawIsoSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#06B6D4';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  const fill = ctx.createRadialGradient(cx, cy - r * 0.3, 0, cx, cy, r);
  fill.addColorStop(0, 'rgba(6,182,212,0.15)');
  fill.addColorStop(1, 'rgba(6,182,212,0.04)');
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r - 10, 0, Math.PI * 2);
  ctx.strokeStyle = hex('#06B6D4', 0.4);
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#06B6D4';
  ctx.font = `700 ${Math.round(r * 0.22)}px "Kanit",Arial`;
  ctx.fillText('ISO 9001:2015', cx, cy - r * 0.14);
  ctx.font = `500 ${Math.round(r * 0.18)}px "Kanit",Arial`;
  ctx.fillStyle = '#F59E0B';
  ctx.fillText('READY', cx, cy + r * 0.15);
  ctx.restore();
}

function hSep(ctx: CanvasRenderingContext2D, x: number, y: number, halfW: number, color: string | CanvasGradient) {
  ctx.save();
  [[x - halfW, x - 28], [x + 28, x + halfW]].forEach(([x0, x1]) => {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(x, y - 7); ctx.lineTo(x + 10, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 10, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// ── Banner (Achievement Bar) renderer 1200×630 ───────────────────────────────

function renderBanner(ctx: CanvasRenderingContext2D, W: number, H: number, company: string, subtitle: string, score: number) {
  const cx = W / 2;

  // Background
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, W, H);
  const bg = ctx.createRadialGradient(cx, H * 0.5, 0, cx, H * 0.5, H * 0.7);
  bg.addColorStop(0, 'rgba(6,182,212,0.09)');
  bg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(6,182,212,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  drawParticles(ctx, W, H, 40);

  // Border
  const pad = 28;
  roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 22);
  ctx.strokeStyle = hex('#06B6D4', 0.5);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  roundRect(ctx, pad + 5, pad + 5, W - (pad + 5) * 2, H - (pad + 5) * 2, 18);
  ctx.strokeStyle = hex('#06B6D4', 0.18);
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Corner accents
  const clen = 50, cop = 42;
  [[cop, cop], [W - cop, cop], [cop, H - cop], [W - cop, H - cop]].forEach(([bx, by], i) => {
    const sx = i % 2 === 0 ? 1 : -1, sy = i < 2 ? 1 : -1;
    ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + sx * clen, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + sy * clen); ctx.stroke();
  });

  // Left panel: shield + "OFFICIALLY POWERED BY" + company name
  const leftCX = W * 0.28;
  const shR = H * 0.28;
  const shCY = H * 0.42;

  shieldPath(ctx, leftCX, shCY, shR);
  const sf = ctx.createLinearGradient(leftCX, shCY - shR, leftCX, shCY + shR);
  sf.addColorStop(0, 'rgba(6,182,212,0.14)');
  sf.addColorStop(1, 'rgba(6,182,212,0.02)');
  ctx.fillStyle = sf; ctx.fill();

  ctx.save();
  shieldPath(ctx, leftCX, shCY, shR);
  ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 2.5;
  ctx.shadowColor = '#06B6D4'; ctx.shadowBlur = 16;
  ctx.stroke(); ctx.restore();

  shieldPath(ctx, leftCX, shCY, shR * 0.85);
  ctx.strokeStyle = hex('#06B6D4', 0.3); ctx.lineWidth = 1; ctx.stroke();
  drawNeuralNet(ctx, leftCX, shCY, shR * 0.72);

  // Divider
  ctx.beginPath();
  ctx.moveTo(W * 0.48, H * 0.12);
  ctx.lineTo(W * 0.48, H * 0.88);
  ctx.strokeStyle = hex('#06B6D4', 0.2);
  ctx.lineWidth = 1;
  ctx.stroke();

  // Right panel
  const rightCX = W * 0.73;
  const ribY = H * 0.17;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(H * 0.042)}px "Kanit",Arial`;
  ctx.fillStyle = '#06B6D4';
  ctx.fillText('✦  OFFICIALLY POWERED BY  ✦', rightCX, ribY);
  ctx.restore();

  const displayName = company.trim() || 'บริษัทของคุณ';
  const nLen = displayName.length;
  const nFS = nLen > 22 ? Math.round(H * 0.07) : nLen > 14 ? Math.round(H * 0.085) : Math.round(H * 0.1);
  const nameY = H * 0.4;

  hSep(ctx, rightCX, nameY - H * 0.07, W * 0.18, goldGrad(ctx, rightCX - W * 0.18, nameY, rightCX + W * 0.18, nameY));

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${nFS}px "Kanit",Arial`;
  ctx.fillStyle = goldGrad(ctx, rightCX - W * 0.22, nameY, rightCX + W * 0.22, nameY);
  ctx.shadowColor = 'rgba(245,158,11,0.4)'; ctx.shadowBlur = 20;
  ctx.fillText(displayName, rightCX, nameY);
  ctx.restore();

  if (subtitle.trim()) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `400 ${Math.round(H * 0.038)}px "Kanit",Arial`;
    ctx.fillStyle = hex('#06B6D4', 0.85);
    ctx.fillText(subtitle.trim(), rightCX, nameY + nFS * 0.9);
    ctx.restore();
  }

  // Progress bar: Compliance Readiness
  const barY = H * (subtitle.trim() ? 0.635 : 0.59);
  const barW = W * 0.38;
  const barH = H * 0.048;
  const barX = rightCX - barW / 2;

  ctx.save();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = `500 ${Math.round(H * 0.036)}px "Kanit",Arial`;
  ctx.fillStyle = hex('#06B6D4', 0.7);
  ctx.fillText('Compliance Readiness', barX, barY - barH * 1.2);
  ctx.restore();

  // Track
  roundRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fillStyle = 'rgba(6,182,212,0.12)'; ctx.fill();
  ctx.strokeStyle = hex('#06B6D4', 0.3); ctx.lineWidth = 1; ctx.stroke();

  // Fill
  const fillW = barW * (score / 100);
  if (fillW > 0) {
    ctx.save();
    ctx.beginPath();
    const r = barH / 2;
    ctx.moveTo(barX + r, barY);
    ctx.lineTo(barX + fillW - r, barY);
    ctx.quadraticCurveTo(barX + fillW, barY, barX + fillW, barY + r);
    ctx.lineTo(barX + fillW, barY + barH - r);
    ctx.quadraticCurveTo(barX + fillW, barY + barH, barX + fillW - r, barY + barH);
    ctx.lineTo(barX + r, barY + barH);
    ctx.quadraticCurveTo(barX, barY + barH, barX, barY + barH - r);
    ctx.lineTo(barX, barY + r);
    ctx.quadraticCurveTo(barX, barY, barX + r, barY);
    ctx.closePath();
    const barFill = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    barFill.addColorStop(0, '#0284c7');
    barFill.addColorStop(0.5, '#06B6D4');
    barFill.addColorStop(1, '#F59E0B');
    ctx.fillStyle = barFill;
    ctx.shadowColor = '#06B6D4'; ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();
  }

  // Score label
  ctx.save();
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(H * 0.072)}px "Kanit",Arial`;
  ctx.fillStyle = goldGrad(ctx, barX + barW - W * 0.1, barY + barH + H * 0.06, barX + barW, barY + barH + H * 0.06);
  ctx.fillText(`${score}%`, barX + barW, barY + barH + H * 0.065);
  ctx.restore();

  hSep(ctx, rightCX, barY + barH + H * 0.12, W * 0.18, goldGrad(ctx, rightCX - W * 0.18, barY + barH, rightCX + W * 0.18, barY + barH));

  // Footer brand
  const footY = H * 0.82;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(H * 0.065)}px "Kanit",Arial`;
  ctx.fillStyle = cyanGrad(ctx, rightCX - W * 0.2, footY, rightCX + W * 0.2, footY);
  ctx.shadowColor = '#06B6D4'; ctx.shadowBlur = 14;
  ctx.fillText('CEO AI THAILAND 2026', rightCX, footY);
  ctx.restore();

  // ISO Seal
  const sealR = Math.round(H * 0.11);
  drawIsoSeal(ctx, leftCX, H * 0.82, sealR);

  // Watermark
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `400 ${Math.round(W * 0.012)}px "Kanit",Arial`;
  ctx.fillStyle = hex('#06B6D4', 0.2);
  ctx.fillText('ceoaithailand.org', cx, H - 14);
  ctx.restore();
}

// ── Square / Story renderer 1080×1080 or 1080×1920 ──────────────────────────

function renderSquare(ctx: CanvasRenderingContext2D, W: number, H: number, company: string, subtitle: string, score: number, isStory: boolean) {
  const cx = W / 2;

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, W, H);
  const bgG = ctx.createRadialGradient(cx, H * 0.42, 0, cx, H * 0.42, H * 0.55);
  bgG.addColorStop(0, 'rgba(6,182,212,0.08)');
  bgG.addColorStop(0.5, 'rgba(6,182,212,0.03)');
  bgG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bgG;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(6,182,212,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  drawParticles(ctx, W, H);

  const padB = 32;
  roundRect(ctx, padB, padB, W - padB * 2, H - padB * 2, 28);
  ctx.strokeStyle = hex('#06B6D4', 0.5);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  roundRect(ctx, padB + 6, padB + 6, W - (padB + 6) * 2, H - (padB + 6) * 2, 22);
  ctx.strokeStyle = hex('#06B6D4', 0.18);
  ctx.lineWidth = 0.8;
  ctx.stroke();

  const clen = 60, cop = 48;
  [[cop, cop], [W - cop, cop], [cop, H - cop], [W - cop, H - cop]].forEach(([bx, by], i) => {
    const sx = i % 2 === 0 ? 1 : -1;
    const sy = i < 2 ? 1 : -1;
    ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + sx * clen, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + sy * clen); ctx.stroke();
  });

  const ribY = H * 0.12, ribH = H * 0.048, ribW = W * 0.62;
  roundRect(ctx, cx - ribW / 2, ribY - ribH / 2, ribW, ribH, ribH / 2);
  const ribFill = ctx.createLinearGradient(cx - ribW / 2, 0, cx + ribW / 2, 0);
  ribFill.addColorStop(0, 'rgba(6,182,212,0.0)');
  ribFill.addColorStop(0.15, 'rgba(6,182,212,0.18)');
  ribFill.addColorStop(0.85, 'rgba(6,182,212,0.18)');
  ribFill.addColorStop(1, 'rgba(6,182,212,0.0)');
  ctx.fillStyle = ribFill; ctx.fill();
  ctx.strokeStyle = hex('#06B6D4', 0.6); ctx.lineWidth = 1; ctx.stroke();
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(ribH * 0.48)}px "Kanit",Arial`;
  ctx.fillStyle = '#06B6D4';
  ctx.fillText('✦   OFFICIALLY POWERED BY   ✦', cx, ribY);
  ctx.restore();

  const shCY = H * (isStory ? 0.33 : 0.365);
  const shR = Math.min(W, H) * (isStory ? 0.145 : 0.19);

  shieldPath(ctx, cx, shCY, shR);
  const shFill = ctx.createLinearGradient(cx, shCY - shR, cx, shCY + shR);
  shFill.addColorStop(0, 'rgba(6,182,212,0.14)');
  shFill.addColorStop(0.5, 'rgba(6,182,212,0.06)');
  shFill.addColorStop(1, 'rgba(6,182,212,0.02)');
  ctx.fillStyle = shFill; ctx.fill();

  ctx.save();
  shieldPath(ctx, cx, shCY, shR);
  ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 2.5;
  ctx.shadowColor = '#06B6D4'; ctx.shadowBlur = 18;
  ctx.stroke(); ctx.restore();

  shieldPath(ctx, cx, shCY, shR * 0.85);
  ctx.strokeStyle = hex('#06B6D4', 0.3); ctx.lineWidth = 1; ctx.stroke();
  drawNeuralNet(ctx, cx, shCY, shR * 0.72);

  const nameY = H * (isStory ? 0.51 : 0.565);
  const displayName = company.trim() || 'บริษัทของคุณ';

  hSep(ctx, cx, nameY - H * 0.04, W * 0.28, goldGrad(ctx, cx - W * 0.28, nameY, cx + W * 0.28, nameY));

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const nLen = displayName.length;
  const nFS = nLen > 22 ? Math.round(W * 0.042) : nLen > 14 ? Math.round(W * 0.052) : Math.round(W * 0.06);
  ctx.font = `700 ${nFS}px "Kanit",Arial`;
  ctx.fillStyle = goldGrad(ctx, cx - W * 0.35, nameY, cx + W * 0.35, nameY);
  ctx.shadowColor = 'rgba(245,158,11,0.4)'; ctx.shadowBlur = 20;
  ctx.fillText(displayName, cx, nameY);
  ctx.restore();

  if (subtitle.trim()) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `400 ${Math.round(W * 0.025)}px "Kanit",Arial`;
    ctx.fillStyle = hex('#06B6D4', 0.85);
    ctx.fillText(subtitle.trim(), cx, nameY + nFS * 0.9);
    ctx.restore();
  }

  const scoreY = nameY + nFS * (subtitle.trim() ? 1.6 : 0.95);
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `500 ${Math.round(W * 0.022)}px "Kanit",Arial`;
  ctx.fillStyle = hex('#06B6D4', 0.7);
  ctx.fillText(`Compliance Readiness: ${score}%`, cx, scoreY);
  ctx.restore();

  hSep(ctx, cx, scoreY + H * 0.038, W * 0.28, goldGrad(ctx, cx - W * 0.28, scoreY, cx + W * 0.28, scoreY));

  const footY = H * (isStory ? 0.82 : 0.79);
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(W * 0.05)}px "Kanit",Arial`;
  ctx.fillStyle = cyanGrad(ctx, cx - W * 0.3, footY, cx + W * 0.3, footY);
  ctx.shadowColor = '#06B6D4'; ctx.shadowBlur = 14;
  ctx.fillText('CEO AI THAILAND', cx, footY);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(W * 0.03)}px "Kanit",Arial`;
  ctx.fillStyle = goldGrad(ctx, cx - W * 0.15, footY + H * 0.05, cx + W * 0.15, footY + H * 0.05);
  ctx.fillText('2026', cx, footY + H * 0.05);
  ctx.restore();

  const sealR = Math.round(W * 0.085);
  drawIsoSeal(ctx, W - padB - sealR - 10, H - padB - sealR - 10, sealR);

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `400 ${Math.round(W * 0.014)}px "Kanit",Arial`;
  ctx.fillStyle = hex('#06B6D4', 0.2);
  ctx.fillText('ceoaithailand.org', cx, H - 18);
  ctx.restore();
}

function renderBadge(canvas: HTMLCanvasElement, company: string, subtitle: string, score: number, fmt: Format) {
  const { w: W, h: H } = FORMATS[fmt];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  if (fmt === 'banner') {
    renderBanner(ctx, W, H, company, subtitle, score);
  } else {
    renderSquare(ctx, W, H, company, subtitle, score, fmt === 'story');
  }
}

// ── Viral caption generator ───────────────────────────────────────────────────

function buildCaption(company: string, score: number): string {
  const name = company.trim() || 'ธุรกิจของเรา';
  return (
    `🏆 ยินดีด้วย! ${name} ก้าวสู่ยุค AI แล้ว!\n\n` +
    `วันนี้เราใช้พนักงาน AI จาก CEO AI Thailand ช่วยจัดการเอกสารและระบบ ISO 9001:2015 ได้อย่างมืออาชีพ 🤖✨\n\n` +
    `✅ Compliance Readiness: ${score}%\n` +
    `✅ Powered by AI Compliance Master\n` +
    `✅ ISO 9001:2015 READY 2026\n\n` +
    `ใครเป็นเจ้าของ SME แล้วยังใช้คนทำเอกสารแบบเดิมอยู่ ต้องรีบปรับตัวด่วนครับ!\n\n` +
    `👉 ceoaithailand.org\n\n` +
    `#CEOAIThailand #ISO9001 #AIforBusiness #SmartSME #BusinessExcellence`
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BadgeGenerator({ defaultName = '', complianceScore = 98, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [company,  setCompany]  = useState(defaultName);
  const [subtitle, setSubtitle] = useState('');
  const [score,    setScore]    = useState(complianceScore);
  const [fmt,      setFmt]      = useState<Format>('square');
  const [copied,   setCopied]   = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showCaption, setShowCaption] = useState(false);

  const redraw = useCallback(() => {
    if (canvasRef.current) renderBadge(canvasRef.current, company, subtitle, score, fmt);
  }, [company, subtitle, score, fmt]);

  useEffect(() => { redraw(); }, [redraw]);

  function handleDownload() {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement('a');
    a.download = `CEO-AI-Badge-${(company.trim() || 'company').replace(/\s+/g, '-')}.png`;
    a.href = c.toDataURL('image/png');
    a.click();
  }

  function buildEdgeUrl(): string {
    const base = import.meta.env.VITE_SUPABASE_URL;
    if (!base) return 'https://ceoaithailand.org/';
    const params = new URLSearchParams({
      company:  company.trim() || 'บริษัทของคุณ',
      subtitle: subtitle.trim(),
      score:    String(score),
      fmt,
    });
    return `${base}/functions/v1/generate-badge?${params}`;
  }

  async function handleCopyLink() {
    const url = shareUrl || buildEdgeUrl();
    if (!shareUrl) setShareUrl(url);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleCopyCaption() {
    navigator.clipboard.writeText(buildCaption(company, score)).then(() => {
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2000);
    });
  }

  function handleLinkedIn() {
    const targetUrl = encodeURIComponent(shareUrl || buildEdgeUrl());
    const text = encodeURIComponent(
      `🏆 ${company.trim() || 'เราได้รับ'} Badge of Excellence จาก CEO AI Thailand\n` +
      `Compliance Readiness: ${score}% · Powered by AI\n\n` +
      `#CEOAIThailand #ISO9001 #BusinessExcellence #AI`,
    );
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${targetUrl}&summary=${text}`,
      '_blank',
    );
  }

  function handleFacebook() {
    const targetUrl = encodeURIComponent(shareUrl || buildEdgeUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${targetUrl}`, '_blank');
  }

  const caption = buildCaption(company, score);

  return (
    <div className="badge-overlay" onClick={onClose}>
      <div className="badge-modal" onClick={e => e.stopPropagation()}>
        <div className="badge-head">
          <span className="badge-title">🏆 Badge of Excellence</span>
          <button className="badge-close" onClick={onClose}>×</button>
        </div>

        <div className="badge-body">
          <div className="badge-fmt-row">
            {(Object.keys(FORMATS) as Format[]).map(f => (
              <button
                key={f}
                className={`badge-fmt-btn${fmt === f ? ' active' : ''}`}
                onClick={() => setFmt(f)}
              >
                {FORMATS[f].label}
              </button>
            ))}
          </div>

          <canvas ref={canvasRef} className="badge-canvas" />

          <div className="badge-fields">
            <label className="badge-label">ชื่อบริษัท / องค์กร</label>
            <input className="badge-input" value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="บริษัท ของคุณ จำกัด" maxLength={40} />

            <label className="badge-label">ข้อความเพิ่มเติม (ไม่บังคับ)</label>
            <input className="badge-input" value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              placeholder="เช่น  ISO 9001:2015 Certified" maxLength={40} />

            <label className="badge-label">Compliance Readiness %</label>
            <div className="badge-score-row">
              <input type="range" min={0} max={100} value={score}
                onChange={e => setScore(Number(e.target.value))} className="badge-range" />
              <span className="badge-score-val">{score}%</span>
            </div>
          </div>

          <div className="badge-actions">
            <button className="badge-btn-primary" onClick={handleDownload}>⬇ ดาวน์โหลด PNG</button>
            <button className="badge-btn-li" onClick={handleLinkedIn}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 5 }}>
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn
            </button>
            <button className="badge-btn-fb" onClick={handleFacebook}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 5 }}>
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </button>
            <button className="badge-btn-copy" onClick={handleCopyLink}>
              {copied ? '✓ คัดลอกแล้ว' : '🔗 คัดลอกลิงก์'}
            </button>
          </div>

          {/* Viral caption section */}
          <div className="badge-caption-toggle" onClick={() => setShowCaption(v => !v)}>
            <span>📝 ข้อความพร้อมโพสต์ (Viral Caption)</span>
            <span className="badge-caption-chevron">{showCaption ? '▲' : '▼'}</span>
          </div>
          {showCaption && (
            <div className="badge-caption-box">
              <pre className="badge-caption-text">{caption}</pre>
              <button className="badge-btn-copy badge-caption-copy" onClick={handleCopyCaption}>
                {captionCopied ? '✓ คัดลอกแล้ว!' : '📋 คัดลอกข้อความ'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
