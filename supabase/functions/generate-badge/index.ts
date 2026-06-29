// Uses SVG + @resvg/resvg-wasm — no native deps, works in Supabase Edge Functions
import init, { Resvg } from 'https://esm.sh/@resvg/resvg-wasm@2.4.1';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'badges';

let wasmReady = false;
async function ensureWasm() {
  if (!wasmReady) {
    const res = await fetch('https://esm.sh/@resvg/resvg-wasm@2.4.1/index_bg.wasm');
    await init(res);
    wasmReady = true;
  }
}

const xe = (s: string) =>
  s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const i0 = (n: number) => n | 0;

function rrPath(x:number,y:number,w:number,h:number,r:number):string{
  return `M${x+r},${y} L${x+w-r},${y} Q${x+w},${y} ${x+w},${y+r} L${x+w},${y+h-r} Q${x+w},${y+h} ${x+w-r},${y+h} L${x+r},${y+h} Q${x},${y+h} ${x},${y+h-r} L${x},${y+r} Q${x},${y} ${x+r},${y} Z`;
}
function shieldD(cx:number,cy:number,r:number):string{
  const top=cy-r*.9,mid=cy-r*.1,bot=cy+r*.95;
  return `M${cx-r},${top} L${cx+r},${top} L${cx+r},${mid} C${cx+r},${cy+r*.6} ${cx},${bot} ${cx},${bot} C${cx},${bot} ${cx-r},${cy+r*.6} ${cx-r},${mid} Z`;
}
function grid(W:number,H:number):string{
  let s='';
  for(let x=0;x<W;x+=60) s+=`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="rgba(6,182,212,.04)" stroke-width="1"/>`;
  for(let y=0;y<H;y+=60) s+=`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(6,182,212,.04)" stroke-width="1"/>`;
  return s;
}
function pts(W:number,H:number):string{
  let s='';
  for(let i=0;i<60;i++){
    const x=((i*37+17)*31337)%W,y=((i*71+53)*13337)%H,r=(i%3)+1,a=.08+(i%5)*.06;
    s+=`<circle cx="${i0(x)}" cy="${i0(y)}" r="${r}" fill="${i%3!==2?`rgba(6,182,212,${a})`:`rgba(245,158,11,${a*.7})`}"/>`;
  }
  for(let i=0;i<60;i+=4){
    const x1=((i*37+17)*31337)%W,y1=((i*71+53)*13337)%H,x2=(((i+4)*37+17)*31337)%W,y2=(((i+4)*71+53)*13337)%H;
    if(Math.hypot(x2-x1,y2-y1)<300) s+=`<line x1="${i0(x1)}" y1="${i0(y1)}" x2="${i0(x2)}" y2="${i0(y2)}" stroke="rgba(6,182,212,.05)" stroke-width=".8"/>`;
  }
  return s;
}
function nn(cx:number,cy:number,r:number):string{
  const n=[[cx,cy-r*.55],[cx-r*.45,cy-r*.2],[cx+r*.45,cy-r*.2],[cx-r*.6,cy+r*.25],[cx+r*.6,cy+r*.25],[cx-r*.2,cy+r*.55],[cx+r*.2,cy+r*.55],[cx,cy+r*.1]];
  const e=[[0,1],[0,2],[1,2],[1,3],[2,4],[1,7],[2,7],[3,5],[4,6],[5,7],[6,7],[3,7],[4,7]];
  let s='';
  e.forEach(([a,b])=>s+=`<line x1="${i0(n[a][0])}" y1="${i0(n[a][1])}" x2="${i0(n[b][0])}" y2="${i0(n[b][1])}" stroke="rgba(6,182,212,.35)" stroke-width="1.5"/>`);
  n.forEach(([nx,ny],i)=>{const nr=i===7?10:6;s+=`<circle cx="${i0(nx)}" cy="${i0(ny)}" r="${nr*3}" fill="rgba(6,182,212,.1)"/><circle cx="${i0(nx)}" cy="${i0(ny)}" r="${nr}" fill="#06B6D4"/>`;});
  return s;
}
function seal(cx:number,cy:number,r:number):string{
  const f1=i0(r*.22),f2=i0(r*.18);
  return `<circle cx="${i0(cx)}" cy="${i0(cy)}" r="${r}" fill="none" stroke="#06B6D4" stroke-width="2"/>
<circle cx="${i0(cx)}" cy="${i0(cy)}" r="${r-2}" fill="rgba(6,182,212,.08)"/>
<circle cx="${i0(cx)}" cy="${i0(cy)}" r="${r-10}" fill="none" stroke="rgba(6,182,212,.4)" stroke-width=".8"/>
<text x="${i0(cx)}" y="${i0(cy-r*.14)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${f1}" font-weight="700" fill="#06B6D4">ISO 9001:2015</text>
<text x="${i0(cx)}" y="${i0(cy+r*.15)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${f2}" font-weight="500" fill="#F59E0B">READY</text>`;
}
function sep(cx:number,y:number,hw:number):string{
  return `<line x1="${i0(cx-hw+28)}" y1="${i0(y)}" x2="${i0(cx-28)}" y2="${i0(y)}" stroke="url(#gold)" stroke-width="1"/>
<line x1="${i0(cx+28)}" y1="${i0(y)}" x2="${i0(cx+hw-28)}" y2="${i0(y)}" stroke="url(#gold)" stroke-width="1"/>
<polygon points="${i0(cx)},${i0(y-7)} ${i0(cx+10)},${i0(y)} ${i0(cx)},${i0(y+7)} ${i0(cx-10)},${i0(y)}" fill="url(#gold)"/>`;
}
function crnrs(W:number,H:number,cop:number,clen:number):string{
  let s='';
  [[cop,cop,1,1],[W-cop,cop,-1,1],[cop,H-cop,1,-1],[W-cop,H-cop,-1,-1]].forEach(([bx,by,sx,sy])=>{
    s+=`<line x1="${bx}" y1="${by}" x2="${bx+sx*clen}" y2="${by}" stroke="#06B6D4" stroke-width="2"/>`;
    s+=`<line x1="${bx}" y1="${by}" x2="${bx}" y2="${by+sy*clen}" stroke="#06B6D4" stroke-width="2"/>`;
  });
  return s;
}

function squareSVG(W:number,H:number,company:string,subtitle:string,score:number,isStory:boolean):string{
  const cx=W/2,pad=32;
  const shCY=H*(isStory?.33:.365),shR=Math.min(W,H)*(isStory?.145:.19);
  const nameY=H*(isStory?.51:.565);
  const name=xe(company.trim()||'บริษัทของคุณ');
  const nLen=name.length,nFS=nLen>22?i0(W*.042):nLen>14?i0(W*.052):i0(W*.06);
  const scoreY=nameY+nFS*(subtitle.trim()?1.6:.95);
  const footY=H*(isStory?.82:.79),sealR=i0(W*.085);
  const ribY=H*.12,ribH=H*.048,ribW=W*.62;
  const sub=subtitle.trim()?`<text x="${i0(cx)}" y="${i0(nameY+nFS*.9)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${i0(W*.025)}" fill="rgba(6,182,212,.85)">${xe(subtitle.trim())}</text>`:'';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs>
<radialGradient id="bg" cx="50%" cy="42%" r="55%"><stop offset="0%" stop-color="#06B6D4" stop-opacity=".08"/><stop offset="50%" stop-color="#06B6D4" stop-opacity=".03"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient>
<linearGradient id="gold" x1="${i0(cx-W*.4)}" y1="0" x2="${i0(cx+W*.4)}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#92611e"/><stop offset="30%" stop-color="#F59E0B"/><stop offset="55%" stop-color="#fde68a"/><stop offset="80%" stop-color="#F59E0B"/><stop offset="100%" stop-color="#92611e"/></linearGradient>
<linearGradient id="cyan" x1="${i0(cx-W*.3)}" y1="0" x2="${i0(cx+W*.3)}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#0284c7"/><stop offset="50%" stop-color="#06B6D4"/><stop offset="100%" stop-color="#0284c7"/></linearGradient>
<linearGradient id="shG" x1="0" y1="${i0(shCY-shR)}" x2="0" y2="${i0(shCY+shR)}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#06B6D4" stop-opacity=".14"/><stop offset="50%" stop-color="#06B6D4" stop-opacity=".06"/><stop offset="100%" stop-color="#06B6D4" stop-opacity=".02"/></linearGradient>
<linearGradient id="rib" x1="${i0(cx-ribW/2)}" y1="0" x2="${i0(cx+ribW/2)}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#06B6D4" stop-opacity="0"/><stop offset="15%" stop-color="#06B6D4" stop-opacity=".18"/><stop offset="85%" stop-color="#06B6D4" stop-opacity=".18"/><stop offset="100%" stop-color="#06B6D4" stop-opacity="0"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="#0F172A"/>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${grid(W,H)}${pts(W,H)}
<path d="${rrPath(pad,pad,W-pad*2,H-pad*2,28)}" fill="none" stroke="rgba(6,182,212,.5)" stroke-width="1.5"/>
<path d="${rrPath(pad+6,pad+6,W-(pad+6)*2,H-(pad+6)*2,22)}" fill="none" stroke="rgba(6,182,212,.18)" stroke-width=".8"/>
${crnrs(W,H,48,60)}
<path d="${rrPath(i0(cx-ribW/2),i0(ribY-ribH/2),i0(ribW),i0(ribH),i0(ribH/2))}" fill="url(#rib)" stroke="rgba(6,182,212,.6)" stroke-width="1"/>
<text x="${i0(cx)}" y="${i0(ribY)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${i0(ribH*.48)}" font-weight="600" fill="#06B6D4">*   OFFICIALLY POWERED BY   *</text>
<path d="${shieldD(cx,shCY,shR)}" fill="url(#shG)" stroke="#06B6D4" stroke-width="2.5"/>
<path d="${shieldD(cx,shCY,shR*.85)}" fill="none" stroke="rgba(6,182,212,.3)" stroke-width="1"/>
${nn(cx,shCY,shR*.72)}
${sep(cx,nameY-H*.04,W*.28)}
<text x="${i0(cx)}" y="${i0(nameY)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${nFS}" font-weight="700" fill="url(#gold)">${name}</text>
${sub}
<text x="${i0(cx)}" y="${i0(scoreY)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${i0(W*.022)}" font-weight="500" fill="rgba(6,182,212,.7)">Compliance Readiness: ${score}%</text>
${sep(cx,scoreY+H*.038,W*.28)}
<text x="${i0(cx)}" y="${i0(footY)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${i0(W*.05)}" font-weight="700" fill="url(#cyan)">CEO AI THAILAND</text>
<text x="${i0(cx)}" y="${i0(footY+H*.05)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${i0(W*.03)}" font-weight="600" fill="url(#gold)">2026</text>
${seal(W-pad-sealR-10,H-pad-sealR-10,sealR)}
<text x="${i0(cx)}" y="${H-18}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${i0(W*.014)}" fill="rgba(6,182,212,.2)">ceoaithailand.org</text>
</svg>`;
}

function bannerSVG(W:number,H:number,company:string,subtitle:string,score:number):string{
  const cx=W/2,pad=28;
  const lCX=W*.28,shR=H*.28,shCY=H*.42,rCX=W*.73;
  const name=xe(company.trim()||'บริษัทของคุณ');
  const nLen=name.length,nFS=nLen>22?i0(H*.07):nLen>14?i0(H*.085):i0(H*.1);
  const nameY=H*.4,barY=H*(subtitle.trim()?.635:.59);
  const barW=W*.38,barH=H*.048,barX=rCX-barW/2,barR=barH/2;
  const footY=H*.82,fillW=barW*(score/100);
  const sub=subtitle.trim()?`<text x="${i0(rCX)}" y="${i0(nameY+nFS*.9)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${i0(H*.038)}" fill="rgba(6,182,212,.85)">${xe(subtitle.trim())}</text>`:'';
  const barFill=fillW>0?`<path d="${rrPath(i0(barX),i0(barY),i0(fillW),i0(barH),i0(Math.min(barR,fillW/2)))}" fill="url(#barF)"/>`:'';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs>
<radialGradient id="bg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#06B6D4" stop-opacity=".09"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient>
<linearGradient id="gold" x1="${i0(rCX-W*.25)}" y1="0" x2="${i0(rCX+W*.25)}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#92611e"/><stop offset="30%" stop-color="#F59E0B"/><stop offset="55%" stop-color="#fde68a"/><stop offset="80%" stop-color="#F59E0B"/><stop offset="100%" stop-color="#92611e"/></linearGradient>
<linearGradient id="cyan" x1="${i0(rCX-W*.2)}" y1="0" x2="${i0(rCX+W*.2)}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#0284c7"/><stop offset="50%" stop-color="#06B6D4"/><stop offset="100%" stop-color="#0284c7"/></linearGradient>
<linearGradient id="shG" x1="0" y1="${i0(shCY-shR)}" x2="0" y2="${i0(shCY+shR)}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#06B6D4" stop-opacity=".14"/><stop offset="100%" stop-color="#06B6D4" stop-opacity=".02"/></linearGradient>
<linearGradient id="barF" x1="${i0(barX)}" y1="0" x2="${i0(barX+barW)}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#0284c7"/><stop offset="50%" stop-color="#06B6D4"/><stop offset="100%" stop-color="#F59E0B"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="#0F172A"/>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${grid(W,H)}${pts(W,H)}
<path d="${rrPath(pad,pad,W-pad*2,H-pad*2,22)}" fill="none" stroke="rgba(6,182,212,.5)" stroke-width="1.5"/>
<path d="${rrPath(pad+5,pad+5,W-(pad+5)*2,H-(pad+5)*2,18)}" fill="none" stroke="rgba(6,182,212,.18)" stroke-width=".8"/>
${crnrs(W,H,42,50)}
<path d="${shieldD(lCX,shCY,shR)}" fill="url(#shG)" stroke="#06B6D4" stroke-width="2.5"/>
<path d="${shieldD(lCX,shCY,shR*.85)}" fill="none" stroke="rgba(6,182,212,.3)" stroke-width="1"/>
${nn(lCX,shCY,shR*.72)}
<line x1="${i0(W*.48)}" y1="${i0(H*.12)}" x2="${i0(W*.48)}" y2="${i0(H*.88)}" stroke="rgba(6,182,212,.2)" stroke-width="1"/>
<text x="${i0(rCX)}" y="${i0(H*.17)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${i0(H*.042)}" font-weight="600" fill="#06B6D4">*  OFFICIALLY POWERED BY  *</text>
${sep(rCX,nameY-H*.07,W*.18)}
<text x="${i0(rCX)}" y="${i0(nameY)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${nFS}" font-weight="700" fill="url(#gold)">${name}</text>
${sub}
<text x="${i0(barX)}" y="${i0(barY-barH*1.2)}" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${i0(H*.036)}" font-weight="500" fill="rgba(6,182,212,.7)">Compliance Readiness</text>
<path d="${rrPath(i0(barX),i0(barY),i0(barW),i0(barH),i0(barR))}" fill="rgba(6,182,212,.12)" stroke="rgba(6,182,212,.3)" stroke-width="1"/>
${barFill}
<text x="${i0(barX+barW)}" y="${i0(barY+barH+H*.065)}" text-anchor="end" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${i0(H*.072)}" font-weight="700" fill="url(#gold)">${score}%</text>
${sep(rCX,barY+barH+H*.12,W*.18)}
<text x="${i0(rCX)}" y="${i0(footY)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${i0(H*.065)}" font-weight="700" fill="url(#cyan)">CEO AI THAILAND 2026</text>
${seal(lCX,H*.82,i0(H*.11))}
<text x="${i0(cx)}" y="${H-14}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${i0(W*.012)}" fill="rgba(6,182,212,.2)">ceoaithailand.org</text>
</svg>`;
}

async function svgToPng(svg:string):Promise<Uint8Array>{
  await ensureWasm();
  const resvg=new Resvg(svg,{fitTo:{mode:'original'}});
  return resvg.render().asPng();
}

async function uploadToStorage(png:Uint8Array,key:string):Promise<string>{
  const admin=createClient(SUPABASE_URL,SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const {error}=await admin.storage.from(BUCKET).upload(key,png,{contentType:'image/png',upsert:true,cacheControl:'86400'});
  if(error) throw new Error(`Storage upload failed: ${error.message}`);
  return admin.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:CORS});
  try{
    let company='บริษัทของคุณ',subtitle='',score=98,fmt='square',directReturn=false;
    if(req.method==='GET'){
      const p=new URL(req.url).searchParams;
      company=p.get('company')||company;
      subtitle=p.get('subtitle')||'';
      score=Math.min(100,Math.max(0,parseInt(p.get('score')||'98')));
      fmt=p.get('fmt')||'square';
      directReturn=true;
    }else{
      const body=await req.json().catch(()=>({}));
      company=body.companyName||body.company||company;
      subtitle=body.subtitle||'';
      score=body.score!=null?body.score:score;
      fmt=body.fmt||'square';
    }
    const isBanner=fmt==='banner',isStory=fmt==='story';
    const W=isBanner?1200:1080,H=isBanner?630:isStory?1920:1080;
    const svg=isBanner?bannerSVG(W,H,company,subtitle,score):squareSVG(W,H,company,subtitle,score,isStory);
    const png=await svgToPng(svg);
    if(directReturn) return new Response(png,{headers:{...CORS,'Content-Type':'image/png','Cache-Control':'public, max-age=86400'}});
    const slug=`${company.trim().replace(/\s+/g,'-').slice(0,30)}-${score}-${fmt}.png`;
    const imageUrl=await uploadToStorage(png,slug);
    const shareUrl=`${SUPABASE_URL}/functions/v1/generate-badge?${new URLSearchParams({company,subtitle,score:String(score),fmt})}`;
    return new Response(JSON.stringify({imageUrl,shareUrl}),{headers:{...CORS,'Content-Type':'application/json'}});
  }catch(err){
    console.error(err);
    return new Response(JSON.stringify({error:String(err)}),{status:500,headers:{...CORS,'Content-Type':'application/json'}});
  }
});
