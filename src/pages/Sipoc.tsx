import { useState } from 'react';
import type { Agent, AppData, BMCData, SipocProcess } from '../types';
import EditableList from '../components/EditableList';

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
}

const isCLevelRole = (role: string) => /\bC[A-Z]O\b/i.test(role.trim());

// M-level ร่าง SIPOC ของสายงานตัวเอง อ้างอิง BMC ที่บอร์ดอนุมัติแล้ว
// รวมการออกแบบการจัดเก็บข้อมูล (dataStore) ของกระบวนการนั้น
function mSipocDraft(agent: Agent, bmc: BMCData): Omit<SipocProcess, 'id' | 'updatedAt'> {
  const r = agent.role.toLowerCase();
  const value = bmc.value[0] ?? 'คุณค่าหลักของบริษัท';
  const segment = bmc.segments[0] ?? 'กลุ่มลูกค้าหลัก';
  const channel = bmc.channels[0] ?? 'ช่องทางหลัก';
  const revenue = bmc.revenue[0] ?? 'รายได้หลัก';
  const base = { ownerId: agent.id };

  if (r.includes('marketing')) return { ...base,
    name: `Lead Generation & Campaign — ${agent.role}`,
    goal: `สร้าง Lead คุณภาพเข้าสู่ Funnel ให้สอดคล้องคุณค่า: ${value}`,
    suppliers: ['CMO (กลยุทธ์/งบประมาณ)', 'ทีมคอนเทนต์', 'แพลตฟอร์มโฆษณา/โซเชียล'],
    inputs: [`กลุ่มเป้าหมาย: ${segment}`, 'งบการตลาดรายเดือน', 'คอนเทนต์และครีเอทีฟ'],
    process: ['วางแผนแคมเปญรายเดือนตาม BMC', `เผยแพร่ผ่าน: ${channel}`, 'เก็บและคัดกรอง Lead', 'ส่งต่อทีมขายพร้อมรายงาน CPL'],
    outputs: ['Lead คุณภาพพร้อมข้อมูลติดต่อ', 'รายงานแคมเปญ (CPL / Conversion)'],
    customers: ['Sales Manager / ทีมขาย', 'CMO'],
    dataStore: ['ตาราง leads — id, ชื่อ, ช่องทางที่มา, สถานะ, วันที่สร้าง', 'ตาราง campaigns — id, ชื่อ, งบ, ช่องทาง, CPL, ผลลัพธ์', 'Dashboard เชื่อมข้อมูลเข้า Conversion Funnel'],
  };
  if (r.includes('sales')) return { ...base,
    name: `Sales Pipeline — ${agent.role}`,
    goal: `ปิดการขายจาก Lead สู่รายได้: ${revenue}`,
    suppliers: ['Marketing Manager (Lead)', 'CMO (เป้าการขาย)'],
    inputs: ['Lead ที่ผ่านการคัดกรอง', `ข้อเสนอคุณค่า: ${value}`, 'ราคาและเงื่อนไข'],
    process: ['ติดต่อและนัดหมาย Lead', 'นำเสนอ/สาธิตตามความต้องการ', 'เจรจาและปิดการขาย', 'ส่งมอบให้ทีมดูแลลูกค้า'],
    outputs: ['ดีลที่ปิดได้ + สัญญา', 'Sales Forecast รายเดือน'],
    customers: [segment, 'CFO (ข้อมูลรายได้)'],
    dataStore: ['ตาราง deals — id, ลูกค้า, มูลค่า, stage, วันที่คาดปิด', 'ตาราง activities — การติดต่อ/นัดหมายต่อดีล', 'รายงาน Pipeline เชื่อม ROI Calculator'],
  };
  if (r.includes('finance') || r.includes('account')) return { ...base,
    name: `Financial Reporting — ${agent.role}`,
    goal: `รายงานการเงินถูกต้องตรงเวลา รองรับ ${revenue}`,
    suppliers: ['ทีมขาย (ข้อมูลรายได้)', 'ทุกแผนก (ค่าใช้จ่าย)', 'ธนาคาร/Payment Gateway'],
    inputs: ['รายการรับ-จ่ายประจำเดือน', 'ใบแจ้งหนี้/ใบกำกับภาษี', 'งบประมาณที่ CFO อนุมัติ'],
    process: ['บันทึกและกระทบยอดรายการ', 'จัดทำงบรายเดือน + กระแสเงินสด', 'วิเคราะห์ต้นทุน/ROI', 'เสนอ CFO ทบทวน'],
    outputs: ['งบการเงินรายเดือน', 'รายงาน Cash Flow และ Budget vs Actual'],
    customers: ['CFO', 'บอร์ด (Management Review)'],
    dataStore: ['ตาราง transactions — id, ประเภท, จำนวนเงิน, หมวด, วันที่', 'ตาราง invoices — เชื่อมระบบ Billing/PromptPay', 'รายงานสรุปเชื่อม SaaS Analytics'],
  };
  if (r.includes('operation') || r.includes('project')) return { ...base,
    name: `Operations & Delivery — ${agent.role}`,
    goal: `ส่งมอบ ${value} ให้ลูกค้าตรงเวลาและมีคุณภาพ`,
    suppliers: ['ทีมขาย (คำสั่งซื้อ/ดีล)', 'COO (มาตรฐาน/SLA)', 'ซัพพลายเออร์ภายนอก'],
    inputs: ['คำสั่งซื้อ/ขอบเขตงานที่ปิดได้', 'ทรัพยากรและทีมงาน', 'SOP/มาตรฐานการส่งมอบ'],
    process: ['วางแผนงานและมอบหมายทีม', 'ดำเนินงานตาม SOP', 'ตรวจคุณภาพก่อนส่งมอบ', 'เก็บ Feedback หลังส่งมอบ'],
    outputs: ['งานที่ส่งมอบตาม SLA', 'รายงานสถานะและปัญหา'],
    customers: [segment, 'COO'],
    dataStore: ['ตาราง work_orders — id, ลูกค้า, สถานะ, กำหนดส่ง', 'ตาราง issues — ปัญหา/NC ต่องาน', 'บอร์ดสถานะเชื่อม Priority Actions'],
  };
  if (r.includes('content')) return { ...base,
    name: `Content Production — ${agent.role}`,
    goal: `ผลิตคอนเทนต์สื่อสารคุณค่า: ${value}`,
    suppliers: ['CMO/Marketing Manager (บรีฟ)', 'ข้อมูลจาก Personas'],
    inputs: ['Content Plan รายเดือน', `โจทย์กลุ่มเป้าหมาย: ${segment}`, 'แบรนด์ไกด์ไลน์'],
    process: ['วางตารางผลิตรายสัปดาห์', 'ผลิต/ตรวจคุณภาพคอนเทนต์', `เผยแพร่ตามช่องทาง: ${channel}`, 'วัดผลและปรับปรุง'],
    outputs: ['คอนเทนต์พร้อมเผยแพร่ตามแผน', 'รายงาน Engagement'],
    customers: ['Marketing Manager', segment],
    dataStore: ['ตาราง contents — id, หัวข้อ, ช่องทาง, สถานะ, วันเผยแพร่', 'สถิติ engagement ต่อชิ้น เชื่อม Content Plan'],
  };
  if (r.includes('product')) return { ...base,
    name: `Product Development — ${agent.role}`,
    goal: `พัฒนาผลิตภัณฑ์ตาม Roadmap ให้ตอบ ${value}`,
    suppliers: ['CPO (Roadmap)', 'ลูกค้า (Feedback)', 'ทีมพัฒนา'],
    inputs: ['Product Roadmap รายไตรมาส', 'Feedback/Feature Request', 'ผลวิเคราะห์การใช้งาน'],
    process: ['จัดลำดับ Backlog', 'พัฒนาและทดสอบ', 'ปล่อยฟีเจอร์ + วัดผล', 'วนรอบปรับปรุง'],
    outputs: ['ฟีเจอร์ที่ปล่อยตามแผน', 'Release Notes และผลวัด'],
    customers: [segment, 'CPO'],
    dataStore: ['ตาราง backlog — id, ฟีเจอร์, priority, สถานะ', 'ตาราง releases — เวอร์ชัน, วันที่, ผลวัด', 'เชื่อมข้อมูลเข้า Product Roadmap'],
  };
  return { ...base,
    name: `กระบวนการหลัก — ${agent.role}`,
    goal: `ส่งมอบงานในสายงานให้สอดคล้อง BMC: ${value}`,
    suppliers: ['ผู้บังคับบัญชา (นโยบาย/เป้าหมาย)', 'แผนกที่เกี่ยวข้อง'],
    inputs: ['เป้าหมายและขอบเขตงาน', 'ข้อมูล/ทรัพยากรที่จำเป็น'],
    process: ['วางแผนงานรายสัปดาห์', 'ดำเนินงานตามบทบาทหน้าที่', 'รายงานผลต่อผู้บังคับบัญชา'],
    outputs: ['ผลงานตามขอบเขตที่รับผิดชอบ', 'รายงานประจำสัปดาห์'],
    customers: ['ผู้บังคับบัญชา', segment],
    dataStore: ['ตารางบันทึกงาน — id, งาน, สถานะ, กำหนดส่ง', 'รายงานสรุปรายสัปดาห์'],
  };
}

type SipocListKey = 'suppliers' | 'inputs' | 'process' | 'outputs' | 'customers';

// 5 องค์ประกอบของ SIPOC — เรียงตามการไหลของกระบวนการ
const COLUMNS: { key: SipocListKey; code: string; label: string; hint: string; color: string }[] = [
  { key: 'suppliers', code: 'S', label: 'Supplier · ผู้ส่งมอบ', hint: 'ใครส่งทรัพยากร/ข้อมูลให้เรา?', color: '#6aa9e9' },
  { key: 'inputs', code: 'I', label: 'Input · ปัจจัยนำเข้า', hint: 'ทรัพยากร ข้อมูล วัตถุดิบที่ได้รับ?', color: '#d98e3d' },
  { key: 'process', code: 'P', label: 'Process · กระบวนการ', hint: 'ขั้นตอนเปลี่ยน Input → Output?', color: '#e0704f' },
  { key: 'outputs', code: 'O', label: 'Output · ผลลัพธ์', hint: 'ผลิตภัณฑ์/บริการที่ออกมา?', color: '#52b788' },
  { key: 'customers', code: 'C', label: 'Customer · ผู้รับผลลัพธ์', hint: 'ใครได้รับผลลัพธ์จากกระบวนการ?', color: '#a78bfa' },
];

export default function Sipoc({ data, onUpdate }: Props) {
  const list = data.sipoc ?? [];
  const [activeId, setActiveId] = useState<string | null>(list[0]?.id ?? null);
  const [genMsg, setGenMsg] = useState<string | null>(null);
  const active = list.find(p => p.id === activeId) ?? list[0];

  const save = (next: SipocProcess[]) => onUpdate({ ...data, sipoc: next });

  // M-level = ไม่ใช่ C-level และรายงานต่อ C-level (หรือ role มีคำว่า Manager)
  const cIds = new Set(data.aiCompany.agents.filter(a => isCLevelRole(a.role)).map(a => a.id));
  const mAgents = data.aiCompany.agents.filter(a =>
    !isCLevelRole(a.role) && (/manager/i.test(a.role) || (a.reportsTo != null && cIds.has(a.reportsTo))));

  // M-level แต่ละคนสร้าง SIPOC ของสายงานตัวเองจาก BMC ที่อนุมัติ
  // พร้อมออกแบบการจัดเก็บข้อมูล และรับงานทบทวนเข้า Kanban
  function mLevelBuildSipoc() {
    if (mAgents.length === 0) {
      setGenMsg('⚠️ ยังไม่มี M-level ในผังองค์กร — ให้ C-level กด "ขอเพิ่ม M-level" ในหน้า บริษัท AI แล้วบอร์ดอนุมัติก่อน');
      return;
    }
    const bmc = data.businessModel.bmc;
    const existingOwners = new Set(list.map(p => p.ownerId).filter(Boolean));
    const created: SipocProcess[] = [];
    const tasks = [...data.aiCompany.tasks];
    mAgents.forEach((m, i) => {
      if (existingOwners.has(m.id)) return; // มี SIPOC ของตัวเองแล้ว
      const draft = mSipocDraft(m, bmc);
      const proc: SipocProcess = {
        ...draft,
        id: 'sp-m-' + Date.now().toString(36) + i,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      created.push(proc);
      tasks.push({
        id: 't-sipoc-' + Date.now().toString(36) + i,
        agentId: m.id,
        title: `ทบทวน SIPOC + การจัดเก็บข้อมูล: ${proc.name}`,
        detail: `ตรวจทาน SIPOC ที่ร่างจาก BMC ที่บอร์ดอนุมัติ (คุณค่า: ${bmc.value[0] ?? '-'})\nปรับ Supplier/Input/Process/Output/Customer ให้ตรงงานจริง และยืนยันโครงสร้างการจัดเก็บข้อมูลของกระบวนการในหน้า SIPOC Process`,
        status: 'queued',
      });
    });
    if (created.length === 0) {
      setGenMsg('✅ M-level ทุกคนมี SIPOC ของตัวเองแล้ว');
      return;
    }
    onUpdate({ ...data, sipoc: [...list, ...created], aiCompany: { ...data.aiCompany, tasks } });
    setActiveId(created[0].id);
    setGenMsg(`✅ M-level สร้าง SIPOC ${created.length} กระบวนการจาก BMC ที่อนุมัติ (${created.map(p => data.aiCompany.agents.find(a => a.id === p.ownerId)?.role).join(', ')}) พร้อมออกแบบการจัดเก็บข้อมูล — ส่งงานทบทวนเข้า Kanban แล้ว`);
  }
  const patchProc = (id: string, patch: Partial<SipocProcess>) =>
    save(list.map(p => p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString().slice(0, 10) } : p));

  function addProcess() {
    const p: SipocProcess = {
      id: 'sp-' + Date.now().toString(36),
      name: 'กระบวนการใหม่ (ระบุจุดเริ่มต้น–จุดสิ้นสุด)',
      goal: '',
      suppliers: [], inputs: [], process: [], outputs: [], customers: [],
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    save([...list, p]);
    setActiveId(p.id);
  }
  function delProcess(id: string) {
    if (!window.confirm('ลบกระบวนการนี้ออกจาก SIPOC?')) return;
    const next = list.filter(p => p.id !== id);
    save(next);
    setActiveId(next[0]?.id ?? null);
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">SIPOC · Process Management</div>
        <div className="page-meta">
          <span className="meta-chip">Supplier → Input → Process → Output → Customer</span>
          <span className="meta-chip">{list.length} กระบวนการ</span>
        </div>
      </div>

      <p className="sipoc-intro">
        มองเห็นภาพรวมกระบวนการธุรกิจตั้งแต่ต้นทางถึงปลายทาง หา Gap และคอขวดของข้อมูล —
        กระบวนการที่นิ่งแล้วจึงพร้อมทำ Automation
      </p>

      {/* Process tabs */}
      <div className="sipoc-tabs">
        {list.map(p => (
          <button key={p.id} className={`sipoc-tab${active?.id === p.id ? ' active' : ''}`} onClick={() => setActiveId(p.id)}>
            {p.name}
          </button>
        ))}
        <button className="sipoc-add" onClick={addProcess}>＋ เพิ่มกระบวนการ</button>
        <button className="sipoc-gen" onClick={mLevelBuildSipoc}
          title="M-level แต่ละคนสร้าง SIPOC ของสายงานตัวเองจาก BMC ที่บอร์ดอนุมัติ พร้อมออกแบบการจัดเก็บข้อมูล">
          ✦ ให้ M-level สร้าง SIPOC จาก BMC
        </button>
      </div>

      {genMsg && <div className="sipoc-gen-msg">{genMsg}</div>}

      {!active && <div className="sipoc-empty">ยังไม่มีกระบวนการ — กด "＋ เพิ่มกระบวนการ" เพื่อเริ่มวิเคราะห์ SIPOC</div>}

      {active && (
        <div className="sipoc-board" key={active.id}>
          {/* Process header */}
          <div className="sipoc-proc-hd">
            <div className="sipoc-proc-main">
              <input className="sipoc-proc-name" defaultValue={active.name} key={'n' + active.id}
                onBlur={e => patchProc(active.id, { name: e.target.value })} spellCheck={false} />
              <input className="sipoc-proc-goal" defaultValue={active.goal} key={'g' + active.id}
                placeholder="ขอบเขต/ผลลัพธ์ที่คาดหวังของกระบวนการนี้…"
                onBlur={e => patchProc(active.id, { goal: e.target.value })} spellCheck={false} />
            </div>
            <div className="sipoc-proc-side">
              <label className="sipoc-owner">
                ผู้รับผิดชอบ
                <select value={active.ownerId ?? ''} onChange={e => patchProc(active.id, { ownerId: e.target.value || undefined })}>
                  <option value="">— เลือกเอเจนต์ —</option>
                  {data.aiCompany.agents.map(a => <option key={a.id} value={a.id}>{a.role} · {a.name}</option>)}
                </select>
              </label>
              <span className="sipoc-updated">อัปเดต {active.updatedAt}</span>
              <button className="sipoc-del" onClick={() => delProcess(active.id)}>× ลบกระบวนการ</button>
            </div>
          </div>

          {/* 5 columns S-I-P-O-C */}
          <div className="sipoc-grid">
            {COLUMNS.map((col, ci) => (
              <div key={col.key} className="sipoc-col" style={{ '--col-color': col.color } as React.CSSProperties}>
                <div className="sipoc-col-hd">
                  <span className="sipoc-col-code">{col.code}</span>
                  <div>
                    <div className="sipoc-col-label">{col.label}</div>
                    <div className="sipoc-col-hint">{col.hint}</div>
                  </div>
                </div>
                <EditableList
                  items={active[col.key]}
                  itemKey={`sipoc-${active.id}-${col.key}`}
                  onSave={(idx, val) => {
                    const arr = [...active[col.key]];
                    arr[idx] = val;
                    patchProc(active.id, { [col.key]: arr });
                  }}
                  onAdd={() => patchProc(active.id, { [col.key]: [...active[col.key], 'รายการใหม่'] })}
                  onDelete={idx => patchProc(active.id, { [col.key]: active[col.key].filter((_, i) => i !== idx) })}
                  multiline={false}
                  addLabel="＋ เพิ่ม"
                />
                {ci < COLUMNS.length - 1 && <span className="sipoc-arrow">→</span>}
              </div>
            ))}
          </div>

          {/* การจัดเก็บข้อมูลของกระบวนการ — ออกแบบโดย M-level ผู้รับผิดชอบ */}
          <div className="sipoc-ds">
            <div className="sipoc-ds-hd">
              🗄️ การจัดเก็บข้อมูลของกระบวนการ
              <span className="sipoc-ds-sub">
                ออกแบบโดยผู้รับผิดชอบ — เก็บใน AppData (sync Supabase อัตโนมัติ ไม่ต้องมีตารางแยก)
              </span>
            </div>
            <EditableList
              items={active.dataStore ?? []}
              itemKey={`sipoc-ds-${active.id}`}
              onSave={(idx, val) => {
                const arr = [...(active.dataStore ?? [])];
                arr[idx] = val;
                patchProc(active.id, { dataStore: arr });
              }}
              onAdd={() => patchProc(active.id, { dataStore: [...(active.dataStore ?? []), 'ตาราง/แหล่งข้อมูลใหม่ — ระบุฟิลด์สำคัญ'] })}
              onDelete={idx => patchProc(active.id, { dataStore: (active.dataStore ?? []).filter((_, i) => i !== idx) })}
              multiline={false}
              addLabel="＋ เพิ่มโครงสร้างข้อมูล"
            />
          </div>
        </div>
      )}
    </div>
  );
}
