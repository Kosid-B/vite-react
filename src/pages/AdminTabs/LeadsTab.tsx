import { useEffect, useMemo, useState } from 'react';
import { isSupabaseEnabled } from '../../lib/supabase';
import {
  listLeads, leadStats, leadsCsv, channelLabel,
  type Lead, type ChannelStat,
} from '../../lib/platformLead';
import { livePersonas } from '../../lib/dynamicPersona';

/* Leads Tab — ปิด loop วัดผล: ดูคนสนใจ(lead)ที่ทิ้ง contact ไว้บน landing + มาจากช่องไหน (utm)
 * ตอบ "โฆษณา/คอนเทนต์ช่องไหนได้ lead จริง" → เอาไปตัดสินใจทุ่มงบ (RLS บังคับ is_app_admin ที่ DB) */

const btnGhost: React.CSSProperties = { background: 'transparent', color: 'var(--ink)', border: '1px solid var(--sand)', borderRadius: 8, padding: '7px 14px', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' };

function Bars({ title, stats }: { title: string; stats: ChannelStat[] }) {
  const max = Math.max(1, ...stats.map(s => s.count));
  return (
    <div style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '14px 16px', background: 'var(--cream2)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>{title}</div>
      {stats.length === 0 && <div style={{ color: 'var(--ink3)', fontSize: 13 }}>ยังไม่มีข้อมูล</div>}
      <div style={{ display: 'grid', gap: 8 }}>
        {stats.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 120, fontSize: 12.5, color: 'var(--ink)', flex: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
            <div style={{ flex: 1, height: 16, borderRadius: 5, background: 'var(--cream)', overflow: 'hidden' }}>
              <div style={{ width: `${(s.count / max) * 100}%`, height: '100%', background: '#0891b2', borderRadius: 5 }} />
            </div>
            <span style={{ width: 78, textAlign: 'right', fontSize: 12, color: 'var(--ink3)', flex: 'none' }}>{s.count} · {s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LeadsTab() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    if (!isSupabaseEnabled) return;
    setLoading(true); setMsg(null);
    const l = await listLeads();
    setLeads(l); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => leadStats(leads, new Date().toISOString().slice(0, 10)), [leads]);
  const personas = useMemo(() => livePersonas(leads), [leads]);

  function downloadCsv() {
    const blob = new Blob([leadsCsv(leads)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ceo-ai-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }
  async function copyContacts() {
    try {
      await navigator.clipboard.writeText(leads.map(l => l.contact).join('\n'));
      setMsg(`📋 คัดลอกช่องทางติดต่อ ${leads.length} รายการแล้ว`);
    } catch { setMsg('คัดลอกไม่สำเร็จ — เบราว์เซอร์ไม่อนุญาต clipboard'); }
  }

  if (!isSupabaseEnabled) {
    return <p style={{ color: 'var(--ink3)', fontSize: 14 }}>โหมด local — รายการ lead ใช้ได้เฉพาะ production (มี Supabase)</p>;
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>🧲 Leads (คนสนใจจาก landing)</h3>
        <button onClick={load} style={btnGhost}>{loading ? 'กำลังโหลด…' : '↻ รีเฟรช'}</button>
        {leads.length > 0 && <>
          <button onClick={downloadCsv} style={btnGhost}>⬇️ CSV</button>
          <button onClick={copyContacts} style={btnGhost}>📋 คัดลอกช่องทางติดต่อ</button>
        </>}
      </div>
      {msg && <div style={{ fontSize: 13, color: 'var(--ink3)' }}>{msg}</div>}

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <div style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '14px 16px', background: 'var(--cream2)' }}>
          <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Lead ทั้งหมด</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)' }}>{stats.total}</div>
        </div>
        <div style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '14px 16px', background: 'var(--cream2)' }}>
          <div style={{ fontSize: 12, color: 'var(--ink3)' }}>7 วันล่าสุด</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0891b2' }}>+{stats.last7}</div>
        </div>
        <div style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '14px 16px', background: 'var(--cream2)' }}>
          <div style={{ fontSize: 12, color: 'var(--ink3)' }}>ช่องทางเด่นสุด</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>
            {stats.byMedium[0] ? `${stats.byMedium[0].label} (${stats.byMedium[0].pct}%)` : '—'}
          </div>
        </div>
      </div>

      {/* Breakdown bars — ปิด loop: lead มาจากช่องไหน */}
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <Bars title="📊 มาจากช่องไหน (utm_medium)" stats={stats.byMedium} />
        <Bars title="🔗 แหล่ง (utm_source)" stats={stats.bySource} />
        <Bars title="🎯 แคมเปญ (utm_campaign)" stats={stats.byCampaign} />
      </div>

      {/* Dynamic Persona — persona จากลูกค้าจริง (อัปตามพฤติกรรม ไม่ใช่เดาสุ่ม) */}
      {personas.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>🧬 Persona จากลูกค้าจริง (อัปตาม lead ที่เข้ามา)</div>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {personas.map(p => (
              <div key={p.seg || 'none'} style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '14px 16px', background: 'var(--cream2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{p.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink3)', flex: 'none' }}>{p.size} คน · {p.pct}%</span>
                </div>
                <div style={{ fontSize: 12, color: '#0891b2', marginTop: 4, fontWeight: 600 }}>{p.painHook}</div>
                <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 8 }}>
                  สนใจ: {p.topInterests.length ? p.topInterests.map(i => `${i.text}${i.count > 1 ? ` (${i.count})` : ''}`).join(', ') : '— ยังไม่มีข้อมูล'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4 }}>
                  มาจาก: {p.topChannels.map(c => `${c.label} (${c.count})`).join(', ')}
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--ink3)', margin: 0 }}>
            สร้างจากข้อมูล lead จริง (seg + สิ่งที่สนใจ + ช่องทาง) — ไม่ใช่ persona สมมติ · ใช้ปรับคอนเทนต์/ข้อเสนอให้ตรงกลุ่มที่มาจริง
          </p>
        </div>
      )}

      {/* รายการ lead */}
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>📋 รายการ ({leads.length})</div>
        {leads.length === 0 && !loading && <p style={{ color: 'var(--ink3)', fontSize: 13, margin: 0 }}>ยังไม่มี lead — เมื่อมีคนกรอกฟอร์มบน landing จะขึ้นที่นี่</p>}
        {leads.length > 0 && (
          <div style={{ overflowX: 'auto', border: '1px solid var(--sand)', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'var(--cream2)', textAlign: 'left', color: 'var(--ink3)' }}>
                  {['วันที่', 'ช่องทาง', 'แคมเปญ', 'ชื่อ', 'ติดต่อ', 'สนใจทำธุรกิจ'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr key={l.id} style={{ borderTop: '1px solid var(--sand)', color: 'var(--ink)' }}>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{l.at}</td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{channelLabel(l.medium)}{l.source && <span style={{ color: 'var(--ink3)' }}> · {l.source}</span>}</td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: 'var(--ink3)' }}>{l.campaign || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{l.name || '—'}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{l.contact}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--ink3)' }}>{l.interest || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ fontSize: 11.5, color: 'var(--ink3)', margin: 0, lineHeight: 1.6 }}>
        🔒 ข้อมูลติดต่อ = ข้อมูลส่วนบุคคล (PDPA) เก็บเมื่อผู้ใช้ยินยอมเท่านั้น · ใช้เพื่อติดต่อกลับ/ส่งข่าวตามที่แจ้ง · อ่านได้เฉพาะแอดมิน
      </p>
    </div>
  );
}
