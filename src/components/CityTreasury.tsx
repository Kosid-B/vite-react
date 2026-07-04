import { useState } from 'react';
import type { AppData, FinanceEntry } from '../types';
import { financeSummary, isAutoEntry, fmtBaht } from '../lib/finance';
import { track } from '../lib/analytics';

/* ===== คลังเมือง (City Treasury) — รายรับ/รายจ่ายที่ขับเมืองบริษัท =====
 * กรอกเอง + ดึงค่าแพ็กเกจอัตโนมัติ (รายการ auto แก้/ลบไม่ได้) */

export default function CityTreasury({ data, onUpdate }: { data: AppData; onUpdate: (d: AppData) => void }) {
  const s = financeSummary(data);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: '', amount: '', kind: 'revenue' as 'revenue' | 'expense', recurring: false });

  const total = Math.max(s.revenue, s.expense, 1);
  const netPositive = s.net >= 0;

  function addEntry() {
    const amount = Math.round(Number(form.amount));
    if (!form.label.trim() || !Number.isFinite(amount) || amount <= 0) return;
    const entry: FinanceEntry = {
      id: `f_${Date.now().toString(36)}`,
      label: form.label.trim().slice(0, 60),
      amount, kind: form.kind, recurring: form.recurring,
      date: new Date().toISOString().slice(0, 10),
    };
    onUpdate({ ...data, finance: [...(data.finance ?? []), entry] });
    track('finance_entry_added', { kind: form.kind, amount });
    setForm({ label: '', amount: '', kind: form.kind, recurring: false });
  }

  function removeEntry(id: string) {
    onUpdate({ ...data, finance: (data.finance ?? []).filter(e => e.id !== id) });
  }

  return (
    <div className="treasury">
      <div className="treasury-hd">
        <div className="treasury-title">💰 คลังเมือง — รายรับ & รายจ่าย</div>
        <button className="treasury-toggle" onClick={() => setOpen(o => !o)}>
          {open ? 'ซ่อนรายการ' : 'จัดการรายรับ-รายจ่าย'} {open ? '▲' : '▼'}
        </button>
      </div>

      <div className="treasury-cards">
        <div className="treasury-card rev"><span>รายได้รวม</span><b>{fmtBaht(s.revenue)}</b></div>
        <div className="treasury-card exp"><span>รายจ่ายรวม</span><b>{fmtBaht(s.expense)}</b></div>
        <div className={`treasury-card net ${netPositive ? 'up' : 'down'}`}>
          <span>{netPositive ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ'}</span>
          <b>{netPositive ? '' : '−'}{fmtBaht(Math.abs(s.net))}</b>
        </div>
        <div className="treasury-card margin"><span>อัตรากำไร</span><b>{s.margin}%</b></div>
      </div>

      {/* แถบกระแสเงิน รายได้ vs รายจ่าย */}
      <div className="treasury-flow">
        <div className="treasury-flow-row"><span>รายได้</span>
          <div className="treasury-bar"><i className="rev" style={{ width: `${(s.revenue / total) * 100}%` }} /></div>
        </div>
        <div className="treasury-flow-row"><span>รายจ่าย</span>
          <div className="treasury-bar"><i className="exp" style={{ width: `${(s.expense / total) * 100}%` }} /></div>
        </div>
      </div>

      {!s.hasRevenue && !open && (
        <button className="treasury-cta" onClick={() => setOpen(true)}>
          ➕ บันทึกรายได้ก้อนแรก เพื่อสร้าง “คลังเมือง” และเริ่มทำกำไร
        </button>
      )}

      {open && (
        <div className="treasury-ledger">
          {/* ฟอร์มเพิ่มรายการ */}
          <div className="treasury-form">
            <div className="treasury-kind">
              <button className={form.kind === 'revenue' ? 'on rev' : ''} onClick={() => setForm(f => ({ ...f, kind: 'revenue' }))}>+ รายได้</button>
              <button className={form.kind === 'expense' ? 'on exp' : ''} onClick={() => setForm(f => ({ ...f, kind: 'expense' }))}>− รายจ่าย</button>
            </div>
            <input className="treasury-in" placeholder="รายการ (เช่น ขายสินค้า, ค่าโฆษณา)" value={form.label}
              maxLength={60} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
            <input className="treasury-in amt" type="number" min="0" placeholder="จำนวน (฿)" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            <label className="treasury-rec">
              <input type="checkbox" checked={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} />
              รายเดือน
            </label>
            <button className="treasury-add" onClick={addEntry}
              disabled={!form.label.trim() || !(Number(form.amount) > 0)}>เพิ่ม</button>
          </div>

          {/* รายการทั้งหมด */}
          <div className="treasury-list">
            {s.entries.length === 0 && <div className="treasury-empty">ยังไม่มีรายการ — เริ่มบันทึกรายได้/รายจ่ายแรกของคุณ</div>}
            {s.entries.map(e => {
              const auto = isAutoEntry(e.id);
              return (
                <div key={e.id} className={`treasury-row ${e.kind}`}>
                  <span className="treasury-row-ico">{e.kind === 'revenue' ? '🟢' : '🔴'}</span>
                  <span className="treasury-row-label">{e.label}
                    {e.recurring && <span className="treasury-tag">รายเดือน</span>}
                    {auto && <span className="treasury-tag auto">อัตโนมัติ</span>}
                  </span>
                  <span className="treasury-row-amt">{e.kind === 'revenue' ? '+' : '−'}{fmtBaht(e.amount)}</span>
                  {auto
                    ? <span className="treasury-row-lock" title="รายการอัตโนมัติจากแพ็กเกจ">🔒</span>
                    : <button className="treasury-row-del" onClick={() => removeEntry(e.id)} title="ลบ">✕</button>}
                </div>
              );
            })}
          </div>
          <p className="treasury-note">
            💡 “ค่าแพ็กเกจ” ถูกดึงอัตโนมัติจากแผนที่คุณใช้ — บันทึกรายได้ให้มากกว่ารายจ่ายเพื่อเปิด 🏦 ธนาคารเมือง
          </p>
        </div>
      )}
    </div>
  );
}
