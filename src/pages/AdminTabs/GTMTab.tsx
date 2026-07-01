import { useState } from 'react';
import type { AppData } from '../../types';

interface Props {
  data: AppData;
  onUpdate: (d: AppData) => void;
}

const CLUSTERS = [
  {
    id: 'steel',
    icon: '🏗️',
    name: 'เหล็กและก่อสร้าง',
    pain: 'จัดการเอกสาร TIS 50-2565 ซ้ำซ้อน ใช้เวลานาน',
    hook: 'จัดการคลังสินค้าเหล็กและเอกสาร TIS ด้วย AI ลดเวลา 80%',
    keyword: 'ระบบจัดการมาตรฐาน TIS เหล็ก AI',
    urgency: 'สูงมาก',
    color: '#94a3b8',
  },
  {
    id: 'logistics',
    icon: '🚛',
    name: 'โลจิสติกส์และขนส่ง',
    pain: 'ต้นทุนสูง เอกสารยุ่ง ไม่มีระบบติดตามมาตรฐาน ISO',
    hook: 'ลดต้นทุนโลจิสติกส์ด้วย AI Route + ISO Document Automation',
    keyword: 'ระบบ ISO โลจิสติกส์ลดต้นทุน AI',
    urgency: 'สูง',
    color: '#f59e0b',
  },
  {
    id: 'food',
    icon: '🥗',
    name: 'อาหารและส่งออก',
    pain: 'HACCP/GMP documentation ซับซ้อน เพื่อส่งออก',
    hook: 'ทำ HACCP/GMP เพื่อส่งออกอาหารไทยด้วย AI ลดเวลา 60%',
    keyword: 'ระบบ HACCP GMP อาหาร AI ส่งออก',
    urgency: 'สูง',
    color: '#10b981',
  },
  {
    id: 'service',
    icon: '💼',
    name: 'บริการและที่ปรึกษา',
    pain: 'ดูแลลูกค้าหลายรายพร้อมกัน ไม่มีระบบรวมศูนย์',
    hook: 'จัดการลูกค้า 20+ รายด้วย AI Company Platform เดียว',
    keyword: 'ซอฟต์แวร์ที่ปรึกษา AI จัดการลูกค้า SME',
    urgency: 'ปานกลาง',
    color: '#7c3aed',
  },
] as const;

const TIERS = [
  {
    tier: 'Tier 1',
    label: 'SME ยื่นขอ/ต่ออายุมาตรฐาน',
    desc: 'โรงงาน/บริการที่ต้องมีใบรับรองเพื่อประมูลหรือส่งออก',
    urgency: 'สูงมาก',
    cac: '฿2,500–4,000',
    ltv: '฿53,640',
    strategy: 'SEO + Content ให้ความรู้ TIS/ISO',
    channels: ['search', 'content'],
    color: '#dc2626',
    persona: 'สมชาย',
  },
  {
    tier: 'Tier 2',
    label: 'ที่ปรึกษา/สำนักงานบัญชี',
    desc: 'คนที่ดูแล SME 10–30 รายพร้อมกัน — Multiplier Effect',
    urgency: 'ปานกลาง',
    cac: '฿5,000–8,000',
    ltv: '฿178,800',
    strategy: 'LinkedIn + Partnership Program',
    channels: ['linkedin', 'partner'],
    color: '#d97706',
    persona: 'ชาญกิจ',
  },
  {
    tier: 'Tier 3',
    label: 'ธุรกิจครอบครัว Digital Transform',
    desc: 'ต้องการยกระดับธุรกิจ แต่ยังไม่รู้จะเริ่มต้นจากที่ใด',
    urgency: 'ต่ำ–กลาง',
    cac: '฿3,000–6,000',
    ltv: '฿89,400',
    strategy: 'VRIO Business Audit Tool (Lead Magnet)',
    channels: ['audit', 'facebook'],
    color: '#94a3b8',
    persona: 'วนิดา',
  },
] as const;

const MSG_FRAMEWORK = [
  {
    persona: 'สมชาย',
    role: 'เจ้าของโรงงาน SME',
    platform: 'Facebook / Line OA',
    headline: 'จัดการเอกสาร TIS/ISO ด้วย AI — ลดเวลา 80%',
    hook: 'คุณเสียเวลาเท่าไรต่อเดือนไปกับเอกสารมาตรฐาน?',
    body: 'CEO AI Thailand ช่วยโรงงานขนาดกลางจัดการเอกสาร TIS/ISO อัตโนมัติ วิเคราะห์ VRIO และวางแผนธุรกิจด้วย AI — ครบจบในที่เดียว',
    cta: 'ทดลองใช้ Business Audit ฟรี 5 นาที →',
    targeting: 'เจ้าของธุรกิจ, ผู้จัดการโรงงาน, อายุ 35–55, Facebook Groups อุตสาหกรรม',
    color: '#3b82f6',
  },
  {
    persona: 'ชาญกิจ',
    role: 'ที่ปรึกษาธุรกิจ/สำนักงานบัญชี',
    platform: 'LinkedIn / Email',
    headline: 'เครื่องมือที่ทำให้คุณดูแลลูกค้า SME ได้ 3× เร็วขึ้น',
    hook: 'ถ้าคุณดูแลลูกค้า 20 รายและแต่ละรายใช้เวลา 10 ชม./เดือน...',
    body: 'Partner กับ CEO AI Thailand — ใช้แพลตฟอร์ม AI สร้าง Business Plan, Financial Forecast, และ Grant Proposal ให้ลูกค้าได้เร็วกว่าเดิม 10 เท่า',
    cta: 'ดูโปรแกรม Partner สำหรับที่ปรึกษา →',
    targeting: 'Consultant, CFO, นักบัญชี, LinkedIn, อายุ 30–50',
    color: '#38bdf8',
  },
  {
    persona: 'วนิดา',
    role: 'เจ้าของธุรกิจครอบครัว Gen 2',
    platform: 'Facebook / Instagram',
    headline: 'สืบทอดธุรกิจครอบครัว อยากเอา AI มาช่วย แต่ไม่รู้จะเริ่มอะไร?',
    hook: 'ธุรกิจรุ่นสองที่โตเร็วที่สุด ใช้ Data + AI ตัดสินใจแทนความรู้สึก',
    body: 'เริ่มต้นด้วย CEO AI Business Audit ฟรี — วิเคราะห์จุดแข็ง (VRIO), ช่องทางรายได้ (BMC), และโอกาสเติบโตของธุรกิจคุณด้วย AI ใน 5 นาที',
    cta: 'เริ่ม CEO AI Business Audit ฟรี →',
    targeting: 'Gen 2 ธุรกิจครอบครัว, นักธุรกิจรุ่นใหม่, Facebook/IG, อายุ 25–40',
    color: '#7c3aed',
  },
];

const AUDIT_CHECKS = [
  'สร้าง Landing Page "CEO AI Business Audit" (5 คำถาม)',
  'เชื่อมฟอร์มเข้ากับ Supabase เพื่อเก็บ Lead',
  'ตั้ง Email Sequence อัตโนมัติ (3 emails ใน 7 วัน)',
  'สร้าง Facebook Pixel + LinkedIn Insight Tag',
  'ทำ Lookalike Audience จาก existing customers',
  'ทดสอบ Ad Copy Tier 1 กับ 2 Headlines (A/B)',
  'ตั้ง Retargeting สำหรับคนที่เริ่ม Audit แต่ไม่จบ',
];

export default function GTMTab({ data, onUpdate }: Props) {
  const [activeMsgIdx, setActiveMsgIdx] = useState(0);

  const personas = data.personas ?? [];
  const channels = data.marketing?.channels ?? [];
  const winStories = data.winStories ?? [];
  const auditChecks = data.gtmAuditChecks ?? [false, false, false, false, false, false, false];

  const activeChannels = channels.filter(c => c.active);
  const revenueWins = winStories.filter(w => w.category === 'revenue' || w.category === 'efficiency');
  const activeMsg = MSG_FRAMEWORK[activeMsgIdx];

  return (
    <div className="gtm-wrap">
      {/* Header */}
      <div className="gtm-header">
        <div className="gtm-title">🎯 GTM — Sniper Targeting Strategy</div>
        <div className="gtm-subtitle">กลยุทธ์เข้าถึงกลุ่มเป้าหมายแบบ Precision ผ่าน 3 Core Competencies</div>
      </div>

      {/* Tier Segmentation Table */}
      <div className="adm-section">
        <div className="adm-section-title">Tier Segmentation Framework</div>
        <div className="gtm-tier-list">
          {TIERS.map(t => (
            <div key={t.tier} className="gtm-tier-row" style={{ borderLeftColor: t.color }}>
              <div className="gtm-tier-badge" style={{ background: t.color + '20', color: t.color }}>{t.tier}</div>
              <div className="gtm-tier-info">
                <div className="gtm-tier-label">{t.label}</div>
                <div className="gtm-tier-desc">{t.desc}</div>
                <div className="gtm-tier-strategy">📍 {t.strategy}</div>
              </div>
              <div className="gtm-tier-meta">
                <div className="gtm-tier-stat">
                  <span className="gtm-tier-stat-l">Urgency</span>
                  <span className="gtm-tier-stat-v" style={{ color: t.color }}>{t.urgency}</span>
                </div>
                <div className="gtm-tier-stat">
                  <span className="gtm-tier-stat-l">Est. CAC</span>
                  <span className="gtm-tier-stat-v">{t.cac}</span>
                </div>
                <div className="gtm-tier-stat">
                  <span className="gtm-tier-stat-l">LTV (3yr)</span>
                  <span className="gtm-tier-stat-v" style={{ color: 'var(--green)' }}>{t.ltv}</span>
                </div>
                <div className="gtm-tier-stat">
                  <span className="gtm-tier-stat-l">Persona</span>
                  <span className="gtm-tier-stat-v">👤 {t.persona}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contextual Clusters */}
      <div className="adm-section">
        <div className="adm-section-title">Contextual Industry Clusters</div>
        <div className="adm-note" style={{ marginBottom: 14 }}>
          อย่าขาย "AI ทั่วไป" — ขาย "AI สำหรับธุรกิจ <strong>เหล็ก</strong>" หรือ "AI สำหรับ<strong>โลจิสติกส์</strong>" เพื่อให้ Messaging ตรงจุดและ CAC ต่ำกว่า
        </div>
        <div className="gtm-cluster-grid">
          {CLUSTERS.map(c => (
            <div key={c.id} className="gtm-cluster-card" style={{ borderTopColor: c.color }}>
              <div className="gtm-cluster-icon">{c.icon}</div>
              <div className="gtm-cluster-name">{c.name}</div>
              <div className="gtm-cluster-pain">⚡ {c.pain}</div>
              <div className="gtm-cluster-hook">💬 &ldquo;{c.hook}&rdquo;</div>
              <div className="gtm-cluster-kw">🔍 {c.keyword}</div>
              <div className="gtm-cluster-urgency" style={{ color: c.color }}>● Urgency: {c.urgency}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Messaging Framework */}
      <div className="adm-section">
        <div className="adm-section-title">Messaging Framework ต่อ Persona</div>
        <div className="gtm-msg-tabs">
          {MSG_FRAMEWORK.map((m, i) => (
            <button
              key={m.persona}
              className={`gtm-msg-tab${activeMsgIdx === i ? ' active' : ''}`}
              style={activeMsgIdx === i ? { borderColor: m.color, color: m.color } : {}}
              onClick={() => setActiveMsgIdx(i)}
            >
              👤 {m.persona} — {m.role}
            </button>
          ))}
        </div>

        <div className="gtm-msg-card" style={{ borderTopColor: activeMsg.color }}>
          <div className="gtm-msg-header">
            <div>
              <div className="gtm-msg-platform">{activeMsg.platform}</div>
              <div className="gtm-msg-persona">{activeMsg.persona} · {activeMsg.role}</div>
            </div>
            <div className="gtm-msg-targeting">🎯 {activeMsg.targeting}</div>
          </div>

          <div className="gtm-msg-body">
            <div className="gtm-msg-field">
              <span className="gtm-msg-label">Headline</span>
              <div className="gtm-msg-headline">{activeMsg.headline}</div>
            </div>
            <div className="gtm-msg-field">
              <span className="gtm-msg-label">Hook</span>
              <div className="gtm-msg-hook">&ldquo;{activeMsg.hook}&rdquo;</div>
            </div>
            <div className="gtm-msg-field">
              <span className="gtm-msg-label">Body Copy</span>
              <div className="gtm-msg-copy">{activeMsg.body}</div>
            </div>
            <div className="gtm-msg-field">
              <span className="gtm-msg-label">CTA</span>
              <div className="gtm-msg-cta" style={{ color: activeMsg.color }}>{activeMsg.cta}</div>
            </div>
          </div>

          {(() => {
            const linked = personas.find(p => p.name.includes(activeMsg.persona));
            if (!linked) return null;
            return (
              <div className="gtm-msg-linked-persona">
                <div className="gtm-msg-linked-title">Persona ที่เชื่อมโยง</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="persona-avatar" style={{ background: linked.bg, color: linked.tc, width: 32, height: 32, fontSize: 13, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{linked.initials}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{linked.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink2)' }}>{linked.role}</div>
                  </div>
                </div>
                {linked.quote && <div className="gtm-msg-quote">&ldquo;{linked.quote}&rdquo;</div>}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Lead Magnet / Business Audit Concept */}
      <div className="adm-section">
        <div className="adm-section-title">Business Audit Lead Magnet — Launch Checklist</div>
        <div className="adm-note" style={{ marginBottom: 14 }}>
          <strong>Trojan Horse:</strong> ให้ SME เข้ามาทำ CEO AI Business Audit ฟรี 5 นาที — คนที่ทำคือกลุ่มเป้าหมายที่แท้จริง เพราะเขากำลังมองหาคำตอบเรื่องกลยุทธ์
        </div>
        <div className="gtm-audit-wrap">
          <div className="gtm-audit-concept">
            <div className="gtm-audit-concept-title">CEO AI Business Audit — 5 คำถาม</div>
            {[
              { q: '1', label: 'ธุรกิจของคุณอยู่ใน Cluster ใด?', opts: ['เหล็ก/ก่อสร้าง', 'โลจิสติกส์', 'อาหาร/ส่งออก', 'บริการ/ที่ปรึกษา', 'อื่นๆ'] },
              { q: '2', label: 'รายได้ต่อเดือนอยู่ในช่วงใด?', opts: ['ต่ำกว่า ฿500k', '฿500k–2M', '฿2M–10M', 'มากกว่า ฿10M'] },
              { q: '3', label: 'ปัญหาหลักที่ต้องการแก้คืออะไร?', opts: ['เอกสาร ISO/TIS', 'วางแผนธุรกิจ', 'หาลูกค้าใหม่', 'จัดการต้นทุน'] },
              { q: '4', label: 'มีทีม IT/Digital ภายในหรือไม่?', opts: ['ไม่มีเลย', 'มี 1–2 คน', 'มีทีม dedicated'] },
              { q: '5', label: 'ต้องการผลลัพธ์ภายในกี่เดือน?', opts: ['1–3 เดือน', '3–6 เดือน', '6–12 เดือน'] },
            ].map(item => (
              <div key={item.q} className="gtm-audit-q">
                <div className="gtm-audit-q-label">Q{item.q}: {item.label}</div>
                <div className="gtm-audit-q-opts">
                  {item.opts.map(o => <span key={o} className="gtm-audit-opt">{o}</span>)}
                </div>
              </div>
            ))}
          </div>

          <div className="gtm-audit-checklist">
            <div className="gtm-audit-check-title">Launch Checklist</div>
            {AUDIT_CHECKS.map((ck, i) => (
              <div key={i} className="gtm-audit-check-row" onClick={() => {
                const next = [...auditChecks]; next[i] = !next[i];
                onUpdate({ ...data, gtmAuditChecks: next });
              }}>
                <input type="checkbox" checked={auditChecks[i]} readOnly />
                <span className={`gtm-audit-check-text${auditChecks[i] ? ' done' : ''}`}>{ck}</span>
              </div>
            ))}
            <div className="gtm-audit-progress">
              <div className="gtm-audit-prog-bar">
                <div className="gtm-audit-prog-fill" style={{ width: `${(auditChecks.filter(Boolean).length / AUDIT_CHECKS.length) * 100}%` }} />
              </div>
              <span className="gtm-audit-prog-label">{auditChecks.filter(Boolean).length}/{AUDIT_CHECKS.length} พร้อม</span>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Readiness */}
      <div className="adm-section">
        <div className="adm-section-title">Channel Readiness</div>
        {activeChannels.length === 0 ? (
          <div className="adm-note">ยังไม่มี Active Channels — ไปตั้งค่าที่หน้า Marketing → Channels</div>
        ) : (
          <div className="gtm-channel-grid">
            {activeChannels.slice(0, 6).map(ch => {
              const tier1 = ['seo', 'content'].includes(ch.type);
              const tier2 = ['partner', 'email'].includes(ch.type);
              return (
                <div key={ch.id} className="gtm-channel-card">
                  <div className="gtm-channel-name">{ch.name}</div>
                  <div className="gtm-channel-type">{ch.type.toUpperCase()}</div>
                  <div className="gtm-channel-stats">
                    <span>{ch.leadsPerMonth} leads/mo</span>
                    <span>฿{ch.cpl.toLocaleString()} CPL</span>
                    <span>{(ch.convRate * 100).toFixed(1)}% conv</span>
                  </div>
                  <div className="gtm-channel-tier">
                    {tier1 && <span className="gtm-tier-chip t1">Tier 1</span>}
                    {tier2 && <span className="gtm-tier-chip t2">Tier 2</span>}
                    {!tier1 && !tier2 && <span className="gtm-tier-chip t3">Tier 3</span>}
                  </div>
                </div>
              );
            })}
            {activeChannels.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink3)', gridColumn: '1/-1' }}>ยังไม่มี Channel active</div>}
          </div>
        )}
      </div>

      {/* Social Proof — Win Stories */}
      {revenueWins.length > 0 && (
        <div className="adm-section">
          <div className="adm-section-title">Social Proof สำหรับ Ad Copy</div>
          <div className="adm-note" style={{ marginBottom: 14 }}>นำ Win Stories เหล่านี้ไปใช้ใน Testimonial Ad และ Case Study Content</div>
          <div className="gtm-wins-grid">
            {revenueWins.slice(0, 4).map(w => (
              <div key={w.id} className="gtm-win-card">
                <div className="gtm-win-cat">{w.category}</div>
                <div className="gtm-win-customer">{w.customerName}</div>
                <div className="gtm-win-metric">{w.headlineMetric}</div>
                {w.quote && <div className="gtm-win-quote">&ldquo;{w.quote}&rdquo;</div>}
                <div className="gtm-win-cta">ใช้เป็น Testimonial Ad →</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Persona mapping from live data */}
      {personas.length > 0 && (
        <div className="adm-section">
          <div className="adm-section-title">Persona ↔ Channel Mapping (จากข้อมูลจริง)</div>
          <div className="gtm-persona-map">
            {personas.map(p => {
              const tier = TIERS.find(t => t.persona === p.name) ?? TIERS[2];
              return (
                <div key={p.name} className="gtm-pmap-row">
                  <div className="persona-avatar" style={{ background: p.bg, color: p.tc, width: 36, height: 36, fontSize: 14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{p.initials}</div>
                  <div className="gtm-pmap-info">
                    <div className="gtm-pmap-name">{p.name}</div>
                    <div className="gtm-pmap-role">{p.role}</div>
                  </div>
                  <div className="gtm-pmap-tier" style={{ color: tier.color }}>{tier.tier}</div>
                  <div className="gtm-pmap-strategy">{tier.strategy}</div>
                  <div className="gtm-pmap-cac">{tier.cac}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== TIER 1 PLAYBOOK: Compliance Advisor ===== */}
      <div className="adm-section">
        <div className="adm-section-title">🏗️ Tier 1 Deep-Dive — AI Compliance Advisor Playbook</div>
        <div className="gtm-playbook-wrap">

          {/* Positioning */}
          <div className="gtm-playbook-positioning">
            <div className="gtm-playbook-pos-label">Positioning Strategy</div>
            <div className="gtm-playbook-pos-title">"Compliance as a Growth Lever" — ไม่ใช่แค่ช่วยทำเอกสาร แต่ช่วยให้ธุรกิจคุณผ่านการรับรอง TIS/ISO ภายในเวลาที่กำหนด โดยไม่ต้องจ้างที่ปรึกษาแพงๆ</div>
            <div className="gtm-playbook-pos-hook">
              "ติดปัญหาทำ TIS/ISO อยู่ใช่ไหม? ให้ AI Agent ช่วยจัดการเอกสารและตรวจสอบความพร้อมให้คุณได้ตลอด 24 ชม. เหมือนมีที่ปรึกษาข้างกาย"
            </div>
            <div className="gtm-playbook-pos-insight">
              💡 Targeting Insight: กลุ่มนี้กลัว "ตกม้าตาย" ตอนตรวจประเมิน และกลัวการเสียเวลาแก้ไขเอกสารซ้ำซ้อน — ใช้ Fear + Relief framing
            </div>
          </div>

          {/* 3-Step Body Copy */}
          <div className="gtm-playbook-steps">
            {[
              { label: 'ปัญหา', text: 'เอกสารเยอะ ขั้นตอนซับซ้อน พนักงานทำไม่เป็น ที่ปรึกษาแพง — ธุรกิจที่ต้องการใบรับรองเพื่อประมูลงานหรือส่งออกถูกบล็อกอยู่ตรงนี้' },
              { label: 'วิธีแก้', text: 'CEO AI Thailand มีฐานข้อมูลมาตรฐาน TIS/ISO ครบ AI จะช่วย Gap Analysis และจัดระเบียบเอกสารอัตโนมัติ — ผ่านการประเมินเร็วกว่าเดิม 3 เท่า' },
              { label: 'ผลลัพธ์', text: 'ผ่านการประเมินไวขึ้น 3 เท่า ประหยัดค่าจ้างที่ปรึกษา และได้ระบบจัดการที่ช่วยให้ธุรกิจเติบโตต่อได้ทันที' },
            ].map((s, i) => (
              <div key={i} className="gtm-playbook-step">
                <div className="gtm-playbook-step-num">{i + 1}</div>
                <div className="gtm-playbook-step-label">{s.label}</div>
                <div className="gtm-playbook-step-text">{s.text}</div>
              </div>
            ))}
          </div>

          {/* Tactical Outreach */}
          <div style={{ background: 'var(--cream2)', border: '1.5px solid var(--ink4)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>3 Tactical Outreach สำหรับ Tier 1</div>
            <div className="gtm-tactic-list">
              {[
                {
                  title: 'SEO + Content Checklist',
                  desc: 'สร้างบทความ "Checklist เตรียมตัวขอ TIS [เลขมาตรฐาน] ฉบับปี 2569" — ใช้ Persona สมชายเป็นโจทย์ แทรก Internal Link ไปที่ Business Audit Tool ทุกบทความ',
                },
                {
                  title: 'Strategic Partnership กับ Certification Bodies',
                  desc: 'ติดต่อบริษัทรับตรวจประเมินขนาดเล็ก หรือ กรมส่งเสริมอุตสาหกรรม นำเสนอว่าระบบช่วย "ลดภาระการตรวจสอบเอกสาร" — ถ้าเอกสาร SME เรียบร้อยจากระบบ งานเขาจะง่ายขึ้น',
                },
                {
                  title: 'Knowledge Sharing ในกลุ่มอุตสาหกรรม',
                  desc: 'เข้าไปในกลุ่ม Facebook/Line อุตสาหกรรม แชร์ความรู้ว่า "การทำ TIS ไม่ใช่แค่เรื่องเอกสาร แต่เป็นเรื่อง Productivity" — ใช้ Data จากระบบพิสูจน์ (Data Moat) ไม่ขายตรง',
                },
              ].map((t, i) => (
                <div key={i} className="gtm-tactic-item">
                  <div className="gtm-tactic-num">{i + 1}</div>
                  <div className="gtm-tactic-text">
                    <div className="gtm-tactic-title">{t.title}</div>
                    <div className="gtm-tactic-desc">{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Anti-Persona Warning */}
          <div className="gtm-anti-persona">
            <div className="gtm-anti-title">⚠️ Anti-Persona Warning — "เกริก" (Feature Chaser)</div>
            <div className="gtm-anti-grid">
              <div>
                <div className="gtm-anti-col-title">🚩 Red Flags ที่ต้องระวัง</div>
                {[
                  'ถามฟีเจอร์จุกจิกแต่ยังไม่ตัดสินใจซื้อ',
                  'ขอ Demo ซ้ำๆ โดยไม่มีความพร้อมทางการเงิน',
                  'เปรียบเทียบราคากับ Solution ฟรีอยู่ตลอด',
                  'ไม่มี Deadline หรือ Urgency ที่ชัดเจน',
                  'ต้องการ Customization สูงก่อนเริ่มใช้',
                ].map((r, i) => <div key={i} className="gtm-anti-item">❌ {r}</div>)}
              </div>
              <div>
                <div className="gtm-anti-col-title">✅ Tier 1 ที่แท้จริง ถามว่า...</div>
                {[
                  '"ใช้แล้วผ่านการประเมินเลยไหม?"',
                  '"ต้องเตรียมเอกสารอะไรบ้าง ระบบช่วยได้?"',
                  '"ประหยัดค่าที่ปรึกษาได้เท่าไร?"',
                  '"มีตัวอย่างลูกค้าที่ผ่าน TIS ด้วยระบบนี้ไหม?"',
                  '"เริ่มได้เลยภายในอาทิตย์นี้ได้ไหม?"',
                ].map((r, i) => <div key={i} className="gtm-anti-item">✓ {r}</div>)}
              </div>
            </div>
          </div>

          {/* TIS Article Content Idea */}
          <div style={{ background: 'var(--green-bg)', border: '1.5px solid rgba(16,185,129,.2)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', marginBottom: 10 }}>📝 TIS How-to Article Structure — เริ่มต้นจาก Persona สมชาย</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { sec: 'Title', content: '"SME เตรียมพร้อมขอรับรอง TIS 50-2565 ด้วย AI: Checklist ฉบับสมบูรณ์ปี 2569"' },
                { sec: 'Hook', content: '"สมชายเสียเวลา 3 เดือนรวบรวมเอกสาร — AI ช่วยทำได้ใน 3 วัน"' },
                { sec: 'Section 1', content: 'ทำความเข้าใจ TIS 50-2565 ต้องการอะไรบ้าง (Gap Analysis)' },
                { sec: 'Section 2', content: 'เอกสาร 12 รายการที่ต้องเตรียมและ Template ที่ AI ช่วยสร้าง' },
                { sec: 'Section 3', content: 'กระบวนการ Internal Audit ก่อนยื่นขอรับรอง' },
                { sec: 'CTA', content: 'ทำ CEO AI Business Audit ฟรี → เพื่อดู Gap ของธุรกิจคุณทันที' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(16,185,129,.15)', color: 'var(--green)', padding: '2px 8px', borderRadius: 6, flexShrink: 0, marginTop: 2 }}>{s.sec}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--ink2)' }}>{s.content}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
