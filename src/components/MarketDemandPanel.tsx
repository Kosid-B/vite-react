import { useEffect, useMemo, useState } from 'react';
import { latestSnapshot, type SnapshotRow } from '../lib/marketSnapshot';
import { kindStatFromCounts, statForText, roiEstimate, OPPORTUNITY_LABEL, type KindStat } from '../lib/marketDemandSupply';
import { type OfferKind } from '../lib/b2bMatching';
import { track } from '../lib/analytics';
import { useLandingTheme } from '../lib/landingTheme';

/* MarketDemandPanel — Demand/Supply Board บน Landing (first-party จริง)
 * พิมพ์ธุรกิจ → เห็นว่ามีคน "หา" กี่ราย / "ขาย" กี่ราย ในหมวดนั้น + ROI ง่าย ๆ
 * = หลักฐานว่ามีดีมานด์รออยู่จริง (แก้ pain รอ walk-in) → เหตุผลให้สมัคร */

const DARK_C = { border: '#1e293b', panel: 'rgba(15,23,42,0.6)', card: 'rgba(2,6,23,0.5)', white: '#fff', slate: '#94a3b8', cyan: '#22d3ee', cyan5: '#06b6d4', amber: '#f59e0b', green: '#4ade80', dark: '#020617', onAccent: '#ffffff' };
const LIGHT_C: typeof DARK_C = { border: '#e2e8f0', panel: '#ffffff', card: '#f1f5f9', white: '#0f172a', slate: '#475569', cyan: '#0891b2', cyan5: '#0e7490', amber: '#f59e0b', green: '#16a34a', dark: '#020617', onAccent: '#ffffff' };
const OPP_COLOR: Record<KindStat['opportunity'], string> = { high: DARK_C.green, balanced: DARK_C.cyan, saturated: DARK_C.amber };
const baht = (n: number) => '฿' + n.toLocaleString('th-TH');

export default function MarketDemandPanel({ onGetStarted, onEngage }: { onGetStarted: () => void; onEngage?: () => void }) {
  const C = useLandingTheme() === 'minimal' ? LIGHT_C : DARK_C;
  const [snap, setSnap] = useState<{ month: string; rows: SnapshotRow[] }>({ month: '', rows: [] });
  const [biz, setBiz] = useState('');
  const [walkin, setWalkin] = useState('');
  const [ticket, setTicket] = useState('');

  useEffect(() => { latestSnapshot().then(setSnap).catch(() => {}); }, []);

  const stats: KindStat[] = useMemo(
    () => snap.rows.map(r => kindStatFromCounts(r.kind as OfferKind, r.label, r.demand, r.supply)),
    [snap.rows],
  );
  const matched = useMemo(() => (biz.trim() ? statForText(biz, stats) : null), [biz, stats]);
  const topOpp = useMemo(() => stats.filter(s => s.opportunity === 'high').slice(0, 3), [stats]);

  // ROI: ออร์เดอร์เพิ่ม/เดือน ≈ ดีมานด์ในหมวด (RFQ) เป็นตัวตั้ง (สมมติรับได้ครึ่งหนึ่ง, ขั้นต่ำ 20)
  const extraOrders = matched ? Math.max(20, Math.round(matched.demand * 0.5)) : 30;
  const roi = useMemo(
    () => roiEstimate({ walkinPerDay: Number(walkin), avgTicket: Number(ticket), extraOrdersPerMonth: extraOrders }),
    [walkin, ticket, extraOrders],
  );

  const card: React.CSSProperties = { border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', background: C.card };
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.white, fontFamily: 'inherit', fontSize: 15 };

  return (
    <section style={{ padding: '20px 24px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', borderRadius: 16, border: `1px solid ${C.border}`, background: C.panel, padding: '22px 24px' }}>
        <div style={{ textAlign: 'center', fontSize: 'clamp(17px, 2.4vw, 22px)', fontWeight: 800, color: C.white }}>
          📈 ดีมานด์ในระบบตอนนี้ — <span style={{ color: C.cyan }}>มีคนกำลังหาสินค้า/บริการอยู่จริง</span>
        </div>
        <div style={{ textAlign: 'center', color: C.slate, fontSize: 13, margin: '4px 0 18px' }}>
          ข้อมูลจริงจากใบขอราคา (RFQ) และหน้าร้านในระบบ · {snap.month ? `อัปเดต ${snap.month} (ทุกวันที่ 1)` : 'อัปเดตทุกวันที่ 1'}
        </div>

        {stats.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: C.slate, fontSize: 14, lineHeight: 1.6 }}>
            ระบบเพิ่งเริ่ม — ยังมีดีมานด์ไม่พอแสดง<br />
            <b style={{ color: C.white }}>เปิดร้านเป็นเจ้าแรก ๆ ในหมวดของคุณ</b> แล้วรับดีมานด์ที่กำลังจะเข้ามา
          </div>
        ) : (
          <>
            <label style={{ display: 'block', color: C.slate, fontSize: 13, marginBottom: 6 }}>ธุรกิจของคุณคืออะไร?</label>
            <input value={biz} onChange={e => setBiz(e.target.value)} onBlur={() => { if (biz.trim()) { track('demand_lookup', { has_match: matched ? 1 : 0 }); onEngage?.(); } }}
                   placeholder="เช่น ร้านกาแฟ, รับทำบัญชี, ขนส่ง" style={input} />

            {biz.trim() && (
              <div style={{ ...card, marginTop: 12 }}>
                {matched ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, color: C.white }}>หมวด {matched.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: OPP_COLOR[matched.opportunity], border: `1px solid ${OPP_COLOR[matched.opportunity]}`, borderRadius: 6, padding: '2px 8px' }}>
                        {OPPORTUNITY_LABEL[matched.opportunity]}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
                      <div><div style={{ fontSize: 22, fontWeight: 800, color: C.cyan }}>{matched.demand}</div><div style={{ fontSize: 12, color: C.slate }}>🔎 คนกำลังหา (RFQ)</div></div>
                      <div><div style={{ fontSize: 22, fontWeight: 800, color: C.white }}>{matched.supply}</div><div style={{ fontSize: 12, color: C.slate }}>🏪 ร้านที่ขาย</div></div>
                    </div>
                  </>
                ) : (
                  <div style={{ color: C.slate, fontSize: 13.5, lineHeight: 1.6 }}>
                    ยังไม่มีดีมานด์บันทึกในหมวดนี้ — <b style={{ color: C.white }}>โอกาสเปิดร้านเจ้าแรก</b> ก่อนคู่แข่ง
                  </div>
                )}
              </div>
            )}

            {topOpp.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, color: C.slate }}>หมวดที่ดีมานด์ &gt; ร้าน:</span>
                {topOpp.map(o => (
                  <button key={o.kind} onClick={() => setBiz(o.label)} style={{ fontSize: 12, fontWeight: 700, color: C.green, background: 'rgba(74,222,128,0.1)', border: `1px solid ${C.green}`, borderRadius: 999, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {o.label} (+{o.gap})
                  </button>
                ))}
              </div>
            )}

            {/* ROI ง่าย ๆ */}
            <div style={{ ...card, marginTop: 14 }}>
              <div style={{ fontWeight: 800, color: C.white, fontSize: 14, marginBottom: 10 }}>💰 ลองคำนวณ: ถ้ารับดีมานด์ในระบบเพิ่ม</div>
              <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                <div><label style={{ fontSize: 12, color: C.slate }}>ลูกค้าเดินเข้า/วัน</label><input value={walkin} onChange={e => setWalkin(e.target.value)} inputMode="numeric" placeholder="เช่น 20" style={input} /></div>
                <div><label style={{ fontSize: 12, color: C.slate }}>ยอดเฉลี่ย/บิล (บาท)</label><input value={ticket} onChange={e => setTicket(e.target.value)} inputMode="numeric" placeholder="เช่น 60" style={input} /></div>
              </div>
              {roi.currentMonthly > 0 && (
                <div style={{ marginTop: 12, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  <div><div style={{ fontSize: 12, color: C.slate }}>ตอนนี้/เดือน</div><div style={{ fontWeight: 800, color: C.white }}>{baht(roi.currentMonthly)}</div></div>
                  <div><div style={{ fontSize: 12, color: C.slate }}>+ จากดีมานด์ (~{extraOrders} ออร์เดอร์)</div><div style={{ fontWeight: 800, color: C.green }}>+{baht(roi.extraMonthly)} (+{roi.upsidePct}%)</div></div>
                  <div><div style={{ fontSize: 12, color: C.slate }}>รวม/เดือน</div><div style={{ fontWeight: 800, color: C.cyan }}>{baht(roi.totalMonthly)}</div></div>
                </div>
              )}
              <div style={{ fontSize: 11, color: C.slate, marginTop: 8 }}>{roi.note}</div>
            </div>

            <button onClick={() => { track('demand_cta_click', {}); onGetStarted(); }}
                    style={{ width: '100%', marginTop: 14, background: C.amber, color: C.dark, border: 0, borderRadius: 12, padding: '13px 22px', fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>
              เปิดร้านรับดีมานด์นี้ — ฟรี ไม่ต้องสมัคร
            </button>
          </>
        )}
      </div>
    </section>
  );
}
