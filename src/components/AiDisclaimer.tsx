/* AiDisclaimer — ป้าย "🤖 AI แนะนำ" + ข้อความกำกับ ตามนโยบายคอนเทนต์ AI ข้อ 4-5
 * ใช้ใต้ผลลัพธ์ AI ในแอป (CFO, Market Sizing ฯลฯ) — เตือนว่าเป็นคำแนะนำประกอบการตัดสินใจ
 * โปร่งใส = สร้างความเชื่อมั่น (Dark AI Marketing #24) โดยไม่รบกวนการใช้งาน */
export default function AiDisclaimer({ note }: { note: string }) {
  return (
    <div className="ai-disclaimer">
      <span className="ai-disclaimer-badge">🤖 AI แนะนำ</span>
      <span className="ai-disclaimer-note">{note}</span>
    </div>
  );
}
