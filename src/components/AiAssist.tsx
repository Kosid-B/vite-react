import { useState } from 'react';
import type { AppData, PageId } from '../types';
import { isSupabaseEnabled, supabase } from '../lib/supabase';

interface Props {
  activePage: PageId;
  data: AppData;
}

// ป้ายชื่อ + บริบท + คำสั่งลัด ของแต่ละหน้า (AI agent รู้ว่ากำลังช่วยขั้นตอนไหน)
const PAGE_INFO: Record<PageId, { label: string; prompts: string[]; context: (d: AppData) => string }> = {
  dashboard: { label: 'ภาพรวม', prompts: ['สรุปสิ่งที่ควรทำต่อไป', 'ชี้จุดที่ยังขาด'], context: () => 'หน้าแดชบอร์ดภาพรวม' },
  journey: { label: 'Customer Journey', prompts: ['เสนอ touchpoint ที่ขาด', 'หา pain point เพิ่ม'], context: d => `stages: ${d.stages.map(s => s.label).join(', ')}` },
  funnel: { label: 'Conversion Funnel', prompts: ['ชี้ stage ที่รั่วมากสุด', 'เสนอวิธีเพิ่ม conversion'], context: d => `funnel ${d.funnel.length} stage` },
  roi: { label: 'ROI Calculator', prompts: ['วิเคราะห์ความคุ้มค่า', 'เสนอวิธีลดต้นทุน'], context: d => `avgDeal ${d.roi.avgDealValue}, target ${d.roi.monthlyRevenueTarget}` },
  personas: { label: 'Personas', prompts: ['เสนอ persona ใหม่', 'เพิ่ม insight ให้ persona เดิม'], context: d => `personas: ${d.personas.map(p => p.name).join(', ')}` },
  content: { label: 'Content Plan', prompts: ['เสนอหัวข้อคอนเทนต์เดือนหน้า', 'ไอเดียคอนเทนต์ตาม persona'], context: d => `${d.contentPlan.length} เดือน` },
  actions: { label: 'Priority Actions', prompts: ['จัดลำดับความสำคัญใหม่', 'เสนองานที่ควรทำเพิ่ม'], context: d => `${d.actions.length} actions, เสร็จ ${d.actions.filter(a => a.done).length}` },
  aisearch: { label: 'AI Research', prompts: ['สรุปประเด็นวิจัยที่ควรหา'], context: () => 'หน้าค้นคว้า' },
  bmc: { label: 'Business Model', prompts: ['ตรวจ Business Model Canvas', 'เสนอช่องทางรายได้เพิ่ม'], context: d => `BMC value: ${d.businessModel.bmc.value.slice(0, 3).join(', ')}` },
  aicompany: { label: 'บริษัท AI', prompts: ['เสนอเอเจนต์ที่ควรจ้างเพิ่ม', 'แตกงานจากเป้าหมาย'], context: d => `เป้าหมาย: ${d.aiCompany.goal}; เอเจนต์: ${d.aiCompany.agents.map(a => a.role).join(', ')}` },
  market: { label: 'Marketplace', prompts: ['เสนอประเภทคู่ค้าที่ควรเพิ่ม', 'กลยุทธ์ matching'], context: d => `${d.marketplace.partners.length} คู่ค้า` },
  billing: { label: 'แพ็กเกจ & ราคา', prompts: ['เสนอกลยุทธ์ราคา', 'วิธีลด churn'], context: d => `แพ็กปัจจุบัน ${d.subscription.plan}` },
  vrio: { label: 'VRIO', prompts: ['วิเคราะห์จุดแข็งที่ยั่งยืน', 'เสนอทรัพยากรที่ควรสร้าง'], context: d => `${d.vrio.length} ทรัพยากร` },
  roadmap: { label: 'Product Roadmap', prompts: ['วิเคราะห์ Roadmap ที่มีอยู่', 'เสนอ feature ที่ควรเพิ่มใน Q ถัดไป'], context: d => `${d.roadmap?.length ?? 0} features, ${d.roadmap?.filter(r => r.status === 'done').length ?? 0} เสร็จแล้ว` },
  team: { label: 'ทีม', prompts: ['เสนอโครงสร้างทีมที่เหมาะ'], context: () => 'หน้าจัดการทีม' },
  admin: { label: 'ผู้ดูแลระบบ', prompts: ['สรุปภาพรวมการใช้งานระบบ'], context: () => 'หน้าผู้ดูแลระบบ' },
  marketing: { label: 'กลยุทธ์การตลาด', prompts: ['วิเคราะห์ช่องทางที่ดีที่สุด', 'เสนอแคมเปญที่ควรทำถัดไป', 'วิธีลด CAC'], context: d => `งบ ${d.marketing?.monthlyBudget ?? 0} บาท, ${d.marketing?.channels?.length ?? 0} ช่องทาง` },
  iso9001: { label: 'ISO 9001:2015 QMS', prompts: ['สรุปสถานะการรับรอง ISO', 'เสนอวิธีแก้ NC ที่เปิดอยู่', 'แนะนำการเตรียมตรวจ Internal Audit'], context: d => `ISO QMS: ${d.iso9001?.clauses?.filter(c => c.status === 'green').length ?? 0}/${d.iso9001?.clauses?.length ?? 0} ข้อผ่าน` },
  cases: { label: 'Case Studies', prompts: ['สรุปบทเรียนจาก Tencent', 'แนะนำ Mission Prompt สำหรับ SaaS ไทย', 'เปรียบเทียบกลยุทธ์ M&A กับธุรกิจของเรา'], context: () => 'หน้า Case Studies — บทเรียนธุรกิจจาก Tencent & Mission-Driven AI' },
};

export default function AiAssist({ activePage, data }: Props) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ summary: string; suggestions: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const info = PAGE_INFO[activePage];

  async function ask(text: string) {
    const q = text.trim();
    if (!q) return;
    if (!isSupabaseEnabled || !supabase) {
      setError('AI Agent ต้องเปิดใช้ Supabase + deploy ฟังก์ชัน ai-assist (ตั้ง ANTHROPIC_API_KEY) ก่อน — ดู supabase/README.md');
      return;
    }
    setBusy(true); setError(null); setResult(null);
    try {
      const { data: res, error } = await supabase.functions.invoke('ai-assist', {
        body: { page: activePage, pageLabel: info.label, instruction: q, context: info.context(data) },
      });
      if (error) throw error;
      setResult({ summary: res?.summary ?? '', suggestions: res?.suggestions ?? [] });
    } catch (e) {
      setError('เรียก AI ไม่สำเร็จ: ' + ((e as Error).message || 'error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className={`aia-fab${open ? ' open' : ''}`} onClick={() => setOpen(o => !o)} aria-label="AI Agent">
        <span className="aia-fab-spark">✦</span>
        <span className="aia-fab-label">AI Agent</span>
      </button>

      {open && (
        <div className="aia-panel">
          <div className="aia-head">
            <div>
              <div className="aia-title">✦ AI Agent</div>
              <div className="aia-sub">กำลังช่วย: {info.label}</div>
            </div>
            <button className="aia-close" onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="aia-body">
            <div className="aia-chips">
              {info.prompts.map(p => (
                <button key={p} className="aia-chip" onClick={() => { setInstruction(p); ask(p); }} disabled={busy}>{p}</button>
              ))}
            </div>

            {busy && <div className="aia-loading">AI Agent กำลังคิด…</div>}
            {error && <div className="aia-error">{error}</div>}
            {result && (
              <div className="aia-result">
                {result.summary && <div className="aia-summary">{result.summary}</div>}
                <ul className="aia-suggestions">
                  {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {!busy && !result && !error && (
              <div className="aia-hint">พิมพ์สิ่งที่อยากให้ AI Agent ช่วยในขั้นตอนนี้ หรือเลือกคำสั่งลัดด้านบน</div>
            )}
          </div>

          <form className="aia-input" onSubmit={e => { e.preventDefault(); ask(instruction); }}>
            <input value={instruction} onChange={e => setInstruction(e.target.value)}
              placeholder={`ให้ AI ช่วยเรื่อง ${info.label}…`} disabled={busy} />
            <button type="submit" disabled={busy || !instruction.trim()}>ส่ง</button>
          </form>
        </div>
      )}
    </>
  );
}
