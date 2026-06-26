import { useState } from 'react';
import type { AppData, Deal, DealStatus, MarketPartner } from '../types';
import { baht } from '../utils';

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
}

const DEAL_STATUS: Record<DealStatus, { label: string; cls: string }> = {
  matched: { label: 'จับคู่แล้ว', cls: 'ds-matched' },
  negotiating: { label: 'กำลังเจรจา', cls: 'ds-nego' },
  closed: { label: 'ปิดดีล', cls: 'ds-closed' },
  cancelled: { label: 'ยกเลิก', cls: 'ds-cancel' },
};

export default function Marketplace({ data, onUpdate }: Props) {
  const m = data.marketplace;
  const [cat, setCat] = useState('ทั้งหมด');

  const categories = ['ทั้งหมด', ...Array.from(new Set(m.partners.map(p => p.category)))];
  const shown = cat === 'ทั้งหมด' ? m.partners : m.partners.filter(p => p.category === cat);

  function patch(next: Partial<typeof m>) {
    onUpdate({ ...data, marketplace: { ...m, ...next } });
  }

  const fee = (amount: number) => Math.round(amount * m.feePct / 100);
  const gmv = m.deals.filter(d => d.status === 'closed').reduce((s, d) => s + d.amount, 0);
  const pipeline = m.deals.filter(d => d.status === 'matched' || d.status === 'negotiating').reduce((s, d) => s + d.amount, 0);
  const revenue = fee(gmv);
  const potential = fee(pipeline);

  function matchPartner(p: MarketPartner) {
    const deal: Deal = {
      id: 'dl-' + Date.now().toString(36),
      partnerId: p.id,
      title: `จับคู่กับ ${p.name}`,
      amount: p.priceFrom,
      status: 'matched',
    };
    patch({ deals: [deal, ...m.deals] });
  }

  function setDeal(id: string, field: 'amount' | 'status' | 'title', value: string | number) {
    patch({ deals: m.deals.map(d => d.id === id ? { ...d, [field]: value } : d) });
  }
  function delDeal(id: string) {
    patch({ deals: m.deals.filter(d => d.id !== id) });
  }

  function savePartner(id: string, field: keyof MarketPartner, value: string | number | boolean) {
    patch({ partners: m.partners.map(p => p.id === id ? { ...p, [field]: value } : p) });
  }
  function addPartner() {
    patch({ partners: [...m.partners, {
      id: 'mp-' + Date.now().toString(36), name: 'คู่ค้าใหม่', category: 'หมวดบริการ',
      desc: 'อธิบายบริการของคู่ค้า', rating: 4.5, priceFrom: 10000, location: 'กรุงเทพฯ', verified: false,
    }] });
  }
  function delPartner(id: string) {
    patch({ partners: m.partners.filter(p => p.id !== id), deals: m.deals.filter(d => d.partnerId !== id) });
  }

  const partnerName = (id: string) => m.partners.find(p => p.id === id)?.name ?? '— (ถูกลบ)';

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Marketplace — จับคู่คู่ค้า</div>
        <div className="page-meta">
          <span className="meta-chip">{m.partners.length} คู่ค้า</span>
          <span className="meta-chip">{m.deals.length} ดีล</span>
          <span className="meta-chip" style={{ borderColor: 'var(--green)', color: 'var(--green)' }}>ค่าดำเนินการ {m.feePct}%</span>
          <span className="law-badge" data-tip={"Jakob's Law: การ์ดคู่ค้าแบบ marketplace\nที่ผู้ใช้คุ้นจาก Fiverr/Lazada\nหาและเลือกคู่ค้าได้ทันที"}>Jakob's Law</span>
          <span className="law-badge" data-tip={"Von Restorff Effect: การ์ดรายได้ค่าดำเนินการ 3%\nใช้สีเขียวเข้มตัดกับการ์ดอื่น\nให้ตัวเลขรายได้โดดเด่นที่สุด"}>Von Restorff</span>
          <span className="law-badge" data-tip={"Social Proof: เรตติ้ง + ป้าย Verified\nสร้างความเชื่อใจก่อนตัดสินใจจับคู่"}>Social Proof</span>
        </div>
      </div>

      {/* ===== สรุปรายได้ ===== */}
      <div className="mk-stats">
        <div className="mk-stat"><div className="mk-stat-lbl">มูลค่าดีลที่ปิดแล้ว (GMV)</div><div className="mk-stat-num">{baht(gmv)}</div></div>
        <div className="mk-stat hi">
          <div className="mk-stat-lbl">รายได้ค่าดำเนินการ ({m.feePct}%)</div>
          <div className="mk-stat-num">{baht(revenue)}</div>
        </div>
        <div className="mk-stat"><div className="mk-stat-lbl">ดีลใน pipeline</div><div className="mk-stat-num">{baht(pipeline)}</div></div>
        <div className="mk-stat"><div className="mk-stat-lbl">รายได้ที่คาดได้เพิ่ม</div><div className="mk-stat-num">{baht(potential)}</div></div>
      </div>

      <div className="mk-feebar">
        <span>ปรับค่าดำเนินการแพลตฟอร์ม</span>
        <input type="range" min={0} max={15} step={0.5} value={m.feePct}
          onChange={e => patch({ feePct: Number(e.target.value) })} />
        <b>{m.feePct}%</b>
        <span className="mk-feebar-note">เก็บจากมูลค่าดีลที่ปิดสำเร็จเท่านั้น</span>
      </div>

      {/* ===== คู่ค้า ===== */}
      <div className="mk-section-hd">คู่ค้าในระบบ</div>
      <div className="mk-filters">
        {categories.map(c => (
          <button key={c} className={`mk-filter${cat === c ? ' active' : ''}`} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      <div className="mk-grid">
        {shown.map(p => (
          <div key={p.id} className="mk-card">
            <button className="mk-card-del" onClick={() => delPartner(p.id)} title="ลบคู่ค้า">×</button>
            <div className="mk-card-top">
              <div className="mk-av">{p.name.trim().charAt(0) || '?'}</div>
              <div className="mk-card-id">
                <input className="mk-name" defaultValue={p.name} key={'n' + p.id + p.name}
                  onBlur={e => savePartner(p.id, 'name', e.target.value)} spellCheck={false} />
                <input className="mk-cat" defaultValue={p.category} key={'c' + p.id + p.category}
                  onBlur={e => savePartner(p.id, 'category', e.target.value)} spellCheck={false} />
              </div>
              {p.verified && <span className="mk-verified" title="ยืนยันตัวตนแล้ว">✓ Verified</span>}
            </div>
            <textarea className="mk-desc" rows={2} defaultValue={p.desc} key={'d' + p.id + p.desc}
              onBlur={e => savePartner(p.id, 'desc', e.target.value)} spellCheck={false} />
            <div className="mk-meta">
              <span className="mk-rating">★ {p.rating.toFixed(1)}</span>
              <span className="mk-loc">📍 {p.location}</span>
            </div>
            <div className="mk-card-foot">
              <div className="mk-price">เริ่มต้น <b>{baht(p.priceFrom)}</b></div>
              <button className="mk-match-btn" onClick={() => matchPartner(p)}>จับคู่ →</button>
            </div>
          </div>
        ))}
        <button className="mk-add-card" onClick={addPartner}>
          <div className="mk-add-icon">＋</div>
          <div>เพิ่มคู่ค้า</div>
        </button>
      </div>

      {/* ===== ดีล ===== */}
      <div className="mk-section-hd" style={{ marginTop: 26 }}>ดีลที่จับคู่ (Matching)</div>
      <div className="mk-deals">
        <div className="mk-deal mk-deal-head">
          <div>คู่ค้า / ดีล</div>
          <div className="mk-deal-amt">มูลค่า</div>
          <div className="mk-deal-fee">ค่าดำเนินการ {m.feePct}%</div>
          <div className="mk-deal-status">สถานะ</div>
          <div />
        </div>
        {m.deals.length === 0 && <div className="mk-empty">ยังไม่มีดีล — กด “จับคู่” ที่การ์ดคู่ค้าเพื่อเริ่ม</div>}
        {m.deals.map(d => (
          <div key={d.id} className={`mk-deal${d.status === 'closed' ? ' closed' : ''}`}>
            <div className="mk-deal-main">
              <input className="mk-deal-title" defaultValue={d.title} key={'t' + d.id + d.title}
                onBlur={e => setDeal(d.id, 'title', e.target.value)} spellCheck={false} />
              <span className="mk-deal-partner">{partnerName(d.partnerId)}</span>
            </div>
            <div className="mk-deal-amt">
              ฿<input className="mk-deal-amt-inp" type="number" defaultValue={d.amount} key={'a' + d.id + d.amount}
                onBlur={e => setDeal(d.id, 'amount', Number(e.target.value) || 0)} />
            </div>
            <div className="mk-deal-fee">{baht(fee(d.amount))}</div>
            <div className="mk-deal-status">
              <select className={`mk-status-sel ${DEAL_STATUS[d.status].cls}`} value={d.status}
                onChange={e => setDeal(d.id, 'status', e.target.value)}>
                {(Object.keys(DEAL_STATUS) as DealStatus[]).map(s => (
                  <option key={s} value={s}>{DEAL_STATUS[s].label}</option>
                ))}
              </select>
            </div>
            <button className="mk-deal-del" onClick={() => delDeal(d.id)} title="ลบดีล">×</button>
          </div>
        ))}
      </div>

      <div className="mk-insight">
        💡 โมเดลรายได้แบบ <b>take-rate {m.feePct}%</b>: แพลตฟอร์มจับคู่ธุรกิจกับคู่ค้าที่ผ่านการคัดกรอง
        และเก็บค่าดำเนินการเฉพาะดีลที่ปิดสำเร็จ — ยิ่ง GMV โต รายได้ยิ่งโตตาม โดยไม่ต้องแบกต้นทุนส่งมอบงานเอง
      </div>
    </div>
  );
}
