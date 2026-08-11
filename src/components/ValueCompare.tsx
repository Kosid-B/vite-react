import { useLandingTheme } from '../lib/landingTheme';
import { COMPARE_ROWS, COMPARE_COLS, COMPARE_VERDICT } from '../lib/valueCompare';

/* ValueCompare — ตารางเทียบ "ทำเอง vs จ้างคน vs CEO AI" ใต้ hero/differentiators
 * แก้ pain "ไม่ชัดว่าต่างกันยังไง" (Dark AI Marketing #2/#16) — ไฮไลต์คอลัมน์ CEO AI = คุ้มสุด
 * responsive: จอเล็กเลื่อนแนวนอน (overflow-x) ไม่ทำให้ body scroll เพี้ยน */
export default function ValueCompare({ onGetStarted }: { onGetStarted: () => void }) {
  const light = useLandingTheme() === 'minimal';
  const C = light
    ? { bg: '#f8fafc', panel: '#ffffff', ink: '#0f172a', sub: '#475569', border: '#e2e8f0', cyan: '#0891b2', amber: '#f59e0b', ourBg: 'rgba(6,182,212,0.07)', ourBorder: '#0891b2', head: '#f1f5f9' }
    : { bg: '#020617', panel: '#0f172a', ink: '#ffffff', sub: '#94a3b8', border: '#1e293b', cyan: '#22d3ee', amber: '#fbbf24', ourBg: 'rgba(6,182,212,0.10)', ourBorder: '#0891b2', head: 'rgba(15,23,42,0.6)' };

  const cell: React.CSSProperties = { padding: '13px 16px', fontSize: 13.5, lineHeight: 1.5, verticalAlign: 'top', borderBottom: `1px solid ${C.border}` };
  const ourCell: React.CSSProperties = { ...cell, background: C.ourBg, color: C.ink, fontWeight: 600 };

  return (
    <section style={{ padding: '72px 24px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(24px, 3.4vw, 32px)', fontWeight: 700, color: C.ink, marginBottom: 12 }}>
          เทียบชัด ๆ — <span style={{ color: C.cyan }}>ทำเอง</span> · <span style={{ color: C.cyan }}>จ้างคน</span> · <span style={{ color: C.amber }}>CEO AI</span>
        </h2>
        <p style={{ textAlign: 'center', color: C.sub, fontSize: 15, maxWidth: 620, margin: '0 auto 36px', lineHeight: 1.6 }}>
          ไม่ใช่แค่ “AI ตอบคำถาม” — เทียบด้านที่สำคัญกับ SME จริง ๆ ว่าทางไหนคุ้มเวลา คุ้มเงิน เสี่ยงน้อยกว่า
        </p>

        <div style={{ overflowX: 'auto', borderRadius: 16, border: `1px solid ${C.border}`, background: C.panel }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 680 }}>
            <thead>
              <tr>
                <th style={{ ...cell, textAlign: 'left', background: C.head, color: C.sub, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>เทียบที่</th>
                <th style={{ ...cell, textAlign: 'left', background: C.head, color: C.ink, fontWeight: 700 }}>{COMPARE_COLS.diy.icon} {COMPARE_COLS.diy.label}</th>
                <th style={{ ...cell, textAlign: 'left', background: C.head, color: C.ink, fontWeight: 700 }}>{COMPARE_COLS.hire.icon} {COMPARE_COLS.hire.label}</th>
                <th style={{ ...cell, textAlign: 'left', background: C.ourBg, color: C.cyan, fontWeight: 800, borderBottom: `2px solid ${C.ourBorder}`, whiteSpace: 'nowrap' }}>{COMPARE_COLS.ours.icon} {COMPARE_COLS.ours.label}</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((r) => (
                <tr key={r.aspect}>
                  <td style={{ ...cell, color: C.ink, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.icon} {r.aspect}</td>
                  <td style={{ ...cell, color: C.sub }}>{r.diy}</td>
                  <td style={{ ...cell, color: C.sub }}>{r.hire}</td>
                  <td style={ourCell}>✅ {r.ours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ textAlign: 'center', color: C.ink, fontSize: 15, lineHeight: 1.7, maxWidth: 680, margin: '26px auto 0' }}>
          <span style={{ color: C.amber, fontWeight: 700 }}>สรุป:</span> {COMPARE_VERDICT}
        </p>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button
            onClick={onGetStarted}
            style={{ padding: '14px 34px', borderRadius: 12, border: 'none', background: C.amber, color: '#020617', fontFamily: 'inherit', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
          >
            เริ่มแบบ CEO AI — ฟรี 15 วัน ไม่ต้องใช้บัตร
          </button>
        </div>
      </div>
    </section>
  );
}
