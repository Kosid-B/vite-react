import { useEffect, useState } from 'react';
import {
  listAuctions, listBids, placeBid, timeLeft,
  type Auction, type Bid,
} from '../lib/auctions';

/** ฝั่งผู้ใช้: ประมูล Skill จากบริษัท (English Auction — ราคาไต่ขึ้น เห็นบิดกันสด)
 *  ชนะแล้วชำระเงินตามราคาบิดสูงสุด → รับ skill เข้าบริษัททันที */

interface Props {
  wsId: string;
  companyName: string;
  owned: string[];
  payMethods: { id: string; label: string; icon: string }[];
  onClaim: (auction: Auction, payMethod: string) => void;
}

const baht = (n: number) => '฿' + n.toLocaleString();

export default function SkillAuction({ wsId, companyName, owned, payMethods, onClaim }: Props) {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [bidsMap, setBidsMap] = useState<Record<string, Bid[]>>({});
  const [bidDraft, setBidDraft] = useState<Record<string, number>>({});
  const [payFor, setPayFor] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function reload() {
    const list = await listAuctions();
    setAuctions(list);
    const entries = await Promise.all(list.map(async a => [a.id, await listBids(a.id)] as const));
    setBidsMap(Object.fromEntries(entries));
  }
  useEffect(() => { reload().catch(() => { /* ยังไม่มีประมูล */ }); }, []);

  const openAuctions = auctions.filter(a => a.status === 'open');
  const myWins = auctions.filter(a => a.status === 'closed' && a.winnerWs === wsId && !owned.includes(a.skillId));

  if (openAuctions.length === 0 && myWins.length === 0) return null;

  async function bid(a: Auction) {
    const amount = bidDraft[a.id] ?? 0;
    const err = await placeBid(a, wsId, companyName, amount);
    if (err) { setMsg('⚠️ ' + err); return; }
    setMsg(`✅ บิด "${a.skillName}" ที่ ${baht(amount)} แล้ว — คุณเป็นผู้ให้ราคาสูงสุดตอนนี้`);
    setBidDraft(d => ({ ...d, [a.id]: 0 }));
    reload();
  }

  return (
    <div className="skm-auction">
      <div className="skm-auction-hd">
        🔨 ประมูล Skill จากบริษัท <span className="skm-auction-sub">English Auction — บิดสูงสุดชนะ · เห็นราคากันสด</span>
      </div>
      {msg && <div className="skm-msg">{msg}</div>}

      {/* 🎉 ประมูลที่ชนะ — รอชำระเงินรับ skill */}
      {myWins.map(a => (
        <div key={a.id} className="auc-card win">
          <div className="auc-main">
            <div className="auc-title">🎉 คุณชนะประมูล — {a.icon} {a.skillName}</div>
            <div className="auc-meta">ราคาปิด {baht(a.winningBid)} — ชำระเงินเพื่อรับ skill เข้าบริษัท</div>
          </div>
          <div className="auc-side">
            {payFor === a.id ? (
              <div className="skm-pay-box">
                <div className="skm-pay-title">ชำระ {baht(a.winningBid)}</div>
                {payMethods.map(m => (
                  <button key={m.id} className="skm-pay-btn" onClick={() => { onClaim(a, m.id); setPayFor(null); }}>
                    {m.icon} {m.label}
                  </button>
                ))}
                <button className="skm-btn cancel" onClick={() => setPayFor(null)}>ยกเลิก</button>
              </div>
            ) : (
              <button className="auc-claim-btn" onClick={() => setPayFor(a.id)}>💳 ชำระ {baht(a.winningBid)} — รับ Skill</button>
            )}
          </div>
        </div>
      ))}

      {/* ประมูลที่เปิดอยู่ */}
      {openAuctions.map(a => {
        const bids = bidsMap[a.id] ?? [];
        const top = bids[0];
        const iAmTop = top?.wsId === wsId;
        const floor = (top?.amount ?? a.startPrice - a.minIncrement) + a.minIncrement;
        const expired = new Date(a.endsAt) < new Date();
        return (
          <div key={a.id} className="auc-card">
            <div className="auc-main">
              <div className="auc-title">{a.icon} {a.skillName}
                {iAmTop && <span className="auc-mine">🥇 คุณนำอยู่</span>}
              </div>
              {a.skillDesc && <div className="auc-desc">{a.skillDesc}</div>}
              <div className="auc-meta">
                {expired ? '⏳ หมดเวลา — รอประกาศผล' : `⏱ ${timeLeft(a.endsAt)}`} · {bids.length} บิด · ขั้นต่ำ {baht(a.minIncrement)}
              </div>
              {bids.slice(0, 3).map((b, i) => (
                <div key={b.id} className={`auc-bid-row${i === 0 ? ' top' : ''}`}>
                  {i === 0 ? '🥇' : '·'} {b.wsId === wsId ? 'บริษัทของคุณ' : (b.bidderName || 'บริษัทในระบบ')} — <b>{baht(b.amount)}</b>
                </div>
              ))}
            </div>
            <div className="auc-side">
              <div className="auc-top-bid">{top ? baht(top.amount) : `เริ่ม ${baht(a.startPrice)}`}</div>
              {!expired && (
                <div className="auc-bid-form">
                  <input type="number" min={floor} placeholder={`≥ ${floor.toLocaleString()}`}
                    value={bidDraft[a.id] || ''}
                    onChange={e => setBidDraft(d => ({ ...d, [a.id]: Math.max(0, +e.target.value) }))} />
                  <button onClick={() => bid(a)} disabled={(bidDraft[a.id] ?? 0) < floor}>🔨 บิด</button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
