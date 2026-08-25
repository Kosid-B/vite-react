/* nextBestAction — คำตอบเดียวของคำถาม "ตอนนี้ธุรกิจควรทำอะไรต่อ"
 * (ปิดวง Vision → Constitution → Genome → Decision Engine · 24 ส.ค. 2569)
 *
 * 🔴 ปัญหาที่แก้ (Architecture Consolidation Audit §3):
 *    เรามีฟังก์ชันที่ตอบ "ทำอะไรต่อ" อยู่ 10 ตัว **แต่ไม่มีตัวบน**
 *    ⇒ ผู้ใช้คนเดียวถูกบอกพร้อมกันว่าอยู่ "ขั้น 3" · "เฟส reach" · "ไอเดีย" · "Define"
 *    และ `NORTH_STAR.promise` สัญญาว่าจะให้ **Next Best Business Action** ซึ่งยังไม่มีอยู่จริง
 *
 * ไฟล์นี้คือตัวบนนั้น — อ่านผลของตัวอื่น แล้วคืน **ข้อเดียว**
 *
 * ลำดับที่ยึด (เจ้าของ freeze):
 *   ①  ความพร้อมของธุรกิจเอง (Business Genome) มาก่อน
 *   ②  แล้วค่อยดูคอขวดฝั่งการหาลูกค้า (Decision Rules)
 *   เหตุผล: ซ่อมช่องทางให้ดีแค่ไหน ก็ไม่ช่วยธุรกิจที่ยังไม่รู้ว่าขายใคร
 *
 * pure ทั้งไฟล์ · ไม่แตะฐานข้อมูล
 */

import type { AppData } from '../types';
import { genomeFromApp } from './genomeFromApp';
import { stuckBranch, genomeStatus, type GenomeData } from './businessGenome';
import { READINESS_CHECKS, readinessFromGenome, missionStage, type ReadinessKey } from './founderMindset';
import { diagnose, type BusinessState, type Bottleneck } from './decisionRules';

export interface NextBestActionResult {
  /** ขั้นของพันธกิจที่ธุรกิจนี้อยู่จริง (ไอเดีย → Scale) */
  stage: ReturnType<typeof missionStage>;
  /** กิ่งจีโนมที่ยังไม่ครบ — ตัวแรกคือที่ควรเติมก่อน */
  stuck: ReturnType<typeof stuckBranch>;
  /** ด่านความพร้อมที่ยังไม่ผ่าน (เรียงตามลำดับที่ควรทำ) */
  gaps: typeof READINESS_CHECKS[number][];
  /** คอขวดฝั่งหาลูกค้า — null เมื่อยังไม่มีข้อมูลฝั่งนั้น */
  bottleneck: Bottleneck | null;
  /** 🎯 ประโยคเดียวที่ผู้ใช้ต้องอ่าน */
  action: string;
  /** มาจากไหน — ผู้ใช้ต้องตรวจสอบเหตุผลของระบบได้เสมอ */
  because: string;
  /** ความครบของจีโนม 0–100 (ใช้แสดงความคืบหน้า ไม่ใช่คะแนนธุรกิจ) */
  genomeCompletePct: number;
  /** ยังไม่รู้อะไรบ้าง — ประกาศจุดบอด ไม่ใช่ซ่อน */
  blindSpots: string[];
}

/** สภาพฝั่งหาลูกค้า — ถ้าไม่ส่งมา แปลว่า "ยังไม่มีข้อมูล" ไม่ใช่ "เป็นศูนย์" */
export type AcquisitionInput = BusinessState | null;

export function nextBestAction(d: AppData, acquisition: AcquisitionInput = null): NextBestActionResult {
  const genome: GenomeData = genomeFromApp(d);
  const status = genomeStatus(genome);
  const ready = readinessFromGenome(genome);
  const stuck = stuckBranch(genome);
  const gaps = READINESS_CHECKS.filter((c) => !ready[c.key as ReadinessKey]);
  const stage = missionStage(ready);

  const filled = status.reduce((s, b) => s + b.filled, 0);
  const total = status.reduce((s, b) => s + b.filled + b.missing.length, 0);
  const genomeCompletePct = total > 0 ? Math.round((filled / total) * 100) : 0;

  const blindSpots: string[] = [];
  if (!acquisition) {
    blindSpots.push('🔴 ยังไม่มีข้อมูลฝั่งการหาลูกค้า (ผู้เข้าชม/แท็กที่มา/lead) ⇒ คอขวดฝั่งนั้นตรวจไม่ได้');
  }

  // ① ธุรกิจยังไม่พร้อม = ทำเรื่องหาลูกค้าไปก็ยังไม่มีอะไรให้ขาย
  if (gaps.length > 0) {
    const first = gaps[0];
    return {
      stage, stuck, gaps, genomeCompletePct, blindSpots,
      bottleneck: acquisition ? diagnose(acquisition).bottleneck : null,
      action: first.nextAction,
      because: `${first.q} ยังตอบไม่ได้ — ${first.why}`,
    };
  }

  // ② พร้อมครบแล้ว ค่อยไปดูว่าฝั่งหาลูกค้าติดตรงไหน
  if (acquisition) {
    const dx = diagnose(acquisition);
    return {
      stage, stuck, gaps, genomeCompletePct, blindSpots,
      bottleneck: dx.bottleneck,
      action: dx.nextBestAction,
      because: dx.hits[0]?.because ?? 'ผ่านทุกกฎการตัดสินใจแล้ว',
    };
  }

  return {
    stage, stuck, gaps, genomeCompletePct, blindSpots,
    bottleneck: null,
    action: 'ความพร้อมของธุรกิจครบแล้ว — ขั้นต่อไปคือวัดผลฝั่งการหาลูกค้าให้ได้ก่อนตัดสินใจใช้เงิน',
    because: 'ผ่านครบ 6 ด่าน แต่ยังไม่มีข้อมูลฝั่งช่องทางให้วินิจฉัย',
  };
}
