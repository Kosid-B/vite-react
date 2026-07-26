/** PoC "เปิดร้านให้ฉัน" — goal 1 บรรทัด → ข้อมูลหน้าร้านครบ (ส่ง "งานเสร็จ" ไม่ใช่แค่คำแนะนำ)
 *  pure + testable · ใช้ร่วมกับ ai-assist (prod) และ fallback local */

export interface ShopDraft {
  name: string;
  dbd: string;
  description: string;
  services: string[];
  vp: string;
}

/** instruction+context สำหรับ ai-assist ให้คืน JSON หน้าร้านจากเป้าหมาย 1 บรรทัด */
export function openShopPrompt(goal: string): { instruction: string; context: string } {
  return {
    instruction:
      'จากเป้าหมายธุรกิจที่ให้ สร้างข้อมูลหน้าร้านออนไลน์ ตอบเป็น JSON อย่างเดียวใน summary ' +
      '(ห้ามมีข้อความอื่นนอก JSON) รูปแบบ: ' +
      '{"name":"ชื่อร้านสั้นกระชับ","dbd":"หมวดธุรกิจ","description":"คำอธิบาย 1-2 ประโยค",' +
      '"services":["สินค้า/บริการ 1","2","3"],"vp":"จุดขายหนึ่งประโยค ไม่เกิน 160 ตัวอักษร"} ' +
      'ทั้งหมดเป็นภาษาไทย เหมาะกับลูกค้าไทย',
    context: `เป้าหมายธุรกิจ: ${goal}`,
  };
}

/** parse JSON หน้าร้านจากข้อความ AI (ทนต่อข้อความห่อหน้า/หลัง) — คืน null ถ้าพัง/ไม่มีชื่อ */
export function parseShopDraft(text: string): ShopDraft | null {
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const o = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const name = String(o.name ?? '').trim();
    if (!name) return null;
    const services = Array.isArray(o.services)
      ? o.services.map(x => String(x).trim()).filter(Boolean).slice(0, 6)
      : [];
    return {
      name: name.slice(0, 80),
      dbd: String(o.dbd ?? '').trim().slice(0, 80),
      description: String(o.description ?? '').trim().slice(0, 300),
      services,
      vp: String(o.vp ?? '').trim().slice(0, 200),
    };
  } catch {
    return null;
  }
}

/** fallback ไม่มี AI / parse พัง — ร่างจากเป้าหมายตรง ๆ ให้ผู้ใช้ไม่มือเปล่า */
export function shopDraftLocal(goal: string): ShopDraft {
  const g = goal.trim();
  const name = (g.length > 40 ? g.slice(0, 40) : g) || 'ธุรกิจของฉัน';
  return {
    name,
    dbd: '',
    description: g ? `${g} — เน้นคุณภาพและการดูแลลูกค้า` : '',
    services: [],
    vp: g ? `ช่วยลูกค้าที่มองหา ${g} ด้วยบริการที่ไว้ใจได้ ราคาคุ้มค่า` : '',
  };
}
