import { useRef, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

interface Props {
  defaultName?: string;
  complianceScore?: number;
  onClose: () => void;
}

type Format = 'square' | 'story';

const FORMATS: Record<Format, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: '1:1 · LinkedIn / Facebook' },
  story:  { w: 1080, h: 1920, label: '9:16 · Instagram Story' },
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

// Pentagon shield path
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

// Scatter deterministic particles (seeded by position)
function drawParticles(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const pts = 60;
  for (let i = 0; i < pts; i++) {
    const x = ((i * 37 + 17) * 31337) % W;
    const y = ((i * 71 + 53) * 13337) % H;
    const r = (i % 3) + 1;
    const a = 0.08 + (i % 5) * 0.06;
    const isCyan = i % 3 !== 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = isCyan ? hex('#06B6D4', a) : hex('#F59E0B', a * 0.7);
    ctx.fill();
  }
  // some connecting lines between nearby particles
  for (let i = 0; i < pts; i += 4) {
    const x1 = ((i * 37 + 17) * 31337) % W;
    const y1 = ((i * 71 + 53) * 13337) % H;
    const x2 = (((i+4) * 37 + 17) * 31337) % W;
    const y2 = (((i+4) * 71 + 53) * 13337) % H;
    const dist = Math.hypot(x2 - x1, y2 - y1);
    if (dist < 300) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = hex('#06B6D4', 0.05);
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
}

// Neural network nodes in a pattern relative to shield center
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
    [0,1],[0,2],[1,2],[1,3],[2,4],[1,7],[2,7],[3,5],[4,6],[5,7],[6,7],[3,7],[4,7]
  ];

  ctx.save();
  // Edge lines
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
  // Node dots
  nodes.forEach(([nx, ny], i) => {
    const nr = i === 7 ? 10 : 6;
    // glow
    const glow = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr * 3);
    glow.addColorStop(0, hex('#06B6D4', 0.4));
    glow.addColorStop(1, hex('#06B6D4', 0));
    ctx.beginPath();
    ctx.arc(nx, ny, nr * 3, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
    // dot
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

// Small ISO 9001 seal (bottom-right corner)
function drawIsoSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#06B6D4';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Fill
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  const fill = ctx.createRadialGradient(cx, cy - r * 0.3, 0, cx, cy, r);
  fill.addColorStop(0, 'rgba(6,182,212,0.15)');
  fill.addColorStop(1, 'rgba(6,182,212,0.04)');
  ctx.fillStyle = fill;
  ctx.fill();
  // Inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, r - 10, 0, Math.PI * 2);
  ctx.strokeStyle = hex('#06B6D4', 0.4);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Text
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

// Horizontal separator with diamonds
function hSep(ctx: CanvasRenderingContext2D, x: number, y: number, halfW: number, color: string | CanvasGradient) {
  ctx.save();
  [[x - halfW, x - 28],[x + 28, x + halfW]].forEach(([x0, x1]) => {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  // diamond
  ctx.beginPath();
  ctx.moveTo(x, y - 7); ctx.lineTo(x + 10, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 10, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// Main render
function renderBadge(
  canvas: HTMLCanvasElement,
  company: string,
  subtitle: string,
  score: number,
  fmt: Format,
) {
  const { w: W, h: H } = FORMATS[fmt];
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const cx = W / 2;

  // ── Background ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, W, H);

  // Radial cyan glow from center
  const bgG = ctx.createRadialGradient(cx, H * 0.42, 0, cx, H * 0.42, H * 0.55);
  bgG.addColorStop(0, 'rgba(6,182,212,0.08)');
  bgG.addColorStop(0.5,'rgba(6,182,212,0.03)');
  bgG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bgG;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid lines
  ctx.save();
  ctx.strokeStyle = 'rgba(6,182,212,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.restore();

  // Particles
  drawParticles(ctx, W, H);

  // ── Outer border ────────────────────────────────────────────────────────────
  const padB = 32;
  roundRect(ctx, padB, padB, W - padB*2, H - padB*2, 28);
  ctx.strokeStyle = hex('#06B6D4', 0.5);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  roundRect(ctx, padB + 6, padB + 6, W - (padB+6)*2, H - (padB+6)*2, 22);
  ctx.strokeStyle = hex('#06B6D4', 0.18);
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Corner accent lines
  const clen = 60, cop = 48;
  [
    [cop, cop], [W-cop, cop], [cop, H-cop], [W-cop, H-cop]
  ].forEach(([bx, by], i) => {
    const sx = i % 2 === 0 ? 1 : -1;
    const sy = i < 2 ? 1 : -1;
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + sx*clen, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + sy*clen); ctx.stroke();
  });

  // ── "OFFICIALLY POWERED BY" ribbon ──────────────────────────────────────────
  const ribY  = H * 0.12;
  const ribH  = H * 0.048;
  const ribW  = W * 0.62;
  roundRect(ctx, cx - ribW/2, ribY - ribH/2, ribW, ribH, ribH/2);
  const ribFill = ctx.createLinearGradient(cx - ribW/2, 0, cx + ribW/2, 0);
  ribFill.addColorStop(0, 'rgba(6,182,212,0.0)');
  ribFill.addColorStop(0.15,'rgba(6,182,212,0.18)');
  ribFill.addColorStop(0.85,'rgba(6,182,212,0.18)');
  ribFill.addColorStop(1, 'rgba(6,182,212,0.0)');
  ctx.fillStyle = ribFill;
  ctx.fill();
  ctx.strokeStyle = hex('#06B6D4', 0.6);
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(ribH * 0.48)}px "Kanit",Arial`;
  ctx.fillStyle = '#06B6D4';
  ctx.fillText('✦   OFFICIALLY POWERED BY   ✦', cx, ribY);
  ctx.restore();

  // ── Shield + Neural network ──────────────────────────────────────────────────
  const shCY = H * (fmt === 'story' ? 0.33 : 0.365);
  const shR  = Math.min(W, H) * (fmt === 'story' ? 0.145 : 0.19);

  // Shield glass fill
  shieldPath(ctx, cx, shCY, shR);
  const shFill = ctx.createLinearGradient(cx, shCY - shR, cx, shCY + shR);
  shFill.addColorStop(0, 'rgba(6,182,212,0.14)');
  shFill.addColorStop(0.5,'rgba(6,182,212,0.06)');
  shFill.addColorStop(1, 'rgba(6,182,212,0.02)');
  ctx.fillStyle = shFill;
  ctx.fill();

  // Shield glow border
  ctx.save();
  shieldPath(ctx, cx, shCY, shR);
  ctx.strokeStyle = '#06B6D4';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#06B6D4';
  ctx.shadowBlur = 18;
  ctx.stroke();
  ctx.restore();

  // Inner shield (lighter)
  shieldPath(ctx, cx, shCY, shR * 0.85);
  ctx.strokeStyle = hex('#06B6D4', 0.3);
  ctx.lineWidth = 1;
  ctx.stroke();

  // Neural network nodes
  drawNeuralNet(ctx, cx, shCY, shR * 0.72);

  // ── Company Name ─────────────────────────────────────────────────────────────
  const nameY = H * (fmt === 'story' ? 0.51 : 0.565);
  const displayName = company.trim() || 'บริษัทของคุณ';

  hSep(ctx, cx, nameY - H * 0.04, W * 0.28, goldGrad(ctx, cx - W*0.28, nameY, cx + W*0.28, nameY));

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const nLen = displayName.length;
  const nFS  = nLen > 22 ? Math.round(W*0.042) : nLen > 14 ? Math.round(W*0.052) : Math.round(W*0.06);
  ctx.font = `700 ${nFS}px "Kanit",Arial`;
  const nGrad = goldGrad(ctx, cx - W*0.35, nameY, cx + W*0.35, nameY);
  ctx.fillStyle = nGrad;
  ctx.shadowColor = 'rgba(245,158,11,0.4)';
  ctx.shadowBlur = 20;
  ctx.fillText(displayName, cx, nameY);
  ctx.restore();

  if (subtitle.trim()) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `400 ${Math.round(W*0.025)}px "Kanit",Arial`;
    ctx.fillStyle = hex('#06B6D4', 0.85);
    ctx.fillText(subtitle.trim(), cx, nameY + nFS * 0.9);
    ctx.restore();
  }

  // Compliance Readiness
  const scoreY = nameY + nFS * (subtitle.trim() ? 1.6 : 0.95);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${Math.round(W*0.022)}px "Kanit",Arial`;
  ctx.fillStyle = hex('#06B6D4', 0.7);
  ctx.fillText(`Compliance Readiness: ${score}%`, cx, scoreY);
  ctx.restore();

  hSep(ctx, cx, scoreY + H*0.038, W * 0.28, goldGrad(ctx, cx - W*0.28, scoreY, cx + W*0.28, scoreY));

  // ── CEO AI THAILAND footer ───────────────────────────────────────────────────
  const footY = H * (fmt === 'story' ? 0.82 : 0.79);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(W*0.05)}px "Kanit",Arial`;
  ctx.fillStyle = cyanGrad(ctx, cx - W*0.3, footY, cx + W*0.3, footY);
  ctx.shadowColor = '#06B6D4';
  ctx.shadowBlur = 14;
  ctx.fillText('CEO AI THAILAND', cx, footY);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(W*0.03)}px "Kanit",Arial`;
  ctx.fillStyle = goldGrad(ctx, cx - W*0.15, footY + H*0.05, cx + W*0.15, footY + H*0.05);
  ctx.fillText('2026', cx, footY + H * 0.05);
  ctx.restore();

  // ── ISO Seal (bottom-right) ──────────────────────────────────────────────────
  const sealR = Math.round(W * 0.085);
  const sealCX = W - padB - sealR - 10;
  const sealCY = H - padB - sealR - 10;
  drawIsoSeal(ctx, sealCX, sealCY, sealR);

  // ── Watermark ────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `400 ${Math.round(W*0.014)}px "Kanit",Arial`;
  ctx.fillStyle = hex('#06B6D4', 0.2);
  ctx.fillText('ceoaithailand.org', cx, H - 18);
  ctx.restore();
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BadgeGenerator({ defaultName = '', complianceScore = 98, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [company,  setCompany]  = useState(defaultName);
  const [subtitle, setSubtitle] = useState('');
  const [score,    setScore]    = useState(complianceScore);
  const [fmt,      setFmt]      = useState<Format>('square');
  const [copied,     setCopied]     = useState(false);
  const [shareUrl,   setShareUrl]   = useState('');
  const [uploading,  setUploading]  = useState(false);

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

  async function handleCopyLink() {
    // If we already have a URL, just copy it
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
      return;
    }

    const c = canvasRef.current;
    if (!c) return;

    // Try to upload to Supabase Storage for a real shareable image URL
    if (isSupabaseEnabled && supabase) {
      setUploading(true);
      try {
        const blob = await new Promise<Blob>((res) => c.toBlob(b => res(b!), 'image/png'));
        const fileName = `badge-${Date.now()}-${(company.trim() || 'company').replace(/\s+/g, '-').slice(0, 30)}.png`;
        const { data, error } = await supabase.storage
          .from('badges')
          .upload(fileName, blob, { contentType: 'image/png', upsert: false });
        if (!error && data) {
          const { data: pub } = supabase.storage.from('badges').getPublicUrl(data.path);
          const url = pub.publicUrl;
          setShareUrl(url);
          navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          setUploading(false);
          return;
        }
      } catch {}
      setUploading(false);
    }

    // Fallback: copy app URL
    navigator.clipboard.writeText('https://ceoaithailand.org/').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleLinkedIn() {
    const targetUrl = encodeURIComponent(shareUrl || 'https://ceoaithailand.org/');
    const text = encodeURIComponent(
      `🏆 ${company.trim() || 'เราได้รับ'} Badge of Excellence จาก CEO AI Thailand\n` +
      `Compliance Readiness: ${score}% · Powered by AI\n\n` +
      `#CEOAIThailand #ISO9001 #BusinessExcellence #AI`
    );
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${targetUrl}&summary=${text}`,
      '_blank',
    );
  }

  return (
    <div className="badge-overlay" onClick={onClose}>
      <div className="badge-modal" onClick={e => e.stopPropagation()}>
        <div className="badge-head">
          <span className="badge-title">🏆 Badge of Excellence</span>
          <button className="badge-close" onClick={onClose}>×</button>
        </div>

        <div className="badge-body">
          {/* Format selector */}
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
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{marginRight:5}}>
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              แชร์ LinkedIn
            </button>
            <button className="badge-btn-copy" onClick={handleCopyLink} disabled={uploading}>
              {uploading ? '⏳ อัปโหลด...' : copied ? '✓ คัดลอกแล้ว' : '🔗 คัดลอกลิงก์'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
