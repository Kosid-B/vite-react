import { useState } from 'react';
import type { AppData, BMCData, PageId } from '../types';
import { companyXP, getCompanyLevel, COMPANY_LEVELS, QUESTS, ACHIEVEMENTS, ACTIVITY_XP } from '../lib/gamification';
import DBDSelect from '../components/DBDSelect';
import FirstDealWidget from '../components/FirstDealWidget';
import ExpertEdge from '../components/ExpertEdge';
import WeeklyDigest from '../components/WeeklyDigest';
import SystemOverview from '../components/SystemOverview';

interface Props {
  data: AppData;
  onNavigate: (page: PageId) => void;
  onUpdate: (data: AppData) => void;
  wsId?: string | null;
}

// CEO ร่าง BMC 9 ช่องจากคำอธิบายผลิตภัณฑ์/บริการ + หมวด DBD ที่บอร์ดให้ไว้
function ceoDraftBMC(desc: string, productDbd: string, industry: string, goal: string, vp = ''): BMCData {
  const product = desc.trim().length > 60 ? desc.trim().slice(0, 57) + '…' : desc.trim();
  const ind = productDbd?.trim() || industry?.trim() || 'ธุรกิจของบริษัท';
  const vpLine = vp.trim() ? (vp.trim().length > 70 ? vp.trim().slice(0, 67) + '…' : vp.trim()) : 'แก้ปัญหาลูกค้าได้จริง วัดผลได้ ใช้งานง่าย';
  return {
    value: [
      vpLine,             // Value Proposition ที่บอร์ดกำหนด (customer-first) มาก่อน
      product,
      'คุ้มค่ากว่าทางเลือกเดิมในตลาดไทย',
    ],
    segments: [
      `ลูกค้าหลักในหมวด ${ind}`,
      'SME ไทยที่ต้องการยกระดับด้วยโซลูชันนี้',
      'ลูกค้าองค์กรที่ต้องการบริการครบวงจร',
    ],
    channels: [
      'เว็บไซต์ + Social Media (Facebook / LINE OA)',
      'พาร์ทเนอร์และการแนะนำแบบปากต่อปาก',
      'ทีมขายตรง / กิจกรรมและสัมมนา',
    ],
    relationships: [
      'ดูแลหลังการขายและ Success Review ต่อเนื่อง',
      'คอนเทนต์ให้ความรู้ + Community ลูกค้า',
      'รับ Feedback มาปรับปรุงผลิตภัณฑ์สม่ำเสมอ',
    ],
    activities: [
      `พัฒนาและส่งมอบ: ${product}`,
      'การตลาด การขาย และการสร้างแบรนด์',
      'บริการลูกค้าและควบคุมคุณภาพ',
    ],
    resources: [
      'ทีมงานและความเชี่ยวชาญเฉพาะทาง',
      'เทคโนโลยี / เครื่องมือหลักในการส่งมอบ',
      'แบรนด์ ฐานลูกค้า และข้อมูล',
    ],
    partners: [
      'ซัพพลายเออร์ / ผู้ให้บริการหลัก',
      'พาร์ทเนอร์ช่องทางขายและจัดจำหน่าย',
      'ที่ปรึกษา/ผู้เชี่ยวชาญเฉพาะด้าน',
    ],
    costs: [
      'ต้นทุนพัฒนา/ผลิตและส่งมอบ',
      'การตลาดและการขาย',
      'บุคลากร ระบบ และค่าดำเนินงาน',
    ],
    revenue: [
      `รายได้หลักจากการขาย: ${product}`,
      'บริการเสริม / สัญญาดูแลระยะยาว',
      `รายได้ประจำที่หนุนเป้าหมาย: ${goal?.trim().slice(0, 40) || 'การเติบโตของบริษัท'}…`,
    ],
  };
}

const BMC_BLOCK_LABELS: { key: keyof BMCData; label: string }[] = [
  { key: 'value', label: '💎 คุณค่าที่ส่งมอบ' },
  { key: 'segments', label: '👥 กลุ่มลูกค้า' },
  { key: 'channels', label: '📡 ช่องทาง' },
  { key: 'relationships', label: '🤝 ความสัมพันธ์ลูกค้า' },
  { key: 'activities', label: '⚙️ กิจกรรมหลัก' },
  { key: 'resources', label: '🧱 ทรัพยากรหลัก' },
  { key: 'partners', label: '🔗 พาร์ทเนอร์หลัก' },
  { key: 'costs', label: '💸 โครงสร้างต้นทุน' },
  { key: 'revenue', label: '💰 กระแสรายได้' },
];

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

function exportReport(data: AppData) {
  const { actions, funnel, aiCompany, roadmap, vrio } = data;
  const doneActions = actions.filter(a => a.done).length;
  const firstLeads = funnel[0]?.leads ?? 1;
  const lastLeads = funnel[funnel.length - 1]?.leads ?? 0;
  const overallConv = ((lastLeads / Math.max(firstLeads, 1)) * 100).toFixed(2);

  const agentRows = aiCompany.agents.map(a =>
    `<tr><td>${esc(a.avatar)} ${esc(a.name)}</td><td>${esc(a.role)}</td><td>${esc(a.mandate)}</td><td>${esc(a.status)}</td></tr>`
  ).join('');

  const taskTotal = aiCompany.tasks.length;
  const taskDone = aiCompany.tasks.filter(t => t.status === 'done').length;
  const taskBlocked = aiCompany.tasks.filter(t => t.status === 'blocked').length;
  const taskRows = aiCompany.tasks.slice(0, 10).map(t => {
    const ag = aiCompany.agents.find(a => a.id === t.agentId);
    return `<tr><td>${esc(t.title)}</td><td>${esc(ag?.name ?? '—')}</td><td>${esc(t.status)}</td><td>${t.output ? esc(t.output.slice(0, 120)) + '…' : '—'}</td></tr>`;
  }).join('');

  const roadmapDone = roadmap.filter(r => r.status === 'done').length;
  const roadmapRows = roadmap.map(r =>
    `<tr><td>${esc(r.title)}</td><td>${esc(r.quarter)} ${esc(r.year)}</td><td>${esc(r.status)}</td><td>${esc(r.priority)}</td></tr>`
  ).join('');

  const vrioRows = vrio.map(item =>
    `<tr><td>${esc(item.resource)}</td><td>${item.v ? '✓' : '✗'}</td><td>${item.r ? '✓' : '✗'}</td><td>${item.i ? '✓' : '✗'}</td><td>${item.o ? '✓' : '✗'}</td></tr>`
  ).join('');

  // Business Model Canvas (9 ช่อง) — เพื่อรวมโมเดลธุรกิจในรายงานผู้บริหาร
  const bmc = data.businessModel?.bmc;
  const BMC_ROWS: { key: keyof BMCData; title: string; sub: string }[] = [
    { key: 'segments', title: 'Customer Segments', sub: 'กลุ่มลูกค้า' },
    { key: 'value', title: 'Value Propositions', sub: 'คุณค่าที่นำเสนอ' },
    { key: 'channels', title: 'Channels', sub: 'ช่องทาง' },
    { key: 'relationships', title: 'Customer Relationships', sub: 'ความสัมพันธ์ลูกค้า' },
    { key: 'revenue', title: 'Revenue Streams', sub: 'กระแสรายได้' },
    { key: 'resources', title: 'Key Resources', sub: 'ทรัพยากรหลัก' },
    { key: 'activities', title: 'Key Activities', sub: 'กิจกรรมหลัก' },
    { key: 'partners', title: 'Key Partners', sub: 'พันธมิตรหลัก' },
    { key: 'costs', title: 'Cost Structure', sub: 'โครงสร้างต้นทุน' },
  ];
  const bmcRows = bmc ? BMC_ROWS.map(b => {
    const items = (Array.isArray(bmc[b.key]) ? bmc[b.key] : []).filter(Boolean);
    const body = items.length ? items.map(x => esc(x)).join(' · ') : '<span style="color:#bbb">—</span>';
    return `<tr><td style="white-space:nowrap"><b>${b.title}</b><br><span style="color:#888;font-size:11px">${b.sub}</span></td><td>${body}</td></tr>`;
  }).join('') : '';

  const now = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  // Health Score: weighted average of 4 dimensions (0–100)
  const convScore = Math.min(parseFloat(overallConv) * 2, 100);
  const actionScore = actions.length > 0 ? Math.round((doneActions / actions.length) * 100) : 0;
  const taskScore = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;
  const roadmapScore = roadmap.length > 0 ? Math.round((roadmapDone / roadmap.length) * 100) : 0;
  const healthScore = Math.round((convScore * 0.3 + actionScore * 0.3 + taskScore * 0.2 + roadmapScore * 0.2));
  const healthColor = healthScore >= 70 ? '#166534' : healthScore >= 40 ? '#a05c1a' : '#991b1b';
  const healthLabel = healthScore >= 70 ? 'ดี' : healthScore >= 40 ? 'ปานกลาง' : 'ต้องปรับปรุง';

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>รายงานธุรกิจ — ${esc(aiCompany.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1c1814; background: #faf8f5; margin: 0; padding: 0; }
  /* Cover */
  .cover { background: linear-gradient(135deg,#1a4f8a 0%,#0d3160 100%); color:#fff; padding: 56px 48px 48px; }
  .cover-tag { font-size: 11px; letter-spacing:.15em; text-transform:uppercase; opacity:.7; margin-bottom:16px; }
  .cover-title { font-size: 36px; font-weight: 800; margin-bottom: 6px; }
  .cover-sub { font-size: 16px; opacity:.8; margin-bottom: 32px; }
  .cover-grid { display: flex; gap: 20px; flex-wrap: wrap; }
  .cover-kpi { background: rgba(255,255,255,.12); border-radius: 12px; padding: 18px 22px; min-width: 130px; }
  .cover-kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing:.08em; opacity:.75; margin-bottom: 6px; }
  .cover-kpi-val { font-size: 30px; font-weight: 800; }
  .cover-kpi-sub { font-size: 11px; opacity:.7; margin-top: 4px; }
  .health-badge { display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,.15); border:1.5px solid rgba(255,255,255,.3); border-radius:20px; padding:6px 14px; font-size:13px; font-weight:700; margin-top:24px; }
  /* Body */
  .body { padding: 40px 48px; max-width: 960px; margin: 0 auto; }
  h2 { font-size: 15px; font-weight: 700; color: #1a4f8a; border-bottom: 2px solid #e8dfd2; padding-bottom: 6px; margin: 36px 0 12px; text-transform: uppercase; letter-spacing: .05em; }
  .kpi-grid { display: flex; gap: 14px; flex-wrap: wrap; }
  .kpi { background: #fff; border: 1px solid #e8dfd2; border-radius: 10px; padding: 16px 20px; min-width: 130px; }
  .kpi-label { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: .05em; }
  .kpi-val { font-size: 26px; font-weight: 700; color: #1a4f8a; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e8dfd2; border-radius: 10px; overflow: hidden; margin-top: 12px; }
  th { background: #f0ede8; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; padding: 8px 12px; text-align: left; color: #555; }
  td { padding: 9px 12px; border-bottom: 1px solid #f5f2ee; font-size: 13px; }
  tr:last-child td { border-bottom: none; }
  .footer { margin-top: 56px; padding: 24px 0; border-top: 1px solid #e8dfd2; color: #aaa; font-size: 11px; text-align: center; }
  @media print { .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<!-- Executive Summary Cover -->
<div class="cover">
  <div class="cover-tag">CEO AI Thailand · Business Report</div>
  <div class="cover-title">${esc(aiCompany.name)}</div>
  <div class="cover-sub">${esc(aiCompany.industry || 'Business')} · ${now}</div>
  <div class="cover-grid">
    <div class="cover-kpi">
      <div class="cover-kpi-label">Overall Conversion</div>
      <div class="cover-kpi-val">${overallConv}%</div>
      <div class="cover-kpi-sub">${firstLeads.toLocaleString()} → ${lastLeads} leads</div>
    </div>
    <div class="cover-kpi">
      <div class="cover-kpi-label">Actions Done</div>
      <div class="cover-kpi-val">${doneActions}/${actions.length}</div>
      <div class="cover-kpi-sub">${actionScore}% completed</div>
    </div>
    <div class="cover-kpi">
      <div class="cover-kpi-label">AI Tasks Done</div>
      <div class="cover-kpi-val">${taskDone}/${taskTotal}</div>
      <div class="cover-kpi-sub">${taskBlocked > 0 ? taskBlocked + ' blocked' : 'ทุกงานราบรื่น'}</div>
    </div>
    <div class="cover-kpi">
      <div class="cover-kpi-label">Roadmap Done</div>
      <div class="cover-kpi-val">${roadmapDone}/${roadmap.length}</div>
      <div class="cover-kpi-sub">${roadmapScore}% complete</div>
    </div>
  </div>
  <div class="health-badge" style="color:#fff;">
    <span style="font-size:18px;">●</span>
    Business Health Score: <strong style="font-size:20px;margin:0 4px;">${healthScore}</strong>/100 —
    <span style="color:${healthColor === '#166534' ? '#86efac' : healthColor === '#a05c1a' ? '#fcd34d' : '#fca5a5'}">${healthLabel}</span>
  </div>
  ${aiCompany.mission ? `<div style="margin-top:20px;font-size:13px;opacity:.75;max-width:600px;line-height:1.6;font-style:italic;">"${aiCompany.mission}"</div>` : ''}
</div>

<div class="body">
<h2>ภาพรวม KPI</h2>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-label">Overall Conversion</div><div class="kpi-val">${overallConv}%</div></div>
  <div class="kpi"><div class="kpi-label">Actions Completed</div><div class="kpi-val">${doneActions}/${actions.length}</div></div>
  <div class="kpi"><div class="kpi-label">AI Tasks Done</div><div class="kpi-val">${taskDone}/${taskTotal}</div></div>
  <div class="kpi"><div class="kpi-label">Roadmap Done</div><div class="kpi-val">${roadmapDone}/${roadmap.length}</div></div>
  <div class="kpi"><div class="kpi-label">Leads (เริ่ม→จบ)</div><div class="kpi-val">${firstLeads}→${lastLeads}</div></div>
</div>

${bmcRows ? `<h2>Business Model Canvas</h2>
<table>
  <tr><th>ช่อง (Block)</th><th>รายการ</th></tr>
  ${bmcRows}
</table>` : ''}

<h2>AI Company — Agents (${aiCompany.agents.length} คน)</h2>
<div style="color:#555;font-size:13px;margin-bottom:8px;">${esc(aiCompany.mission || '')}</div>
<table>
  <tr><th>ชื่อ</th><th>บทบาท</th><th>พันธกิจ</th><th>สถานะ</th></tr>
  ${agentRows}
</table>

<h2>งานที่มอบหมาย — AI Tasks (ล่าสุด 10 รายการ)</h2>
<table>
  <tr><th>งาน</th><th>ผู้รับผิดชอบ</th><th>สถานะ</th><th>ผลลัพธ์</th></tr>
  ${taskRows || '<tr><td colspan="4" style="color:#aaa">ยังไม่มีงาน</td></tr>'}
</table>

<h2>Product Roadmap</h2>
<table>
  <tr><th>Item</th><th>ช่วงเวลา</th><th>สถานะ</th><th>ความสำคัญ</th></tr>
  ${roadmapRows || '<tr><td colspan="4" style="color:#aaa">ยังไม่มีรายการ</td></tr>'}
</table>

${vrioRows ? `<h2>VRIO Analysis</h2>
<table>
  <tr><th>ทรัพยากร</th><th>มีคุณค่า</th><th>หายาก</th><th>เลียนแบบยาก</th><th>องค์กรพร้อม</th></tr>
  ${vrioRows}
</table>` : ''}

<div class="footer">สร้างโดย CEO AI Thailand · ${now}</div>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `business-report-${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard({ data, onNavigate, onUpdate, wsId = null }: Props) {
  const { stages, actions, funnel, contentPlan, aiCompany, roadmap } = data;
  const [openBadge, setOpenBadge] = useState<string | null>(null);
  const [bmcApprovedMsg, setBmcApprovedMsg] = useState(false);

  /* ----- บอร์ดอธิบายผลิตภัณฑ์/บริการ → CEO ร่าง BMC → บอร์ดอนุมัติ ----- */
  const saveCompany = (patch: Partial<typeof aiCompany>) =>
    onUpdate({ ...data, aiCompany: { ...aiCompany, ...patch } });
  const proposeBMC = () => {
    setBmcApprovedMsg(false);
    const bmc = ceoDraftBMC(aiCompany.productDesc ?? '', aiCompany.productDbd ?? '', aiCompany.industry, aiCompany.goal, aiCompany.productVp ?? '');
    saveCompany({
      bmcDraft: {
        bmc,
        note: `CEO ร่างจากคำอธิบายผลิตภัณฑ์/บริการของบอร์ด · หมวด DBD: ${aiCompany.productDbd || 'ยังไม่ระบุ'}`,
        proposedAt: new Date().toISOString().slice(0, 10),
      },
    });
  };
  const approveBMC = () => {
    if (!aiCompany.bmcDraft) return;
    onUpdate({
      ...data,
      businessModel: { ...data.businessModel, bmc: aiCompany.bmcDraft.bmc },
      aiCompany: { ...aiCompany, bmcDraft: undefined },
    });
    setBmcApprovedMsg(true);
  };
  const rejectBMC = () => saveCompany({ bmcDraft: undefined });

  const doneActions = actions.filter(a => a.done).length;
  const actionPct = actions.length > 0 ? Math.round((doneActions / actions.length) * 100) : 0;
  const pendingP1 = actions.filter(a => !a.done && a.priority === 1).length;

  const totalPain = stages.reduce((s, st) => s + st.pain.length, 0);
  const totalOpp = stages.reduce((s, st) => s + st.opp.length, 0);

  const firstLeads = funnel[0]?.leads ?? 1;
  const lastLeads = funnel[funnel.length - 1]?.leads ?? 0;
  const overallConv = ((lastLeads / Math.max(firstLeads, 1)) * 100).toFixed(2);

  let worstDrop = 0, worstIdx = 0;
  funnel.forEach((f, i) => {
    if (i >= funnel.length - 1) return;
    const d = 1 - ((funnel[i + 1]?.leads ?? 0) / Math.max(f.leads, 1));
    if (d > worstDrop) { worstDrop = d; worstIdx = i; }
  });

  const byPriority = [1, 2, 3].map(p => {
    const list = actions.filter(a => a.priority === p);
    return { p, total: list.length, done: list.filter(a => a.done).length };
  });
  const pColors = ['#c44b2b', '#a05c1a', '#4a453e'];
  const pBgs = ['#fdf3f0', '#fdf6ec', '#f5f0e8'];

  // AI Company stats
  const agentWorking = aiCompany.agents.filter(a => a.status === 'working').length;
  const agentIdle = aiCompany.agents.filter(a => a.status === 'idle').length;
  const taskQueued = aiCompany.tasks.filter(t => t.status === 'queued').length;
  const taskInProgress = aiCompany.tasks.filter(t => t.status === 'in_progress').length;
  const taskDone = aiCompany.tasks.filter(t => t.status === 'done').length;
  const taskBlocked = aiCompany.tasks.filter(t => t.status === 'blocked').length;
  const blockedTasks = aiCompany.tasks.filter(t => t.status === 'blocked');
  const pendingApproval = aiCompany.tasks.filter(t => t.status === 'queued' && t.requiresApproval).length;
  const recentDoneTasks = aiCompany.tasks.filter(t => t.status === 'done' && t.output).slice(0, 3);

  // Roadmap stats
  const roadmapDone = roadmap.filter(r => r.status === 'done').length;
  const roadmapInProgress = roadmap.filter(r => r.status === 'in_progress').length;
  const roadmapPlanned = roadmap.filter(r => r.status === 'planned').length;
  const roadmapPct = roadmap.length > 0 ? Math.round((roadmapDone / roadmap.length) * 100) : 0;

  // Gamification: ระดับบริษัท + Setup Quest + Badges
  const xp = companyXP(data);
  const level = getCompanyLevel(xp);
  const nextLevel = COMPANY_LEVELS.find(l => l.min > xp);
  const xpPct = nextLevel
    ? Math.round(((xp - level.min) / (nextLevel.min - level.min)) * 100)
    : 100;
  const questsDone = QUESTS.filter(q => q.done(data)).length;
  const earnedBadges = ACHIEVEMENTS.filter(a => a.earned(data));

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-meta">
          <span className="meta-chip">ภาพรวมทั้งหมด</span>
          <span className="meta-chip">{stages.length} Stages</span>
          <span className="meta-chip">{data.personas.length} Personas</span>
          <span className="meta-chip">{contentPlan.length} เดือน Content</span>
          <button className="db-export-btn" onClick={() => exportReport(data)}
            title="ดาวน์โหลดรายงานผู้บริหาร (รวม BMC + งานที่มอบหมาย) — เปิดไฟล์แล้วสั่งพิมพ์ → บันทึกเป็น PDF ได้">
            🖨️ รายงานผู้บริหาร (PDF)
          </button>
        </div>
      </div>

      {/* ===== ภาพรวมทุกระบบในภาพเดียว ===== */}
      <SystemOverview data={data} onNavigate={onNavigate} />

      {/* ===== สรุปสัปดาห์นี้ (retention) ===== */}
      <WeeklyDigest data={data} onNavigate={onNavigate} />

      {/* ===== First Revenue Engine: ภารกิจดีลแรกใน 30 วัน (แก้ churn) ===== */}
      <ExpertEdge compact onNavigate={onNavigate} />

      <FirstDealWidget data={data} wsId={wsId} onNavigate={onNavigate} />

      {/* ===== Gamification: ระดับบริษัท + Setup Quest + Badges ===== */}
      {data.proMode ? (
        <button className="gm-restore" onClick={() => onUpdate({ ...data, proMode: false })}>
          🎮 โหมดเกมถูกซ่อน (โหมดโปร) — แตะเพื่อแสดง Quest / เลเวล / รางวัล
        </button>
      ) : (
      <div className="gm-panel">
        <div className="gm-level-row">
          <div className="gm-level-badge" style={{ background: level.color }}>{level.badge} {level.rank}</div>
          <div className="gm-xp-wrap">
            <div className="gm-xp-track"><div className="gm-xp-fill" style={{ width: xpPct + '%', background: level.color }} /></div>
            <div className="gm-xp-text">
              {xp.toLocaleString()} XP
              {nextLevel && <span> · อีก {(nextLevel.min - xp).toLocaleString()} XP → {nextLevel.badge} {nextLevel.rank}</span>}
            </div>
          </div>
          <div className="gm-quest-count">
            🎯 Quest {questsDone}/{QUESTS.length}
            <span className="gm-quest-bonus">+{ACTIVITY_XP.questBonus} XP/ข้อ</span>
          </div>
          <button className="gm-pro-toggle" title="ซ่อนองค์ประกอบเกม (สำหรับผู้ใช้ที่ต้องการโฟกัสข้อมูล)"
            onClick={() => onUpdate({ ...data, proMode: true })}>โหมดโปร ✕</button>
        </div>

        {questsDone < QUESTS.length && (
          <div className="gm-quest-hint">
            🧭 ดูขั้นตอนถัดไปทั้งหมดได้ที่ <strong>ตัวช่วยนำทาง</strong> (ปุ่ม 🧭 มุมซ้ายล่าง) — บอกทีละขั้นว่าต้องทำอะไรต่อ
          </div>
        )}

        <div className="gm-badge-row">
          <span className="gm-badge-lbl">🏅 Badges ({earnedBadges.length}/{ACHIEVEMENTS.length}):</span>
          {ACHIEVEMENTS.map(a => {
            const earned = a.earned(data);
            return (
              <button key={a.id} className={`gm-badge${earned ? '' : ' locked'}${openBadge === a.id ? ' open' : ''}`}
                onClick={() => setOpenBadge(openBadge === a.id ? null : a.id)}
                title={`${a.label} — แตะเพื่อดูรายละเอียด`}>
                {a.icon} {a.label}
              </button>
            );
          })}
        </div>

        {openBadge && (() => {
          const a = ACHIEVEMENTS.find(x => x.id === openBadge);
          if (!a) return null;
          const earned = a.earned(data);
          const { cur, target } = a.progress(data);
          const pct = Math.round((cur / target) * 100);
          return (
            <div className="gm-badge-detail">
              <span className="gm-badge-detail-ico">{a.icon}</span>
              <div className="gm-badge-detail-body">
                <div className="gm-badge-detail-name">
                  {a.label}
                  {earned
                    ? <span className="gm-badge-detail-earned">✓ ได้รับแล้ว</span>
                    : <span className="gm-badge-detail-locked">ยังไม่ได้รับ · {cur}/{target}</span>}
                </div>
                <div className="gm-badge-detail-desc">{a.desc}</div>
                {!earned && (
                  <div className="gm-badge-detail-track">
                    <div className="gm-badge-detail-fill" style={{ width: pct + '%' }} />
                  </div>
                )}
              </div>
              <button className="gm-badge-detail-close" onClick={() => setOpenBadge(null)} aria-label="ปิด">×</button>
            </div>
          );
        })()}
      </div>
      )}

      {/* ===== ผลิตภัณฑ์/บริการ → CEO ร่าง BMC → บอร์ดอนุมัติ ===== */}
      <div className="gm-panel bmc-prop" id="bmc-idea">
        <div className="bmc-prop-hd">🧩 ผลิตภัณฑ์ / บริการของบริษัท → ให้ CEO ทำ BMC เสนอบอร์ด</div>
        <div className="bmc-prop-sub">
          บอร์ด (คุณ) อธิบายผลิตภัณฑ์/บริการ และจัดหมวดตาม DBD (ใช้จัดกลุ่มใน Marketplace และงานการตลาด)
          จากนั้น CEO จะร่าง Business Model Canvas เสนอกลับมาให้บอร์ดอนุมัติ
        </div>
        <div className="bmc-step-lbl">💡 ขั้น 1 · ไอเดีย / สินค้าของคุณ</div>
        <textarea className="bmc-prop-desc bmc-idea-lg" rows={5}
          placeholder="เล่าไอเดียของคุณแบบเต็มที่ — ทำอะไร ขายใคร แก้ปัญหาอะไร เช่น 'แพลตฟอร์ม SaaS สร้างบริษัท AI อัตโนมัติสำหรับ SME ไทย ที่ช่วยลดต้นทุนที่ปรึกษาและทำงานเอกสารมาตรฐานให้เร็วขึ้น'…"
          defaultValue={aiCompany.productDesc ?? ''} key={'pd' + (aiCompany.productDesc ?? '')}
          onBlur={e => saveCompany({ productDesc: e.target.value })} spellCheck={false} />

        <div className="bmc-step-lbl">
          🎯 ขั้น 2 · Value Proposition (คุณค่าหลัก) — <b>ทำก่อน BMC</b>
        </div>
        <div className="bmc-vp-hint">
          ตามหลัก MIT: กำหนด "คุณค่า" จากลูกค้าก่อนออกแบบโมเดลธุรกิจ — ลูกค้าได้อะไร? ลด Pain ไหน? เพิ่ม Gain อะไร?
          {onNavigate && <button className="db-link" onClick={() => onNavigate('personas')}>ดู Pain/Gain ของ Persona →</button>}
        </div>
        <textarea className="bmc-prop-desc bmc-vp-inp" rows={3}
          placeholder="คุณค่าหลัก 1 ประโยค เช่น 'ช่วย SME ไทยได้ทีมทำงานมาตรฐาน ISO/เอกสารครบใน 3 วินาที ลดค่าที่ปรึกษาหลักแสน (ลด Pain ต้นทุน+เวลา / เพิ่ม Gain ความเร็ว+ความมั่นใจ)'"
          defaultValue={aiCompany.productVp ?? ''} key={'vp' + (aiCompany.productVp ?? '')}
          onBlur={e => saveCompany({ productVp: e.target.value })} spellCheck={false} />

        <div className="bmc-prop-row">
          <span className="bmc-prop-lbl">หมวดผลิตภัณฑ์/บริการ (DBD)</span>
          <DBDSelect className="bmc-prop-dbd" value={aiCompany.productDbd ?? ''}
            onChange={v => saveCompany({ productDbd: v })} />
          <button className="bmc-prop-btn" onClick={proposeBMC}
            disabled={!(aiCompany.productDesc ?? '').trim() || !(aiCompany.productVp ?? '').trim()}
            title={
              !(aiCompany.productDesc ?? '').trim() ? 'กรอกไอเดีย/สินค้า (ขั้น 1) ก่อน'
              : !(aiCompany.productVp ?? '').trim() ? 'กรอก Value Proposition (ขั้น 2) ก่อนทำ BMC'
              : 'CEO ร่าง BMC จากไอเดีย + Value Proposition ด้านบน'}>
            ✦ ขั้น 3 · ให้ CEO ร่าง BMC เสนอบอร์ด
          </button>
        </div>

        {bmcApprovedMsg && (
          <div className="bmc-prop-approved">
            ✅ บอร์ดอนุมัติ BMC แล้ว — บันทึกลงหน้า Business Model เรียบร้อย
            <button className="db-link" onClick={() => onNavigate('bmc')}>ดู Business Model · MIT24 →</button>
          </div>
        )}

        {aiCompany.bmcDraft && (
          <div className="bmc-prop-draft">
            <div className="bmc-prop-note">🧠 {aiCompany.bmcDraft.note} — <b>รอบอร์ดอนุมัติ</b></div>
            <div className="bmc-prop-grid">
              {BMC_BLOCK_LABELS.map(b => (
                <div key={b.key} className="bmc-prop-block">
                  <div className="bmc-prop-block-hd">{b.label}</div>
                  <ul>
                    {aiCompany.bmcDraft!.bmc[b.key].map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            <div className="bmc-prop-actions">
              <button className="bmc-prop-approve" onClick={approveBMC}>✅ บอร์ดอนุมัติ — บันทึกลง Business Model</button>
              <button className="bmc-prop-redo" onClick={proposeBMC}>🔁 ให้ CEO ร่างใหม่</button>
              <button className="bmc-prop-reject" onClick={rejectBMC}>✕ ปฏิเสธ</button>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="db-cards">
        <div className="db-card">
          <div className="db-card-label">Overall Conversion</div>
          <div className="db-card-value">{overallConv}%</div>
          <div className="db-card-sub">{firstLeads.toLocaleString()} → {lastLeads} leads/เดือน</div>
        </div>
        <div className="db-card">
          <div className="db-card-label">Actions Completed</div>
          <div className="db-card-value">{actionPct}%</div>
          <div className="db-card-sub">{doneActions} / {actions.length} รายการ</div>
        </div>
        <div className="db-card">
          <div className="db-card-label">Pain Points ทั้งหมด</div>
          <div className="db-card-value" style={{ color: 'var(--rust)' }}>{totalPain}</div>
          <div className="db-card-sub">ใน {stages.length} stages</div>
        </div>
        <div className="db-card">
          <div className="db-card-label">Opportunities</div>
          <div className="db-card-value" style={{ color: 'var(--green)' }}>{totalOpp}</div>
          <div className="db-card-sub">รอดำเนินการ</div>
        </div>
        <div className="db-card db-card-warn">
          <div className="db-card-label">Bottleneck Stage</div>
          <div className="db-card-value db-card-sm">{stages[worstIdx]?.label}</div>
          <div className="db-card-sub">Drop {Math.round(worstDrop * 100)}% ที่ขั้นนี้</div>
        </div>
        <div className="db-card">
          <div className="db-card-label">P1 Actions Pending</div>
          <div className="db-card-value" style={{ color: pendingP1 > 0 ? '#c44b2b' : '#2d6a4f' }}>{pendingP1}</div>
          <div className="db-card-sub">สำคัญที่สุด — ยังไม่เสร็จ</div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="db-row2">
        <div className="db-panel">
          <div className="db-panel-hd">Conversion Funnel — ภาพรวม</div>
          <div className="db-funnel">
            {funnel.map((f, i) => {
              const pct = (f.leads / Math.max(firstLeads, 1)) * 100;
              const isWorst = i === worstIdx;
              return (
                <div key={f.stageId} className={`db-f-row${isWorst ? ' db-f-worst' : ''}`}>
                  <div className="db-f-name">{stages[i]?.label ?? `S${i + 1}`}</div>
                  <div className="db-f-bar-wrap">
                    <div className="db-f-bar" style={{ width: `${pct}%`, background: isWorst ? 'var(--rust)' : 'var(--blue)' }} />
                  </div>
                  <div className="db-f-val">{f.leads.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
          <button className="db-link" onClick={() => onNavigate('funnel')}>ดู Funnel Analysis →</button>
        </div>

        <div className="db-panel">
          <div className="db-panel-hd">Priority Actions — สถานะ</div>
          <div className="db-action-list">
            {byPriority.map(row => {
              const pct = row.total > 0 ? (row.done / row.total) * 100 : 0;
              const c = pColors[row.p - 1];
              const bg = pBgs[row.p - 1];
              return (
                <div key={row.p} className="db-a-row" style={{ borderLeft: `3px solid ${c}`, background: bg }}>
                  <div className="db-a-label" style={{ color: c }}>Priority {row.p}</div>
                  <div className="db-a-bar-wrap">
                    <div className="db-a-bar" style={{ width: `${pct}%`, background: c }} />
                  </div>
                  <div className="db-a-count">{row.done}<span>/{row.total}</span></div>
                </div>
              );
            })}
            <div style={{ marginTop: 14 }}>
              <div className="db-a-pending-title">Priority 1 ที่ยังค้าง</div>
              {actions.filter(a => !a.done && a.priority === 1).slice(0, 3).map((a, i) => (
                <div key={i} className="db-a-pending-item">
                  <span className="db-a-pending-dot" />{a.title}
                </div>
              ))}
            </div>
          </div>
          <button className="db-link" onClick={() => onNavigate('actions')}>ดู Priority Actions →</button>
        </div>
      </div>

      {/* AI Company Command Center */}
      <div className="db-row2" style={{ marginTop: 14 }}>
        <div className="db-panel">
          <div className="db-panel-hd" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            AI Company — {aiCompany.name}
            {aiCompany.running && (
              <span className="db-ai-running-badge">● กำลังทำงาน</span>
            )}
          </div>
          <div className="db-ai-stats">
            <div className="db-ai-stat">
              <div className="db-ai-stat-val" style={{ color: '#22c55e' }}>{agentWorking}</div>
              <div className="db-ai-stat-lbl">Working</div>
            </div>
            <div className="db-ai-stat">
              <div className="db-ai-stat-val" style={{ color: '#94a3b8' }}>{agentIdle}</div>
              <div className="db-ai-stat-lbl">Idle</div>
            </div>
            <div className="db-ai-stat">
              <div className="db-ai-stat-val" style={{ color: '#f59e0b' }}>{taskQueued}</div>
              <div className="db-ai-stat-lbl">Queued</div>
            </div>
            <div className="db-ai-stat">
              <div className="db-ai-stat-val" style={{ color: 'var(--blue)' }}>{taskInProgress}</div>
              <div className="db-ai-stat-lbl">In Progress</div>
            </div>
            <div className="db-ai-stat">
              <div className="db-ai-stat-val" style={{ color: 'var(--green)' }}>{taskDone}</div>
              <div className="db-ai-stat-lbl">Done</div>
            </div>
            {taskBlocked > 0 && (
              <div className="db-ai-stat">
                <div className="db-ai-stat-val" style={{ color: 'var(--rust)' }}>{taskBlocked}</div>
                <div className="db-ai-stat-lbl">Blocked</div>
              </div>
            )}
            {pendingApproval > 0 && (
              <div className="db-ai-stat">
                <div className="db-ai-stat-val" style={{ color: '#7c3aed' }}>{pendingApproval}</div>
                <div className="db-ai-stat-lbl">รออนุมัติ</div>
              </div>
            )}
          </div>

          {/* System Alerts */}
          {blockedTasks.length > 0 && (
            <div className="db-alert-box">
              <div className="db-alert-title">⚠ System Alerts — งานที่ถูกบล็อก</div>
              {blockedTasks.slice(0, 3).map(t => {
                const ag = aiCompany.agents.find(a => a.id === t.agentId);
                return (
                  <div key={t.id} className="db-alert-row">
                    <span className="db-alert-avatar">{ag?.avatar ?? '🤖'}</span>
                    <div className="db-alert-body">
                      <div className="db-alert-task">{t.title}</div>
                      <div className="db-alert-err">{t.output?.slice(0, 120)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {recentDoneTasks.length > 0 && (
            <div className="db-ai-recent">
              <div className="db-ai-recent-title">งานที่เสร็จล่าสุด</div>
              {recentDoneTasks.map(t => {
                const ag = aiCompany.agents.find(a => a.id === t.agentId);
                return (
                  <div key={t.id} className="db-ai-task-item">
                    <span className="db-ai-task-avatar">{ag?.avatar ?? '🤖'}</span>
                    <div className="db-ai-task-body">
                      <div className="db-ai-task-title">{t.title}</div>
                      <div className="db-ai-task-output">{t.output?.slice(0, 100)}{(t.output?.length ?? 0) > 100 ? '…' : ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button className="db-link" onClick={() => onNavigate('aicompany')}>ดู AI Company →</button>
        </div>

        <div className="db-panel">
          <div className="db-panel-hd">Product Roadmap — ความคืบหน้า</div>
          {roadmap.length > 0 ? (
            <>
              <div className="db-roadmap-bar-wrap">
                <div className="db-roadmap-bar" style={{ width: `${roadmapPct}%` }} />
              </div>
              <div className="db-roadmap-pct">{roadmapPct}% เสร็จแล้ว</div>
              <div className="db-ai-stats" style={{ marginTop: 12 }}>
                <div className="db-ai-stat">
                  <div className="db-ai-stat-val" style={{ color: 'var(--green)' }}>{roadmapDone}</div>
                  <div className="db-ai-stat-lbl">Done</div>
                </div>
                <div className="db-ai-stat">
                  <div className="db-ai-stat-val" style={{ color: 'var(--blue)' }}>{roadmapInProgress}</div>
                  <div className="db-ai-stat-lbl">In Progress</div>
                </div>
                <div className="db-ai-stat">
                  <div className="db-ai-stat-val" style={{ color: '#94a3b8' }}>{roadmapPlanned}</div>
                  <div className="db-ai-stat-lbl">Planned</div>
                </div>
              </div>
              <div className="db-ai-recent" style={{ marginTop: 12 }}>
                {roadmap.filter(r => r.status === 'in_progress').slice(0, 3).map(r => (
                  <div key={r.id} className="db-ai-task-item">
                    <span className="db-roadmap-dot" />
                    <div className="db-ai-task-body">
                      <div className="db-ai-task-title">{r.title}</div>
                      <div className="db-ai-task-output">{r.quarter} {r.year} · {r.priority}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--ink3)', fontSize: 13, padding: '12px 0' }}>ยังไม่มีรายการ Roadmap</div>
          )}
          <button className="db-link" onClick={() => onNavigate('roadmap')}>ดู Roadmap →</button>
        </div>
      </div>

      {/* Journey Health Matrix */}
      <div className="db-panel" style={{ marginTop: 14 }}>
        <div className="db-panel-hd">Journey Health Matrix — จำนวนรายการต่อ Stage</div>
        <div className="db-matrix">
          <div className="db-mx-head">
            <div className="db-mx-stage-col">Stage</div>
            {['Touchpoints', 'Actions', 'Pain Points', 'Opportunities'].map(h => (
              <div key={h} className="db-mx-col-h">{h}</div>
            ))}
          </div>
          {stages.map((s, i) => {
            const counts = [s.touch.length, s.action.length, s.pain.length, s.opp.length];
            const cols = ['var(--blue)', 'var(--ink)', 'var(--rust)', 'var(--green)'];
            return (
              <div key={s.id} className="db-mx-row">
                <div className="db-mx-stage"><span className="db-mx-num">{i + 1}</span>{s.label}</div>
                {counts.map((count, ci) => (
                  <div key={ci} className={`db-mx-cell${ci === 2 && count >= 3 ? ' db-mx-warn' : ''}${count === 0 ? ' db-mx-empty' : ''}`}>
                    {count > 0
                      ? <span className="db-mx-count" style={{ color: cols[ci] }}>{count}</span>
                      : <span className="db-mx-dash">—</span>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 4 */}
      <div className="db-row2" style={{ marginTop: 14 }}>
        <div className="db-panel db-panel-cta">
          <div className="db-panel-hd">ROI / Impact Calculator</div>
          <div className="db-cta-desc">คำนวณว่าการแก้ปัญหา Stage ไหนให้ ROI สูงสุด — เชื่อมกับ Conversion Funnel อัตโนมัติ</div>
          <div className="db-cta-stats">
            <div className="db-cta-stat">
              <div className="db-cta-stat-val">{Math.round(worstDrop * 100)}%</div>
              <div className="db-cta-stat-lbl">Drop-off ที่ Bottleneck</div>
            </div>
            <div className="db-cta-stat">
              <div className="db-cta-stat-val">{lastLeads}</div>
              <div className="db-cta-stat-lbl">Closed leads/เดือน</div>
            </div>
            <div className="db-cta-stat">
              <div className="db-cta-stat-val">{totalOpp}</div>
              <div className="db-cta-stat-lbl">โอกาสรอดำเนินการ</div>
            </div>
          </div>
          <button className="db-cta-btn" onClick={() => onNavigate('roi')}>คำนวณ ROI →</button>
        </div>

        <div className="db-panel">
          <div className="db-panel-hd">Content Plan — สรุป</div>
          {contentPlan.map((month, mi) => (
            <div key={mi} className="db-cp-month">
              <div className="db-cp-label">{month.label}</div>
              <div className="db-cp-goal">{month.goal.slice(0, 90)}{month.goal.length > 90 ? '…' : ''}</div>
              <div className="db-cp-cols">
                {month.cols.map((col, ci) => (
                  <div key={ci} className="db-cp-chip" style={{ borderColor: col.color, color: col.color }}>
                    {col.items.length} รายการ
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button className="db-link" onClick={() => onNavigate('content')}>ดู Content Plan →</button>
        </div>
      </div>

      {/* Featured Insight — ยุบได้ (progressive disclosure) ลดความรกบนหน้าแรกสำหรับมือใหม่ */}
      <details className="db-insight-details" style={{ marginTop: 14 }}>
        <summary className="db-insight-summary">✦ บทเรียนธุรกิจวันนี้ · Case Study (แตะเพื่อดู)</summary>
        <div className="db-insight">
        <div className="db-insight-grid">
          <div className="db-insight-card db-insight-tencent">
            <div className="db-insight-tag">Case Study · Tencent</div>
            <div className="db-insight-title">ไม่ต้องสร้างจากศูนย์ — ใช้เงินซื้อผู้ชนะ</div>
            <div className="db-insight-body">
              Tencent ครองวงการเกมโลกโดยไม่ได้เขียนเกมเองทั้งหมด — แต่ซื้อหุ้น Riot, Epic, Supercell แล้วเชื่อมระบบเติมเงินกับฐานผู้ใช้ QQ ที่มีอยู่แล้ว บทเรียน: หา "เพชรในตม" แล้วงัดมูลค่าด้วยทรัพยากรที่มีอยู่
            </div>
            <button className="db-link" onClick={() => onNavigate('cases')}>อ่าน Case Study →</button>
          </div>
          <div className="db-insight-card db-insight-ai">
            <div className="db-insight-tag">AI Strategy · Paperclip</div>
            <div className="db-insight-title">สร้าง SaaS ด้วย Mission Prompt — AI ทำงาน 24/7</div>
            <div className="db-insight-body">
              เขียนเป้าหมายให้ชัด AI จะเป็น CEO สั่งการทีม AI ด้วยกันเอง ตัวอย่าง: "สรุปข่าว SET ส่งอีเมลหลังตลาดปิดทุกวัน" — ไม่ต้องเขียนโค้ดทั้งหมดเอง
            </div>
            <button className="db-link" onClick={() => onNavigate('cases')}>ดูตัวอย่าง Mission Prompts →</button>
          </div>
        </div>
        </div>
      </details>
    </div>
  );
}
