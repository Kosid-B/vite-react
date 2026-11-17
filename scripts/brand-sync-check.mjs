/* brand-sync-check.mjs — เทียบ "ความจริงเรื่องแบรนด์" ของผลิตภัณฑ์ กับแหล่งจริงใน Marketing OS
 *
 * 🧱 เส้นแบ่ง: Marketing OS = อีกระบบ (เจ้าของ freeze 24 ส.ค. 2569)
 *    เจ้าของยกเลิกข้อห้ามให้เฉพาะ **อ่านอย่างเดียว 3 ตาราง** (15 พ.ย. 2569)
 *    ⇒ สคริปต์นี้เป็น **จุดเดียวในรีโป** ที่แตะฐานของอีกระบบ และแตะแบบอ่านอย่างเดียว
 *       ❌ ไม่มี POST/PATCH/DELETE · ❌ ไม่แตะ production waigsnxhrlwtiotspaim
 *       ❌ ไม่ลบข้อมูลทดสอบของเขา (กรองออกฝั่งเรา แล้วประกาศว่ากรองอะไรไป)
 *
 * ทำไมเป็นสคริปต์ ไม่ใช่โค้ดในแอป:
 *    ผลิตภัณฑ์ต้องทำงานได้แม้อีกระบบล่ม · `brandBrief.ts` ถูกบังคับให้ pure
 *    ⇒ เก็บสำเนาไว้ที่เราเหมือนเดิม แต่มีเครื่องมือจับได้เมื่อสำเนาเพี้ยนจากแหล่งจริง
 *
 * วิธีรัน:
 *    MARKETING_SUPABASE_URL=https://bjozpwdtqbpwcxnqguka.supabase.co \
 *    MARKETING_SUPABASE_ANON_KEY=<publishable key> \
 *    npx vite-node scripts/brand-sync-check.mjs
 *
 * ⚠️ ต้อง `vite-node` ไม่ใช่ `node` เปล่า (เหตุผลเดียวกับ prerender-seo.mjs)
 *
 * ออก 0 = ตรงกัน · 1 = พบ drift (ใช้ใน CI ได้) · 2 = ตรวจไม่ได้ (คนละเรื่องกับ "ไม่ตรง")
 */

const URL_ = process.env.MARKETING_SUPABASE_URL || 'https://bjozpwdtqbpwcxnqguka.supabase.co';
const KEY = process.env.MARKETING_SUPABASE_ANON_KEY || '';

// 🔒 ตารางที่อนุญาตให้อ่าน — ต้องตรงกับ MARKETING_SOURCE.readOnlyTables ใน src/lib/brandSync.ts
const ALLOWED = ['marketing_brands', 'marketing_audience_segments', 'marketing_message_pillars'];

if (!KEY) {
  console.error('🔴 ตรวจไม่ได้ — ยังไม่มี MARKETING_SUPABASE_ANON_KEY');
  console.error('   หาได้ที่ Supabase → project "CEOAITHAILAND Marketing" → Settings → API → publishable key');
  console.error('   (publishable key เป็น public โดยดีไซน์ · ห้ามใช้ service-role เด็ดขาด — สคริปต์นี้อ่านอย่างเดียว)');
  process.exit(2);   // 2 = ตรวจไม่ได้ ≠ ไม่ตรง
}

async function readTable(table, select) {
  if (!ALLOWED.includes(table)) throw new Error(`ตาราง ${table} ไม่อยู่ในรายการที่เจ้าของอนุญาตให้อ่าน`);
  const r = await fetch(`${URL_.replace(/\/$/, '')}/rest/v1/${table}?select=${select}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) throw new Error(`${table} → HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
  return r.json();
}

const main = async () => {
  console.log(`🔗 แหล่งจริง: ${URL_}  (อ่านอย่างเดียว ${ALLOWED.length} ตาราง)\n`);

  let segs;
  try {
    segs = await readTable('marketing_audience_segments', 'code,name,evidence_status,active');
  } catch (e) {
    console.error(`🔴 ตรวจไม่ได้ — ${String(e).slice(0, 200)}`);
    console.error('   (RLS อาจปิดการอ่านด้วย anon key — ต้องให้ฝั่ง Marketing OS เปิด policy อ่านให้ก่อน)');
    process.exit(2);
  }

  const { compareSegments, syncVerdict } = await import('../src/lib/brandSync.ts');
  const rep = compareSegments(segs);
  const v = syncVerdict(rep);

  if (rep.filteredFixtures.length) {
    console.log(`⚠️  กรองข้อมูลทดสอบของอีกระบบออก ${rep.filteredFixtures.length} แถว: ${rep.filteredFixtures.join(', ')}`);
    console.log('   (ไม่ลบให้ — เป็นขยะของ Marketing OS ให้เซสชันที่ทำงานในโฟลเดอร์นั้นเก็บเอง)\n');
  }

  console.log(`🟢 รหัสที่ตรงกัน (${rep.aligned.length}): ${rep.aligned.join(', ') || '—'}`);
  if (rep.drift.length) {
    console.log(`\n🔴 รหัสที่ไม่ตรง (${rep.drift.length}) — ลิงก์ ?seg=<code> จากอีกระบบจะตกเป็นพาดหัว default:`);
    for (const d of rep.drift) console.log(`   · ${d.code.padEnd(12)} ${d.why}`);
  }
  if (rep.missingUpstream.length) console.log(`\n⚠️  ชั้นที่แหล่งจริงไม่มี: ${rep.missingUpstream.join(', ')}`);
  if (rep.illegalValidated.length) console.log(`\n🔴 ประกาศ validated ทั้งที่ยังไม่มีผลจริง: ${rep.illegalValidated.join(', ')}`);

  console.log(`\n${v.line}`);
  process.exit(v.ok ? 0 : 1);
};

main().catch((e) => { console.error(`🔴 ตรวจไม่ได้ — ${e}`); process.exit(2); });
