import { useEffect, useState } from 'react';
import {
  listShopApplications, updateShopApplication, SHOP_PACKAGES,
  type ShopApplication,
} from '../../lib/shopApply';

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
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() { setApps(await listShopApplications()); }
  useEffect(() => { reload().catch(() => setMsg('⚠️ โหลดข้อมูลไม่สำเร็จ')); }, []);

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
