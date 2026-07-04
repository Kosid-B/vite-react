import type { AppData } from '../types';
import { rewardViews, claimReward } from '../lib/rewards';
import { track } from '../lib/analytics';

/* ===== รางวัลเมือง — รับรางวัลจริงจากการเล่นเกม (ส่วนลด/featured/ของแต่งเมือง) ===== */

export default function CityRewards({ data, onUpdate }: { data: AppData; onUpdate: (d: AppData) => void }) {
  const rewards = rewardViews(data);

  function claim(id: string) {
    onUpdate(claimReward(data, id));
    track('reward_claimed', { reward: id });
  }

  return (
    <div className="rw-panel">
      <div className="rw-hd">
        🎁 รางวัลเมือง
        <span className="rw-sub">ทำเป้าหมายจริง → รับรางวัลจริง</span>
      </div>
      <div className="rw-list">
        {rewards.map(r => (
          <div key={r.id} className={`rw-item${r.isClaimed ? ' claimed' : r.isUnlocked ? ' ready' : ' locked'}`}>
            <span className="rw-ico">{r.isUnlocked || r.isClaimed ? r.icon : '🔒'}</span>
            <div className="rw-body">
              <div className="rw-title">{r.title}</div>
              <div className="rw-desc">{r.desc}</div>
            </div>
            {r.isClaimed
              ? <span className="rw-done">✅ รับแล้ว</span>
              : r.isUnlocked
                ? <button className="rw-claim" onClick={() => claim(r.id)}>รับรางวัล</button>
                : <span className="rw-lock">ยังไม่ปลดล็อก</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
