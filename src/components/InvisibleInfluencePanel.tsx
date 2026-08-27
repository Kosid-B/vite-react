import { useMemo } from 'react';
import type { AppData, PageId } from '../types';
import { assessInvisibleInfluence } from '../lib/invisibleInfluence';

/* InvisibleInfluencePanel — ตรวจ "ร่องรอยแบรนด์" ต่อกลุ่มพลังเงียบ (Invisible Consumers ~39%)
 * จากผลศึกษา MI GROUP: 3 เสา Be Found / Be Remembered / Be Recommended
 * ให้คะแนนจากข้อมูลจริง + ช่องว่างที่กดไปปิดในระบบได้ (นำ insight มาพัฒนาระบบเรา) */

/* 🔴 เดิมเป็นชุดสีตายตัวของธีมเข้มชุดเดียว ⇒ ในธีมสว่างทั้งแผงเป็นสีเข้มบนพื้นขาว
 *    (วัดจริง 27 ส.ค. 2569 ด้วย scripts/contrast-audit.mjs ที่เพิ่งซ่อมให้ผสมชั้นโปร่งแสง)
 *    ⇒ ใช้โทเคนธีมแทน · ธีมเข้มได้ค่าเดิม เพราะโทเคนถูกประกาศให้ตรงกับค่าสำรองเดิม
 *    ⚠️ สีที่ใช้เป็น "ตัวหนังสือ" ต้องใช้ตัวแปร `-text` — สีสดบนพื้นขาวได้ contrast 1.3–2.4 */
const C = { border: 'var(--sand)', panel: 'var(--panel)', card: 'var(--card)', white: 'var(--ink1)', slate: 'var(--muted)', violet: 'var(--violet-text)', green: 'var(--green-text)', amber: 'var(--amber-text)', red: 'var(--red-text)' };
const barColor = (s: string) => (s === 'strong' ? C.green : s === 'partial' ? C.amber : C.red);

export default function InvisibleInfluencePanel({ data, onNavigate }: { data: AppData; onNavigate?: (p: PageId) => void }) {
  const a = useMemo(() => assessInvisibleInfluence(data), [data]);

  return (
    <section style={{ marginTop: 16, borderRadius: 16, border: `1px solid ${C.border}`, background: C.panel, padding: '20px 22px' }}>
      <div style={{ fontSize: 'clamp(16px, 2.2vw, 20px)', fontWeight: 800, color: C.white }}>
        🐾 ร่องรอยแบรนด์ต่อ “กลุ่มพลังเงียบ” — <span style={{ color: C.violet }}>Invisible Influence</span>
      </div>
      <div style={{ color: C.slate, fontSize: 13, margin: '4px 0 14px', lineHeight: 1.6 }}>
        เกือบ 40% ของคนดิจิทัลไม่ Like/Comment/Share แต่จดจำ+ค้นหา+ซื้อภายหลัง — ตรวจว่าคุณ “ทิ้งร่องรอย” ให้เขาตามกลับมาเจอครบไหม
      </div>

      {/* overall */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', background: C.card, marginBottom: 14 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: barColor(a.overall >= 67 ? 'strong' : a.overall >= 34 ? 'partial' : 'weak') }}>{a.overall}<span style={{ fontSize: 14, color: C.slate }}>/100</span></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, color: C.slate }}>ความชัดของร่องรอยแบรนด์: <b style={{ color: C.white }}>{a.trail}</b></div>
          <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.5, marginTop: 2 }}>{a.headline}</div>
        </div>
      </div>

      {/* pillars */}
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {a.pillars.map(p => (
          <div key={p.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', background: C.card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.white }}>{p.thai}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: barColor(p.status) }}>{p.score}</div>
            </div>
            <div style={{ fontSize: 11, color: C.slate, marginBottom: 6 }}>{p.label}</div>
            <div style={{ height: 6, borderRadius: 999, background: '#0b1220', overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${p.score}%`, height: '100%', background: barColor(p.status) }} />
            </div>
            <div style={{ fontSize: 11, color: C.slate, fontStyle: 'italic', marginBottom: 8, lineHeight: 1.5 }}>“{p.quote}”</div>

            {p.done.length > 0 && (
              <ul style={{ margin: '0 0 8px', paddingLeft: 16, color: C.green, fontSize: 12, lineHeight: 1.6 }}>
                {p.done.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            )}
            {p.gaps.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {p.gaps.map((g, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                    ⚠️ {g.text}
                    {onNavigate && g.page && (
                      <button onClick={() => onNavigate(g.page!)}
                        style={{ marginLeft: 6, fontFamily: 'inherit', fontSize: 11, fontWeight: 700, color: C.violet, background: 'transparent', border: `1px solid ${C.violet}`, borderRadius: 999, padding: '2px 8px', cursor: 'pointer' }}>
                        ไปทำ →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: C.slate, marginTop: 12, lineHeight: 1.6 }}>
        📌 แบรนด์ไม่ได้ชนะในวันที่ผู้บริโภค Engage แต่ชนะในวันที่ผู้บริโภค “เลือก” — วัดผลให้กว้างกว่า Like/Comment/Share
      </div>
    </section>
  );
}
