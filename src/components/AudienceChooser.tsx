import { useEffect } from 'react';
import { BRAND } from '../config';
import { track } from '../lib/analytics';
import { TERM_TH } from '../lib/terms';
import type { AudienceType } from '../types';

/* AudienceChooser — ขั้นแรกสุดของ onboarding: "คุณขายให้ใคร?" (B2B/B2C)
 * เลือกก่อน GoalChooser เพื่อกัน Persona สับสน (ลูกค้าองค์กร vs ผู้บริโภค คนละแบบ)
 * แสดงคำไทยคู่ EN เสมอ (SME ไม่งงศัพท์) */

const OPTS: { type: AudienceType; icon: string; example: string }[] = [
  { type: 'b2c', icon: '🛍️', example: 'เช่น ร้านอาหาร คาเฟ่ ร้านค้า คลินิก — ขายให้คนทั่วไปที่ซื้อกินซื้อใช้เอง' },
  { type: 'b2b', icon: '🏢', example: 'เช่น ค้าส่ง วัตถุดิบ ขนส่ง บริการองค์กร — ขายให้บริษัท/ร้านค้าที่ซื้อประจำ' },
];

export default function AudienceChooser({ onPick }: { onPick: (t: AudienceType) => void }) {
  useEffect(() => { track('audience_chooser_shown', {}); }, []);

  return (
    <div className="goal-overlay" role="dialog" aria-modal="true" aria-label="เลือกกลุ่มลูกค้า">
      <div className="goal-card">
        <div className="goal-brand">{BRAND.product}</div>
        <h1 className="goal-title">คุณขายให้ใครเป็นหลัก?</h1>
        <p className="goal-sub">เลือกก่อน 1 ข้อ — ระบบจะปรับ “กลุ่มลูกค้าตัวอย่าง (Persona)” และคำแนะนำให้ตรงแบบธุรกิจคุณ ไม่ปนกันจนงง</p>

        <div className="goal-grid">
          {OPTS.map(o => {
            const t = TERM_TH[o.type];
            return (
              <button key={o.type} className="goal-opt" onClick={() => { track('audience_chosen', { type: o.type }); onPick(o.type); }}>
                <span className="goal-opt-ico" aria-hidden="true">{o.icon}</span>
                <span className="goal-opt-title">{t.th} <span style={{ opacity: 0.7, fontWeight: 600 }}>({t.en})</span></span>
                <span className="goal-opt-desc">{o.example}</span>
                <span className="goal-opt-go">เลือกอันนี้ →</span>
              </button>
            );
          })}
        </div>
        <p className="goal-sub" style={{ marginTop: 14, fontSize: 12.5, opacity: 0.8 }}>เปลี่ยนทีหลังได้ · ขายทั้งสองแบบก็เลือกที่เป็น “หลัก” ก่อนได้</p>
      </div>
    </div>
  );
}
