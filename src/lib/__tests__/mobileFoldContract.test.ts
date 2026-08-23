import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/* ===== สัญญา "จอแรกบนมือถือ" =====
 * ทำไมต้องมีเทสต์นี้ (ความผิดพลาดจริง 20 ส.ค. 2569 — LESSONS-LEDGER #23):
 *   เราเคยเว้น padding-bottom 200px แล้ว 104px ไว้ใน .lp-hero เพื่อ "กันแถบคุกกี้บังปุ่ม"
 *   ซึ่งผิดโดยโครงสร้าง — แถบคุกกี้ position:fixed มันบัง "ก้นจอ" ไม่ใช่ "ก้นของ section ใดๆ"
 *   ⇒ วัดจริงบน iPhone 390x664: เว้น 104px แล้วปุ่มยัง "ถูกบัง 34px" อยู่ดี
 *     แถมกินพื้นที่จอแรกไป 104px ทั้งที่ผู้เข้าชม 85% ไม่เลื่อนหน้าเลย
 * กติกา: ที่กันให้ของที่ fixed ต้องกันที่ท้าย <body> เท่านั้น (CookieConsent.tsx ทำแล้ว)
 */

const root = resolve(__dirname, '../../..');
const landing = readFileSync(resolve(root, 'src/pages/LandingPage.tsx'), 'utf8');
const cookie = readFileSync(resolve(root, 'src/components/CookieConsent.tsx'), 'utf8');

/** ดึงบล็อก @media (max-width: Npx) ของ <style> ใน LandingPage */
function mobileBlock(width = 768): string {
  const i = landing.indexOf(`@media (max-width: ${width}px)`);
  expect(i, `LandingPage ต้องมีบล็อก @media (max-width: ${width}px) สำหรับจอแรกมือถือ`).toBeGreaterThan(-1);
  const open = landing.indexOf('{', i);
  let depth = 0;
  for (let j = open; j < landing.length; j++) {
    if (landing[j] === '{') depth++;
    else if (landing[j] === '}') { depth--; if (depth === 0) return landing.slice(open, j + 1); }
  }
  throw new Error('ปิดวงเล็บ @media ไม่ครบ');
}

/** ค่า padding-bottom (px) ของ selector ที่ระบุ ในบล็อกมือถือ */
function paddingBottomOf(selector: string): number | null {
  const block = mobileBlock();
  const re = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`);
  const m = block.match(re);
  if (!m) return null;
  const pb = m[1].match(/padding-bottom:\s*(-?[\d.]+)px/);
  if (pb) return Number(pb[1]);
  const p = m[1].match(/padding:\s*([^;!]+)/);
  if (p) {
    const parts = p[1].trim().split(/\s+/).map(v => Number(String(v).replace('px', '')));
    if (parts.length === 2 || parts.length === 1) return parts[0];
    if (parts.length >= 3) return parts[2];
  }
  return null;
}

/** เพดานที่ยอมได้: เกินนี้แปลว่ามีคนเอา section ไป "กันที่ให้ของ fixed" อีกแล้ว */
const MAX_HERO_PADDING_BOTTOM_MOBILE = 24;

describe('สัญญาจอแรกบนมือถือ — ห้ามเอา section ไปกันที่ให้ของที่ position:fixed', () => {
  it('.lp-hero บนมือถือต้องไม่เว้น padding-bottom เกินเพดาน', () => {
    const pb = paddingBottomOf('.lp-hero');
    expect(pb, '.lp-hero ต้องกำหนด padding-bottom ในบล็อกมือถืออย่างชัดเจน').not.toBeNull();
    expect(
      pb!,
      `padding-bottom ของ .lp-hero บนมือถือ = ${pb}px เกินเพดาน ${MAX_HERO_PADDING_BOTTOM_MOBILE}px\n` +
      'ถ้ากำลังจะกันที่ให้แถบคุกกี้/แถบล่างที่ position:fixed — หยุดก่อน มันไม่ได้ผล\n' +
      'ของที่ fixed บัง "ก้นจอ" ไม่ใช่ "ก้น hero" ⇒ กันเท่าไรก็ยังโดนบัง (พิสูจน์แล้ว 20 ส.ค. 2569)\n' +
      'ที่ถูกคือกันที่ท้าย <body> — ดู CookieConsent.tsx',
    ).toBeLessThanOrEqual(MAX_HERO_PADDING_BOTTOM_MOBILE);
  });

  it('เครื่องคำนวณต้องเป็นส่วนถัดจาก hero ทันที (data-sec="quickcheck")', () => {
    const secs = [...landing.matchAll(/data-sec="([a-z_]+)"/g)].map(m => m[1]);
    expect(secs[0]).toBe('hero');
    expect(secs[1], 'เครื่องคำนวณต้องอยู่ติดใต้ hero — 85% ของผู้เข้าชมไม่เลื่อนหน้าเลย').toBe('quickcheck');
  });

  it('แถบโปรโมทต้องถูกซ่อนบนมือถือ (พื้นที่จอแรกแพงเกินกว่าจะใช้กับแบนเนอร์)', () => {
    expect(mobileBlock()).toMatch(/\.lp-promo-strip\s*\{[^}]*display:\s*none/);
  });

  /* งบของ hero: ทุกชิ้นที่เพิ่มเข้า hero = ดันเครื่องคำนวณลงไปใต้แถบคุกกี้
   * วัดจริง iPhone 13 (จอ 664 · แถบคุกกี้บังก้นจอ 86px ⇒ ที่ใช้ได้ 578px):
   *   hero 393px → พาดหัวเครื่องคำนวณอยู่ที่ 537–572 = เห็นเต็มบรรทัด เหลือระยะแค่ 6px
   * ⇒ เพิ่มอะไรใน hero อีกแม้แต่บรรทัดเดียว = พาดหัวจมทันที */
  it('hero ต้องมีลูกที่กินความสูงไม่เกินงบ (ตอนนี้ 4 ชิ้น: ป้าย · พาดหัว · ย่อหน้ารอง · CTA)', () => {
    const i = landing.indexOf('data-sec="hero"');
    const j = landing.indexOf('data-sec="quickcheck"');
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(i);
    const hero = landing.slice(i, j);
    const paras = (hero.match(/^\s{8}<p[\s>]/gm) || []).length;
    expect(
      paras,
      `hero มี <p> ${paras} ก้อน — งบคือ 1 ก้อน\n` +
      'จอแรกบนมือถือเหลือระยะแค่ 6px · เพิ่มย่อหน้าอีกก้อน = พาดหัวเครื่องคำนวณจมใต้แถบคุกกี้ทันที\n' +
      'ถ้าต้องเพิ่มข้อความจริง ๆ ให้วางไว้ "ใต้เครื่องคำนวณ" แทน (ให้ก่อน ขอทีหลัง)',
    ).toBeLessThanOrEqual(1);
  });

  it('บรรทัด loss-aversion (⏳) ต้องอยู่ใต้เครื่องคำนวณ ไม่ใช่ใน hero', () => {
    const line = landing.indexOf('⏳ ทุกวันที่ยังทำเองทุกอย่าง');
    const qc = landing.indexOf('data-sec="quickcheck"');
    expect(line, 'ยังต้องมีบรรทัดนี้อยู่ — ย้ายที่ ไม่ใช่ตัดทิ้ง').toBeGreaterThan(-1);
    expect(
      line,
      'คำเตือนเรื่อง "เวลาที่หายไป" ต้องมาหลังคนเห็นตัวเลขกำไรของตัวเอง ไม่ใช่ก่อนเห็นอะไรเลย',
    ).toBeGreaterThan(qc);
  });
});

describe('ที่กันให้ของที่ position:fixed ต้องอยู่ที่ท้าย <body>', () => {
  it('CookieConsent ตั้ง padding-bottom ของ body ตามความสูงจริงของแถบ', () => {
    expect(cookie).toMatch(/document\.body\.style\.paddingBottom/);
    expect(cookie, 'ต้องวัดความสูงจริง ไม่ใช่ hardcode ตัวเลข — แถบสูงไม่เท่ากันในแต่ละจอ')
      .toMatch(/getBoundingClientRect\(\)\.height/);
  });

  it('ต้องคืนค่า padding เดิมเมื่อแถบหายไป (ไม่ทิ้งช่องว่างค้างไว้)', () => {
    expect(cookie).toMatch(/document\.body\.style\.paddingBottom\s*=\s*''/);
  });
});


/* ══════════════════════════════════════════════════════════════════════
 * จอที่แคบกว่า 390px — วัดจริง 20 ส.ค. 2569 (worst case seg=food)
 *   iPhone SE 320x568 พาดหัวเครื่องคำนวณเกินขอบที่มองเห็นไป 263px
 *   Android 360x640 เกิน 111px · iPhone 8 375x667 เกิน 26px · 390px ขึ้นไปผ่าน
 * สาเหตุ: ตัวอักษรขนาดเดิมตกบรรทัดมากขึ้นเมื่อจอแคบลง — hero สูงขึ้นทั้งที่จอเตี้ยลง
 * ══════════════════════════════════════════════════════════════════════ */

/** ขนาดตัวอักษร (px) ของ selector ในบล็อกความกว้างที่ระบุ */
function fontSizeOf(selector: string, width: number): number | null {
  const block = mobileBlock(width);
  const re = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`);
  const m = block.match(re);
  if (!m) return null;
  const f = m[1].match(/font-size:\s*([\d.]+)px/);
  return f ? Number(f[1]) : null;
}

describe('จอแคบกว่า 390px ต้องมีชั้นบีบของตัวเอง', () => {
  it('มีทั้งสองชั้น — 389px (360/375) และ 340px (320)', () => {
    expect(landing).toContain('@media (max-width: 389px)');
    expect(landing).toContain('@media (max-width: 340px)');
  });

  it('ยิ่งจอแคบ ตัวอักษรพาดหัวยิ่งเล็กลง (ไม่ใช่บีบเท่ากันหมด)', () => {
    const wide = fontSizeOf('.lp-hero-h1', 768) ?? fontSizeOf('.lp-hero .lp-hero-h1', 768);
    const mid = fontSizeOf('.lp-hero .lp-hero-h1', 389);
    const narrow = fontSizeOf('.lp-hero .lp-hero-h1', 340);
    expect(wide, 'บล็อก 768px ต้องกำหนดขนาดพาดหัว').toBeGreaterThan(0);
    expect(mid, 'บล็อก 389px ต้องกำหนดขนาดพาดหัว').toBeGreaterThan(0);
    expect(narrow, 'บล็อก 340px ต้องกำหนดขนาดพาดหัว').toBeGreaterThan(0);
    expect(mid!).toBeLessThan(wide!);
    expect(narrow!).toBeLessThan(mid!);
    // แต่ต้องยังใหญ่กว่าตัวหนังสือเนื้อหา ไม่งั้นอ่านจากระยะแขนไม่ออก
    expect(narrow!).toBeGreaterThanOrEqual(20);
  });

  it('🔴 ห้ามแก้ nav ด้วยการบังคับความสูง — ต้องแก้ที่เนื้อหาในแถบ', () => {
    // บทเรียนเดียวกับ padding-bottom ของแถบคุกกี้: บังคับขนาดกล่อง = ซ่อนอาการ ไม่ใช่แก้เหตุ
    // ของจริงที่เจอ: ปุ่มใน nav สูง 62px อยู่ในแถบสูง 60px และแบรนด์ตกสองบรรทัดตั้งแต่ก่อนแก้
    for (const w of [389, 340]) {
      expect(mobileBlock(w), `บล็อก ${w}px`).not.toMatch(/(^|[\s{;])nav\s*\{[^}]*height:/);
    }
  });

  it('คลาสที่ CSS อ้างถึง ต้องมีอยู่จริงใน JSX (กัน selector ที่ไม่ตรงอะไรเลย)', () => {
    for (const cls of ['lp-nav', 'lp-nav-brand', 'lp-nav-theme-label']) {
      expect(landing, `${cls} ถูกใช้ใน CSS แต่ไม่มีใน JSX = กฎนั้นไม่ทำงานเลย`)
        .toContain(`className="${cls}"`);
    }
  });

  it('ปุ่มสลับธีมที่ซ่อนป้ายชื่อบนจอ 320px ต้องยังบอกได้ว่ามันคืออะไร', () => {
    // ซ่อน "ตัวหนังสือ" ได้ แต่ห้ามซ่อน "ความหมาย" — ไม่งั้นคนใช้ screen reader เจอปุ่มเปล่า
    expect(mobileBlock(340)).toContain('.lp-nav-theme-label { display: none');
    expect(landing).toMatch(/aria-label=\{`สลับธีม/);
  });
});

/* ===== /start และเครื่องคำนวณ — จอแรกบนมือถือ (เพิ่ม 23 ส.ค. 2569) =====
 *
 * 🔴 วัดจริงด้วย Playwright ก่อนแก้ (ab-B · worst-case seg):
 *     /start ปุ่มหลัก      SE 320 เกิน 371px · 360 เกิน 247 · 375 เกิน 220 · 390 เกิน 193
 *     เครื่องคำนวณ ช่องแรก SE 320 เกิน  44px · 390 เกิน 16px
 *   หลังแก้: อยู่เหนือขอบจอครบทั้ง 4 ความกว้าง (เหลือน้อยสุด 11px ที่ SE)
 *
 * ⚠️ เทสต์นี้ตรวจ "ค่าที่ทำให้มันพอดี" ไม่ได้ตรวจพิกเซลจริง (ต้องใช้เบราว์เซอร์)
 *    ⇒ หน้าที่ของมันคือ **กันไม่ให้ค่าถูกถอยกลับโดยไม่มีใครวัดซ้ำ**
 *    แก้ค่าเมื่อไร ต้องรันสคริปต์วัดจริงใหม่ทุกครั้ง (scratchpad/fold.mjs)
 */
describe('/start — ปุ่มหลักต้องอยู่เหนือขอบจอบนมือถือ', () => {
  const css = readFileSync(resolve(root, 'src/index.css'), 'utf8');
  const startLanding = readFileSync(resolve(root, 'src/pages/StartLanding.tsx'), 'utf8');

  /** ดึงเนื้อในบล็อก @media ที่มี selector ตัวหนึ่งอยู่ */
  const blockWith = (width: number, needle: string): string => {
    let from = 0;
    for (;;) {
      const i = css.indexOf(`@media (max-width: ${width}px)`, from);
      if (i < 0) return '';
      const open = css.indexOf('{', i);
      let depth = 0;
      for (let j = open; j < css.length; j++) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') {
          depth--;
          if (depth === 0) {
            const body = css.slice(open, j + 1);
            if (body.includes(needle)) return body;
            from = j;
            break;
          }
        }
      }
    }
  };

  it('ต้องมีบล็อกมือถือของ /start จริง — เดิมไม่มี @media สักอันเลย', () => {
    expect(blockWith(480, '.start-hero'), 'ไม่มี @media 480 ที่บีบ .start-hero').not.toBe('');
    expect(blockWith(340, '.start-h1'), 'ไม่มีชั้นที่สองสำหรับจอ 320px').not.toBe('');
  });

  it('padding-top ของ hero ต้องไม่กินจอแรกเกินเพดาน (เดิม 80px)', () => {
    const m = blockWith(480, '.start-hero').match(/\.start-hero\s*\{[^}]*padding:\s*(\d+)px/);
    expect(m, '.start-hero ในบล็อกมือถือต้องกำหนด padding').toBeTruthy();
    expect(Number(m![1]), 'padding-top บนมือถือเกินเพดาน 24px').toBeLessThanOrEqual(24);
  });

  it('พาดหัวต้องเล็กลงจริงบนจอแคบ — clamp ตัวล่างต้องต่ำกว่าค่าเดสก์ท็อป (30px)', () => {
    const min = (body: string) => Number(body.match(/\.start-h1\s*\{[^}]*clamp\((\d+)px/)![1]);
    const at480 = min(blockWith(480, '.start-h1'));
    const at340 = min(blockWith(340, '.start-h1'));
    expect(at480).toBeLessThanOrEqual(24);
    expect(at340, 'จอ 320px ต้องเล็กกว่าจอ 480px (ยิ่งแคบ ยิ่งตกบรรทัด)').toBeLessThan(at480);
  });

  it('ห้ามใส่ inline <style> ใน StartLanding — จะทับ index.css แล้วแก้ไม่ขึ้น (GOTCHA #3)', () => {
    expect(startLanding.includes('<style')).toBe(false);
  });

  it('🔴 ความยาวคำโฆษณามีเพดาน — พาดหัวยาวขึ้น = ปุ่มหลุดขอบจอ', () => {
    const hero = readFileSync(resolve(root, 'src/lib/startHero.ts'), 'utf8');
    const blocks = [...hero.matchAll(/^ {2}(\w+): \{([\s\S]*?)\n {2}\},/gm)];
    expect(blocks.length, 'อ่าน START_HEROES ไม่ออก').toBeGreaterThan(3);
    for (const b of blocks) {
      const seg = b[1];
      const body = b[2];
      const one = (k: string) => (body.match(new RegExp(`${k}: '([^']*)'`)) ?? ['', ''])[1];
      const headline = one('h1') + one('h1hl');
      const chips = (body.match(/chips: \[([^\]]*)\]/)?.[1].match(/'/g)?.length ?? 0) / 2;
      // เพดานมาจากของจริง: default = 90 ตัวอักษร + 4 ชิป → เหลือ 11px บน SE 320
      expect(headline.length, `${seg}: พาดหัวยาว ${headline.length} ตัว — เกินเพดานที่วัดมาว่าพอดีจอ`).toBeLessThanOrEqual(96);
      expect(chips, `${seg}: ชิปเยอะเกินไป (${chips}) — ชิปกินความสูงมากที่สุดบนจอแคบ`).toBeLessThanOrEqual(4);
    }
  });
});

describe('เครื่องคำนวณ — ช่องกรอกแรกต้องอยู่เหนือขอบจอ', () => {
  const css = readFileSync(resolve(root, 'src/index.css'), 'utf8');
  const qc = readFileSync(resolve(root, 'src/components/ProductQuickCheck.tsx'), 'utf8');

  it('ขนาด/ระยะห่างของหัวเครื่องคำนวณต้องอยู่ใน CSS ไม่ใช่ inline (ไม่งั้น @media ไม่มีผล)', () => {
    for (const cls of ['pqc-card', 'pqc-intro', 'pqc-badge', 'pqc-h2', 'pqc-lead']) {
      expect(qc.includes(`className="${cls}"`), `JSX ไม่มี .${cls}`).toBe(true);
      expect(css.includes(`.${cls}`), `CSS ไม่มี .${cls}`).toBe(true);
    }
    // ค่าที่ย้ายออกไปแล้ว ห้ามกลับมาอยู่ inline อีก
    expect(qc, 'padding ของการ์ดกลับไปอยู่ inline').not.toMatch(/padding: '28px 24px'/);
    expect(qc, 'ขนาดพาดหัวกลับไปอยู่ inline').not.toMatch(/fontSize: 'clamp\(21px/);
  });

  it('ต้องมี @media ที่บีบหัวเครื่องคำนวณบนมือถือจริง', () => {
    const i = css.indexOf('.pqc-card { padding: 16px');
    expect(i, 'ไม่มีค่าบีบของ .pqc-card บนมือถือ').toBeGreaterThan(-1);
    expect(css.slice(0, i).lastIndexOf('@media (max-width: 480px)'), 'ค่าบีบต้องอยู่ในบล็อกมือถือ').toBeGreaterThan(-1);
  });
});
