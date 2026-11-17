/* marketing-export.mjs — ส่งข้อมูลหลังบ้าน CEO AI Thailand ให้ Marketing OS ใช้ทำการตลาด
 *
 * ทิศทาง (เจ้าของยืนยัน 15 พ.ย. 2569):
 *   CEO AI Thailand (production) ──export──▶ ไฟล์ JSON ──import──▶ Marketing OS
 *
 * ทำไมเป็นไฟล์ ไม่ใช่ให้ Marketing OS ต่อฐานเราตรง ๆ:
 *   ① เพิ่ม RPC ให้เรียกข้ามระบบ = migration ⇒ ชนด่านปล่อยของ (Acceptance #2 ยัง open)
 *   ② ให้ระบบอื่นถือกุญแจ production = ช่องโหว่ที่ร้ายแรงที่สุดที่จะสร้างได้
 *   ⇒ ไฟล์เป็นท่าที่เล็กที่สุดที่ใช้งานได้จริงวันนี้ และย้อนกลับได้ทั้งหมด
 *
 * 🔴 กุญแจที่ใช้: SUPABASE_SERVICE_ROLE_KEY ของ **ฐานเราเอง**
 *    · รันบนเครื่องเจ้าของเท่านั้น · ห้าม commit · ห้ามส่งให้ Marketing OS
 *    · สคริปต์นี้ **อ่านอย่างเดียว** และอ่านแค่ 3 คอลัมน์ที่ไม่มี PII
 *
 * วิธีรัน:
 *   npm run export:marketing          (ต้องตั้ง SUPABASE_SERVICE_ROLE_KEY ไว้ใน env ก่อน)
 *   SUPABASE_SERVICE_ROLE_KEY=<key> npx vite-node scripts/marketing-export.mjs --out ./out.json
 *
 * ⚠️ ต้องรันด้วย `vite-node` ไม่ใช่ `node` เปล่า — สคริปต์นี้ import โมดูล .ts ที่ import ต่ออีกทอด
 *    `node` resolve extensionless import ใน .ts ไม่ได้ (พังจริงตอนทดสอบ 15 พ.ย. 69)
 *    รีโปนี้ใช้ท่าเดียวกันอยู่แล้วใน prerender-seo.mjs
 *
 * ออก 0 = สำเร็จ · 2 = ตรวจไม่ได้ (คนละเรื่องกับ "ไม่มีข้อมูล")
 */

import { writeFileSync } from 'node:fs';

const URL_ = (process.env.SUPABASE_URL || 'https://waigsnxhrlwtiotspaim.supabase.co').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const outArg = process.argv.indexOf('--out');
const OUT = outArg > -1 ? process.argv[outArg + 1] : `marketing-export-${new Date().toISOString().slice(0, 10)}.json`;

if (!KEY) {
  console.error('🔴 ตรวจไม่ได้ — ยังไม่มี SUPABASE_SERVICE_ROLE_KEY');
  console.error('   หาได้ที่ Supabase → project CEO AI Thailand → Settings → API → service_role');
  console.error('   ⚠️ กุญแจนี้เปิดได้ทุกอย่างในฐาน — รันบนเครื่องตัวเองเท่านั้น ห้าม commit ห้ามส่งต่อ');
  process.exit(2);   // 2 = ตรวจไม่ได้ ≠ ไม่มีข้อมูล
}

/** อ่านเฉพาะ 3 คอลัมน์ที่ต้องใช้ — ไม่มี PII (landing_funnel ออกแบบ PDPA-safe ตั้งแต่ต้น) */
async function readFunnel() {
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const r = await fetch(`${URL_}/rest/v1/landing_funnel?select=seg,reached_cta,reached_signup`, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        Range: `${from}-${from + PAGE - 1}`,
      },
    });
    if (!r.ok) throw new Error(`landing_funnel → HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
    const page = await r.json();
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

/** รวมเป็นราย seg — ฝั่ง JS เพราะ PostgREST ทำ GROUP BY ไม่ได้ */
function aggregate(rows) {
  const m = new Map();
  for (const r of rows) {
    const seg = r.seg || 'default';
    const cur = m.get(seg) || { seg, visitors: 0, cta: 0, signup: 0 };
    cur.visitors += 1;
    if (r.reached_cta) cur.cta += 1;
    if (r.reached_signup) cur.signup += 1;
    m.set(seg, cur);
  }
  return [...m.values()];
}

const main = async () => {
  console.log(`🔗 อ่านจาก ${URL_}  (landing_funnel · 3 คอลัมน์ · ไม่มี PII)\n`);

  let raw;
  try {
    raw = await readFunnel();
  } catch (e) {
    console.error(`🔴 ตรวจไม่ได้ — ${String(e).slice(0, 220)}`);
    process.exit(2);
  }

  const { buildExport } = await import('../src/lib/marketingExport.ts');
  const bundle = buildExport(aggregate(raw), new Date().toISOString());

  writeFileSync(OUT, JSON.stringify(bundle, null, 2), 'utf8');

  console.log(`ผู้เข้าชมทั้งหมด ${bundle.source.totalRows} คน · ${bundle.segments.length} กลุ่ม\n`);
  for (const s of bundle.segments) {
    const rate = s.signupRate === null ? 'สรุปไม่ได้' : `${(s.signupRate * 100).toFixed(1)}%`;
    /* 🔴 `default` ไม่ใช่กลุ่ม แต่คือ "ยังไม่ติดแท็ก" — ถ้าเตือนเหมือนกัน
     *    342 จาก 361 แถวจะขึ้น ⚠️ จนคำเตือนจริง (owner/food) ถูกกลบ */
    const mark = s.seg === 'default' ? '→ ยังไม่ติดแท็ก (ไม่ใช่กลุ่ม)'
      : s.marketingCode ? `→ ${s.marketingCode}`
      : '→ ⚠️ ทะเบียนเขายังไม่มีกลุ่มนี้';
    console.log(`  ${s.seg.padEnd(9)} ${String(s.visitors).padStart(4)} คน · สมัคร ${s.signup} · อัตรา ${rate.padEnd(11)} ${mark}`);
  }

  console.log('\n🔴 จุดบอดที่ส่งไปกับไฟล์ (อีกระบบต้องอ่านก่อนใช้ตัวเลข):');
  for (const b of bundle.blindSpots) console.log(`   · ${b}`);

  console.log(`\n✅ เขียนไฟล์แล้ว: ${OUT}`);
  console.log('   ส่งไฟล์นี้ให้ Marketing OS นำเข้า — กติกาและจุดบอดเดินทางไปกับข้อมูลด้วย');
  process.exit(0);
};

main().catch((e) => { console.error(`🔴 ตรวจไม่ได้ — ${e}`); process.exit(2); });
