// knowledgeBase.ts — RAG Knowledge Base (Fireworks Playbook · ฟีเจอร์ #4, Phase 4a)
// ถาม-ตอบข้อกำหนด ISO 9001 / PDPA / มอก. จากฐานความรู้ที่ curate ไว้ + ตอบด้วย AI แบบอ้างอิงแหล่ง
// pure + testable · retrieval แบบ keyword (ฐานความรู้ bounded) — ไม่ต้องมี pgvector/embeddings/secret ใหม่
// Phase 4b (อนาคต): เพิ่ม pgvector + embeddings เพื่อรองรับเอกสารที่ผู้ใช้อัปโหลดเอง (ไม่จำกัด)

export type KBTopic = "iso9001" | "pdpa" | "tis" | "general";

export interface KBChunk { id: string; topic: KBTopic; source: string; title: string; text: string }

// ─── ฐานความรู้ที่ curate (สรุปข้อกำหนดจริง — ใช้เป็นร่าง/อ้างอิง ไม่ใช่คำแนะนำทางกฎหมาย) ───
export const KNOWLEDGE: KBChunk[] = [
  // ISO 9001:2015 (ข้อ 4–10)
  { id: "iso-4", topic: "iso9001", source: "ISO 9001:2015 ข้อ 4", title: "บริบทองค์กร (Context of the organization)",
    text: "องค์กรต้องเข้าใจบริบทภายใน/ภายนอกที่กระทบเป้าหมายคุณภาพ ระบุผู้มีส่วนได้ส่วนเสียและความต้องการ กำหนดขอบเขต (scope) ของระบบบริหารคุณภาพ และกำหนดกระบวนการที่จำเป็นพร้อมปฏิสัมพันธ์ระหว่างกัน" },
  { id: "iso-5", topic: "iso9001", source: "ISO 9001:2015 ข้อ 5", title: "ความเป็นผู้นำ (Leadership)",
    text: "ผู้บริหารสูงสุดต้องแสดงความเป็นผู้นำและความมุ่งมั่น กำหนดและสื่อสารนโยบายคุณภาพ (quality policy) มุ่งเน้นลูกค้า และกำหนดบทบาท ความรับผิดชอบ และอำนาจหน้าที่ในองค์กรให้ชัดเจน" },
  { id: "iso-6", topic: "iso9001", source: "ISO 9001:2015 ข้อ 6", title: "การวางแผน (Planning)",
    text: "องค์กรต้องระบุความเสี่ยงและโอกาส (risks and opportunities) วางแผนจัดการ กำหนดวัตถุประสงค์คุณภาพ (quality objectives) ที่วัดผลได้พร้อมแผนบรรลุผล และวางแผนการเปลี่ยนแปลงอย่างเป็นระบบ" },
  { id: "iso-7", topic: "iso9001", source: "ISO 9001:2015 ข้อ 7", title: "การสนับสนุน (Support)",
    text: "องค์กรต้องจัดหาทรัพยากร (บุคลากร โครงสร้างพื้นฐาน สภาพแวดล้อม) กำหนดความสามารถ (competence) และการฝึกอบรม สร้างความตระหนัก การสื่อสาร และควบคุมเอกสารสารสนเทศ (documented information)" },
  { id: "iso-8", topic: "iso9001", source: "ISO 9001:2015 ข้อ 8", title: "การดำเนินงาน (Operation)",
    text: "ครอบคลุมการวางแผนและควบคุมการปฏิบัติงาน ข้อกำหนดผลิตภัณฑ์/บริการและการทบทวนกับลูกค้า การออกแบบและพัฒนา การควบคุมผู้ส่งมอบภายนอก การผลิตและบริการ และการควบคุมผลิตภัณฑ์ที่ไม่เป็นไปตามข้อกำหนด (nonconforming output)" },
  { id: "iso-9", topic: "iso9001", source: "ISO 9001:2015 ข้อ 9", title: "การประเมินสมรรถนะ (Performance evaluation)",
    text: "องค์กรต้องเฝ้าติดตาม วัด วิเคราะห์และประเมินผล รวมถึงความพึงพอใจลูกค้า ดำเนินการตรวจติดตามภายใน (internal audit) ตามรอบที่วางแผน และจัดการทบทวนฝ่ายบริหาร (management review) เพื่อให้มั่นใจว่าระบบยังเหมาะสมและมีประสิทธิผล" },
  { id: "iso-10", topic: "iso9001", source: "ISO 9001:2015 ข้อ 10", title: "การปรับปรุง (Improvement)",
    text: "เมื่อพบความไม่เป็นไปตามข้อกำหนด (nonconformity) ต้องดำเนินการแก้ไขและปฏิบัติการแก้ไข (corrective action) ที่ขจัดสาเหตุราก และมุ่งปรับปรุงระบบบริหารคุณภาพอย่างต่อเนื่อง (continual improvement)" },

  // PDPA (พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562)
  { id: "pdpa-base", topic: "pdpa", source: "PDPA มาตรา 24/26", title: "ฐานทางกฎหมายในการประมวลผล",
    text: "การเก็บ ใช้ เปิดเผยข้อมูลส่วนบุคคลต้องมีฐานทางกฎหมายอย่างใดอย่างหนึ่ง เช่น ความยินยอม การปฏิบัติตามสัญญา การปฏิบัติตามกฎหมาย ประโยชน์สำคัญต่อชีวิต ภารกิจสาธารณะ หรือประโยชน์โดยชอบด้วยกฎหมาย (legitimate interest) ข้อมูลอ่อนไหว (มาตรา 26) มีเงื่อนไขเข้มกว่า" },
  { id: "pdpa-consent", topic: "pdpa", source: "PDPA มาตรา 19", title: "ความยินยอม (Consent)",
    text: "ความยินยอมต้องขอโดยชัดแจ้ง แยกจากเงื่อนไขอื่น ใช้ภาษาที่เข้าใจง่าย แจ้งวัตถุประสงค์ชัดเจน และเจ้าของข้อมูลถอนความยินยอมได้ทุกเมื่อโดยง่ายเท่ากับตอนให้" },
  { id: "pdpa-rights", topic: "pdpa", source: "PDPA มาตรา 30–36", title: "สิทธิของเจ้าของข้อมูลส่วนบุคคล",
    text: "เจ้าของข้อมูลมีสิทธิ: เข้าถึงและขอสำเนา ขอแก้ไขให้ถูกต้อง ขอลบ/ทำลาย ขอระงับการใช้ คัดค้านการประมวลผล ขอให้โอนย้ายข้อมูล (data portability) และถอนความยินยอม ผู้ควบคุมข้อมูลต้องตอบสนองภายในกรอบเวลาที่เหมาะสม" },
  { id: "pdpa-notice", topic: "pdpa", source: "PDPA มาตรา 23", title: "การแจ้ง (Privacy Notice)",
    text: "ก่อนหรือขณะเก็บข้อมูล ผู้ควบคุมข้อมูลต้องแจ้ง: วัตถุประสงค์ ข้อมูลที่เก็บ ระยะเวลาเก็บ ผู้ที่อาจเปิดเผยให้ สิทธิของเจ้าของข้อมูล และช่องทางติดต่อ ผ่านประกาศความเป็นส่วนตัว (Privacy Notice)" },
  { id: "pdpa-security", topic: "pdpa", source: "PDPA มาตรา 37", title: "หน้าที่ด้านความมั่นคงปลอดภัยและแจ้งเหตุละเมิด",
    text: "ผู้ควบคุมข้อมูลต้องจัดมาตรการรักษาความมั่นคงปลอดภัยที่เหมาะสม และเมื่อเกิดเหตุละเมิดข้อมูลส่วนบุคคลต้องแจ้งสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส./PDPC) ภายใน 72 ชั่วโมงเมื่อมีความเสี่ยงต่อสิทธิเสรีภาพของบุคคล" },
  { id: "pdpa-dpo", topic: "pdpa", source: "PDPA มาตรา 41", title: "เจ้าหน้าที่คุ้มครองข้อมูล (DPO)",
    text: "องค์กรบางประเภท (เช่น ประมวลผลข้อมูลจำนวนมากเป็นกิจกรรมหลัก หรือข้อมูลอ่อนไหว) ต้องแต่งตั้งเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO) เพื่อให้คำแนะนำและตรวจสอบการปฏิบัติตามกฎหมาย" },

  // มอก.
  { id: "tis-cert", topic: "tis", source: "มอก. (สมอ.)", title: "การขอรับรองมาตรฐานผลิตภัณฑ์ (มอก.)",
    text: "การขอ มอก. ยื่นต่อสำนักงานมาตรฐานผลิตภัณฑ์อุตสาหกรรม (สมอ./TISI) โดยทั่วไปต้องมีระบบควบคุมคุณภาพในโรงงาน ผ่านการตรวจโรงงาน (factory audit) และการทดสอบผลิตภัณฑ์ตามมาตรฐานที่เกี่ยวข้อง จึงจะได้ใบอนุญาตแสดงเครื่องหมาย มอก." },
];

const STOP = new Set(["และ", "หรือ", "ของ", "ที่", "การ", "ให้", "ต้อง", "เป็น", "ใน", "กับ", "the", "a", "an", "of", "to", "is", "for", "and", "or"]);

/** แตกคำค้น (ไทย+อังกฤษ) — อังกฤษ = คำแม่นยำ, ไทย = n-gram 3–4 (2-gram รบกวนมากจึงตัดทิ้ง) */
export function tokens(s: string): string[] {
  const lower = (s || "").toLowerCase();
  const en = (lower.match(/[a-z0-9]{2,}/g) ?? []).filter((t) => !STOP.has(t));
  const thai = (lower.match(/[฀-๿]+/g) ?? []).flatMap((seg) => {
    const out: string[] = [];
    for (let n = 3; n <= 4; n++) for (let i = 0; i + n <= seg.length; i++) {
      const g = seg.slice(i, i + n);
      if (!STOP.has(g)) out.push(g);
    }
    return out;
  });
  return [...en, ...thai];
}

const isEn = (t: string) => /^[a-z0-9]+$/.test(t);

/** ให้คะแนน chunk — อังกฤษ (แม่นยำ) หนักกว่าไทย n-gram · title หนักกว่า text */
function score(queryToks: string[], chunk: KBChunk): number {
  const title = chunk.title.toLowerCase();
  const text = chunk.text.toLowerCase();
  let s = 0;
  const seen = new Set<string>();
  for (const t of queryToks) {
    if (seen.has(t)) continue; seen.add(t);
    const w = isEn(t) ? 2 : 1; // คำอังกฤษเทคนิค (internal/audit/PDPA) แม่นกว่า → ถ่วงหนักกว่า
    if (title.includes(t)) s += 2 * w;
    else if (text.includes(t)) s += w;
  }
  return s;
}

/** ดึง chunk ที่เกี่ยวข้องที่สุด top-k (กรอง topic ได้) — คืน [] ถ้าไม่เจอเลย */
export function retrieve(query: string, k = 4, topic?: KBTopic): KBChunk[] {
  const qt = tokens(query);
  if (!qt.length) return [];
  const pool = topic ? KNOWLEDGE.filter((c) => c.topic === topic) : KNOWLEDGE;
  return pool
    .map((c) => ({ c, s: score(qt, c) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => x.c);
}

/** สร้าง context สำหรับป้อน AI (มี [ref] ให้ AI อ้างอิงได้) */
export function buildContext(chunks: KBChunk[]): string {
  if (!chunks.length) return "(ไม่พบข้อมูลที่เกี่ยวข้องในฐานความรู้)";
  return chunks.map((c, i) => `[${i + 1}] ${c.source} — ${c.title}\n${c.text}`).join("\n\n");
}

/** instruction ให้ AI ตอบโดยยึดเฉพาะ context + อ้างอิงหมายเลข */
export function ragInstruction(question: string): string {
  return `ตอบคำถามต่อไปนี้โดย "อ้างอิงเฉพาะข้อมูลใน context ที่ให้มา" เท่านั้น ` +
    `ถ้า context ไม่พอให้บอกตรง ๆ ว่าข้อมูลไม่พอ อย่าเดา ` +
    `ใส่หมายเลขอ้างอิง [1][2] ท้ายประโยคที่ใช้ข้อมูลนั้น ตอบเป็นภาษาไทยกระชับ\n\nคำถาม: ${question}`;
}
