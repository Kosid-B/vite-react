import type { AppData, PageId } from '../types';
import { systemOverview } from '../lib/systemOverview';
import { fmtBaht } from '../lib/finance';

/** ภาพรวมทุกระบบในภาพเดียว (read-only) — การ์ดสรุปคลิกไปหน้านั้นได้ */
export default function SystemOverview({ data, onNavigate }: { data: AppData; onNavigate: (p: PageId) => void }) {
  const o = systemOverview(data);
  const netClass = o.finance.net > 0 ? 'so-pos' : o.finance.net < 0 ? 'so-neg' : '';

  return (
    <div className="so-wrap">
      <div className="so-title">ภาพรวมระบบ</div>
      <div className="so-grid">
        <button className="so-card" onClick={() => onNavigate('aicompany')} style={{ borderTopColor: '#6b3fa0' }}>
          <div className="so-head">🤖 บริษัท AI {o.aiCompany.running && <span className="so-live">▶ running</span>}</div>
          <div className="so-big">{o.aiCompany.agents}<span className="so-unit"> ตำแหน่ง</span></div>
          <div className="so-sub">กำลังทำ {o.aiCompany.active} · เสร็จ {o.aiCompany.done} งาน</div>
        </button>

        <button className="so-card" onClick={() => onNavigate('boardroom')} style={{ borderTopColor: '#1a4f8a' }}>
          <div className="so-head">🏛️ ห้องบอร์ด</div>
          <div className="so-big">{o.board.gatesApproved}<span className="so-unit">/{o.board.gatesTotal} gate</span></div>
          <div className="so-sub">บริหาร Lv{o.board.bizLevel} · การตลาด Lv{o.board.mktLevel}</div>
        </button>

        <button className="so-card" onClick={() => onNavigate('resources')} style={{ borderTopColor: '#c44b2b' }}>
          <div className="so-head">📦 ทรัพยากร {o.resources.pending > 0 && <span className="so-warn">{o.resources.pending} รออนุมัติ</span>}</div>
          <div className="so-big">{o.resources.count}<span className="so-unit"> รายการ</span></div>
          <div className="so-sub">ต้นทุน {fmtBaht(o.resources.monthlyCost)}/เดือน</div>
        </button>

        <button className="so-card" onClick={() => onNavigate('city')} style={{ borderTopColor: '#2d6a4f' }}>
          <div className="so-head">💰 การเงิน {o.finance.breakEven && <span className="so-live">คุ้มทุน</span>}</div>
          <div className={`so-big ${netClass}`}>{fmtBaht(o.finance.net)}</div>
          <div className="so-sub">รายได้ {fmtBaht(o.finance.revenue)} · รายจ่าย {fmtBaht(o.finance.expense)}</div>
        </button>

        <button className="so-card" onClick={() => onNavigate('city')} style={{ borderTopColor: '#a05c1a' }}>
          <div className="so-head">🏙️ เมืองบริษัท</div>
          <div className="so-big">{o.city.tier || '—'}</div>
          <div className="so-sub">{o.city.xp.toLocaleString('en-US')} XP · โต {o.city.pctToNext}% สู่ระดับถัดไป</div>
        </button>
      </div>
    </div>
  );
}
