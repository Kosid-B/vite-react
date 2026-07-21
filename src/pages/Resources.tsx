import { useMemo, useState } from 'react';
import type { AppData } from '../types';
import { track } from '../lib/analytics';
import {
  RESOURCE_CATEGORIES, RESOURCE_TEMPLATES, resourceSummary,
  suggestReallocation, parseAiAllocations, newResourceId, newRequestId,
  type Resource, type ResourceRequest, type ResourceCategory, type ResourcesState, type AiAllocation,
} from '../lib/resources';
import { isBigRequest, approveResourceRequest, rejectResourceRequest } from '../lib/resourceBridge';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import { trackAiCall } from '../lib/usage';
import type { PageId } from '../types';

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
  onNavigate: (page: PageId) => void;
}

const CATS = Object.keys(RESOURCE_CATEGORIES) as ResourceCategory[];

export default function Resources({ data, onUpdate, onNavigate }: Props) {
  const state: ResourcesState = useMemo(() => data.resources ?? { items: [], requests: [] }, [data.resources]);
  const agents = data.aiCompany?.agents ?? [];
  const summary = useMemo(() => resourceSummary(state), [state]);
  const pending = state.requests.filter((q) => q.status === 'pending');
  const history = state.requests.filter((q) => q.status !== 'pending').slice(0, 8);

  const [reqFor, setReqFor] = useState<string | null>(null);
  const [reqType, setReqType] = useState<'add' | 'reduce'>('add');
  const [reqAmount, setReqAmount] = useState(1);
  const [reqReason, setReqReason] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  // ฟอร์มเพิ่มทรัพยากรใหม่
  const [nName, setNName] = useState('');
  const [nCat, setNCat] = useState<ResourceCategory>('tools');
  const [nUnit, setNUnit] = useState('หน่วย');
  const [nQty, setNQty] = useState(1);
  const [nCost, setNCost] = useState(0);

  function save(next: ResourcesState) {
    onUpdate({ ...data, resources: next });
  }
  const agentName = (id?: string) => agents.find((a) => a.id === id)?.name ?? '—';
  const ownerFor = (role: string) => agents.find((a) => a.role.toUpperCase().includes(role))?.id;

  function seed() {
    const items: Resource[] = RESOURCE_TEMPLATES.map((t) => ({
      ...t, id: newResourceId(), createdAt: new Date().toISOString(),
      ownerAgentId: ownerFor(RESOURCE_CATEGORIES[t.category].defaultOwner),
    }));
    save({ ...state, items: [...items, ...state.items] });
    setMsg(`✅ เพิ่มทรัพยากรตั้งต้น ${items.length} รายการ (มอบ C-Level ดูแลตามหมวด)`);
  }

  function setField(id: string, patch: Partial<Resource>) {
    save({ ...state, items: state.items.map((r) => r.id === id ? { ...r, ...patch } : r) });
  }
  function del(id: string) {
    if (!window.confirm('ลบทรัพยากรนี้?')) return;
    save({ ...state, items: state.items.filter((r) => r.id !== id) });
  }
  function addNew() {
    if (!nName.trim()) { setMsg('กรอกชื่อทรัพยากรก่อน'); return; }
    const r: Resource = {
      id: newResourceId(), name: nName.trim(), category: nCat, unit: nUnit.trim() || 'หน่วย',
      quantity: Math.max(0, nQty), unitCost: nCost > 0 ? nCost : undefined,
      ownerAgentId: ownerFor(RESOURCE_CATEGORIES[nCat].defaultOwner), createdAt: new Date().toISOString(),
    };
    save({ ...state, items: [r, ...state.items] });
    setNName(''); setNQty(1); setNCost(0);
    setMsg(`✅ เพิ่ม "${r.name}" แล้ว`);
  }

  // C-Level ยื่นคำขอเพิ่ม/ลด → เข้าคิวรออนุมัติ
  function openReq(r: Resource, type: 'add' | 'reduce') {
    setReqFor(r.id); setReqType(type); setReqAmount(1); setReqReason('');
  }
  function submitReq(r: Resource) {
    if (reqAmount <= 0) { setMsg('จำนวนต้องมากกว่า 0'); return; }
    const impact = r.unitCost ? `งบ ${reqType === 'add' ? '+' : '-'}฿${(r.unitCost * reqAmount).toLocaleString('en-US')}/เดือน` : undefined;
    const req: ResourceRequest = {
      id: newRequestId(), type: reqType, resourceId: r.id, amount: reqAmount,
      agentId: r.ownerAgentId, reason: reqReason.trim() || (reqType === 'add' ? 'ขอเพิ่มเพื่อรองรับงาน' : 'ขอลดเพื่อคุมต้นทุน'),
      impact, status: 'pending', at: new Date().toISOString().slice(0, 10),
    };
    save({ ...state, requests: [req, ...state.requests] });
    setReqFor(null);
    track('resource_request', { type: reqType, category: r.category });
    setMsg(`📨 ${agentName(r.ownerAgentId)} ยื่นคำขอ${reqType === 'add' ? 'เพิ่ม' : 'ลด'} "${r.name}" — รอ CEO อนุมัติ`);
  }

  const today = () => new Date().toISOString().slice(0, 10);
  function approve(id: string) {
    // CEO อนุมัติเอง (คำขอเล็ก) → ปรับจำนวน + ไหลเข้าเป็นรายจ่ายใน finance อัตโนมัติ
    onUpdate(approveResourceRequest(data, id, { viaBoard: false, today: today() }));
    track('resource_decision', { status: 'approved' });
    setMsg('✅ CEO อนุมัติ — ปรับจำนวน + บันทึกเป็นรายจ่ายในการเงินแล้ว');
  }
  function reject(id: string) {
    onUpdate(rejectResourceRequest(data, id));
    setMsg('ปฏิเสธคำขอแล้ว');
  }

  /** 📨 จ้างภายนอกแทนการเพิ่มทรัพยากรเอง → ร่างประกาศงานกลาง (RFQ) แล้วพาไปหน้าซื้อขาย B2B
   *  สร้าง demand แบบ organic จากงานที่เกิดในแอปอยู่แล้ว (ไม่ต้องสอนผู้ใช้เปิด RFQ ใหม่) */
  function outsourceViaRfq(r: Resource) {
    const cm = RESOURCE_CATEGORIES[r.category];
    const sector = (data.aiCompany?.productDbd ?? '').match(/^\[([A-Z])\]/)?.[1] ?? '';
    const prefill = {
      title: `จัดหา/จ้างภายนอก: ${r.name}`,
      detail: [
        `ต้องการ: ${r.name} (${cm.label})`,
        `ปริมาณโดยประมาณ: ${r.quantity > 0 ? r.quantity + ' ' + r.unit : '(ระบุ)'}`,
        'กำหนดส่ง: (ระบุวันที่ต้องการ)',
        'เกณฑ์ตัดสิน: ราคา + ประสบการณ์/ผลงาน',
      ].join('\n'),
      sector,
    };
    sessionStorage.setItem('rfq_open_prefill', JSON.stringify(prefill));
    track('rfq_from_outsource', { category: r.category });
    onNavigate('trade');
  }

  // แปลงข้อเสนอ (จาก AI หรือ heuristic) → คำขอ pending
  function pushAllocations(allocs: AiAllocation[], tag: string): number {
    const reqs: ResourceRequest[] = allocs.map((s) => {
      const r = s.resourceId ? state.items.find((x) => x.id === s.resourceId) : undefined;
      const unitCost = s.type === 'new' ? undefined : r?.unitCost;
      return {
        id: newRequestId(), type: s.type, resourceId: s.resourceId, resourceName: s.resourceName,
        category: s.category, amount: s.amount, agentId: r?.ownerAgentId, reason: tag + s.reason,
        impact: unitCost ? `งบ ${s.type === 'add' ? '+' : '-'}฿${(unitCost * s.amount).toLocaleString('en-US')}/เดือน` : undefined,
        status: 'pending', at: new Date().toISOString().slice(0, 10),
      };
    });
    save({ ...state, requests: [...reqs, ...state.requests] });
    return reqs.length;
  }

  // ให้ AI (agent-run) วิเคราะห์ทรัพยากรจริง → เสนอคำขอ · fallback heuristic เมื่อไม่มี AI/พัง
  async function aiAllocate() {
    setMsg(null);
    if (isSupabaseEnabled && supabase && state.items.length) {
      setAiBusy(true);
      try {
        const agent = agents.find((a) => /COO|CFO|ปฏิบัติการ|การเงิน/i.test(a.role))
          ?? agents.find((a) => a.role.toUpperCase() !== 'CEO') ?? agents[0];
        trackAiCall();
        const listText = state.items.map((r) =>
          `- ${r.name} (${RESOURCE_CATEGORIES[r.category].label}): ${r.quantity} ${r.unit}${r.unitCost ? ` @ ฿${r.unitCost}/หน่วย` : ''}`).join('\n');
        const { data: res, error } = await supabase.functions.invoke('agent-run', {
          body: {
            role: agent?.role ?? 'COO', name: agent?.name ?? 'ผู้บริหารทรัพยากร',
            mandate: 'บริหารจัดสรรทรัพยากรธุรกิจให้มีประสิทธิภาพสูงสุด คุมต้นทุน และเติมของที่ขาด',
            title: 'วิเคราะห์และจัดสรรทรัพยากร',
            detail: `ทรัพยากรปัจจุบัน:\n${listText}\n\nวิเคราะห์ว่าควร เพิ่ม/ลด/เพิ่มทรัพยากรใหม่ อะไรเพื่อประสิทธิภาพสูงสุด ` +
              `แล้วตอบเป็น JSON array เท่านั้น: [{"resource":"ชื่อ","action":"add|reduce|new","amount":ตัวเลข,"category":"people|capital|tools|data|marketing|material|infra","reason":"เหตุผลสั้น"}] ห้ามมีข้อความอื่นนอก JSON`,
            goal: data.aiCompany?.goal ?? '', industry: data.aiCompany?.industry ?? '',
          },
        });
        if (error) throw error;
        const allocs = parseAiAllocations(String(res?.output ?? ''), state.items);
        if (allocs.length) {
          const n = pushAllocations(allocs, '🤖 AI วิเคราะห์: ');
          track('resource_ai_allocate', { count: n, source: 'agent-run' });
          setMsg(`🤖 AI (${agent?.role ?? 'COO'}) วิเคราะห์แล้วเสนอ ${n} คำขอ — รอ CEO/บอร์ดอนุมัติด้านล่าง`);
          return;
        }
        setMsg('🤖 AI วิเคราะห์แล้วไม่พบข้อเสนอชัดเจน — ลองการจัดสรรพื้นฐานแทน');
      } catch (e) {
        setMsg('AI วิเคราะห์ไม่สำเร็จ: ' + ((e as Error).message || 'error') + ' — ใช้การจัดสรรพื้นฐานแทน');
      } finally {
        setAiBusy(false);
      }
    }
    // fallback: heuristic (โหมด local หรือ AI ไม่ให้ผล)
    const sugg = suggestReallocation(state);
    if (!sugg.length) { setMsg('ทรัพยากรจัดสรรเหมาะสมแล้ว — ไม่มีข้อเสนอเพิ่ม'); return; }
    const n = pushAllocations(sugg.map((s) => ({ type: s.type, resourceId: s.resourceId, amount: s.amount, reason: s.reason })), '🤖 AI จัดสรร (พื้นฐาน): ');
    track('resource_ai_allocate', { count: n, source: 'heuristic' });
    setMsg(`เสนอ ${n} คำขอจัดสรร (พื้นฐาน) — รอ CEO อนุมัติด้านล่าง`);
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">บริหารทรัพยากร</div>
        <div className="page-meta">
          <span className="meta-chip">{summary.count} รายการ</span>
          <span className="meta-chip">฿{summary.totalMonthlyCost.toLocaleString('en-US')}/เดือน</span>
          {summary.pendingRequests > 0 && <span className="meta-chip rc-chip-warn">{summary.pendingRequests} รออนุมัติ</span>}
        </div>
      </div>

      <p className="rc-intro">
        รายการ + จำนวนทรัพยากรที่ธุรกิจต้องใช้ · <strong>C-Level</strong> (ตามที่ CEO มอบบทบาท) ดูแลแต่ละหมวด
        และ<strong>ยื่นคำขอเพิ่ม/ลด</strong> → <strong>CEO อนุมัติ</strong> ก่อนปรับจริง · กด "AI จัดสรร" ให้ระบบเสนอปรับให้มีประสิทธิภาพ
      </p>
      {msg && <div className="rc-msg">{msg}</div>}

      <div className="rc-toolbar">
        {state.items.length === 0 && <button className="rc-btn-primary" onClick={seed}>+ เพิ่มทรัพยากรตั้งต้น 7 รายการ</button>}
        <button className="rc-btn" onClick={aiAllocate} disabled={aiBusy}>
          {aiBusy ? '⏳ AI กำลังวิเคราะห์…' : '🤖 ให้ AI จัดสรร (เสนอคำขอ)'}
        </button>
      </div>

      {/* รายการทรัพยากร */}
      {state.items.length === 0 ? (
        <div className="rc-empty">ยังไม่มีทรัพยากร — กด "เพิ่มทรัพยากรตั้งต้น" หรือเพิ่มเองด้านล่าง</div>
      ) : (
        <div className="rc-list">
          {state.items.map((r) => {
            const cm = RESOURCE_CATEGORIES[r.category];
            const cost = r.unitCost ? r.unitCost * r.quantity : 0;
            return (
              <div className="rc-item" key={r.id} style={{ borderLeftColor: cm.color }}>
                <div className="rc-item-main">
                  <div className="rc-item-top">
                    <span className="rc-cat" style={{ background: cm.color }}>{cm.icon} {cm.label}</span>
                    <span className="rc-item-name">{r.name}</span>
                  </div>
                  <div className="rc-item-fields">
                    <label>จำนวน
                      <input type="number" min={0} value={r.quantity}
                        onChange={(e) => setField(r.id, { quantity: Math.max(0, Number(e.target.value) || 0) })} />
                    </label>
                    <span className="rc-unit">{r.unit}</span>
                    {r.unitCost ? <span className="rc-cost">฿{cost.toLocaleString('en-US')}/เดือน</span> : <span className="rc-cost rc-cost-none">—</span>}
                    <label>ดูแลโดย (C-Level)
                      <select value={r.ownerAgentId ?? ''} onChange={(e) => setField(r.id, { ownerAgentId: e.target.value || undefined })}>
                        <option value="">— ยังไม่มอบ —</option>
                        {agents.map((a) => <option key={a.id} value={a.id}>{a.role} · {a.name}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
                <div className="rc-item-actions">
                  <button className="rc-req-add" onClick={() => openReq(r, 'add')}>＋ ขอเพิ่ม</button>
                  <button className="rc-req-red" onClick={() => openReq(r, 'reduce')}>－ ขอลด</button>
                  <button className="rc-req-out" onClick={() => outsourceViaRfq(r)}
                    title="แทนการซื้อ/จ้างประจำ — โพสต์หาผู้รับงานภายนอกผ่านตลาด B2B (RFQ)">📨 จ้างภายนอก</button>
                  <button className="rc-del" onClick={() => del(r.id)}>ลบ</button>
                </div>

                {reqFor === r.id && (
                  <div className="rc-reqform">
                    <div className="rc-reqform-hd">คำขอ{reqType === 'add' ? 'เพิ่ม' : 'ลด'} "{r.name}" (โดย {agentName(r.ownerAgentId)}) → รอ CEO อนุมัติ</div>
                    <div className="rc-reqform-row">
                      <label>จำนวน<input type="number" min={1} value={reqAmount} onChange={(e) => setReqAmount(Math.max(1, Number(e.target.value) || 1))} /></label>
                      <label>เหตุผล<input value={reqReason} onChange={(e) => setReqReason(e.target.value)} placeholder={reqType === 'add' ? 'เช่น รับงานเพิ่ม' : 'เช่น ใช้ไม่เต็มประสิทธิภาพ'} /></label>
                      <button className="rc-btn-primary" onClick={() => submitReq(r)}>ยื่นคำขอ</button>
                      <button className="rc-del" onClick={() => setReqFor(null)}>ยกเลิก</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* เพิ่มทรัพยากรใหม่ */}
      <div className="rc-sec-hd">➕ เพิ่มทรัพยากรเอง</div>
      <div className="rc-addform">
        <input className="rc-add-name" value={nName} onChange={(e) => setNName(e.target.value)} placeholder="ชื่อทรัพยากร" />
        <select value={nCat} onChange={(e) => setNCat(e.target.value as ResourceCategory)}>
          {CATS.map((c) => <option key={c} value={c}>{RESOURCE_CATEGORIES[c].icon} {RESOURCE_CATEGORIES[c].label}</option>)}
        </select>
        <input className="rc-add-unit" value={nUnit} onChange={(e) => setNUnit(e.target.value)} placeholder="หน่วย" />
        <input type="number" min={0} value={nQty} onChange={(e) => setNQty(Number(e.target.value) || 0)} title="จำนวน" />
        <input type="number" min={0} value={nCost} onChange={(e) => setNCost(Number(e.target.value) || 0)} title="ต้นทุน/หน่วย (บาท)" placeholder="฿/หน่วย" />
        <button className="rc-btn-primary" onClick={addNew}>+ เพิ่ม</button>
      </div>

      {/* คำขอรออนุมัติ */}
      <div className="rc-sec-hd">📨 คำขอรอ CEO อนุมัติ ({pending.length})</div>
      {pending.length === 0 ? (
        <div className="rc-empty">ไม่มีคำขอค้าง</div>
      ) : (
        <div className="rc-reqs">
          {pending.map((q) => {
            const r = state.items.find((x) => x.id === q.resourceId);
            return (
              <div className="rc-req" key={q.id}>
                <div className="rc-req-info">
                  <span className={`rc-req-type rc-${q.type}`}>{q.type === 'add' ? '＋ เพิ่ม' : q.type === 'reduce' ? '－ ลด' : '✦ ใหม่'} {q.amount}</span>
                  <span className="rc-req-name">{r?.name ?? q.resourceName ?? 'ทรัพยากร'}</span>
                  <span className="rc-req-by">โดย {agentName(q.agentId)}</span>
                  {q.impact && <span className="rc-req-impact">{q.impact}</span>}
                </div>
                <div className="rc-req-reason">{q.reason}</div>
                <div className="rc-req-actions">
                  {isBigRequest(state, q) ? (
                    <>
                      <span className="rc-big-badge">🏛️ ก้อนใหญ่ — ต้องผ่านห้องบอร์ด</span>
                      <button className="rc-approve" onClick={() => onNavigate('boardroom')}>ไปห้องบอร์ด →</button>
                    </>
                  ) : (
                    <button className="rc-approve" onClick={() => approve(q.id)}>✓ CEO อนุมัติ</button>
                  )}
                  <button className="rc-del" onClick={() => reject(q.id)}>ปฏิเสธ</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <>
          <div className="rc-sec-hd">📜 ประวัติ ({history.length})</div>
          <div className="rc-hist">
            {history.map((q) => {
              const r = state.items.find((x) => x.id === q.resourceId);
              return (
                <div className="rc-hist-row" key={q.id}>
                  <span className={q.status === 'approved' ? 'rc-h-ok' : 'rc-h-no'}>{q.status === 'approved' ? '✓' : '✕'}</span>
                  <span>{q.type === 'add' ? 'เพิ่ม' : q.type === 'reduce' ? 'ลด' : 'ใหม่'} {q.amount} · {r?.name ?? q.resourceName}</span>
                  <span className="rc-hist-date">{q.at}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
