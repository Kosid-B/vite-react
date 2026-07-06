import type { AuthNudge as Nudge } from '../lib/authNudge';

/* ===== AuthNudge — ประสบการณ์ก่อนสมัคร (ไม่ใช่ข้อความขาย) =====
 * แสดงสัญลักษณ์การเติบโต (imprint) + คำมั่นทางอารมณ์ + เครดิตจริง + offer จริง
 * micro-entrance เร็ว (<1s) สร้างอารมณ์ทันที · logic เลือก variant + GA อยู่ที่ Auth (ตัววัดผล) */

export default function AuthNudge({ nudge }: { nudge: Nudge }) {
  return (
    <div className={`authnudge angle-${nudge.angle}`}>
      <div className="authnudge-symbol" aria-hidden="true">{nudge.symbol}</div>
      <div className="authnudge-headline">{nudge.headline}</div>
      <div className="authnudge-body">{nudge.body}</div>
      <div className="authnudge-chip">🎁 {nudge.chip}</div>
      <div className="authnudge-proof">✓ {nudge.proof}</div>
    </div>
  );
}
