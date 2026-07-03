import { useState } from 'react';
import type { Storefront } from '../lib/storefront';
import type { Rfq } from '../lib/trade';
import {
  matchRfqs, matchPartners, agentSummaryLocal,
  type RfqMatch, type PartnerMatch,
} from '../lib/marketAgent';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import { trackAiCall } from '../lib/usage';
import { track } from '../lib/analytics';

/** 🤝 Marketplace Agent — เอเจนต์บริหารตลาด จับคู่สินค้า/บริการใน ecosystem
 *  กดปุ่มเดียว: จับคู่ร้านของฉัน ↔ งานกลางที่ควรเสนอราคา + คู่ค้าที่ควรติดต่อ
 *  พร้อมคำแนะนำจาก AI (production: Claude ผ่าน ai-assist · local: สรุปอัตโนมัติ) */

interface Props {
  mySf: Storefront | null;
  openJobs: Rfq[];
  stores: Storefront[];
  onQuote: (rfqId: string) => void; // เปิดฟอร์มเสนอราคางานกลาง
}

const baht = (n: number) => '฿' + n.toLocaleString();

export default function MarketAgent({ mySf, openJobs, stores, onQuote }: Props) {
  const [busy, setBusy] = useState(false);
  const [ran, setRan] = useState(false);
  const [rfqMatches, setRfqMatches] = useState<RfqMatch[]>([]);
  const [partners, setPartners] = useState<PartnerMatch[]>([]);
  const [summary, setSummary] = useState('');

  async function run() {
    if (!mySf) return;
    setBusy(true);
    const rm = matchRfqs(mySf, openJobs);
    const pm = matchPartners(mySf, stores);
    track('agent_match_run', { rfq_matches: rm.length, partner_matches: pm.length });
    setRfqMatches(rm);
    setPartners(pm);
    setRan(true);

    // คำแนะนำ: production ให้ Claude สรุป — local/ผิดพลาด ใช้สรุปอัตโนมัติ
    const fallback = agentSummaryLocal(mySf, rm, pm);
    if (isSupabaseEnabled && supabase && (rm.length > 0 || pm.length > 0)) {
      try {
        trackAiCall();
        const { data: res, error } = await supabase.functions.invoke('ai-assist', {
          body: {
            page: 'trade',
            pageLabel: 'Marketplace Agent',
            instruction: 'คุณคือเอเจนต์บริหารตลาด แนะนำเจ้าของร้านสั้นๆ (2-3 ประโยค ภาษาไทย) ว่าควรทำอะไรก่อนเพื่อปิดดีล จากผลจับคู่นี้ — ตอบเฉพาะคำแนะนำใน summary',
            context: `ร้านของฉัน: ${mySf.name} (${mySf.dbd}) ขาย: ${mySf.services.join(', ')}\n` +
              `งานที่จับคู่ได้: ${rm.map(m => `"${m.rfq.title}" งบ${baht(m.rfq.budget)} เหตุผล: ${m.reasons.join('/')}`).join(' | ') || 'ไม่มี'}\n` +
              `คู่ค้าที่จับคู่ได้: ${pm.map(m => `"${m.sf.name}" เหตุผล: ${m.reasons.join('/')}`).join(' | ') || 'ไม่มี'}`,
          },
        });
        if (error) throw error;
        setSummary((res?.summary ?? '').trim() || fallback);
      } catch {
        setSummary(fallback);
      }
    } else {
      setSummary(fallback);
    }
    setBusy(false);
  }

  return (
    <div className="magent">
      <div className="magent-hd">
        <div>
          <div className="magent-title">🤝 Marketplace Agent</div>
          <div className="magent-sub">เอเจนต์บริหารตลาด — จับคู่สินค้า/บริการของร้านคุณกับงานและคู่ค้าใน ecosystem</div>
        </div>
        <button className="magent-run" onClick={run} disabled={busy || !mySf}
          title={mySf ? '' : 'ต้องมีหน้าร้านก่อน — เปิดจากเมนู "หน้าร้านของฉัน"'}>
          {busy ? '⏳ เอเจนต์กำลังจับคู่…' : ran ? '🔄 จับคู่ใหม่' : '✨ ให้เอเจนต์จับคู่ธุรกิจ'}
        </button>
      </div>

      {ran && !busy && (
        <>
          {summary && <div className="magent-summary">🤖 {summary}</div>}

          {rfqMatches.length > 0 && (
            <>
              <div className="magent-sec">💼 งานกลางที่ควรเสนอราคา ({rfqMatches.length})</div>
              {rfqMatches.map(m => (
                <div key={m.rfq.id} className="magent-row">
                  <div className="magent-main">
                    <div className="magent-name">{m.rfq.title}
                      <span className="magent-score">คะแนนจับคู่ {m.score}</span>
                    </div>
                    <div className="magent-why">{m.reasons.join(' · ')}</div>
                  </div>
                  <button className="magent-act" onClick={() => onQuote(m.rfq.id)}>💰 เสนอราคา</button>
                </div>
              ))}
            </>
          )}

          {partners.length > 0 && (
            <>
              <div className="magent-sec">🤝 คู่ค้าที่ควรติดต่อ ({partners.length})</div>
              {partners.map(m => (
                <div key={m.sf.slug} className="magent-row">
                  <div className="magent-main">
                    <div className="magent-name">{m.sf.name}
                      <span className="magent-score">คะแนนจับคู่ {m.score}</span>
                    </div>
                    <div className="magent-why">{m.reasons.join(' · ')}</div>
                  </div>
                  <a className="magent-act ghost" href={`/b/${encodeURIComponent(m.sf.slug)}`} target="_blank" rel="noreferrer">
                    🏪 ดูหน้าร้าน
                  </a>
                </div>
              ))}
            </>
          )}

          {rfqMatches.length === 0 && partners.length === 0 && (
            <div className="trade-empty">ยังไม่พบคู่ที่เหมาะ — เพิ่มสินค้า/บริการเด่นในหน้าร้าน แล้วลองจับคู่ใหม่</div>
          )}
        </>
      )}
    </div>
  );
}
