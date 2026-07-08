import { useMemo, useState } from 'react';
import type { AppData, PageId } from '../types';
import {
  INDUSTRY_OPTIONS, GOAL_MIN_LEN, setupProgress,
  pendingInputSteps, teamDone, applyIndustry, applyGoal, initialFieldValue,
  type SetupStepDef,
} from '../lib/setupWizard';

/**
 * Setup Wizard อัจฉริยะ — ต้อนรับผู้ใช้ครั้งแรก **พร้อมตั้งค่าบริษัทให้เสร็จ** (activation)
 * ต่างจากทัวร์เดิม (ข้อความล้วน): เก็บ industry + goal อินไลน์ → ผู้ใช้ออกจาก wizard
 * โดยบริษัทถูกตั้งค่าแล้ว (ไม่เคว้าง) · adaptive: ข้ามขั้นที่ทำแล้ว, ทำต่อจากจุดที่ค้าง
 * แสดงครั้งเดียว (localStorage) · ปิด/ข้ามได้ทุกเมื่อ
 */

const KEY = 'ceo_ai_onboarded';

interface IntroSlide { icon: string; title: string; body: string }
const INTRO: IntroSlide[] = [
  {
    icon: '👋', title: 'ยินดีต้อนรับสู่ CEO AI Thailand',
    body: 'สร้างธุรกิจด้วย "ทีมพนักงาน AI" ที่ทำงานแทนคุณ 24 ชม. — แม้ไม่เคยทำธุรกิจมาก่อนก็เริ่มได้ ใช้เวลาตั้งค่าไม่ถึง 1 นาที',
  },
  {
    icon: '🔍', title: 'เราเริ่มจาก "รู้จักลูกค้าก่อน"',
    body: 'ตามหลัก MIT 24 Steps — เข้าใจลูกค้าตัวจริงก่อน แล้วค่อยสร้างสินค้า (ไม่ใช่ทำของก่อนแล้วหาคนซื้อไม่เจอ)',
  },
];

type Slide =
  | { kind: 'intro'; slide: IntroSlide }
  | { kind: 'setup'; step: SetupStepDef }
  | { kind: 'finish' };

interface Props {
  data: AppData;
  onNavigate: (p: PageId) => void;
  onUpdate: (d: AppData) => void;
}

export default function OnboardingTour({ data, onNavigate, onUpdate }: Props) {
  const [open, setOpen] = useState<boolean>(() => localStorage.getItem(KEY) !== '1');
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState('');
  const [touched, setTouched] = useState(false);

  // สร้างลำดับสไลด์ครั้งเดียวตอนเปิด (freeze) — เก็บเฉพาะขั้น input ที่ยัง "ค้าง" ตอนนั้น
  const slides = useMemo<Slide[]>(() => {
    const pending = pendingInputSteps(data);
    return [
      ...INTRO.map(slide => ({ kind: 'intro', slide }) as Slide),
      ...pending.map(s => ({ kind: 'setup', step: s }) as Slide),
      { kind: 'finish' } as Slide,
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const cur = slides[Math.min(step, slides.length - 1)];
  const prog = setupProgress(data);

  function done(go: boolean) {
    localStorage.setItem(KEY, '1');
    setOpen(false);
    if (go) onNavigate('aicompany');
  }

  function advance() {
    setDraft(''); setTouched(false);
    if (step >= slides.length - 1) { done(false); return; }
    setStep(step + 1);
  }

  function saveSetup(s: SetupStepDef) {
    const v = draft.trim();
    if (s.id === 'industry') onUpdate(applyIndustry(data, v));
    else if (s.id === 'goal') onUpdate(applyGoal(data, v));
    advance();
  }

  const stepPrefill = cur.kind === 'setup' ? initialFieldValue(data, cur.step.id) : '';
  const value = touched ? draft : stepPrefill;
  const valid =
    cur.kind === 'setup'
      ? cur.step.id === 'goal'
        ? value.trim().length >= GOAL_MIN_LEN
        : value.trim().length > 0
      : true;

  return (
    <div className="onb-overlay">
      <div className="onb-card" role="dialog" aria-modal="true" aria-label="ตั้งค่าเริ่มต้นบริษัท AI">
        <button className="onb-skip" onClick={() => done(false)}>ข้าม</button>

        {/* แถบความคืบหน้า activation — เห็นทุกสไลด์ */}
        <div className="onb-prog" title={`ตั้งค่าบริษัทแล้ว ${prog.done}/${prog.total} ขั้น`}>
          <div className="onb-prog-track"><div className="onb-prog-fill" style={{ width: prog.pct + '%' }} /></div>
          <span className="onb-prog-text">ตั้งค่า {prog.done}/{prog.total}</span>
        </div>

        {cur.kind === 'intro' && (
          <>
            <div className="onb-icon">{cur.slide.icon}</div>
            <div className="onb-title">{cur.slide.title}</div>
            <div className="onb-body">{cur.slide.body}</div>
          </>
        )}

        {cur.kind === 'setup' && (
          <>
            <div className="onb-icon">{cur.step.id === 'industry' ? '🏷️' : '🎯'}</div>
            <div className="onb-title">{cur.step.label}</div>
            <div className="onb-body">{cur.step.hint}</div>
            <div className="onb-field">
              {cur.step.id === 'industry' ? (
                <select
                  className="onb-select" value={value}
                  onChange={e => { setTouched(true); setDraft(e.target.value); }}
                >
                  <option value="">— เลือกประเภทธุรกิจ —</option>
                  {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <textarea
                  className="onb-textarea" rows={3} value={value}
                  placeholder="เช่น เพิ่มยอดขายออนไลน์ให้ถึง ฿100,000/เดือน ภายใน 90 วัน"
                  onChange={e => { setTouched(true); setDraft(e.target.value); }}
                />
              )}
            </div>
          </>
        )}

        {cur.kind === 'finish' && (
          <>
            <div className="onb-icon">{prog.done >= prog.total ? '🎉' : '🚀'}</div>
            <div className="onb-title">{prog.done >= prog.total ? 'ตั้งค่าครบแล้ว!' : 'พร้อมเริ่มแล้ว!'}</div>
            <div className="onb-body">
              {teamDone(data)
                ? 'ทีม AI ของคุณพร้อมทำงาน — ไปที่หน้า "บริษัท AI" เพื่อมอบหมายงานแรกได้เลย'
                : 'ขั้นสุดท้าย: ไปหน้า "บริษัท AI" เพื่อสร้างทีม AI แล้วปลุกพวกเขาให้ลงมือทำงานจริง'}
            </div>
          </>
        )}

        <div className="onb-dots">
          {slides.map((_, i) => (
            <span key={i} className={`onb-dot${i === Math.min(step, slides.length - 1) ? ' active' : ''}`} />
          ))}
        </div>

        <div className="onb-actions">
          {step > 0 && cur.kind !== 'finish' && (
            <button className="onb-back" onClick={() => { setDraft(''); setTouched(false); setStep(step - 1); }}>ย้อนกลับ</button>
          )}
          {cur.kind === 'setup' ? (
            <button className="onb-next" disabled={!valid} onClick={() => saveSetup(cur.step)}>บันทึกแล้วไปต่อ →</button>
          ) : cur.kind === 'finish' ? (
            <button className="onb-next" onClick={() => done(true)}>ไปที่ บริษัท AI →</button>
          ) : (
            <button className="onb-next" onClick={advance}>ถัดไป →</button>
          )}
        </div>
      </div>
    </div>
  );
}
