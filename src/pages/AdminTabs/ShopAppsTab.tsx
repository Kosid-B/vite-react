import { useEffect, useState } from 'react';
import {
  listShopApplications, updateShopApplication, SHOP_PACKAGES,
  type ShopApplication,
} from '../../lib/shopApply';
import { isFeatured, listStorefronts, setFeatured, type Storefront } from '../../lib/storefront';

/** Admin: ใบสมัครร้านตลาดฝากขายสินค้า (จากฟอร์มสาธารณะ /shop)
 *  ติดต่อกลับทางเบอร์/LINE → เปิดร้านให้ → อัปเดตสถานะ */

const STATUS_LABEL: Record<ShopApplication['status'], { label: string; cls: string }> = {
  new:       { label: '🆕 ใหม่', cls: 'open' },
  contacted: { label: '📞 ติดต่อแล้ว', cls: 'quoted' },
  approved:  { label: '✅ เปิดร้านแล้ว', cls: 'closed' },
  rejected:  { label: '⛔ ไม่ผ่าน', cls: 'cancelled' },
};

export default function ShopAppsTab() {
  const [apps, setApps] = useState<ShopApplication[]>([]);
  const [shops, setShops] = useState<Storefront[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    setApps(await listShopApplications());
    setShops(await listStorefronts());
  }
  useEffect(() => { reload().catch(() => setMsg('⚠️ โหลดข้อมูลไม่สำเร็จ')); }, []);

  /** ตั้ง/ถอดตำแหน่ง ⭐ ร้านแนะนำ (พื้นที่โฆษณาบน /b — ผู้ชนะประมูลจาก /shop มารับตรงนี้) */
  async function feature(sf: Storefront, days: number | null) {
    setBusy(true);
    const until = days ? new Date(Date.now() + days * 86400000).toISOString() : null;
    const err = await setFeatured(sf.slug, until);
    setBusy(false);
    if (err) { setMsg('⚠️ ' + err); return; }
    setMsg(days
      ? `⭐ ปักหมุด "${sf.name}" เป็นร้านแนะนำ ${days} วัน`
      : `ถอด "${sf.name}" ออกจากร้านแนะนำแล้ว`);
    reload();
  }

  async function setStatus(a: ShopApplication, status: ShopApplication['status']) {
    setBusy(true);
    const err = await updateShopApplication(a.id, status);
    setBusy(false);
    if (err) { setMsg('⚠️ ' + err); return; }
    setMsg(`✅ "${a.shopName}" → ${STATUS_LABEL[status].label}`);
    reload();
  }

  const pkgName = (id: string) => SHOP_PACKAGES.find(p => p.id === id)?.name ?? id;
  const newCount = apps.filter(a => a.status === 'new').length;

  return (
    <div>
      <div className="adm-skill-hd">🏪 ใบสมัครร้านตลาดฝากขาย {newCount > 0 && <span className="auc-mine">{newCount} รายการใหม่</span>}</div>
      <p className="sipoc-intro">
        ใบสมัครจากฟอร์มสาธารณะ ceoaithailand.org/shop — ติดต่อกลับทางเบอร์/LINE ภายใน 24 ชม.
        เปิดร้านให้แล้วกด "เปิดร้านแล้ว"
      </p>
      {msg && <div className="sipoc-gen-msg">{msg}</div>}

      {/* ⭐ พื้นที่โฆษณา — ตำแหน่งร้านแนะนำบนตลาด /b */}
      <div className="adm-skill-hd" style={{ marginTop: 18 }}>⭐ ตำแหน่งร้านแนะนำ (พื้นที่โฆษณาบนตลาด /b)</div>
      <p className="sipoc-intro">
        ร้านที่ปักหมุดจะขึ้นบนสุดของตลาดในกรอบ "⭐ ร้านแนะนำ" — ใช้มอบตำแหน่งให้ผู้ชนะประมูล
        หรือร้านแพ็กเกจรายสัปดาห์ขึ้นไป
      </p>
      {shops.length === 0 && <div className="trade-empty">ยังไม่มีหน้าร้านที่เผยแพร่ในระบบ</div>}
      {shops.map(sf => (
        <div key={sf.slug} className="auc-card">
          <div className="auc-main">
            <div className="auc-title">🏪 {sf.name}
              {isFeatured(sf) && <span className="auc-mine">⭐ แนะนำถึง {new Date(sf.featuredUntil!).toLocaleDateString('th-TH')}</span>}
            </div>
            <div className="auc-meta">/b/{sf.slug}{sf.promo && <> · 📣 {sf.promo}</>}</div>
          </div>
          <div className="auc-side">
            {isFeatured(sf) ? (
              <button className="skm-btn cancel" disabled={busy} onClick={() => feature(sf, null)}>ถอดออก</button>
            ) : (
              <>
                <button className="auc-close-btn" disabled={busy} onClick={() => feature(sf, 7)}>⭐ ปักหมุด 7 วัน</button>
                <button className="auc-close-btn" disabled={busy} onClick={() => feature(sf, 30)}>⭐ 30 วัน</button>
              </>
            )}
          </div>
        </div>
      ))}

      <div className="adm-skill-hd" style={{ marginTop: 18 }}>📋 ใบสมัครทั้งหมด</div>
      {apps.length === 0 && <div className="trade-empty">ยังไม่มีใบสมัคร — แชร์ลิงก์ /shop เพื่อรับร้านค้าแรก</div>}
      {apps.map(a => (
        <div key={a.id} className="auc-card">
          <div className="auc-main">
            <div className="auc-title">🏪 {a.shopName}
              <span className={`auc-status ${STATUS_LABEL[a.status].cls}`}>{STATUS_LABEL[a.status].label}</span>
            </div>
            {a.products && <div className="auc-desc">ขาย: {a.products}</div>}
            <div className="auc-meta">
              แพ็กเกจ <b>{pkgName(a.package)}</b>
              {a.category && <> · {a.category}</>}
              {' '}· 📞 {a.phone}
              {a.lineId && <> · LINE: {a.lineId}</>}
              {' '}· {new Date(a.createdAt).toLocaleString('th-TH')}
            </div>
          </div>
          <div className="auc-side">
            {a.status === 'new' && (
              <button className="auc-close-btn" disabled={busy} onClick={() => setStatus(a, 'contacted')}>📞 ติดต่อแล้ว</button>
            )}
            {(a.status === 'new' || a.status === 'contacted') && (
              <>
                <button className="auc-close-btn" disabled={busy} onClick={() => setStatus(a, 'approved')}>✅ เปิดร้านแล้ว</button>
                <button className="skm-btn cancel" disabled={busy} onClick={() => setStatus(a, 'rejected')}>ไม่ผ่าน</button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
