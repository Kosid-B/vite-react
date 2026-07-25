// privacyNotice.ts — สร้างร่าง "ประกาศความเป็นส่วนตัว (PDPA Privacy Notice)" + SOP สั้น
// pure + testable · ทำงานออฟไลน์ได้ (เทมเพลตเติมข้อมูล) และมี prompt สำหรับให้ AI ขัดเกลาต่อ
// อ้างอิง พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) — ไม่ใช่คำแนะนำทางกฎหมาย ใช้เป็นร่างตั้งต้น

export type DocType = "privacy" | "sop";

export interface PrivacyInput {
  bizName: string;           // ชื่อกิจการ/องค์กร (ผู้ควบคุมข้อมูล)
  bizType?: string;          // ประเภทธุรกิจ (เช่น ร้านค้าออนไลน์, โรงงาน)
  website?: string;          // เว็บไซต์/ช่องทาง
  dataCollected: string[];   // ข้อมูลที่เก็บ (ชื่อ, เบอร์, อีเมล, ที่อยู่, …)
  purposes: string[];        // วัตถุประสงค์การใช้
  thirdParties?: string[];   // เปิดเผยให้ใคร (ขนส่ง, ผู้ให้บริการชำระเงิน, …)
  retention?: string;        // ระยะเวลาเก็บ
  contactEmail?: string;
  contactPhone?: string;
  docType?: DocType;         // default 'privacy'
}

const DEFAULT_DATA = ["ชื่อ-นามสกุล", "เบอร์โทรศัพท์", "อีเมล"];
const DEFAULT_PURPOSES = ["ติดต่อและให้บริการลูกค้า", "ดำเนินการตามคำสั่งซื้อ/สัญญา"];

/** เติมค่าที่ขาดให้ปลอดภัย (กัน array ว่าง) */
export function normalizeInput(input: PrivacyInput): Required<Omit<PrivacyInput, "docType">> & { docType: DocType } {
  return {
    bizName: (input.bizName || "องค์กรของเรา").trim(),
    bizType: (input.bizType || "").trim(),
    website: (input.website || "").trim(),
    dataCollected: input.dataCollected?.length ? input.dataCollected : DEFAULT_DATA,
    purposes: input.purposes?.length ? input.purposes : DEFAULT_PURPOSES,
    thirdParties: input.thirdParties ?? [],
    retention: (input.retention || "ตามระยะเวลาที่จำเป็นต่อวัตถุประสงค์ หรือที่กฎหมายกำหนด").trim(),
    contactEmail: (input.contactEmail || "").trim(),
    contactPhone: (input.contactPhone || "").trim(),
    docType: input.docType ?? "privacy",
  };
}

const bullet = (items: string[]) => items.map((x) => `- ${x}`).join("\n");

/** ร่าง PDPA Privacy Notice (เทมเพลต deterministic — ใช้ได้ทันทีแบบออฟไลน์) */
export function buildPrivacyNoticeDraft(input: PrivacyInput): string {
  const d = normalizeInput(input);
  const contact = [
    d.contactEmail && `อีเมล: ${d.contactEmail}`,
    d.contactPhone && `โทร: ${d.contactPhone}`,
    d.website && `เว็บไซต์: ${d.website}`,
  ].filter(Boolean).join(" · ") || "(โปรดระบุช่องทางติดต่อ)";

  return `# ประกาศความเป็นส่วนตัว (Privacy Notice)
**${d.bizName}**${d.bizType ? ` — ${d.bizType}` : ""}

ประกาศฉบับนี้อธิบายวิธีที่ ${d.bizName} ("เรา") เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของท่าน ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)

## 1. ข้อมูลส่วนบุคคลที่เราเก็บรวบรวม
${bullet(d.dataCollected)}

## 2. วัตถุประสงค์ในการเก็บและใช้ข้อมูล
${bullet(d.purposes)}

## 3. ฐานทางกฎหมายในการประมวลผล
เราประมวลผลข้อมูลของท่านบนฐาน: การปฏิบัติตามสัญญา, ความยินยอม, ประโยชน์โดยชอบด้วยกฎหมาย และ/หรือการปฏิบัติตามกฎหมายที่เกี่ยวข้อง

## 4. การเปิดเผยข้อมูลแก่บุคคลภายนอก
${d.thirdParties.length ? bullet(d.thirdParties) : "เราจะไม่เปิดเผยข้อมูลของท่านแก่บุคคลภายนอก เว้นแต่ได้รับความยินยอมหรือเพื่อปฏิบัติตามกฎหมาย"}

## 5. ระยะเวลาการเก็บรักษาข้อมูล
${d.retention}

## 6. สิทธิของเจ้าของข้อมูลส่วนบุคคล
ท่านมีสิทธิตาม PDPA ได้แก่ สิทธิเข้าถึง · ขอแก้ไข · ขอลบ · คัดค้าน · ระงับการใช้ · ขอโอนย้ายข้อมูล · และเพิกถอนความยินยอม โดยติดต่อเราได้ตามช่องทางด้านล่าง

## 7. มาตรการรักษาความปลอดภัย
เราจัดให้มีมาตรการรักษาความมั่นคงปลอดภัยที่เหมาะสม เพื่อป้องกันการเข้าถึง ใช้ เปลี่ยนแปลง หรือเปิดเผยข้อมูลโดยมิชอบ

## 8. คุกกี้ (Cookies)
เว็บไซต์ของเราอาจใช้คุกกี้เพื่อพัฒนาประสบการณ์การใช้งาน ท่านสามารถตั้งค่าเบราว์เซอร์เพื่อปฏิเสธคุกกี้ได้

## 9. ช่องทางติดต่อ (ผู้ควบคุมข้อมูลส่วนบุคคล)
${contact}

## 10. การเปลี่ยนแปลงประกาศ
เราอาจปรับปรุงประกาศนี้เป็นครั้งคราว โดยจะเผยแพร่ฉบับล่าสุดผ่านช่องทางของเรา

> ⚠️ ร่างนี้เป็นแม่แบบตั้งต้นตาม PDPA — ควรให้ผู้เชี่ยวชาญ/ที่ปรึกษากฎหมายตรวจทานก่อนใช้จริง`;
}

/** ร่าง SOP สั้น (จัดการคำขอใช้สิทธิของเจ้าของข้อมูล — Data Subject Request) */
export function buildSopDraft(input: PrivacyInput): string {
  const d = normalizeInput(input);
  return `# ขั้นตอนการปฏิบัติงาน (SOP): การจัดการคำขอใช้สิทธิเจ้าของข้อมูลส่วนบุคคล
**${d.bizName}** · ตาม PDPA พ.ศ. 2562

## วัตถุประสงค์
กำหนดขั้นตอนรับและตอบสนองคำขอใช้สิทธิ (เข้าถึง/แก้ไข/ลบ/คัดค้าน/โอนย้าย/เพิกถอนความยินยอม) ภายในกรอบเวลาที่กฎหมายกำหนด

## ขั้นตอน
1. **รับคำขอ** — ผ่านช่องทาง: ${[d.contactEmail, d.contactPhone].filter(Boolean).join(" / ") || "(ระบุช่องทาง)"}
2. **ยืนยันตัวตน** ผู้ยื่นคำขอ เพื่อป้องกันการเข้าถึงโดยมิชอบ
3. **บันทึกคำขอ** ลงทะเบียน (วันที่รับ, ประเภทสิทธิ, ผู้รับผิดชอบ)
4. **ตรวจสอบและดำเนินการ** ตามประเภทสิทธิ ภายใน 30 วัน (ขยายได้ตามเหตุจำเป็นพร้อมแจ้งเหตุผล)
5. **แจ้งผล** แก่เจ้าของข้อมูลเป็นลายลักษณ์อักษร
6. **จัดเก็บหลักฐาน** การดำเนินการเพื่อการตรวจสอบย้อนกลับ

## ผู้รับผิดชอบ
ผู้ควบคุมข้อมูลส่วนบุคคล / เจ้าหน้าที่คุ้มครองข้อมูล (DPO) ของ ${d.bizName}

> ⚠️ ร่างตั้งต้น — ปรับให้เข้ากับกระบวนการจริงและให้ผู้เชี่ยวชาญตรวจทาน`;
}

export function buildDraft(input: PrivacyInput): string {
  return (input.docType ?? "privacy") === "sop" ? buildSopDraft(input) : buildPrivacyNoticeDraft(input);
}

/** system prompt ให้ AI (Typhoon/Claude) ขัดเกลาร่างให้เข้ากับบริบทองค์กร */
export function privacySystemPrompt(): string {
  return "คุณคือที่ปรึกษาด้านการคุ้มครองข้อมูลส่วนบุคคล (PDPA) และระบบมาตรฐานของไทย " +
    "ร่างเอกสารภาษาไทยที่ถูกต้องตามกฎหมาย ชัดเจน เป็นมืออาชีพ พร้อมนำไปปรับใช้จริง " +
    "อ้างอิง พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 อย่างถูกต้อง ไม่แต่งข้อกฎหมายเกินจริง " +
    "ตอบเป็นเอกสาร Markdown เท่านั้น (ไม่ต้องเกริ่นนำ)";
}

/** user prompt ให้ AI จากข้อมูล + ร่างเทมเพลตเป็นฐาน */
export function privacyUserPrompt(input: PrivacyInput): string {
  const d = normalizeInput(input);
  const kind = d.docType === "sop" ? "ขั้นตอนการปฏิบัติงาน (SOP) การจัดการคำขอใช้สิทธิเจ้าของข้อมูล" : "ประกาศความเป็นส่วนตัว (Privacy Notice)";
  return `ช่วยร่าง "${kind}" ตาม PDPA ให้องค์กรนี้ โดยปรับให้เข้ากับบริบท:\n` +
    `- องค์กร: ${d.bizName}${d.bizType ? ` (${d.bizType})` : ""}\n` +
    `- ข้อมูลที่เก็บ: ${d.dataCollected.join(", ")}\n` +
    `- วัตถุประสงค์: ${d.purposes.join(", ")}\n` +
    (d.thirdParties.length ? `- เปิดเผยให้: ${d.thirdParties.join(", ")}\n` : "") +
    `- ระยะเวลาเก็บ: ${d.retention}\n` +
    (d.contactEmail || d.contactPhone || d.website ? `- ติดต่อ: ${[d.contactEmail, d.contactPhone, d.website].filter(Boolean).join(" · ")}\n` : "") +
    `\nใช้ร่างตั้งต้นนี้เป็นฐานแล้วขัดเกลาให้สมบูรณ์ขึ้น (ครบสิทธิ PDPA, ฐานกฎหมาย, ความปลอดภัย):\n\n${buildDraft(input)}`;
}
