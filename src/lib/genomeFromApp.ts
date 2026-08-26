/* genomeFromApp — สะพานที่หายไป: ข้อมูลจริงในแอป → Business Genome
 * (ปิดช่องว่างข้อ 3 ของห่วงโซ่ · Architecture Consolidation Audit §2 · 24 ส.ค. 2569)
 *
 * 🔴 ปัญหาที่แก้: `businessGenome.ts` ไม่ import `AppData` เลย
 *    ⇒ `stuckBranch()` / `readinessFromGenome()` ทำงานถูกต้อง **แต่ไม่เคยได้รับข้อมูลของใคร**
 *    ห่วงโซ่ Vision → Constitution → Genome → Decision Engine จึงขาดตรงกลาง
 *
 * 🧬 หลัก Dynamic PLG: **ระบบรู้อะไรแล้ว ห้ามถามซ้ำ**
 *    ไฟล์นี้เติมจีโนมจากสิ่งที่ผู้ใช้กรอกไว้แล้วในแอป
 *    เหลือช่องที่ยังว่างจริง ๆ เท่านั้นที่ค่อยถาม (`readinessCheck.ts`)
 *
 * ⚠️ ไม่แตะ schema · ไม่มี migration · อ่านอย่างเดียว (ด่านปล่อยของ: `releaseGates.ts` — ตอนเขียนยังกั้นอยู่)
 * pure ทั้งไฟล์
 */

import type { AppData } from '../types';
import type { GenomeData } from './businessGenome';

/** เก็บเฉพาะข้อความที่มีเนื้อจริง — ช่องว่าง/ช่องว่างล้วน ไม่นับว่ากรอกแล้ว */
const txt = (v: unknown): string | undefined => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length > 0 ? s : undefined;
};
const firstOf = (arr?: readonly string[]): string | undefined =>
  arr?.map((x) => txt(x)).find(Boolean);

/** รวมรายการเป็นประโยคเดียว — ใช้เมื่อจีโนมต้องการ "ข้อความ" แต่แอปเก็บเป็นอาเรย์ */
const joinOf = (arr?: readonly string[], max = 3): string | undefined => {
  const items = (arr ?? []).map((x) => txt(x)).filter(Boolean) as string[];
  return items.length ? items.slice(0, max).join(' · ') : undefined;
};

/** ลบคีย์ที่เป็น undefined ออก เพื่อให้ `genomeStatus` นับ "ช่องที่กรอกแล้ว" ได้ถูก */
function compact<T extends object>(o: T): Partial<T> | undefined {
  const e = Object.entries(o).filter(([, v]) => v !== undefined);
  return e.length ? (Object.fromEntries(e) as Partial<T>) : undefined;
}

/** ธุรกิจอยู่ขั้นไหน — อ่านจากพฤติกรรมจริง ไม่ใช่ให้ผู้ใช้ประเมินตัวเอง */
function stageOfBusiness(d: AppData): string | undefined {
  const hasRevenue = (d.finance ?? []).some((f) => f.kind === 'revenue' && f.amount > 0);
  const hasCustomer = (d.marketplace?.deals ?? []).length > 0;
  if (hasRevenue) return 'มีรายได้แล้ว';
  if (hasCustomer) return 'มีลูกค้าแล้ว แต่ยังไม่มีรายได้บันทึกไว้';
  if (d.onboardGoal) return 'idea';
  return undefined;
}

/**
 * แปลงข้อมูลในแอปเป็นจีโนม — เติมเท่าที่ "รู้จริง" เท่านั้น
 * ⚠️ ห้ามเดาแทนผู้ใช้: ช่องที่ไม่มีข้อมูลต้องปล่อยว่าง ไม่ใช่ใส่ค่าเริ่มต้น
 *    เพราะจีโนมที่ถูกเติมด้วยการเดา จะทำให้ `stuckBranch()` ชี้ผิดกิ่ง
 */
export function genomeFromApp(d: AppData): GenomeData {
  const bmc = d.businessModel?.bmc;
  const persona = (d.personas ?? [])[0];
  const g: GenomeData = {};

  g.business = compact({
    founderGoal: txt(d.aiCompany?.goal) ?? txt(d.onboardGoal),
    industry: txt(d.aiCompany?.industry) ?? firstOf(bmc?.activities),
    stage: stageOfBusiness(d),
  });

  g.customer = compact({
    segment: firstOf(bmc?.segments) ?? txt(persona?.role),
    persona: txt(persona?.name),
    jtbd: joinOf(persona?.goal),
    pain: joinOf(persona?.pains) ?? joinOf(persona?.fear),
    // ทริกเกอร์ยังไม่มีช่องเก็บตรง ๆ ในแอป — ปล่อยว่างไว้ ดีกว่าเดาจากอย่างอื่น
    buyingTrigger: undefined,
  });

  // ปัญหา: ถือว่า "มีหลักฐาน" ก็ต่อเมื่อมี feedback/ผลวิจัยจริง ไม่ใช่เพราะกรอก persona
  // 🔴 "มีหลักฐาน" ต้องมาจากผลวิจัย/เสียงลูกค้าจริง — ไม่ใช่เพราะกรอก persona ครบ
  const themes = (d.feedback?.themes ?? []).length;
  g.problem = compact({
    severity: joinOf(persona?.pains, 1),
    frequency: themes > 0 ? `พบซ้ำใน ${themes} ประเด็นจากเสียงลูกค้า` : undefined,
    evidence: (d.marketInsight?.segments ?? []).length
      ? `ผลวิจัยตลาด ${(d.marketInsight?.segments ?? []).length} กลุ่ม (บันทึก ${d.marketInsight?.savedAt ?? '-'})`
      : undefined,
  });

  g.offer = compact({
    valueProposition: joinOf(bmc?.value),
    pricing: firstOf(bmc?.revenue) ?? (d.roi?.avgDealValue ? `ดีลเฉลี่ย ${d.roi.avgDealValue} บาท` : undefined),
    objections: joinOf(persona?.fear),
  });

  g.acquisition = compact({
    channel: joinOf(bmc?.channels),
    // ⚠️ "สาร" คือสิ่งที่เราพูดกับลูกค้า — ชื่อช่องทางไม่ใช่สาร
    //    แอปยังไม่มีช่องเก็บสารโดยตรง ⇒ ใช้คุณค่าที่ประกาศไว้ใน BMC เท่านั้น
    message: joinOf(bmc?.value, 1),
    // 🔴 CAC ต้องมาจากตัวเลขจริงเท่านั้น — ไม่มีข้อมูลค่าโฆษณา = ปล่อยว่าง ห้ามคำนวณจากสมมติฐาน
    cac: undefined,
  });

  /* Outcome Tracker ของ BMC เก็บ metric/target/actual — แปลงเป็นภาษาของ Evidence Graph
   * ⚠️ `learning` ไม่มีช่องเก็บ ⇒ ต้องปล่อยว่าง เพราะ `confidenceOf()` ใช้ช่องนี้เป็นตัวตัดสิน
   *    ว่าเป็น `validated` หรือยัง — เติมมั่ว = เลื่อนชั้นหลักฐานให้ตัวเอง */
  // ⚠️ `actual` เป็นตัวเลข — ใช้ txt() ตรวจไม่ได้ (เคยพลาด: เลข 4 ถูกอ่านว่า 'ไม่มีข้อมูล')
  const outcome = (d.businessModel?.outcomes ?? []).find((o) => o.actual != null);
  g.experiment = compact({
    hypothesis: outcome ? `${outcome.metric} ควรถึง ${outcome.target}${outcome.unit ?? ''}` : undefined,
    method: outcome ? `ติดตามผ่านบล็อก ${outcome.block} ของ BMC` : undefined,
    result: outcome ? `ทำได้จริง ${outcome.actual}${outcome.unit ?? ''}` : undefined,
    learning: txt(outcome?.note),
  });

  const rev = (d.finance ?? []).filter((f) => f.kind === 'revenue').reduce((s, f) => s + f.amount, 0);
  const exp = (d.finance ?? []).filter((f) => f.kind === 'expense').reduce((s, f) => s + f.amount, 0);
  g.economics = compact({
    // มี "อัตรากำไร" ก็ต่อเมื่อมีทั้งรายรับและรายจ่ายจริง — มีด้านเดียวคำนวณไม่ได้
    margin: rev > 0 && exp > 0 ? `รายรับ ${rev} · รายจ่าย ${exp} บาท` : undefined,
    ltv: d.roi?.avgDealValue ? `ดีลเฉลี่ย ${d.roi.avgDealValue} บาท` : undefined,
    cac: undefined,
  });

  const processes = d.processRegister?.processes ?? [];
  const hasWhyFrom = processes.some((p) => p.metrics.some((m) => txt(m.whyFrom)));
  g.scale = compact({
    process: processes.length
      ? `${processes.length} กระบวนการในทะเบียน`
      : firstOf((d.sipoc ?? []).map((p) => p.name)),
    // 🔴 มี KPI ก็ต่อเมื่อตัววัดตอบได้ว่ามาจากอะไร — KPI ลอย ๆ ไม่นับ (มาตรฐานเดียวกับ processRegister)
    kpi: hasWhyFrom ? 'มีตัววัดที่ผูกกับความเสี่ยง/คุณค่าแล้ว' : undefined,
    risk: (d.iso9001?.nonconformities ?? []).length
      ? `บันทึกสิ่งที่ไม่เป็นไปตามข้อกำหนดไว้ ${(d.iso9001?.nonconformities ?? []).length} รายการ`
      : undefined,
    managementSystem: d.iso9001?.enabled ? 'ISO 9001' : undefined,
  });

  return g;
}
