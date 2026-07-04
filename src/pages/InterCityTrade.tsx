import { useMemo } from 'react';
import type { AppData, PageId } from '../types';
import { tradeReport, closeTrade, type TradeOpportunity } from '../lib/interCityTrade';
import { fmtBaht } from '../lib/finance';
import { PAYMENT } from '../config';
import { track } from '../lib/analytics';

/* ===== การค้าระหว่างเมืองธุรกิจ — CEO+CMO อัตโนมัติ, บอร์ดกำกับ ===== */

export default function InterCityTrade({ data, onUpdate, onNavigate }: {
  data: AppData; onUpdate: (d: AppData) => void; onNavigate: (p: PageId) => void;
}) {
  const r = useMemo(() => tradeReport(data), [data]);

  function close(op: TradeOpportunity) {
    onUpdate(closeTrade(data, op));
    track('intercity_trade_closed', { direction: op.direction, value: op.estValue });
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">🏙️↔🏙️ การค้าระหว่างเมืองธุรกิจ</div>
        <div className="page-meta">
          <span className="meta-chip">CEO + CMO ดำเนินการอัตโนมัติ</span>
          <span className="meta-chip">บอร์ดกำกับ</span>
        </div>
      </div>

      <p className="sipoc-intro">
        <b>CEO</b> จับคู่โอกาสค้าขายระหว่างเมืองของคุณกับธุรกิจอื่นในระบบ · <b>CMO</b> ให้คะแนนและแนะนำดีลที่ควรปิดก่อน —
        บอร์ด (คุณ) ตรวจรายงานแล้วกด “ปิดการค้า” · ทุกดีลที่ปิดจะลงบัญชีการเงินอัตโนมัติ ทำให้เมืองบริษัทของคุณเติบโต
      </p>

      {/* รายงานบอร์ด (auto โดย agent) */}
      <div className="ict-cards">
        <div className="ict-card"><span>โอกาสค้าขาย</span><b>{r.count}</b></div>
        <div className="ict-card"><span>มูลค่าประเมิน (GMV)</span><b>{fmtBaht(r.gmv)}</b></div>
        <div className="ict-card"><span>ค่าธรรมเนียม {r.feePct}%</span><b>{fmtBaht(r.fee)}</b></div>
        <div className="ict-card net"><span>คาดสุทธิ</span><b>{fmtBaht(r.net)}</b></div>
        <div className="ict-card done"><span>ปิดดีลแล้ว</span><b>{r.closedCount} · {fmtBaht(r.closedGmv)}</b></div>
      </div>

      {/* ช่องทางรับ/จ่ายเงินจริง — gate ด้วย xenditLive */}
      <div className={`ict-pay ${PAYMENT.xenditLive ? 'live' : 'soon'}`}>
        {PAYMENT.xenditLive
          ? '💳 รับ/จ่ายเงินออนไลน์อัตโนมัติผ่าน Xendit เปิดใช้งานแล้ว — ปิดดีลแล้วชำระได้ทันที'
          : '⏳ ระบบรับ/จ่ายเงินออนไลน์ (Xendit) กำลังเปิดใช้เร็วๆ นี้ — ระหว่างนี้ชำระ/รับผ่านโอน–สแกน QR แล้วส่งสลิป (ดีลยังปิดและลงบัญชีได้ปกติ)'}
      </div>

      {/* รายการโอกาส — CEO source, CMO score */}
      {r.count === 0 ? (
        <div className="ict-empty">
          ยังไม่มีโอกาสค้าขายใหม่ — เพิ่มพาร์ตเนอร์ในระบบ หรือ{' '}
          <button className="ict-link" onClick={() => onNavigate('market')}>ดู Marketplace ตัวจับคู่ →</button>
        </div>
      ) : (
        <div className="ict-list">
          {r.opportunities.map(op => (
            <div key={op.id} className="ict-op">
              <div className={`ict-dir ${op.direction}`}>{op.direction === 'sell' ? '🔺 ขายให้' : '🔻 ซื้อจาก'}</div>
              <div className="ict-op-body">
                <div className="ict-op-partner">🏙️ {op.partner} <span className="ict-op-loc">· {op.location} · {op.category}</span></div>
                <div className="ict-op-item">{op.item}</div>
                <div className="ict-op-score">
                  <span className="ict-op-score-bar"><i style={{ width: `${op.score}%` }} /></span>
                  CMO ให้คะแนน {op.score}/99
                </div>
              </div>
              <div className="ict-op-right">
                <div className="ict-op-val">{fmtBaht(op.estValue)}</div>
                <button className="ict-op-close" onClick={() => close(op)}>ปิดการค้า</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="ict-foot">
        💡 ดีลที่ปิด: <b>ขาย</b> → ลงเป็น <span className="ict-rev">รายได้</span> (หักค่าธรรมเนียม {r.feePct}%) ·
        <b> ซื้อ</b> → ลงเป็น <span className="ict-exp">รายจ่าย</span> — ดูผลรวมได้ที่ 💰 คลังเมือง ในหน้า{' '}
        <button className="ict-link" onClick={() => onNavigate('city')}>เมืองบริษัท →</button>
      </p>
    </div>
  );
}
