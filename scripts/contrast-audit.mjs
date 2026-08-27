/* contrast-audit — หา "ตัวหนังสือที่มองไม่เห็น" ทุกหน้า ทุกธีม โดยวัดจากเบราว์เซอร์จริง
 *
 * 🔴 ทำไมต้องมี (เจ้าของแจ้ง 21 ส.ค. + **แจ้งซ้ำ 22 ส.ค. 2569**)
 *    "ตัวอักษรสีกลืนไปกับพื้นหลัง" — รอบแรกแก้แล้ว แต่กลับมาอีกที่หน้าอื่น
 *    ต้นเหตุรอบสอง: **สคริปต์เดินไม่ครบทุกหน้า** — เดินแค่ปุ่มที่เห็นใน sidebar (13 หน้า)
 *    แต่เมนูอยู่ในกลุ่มที่ "ยุบอยู่" และโหมดโฟกัสซ่อนเมนูส่วนใหญ่ไว้
 *    ⇒ หน้า BMC / MIT24 ที่เจ้าของเจอปัญหา **ไม่เคยถูกสแกนเลยสักครั้ง**
 *
 * บทเรียน: เครื่องมือตรวจที่ "เดินไม่ครบ" อันตรายกว่าไม่มีเครื่องมือ
 *          เพราะมันรายงานเขียวแล้วเราหยุดหา (skill `tracking-contract` กับดัก ④)
 *
 * ⚠️ อ่านไฟล์ CSS ตรวจเรื่องนี้ไม่ได้ — พื้นหลังจริงมาจาก element แม่ที่อาจอยู่คนละไฟล์
 *
 * วิธีใช้:  npm run dev   แล้ว   node scripts/contrast-audit.mjs [threshold]
 *   4.5 = เกณฑ์ WCAG AA (ค่าเริ่มต้น) · 3.0 = ตัวหนังสือใหญ่ · 1.8 = "แทบมองไม่เห็น"
 */
const PW = '/opt/node22/lib/node_modules/playwright/index.js';
const BASE = process.env.AUDIT_URL || 'http://localhost:5173/';
const THRESHOLD = Number(process.argv[2] || 4.5);
const { chromium, devices } = (await import(PW)).default;

const SCAN = (threshold) => {
  const lum = (c) => {
    const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
  };
  /* พื้นหลัง "ที่ตาเห็นจริง" = **ผสมทุกชั้นโปร่งแสงลงบนชั้นทึบ** ตามลำดับที่เบราว์เซอร์วาดจริง
   *
   * 🔴 เคยพลาด 2 แบบ และทั้งคู่ทำให้ตัวตรวจรายงานผิด:
   *   ① อ่าน rgba(52,211,153,.08) เป็นเขียวทึบ ⇒ รายงาน "เขียวบนเขียว" ทั้งที่พื้นจริงเข้ม
   *   ② แก้ ① ด้วยการ **ข้ามชั้นโปร่งไปเลย** (รับเฉพาะ a > 0.5) ⇒ ชั้นที่ a = 0.5 ถูกนับเป็นทึบ
   *      และชั้นที่ a = 0.45 ถูกทิ้งทั้งที่เปลี่ยนสีพื้นไปมาก — ผิดคนละทางแต่ผิดเหมือนกัน
   *   ⇒ ทางที่ถูกคือทำสิ่งที่เบราว์เซอร์ทำ: ผสม ไม่ใช่เลือกข้าง
   *      (ยืนยันจริง 27 ส.ค. 2569: amber .08 บน #0f172a ⇒ rgb(33,34,40) ไม่ใช่ #0f172a) */
  const overlay = (fg, bg) => [0, 1, 2].map((i) => fg.rgb[i] * fg.a + bg[i] * (1 - fg.a));
  const bgOf = (el) => {
    const layers = [];
    let e = el;
    while (e) {
      const cs = getComputedStyle(e);
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
      // gradient: ประมาณด้วยสีแรกที่อ่านได้ — ใช้เฉพาะตอนที่ทึบพอจะเป็นชั้นล่างสุด
      const gi = cs.backgroundImage;
      if (gi && gi !== 'none') { const g = parse(gi); if (g && g.a >= 0.9) { layers.push({ rgb: g.rgb, a: 1 }); break; } }
      e = e.parentElement;
    }
    let bg = [255, 255, 255];
    for (let i = layers.length - 1; i >= 0; i--) bg = overlay(layers[i], bg);
    return bg;
  };
  const out = {};
  for (const el of document.querySelectorAll('body *')) {
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    if (txt.length < 2) continue;
    // 🔴 ข้ามข้อความที่เป็น "อีโมจิ/สัญลักษณ์ล้วน" — ฟอนต์อีโมจิระบายสีเอง
    //    CSS `color` ไม่มีผลกับมัน ⇒ รายงานไปก็แก้ไม่ได้ และกลบเคสจริงด้วยเสียงรบกวน
    //    (เคสจริง: <SPAN.city-card-ico>"🏛️" ถูกรายงานว่า contrast 1.04 ทั้งที่มองเห็นชัด)
    if (!/[\p{L}\p{N}]/u.test(txt)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0' || cs.display === 'none') continue;
    const fg = parse(cs.color);
    if (!fg) continue;
    const bg = bgOf(el);
    const L1 = lum(fg.rgb), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    if (ratio >= threshold) continue;
    const key = el.tagName + '.' + String(el.className).split(' ')[0];
    if (!out[key] || out[key].ratio > ratio) {
      out[key] = { key, ratio: Math.round(ratio * 100) / 100, color: cs.color, bg: `rgb(${bg.join(',')})`, txt: txt.slice(0, 40), size: cs.fontSize };
    }
  }
  return Object.values(out);
};

/** เปิดทุกอย่างที่ซ่อนเมนูไว้ แล้วคืนรายชื่อหน้าที่กดได้จริงทั้งหมด */
async function openAllNav(page) {
  await page.evaluate(() => { document.querySelector('.goal-skip')?.click(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { document.querySelector('.focus-unlock')?.click(); });   // เลิกโหมดโฟกัส
  await page.waitForTimeout(400);
  // 🔴 ปิดการรับคลิกของ overlay ที่บังอยู่ — CLAUDE.md GOTCHA #2 เขียนไว้แล้ว
  //    ⚠️ **ห้ามใช้ el.remove()** — element พวกนี้ React เป็นเจ้าของ
  //       ลบทิ้งแล้ว React เรนเดอร์ใหม่จนทั้ง sidebar หาย (วัดได้: หลังคลิกเหลือ 0 ปุ่มจาก 22)
  //       ⇒ ตัวตรวจเดินได้แค่หน้าเดียวต่อธีม แล้วข้ามที่เหลือเงียบ ๆ ด้วย `continue`
  //    ที่ถูกคือปิด pointer-events + ซ่อน — ไม่แตะโครงสร้าง DOM ของ React
  await page.addStyleTag({ content: `
    .onb-overlay, .goal-overlay, .modal-backdrop, .upgrade-wall, .aia-panel {
      pointer-events: none !important; visibility: hidden !important;
    }` });
  await page.waitForTimeout(200);
  // กางทุกกลุ่มที่ยุบอยู่ (วนหลายรอบ เพราะกางกลุ่มหนึ่งอาจเผยกลุ่มถัดไป)
  for (let i = 0; i < 4; i++) {
    const opened = await page.evaluate(() => {
      let n = 0;
      for (const b of document.querySelectorAll('button.nav-group-toggle:not(.open)')) { b.click(); n++; }
      return n;
    });
    await page.waitForTimeout(350);
    if (!opened) break;
  }
  // คืน "จำนวน" ไม่ใช่ชื่อ — คลิกด้วย index แล้ว query ใหม่ทุกครั้ง
  // (เดิมคลิกด้วย :has-text ซึ่งพังทั้งหมดเงียบ ๆ เพราะชื่อมีหลายบรรทัด/ซ้ำกัน
  //  ⇒ ตัวตรวจรายงาน "สแกน 6 หน้า" แต่ไม่มีใครอ่านบรรทัดนั้น — กับดักเดียวกับที่ skill เตือนไว้)
  return page.$$eval('button.nav-item', (els) => els.length);
}

const findings = [];
const skipped = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let pagesScanned = 0;

const initTheme = (t) => {
  try { localStorage.setItem('ceoai_theme', t); localStorage.setItem('ceo_ai_seen', '1'); localStorage.setItem('ceo_ai_beginner', '0'); } catch { /* noop */ }
};

for (const theme of ['minimal', 'dark']) {
  // จอมือถือ: หน้าสาธารณะ (คนส่วนใหญ่เข้ามาทางนี้)
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.addInitScript(initTheme, theme);
  const page = await ctx.newPage();

  // ── หน้าสาธารณะ (ไม่ต้องล็อกอิน) ──
  for (const path of ['/', '/start', '/calc']) {
    try {
      await page.goto(BASE.replace(/\/$/, '') + path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(600);
      for (const f of await page.evaluate(SCAN, THRESHOLD)) findings.push({ ...f, page: path, theme });
      pagesScanned++;
    } catch { /* หน้านั้นเปิดไม่ได้ */ }
  }

  await ctx.close();

  // ── หน้าในแอป: ต้องใช้ **จอเดสก์ท็อป** ──
  // 🔴 เคยพลาด: สแกนด้วยจอมือถือ ⇒ sidebar เป็นลิ้นชักที่ซ่อนอยู่
  //    ปุ่มเมนูมีอยู่ใน DOM (นับได้ 22 ปุ่ม) แต่กดไม่ได้เพราะมองไม่เห็น
  //    ⇒ ทุกการคลิก timeout เงียบ ๆ ในบล็อก catch ⇒ สแกนได้ 6 หน้าแล้วรายงานเขียว
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await dctx.addInitScript(initTheme, theme);
  const app = await dctx.newPage();
  await app.goto(BASE, { waitUntil: 'networkidle' });
  await app.waitForTimeout(1000);
  const navCount = await openAllNav(app);
  console.error(`  [${theme}] พบเมนูในแอป ${navCount} ปุ่ม`);
  for (let i = 0; i < navCount; i++) {
    let label = `เมนู#${i + 1}`;
    try {
      // 🔴 ล้าง overlay + กางกลุ่ม **ก่อนทุกการคลิก** ไม่ใช่แค่ครั้งแรก
      //    เพราะแต่ละหน้าเปิด overlay ของตัวเอง (ทัวร์/upgrade wall/แผง AI)
      //    ทำครั้งเดียวตอนต้น = คลิกได้แค่ปุ่มแรก แล้วที่เหลือ timeout เงียบ (เดินได้ 8 จาก 30)
      await app.evaluate(() => {
        for (const b of document.querySelectorAll('button.nav-group-toggle:not(.open)')) b.click();
        document.querySelector('.focus-unlock')?.click();   // โหมดโฟกัสอาจกลับมาหลังเปลี่ยนหน้า
      });
      await app.waitForTimeout(250);
      const btns = await app.$$('button.nav-item');
      if (!btns[i]) { skipped.push(`${theme}/${label}: ไม่พบปุ่มลำดับที่ ${i} (เหลือ ${btns.length} ปุ่ม)`); continue; }
      label = ((await btns[i].innerText()) || label).split('\n')[0].trim().slice(0, 28) || label;
      await btns[i].click({ timeout: 3000 });
      await app.waitForTimeout(650);
      await app.evaluate(() => window.scrollTo(0, document.body.scrollHeight));   // เนื้อหาใต้ขอบจอ
      await app.waitForTimeout(450);
      for (const f of await app.evaluate(SCAN, THRESHOLD)) findings.push({ ...f, page: label, theme });
      pagesScanned++;
    } catch (e) {
      // ห้ามเงียบ — ความเงียบตรงนี้คือเหตุผลที่บั๊กกลับมารอบ 2
      skipped.push(`${theme}/${label}: ${String(e).split('\n')[0].slice(0, 60)}`);
    }
  }
  await dctx.close();
}
await browser.close();

// รวมคลาสซ้ำ เก็บเคสที่แย่ที่สุดไว้
const worst = new Map();
for (const f of findings) {
  const k = f.theme + '|' + f.key;
  if (!worst.has(k) || worst.get(k).ratio > f.ratio) worst.set(k, f);
}
const list = [...worst.values()].sort((a, b) => a.ratio - b.ratio);

const MIN_PAGES = 30;   // 2 ธีม × (3 หน้าสาธารณะ + เมนูในแอปอย่างน้อย ~12)
console.log(`สแกน ${pagesScanned} หน้า (2 ธีม) · เกณฑ์ contrast < ${THRESHOLD}`);
if (skipped.length) {
  console.log(`\n⚠️ เดินไม่ถึง ${skipped.length} หน้า — จุดบอดที่ต้องประกาศ ห้ามกลบ:`);
  for (const s2 of skipped.slice(0, 12)) console.log('   · ' + s2);
}
if (pagesScanned < MIN_PAGES) {
  console.log(`\n🔴 ตัวตรวจเดินไม่ครบ (${pagesScanned} < ${MIN_PAGES}) — ผลลัพธ์อ่านไม่ได้ ไม่ว่าจะเขียวแค่ไหน`);
  console.log('   เครื่องมือที่เดินไม่ครบ อันตรายกว่าไม่มีเครื่องมือ (skill `theme-safe-color`)');
  process.exit(2);
}
if (!list.length) { console.log('✅ ไม่พบตัวหนังสือที่อ่านไม่ออก'); process.exit(0); }
const INVISIBLE = list.filter((f) => f.ratio < 2);
if (INVISIBLE.length) console.log(`\n🔴 มองไม่เห็นเลย (< 2.0) — ${INVISIBLE.length} คลาส`);
for (const f of list) {
  const tag = f.ratio < 2 ? '🔴' : f.ratio < 3 ? '🟠' : '🟡';
  console.log(`${tag} ${String(f.ratio).padStart(5)}  [${f.theme}] ${f.color} บน ${f.bg}  <${f.key}>  [${f.page}]  ${JSON.stringify(f.txt)}`);
}
console.log(`\nพบ ${list.length} คลาส — แก้โดยใช้โทเคนธีม (var(--ink)/--ink3/--accent-text) แทนสีตายตัว`);
process.exit(INVISIBLE.length ? 1 : 0);
