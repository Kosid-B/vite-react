import type { AppData, PageId } from '../types';
import { ahaProgress } from '../lib/ahaMoment';

/** การ์ด "Aha ใน 5 นาที" — พาผู้ใช้ใหม่ไปเจอคุณค่าหลักเร็วที่สุด (activation)
 *  ซ่อนเมื่อผู้ใช้ปิด (ahaDismissed) · แสดง celebration เมื่อครบ 3 ก้าว */
export default function AhaMoment({ data, onUpdate, onNavigate }: {
  data: AppData; onUpdate: (d: AppData) => void; onNavigate: (p: PageId) => void;
}) {
  if (data.ahaDismissed) return null;
  const a = ahaProgress(data);

  if (a.activated) {
    return (
      <div className="aha aha-done">
        <span className="aha-done-emoji">🎉</span>
        <div className="aha-done-body">
          <div className="aha-done-title">Aha! บริษัท AI ของคุณทำงานเองแล้ว</div>
          <div className="aha-done-sub">ตั้งเป้าหมาย → CEO สร้างทีม → บริษัทเริ่มเดินเอง = คุณค่าหลักของระบบ · ไปต่อที่ Quest ด้านล่างเพื่อปลดฟีเจอร์เต็ม</div>
        </div>
        <button className="aha-dismiss" onClick={() => onUpdate({ ...data, ahaDismissed: true })}>รับทราบ ✓</button>
      </div>
    );
  }

  return (
    <div className="aha">
      <div className="aha-hd">
        <span className="aha-title">⚡ เริ่มใน 5 นาที — ให้บริษัท AI ทำงานเอง</span>
        <span className="aha-time">⏱️ เหลือ ~{a.minsLeft} นาที</span>
        <button className="aha-x" title="ซ่อน" onClick={() => onUpdate({ ...data, ahaDismissed: true })}>✕</button>
      </div>
      <div className="aha-track"><div className="aha-fill" style={{ width: `${a.pct}%` }} /></div>
      <div className="aha-steps">
        {a.steps.map((s, i) => (
          <button
            key={s.id}
            className={`aha-step${s.complete ? ' done' : ''}${!s.complete && a.nextStep?.id === s.id ? ' next' : ''}`}
            onClick={() => onNavigate(s.page)}
          >
            <span className="aha-step-ico">{s.complete ? '✅' : s.icon}</span>
            <span className="aha-step-body">
              <span className="aha-step-label">{i + 1}. {s.label} <span className="aha-step-mins">~{s.mins} นาที</span></span>
              <span className="aha-step-hint">{s.hint}</span>
            </span>
            {!s.complete && <span className="aha-step-go">→</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
