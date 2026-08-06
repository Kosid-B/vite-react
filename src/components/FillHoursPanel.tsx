import { useMemo, useState } from 'react';
import { recurringBuyersFor } from '../lib/recurringDemand';
import { flashPromo, loyaltyTips } from '../lib/slowHourBooster';
import { facebookShareUrl } from '../lib/shareLinks';
import { track } from '../lib/analytics';

/* FillHoursPanel — "เติมชั่วโมงว่าง" แก้ pain ร้านรอ walk-in (จากภาพจริง: สเต็กลุงใหญ่ · คาร์แคร์)
 * (A) หาดีมานด์ประจำ (B2B ใกล้ตัว) + สคริปต์ทัก · (B) โปรฯ ช่วงว่าง + ลูกค้าเก่ากลับ */

const C = { border: '#1e293b', panel: 'rgba(15,23,42,0.55)', card: 'rgba(2,6,23,0.45)', white: '#fff', slate: '#94a3b8', cyan: '#22d3ee', green: '#4ade80', amber: '#f59e0b', dark: '#020617', line: '#06C755', fb: '#1877F2' };

function copy(text: string, done: () => void) {
  navigator.clipboard?.writeText(text).then(done).catch(() => {});
}
const lineText = (text: string, url: string) => `https://line.me/R/msg/text/?${encodeURIComponent(text + '\n' + url)}`;

export default function FillHoursPanel({ shopName, shopText, publicUrl }: { shopName: string; shopText: string; publicUrl: string }) {
  const [tab, setTab] = useState<'demand' | 'slow'>('demand');
  const [copied, setCopied] = useState('');
  const [pct, setPct] = useState('15');
  const [from, setFrom] = useState('14:00');
  const [to, setTo] = useState('16:00');

  const buyers = useMemo(() => recurringBuyersFor(shopText, shopName), [shopText, shopName]);
  const promo = useMemo(() => flashPromo(shopName, shopText, { discountPct: Number(pct), from, to }), [shopName, shopText, pct, from, to]);
  const tips = useMemo(() => loyaltyTips(shopText), [shopText]);
  const promoText = `${promo.headline}\n${promo.body}\n${promo.hashtags}`;

  const flash = (k: string) => { setCopied(k); setTimeout(() => setCopied(''), 1800); };
  const card: React.CSSProperties = { border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', background: C.card };
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: '1px solid #334155', background: 'rgba(2,6,23,0.5)', color: C.white, fontFamily: 'inherit', fontSize: 14 };
  const tabBtn = (on: boolean): React.CSSProperties => ({ flex: 1, padding: '9px 10px', borderRadius: 9, border: `1px solid ${on ? C.cyan : C.border}`, background: on ? 'rgba(6,182,212,0.14)' : 'transparent', color: on ? C.cyan : C.slate, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' });
  const ghost: React.CSSProperties = { background: 'transparent', color: C.cyan, border: `1px solid ${C.cyan}`, borderRadius: 7, padding: '6px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' };

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', background: C.panel, marginTop: 18 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.white }}>🕐 เติมชั่วโมงว่าง — เลิกพึ่งลูกค้า walk-in สุ่ม</div>
      <div style={{ fontSize: 12.5, color: C.slate, margin: '3px 0 14px' }}>ของดี ราคาถูกอยู่แล้ว — เพิ่มดีมานด์ที่คาดการณ์ได้ให้เต็มชั่วโมงที่เงียบ</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button style={tabBtn(tab === 'demand')} onClick={() => setTab('demand')}>A · หาดีมานด์ประจำ</button>
        <button style={tabBtn(tab === 'slow')} onClick={() => setTab('slow')}>B · ดึงคนช่วงว่าง</button>
      </div>

      {tab === 'demand' ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 12.5, color: C.slate }}>ลูกค้าประจำใกล้ตัวที่ควรทักไปหา (แปลง walk-in → ออร์เดอร์รออยู่แล้ว):</div>
          {buyers.map((b, i) => (
            <div key={i} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 800, color: C.white, fontSize: 14 }}>{b.buyer}</span>
                <span style={{ fontSize: 11.5, color: C.green, fontWeight: 700 }}>🔁 {b.cadence}</span>
              </div>
              <div style={{ fontSize: 12.5, color: C.slate, marginTop: 5 }}>💡 {b.why}</div>
              <div style={{ fontSize: 12.5, color: C.cyan, marginTop: 4 }}>ข้อเสนอ: {b.offer}</div>
              <div style={{ ...card, marginTop: 8, background: 'rgba(2,6,23,0.6)', fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.55 }}>“{b.outreach}”</div>
              <div style={{ marginTop: 8 }}>
                <button style={ghost} onClick={() => { copy(b.outreach, () => flash('b' + i)); track('recurring_outreach_copy', { i }); }}>
                  {copied === 'b' + i ? '✓ คัดลอกแล้ว' : '📋 คัดลอกสคริปต์ทัก'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div><label style={{ fontSize: 11.5, color: C.slate }}>ลด %</label><input value={pct} onChange={e => setPct(e.target.value)} inputMode="numeric" style={input} /></div>
            <div><label style={{ fontSize: 11.5, color: C.slate }}>ตั้งแต่</label><input value={from} onChange={e => setFrom(e.target.value)} style={input} /></div>
            <div><label style={{ fontSize: 11.5, color: C.slate }}>ถึง</label><input value={to} onChange={e => setTo(e.target.value)} style={input} /></div>
          </div>
          <div style={{ ...card }}>
            <div style={{ fontWeight: 800, color: C.white, fontSize: 14 }}>{promo.headline}</div>
            <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 6, lineHeight: 1.6 }}>{promo.body}</div>
            <div style={{ fontSize: 12, color: C.slate, marginTop: 6 }}>{promo.hashtags}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <button style={ghost} onClick={() => { copy(promoText + '\n' + publicUrl, () => flash('promo')); track('flash_promo_copy', {}); }}>
                {copied === 'promo' ? '✓ คัดลอกแล้ว' : '📋 คัดลอกโปรฯ'}
              </button>
              <a style={{ ...ghost, textDecoration: 'none', color: '#fff', background: C.line, border: 0 }} href={lineText(promoText, publicUrl)} target="_blank" rel="noreferrer" onClick={() => track('flash_promo_share', { ch: 'line' })}>💬 ส่งไป LINE</a>
              <a style={{ ...ghost, textDecoration: 'none', color: '#fff', background: C.fb, border: 0 }} href={facebookShareUrl(publicUrl)} target="_blank" rel="noreferrer" onClick={() => track('flash_promo_share', { ch: 'fb' })}>f แชร์</a>
            </div>
            <div style={{ fontSize: 11, color: C.slate, marginTop: 8 }}>โปรฯ มีกรอบเวลาจริงที่คุณตั้ง — ไม่ใช่เร่งเร้าหลอก · โพสต์ช่วงที่ร้านเงียบจริง</div>
          </div>
          <div style={card}>
            <div style={{ fontWeight: 800, color: C.white, fontSize: 14, marginBottom: 8 }}>🔁 ทำให้ลูกค้ากลับมาซ้ำ</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: C.slate, lineHeight: 1.7 }}>
              {tips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
