import { useEffect, useState } from 'react';
import { getStorefront, isFeatured, listStorefronts, listReviews, submitReview, type Storefront, type StorefrontKind, type StorefrontReview } from '../lib/storefront';
import { isSupabaseEnabled } from '../lib/supabase';
import { countLeads, submitLead, type LeadKind } from '../lib/leads';
import { track } from '../lib/analytics';
import { DBD_SECTORS } from '../data/dbd';
import { applySeo, siteOrigin } from '../lib/seo';
import { storefrontSeo, directorySeo, directoryItemList, sectorLabel } from '../lib/seoData';
import { STARTER_LISTINGS } from '../lib/starterStorefronts';

/* ===== Marketplace M1 — หน้าสาธารณะ (ไม่ต้องล็อกอิน) =====
 * /b        → สารบัญธุรกิจ จัดกลุ่มตามหมวด DBD
 * /b/<slug> → หน้าร้านของบริษัท
 * SEO: production inject meta ฝั่ง server (src/server.ts); ที่นี่ applySeo ยืนยันฝั่ง client */

function PublicShell({ children, title }: { children: React.ReactNode; title: string }) {
  useEffect(() => { document.title = `${title} — CEO AI Thailand`; }, [title]);
  return (
    <div className="pub-wrap">
      <header className="pub-head">
        <a className="pub-brand" href="/b">🏪 สารบัญธุรกิจ · CEO AI Thailand</a>
        <a className="pub-cta" href="/">สร้างหน้าร้านของคุณฟรี →</a>
      </header>
      <main className="pub-main">{children}</main>
      <footer className="pub-foot">
        CEO AI Thailand — แพลตฟอร์มสร้างบริษัท AI อัตโนมัติสำหรับธุรกิจไทย ·{' '}
        โดย <a href="https://www.b-tctraining.com" target="_blank" rel="noreferrer">B. Training Consultant (M.E.A) Co., Ltd.</a>
      </footer>
    </div>
  );
}

export function PublicStorefrontPage({ slug }: { slug: string }) {
  const [sf, setSf] = useState<Storefront | null | undefined>(undefined);
  const [interested, setInterested] = useState(0);
  const [leadOpen, setLeadOpen] = useState<LeadKind | null>(null);
  const [leadDraft, setLeadDraft] = useState({ name: '', contact: '', note: '' });
  const [leadMsg, setLeadMsg] = useState<string | null>(null);
  const [leadSent, setLeadSent] = useState(false);
  const [reviews, setReviews] = useState<StorefrontReview[]>([]);
  const [rvForm, setRvForm] = useState<{ rating: number; text: string; name: string } | null>(null);
  const [rvMsg, setRvMsg] = useState<string | null>(null);

  useEffect(() => {
    const s = decodeURIComponent(slug);
    getStorefront(s).then(setSf).catch(() => setSf(null));
    countLeads(s).then(setInterested).catch(() => {});
    listReviews(s).then(setReviews).catch(() => {});
  }, [slug]);

  async function sendReview() {
    if (!sf || !rvForm) return;
    setRvMsg(null);
    const res = await submitReview({ slug: sf.slug, rating: rvForm.rating, text: rvForm.text, reviewerName: rvForm.name });
    if (!res.ok) { setRvMsg('⚠️ ' + (res.error || 'ส่งรีวิวไม่สำเร็จ')); return; }
    track('review_submitted', { shop: sf.slug, rating: rvForm.rating });
    setRvForm(null);
    listReviews(sf.slug).then(setReviews).catch(() => {});
    getStorefront(sf.slug).then(setSf).catch(() => {});   // refresh ค่าเฉลี่ย
  }

  // SEO: อัปเดต title/meta/canonical/OG + JSON-LD ต่อร้าน (client-side; server ทำ inject แล้วบน production)
  useEffect(() => {
    if (sf && sf.published) applySeo(storefrontSeo(sf, siteOrigin()));
  }, [sf]);

  async function sendLead() {
    if (!sf || !leadOpen) return;
    setLeadMsg(null);
    const err = await submitLead({ slug: sf.slug, kind: leadOpen, ...leadDraft });
    if (err) { setLeadMsg('⚠️ ' + err); return; }
    track('lead_submitted', { kind: leadOpen, shop: sf.slug });
    setLeadSent(true);
    setInterested(n => n + 1);
  }

  if (sf === undefined) return <PublicShell title="กำลังโหลด"><div className="pub-loading">กำลังโหลด…</div></PublicShell>;
  if (sf === null || !sf.published) {
    return (
      <PublicShell title="ไม่พบหน้าร้าน">
        <div className="pub-notfound">
          <div className="pub-nf-ico">🏚️</div>
          ไม่พบหน้าร้านนี้ หรือยังไม่เปิดเผยแพร่
          <a className="pub-link" href="/b">← กลับไปสารบัญธุรกิจ</a>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell title={sf.name}>
      <div className="pub-card">
        <div className="pub-dbd">{sectorLabel(sf.dbd)}</div>
        <h1 className="pub-name">{sf.name}</h1>
        {typeof sf.rating === 'number' && (sf.reviewCount ?? 0) > 0 && (
          <div className="pub-rating" title={`${sf.rating} จาก 5 · ${sf.reviewCount} รีวิว`}>
            <span className="pub-rating-stars">{'★'.repeat(Math.round(sf.rating))}{'☆'.repeat(5 - Math.round(sf.rating))}</span>
            <span className="pub-rating-num">{sf.rating.toFixed(1)}</span>
            <span className="pub-rating-count">({sf.reviewCount} รีวิว)</span>
          </div>
        )}
        {sf.vp && <p className="pub-vp">“{sf.vp}”</p>}
        {sf.promo && <div className="pub-promo">📣 {sf.promo}</div>}
        {sf.images.length > 0 && (
          <div className="pub-gallery">
            {sf.images.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={`${sf.name} รูปที่ ${i + 1}`} loading="lazy" />
              </a>
            ))}
          </div>
        )}
        {sf.description && <p className="pub-desc">{sf.description}</p>}

        {sf.services.length > 0 && (
          <>
            <div className="pub-sec-hd">สินค้า / บริการ</div>
            <ul className="pub-services">
              {sf.services.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </>
        )}

        {/* ⭐ รีวิวจริง — สะสมเป็น trust + AggregateRating SEO */}
        <div className="pub-reviews">
          <div className="pub-sec-hd">รีวิวจากลูกค้า {reviews.length > 0 && `(${reviews.length})`}</div>
          {reviews.length === 0 && <div className="pub-rv-empty">ยังไม่มีรีวิว — เป็นคนแรกที่รีวิวร้านนี้</div>}
          {reviews.slice(0, 8).map(r => (
            <div key={r.id} className="pub-rv-item">
              <div className="pub-rv-top">
                <span className="pub-rv-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                <span className="pub-rv-name">{r.reviewerName || 'ลูกค้า'}</span>
                {r.at && <span className="pub-rv-date">{r.at}</span>}
              </div>
              {r.text && <div className="pub-rv-text">{r.text}</div>}
            </div>
          ))}
          {isSupabaseEnabled && (rvForm ? (
            <div className="pub-rv-form">
              <div className="pub-rv-stars-pick">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} className={`pub-rv-star ${n <= rvForm.rating ? 'on' : ''}`}
                    onClick={() => setRvForm({ ...rvForm, rating: n })}>★</button>
                ))}
              </div>
              <input placeholder="ชื่อของคุณ (ไม่บังคับ)" maxLength={60} value={rvForm.name}
                onChange={e => setRvForm({ ...rvForm, name: e.target.value })} />
              <textarea placeholder="เล่าประสบการณ์กับร้านนี้" maxLength={400} rows={2} value={rvForm.text}
                onChange={e => setRvForm({ ...rvForm, text: e.target.value })} />
              {rvMsg && <div className="skm-msg">{rvMsg}</div>}
              <div className="pub-rv-actions">
                <button className="pub-rv-send" onClick={sendReview}>ส่งรีวิว</button>
                <button className="pub-rv-cancel" onClick={() => { setRvForm(null); setRvMsg(null); }}>ยกเลิก</button>
              </div>
            </div>
          ) : (
            <button className="pub-rv-cta" onClick={() => setRvForm({ rating: 5, text: '', name: '' })}>✍️ เขียนรีวิว</button>
          ))}
        </div>

        {/* 🧪 Pre-order Validation — ลูกค้าจริงยกมือก่อนร้านลงทุนสร้าง */}
        <div className="pub-lead-box">
          {interested > 0 && <div className="pub-lead-proof">🔥 มีผู้สนใจ/สั่งจองแล้ว <b>{interested}</b> คน</div>}
          {leadSent ? (
            <div className="pub-lead-thanks">✅ รับเรื่องแล้ว! ร้านจะติดต่อกลับตามช่องทางที่ให้ไว้ — ขอบคุณที่สนใจ</div>
          ) : leadOpen ? (
            <div className="pub-lead-form">
              <div className="pub-lead-form-hd">
                {leadOpen === 'preorder' ? '🛒 สั่งจองล่วงหน้า' : '👀 ฝากความสนใจ'} — ร้านติดต่อกลับ ไม่ต้องจ่ายตอนนี้
              </div>
              <input placeholder="ชื่อของคุณ" value={leadDraft.name} maxLength={80}
                onChange={e => setLeadDraft({ ...leadDraft, name: e.target.value })} />
              <input placeholder="เบอร์โทร / LINE / อีเมล *" value={leadDraft.contact} maxLength={120}
                onChange={e => setLeadDraft({ ...leadDraft, contact: e.target.value })} />
              <input placeholder="สนใจสินค้า/บริการไหน จำนวนเท่าไหร่ (ไม่บังคับ)" value={leadDraft.note} maxLength={200}
                onChange={e => setLeadDraft({ ...leadDraft, note: e.target.value })} />
              {leadMsg && <div className="skm-msg">{leadMsg}</div>}
              <div className="pub-lead-actions">
                <button className="pub-lead-send" onClick={sendLead} disabled={leadDraft.contact.trim().length < 5}>
                  ส่งให้ร้านเลย
                </button>
                <button className="pub-lead-cancel" onClick={() => setLeadOpen(null)}>ยกเลิก</button>
              </div>
            </div>
          ) : (
            <div className="pub-lead-cta-row">
              <button className="pub-lead-cta" onClick={() => setLeadOpen('preorder')}>🛒 สั่งจองล่วงหน้า</button>
              <button className="pub-lead-cta ghost" onClick={() => setLeadOpen('interest')}>👀 สนใจ — ให้ร้านติดต่อกลับ</button>
            </div>
          )}
        </div>

        <div className="pub-sec-hd">ติดต่อธุรกิจนี้</div>
        <div className="pub-contacts">
          {sf.phone && <a className="pub-contact" href={`tel:${sf.phone.replace(/[^0-9+]/g, '')}`}>📞 {sf.phone}</a>}
          {sf.lineId && <a className="pub-contact" href={`https://line.me/ti/p/~${encodeURIComponent(sf.lineId)}`} target="_blank" rel="noreferrer">💬 LINE: {sf.lineId}</a>}
          {sf.email && <a className="pub-contact" href={`mailto:${sf.email}`}>📧 {sf.email}</a>}
          {sf.website && <a className="pub-contact" href={sf.website.startsWith('http') ? sf.website : 'https://' + sf.website} target="_blank" rel="noreferrer">🌐 เว็บไซต์</a>}
          {!sf.phone && !sf.lineId && !sf.email && !sf.website && <span className="pub-muted">ยังไม่ระบุช่องทางติดต่อ</span>}
        </div>
        <a className="pub-rfq" href={`/?rfq=${encodeURIComponent(sf.slug)}`}>
          📨 เป็นธุรกิจในระบบ? ขอใบเสนอราคา (RFQ) จากร้านนี้ →
        </a>
        {sf.updatedAt && <div className="pub-updated">อัปเดตล่าสุด {sf.updatedAt}</div>}
      </div>
    </PublicShell>
  );
}

const KIND_CHIPS: { id: '' | StorefrontKind; label: string }[] = [
  { id: '', label: 'ทั้งหมด' },
  { id: 'product', label: '🛍 สินค้า' },
  { id: 'service', label: '🛠 บริการ' },
];

const KIND_BADGE: Record<StorefrontKind, string> = {
  product: '🛍 สินค้า', service: '🛠 บริการ', both: '🛍🛠 สินค้า & บริการ',
};

export function PublicDirectoryPage() {
  const [list, setList] = useState<Storefront[] | null>(null);
  const [q, setQ] = useState('');
  const [sector, setSector] = useState('');
  const [kind, setKind] = useState<'' | StorefrontKind>('');

  useEffect(() => {
    listStorefronts().then(setList).catch(() => setList([]));
  }, []);

  // SEO: CollectionPage + ItemList จากร้านที่โหลดมา
  useEffect(() => {
    const seo = directorySeo(siteOrigin());
    if (list && list.length) seo.jsonLd.push(directoryItemList(list, siteOrigin()));
    applySeo(seo);
  }, [list]);

  // chips หมวด DBD — เฉพาะหมวดที่มีร้านจริง
  const sectorsPresent = DBD_SECTORS.filter(s =>
    (list ?? []).some(sf => sf.dbd.startsWith(`[${s.code}]`)));

  const filtered = (list ?? []).filter(sf => {
    const okKind = !kind || sf.kind === kind || sf.kind === 'both';
    const okSector = !sector || sf.dbd.startsWith(`[${sector}]`);
    const hay = [sf.name, sf.description, sf.dbd, sf.vp, sf.promo, sf.services.join(' ')]
      .join(' ').toLowerCase();
    const okQ = !q.trim() || hay.includes(q.trim().toLowerCase());
    return okKind && okSector && okQ;
  });

  const featured = filtered.filter(isFeatured);
  const regular = filtered.filter(sf => !isFeatured(sf));

  const card = (sf: Storefront, star = false) => (
    <a key={sf.slug} className={`pub-dir-card${star ? ' featured' : ''}`} href={`/b/${encodeURIComponent(sf.slug)}`}>
      {star && <div className="pub-feat-tag">⭐ ร้านแนะนำ</div>}
      {sf.images.length > 0 && <img className="pub-dir-img" src={sf.images[0]} alt={sf.name} loading="lazy" />}
      <div className="pub-dbd">{KIND_BADGE[sf.kind]} · {sectorLabel(sf.dbd)}</div>
      <div className="pub-dir-name">{sf.name}</div>
      {sf.promo && <div className="pub-dir-promo">📣 {sf.promo}</div>}
      <div className="pub-dir-desc">{sf.description.slice(0, 120)}{sf.description.length > 120 ? '…' : ''}</div>
    </a>
  );

  return (
    <PublicShell title="ตลาดธุรกิจไทย — สินค้าและบริการ">
      <h1 className="pub-dir-title">ตลาดสินค้า & บริการธุรกิจไทย</h1>
      <p className="pub-dir-sub">ธุรกิจไทยที่ขับเคลื่อนด้วยทีม AI บน CEO AI Thailand — ค้นหาสินค้า บริการ และคู่ค้าของคุณ</p>
      <p className="pub-dir-intro">
        ตลาดสินค้าและบริการของ CEO AI Thailand รวมร้านค้าและธุรกิจไทยหลากหลายหมวดหมู่ตามการจำแนกของ
        กรมพัฒนาธุรกิจการค้า (DBD) — ตั้งแต่เกษตร อาหาร งานฝีมือ ไปจนถึงบริการที่ปรึกษาและอุตสาหกรรม
        ทุกร้านบริหารด้วยทีมเอเจนต์ AI ที่ช่วยวางกลยุทธ์ ตั้งราคา และดูแลลูกค้า คุณสามารถ
        <b>ค้นหาตามชื่อร้าน สินค้า หรือโปรโมชัน</b> กรองเฉพาะ “สินค้า” หรือ “บริการ”
        และเลือกดูตามหมวดธุรกิจได้ทันที เมื่อเจอร้านที่ใช่ ส่งคำขอใบเสนอราคา (RFQ) หรือสั่งจองล่วงหน้าได้เลย
        โดยไม่ต้องสมัครสมาชิก อยากมีหน้าร้านของคุณเองบนตลาดนี้?{' '}
        <a href="/shop">เปิดร้านฟรีได้ในไม่กี่นาที →</a>
      </p>

      {/* ค้นหา + กรองประเภท */}
      <div className="pub-dir-filters">
        <input className="pub-dir-search" placeholder="🔍 ค้นหาสินค้า บริการ ชื่อร้าน โปรโมชัน…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="pub-chip-row">
        {KIND_CHIPS.map(k => (
          <button key={k.id} className={`pub-chip${kind === k.id ? ' active' : ''}`} onClick={() => setKind(k.id)}>
            {k.label}
          </button>
        ))}
        {sectorsPresent.length > 0 && <span className="pub-chip-sep" />}
        {sectorsPresent.map(s => (
          <button key={s.code} className={`pub-chip sec${sector === s.code ? ' active' : ''}`}
            onClick={() => setSector(sector === s.code ? '' : s.code)} title={s.label}>
            {s.code} · {s.label.length > 22 ? s.label.slice(0, 22) + '…' : s.label}
          </button>
        ))}
      </div>

      {list === null && <div className="pub-loading">กำลังโหลด…</div>}

      {/* 🏢 บริการจากผู้พัฒนาแพลตฟอร์ม (B. Training) — seed จริง กัน /b ว่าง (โปร่งใส ไม่ใช่ร้านปลอม) */}
      {!q && !sector && (
        <div className="pub-starter-sec">
          <div className="pub-starter-hd">🏢 บริการจากผู้พัฒนาแพลตฟอร์ม <span>B. Training Consultant · ที่ปรึกษา 20+ ปี</span></div>
          <div className="pub-dir-grid">
            {STARTER_LISTINGS.map(l => (
              <a key={l.id} className="pub-dir-card pub-starter-card"
                href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                <div className="pub-dbd">{l.category}</div>
                <div className="pub-dir-name">{l.name}</div>
                <div className="pub-dir-promo">“{l.vp}”</div>
                <div className="pub-dir-desc">{l.services.join(' · ')}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ⭐ พื้นที่โฆษณา — ร้านแนะนำ */}
      {featured.length > 0 && (
        <div className="pub-featured-sec">
          <div className="pub-featured-hd">⭐ ร้านแนะนำ <span>พื้นที่โฆษณา</span></div>
          <div className="pub-dir-grid">{featured.map(sf => card(sf, true))}</div>
        </div>
      )}

      {list !== null && filtered.length === 0 && (
        <div className="pub-notfound">
          ไม่พบธุรกิจที่ตรงเงื่อนไข — <a className="pub-link" href="/">เป็นธุรกิจแรกในหมวดนี้ ฟรี →</a>
        </div>
      )}
      <div className="pub-dir-grid">
        {regular.map(sf => card(sf))}
      </div>

      <div className="pub-ad-invite">
        อยากให้ร้านของคุณอยู่ตำแหน่ง ⭐ ร้านแนะนำ บนสุดของตลาด?{' '}
        <a href="/shop">ดูแพ็กเกจโฆษณาและร่วมประมูลตำแหน่ง →</a>
      </div>
    </PublicShell>
  );
}
