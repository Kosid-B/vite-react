import type { AppData, PageId } from '../types';
import { weeklyDigest } from '../lib/weeklyDigest';
import { fmtBaht } from '../lib/finance';

/* การ์ด "สรุปสัปดาห์นี้" บน Dashboard — ดึงข้อมูลจริงมาสรุป + ปุ่มทำต่อ (retention) */
export default function WeeklyDigest({ data, onNavigate }: { data: AppData; onNavigate: (p: PageId) => void }) {
  const dg = weeklyDigest(data);

  return (
    <div className="wd-card">
      <div className="wd-head">
        <span className="wd-title">🗓️ สรุปสัปดาห์นี้</span>
        <span className="wd-badge" style={{ background: dg.levelColor }}>{dg.levelBadge} {dg.levelRank}</span>
        <span className="wd-week">{dg.weekTag}</span>
      </div>

      <div className="wd-stats">
        <div className="wd-stat"><span>รายได้</span><b>{fmtBaht(dg.revenue)}</b></div>
        <div className="wd-stat"><span>รายจ่าย</span><b>{fmtBaht(dg.expense)}</b></div>
        <div className={`wd-stat ${dg.net >= 0 ? 'pos' : 'neg'}`}><span>สุทธิ</span><b>{fmtBaht(dg.net)}</b></div>
        <div className="wd-stat"><span>🔥 ต่อเนื่อง</span><b>{dg.streak} วัน</b></div>
      </div>

      <ul className="wd-highlights">
        {dg.highlights.map((h, i) => <li key={i}>{h}</li>)}
      </ul>

      {dg.nextAction && (
        <button className="wd-cta" onClick={() => { onNavigate(dg.nextAction!.page); window.scrollTo({ top: 0 }); }}>
          👉 ทำต่อ: {dg.nextAction.label} →
        </button>
      )}
    </div>
  );
}
