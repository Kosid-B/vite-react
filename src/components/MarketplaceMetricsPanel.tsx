import { useEffect, useState } from 'react';
import { listStorefronts } from '../lib/storefront';
import { listOpenRfqs } from '../lib/trade';
import { marketplaceMetrics, type MpMetrics } from '../lib/marketplaceMetrics';
import { fmtBaht } from '../lib/adminOps';

/* MarketplaceMetricsPanel — สุขภาพ marketplace ระดับแพลตฟอร์ม (ในแท็บเวิร์กสเปซของ Admin)
 * ป้อนธุรกรรมจาก opsTotals (ดีลปิด/มูลค่า) + โหลดซัพพลาย (หน้าร้าน) & ดีมานด์ (RFQ กลาง) เอง
 * เน้น Liquidity (ตัวเลขความเป็นความตายของ marketplace) + diagnosis honest ตาม N */

interface Props { txns: number; gmv: number; }

const MATURITY_LABEL: Record<MpMetrics['maturity'], string> = {
  'pre-launch': 'ก่อนเปิดตลาด', seeding: 'กำลังเพาะตลาด', liquid: 'ตลาดเริ่มหมุน',
};
const ALERT_ICON = { warn: '⚠️', info: 'ℹ️', good: '✅' } as const;

export default function MarketplaceMetricsPanel({ txns, gmv }: Props) {
  const [m, setM] = useState<MpMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [shops, rfqs] = await Promise.all([
        listStorefronts().catch(() => []),
        listOpenRfqs().catch(() => []),
      ]);
      if (!alive) return;
      const published = shops.filter(s => s.published);
      const sellers = new Set(published.map(s => s.workspaceId ?? s.slug)).size;
      setM(marketplaceMetrics({ listings: published.length, sellers, txns, gmv, demandSignals: rfqs.length }));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [txns, gmv]);

  if (loading || !m) {
    return <div className="mpm" style={{ padding: '14px 16px', color: 'var(--ink4,#64748b)', fontSize: 13 }}>กำลังโหลดสุขภาพ marketplace…</div>;
  }

  const kpis: { n: string; l: string; hint?: string }[] = [
    { n: fmtBaht(m.gmv), l: 'GMV (มูลค่าธุรกรรม)' },
    { n: (m.takeRate * 100).toFixed(1) + '%', l: 'Take rate', hint: `รายได้แพลตฟอร์ม ${fmtBaht(m.takeRevenue)}` },
    { n: (m.liquidity * 100).toFixed(0) + '%', l: 'Liquidity', hint: 'สัดส่วนร้านที่มีธุรกรรม (proxy)' },
    { n: String(m.listings), l: 'หน้าร้าน (ซัพพลาย)' },
    { n: String(m.demandSignals), l: 'RFQ เปิด (ดีมานด์)' },
    { n: String(m.txns), l: 'ธุรกรรมสำเร็จ' },
  ];

  return (
    <div className="mpm" style={{ border: '1px solid var(--sand,#e2e8f0)', borderRadius: 12, padding: '14px 16px', margin: '14px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 16, fontWeight: 800 }}>🛒 สุขภาพ Marketplace (แพลตฟอร์ม)</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, background: 'var(--cream3,#eef2f7)', color: 'var(--ink4,#64748b)', padding: '2px 9px', borderRadius: 999 }}>
          {MATURITY_LABEL[m.maturity]}
        </span>
      </div>

      <div className="ops-kpis" style={{ marginBottom: 10 }}>
        {kpis.map(k => (
          <div className="ops-kpi" key={k.l} title={k.hint}>
            <div className="ops-kpi-n">{k.n}</div>
            <div className="ops-kpi-l">{k.l}</div>
          </div>
        ))}
      </div>

      {m.alerts.length > 0 && (
        <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
          {m.alerts.map((a, i) => (
            <div key={i} style={{
              fontSize: 12.5, lineHeight: 1.5, padding: '7px 11px', borderRadius: 8,
              background: a.level === 'warn' ? 'rgba(245,158,11,.12)' : a.level === 'good' ? 'rgba(34,197,94,.12)' : 'rgba(6,182,212,.10)',
              border: `1px solid ${a.level === 'warn' ? 'rgba(245,158,11,.35)' : a.level === 'good' ? 'rgba(34,197,94,.35)' : 'rgba(6,182,212,.3)'}`,
            }}>
              {ALERT_ICON[a.level]} {a.msg}
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink3,#475569)' }}>
        <b>วินิจฉัย:</b> {m.diagnosis}
      </div>
    </div>
  );
}
