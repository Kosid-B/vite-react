import type { AppData } from '../types';
import { de24Journey } from '../lib/de24Journey';
import { track } from '../lib/analytics';

/* ===== MIT 24-Step · Guided Journey card =====
 * "เส้นทางเดินทีละขั้น" — โชว์เฉพาะ "ขั้นถัดไปที่ต้องทำ" (ไม่ใช่ 24 ขั้นพร้อมกัน)
 * ผูกข้อมูลจริง businessModel.de24 · ทำเครื่องหมายเสร็จ = เดินไปขั้นถัดไปอัตโนมัติ
 * ทำให้ positioning "สร้างต้นน้ำให้แข็งแรงก่อน ไม่ข้ามขั้น" จับต้องได้ในโปรดักต์ */

interface Props {
  data: AppData;
  onUpdate: (d: AppData) => void;
  onFocusStep?: (index: number) => void;   // เปิด/เลื่อนไปที่ขั้นนั้นในแคนวาสด้านล่าง (จดบันทึก/ลงมือ)
}

export default function De24Guide({ data, onUpdate, onFocusStep }: Props) {
  const j = de24Journey(data);
  const bm = data.businessModel;

  function markDone(index: number) {
    const de24 = [...(bm?.de24 ?? [])];
    while (de24.length < 24) de24.push({ done: false, notes: '' });
    de24[index] = { ...de24[index], done: true };
    onUpdate({ ...data, businessModel: { ...bm, de24 } });
    track('de24_step_done', { step: index + 1, total_done: j.done + 1 });
  }

  return (
    <div className="de24g">
      <div className="de24g-hd">
        <div className="de24g-title">🧭 เส้นทางสร้างธุรกิจ 24 ขั้น (MIT)</div>
        <div className="de24g-count"><b>{j.done}</b>/24 · {j.pct}%</div>
      </div>
      <div className="de24g-bar"><div className="de24g-bar-fill" style={{ width: `${j.pct}%` }} /></div>

      {j.complete ? (
        <div className="de24g-done">
          <div className="de24g-done-ic">🎉</div>
          <div>
            <b>ครบทั้ง 24 ขั้นแล้ว!</b> ต้นน้ำธุรกิจของคุณผ่านการตรวจสอบเป็นระบบ —
            เลื่อนลงไปกด <b>“CEO ตั้งต้น BMC จากผล 24-Step”</b> เพื่อแปลงเป็นโมเดลธุรกิจ แล้วลงมือทำต่อ
          </div>
        </div>
      ) : j.current ? (
        <>
          <div className="de24g-phase">
            ระยะ {j.current.phase + 1}/4 · <b>{j.current.phaseLabel}</b>
            {j.phaseProgress && <span className="de24g-phase-prog"> ({j.phaseProgress.done}/{j.phaseProgress.total} ในระยะนี้)</span>}
          </div>
          <div className="de24g-intent">{j.phaseIntent}</div>

          <div className="de24g-current">
            <div className="de24g-current-num">{j.current.num}</div>
            <div className="de24g-current-body">
              <div className="de24g-current-name">{j.current.name}</div>
              <div className="de24g-current-guide">{j.current.guide}</div>
            </div>
          </div>

          <div className="de24g-actions">
            <button className="de24g-btn primary" onClick={() => markDone(j.current!.index)}>
              ✓ ทำขั้นนี้เสร็จ — ไปขั้นถัดไป
            </button>
            {onFocusStep && (
              <button className="de24g-btn" onClick={() => onFocusStep(j.current!.index)}>
                ✍️ จดบันทึก / ให้ AI ช่วยขั้นนี้
              </button>
            )}
          </div>

          {j.next && (
            <div className="de24g-next">ถัดไป: <b>#{j.next.num}</b> {j.next.name}</div>
          )}
          {!j.started && (
            <div className="de24g-hint">เริ่มจากขั้นที่ 1 — ทำทีละขั้นตามลำดับ ไม่ต้องรีบ ไม่ข้ามขั้น</div>
          )}
        </>
      ) : null}
    </div>
  );
}
