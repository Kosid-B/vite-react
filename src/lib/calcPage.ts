/* calcPage — หน้า "คิดให้ดูเลย" เรนเดอร์ฝั่ง server ทั้งหมด (ไม่ต้องรอ JS)
 *
 * 🔴 ทำไมถึงต้องมีหน้านี้ (ตัวเลขจริงจาก GA4 · 22 ก.ค.–18 ส.ค. 2569):
 *   คลิป TikTok มีคนเห็น 14,500 คน (ซื้อวิว ฿226) → เปิดบทความ **8 คน**
 *   และทั้ง 8 คน **อยู่เฉลี่ย 2 วินาที** แล้วปิดทิ้ง
 *   บทความอื่นก็เหมือนกันหมด: ปาล์ม 3 วิ · หาลูกค้าคนแรก 4 วิ
 *   ⇒ 2 วินาที = เขาไม่ได้อ่านเลย เห็นแล้วปิด
 *
 *   สาเหตุที่ตรงที่สุด: **คลิปสัญญาว่า "คำนวณฟรี" แต่ปลายทางเป็นบทความให้อ่าน**
 *   เขามาเพื่อ "ทำ" แต่เจอ "อ่าน" — ช่องว่างระหว่างสิ่งที่สัญญากับสิ่งที่เจอ
 *
 * หลักการของหน้านี้:
 *   ① **ไม่มี JavaScript เลย** — ฟอร์ม GET ธรรมดา · Worker คำนวณให้ · เปิดปุ๊บกรอกได้เลย
 *      (หน้าแอปจริงเป็น React ~300KB ซึ่งบนมือถือ 4G เย็น ๆ อาจกินเวลาเกิน 2 วินาที
 *       ที่คนยอมรอ — หน้านี้จึงต้องเบาที่สุดเท่าที่จะเป็นไปได้)
 *   ② ใช้สูตรเดียวกับในแอป (quickCalcCore) — ห้ามมีสูตรชุดที่สอง
 *   ③ ไม่มีตัวเลขที่เราแต่งขึ้น ทุกบรรทัดอ้างอิงช่องที่ผู้ใช้กรอกเอง
 *   ④ ลิงก์ไปบทความเต็มอยู่ท้ายหน้า — คนที่อยากอ่านต่อยังได้อ่าน
 */
import {
  quickCheck, verdictOf, verdictText, verdictIsPositive, headlineInsights,
  type ProductInput, type Insight, type SkillBiz,
} from './quickCalcCore';
import { priceLadder } from './pricingAnalysis';

/** หัวข้อที่ปรากฏจริงบนหน้า /calc — คำสัญญาในคลิป/คอมเมนต์ต้องชี้มาที่หัวข้อในลิสต์นี้ได้
 *  (บทบาทเดียวกับ h2 ของบทความ ใน content-link-contract ข้อ B4)
 *  ⚠️ แก้ข้อความบนหน้าแล้วต้องแก้ที่นี่ด้วย — เทสต์บังคับว่าทุกหัวข้อต้องอยู่ใน HTML จริง */
export const CALC_ANCHORS = [
  'ขายราคานี้ — กำไรหรือขาดทุน',
  'กำไรต่อชิ้น จุดคุ้มทุน และกำไรทั้งเดือน',
  'ขึ้นราคา 10% เสียลูกค้าได้กี่ %',
] as const;

export interface CalcParams {
  price: number; cost: number; units: number; fixed: number;
  /** มีตัวเลขพอจะคำนวณไหม (ต้องมีอย่างน้อยราคาขาย) */
  filled: boolean;
}

const num = (v: string | null): number => {
  if (!v) return 0;
  // ยอมรับ "1,500" และ "1500" · ตัดอย่างอื่นทิ้ง กันค่าขยะ
  const n = Number(String(v).replace(/[, ]/g, ''));
  return Number.isFinite(n) && n >= 0 && n <= 100_000_000 ? n : 0;
};

/** อ่านตัวเลขจาก query string — ทนค่าพัง ไม่ throw */
export function parseCalcParams(search: string): CalcParams {
  let q: URLSearchParams;
  try { q = new URLSearchParams(search); } catch { q = new URLSearchParams(); }
  const price = num(q.get('price'));
  const cost = num(q.get('cost'));
  const units = num(q.get('units'));
  const fixed = num(q.get('fixed'));
  return { price, cost, units, fixed, filled: price > 0 };
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const baht = (n: number): string => n.toLocaleString('th-TH', { maximumFractionDigits: 2 });

function insightHtml(i: Insight): string {
  if (i.kind === 'calc') {
    return `<li class="i ${i.tone === 'bad' ? 'bad' : i.tone === 'good' ? 'good' : ''}">${esc(i.text)}<span class="from">มาจาก: ${esc(i.from)}</span></li>`;
  }
  if (i.kind === 'question') {
    return `<li class="i q">${esc(i.text)}<span class="from">${esc(i.why)}</span></li>`;
  }
  return `<li class="i act">${esc(i.text)}</li>`;
}

const CSS = `
*{box-sizing:border-box}
body{margin:0;background:#0f172a;color:#e2e8f0;font-family:'Kanit',system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.65}
.wrap{max-width:620px;margin:0 auto;padding:20px 16px 60px}
h2{font-size:1.02rem;color:#f1f5f9;margin:18px 0 8px}
h1{font-size:1.5rem;line-height:1.35;margin:6px 0 4px;color:#f8fafc}
.sub{color:#94a3b8;font-size:.92rem;margin:0 0 18px}
form{background:#111c33;border:1px solid #1e293b;border-radius:14px;padding:16px}
label{display:block;font-size:.85rem;color:#cbd5e1;margin:12px 0 5px}
label:first-of-type{margin-top:0}
label .hint{color:#64748b;font-size:.78rem}
input{width:100%;padding:13px 14px;font-size:1.05rem;font-family:inherit;color:#f8fafc;
background:#0b1526;border:1px solid #24354f;border-radius:10px}
input:focus{outline:2px solid #22d3ee;outline-offset:1px}
button{width:100%;margin-top:18px;padding:15px;font-size:1.05rem;font-weight:700;font-family:inherit;
color:#04121a;background:#f59e0b;border:0;border-radius:11px;cursor:pointer}
.res{margin:20px 0 0;background:#111c33;border:1px solid #1e293b;border-radius:14px;padding:16px}
.verdict{font-size:1.22rem;font-weight:700;margin:0 0 12px}
.verdict.bad{color:#f87171}.verdict.good{color:#4ade80}
.nums{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:0 0 14px}
.n{background:#0b1526;border:1px solid #24354f;border-radius:10px;padding:10px 12px}
.n b{display:block;font-size:1.15rem;color:#f8fafc}
.n span{font-size:.76rem;color:#94a3b8}
ul{list-style:none;padding:0;margin:0}
.i{background:#0b1526;border-left:3px solid #334155;border-radius:8px;padding:9px 12px;margin-bottom:7px;font-size:.9rem}
.i.bad{border-left-color:#f87171}.i.good{border-left-color:#4ade80}
.i.q{border-left-color:#fbbf24}.i.act{border-left-color:#22d3ee}
.from{display:block;font-size:.75rem;color:#64748b;margin-top:3px}
table{width:100%;border-collapse:collapse;margin-top:10px;font-size:.86rem}
th,td{padding:7px 8px;text-align:right;border-bottom:1px solid #1e293b}
th:first-child,td:first-child{text-align:left}
th{color:#94a3b8;font-weight:400;font-size:.8rem}
.cta{display:block;text-align:center;margin-top:22px;padding:15px;background:#f59e0b;color:#04121a;
font-weight:700;border-radius:11px;text-decoration:none}
.more{display:block;text-align:center;margin-top:14px;color:#22d3ee;font-size:.88rem}
footer{margin-top:32px;padding-top:18px;border-top:1px solid #1e293b;color:#64748b;font-size:.8rem;text-align:center}
`;

/** สร้างหน้าเครื่องคำนวณ — ถ้ายังไม่กรอกก็โชว์ฟอร์มเปล่า (ยังใช้ได้ทันที) */
export function calcPageHtml(origin: string, search: string): string {
  const p = parseCalcParams(search);
  const title = 'คิดให้ดูเลย — ขายราคานี้ กำไรหรือขาดทุน';
  const desc = 'ใส่ราคาขายกับต้นทุน แล้วเห็นกำไรต่อชิ้น จุดคุ้มทุน และกำไรทั้งเดือนทันที ไม่ต้องสมัคร ไม่เก็บข้อมูล';

  let result = '';
  if (p.filled) {
    const input: ProductInput = {
      biz: 'other' as SkillBiz,
      price: p.price,
      cost: p.cost,
      unitsPerMonth: p.units > 0 ? p.units : undefined,
      fixedCostPerMonth: p.fixed > 0 ? p.fixed : undefined,
    };
    const r = quickCheck(input);
    const v = verdictOf(r);
    const good = verdictIsPositive(v);

    const cells: string[] = [
      `<div class="n"><b>${baht(r.marginPerUnit)} ฿</b><span>กำไรต่อชิ้น${r.marginPct != null ? ` (${r.marginPct}%)` : ''}</span></div>`,
    ];
    if (r.breakEvenUnits != null) {
      cells.push(`<div class="n"><b>${baht(r.breakEvenUnits)}</b><span>ต้องขายกี่ชิ้น/เดือน ถึงเท่าทุน</span></div>`);
    }
    if (r.grossPerMonth != null) {
      cells.push(`<div class="n"><b>${baht(r.grossPerMonth)} ฿</b><span>กำไรขั้นต้น/เดือน</span></div>`);
    }
    if (r.netPerMonth != null) {
      cells.push(`<div class="n"><b>${baht(r.netPerMonth)} ฿</b><span>เหลือจริงหลังหักค่าใช้จ่ายคงที่</span></div>`);
    }

    const insights = headlineInsights(input, r).map(insightHtml).join('');

    // ตารางขึ้น/ลดราคา — เลขคณิตแน่นอน ไม่ต้องมีข้อมูลตลาด
    let ladder = '';
    if (r.marginPerUnit > 0) {
      const rows = priceLadder({ ...input }).map((s) => {
        // null = กำไรต่อหน่วยใหม่ ≤ 0 → คำนวณจุดคุ้มไม่ได้ · ต้องบอกตรง ๆ ห้ามเดาเป็นตัวเลข
        const cell = s.breakEvenVolumePct == null
          ? (s.belowCost ? 'ราคานี้ต่ำกว่าทุน — ขายเท่าไหร่ก็ขาดทุน' : 'คำนวณไม่ได้')
          : s.changePct > 0
            ? `เสียลูกค้าได้ถึง ${Math.abs(Math.round(s.breakEvenVolumePct))}%`
            : `ต้องขายเพิ่ม ${Math.abs(Math.round(s.breakEvenVolumePct))}%`;
        return `<tr><td>${s.changePct > 0 ? '+' : ''}${s.changePct}%</td><td>${baht(s.newPrice)} ฿</td><td>${esc(cell)}</td></tr>`;
      }).join('');
      ladder = `<h2>${esc(CALC_ANCHORS[2])}</h2>
<table>
<thead><tr><th>ถ้าเปลี่ยนราคา</th><th>ราคาใหม่</th><th>ถึงจะได้กำไรเท่าเดิม</th></tr></thead>
<tbody>${rows}</tbody></table>
<span class="from">คำนวณจากกำไรต่อชิ้นที่คุณกรอก — ไม่ได้ใช้ข้อมูลตลาดใด ๆ</span>`;
    }

    result = `<div class="res">
<p class="verdict ${good ? 'good' : 'bad'}">${esc(verdictText(v))}</p>
<h2>${esc(CALC_ANCHORS[1])}</h2>
<div class="nums">${cells.join('')}</div>
<ul>${insights}</ul>
${ladder}
</div>`;
  }

  const val = (n: number) => (n > 0 ? String(n) : '');

  const body = `<div class="wrap">
<h1>${esc(CALC_ANCHORS[0])}</h1>
<p class="sub">ใส่ 2 ช่องก็เห็นคำตอบ · ไม่ต้องสมัคร · เราไม่เก็บชื่อสินค้าของคุณ</p>
<form method="get" action="${esc(origin)}/calc">
  <label>ขายชิ้นละกี่บาท <span class="hint">(จำเป็น)</span>
    <input name="price" type="text" inputmode="decimal" value="${esc(val(p.price))}" placeholder="เช่น 50" autofocus></label>
  <label>ต้นทุนชิ้นละกี่บาท <span class="hint">(ค่าของ/วัตถุดิบ)</span>
    <input name="cost" type="text" inputmode="decimal" value="${esc(val(p.cost))}" placeholder="เช่น 30"></label>
  <label>ขายได้กี่ชิ้นต่อเดือน <span class="hint">(ไม่รู้ก็เว้นไว้ได้)</span>
    <input name="units" type="text" inputmode="decimal" value="${esc(val(p.units))}" placeholder="เช่น 1000"></label>
  <label>ค่าใช้จ่ายคงที่ต่อเดือน <span class="hint">(ค่าเช่า เงินเดือน ไฟ)</span>
    <input name="fixed" type="text" inputmode="decimal" value="${esc(val(p.fixed))}" placeholder="เช่น 30000"></label>
  <button type="submit">${p.filled ? 'คิดใหม่' : 'คิดให้ดูเลย'}</button>
</form>
${result}
<a class="cta" href="${esc(origin)}/start?utm_source=calc&utm_medium=page&utm_campaign=pricing">ให้ระบบช่วยวางราคาทั้งร้าน →</a>
<a class="more" href="${esc(origin)}/blog/pricing-no-loss">อ่านเต็ม ๆ ว่าทำไมยิ่งขายยิ่งขาดทุน →</a>
<footer>CEO AI Thailand · หนึ่งในผลิตภัณฑ์ของ B. Training Consultant</footer>
</div>`;

  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(origin)}/calc">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(origin)}/calc">
<meta name="robots" content="index,follow">
<style>${CSS}</style>
<script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config','G-CHJ99RY1Q1',{linker:{domains:['b-tctraining.com','ceoaithailand.org']}});
(function(){function l(){var s=document.createElement('script');s.async=1;s.src='https://www.googletagmanager.com/gtag/js?id=G-CHJ99RY1Q1';document.head.appendChild(s);}
if('requestIdleCallback' in window)requestIdleCallback(l,{timeout:4000});else setTimeout(l,3000);})();
</script>
</head>
<body>${body}</body>
</html>`;
}
