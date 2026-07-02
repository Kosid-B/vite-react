import { useEffect, useState } from 'react';
import { getStorefront, listStorefronts, type Storefront } from '../lib/storefront';
import { DBD_SECTORS } from '../data/dbd';

/* ===== Marketplace M1 — หน้าสาธารณะ (ไม่ต้องล็อกอิน) =====
 * /b        → สารบัญธุรกิจ จัดกลุ่มตามหมวด DBD
 * /b/<slug> → หน้าร้านของบริษัท */

function sectorLabel(dbd: string): string {
  const m = dbd.match(/^\[([A-Z])\]/);
  const sec = m ? DBD_SECTORS.find(s => s.code === m[1]) : undefined;
  return sec ? `หมวด ${sec.code} · ${sec.label}` : (dbd || 'ไม่ระบุหมวด');
}

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

  useEffect(() => {
    getStorefront(decodeURIComponent(slug)).then(setSf).catch(() => setSf(null));
  }, [slug]);

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
        {sf.description && <p className="pub-desc">{sf.description}</p>}

        {sf.services.length > 0 && (
          <>
            <div className="pub-sec-hd">สินค้า / บริการ</div>
            <ul className="pub-services">
              {sf.services.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </>
        )}

        <div className="pub-sec-hd">ติดต่อธุรกิจนี้</div>
        <div className="pub-contacts">
          {sf.phone && <a className="pub-contact" href={`tel:${sf.phone.replace(/[^0-9+]/g, '')}`}>📞 {sf.phone}</a>}
          {sf.lineId && <a className="pub-contact" href={`https://line.me/ti/p/~${encodeURIComponent(sf.lineId)}`} target="_blank" rel="noreferrer">💬 LINE: {sf.lineId}</a>}
          {sf.email && <a className="pub-contact" href={`mailto:${sf.email}`}>📧 {sf.email}</a>}
          {sf.website && <a className="pub-contact" href={sf.website.startsWith('http') ? sf.website : 'https://' + sf.website} target="_blank" rel="noreferrer">🌐 เว็บไซต์</a>}
          {!sf.phone && !sf.lineId && !sf.email && !sf.website && <span className="pub-muted">ยังไม่ระบุช่องทางติดต่อ</span>}
        </div>
        {sf.updatedAt && <div className="pub-updated">อัปเดตล่าสุด {sf.updatedAt}</div>}
      </div>
    </PublicShell>
  );
}

export function PublicDirectoryPage() {
  const [list, setList] = useState<Storefront[] | null>(null);
  const [q, setQ] = useState('');
  const [sector, setSector] = useState('');

  useEffect(() => {
    listStorefronts().then(setList).catch(() => setList([]));
  }, []);

  const filtered = (list ?? []).filter(sf => {
    const okSector = !sector || sf.dbd.startsWith(`[${sector}]`);
    const okQ = !q.trim() || (sf.name + ' ' + sf.description + ' ' + sf.dbd).toLowerCase().includes(q.trim().toLowerCase());
    return okSector && okQ;
  });

  return (
    <PublicShell title="สารบัญธุรกิจไทย">
      <h1 className="pub-dir-title">สารบัญธุรกิจ</h1>
      <p className="pub-dir-sub">ธุรกิจไทยที่ขับเคลื่อนด้วยทีม AI บน CEO AI Thailand — ค้นหาคู่ค้าตามหมวด DBD</p>
      <div className="pub-dir-filters">
        <input className="pub-dir-search" placeholder="ค้นหาชื่อธุรกิจ / บริการ…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="pub-dir-sector" value={sector} onChange={e => setSector(e.target.value)}>
          <option value="">ทุกหมวด DBD</option>
          {DBD_SECTORS.map(s => <option key={s.code} value={s.code}>หมวด {s.code} · {s.label}</option>)}
        </select>
      </div>

      {list === null && <div className="pub-loading">กำลังโหลด…</div>}
      {list !== null && filtered.length === 0 && (
        <div className="pub-notfound">
          ยังไม่มีธุรกิจในหมวดนี้ — <a className="pub-link" href="/">เป็นธุรกิจแรกที่นี่ ฟรี →</a>
        </div>
      )}
      <div className="pub-dir-grid">
        {filtered.map(sf => (
          <a key={sf.slug} className="pub-dir-card" href={`/b/${encodeURIComponent(sf.slug)}`}>
            <div className="pub-dbd">{sectorLabel(sf.dbd)}</div>
            <div className="pub-dir-name">{sf.name}</div>
            <div className="pub-dir-desc">{sf.description.slice(0, 120)}{sf.description.length > 120 ? '…' : ''}</div>
          </a>
        ))}
      </div>
    </PublicShell>
  );
}
