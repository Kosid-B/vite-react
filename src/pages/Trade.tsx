import { useEffect, useState } from 'react';
import type { AppData } from '../types';
import { listStorefronts, getMyStorefront, type Storefront } from '../lib/storefront';
import {
  createRfq, listMyRfqs, listIncomingRfqs, answerRfq, acceptQuote,
  listOpenRfqs, claimOpenRfq,
  listOrders, updateOrderStatus, PLATFORM_FEE_RATE, LOCAL_WS,
  type Rfq, type Order, type OrderStatus,
} from '../lib/trade';
import { isSupabaseEnabled } from '../lib/supabase';
import { DBD_SECTORS } from '../data/dbd';
import MarketAgent from '../components/MarketAgent';

interface Props {
  data: AppData;
  wsId: string | null;
}

const baht = (n: number) => '฿' + n.toLocaleString();

const RFQ_BADGE: Record<Rfq['status'], { label: string; cls: string }> = {
  open: { label: 'รอใบเสนอราคา', cls: 'open' },
  quoted: { label: 'ได้ใบเสนอราคาแล้ว', cls: 'quoted' },
  accepted: { label: 'รับแล้ว → ออเดอร์', cls: 'accepted' },
  declined: { label: 'ผู้ขายปฏิเสธ', cls: 'declined' },
  closed: { label: 'ปิดแล้ว', cls: 'closed' },
};

const ORDER_STEPS: { id: OrderStatus; label: string }[] = [
  { id: 'pending_payment', label: 'รอชำระเงิน' },
  { id: 'paid', label: 'ชำระแล้ว' },
  { id: 'delivered', label: 'ส่งมอบแล้ว' },
  { id: 'completed', label: 'สำเร็จ' },
  { id: 'cancelled', label: 'ยกเลิก' },
];

export default function Trade({ data, wsId }: Props) {
  const myWs = wsId ?? LOCAL_WS;
  const [stores, setStores] = useState<Storefront[]>([]);
  const [mySf, setMySf] = useState<Storefront | null>(null);
  const [outgoing, setOutgoing] = useState<Rfq[]>([]);
  const [incoming, setIncoming] = useState<Rfq[]>([]);
  const [openJobs, setOpenJobs] = useState<Rfq[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // ฟอร์มประกาศงานกลาง (Open RFQ)
  const [postOpen, setPostOpen] = useState(false);
  const [openDraft, setOpenDraft] = useState({ title: '', detail: '', budget: 0, contact: '', sector: '' });
  // ฟอร์มรับงานกลาง (claim + เสนอราคา)
  const [claimFor, setClaimFor] = useState<string | null>(null);
  const [claimDraft, setClaimDraft] = useState({ amount: 0, note: '' });

  // ฟอร์มส่ง RFQ (เปิดต่อร้าน)
  const [rfqFor, setRfqFor] = useState<string | null>(() => sessionStorage.getItem('rfq_seller'));
  const [rfqDraft, setRfqDraft] = useState({ title: '', detail: '', budget: 0, contact: '' });
  // ฟอร์มตอบใบเสนอราคา (เปิดต่อ RFQ)
  const [quoteFor, setQuoteFor] = useState<string | null>(null);
  const [quoteDraft, setQuoteDraft] = useState({ amount: 0, note: '' });

  async function reload() {
    const [st, my] = await Promise.all([listStorefronts(), getMyStorefront(wsId)]);
    setStores(st);
    setMySf(my);
    const [out, inc, open, ord] = await Promise.all([
      listMyRfqs(myWs),
      listIncomingRfqs(my?.slug ?? null),
      listOpenRfqs(),
      listOrders(myWs),
    ]);
    setOutgoing(out);
    setIncoming(inc);
    setOpenJobs(open);
    setOrders(ord);
  }
  useEffect(() => {
    reload().catch(() => setMsg('⚠️ โหลดข้อมูลไม่สำเร็จ'));
    sessionStorage.removeItem('rfq_seller');
  }, [wsId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitRfq(sellerSlug: string) {
    if (!rfqDraft.title.trim()) { setMsg('⚠️ ระบุหัวข้อสิ่งที่ต้องการก่อน'); return; }
    const err = await createRfq({
      buyerWs: myWs, buyerName: data.aiCompany.name, sellerSlug, sector: '',
      title: rfqDraft.title.trim(), detail: rfqDraft.detail.trim(),
      budget: rfqDraft.budget, contact: rfqDraft.contact.trim(),
    });
    if (err) { setMsg('⚠️ ' + err); return; }
    setMsg(`✅ ส่ง RFQ ถึง "${sellerSlug}" แล้ว — รอผู้ขายตอบใบเสนอราคา`);
    setRfqFor(null);
    setRfqDraft({ title: '', detail: '', budget: 0, contact: '' });
    reload();
  }

  async function submitQuote(id: string, declined: boolean) {
    const err = await answerRfq(id, declined ? 'declined' : 'quoted', quoteDraft.amount, quoteDraft.note.trim());
    if (err) { setMsg('⚠️ ' + err); return; }
    setMsg(declined ? '✅ ปฏิเสธคำขอแล้ว' : `✅ ส่งใบเสนอราคา ${baht(quoteDraft.amount)} แล้ว`);
    setQuoteFor(null);
    setQuoteDraft({ amount: 0, note: '' });
    reload();
  }

  async function accept(r: Rfq) {
    const store = stores.find(s => s.slug === r.sellerSlug);
    const sellerWs = store?.workspaceId ?? LOCAL_WS;
    const err = await acceptQuote(r, sellerWs);
    if (err) { setMsg('⚠️ ' + err); return; }
    setMsg(`✅ รับใบเสนอราคาแล้ว — สร้างออเดอร์ ${baht(r.quoteAmount)} (ค่าดำเนินการ platform 3% = ${baht(Math.round(r.quoteAmount * PLATFORM_FEE_RATE))})`);
    reload();
  }

  async function postOpenRfq() {
    if (!openDraft.title.trim()) { setMsg('⚠️ ระบุหัวข้องานก่อน'); return; }
    const err = await createRfq({
      buyerWs: myWs, buyerName: data.aiCompany.name, sellerSlug: null,
      sector: openDraft.sector, title: openDraft.title.trim(), detail: openDraft.detail.trim(),
      budget: openDraft.budget, contact: openDraft.contact.trim(),
    });
    if (err) { setMsg('⚠️ ' + err); return; }
    setMsg('✅ ประกาศงานกลางแล้ว — ธุรกิจในระบบจะเห็นและส่งใบเสนอราคาเข้ามา');
    setPostOpen(false);
    setOpenDraft({ title: '', detail: '', budget: 0, contact: '', sector: '' });
    reload();
  }

  async function claimJob(id: string) {
    if (!mySf) { setMsg('⚠️ ต้องมีหน้าร้านก่อนรับงาน — เปิดจากเมนู "หน้าร้านของฉัน"'); return; }
    const err = await claimOpenRfq(id, mySf.slug, claimDraft.amount, claimDraft.note.trim());
    if (err) { setMsg('⚠️ ' + err); return; }
    setMsg(`✅ รับงานและส่งใบเสนอราคา ${baht(claimDraft.amount)} แล้ว — รอผู้ซื้อกดรับ`);
    setClaimFor(null);
    setClaimDraft({ amount: 0, note: '' });
    reload();
  }

  const otherStores = stores.filter(s => s.slug !== mySf?.slug);
  const mySector = (mySf?.dbd ?? '').match(/^\[([A-Z])\]/)?.[1] ?? '';
  const visibleJobs = openJobs.filter(j => j.buyerWs !== myWs);
  const sectorLabelOf = (code: string) => {
    const sec = DBD_SECTORS.find(s => s.code === code);
    return sec ? `หมวด ${sec.code} · ${sec.label}` : 'ทุกหมวด';
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">ซื้อขาย B2B · RFQ</div>
        <div className="page-meta">
          <span className="meta-chip">Marketplace M2/M3</span>
          <span className="meta-chip">ค่าดำเนินการ 3% เมื่อปิดดีลผ่านระบบ</span>
        </div>
      </div>
      <p className="sipoc-intro">
        ขอใบเสนอราคาจากธุรกิจใน ecosystem ตามหมวด DBD — ผู้ขายตอบราคา ผู้ซื้อกดรับ
        ระบบสร้างออเดอร์และติดตามสถานะจนปิดดีล (การชำระเงินผ่านระบบจะเปิดเมื่อเชื่อม payment gateway)
      </p>
      {msg && <div className="sipoc-gen-msg">{msg}</div>}

      {/* ── 🤝 Marketplace Agent — จับคู่สินค้า/บริการใน ecosystem ── */}
      <MarketAgent
        mySf={mySf}
        openJobs={visibleJobs}
        stores={otherStores}
        onQuote={id => {
          setClaimFor(id);
          setClaimDraft({ amount: 0, note: '' });
          document.getElementById(`open-rfq-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />

      {/* ── หาคู่ค้า ── */}
      <section className="trade-sec">
        <div className="trade-sec-hd">🔍 หาคู่ค้า — ธุรกิจในระบบ ({otherStores.length})</div>
        {otherStores.length === 0 && (
          <div className="trade-empty">ยังไม่มีธุรกิจอื่นเผยแพร่หน้าร้าน — ชวนคู่ค้าของคุณมาสร้างหน้าร้านฟรีที่ ceoaithailand.org</div>
        )}
        <div className="trade-store-grid">
          {otherStores.map(s => (
            <div key={s.slug} className="trade-store">
              <div className="pub-dbd">{s.dbd || 'ไม่ระบุหมวด'}</div>
              <div className="trade-store-name">{s.name}</div>
              <div className="trade-store-desc">{s.description.slice(0, 90)}{s.description.length > 90 ? '…' : ''}</div>
              <div className="trade-store-actions">
                <a className="pub-link" href={`/b/${encodeURIComponent(s.slug)}`} target="_blank" rel="noreferrer">ดูหน้าร้าน</a>
                <button className="trade-rfq-btn" onClick={() => { setRfqFor(rfqFor === s.slug ? null : s.slug); }}>
                  📨 ขอใบเสนอราคา
                </button>
              </div>
              {rfqFor === s.slug && (
                <div className="trade-rfq-form">
                  <input placeholder="ต้องการซื้ออะไร เช่น ชิ้นส่วน A-101 จำนวน 500 ชิ้น" value={rfqDraft.title}
                    onChange={e => setRfqDraft({ ...rfqDraft, title: e.target.value })} />
                  <textarea rows={2} placeholder="รายละเอียด สเปก กำหนดส่ง…" value={rfqDraft.detail}
                    onChange={e => setRfqDraft({ ...rfqDraft, detail: e.target.value })} />
                  <div className="trade-rfq-row">
                    <input type="number" min={0} placeholder="งบประมาณ (฿)" value={rfqDraft.budget || ''}
                      onChange={e => setRfqDraft({ ...rfqDraft, budget: Math.max(0, +e.target.value) })} />
                    <input placeholder="ช่องทางติดต่อกลับ (เบอร์/LINE/อีเมล)" value={rfqDraft.contact}
                      onChange={e => setRfqDraft({ ...rfqDraft, contact: e.target.value })} />
                  </div>
                  <button className="trade-rfq-send" onClick={() => submitRfq(s.slug)}>ส่ง RFQ</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── ประกาศงานกลาง (Open RFQ) — กลไก "ดีลแรก" ── */}
      <section className="trade-sec trade-open-sec">
        <div className="trade-sec-hd">
          📣 ประกาศงานกลาง ({visibleJobs.length})
          <button className="trade-rfq-btn trade-post-btn" onClick={() => setPostOpen(!postOpen)}>
            {postOpen ? '× ปิดฟอร์ม' : '＋ ประกาศหางาน/หาผู้ขาย'}
          </button>
        </div>
        <div className="trade-open-sub">
          งานที่เปิดให้ทุกธุรกิจในระบบส่งใบเสนอราคา — <b>ธุรกิจใหม่เริ่มที่นี่:</b> เสนอราคางานแรกของคุณวันนี้
        </div>

        {postOpen && (
          <div className="trade-rfq-form trade-open-form">
            <input placeholder="ต้องการซื้อ/จ้างอะไร เช่น ออกแบบโลโก้ + CI ครบชุด" value={openDraft.title}
              onChange={e => setOpenDraft({ ...openDraft, title: e.target.value })} />
            <textarea rows={2} placeholder="รายละเอียด สเปก กำหนดส่ง…" value={openDraft.detail}
              onChange={e => setOpenDraft({ ...openDraft, detail: e.target.value })} />
            <div className="trade-rfq-row">
              <select value={openDraft.sector} onChange={e => setOpenDraft({ ...openDraft, sector: e.target.value })}>
                <option value="">หมวดผู้ขายที่ต้องการ (ทุกหมวด)</option>
                {DBD_SECTORS.map(s => <option key={s.code} value={s.code}>หมวด {s.code} · {s.label}</option>)}
              </select>
              <input type="number" min={0} placeholder="งบประมาณ (฿)" value={openDraft.budget || ''}
                onChange={e => setOpenDraft({ ...openDraft, budget: Math.max(0, +e.target.value) })} />
            </div>
            <input placeholder="ช่องทางติดต่อกลับ (เบอร์/LINE/อีเมล)" value={openDraft.contact}
              onChange={e => setOpenDraft({ ...openDraft, contact: e.target.value })} />
            <button className="trade-rfq-send" onClick={postOpenRfq}>📣 ประกาศงาน</button>
          </div>
        )}

        {visibleJobs.length === 0 && (
          <div className="trade-empty">ยังไม่มีงานประกาศอยู่ — เป็นคนแรกที่ประกาศหาผู้ขาย หรือแชร์ให้คู่ค้ามาโพสต์งาน</div>
        )}
        {visibleJobs.map(j => {
          const matchMine = !!mySector && (j.sector === '' || j.sector === mySector);
          return (
            <div key={j.id} id={`open-rfq-${j.id}`} className={`trade-rfq-card${matchMine ? ' trade-match' : ''}`}>
              <div className="trade-rfq-main">
                <div className="trade-rfq-title">
                  {j.title}
                  {matchMine && <span className="trade-match-chip">ตรงหมวดคุณ</span>}
                </div>
                {j.detail && <div className="trade-rfq-detail">{j.detail}</div>}
                <div className="trade-rfq-meta">
                  {sectorLabelOf(j.sector)} · งบ {baht(j.budget)} · จาก {j.buyerName || 'ผู้ซื้อในระบบ'} · {j.createdAt}
                </div>
              </div>
              <div className="trade-rfq-side">
                {claimFor === j.id ? (
                  <div className="trade-quote-form">
                    <input type="number" min={0} placeholder="เสนอราคา (฿)" value={claimDraft.amount || ''}
                      onChange={e => setClaimDraft({ ...claimDraft, amount: Math.max(0, +e.target.value) })} />
                    <input placeholder="เงื่อนไข/กำหนดส่ง (ถ้ามี)" value={claimDraft.note}
                      onChange={e => setClaimDraft({ ...claimDraft, note: e.target.value })} />
                    <div className="trade-quote-actions">
                      <button className="trade-accept" onClick={() => claimJob(j.id)} disabled={claimDraft.amount <= 0}>
                        ส่งใบเสนอราคา
                      </button>
                      <button className="trade-decline" onClick={() => setClaimFor(null)}>ยกเลิก</button>
                    </div>
                  </div>
                ) : (
                  <button className="trade-rfq-btn" disabled={!mySf}
                    title={mySf ? '' : 'ต้องมีหน้าร้านก่อนรับงาน'}
                    onClick={() => { setClaimFor(j.id); setClaimDraft({ amount: j.budget, note: '' }); }}>
                    🙋 รับงานนี้ — เสนอราคา
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* ── RFQ ที่ส่งออก (ผู้ซื้อ) ── */}
      <section className="trade-sec">
        <div className="trade-sec-hd">📤 RFQ ที่ฉันส่งออก ({outgoing.length})</div>
        {outgoing.length === 0 && <div className="trade-empty">ยังไม่เคยส่ง RFQ — เลือกคู่ค้าด้านบนแล้วกด "ขอใบเสนอราคา"</div>}
        {outgoing.map(r => (
          <div key={r.id} className="trade-rfq-card">
            <div className="trade-rfq-main">
              <div className="trade-rfq-title">{r.title} <span className="trade-rfq-to">→ {r.sellerSlug ?? '📣 ประกาศกลาง'}</span></div>
              {r.detail && <div className="trade-rfq-detail">{r.detail}</div>}
              <div className="trade-rfq-meta">งบ {baht(r.budget)} · {r.createdAt}</div>
            </div>
            <div className="trade-rfq-side">
              <span className={`trade-badge ${RFQ_BADGE[r.status].cls}`}>{RFQ_BADGE[r.status].label}</span>
              {r.status === 'quoted' && (
                <>
                  <div className="trade-quote">{baht(r.quoteAmount)}{r.quoteNote && <span className="trade-quote-note"> — {r.quoteNote}</span>}</div>
                  <button className="trade-accept" onClick={() => accept(r)}>✅ รับใบเสนอราคา → สร้างออเดอร์</button>
                </>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* ── RFQ เข้ามา (ผู้ขาย) ── */}
      <section className="trade-sec">
        <div className="trade-sec-hd">📥 คำขอเข้ามาหาหน้าร้านฉัน ({incoming.length})</div>
        {!mySf && <div className="trade-empty">ยังไม่มีหน้าร้าน — เปิดจากเมนู "หน้าร้านของฉัน" เพื่อรับ RFQ จากผู้ซื้อ</div>}
        {mySf && incoming.length === 0 && <div className="trade-empty">ยังไม่มีคำขอเข้ามา — แชร์ลิงก์หน้าร้านให้ลูกค้าเห็นมากขึ้น</div>}
        {incoming.map(r => (
          <div key={r.id} className="trade-rfq-card">
            <div className="trade-rfq-main">
              <div className="trade-rfq-title">{r.title} <span className="trade-rfq-to">จาก {r.buyerName || 'ผู้ซื้อในระบบ'}</span></div>
              {r.detail && <div className="trade-rfq-detail">{r.detail}</div>}
              <div className="trade-rfq-meta">งบผู้ซื้อ {baht(r.budget)} · ติดต่อกลับ: {r.contact || '-'} · {r.createdAt}</div>
            </div>
            <div className="trade-rfq-side">
              <span className={`trade-badge ${RFQ_BADGE[r.status].cls}`}>{RFQ_BADGE[r.status].label}</span>
              {r.status === 'open' && (quoteFor === r.id ? (
                <div className="trade-quote-form">
                  <input type="number" min={0} placeholder="เสนอราคา (฿)" value={quoteDraft.amount || ''}
                    onChange={e => setQuoteDraft({ ...quoteDraft, amount: Math.max(0, +e.target.value) })} />
                  <input placeholder="เงื่อนไข/กำหนดส่ง (ถ้ามี)" value={quoteDraft.note}
                    onChange={e => setQuoteDraft({ ...quoteDraft, note: e.target.value })} />
                  <div className="trade-quote-actions">
                    <button className="trade-accept" onClick={() => submitQuote(r.id, false)} disabled={quoteDraft.amount <= 0}>ส่งใบเสนอราคา</button>
                    <button className="trade-decline" onClick={() => submitQuote(r.id, true)}>ปฏิเสธ</button>
                  </div>
                </div>
              ) : (
                <button className="trade-rfq-btn" onClick={() => { setQuoteFor(r.id); setQuoteDraft({ amount: r.budget, note: '' }); }}>
                  💬 ตอบใบเสนอราคา
                </button>
              ))}
              {r.status === 'quoted' && <div className="trade-quote">เสนอไป {baht(r.quoteAmount)}</div>}
            </div>
          </div>
        ))}
      </section>

      {/* ── ออเดอร์ (M3) ── */}
      <section className="trade-sec">
        <div className="trade-sec-hd">🧾 ออเดอร์ ({orders.length})</div>
        {orders.length === 0 && <div className="trade-empty">ยังไม่มีออเดอร์ — เกิดขึ้นเมื่อผู้ซื้อกดรับใบเสนอราคา</div>}
        {orders.length > 0 && (
          <table className="trade-orders">
            <thead>
              <tr><th>รายการ</th><th>บทบาท</th><th>มูลค่า</th><th>ค่าดำเนินการ 3%</th><th>ผู้ขายรับสุทธิ</th><th>สถานะ</th></tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>{o.title}<div className="trade-ord-date">{o.createdAt}</div></td>
                  <td>{o.buyerWs === myWs ? '🛒 ผู้ซื้อ' : '🏪 ผู้ขาย'}</td>
                  <td>{baht(o.amount)}</td>
                  <td>{baht(o.fee)}</td>
                  <td>{baht(o.amount - o.fee)}</td>
                  <td>
                    <select className="trade-ord-status" value={o.status}
                      onChange={e => updateOrderStatus(o.id, e.target.value as OrderStatus).then(reload)}>
                      {ORDER_STEPS.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="trade-note">
          💳 ตอนนี้ผู้ซื้อชำระตรงกับผู้ขาย (โอน/PromptPay ของผู้ขาย) แล้วอัปเดตสถานะที่นี่ —
          การชำระผ่านระบบพร้อม escrow จะเปิดใช้เมื่อเชื่อม payment gateway{isSupabaseEnabled ? '' : ' · (local mode: ข้อมูล demo ในเครื่อง)'}
        </div>
      </section>
    </div>
  );
}
