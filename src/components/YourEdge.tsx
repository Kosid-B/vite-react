import { useEffect, useMemo } from 'react';
import type { AppData } from '../types';
import { businessBrainScore, CHATBOT_DIFF } from '../lib/moatMeter';
import { track } from '../lib/analytics';

/* ===== Your Edge — "ความได้เปรียบของคุณ" (Moat Meter) =====
 * แสดง "สมอง AI" ที่ธุรกิจคุณสะสมจากข้อมูลจริง + ต่างจากแชตบอตทั่วไปยังไง
 * ดาร์กมาร์เก็ตติ้งเชิงจริยธรรม: first-party data + retention (loss aversion) แบบโปร่งใส ไม่หลอก */

export default function YourEdge({ data }: { data: AppData }) {
  const r = useMemo(() => businessBrainScore({
    financeEntries: (data.finance ?? []).length,
    opsDays: (data.opsData?.entries ?? []).length,
    dealsClosed: (data.marketplace?.deals ?? []).filter((d) => d.status === 'closed').length,
    agents: data.aiCompany.agents.length,
    skillsLearned: (data.aiCompany.purchasedSkills ?? []).length,
    streakDays: data.streak?.count ?? 0,
  }), [data]);

  useEffect(() => { track('your_edge_viewed', { score: r.score, tier: r.tier.key }); }, [r.score, r.tier.key]);

  return (
    <div className="edge">
      <div className="edge-hd">
        <div className="edge-title">🏰 ความได้เปรียบของคุณ — สมอง AI ที่คู่แข่งลอกไม่ได้</div>
        <span className="edge-sub">ยิ่งใช้ ยิ่งสะสมข้อมูลจริง → AI ยิ่งรู้จักธุรกิจคุณ · นี่คือสิ่งที่แชตบอตทั่วไปไม่มี</span>
      </div>

      <div className="edge-score">
        <div className="edge-ring" style={{ ['--pct' as string]: `${r.score}` }}>
          <span className="edge-ring-num">{r.score}</span>
          <span className="edge-ring-lbl">/ 100</span>
        </div>
        <div className="edge-tier">
          <div className="edge-tier-name">{r.tier.emoji} {r.tier.label}</div>
          <div className="edge-tier-msg">{r.tier.msg}</div>
        </div>
      </div>

      <div className="edge-assets">
        {r.assets.map((a) => (
          <div key={a.key} className={`edge-asset ${a.filled ? 'on' : ''}`}>
            <span className="edge-asset-ic">{a.filled ? '✅' : '⬜'}</span>
            <div className="edge-asset-body">
              <div className="edge-asset-top">
                <span className="edge-asset-label">{a.label}</span>
                <span className="edge-asset-count">{a.count > 0 ? a.count : '—'}</span>
              </div>
              <div className="edge-asset-note">{a.note}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="edge-switch">🔒 {r.switchingNote}</div>
      <div className="edge-next">👉 ก้าวต่อไป: {r.nextStep}</div>

      <div className="edge-vs">
        <div className="edge-vs-hd">CEO AI Thailand <span>vs</span> แชตบอตทั่วไป</div>
        {CHATBOT_DIFF.map((d, i) => (
          <div key={i} className="edge-vs-row">
            <span className="edge-vs-them">✖ {d.them}</span>
            <span className="edge-vs-us">✔ {d.us}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
