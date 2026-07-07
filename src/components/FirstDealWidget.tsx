import { useEffect, useState } from 'react';
import type { AppData, PageId } from '../types';
import { loadFirstDealState, type FirstDealState } from '../lib/firstDeal';

interface Props {
  data: AppData;
  wsId: string | null;
  onNavigate: (page: PageId) => void;
}

/** ภารกิจ "ดีลแรกใน 30 วัน" — First Revenue Engine (แก้ churn)
 *  พา user ใหม่จากศูนย์ → ปิดดีลแรกให้เร็วที่สุด: คนที่มีรายได้แรกผ่านระบบจะอยู่ต่อ */
export default function FirstDealWidget({ data, wsId, onNavigate }: Props) {
  const [st, setSt] = useState<FirstDealState | null>(null);

  useEffect(() => {
    loadFirstDealState(data, wsId).then(setSt).catch(() => setSt(null));
    // โหลดครั้งเดียวต่อการเข้า Dashboard — สถานะเปลี่ยนเมื่อกลับมาหน้านี้ใหม่
  }, [wsId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!st) return null;

  if (st.hasFirstOrder) {
    return (
      <div className="fd-done">
        🎉 <b>คุณปิดดีลแรกแล้ว!</b> ธุรกิจของคุณมีรายได้ผ่านระบบ — ไปต่อ:
        รับงานเพิ่มจากประกาศงานกลาง หรือชวนคู่ค้ามาสร้างเครือข่าย
        <button className="fd-done-btn" onClick={() => onNavigate('trade')}>ไปหางานต่อ →</button>
      </div>
    );
  }

  const steps: { id: string; done: boolean; icon: string; label: string; hint: string; page: PageId; anchor?: string }[] = [
    { id: 'product', done: st.hasProduct, icon: '💡', label: 'เล่าไอเดีย/สินค้าของคุณ', hint: 'CEO AI จะร่างแผนธุรกิจให้', page: 'dashboard', anchor: 'bmc-idea' },
    { id: 'vp', done: st.hasVp, icon: '✨', label: 'ให้ AI เขียนจุดขาย (Value Proposition)', hint: 'ประโยคเดียวที่ทำให้ลูกค้าหยุดดู', page: 'storefront' },
    { id: 'publish', done: st.published, icon: '🏪', label: 'เผยแพร่หน้าร้าน', hint: 'ให้ลูกค้า/คู่ค้าค้นเจอคุณ', page: 'storefront' },
    { id: 'rfq', done: st.hasRfqActivity, icon: '📨', label: 'เสนอราคาแรก (RFQ)', hint: 'ดูประกาศงานกลาง — มีงานรอเสนอราคา', page: 'trade' },
    { id: 'deal', done: st.hasFirstOrder, icon: '💰', label: 'ปิดดีลแรก', hint: 'รายได้แรกของบริษัทคุณ', page: 'trade' },
  ];
  const doneCount = steps.filter(s => s.done).length;
  const next = steps.find(s => !s.done);
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="fd-panel">
      <div className="fd-head">
        <div className="fd-title">🎯 ภารกิจ: ปิดดีลแรกใน 30 วัน</div>
        <div className="fd-count">{doneCount}/{steps.length} ขั้น · เหลือ <b>{st.daysLeft} วัน</b></div>
      </div>
      <div className="fd-track"><div className="fd-fill" style={{ width: pct + '%' }} /></div>
      <div className="fd-steps">
        {steps.map(s => (
          <button key={s.id} className={`fd-step${s.done ? ' done' : ''}${next?.id === s.id ? ' next' : ''}`}
            onClick={() => {
              onNavigate(s.page);
              if (s.anchor) setTimeout(() => {
                const el = document.getElementById(s.anchor!);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el?.querySelector('textarea')?.focus();
              }, 90);
            }} title={s.hint}>
            <span className="fd-check">{s.done ? '✅' : next?.id === s.id ? '👉' : '⬜'}</span>
            <span className="fd-ico">{s.icon}</span>
            <span className="fd-label">{s.label}</span>
            {next?.id === s.id && <span className="fd-go">ทำเลย →</span>}
          </button>
        ))}
      </div>
      {next && (
        <div className="fd-nudge">
          {next.id === 'rfq' && st.published
            ? '💡 หน้าร้านพร้อมแล้ว — ไปที่ "ประกาศงานกลาง" ในหน้าซื้อขาย B2B มีงานเปิดรอให้เสนอราคาอยู่'
            : `ขั้นถัดไป: ${next.label} — ${next.hint}`}
        </div>
      )}
    </div>
  );
}
