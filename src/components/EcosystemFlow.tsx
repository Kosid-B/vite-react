import type { AppData, PageId } from '../types';
import { ecosystemFlow } from '../lib/ecosystemFlow';

/** แถบวงจรธุรกิจครบวงจร — เห็นทุกด่านในภาพเดียว + ด่านถัดไป + คลิกไปทำต่อทันที
 *  ทำให้ loop (24-Step→BMC→การตลาด→ทรัพยากร→การเงิน→เมือง→Marketplace) ไหลง่าย/เร็วขึ้น */
export default function EcosystemFlow({ data, onNavigate }: { data: AppData; onNavigate: (p: PageId) => void }) {
  const f = ecosystemFlow(data);

  return (
    <div className="eco">
      <div className="eco-hd">
        <span className="eco-title">🔄 วงจรธุรกิจของคุณ</span>
        <span className="eco-pct">{f.doneCount}/{f.total} ด่าน</span>
        {f.nextStage && (
          <button className="eco-next-btn" onClick={() => onNavigate(f.nextStage!.page)}>
            ทำต่อ: {f.nextStage.icon} {f.nextStage.label} →
          </button>
        )}
      </div>
      <div className="eco-rail">
        {f.stages.map((s, i) => (
          <div className="eco-node-wrap" key={s.id}>
            <button
              className={`eco-node ${s.status}${f.nextStage?.id === s.id ? ' next' : ''}`}
              onClick={() => onNavigate(s.page)}
              title={s.next}
            >
              <span className="eco-node-ico">{s.status === 'done' ? '✅' : s.icon}</span>
              <span className="eco-node-label">{s.label}</span>
              <span className="eco-node-metric">{s.metric}</span>
            </button>
            {i < f.stages.length - 1 && <span className="eco-arrow">→</span>}
          </div>
        ))}
        <span className="eco-loop" title="วนกลับไปพัฒนาต่อเนื่อง">↺</span>
      </div>
      {f.nextStage && <div className="eco-hint">👉 {f.nextStage.next}</div>}
    </div>
  );
}
