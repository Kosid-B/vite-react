import { useEffect, useMemo, useState } from 'react';
import GrowthAiPanel from '../../components/GrowthAiPanel';
import ClientErrorsPanel from '../../components/ClientErrorsPanel';
import ContentPerformancePanel from '../../components/ContentPerformancePanel';
import GrowthPdcaPanel from '../../components/GrowthPdcaPanel';
import PaymentReadinessPanel from '../../components/PaymentReadinessPanel';
import BrandVisibilityPanel from '../../components/BrandVisibilityPanel';
import ReachFunnelPanel from '../../components/ReachFunnelPanel';
import StageFitPanel from '../../components/StageFitPanel';
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
import {
  loadLandingFunnel, landingFunnelSteps, biggestLeak, funnelCaveats, dwellLabel, type LandingAgg,
} from '../../lib/landingFunnel';
import { landingAbStats, landingAbVerdict } from '../../lib/landingAb';
import {
  loadQuickAgg, topConcerns, concernsTrustworthy, MIN_CONCERN_SAMPLE,
  verdictText, type QuickAgg, type QuickVerdict,
} from '../../lib/productQuickCheck';
import { BIZ_LABEL, type SkillBiz } from '../../lib/skillCatalog';
import UtmBuilder from '../../components/UtmBuilder';

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

/** ชิ้นงานที่วางแผนจะปล่อยในรอบนี้ (ตรงกับปฏิทิน: คลิป #1–#4 + ชุดโพสต์ FB)
 *  วางเป็นค่าคงที่ไว้ก่อน เพราะปฏิทินยังไม่ได้ต่อเข้าแอป — แก้ที่นี่เมื่อรอบเปลี่ยน
 *  ⚠️ ค่านี้คือ "แผน" ไม่ใช่ "ผล" — ผลของ Do อ่านจากข้อมูลจริง (shippedPieces) เท่านั้น */
const PLANNED_PIECES_THIS_CYCLE = 4;

export default function GrowthDashboard({ data, onUpdate }: { data?: AppData; onUpdate?: (d: AppData) => void } = {}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [signups, setSignups] = useState(0);
  const [funnel, setFunnel] = useState<FunnelSummary | null>(null);
  const [lstats, setLstats] = useState<LeadStats | null>(null);
  const [realSignups, setRealSignups] = useState<Record<GChannelId, number> | null>(null);
  const [landing, setLanding] = useState<LandingAgg | null>(null);
  const [quick, setQuick] = useState<QuickAgg | null>(null);

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
      setLanding(await loadLandingFunnel(30)); // first-party landing funnel (30 วัน)
      setQuick(await loadQuickAgg(30));        // ใครกรอก "ตรวจสินค้าเร็ว" · กังวลเรื่องอะไร
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
        <Kpi
          label="📊 คนเข้า Landing (30 วัน)"
          value={landing ? landing.total : '—'}
          sub={landing ? `หยุดดูเฉลี่ย ${dwellLabel(landing.avg_dwell)} · เลื่อน ${landing.avg_scroll}%` : 'first-party (นิรนาม)'}
          color="#7c3aed"
        />
      </div>

      {/* ── ใครกรอก "ตรวจสินค้าเร็ว" · เขากังวลเรื่องอะไร (first-party · ไม่มี PII) ──
           แผงนี้ตอบคำถามที่เราเดามาตลอดว่า "กลุ่มเป้าหมายจริงคือใคร" ด้วยข้อมูลของเราเอง
           แทนการอ้างสัดส่วนประชากรจากสื่อ (ดู docs/marketing/GEN-XYZ-TARGET.md) */}
      {quick && quick.total > 0 && (() => {
        const concerns = topConcerns(quick);
        const trusted = concernsTrustworthy(quick);
        const bizRows = Object.entries(quick.by_biz).sort((a, b) => b[1] - a[1]);
        const bizMax = Math.max(1, ...bizRows.map(([, c]) => c));
        return (
          <div style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: '16px 18px', background: 'var(--cream2)', display: 'grid', gap: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)' }}>
              🧮 ตรวจสินค้าเร็ว — {quick.total} คนกรอก · {quick.with_topic} คนกดดูหัวข้อ · {quick.cta} คนกดเปิดพื้นที่ทำงาน
            </div>

            {!trusted && (
              <div style={{ border: '1px solid #f59e0b', borderRadius: 10, padding: '10px 14px', background: 'rgba(245,158,11,0.10)', fontSize: 12.5, lineHeight: 1.6 }}>
                ⚠️ <b>ยังสรุปอันดับความกังวลไม่ได้</b> — มีคนกดหัวข้อเพียง {quick.with_topic} คน (ต้องการอย่างน้อย {MIN_CONCERN_SAMPLE})
                · ตัวเลขด้านล่างดูได้ แต่ยังใช้ตัดสินใจเปลี่ยนกลยุทธ์ไม่ได้
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {/* หัวข้อที่คนกด = สิ่งที่เจ้าของธุรกิจกังวลจริง */}
              <div style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 14px', background: 'var(--cream)' }}>
                <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 8, fontWeight: 700 }}>⭐ เขากังวลเรื่องอะไร</div>
                {concerns.length === 0 && <span style={{ fontSize: 12, color: 'var(--ink3)' }}>ยังไม่มีใครกดหัวข้อ</span>}
                <div style={{ display: 'grid', gap: 6 }}>
                  {concerns.map((c) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 120, fontSize: 11.5, color: 'var(--ink)', flex: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
                      <div style={{ flex: 1, height: 12, borderRadius: 4, background: 'var(--cream2)', overflow: 'hidden' }}>
                        <div style={{ width: `${c.pct}%`, height: '100%', background: '#7c3aed', borderRadius: 4 }} />
                      </div>
                      <span style={{ width: 52, textAlign: 'right', fontSize: 11.5, color: 'var(--ink3)', flex: 'none' }}>{c.count} · {c.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ธุรกิจแบบไหนเข้ามา */}
              <div style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 14px', background: 'var(--cream)' }}>
                <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 8, fontWeight: 700 }}>🏪 ธุรกิจแบบไหนเข้ามา</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {bizRows.map(([k, c]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 120, fontSize: 11.5, color: 'var(--ink)', flex: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {BIZ_LABEL[k as SkillBiz] ?? k}
                      </span>
                      <div style={{ flex: 1, height: 12, borderRadius: 4, background: 'var(--cream2)', overflow: 'hidden' }}>
                        <div style={{ width: `${(c / bizMax) * 100}%`, height: '100%', background: '#0891b2', borderRadius: 4 }} />
                      </div>
                      <span style={{ width: 34, textAlign: 'right', fontSize: 11.5, color: 'var(--ink3)', flex: 'none' }}>{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* สภาพธุรกิจที่เข้ามา — ใช้ค่ากลาง ไม่ใช่ค่าเฉลี่ย (กันเคสสุดโต่งลาก) */}
              <div style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 14px', background: 'var(--cream)' }}>
                <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 6, fontWeight: 700 }}>📊 สภาพธุรกิจที่เข้ามา (ค่ากลาง)</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.9 }}>
                  ราคาขาย <b>฿{quick.median_price.toLocaleString('th-TH')}</b> · ต้นทุน <b>฿{quick.median_cost.toLocaleString('th-TH')}</b><br />
                  กำไรต่อหน่วย <b>{quick.median_margin_pct}%</b>
                </div>
                <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
                  {Object.entries(quick.by_verdict).sort((a, b) => b[1] - a[1]).map(([v, c]) => (
                    <div key={v} style={{ fontSize: 11.5, color: 'var(--ink3)' }}>
                      {verdictText(v as QuickVerdict)} — <b style={{ color: 'var(--ink)' }}>{c}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--ink3)', lineHeight: 1.7 }}>
              เก็บเฉพาะประเภทธุรกิจ ตัวเลข และหัวข้อที่กด · <b>ไม่เก็บชื่อสินค้าที่ผู้ใช้พิมพ์</b> (อยู่ในเครื่องเขาเท่านั้น) · นิรนาม 100%
            </div>
          </div>
        );
      })()}

      {/* Landing Funnel (first-party · PDPA-safe) — ตอบ "คนเข้าแล้วค้างตรงไหน ไม่กดสมัคร" */}
      {landing && landing.total > 0 ? (() => {
        const steps = landingFunnelSteps(landing);
        const caveats = funnelCaveats(landing, steps);
        const leak = biggestLeak(steps, landing); // null เมื่อข้อมูลยังเชื่อไม่ได้
        const bouncePct = landing.total > 0 ? Math.round((landing.bounce / landing.total) * 100) : 0;
        const refLabel: Record<string, string> = { direct: '🔗 พิมพ์ตรง/บุ๊กมาร์ก', social: '📱 โซเชียล', search: '🔍 ค้นหา (Google)', other: '🌐 เว็บอื่น' };
        // .total เสมอ — by_ref เป็นก้อน {total,cta,signup} ตั้งแต่ 0057 (เคยเรนเดอร์ก้อนนี้ตรง ๆ จนจอพัง)
        const refRows = Object.entries(landing.by_ref).sort((a, b) => b[1].total - a[1].total);
        const refMax = Math.max(1, ...refRows.map(([, c]) => c.total));
        return (
          <div style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: '16px 18px', background: 'var(--cream2)', display: 'grid', gap: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)' }}>
              🕳️ Landing Funnel — คนเข้าดูจริง {landing.total} คน (นิรนาม · ไม่เก็บ PII)
            </div>

            {/* ข้อควรระวังก่อนเชื่อตัวเลข — ต้องอยู่เหนือกรวย ไม่งั้นคนอ่าน % ไปแล้ว */}
            {caveats.length > 0 && (
              <div style={{ display: 'grid', gap: 8 }}>
                {caveats.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      border: `1px solid ${c.level === 'blocker' ? '#dc2626' : '#f59e0b'}`,
                      borderRadius: 10,
                      padding: '10px 14px',
                      background: c.level === 'blocker' ? 'rgba(220,38,38,0.08)' : 'rgba(245,158,11,0.10)',
                      fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.6,
                    }}
                  >
                    {c.level === 'blocker' ? '⛔ ' : '⚠️ '}
                    <b>{c.level === 'blocker' ? 'ยังใช้ตัดสินใจไม่ได้:' : 'ข้อจำกัด:'}</b> {c.text}
                  </div>
                ))}
              </div>
            )}

            {/* รูรั่วใหญ่สุด — ชี้จุดต้องแก้ก่อน (ซ่อนเมื่อข้อมูลเชื่อไม่ได้) */}
            {leak && (
              <div style={{ border: '1px solid #f59e0b', borderRadius: 10, padding: '10px 14px', background: 'rgba(245,158,11,0.10)', fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>
                🚨 <b>รูรั่วใหญ่สุด:</b> หลุด <b style={{ color: '#dc2626' }}>{leak.dropPct}%</b> ระหว่าง “{leak.from}” → “{leak.to}” — โฟกัสแก้จุดนี้ก่อน
              </div>
            )}

            {/* 4 ขั้น funnel + drop-off */}
            <div style={{ display: 'grid', gap: 10 }}>
              {steps.map((s, i) => (
                <div key={s.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
                    <span style={{ color: 'var(--ink)' }}>{i + 1}. {s.label}</span>
                    <span style={{ color: 'var(--ink3)' }}>{s.count} · {s.pct}%</span>
                  </div>
                  <div style={{ height: 12, borderRadius: 5, background: 'var(--cream)', overflow: 'hidden' }}>
                    <div style={{ width: `${s.pct}%`, height: '100%', background: i === steps.length - 1 ? '#16a34a' : '#7c3aed', borderRadius: 5 }} />
                  </div>
                  {i > 0 && s.dropFromPrev > 0 && (
                    <div style={{ fontSize: 11.5, color: '#dc2626', marginTop: 2 }}>↓ หลุด {s.dropFromPrev}% จากขั้นก่อน</div>
                  )}
                </div>
              ))}
            </div>

            {/* พฤติกรรมการดู + ที่มา */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 14px', background: 'var(--cream)' }}>
                <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 6, fontWeight: 700 }}>⏱️ พฤติกรรมการดู</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.9 }}>
                  หยุดดูเฉลี่ย <b>{dwellLabel(landing.avg_dwell)}</b><br />
                  เลื่อนลึกเฉลี่ย <b>{landing.avg_scroll}%</b><br />
                  เด้งออกเร็ว (bounce) <b style={{ color: bouncePct >= 40 ? '#dc2626' : 'var(--ink)' }}>{landing.bounce} · {bouncePct}%</b>
                  <span style={{ color: 'var(--ink3)', fontSize: 11 }}> (&lt;10 วิ + เลื่อน&lt;25%)</span>
                </div>
              </div>
              <div style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 14px', background: 'var(--cream)' }}>
                <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 6, fontWeight: 700 }}>🌐 คนมาจากไหน</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {refRows.length === 0 && <span style={{ fontSize: 12, color: 'var(--ink3)' }}>ยังไม่มีข้อมูล</span>}
                  {refRows.map(([k, c]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 130, fontSize: 11.5, color: 'var(--ink)', flex: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{refLabel[k] ?? k}</span>
                      <div style={{ flex: 1, height: 12, borderRadius: 4, background: 'var(--cream2)', overflow: 'hidden' }}>
                        <div style={{ width: `${(c.total / refMax) * 100}%`, height: '100%', background: '#0891b2', borderRadius: 4 }} />
                      </div>
                      <span style={{ width: 34, textAlign: 'right', fontSize: 11.5, color: 'var(--ink3)', flex: 'none' }}>{c.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* A/B holdout: 2 ส่วนใหม่ (ลอง AI จริง + จัดการความกลัว AI) ช่วย signup จริงไหม */}
            {(() => {
              const ab = landingAbStats(landing.by_ab);
              const shown = ab.filter(s => s.variant === 'show' || s.variant === 'control');
              if (shown.length === 0) return null;
              const verdict = landingAbVerdict(landing.by_ab);
              const vLabel: Record<string, string> = { show: 'เห็น 2 ส่วนใหม่', control: 'ไม่เห็น (control)', unset: 'ก่อนเริ่มทดลอง' };
              return (
                <div style={{ border: '1px solid #7c3aed', borderRadius: 10, padding: '12px 14px', background: 'rgba(124,58,237,0.07)', display: 'grid', gap: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>
                    🧪 A/B — 2 ส่วนใหม่ช่วยสมัครจริงไหม? (ลอง AI จริง + จัดการความกลัว AI)
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {ab.filter(s => s.variant !== 'unset').map(s => (
                      <div key={s.variant} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
                        <span style={{ width: 120, flex: 'none', color: 'var(--ink)', fontWeight: s.variant === 'show' ? 800 : 600 }}>{vLabel[s.variant] ?? s.variant}</span>
                        <div style={{ flex: 1, height: 14, borderRadius: 5, background: 'var(--cream)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, s.signupRate * 4)}%`, height: '100%', background: s.variant === 'show' ? '#16a34a' : '#94a3b8', borderRadius: 5 }} />
                        </div>
                        <span style={{ width: 96, textAlign: 'right', flex: 'none', color: 'var(--ink3)' }}>
                          signup {s.signupRate}% <span style={{ fontSize: 10.5 }}>({s.signup}/{s.total})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: verdict.ready ? (verdict.winner === 'show' ? '#16a34a' : verdict.winner === 'control' ? '#dc2626' : 'var(--ink)') : 'var(--ink3)', lineHeight: 1.6, fontWeight: verdict.ready ? 700 : 400 }}>
                    {verdict.ready ? '📊 ' : '⏳ '}{verdict.message}
                  </div>
                </div>
              );
            })()}
            <div style={{ fontSize: 11.5, color: 'var(--ink3)', lineHeight: 1.7 }}>
              🔒 นิรนาม 100% — id สุ่มฝั่งเบราว์เซอร์ · ไม่เก็บชื่อ/อีเมล/ตำแหน่ง cursor · 1 แถว/ผู้เข้าชม (นับซ้ำไม่ได้) · ช่วง 30 วันล่าสุด
            </div>
          </div>
        );
      })() : (
        <div style={{ border: '1px dashed var(--sand)', borderRadius: 12, padding: '14px 16px', background: 'var(--cream)', fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.7 }}>
          🕳️ <b style={{ color: 'var(--ink)' }}>Landing Funnel</b> — ยังไม่มีข้อมูลผู้เข้าชม (จะเริ่มเก็บเมื่อมีคนเปิดหน้า Landing สาธารณะหลัง deploy) · วัด scroll depth + dwell แบบนิรนาม
        </div>
      )}

      {/* 🔁 PDCA — ต้องอยู่ก่อนทุกแผงตัวเลข เพราะมันบอกว่า "ตัวเลขข้างล่างเชื่อได้แค่ไหน"
          อ่านตัวเลขก่อนรู้ว่าวงจรค้างตรงไหน = ได้ข้อสรุปที่มั่นใจแต่ผิด */}
      <GrowthPdcaPanel landing={landing} plannedPieces={PLANNED_PIECES_THIS_CYCLE} windowDays={landing?.days ?? 30} />

      {/* 🎯 PDCA บอก "วงจรค้างตรงไหน" · แผงนี้บอก "แล้วควรทำอะไร / อะไรยังไม่ถึงเวลา"
          วางติดกันโดยตั้งใจ — เดิมรู้ว่าคอขวดคือ reach แต่ไม่มีอะไรกันไม่ให้ไปทำฟีเจอร์ต่อ */}
      <StageFitPanel landing={landing} />

      {/* 💰 ปลายทางจริงของวงจรคือเงินเข้าบัญชี ไม่ใช่ยอดสมัคร — วางติดกับ PDCA */}
      <PaymentReadinessPanel />

      {/* ความสนใจรายส่วน + ผล A/B ทุกตัว + AI วิเคราะห์ (0057) */}
      <GrowthAiPanel landing={landing} />

      {/* 📡 ขั้นที่หายไปของ funnel: วิวบนแพลตฟอร์ม → คนมาถึงเว็บ
          วางก่อน ContentPerformance เพราะถ้าเพดานอยู่ก่อนถึงเว็บ การเทียบคอนเทนต์ยังไม่มีความหมาย */}
      <ReachFunnelPanel landing={landing} />

      {/* 🔎 ก่อนถามว่า "คอนเทนต์ชิ้นไหนพาคนมา" ต้องรู้ก่อนว่า **ค้นชื่อเราแล้วเจอเราไหม**
          ถ้าเครื่องยังไม่รู้ว่าเราคือใคร คนที่จำชื่อเราได้จากคลิปก็ยังหาเราไม่เจออยู่ดี */}
      <BrandVisibilityPanel />

      {/* คอนเทนต์ชิ้นไหนพาคนมา (0062) — วางก่อนแผง error เพราะเป็นคำถามหลักของการตลาด */}
      <ContentPerformancePanel landing={landing} />

      {/* ผู้ใช้เจออะไรพัง (0058) — วางไว้บนสุดของส่วนวิเคราะห์เพราะ error กินคนก่อนที่ funnel จะได้เริ่ม */}
      <ClientErrorsPanel />

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

      {/* UTM Builder — สร้างลิงก์ติด utm ต่อช่องทาง (ให้ 'ติด utm ทุกโพสต์' ทำได้จริง) */}
      <UtmBuilder />

      {/* Unit economics — LTV/CAC/COCA/ROI รายสัปดาห์ (กรอกมือ + เติมยอดสมัครจริง) */}
      {data && onUpdate && <UnitEconomics data={data} onUpdate={onUpdate} real={realSignups} />}

      {/* หมายเหตุ GA4 */}
      <div style={{ border: '1px dashed var(--sand)', borderRadius: 12, padding: '14px 16px', background: 'var(--cream)', fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.7 }}>
        📊 <b style={{ color: 'var(--ink)' }}>คนเข้าดู Landing page</b> ตอนนี้วัดในแอปได้แล้ว (แผง Landing Funnel ด้านบน — first-party นิรนาม) ·
        อยากดูละเอียดต่อช่องทาง/หน้า ดูเสริมใน{' '}
        <a href="https://analytics.google.com" target="_blank" rel="noreferrer" style={{ color: '#0891b2', fontWeight: 600 }}>Google Analytics</a>{' '}
        (property <b>{GA4_ID}</b>): Reports → Pages (page_view) · Acquisition → Traffic (utm)
        <br />
        🔒 ตัวเลขในหน้านี้มาจากระบบจริง (RLS is_app_admin) · <b style={{ color: 'var(--ink)' }}>ผู้สมัคร</b> = แม่นเป๊ะ · loop: โพสต์(ใส่ utm) → รีเฟรช → ดูช่องไหนได้ lead/สมัคร
      </div>
    </div>
  );
}
