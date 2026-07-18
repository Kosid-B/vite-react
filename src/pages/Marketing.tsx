import { useState } from 'react';
import type { AppData, PageId, MarketingChannel, MarketingCampaign, MarketingGoal, MarketingChannelType, MarketingCampaignStatus } from '../types';
import { PageHeader, Badge } from '../ds';
import BuyingTriggers from '../components/BuyingTriggers';
import { marketingFromDe24 } from '../lib/marketingStrategy';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import { withSkillDirectives } from '../lib/skillDirectives';
import { trackAiCall } from '../lib/usage';

interface Props { data: AppData; onUpdate: (d: AppData) => void; onNavigate?: (p: PageId) => void; }

function baht(n: number) { return '฿' + Math.round(n).toLocaleString('th-TH'); }
function pct(n: number) { return n.toFixed(1) + '%'; }

const CHANNEL_TYPE_LABEL: Record<MarketingChannelType, string> = {
  seo: '🔍 SEO',
  sem: '💳 SEM',
  social: '📱 Social',
  email: '✉️ Email/Line',
  referral: '🤝 Referral',
  content: '🎬 Content',
  event: '🎤 Event',
  partner: '🏢 Partner',
};

const STATUS_LABEL: Record<MarketingCampaignStatus, string> = {
  planned: '📋 Planned',
  active: '🟢 Active',
  done: '✅ Done',
  paused: '⏸ Paused',
};

const STATUS_COLOR: Record<MarketingCampaignStatus, string> = {
  planned: '#94a3b8',
  active: 'var(--green)',
  done: 'var(--accent)',
  paused: '#f59e0b',
};

const BLANK_CH: Omit<MarketingChannel, 'id'> = {
  name: '', type: 'social', budget: 0, leadsPerMonth: 0, cpl: 0, convRate: 0, active: true, notes: '',
};

const BLANK_CP: Omit<MarketingCampaign, 'id'> = {
  name: '', channelId: '', budget: 0,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  goal: '', kpiTarget: '', status: 'planned', result: '',
};

const BLANK_G: Omit<MarketingGoal, 'id'> = { metric: '', current: 0, target: 0, unit: '' };

export default function Marketing({ data, onUpdate, onNavigate }: Props) {
  const mkt = data.marketing;
  const channels = mkt.channels ?? [];
  const campaigns = mkt.campaigns ?? [];
  const goals = mkt.goals ?? [];

  const strat = marketingFromDe24(data);
  const [tab, setTab] = useState<'channels' | 'campaigns' | 'goals'>('channels');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiPlan, setAiPlan] = useState<string | null>(null);
  const [adopted, setAdopted] = useState<string | null>(null);
  const [editCh, setEditCh]   = useState<(Partial<MarketingChannel> & { id?: string }) | null>(null);
  const [editCp, setEditCp]   = useState<(Partial<MarketingCampaign> & { id?: string }) | null>(null);
  const [editG, setEditG]     = useState<(Partial<MarketingGoal> & { id?: string }) | null>(null);

  // ---- Derived ----
  const activeChannels = channels.filter(c => c.active);
  const totalBudget = channels.reduce((s, c) => s + c.budget, 0);
  const totalLeads = activeChannels.reduce((s, c) => s + c.leadsPerMonth, 0);
  const blendedCPL = totalLeads > 0 ? totalBudget / totalLeads : 0;
  const estCustomers = activeChannels.reduce((s, c) => s + c.leadsPerMonth * (c.convRate / 100), 0);

  function upd(m: typeof mkt) { onUpdate({ ...data, marketing: m }); }

  // ---- Channel CRUD ----
  function saveCh(ch: Partial<MarketingChannel> & { id?: string }) {
    const list = [...channels];
    const cpl = ch.leadsPerMonth && ch.leadsPerMonth > 0 ? (ch.budget ?? 0) / ch.leadsPerMonth : 0;
    const full = { ...ch, cpl } as MarketingChannel;
    if (ch.id) {
      const i = list.findIndex(c => c.id === ch.id);
      if (i >= 0) list[i] = full;
    } else {
      list.push({ ...full, id: `ch${Date.now()}` });
    }
    upd({ ...mkt, channels: list });
    setEditCh(null);
  }
  function delCh(id: string) {
    if (!confirm('ลบช่องทางนี้?')) return;
    upd({ ...mkt, channels: channels.filter(c => c.id !== id) });
  }

  // ---- Campaign CRUD ----
  function saveCp(cp: Partial<MarketingCampaign> & { id?: string }) {
    const list = [...campaigns];
    if (cp.id) {
      const i = list.findIndex(c => c.id === cp.id);
      if (i >= 0) list[i] = cp as MarketingCampaign;
    } else {
      list.push({ ...cp, id: `cp${Date.now()}` } as MarketingCampaign);
    }
    upd({ ...mkt, campaigns: list });
    setEditCp(null);
  }
  function delCp(id: string) {
    if (!confirm('ลบแคมเปญนี้?')) return;
    upd({ ...mkt, campaigns: campaigns.filter(c => c.id !== id) });
  }

  // ---- Goal CRUD ----
  function saveG(g: Partial<MarketingGoal> & { id?: string }) {
    const list = [...goals];
    if (g.id) {
      const i = list.findIndex(x => x.id === g.id);
      if (i >= 0) list[i] = g as MarketingGoal;
    } else {
      list.push({ ...g, id: `g${Date.now()}` } as MarketingGoal);
    }
    upd({ ...mkt, goals: list });
    setEditG(null);
  }
  function delG(id: string) {
    if (!confirm('ลบ Goal นี้?')) return;
    upd({ ...mkt, goals: goals.filter(g => g.id !== id) });
  }

  // ---- รับข้อเสนอจาก MIT 24-Step เข้าเป็นรายการจริง ----
  function adoptChannel(s: { type: MarketingChannelType; name: string; rationale: string }) {
    if (channels.some(c => c.type === s.type && c.name === s.name)) { setAdopted(`มี "${s.name}" อยู่แล้ว`); return; }
    saveCh({ ...BLANK_CH, name: s.name, type: s.type, notes: `จาก MIT 24-Step: ${s.rationale}` });
    setAdopted(`✓ เพิ่มช่องทาง "${s.name}"`); setTab('channels');
  }
  function adoptCampaign(c: { name: string; goal: string; basedOn: string }) {
    saveCp({ ...BLANK_CP, name: c.name, goal: c.goal, result: `อ้างอิง ${c.basedOn}` });
    setAdopted(`✓ เพิ่มแคมเปญ "${c.name}"`); setTab('campaigns');
  }
  function adoptGoal(g: { metric: string; unit: string; hint: string }) {
    if (goals.some(x => x.metric === g.metric)) { setAdopted(`มีเป้า "${g.metric}" อยู่แล้ว`); return; }
    saveG({ ...BLANK_G, metric: g.metric, unit: g.unit });
    setAdopted(`✓ เพิ่มเป้าหมาย "${g.metric}"`); setTab('goals');
  }

  // ---- AI agent (CMO) วางแผนการตลาดจากผล MIT 24-Step ----
  async function runCmoAgent() {
    if (!isSupabaseEnabled || !supabase) {
      setAiPlan('โหมด local: ใช้ข้อเสนอจาก MIT 24-Step ด้านบนได้เลย (AI agent ทำงานเมื่อเชื่อม Supabase/เข้าสู่ระบบ)');
      return;
    }
    const cmo = data.aiCompany?.agents.find(a => /cmo|market|ตลาด/i.test(a.role)) ?? data.aiCompany?.agents[0];
    setAiBusy(true); setAiPlan(null);
    try {
      trackAiCall();
      const doneSteps = strat.linkedSteps.filter(s => s.done).map(s => `${s.name}: ${s.note || '(ทำแล้ว)'}`).join(' · ');
      const { data: res, error } = await supabase.functions.invoke('agent-run', {
        body: {
          role: cmo?.role ?? 'CMO',
          mandate: withSkillDirectives(cmo?.mandate ?? 'วางแผนและดำเนินการการตลาด', data.aiCompany?.purchasedSkills),
          model: cmo?.model ?? 'claude-sonnet-4-6',
          title: 'วางแผนการตลาดจากผล MIT 24-Step',
          detail: `ผล MIT 24-Step ที่ทำแล้ว: ${doneSteps || '(ยังไม่ได้ทำขั้นการตลาด)'} · ช่องทางปัจจุบัน: ${channels.map(c => c.name).join(', ') || 'ยังไม่มี'}`,
          goal: 'เสนอแผนการตลาดที่ลงมือได้จริง: ช่องทางที่ควรใช้ + แคมเปญ (พาดหัว/ข้อเสนอ) + เป้าหมายเชิงตัวเลข ให้สอดคล้องกับ Persona/คุณค่า/ราคาจาก 24-Step',
          industry: data.aiCompany?.industry ?? '',
          companyName: data.aiCompany?.name ?? '',
        },
      });
      if (error) throw error;
      setAiPlan(res?.output ?? '(ไม่มีผลลัพธ์)');
    } catch (e) {
      setAiPlan('✕ ' + (e as Error).message);
    } finally {
      setAiBusy(false);
    }
  }

  const bestChannel = [...activeChannels].sort((a, b) => (b.leadsPerMonth * b.convRate) - (a.leadsPerMonth * a.convRate))[0];

  return (
    <div>
      <PageHeader
        title="กลยุทธ์การตลาด"
        meta={<>
          <Badge tone="green">งบ/เดือน {baht(totalBudget)}</Badge>
          <Badge tone="neutral">{channels.filter(c => c.active).length} ช่องทางใช้งาน</Badge>
          <Badge tone="neutral">{campaigns.filter(c => c.status === 'active').length} แคมเปญกำลังดำเนิน</Badge>
        </>}
      />

      <BuyingTriggers data={data} onUpdate={onUpdate} />

      {/* ===== กลยุทธ์จากผล MIT 24-Step ===== */}
      <div className="m24">
        <div className="m24-hd">
          <span className="m24-title">🎯 กลยุทธ์จากผล MIT 24-Step</span>
          <span className="m24-ready">ความพร้อมข้อมูลการตลาด {strat.readiness}%</span>
          {isSupabaseEnabled && (
            <button className="m24-ai-btn" onClick={runCmoAgent} disabled={aiBusy}>
              {aiBusy ? '⏳ CMO agent กำลังวางแผน…' : '🤖 ให้ CMO agent วางแผน & ลงมือ'}
            </button>
          )}
        </div>
        <div className="m24-track"><div className="m24-fill" style={{ width: `${strat.readiness}%` }} /></div>

        {strat.gaps.length > 0 && (
          <div className="m24-gaps">
            ยังไม่ได้ทำ {strat.gaps.length} ขั้นที่ป้อนการตลาด:
            {strat.gaps.slice(0, 4).map(g => <span key={g.index} className="m24-gap-chip">{g.name}</span>)}
            {onNavigate && <button className="m24-gap-go" onClick={() => onNavigate('bmc')}>ไปเติมใน Business Model · MIT24 →</button>}
          </div>
        )}

        <div className="m24-cols">
          <div className="m24-col">
            <div className="m24-col-hd">ช่องทางที่ควรใช้</div>
            {strat.channels.length ? strat.channels.map(c => (
              <div key={c.type + c.name} className="m24-item">
                <div className="m24-item-body"><b>{c.name}</b><span>{c.rationale}</span></div>
                <button className="m24-adopt" onClick={() => adoptChannel(c)}>+ เพิ่ม</button>
              </div>
            )) : <div className="m24-empty">ทำ Persona/กระบวนการหาลูกค้าใน 24-Step ก่อน</div>}
          </div>
          <div className="m24-col">
            <div className="m24-col-hd">แคมเปญที่แนะนำ</div>
            {strat.campaigns.length ? strat.campaigns.map(c => (
              <div key={c.name} className="m24-item">
                <div className="m24-item-body"><b>{c.name}</b><span>{c.goal}</span></div>
                <button className="m24-adopt" onClick={() => adoptCampaign(c)}>+ เพิ่ม</button>
              </div>
            )) : <div className="m24-empty">ทำคุณค่า/วงจรการใช้/ราคาใน 24-Step ก่อน</div>}
          </div>
          <div className="m24-col">
            <div className="m24-col-hd">เป้าหมาย</div>
            {strat.goals.map(g => (
              <div key={g.metric} className="m24-item">
                <div className="m24-item-body"><b>{g.metric}</b><span>{g.hint}</span></div>
                <button className="m24-adopt" onClick={() => adoptGoal(g)}>+ เพิ่ม</button>
              </div>
            ))}
          </div>
        </div>

        {adopted && <div className="m24-msg">{adopted}</div>}
        {aiPlan && (
          <div className="m24-aiplan">
            <div className="m24-aiplan-hd">🤖 แผนจาก CMO agent</div>
            <div className="m24-aiplan-body">{aiPlan}</div>
          </div>
        )}
      </div>

      {/* KPI Overview */}
      <div className="mkt-kpi-grid">
        <div className="mkt-kpi-card">
          <div className="mkt-kpi-label">งบการตลาด/เดือน</div>
          <div className="mkt-kpi-val">{baht(totalBudget)}</div>
          <div className="mkt-kpi-note">จาก {channels.length} ช่องทาง</div>
        </div>
        <div className="mkt-kpi-card">
          <div className="mkt-kpi-label">Leads/เดือน (Est.)</div>
          <div className="mkt-kpi-val">{Math.round(totalLeads)}</div>
          <div className="mkt-kpi-note">เป้า {mkt.targetLeads} ราย</div>
        </div>
        <div className="mkt-kpi-card">
          <div className="mkt-kpi-label">Blended CPL</div>
          <div className="mkt-kpi-val">{baht(blendedCPL)}</div>
          <div className="mkt-kpi-note">ต้นทุนต่อ 1 lead</div>
        </div>
        <div className="mkt-kpi-card">
          <div className="mkt-kpi-label">ลูกค้าใหม่/เดือน (Est.)</div>
          <div className="mkt-kpi-val">{estCustomers.toFixed(1)}</div>
          <div className="mkt-kpi-note">CAC ≈ {baht(estCustomers > 0 ? totalBudget / estCustomers : 0)} | เป้า {baht(mkt.targetCAC)}</div>
        </div>
      </div>

      {/* Budget mix bar */}
      <div className="mkt-mix-bar-wrap">
        <div className="mkt-mix-label">สัดส่วนงบตามช่องทาง</div>
        <div className="mkt-mix-bar">
          {channels.map((c, i) => {
            const w = totalBudget > 0 ? (c.budget / totalBudget) * 100 : 0;
            const colors = ['var(--accent)', 'var(--green)', '#7c6aff', '#f59e0b', '#06b6d4', '#ec4899', '#a78bfa', '#34d399'];
            return w > 1 ? (
              <div key={c.id} className="mkt-mix-seg" style={{ width: `${w}%`, background: colors[i % colors.length] }}
                title={`${c.name}: ${baht(c.budget)} (${pct(w)})`} />
            ) : null;
          })}
        </div>
        <div className="mkt-mix-legend">
          {channels.map((c, i) => {
            const colors = ['var(--accent)', 'var(--green)', '#7c6aff', '#f59e0b', '#06b6d4', '#ec4899', '#a78bfa', '#34d399'];
            return (
              <span key={c.id} className="mkt-mix-item">
                <span className="mkt-mix-dot" style={{ background: colors[i % colors.length] }} />
                {c.name} ({pct(totalBudget > 0 ? (c.budget / totalBudget) * 100 : 0)})
              </span>
            );
          })}
        </div>
      </div>

      {/* Insight */}
      {bestChannel && (
        <div className="mkt-insight">
          💡 ช่องทางที่ดีที่สุด: <b>{bestChannel.name}</b> — ประมาณ{' '}
          {(bestChannel.leadsPerMonth * bestChannel.convRate / 100).toFixed(1)} ลูกค้าใหม่/เดือน
          (CPL {baht(bestChannel.cpl)}, Conv. Rate {pct(bestChannel.convRate)})
        </div>
      )}

      {/* Sub-tabs */}
      <div className="mkt-tabs">
        <button className={`mkt-tab${tab === 'channels' ? ' active' : ''}`} onClick={() => setTab('channels')}>📡 ช่องทางการตลาด</button>
        <button className={`mkt-tab${tab === 'campaigns' ? ' active' : ''}`} onClick={() => setTab('campaigns')}>🚀 แคมเปญ</button>
        <button className={`mkt-tab${tab === 'goals' ? ' active' : ''}`} onClick={() => setTab('goals')}>🎯 เป้าหมาย</button>
      </div>

      {/* ===== CHANNELS ===== */}
      {tab === 'channels' && (
        <div className="mkt-section">
          <div className="mkt-sec-header">
            <div className="mkt-sec-title">ช่องทางการตลาด (Marketing Channels)</div>
            <button className="mkt-add-btn" onClick={() => setEditCh({ ...BLANK_CH })}>+ เพิ่มช่องทาง</button>
          </div>

          {editCh && (
            <div className="mkt-form">
              <div className="mkt-form-title">{editCh.id ? 'แก้ไขช่องทาง' : 'เพิ่มช่องทางใหม่'}</div>
              <div className="mkt-form-grid">
                <div className="mkt-form-row">
                  <label>ชื่อช่องทาง</label>
                  <input className="mkt-inp" value={editCh.name ?? ''} onChange={e => setEditCh(p => ({ ...p!, name: e.target.value }))} />
                </div>
                <div className="mkt-form-row">
                  <label>ประเภท</label>
                  <select className="mkt-inp" value={editCh.type ?? 'social'} onChange={e => setEditCh(p => ({ ...p!, type: e.target.value as MarketingChannelType }))}>
                    {(Object.entries(CHANNEL_TYPE_LABEL)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="mkt-form-row">
                  <label>งบ/เดือน (บาท)</label>
                  <input type="number" className="mkt-inp" min={0} value={editCh.budget ?? 0} onChange={e => setEditCh(p => ({ ...p!, budget: +e.target.value }))} />
                </div>
                <div className="mkt-form-row">
                  <label>Leads/เดือน (ประมาณ)</label>
                  <input type="number" className="mkt-inp" min={0} value={editCh.leadsPerMonth ?? 0} onChange={e => setEditCh(p => ({ ...p!, leadsPerMonth: +e.target.value }))} />
                </div>
                <div className="mkt-form-row">
                  <label>Conv. Rate (%)</label>
                  <input type="number" className="mkt-inp" min={0} max={100} step={0.1} value={editCh.convRate ?? 0} onChange={e => setEditCh(p => ({ ...p!, convRate: +e.target.value }))} />
                </div>
                <div className="mkt-form-row">
                  <label>ใช้งานอยู่</label>
                  <input type="checkbox" checked={editCh.active ?? true} onChange={e => setEditCh(p => ({ ...p!, active: e.target.checked }))} />
                </div>
                <div className="mkt-form-row mkt-form-full">
                  <label>หมายเหตุ</label>
                  <textarea className="mkt-ta" rows={2} value={editCh.notes ?? ''} onChange={e => setEditCh(p => ({ ...p!, notes: e.target.value }))} />
                </div>
              </div>
              <div className="mkt-form-footer">
                <button className="mkt-btn-save" onClick={() => saveCh(editCh)}>บันทึก</button>
                <button className="mkt-btn-cancel" onClick={() => setEditCh(null)}>ยกเลิก</button>
              </div>
            </div>
          )}

          <table className="mkt-table">
            <thead>
              <tr>
                <th>ช่องทาง</th>
                <th>ประเภท</th>
                <th className="mkt-num">งบ/เดือน</th>
                <th className="mkt-num">Leads/เดือน</th>
                <th className="mkt-num">CPL</th>
                <th className="mkt-num">Conv. %</th>
                <th className="mkt-num">ลูกค้าใหม่/เดือน</th>
                <th className="mkt-num">สถานะ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {channels.map(ch => (
                <tr key={ch.id} className={ch.active ? '' : 'mkt-row-inactive'}>
                  <td>
                    <div className="mkt-ch-name">{ch.name}</div>
                    {ch.notes && <div className="mkt-ch-note">{ch.notes}</div>}
                  </td>
                  <td>{CHANNEL_TYPE_LABEL[ch.type]}</td>
                  <td className="mkt-num">{baht(ch.budget)}</td>
                  <td className="mkt-num">{ch.leadsPerMonth}</td>
                  <td className="mkt-num">{baht(ch.leadsPerMonth > 0 ? ch.budget / ch.leadsPerMonth : 0)}</td>
                  <td className="mkt-num">{pct(ch.convRate)}</td>
                  <td className="mkt-num mkt-num-hi">{(ch.leadsPerMonth * ch.convRate / 100).toFixed(1)}</td>
                  <td className="mkt-num">
                    <span className={`mkt-status-dot${ch.active ? ' active' : ''}`} />
                    {ch.active ? 'เปิด' : 'ปิด'}
                  </td>
                  <td className="mkt-row-actions">
                    <button className="mkt-btn-sm" onClick={() => setEditCh({ ...ch })}>แก้ไข</button>
                    <button className="mkt-btn-sm mkt-btn-del" onClick={() => delCh(ch.id)}>ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="mkt-tfoot">
                <td><b>รวม</b></td>
                <td></td>
                <td className="mkt-num"><b>{baht(totalBudget)}</b></td>
                <td className="mkt-num"><b>{totalLeads}</b></td>
                <td className="mkt-num"><b>{baht(blendedCPL)}</b></td>
                <td></td>
                <td className="mkt-num mkt-num-hi"><b>{estCustomers.toFixed(1)}</b></td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ===== CAMPAIGNS ===== */}
      {tab === 'campaigns' && (
        <div className="mkt-section">
          <div className="mkt-sec-header">
            <div className="mkt-sec-title">แคมเปญการตลาด</div>
            <button className="mkt-add-btn" onClick={() => setEditCp({ ...BLANK_CP })}>+ เพิ่มแคมเปญ</button>
          </div>

          {editCp && (
            <div className="mkt-form">
              <div className="mkt-form-title">{editCp.id ? 'แก้ไขแคมเปญ' : 'เพิ่มแคมเปญใหม่'}</div>
              <div className="mkt-form-grid">
                <div className="mkt-form-row mkt-form-full">
                  <label>ชื่อแคมเปญ</label>
                  <input className="mkt-inp" value={editCp.name ?? ''} onChange={e => setEditCp(p => ({ ...p!, name: e.target.value }))} />
                </div>
                <div className="mkt-form-row">
                  <label>ช่องทาง</label>
                  <select className="mkt-inp" value={editCp.channelId ?? ''} onChange={e => setEditCp(p => ({ ...p!, channelId: e.target.value }))}>
                    <option value="">-- เลือกช่องทาง --</option>
                    {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="mkt-form-row">
                  <label>งบแคมเปญ (บาท)</label>
                  <input type="number" className="mkt-inp" min={0} value={editCp.budget ?? 0} onChange={e => setEditCp(p => ({ ...p!, budget: +e.target.value }))} />
                </div>
                <div className="mkt-form-row">
                  <label>วันเริ่ม</label>
                  <input type="date" className="mkt-inp" value={editCp.startDate ?? ''} onChange={e => setEditCp(p => ({ ...p!, startDate: e.target.value }))} />
                </div>
                <div className="mkt-form-row">
                  <label>วันสิ้นสุด</label>
                  <input type="date" className="mkt-inp" value={editCp.endDate ?? ''} onChange={e => setEditCp(p => ({ ...p!, endDate: e.target.value }))} />
                </div>
                <div className="mkt-form-row">
                  <label>สถานะ</label>
                  <select className="mkt-inp" value={editCp.status ?? 'planned'} onChange={e => setEditCp(p => ({ ...p!, status: e.target.value as MarketingCampaignStatus }))}>
                    {(Object.entries(STATUS_LABEL)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="mkt-form-row mkt-form-full">
                  <label>เป้าหมาย</label>
                  <input className="mkt-inp" value={editCp.goal ?? ''} onChange={e => setEditCp(p => ({ ...p!, goal: e.target.value }))} />
                </div>
                <div className="mkt-form-row mkt-form-full">
                  <label>KPI เป้า</label>
                  <input className="mkt-inp" placeholder="เช่น CPA < ฿800, 50 leads" value={editCp.kpiTarget ?? ''} onChange={e => setEditCp(p => ({ ...p!, kpiTarget: e.target.value }))} />
                </div>
                <div className="mkt-form-row mkt-form-full">
                  <label>ผลลัพธ์ (กรณีที่เสร็จแล้ว)</label>
                  <textarea className="mkt-ta" rows={2} value={editCp.result ?? ''} onChange={e => setEditCp(p => ({ ...p!, result: e.target.value }))} />
                </div>
              </div>
              <div className="mkt-form-footer">
                <button className="mkt-btn-save" onClick={() => saveCp(editCp)}>บันทึก</button>
                <button className="mkt-btn-cancel" onClick={() => setEditCp(null)}>ยกเลิก</button>
              </div>
            </div>
          )}

          <div className="mkt-cp-list">
            {campaigns.length === 0 && <div className="mkt-empty">ยังไม่มีแคมเปญ</div>}
            {campaigns.map(cp => {
              const ch = channels.find(c => c.id === cp.channelId);
              return (
                <div key={cp.id} className="mkt-cp-card">
                  <div className="mkt-cp-top">
                    <span className="mkt-cp-status" style={{ background: STATUS_COLOR[cp.status] }}>
                      {STATUS_LABEL[cp.status]}
                    </span>
                    {ch && <span className="mkt-cp-channel">{ch.name}</span>}
                    <span className="mkt-cp-budget">{baht(cp.budget)}</span>
                  </div>
                  <div className="mkt-cp-name">{cp.name}</div>
                  <div className="mkt-cp-dates">{cp.startDate} → {cp.endDate}</div>
                  <div className="mkt-cp-goal">{cp.goal}</div>
                  {cp.kpiTarget && <div className="mkt-cp-kpi">KPI: {cp.kpiTarget}</div>}
                  {cp.result && <div className="mkt-cp-result">ผลลัพธ์: {cp.result}</div>}
                  <div className="mkt-cp-actions">
                    <button className="mkt-btn-sm" onClick={() => setEditCp({ ...cp })}>แก้ไข</button>
                    <button className="mkt-btn-sm mkt-btn-del" onClick={() => delCp(cp.id)}>ลบ</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== GOALS ===== */}
      {tab === 'goals' && (
        <div className="mkt-section">
          <div className="mkt-sec-header">
            <div className="mkt-sec-title">เป้าหมายการตลาด (Marketing Goals)</div>
            <button className="mkt-add-btn" onClick={() => setEditG({ ...BLANK_G })}>+ เพิ่มเป้าหมาย</button>
          </div>

          {editG && (
            <div className="mkt-form">
              <div className="mkt-form-title">{editG.id ? 'แก้ไขเป้าหมาย' : 'เพิ่มเป้าหมายใหม่'}</div>
              <div className="mkt-form-grid">
                <div className="mkt-form-row mkt-form-full">
                  <label>ตัวชี้วัด</label>
                  <input className="mkt-inp" placeholder="เช่น Trial Signups/เดือน" value={editG.metric ?? ''} onChange={e => setEditG(p => ({ ...p!, metric: e.target.value }))} />
                </div>
                <div className="mkt-form-row">
                  <label>ค่าปัจจุบัน</label>
                  <input type="number" className="mkt-inp" value={editG.current ?? 0} onChange={e => setEditG(p => ({ ...p!, current: +e.target.value }))} />
                </div>
                <div className="mkt-form-row">
                  <label>เป้าหมาย</label>
                  <input type="number" className="mkt-inp" value={editG.target ?? 0} onChange={e => setEditG(p => ({ ...p!, target: +e.target.value }))} />
                </div>
                <div className="mkt-form-row">
                  <label>หน่วย</label>
                  <input className="mkt-inp" placeholder="เช่น ราย, %, ฿" value={editG.unit ?? ''} onChange={e => setEditG(p => ({ ...p!, unit: e.target.value }))} />
                </div>
              </div>
              <div className="mkt-form-footer">
                <button className="mkt-btn-save" onClick={() => saveG(editG)}>บันทึก</button>
                <button className="mkt-btn-cancel" onClick={() => setEditG(null)}>ยกเลิก</button>
              </div>
            </div>
          )}

          <div className="mkt-goals-list">
            {goals.length === 0 && <div className="mkt-empty">ยังไม่มีเป้าหมาย</div>}
            {goals.map(g => {
              const progress = g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0;
              const isCAC = g.metric.toLowerCase().includes('cac') || g.metric.toLowerCase().includes('acquisition');
              const isBetter = isCAC ? g.current <= g.target : g.current >= g.target;
              const tone = progress >= 100 ? 'var(--green)' : progress >= 60 ? 'var(--accent)' : '#f59e0b';
              return (
                <div key={g.id} className="mkt-goal-card">
                  <div className="mkt-goal-header">
                    <div className="mkt-goal-metric">{g.metric}</div>
                    <div className="mkt-goal-values">
                      <span className="mkt-goal-current" style={{ color: isBetter ? 'var(--green)' : '#f59e0b' }}>
                        {g.current.toLocaleString('th-TH')} {g.unit}
                      </span>
                      <span className="mkt-goal-sep">→</span>
                      <span className="mkt-goal-target">{g.target.toLocaleString('th-TH')} {g.unit}</span>
                    </div>
                    <div className="mkt-goal-actions">
                      <button className="mkt-btn-sm" onClick={() => setEditG({ ...g })}>แก้ไข</button>
                      <button className="mkt-btn-sm mkt-btn-del" onClick={() => delG(g.id)}>ลบ</button>
                    </div>
                  </div>
                  <div className="mkt-goal-bar-bg">
                    <div className="mkt-goal-bar-fill" style={{ width: `${progress}%`, background: tone }} />
                  </div>
                  <div className="mkt-goal-pct" style={{ color: tone }}>{progress.toFixed(0)}%</div>
                </div>
              );
            })}
          </div>

          {/* Budget & CAC settings */}
          <div className="mkt-settings-card">
            <div className="mkt-sec-title" style={{ marginBottom: 12 }}>ตั้งค่าเป้าหมายรวม</div>
            <div className="mkt-settings-grid">
              <div className="mkt-form-row">
                <label>งบการตลาด/เดือน (บาท)</label>
                <input type="number" className="mkt-inp" min={0} step={1000} value={mkt.monthlyBudget}
                  onChange={e => upd({ ...mkt, monthlyBudget: +e.target.value })} />
              </div>
              <div className="mkt-form-row">
                <label>เป้า Leads/เดือน</label>
                <input type="number" className="mkt-inp" min={0} value={mkt.targetLeads}
                  onChange={e => upd({ ...mkt, targetLeads: +e.target.value })} />
              </div>
              <div className="mkt-form-row">
                <label>เป้า CAC (บาท)</label>
                <input type="number" className="mkt-inp" min={0} step={100} value={mkt.targetCAC}
                  onChange={e => upd({ ...mkt, targetCAC: +e.target.value })} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
