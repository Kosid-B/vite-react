// invisibleInfluence.ts — ประเมิน "ร่องรอยแบรนด์" ต่อกลุ่มพลังเงียบ (Invisible Consumers)
// จากผลศึกษา MI GROUP: ~39% ของคนดิจิทัลไม่ Like/Comment/Share แต่จดจำ+ค้นหา+ซื้อภายหลัง
// แบรนด์ต้อง "ทิ้งร่องรอย" 3 ทาง: Be Found / Be Remembered / Be Recommended
// → ให้คะแนน + ช่องว่างที่ลงมือปิดได้ในระบบ (pure + tested)
import type { AppData, PageId } from '../types';

export type PillarId = 'found' | 'remembered' | 'recommended';

export interface IIGap { text: string; page?: PageId; }
export interface IIPillar {
  id: PillarId;
  label: string;   // อังกฤษ (จากผลศึกษา)
  thai: string;    // ไทย
  quote: string;   // คำคมประจำเสา
  score: number;   // 0..100
  status: 'strong' | 'partial' | 'weak';
  done: string[];
  gaps: IIGap[];
}
export interface IIAssessment {
  pillars: IIPillar[];
  overall: number;                 // 0..100
  trail: 'ชัดเจน' | 'พอมี' | 'จาง'; // ความชัดของร่องรอยแบรนด์
  headline: string;
}

interface Check { ok: boolean; done: string; gap: string; page?: PageId; }

function has(s: string | undefined | null): boolean {
  return !!(s && s.trim());
}
function statusOf(score: number): IIPillar['status'] {
  if (score >= 67) return 'strong';
  if (score >= 34) return 'partial';
  return 'weak';
}
function pillarFrom(id: PillarId, label: string, thai: string, quote: string, checks: Check[]): IIPillar {
  const okN = checks.filter(c => c.ok).length;
  const score = checks.length ? Math.round((okN / checks.length) * 100) : 0;
  return {
    id, label, thai, quote, score, status: statusOf(score),
    done: checks.filter(c => c.ok).map(c => c.done),
    gaps: checks.filter(c => !c.ok).map(c => ({ text: c.gap, page: c.page })),
  };
}

/** ประเมินร่องรอยแบรนด์ต่อกลุ่มพลังเงียบ จากข้อมูลจริงใน AppData */
export function assessInvisibleInfluence(d: AppData): IIAssessment {
  const c = d.aiCompany;
  const vp = has(c?.productVp) || has(d.businessModel?.bmc?.value?.[0]);
  const personas = (d.personas?.length ?? 0) > 0;
  const content = (d.contentPlan?.length ?? 0) > 0;
  const wins = (d.winStories?.length ?? 0) > 0;
  const partners = (d.marketplace?.partners?.length ?? 0) > 0;

  // 1) Be Found — ถูกค้นเจอในจังหวะที่ลูกค้าหาคำตอบ
  const found = pillarFrom('found', 'Be Found — Win Search', 'ถูกค้นเจอ',
    'ไม่ใช่แค่อยู่ในจังหวะที่เขาค้นหา แต่ต้องเป็นคำตอบที่เขาเลือก', [
      { ok: vp, done: 'มีคุณค่าหลัก (Value Prop) ให้ลูกค้าค้นแล้วเข้าใจ', gap: 'เขียน "คุณค่าหลัก" ให้ชัด — ลูกค้าค้นเจอแล้วต้องรู้ทันทีว่าคุณคือคำตอบ', page: 'bmc' },
      { ok: has(c?.productDesc), done: 'มีคำอธิบายผลิตภัณฑ์ (เนื้อหาให้ถูก index)', gap: 'อธิบายสินค้า/บริการเป็นข้อความ เพื่อให้ Search/AI หยิบไปเป็นคำตอบ', page: 'aicompany' },
      { ok: !!d.marketInsight, done: 'ทำวิจัยตลาด — รู้ว่าลูกค้าค้นด้วยคำไหน', gap: 'ทำวิจัยตลาด เพื่อรู้ "คำค้น/ความต้องการจริง" ของลูกค้า', page: 'market' },
      { ok: content, done: 'มีแผนคอนเทนต์ (Owned Content) เป็นร่องรอยให้ค้นเจอ', gap: 'วางแผนคอนเทนต์ที่ตอบคำถามจริง — ยิ่งตอบตรง ยิ่งถูกค้นเจอ', page: 'content' },
    ]);

  // 2) Be Remembered — พบเจอเป็นธรรมชาติ สะสมความคุ้นเคย
  const remembered = pillarFrom('remembered', 'Be Remembered — Design for Discovery', 'ถูกจดจำ',
    'การค้นพบแบรนด์ควรรู้สึกเป็นธรรมชาติ ไม่ใช่การถูกบังคับให้รับสาร', [
      { ok: has(c?.name), done: 'มีชื่อแบรนด์ที่ชัดเจน', gap: 'ตั้งชื่อบริษัท/แบรนด์ให้ชัด — สิ่งแรกที่กลุ่มเงียบต้องจำได้', page: 'aicompany' },
      { ok: has(c?.logoSvg), done: 'มีโลโก้/อัตลักษณ์ภาพที่จำได้', gap: 'สร้างโลโก้/อัตลักษณ์ — ภาพ+สี ช่วยให้ Quiet Absorber ซึมซับจนคุ้น', page: 'aicompany' },
      { ok: personas, done: 'รู้จักลูกค้า (Persona) — สื่อสารให้ตรงบริบท', gap: 'กำหนด Persona เพื่อออกแบบการพบเจอให้ตรงชีวิตประจำวันลูกค้า', page: 'personas' },
      { ok: content, done: 'มีคอนเทนต์สม่ำเสมอ (พบเจอซ้ำ = คุ้นเคย)', gap: 'วางคอนเทนต์สม่ำเสมอ — ความถี่คือกุญแจชนะใจ Quiet Absorber', page: 'content' },
    ]);

  // 3) Be Recommended — ให้คนอยากบอกต่อ + มีหลักฐานให้ตรวจสอบเอง
  const recommended = pillarFrom('recommended', 'Be Recommended — Enable Word of Mouth', 'ถูกบอกต่อ',
    'ความน่าเชื่อถือของแบรนด์ มักไม่ได้เกิดจากสิ่งที่แบรนด์กล่าวถึงตัวเอง', [
      { ok: wins, done: 'มีเคสความสำเร็จ/เสียงผู้ใช้จริง (Win Story)', gap: 'เก็บเคสความสำเร็จลูกค้า — Intentional Selector เชื่อหลักฐาน ไม่ใช่คำโฆษณา', page: 'team' },
      { ok: partners, done: 'มีคู่ค้า/เครือข่ายที่ช่วยบอกต่อ', gap: 'สร้างเครือข่าย/พาร์ทเนอร์ใน Marketplace เพื่อขยายการบอกต่อ', page: 'storefront' },
      { ok: !!d.buyingTriggers, done: 'เข้าใจแรงจูงใจซื้อ — ออกแบบให้อยากบอกต่อ', gap: 'วิเคราะห์แรงจูงใจซื้อ (buying triggers) เพื่อสร้างประสบการณ์ที่คนอยากบอกต่อ', page: 'marketing' },
    ]);

  const pillars = [found, remembered, recommended];
  const overall = Math.round(pillars.reduce((n, p) => n + p.score, 0) / pillars.length);
  const trail: IIAssessment['trail'] = overall >= 67 ? 'ชัดเจน' : overall >= 34 ? 'พอมี' : 'จาง';
  const weakest = pillars.slice().sort((a, b) => a.score - b.score)[0];
  const headline = overall >= 67
    ? 'ร่องรอยแบรนด์ของคุณชัดเจน — กลุ่มพลังเงียบมีโอกาสตามกลับมาหาคุณในวันที่เขาต้องการซื้อ'
    : `ร่องรอยแบรนด์ยัง${trail} — เริ่มปิดช่องว่างที่ “${weakest.thai}” ก่อน เพื่อให้กลุ่มพลังเงียบ ~39% ตามกลับมาเจอคุณ`;

  return { pillars, overall, trail, headline };
}
