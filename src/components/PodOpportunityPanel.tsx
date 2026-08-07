import { useMemo } from 'react';
import type { AppData } from '../types';
import { businessInfoFromData } from '../lib/successVideoScript';
import { suggestPod } from '../lib/podSuggest';

/* PodOpportunityPanel — "POP" อันดับสินค้า Print-on-Demand ที่น่าลอง ให้ตรงกลุ่มเป้าหมาย
 * จัดอันดับด้วย "คะแนนความเหมาะ (fit)" จากข้อมูลธุรกิจผู้ใช้ — ไม่ใช่ยอดขายจริง (โปร่งใส)
 * ใช้ CSS variables → รองรับทั้งธีมเข้ม/มินิมอล */

const rankBg = ['#f59e0b', '#94a3b8', '#b45309']; // ทอง/เงิน/ทองแดง

export default function PodOpportunityPanel({ data }: { data: AppData }) {
  const info = useMemo(() => businessInfoFromData(data), [data]);
  const items = useMemo(
    () => suggestPod({ audience: info.audience, industry: info.industry, persona: info.persona, valueProp: info.valueProp, company: info.company }, 6),
    [info],
  );
  const scoreColor = (s: number) => (s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--ink3)');

  return (
    <section style={{ margin: '18px 0', borderRadius: 16, border: '1px solid var(--sand)', background: 'var(--cream2)', padding: '18px 20px' }}>
      <div style={{ fontSize: 'clamp(15px, 2.2vw, 19px)', fontWeight: 800, color: 'var(--ink)' }}>
        🔥 น่าขาย — สินค้า Print-on-Demand ที่เข้ากับกลุ่มเป้าหมายคุณ
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ink3)', margin: '4px 0 12px', lineHeight: 1.6 }}>
        {info.industry || info.audience
          ? <>จัดอันดับตาม “ความเหมาะกับธุรกิจ {info.company || 'ของคุณ'}{info.industry ? ` · ${info.industry}` : ''}” — PoD ผลิตเมื่อสั่ง ไม่ต้องสต็อก ความเสี่ยงต่ำ</>
          : <>กรอกประเภทธุรกิจ/กลุ่มลูกค้า (หน้า “บริษัท AI”) เพื่อให้จัดอันดับตรงธุรกิจคุณมากขึ้น</>}
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {items.map(s => (
          <div key={s.product.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', border: '1px solid var(--sand)', borderRadius: 12, padding: '12px 14px', background: 'var(--cream)' }}>
            <div style={{ flex: 'none', width: 26, height: 26, borderRadius: 7, background: rankBg[s.rank - 1] ?? 'var(--sand)', color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.rank}</div>
            <div style={{ flex: 'none', fontSize: 26, lineHeight: 1 }} aria-hidden="true">{s.product.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{s.product.label}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: scoreColor(s.fitScore) }}>ความเหมาะ {s.fitScore}<span style={{ fontSize: 11, color: 'var(--ink3)' }}>/100</span></div>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: 'var(--cream3)', overflow: 'hidden', margin: '5px 0 8px' }}>
                <div style={{ width: `${s.fitScore}%`, height: '100%', background: scoreColor(s.fitScore) }} />
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--ink2)', marginBottom: 6 }}>
                <span>💵 {s.priceRange}/ชิ้น</span>
                <span>📈 {s.marginNote}</span>
              </div>
              <ul style={{ margin: '0 0 6px', paddingLeft: 16, color: 'var(--ink3)', fontSize: 12, lineHeight: 1.6 }}>
                {s.why.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
              <div style={{ fontSize: 12, color: 'var(--ink2)' }}>🎨 <b>ไอเดียลาย:</b> {s.designAngle} · <b>กลุ่ม:</b> {s.targetGroup}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 10, lineHeight: 1.6 }}>
        📌 “ความเหมาะ” คำนวณจากกลุ่มเป้าหมาย+ประเภทธุรกิจของคุณ — <b>ไม่ใช่ตัวเลขยอดขายจริง</b> · เป็นไอเดียช่วยเลือกลองทำ (พิสูจน์ดีมานด์ก่อนผลิตจริงเสมอ)
      </div>
    </section>
  );
}
