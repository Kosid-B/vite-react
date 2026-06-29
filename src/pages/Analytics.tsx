import type { AppData } from '../types';

interface Props { data: AppData }

const PLANS = [
  { id: 'free',   name: 'Free (Trial)', price: 0,    apiCalls: 50,   margin: 0    },
  { id: 'growth', name: 'Growth',       price: 1490, apiCalls: 1000, margin: 0.63 },
  { id: 'scale',  name: 'Scale',        price: 5900, apiCalls: 5000, margin: 0.65 },
] as const;

const ASSUMED_MONTHLY_CHURN = 0.04;   // 4% benchmark
const ASSUMED_CAC_MONTHS    = 3;      // months of revenue to recover CAC

function baht(n: number) {
  return '฿' + n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function gauge(ratio: number) {
  if (ratio >= 5) return { color: 'var(--green)', label: 'ดีเยี่ยม' };
  if (ratio >= 3) return { color: 'var(--rust)',  label: 'ดี' };
  if (ratio >= 1) return { color: 'var(--amber)', label: 'เสี่ยง' };
  return { color: '#ef4444', label: 'วิกฤต' };
}

export default function Analytics({ data }: Props) {
  const sub = data.subscription;
  const invoices = sub.invoices ?? [];
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');

  const plan = PLANS.find(p => p.id === sub.plan) ?? PLANS[0];
  const mrr  = plan.price;

  /* revenue from invoices */
  const totalRevenue = paidInvoices.reduce((s, inv) => s + inv.amount, 0);

  /* plan breakdown from invoice history */
  const planCounts: Record<string, { count: number; revenue: number }> = {};
  for (const inv of paidInvoices) {
    if (!planCounts[inv.plan]) planCounts[inv.plan] = { count: 0, revenue: 0 };
    planCounts[inv.plan].count++;
    planCounts[inv.plan].revenue += inv.amount;
  }

  /* LTV calculation */
  const arpu  = mrr > 0 ? mrr : 0;
  const grossMargin = plan.margin;
  const ltv   = arpu > 0 ? Math.round((arpu * grossMargin) / ASSUMED_MONTHLY_CHURN) : 0;
  const cac   = arpu > 0 ? Math.round(arpu * ASSUMED_CAC_MONTHS) : 0;
  const ltvCacRatio = cac > 0 ? ltv / cac : 0;
  const paybackMonths = cac > 0 && arpu > 0 && grossMargin > 0
    ? Math.round(cac / (arpu * grossMargin))
    : 0;

  const nrrPct  = 100;                          // placeholder — needs cohort data
  const churnPct = (ASSUMED_MONTHLY_CHURN * 100).toFixed(1);

  const statusColor: Record<string, string> = {
    none: 'var(--ink4)', trial: 'var(--amber)', pending_payment: 'var(--amber)',
    active: 'var(--green)', past_due: '#ef4444', cancelled: '#ef4444',
  };
  const statusLabel: Record<string, string> = {
    none: 'ไม่มีแพ็ก', trial: 'ทดลองใช้', pending_payment: 'รอชำระ',
    active: 'ใช้งานอยู่', past_due: 'เกินกำหนด', cancelled: 'ยกเลิกแล้ว',
  };

  const g = gauge(ltvCacRatio);

  const recentInvoices = [...invoices].reverse().slice(0, 8);

  return (
    <div className="an-page">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink4)', marginBottom: 6 }}>
          ✦ SaaS Metrics
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
          Analytics Dashboard
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'var(--ink3)' }}>
            แผน: {plan.name}
          </span>
          <span style={{ background: statusColor[sub.status] + '18', border: `1px solid ${statusColor[sub.status]}40`, color: statusColor[sub.status], borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
            {statusLabel[sub.status]}
          </span>
          {sub.currentPeriodEnd && (
            <span style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'var(--ink3)' }}>
              ต่ออายุ: {new Date(sub.currentPeriodEnd).toLocaleDateString('th-TH')}
            </span>
          )}
        </div>
      </div>

      {/* Tier 1 — KPI Cards */}
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink4)', marginBottom: 10 }}>Tier 1 — ตัวชี้วัดหลัก (รายวัน/รายสัปดาห์)</div>
      <div className="an-grid an-grid-4">
        <div className="an-card">
          <div className="an-card-label">MRR</div>
          <div className="an-card-value" style={{ color: mrr > 0 ? 'var(--rust)' : 'var(--ink4)' }}>
            {mrr > 0 ? baht(mrr) : '—'}
          </div>
          <div className="an-card-sub">Monthly Recurring Revenue</div>
          {mrr === 0 && <div className="an-card-hint">อัปเกรดแพ็กเกจเพื่อเริ่ม MRR</div>}
        </div>

        <div className="an-card">
          <div className="an-card-label">ARPU</div>
          <div className="an-card-value" style={{ color: arpu > 0 ? 'var(--ink)' : 'var(--ink4)' }}>
            {arpu > 0 ? baht(arpu) : '—'}
          </div>
          <div className="an-card-sub">Avg Revenue Per User / เดือน</div>
        </div>

        <div className="an-card">
          <div className="an-card-label">Monthly Churn Rate</div>
          <div className="an-card-value" style={{ color: 'var(--amber)' }}>{churnPct}%</div>
          <div className="an-card-sub">ค่าเฉลี่ยอุตสาหกรรม SaaS</div>
          <div className="an-card-hint">ต่ำกว่า 2% = ดีเยี่ยม · เกิน 5% = ต้องแก้ไข</div>
        </div>

        <div className="an-card">
          <div className="an-card-label">Total Revenue</div>
          <div className="an-card-value" style={{ color: totalRevenue > 0 ? 'var(--green)' : 'var(--ink4)' }}>
            {totalRevenue > 0 ? baht(totalRevenue) : '—'}
          </div>
          <div className="an-card-sub">รายได้สะสม (จากใบแจ้งหนี้ที่ชำระแล้ว)</div>
        </div>
      </div>

      {/* Tier 2 — Unit Economics */}
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink4)', margin: '28px 0 10px' }}>Tier 2 — Unit Economics (รายเดือน)</div>
      <div className="an-grid an-grid-3">
        <div className="an-card an-card--accent">
          <div className="an-card-label">LTV (Lifetime Value)</div>
          <div className="an-card-value" style={{ color: 'var(--rust)' }}>
            {ltv > 0 ? baht(ltv) : '—'}
          </div>
          <div className="an-card-sub">= ARPU × Margin ÷ Churn Rate</div>
          {ltv > 0 && (
            <div className="an-formula">
              {baht(arpu)} × {(grossMargin*100).toFixed(0)}% ÷ {churnPct}%
            </div>
          )}
        </div>

        <div className="an-card an-card--accent">
          <div className="an-card-label">LTV : CAC Ratio</div>
          <div className="an-card-value" style={{ color: g.color }}>
            {ltvCacRatio > 0 ? ltvCacRatio.toFixed(1) + ':1' : '—'}
          </div>
          <div className="an-card-sub" style={{ color: g.color }}>{ltvCacRatio > 0 ? g.label : 'ยังไม่มีข้อมูล'}</div>
          <div className="an-card-hint">เป้าหมาย ≥ 3:1 · CAC ≈ {cac > 0 ? baht(cac) : '—'}</div>
        </div>

        <div className="an-card an-card--accent">
          <div className="an-card-label">Payback Period</div>
          <div className="an-card-value" style={{ color: paybackMonths > 0 && paybackMonths <= 12 ? 'var(--green)' : 'var(--ink4)' }}>
            {paybackMonths > 0 ? paybackMonths + ' เดือน' : '—'}
          </div>
          <div className="an-card-sub">ระยะเวลาคืนทุน CAC</div>
          <div className="an-card-hint">ต่ำกว่า 12 เดือน = ดี</div>
        </div>
      </div>

      {/* Plan Details + NRR */}
      <div className="an-grid an-grid-2" style={{ marginTop: 16 }}>
        {/* Plan breakdown */}
        <div className="an-card" style={{ padding: '16px 20px' }}>
          <div className="an-card-label" style={{ marginBottom: 12 }}>แผนและต้นทุน</div>
          {PLANS.filter(p => p.price > 0).map(p => (
            <div key={p.id} className="an-row">
              <div>
                <span style={{ fontSize: 13, color: 'var(--ink2)', fontWeight: p.id === sub.plan ? 700 : 400 }}>{p.name}</span>
                {p.id === sub.plan && <span className="an-badge-active">ใช้อยู่</span>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{baht(p.price)}/เดือน</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)' }}>กำไร {(p.margin*100).toFixed(0)}% · {p.apiCalls.toLocaleString()} AI calls</div>
              </div>
            </div>
          ))}
        </div>

        {/* NRR + Gross Margin */}
        <div className="an-card" style={{ padding: '16px 20px' }}>
          <div className="an-card-label" style={{ marginBottom: 12 }}>Tier 3 — Deep Dive</div>
          <div className="an-row">
            <span style={{ fontSize: 13, color: 'var(--ink2)' }}>Gross Margin</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: grossMargin > 0 ? 'var(--green)' : 'var(--ink4)' }}>
              {grossMargin > 0 ? (grossMargin*100).toFixed(0) + '%' : '—'}
            </span>
          </div>
          <div className="an-row">
            <span style={{ fontSize: 13, color: 'var(--ink2)' }}>Net Revenue Retention</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--rust)' }}>{nrrPct}%</span>
          </div>
          <div className="an-row">
            <span style={{ fontSize: 13, color: 'var(--ink2)' }}>Auto Renew</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: sub.autoRenew ? 'var(--green)' : 'var(--amber)' }}>
              {sub.autoRenew ? '✓ เปิด' : '✗ ปิด'}
            </span>
          </div>
          <div className="an-row">
            <span style={{ fontSize: 13, color: 'var(--ink2)' }}>AI Calls / เดือน</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
              {plan.apiCalls.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Invoice History */}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink4)', marginBottom: 10 }}>ประวัติใบแจ้งหนี้</div>
        <div className="an-card" style={{ padding: 0, overflow: 'hidden' }}>
          {recentInvoices.length === 0 ? (
            <div style={{ padding: '24px 20px', color: 'var(--ink4)', fontSize: 13, textAlign: 'center' }}>
              ยังไม่มีใบแจ้งหนี้ · ชำระแพ็กเกจครั้งแรกเพื่อเริ่มติดตาม MRR
            </div>
          ) : (
            <table className="an-table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>แผน</th>
                  <th style={{ textAlign: 'right' }}>จำนวน</th>
                  <th style={{ textAlign: 'center' }}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={{ color: 'var(--ink3)', fontSize: 12 }}>
                      {new Date(inv.date).toLocaleDateString('th-TH')}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {PLANS.find(p => p.id === inv.plan)?.name ?? inv.plan}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ink)' }}>
                      {baht(inv.amount)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`an-status an-status--${inv.status}`}>
                        {inv.status === 'paid' ? '✓ ชำระแล้ว' : inv.status === 'pending' ? '⏳ รอชำระ' : '✗ ล้มเหลว'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Alert thresholds */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink4)', marginBottom: 10 }}>Alert Thresholds</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AlertRow
            label="LTV:CAC Ratio"
            value={ltvCacRatio > 0 ? ltvCacRatio.toFixed(1) + ':1' : 'ยังไม่มีข้อมูล'}
            ok={ltvCacRatio === 0 || ltvCacRatio >= 3}
            hint="เป้าหมาย ≥ 3:1 · ต่ำกว่านี้ต้นทุนหาลูกค้าสูงเกินไป"
          />
          <AlertRow
            label="Churn Rate"
            value={churnPct + '%'}
            ok={ASSUMED_MONTHLY_CHURN <= 0.05}
            hint="เกิน 5%/เดือน = ต้องปรับกลยุทธ์ retention ด่วน"
          />
          <AlertRow
            label="Auto Renew"
            value={sub.autoRenew ? 'เปิด' : 'ปิด'}
            ok={sub.autoRenew}
            hint="ปิด Auto Renew เพิ่มความเสี่ยง churn รายเดือน"
          />
          <AlertRow
            label="Gross Margin"
            value={grossMargin > 0 ? (grossMargin*100).toFixed(0) + '%' : '—'}
            ok={grossMargin === 0 || grossMargin >= 0.5}
            hint="SaaS ที่ดีควรมี gross margin ≥ 50%"
          />
        </div>
      </div>

      {/* Benchmark note */}
      <div className="an-benchmark">
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--rust)', marginBottom: 6 }}>✦ SaaS Benchmark Reference</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {[
            { label: 'LTV:CAC ที่ดี', value: '≥ 3:1' },
            { label: 'Churn ที่ดี', value: '< 2%/เดือน' },
            { label: 'Gross Margin', value: '60–80%' },
            { label: 'Payback Period', value: '< 12 เดือน' },
            { label: 'NRR ที่ดี', value: '≥ 100%' },
            { label: 'CAC ปกติ', value: '1–3× ARPU' },
          ].map(b => (
            <div key={b.label} style={{ background: 'var(--cream3)', borderRadius: 6, padding: '8px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{b.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginTop: 2 }}>{b.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertRow({ label, value, ok, hint }: { label: string; value: string; ok: boolean; hint: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'var(--cream2)', border: `1px solid ${ok ? 'var(--sand)' : '#ef444440'}`,
      borderLeft: `3px solid ${ok ? 'var(--green)' : '#ef4444'}`,
      borderRadius: 'var(--r)', padding: '10px 14px',
    }}>
      <span style={{ fontSize: 16 }}>{ok ? '✓' : '⚠'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink2)' }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: ok ? 'var(--green)' : '#ef4444' }}>{value}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>{hint}</div>
      </div>
    </div>
  );
}
