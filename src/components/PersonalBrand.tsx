import { useState } from 'react';
import type { AppData } from '../types';
import { brandKit, brandKitText } from '../lib/personalBrand';

/* ===== Personal Brand Builder (CMO) — แสดง Brand Kit + เสนอ CEO/บอร์ด + ปรับด้วย agent ===== */

export default function PersonalBrand({ data, onUpdate, onRefine, refining, supabaseEnabled }: {
  data: AppData;
  onUpdate: (d: AppData) => void;
  onRefine?: () => void;
  refining?: boolean;
  supabaseEnabled?: boolean;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const b = brandKit(data);

  function proposeToBoard() {
    const c = data.aiCompany;
    const cmo = c.agents.find(a => /cmo|market|ตลาด/i.test(a.role));
    const ceo = c.agents.find(a => /ceo/i.test(a.role)) ?? c.agents[0];
    onUpdate({ ...data, aiCompany: { ...c, approvals: [{
      id: 'brand-' + Date.now().toString(36),
      agentId: cmo?.id ?? ceo?.id ?? '',
      title: `🎨 CMO เสนอ Personal Brand — ${b.name}`,
      detail: brandKitText(data),
      impact: JSON.stringify({ type: 'note' }),
      status: 'pending',
    }, ...c.approvals] } });
    setMsg('✅ เสนอ Personal Brand ผ่าน CMO → CEO → บอร์ดแล้ว (ดูที่กล่องอนุมัติ)');
  }

  return (
    <section className="ai-panel pbrand" style={{ marginTop: 16 }}>
      <div className="ai-panel-hd">🎨 Personal Brand — แบรนด์ประจำตัวของบริษัท (CMO)</div>
      <div className="pb-pos">{b.positioning}</div>
      <div className="pb-arch">{b.archetype.name} · {b.archetype.vibe}</div>

      <div className="pb-grid">
        <div className="pb-box">
          <div className="pb-box-hd">🗣️ Voice &amp; Tone</div>
          <ul className="pb-do">{b.voice.map((v, i) => <li key={i}>✓ {v}</li>)}</ul>
          <ul className="pb-dont">{b.dont.map((v, i) => <li key={i}>✗ {v}</li>)}</ul>
        </div>
        <div className="pb-box">
          <div className="pb-box-hd">🧱 Content Pillars</div>
          <ul className="pb-pillars">{b.pillars.map(p => <li key={p.name}><b>{p.icon} {p.name}</b> — {p.detail}</li>)}</ul>
        </div>
        <div className="pb-box">
          <div className="pb-box-hd">📣 ช่องทาง &amp; จังหวะโพสต์</div>
          <ul className="pb-ch">{b.channels.map(ch => <li key={ch.name}><b>{ch.icon} {ch.name}</b><span>{ch.cadence} · {ch.focus}</span></li>)}</ul>
        </div>
        <div className="pb-box">
          <div className="pb-box-hd">✍️ Bio &amp; Tagline</div>
          <div className="pb-bio"><b>สั้น:</b> {b.bioShort}</div>
          <div className="pb-bio"><b>ยาว:</b> {b.bioLong}</div>
          <ul className="pb-tag">{b.taglines.map((t, i) => <li key={i}>“{t}”</li>)}</ul>
        </div>
      </div>

      <div className="pb-actions">
        <button className="pb-btn" onClick={proposeToBoard}>🎨 เสนอแบรนด์ → CEO → บอร์ด</button>
        {supabaseEnabled && onRefine && (
          <button className="pb-btn ghost" onClick={onRefine} disabled={refining}>
            {refining ? 'CMO กำลังปรับแบรนด์…' : '✨ ให้ CMO ปรับแบรนด์ (ค้นเทรนด์จริง)'}
          </button>
        )}
        <button className="pb-btn ghost" onClick={async () => { try { await navigator.clipboard.writeText(brandKitText(data)); setMsg('📋 คัดลอก Brand Kit แล้ว'); } catch { setMsg('คัดลอกไม่สำเร็จ'); } }}>คัดลอก Brand Kit</button>
      </div>
      {msg && <div className="pb-msg">{msg}</div>}

      {data.cmoBrand?.kit && (
        <>
          <div className="pb-refined-hd">✨ แบรนด์ที่ CMO ปรับล่าสุด · {data.cmoBrand.updatedAt}{data.cmoBrand.webUsed ? ' · 🌐 อิงเทรนด์จริง' : ''}</div>
          <pre className="cs-report">{data.cmoBrand.kit}</pre>
        </>
      )}
    </section>
  );
}
