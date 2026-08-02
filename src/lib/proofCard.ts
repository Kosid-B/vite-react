// proofCard.ts — Shareable Proof Card (Viral Loop เฟส B: social proof ที่แชร์ได้ 1 คลิก)
// สร้างการ์ด SVG โปรซีเจอรัลเข้าธีม (ชื่อบริษัท + โลโก้ monogram + สถิติผลงาน + brand + ลิงก์)
// ขนาด 1200×630 (OG) แชร์ลง social ได้ · pure/testable · reuse paletteFor/monogram (companyIdentity)
import { paletteFor, monogram } from './companyIdentity';

export interface ProofCardInput {
  companyName: string;
  statValue: string;   // เช่น "12"
  statLabel: string;   // เช่น "ดีลปิดแล้ว"
  subline?: string;    // บรรทัดเสริม (ไม่บังคับ)
  url: string;         // ลิงก์ที่โชว์บนการ์ด (เช่น ceoaithailand.org)
}

function esc(s: string): string {
  return String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
const trunc = (s: string, n: number): string => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/** สร้าง SVG การ์ดผลงาน (1200×630) จากข้อมูลจริง — pure */
export function proofCardSvg(inp: ProofCardInput): string {
  const name = trunc((inp.companyName || 'บริษัท AI').trim(), 26);
  const pal = paletteFor(name);
  const mono = monogram(name);
  const stat = esc(inp.statValue || '');
  const label = esc(trunc((inp.statLabel || '').trim(), 32));
  const sub = inp.subline ? esc(trunc(inp.subline.trim(), 48)) : '';
  const url = esc(trunc((inp.url || 'ceoaithailand.org').trim(), 40));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="ผลงาน ${esc(name)}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#020617"/><stop offset="1" stop-color="#0b1220"/></linearGradient>
<radialGradient id="glow" cx="0.8" cy="0.15" r="0.6"><stop offset="0" stop-color="#06b6d4" stop-opacity="0.22"/><stop offset="1" stop-color="#06b6d4" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1200" height="630" fill="url(#bg)"/>
<rect width="1200" height="630" fill="url(#glow)"/>
<rect x="1" y="1" width="1198" height="628" rx="28" fill="none" stroke="#1e293b" stroke-width="2"/>
<g font-family="Kanit, system-ui, sans-serif">
  <rect x="72" y="72" width="96" height="96" rx="22" fill="${pal.bg}"/>
  <text x="120" y="120" fill="${pal.fg}" font-size="44" font-weight="700" text-anchor="middle" dominant-baseline="central">${esc(mono)}</text>
  <text x="190" y="108" fill="#22d3ee" font-size="26" font-weight="600">CEO AI Thailand</text>
  <text x="190" y="146" fill="#64748b" font-size="20">AI Business Operating System</text>
  <text x="72" y="300" fill="#f8fafc" font-size="52" font-weight="700">${esc(name)}</text>
  <text x="72" y="430" fill="#22d3ee" font-size="150" font-weight="800">${stat}</text>
  <text x="72" y="490" fill="#cbd5e1" font-size="40" font-weight="600">${label}</text>
  ${sub ? `<text x="72" y="540" fill="#94a3b8" font-size="26">${sub}</text>` : ''}
  <text x="72" y="590" fill="#8b96a9" font-size="24">⚡ สร้างด้วย CEO AI Thailand · ${url}</text>
</g>
</svg>`;
}
