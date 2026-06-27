import { useEffect, useRef, useState } from 'react';
import type { AppData, Agent, AgentStatus, ApprovalStatus, TaskStatus } from '../types';
import { autoH } from '../utils';
import { isSupabaseEnabled, supabase } from '../lib/supabase';

// ---- Org Chart Node (recursive) ----
interface OcNodeProps {
  agent: Agent;
  agents: Agent[];
  onAdd: (parentId: string) => void;
  onFire: (id: string) => void;
  onSaveField: (id: string, field: keyof Agent, value: string) => void;
}
function OcNode({ agent, agents, onAdd, onFire, onSaveField }: OcNodeProps) {
  const children = agents.filter(a => a.reportsTo === agent.id);
  return (
    <div className="oc-subtree">
      <div className="oc-node" style={{ borderTopColor: agent.color }}>
        <div className="oc-node-av" style={{ background: agent.color + '22' }}>{agent.avatar}</div>
        <div className="oc-node-info">
          <input className="oc-role-inp"
            defaultValue={agent.role} key={'ocr' + agent.id + agent.role}
            onBlur={e => onSaveField(agent.id, 'role', e.target.value)} spellCheck={false} />
          <input className="oc-name-inp"
            defaultValue={agent.name} key={'ocn' + agent.id + agent.name}
            onBlur={e => onSaveField(agent.id, 'name', e.target.value)} spellCheck={false} />
        </div>
        <div className="oc-node-actions">
          <button className="oc-add-btn" onClick={() => onAdd(agent.id)} title="เพิ่มตำแหน่งใต้บังคับบัญชา">＋</button>
          <button className="oc-del-btn" onClick={() => onFire(agent.id)} title="ลบตำแหน่ง">×</button>
        </div>
      </div>
      {children.length > 0 && (
        <div className="oc-children">
          {children.map(child => (
            <OcNode key={child.id} agent={child} agents={agents}
              onAdd={onAdd} onFire={onFire} onSaveField={onSaveField} />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
}

const STATUS_LABEL: Record<AgentStatus, string> = {
  working: 'กำลังทำงาน',
  idle: 'ว่าง',
  waiting: 'รออนุมัติ',
};

const TASK_COLS: { key: TaskStatus; hd: string; color: string }[] = [
  { key: 'queued', hd: 'ต้องทำ', color: '#8a8278' },
  { key: 'in_progress', hd: 'กำลังทำ', color: '#1a4f8a' },
  { key: 'review', hd: 'ตรวจสอบ', color: '#a05c1a' },
  { key: 'done', hd: 'เสร็จแล้ว', color: '#2d6a4f' },
  { key: 'blocked', hd: 'ถูกบล็อก', color: '#c44b2b' },
];

const AGENT_PALETTE = ['#c44b2b', '#1a4f8a', '#2d6a4f', '#a05c1a', '#6b3fa0', '#0e7490'];
const AVATARS = ['🤖', '🧠', '📈', '🛠️', '🎯', '🔬', '💡', '🗂️'];
const MODELS = ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'OpenAI Codex', 'gpt-4o'];

// ยิ่งรอบสั้น ทำงานเร็วแต่ใช้ token ถี่ (งบบานปลาย) · ยิ่งรอบยาว ประหยัดงบ
const HEARTBEAT_OPTS = [
  { sec: 60, label: 'ทุก 1 นาที' },
  { sec: 300, label: 'ทุก 5 นาที' },
  { sec: 600, label: 'ทุก 10 นาที · แนะนำตอนเริ่ม' },
  { sec: 1800, label: 'ทุก 30 นาที' },
  { sec: 3600, label: 'ทุก 1 ชั่วโมง · ประหยัดงบ' },
  { sec: 86400, label: 'วันละครั้ง · ประหยัดสุด' },
];

function fmtHeartbeat(sec: number): string {
  if (sec < 60) return sec + ' วินาที';
  if (sec < 3600) return sec / 60 + ' นาที';
  if (sec < 86400) return sec / 3600 + ' ชั่วโมง';
  return sec / 86400 + ' วัน';
}

// เทมเพลตข้อความสำหรับ "ฟีดงานสด" จำลองการทำงาน 24 ชม.
const FEED_TEMPLATES: ((role: string, name: string, goal: string) => string)[] = [
  (r, n) => `${r} ${n} กำลังวิเคราะห์ข้อมูลตลาดและคู่แข่ง`,
  (r, n) => `${r} ${n} ร่างแผนงานสัปดาห์ถัดไปเสร็จแล้ว`,
  (r, n) => `${r} ${n} มอบหมายงานย่อย 3 รายการให้ทีม`,
  (r, n) => `${r} ${n} เรียกใช้ Web Search เพื่อหาข้อมูลลูกค้าใหม่`,
  (r, n) => `${r} ${n} เขียนร่างคอนเทนต์โฆษณา 3 เวอร์ชัน`,
  (r, n) => `${r} ${n} ส่งอีเมลติดตามลูกค้า 18 ราย`,
  (r, n, g) => `${r} ${n} ตรวจความคืบหน้าเทียบเป้าหมาย: "${g.slice(0, 28)}…"`,
  (r, n) => `${r} ${n} ขออนุมัติงบจากบอร์ดสำหรับแคมเปญใหม่`,
  (r, n) => `${r} ${n} อัปเดตรายงานผลลัพธ์ลง Google Sheets`,
];

function nowTime(): string {
  const d = new Date();
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AICompany({ data, onUpdate }: Props) {
  const c = data.aiCompany;
  const [feed, setFeed] = useState<{ id: number; time: string; text: string; color: string }[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const counter = useRef(0);
  const [planning, setPlanning] = useState(false);
  const [planMsg, setPlanMsg] = useState<string | null>(null);
  const [runningTaskIds, setRunningTaskIds] = useState<Set<string>>(new Set());

  // เครื่องยนต์จำลอง: ขณะ running จะสร้างกิจกรรมใหม่เรื่อย ๆ (ephemeral ไม่บันทึกลง storage)
  useEffect(() => {
    if (!c.running) return;
    const tick = () => {
      const ag = c.agents[Math.floor(Math.random() * c.agents.length)];
      if (!ag) return;
      const tpl = FEED_TEMPLATES[Math.floor(Math.random() * FEED_TEMPLATES.length)];
      counter.current += 1;
      setFeed(prev => [
        { id: counter.current, time: nowTime(), text: tpl(ag.role, ag.name, c.goal), color: ag.color },
        ...prev,
      ].slice(0, 40));
    };
    tick();
    const iv = setInterval(tick, 2600);
    return () => clearInterval(iv);
  }, [c.running, c.agents, c.goal]);

  function patch(next: Partial<typeof c>) {
    onUpdate({ ...data, aiCompany: { ...c, ...next } });
  }

  function toggleRun() {
    if (!c.running) setFeed([]);
    patch({ running: !c.running });
  }

  // เรียก Edge Function ai-plan ให้ CEO วางแผนด้วย Claude จริง
  async function runAiPlan() {
    if (!supabase) return;
    setPlanning(true); setPlanMsg(null);
    try {
      const { data: res, error } = await supabase.functions.invoke('ai-plan', {
        body: { goal: c.goal, industry: c.industry, agents: c.agents.map(a => ({ role: a.role, mandate: a.mandate })) },
      });
      if (error) throw error;
      const roleToId = (role: string) =>
        c.agents.find(a => a.role.toLowerCase() === String(role ?? '').toLowerCase())?.id ?? c.agents[0]?.id ?? '';
      const ok: TaskStatus[] = ['queued', 'in_progress', 'review', 'done', 'blocked'];
      const newTasks = (res?.tasks ?? []).map((t: { agentRole?: string; title?: string; detail?: string; status?: string }, i: number) => ({
        id: 'ai-' + Date.now().toString(36) + i,
        agentId: roleToId(t.agentRole ?? ''),
        title: String(t.title ?? 'งานจาก AI'),
        detail: String(t.detail ?? ''),
        status: (ok.includes(t.status as TaskStatus) ? t.status : 'queued') as TaskStatus,
      }));
      const newApprovals = (res?.approvals ?? []).map((a: { agentRole?: string; title?: string; detail?: string; impact?: string }, i: number) => ({
        id: 'aiap-' + Date.now().toString(36) + i,
        agentId: roleToId(a.agentRole ?? ''),
        title: String(a.title ?? 'ขออนุมัติ'),
        detail: String(a.detail ?? ''),
        impact: String(a.impact ?? ''),
        status: 'pending' as ApprovalStatus,
      }));
      patch({ tasks: [...newTasks, ...c.tasks], approvals: [...newApprovals, ...c.approvals] });
      setPlanMsg(`✓ CEO วางแผนเพิ่ม ${newTasks.length} งาน${newApprovals.length ? ` · ${newApprovals.length} เรื่องรออนุมัติ` : ''}`);
    } catch (e) {
      setPlanMsg('✕ วางแผนไม่สำเร็จ: ' + ((e as Error).message || 'error') + ' — ตรวจว่า deploy ai-plan + ตั้ง ANTHROPIC_API_KEY แล้ว');
    } finally {
      setPlanning(false);
    }
  }

  // ให้ AI Agent ดำเนินงานจริงตามบทบาทหน้าที่ใน org chart
  async function executeTask(taskId: string) {
    if (!supabase) return;
    const task = c.tasks.find(t => t.id === taskId);
    const agent = c.agents.find(a => a.id === task?.agentId);
    if (!task || !agent) return;

    setRunningTaskIds(prev => new Set(prev).add(taskId));
    // เริ่มงาน: เปลี่ยนสถานะเป็น in_progress
    patch({ tasks: c.tasks.map(t => t.id === taskId ? { ...t, status: 'in_progress' as const } : t) });

    try {
      const orgContext = c.agents
        .filter(a => a.id !== agent.id)
        .map(a => ({ role: a.role, mandate: a.mandate }));

      const { data: res, error } = await supabase.functions.invoke('agent-run', {
        body: {
          role: agent.role,
          name: agent.name,
          mandate: agent.mandate,
          model: agent.model,
          title: task.title,
          detail: task.detail,
          goal: c.goal,
          industry: c.industry,
          companyName: c.name,
          orgContext,
        },
      });
      if (error) throw error;

      const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      patch({
        tasks: c.tasks.map(t => t.id === taskId
          ? { ...t, status: 'review' as const, output: res?.output ?? '', executedAt: now }
          : t
        ),
      });
    } catch (e) {
      patch({
        tasks: c.tasks.map(t => t.id === taskId
          ? { ...t, status: 'blocked' as const, output: '✕ ดำเนินงานไม่สำเร็จ: ' + (e as Error).message }
          : t
        ),
      });
    } finally {
      setRunningTaskIds(prev => { const s = new Set(prev); s.delete(taskId); return s; });
    }
  }

  function setCompanyField(field: 'name' | 'goal' | 'industry', value: string) {
    patch({ [field]: value } as Partial<typeof c>);
  }

  /* ----- agents ----- */
  function saveAgent(id: string, field: keyof Agent, value: string) {
    patch({ agents: c.agents.map(a => a.id === id ? { ...a, [field]: value } : a) });
  }
  function hireAgent() {
    const i = c.agents.length;
    const newAgent: Agent = {
      id: 'a-' + Date.now().toString(36),
      role: 'ตำแหน่งใหม่', name: 'เอเจนต์', avatar: AVATARS[i % AVATARS.length],
      color: AGENT_PALETTE[i % AGENT_PALETTE.length],
      mandate: 'อธิบายหน้าที่ของเอเจนต์นี้', model: MODELS[1],
      status: c.autoHire ? 'idle' : 'waiting',
      reportsTo: c.agents.find(a => a.role === 'CEO')?.id ?? null,
    };
    patch({ agents: [...c.agents, newAgent] });
  }
  // เพิ่มตำแหน่งใต้บังคับบัญชาของ parentId (จากปุ่ม ＋ ใน org chart)
  function hireUnder(parentId: string) {
    const i = c.agents.length;
    const parent = c.agents.find(a => a.id === parentId);
    const newAgent: Agent = {
      id: 'a-' + Date.now().toString(36),
      role: 'ตำแหน่งใหม่', name: 'เอเจนต์',
      avatar: AVATARS[i % AVATARS.length],
      color: AGENT_PALETTE[i % AGENT_PALETTE.length],
      mandate: `รับผิดชอบต่อ ${parent?.role ?? 'หัวหน้า'} — ระบุหน้าที่ที่นี่`,
      model: MODELS[1],
      status: c.autoHire ? 'idle' : 'waiting',
      reportsTo: parentId,
    };
    patch({ agents: [...c.agents, newAgent] });
  }
  function fireAgent(id: string) {
    patch({
      agents: c.agents.filter(a => a.id !== id).map(a => a.reportsTo === id ? { ...a, reportsTo: null } : a),
      tasks: c.tasks.filter(t => t.agentId !== id),
    });
  }

  /* ----- tasks ----- */
  function moveTask(id: string, status: TaskStatus) {
    patch({ tasks: c.tasks.map(t => t.id === id ? { ...t, status } : t) });
  }
  function addTask() {
    patch({ tasks: [...c.tasks, {
      id: 't-' + Date.now().toString(36),
      agentId: c.agents[0]?.id ?? '',
      title: 'งานใหม่', detail: 'รายละเอียดงาน', status: 'queued',
    }] });
  }
  function delTask(id: string) {
    patch({ tasks: c.tasks.filter(t => t.id !== id) });
  }

  /* ----- approvals ----- */
  function decideApproval(id: string, status: ApprovalStatus) {
    patch({ approvals: c.approvals.map(a => a.id === id ? { ...a, status } : a) });
  }

  /* ----- integrations ----- */
  function toggleIntegration(id: string) {
    patch({ integrations: c.integrations.map(it => it.id === id ? { ...it, connected: !it.connected } : it) });
  }
  function setApiKey(id: string, key: string) {
    patch({ integrations: c.integrations.map(it => it.id === id ? { ...it, apiKey: key } : it) });
  }

  const agentName = (id: string) => c.agents.find(a => a.id === id)?.role ?? '—';
  const pendingApprovals = c.approvals.filter(a => a.status === 'pending').length;
  const workingCount = c.running ? c.agents.filter(a => a.status === 'working').length : 0;
  const queuedCount = c.tasks.filter(t => t.status === 'queued' || t.status === 'in_progress').length;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">องค์กร AI อัตโนมัติ</div>
        <div className="page-meta">
          <span className="meta-chip">{c.agents.length} เอเจนต์</span>
          <span className="meta-chip">{queuedCount} งานในระบบ</span>
          {pendingApprovals > 0 && <span className="meta-chip" style={{ borderColor: 'var(--rust)', color: 'var(--rust)' }}>{pendingApprovals} รออนุมัติ</span>}
          <span className="law-badge" data-tip={"Jakob's Law: ใช้รูปแบบ Kanban + org chart\nที่ผู้ใช้คุ้นจาก Trello/Asana อยู่แล้ว\nจึงเรียนรู้ได้ทันที"}>Jakob's Law</span>
          <span className="law-badge" data-tip={"Doherty Threshold: ฟีดงานสดตอบสนอง < 400ms\nระบบรู้สึก 'มีชีวิต' ทำงานตลอดเวลา\nผู้ใช้จึงอยู่กับระบบนานขึ้น"}>Doherty Threshold</span>
          <span className="law-badge" data-tip={"Miller's Law: สรุปตัวเลขเป็น 4 ก้อน\nไม่ล้น working memory ของบอร์ด"}>Miller's Law</span>
        </div>
      </div>

      {/* ===== Control bar ===== */}
      <div className="ai-control">
        <div className="ai-control-main">
          <input className="ai-co-name" defaultValue={c.name} key={'n' + c.name}
            onBlur={e => setCompanyField('name', e.target.value)} spellCheck={false} />
          <div className="ai-co-industry">
            <span className="ai-co-lbl">อุตสาหกรรม</span>
            <input className="ai-co-ind-inp" defaultValue={c.industry} key={'i' + c.industry}
              onBlur={e => setCompanyField('industry', e.target.value)} spellCheck={false} />
          </div>
        </div>
        <div className="ai-control-side">
          <label className="ai-hb" title={'Heartbeat = ความถี่ที่เอเจนต์ตื่นมาทำงาน\nรอบสั้น = เร็วแต่ใช้ token/งบมากขึ้น\nรอบยาว = ประหยัดงบ (บันทึกอัตโนมัติ)'}>
            <span>รอบทำงาน (Heartbeat)</span>
            <select value={c.heartbeatSec} onChange={e => patch({ heartbeatSec: Number(e.target.value) })}>
              {HEARTBEAT_OPTS.map(h => <option key={h.sec} value={h.sec}>{h.label}</option>)}
            </select>
          </label>
          <label className="ai-switch">
            <input type="checkbox" checked={c.autoHire} onChange={e => patch({ autoHire: e.target.checked })} />
            <span>ให้ CEO จ้างเอเจนต์เองได้</span>
          </label>
          {isSupabaseEnabled && (
            <button className="ai-plan-btn" onClick={runAiPlan} disabled={planning}>
              {planning ? 'CEO กำลังคิด…' : '✦ ให้ CEO วางแผนด้วย Claude'}
            </button>
          )}
          <button className={`ai-run-btn${c.running ? ' running' : ''}`} onClick={toggleRun}>
            <span className="ai-run-dot" />
            {c.running ? 'กำลังทำงาน · กดเพื่อหยุด' : 'เริ่มให้ทีม AI ทำงาน'}
          </button>
        </div>
      </div>
      {planMsg && <div className="ai-plan-msg">{planMsg}</div>}

      <div className="ai-goal-box">
        <div className="ai-goal-lbl">🎯 เป้าหมายหลักที่บอร์ดตั้งไว้</div>
        <textarea className="ai-goal-inp" rows={2} defaultValue={c.goal} key={'g' + c.goal}
          onBlur={e => setCompanyField('goal', e.target.value)}
          onChange={e => autoH(e.target)} ref={el => autoH(el)} spellCheck={false} />
      </div>

      <div className="ai-budget-tip">
        💰 <b>คุมงบ token:</b> รอบ Heartbeat ยิ่งยาวยิ่งประหยัด — แนะนำ “ทุก 10 นาที” ตอนตั้งค่าเริ่มต้น
        แล้วเปลี่ยนเป็น “ทุกชั่วโมง” หรือ “วันละครั้ง” เมื่อใช้งานจริง · ปรับแล้ว<b>บันทึกอัตโนมัติ</b>ทันที ไม่ต้องกด Save
      </div>

      {/* ===== Stat strip ===== */}
      <div className="ai-stats">
        <div className="ai-stat"><div className="ai-stat-num">{c.running ? workingCount : 0}</div><div className="ai-stat-lbl">เอเจนต์ทำงานอยู่</div></div>
        <div className="ai-stat"><div className="ai-stat-num">{c.tasks.filter(t => t.status === 'in_progress').length}</div><div className="ai-stat-lbl">งานกำลังดำเนินการ</div></div>
        <div className="ai-stat"><div className="ai-stat-num">{c.tasks.filter(t => t.status === 'done').length}</div><div className="ai-stat-lbl">งานเสร็จแล้ว</div></div>
        <div className="ai-stat"><div className="ai-stat-num" style={{ color: pendingApprovals ? 'var(--rust)' : undefined }}>{pendingApprovals}</div><div className="ai-stat-lbl">รอบอร์ดอนุมัติ</div></div>
      </div>

      {/* ===== ผังองค์กร ===== */}
      <section className="ai-panel" style={{ marginTop: 16 }}>
        <div className="ai-panel-hd">
          🏢 ผังองค์กร — CEO กำหนดโครงสร้าง
          <button className="ai-mini-add" onClick={() => patch({ agents: [...c.agents, {
            id: 'a-' + Date.now().toString(36), role: 'CEO', name: 'เอเจนต์หลัก',
            avatar: '🤖', color: AGENT_PALETTE[0], mandate: 'กำหนดทิศทางและตัดสินใจสูงสุด',
            model: MODELS[0], status: 'idle', reportsTo: null,
          }] })}>＋ เพิ่ม CEO</button>
        </div>
        <div className="oc-tip">
          คลิกที่ชื่อตำแหน่ง / ชื่อเอเจนต์เพื่อแก้ไข · กด <b>＋</b> เพื่อเพิ่มผู้ใต้บังคับบัญชา · กด <b>×</b> เพื่อลบตำแหน่ง
        </div>
        {c.agents.length === 0 && (
          <div className="ai-feed-empty">ยังไม่มีเอเจนต์ — กด "＋ เพิ่ม CEO" เพื่อเริ่มสร้างโครงสร้าง</div>
        )}
        <div className="oc-tree">
          {/* root nodes = ไม่มีหัวหน้า (reportsTo null/empty) */}
          {c.agents.filter(a => !a.reportsTo).map(root => (
            <OcNode key={root.id} agent={root} agents={c.agents}
              onAdd={hireUnder} onFire={fireAgent}
              onSaveField={(id, field, val) => saveAgent(id, field, val)} />
          ))}
        </div>
      </section>

      <div className="ai-2col">
        {/* ===== ทีมเอเจนต์ ===== */}
        <section className="ai-panel">
          <div className="ai-panel-hd">👥 ทีมเอเจนต์ AI</div>
          <div className="ai-agent-list">
            {c.agents.map(a => (
              <div key={a.id} className="ai-agent" style={{ borderLeftColor: a.color }}>
                <button className="ai-agent-del" onClick={() => fireAgent(a.id)} title="เลิกจ้าง">×</button>
                <div className="ai-agent-top">
                  <div className="ai-agent-av" style={{ background: a.color + '22' }}>{a.avatar}</div>
                  <div className="ai-agent-id">
                    <input className="ai-agent-role" defaultValue={a.role} key={'r' + a.id + a.role}
                      onBlur={e => saveAgent(a.id, 'role', e.target.value)} spellCheck={false} />
                    <input className="ai-agent-name" defaultValue={a.name} key={'nm' + a.id + a.name}
                      onBlur={e => saveAgent(a.id, 'name', e.target.value)} spellCheck={false} />
                  </div>
                  <span className={`ai-badge st-${a.status}${c.running && a.status === 'working' ? ' pulse' : ''}`}>
                    {STATUS_LABEL[a.status]}
                  </span>
                </div>
                <textarea className="ai-agent-mandate" rows={2} defaultValue={a.mandate} key={'m' + a.id + a.mandate}
                  onBlur={e => saveAgent(a.id, 'mandate', e.target.value)}
                  onChange={e => autoH(e.target)} ref={el => autoH(el)} spellCheck={false} />
                <div className="ai-agent-foot">
                  <label>สมอง (LLM)
                    <select value={a.model} onChange={e => saveAgent(a.id, 'model', e.target.value)}>
                      {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </label>
                  <label>รายงานต่อ
                    <select value={a.reportsTo ?? ''} onChange={e => saveAgent(a.id, 'reportsTo', e.target.value)}>
                      <option value="">บอร์ด (คุณ)</option>
                      {c.agents.filter(o => o.id !== a.id).map(o => <option key={o.id} value={o.id}>{o.role}</option>)}
                    </select>
                  </label>
                  <label>สถานะ
                    <select value={a.status} onChange={e => saveAgent(a.id, 'status', e.target.value)}>
                      <option value="working">กำลังทำงาน</option>
                      <option value="idle">ว่าง</option>
                      <option value="waiting">รออนุมัติ</option>
                    </select>
                  </label>
                </div>
              </div>
            ))}
            <button className="ai-hire" onClick={hireAgent}>＋ จ้างเอเจนต์ใหม่</button>
          </div>
        </section>

        {/* ===== ฟีดงานสด ===== */}
        <section className="ai-panel">
          <div className="ai-panel-hd">📡 ฟีดงานสด · Heartbeat ทุก {fmtHeartbeat(c.heartbeatSec)}</div>
          <div className="ai-feed" ref={feedRef}>
            {!c.running && <div className="ai-feed-empty">กด “เริ่มให้ทีม AI ทำงาน” เพื่อดูทีมลงมือทำงานแบบเรียลไทม์</div>}
            {c.running && feed.length === 0 && <div className="ai-feed-empty">กำลังเริ่มต้น…</div>}
            {feed.map(f => (
              <div key={f.id} className="ai-feed-row">
                <span className="ai-feed-time">{f.time}</span>
                <span className="ai-feed-dot" style={{ background: f.color }} />
                <span className="ai-feed-text">{f.text}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ===== บอร์ดอนุมัติ ===== */}
      <section className="ai-panel" style={{ marginTop: 16 }}>
        <div className="ai-panel-hd">🏛️ กล่องอนุมัติของบอร์ด (คุณ)</div>
        <div className="ai-approvals">
          {c.approvals.length === 0 && <div className="ai-feed-empty">ยังไม่มีเรื่องรออนุมัติ</div>}
          {c.approvals.map(ap => (
            <div key={ap.id} className={`ai-approval st-${ap.status}`}>
              <div className="ai-approval-main">
                <div className="ai-approval-title">{ap.title}</div>
                <div className="ai-approval-detail">{ap.detail}</div>
                <div className="ai-approval-meta">
                  <span className="ai-approval-from">เสนอโดย {agentName(ap.agentId)}</span>
                  <span className="ai-approval-impact">{ap.impact}</span>
                </div>
              </div>
              <div className="ai-approval-actions">
                {ap.status === 'pending' ? (
                  <>
                    <button className="ai-btn-approve" onClick={() => decideApproval(ap.id, 'approved')}>อนุมัติ</button>
                    <button className="ai-btn-reject" onClick={() => decideApproval(ap.id, 'rejected')}>ปฏิเสธ</button>
                  </>
                ) : (
                  <span className={`ai-decided ${ap.status}`}>{ap.status === 'approved' ? '✓ อนุมัติแล้ว' : '✕ ปฏิเสธแล้ว'}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== กระดานงาน ===== */}
      <section className="ai-panel" style={{ marginTop: 16 }}>
        <div className="ai-panel-hd">🗂️ กระดานงานของทีม
          <button className="ai-mini-add" onClick={addTask}>＋ เพิ่มงาน</button>
        </div>
        <div className="ai-board">
          {TASK_COLS.map(col => (
            <div key={col.key} className="ai-board-col">
              <div className="ai-board-col-hd" style={{ color: col.color }}>{col.hd}
                <span className="ai-board-count">{c.tasks.filter(t => t.status === col.key).length}</span>
              </div>
              {c.tasks.filter(t => t.status === col.key).map(t => {
                const ag = c.agents.find(a => a.id === t.agentId);
                const isRunning = runningTaskIds.has(t.id);
                return (
                  <div key={t.id} className="ai-task">
                    <button className="ai-task-del" onClick={() => delTask(t.id)}>×</button>
                    <div className="ai-task-title">{t.title}</div>
                    <div className="ai-task-detail">{t.detail}</div>
                    {/* ปุ่มให้ AI ดำเนินงานจริง */}
                    {isSupabaseEnabled && t.status !== 'done' && (
                      <button
                        className={`ai-task-exec${isRunning ? ' running' : ''}`}
                        onClick={() => executeTask(t.id)}
                        disabled={isRunning}
                        style={{ borderLeftColor: ag?.color }}
                      >
                        {isRunning
                          ? <><span className="ai-exec-dot pulse" style={{ background: ag?.color }} />{'กำลังดำเนินงาน…'}</>
                          : <><span style={{ marginRight: 4 }}>{ag?.avatar ?? '🤖'}</span>{`${ag?.role ?? 'AI'} ดำเนินงาน`}</>
                        }
                      </button>
                    )}
                    {/* ผลลัพธ์จาก AI Agent */}
                    {t.output && (
                      <div className="ai-task-output">
                        {t.executedAt && <div className="ai-task-output-meta">{ag?.role} · {t.executedAt}</div>}
                        <div className="ai-task-output-body">{t.output}</div>
                      </div>
                    )}
                    <div className="ai-task-foot">
                      <span className="ai-task-owner" style={{ color: ag?.color }}>{agentName(t.agentId)}</span>
                      <select className="ai-task-move" value={t.status} onChange={e => moveTask(t.id, e.target.value as TaskStatus)}>
                        <option value="queued">ต้องทำ</option>
                        <option value="in_progress">กำลังทำ</option>
                        <option value="review">ตรวจสอบ</option>
                        <option value="done">เสร็จแล้ว</option>
                        <option value="blocked">ถูกบล็อก</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {/* ===== Integrations ===== */}
      <section className="ai-panel" style={{ marginTop: 16 }}>
        <div className="ai-panel-hd">🔌 เชื่อมต่อเครื่องมือภายนอก (API)</div>
        <div className="ai-integrations">
          {c.integrations.map(it => (
            <div key={it.id} className={`ai-integration${it.connected ? ' on' : ''}`}>
              <div className="ai-int-top">
                <span className="ai-int-icon">{it.icon}</span>
                <div className="ai-int-name">{it.name}</div>
                <button className={`ai-int-toggle${it.connected ? ' on' : ''}`} onClick={() => toggleIntegration(it.id)}>
                  {it.connected ? 'เชื่อมแล้ว' : 'เชื่อมต่อ'}
                </button>
              </div>
              <div className="ai-int-desc">{it.desc}</div>
              {it.connected && (
                <input className="ai-int-key" type="password" placeholder="วาง API key ที่นี่"
                  defaultValue={it.apiKey} onBlur={e => setApiKey(it.id, e.target.value)} spellCheck={false} />
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
