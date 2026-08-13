import { useEffect, useMemo, useState } from 'react';
import { isSupabaseEnabled } from '../../lib/supabase';
import {
  loadCheckupLeads, rankLeads, checkupLeadStats, checkupLeadsCsv,
  sourceLabel, BAND_LABEL_TH, type ScoredLead,
} from '../../lib/checkupLeads';

/* แผงลีดจากแบบตรวจสุขภาพระบบ (/checkup)
 * ตอบคำถามเดียว: "วันนี้ควรโทรหาใครก่อน" — เรียงตามความน่าติดต่อ ไม่ใช่เรียงตามเวลา
 * เพราะลีดที่มาก่อนไม่ได้แปลว่าน่าคุยกว่า และการไล่ตามลำดับเวลาทำให้พลาดคนที่ตั้งใจจริง */

const HEAT: Record<ScoredLead['heat'], { label: string; color: string; bg: string }> = {
  hot: { label: '🔥 ร้อน', color: '#b91c1c', bg: '#fef2f2' },
  warm: { label: '🌤 อุ่น', color: '#b45309', bg: '#fffbeb' },
  cold: { label: '❄️ เย็น', color: '#475569', bg: '#f8fafc' },
};

const btn: React.CSSProperties = {
  background: 'transparent', color: 'var(--ink)', border: '1px solid var(--sand)',
  borderRadius: 8, padding: '7px 14px', fontWeight: 600, fontSize: 12.5,
  cursor: 'pointer', fontFamily: 'inherit',
};

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '12px 14px', background: 'var(--cream2)' }}>
      <div style={{ fontSize: 12, color: 'var(--ink3)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>{value}</div>
      {hint && <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>{hint}</div>}
    </div>
  );
}

export default function CheckupLeadsTab() {
  const [leads, setLeads] = useState<ScoredLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [onlyHot, setOnlyHot] = useState(false);

  async function load() {
    setLoading(true); setMsg(null);
    const rows = await loadCheckupLeads(300);
    setLoading(false);
    if (!rows) { setMsg('โหลดไม่สำเร็จ — ต้องเป็นผู้ดูแลระบบ และต้องต่อ Supabase'); return; }
    setLeads(rankLeads(rows));
    if (rows.length === 0) setMsg('ยังไม่มีใครทำแบบตรวจสุขภาพ — ลองแชร์ ceoaithailand.org/check ดูครับ');
  }

  useEffect(() => { if (isSupabaseEnabled) void load(); }, []);

  const stats = useMemo(() => checkupLeadStats(leads, new Date().toISOString()), [leads]);
  const shown = onlyHot ? leads.filter((l) => l.heat === 'hot') : leads;

  function download() {
    const blob = new Blob(['﻿' + checkupLeadsCsv(leads)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `checkup-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px' }}>ลีดจากแบบตรวจสุขภาพระบบ</h2>
        <p style={{ color: 'var(--ink3)', fontSize: 13, margin: 0, lineHeight: 1.7 }}>
          คนที่ทำแบบประเมินที่ <b>/checkup</b> แล้วขอรายงานเต็ม —
          เรียงตาม<b>ความน่าติดต่อ</b> ไม่ใช่ตามเวลา เพราะคนที่มาก่อนไม่ได้แปลว่าน่าคุยกว่า
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={btn} onClick={() => void load()} disabled={loading}>
          {loading ? 'กำลังโหลด…' : '↻ โหลดใหม่'}
        </button>
        <button style={btn} onClick={() => setOnlyHot((v) => !v)}>
          {onlyHot ? 'แสดงทั้งหมด' : '🔥 เฉพาะลีดร้อน'}
        </button>
        <button style={btn} onClick={download} disabled={leads.length === 0}>⬇ ดาวน์โหลด CSV</button>
      </div>

      {msg && <div style={{ color: 'var(--ink3)', fontSize: 13 }}>{msg}</div>}

      {leads.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          <Stat label="ลีดทั้งหมด" value={stats.total} hint={`7 วันล่าสุด ${stats.last7d}`} />
          <Stat label="ควรติดต่อก่อน" value={stats.hot} hint="ตั้งใจจริง + มีงานให้ทำ" />
          <Stat label="คุยต่อได้" value={stats.warm} />
          <Stat label="ทำแบบเต็ม" value={stats.full} hint={`ระบุบริษัท ${stats.withCompany}`} />
          <Stat label="คะแนนเฉลี่ย" value={`${stats.avgPct}%`} hint="ยิ่งต่ำ ยิ่งมีงาน" />
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {shown.map((l) => {
          const h = HEAT[l.heat];
          return (
            <div key={l.id} style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '13px 15px', background: 'var(--cream2)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ background: h.bg, color: h.color, border: `1px solid ${h.color}33`, borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                  {h.label}
                </span>
                <a href={`mailto:${l.email}`} style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14.5 }}>{l.email}</a>
                {l.company && <span style={{ color: 'var(--ink3)', fontSize: 13.5 }}>· {l.company}</span>}
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink3)' }}>
                  {l.sent_at ? '✉️ ส่งรายงานแล้ว' : '⏳ ยังไม่ส่ง'} · {l.created_at.slice(0, 10)}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--ink3)', marginBottom: 6 }}>
                <span>คะแนน <b style={{ color: l.pct < 40 ? '#b91c1c' : l.pct < 70 ? '#b45309' : '#15803d' }}>{l.pct}%</b></span>
                <span>{BAND_LABEL_TH[l.band ?? ''] ?? l.band ?? '—'}</span>
                <span>{sourceLabel(l.source)}</span>
              </div>

              <div style={{ fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.6 }}>{l.heatReason}</div>
            </div>
          );
        })}
      </div>

      {leads.length > 0 && shown.length === 0 && (
        <div style={{ color: 'var(--ink3)', fontSize: 13 }}>ยังไม่มีลีดร้อนในตอนนี้ — กดแสดงทั้งหมดเพื่อดูรายอื่น</div>
      )}
    </div>
  );
}
