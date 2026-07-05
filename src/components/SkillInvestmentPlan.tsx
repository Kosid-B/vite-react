import { useState } from 'react';
import type { AppData } from '../types';
import {
  currentStage, STAGE_PLANS, SKILL_PACKS, COMPETITORS, OUR_EDGE, PROMOTIONS,
  AIFLOW_TOTAL,
} from '../lib/skillInvestmentPlan';
import { trainingPlanText } from '../lib/trainingPlan';
import { onboardingPlanText } from '../lib/teamOnboarding';

/* ===== HRD + CEO เสนอบอร์ด: ทักษะที่จำเป็นตามช่วงการเติบโต + Price Analysis + Promotion ===== */

function proposalText(d: AppData): string {
  const s = currentStage(d);
  const L: string[] = [];
  L.push(`📈 HRD + CEO เสนอแผนลงทุนทักษะ — เรียนบอร์ด`);
  L.push(`ช่วงปัจจุบัน: ${s.badge} ${s.label} (${s.rank}) · โฟกัส: ${s.focus}`);
  L.push('');
  L.push('ทักษะที่จำเป็นในช่วงนี้ (จากคลัง AI Flow 501 ทักษะ):');
  s.categories.forEach(c => L.push(`   • ${c.name} (${c.count}) — ${c.why}`));
  L.push('');
  L.push('Price Analysis — แพ็กแนะนำ:');
  SKILL_PACKS.forEach(p => L.push(`   • ${p.name}: ฿${p.priceTHB.toLocaleString('th-TH')} (${p.skills} ทักษะ)`));
  L.push('');
  L.push('ข้อเสนอ: เริ่มลงทุนแพ็กที่ตรงกับช่วงปัจจุบันก่อน แล้วอัปเกรดเมื่อเมืองโตขึ้น');
  return L.join('\n');
}

export default function SkillInvestmentPlan({ data, onUpdate }: { data: AppData; onUpdate: (d: AppData) => void }) {
  const [tab, setTab] = useState<'stage' | 'price' | 'compete' | 'training' | 'onboard'>('stage');
  const [msg, setMsg] = useState<string | null>(null);
  const stage = currentStage(data);
  const roles = Array.from(new Set((data.aiCompany?.agents ?? []).map(a => a.role)));
  const [obRole, setObRole] = useState<string>(roles[0] ?? 'สมาชิกใหม่');

  function proposeTraining() {
    const c = data.aiCompany;
    const hrd = c.agents.find(a => /hr|hrd|บุคคล/i.test(a.role));
    const ceo = c.agents.find(a => /ceo/i.test(a.role)) ?? c.agents[0];
    onUpdate({ ...data, aiCompany: { ...c, approvals: [{
      id: 'training-' + Date.now().toString(36),
      agentId: hrd?.id ?? ceo?.id ?? '',
      title: `📚 HRD เสนอแผนพัฒนาองค์กร (Training) — CEO เสนอบอร์ด`,
      detail: trainingPlanText(data),
      impact: JSON.stringify({ type: 'note' }),
      status: 'pending',
    }, ...c.approvals] } });
    setMsg('✅ เสนอผ่านสายงาน HRD → CEO → บอร์ดแล้ว (ดูที่กล่องอนุมัติ)');
  }

  function proposeOnboarding() {
    const c = data.aiCompany;
    const hrd = c.agents.find(a => /hr|hrd|บุคคล/i.test(a.role));
    const ceo = c.agents.find(a => /ceo/i.test(a.role)) ?? c.agents[0];
    onUpdate({ ...data, aiCompany: { ...c, approvals: [{
      id: 'onboard-' + Date.now().toString(36),
      agentId: hrd?.id ?? ceo?.id ?? '',
      title: `🧭 HRD เสนอแผน Onboarding 30/60/90 — ตำแหน่ง ${obRole}`,
      detail: onboardingPlanText(data, obRole),
      impact: JSON.stringify({ type: 'note' }),
      status: 'pending',
    }, ...c.approvals] } });
    setMsg('✅ เสนอผ่านสายงาน HRD → CEO แล้ว (ดูที่กล่องอนุมัติ)');
  }

  function proposeToBoard() {
    const c = data.aiCompany;
    const hrd = c.agents.find(a => /hr|hrd|บุคคล/i.test(a.role));
    const ceo = c.agents.find(a => /ceo/i.test(a.role)) ?? c.agents[0];
    onUpdate({ ...data, aiCompany: { ...c, approvals: [{
      id: 'skillinv-' + Date.now().toString(36),
      agentId: hrd?.id ?? ceo?.id ?? '',
      title: `📈 HRD+CEO เสนอลงทุนทักษะช่วง ${stage.badge} ${stage.label}`,
      detail: proposalText(data),
      impact: JSON.stringify({ type: 'note' }),
      status: 'pending',
    }, ...c.approvals] } });
    setMsg('✅ เสนอบอร์ดแล้ว — พิจารณาที่ "กล่องอนุมัติของบอร์ด"');
  }

  return (
    <section className="ai-panel sip" style={{ marginTop: 16 }}>
      <div className="ai-panel-hd">🎓 HRD เสนอทักษะตามช่วงการเติบโต + ราคา ({AIFLOW_TOTAL} ทักษะในคลัง)</div>
      <div className="sip-cur">ช่วงปัจจุบัน: <b>{stage.badge} {stage.label}</b> — {stage.focus}</div>

      <div className="sip-tabs">
        <button className={tab === 'stage' ? 'on' : ''} onClick={() => setTab('stage')}>ทักษะตามช่วง</button>
        <button className={tab === 'price' ? 'on' : ''} onClick={() => setTab('price')}>Price Analysis</button>
        <button className={tab === 'compete' ? 'on' : ''} onClick={() => setTab('compete')}>แข่งกับคู่แข่ง</button>
        <button className={tab === 'training' ? 'on' : ''} onClick={() => setTab('training')}>แผนพัฒนา (Training)</button>
        <button className={tab === 'onboard' ? 'on' : ''} onClick={() => setTab('onboard')}>Onboarding 30/60/90</button>
      </div>

      {tab === 'stage' && (
        <div className="sip-stages">
          {STAGE_PLANS.map(s => (
            <div key={s.rank} className={`sip-stage${s.rank === stage.rank ? ' now' : ''}`}>
              <div className="sip-stage-hd">{s.badge} {s.label} <span>{s.rank === stage.rank ? '· คุณอยู่ที่นี่' : ''}</span></div>
              <div className="sip-stage-focus">{s.focus}</div>
              <ul>{s.categories.map(c => <li key={c.name}><b>{c.name}</b> ({c.count}) — {c.why}</li>)}</ul>
            </div>
          ))}
        </div>
      )}

      {tab === 'price' && (
        <div className="sip-price">
          <div className="sip-note">ตั้งราคาแบบ value-based (คุ้มค่าต่อทักษะ) + Full Bundle เป็น anchor · ต่อทักษะเฉลี่ย &lt; ฿8</div>
          <table className="sip-table">
            <thead><tr><th>แพ็ก</th><th>ทักษะ</th><th>ราคา</th><th>เหมาะกับช่วง</th></tr></thead>
            <tbody>
              {SKILL_PACKS.map(p => (
                <tr key={p.id}>
                  <td className="sip-pk">{p.name}<div className="sip-pk-note">{p.note}</div></td>
                  <td>{p.skills}</td>
                  <td className="sip-pr">฿{p.priceTHB.toLocaleString('th-TH')}</td>
                  <td>{p.forStage}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="sip-promo-hd">🎯 Promotion แข่งขัน</div>
          <div className="sip-promos">
            {PROMOTIONS.map(p => <div key={p.name} className="sip-promo"><b>{p.name}</b><span>{p.detail}</span></div>)}
          </div>
        </div>
      )}

      {tab === 'compete' && (
        <div className="sip-compete">
          <table className="sip-table">
            <thead><tr><th>คู่แข่ง</th><th>ราคา</th><th>ช่องว่าง (โอกาสของเรา)</th></tr></thead>
            <tbody>
              {COMPETITORS.map(c => <tr key={c.name}><td>{c.name}</td><td className="sip-pr">{c.price}</td><td>{c.gap}</td></tr>)}
            </tbody>
          </table>
          <div className="sip-edge-hd">จุดต่างที่คู่แข่งตามยาก</div>
          <ul className="sip-edge">{OUR_EDGE.map((e, i) => <li key={i}>✓ {e}</li>)}</ul>
        </div>
      )}

      {tab === 'training' && (
        <div className="sip-training">
          <div className="sip-note">HRD เสนอแผนพัฒนาทีมตามช่วงองค์กร (30/60/90 วัน) ผ่านสายงาน → CEO → บอร์ด เพื่ออนุมัติงบพัฒนาองค์กร</div>
          <pre className="cs-report">{trainingPlanText(data)}</pre>
        </div>
      )}

      {tab === 'onboard' && (
        <div className="sip-training">
          <div className="sip-note">HRD สร้างแผนรับสมาชิกใหม่ 30/60/90 วัน (Day 1 → 90 วัน) — เลือกตำแหน่งเพื่อดูแผนเฉพาะ role พร้อมพี่เลี้ยง (Buddy)</div>
          <label className="sip-ob-pick">ตำแหน่งสมาชิกใหม่:&nbsp;
            <select value={obRole} onChange={e => setObRole(e.target.value)}>
              {roles.length ? roles.map(r => <option key={r} value={r}>{r}</option>) : <option value="สมาชิกใหม่">สมาชิกใหม่</option>}
            </select>
          </label>
          <pre className="cs-report">{onboardingPlanText(data, obRole)}</pre>
        </div>
      )}

      <div className="sip-actions">
        {tab === 'onboard' ? (
          <>
            <button className="sip-btn" onClick={proposeOnboarding}>🧭 เสนอผ่านสายงาน HRD → CEO</button>
            <button className="sip-btn ghost" onClick={async () => { try { await navigator.clipboard.writeText(onboardingPlanText(data, obRole)); setMsg('📋 คัดลอกแผน Onboarding แล้ว'); } catch { setMsg('คัดลอกไม่สำเร็จ'); } }}>คัดลอกแผน</button>
          </>
        ) : tab === 'training' ? (
          <>
            <button className="sip-btn" onClick={proposeTraining}>📚 เสนอผ่านสายงาน → CEO → บอร์ด</button>
            <button className="sip-btn ghost" onClick={async () => { try { await navigator.clipboard.writeText(trainingPlanText(data)); setMsg('📋 คัดลอกแผนพัฒนาแล้ว'); } catch { setMsg('คัดลอกไม่สำเร็จ'); } }}>คัดลอกแผน</button>
          </>
        ) : (
          <>
            <button className="sip-btn" onClick={proposeToBoard}>📈 เสนอบอร์ดพิจารณาลงทุน</button>
            <button className="sip-btn ghost" onClick={async () => { try { await navigator.clipboard.writeText(proposalText(data)); setMsg('📋 คัดลอกสรุปเสนอบอร์ดแล้ว'); } catch { setMsg('คัดลอกไม่สำเร็จ'); } }}>คัดลอกสรุป</button>
          </>
        )}
      </div>
      {msg && <div className="sip-msg">{msg}</div>}
    </section>
  );
}
