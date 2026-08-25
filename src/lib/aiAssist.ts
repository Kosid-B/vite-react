/* aiAssist — ประตูเดียวที่ทุกคำสั่งของ AI ต้องผ่าน
 *
 * 🔴 ก่อนหน้านี้มี 15 จุดเรียก `supabase.functions.invoke('ai-assist')` เอง
 *    ⇒ ไม่มีที่เดียวให้บังคับกติกา และเพิ่มจุดใหม่ก็ไม่มีใครรู้
 *    ⇒ รัฐธรรมนูญไปถึง AI จริงแค่ 1 จุดจาก 15 (Architecture Consolidation Audit)
 *
 * กติกา: ทุกจุดต้องเรียกผ่านไฟล์นี้ · จะไม่รับกติกาก็ได้ **แต่ต้องบอกเหตุผล**
 *        (`ungoverned` เป็น union ที่กำหนดเหตุผลไว้แล้ว ⇒ เขียนเหตุผลมั่วไม่ได้)
 *        กลไกเฝ้า: `constitutionReach.test.ts`
 */

import { supabase } from './supabase';
import { invokeFn } from './invokeWithTimeout';
import { governingBlock, type UngovernedReason } from './aiGuardrails';

export interface AiAssistParams {
  page: string;
  pageLabel?: string;
  instruction: string;
  context?: string;
  [k: string]: unknown;
}

export interface AiAssistResult {
  summary?: string;
  suggestions?: string[];
  [k: string]: unknown;
}

/** เติมกติกาเข้าไปในบริบท — แยกออกมาเป็นฟังก์ชัน pure เพื่อให้เทสต์ได้โดยไม่ต้องต่อเน็ต */
export function withGuardrails(p: AiAssistParams): AiAssistParams {
  return { ...p, context: `${governingBlock()}\n\n${p.context ?? ''}`.trim() };
}

export async function callAiAssist(
  params: AiAssistParams,
  opts: { ungoverned?: UngovernedReason; timeoutMs?: number } = {},
): Promise<AiAssistResult> {
  if (!supabase) throw new Error('supabase_unavailable');
  const body = opts.ungoverned ? params : withGuardrails(params);
  const { data, error } = opts.timeoutMs
    ? await invokeFn<AiAssistResult>('ai-assist', { body }, opts.timeoutMs)
    : await supabase.functions.invoke<AiAssistResult>('ai-assist', { body });
  if (error) throw error;
  return (data ?? {}) as AiAssistResult;
}
