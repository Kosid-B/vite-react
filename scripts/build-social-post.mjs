/* build-social-post — สร้างภาพโพสต์โซเชียลจาก HTML ด้วย Chromium
 *
 * 🔴 ทำไมประกอบจากโค้ด ไม่ใช่แต่งภาพเอง:
 *   ตัวเลขในภาพมาจาก `priceScenario()` ตัวจริง — ถ้าวาดด้วยมือ วันที่สูตรเปลี่ยน
 *   ภาพจะโกหกโดยไม่มีใครรู้ · `socialPostContract.test.ts` ผูกตัวเลขในไฟล์นี้
 *   เข้ากับผลลัพธ์ของฟังก์ชันจริง ⇒ แก้สูตรแล้วไม่แก้ภาพ = แดงทันที
 *
 * 🔴 กติกาที่ภาพนี้ต้องผ่าน:
 *   · พาดหัวเป็น "คำถาม/ปัญหา" ห้ามเป็นชื่อหมวดหมู่
 *   · ห้ามอ้างผลลัพธ์/รีวิว/จำนวนลูกค้า — ลูกค้าจ่ายจริงยัง 0 ราย (videoBrief.PROOF.banned)
 *   · ต้องมีลิงก์ปลายทางที่มีจริงใน SHORT_LINKS (content-link-contract)
 *
 * รัน: node scripts/build-social-post.mjs  →  docs/marketing/social/assets/post-5-numbers.png
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import { readFileSync, writeFileSync } from 'node:fs';
const { chromium } = pw;

const f = (n) => readFileSync(`public/fonts/${n}`).toString('base64');
const FONTS = `
@font-face{font-family:Kanit;font-weight:400;src:url(data:font/woff2;base64,${f('kanit-thai-400.woff2')}) format('woff2');}
@font-face{font-family:Kanit;font-weight:600;src:url(data:font/woff2;base64,${f('kanit-thai-600.woff2')}) format('woff2');}
@font-face{font-family:Kanit;font-weight:700;src:url(data:font/woff2;base64,${f('kanit-thai-700.woff2')}) format('woff2');}
@font-face{font-family:Kanit;font-weight:700;src:url(data:font/woff2;base64,${f('kanit-latin-700.woff2')}) format('woff2');unicode-range:U+0000-00FF;}
`;
const LOGO = readFileSync('public/icon-512.png').toString('base64');

// 🔴 ตัวเลขทุกตัวมาจาก priceScenario() ของจริง (ราคา 150 · ทุน 90 · 300 ชิ้น/เดือน)
const STEPS = [
  { n: '1', t: 'กำไรต่อหน่วย',      v: '150 − 90 = 60 บาท' },
  { n: '2', t: 'จุดคุ้มทุน',         v: 'ขายกี่ชิ้นถึงเท่าทุน' },
  { n: '3', t: 'ขึ้นราคา 10%',      v: 'เสียลูกค้าได้ 20%' },
  { n: '4', t: 'ลดราคา 10%',        v: 'ต้องขายเพิ่ม 33%' },
  { n: '5', t: 'กำไรรวมต่อเดือน',   v: 'เหลือจริงเท่าไหร่' },
];

const html = `<html><head><meta charset="utf-8"><style>
${FONTS}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1350px;font-family:Kanit,sans-serif;background:#fff;position:relative;overflow:hidden}
.top{height:862px;padding:52px 60px 0;background:linear-gradient(180deg,#f8fafc 0%,#eef2f7 100%)}
.brand{display:flex;align-items:center;gap:14px;margin-bottom:38px}
.brand img{width:56px;height:56px;border-radius:12px}
.brand b{font-size:26px;color:#0f172a;font-weight:700;letter-spacing:.2px}
.kicker{font-size:21px;color:#475569;font-weight:400;margin-top:2px}
.flow{display:flex;flex-direction:column;gap:15px}
.row{display:flex;align-items:center;gap:20px;background:#fff;border:2px solid #dbe3ec;
     border-radius:16px;padding:17px 24px;box-shadow:0 2px 10px rgba(15,23,42,.05)}
.num{width:50px;height:50px;flex:none;border-radius:12px;background:#0f172a;color:#fff;
     font-weight:700;font-size:25px;display:flex;align-items:center;justify-content:center}
.txt b{display:block;font-size:27px;color:#0f172a;font-weight:600;line-height:1.35}
.txt span{display:block;font-size:21px;color:#64748b;font-weight:400;margin-top:1px}
.bot{position:absolute;left:0;right:0;bottom:0;height:488px;
     background:linear-gradient(180deg,#0f172a 0%,#111c33 100%);padding:46px 60px 40px}
.h1{font-size:70px;font-weight:700;color:#fff;line-height:1.24;letter-spacing:-.5px}
.h1 em{font-style:normal;background:#d4a129;color:#0f172a;padding:0 14px;border-radius:6px}
.q{font-size:46px;font-weight:600;color:#facc15;margin-top:18px;line-height:1.3}
.cta{position:absolute;left:60px;right:60px;bottom:40px;display:flex;align-items:center;
     justify-content:space-between;border-top:1px solid #24354f;padding-top:22px}
.cta .l{font-size:29px;color:#fff;font-weight:600}
.cta .r{font-size:22px;color:#94a3b8;font-weight:400;text-align:right;line-height:1.5}
</style></head><body>
<div class="top">
  <div class="brand">
    <img src="data:image/png;base64,${LOGO}">
    <div><b>CEO AI Thailand</b><div class="kicker">ตัวเลขที่คำนวณได้ ไม่ใช่ความรู้สึก</div></div>
  </div>
  <div class="flow">
    ${STEPS.map(s => `<div class="row"><div class="num">${s.n}</div>
      <div class="txt"><b>${s.t}</b><span>${s.v}</span></div></div>`).join('')}
  </div>
</div>
<div class="bot">
  <div class="h1">5 ตัวเลขที่เจ้าของธุรกิจ<br><em>ต้องตอบได้</em></div>
  <div class="q">คุณตอบได้กี่ข้อ?</div>
  <div class="cta">
    <div class="l">คำนวณฟรี ไม่ต้องสมัคร</div>
    <div class="r">ceoaithailand.org<b style="color:#67e8f9">/ราคา</b><br>ใส่ราคากับทุน แล้วได้คำตอบทันที</div>
  </div>
</div>
</body></html>`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.waitForTimeout(400);
await page.screenshot({ path: 'docs/marketing/social/assets/post-5-numbers.png' });
await browser.close();
console.log('done');
