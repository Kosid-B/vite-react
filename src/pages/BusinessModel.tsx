import { useState } from 'react';
import type { Agent, AppData, BMCData } from '../types';
import EditableList from '../components/EditableList';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import { withSkillDirectives } from '../lib/skillDirectives';

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
}

type BMCKey = keyof BMCData;

const BMC_CONFIG: Array<{ key: BMCKey; title: string; sub: string; color: string; area: string }> = [
  { key: 'partners',      title: 'Key Partners',          sub: 'พันธมิตรหลัก',         color: '#6aa9e9', area: 'kp' },
  { key: 'activities',   title: 'Key Activities',         sub: 'กิจกรรมหลัก',          color: '#52b788', area: 'ka' },
  { key: 'value',        title: 'Value Propositions',     sub: 'คุณค่าที่นำเสนอ',      color: '#e0704f', area: 'vp' },
  { key: 'relationships',title: 'Customer Relationships', sub: 'ความสัมพันธ์ลูกค้า',   color: '#d98e3d', area: 'cr' },
  { key: 'segments',     title: 'Customer Segments',      sub: 'กลุ่มลูกค้าเป้าหมาย',  color: '#6aa9e9', area: 'cs' },
  { key: 'resources',    title: 'Key Resources',          sub: 'ทรัพยากรหลัก',         color: '#52b788', area: 'kr' },
  { key: 'channels',     title: 'Channels',               sub: 'ช่องทางเข้าถึงลูกค้า', color: '#d98e3d', area: 'ch' },
  { key: 'costs',        title: 'Cost Structure',         sub: 'โครงสร้างต้นทุน',      color: '#e05d5d', area: 'co' },
  { key: 'revenue',      title: 'Revenue Streams',        sub: 'กระแสรายได้',           color: '#52b788', area: 're' },
];

const DE24: Array<{ name: string; phase: number }> = [
  { name: 'Market Segmentation',                           phase: 0 },
  { name: 'Select Beachhead Market',                       phase: 0 },
  { name: 'Build End User Profile',                        phase: 0 },
  { name: 'Calculate Total Addressable Market (TAM)',       phase: 0 },
  { name: 'Profile the Persona',                           phase: 0 },
  { name: 'Full Life Cycle Use Case',                      phase: 0 },
  { name: 'High-Level Product Specification',              phase: 1 },
  { name: 'Quantify the Value Proposition',                phase: 1 },
  { name: 'Identify Your Next 10 Customers',               phase: 1 },
  { name: 'Define Your Core',                              phase: 1 },
  { name: 'Chart Your Competitive Position',               phase: 1 },
  { name: "Determine Customer's DMU",                      phase: 2 },
  { name: 'Map Process to Acquire a Paying Customer',      phase: 2 },
  { name: 'Calculate TAM for Beachhead Market',            phase: 2 },
  { name: 'Design a Business Model',                       phase: 2 },
  { name: 'Set Your Pricing Framework',                    phase: 2 },
  { name: 'Calculate Lifetime Value (LTV)',                phase: 2 },
  { name: 'Map the Sales Process',                         phase: 2 },
  { name: 'Calculate Cost of Acquisition (COCA)',          phase: 2 },
  { name: 'Identify Key Assumptions',                      phase: 3 },
  { name: 'Test Key Assumptions',                          phase: 3 },
  { name: 'Define Minimum Viable Business Product (MVBP)', phase: 3 },
  { name: 'Show That "Dogs Eat the Dog Food"',             phase: 3 },
  { name: 'Develop a Product Plan',                        phase: 3 },
];

const PHASES = [
  { label: 'ลูกค้าของคุณคือใคร',      color: '#1a4f8a' },
  { label: 'คุณค่าที่นำเสนอคืออะไร',  color: '#c44b2b' },
  { label: 'กระบวนการขายและรายได้',   color: '#a05c1a' },
  { label: 'ทดสอบและขยายธุรกิจ',      color: '#2d6a4f' },
];

// C-level ที่เหมาะเป็นเจ้าของแต่ละ Phase — CEO เลือก/สร้างแล้วสั่งงาน
const PHASE_OWNERS: { role: string; name: string; avatar: string; color: string; mandate: string }[] = [
  { role: 'CMO', name: 'มณี', avatar: '📣', color: '#c44b2b', mandate: 'บริหารการตลาดและลูกค้า — เจ้าของ 24 Steps Phase 1: ลูกค้าของคุณคือใคร' },
  { role: 'CPO', name: 'ดารา', avatar: '🛠️', color: '#0e7490', mandate: 'บริหารผลิตภัณฑ์ — เจ้าของ 24 Steps Phase 2: คุณค่าที่นำเสนอคืออะไร' },
  { role: 'CFO', name: 'บุญมี', avatar: '💰', color: '#2d6a4f', mandate: 'บริหารการเงินและรายได้ — เจ้าของ 24 Steps Phase 3: กระบวนการขายและรายได้' },
  { role: 'COO', name: 'สมชาย', avatar: '⚙️', color: '#a05c1a', mandate: 'บริหารปฏิบัติการ — เจ้าของ 24 Steps Phase 4: ทดสอบและขยายธุรกิจ' },
];

const DE24_TH: string[] = [
  'แบ่งส่วนตลาด — ระดมสมองหาโอกาสทั้งหมด คัดเหลือ 6-12 ตลาดที่มีศักยภาพสูง',
  'เลือกตลาดหัวหาด — 1 ตลาดเล็กที่ยึดครองได้เร็ว สร้างกระแสเงินสดทันที',
  'สร้างแฟ้มผู้ใช้ตัวจริง — เพศ อายุ รายได้ แรงผลักดัน ความกลัว',
  'คำนวณ TAM ตลาดหัวหาด — รายได้ต่อปีหากครองตลาด 100% (เป้า 5-100M $/ปี)',
  'กำหนดตัวละคร (Persona) — 1 คนจริง + เกณฑ์การซื้อเรียงลำดับความสำคัญ',
  'เขียนวงจรการใช้ผลิตภัณฑ์ — ค้นพบ ประเมิน สั่งซื้อ ติดตั้ง ใช้งาน จ่ายเงิน',
  'ร่างภาพผลิตภัณฑ์ — สตอรีบอร์ด/แผ่นพับ แสดงประโยชน์ที่ลูกค้าได้รับ',
  'แปลงคุณค่าเป็นตัวเลข — ประหยัดเงิน/เวลาเท่าไร เทียบ As-is vs Possible',
  'ระบุลูกค้า 10 คนถัดไป — ติดต่อจริง ทดสอบสมมติฐาน ยืนยันความต้องการ',
  'กำหนดแก่นธุรกิจ — Network Effect, Data Moat, IP Moat ที่คู่แข่งลอกยาก',
  'ระบุตำแหน่งในการแข่งขัน — กราฟ 2 แกนจากเกณฑ์ซื้อ 2 อันดับแรก',
  'ค้นหาหน่วยตัดสินใจ (DMU) — Economic Buyer, Champion, Veto Power',
  'ร่างกระบวนการหาลูกค้า — Sales Cycle ตั้งแต่ติดต่อครั้งแรกถึงรับเงิน',
  'คำนวณ TAM ตลาดถัดไป — ตลาดข้างเคียงหลังจากครองตลาดหัวหาดแล้ว',
  'ออกแบบโมเดลธุรกิจ — วิธีเก็บเกี่ยวคุณค่า: Subscription, Consumables, Transaction Fee',
  'กำหนดกรอบราคา — ราคาจากคุณค่าที่ลูกค้าได้รับ ไม่ใช่จากต้นทุน',
  'คำนวณ LTV — NPV ของกำไรต่อลูกค้าตลอด 5 ปี หักต้นทุนเงินทุน 35-75%/ปี',
  'ร่างกระบวนการขาย — ระยะสั้น (Demand) / กลาง (Distribution) / ยาว (Online)',
  'คำนวณ COCA — ต้นทุนการตลาด+ขาย ÷ ลูกค้าใหม่ เป้า LTV:COCA ≥ 3:1',
  'ระบุสมมติฐานหลัก — จัดลำดับความสำคัญสมมติฐานที่ยังไม่ได้รับการพิสูจน์',
  'ทดสอบสมมติฐานหลัก — ออกแบบทดลองถูก เร็ว ง่าย รับ Feedback จากของจริง',
  'กำหนด MVBP — ลูกค้าได้ประโยชน์ + ยอมจ่ายเงิน + สร้าง Feedback Loop',
  'พิสูจน์ว่าลูกค้าจะซื้อ — วัด K-Factor (Viral Coefficient) ≥ 1 = เติบโตทวีคูณ',
  'เขียนแผนพัฒนาผลิตภัณฑ์ — จาก MVBP สู่ Full Product + ตลาดข้างเคียง',
];

export default function BusinessModel({ data, onUpdate }: Props) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [analyzingStep, setAnalyzingStep] = useState<number | null>(null);
  const [stepOutputs, setStepOutputs] = useState<Record<number, string>>({});
  const [assignMsg, setAssignMsg] = useState<string | null>(null);
  const bm = data.businessModel;

  // CEO เลือก/สร้าง C-level เจ้าของแต่ละ Phase แล้วสั่งงานให้เติมข้อมูล
  // ให้สอดคล้องกับ BMC ที่บอร์ดอนุมัติแล้ว (งานเข้า Kanban หน้า บริษัท AI)
  function ceoAssignDe24() {
    const c = data.aiCompany;
    const agents = [...c.agents];
    let ceo = agents.find(a => a.role.toUpperCase().includes('CEO'));
    if (!ceo) {
      ceo = {
        id: 'a-' + Date.now().toString(36) + '-ceo', role: 'CEO', name: 'เอเจนต์หลัก',
        avatar: '🤖', color: '#c44b2b', mandate: 'กำหนดทิศทางและตัดสินใจสูงสุด',
        model: 'claude-opus-4-8', status: 'idle', reportsTo: null,
      };
      agents.push(ceo);
    }
    const owners: (string | null)[] = [];
    // ลบงานมอบหมายชุดเก่า (กันสั่งซ้ำ) แล้วสร้างชุดใหม่จาก BMC ล่าสุด
    const tasks = c.tasks.filter(t => !t.id.startsWith('t-de24-'));
    const lines: string[] = [];
    PHASE_OWNERS.forEach((spec, pi) => {
      let agent: Agent | undefined = agents.find(a => a.role.toUpperCase().includes(spec.role));
      if (!agent) {
        agent = {
          id: 'a-' + Date.now().toString(36) + '-' + spec.role.toLowerCase(),
          role: spec.role, name: spec.name, avatar: spec.avatar, color: spec.color,
          mandate: spec.mandate, model: 'claude-sonnet-4-6',
          status: c.autoHire ? 'idle' : 'waiting', reportsTo: ceo!.id,
        };
        agents.push(agent);
      }
      owners[pi] = agent.id;
      const stepNums = DE24.map((s, i) => (s.phase === pi ? i + 1 : null)).filter((n): n is number => n !== null);
      tasks.push({
        id: `t-de24-${pi}-` + Date.now().toString(36),
        agentId: agent.id,
        title: `24 Steps Phase ${pi + 1}: ${PHASES[pi].label} (ขั้น ${stepNums[0]}–${stepNums[stepNums.length - 1]})`,
        detail: [
          `CEO สั่งงาน: เติมข้อมูล/หมายเหตุขั้นตอนที่ ${stepNums.join(', ')} ในหน้า Business Model · MIT24`,
          `ให้สอดคล้องกับ BMC ที่บอร์ดอนุมัติแล้ว:`,
          `• คุณค่าที่ส่งมอบ: ${bm.bmc.value[0] ?? '-'}`,
          `• กลุ่มลูกค้า: ${bm.bmc.segments[0] ?? '-'}`,
          `• กระแสรายได้: ${bm.bmc.revenue[0] ?? '-'}`,
        ].join('\n'),
        status: 'queued',
      });
      lines.push(`Phase ${pi + 1} → ${spec.role} ${agent.name}`);
    });
    onUpdate({
      ...data,
      aiCompany: { ...c, agents, tasks },
      businessModel: { ...bm, de24Owners: owners },
    });
    setAssignMsg(`✅ CEO มอบหมายแล้ว: ${lines.join(' · ')} — สั่งงาน 4 งานเข้า Kanban ในหน้า บริษัท AI`);
  }

  function updateBMC(key: BMCKey, items: string[]) {
    onUpdate({ ...data, businessModel: { ...bm, bmc: { ...bm.bmc, [key]: items } } });
  }

  function toggleStep(idx: number) {
    const de24 = bm.de24.map((s, i) => i === idx ? { ...s, done: !s.done } : s);
    onUpdate({ ...data, businessModel: { ...bm, de24 } });
  }

  function saveStepNote(idx: number, notes: string) {
    const de24 = bm.de24.map((s, i) => i === idx ? { ...s, notes } : s);
    onUpdate({ ...data, businessModel: { ...bm, de24 } });
  }

  async function analyzeStep(idx: number) {
    if (!isSupabaseEnabled || !supabase) return;
    setAnalyzingStep(idx);
    try {
      const step = DE24[idx];
      const desc = DE24_TH[idx] ?? step.name;
      const notes = bm.de24[idx]?.notes ?? '';
      const agent = data.aiCompany?.agents.find(a => a.role === 'CEO') ?? data.aiCompany?.agents[0];
      const { data: res, error } = await supabase.functions.invoke('agent-run', {
        body: {
          role: agent?.role ?? 'CEO',
          mandate: withSkillDirectives(agent?.mandate ?? 'วิเคราะห์ขั้นตอนการสร้างธุรกิจ MIT 24 Steps', data.aiCompany?.purchasedSkills),
          model: agent?.model ?? 'claude-sonnet-4-6',
          title: `MIT Step ${idx + 1}: ${step.name}`,
          detail: `${desc}${notes ? `\n\nหมายเหตุที่มีอยู่: ${notes}` : ''}`,
          goal: `วิเคราะห์ขั้นตอนที่ ${idx + 1} (${step.name}) สำหรับธุรกิจของเรา ให้คำแนะนำเชิงปฏิบัติที่ทำได้ทันที`,
          industry: data.aiCompany?.industry ?? '',
          companyName: data.aiCompany?.name ?? '',
          orgContext: data.aiCompany?.agents.map(a => ({ role: a.role, mandate: a.mandate })) ?? [],
        },
      });
      if (error) throw error;
      setStepOutputs(prev => ({ ...prev, [idx]: res?.output ?? '' }));
    } catch (e) {
      setStepOutputs(prev => ({ ...prev, [idx]: '✕ ' + (e as Error).message }));
    } finally {
      setAnalyzingStep(null);
    }
  }

  function autoPopulate() {
    const segments = data.personas.map(p => `${p.name} — ${p.role}`);
    const value = [...new Set(data.stages.flatMap(s => s.opp))].slice(0, 5);
    const channels = [...new Set(data.stages.flatMap(s => s.touch))].slice(0, 4);
    const activities = data.actions.slice(0, 4).map(a => a.title);
    const stageCostTotal = data.roi.stageCosts.reduce((sum, sc) => sum + sc.hours * data.roi.teamHourlyRate, 0);
    const costs = [
      `ต้นทุนทีม Consultant ฿${stageCostTotal.toLocaleString()} / รอบ`,
      ...bm.bmc.costs.slice(1),
    ];
    const revenue = [
      `Project Fee เฉลี่ย ฿${data.roi.avgDealValue.toLocaleString()} / โปรเจกต์`,
      `เป้าหมาย ฿${data.roi.monthlyRevenueTarget.toLocaleString()} / เดือน`,
      'Monthly Retainer',
      'Workshop & Training',
    ];
    onUpdate({
      ...data,
      businessModel: {
        ...bm,
        bmc: {
          ...bm.bmc,
          segments,
          value: value.length ? value : bm.bmc.value,
          channels: channels.length ? channels : bm.bmc.channels,
          activities: activities.length ? activities : bm.bmc.activities,
          costs,
          revenue,
        },
      },
    });
  }

  const doneCount = bm.de24.filter(s => s.done).length;
  const pct = Math.round((doneCount / 24) * 100);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Business Model</div>
        <div className="page-meta">
          <span className="meta-chip">Business Model Canvas</span>
          <span className="meta-chip">Disciplined Entrepreneurship · 24 Steps</span>
          <button className="bmc-auto-btn" onClick={autoPopulate}>
            ↻ Auto-populate จากข้อมูล
          </button>
        </div>
      </div>

      <div className="bmc-section-label">Business Model Canvas (Osterwalder)</div>
      <div className="bmc-canvas">
        {BMC_CONFIG.map(b => (
          <div key={b.key} className={`bmc-block bmc-block-${b.area}`}>
            <div className="bmc-block-hd">
              <span className="bmc-block-title" style={{ color: b.color }}>{b.title}</span>
              <span className="bmc-block-sub">{b.sub}</span>
            </div>
            <EditableList
              items={bm.bmc[b.key]}
              itemKey={`bmc-${b.key}`}
              onSave={(idx, val) => {
                const arr = [...bm.bmc[b.key]];
                arr[idx] = val;
                updateBMC(b.key, arr);
              }}
              onAdd={() => updateBMC(b.key, [...bm.bmc[b.key], 'รายการใหม่'])}
              onDelete={idx => updateBMC(b.key, bm.bmc[b.key].filter((_, i) => i !== idx))}
              multiline={false}
              addLabel="＋"
              addStyle={{ fontSize: 10, padding: '2px 4px', marginTop: 2 }}
            />
          </div>
        ))}
      </div>

      <div className="bmc-de24-header">
        <div>
          <div className="bmc-de24-title">Disciplined Entrepreneurship — 24 Steps</div>
          <div className="bmc-de24-author">Bill Aulet, MIT</div>
        </div>
        <div className="bmc-de24-progress">
          <button className="bmc-auto-btn" onClick={ceoAssignDe24}
            title="CEO เลือก C-level เจ้าของแต่ละ Phase (ลูกค้า→CMO, คุณค่า→CPO, รายได้→CFO, ทดสอบ→COO) แล้วสั่งงานให้เติมข้อมูลตาม BMC ที่บอร์ดอนุมัติ">
            ✦ ให้ CEO มอบหมาย C-level + สั่งงาน
          </button>
          <div className="bmc-de24-bar">
            <div className="bmc-de24-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="bmc-de24-count"><b>{doneCount}</b> / 24 เสร็จแล้ว ({pct}%)</span>
        </div>
      </div>

      {assignMsg && <div className="bmc-de24-assign-msg">{assignMsg}</div>}

      <div className="bmc-de24-grid">
        {PHASES.map((phase, pi) => {
          const owner = data.aiCompany.agents.find(a => a.id === bm.de24Owners?.[pi]);
          return (
          <div key={pi} className="bmc-phase-card" style={{ borderTopColor: phase.color }}>
            <div className="bmc-phase-hd">
              <span className="bmc-phase-num" style={{ color: phase.color }}>Phase {pi + 1}</span>
              <span className="bmc-phase-label" style={{ color: phase.color }}>{phase.label}</span>
              {owner
                ? <span className="bmc-phase-owner" title={`เจ้าของ Phase — CEO มอบหมายให้ ${owner.role} ${owner.name}`}>{owner.avatar} {owner.role} · {owner.name}</span>
                : <span className="bmc-phase-owner none">ยังไม่มีเจ้าของ</span>}
            </div>
            {DE24.map((step, si) => {
              if (step.phase !== pi) return null;
              const state = bm.de24[si];
              const isExp = expandedStep === si;
              return (
                <div key={si} className={`bmc-step${state.done ? ' bmc-step-done' : ''}`}>
                  <div className="bmc-step-row" onClick={() => setExpandedStep(isExp ? null : si)}>
                    <button
                      className={`bmc-step-chk${state.done ? ' done' : ''}`}
                      onClick={e => { e.stopPropagation(); toggleStep(si); }}
                      title={state.done ? 'ยกเลิก' : 'ทำเครื่องหมายเสร็จแล้ว'}
                    >
                      {state.done && (
                        <svg width="9" height="9" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className="bmc-step-n">{si + 1}</span>
                    <span className="bmc-step-name">{step.name}</span>
                    {state.notes && !isExp && <span className="bmc-step-note-dot" title="มีหมายเหตุ" />}
                    <span className="bmc-step-tog">{isExp ? '▲' : '▽'}</span>
                  </div>
                  {isExp && (
                    <div className="bmc-step-note-wrap">
                      <div className="bmc-step-th-desc">{DE24_TH[si]}</div>
                      <textarea
                        className="bmc-step-note"
                        placeholder="หมายเหตุ / สิ่งที่ค้นพบ / action items..."
                        defaultValue={state.notes}
                        key={`note-${si}`}
                        onBlur={e => saveStepNote(si, e.target.value)}
                        rows={2}
                        spellCheck={false}
                      />
                      {isSupabaseEnabled && (
                        <button
                          className="bmc-step-ai-btn"
                          onClick={() => analyzeStep(si)}
                          disabled={analyzingStep === si}
                        >
                          {analyzingStep === si ? '⏳ กำลังวิเคราะห์…' : '🤖 AI วิเคราะห์ขั้นตอนนี้'}
                        </button>
                      )}
                      {stepOutputs[si] && (
                        <div className="bmc-step-ai-out">
                          <div className="bmc-step-ai-out-hd">AI Insight · Step {si + 1}</div>
                          <div className="bmc-step-ai-out-body">{stepOutputs[si]}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          );
        })}
      </div>
    </div>
  );
}
