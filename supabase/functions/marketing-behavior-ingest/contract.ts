/* สัญญาของ batch ที่รับได้ — strict ทุกชั้น (คีย์เกิน = ปฏิเสธทั้งก้อน)
 * 🔴 ยกมาจากซอร์สจริงบน project bjozpwdtqbpwcxnqguka (v4) โดยไม่แก้สักบรรทัด
 *    ไฟล์นี้คือ "เกณฑ์ของปลายทาง" — แก้ที่นี่ = เปลี่ยนสัญญากับฝั่งที่ยิงเข้ามา
 */
import { z } from 'npm:zod@4.1.5';

/** JSON ที่เรียงคีย์แล้ว — ใช้ทำ hash ให้ batch เดิมได้ค่าเดิมเสมอ (กันนับซ้ำ) */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort()
      .map((k) => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k]))
      .join(',') + '}';
  }
  return JSON.stringify(value);
}

export const schema = z.object({
  version: z.literal(1), batchId: z.string().uuid(),
  // 🔴 ค่าคงที่บังคับ — เป็นคำประกาศแทนผู้ใช้ ⇒ ฝั่งที่ยิงต้องส่งเมื่อผู้ใช้ยินยอมจริงเท่านั้น
  consent: z.literal('analytics_opt_in'),
  mode: z.enum(['live', 'test']),
  events: z.array(z.object({
    id: z.string().uuid(), session: z.string().uuid(),
    at: z.iso.datetime(), source: z.enum(['website', 'saas']),
    name: z.enum(['view', 'engaged', 'action']),
    // 7 ค่า = code ของ message pillars (ขยายจาก 4 เมื่อ 20 พ.ย. 2569)
    topic: z.enum(['business_validation', 'first_customer', 'content_marketing',
      'business_systems', 'start', 'side_income', 'money']),
    format: z.enum(['article', 'short_video', 'checklist', 'interactive']),
  }).strict()).min(1).max(20),
}).strict();

export function validate(input: unknown, now = Date.now()) {
  const batch = schema.parse(input);
  if (new Set(batch.events.map((e) => e.id)).size !== batch.events.length) throw new Error('duplicate_event');
  // ของค้างข้ามวันต้องถูกทิ้งที่ต้นทาง ไม่ใช่ส่งมาแล้วให้ปลายทางเดา
  if (batch.events.some((e) => Date.parse(e.at) > now + 60000 || Date.parse(e.at) < now - 86400000)) {
    throw new Error('expired_event');
  }
  return batch;
}
