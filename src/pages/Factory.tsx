import { useState } from 'react';
import type { AppData, FactoryData, FactoryMachine, WorkOrder, MachineStatus, WorkOrderStatus, KaizenItem } from '../types';

interface Props { data: AppData; onUpdate: (d: AppData) => void; }

const DEFAULT_FACTORY = (): FactoryData => ({
  name: 'โรงงานของฉัน', type: 'อุตสาหกรรมการผลิต', location: '', capacityPerDay: 500, shifts: 2,
  kpi: { targetOEE: 85, targetDefectRate: 2, targetOnTimeDelivery: 95 }, taktDemand: 400,
  machines: [], workOrders: [],
  mudaLog: [
    { type: 'การผลิตเกิน', typeEn: 'Overproduction', description: 'ผลิตมากกว่าที่ลูกค้าต้องการ', fix: 'ใช้ Pull System / Kanban', level: 'low', note: '' },
    { type: 'การรอคอย', typeEn: 'Waiting', description: 'เครื่องจักรหรือคนงานรอวัตถุดิบ', fix: 'ลด Setup Time, Balance Line', level: 'low', note: '' },
    { type: 'การขนส่ง', typeEn: 'Transportation', description: 'ขนชิ้นงานโดยไม่เพิ่มมูลค่า', fix: 'Cellular Layout', level: 'low', note: '' },
    { type: 'กระบวนการเกิน', typeEn: 'Over-processing', description: 'ขั้นตอนที่ไม่เพิ่มมูลค่า', fix: 'Value Stream Mapping', level: 'low', note: '' },
    { type: 'สินค้าคงคลังส่วนเกิน', typeEn: 'Inventory', description: 'วัตถุดิบ/WIP/สินค้าสะสมเกินจำเป็น', fix: 'JIT, ลด Batch Size', level: 'low', note: '' },
    { type: 'การเคลื่อนไหว', typeEn: 'Motion', description: 'คนงานเดิน/หยิบ/วางโดยไม่จำเป็น', fix: '5S, ปรับ Ergonomics', level: 'low', note: '' },
    { type: 'ของเสีย/แก้ไข', typeEn: 'Defects', description: 'ของเสีย การรื้อทำใหม่', fix: 'Poka-Yoke, SPC', level: 'low', note: '' },
  ],
  fiveS: [
    { id: 'S1a', s: 1, text: 'แยกของจำเป็น/ไม่จำเป็นออกจากกัน', checked: false },
    { id: 'S1b', s: 1, text: 'ติดป้ายแดง (Red Tag) สิ่งของที่ไม่ใช้', checked: false },
    { id: 'S1c', s: 1, text: 'กำจัดของที่ไม่จำเป็นออกจากพื้นที่', checked: false },
    { id: 'S2a', s: 2, text: 'กำหนดที่วางทุกสิ่งชัดเจน', checked: false },
    { id: 'S2b', s: 2, text: 'ติดป้ายชื่อ/เส้นแบ่งพื้นที่ทุกจุด', checked: false },
    { id: 'S2c', s: 2, text: 'จัดให้หยิบง่าย ลดเวลาหาของ', checked: false },
    { id: 'S3a', s: 3, text: 'ทำความสะอาดเครื่องจักรและพื้นที่ทุกวัน', checked: false },
    { id: 'S3b', s: 3, text: 'ตรวจหาต้นเหตุสิ่งสกปรกและแก้ที่ต้นเหตุ', checked: false },
    { id: 'S3c', s: 3, text: 'ทำ Inspection Checklist ควบคู่ทำความสะอาด', checked: false },
    { id: 'S4a', s: 4, text: 'สร้าง Visual Standard สำหรับ 3S แรก', checked: false },
    { id: 'S4b', s: 4, text: 'ฝึกอบรมพนักงานให้รู้ Standard ทุกคน', checked: false },
    { id: 'S4c', s: 4, text: 'ทำ Checklist และตารางรับผิดชอบรายวัน', checked: false },
    { id: 'S5a', s: 5, text: 'Audit 5S รายสัปดาห์และให้คะแนน', checked: false },
    { id: 'S5b', s: 5, text: 'ผู้บริหารเดิน Gemba Walk ≥1 ครั้ง/สัปดาห์', checked: false },
    { id: 'S5c', s: 5, text: 'มีระบบ Reward สำหรับทีมที่รักษา 5S ได้ดี', checked: false },
  ],
  kaizen: [],
});

const MACHINE_STATUS_LABEL: Record<MachineStatus, string> = { running: '🟢 Running', idle: '🟡 Idle', maintenance: '🔧 Maintenance', breakdown: '🔴 Breakdown' };
const MACHINE_STATUS_COLOR: Record<MachineStatus, string> = { running: '#22c55e', idle: '#f59e0b', maintenance: '#3b82f6', breakdown: '#ef4444' };
const MACHINE_STATUS_CYCLE: MachineStatus[] = ['running', 'idle', 'maintenance', 'breakdown'];
const WO_COLS: { key: WorkOrderStatus; hd: string; color: string }[] = [
  { key: 'planned', hd: '📋 วางแผน', color: '#94a3b8' },
  { key: 'in_progress', hd: '⚙️ กำลังผลิต', color: '#f59e0b' },
  { key: 'done', hd: '✅ เสร็จแล้ว', color: '#22c55e' },
  { key: 'on_hold', hd: '⏸ พัก/รอ', color: '#ef4444' },
];
const LEAN_TABS = ['มูดะ 7 ประการ', '5S Checklist', 'Kaizen Log', 'Takt Time'];
const FIVE_S_NAMES = ['', 'สะสาง (Seiri)', 'สะดวก (Seiton)', 'สะอาด (Seiso)', 'สุขลักษณะ (Seiketsu)', 'สร้างนิสัย (Shitsuke)'];
const KAIZEN_TYPE_LABEL: Record<KaizenItem['type'], string> = { quality: 'คุณภาพ', cost: 'ต้นทุน', safety: 'ความปลอดภัย', delivery: 'ส่งมอบ', morale: 'ขวัญกำลังใจ' };
const KAIZEN_STATUS_LABEL: Record<KaizenItem['status'], string> = { idea: '💡 ไอเดีย', doing: '🔄 ดำเนินการ', done: '✅ เสร็จแล้ว' };

function calcOEE(m: FactoryMachine) {
  const runTime = m.plannedTime - m.downtime;
  if (runTime <= 0 || m.plannedTime <= 0) return { avail: 0, perf: 0, qual: 100, oee: 0 };
  const avail = Math.min(runTime / m.plannedTime * 100, 100);
  const totalCount = runTime / Math.max(m.idealCycleTime, 0.01);
  const perf = Math.min((m.idealCycleTime * totalCount) / runTime * 100, 100);
  const qual = m.oee > 0 ? m.oee / (avail / 100 * perf / 100) / 100 : 100;
  const oee = avail / 100 * perf / 100 * Math.min(qual, 1) * 100;
  return { avail: Math.round(avail), perf: Math.round(perf), qual: Math.min(Math.round(qual * 100), 100), oee: Math.round(oee) };
}

export default function Factory({ data, onUpdate }: Props) {
  const f: FactoryData = data.factory ?? DEFAULT_FACTORY();
  const patch = (p: Partial<FactoryData>) => onUpdate({ ...data, factory: { ...f, ...p } });

  const [leanTab, setLeanTab] = useState(0);
  const [newWOProduct, setNewWOProduct] = useState('');

  // ─── KPI calculations ───────────────────────────────────────────────────────
  const avgOEE = f.machines.length ? Math.round(f.machines.reduce((s, m) => s + m.oee, 0) / f.machines.length) : 0;
  const totalTarget = f.workOrders.reduce((s, w) => s + w.targetQty, 0);
  const totalDefect = f.workOrders.reduce((s, w) => s + w.defectQty, 0);
  const totalActual = f.workOrders.reduce((s, w) => s + w.actualQty, 0);
  const defectPct = totalActual + totalDefect > 0 ? (totalDefect / (totalActual + totalDefect) * 100) : 0;
  const doneOrders = f.workOrders.filter(w => w.status === 'done');
  const onTime = doneOrders.length ? Math.round(doneOrders.filter(w => w.actualQty >= w.targetQty).length / doneOrders.length * 100) : 100;
  const runningMachines = f.machines.filter(m => m.status === 'running').length;
  const inProgressOrders = f.workOrders.filter(w => w.status === 'in_progress').length;
  const oeeColor = avgOEE >= 70 ? '#22c55e' : avgOEE >= 50 ? '#f59e0b' : '#ef4444';
  const defectColor = defectPct <= 2 ? '#22c55e' : defectPct <= 5 ? '#f59e0b' : '#ef4444';
  const onTimeColor = onTime >= 95 ? '#22c55e' : onTime >= 80 ? '#f59e0b' : '#ef4444';

  // ─── OEE aggregate breakdown ─────────────────────────────────────────────
  const avgBreakdown = f.machines.length
    ? f.machines.reduce((acc, m) => {
        const b = calcOEE(m);
        return { avail: acc.avail + b.avail, perf: acc.perf + b.perf, qual: acc.qual + b.qual };
      }, { avail: 0, perf: 0, qual: 0 })
    : { avail: 0, perf: 0, qual: 0 };
  const oeeBreakdown = f.machines.length
    ? { avail: Math.round(avgBreakdown.avail / f.machines.length), perf: Math.round(avgBreakdown.perf / f.machines.length), qual: Math.round(avgBreakdown.qual / f.machines.length) }
    : { avail: 0, perf: 0, qual: 0 };

  // ─── Takt time ──────────────────────────────────────────────────────────
  const netTime = f.shifts * 480;
  const taktTime = f.taktDemand > 0 ? (netTime / f.taktDemand).toFixed(1) : '∞';
  const actualCycleAvg = totalTarget > 0 ? (netTime / totalTarget).toFixed(1) : '—';

  // ─── 5S score ────────────────────────────────────────────────────────────
  const fiveSScore = (s: number) => {
    const items = f.fiveS.filter(x => x.s === s);
    return items.length ? Math.round(items.filter(x => x.checked).length / items.length * 100) : 0;
  };
  const totalFiveSScore = f.fiveS.length ? Math.round(f.fiveS.filter(x => x.checked).length / f.fiveS.length * 100) : 0;

  // ─── Machine helpers ─────────────────────────────────────────────────────
  function addMachine() {
    const m: FactoryMachine = { id: 'm' + Date.now().toString(36), name: 'เครื่องจักรใหม่', line: 'ไลน์ A', status: 'idle', oee: 70, plannedTime: 480, downtime: 30, idealCycleTime: 1.0, lastMaintenance: null, nextMaintenance: null };
    patch({ machines: [...f.machines, m] });
  }
  function patchMachine(id: string, p: Partial<FactoryMachine>) {
    patch({ machines: f.machines.map(m => m.id === id ? { ...m, ...p } : m) });
  }
  function delMachine(id: string) { patch({ machines: f.machines.filter(m => m.id !== id) }); }
  function cycleMachineStatus(id: string) {
    const m = f.machines.find(x => x.id === id);
    if (!m) return;
    const idx = (MACHINE_STATUS_CYCLE.indexOf(m.status) + 1) % MACHINE_STATUS_CYCLE.length;
    patchMachine(id, { status: MACHINE_STATUS_CYCLE[idx] });
  }

  // ─── Work order helpers ──────────────────────────────────────────────────
  function addWO() {
    if (!newWOProduct.trim()) return;
    const wo: WorkOrder = { id: 'wo' + Date.now().toString(36), product: newWOProduct.trim(), targetQty: 100, actualQty: 0, defectQty: 0, status: 'planned', dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), machineId: f.machines[0]?.id ?? '', shift: 1, note: '' };
    patch({ workOrders: [...f.workOrders, wo] });
    setNewWOProduct('');
  }
  function patchWO(id: string, p: Partial<WorkOrder>) { patch({ workOrders: f.workOrders.map(w => w.id === id ? { ...w, ...p } : w) }); }
  function delWO(id: string) { patch({ workOrders: f.workOrders.filter(w => w.id !== id) }); }

  // ─── Kaizen helpers ──────────────────────────────────────────────────────
  function addKaizen() {
    const k: KaizenItem = { id: 'k' + Date.now().toString(36), title: 'Kaizen ใหม่', proposer: '', type: 'quality', status: 'idea', result: '' };
    patch({ kaizen: [...f.kaizen, k] });
  }
  function patchKaizen(id: string, p: Partial<KaizenItem>) { patch({ kaizen: f.kaizen.map(k => k.id === id ? { ...k, ...p } : k) }); }
  function delKaizen(id: string) { patch({ kaizen: f.kaizen.filter(k => k.id !== id) }); }

  // ─── Quality summary ─────────────────────────────────────────────────────
  const qualByProduct = Object.values(f.workOrders.reduce((acc, w) => {
    if (!acc[w.product]) acc[w.product] = { product: w.product, total: 0, defect: 0 };
    acc[w.product].total += w.actualQty;
    acc[w.product].defect += w.defectQty;
    return acc;
  }, {} as Record<string, { product: string; total: number; defect: number }>));

  // ─── Factory agent suggestions ────────────────────────────────────────────
  const FACTORY_AGENTS = [
    { avatar: '🏭', role: 'Production Manager', mandate: 'วางแผนการผลิต ติดตาม OEE บริหาร Work Order และ Capacity Planning' },
    { avatar: '🔬', role: 'QC Manager', mandate: 'ควบคุมคุณภาพ ลดของเสีย วิเคราะห์ Root Cause และดูแลระบบ Poka-Yoke' },
    { avatar: '🔧', role: 'Maintenance Manager', mandate: 'วางแผน Preventive Maintenance บริหารเครื่องจักร ลด Downtime' },
    { avatar: '🚛', role: 'Supply Chain Manager', mandate: 'จัดการ Supplier วัตถุดิบ JIT Inventory และส่งมอบตรงเวลา' },
  ];

  return (
    <div className="page">
      <h1 className="page-title">🏭 โรงงานอัจฉริยะ</h1>
      <p className="page-subtitle">OEE + Lean Management — ระบบบริหารโรงงานแบบอัตโนมัติด้วย AI</p>

      {/* ── Factory Profile ── */}
      <div className="factory-profile-row">
        {[
          { label: 'ชื่อโรงงาน', field: 'name' as const, value: f.name, width: '180px' },
          { label: 'ประเภท', field: 'type' as const, value: f.type, width: '160px' },
          { label: 'ที่ตั้ง', field: 'location' as const, value: f.location, width: '180px' },
        ].map(({ label, field, value, width }) => (
          <div key={field} className="factory-profile-field">
            <span className="factory-profile-label">{label}</span>
            <input className="factory-profile-inp" style={{ width }} defaultValue={value} key={field + value}
              onBlur={e => patch({ [field]: e.target.value })} />
          </div>
        ))}
        <div className="factory-profile-field">
          <span className="factory-profile-label">กำลังผลิต/วัน</span>
          <input className="factory-profile-inp" style={{ width: '90px' }} type="number" value={f.capacityPerDay}
            onChange={e => patch({ capacityPerDay: +e.target.value })} />
        </div>
        <div className="factory-profile-field">
          <span className="factory-profile-label">จำนวนกะ</span>
          <select className="factory-profile-inp" style={{ width: '80px' }} value={f.shifts}
            onChange={e => patch({ shifts: +e.target.value as 1 | 2 | 3 })}>
            <option value={1}>1 กะ</option><option value={2}>2 กะ</option><option value={3}>3 กะ</option>
          </select>
        </div>
      </div>

      {/* ── OEE Breakdown ── */}
      <div className="factory-oee-breakdown">
        <div className="factory-oee-breakdown-title">OEE = Availability × Performance × Quality</div>
        <div className="factory-oee-components">
          {[
            { label: 'Availability', sublabel: 'พร้อมใช้งาน', val: oeeBreakdown.avail, color: '#22c55e' },
            { label: '×', sublabel: '', val: null, color: '#94a3b8' },
            { label: 'Performance', sublabel: 'ประสิทธิภาพ', val: oeeBreakdown.perf, color: '#f59e0b' },
            { label: '×', sublabel: '', val: null, color: '#94a3b8' },
            { label: 'Quality', sublabel: 'คุณภาพ', val: oeeBreakdown.qual, color: '#06b6d4' },
            { label: '=', sublabel: '', val: null, color: '#94a3b8' },
            { label: 'OEE', sublabel: 'เป้า: ' + f.kpi.targetOEE + '%', val: avgOEE, color: oeeColor },
          ].map((item, i) => (
            item.val === null
              ? <span key={i} className="factory-oee-op">{item.label}</span>
              : (
                <div key={i} className="factory-oee-component">
                  <div className="factory-oee-component-val" style={{ color: item.color }}>{item.val}%</div>
                  <div className="factory-oee-component-label">{item.label}</div>
                  <div className="factory-oee-component-sub">{item.sublabel}</div>
                  <div className="factory-oee-bar"><div className="factory-oee-fill" style={{ width: item.val + '%', background: item.color }} /></div>
                </div>
              )
          ))}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="factory-kpi-grid">
        {[
          { label: 'OEE เฉลี่ย', val: avgOEE + '%', color: oeeColor, sub: 'เป้า ' + f.kpi.targetOEE + '%' },
          { label: 'ของเสีย %', val: defectPct.toFixed(1) + '%', color: defectColor, sub: 'เป้า ≤' + f.kpi.targetDefectRate + '%' },
          { label: 'งาน In Progress', val: String(inProgressOrders), color: '#f59e0b', sub: 'ใบสั่งงาน' },
          { label: 'งานเสร็จแล้ว', val: String(doneOrders.length), color: '#22c55e', sub: 'ใบสั่งงาน' },
          { label: 'เครื่องทำงาน', val: runningMachines + '/' + f.machines.length, color: '#06b6d4', sub: 'เครื่อง' },
          { label: 'ส่งมอบทันกำหนด', val: onTime + '%', color: onTimeColor, sub: 'เป้า ' + f.kpi.targetOnTimeDelivery + '%' },
        ].map(({ label, val, color, sub }) => (
          <div key={label} className="factory-kpi-card">
            <div className="factory-kpi-label">{label}</div>
            <div className="factory-kpi-val" style={{ color }}>{val}</div>
            <div className="factory-kpi-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Machine Status ── */}
      <section className="ai-panel">
        <div className="ai-panel-hd">⚙️ สถานะเครื่องจักร
          <button className="ai-mini-add" onClick={addMachine}>＋ เพิ่มเครื่องจักร</button>
        </div>
        {f.machines.length === 0 && <p style={{ color: '#64748b', fontSize: 13, padding: '8px 0' }}>ยังไม่มีเครื่องจักร — กด "+ เพิ่มเครื่องจักร"</p>}
        <div className="factory-machine-grid">
          {f.machines.map(m => {
            const b = calcOEE(m);
            return (
              <div key={m.id} className="factory-machine-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <input className="factory-profile-inp" style={{ width: '110px', marginBottom: 2 }} defaultValue={m.name} key={'mn' + m.id}
                      onBlur={e => patchMachine(m.id, { name: e.target.value })} />
                    <div style={{ fontSize: 11, color: '#64748b' }}>{m.line}</div>
                  </div>
                  <button className="ai-task-del" onClick={() => delMachine(m.id)}>×</button>
                </div>
                <button className="factory-status-badge"
                  style={{ background: MACHINE_STATUS_COLOR[m.status] + '22', color: MACHINE_STATUS_COLOR[m.status], border: '1px solid ' + MACHINE_STATUS_COLOR[m.status] + '44', borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginTop: 6 }}
                  onClick={() => cycleMachineStatus(m.id)}>
                  {MACHINE_STATUS_LABEL[m.status]}
                </button>
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>OEE</span>
                    <span style={{ color: b.oee >= 70 ? '#22c55e' : b.oee >= 50 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>{m.oee}%</span>
                  </div>
                  <div className="factory-oee-bar"><div className="factory-oee-fill" style={{ width: m.oee + '%', background: m.oee >= 70 ? '#22c55e' : m.oee >= 50 ? '#f59e0b' : '#ef4444' }} /></div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, fontSize: 10, color: '#64748b' }}>
                    <span>A:{b.avail}%</span><span>P:{b.perf}%</span><span>Q:{b.qual}%</span>
                  </div>
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>OEE (manual):</span>
                  <input type="number" min={0} max={100} value={m.oee} onChange={e => patchMachine(m.id, { oee: Math.min(100, Math.max(0, +e.target.value)) })}
                    style={{ width: 52, background: 'var(--cream2)', border: '1px solid var(--sand)', borderRadius: 6, padding: '2px 6px', color: 'var(--ink)', fontSize: 12 }} />
                </div>
                {m.nextMaintenance && (
                  <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>🔧 PM ถัดไป: {m.nextMaintenance}</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Work Order Kanban ── */}
      <section className="ai-panel" style={{ marginTop: 16 }}>
        <div className="ai-panel-hd">📋 ใบสั่งงาน (Work Orders)
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input placeholder="ชื่อสินค้า..." value={newWOProduct} onChange={e => setNewWOProduct(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addWO()}
              style={{ background: 'var(--cream2)', border: '1px solid var(--sand)', borderRadius: 6, padding: '4px 10px', color: 'var(--ink)', fontSize: 12, width: 140 }} />
            <button className="ai-mini-add" onClick={addWO}>＋ สร้างใบสั่งงาน</button>
          </div>
        </div>
        <div className="ai-board">
          {WO_COLS.map(col => (
            <div key={col.key} className="ai-board-col">
              <div className="ai-board-col-hd" style={{ color: col.color }}>{col.hd}
                <span className="ai-board-count">{f.workOrders.filter(w => w.status === col.key).length}</span>
              </div>
              {f.workOrders.filter(w => w.status === col.key).map(w => {
                const machine = f.machines.find(m => m.id === w.machineId);
                const defPct = w.actualQty + w.defectQty > 0 ? (w.defectQty / (w.actualQty + w.defectQty) * 100).toFixed(1) : '0.0';
                return (
                  <div key={w.id} className="ai-task">
                    <div className="ai-task-top-row">
                      <button className="ai-task-del" onClick={() => delWO(w.id)}>×</button>
                      <span style={{ fontSize: 11, color: '#64748b' }}>กะ {w.shift}</span>
                    </div>
                    <input style={{ background: 'none', border: 'none', color: 'var(--ink)', fontWeight: 700, fontSize: 13, width: '100%', padding: 0, marginBottom: 4 }}
                      defaultValue={w.product} key={'wp' + w.id} onBlur={e => patchWO(w.id, { product: e.target.value })} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 6, fontSize: 11 }}>
                      <div><div style={{ color: '#64748b' }}>เป้า</div>
                        <input type="number" value={w.targetQty} onChange={e => patchWO(w.id, { targetQty: +e.target.value })}
                          style={{ width: '100%', background: 'var(--cream2)', border: '1px solid var(--sand)', borderRadius: 4, padding: '2px 4px', color: 'var(--ink)', fontSize: 12 }} />
                      </div>
                      <div><div style={{ color: '#64748b' }}>จริง</div>
                        <input type="number" value={w.actualQty} onChange={e => patchWO(w.id, { actualQty: +e.target.value })}
                          style={{ width: '100%', background: 'var(--cream2)', border: '1px solid var(--sand)', borderRadius: 4, padding: '2px 4px', color: '#22c55e', fontSize: 12 }} />
                      </div>
                      <div><div style={{ color: '#64748b' }}>ของเสีย</div>
                        <input type="number" value={w.defectQty} onChange={e => patchWO(w.id, { defectQty: +e.target.value })}
                          style={{ width: '100%', background: 'var(--cream2)', border: '1px solid var(--sand)', borderRadius: 4, padding: '2px 4px', color: '#ef4444', fontSize: 12 }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                      ของเสีย: <span style={{ color: +defPct > f.kpi.targetDefectRate ? '#ef4444' : '#22c55e' }}>{defPct}%</span>
                      {machine && <span style={{ marginLeft: 8 }}>⚙️ {machine.name}</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>📅 {w.dueDate}</span>
                      <select value={w.status} onChange={e => patchWO(w.id, { status: e.target.value as WorkOrderStatus })}
                        style={{ background: 'var(--cream2)', border: '1px solid var(--sand)', color: 'var(--ink)', fontSize: 11, borderRadius: 6, padding: '2px 4px' }}>
                        <option value="planned">วางแผน</option>
                        <option value="in_progress">กำลังผลิต</option>
                        <option value="done">เสร็จแล้ว</option>
                        <option value="on_hold">พัก/รอ</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {/* ── Quality Summary ── */}
      {qualByProduct.length > 0 && (
        <section className="ai-panel" style={{ marginTop: 16 }}>
          <div className="ai-panel-hd">🔬 สรุปคุณภาพตามสินค้า</div>
          <table className="muda-table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>สินค้า</th><th style={{ textAlign: 'right' }}>ผลิตจริง</th><th style={{ textAlign: 'right' }}>ของเสีย</th><th style={{ textAlign: 'right' }}>ของเสีย %</th><th style={{ textAlign: 'center' }}>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {qualByProduct.map(q => {
                const pct = q.total + q.defect > 0 ? (q.defect / (q.total + q.defect) * 100) : 0;
                const status = pct <= f.kpi.targetDefectRate ? '🟢' : pct <= f.kpi.targetDefectRate * 2 ? '🟡' : '🔴';
                return (
                  <tr key={q.product}>
                    <td style={{ fontWeight: 600 }}>{q.product}</td>
                    <td style={{ textAlign: 'right' }}>{q.total.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', color: '#ef4444' }}>{q.defect.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', color: pct > f.kpi.targetDefectRate ? '#ef4444' : '#22c55e', fontWeight: 700 }}>{pct.toFixed(1)}%</td>
                    <td style={{ textAlign: 'center', fontSize: 16 }}>{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* ── Lean & Kaizen ── */}
      <section className="ai-panel" style={{ marginTop: 16 }}>
        <div className="ai-panel-hd">🔧 Lean &amp; Kaizen Management
          <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}>5S: {totalFiveSScore}% · Kaizen: {f.kaizen.length} รายการ</span>
        </div>
        <div className="lean-tab-row">
          {LEAN_TABS.map((t, i) => (
            <button key={t} className={`lean-tab${leanTab === i ? ' active' : ''}`} onClick={() => setLeanTab(i)}>{t}</button>
          ))}
        </div>

        {/* Tab 0: มูดะ */}
        {leanTab === 0 && (
          <table className="muda-table">
            <thead>
              <tr><th>ความสูญเสีย (Muda)</th><th>คำอธิบาย</th><th>ระดับ</th><th>แนวทางแก้ไข</th><th>หมายเหตุ</th></tr>
            </thead>
            <tbody>
              {f.mudaLog.map((m, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{m.type}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{m.typeEn}</div>
                  </td>
                  <td style={{ fontSize: 12, color: '#94a3b8', maxWidth: 180 }}>{m.description}</td>
                  <td>
                    <select value={m.level} onChange={e => {
                      const newLog = [...f.mudaLog]; newLog[i] = { ...m, level: e.target.value as 'low' | 'medium' | 'high' }; patch({ mudaLog: newLog });
                    }} style={{ background: 'var(--cream2)', border: '1px solid var(--sand)', borderRadius: 6, padding: '3px 6px', color: m.level === 'high' ? '#ef4444' : m.level === 'medium' ? '#f59e0b' : '#22c55e', fontSize: 12 }}>
                      <option value="low">🟢 ต่ำ</option><option value="medium">🟡 กลาง</option><option value="high">🔴 สูง</option>
                    </select>
                  </td>
                  <td style={{ fontSize: 12, color: '#06b6d4', maxWidth: 180 }}>{m.fix}</td>
                  <td>
                    <input defaultValue={m.note} key={'mn' + i} placeholder="บันทึก..."
                      onBlur={e => { const newLog = [...f.mudaLog]; newLog[i] = { ...m, note: e.target.value }; patch({ mudaLog: newLog }); }}
                      style={{ background: 'var(--cream2)', border: '1px solid var(--sand)', borderRadius: 6, padding: '3px 8px', color: 'var(--ink)', fontSize: 12, width: '100%' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Tab 1: 5S */}
        {leanTab === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <span className="factory-kpi-val" style={{ color: totalFiveSScore >= 80 ? '#22c55e' : totalFiveSScore >= 50 ? '#f59e0b' : '#ef4444' }}>{totalFiveSScore}%</span>
              <span style={{ fontSize: 13, color: '#64748b', marginLeft: 8 }}>คะแนน 5S รวม</span>
            </div>
            <div className="fives-grid">
              {[1, 2, 3, 4, 5].map(s => {
                const items = f.fiveS.filter(x => x.s === s);
                const score = fiveSScore(s);
                return (
                  <div key={s} className="fives-card">
                    <div className="fives-card-hd">S{s} {FIVE_S_NAMES[s]}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>คะแนน: {score}%</div>
                    <div className="fives-score-bar"><div className="fives-score-fill" style={{ width: score + '%' }} /></div>
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {items.map(item => (
                        <label key={item.id} style={{ display: 'flex', gap: 8, cursor: 'pointer', fontSize: 12, color: item.checked ? 'var(--ink)' : '#64748b', alignItems: 'flex-start' }}>
                          <input type="checkbox" checked={item.checked} onChange={e => patch({ fiveS: f.fiveS.map(x => x.id === item.id ? { ...x, checked: e.target.checked } : x) })}
                            style={{ marginTop: 2, accentColor: '#06b6d4' }} />
                          {item.text}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Kaizen */}
        {leanTab === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>{f.kaizen.length} รายการ · {f.kaizen.filter(k => k.status === 'done').length} เสร็จแล้ว</span>
              <button className="ai-mini-add" onClick={addKaizen}>＋ บันทึก Kaizen</button>
            </div>
            {f.kaizen.length === 0 && <p style={{ color: '#64748b', fontSize: 13 }}>ยังไม่มีรายการ Kaizen — กด "+ บันทึก Kaizen" เพื่อเริ่มต้น</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {f.kaizen.map(k => (
                <div key={k.id} style={{ background: 'var(--cream2)', border: '1px solid var(--sand)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                    <input defaultValue={k.title} key={'kt' + k.id} placeholder="หัวข้อ Kaizen..."
                      onBlur={e => patchKaizen(k.id, { title: e.target.value })}
                      style={{ flex: 1, background: 'none', border: 'none', color: 'var(--ink)', fontWeight: 700, fontSize: 13, padding: 0 }} />
                    <button className="ai-task-del" onClick={() => delKaizen(k.id)}>×</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input defaultValue={k.proposer} key={'kp' + k.id} placeholder="ผู้เสนอ..."
                      onBlur={e => patchKaizen(k.id, { proposer: e.target.value })}
                      style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 6, padding: '3px 8px', color: 'var(--ink)', fontSize: 12, width: 110 }} />
                    <select value={k.type} onChange={e => patchKaizen(k.id, { type: e.target.value as KaizenItem['type'] })}
                      style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 6, padding: '3px 8px', color: 'var(--ink)', fontSize: 12 }}>
                      {(Object.keys(KAIZEN_TYPE_LABEL) as KaizenItem['type'][]).map(t => <option key={t} value={t}>{KAIZEN_TYPE_LABEL[t]}</option>)}
                    </select>
                    <select value={k.status} onChange={e => patchKaizen(k.id, { status: e.target.value as KaizenItem['status'] })}
                      style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 6, padding: '3px 8px', color: 'var(--ink)', fontSize: 12 }}>
                      {(Object.keys(KAIZEN_STATUS_LABEL) as KaizenItem['status'][]).map(s => <option key={s} value={s}>{KAIZEN_STATUS_LABEL[s]}</option>)}
                    </select>
                  </div>
                  <input defaultValue={k.result} key={'kr' + k.id} placeholder="ผลลัพธ์/ความคืบหน้า..."
                    onBlur={e => patchKaizen(k.id, { result: e.target.value })}
                    style={{ marginTop: 8, width: '100%', background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 6, padding: '4px 8px', color: '#94a3b8', fontSize: 12, boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Takt Time */}
        {leanTab === 3 && (
          <div>
            <div className="takt-card">
              <div className="factory-profile-field">
                <span className="factory-profile-label">ความต้องการลูกค้า/วัน (ชิ้น)</span>
                <input type="number" value={f.taktDemand} onChange={e => patch({ taktDemand: +e.target.value })}
                  className="factory-profile-inp" style={{ width: 100 }} />
              </div>
              <div className="factory-profile-field">
                <span className="factory-profile-label">เวลาทำงานสุทธิ/วัน (นาที)</span>
                <input type="number" value={netTime} readOnly
                  className="factory-profile-inp" style={{ width: 100, opacity: 0.7 }} />
                <span style={{ fontSize: 11, color: '#64748b' }}>{f.shifts} กะ × 480 นาที</span>
              </div>
              <div>
                <div className="factory-kpi-label">Takt Time</div>
                <div className="takt-result">{taktTime} <span style={{ fontSize: 16 }}>นาที/ชิ้น</span></div>
                <div style={{ fontSize: 12, color: '#64748b' }}>เวลาที่ต้องผลิต 1 ชิ้นเพื่อตามทัน demand</div>
              </div>
              <div>
                <div className="factory-kpi-label">Actual Cycle Time เฉลี่ย</div>
                <div className="takt-result" style={{ color: actualCycleAvg !== '—' && +actualCycleAvg <= +taktTime ? '#22c55e' : '#f59e0b' }}>
                  {actualCycleAvg} <span style={{ fontSize: 16 }}>นาที/ชิ้น</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {actualCycleAvg !== '—' && taktTime !== '∞'
                    ? +actualCycleAvg <= +taktTime
                      ? '✅ ผลิตได้ทันตาม Takt Time'
                      : '⚠️ ผลิตช้ากว่า Takt Time — เพิ่มกำลังผลิต'
                    : 'ยังไม่มีข้อมูลใบสั่งงาน'
                  }
                </div>
              </div>
            </div>
            <div style={{ marginTop: 16, background: 'var(--cream2)', borderRadius: 8, padding: '12px 16px', fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>💡 วิธีใช้ Takt Time</div>
              <ul style={{ color: '#94a3b8', margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
                <li>Takt Time คือ "จังหวะ" ที่ต้องผลิต — ถ้าสายผลิตผลิตเร็วกว่า Takt คือผลิตเกิน (Overproduction)</li>
                <li>ถ้าผลิตช้ากว่า Takt คือส่งมอบไม่ทัน — ต้องหาคอขวด (Bottleneck) และแก้ไข</li>
                <li>Balance Line: ทุก Station ควรใช้เวลาใกล้เคียง Takt Time เพื่อลด Waiting Muda</li>
                <li>เมื่อ demand เปลี่ยน → Takt Time เปลี่ยน → ต้องปรับแผนการผลิตใหม่ทันที</li>
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* ── AI Agent Suggestions ── */}
      <section className="ai-panel" style={{ marginTop: 16 }}>
        <div className="ai-panel-hd">🤖 ทีม AI แนะนำสำหรับโรงงาน</div>
        <div className="factory-agent-grid">
          {FACTORY_AGENTS.map(a => (
            <div key={a.role} className="factory-agent-card">
              <div style={{ fontSize: 28, marginBottom: 6 }}>{a.avatar}</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{a.role}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 10 }}>{a.mandate}</div>
              <button
                style={{ width: '100%', background: 'var(--rust)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                onClick={() => alert(`✅ เพิ่ม "${a.role}" ในหน้า บริษัท AI แล้ว\n\nไปที่เมนู "บริษัท AI" เพื่อกำหนดหน้าที่และเริ่มดำเนินงาน`)}>
                ＋ เพิ่มใน บริษัท AI
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
