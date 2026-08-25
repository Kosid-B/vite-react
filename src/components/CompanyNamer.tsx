import { callAiAssist } from '../lib/aiAssist';
import { useState } from 'react';
import type { AppData } from '../types';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import { trackAiCall } from '../lib/usage';
import {
  localNameProposals, parseAiNameSuggestions, nameProposalPrompt,
  type NameProposal, type IdentityContext,
} from '../lib/companyIdentity';

/* CEO เสนอชื่อบริษัท (หลัก Corporate Identity) + โลโก้ → บอร์ด (ผู้ใช้) เลือก → ตั้งเป็นชื่อ+โลโก้บริษัท
 * ออนไลน์: ให้ CEO (Claude) เสนอ · ออฟไลน์/ล้มเหลว: ตัวสร้างชื่อในแอป (rule-based) */
export default function CompanyNamer({ data, onUpdate }: { data: AppData; onUpdate: (d: AppData) => void }) {
  const c = data.aiCompany;
  const [open, setOpen] = useState(false);
  const [proposals, setProposals] = useState<NameProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [hint, setHint] = useState('');

  const ctx: IdentityContext = { industry: c.industry, goal: c.goal, keywords: hint };

  async function propose() {
    setLoading(true); setMsg('');
    let list: NameProposal[] = [];
    if (isSupabaseEnabled && supabase) {
      try {
        trackAiCall();
        const res = await callAiAssist({
            page: 'aicompany', pageLabel: 'CEO เสนอชื่อบริษัท (Corporate Identity)',
            instruction: nameProposalPrompt(ctx),
            context: `ธุรกิจ: ${c.industry || '-'} · เป้าหมาย: ${c.goal || '-'}${hint ? ' · คำใบ้: ' + hint : ''}`,
          }, { ungoverned: 'userContent' });
        list = parseAiNameSuggestions(res?.suggestions ?? [], ctx);
      } catch {
        setMsg('ℹ️ ใช้ตัวเสนอชื่อในแอป (AI ไม่พร้อม)');
      }
    }
    if (list.length === 0) list = localNameProposals(ctx, 5);
    setProposals(list);
    setLoading(false);
  }

  function pick(p: NameProposal) {
    onUpdate({ ...data, aiCompany: { ...c, name: p.name, logoSvg: p.logoSvg } });
    setMsg(`✅ บอร์ดเลือก "${p.name}" เป็นชื่อบริษัท + โลโก้แล้ว`);
  }

  return (
    <div className="cn-box">
      <button className="cn-toggle" onClick={() => { setOpen(o => !o); if (!open && proposals.length === 0) propose(); }}>
        🎨 ให้ CEO เสนอชื่อบริษัท + โลโก้ (Corporate Identity)
        <span className="cn-caret">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="cn-panel">
          <div className="cn-hint-row">
            <input className="cn-hint" placeholder="คำใบ้เพิ่ม (เช่น โทนพรีเมียม, สื่อความยั่งยืน) — ไม่ใส่ก็ได้"
              value={hint} onChange={e => setHint(e.target.value)} />
            <button className="cn-regen" onClick={propose} disabled={loading}>
              {loading ? '⏳ CEO กำลังคิด…' : '↻ เสนอใหม่'}
            </button>
          </div>
          {msg && <div className="cn-msg">{msg}</div>}

          <div className="cn-grid">
            {proposals.map((p, i) => (
              <div key={i} className={`cn-card${c.name === p.name ? ' chosen' : ''}`}>
                <div className="cn-logo" dangerouslySetInnerHTML={{ __html: p.logoSvg }} />
                <div className="cn-name">{p.name}</div>
                <div className="cn-tagline">{p.tagline}</div>
                <div className="cn-why">💡 {p.rationale}</div>
                <button className="cn-pick" onClick={() => pick(p)} disabled={c.name === p.name}>
                  {c.name === p.name ? '✓ เลือกแล้ว' : 'บอร์ดเลือกชื่อนี้'}
                </button>
              </div>
            ))}
          </div>
          {proposals.length === 0 && !loading && <div className="cn-empty">กด "เสนอใหม่" เพื่อให้ CEO เสนอชื่อ</div>}
        </div>
      )}
    </div>
  );
}
