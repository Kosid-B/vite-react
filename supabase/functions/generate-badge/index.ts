// supabase/functions/generate-badge/index.ts
//
// POST { companyName, score?, subtitle?, fmt? }
//   → generates badge PNG → uploads to Storage bucket "badges"
//   → returns { imageUrl, shareUrl }
//
// GET  ?company=xxx&score=98&subtitle=yyy&fmt=square
//   → same flow, image returned directly (og:image endpoint)

import { createCanvas }  from 'https://deno.land/x/canvas@v1.4.1/mod.ts';
import { createClient }  from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET            = 'badges';

// ── Colour helpers ──────────────────────────────────────────────────────────

const hex = (h: string, a = 1) => {
  const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
};

const cyanGrad = (ctx: CanvasRenderingContext2D, x0:number, y0:number, x1:number, y1:number) => {
  const g = ctx.createLinearGradient(x0,y0,x1,y1);
  g.addColorStop(0,'#0284c7'); g.addColorStop(.5,'#06B6D4'); g.addColorStop(1,'#0284c7'); return g;
};

const goldGrad = (ctx: CanvasRenderingContext2D, x0:number, y0:number, x1:number, y1:number) => {
  const g = ctx.createLinearGradient(x0,y0,x1,y1);
  g.addColorStop(0,'#92611e'); g.addColorStop(.3,'#F59E0B'); g.addColorStop(.55,'#fde68a');
  g.addColorStop(.8,'#F59E0B'); g.addColorStop(1,'#92611e'); return g;
};

// ── Shape helpers ──────────────────────────────────────────────────────────

function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function shieldPath(ctx:CanvasRenderingContext2D,cx:number,cy:number,r:number){
  const top=cy-r*.9, mid=cy-r*.1, bot=cy+r*.95;
  ctx.beginPath();
  ctx.moveTo(cx-r,top); ctx.lineTo(cx+r,top); ctx.lineTo(cx+r,mid);
  ctx.bezierCurveTo(cx+r,cy+r*.6,cx,bot,cx,bot);
  ctx.bezierCurveTo(cx,bot,cx-r,cy+r*.6,cx-r,mid); ctx.closePath();
}

function hSep(ctx:CanvasRenderingContext2D,x:number,y:number,hw:number,color:unknown){
  ctx.save();
  [[x-hw,x-28],[x+28,x+hw]].forEach(([x0,x1])=>{
    ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y);
    ctx.strokeStyle=color as string; ctx.lineWidth=1; ctx.stroke();
  });
  ctx.beginPath(); ctx.moveTo(x,y-7); ctx.lineTo(x+10,y); ctx.lineTo(x,y+7); ctx.lineTo(x-10,y);
  ctx.closePath(); ctx.fillStyle=color as string; ctx.fill(); ctx.restore();
}

function drawParticles(ctx:CanvasRenderingContext2D,W:number,H:number){
  for(let i=0;i<60;i++){
    const x=((i*37+17)*31337)%W, y=((i*71+53)*13337)%H, r=(i%3)+1, a=.08+(i%5)*.06;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle=i%3!==2?hex('#06B6D4',a):hex('#F59E0B',a*.7); ctx.fill();
  }
  for(let i=0;i<60;i+=4){
    const x1=((i*37+17)*31337)%W, y1=((i*71+53)*13337)%H;
    const x2=(((i+4)*37+17)*31337)%W, y2=(((i+4)*71+53)*13337)%H;
    if(Math.hypot(x2-x1,y2-y1)<300){
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
      ctx.strokeStyle=hex('#06B6D4',.05); ctx.lineWidth=.8; ctx.stroke();
    }
  }
}

function drawNeuralNet(ctx:CanvasRenderingContext2D,cx:number,cy:number,r:number){
  const n:number[][]=[
    [cx,cy-r*.55],[cx-r*.45,cy-r*.2],[cx+r*.45,cy-r*.2],
    [cx-r*.6,cy+r*.25],[cx+r*.6,cy+r*.25],
    [cx-r*.2,cy+r*.55],[cx+r*.2,cy+r*.55],[cx,cy+r*.1],
  ];
  [[0,1],[0,2],[1,2],[1,3],[2,4],[1,7],[2,7],[3,5],[4,6],[5,7],[6,7],[3,7],[4,7]].forEach(([a,b])=>{
    const g=ctx.createLinearGradient(n[a][0],n[a][1],n[b][0],n[b][1]);
    g.addColorStop(0,hex('#06B6D4',.5)); g.addColorStop(1,hex('#0284c7',.2));
    ctx.beginPath(); ctx.moveTo(n[a][0],n[a][1]); ctx.lineTo(n[b][0],n[b][1]);
    ctx.strokeStyle=g; ctx.lineWidth=1.5; ctx.stroke();
  });
  n.forEach(([nx,ny],i)=>{
    const nr=i===7?10:6;
    const glow=ctx.createRadialGradient(nx,ny,0,nx,ny,nr*3);
    glow.addColorStop(0,hex('#06B6D4',.4)); glow.addColorStop(1,hex('#06B6D4',0));
    ctx.beginPath(); ctx.arc(nx,ny,nr*3,0,Math.PI*2); ctx.fillStyle=glow; ctx.fill();
    ctx.beginPath(); ctx.arc(nx,ny,nr,0,Math.PI*2); ctx.fillStyle='#06B6D4'; ctx.fill();
  });
}

function drawIsoSeal(ctx:CanvasRenderingContext2D,cx:number,cy:number,r:number){
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.strokeStyle='#06B6D4'; ctx.lineWidth=2; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,r-2,0,Math.PI*2);
  const f=ctx.createRadialGradient(cx,cy-r*.3,0,cx,cy,r);
  f.addColorStop(0,'rgba(6,182,212,0.15)'); f.addColorStop(1,'rgba(6,182,212,0.04)');
  ctx.fillStyle=f; ctx.fill();
  ctx.beginPath(); ctx.arc(cx,cy,r-10,0,Math.PI*2);
  ctx.strokeStyle=hex('#06B6D4',.4); ctx.lineWidth=.8; ctx.stroke();
  ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font=`700 ${Math.round(r*.22)}px Arial`; ctx.fillStyle='#06B6D4';
  ctx.fillText('ISO 9001:2015',cx,cy-r*.14);
  ctx.font=`500 ${Math.round(r*.18)}px Arial`; ctx.fillStyle='#F59E0B';
  ctx.fillText('READY',cx,cy+r*.15); ctx.restore();
}

// ── Banner render (Achievement Bar 1200×630) ───────────────────────────────

function renderBanner(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  company: string, subtitle: string, score: number,
) {
  const cx = W / 2;

  // Background
  ctx.fillStyle = '#0F172A'; ctx.fillRect(0, 0, W, H);
  const bg = ctx.createRadialGradient(cx, H * .5, 0, cx, H * .5, H * .7);
  bg.addColorStop(0, 'rgba(6,182,212,0.09)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(6,182,212,0.04)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  drawParticles(ctx, W, H);

  // Border
  const pad = 28;
  roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 22);
  ctx.strokeStyle = hex('#06B6D4', .5); ctx.lineWidth = 1.5; ctx.stroke();
  roundRect(ctx, pad + 5, pad + 5, W - (pad + 5) * 2, H - (pad + 5) * 2, 18);
  ctx.strokeStyle = hex('#06B6D4', .18); ctx.lineWidth = .8; ctx.stroke();

  // Corner accents
  const clen = 50, cop = 42;
  [[cop, cop], [W - cop, cop], [cop, H - cop], [W - cop, H - cop]].forEach(([bx, by], i) => {
    const sx = i % 2 === 0 ? 1 : -1, sy = i < 2 ? 1 : -1;
    ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + sx * clen, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + sy * clen); ctx.stroke();
  });

  // Left panel: shield
  const leftCX = W * .28, shR = H * .28, shCY = H * .42;
  shieldPath(ctx, leftCX, shCY, shR);
  const sf = ctx.createLinearGradient(leftCX, shCY - shR, leftCX, shCY + shR);
  sf.addColorStop(0, 'rgba(6,182,212,0.14)'); sf.addColorStop(1, 'rgba(6,182,212,0.02)');
  ctx.fillStyle = sf; ctx.fill();
  ctx.save();
  shieldPath(ctx, leftCX, shCY, shR);
  ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 2.5; ctx.shadowColor = '#06B6D4'; ctx.shadowBlur = 16;
  ctx.stroke(); ctx.restore();
  shieldPath(ctx, leftCX, shCY, shR * .85);
  ctx.strokeStyle = hex('#06B6D4', .3); ctx.lineWidth = 1; ctx.stroke();
  drawNeuralNet(ctx, leftCX, shCY, shR * .72);

  // Divider
  ctx.beginPath(); ctx.moveTo(W * .48, H * .12); ctx.lineTo(W * .48, H * .88);
  ctx.strokeStyle = hex('#06B6D4', .2); ctx.lineWidth = 1; ctx.stroke();

  // Right panel
  const rightCX = W * .73;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(H * .042)}px Arial`;
  ctx.fillStyle = '#06B6D4';
  ctx.fillText('✦  OFFICIALLY POWERED BY  ✦', rightCX, H * .17);
  ctx.restore();

  const name = company.trim() || 'บริษัทของคุณ';
  const nLen = name.length;
  const nFS = nLen > 22 ? Math.round(H * .07) : nLen > 14 ? Math.round(H * .085) : Math.round(H * .1);
  const nameY = H * .4;

  hSep(ctx, rightCX, nameY - H * .07, W * .18, goldGrad(ctx, rightCX - W * .18, nameY, rightCX + W * .18, nameY));
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${nFS}px Arial`;
  ctx.fillStyle = goldGrad(ctx, rightCX - W * .22, nameY, rightCX + W * .22, nameY);
  ctx.shadowColor = 'rgba(245,158,11,0.4)'; ctx.shadowBlur = 20;
  ctx.fillText(name, rightCX, nameY);
  ctx.restore();

  if (subtitle.trim()) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `400 ${Math.round(H * .038)}px Arial`; ctx.fillStyle = hex('#06B6D4', .85);
    ctx.fillText(subtitle.trim(), rightCX, nameY + nFS * .9);
    ctx.restore();
  }

  // Progress bar
  const barY = H * (subtitle.trim() ? .635 : .59);
  const barW = W * .38, barH = H * .048;
  const barX = rightCX - barW / 2;

  ctx.save();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = `500 ${Math.round(H * .036)}px Arial`; ctx.fillStyle = hex('#06B6D4', .7);
  ctx.fillText('Compliance Readiness', barX, barY - barH * 1.2);
  ctx.restore();

  roundRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fillStyle = 'rgba(6,182,212,0.12)'; ctx.fill();
  ctx.strokeStyle = hex('#06B6D4', .3); ctx.lineWidth = 1; ctx.stroke();

  const fillW = barW * (score / 100);
  if (fillW > 0) {
    ctx.save();
    ctx.beginPath();
    const r = barH / 2;
    ctx.moveTo(barX + r, barY); ctx.lineTo(barX + fillW - r, barY);
    ctx.quadraticCurveTo(barX + fillW, barY, barX + fillW, barY + r);
    ctx.lineTo(barX + fillW, barY + barH - r);
    ctx.quadraticCurveTo(barX + fillW, barY + barH, barX + fillW - r, barY + barH);
    ctx.lineTo(barX + r, barY + barH); ctx.quadraticCurveTo(barX, barY + barH, barX, barY + barH - r);
    ctx.lineTo(barX, barY + r); ctx.quadraticCurveTo(barX, barY, barX + r, barY); ctx.closePath();
    const bf = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    bf.addColorStop(0, '#0284c7'); bf.addColorStop(.5, '#06B6D4'); bf.addColorStop(1, '#F59E0B');
    ctx.fillStyle = bf; ctx.shadowColor = '#06B6D4'; ctx.shadowBlur = 12; ctx.fill(); ctx.restore();
  }

  ctx.save();
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(H * .072)}px Arial`;
  ctx.fillStyle = goldGrad(ctx, barX + barW - W * .1, barY + barH + H * .06, barX + barW, barY + barH + H * .06);
  ctx.fillText(`${score}%`, barX + barW, barY + barH + H * .065);
  ctx.restore();

  hSep(ctx, rightCX, barY + barH + H * .12, W * .18, goldGrad(ctx, rightCX - W * .18, barY + barH, rightCX + W * .18, barY + barH));

  const footY = H * .82;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(H * .065)}px Arial`;
  ctx.fillStyle = cyanGrad(ctx, rightCX - W * .2, footY, rightCX + W * .2, footY);
  ctx.shadowColor = '#06B6D4'; ctx.shadowBlur = 14;
  ctx.fillText('CEO AI THAILAND 2026', rightCX, footY);
  ctx.restore();

  // ISO Seal
  drawIsoSeal(ctx, leftCX, H * .82, Math.round(H * .11));

  // Watermark
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `400 ${Math.round(W * .012)}px Arial`; ctx.fillStyle = hex('#06B6D4', .2);
  ctx.fillText('ceoaithailand.org', cx, H - 14);
  ctx.restore();
}

// ── Main render ────────────────────────────────────────────────────────────

function renderBadge(
  ctx: CanvasRenderingContext2D,
  W:number, H:number,
  company:string, subtitle:string, score:number, isStory:boolean,
){
  const cx=W/2;

  // Background
  ctx.fillStyle='#0F172A'; ctx.fillRect(0,0,W,H);
  const bg=ctx.createRadialGradient(cx,H*.42,0,cx,H*.42,H*.55);
  bg.addColorStop(0,'rgba(6,182,212,0.08)'); bg.addColorStop(.5,'rgba(6,182,212,0.03)'); bg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  ctx.strokeStyle='rgba(6,182,212,0.04)'; ctx.lineWidth=1;
  for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

  drawParticles(ctx,W,H);

  // Border
  const pad=32;
  roundRect(ctx,pad,pad,W-pad*2,H-pad*2,28); ctx.strokeStyle=hex('#06B6D4',.5); ctx.lineWidth=1.5; ctx.stroke();
  roundRect(ctx,pad+6,pad+6,W-(pad+6)*2,H-(pad+6)*2,22); ctx.strokeStyle=hex('#06B6D4',.18); ctx.lineWidth=.8; ctx.stroke();

  const clen=60,cop=48;
  [[cop,cop],[W-cop,cop],[cop,H-cop],[W-cop,H-cop]].forEach(([bx,by],i)=>{
    const sx=i%2===0?1:-1, sy=i<2?1:-1;
    ctx.strokeStyle='#06B6D4'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx+sx*clen,by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx,by+sy*clen); ctx.stroke();
  });

  // Ribbon
  const ribY=H*.12, ribH=H*.048, ribW=W*.62;
  roundRect(ctx,cx-ribW/2,ribY-ribH/2,ribW,ribH,ribH/2);
  const rib=ctx.createLinearGradient(cx-ribW/2,0,cx+ribW/2,0);
  rib.addColorStop(0,'rgba(6,182,212,0)'); rib.addColorStop(.15,'rgba(6,182,212,0.18)');
  rib.addColorStop(.85,'rgba(6,182,212,0.18)'); rib.addColorStop(1,'rgba(6,182,212,0)');
  ctx.fillStyle=rib; ctx.fill(); ctx.strokeStyle=hex('#06B6D4',.6); ctx.lineWidth=1; ctx.stroke();
  ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font=`600 ${Math.round(ribH*.48)}px Arial`; ctx.fillStyle='#06B6D4';
  ctx.fillText('✦   OFFICIALLY POWERED BY   ✦',cx,ribY); ctx.restore();

  // Shield
  const shCY=H*(isStory?.33:.365), shR=Math.min(W,H)*(isStory?.145:.19);
  shieldPath(ctx,cx,shCY,shR);
  const sf=ctx.createLinearGradient(cx,shCY-shR,cx,shCY+shR);
  sf.addColorStop(0,'rgba(6,182,212,0.14)'); sf.addColorStop(.5,'rgba(6,182,212,0.06)'); sf.addColorStop(1,'rgba(6,182,212,0.02)');
  ctx.fillStyle=sf; ctx.fill();
  shieldPath(ctx,cx,shCY,shR); ctx.strokeStyle='#06B6D4'; ctx.lineWidth=2.5; ctx.stroke();
  shieldPath(ctx,cx,shCY,shR*.85); ctx.strokeStyle=hex('#06B6D4',.3); ctx.lineWidth=1; ctx.stroke();
  drawNeuralNet(ctx,cx,shCY,shR*.72);

  // Company name
  const nameY=H*(isStory?.51:.565);
  const name=company.trim()||'บริษัทของคุณ';
  hSep(ctx,cx,nameY-H*.04,W*.28,goldGrad(ctx,cx-W*.28,nameY,cx+W*.28,nameY));
  ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
  const nLen=name.length, nFS=nLen>22?Math.round(W*.042):nLen>14?Math.round(W*.052):Math.round(W*.06);
  ctx.font=`700 ${nFS}px Arial`; ctx.fillStyle=goldGrad(ctx,cx-W*.35,nameY,cx+W*.35,nameY);
  ctx.fillText(name,cx,nameY); ctx.restore();

  if(subtitle.trim()){
    ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=`400 ${Math.round(W*.025)}px Arial`; ctx.fillStyle=hex('#06B6D4',.85);
    ctx.fillText(subtitle.trim(),cx,nameY+nFS*.9); ctx.restore();
  }

  const scoreY=nameY+nFS*(subtitle.trim()?1.6:.95);
  ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font=`500 ${Math.round(W*.022)}px Arial`; ctx.fillStyle=hex('#06B6D4',.7);
  ctx.fillText(`Compliance Readiness: ${score}%`,cx,scoreY); ctx.restore();
  hSep(ctx,cx,scoreY+H*.038,W*.28,goldGrad(ctx,cx-W*.28,scoreY,cx+W*.28,scoreY));

  // Footer
  const footY=H*(isStory?.82:.79);
  ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font=`700 ${Math.round(W*.05)}px Arial`;
  ctx.fillStyle=cyanGrad(ctx,cx-W*.3,footY,cx+W*.3,footY); ctx.fillText('CEO AI THAILAND',cx,footY); ctx.restore();
  ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font=`600 ${Math.round(W*.03)}px Arial`;
  ctx.fillStyle=goldGrad(ctx,cx-W*.15,footY+H*.05,cx+W*.15,footY+H*.05); ctx.fillText('2026',cx,footY+H*.05); ctx.restore();

  // ISO Seal + watermark
  const sealR=Math.round(W*.085);
  drawIsoSeal(ctx,W-pad-sealR-10,H-pad-sealR-10,sealR);
  ctx.save(); ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  ctx.font=`400 ${Math.round(W*.014)}px Arial`; ctx.fillStyle=hex('#06B6D4',.2);
  ctx.fillText('ceoaithailand.org',cx,H-18); ctx.restore();
}

// ── Upload to Supabase Storage → return public URL ─────────────────────────

async function uploadToStorage(png: Uint8Array, key: string): Promise<string> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { error } = await admin.storage.from(BUCKET).upload(key, png, {
    contentType: 'image/png',
    upsert: true,
    cacheControl: '86400',
  });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = admin.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

// ── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    let company='บริษัทของคุณ', subtitle='', score=98, fmt='square';
    let directReturn = false;

    if (req.method === 'GET') {
      const p = new URL(req.url).searchParams;
      company  = p.get('company')  || company;
      subtitle = p.get('subtitle') || '';
      score    = Math.min(100, Math.max(0, parseInt(p.get('score') || '98')));
      fmt      = p.get('fmt') || 'square';
      directReturn = true; // GET → return image directly for og:image
    } else {
      const body = await req.json().catch(() => ({}));
      company  = body.companyName || body.company || company;
      subtitle = body.subtitle    || '';
      score    = body.score != null ? body.score : score;
      fmt      = body.fmt || 'square';
    }

    const isBanner = fmt === 'banner';
    const isStory  = fmt === 'story';
    const W = isBanner ? 1200 : 1080;
    const H = isBanner ? 630  : isStory ? 1920 : 1080;

    // Generate badge on canvas
    const canvas = createCanvas(W, H);
    // deno.land/x/canvas returns a typed object — cast for our helpers
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
    if (isBanner) {
      renderBanner(ctx, W, H, company, subtitle, score);
    } else {
      renderBadge(ctx, W, H, company, subtitle, score, isStory);
    }

    type CanvasWithBuffer = { toBuffer(t: string): Uint8Array };
    const png = (canvas as unknown as CanvasWithBuffer).toBuffer('image/png');

    if (directReturn) {
      // og:image endpoint — return PNG directly
      return new Response(png, {
        headers: { ...CORS, 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
      });
    }

    // POST flow: upload to Storage → return URLs
    const slug = `${company.trim().replace(/\s+/g,'-').slice(0,30)}-${score}-${fmt}.png`;
    const imageUrl = await uploadToStorage(png, slug);

    const shareUrl = `${SUPABASE_URL}/functions/v1/generate-badge?` +
      new URLSearchParams({ company, subtitle, score: String(score), fmt }).toString();

    return new Response(JSON.stringify({ imageUrl, shareUrl }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
