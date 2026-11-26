/* brand-sync-check.mjs — เทียบ "ความจริงเรื่องแบรนด์" ของผลิตภัณฑ์ กับแหล่งจริงใน Marketing OS
 *
 * 🔁 ย้ายแหล่งแล้ว 26 พ.ย. 2569 (ข้อ ② ของลำดับรวมฐาน · เจ้าของเลือก "ทาง 2"):
 *    เดิมยิง REST ไป project แยก `bjozpwdtqbpwcxnqguka` ด้วย publishable key — project นั้นนิ่งตั้งแต่
 *    21 พ.ย. 09:34 และถูกเลิกใช้แล้ว ⇒ ตอนนี้อ่าน schema ของ OS ใน production เรา ผ่าน **rpc เท่านั้น**
 *    (ADR-0012 — ห้ามพึ่ง "Exposed schemas" ที่อยู่นอกรีโป)
 *
 * 🧱 เส้นแบ่งที่ยังอยู่ครบ:
 *    ✅ อ่านอย่างเดียว — GET ไป rpc `os_brand_sync_segments` (migration 0074 · stable · service_role เท่านั้น)
 *    ❌ ไม่มีคำสั่งเขียนข้อมูล · ❌ ไม่อ่านตารางตรง · ❌ ขอบเขตยังเป็น 3 ตารางเดิม (ALLOWED ด้านล่าง)
 *    ❌ ไม่ลบข้อมูลทดสอบของเขา (กรองออกฝั่งเรา แล้วประกาศว่ากรองอะไรไป)
 *
 * 🔑 ทำไมต้องใช้ service key (ทาง 2) ไม่ใช่ publishable key (ทาง 1):
 *    schema ของ OS revoke anon/authenticated ทั้งหมด (B1 · ADR-0013) ⇒ publishable key อ่านไม่ได้
 *    และการเปิด rpc ให้ anon = ข้อมูลกลยุทธ์หลุดเป็นสาธารณะ ⇒ เจ้าของเลือกทางนี้
 *    🔴 คีย์มาจาก env เท่านั้น · ห้ามฝังลงรีโป (ledger #96) · ห้ามใส่ใน VITE_* (จะหลุดไปเบราว์เซอร์)
 *    ⚠️ ชื่อตัวแปรตั้งใจไม่ใช้ชื่อมาตรฐานของ Supabase — เครื่องเจ้าของมีตัวแปรชื่อนั้นระดับระบบ
 *       ที่เป็นคีย์ของ project อื่น ⇒ ใช้ชื่อเฉพาะกันหยิบคีย์ผิดโดยไม่รู้ตัว
 *
 * ทำไมเป็นสคริปต์ ไม่ใช่โค้ดในแอป:
 *    ผลิตภัณฑ์ต้องทำงานได้แม้อีกระบบล่ม · `brandBrief.ts` ถูกบังคับให้ pure
 *    ⇒ เก็บสำเนาไว้ที่เราเหมือนเดิม แต่มีเครื่องมือจับได้เมื่อสำเนาเพี้ยนจากแหล่งจริง
 *
 * วิธีรัน:
 *    BRAND_SYNC_SERVICE_KEY=<secret key ของ production — ใส่ผ่าน env เท่านั้น> \
 *    npx vite-node scripts/brand-sync-check.mjs
 *
 * ⚠️ ต้อง `vite-node` ไม่ใช่ `node` เปล่า (เหตุผลเดียวกับ prerender-seo.mjs)
 *
 * ออก 0 = ตรงกัน · 1 = พบ drift (ใช้ใน CI ได้) · 2 = ตรวจไม่ได้ (คนละเรื่องกับ "ไม่ตรง")
 */

const URL_ = process.env.BRAND_SYNC_SUPABASE_URL || 'https://waigsnxhrlwtiotspaim.supabase.co';
const KEY = process.env.BRAND_SYNC_SERVICE_KEY || '';
const RPC = 'os_brand_sync_segments';
const RETIRED = 'bjozpwdtqbpwcxnqguka';

// 🔒 ขอบเขตที่เจ้าของอนุญาต (อ่านอย่างเดียว) — ต้องตรงกับ MARKETING_SOURCE.readOnlyTables ใน src/lib/brandSync.ts
//    rpc ที่เรียกอ่านแค่ marketing_audience_segments ซึ่งอยู่ในรายการนี้
const ALLOWED = ['marketing_brands', 'marketing_audience_segments', 'marketing_message_pillars'];

if (URL_.includes(RETIRED)) {
  console.error(`🔴 ตรวจไม่ได้ — ปลายทางชี้ project ที่เลิกใช้แล้ว (${RETIRED}) · แหล่งจริงย้ายมา production แล้ว 26 พ.ย. 2569`);
  process.exit(2);
}
if (!KEY) {
  console.error('🔴 ตรวจไม่ได้ — ยังไม่มี BRAND_SYNC_SERVICE_KEY');
  console.error('   หาได้ที่ Supabase → production → Settings → API Keys → secret key');
  console.error('   (ใส่ผ่าน env ตอนรันเท่านั้น · ห้าม commit · ห้ามตั้งเป็น VITE_*)');
  process.exit(2);   // 2 = ตรวจไม่ได้ ≠ ไม่ตรง
}
if (KEY.startsWith('sb_publishable_')) {
  console.error('🔴 ตรวจไม่ได้ — นี่คือ publishable key · rpc นี้เปิดให้ service key เท่านั้น (ADR-0013)');
  process.exit(2);
}

async function readSegments() {
  if (!ALLOWED.includes('marketing_audience_segments')) throw new Error('ขอบเขตที่อนุญาตเปลี่ยนไป — ตรวจ ALLOWED ก่อน');
  // GET — rpc เป็น stable ⇒ PostgREST รับ GET ได้ · สคริปต์นี้จึงไม่มีคำสั่งเขียนแม้แต่รูปแบบเดียว
  const r = await fetch(`${URL_.replace(/\/$/, '')}/rest/v1/rpc/${RPC}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) throw new Error(`rpc ${RPC} → HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
  return r.json();
}

const main = async () => {
  console.log(`🔗 แหล่งจริง: ${URL_} · rpc ${RPC}  (อ่านอย่างเดียว · ขอบเขต ${ALLOWED.length} ตาราง)\n`);

  let segs;
  try {
    segs = await readSegments();
  } catch (e) {
    console.error(`🔴 ตรวจไม่ได้ — ${String(e).slice(0, 200)}`);
    console.error('   (401/403 = คีย์ผิด project หรือไม่ใช่ service key · 404 = ยังไม่ได้ apply migration 0074)');
    process.exit(2);
  }

  const { compareSegments, syncVerdict } = await import('../src/lib/brandSync.ts');
  const rep = compareSegments(segs);
  const v = syncVerdict(rep);

  if (rep.filteredFixtures.length) {
    console.log(`⚠️  กรองข้อมูลทดสอบของอีกระบบออก ${rep.filteredFixtures.length} แถว: ${rep.filteredFixtures.join(', ')}`);
    console.log('   (ไม่ลบให้ — เป็นขยะของ Marketing OS ให้เซสชันที่ทำงานในโฟลเดอร์นั้นเก็บเอง)\n');
  }

  console.log(`🟢 รหัสที่ตรงคำกัน (${rep.aligned.length}): ${rep.aligned.join(', ') || '—'}`);
  if (rep.bridged.length) {
    console.log(`🔀 คำต่างกันแต่ alias พาถึงแล้ว (${rep.bridged.length}) — ลิงก์ใช้ได้จริง ไม่ใช่กับดัก:`);
    for (const b of rep.bridged) console.log(`   · ${b.code.padEnd(12)} → ${b.localSeg}`);
  }
  if (rep.drift.length) {
    console.log(`\n🔴 รหัสที่ยังไม่มีอะไรพาถึง (${rep.drift.length}) — ลิงก์ ?seg=<code> จะตกเป็นพาดหัว default:`);
    for (const d of rep.drift) console.log(`   · ${d.code.padEnd(12)} ${d.why}`);
  }
  if (rep.missingUpstream.length) console.log(`\n⚠️  ชั้นที่แหล่งจริงไม่มี: ${rep.missingUpstream.join(', ')}`);
  if (rep.illegalValidated.length) console.log(`\n🔴 ประกาศ validated ทั้งที่ยังไม่มีผลจริง: ${rep.illegalValidated.join(', ')}`);

  console.log(`\n${v.line}`);
  // exitCode แทน exit() — Node บน Windows ล้มด้วย libuv assertion ถ้า exit ตอน socket ของ fetch ยังปิดไม่เสร็จ
  process.exitCode = v.ok ? 0 : 1;
};

main().catch((e) => { console.error(`🔴 ตรวจไม่ได้ — ${e}`); process.exit(2); });
