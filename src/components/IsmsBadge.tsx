/**
 * ป้ายโปรโมทว่าแพลตฟอร์มพัฒนาตามมาตรฐาน ISO/IEC 27001:2022 (ISMS)
 * ใช้ในฟุตเตอร์ทั้งหน้า public และในแอป — ธีมมืด (cyan accent)
 */
export default function IsmsBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`isms-badge${compact ? ' compact' : ''}`}
      title="แพลตฟอร์มพัฒนาและดูแลตามมาตรฐาน ISO/IEC 27001:2022 — ระบบบริหารความมั่นคงปลอดภัยสารสนเทศ (ISMS)"
    >
      <span aria-hidden="true">🛡️</span>
      พัฒนาตามมาตรฐาน <strong>ISO/IEC&nbsp;27001:2022</strong>
      <span className="isms-badge-sub">ISMS · ความมั่นคงปลอดภัยสารสนเทศ</span>
    </span>
  );
}
