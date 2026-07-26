import { useEffect } from 'react';
import { BRAND } from '../config';
import { track } from '../lib/analytics';
import type { OnboardGoal, PageId } from '../types';

/** First-run: "วันนี้อยากทำอะไร?" — เลือก 1 เป้าหมาย → พาไปเครื่องมือนั้นทันที (เข้าง่าย + ลึกได้)
 *  เห็น aha เร็ว ไม่เจอ 20 เมนูพร้อมกัน · ที่เหลือปลดล็อกทีหลัง (โหมดโฟกัสใน Sidebar) */

const GOALS: { goal: OnboardGoal; page: PageId; icon: string; title: string; desc: string; tag?: string }[] = [
  { goal: 'pdpa', page: 'privacy', icon: '🔐', title: 'งาน PDPA', tag: 'ยอดฮิต',
    desc: 'ร่าง Privacy Notice / SOP ตาม พ.ร.บ.คุ้มครองข้อมูลฯ — เห็นเอกสารเต็มใน 2 นาที' },
  { goal: 'iso', page: 'compliance', icon: '📋', title: 'งาน ISO 9001 / มอก.',
    desc: 'ตรวจความพร้อมเอกสารก่อน auditor มา — เห็น Readiness Score + ข้อที่ยังขาดทันที' },
  { goal: 'aicompany', page: 'aicompany', icon: '🏢', title: 'สร้างบริษัท AI',
    desc: 'ให้ CEO AI จัดทีมผู้บริหาร + วางแผน + เดินธุรกิจให้อัตโนมัติ' },
];

export default function GoalChooser({ onPick, onSkip }: {
  onPick: (goal: OnboardGoal, page: PageId) => void;
  onSkip: () => void;
}) {
  useEffect(() => { track('goal_chooser_shown', {}); }, []);

  return (
    <div className="goal-overlay" role="dialog" aria-modal="true" aria-label="เลือกเป้าหมายเริ่มต้น">
      <div className="goal-card">
        <div className="goal-brand">{BRAND.product}</div>
        <h1 className="goal-title">วันนี้อยากทำอะไรก่อนดี?</h1>
        <p className="goal-sub">เลือก 1 อย่าง — เราจะพาไปที่เครื่องมือนั้นเลย ไม่ต้องงงกับเมนูเยอะ ๆ (ที่เหลือปลดล็อกทีหลังได้)</p>

        <div className="goal-grid">
          {GOALS.map(g => (
            <button key={g.goal} className="goal-opt" onClick={() => { track('goal_chosen', { goal: g.goal }); onPick(g.goal, g.page); }}>
              {g.tag && <span className="goal-opt-tag">{g.tag}</span>}
              <span className="goal-opt-ico" aria-hidden="true">{g.icon}</span>
              <span className="goal-opt-title">{g.title}</span>
              <span className="goal-opt-desc">{g.desc}</span>
              <span className="goal-opt-go">เริ่มเลย →</span>
            </button>
          ))}
        </div>

        <button className="goal-skip" onClick={() => { track('goal_skip', {}); onSkip(); }}>
          ขอดูภาพรวมทั้งหมดก่อน →
        </button>
      </div>
    </div>
  );
}
