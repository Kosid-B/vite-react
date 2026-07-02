import { useEffect, useState } from 'react';
import { SKILL_CATALOG } from '../../data/skillCatalog';
import {
  listAuctions, listBids, createAuction, closeAuction, timeLeft,
  type Auction, type Bid,
} from '../../lib/auctions';

/** Admin: เปิด/ปิดประมูล Skill จากบริษัท — English Auction
 *  ราคาไต่ขึ้นตามการบิด · หมดเวลาแล้ว Admin กดปิด → บิดสูงสุดชนะ */

const baht = (n: number) => '฿' + n.toLocaleString();

const STATUS_LABEL: Record<Auction['status'], { label: string; cls: string }> = {
  open: { label: '🟢 เปิดรับบิด', cls: 'open' },
  closed: { label: '🏆 ปิด — มีผู้ชนะ', cls: 'closed' },
  cancelled: { label: '⚪ ปิด — ไม่มีผู้บิด', cls: 'cancelled' },
};

export default function AuctionTab() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [bidsMap, setBidsMap] = useState<Record<string, Bid[]>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState({
    skillId: '', name: '', desc: '', icon: '🎯',
    startPrice: 990, minIncrement: 100, hours: 72,
  });

  async function reload() {
    const list = await listAuctions();
    setAuctions(list);
    const entries = await Promise.all(list.map(async a => [a.id, await listBids(a.id)] as const));
    setBidsMap(Object.fromEntries(entries));
  }
  useEffect(() => { reload().catch(() => setMsg('⚠️ โหลดข้อมูลไม่สำเร็จ')); }, []);

  function pickCatalog(id: string) {
    const sk = SKILL_CATALOG.find(s => s.id === id);
    if (!sk) { setDraft(d => ({ ...d, skillId: '' })); return; }
    setDraft(d => ({ ...d, skillId: sk.id, name: sk.name, desc: sk.desc, icon: sk.icon, startPrice: Math.round(sk.price / 2) }));
  }

  async function submit() {
    if (!draft.name.trim()) { setMsg('⚠️ ระบุชื่อ Skill ก่อน'); return; }
    setBusy(true);
    const err = await createAuction({
      skillId: draft.skillId || 'custom-' + draft.name.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 40),
      skillName: draft.name.trim(), skillDesc: draft.desc.trim(), icon: draft.icon || '🎯',
      startPrice: draft.startPrice, minIncrement: draft.minIncrement,
      endsAt: new Date(Date.now() + draft.hours * 3600000).toISOString(),
    });
    setBusy(false);
    if (err) { setMsg('⚠️ ' + err); return; }
    setMsg(`✅ เปิดประมูล "${draft.name}" แล้ว — เริ่ม ${baht(draft.startPrice)} ปิดใน ${draft.hours} ชม.`);
    setDraft({ skillId: '', name: '', desc: '', icon: '🎯', startPrice: 990, minIncrement: 100, hours: 72 });
    reload();
  }

  async function close(a: Auction) {
    setBusy(true);
    const err = await closeAuction(a);
    setBusy(false);
    if (err) { setMsg('⚠️ ' + err); return; }
    const top = bidsMap[a.id]?.[0];
    setMsg(top
      ? `🏆 ปิดประมูล "${a.skillName}" — ผู้ชนะ: ${top.bidderName} ที่ ${baht(top.amount)} (รอผู้ชนะชำระเงินรับ skill)`
      : `⚪ ปิดประมูล "${a.skillName}" — ไม่มีผู้บิด`);
    reload();
  }

  return (
    <div>
      <div className="adm-skill-hd">🔨 ประมูล Skill จากบริษัท — English Auction</div>
      <p className="sipoc-intro">
        เปิดประมูล skill.md ของบริษัทให้ทุก workspace บิดแข่งกันแบบเห็นราคากันสด (ราคาไต่ขึ้น
        ผู้ให้ราคาสูงสุดชนะ) — ใช้ค้นหาราคาตลาดจริงของ skill ใหม่ และสร้าง engagement ก่อนวางขายจริง
      </p>
      {msg && <div className="sipoc-gen-msg">{msg}</div>}

      {/* ฟอร์มเปิดประมูล */}
      <div className="auc-form">
        <div className="auc-form-hd">＋ เปิดประมูลใหม่</div>
        <div className="auc-form-grid">
          <label>เลือกจาก Catalog (หรือกรอกเอง)
            <select value={draft.skillId} onChange={e => pickCatalog(e.target.value)}>
              <option value="">— Skill ใหม่ (กรอกเอง) —</option>
              {SKILL_CATALOG.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
          </label>
          <label>ชื่อ Skill
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="เช่น TIS Automate Playbook" />
          </label>
          <label>คำอธิบาย
            <input value={draft.desc} onChange={e => setDraft({ ...draft, desc: e.target.value })} placeholder="skill นี้ช่วยอะไร" />
          </label>
          <label>ไอคอน
            <input value={draft.icon} onChange={e => setDraft({ ...draft, icon: e.target.value })} style={{ width: 60 }} />
          </label>
          <label>ราคาเริ่มต้น (฿)
            <input type="number" min={0} value={draft.startPrice}
              onChange={e => setDraft({ ...draft, startPrice: Math.max(0, +e.target.value) })} />
          </label>
          <label>บิดขั้นต่ำ (฿)
            <input type="number" min={1} value={draft.minIncrement}
              onChange={e => setDraft({ ...draft, minIncrement: Math.max(1, +e.target.value) })} />
          </label>
          <label>ระยะเวลา (ชั่วโมง)
            <input type="number" min={1} value={draft.hours}
              onChange={e => setDraft({ ...draft, hours: Math.max(1, +e.target.value) })} />
          </label>
        </div>
        <button className="auc-submit" onClick={submit} disabled={busy}>🔨 เปิดประมูล</button>
      </div>

      {/* รายการประมูล */}
      {auctions.length === 0 && <div className="trade-empty">ยังไม่มีประมูล — เปิดรายการแรกด้านบน</div>}
      {auctions.map(a => {
        const bids = bidsMap[a.id] ?? [];
        const top = bids[0];
        const expired = new Date(a.endsAt) < new Date();
        return (
          <div key={a.id} className="auc-card">
            <div className="auc-main">
              <div className="auc-title">{a.icon} {a.skillName}
                <span className={`auc-status ${STATUS_LABEL[a.status].cls}`}>{STATUS_LABEL[a.status].label}</span>
              </div>
              {a.skillDesc && <div className="auc-desc">{a.skillDesc}</div>}
              <div className="auc-meta">
                เริ่ม {baht(a.startPrice)} · ขั้นต่ำ {baht(a.minIncrement)} ·{' '}
                {a.status === 'open' ? timeLeft(a.endsAt) : `ปิดที่ ${baht(a.winningBid)}`} · {bids.length} บิด
              </div>
              {bids.length > 0 && (
                <div className="auc-bids">
                  {bids.slice(0, 5).map((b, i) => (
                    <div key={b.id} className={`auc-bid-row${i === 0 ? ' top' : ''}`}>
                      {i === 0 ? '🥇' : '·'} {b.bidderName || 'บริษัทในระบบ'} — <b>{baht(b.amount)}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="auc-side">
              {top && <div className="auc-top-bid">{baht(top.amount)}</div>}
              {a.status === 'open' && (
                <button className="auc-close-btn" onClick={() => close(a)} disabled={busy}>
                  {expired ? '🏁 ปิดประมูล — ประกาศผู้ชนะ' : 'ปิดก่อนเวลา'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
