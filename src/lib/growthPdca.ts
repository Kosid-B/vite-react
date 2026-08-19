/* growthPdca — วางระบบการตลาด/ผลิตภัณฑ์เป็นวงจร PDCA ที่ "ปิดวงจรได้จริง"
 *
 * ทำไมต้องมี (ไม่ใช่แค่ศัพท์สวย):
 *   ปัญหาที่เจอซ้ำ ๆ คือเรากระโดดไป **Act** (แก้พาดหัว/เพิ่มฟีเจอร์/เปลี่ยนราคา)
 *   ทั้งที่ **Check** ยังตาบอดอยู่ — วัดไม่ได้ หรือวัดได้แต่คนน้อยเกินจะอ่านออก
 *   ผลคือ "แก้แล้วดีขึ้นไหม" ตอบไม่ได้สักครั้ง แล้ววนแก้ใหม่ไปเรื่อย ๆ
 *
 * หลักที่ไฟล์นี้บังคับ (เรียงตามลำดับที่ห้ามข้าม):
 *   ① Plan  — ต้องมีสิ่งที่ตั้งใจจะปล่อย + ตัวชี้วัดที่ "เกิดบ่อยพอจะวัดได้"
 *   ② Do    — หลักฐานของ Do คือ **มีคนเข้ามาจากชิ้นงานนั้นจริง** ไม่ใช่ "โพสต์แล้ว"
 *   ③ Check — ต้องพิสูจน์ว่า *เครื่องมือวัดทำงานอยู่* ก่อนอ่านตัวเลข
 *             เครื่องมือที่ "ตั้งไว้แต่ไม่ได้ต่อ" ทำให้ทุกตัวเลขกลายเป็นคำโกหกโดยการละเว้น
 *   ④ Act   — ห้ามตัดสินใจถ้า ③ ยังตาบอด หรือคนยังน้อยเกินอ่านอัตราส่วน
 *
 * ต่างจาก eqms.ts อย่างไร: eqms = PDCA ของ "คุณภาพ/ISO" (clause · NC · audit)
 *   ไฟล์นี้ = PDCA ของ "การเติบโต" (คนเข้า · คอนเทนต์ · การสมัคร) — คนละวงจร ใช้หลักเดียวกัน
 *
 * pure ทั้งไฟล์ · ไม่แต่งตัวเลข · ทุกข้อสรุปต้องบอกได้ว่ามาจากข้อมูลไหน
 */
import type { LandingAgg } from './landingFunnel';
import { untaggedPct } from './contentPerformance';

export type PdcaPhase = 'plan' | 'do' | 'check' | 'act';
export type PhaseState = 'ok' | 'thin' | 'blocked';

/** ต้องมีคนเท่านี้ก่อนถึงจะอ่าน "อัตราส่วน" ได้อย่างไม่หลอกตัวเอง
 *  ที่ 70 คน: กด CTA 5 คน = 7.1% · ถ้าเป็น 8 คน = 11.4%
 *  ความต่าง 4 เปอร์เซ็นต์จุดนั้นเกิดจากคนแค่ 3 คน = ความบังเอิญล้วน ๆ */
export const MIN_FOR_RATE = 100;

/** ต่ำกว่านี้ต่อสัปดาห์ = ปัญหาคือ "ไม่มีคนมา" ไม่ใช่ "หน้าเว็บไม่ดี"
 *  แก้หน้าเว็บตอนคนเข้า 10 คน/สัปดาห์ = ขัดกระจกรถที่ยังไม่มีน้ำมัน */
export const REACH_FLOOR_PER_WEEK = 100;

/** ไม่มีคนเข้าเว็บเลยกี่วัน ถือว่า Do หยุดไปแล้ว (ไม่ใช่ "รอผล") */
export const STALE_DAYS = 3;

/** เครื่องมือวัด 1 ตัว
 *  receiving: true=ยืนยันแล้วว่ามีข้อมูลเข้า · false=ยืนยันแล้วว่าไม่มี · null=**ตรวจจากในแอปไม่ได้**
 *  (null ไม่ใช่ "ไม่มีปัญหา" — มันคือจุดบอดที่ต้องไปเปิดดูที่ปลายทางเอง) */
export interface Tracker {
  id: string;
  label: string;
  /** ต่อสายไว้แล้วไหม (มีคีย์/มีโค้ดเรียก) */
  wired: boolean;
  receiving: boolean | null;
  /** ถ้ายังไม่ต่อ — ต้องทำอะไรถึงจะต่อได้ */
  fix?: string;
}

export interface GrowthPdcaInput {
  agg: LandingAgg | null;
  trackers: Tracker[];
  /** จำนวนชิ้นงานที่ "ตั้งใจจะปล่อย" ในรอบนี้ (มาจากปฏิทิน/แผน) */
  planned: number;
  /** ช่วงเวลาที่ agg ครอบคลุม (วัน) */
  windowDays: number;
  /** ISO เวลาที่มีคนเข้าเว็บล่าสุด — ใช้บอกว่าวงจรยังหมุนอยู่ไหม */
  lastVisitAt?: string;
  now?: string;
}

export interface PhaseCheck {
  phase: PdcaPhase;
  label: string;
  state: PhaseState;
  /** ข้อเท็จจริงที่ใช้ตัดสิน — เขียนให้คนอ่านตรวจย้อนได้ว่ามาจากไหน */
  evidence: string;
  /** ทำอะไรต่อถึงจะผ่านเฟสนี้ ('' = ผ่านแล้ว) */
  todo: string;
}

export type Bottleneck = 'reach' | 'landing' | 'signup' | 'unknown';

export interface GrowthPdcaStatus {
  phases: Record<PdcaPhase, PhaseCheck>;
  /** เฟสแรกที่ยังไม่ผ่าน = จุดที่วงจรค้าง (null = ครบวง) */
  stuckAt: PdcaPhase | null;
  bottleneck: Bottleneck;
  /** ตัดสินใจจากตัวเลขได้หรือยัง */
  canAct: boolean;
  /** สิ่งที่ควรทำ "ชิ้นเดียว" ตอนนี้ */
  nextAction: string;
  headline: string;
  /** จุดที่เรารู้ว่าเรายังไม่รู้ — ห้ามซ่อน */
  blindSpots: string[];
  /** คนต่อสัปดาห์ (normalize จาก windowDays) */
  visitorsPerWeek: number;
}

const dayMs = 86_400_000;
const round1 = (n: number): number => Math.round(n * 10) / 10;

function daysBetween(a: string | undefined, now: string | undefined): number | null {
  if (!a) return null;
  const t = Date.parse(a);
  const n = now ? Date.parse(now) : Date.now();
  if (isNaN(t) || isNaN(n)) return null;
  return (n - t) / dayMs;
}

/** ชิ้นงานที่ "พิสูจน์ได้ว่าปล่อยแล้ว" = มีคนเข้ามาจากแคมเปญนั้นจริงอย่างน้อย 1 คน
 *  ⚠️ จงใจไม่นับจาก "จำนวนโพสต์ที่เราบอกว่าโพสต์แล้ว" — นั่นคือคำพูด ไม่ใช่หลักฐาน */
export function shippedPieces(agg: LandingAgg | null): number {
  const by = agg?.by_campaign ?? {};
  return Object.values(by).filter((c) => (c?.total ?? 0) > 0).length;
}

/** หาคอขวด — ตอบ 'unknown' อย่างซื่อสัตย์เมื่อคนยังน้อยเกินจะฟันธง */
export function bottleneckOf(agg: LandingAgg | null, visitorsPerWeek: number): Bottleneck {
  if (visitorsPerWeek < REACH_FLOOR_PER_WEEK) return 'reach';
  const total = agg?.total ?? 0;
  if (total < MIN_FOR_RATE) return 'unknown';
  const cta = agg?.cta ?? 0;
  if (cta / total < 0.1) return 'landing';
  if (cta > 0 && (agg?.signup ?? 0) / cta < 0.25) return 'signup';
  return 'unknown';
}

export function growthPdca(inp: GrowthPdcaInput): GrowthPdcaStatus {
  const agg = inp.agg;
  const total = agg?.total ?? 0;
  const cta = agg?.cta ?? 0;
  const signup = agg?.signup ?? 0;
  const days = Math.max(1, inp.windowDays || 1);
  const visitorsPerWeek = round1((total / days) * 7);
  const shipped = shippedPieces(agg);
  const untagged = untaggedPct(agg);
  const staleDays = daysBetween(inp.lastVisitAt, inp.now);

  const blindSpots: string[] = [];
  const dead = inp.trackers.filter((t) => !t.wired || t.receiving === false);
  const unknownTrackers = inp.trackers.filter((t) => t.wired && t.receiving === null);
  for (const t of dead) {
    blindSpots.push(`🔴 ${t.label}: ยังไม่ได้รับข้อมูล${t.fix ? ` — ${t.fix}` : ''}`);
  }
  for (const t of unknownTrackers) {
    blindSpots.push(`🟡 ${t.label}: ตรวจจากในแอปไม่ได้ ต้องเปิดดูที่ปลายทางเองว่ามี event เข้าจริงไหม`);
  }
  if (total > 0 && untagged >= 99) {
    blindSpots.push('🔴 ผู้เข้าชมแทบทั้งหมดไม่มี utm — ตอบไม่ได้เลยว่าคอนเทนต์ชิ้นไหนพาคนมา');
  }

  // ① Plan
  const plan: PhaseCheck = inp.planned > 0
    ? { phase: 'plan', label: 'Plan · วางแผน', state: 'ok',
        evidence: `มีชิ้นงานที่วางแผนจะปล่อยรอบนี้ ${inp.planned} ชิ้น`, todo: '' }
    : { phase: 'plan', label: 'Plan · วางแผน', state: 'blocked',
        evidence: 'ยังไม่มีชิ้นงานที่ตั้งใจจะปล่อยในรอบนี้',
        todo: 'กำหนดว่ารอบนี้จะปล่อยอะไรบ้าง กี่ชิ้น ลงปฏิทินให้เห็นวันจริง' };

  // ② Do — หลักฐานคือคนเข้ามาจากชิ้นงาน ไม่ใช่คำว่า "โพสต์แล้ว"
  let doP: PhaseCheck;
  if (shipped === 0 && inp.planned > 0) {
    doP = { phase: 'do', label: 'Do · ลงมือ', state: 'blocked',
      evidence: `วางแผนไว้ ${inp.planned} ชิ้น แต่ยังไม่มีผู้เข้าชมที่มาจากชิ้นงานใดเลย`,
      todo: 'ปล่อยของจริงออกไป และใส่ลิงก์ที่ติดแท็ก (?s=) ทุกครั้ง — ไม่ติดแท็ก = ปล่อยแล้วเหมือนไม่ได้ปล่อย' };
  } else if (staleDays !== null && staleDays > STALE_DAYS) {
    doP = { phase: 'do', label: 'Do · ลงมือ', state: 'thin',
      evidence: `ไม่มีผู้เข้าชมเลย ${Math.floor(staleDays)} วัน (ล่าสุด ${inp.lastVisitAt?.slice(0, 10)})`,
      todo: 'วงจรหยุดหมุนแล้ว ไม่ใช่ "กำลังรอผล" — ปล่อยชิ้นถัดไป' };
  } else {
    doP = { phase: 'do', label: 'Do · ลงมือ', state: 'ok',
      evidence: `มีผู้เข้าชมจากชิ้นงานจริง ${shipped} ชิ้น`, todo: '' };
  }

  // ③ Check — เครื่องมือต้องทำงานก่อน แล้วค่อยดูว่าข้อมูลพอไหม
  let check: PhaseCheck;
  if (dead.length > 0) {
    check = { phase: 'check', label: 'Check · วัดผล', state: 'blocked',
      evidence: `เครื่องมือวัด ${dead.length} ตัวยังไม่ได้รับข้อมูล (${dead.map((t) => t.label).join(', ')})`,
      todo: dead[0].fix || `ต่อ ${dead[0].label} ให้รับข้อมูลจริงก่อน แล้วค่อยอ่านตัวเลข` };
  } else if (total === 0) {
    check = { phase: 'check', label: 'Check · วัดผล', state: 'blocked',
      evidence: 'ยังไม่มีผู้เข้าชมในช่วงที่ดู', todo: 'ยังไม่มีอะไรให้วัด — กลับไปที่ Do' };
  } else if (total < MIN_FOR_RATE) {
    check = { phase: 'check', label: 'Check · วัดผล', state: 'thin',
      evidence: `ผู้เข้าชม ${total} คน ยังไม่ถึง ${MIN_FOR_RATE} — อ่านได้แค่ "มี/ไม่มี" ยังอ่าน "กี่ %" ไม่ได้`,
      todo: `เพิ่มคนให้ถึง ${MIN_FOR_RATE} ก่อน แล้วอัตราส่วนถึงจะเชื่อได้` };
  } else {
    check = { phase: 'check', label: 'Check · วัดผล', state: 'ok',
      evidence: `ผู้เข้าชม ${total} คน · กด CTA ${cta} · สมัคร ${signup} — พอจะอ่านอัตราส่วนได้`, todo: '' };
  }

  // ④ Act — ห้ามตัดสินใจถ้า Check ยังไม่ ok
  const canAct = check.state === 'ok';
  const bottleneck = bottleneckOf(agg, visitorsPerWeek);
  const act: PhaseCheck = canAct
    ? { phase: 'act', label: 'Act · ตัดสินใจ', state: 'ok',
        evidence: `ข้อมูลพอให้ตัดสินใจได้ · คอขวดอยู่ที่ ${BOTTLENECK_LABEL[bottleneck]}`,
        todo: '' }
    : { phase: 'act', label: 'Act · ตัดสินใจ', state: 'blocked',
        evidence: 'Check ยังไม่ผ่าน — ตัดสินใจตอนนี้คือเดา แล้วเรียกมันว่าข้อมูล',
        todo: 'ปิดวงจร Check ให้ได้ก่อน' };

  const phases: Record<PdcaPhase, PhaseCheck> = { plan, do: doP, check, act };
  const order: PdcaPhase[] = ['plan', 'do', 'check', 'act'];
  const stuckAt = order.find((p) => phases[p].state !== 'ok') ?? null;

  const nextAction = stuckAt ? phases[stuckAt].todo : ACT_PLAYBOOK[bottleneck];
  const headline = stuckAt
    ? `วงจรค้างที่ ${phases[stuckAt].label} — ${phases[stuckAt].evidence}`
    : `วงจรครบรอบ · คอขวดอยู่ที่ ${BOTTLENECK_LABEL[bottleneck]}`;

  return { phases, stuckAt, bottleneck, canAct, nextAction, headline, blindSpots, visitorsPerWeek };
}

export const BOTTLENECK_LABEL: Record<Bottleneck, string> = {
  reach: 'จำนวนคนที่มาถึงเว็บ',
  landing: 'หน้าแรก (คนมาถึงแต่ไม่กดอะไร)',
  signup: 'ขั้นสมัคร (กดแล้วแต่ไม่สมัครต่อ)',
  unknown: 'ยังฟันธงไม่ได้',
};

/** เมื่อวงจรครบรอบแล้ว — Act ที่ตรงกับคอขวด ไม่ใช่ Act ที่นึกออก */
export const ACT_PLAYBOOK: Record<Bottleneck, string> = {
  reach: 'คอขวดคือไม่มีคนมา — เพิ่มจำนวนชิ้นงานที่ปล่อย ไม่ใช่แก้หน้าเว็บ',
  landing: 'คนมาถึงแต่ไม่กด — แก้พาดหัว/ข้อเสนอครึ่งหน้าบน แล้ววัดที่ "กด CTA" ไม่ใช่ "สมัคร"',
  signup: 'กดแล้วหลุดตอนสมัคร — ลดสิ่งที่ต้องกรอก/ตัดสินใจก่อนได้คุณค่าครั้งแรก',
  unknown: 'ยังไม่มีคอขวดที่ชัด — เก็บข้อมูลต่อโดยไม่เปลี่ยนอะไร (เปลี่ยนตอนนี้จะอ่านผลไม่ออก)',
};
