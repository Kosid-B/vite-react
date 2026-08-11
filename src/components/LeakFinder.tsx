import { useMemo, useState } from 'react';
import { LEAK_PRESETS, annualizeLeaks } from '../lib/leakFinder';
import { fmtBaht } from '../lib/finance';
import { track } from '../lib/analytics';

/* ===== Leak Finder — "ตัวจับรูรั่ว" (latte factor พลิกมุมเจ้าของร้าน) =====
 * กรอกค่ารั่ว "ต่อวัน" แต่ละช่อง → เห็นทันทีว่า × 365 หายไปเท่าไหร่/ปี + เทียบเท่า
 * ตัวเลขทั้งหมดผู้ใช้กรอกเอง (ไม่แต่งให้) · ประโยคเทียบเท่าเป็นค่าประมาณเพื่อสื่อสาร */

export default function LeakFinder() {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [rent, setRent] = useState('');
  const [tracked, setTracked] = useState(false);

  const result = useMemo(() => {
    const entries = LEAK_PRESETS.map((p) => ({ label: p.label, perDay: parseFloat(vals[p.id] || '0') }));
    const rentPerMonth = parseFloat(rent || '0') || undefined;
    return annualizeLeaks(entries, { rentPerMonth });
  }, [vals, rent]);

  function setVal(id: string, v: string) {
    setVals((s) => ({ ...s, [id]: v }));
    if (!tracked) { track('leak_finder_used', {}); setTracked(true); }
  }

  const has = result.totalPerYear > 0;

  return (
    <div className="leak">
      <div className="leak-hd">
        <div className="leak-title">💧 ตัวจับรูรั่ว — ต้นทุนวันละนิด × 365</div>
        <span className="leak-sub">ค่าเล็ก ๆ ที่รั่ววันละนิด พอทั้งปีกลายเป็นเงินก้อน · กรอกเฉพาะที่ร้านคุณมีจริง</span>
      </div>

      <div className="leak-rows">
        {LEAK_PRESETS.map((p) => (
          <label key={p.id} className="leak-row">
            <div className="leak-row-l">
              <span className="leak-row-label">{p.label}</span>
              {p.hint && <span className="leak-row-hint">{p.hint}</span>}
            </div>
            <div className="leak-row-in">
              <input
                type="number" inputMode="decimal" min="0" placeholder="0"
                value={vals[p.id] ?? ''}
                onChange={(e) => setVal(p.id, e.target.value)}
                aria-label={`${p.label} บาทต่อวัน`}
              />
              <span className="leak-unit">฿/วัน</span>
            </div>
          </label>
        ))}
        <label className="leak-row leak-row-rent">
          <div className="leak-row-l">
            <span className="leak-row-label">ค่าเช่าร้าน/เดือน (ไม่บังคับ)</span>
            <span className="leak-row-hint">ใส่เพื่อเทียบว่ารูรั่ว = ค่าเช่ากี่เดือน</span>
          </div>
          <div className="leak-row-in">
            <input
              type="number" inputMode="decimal" min="0" placeholder="0"
              value={rent} onChange={(e) => setRent(e.target.value)}
              aria-label="ค่าเช่าร้านต่อเดือน"
            />
            <span className="leak-unit">฿/เดือน</span>
          </div>
        </label>
      </div>

      {has ? (
        <div className="leak-out">
          <div className="leak-total">
            <span className="leak-total-lbl">รั่วเงียบ ๆ ทั้งปี</span>
            <b className="leak-total-val">−{fmtBaht(result.totalPerYear)}</b>
          </div>
          <div className="leak-sub2">
            = {fmtBaht(result.totalPerDay)}/วัน · {fmtBaht(result.totalPerMonth)}/เดือน
          </div>
          {result.equivalents.length > 0 && (
            <div className="leak-eq">
              {result.equivalents.map((e, i) => <span key={i} className="leak-eq-chip">≈ {e}</span>)}
            </div>
          )}
          <div className="leak-cta">💡 นี่คืองานที่ CFO AI ทำให้ — หาเจอรูรั่วก่อนมันกลายเป็นเงินก้อนที่หายไป</div>
        </div>
      ) : (
        <div className="leak-empty">กรอกค่ารั่ว “ต่อวัน” อย่างน้อย 1 ช่อง แล้วดูว่าทั้งปีหายไปเท่าไหร่</div>
      )}
      <div className="leak-disc">* ประโยคเทียบเท่าเป็นค่าประมาณเพื่อให้เห็นภาพ · ตัวเลขทั้งหมดจากที่คุณกรอกเอง</div>
    </div>
  );
}
