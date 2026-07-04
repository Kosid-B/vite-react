import { useRef, useState } from 'react';
import type { AppData, FinanceEntry } from '../types';
import { financeSummary, fmtBaht } from '../lib/finance';

/* ===== นำเข้าข้อมูลการเงินของ User (ฟอร์ม + อัปโหลดไฟล์ CSV) — ชั้นความลับของบริษัท =====
 * เก็บใน d.finance (workspace_state · RLS เฉพาะสมาชิกบริษัท) ไม่แชร์สาธารณะ ไม่อยู่ในหน้าร้าน/ตลาด */

function parseCsv(text: string): FinanceEntry[] {
  const rows = text.split(/\r?\n/).map(r => r.trim()).filter(Boolean);
  if (rows.length === 0) return [];
  // ข้าม header ถ้าแถวแรกไม่มีตัวเลขในคอลัมน์จำนวนเงิน
  const cells0 = rows[0].split(',');
  const hasHeader = isNaN(Number((cells0[1] ?? '').replace(/[^0-9.-]/g, '')));
  const out: FinanceEntry[] = [];
  for (let i = hasHeader ? 1 : 0; i < rows.length; i++) {
    const c = rows[i].split(',').map(s => s.trim());
    const label = c[0] || 'รายการ';
    const amount = Math.abs(Number((c[1] ?? '').replace(/[^0-9.-]/g, '')) || 0);
    if (!amount) continue;
    const kindRaw = (c[2] ?? '').toLowerCase();
    const kind: 'revenue' | 'expense' =
      /rev|income|รับ|รายได้|ขาย/.test(kindRaw) ? 'revenue'
      : /exp|จ่าย|รายจ่าย|ต้นทุน|cost/.test(kindRaw) ? 'expense'
      : 'expense';
    out.push({ id: 'imp-' + Date.now().toString(36) + i, label, amount, kind, date: c[3] || '', recurring: false });
  }
  return out;
}

export default function FinanceInput({ data, onUpdate }: { data: AppData; onUpdate: (d: AppData) => void }) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<'revenue' | 'expense'>('revenue');
  const [date, setDate] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fin = financeSummary(data);
  const manual = data.finance ?? [];

  function addEntry() {
    const amt = Math.abs(Number(amount.replace(/[^0-9.-]/g, '')) || 0);
    if (!label.trim() || !amt) { setMsg('กรอกชื่อรายการและจำนวนเงินก่อน'); return; }
    const entry: FinanceEntry = { id: 'fin-' + Date.now().toString(36), label: label.trim(), amount: amt, kind, date, recurring: false };
    onUpdate({ ...data, finance: [entry, ...manual] });
    setLabel(''); setAmount(''); setDate(''); setMsg('✅ บันทึกแล้ว (เก็บเป็นความลับของบริษัทคุณ)');
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imported = parseCsv(String(reader.result ?? ''));
      if (imported.length === 0) { setMsg('ไม่พบข้อมูลในไฟล์ — รูปแบบ: ชื่อรายการ,จำนวนเงิน,ประเภท(รับ/จ่าย),วันที่'); return; }
      onUpdate({ ...data, finance: [...imported, ...manual] });
      setMsg(`✅ นำเข้า ${imported.length} รายการจากไฟล์แล้ว (ความลับของบริษัทคุณ)`);
    };
    reader.readAsText(f, 'utf-8');
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeEntry(id: string) {
    onUpdate({ ...data, finance: manual.filter(x => x.id !== id) });
  }

  return (
    <div className="finx">
      <div className="finx-lock">🔒 ข้อมูลการเงินเป็นชั้นความลับของบริษัทคุณ — เก็บเฉพาะเวิร์กสเปซของคุณ (เข้าถึงได้เฉพาะสมาชิก) ไม่แชร์สาธารณะ ไม่อยู่ในหน้าร้าน/ตลาด</div>

      <div className="finx-sum">
        รายรับ <b className="pos">{fmtBaht(fin.revenue)}</b> · รายจ่าย <b className="neg">{fmtBaht(fin.expense)}</b> · สุทธิ <b className={fin.net >= 0 ? 'pos' : 'neg'}>{fmtBaht(fin.net)}</b>
      </div>

      {/* ฟอร์มกรอกเอง */}
      <div className="finx-form">
        <input className="finx-in" placeholder="ชื่อรายการ (เช่น ขายสินค้า / ค่าโฆษณา)" value={label} onChange={e => setLabel(e.target.value)} />
        <input className="finx-in amt" placeholder="จำนวนเงิน (บาท)" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} />
        <select className="finx-in kind" value={kind} onChange={e => setKind(e.target.value as 'revenue' | 'expense')}>
          <option value="revenue">รายรับ</option>
          <option value="expense">รายจ่าย</option>
        </select>
        <input className="finx-in date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <button className="finx-add" onClick={addEntry}>+ บันทึก</button>
      </div>

      {/* อัปโหลดไฟล์ */}
      <div className="finx-upload">
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} hidden id="finx-file" />
        <label htmlFor="finx-file" className="finx-file-btn">📄 อัปโหลดไฟล์ CSV</label>
        <span className="finx-hint">รูปแบบ: ชื่อรายการ, จำนวนเงิน, ประเภท(รับ/จ่าย), วันที่ — ประมวลผลในเบราว์เซอร์ แล้วเก็บเป็นความลับของคุณ</span>
      </div>

      {msg && <div className="finx-msg">{msg}</div>}

      {/* รายการล่าสุด */}
      {manual.length > 0 && (
        <div className="finx-list">
          {manual.slice(0, 8).map(e => (
            <div key={e.id} className="finx-row">
              <span className="finx-row-l">{e.label}{e.date ? ` · ${e.date}` : ''}</span>
              <span className={`finx-row-a ${e.kind === 'revenue' ? 'pos' : 'neg'}`}>{e.kind === 'revenue' ? '+' : '−'}{fmtBaht(e.amount)}</span>
              <button className="finx-del" onClick={() => removeEntry(e.id)} title="ลบรายการ">×</button>
            </div>
          ))}
          {manual.length > 8 && <div className="finx-more">…และอีก {manual.length - 8} รายการ</div>}
        </div>
      )}
    </div>
  );
}
