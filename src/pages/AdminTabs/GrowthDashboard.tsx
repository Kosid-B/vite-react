import { useEffect, useMemo, useState } from 'react';
import type { AppData } from '../../types';
import { isSupabaseEnabled } from '../../lib/supabase';
import { adminListWorkspaces, wsLoad } from '../../lib/workspaces';
import { funnelSummary, type FunnelSummary } from '../../lib/funnel';
import { listLeads, leadStats, type LeadStats, type ChannelStat } from '../../lib/platformLead';
import {
  DEFAULT_GROWTH_ECO, weekMetrics, ltvOf, isoWeekTag, healthLabel,
  type GrowthEcoState, type GChannelId, type GChannelEntry, type Health,
} from '../../lib/growthEconomics';
import { signupsForWeek, type SignupRecord } from '../../lib/attribution';

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

const HEALTH_COLOR: Record<Health, string> = { good: '#16a34a', ok: '#f59e0b', weak: '#dc2626', organic: '#0891b2', na: 'var(--ink3)' };
const baht = (n: number | null) => (n == null ? '—' : '฿' + n.toLocaleString('th-TH'));

/** Unit economics รายสัปดาห์: LTV/CAC/COCA/ROI ต่อช่องทาง (กรอกมือ) */
function UnitEconomics({ data, onUpdate, real }: { data: AppData; onUpdate: (d: AppData) => void; real?: Record<GChannelId, number> | null }) {
  const eco: GrowthEcoState = data.growthEco ?? DEFAULT_GROWTH_ECO;
  const save = (next: GrowthEcoState) => onUpdate({ ...data, growthEco: next });
  const realTotal = real ? Object.values(real).reduce((a, b) => a + b, 0) : 0;

  // สัปดาห์ปัจจุบัน — สร้างอัตโนมัติถ้ายังไม่มี
  const curTag = isoWeekTag(new Date());
  const week = useMemo(() => eco.weeks.find(w => w.weekTag === curTag) ?? { weekTag: curTag, entries: {} }, [eco, curTag]);
  const wm = useMemo(() => weekMetrics(eco, week), [eco, week]);

  const setAssume = (k: 'arpu' | 'lifetimeMonths' | 'currentMRR', v: number) => save({ ...eco, [k]: Math.max(0, v || 0) });
  const setEntry = (ch: GChannelId, k: keyof GChannelEntry, v: number) => {
    const cur: GChannelEntry = week.entries[ch] ?? { signups: 0, adCost: 0, otherCost: 0 };
    const nextWeek = { ...week, entries: { ...week.entries, [ch]: { ...cur, [k]: Math.max(0, v || 0) } } };
    const weeks = eco.weeks.some(w => w.weekTag === curTag)
      ? eco.weeks.map(w => (w.weekTag === curTag ? nextWeek : w))
      : [...eco.weeks, nextWeek];
    save({ ...eco, weeks });
  };

  // เติมยอดสมัคร "จริง" (จาก signupAt+source) ลงช่อง signups ทุกช่องทางของสัปดาห์นี้
  const fillReal = () => {
    if (!real) return;
    const entries = { ...week.entries };
    (Object.keys(real) as GChannelId[]).forEach(ch => {
      const cur = entries[ch] ?? { signups: 0, adCost: 0, otherCost: 0 };
      entries[ch] = { ...cur, signups: real[ch] };
    });
    const nextWeek = { ...week, entries };
    const weeks = eco.weeks.some(w => w.weekTag === curTag)
      ? eco.weeks.map(w => (w.weekTag === curTag ? nextWeek : w))
      : [...eco.weeks, nextWeek];
    save({ ...eco, weeks });
  };

  const numInput: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '7px 9px', borderRadius: 8, border: '1px solid var(--sand)', background: 'var(--cream)', color: 'var(--ink)', fontFamily: 'inherit', fontSize: 13 };
  const th: React.CSSProperties = { textAlign: 'right', fontSize: 11.5, color: 'var(--ink3)', fontWeight: 600, padding: '4px 6px', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { textAlign: 'right', fontSize: 12.5, color: 'var(--ink)', padding: '4px 6px' };

  return (
    <div style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: '16px 18px', background: 'var(--cream2)', display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>💰 Unit Economics รายสัปดาห์ — LTV / CAC / COCA / ROI <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink3)' }}>· สัปดาห์ {curTag}</span></div>
        {real && (
          <button onClick={fillReal} title="ดึงยอดสมัครจริงต่อช่องทาง (จาก utm ตอน signup) มาเติมช่อง 'สมัครใหม่'"
            style={{ background: '#0891b2', color: '#fff', border: 0, borderRadius: 8, padding: '6px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            ⤵️ เติมยอดสมัครจริง ({realTotal})
          </button>
        )}
      </div>

      {/* Assumptions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <label style={{ fontSize: 12, color: 'var(--ink3)' }}>ARPU (รายได้/สมาชิก/เดือน ฿)
          <input type="number" value={eco.arpu || ''} onChange={e => setAssume('arpu', +e.target.value)} style={numInput} /></label>
        <label style={{ fontSize: 12, color: 'var(--ink3)' }}>อายุเฉลี่ยสมาชิก (เดือน)
          <input type="number" value={eco.lifetimeMonths || ''} onChange={e => setAssume('lifetimeMonths', +e.target.value)} style={numInput} /></label>
        <label style={{ fontSize: 12, color: 'var(--ink3)' }}>MRR ตอนนี้ (฿/เดือน)
          <input type="number" value={eco.currentMRR || ''} onChange={e => setAssume('currentMRR', +e.target.value)} style={numInput} /></label>
        <div style={{ border: '1px solid var(--sand)', borderRadius: 8, padding: '8px 10px', background: 'var(--cream)' }}>
          <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>LTV (คำนวณ)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#7c3aed' }}>{baht(ltvOf(eco))}</div>
        </div>
      </div>

      {/* Ad-spend gate */}
      <div style={{ border: `1px solid ${wm.adGateOpen ? '#16a34a' : '#f59e0b'}`, borderRadius: 8, padding: '9px 12px', background: 'var(--cream)', fontSize: 12.5, color: 'var(--ink)' }}>
        {wm.adGateOpen
          ? '✅ มีรายรับแล้ว (MRR > 0) — พร้อมลงทุนค่าโฆษณาตามแผน · ดู LTV:CAC ≥ 3 ก่อนสเกล'
          : '⏳ ยังไม่มีรายรับ (MRR = 0) — ตามแผน: โฟกัส organic ก่อน แล้วค่อยลงแอดเมื่อมีรายรับจากสมาชิก'}
      </div>

      {/* ตารางกรอกต่อช่องทาง */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 640 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>ช่องทาง</th>
              <th style={th}>สมัครใหม่</th>
              <th style={th}>ค่าแอด ฿</th>
              <th style={th}>ต้นทุนอื่น ฿</th>
              <th style={th}>CAC</th>
              <th style={th}>COCA</th>
              <th style={th}>LTV:CAC</th>
              <th style={th}>ROI%</th>
              <th style={th}>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {wm.perChannel.map(c => (
              <tr key={c.channel} style={{ borderTop: '1px solid var(--sand)' }}>
                <td style={{ ...td, textAlign: 'left', whiteSpace: 'nowrap' }}>{c.icon} {c.label}</td>
                <td style={{ padding: '3px 4px', width: 78 }}>
                  <input type="number" value={week.entries[c.channel]?.signups || ''} onChange={e => setEntry(c.channel, 'signups', +e.target.value)} style={numInput} />
                  {real && <div style={{ fontSize: 10, color: '#0891b2', textAlign: 'right', marginTop: 1 }}>จริง: {real[c.channel] ?? 0}</div>}
                </td>
                <td style={{ padding: '3px 4px', width: 90 }}><input type="number" value={week.entries[c.channel]?.adCost || ''} onChange={e => setEntry(c.channel, 'adCost', +e.target.value)} style={numInput} /></td>
                <td style={{ padding: '3px 4px', width: 90 }}><input type="number" value={week.entries[c.channel]?.otherCost || ''} onChange={e => setEntry(c.channel, 'otherCost', +e.target.value)} style={numInput} /></td>
                <td style={td}>{baht(c.cac)}</td>
                <td style={td}>{baht(c.coca)}</td>
                <td style={{ ...td, fontWeight: 700 }}>{c.ltvCacRatio == null ? '—' : `${c.ltvCacRatio}×`}</td>
                <td style={{ ...td, color: c.roi != null && c.roi >= 0 ? '#16a34a' : '#dc2626' }}>{c.roi == null ? '—' : `${c.roi}%`}</td>
                <td style={{ ...td, color: HEALTH_COLOR[c.health], fontSize: 11.5, whiteSpace: 'nowrap' }}>{healthLabel(c.health)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid var(--sand)', fontWeight: 800 }}>
              <td style={{ ...td, textAlign: 'left' }}>รวม</td>
              <td style={td}>{wm.totals.signups}</td>
              <td style={td}>{baht(wm.totals.adCost)}</td>
              <td style={td}>{baht(wm.totals.otherCost)}</td>
              <td style={td}>{baht(wm.totals.cac)}</td>
              <td style={td}>{baht(wm.totals.coca)}</td>
              <td style={td}>{wm.totals.ltvCacRatio == null ? '—' : `${wm.totals.ltvCacRatio}×`}</td>
              <td style={{ ...td, color: wm.totals.roi != null && wm.totals.roi >= 0 ? '#16a34a' : '#dc2626' }}>{wm.totals.roi == null ? '—' : `${wm.totals.roi}%`}</td>
              <td style={td} />
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink3)', lineHeight: 1.7 }}>
        กรอกทุกสัปดาห์เพื่อวัดผลต่อช่องทาง · CAC = ค่าแอด/สมัคร · COCA = (แอด+อื่นๆ)/สมัคร · LTV:CAC เกณฑ์ดี ≥ 3 · ROI = (LTV−COCA)/COCA · ตัวเลขคำนวณจากที่กรอกเอง ไม่ใช่การรับประกัน
      </div>
    </div>
  );
}

export default function GrowthDashboard({ data, onUpdate }: { data?: AppData; onUpdate?: (d: AppData) => void } = {}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [signups, setSignups] = useState(0);
  const [funnel, setFunnel] = useState<FunnelSummary | null>(null);
  const [lstats, setLstats] = useState<LeadStats | null>(null);
  const [realSignups, setRealSignups] = useState<Record<GChannelId, number> | null>(null);

  async function load() {
    if (!isSupabaseEnabled) return;
    setLoading(true); setMsg(null);
    try {
      const rows = await adminListWorkspaces();
      setSignups(rows.length);
      const states = await Promise.all(rows.map(r => wsLoad(r.id).catch(() => null)));
      setFunnel(funnelSummary(states));
      // ยอดสมัครจริงต่อช่องทาง (สัปดาห์นี้) จาก signupAt + signupSource ของทุกเวิร์กสเปซ
      const records: SignupRecord[] = states
        .filter((s): s is AppData => !!s && !!s.signupAt)
        .map(s => ({ at: s.signupAt!, channel: s.signupSource?.channel ?? 'other' }));
      setRealSignups(signupsForWeek(records, isoWeekTag(new Date())));
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

      {/* Unit economics — LTV/CAC/COCA/ROI รายสัปดาห์ (กรอกมือ + เติมยอดสมัครจริง) */}
      {data && onUpdate && <UnitEconomics data={data} onUpdate={onUpdate} real={realSignups} />}

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
