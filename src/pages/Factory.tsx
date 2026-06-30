import { useState } from 'react';
import type { AppData, FactoryData, FactoryMachine, WorkOrder, MachineStatus, WorkOrderStatus, KaizenItem, TPMPillarStatus, InventoryItem, InventoryLot } from '../types';
import { DBD_SECTORS } from '../data/dbd';

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
  tpm: [
    { id: 'tpm1', pillar: 1, name: 'Jishu Hozen (JH)', nameEn: 'Autonomous Maintenance', description: 'พนักงานดูแลรักษาเครื่องจักรด้วยตนเอง ทำความสะอาด หล่อลื่น ขันสกรู', score: 0, status: 'not_started' as TPMPillarStatus, notes: '' },
    { id: 'tpm2', pillar: 2, name: 'Keikaku Hozen (KH)', nameEn: 'Planned Maintenance', description: 'วางแผน PM/PdM ล่วงหน้า ลด Breakdown และต้นทุนการซ่อม', score: 0, status: 'not_started' as TPMPillarStatus, notes: '' },
    { id: 'tpm3', pillar: 3, name: 'Hinshitsu Hozen (HH)', nameEn: 'Quality Maintenance', description: 'รักษาสภาพเครื่องจักรให้ผลผลิตได้คุณภาพ Zero Defect', score: 0, status: 'not_started' as TPMPillarStatus, notes: '' },
    { id: 'tpm4', pillar: 4, name: 'Kobetsu Kaizen (KK)', nameEn: 'Focused Improvement', description: 'โครงการปรับปรุงเฉพาะจุด Loss & Waste อย่างต่อเนื่อง', score: 0, status: 'not_started' as TPMPillarStatus, notes: '' },
    { id: 'tpm5', pillar: 5, name: 'Early Management (EM)', nameEn: 'Early Equipment Management', description: 'ออกแบบเครื่องจักรและกระบวนการใหม่ให้ Maintenance-free', score: 0, status: 'not_started' as TPMPillarStatus, notes: '' },
    { id: 'tpm6', pillar: 6, name: 'Education & Training (ET)', nameEn: 'Training & Education', description: 'พัฒนาทักษะพนักงานให้รู้จักเครื่องจักรและแก้ไขเบื้องต้นได้', score: 0, status: 'not_started' as TPMPillarStatus, notes: '' },
    { id: 'tpm7', pillar: 7, name: 'Safety Health Env (SHE)', nameEn: 'Safety, Health & Environment', description: 'สถานที่ทำงานปลอดภัย Zero Accident ลดมลพิษ ดูแลสุขภาพ', score: 0, status: 'not_started' as TPMPillarStatus, notes: '' },
    { id: 'tpm8', pillar: 8, name: 'Office TPM', nameEn: 'Administrative TPM', description: 'ขยายหลัก TPM ไปสู่สำนักงาน คลังสินค้า และทุกหน่วยสนับสนุน', score: 0, status: 'not_started' as TPMPillarStatus, notes: '' },
  ],
  inventory: [] as InventoryItem[],
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
const LEAN_TABS = ['มูดะ 7 ประการ', '5S Checklist', 'Kaizen Log', 'Takt Time', 'TPM 8 เสาหลัก'];
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
  const [invCat, setInvCat] = useState<'all' | InventoryItem['category']>('all');
  const [expandedInvId, setExpandedInvId] = useState<string | null>(null);

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

  // ─── Inventory helpers ────────────────────────────────────────────────────
  const inv = f.inventory ?? [];
  function patchInv(id: string, p: Partial<InventoryItem>) {
    patch({ inventory: inv.map(x => x.id === id ? { ...x, ...p } : x) });
  }
  function delInv(id: string) { patch({ inventory: inv.filter(x => x.id !== id) }); }
  function addInv() {
    const item: InventoryItem = {
      id: 'i' + Date.now().toString(36), name: 'รายการใหม่', sku: '',
      category: 'raw', unit: 'ชิ้น', minQty: 10, maxQty: 50,
      location: '', supplier: '', costPerUnit: 0, lots: [],
    };
    patch({ inventory: [...inv, item] });
  }
  function addLot(itemId: string) {
    const lot: InventoryLot = {
      id: 'lot' + Date.now().toString(36),
      lotNo: 'LOT-' + String(Date.now()).slice(-4),
      receivedDate: new Date().toISOString().slice(0, 10),
      mfgDate: '', expDate: null, qty: 0,
    };
    const item = inv.find(x => x.id === itemId);
    if (item) patchInv(itemId, { lots: [...item.lots, lot] });
  }
  function patchLot(itemId: string, lotId: string, p: Partial<InventoryLot>) {
    const item = inv.find(x => x.id === itemId);
    if (!item) return;
    patchInv(itemId, { lots: item.lots.map(l => l.id === lotId ? { ...l, ...p } : l) });
  }
  function delLot(itemId: string, lotId: string) {
    const item = inv.find(x => x.id === itemId);
    if (!item) return;
    patchInv(itemId, { lots: item.lots.filter(l => l.id !== lotId) });
  }

  // ─── Inventory FEFO computations ──────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const totalQty = (item: InventoryItem) => item.lots.reduce((s, l) => s + l.qty, 0);
  const fefoLots = (item: InventoryItem) =>
    [...item.lots].sort((a, b) => {
      if (!a.expDate && !b.expDate) return 0;
      if (!a.expDate) return 1;
      if (!b.expDate) return -1;
      return a.expDate.localeCompare(b.expDate);
    });
  const nearestExp = (item: InventoryItem): string | null =>
    fefoLots(item).find(l => l.expDate && l.qty > 0)?.expDate ?? null;
  const expStatus = (expDate: string | null): 'expired' | 'critical' | 'warning' | 'ok' | 'none' => {
    if (!expDate) return 'none';
    if (expDate < today) return 'expired';
    const days = Math.ceil((new Date(expDate).getTime() - Date.now()) / 86400000);
    if (days <= 7) return 'critical';
    if (days <= 30) return 'warning';
    return 'ok';
  };
  const EXP_COLOR: Record<string, string> = { expired: '#ef4444', critical: '#ef4444', warning: '#f59e0b', ok: '#22c55e', none: '#64748b' };
  const EXP_LABEL: Record<string, string> = { expired: 'หมดอายุแล้ว', critical: '< 7 วัน', warning: '< 30 วัน', ok: 'ปกติ', none: 'ไม่ระบุ' };
  const invAlerts = inv.filter(item => totalQty(item) <= item.minQty).length;
  const expiringSoon = inv.reduce((n, item) =>
    n + item.lots.filter(l => l.qty > 0 && l.expDate && expStatus(l.expDate) !== 'ok' && expStatus(l.expDate) !== 'none').length, 0);
  const totalInvValue = inv.reduce((s, item) => s + totalQty(item) * item.costPerUnit, 0);
  const filteredInv = invCat === 'all' ? inv : inv.filter(x => x.category === invCat);
  const CAT_LABEL: Record<InventoryItem['category'], string> = { raw: 'วัตถุดิบ', wip: 'WIP', finished: 'สำเร็จรูป', spare: 'อะไหล่' };
  const CAT_COLOR: Record<InventoryItem['category'], string> = { raw: '#06b6d4', wip: '#f59e0b', finished: '#22c55e', spare: '#a855f7' };

  // ─── Quality summary ─────────────────────────────────────────────────────
  const qualByProduct = Object.values(f.workOrders.reduce((acc, w) => {
    if (!acc[w.product]) acc[w.product] = { product: w.product, total: 0, defect: 0 };
    acc[w.product].total += w.actualQty;
    acc[w.product].defect += w.defectQty;
    return acc;
  }, {} as Record<string, { product: string; total: number; defect: number }>));

  // ─── Factory agent suggestions ────────────────────────────────────────────
  const FACTORY_AGENTS = [
    { avatar: '🏭', role: 'COO (Operations)', mandate: 'บริหารการผลิต OEE ทุกสาย วางแผน PM/AM ตามหลัก TPM ดูแลคลังวัตถุดิบและคลังสินค้า', isClevel: true },
    { avatar: '🔬', role: 'CQO (Quality)', mandate: 'ควบคุมคุณภาพตามหลัก TQM ลดของเสีย วิเคราะห์ Root Cause และดูแลระบบ Poka-Yoke / SPC', isClevel: true },
    { avatar: '🔧', role: 'Maintenance Manager', mandate: 'วางแผน Preventive Maintenance บริหารเครื่องจักร ลด Downtime ตาม MTBF/MTTR', isClevel: false },
    { avatar: '🚛', role: 'Supply Chain Manager', mandate: 'จัดการ Supplier วัตถุดิบ JIT Inventory Safety Stock และส่งมอบตรงเวลา', isClevel: false },
  ];

  return (
    <div className="page">
      <h1 className="page-title">🏭 โรงงานอัจฉริยะ</h1>
      <p className="page-subtitle">OEE + Lean Management — ระบบบริหารโรงงานแบบอัตโนมัติด้วย AI</p>

      {/* ── Factory Profile ── */}
      <datalist id="dbd-factory-types">
        {DBD_SECTORS.map(s => s.items.map(item => (
          <option key={s.code + item} value={`[${s.code}] ${item}`} />
        )))}
      </datalist>
      <div className="factory-profile-row">
        <div className="factory-profile-field">
          <span className="factory-profile-label">ชื่อโรงงาน</span>
          <input className="factory-profile-inp" style={{ width: '180px' }} defaultValue={f.name} key={'name' + f.name}
            onBlur={e => patch({ name: e.target.value })} />
        </div>
        <div className="factory-profile-field">
          <span className="factory-profile-label">ประเภทธุรกิจ (DBD)</span>
          <input className="factory-profile-inp" style={{ width: '220px' }} list="dbd-factory-types"
            defaultValue={f.type} key={'type' + f.type} placeholder="พิมพ์หรือเลือก..."
            onBlur={e => patch({ type: e.target.value })} />
        </div>
        <div className="factory-profile-field">
          <span className="factory-profile-label">ที่ตั้ง</span>
          <input className="factory-profile-inp" style={{ width: '180px' }} defaultValue={f.location} key={'loc' + f.location}
            onBlur={e => patch({ location: e.target.value })} />
        </div>
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

        {/* Tab 4: TPM 8 เสาหลัก */}
        {leanTab === 4 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>
                TPM Score รวม: <strong style={{ color: 'var(--rust)' }}>
                  {Math.round(f.tpm.reduce((s, t) => s + t.score, 0) / Math.max(1, f.tpm.length))}%
                </strong>
                <span style={{ marginLeft: 12, fontSize: 11, color: '#94a3b8' }}>— COO AI รับผิดชอบ TPM ทุกเสา</span>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {f.tpm.map(t => {
                const statusColor: Record<TPMPillarStatus, string> = {
                  not_started: '#64748b', planning: '#f59e0b', implementing: '#06b6d4', sustaining: '#22c55e'
                };
                const statusLabel: Record<TPMPillarStatus, string> = {
                  not_started: '⬜ ยังไม่เริ่ม', planning: '📋 วางแผน', implementing: '🔄 ดำเนินการ', sustaining: '✅ คงสภาพ'
                };
                return (
                  <div key={t.id} style={{ background: 'var(--cream2)', border: '1px solid var(--sand)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ background: 'var(--rust)', color: '#fff', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{t.pillar}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{t.nameEn}</div>
                      </div>
                      <select value={t.status}
                        onChange={e => patch({ tpm: f.tpm.map(x => x.id === t.id ? { ...x, status: e.target.value as TPMPillarStatus } : x) })}
                        style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 6, padding: '3px 8px', color: statusColor[t.status], fontSize: 11, fontWeight: 700 }}>
                        <option value="not_started">ยังไม่เริ่ม</option>
                        <option value="planning">วางแผน</option>
                        <option value="implementing">ดำเนินการ</option>
                        <option value="sustaining">คงสภาพ</option>
                      </select>
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{t.description}</div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>คะแนน (0-100%)</span>
                      <input type="range" min={0} max={100} value={t.score}
                        onChange={e => patch({ tpm: f.tpm.map(x => x.id === t.id ? { ...x, score: +e.target.value } : x) })}
                        style={{ flex: 1, accentColor: 'var(--rust)' }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: t.score >= 70 ? '#22c55e' : t.score >= 40 ? '#f59e0b' : '#ef4444', minWidth: 36 }}>{t.score}%</span>
                    </div>
                    <div className="factory-oee-bar" style={{ marginTop: 4 }}>
                      <div className="factory-oee-fill" style={{ width: t.score + '%', background: t.score >= 70 ? '#22c55e' : t.score >= 40 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <input defaultValue={t.notes} key={'tn' + t.id} placeholder="บันทึก / แผนงาน..."
                      onBlur={e => patch({ tpm: f.tpm.map(x => x.id === t.id ? { ...x, notes: e.target.value } : x) })}
                      style={{ marginTop: 8, width: '100%', background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 6, padding: '4px 8px', color: '#94a3b8', fontSize: 12, boxSizing: 'border-box' }} />
                    <div style={{ marginTop: 6, fontSize: 11 }}>
                      <span style={{ color: statusColor[t.status], fontWeight: 700 }}>{statusLabel[t.status]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 16, background: 'var(--cream2)', borderRadius: 8, padding: '12px 16px', fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>🏭 COO AI — บทบาทในแต่ละเสา TPM</div>
              <ul style={{ color: '#94a3b8', margin: 0, paddingLeft: 16, lineHeight: 1.9 }}>
                <li><strong style={{ color: 'var(--ink)' }}>เสา 1-2 (JH/KH):</strong> วางแผนตาราง PM/AM มอบหมายงานซ่อมให้ทีม ติดตาม Downtime</li>
                <li><strong style={{ color: 'var(--ink)' }}>เสา 3-4 (HH/KK):</strong> วิเคราะห์ Root Cause ของเสีย ตั้ง Project Kaizen เฉพาะจุด</li>
                <li><strong style={{ color: 'var(--ink)' }}>เสา 5-6 (EM/ET):</strong> ออกแบบ Checklist ฝึกอบรมพนักงาน สร้าง OPL (One Point Lesson)</li>
                <li><strong style={{ color: 'var(--ink)' }}>เสา 7-8 (SHE/Office):</strong> Audit Safety รายเดือน ขยาย TPM ไปสู่คลังสินค้าและสำนักงาน</li>
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* ── Inventory Management (FEFO) ── */}
      <section className="ai-panel" style={{ marginTop: 16 }}>
        <div className="ai-panel-hd">📦 Inventory Management — FEFO (First Expired, First Out)
          <button className="ai-mini-add" onClick={addInv}>＋ เพิ่มรายการ</button>
        </div>

        {/* Alert Banner */}
        {(invAlerts > 0 || expiringSoon > 0) && (
          <div className="inv-alert-banner">
            {invAlerts > 0 && (
              <span className="inv-alert-item">🔴 {invAlerts} รายการต่ำกว่า Safety Stock</span>
            )}
            {expiringSoon > 0 && (
              <span className="inv-alert-item" style={{ color: '#f59e0b' }}>⚠️ {expiringSoon} ล็อตหมดอายุภายใน 30 วัน</span>
            )}
            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>FEFO = ใช้ล็อตที่หมดอายุก่อนออกก่อนเสมอ</span>
          </div>
        )}

        {/* KPI Strip */}
        <div className="inv-kpi-strip">
          {[
            { lbl: 'มูลค่าสินค้าคงคลัง', val: '฿' + totalInvValue.toLocaleString(), color: 'var(--rust)' },
            { lbl: 'รายการทั้งหมด', val: String(inv.length), color: 'var(--ink)' },
            { lbl: 'ต้องเติมสต็อก', val: String(invAlerts), color: invAlerts > 0 ? '#ef4444' : '#22c55e' },
            { lbl: 'ล็อตใกล้หมดอายุ', val: String(expiringSoon), color: expiringSoon > 0 ? '#f59e0b' : '#22c55e' },
          ].map(k => (
            <div key={k.lbl} className="inv-kpi-box">
              <div className="inv-kpi-box-val" style={{ color: k.color }}>{k.val}</div>
              <div className="inv-kpi-box-lbl">{k.lbl}</div>
            </div>
          ))}
        </div>

        {/* Category Filter */}
        <div className="inv-cat-tabs">
          {(['all', 'raw', 'wip', 'finished', 'spare'] as const).map(cat => (
            <button key={cat} className={`inv-cat-tab${invCat === cat ? ' active' : ''}`}
              onClick={() => setInvCat(cat)}>
              {cat === 'all' ? `ทั้งหมด (${inv.length})` : `${CAT_LABEL[cat as InventoryItem['category']]} (${inv.filter(x => x.category === cat).length})`}
            </button>
          ))}
        </div>

        {filteredInv.length === 0 && <p style={{ color: '#64748b', fontSize: 13 }}>ยังไม่มีรายการ — กด "+ เพิ่มรายการ"</p>}

        <div style={{ overflowX: 'auto' }}>
          <table className="inv-table">
            <thead>
              <tr>
                <th>ชื่อสินค้า / SKU</th>
                <th>หมวด</th>
                <th style={{ textAlign: 'right' }}>คงเหลือ</th>
                <th style={{ textAlign: 'right' }}>Min / Max</th>
                <th>FEFO — หมดอายุล็อตแรก</th>
                <th style={{ textAlign: 'right' }}>ราคา/หน่วย</th>
                <th style={{ textAlign: 'right' }}>มูลค่า</th>
                <th>สถานะ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredInv.map(item => {
                const qty = totalQty(item);
                const low = qty <= item.minQty;
                const near = qty <= item.minQty * 1.5 && qty > item.minQty;
                const exp = nearestExp(item);
                const es = expStatus(exp);
                const isExpanded = expandedInvId === item.id;
                const lotsSorted = fefoLots(item);

                return (
                  <>
                    <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => setExpandedInvId(isExpanded ? null : item.id)}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{item.name}</div>
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                          {item.sku && <span>{item.sku}</span>}
                          {item.sku && item.supplier && <span style={{ margin: '0 4px' }}>·</span>}
                          {item.supplier && <span>{item.supplier}</span>}
                        </div>
                      </td>
                      <td>
                        <span className="inv-fefo-chip" style={{ background: CAT_COLOR[item.category] + '1a', color: CAT_COLOR[item.category], border: '1px solid ' + CAT_COLOR[item.category] + '33' }}>
                          {CAT_LABEL[item.category]}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, color: low ? '#ef4444' : near ? '#f59e0b' : '#22c55e' }}>
                        {qty.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>{item.unit}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 12, color: '#64748b' }}>
                        {item.minQty} / {item.maxQty}
                      </td>
                      <td>
                        {exp ? (
                          <span className="inv-fefo-chip" style={{ background: EXP_COLOR[es] + '1a', color: EXP_COLOR[es], border: '1px solid ' + EXP_COLOR[es] + '33' }}>
                            📅 {exp} &nbsp;·&nbsp; {EXP_LABEL[es]}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#64748b' }}>— ไม่มีวันหมดอายุ</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 12 }}>
                        {item.costPerUnit > 0 ? '฿' + item.costPerUnit.toLocaleString() : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: 'var(--rust)' }}>
                        {item.costPerUnit > 0 ? '฿' + (qty * item.costPerUnit).toLocaleString() : '—'}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {low ? <span style={{ color: '#ef4444', fontWeight: 700 }}>🔴 เติมด่วน</span>
                          : near ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>🟡 ใกล้ขั้นต่ำ</span>
                          : <span style={{ color: '#22c55e' }}>🟢 ปกติ</span>}
                      </td>
                      <td onClick={e => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                        <button className="lean-tab" style={{ fontSize: 11, padding: '3px 8px', marginRight: 4, opacity: 1 }}
                          onClick={() => setExpandedInvId(isExpanded ? null : item.id)}>
                          {isExpanded ? '▼' : '▶'} ล็อต ({item.lots.length})
                        </button>
                        <button className="ai-task-del" onClick={() => delInv(item.id)}>×</button>
                      </td>
                    </tr>

                    {/* Expanded Lot Section */}
                    {isExpanded && (
                      <tr key={item.id + '-lots'}>
                        <td colSpan={9} className="inv-lot-section" style={{ padding: '0 0 12px 0' }}>
                          <div style={{ padding: '10px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#06b6d4' }}>📦 ล็อตสินค้า — เรียงตาม FEFO (ล็อตที่หมดอายุก่อน = ใช้ก่อน)</span>
                              <span style={{ fontSize: 11, color: '#64748b', marginLeft: 10 }}>รวมทุกล็อต: {qty.toLocaleString()} {item.unit}</span>
                            </div>
                            <button className="ai-mini-add" onClick={e => { e.stopPropagation(); addLot(item.id); }}>＋ รับล็อตใหม่</button>
                          </div>

                          {/* Editable fields row */}
                          <div style={{ padding: '0 16px 10px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <span style={{ fontSize: 10, color: '#64748b' }}>SKU</span>
                              <input defaultValue={item.sku} key={'sku' + item.id}
                                onBlur={e => patchInv(item.id, { sku: e.target.value })}
                                style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 6, padding: '3px 8px', color: 'var(--ink)', fontSize: 12, width: 110 }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <span style={{ fontSize: 10, color: '#64748b' }}>หน่วย</span>
                              <input defaultValue={item.unit} key={'unit' + item.id}
                                onBlur={e => patchInv(item.id, { unit: e.target.value })}
                                style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 6, padding: '3px 8px', color: 'var(--ink)', fontSize: 12, width: 70 }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <span style={{ fontSize: 10, color: '#64748b' }}>Safety Stock (ขั้นต่ำ)</span>
                              <input type="number" value={item.minQty}
                                onChange={e => patchInv(item.id, { minQty: +e.target.value })}
                                style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 6, padding: '3px 8px', color: 'var(--ink)', fontSize: 12, width: 80 }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <span style={{ fontSize: 10, color: '#64748b' }}>Max Stock</span>
                              <input type="number" value={item.maxQty}
                                onChange={e => patchInv(item.id, { maxQty: +e.target.value })}
                                style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 6, padding: '3px 8px', color: 'var(--ink)', fontSize: 12, width: 80 }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <span style={{ fontSize: 10, color: '#64748b' }}>ที่เก็บ</span>
                              <input defaultValue={item.location} key={'loc' + item.id}
                                onBlur={e => patchInv(item.id, { location: e.target.value })}
                                style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 6, padding: '3px 8px', color: 'var(--ink)', fontSize: 12, width: 100 }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <span style={{ fontSize: 10, color: '#64748b' }}>ซัพพลายเออร์</span>
                              <input defaultValue={item.supplier} key={'sup' + item.id}
                                onBlur={e => patchInv(item.id, { supplier: e.target.value })}
                                style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 6, padding: '3px 8px', color: 'var(--ink)', fontSize: 12, width: 130 }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <span style={{ fontSize: 10, color: '#64748b' }}>ราคา/หน่วย (฿)</span>
                              <input type="number" value={item.costPerUnit}
                                onChange={e => patchInv(item.id, { costPerUnit: +e.target.value })}
                                style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 6, padding: '3px 8px', color: 'var(--rust)', fontSize: 12, width: 90 }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <span style={{ fontSize: 10, color: '#64748b' }}>หมวดหมู่</span>
                              <select value={item.category}
                                onChange={e => patchInv(item.id, { category: e.target.value as InventoryItem['category'] })}
                                style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 6, padding: '3px 8px', color: 'var(--ink)', fontSize: 12 }}>
                                <option value="raw">วัตถุดิบ</option>
                                <option value="wip">WIP</option>
                                <option value="finished">สำเร็จรูป</option>
                                <option value="spare">อะไหล่</option>
                              </select>
                            </label>
                          </div>

                          {item.lots.length === 0 && (
                            <p style={{ padding: '0 16px', color: '#64748b', fontSize: 12 }}>ยังไม่มีล็อต — กด "＋ รับล็อตใหม่"</p>
                          )}

                          <table className="inv-lot-table">
                            <thead>
                              <tr>
                                <th style={{ width: 90 }}>FEFO</th>
                                <th>เลขล็อต / Batch</th>
                                <th>วันรับเข้า</th>
                                <th>วันผลิต</th>
                                <th>วันหมดอายุ</th>
                                <th style={{ textAlign: 'right' }}>จำนวน ({item.unit})</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {lotsSorted.map((lot, idx) => {
                                const ls = expStatus(lot.expDate);
                                const isFirst = idx === 0 && lot.qty > 0;
                                return (
                                  <tr key={lot.id} style={{ background: ls === 'expired' ? '#ef44440a' : ls === 'critical' ? '#ef44440a' : undefined }}>
                                    <td>
                                      {isFirst
                                        ? <span className="fefo-first-badge">🔵 ใช้ก่อน</span>
                                        : <span style={{ fontSize: 11, color: '#64748b' }}>#{idx + 1}</span>}
                                    </td>
                                    <td>
                                      <input defaultValue={lot.lotNo} key={'ln' + lot.id}
                                        onBlur={e => patchLot(item.id, lot.id, { lotNo: e.target.value })}
                                        style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 5, padding: '2px 7px', color: 'var(--ink)', fontSize: 12, width: 140 }} />
                                    </td>
                                    <td>
                                      <input type="date" value={lot.receivedDate}
                                        onChange={e => patchLot(item.id, lot.id, { receivedDate: e.target.value })}
                                        style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 5, padding: '2px 6px', color: 'var(--ink)', fontSize: 11 }} />
                                    </td>
                                    <td>
                                      <input type="date" value={lot.mfgDate}
                                        onChange={e => patchLot(item.id, lot.id, { mfgDate: e.target.value })}
                                        style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 5, padding: '2px 6px', color: 'var(--ink)', fontSize: 11 }} />
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <input type="date" value={lot.expDate ?? ''}
                                          onChange={e => patchLot(item.id, lot.id, { expDate: e.target.value || null })}
                                          style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 5, padding: '2px 6px', color: EXP_COLOR[ls], fontSize: 11, fontWeight: ls !== 'ok' && ls !== 'none' ? 700 : 400 }} />
                                        {lot.expDate && ls !== 'ok' && (
                                          <span className="inv-fefo-chip" style={{ background: EXP_COLOR[ls] + '1a', color: EXP_COLOR[ls], border: '1px solid ' + EXP_COLOR[ls] + '33', fontSize: 10 }}>
                                            {EXP_LABEL[ls]}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      <input type="number" min={0} value={lot.qty}
                                        onChange={e => patchLot(item.id, lot.id, { qty: Math.max(0, +e.target.value) })}
                                        style={{ background: 'var(--cream3)', border: '1px solid var(--sand)', borderRadius: 5, padding: '2px 7px', color: 'var(--ink)', fontSize: 12, width: 80, textAlign: 'right', fontWeight: 700 }} />
                                    </td>
                                    <td>
                                      <button className="ai-task-del" onClick={e => { e.stopPropagation(); delLot(item.id, lot.id); }}>×</button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>

                          {/* FEFO explainer */}
                          <div style={{ padding: '10px 16px 0', fontSize: 11, color: '#64748b' }}>
                            💡 <strong style={{ color: 'var(--ink)' }}>FEFO:</strong> เบิกจ่ายล็อตที่มี "🔵 ใช้ก่อน" เสมอ — ป้องกันสินค้าหมดอายุในคลัง
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── AI Agent Suggestions ── */}
      <section className="ai-panel" style={{ marginTop: 16 }}>
        <div className="ai-panel-hd">🤖 ทีม AI สำหรับโรงงาน
          <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}>C-Level = มีใน บริษัท AI แล้ว</span>
        </div>
        <div className="factory-agent-grid">
          {FACTORY_AGENTS.map(a => (
            <div key={a.role} className="factory-agent-card" style={{ border: a.isClevel ? '1px solid rgba(124,58,237,.4)' : '1px solid var(--sand)' }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{a.avatar}</div>
              {a.isClevel && (
                <div style={{ display: 'inline-block', background: 'rgba(124,58,237,.12)', color: '#7c3aed', borderRadius: 10, padding: '1px 8px', fontSize: 10, fontWeight: 700, marginBottom: 4 }}>C-Level AI</div>
              )}
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{a.role}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 10 }}>{a.mandate}</div>
              <button
                style={{ width: '100%', background: a.isClevel ? '#7c3aed' : 'var(--rust)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                onClick={() => alert(a.isClevel
                  ? `✅ "${a.role}" เป็น C-Level AI ที่มีอยู่แล้วใน บริษัท AI\n\nไปที่เมนู "บริษัท AI" เพื่อมอบหมายงานและติดตามผล`
                  : `✅ เพิ่ม "${a.role}" ในหน้า บริษัท AI แล้ว\n\nไปที่เมนู "บริษัท AI" เพื่อกำหนดหน้าที่และเริ่มดำเนินงาน`)}>
                {a.isClevel ? '→ ดูใน บริษัท AI' : '＋ เพิ่มใน บริษัท AI'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
