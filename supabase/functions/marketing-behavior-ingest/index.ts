/* marketing-behavior-ingest — ประตูรับ behavior event จากหน้าเว็บ
 *
 * 🔀 **ย้ายมาอยู่ project เดียวกับ CEO เมื่อ 22 พ.ย. 2569** (ADR-0011)
 *    เดิม deploy บน `bjozpwdtqbpwcxnqguka` เขียนลง `public.*` ของ project นั้น
 *    ตอนนี้ deploy บน `waigsnxhrlwtiotspaim` เขียนลง **schema `marketing_os`**
 *    ⇒ ของที่เปลี่ยนจากซอร์สเดิม: **บรรทัดเดียว** (`.schema('marketing_os')` ก่อน `.from(...)`)
 *       เกณฑ์ตรวจ · โควตา · การเก็บคลัง · รหัสสถานะ ยกมาทั้งหมดไม่แก้
 *
 * 🔴 ทำไมไฟล์นี้ต้องอยู่ในรีโป: ของเดิม (`marketing-track`) รันบน production มา ~3 เดือน
 *    **โดยไม่มีซอร์สในรีโปเลย** ⇒ ไม่มีใครรู้ว่ามันทำอะไร แก้ไม่ได้ ตรวจไม่ได้
 *    ⇒ ฟังก์ชันที่เราเป็นเจ้าของ ต้องมีโค้ดให้คนอ่านได้ ไม่ใช่มีแต่ของที่ deploy ไปแล้ว
 *
 * 🚢 **ฟังก์ชันตัวแรกที่ขึ้น production ผ่าน CI จริง** (26 พ.ย. 2569 · ledger #104)
 *    ก่อนหน้านี้ทุกตัวขึ้นด้วยมือจากเครื่องเจ้าของหรือผ่าน MCP ⇒ ไม่มีอะไรรับประกันว่า
 *    ของบน production ตรงกับ main · workflow deploy **เฉพาะฟังก์ชันที่เปลี่ยนในคอมมิตนั้น**
 *    (bulk = จะเปิดของ 9 ตัวที่ไม่เคยขึ้นเลย 3 ตัวเป็น endpoint สาธารณะ)
 *
 * ชั้นกั้นตามลำดับ (ลำดับนี้มีความหมาย — ของถูกปฏิเสธก่อนเสียทรัพยากร):
 *   ① origin allowlist  ② method/content-type  ③ เพดาน 16,000 ไบต์ (ตัดตอนอ่าน ไม่ใช่หลังอ่านจบ)
 *   ④ สคีมา strict      ⑤ โควตาใน rpc         ⑥ เก็บคลังลง bucket ส่วนตัว
 *
 * 🔒 ใช้ service-role ของ project ตัวเอง (env ของ Supabase ให้มาเอง) — ไม่มีคีย์ใดฝังในไฟล์นี้
 */
import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
import { validate, canonical } from './contract.ts';

/** workspace ของ Marketing OS (คนละตัวกับของ marketing-track) */
const workspace = 'e82e7d93-b88e-48ff-9364-b54bcff5278d';
const origins = new Set(['https://ceoaithailand.org', 'https://www.ceoaithailand.org']);
let bucketReady: Promise<boolean> | undefined;
const hex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

Deno.serve(async (request) => {
  const origin = request.headers.get('origin') || '';
  const headers = {
    'Access-Control-Allow-Origin': origins.has(origin) ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  };
  const reply = (status: number, state: string) => Response.json({ state }, { status, headers });

  // 🔴 localhost ไม่อยู่ใน allowlist โดยเจตนา ⇒ ทดสอบจากเครื่องไม่ได้ ต้องทดสอบบน production ด้วย mode:'test'
  if (!origins.has(origin)) return reply(403, 'origin_denied');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply(405, 'method_denied');
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply(415, 'json_required');

  try {
    const reader = request.body?.getReader();
    if (!reader) return reply(400, 'body_required');
    const chunks: Uint8Array[] = [];
    let size = 0;
    // อ่านทีละก้อนแล้วตัดเมื่อเกินเพดาน — ไม่รออ่านจบก่อนค่อยวัด
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 16000) { await reader.cancel(); return reply(413, 'too_large'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of chunks) { bytes.set(part, offset); offset += part.length; }

    let batch;
    try { batch = validate(JSON.parse(new TextDecoder().decode(bytes))); }
    catch { return reply(400, 'invalid_batch'); }

    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db = createClient(Deno.env.get('SUPABASE_URL')!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const payload = canonical(batch);
    const hash = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload)));

    // IP ใช้ทำโควตาต่อนาทีเท่านั้น และถูก HMAC ก่อน — ไม่เคยถูกเก็บลง payload ของ event
    const minute = new Date().toISOString().slice(0, 16);
    const hmac = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const rateKey = hex(await crypto.subtle.sign(
      'HMAC', hmac,
      new TextEncoder().encode(`${minute}:${request.headers.get('x-forwarded-for') || 'unknown'}`),
    ));

    const path = `${workspace}/behavior/${batch.mode}/${batch.batchId}.json`;
    // rpc อยู่ใน public (PostgREST เรียกได้) แต่เขียนลง marketing_os ทั้งหมด · grant ให้ service_role เท่านั้น
    const { data, error } = await db.rpc('receive_marketing_behavior', {
      p_id: batch.batchId, p_workspace: workspace, p_hash: hash,
      p_payload: batch, p_path: path, p_rate_key: rateKey,
    });
    if (error) return reply(503, 'database_unavailable');
    if (data === 'rate_limited') return reply(429, 'rate_limited');
    if (data === 'conflict') return reply(409, 'batch_conflict');
    if (data !== 'accepted') return reply(503, 'not_accepted');

    // bucket ส่วนตัวของงานนี้โดยเฉพาะ — policy อัปโหลดของที่อื่นไม่มีผลกับมัน
    const bucket = 'marketing-behavior-private';
    bucketReady ??= db.storage.getBucket(bucket).then(async (result) => {
      if (result.data) return result.data.public === false;
      const created = await db.storage.createBucket(bucket, {
        public: false, fileSizeLimit: 16000, allowedMimeTypes: ['application/json'],
      });
      if (!created.error) return true;
      const check = await db.storage.getBucket(bucket);
      return check.data?.public === false;
    }).catch(() => false);
    if (!await bucketReady) { bucketReady = undefined; return reply(503, 'private_archive_unavailable'); }

    const archived = await db.storage.from(bucket)
      .upload(path, payload, { contentType: 'application/json', upsert: false });
    if (archived.error) {
      // ยืนยัน "ไบต์" ไม่ใช่แค่ "มีไฟล์" เวลาลองซ้ำหลังอัปสำเร็จไปแล้ว
      const existing = await db.storage.from(bucket).download(path);
      if (existing.error || await existing.data.text() !== payload) return reply(503, 'archive_pending');
    }

    /* 🔒 เขียนชื่อ schema เป็นสตริงตรงที่จุดเรียก **โดยเจตนา** ไม่ยกไปเป็นค่าคงที่
     *    เพราะด่าน `ownershipBoundary.test.ts` ตรวจที่จุดเรียกว่ามี `.schema('marketing_os')` จริง
     *    ⇒ ค่าคงที่ = ด่านต้องเชื่อการอ้างอิง · สตริงตรง = ด่านอ่านเองได้ว่ายิงไป schema ไหน */
    const saved = await db.schema('marketing_os').from('marketing_behavior_batches')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', batch.batchId).eq('payload_hash', hash);
    if (saved.error) return reply(503, 'archive_pending');

    return reply(200, 'stored_and_archived');
  } catch { return reply(503, 'temporarily_unavailable'); }
});
