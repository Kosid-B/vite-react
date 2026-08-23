/**
 * ป้ายโปรโมทว่าแพลตฟอร์มพัฒนาตามมาตรฐาน ISO/IEC 27001:2022 (ISMS)
 * ใช้ในฟุตเตอร์ทั้งหน้า public และในแอป — ธีมมืด (cyan accent)
 * self-contained (มี <style> ในตัว) → เรนเดอร์สวยแม้หน้านั้นไม่ได้โหลด index.css (marketing landing)
 */
export default function IsmsBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`isms-badge${compact ? ' compact' : ''}`}
      title="แพลตฟอร์มพัฒนาและดูแลตามมาตรฐาน ISO/IEC 27001:2022 — ระบบบริหารความมั่นคงปลอดภัยสารสนเทศ (ISMS)"
    >
      <style>{ISMS_CSS}</style>
      <span aria-hidden="true">🛡️</span>
      พัฒนาตามมาตรฐาน <strong>ISO/IEC&nbsp;27001:2022</strong>
      <span className="isms-badge-sub">ISMS · ความมั่นคงปลอดภัยสารสนเทศ</span>
    </span>
  );
}

const ISMS_CSS = `
.isms-badge{ display:inline-flex; align-items:center; flex-wrap:wrap; justify-content:center; gap:6px;
  padding:6px 14px; border:1px solid rgba(6,182,212,.35); border-radius:999px; background:rgba(6,182,212,.08);
  color:#67e8f9; font-size:12px; font-weight:500; line-height:1.4; }
.isms-badge strong{ color:#a5f3fc; font-weight:700; white-space:nowrap; }
.isms-badge-sub{ color:rgba(103,232,249,.7); font-size:11px; font-weight:400; }
.isms-badge.compact{ width:100%; margin-top:8px; padding:7px 8px; font-size:11px; }
.isms-badge.compact .isms-badge-sub{ flex-basis:100%; text-align:center; font-size:10px; }

/* 🔴 ธีมสว่าง: สีไซแอนอ่อนข้างบนอ่านไม่ออกบนพื้นขาว (วัดได้ 1.19–1.39 = มองไม่เห็น)
   กติกา skill \`theme-safe-color\`: เขียนสีตัวอักษรตายตัวเมื่อไร ต้องเขียนคู่กับพื้นหลังเสมอ */
/* พื้นหลังต้อง **ทึบ** — ป้ายนี้ถูกวางบนพื้นเข้มของหน้า Landing ด้วย ทั้งที่ธีมเป็นสว่าง
   พื้นโปร่งใส = ตัวอักษรเข้มไปเจอพื้นเข้ม (วัดได้ 1.95 = มองไม่เห็น) */
:root[data-theme="minimal"] .isms-badge{ color:#0e7490; border-color:rgba(8,145,178,.45); background:#ecfeff; }
:root[data-theme="minimal"] .isms-badge strong{ color:#0b4f5e; }
:root[data-theme="minimal"] .isms-badge-sub{ color:#0e6072; }
:root[data-theme="minimal"] .isms-badge a{ color:#0e7490; }
`;
