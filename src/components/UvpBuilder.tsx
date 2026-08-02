import { useState } from 'react';
import type { AppData } from '../types';
import { buildUvp, MOAT_LABEL, type MoatType } from '../lib/uvpBuilder';
import { track } from '../lib/analytics';

/* UvpBuilder — Unique Value Proposition builder (Superorganism เสา 3: Specialization/Defense)
 * สร้างประโยค UVP จากองค์ประกอบจริง + ให้คะแนน 4 มิติ (รวม moat/ลอกยาก) + โค้ชจุดอ่อน
 * ต่อยอด VRIO (defensibility ↔ ความได้เปรียบยั่งยืน) */

const GRADE: Record<string, { label: string; color: string }> = {
  strong: { label: 'แข็งแรง', color: '#16a34a' }, developing: { label: 'กำลังพัฒนา', color: '#d97706' }, weak: { label: 'ยังอ่อน', color: '#dc2626' },
};
const MOATS: MoatType[] = ['network', 'data', 'ip', 'brand', 'switching', 'cost', 'none'];

export default function UvpBuilder({ data }: { data: AppData }) {
  const [f, setF] = useState({
    segment: data.aiCompany?.industry ?? '', pain: '', benefit: '', quantified: '',
    competitor: '', differentiator: '', moatType: 'none' as MoatType,
  });
  const [copied, setCopied] = useState(false);
  const r = buildUvp(f);
  const g = GRADE[r.grade];
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF(p => ({ ...p, [k]: e.target.value })); setCopied(false); };

  const inp = (label: string, k: keyof typeof f, ph: string) => (
    <div style={{ flex: '1 1 240px' }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink3,#475569)', display: 'block', marginBottom: 3 }}>{label}</label>
      <input value={f[k]} onChange={set(k)} placeholder={ph}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--sand,#e2e8f0)', background: 'var(--cream,#fff)', color: 'var(--ink,#0f172a)', fontFamily: 'inherit', fontSize: 13.5 }} />
    </div>
  );

  function copy() {
    track('uvp_built', { grade: r.grade, score: r.score, moat: f.moatType });
    navigator.clipboard?.writeText(r.statement).then(() => setCopied(true)).catch(() => setCopied(true));
  }

  return (
    <div style={{ background: 'var(--cream2,#f1f5f9)', border: '1px solid var(--sand,#e2e8f0)', borderRadius: 12, padding: '18px 20px', marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 18 }}>🎯</span>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink,#0f172a)' }}>UVP Builder — จุดขายที่ลอกยาก</h3>
        <span style={{ fontSize: 10.5, fontWeight: 700, background: 'var(--cream3,#e2e8f0)', color: 'var(--ink4,#64748b)', padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase' }}>Premium</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink3,#475569)', margin: '0 0 14px', lineHeight: 1.6 }}>
        สร้าง Unique Value Proposition จากองค์ประกอบจริง — วัด 4 มิติ (ตรงกลุ่ม · คุณค่า · ต่าง · <strong>ลอกยาก/moat</strong>) แล้วปรับให้คม
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        {inp('ลูกค้าเป้าหมาย', 'segment', 'เช่น ร้านกาแฟ SME')}
        {inp('ปัญหา/งานที่ต้องแก้', 'pain', 'เช่น ไม่มีเวลาทำการตลาด')}
        {inp('คุณค่า/ผลลัพธ์หลัก', 'benefit', 'เช่น ได้ลูกค้าประจำเพิ่ม')}
        {inp('ตัวเลขคุณค่า (ถ้ามี)', 'quantified', 'เช่น +20 ลูกค้า/เดือน')}
        {inp('ทางเลือกเดิม/คู่แข่ง', 'competitor', 'เช่น จ้างเอเจนซี่')}
        {inp('จุดต่างหลัก', 'differentiator', 'เช่น AI ทำ 24 ชม. ราคาเศษเสี้ยว')}
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink3,#475569)', display: 'block', marginBottom: 3 }}>ประเภท moat (จุดที่ทำให้ลอกยาก)</label>
        <select value={f.moatType} onChange={set('moatType')}
          style={{ width: '100%', maxWidth: 380, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--sand,#e2e8f0)', background: 'var(--cream,#fff)', color: 'var(--ink,#0f172a)', fontFamily: 'inherit', fontSize: 13.5 }}>
          {MOATS.map(m => <option key={m} value={m}>{MOAT_LABEL[m]}</option>)}
        </select>
      </div>

      {/* statement + score */}
      <div style={{ padding: '14px 16px', borderRadius: 8, background: 'var(--cream,#fff)', border: '1px solid var(--sand,#e2e8f0)', borderLeft: `4px solid ${g.color}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: g.color }}>UVP · {g.label}</span>
          <span style={{ marginLeft: 'auto', fontSize: 20, fontWeight: 800, color: g.color }}>{r.score}<span style={{ fontSize: 12, fontWeight: 600 }}>/100</span></span>
        </div>
        <div style={{ fontSize: 14.5, color: 'var(--ink,#0f172a)', lineHeight: 1.6, fontWeight: 600 }}>“{r.statement}”</div>
        <button onClick={copy} style={{ marginTop: 8, background: copied ? '#16a34a' : '#06b6d4', color: '#fff', border: 0, borderRadius: 8, padding: '7px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
          {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอก UVP'}
        </button>

        <div style={{ display: 'grid', gap: 6, margin: '12px 0 0' }}>
          {r.dimensions.map(d => (
            <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
              <span style={{ width: 44, color: d.level === 2 ? '#16a34a' : d.level === 1 ? '#d97706' : '#dc2626', fontWeight: 700 }}>{d.level === 2 ? '●●●' : d.level === 1 ? '●●○' : '●○○'}</span>
              <span style={{ flex: 1, color: 'var(--ink3,#475569)' }}>{d.label}</span>
              <span style={{ color: 'var(--ink4,#64748b)', fontSize: 11.5 }}>{d.note}</span>
            </div>
          ))}
        </div>

        <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--ink3,#475569)', lineHeight: 1.6 }}>
          {r.coaching.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </div>

      {r.variants.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: 12.5, color: 'var(--ink4,#64748b)', cursor: 'pointer' }}>ทางเลือกถ้อยคำ UVP อีก {r.variants.length} แบบ</summary>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--ink3,#475569)', lineHeight: 1.7 }}>
            {r.variants.map((v, i) => <li key={i}>{v}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}
