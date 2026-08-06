import { useEffect, useState } from 'react';
import { isSupabaseEnabled } from '../../lib/supabase';
import { adminListWorkspaces, wsLoad } from '../../lib/workspaces';
import { funnelSummary, type FunnelSummary } from '../../lib/funnel';
import { listLeads, leadStats, type LeadStats, type ChannelStat } from '../../lib/platformLead';

/* Growth Dashboard — รวมตัวเลขการเติบโตในแอปที่เดียว: ผู้สมัคร + lead + funnel
 * (คนเข้าดู Landing = GA4 · ในแอปวัดไม่ได้เพราะยังไม่ล็อกอิน) */

const GA4_ID = 'G-CHJ99RY1Q1';

function Kpi({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: '16px 18px', background: 'var(--cream2)' }}>
      <div style={{ fontSize: 12.5, color: 'var(--ink3)' }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: color ?? 'var(--ink)', lineHeight: 1.15, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ChannelBars({ title, stats }: { title: string; stats: ChannelStat[] }) {
  const max = Math.max(1, ...stats.map(s => s.count));
  return (
    <div style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: '14px 16px', background: 'var(--cream2)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>{title}</div>
      {stats.length === 0 && <div style={{ color: 'var(--ink3)', fontSize: 13 }}>ยังไม่มี lead</div>}
      <div style={{ display: 'grid', gap: 8 }}>
        {stats.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 110, fontSize: 12.5, color: 'var(--ink)', flex: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
            <div style={{ flex: 1, height: 15, borderRadius: 5, background: 'var(--cream)', overflow: 'hidden' }}>
              <div style={{ width: `${(s.count / max) * 100}%`, height: '100%', background: '#0891b2', borderRadius: 5 }} />
            </div>
            <span style={{ width: 72, textAlign: 'right', fontSize: 12, color: 'var(--ink3)', flex: 'none' }}>{s.count} · {s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GrowthDashboard() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [signups, setSignups] = useState(0);
  const [funnel, setFunnel] = useState<FunnelSummary | null>(null);
  const [lstats, setLstats] = useState<LeadStats | null>(null);

  async function load() {
    if (!isSupabaseEnabled) return;
    setLoading(true); setMsg(null);
    try {
      const rows = await adminListWorkspaces();
      setSignups(rows.length);
      const states = await Promise.all(rows.map(r => wsLoad(r.id).catch(() => null)));
      setFunnel(funnelSummary(states));
      const leads = await listLeads();
      setLstats(leadStats(leads, new Date().toISOString().slice(0, 10)));
      setMsg(`อัปเดตแล้ว · ${rows.length} เวิร์กสเปซ`);
    } catch (e) {
      setMsg('โหลดไม่สำเร็จ: ' + (e instanceof Error ? e.message : String(e)));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  if (!isSupabaseEnabled) {
    return <p style={{ color: 'var(--ink3)', fontSize: 14 }}>โหมด local — Dashboard การเติบโตใช้ได้เฉพาะ production (มี Supabase)</p>;
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>📈 Dashboard การเติบโต</h3>
        <button onClick={load} style={{ background: 'transparent', color: 'var(--ink)', border: '1px solid var(--sand)', borderRadius: 8, padding: '7px 14px', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
          {loading ? 'กำลังโหลด…' : '↻ รีเฟรช'}
        </button>
        {msg && <span style={{ fontSize: 12.5, color: 'var(--ink3)' }}>{msg}</span>}
      </div>

      {/* KPI หลัก */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <Kpi label="👥 ผู้สมัคร (เวิร์กสเปซ)" value={signups} sub="นับจริงในระบบ" />
        <Kpi label="🧲 Lead ทั้งหมด" value={lstats?.total ?? '—'} sub={lstats ? `+${lstats.last7} ใน 7 วัน` : undefined} color="#0891b2" />
        <Kpi label="🚦 Activation" value={funnel ? `${funnel.activationRate}%` : '—'} sub="สร้างบริษัท/เปิดร้าน" color="#16a34a" />
        <Kpi label="📊 คนเข้า Landing" value="GA4" sub="ดูใน Google Analytics" color="var(--ink3)" />
      </div>

      {/* Funnel */}
      {funnel && funnel.total > 0 && (
        <div style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: '16px 18px', background: 'var(--cream2)' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>
            🚦 Funnel — จากผู้สมัคร {funnel.total} คน · activate {funnel.activationRate}%
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {funnel.stages.map((s, i) => (
              <div key={s.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
                  <span style={{ color: 'var(--ink)' }}>{i + 1}. {s.label}</span>
                  <span style={{ color: 'var(--ink3)' }}>{s.count} · {s.pct}%</span>
                </div>
                <div style={{ height: 12, borderRadius: 5, background: 'var(--cream)', overflow: 'hidden' }}>
                  <div style={{ width: `${s.pct}%`, height: '100%', background: '#0891b2', borderRadius: 5 }} />
                </div>
                {i > 0 && s.dropFromPrev > 0 && (
                  <div style={{ fontSize: 11.5, color: '#dc2626', marginTop: 2 }}>↓ หลุด {s.dropFromPrev}% จากขั้นก่อน</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lead มาจากช่องไหน */}
      {lstats && (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <ChannelBars title="🧲 Lead มาจากช่องไหน (medium)" stats={lstats.byMedium} />
          <ChannelBars title="🎯 Lead จากแคมเปญ (campaign)" stats={lstats.byCampaign} />
        </div>
      )}

      {/* หมายเหตุ GA4 */}
      <div style={{ border: '1px dashed var(--sand)', borderRadius: 12, padding: '14px 16px', background: 'var(--cream)', fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.7 }}>
        📊 <b style={{ color: 'var(--ink)' }}>คนเข้าดู Landing page</b> วัดในแอปไม่ได้ (คนดูยังไม่ล็อกอิน) — ดูใน{' '}
        <a href="https://analytics.google.com" target="_blank" rel="noreferrer" style={{ color: '#0891b2', fontWeight: 600 }}>Google Analytics</a>{' '}
        (property <b>{GA4_ID}</b>): Reports → Pages (page_view) · Acquisition → Traffic (utm) · นับเฉพาะคนที่กด “ยอมรับคุกกี้” (PDPA)
        <br />
        🔒 ตัวเลขในหน้านี้มาจากระบบจริง (RLS is_app_admin) · <b style={{ color: 'var(--ink)' }}>ผู้สมัคร</b> = แม่นเป๊ะ · loop: โพสต์(ใส่ utm) → รีเฟรช → ดูช่องไหนได้ lead/สมัคร
      </div>
    </div>
  );
}
