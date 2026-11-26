import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { osEventFor } from '../eventFormat';

/**
 * 🔴 บั๊กที่ด่านนี้กัน (เจอจริง 26 พ.ย. 2569)
 *
 * `landing_funnel.reached_cta` = 11 (7 วันล่าสุด 2) แต่ `public.marketing_events`
 * ได้ `cta_click` = **0** ทั้งที่ท่อทำงานปกติ (`landing_view` เข้ามา 34 event / 21 session)
 *
 * ต้นเหตุ **ไม่ใช่ท่อพัง** — เป็น **`track()` ที่ขาดไป**:
 *   ① `LandingPage` ปุ่มสมัครบนแถบนำทาง → `markLandingSignup()` แล้วไปต่อเลย **ไม่มี `track()` เลย**
 *      ⇒ หายจาก **GA4 · Amplitude · Marketing OS ทั้งสามทาง** (เพราะ `track()` คือประตูเดียวของทุก sink)
 *   ② `ReturningGreeting` → `track('returning_draft_continue')` ซึ่งไม่ได้อยู่ใน `EVENT_MAP`
 *      ⇒ GA/Amplitude เห็น แต่ OS ไม่เห็น
 *
 * 🔴 ความผิดที่แพงกว่าตัวบั๊ก: **กรวยกับ event เป็นสองระบบที่ไม่มีใครบังคับให้ตรงกัน**
 *    ⇒ ตัวเลขสองฝั่งขัดกันเองได้ตลอดเวลา และไม่มีอะไรเตือน
 *
 * กฎที่ด่านนี้บังคับ: **ทุกจุดที่เซ็ตธงในกรวย (`markLandingCta`/`markLandingSignup`)
 * ต้องมี `track('<ชื่อ>')` อยู่ในระยะ ±3 บรรทัด และชื่อนั้นต้องแมปถึง Marketing OS ได้**
 */

const SRC = resolve(__dirname, '../..');
const MARKERS = ['markLandingCta(', 'markLandingSignup('];
const WINDOW = 3;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e !== '__tests__' && e !== 'node_modules') sourceFiles(p, out);
    } else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

interface Site {
  file: string;
  line: number;
  marker: string;
  trackedNames: string[];
}

function callSites(): Site[] {
  const sites: Site[] = [];
  for (const f of sourceFiles(SRC)) {
    const lines = readFileSync(f, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const marker = MARKERS.find((m) => lines[i].includes(m));
      // ข้ามไฟล์ที่ **นิยาม** ฟังก์ชันเอง (landingFunnel.ts) — ไม่ใช่จุดเรียกใช้
      if (!marker || /export\s+(function|const)/.test(lines[i])) continue;
      const near = lines.slice(Math.max(0, i - WINDOW), i + WINDOW + 1).join('\n');
      const trackedNames = [...near.matchAll(/track\(\s*'([a-z0-9_]+)'/g)].map((m) => m[1]);
      sites.push({ file: f.replace(SRC + '/', ''), line: i + 1, marker, trackedNames });
    }
  }
  return sites;
}

describe('กรวย ↔ event ต้องตรงกัน — ธงในกรวยที่ไม่มี event = ตัวเลขสองฝั่งขัดกันเงียบ ๆ', () => {
  const sites = callSites();

  it('ต้องเจอจุดเรียกใช้จริง — ไม่ใช่ผ่านเพราะหาไม่เจอ', () => {
    expect(sites.length).toBeGreaterThanOrEqual(4);
  });

  it('🔴 ทุกจุดที่เซ็ตธงในกรวย ต้องมี track() อยู่ใกล้ ๆ', () => {
    const naked = sites.filter((s) => s.trackedNames.length === 0);
    expect(
      naked.map((s) => `${s.file}:${s.line} (${s.marker})`),
      'เซ็ตธงแต่ไม่ยิง event ⇒ หายจาก GA4 + Amplitude + OS ทั้งสามทาง',
    ).toEqual([]);
  });

  it('🔴 และ event นั้นต้องแมปถึง Marketing OS ได้ ไม่ใช่แค่เข้า GA', () => {
    const unmapped = sites
      .filter((s) => s.trackedNames.length > 0 && !s.trackedNames.some((n) => osEventFor(n)))
      .map((s) => `${s.file}:${s.line} → ${s.trackedNames.join(',')}`);
    expect(unmapped, 'ยิง event ที่ไม่ได้อยู่ใน EVENT_MAP ⇒ OS มองไม่เห็นการกด CTA นั้น').toEqual([]);
  });

  it('สองจุดที่เคยพลาดต้องถูกแก้แล้วจริง (ไม่ใช่แค่ด่านผ่าน)', () => {
    const lp = readFileSync(resolve(SRC, 'pages/LandingPage.tsx'), 'utf8');
    expect(lp, 'ปุ่มสมัครบนแถบนำทางต้องยิง event').toContain("cta: 'nav_signup'");
    expect(osEventFor('returning_draft_continue'), 'ปุ่มของผู้ใช้ที่กลับมาต้องแมปถึง OS').toBe('cta_click');
  });
});
