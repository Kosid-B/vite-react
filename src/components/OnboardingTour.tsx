import { useState } from 'react';
import type { PageId } from '../types';

/**
 * ทัวร์ต้อนรับ step-by-step สำหรับผู้ใช้ครั้งแรก (เสริม JourneyGuide ที่ต้องกดเอง)
 * แสดงครั้งเดียว — เก็บสถานะใน localStorage · ปิด/ข้ามได้ทุกเมื่อ
 * เน้นสอนแนวคิด "ลูกค้ามาก่อน" (customer-first) + ชี้จุดเริ่มต้น
 */
const STEPS: { icon: string; title: string; body: string; cta?: string }[] = [
  {
    icon: '👋',
    title: 'ยินดีต้อนรับสู่ CEO AI Thailand',
    body: 'สร้างธุรกิจด้วย "ทีมพนักงาน AI" ที่ทำงานแทนคุณตลอด 24 ชม. — แม้ไม่เคยทำธุรกิจมาก่อนก็เริ่มได้',
  },
  {
    icon: '🧭',
    title: 'คุณมีทีม AI ทั้งบริษัท',
    body: 'CEO วางแผน · CMO ทำการตลาด · และตำแหน่งอื่นที่คุณจ้างเพิ่มได้ — พวกเขารับคำสั่งแล้วลงมือทำจริง ไม่ใช่แค่แชตบอต',
  },
  {
    icon: '🔍',
    title: 'เราเริ่มจาก "รู้จักลูกค้าก่อน"',
    body: 'ต่างจากที่อื่น — ตามหลัก MIT 24 Steps เราเข้าใจลูกค้าตัวจริงก่อน แล้วค่อยสร้างสินค้า (ไม่ใช่ทำของก่อนแล้วหาคนซื้อไม่เจอ)',
  },
  {
    icon: '🗺️',
    title: 'มีตัวช่วยนำทางทุกขั้น',
    body: 'ปุ่ม 🧭 มุมซ้ายล่างจะบอกทีละขั้นว่าต้องทำอะไรต่อ — ทำตามแล้วได้ XP เลื่อนระดับบริษัท',
  },
  {
    icon: '🚀',
    title: 'พร้อมเริ่มแล้ว!',
    body: 'ไปที่หน้า "บริษัท AI" เพื่อตั้งเป้าหมายและปลุกทีม AI ตัวแรกของคุณ',
    cta: 'ไปที่ บริษัท AI →',
  },
];

const KEY = 'ceo_ai_onboarded';

export default function OnboardingTour({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const [open, setOpen] = useState<boolean>(() => localStorage.getItem(KEY) !== '1');
  const [step, setStep] = useState(0);

  if (!open) return null;

  function finish(go: boolean) {
    localStorage.setItem(KEY, '1');
    setOpen(false);
    if (go) onNavigate('aicompany');
  }

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="onb-overlay">
      <div className="onb-card" role="dialog" aria-modal="true" aria-label="ทัวร์แนะนำการใช้งาน">
        <button className="onb-skip" onClick={() => finish(false)}>ข้าม</button>
        <div className="onb-icon">{s.icon}</div>
        <div className="onb-title">{s.title}</div>
        <div className="onb-body">{s.body}</div>

        <div className="onb-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`onb-dot${i === step ? ' active' : ''}`} />
          ))}
        </div>

        <div className="onb-actions">
          {step > 0 && (
            <button className="onb-back" onClick={() => setStep(step - 1)}>ย้อนกลับ</button>
          )}
          {last ? (
            <button className="onb-next" onClick={() => finish(true)}>{s.cta ?? 'เริ่มเลย'}</button>
          ) : (
            <button className="onb-next" onClick={() => setStep(step + 1)}>ถัดไป →</button>
          )}
        </div>
      </div>
    </div>
  );
}
