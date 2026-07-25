// complianceCheck.ts — ตรวจเอกสาร (คู่มือคุณภาพ/นโยบาย/ขั้นตอน) เทียบข้อกำหนดมาตรฐาน หา gap
// pure + testable · heuristic ออฟไลน์ (keyword) ใช้ได้ทันที + prompt ให้ AI วิเคราะห์ลึก (Typhoon/Claude)
// ไม่ใช่การตรวจรับรอง (certification) — เป็นเครื่องช่วยเตรียมความพร้อมก่อน audit

export type ClauseStatus = "covered" | "partial" | "missing";
export type StandardId = "iso9001" | "iso14001" | "iso45001" | "iso22301" | "tis";

export interface ClauseSpec { id: string; title: string; keywords: string[] }
export interface ClauseResult { id: string; title: string; status: ClauseStatus; note: string }

export const STANDARD_LABEL: Record<StandardId, string> = {
  iso9001: "ISO 9001:2015 (ระบบบริหารคุณภาพ)",
  iso14001: "ISO 14001:2015 (ระบบการจัดการสิ่งแวดล้อม)",
  iso45001: "ISO 45001:2018 (อาชีวอนามัยและความปลอดภัย)",
  iso22301: "ISO 22301 (ความต่อเนื่องทางธุรกิจ)",
  tis: "มอก. (มาตรฐานผลิตภัณฑ์อุตสาหกรรม)",
};

// ข้อกำหนดหลักที่ auditable ของ ISO 9001:2015 (ข้อ 4–10) + คำสำคัญสำหรับ heuristic ออฟไลน์
export const ISO9001_CLAUSES: ClauseSpec[] = [
  { id: "4", title: "บริบทองค์กร (Context)", keywords: ["บริบท", "ผู้มีส่วนได้ส่วนเสีย", "ขอบเขต", "context", "stakeholder", "scope", "กระบวนการ"] },
  { id: "5", title: "ความเป็นผู้นำ (Leadership)", keywords: ["นโยบายคุณภาพ", "ผู้นำ", "ความมุ่งมั่น", "บทบาท", "ความรับผิดชอบ", "policy", "leadership"] },
  { id: "6", title: "การวางแผน (Planning)", keywords: ["ความเสี่ยง", "โอกาส", "วัตถุประสงค์คุณภาพ", "แผน", "risk", "objective", "planning"] },
  { id: "7", title: "การสนับสนุน (Support)", keywords: ["ทรัพยากร", "ความสามารถ", "การฝึกอบรม", "เอกสารสารสนเทศ", "การสื่อสาร", "competence", "training", "document"] },
  { id: "8", title: "การดำเนินงาน (Operation)", keywords: ["การควบคุมการผลิต", "ข้อกำหนดลูกค้า", "การออกแบบ", "ผู้ส่งมอบ", "ควบคุมผลิตภัณฑ์ไม่เป็นไปตาม", "operation", "production"] },
  { id: "9", title: "การประเมินสมรรถนะ (Performance)", keywords: ["ตรวจติดตามภายใน", "internal audit", "ทบทวนฝ่ายบริหาร", "management review", "ความพึงพอใจลูกค้า", "วัดผล", "kpi"] },
  { id: "10", title: "การปรับปรุง (Improvement)", keywords: ["ปฏิบัติการแก้ไข", "corrective action", "ความไม่เป็นไปตามข้อกำหนด", "ปรับปรุงอย่างต่อเนื่อง", "nonconformity", "improvement"] },
];

/** clauses ต่อมาตรฐาน — ตอนนี้ heuristic ละเอียดเฉพาะ iso9001, อื่น ๆ ใช้โครง 4–10 เดียวกันเป็นฐาน */
export function clausesFor(_standard: StandardId): ClauseSpec[] {
  return ISO9001_CLAUSES;
}

const norm = (s: string) => s.toLowerCase();

/** heuristic ออฟไลน์: นับคำสำคัญที่พบต่อข้อ → covered(≥2) / partial(1) / missing(0) */
export function heuristicCheck(docText: string, standard: StandardId = "iso9001"): ClauseResult[] {
  const text = norm(docText || "");
  return clausesFor(standard).map((c) => {
    const hits = c.keywords.filter((k) => text.includes(norm(k)));
    const status: ClauseStatus = hits.length >= 2 ? "covered" : hits.length === 1 ? "partial" : "missing";
    const note = hits.length
      ? `พบหลักฐานคำสำคัญ: ${hits.slice(0, 3).join(", ")}`
      : "ไม่พบเนื้อหาที่เกี่ยวข้องในเอกสาร — ควรเพิ่ม";
    return { id: c.id, title: c.title, status, note };
  });
}

/** คะแนนความพร้อม (%) — covered=1, partial=0.5, missing=0 */
export function readinessScore(results: ClauseResult[]): number {
  if (!results.length) return 0;
  const w = results.reduce((s, r) => s + (r.status === "covered" ? 1 : r.status === "partial" ? 0.5 : 0), 0);
  return Math.round((w / results.length) * 100);
}

/** รายการข้อที่ยังขาด/อ่อน (ไว้โชว์ "ต้องทำอะไรต่อ") */
export function gaps(results: ClauseResult[]): ClauseResult[] {
  return results.filter((r) => r.status !== "covered");
}

export function complianceSystemPrompt(): string {
  return "คุณคือผู้ตรวจประเมิน (auditor) ระบบมาตรฐานของไทยที่มีประสบการณ์ " +
    "วิเคราะห์เอกสารที่ผู้ใช้ให้มา เทียบกับข้อกำหนดของมาตรฐาน ระบุว่าแต่ละข้อ 'ครบ/บางส่วน/ขาด' อย่างตรงไปตรงมา " +
    "อ้างอิงข้อกำหนดจริง ไม่แต่งเกินจริง ตอบเป็น JSON เท่านั้น (ภาษาไทย)";
}

/** user prompt: ฝังเอกสาร + ขอผลเป็น JSON ต่อข้อ (ให้ตรงกับ parseComplianceJson) */
export function compliancePrompt(docText: string, standard: StandardId): string {
  const clauseList = clausesFor(standard).map((c) => `${c.id}. ${c.title}`).join("\n");
  return `มาตรฐานที่ตรวจ: ${STANDARD_LABEL[standard]}\n\n` +
    `ข้อกำหนดหลักที่ต้องประเมิน (ข้อ 4–10):\n${clauseList}\n\n` +
    `เอกสารขององค์กร:\n"""\n${docText.slice(0, 8000)}\n"""\n\n` +
    `ประเมินแต่ละข้อว่า covered/partial/missing พร้อมเหตุผลสั้นและสิ่งที่ต้องเพิ่ม ` +
    `ตอบ JSON: {"results":[{"id":"4","status":"covered|partial|missing","note":"..."}],"summary":"สรุปภาพรวม + ขั้นต่อไป"}`;
}

/** parse ผล AI → ClauseResult[] (เติม title จาก spec, กันค่าเพี้ยน) */
export function parseComplianceJson(text: string, standard: StandardId): { results: ClauseResult[]; summary: string } | null {
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s === -1 || e === -1) return null;
  let obj: { results?: { id?: string; status?: string; note?: string }[]; summary?: string };
  try { obj = JSON.parse(text.slice(s, e + 1)); } catch { return null; }
  const specs = clausesFor(standard);
  const valid: ClauseStatus[] = ["covered", "partial", "missing"];
  const results: ClauseResult[] = (obj.results ?? []).map((r) => {
    const spec = specs.find((c) => c.id === String(r.id));
    const status = (valid.includes(r.status as ClauseStatus) ? r.status : "missing") as ClauseStatus;
    return { id: String(r.id ?? "?"), title: spec?.title ?? `ข้อ ${r.id}`, status, note: r.note ?? "" };
  });
  return { results, summary: obj.summary ?? "" };
}
