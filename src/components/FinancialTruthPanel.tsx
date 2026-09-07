import { useEffect, useMemo, useState } from 'react';
import {
  econMetrics, cacTrap, investmentGateStatus, verifiedFirstOutcomeRate,
  showAsActual, TRUTH_BADGE, ECON_FUNNEL, CVR_NOTE,
  type EconInput, type FinancialFact,
} from '../lib/financialTruth';
import { payingCustomerCount } from '../lib/payments';

/* แผง "เงินเข้ามาแล้วเดินต่อถึงไหน" — Economic Flywheel
 *
 * 🔴 ทำไมต้องมี (ledger #70): `financialTruth.ts` ถูกเขียนพร้อมเทสต์ 21 ตัวเมื่อ 6 ก.ย.
 *    แล้ว **ไม่มีใครเรียกเลยสักฟังก์ชัน** — ซ้ำความผิดเดิม (#63) ที่ผมเพิ่งเขียนกฎกันเอง
 *    ⇒ กฎที่อยู่แต่ในบันทึก = กฎที่ต้องพึ่งความจำ · แผงนี้คือการทำให้มันถูกเรียกจริง
 *
 * 🔴 คำสั่งเจ้าของที่แผงนี้ต้องเคารพ: **ห้ามแสดงค่าสมมติเหมือนเป็นตัวเลขจริง**
 *    ⇒ ทุกค่าผ่าน `showAsActual()` ก่อนแสดง · ไม่ผ่าน = ติดป้ายเสมอ
 *
 * ⚠️ **ข้อจำกัดที่รู้ตัว (7 ก.ย. 2569)**: เส้นทางป้าย `assumed` ในแผงนี้ **ยังไม่ถูกใช้จริง**
 *    เพราะ `econMetrics()` วันนี้สร้างได้แค่ `measured`/`derived`/`unavailable`
 *    ⇒ ลองกลายพันธุ์ `showAsActual` เป็น `true` แล้ว **เทสต์ไม่แดง** (พิสูจน์แล้ว ไม่ใช่เดา)
 *    กลไกที่กัน `assumed` จริงอยู่ที่ `financialTruth.test.ts` ซึ่งแดงจริงแล้ว
 *    ⇒ จะปิดช่องนี้ได้เมื่อมีค่าสมมติตัวแรกเข้าระบบ (เช่น renewal rate ที่ตั้งเอง)
 *
 * ⚠️ `paidStarter` ดึงจาก `payingCustomerCount()` จริง (ตัด admin-free แล้ว)
 *    ค่าที่เหลือกรอกเอง เก็บ localStorage — ยังไม่มีที่บันทึกเวลาในระบบ (ด่านปล่อยของกั้น schema)
 */

const KEY = 'ceoai_econ_input';

function readSaved(): EconInput {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') as EconInput; }
  catch { return {}; }
}

const FIELDS: { key: keyof EconInput; label: string }[] = [
  { key: 'acquisitionSpend', label: 'งบหาลูกค้าในช่วงที่ดู (บาท)' },
  { key: 'activated48h', label: 'เปิดใช้ใน 48 ชม. (ราย)' },
  { key: 'firstValue7d', label: 'ได้ผลลัพธ์แรกใน 7 วัน (ราย)' },
  { key: 'corePaid', label: 'ซื้อแพ็กหลัก (ราย)' },
  { key: 'renewed', label: 'ต่ออายุแล้ว (ราย)' },
  { key: 'monthlyContributionMargin', label: 'กำไรส่วนเพิ่ม/เดือน/ราย (บาท)' },
];

function Row({ f }: { f: FinancialFact }) {
  const actual = showAsActual(f);
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 11.5, alignItems: 'baseline', flexWrap: 'wrap' }}>
      <span style={{ flex: '1 1 200px', color: 'var(--ink)' }}>{f.label}</span>
      <span style={{
        color: actual ? 'var(--ink)' : '#d97706', fontWeight: 700,
        minWidth: 96, textAlign: 'right',
      }}>
        {f.value === null ? '🔴 ยังไม่มีข้อมูล' : `${f.value.toLocaleString()} ${f.unit}`}
      </span>
      <span style={{ color: 'var(--ink3)', minWidth: 76, textAlign: 'right', fontSize: 11 }}>
        {actual ? '' : TRUTH_BADGE[f.level]}
      </span>
    </div>
  );
}

export default function FinancialTruthPanel() {
  const [inp, setInp] = useState<EconInput>({});
  const [paid, setPaid] = useState<number | null>(null);

  useEffect(() => { setInp(readSaved()); }, []);
  useEffect(() => {
    let dead = false;
    payingCustomerCount().then((n) => { if (!dead) setPaid(n); });
    return () => { dead = true; };
  }, []);

  function set(key: keyof EconInput, raw: string) {
    setInp((cur) => {
      const next = { ...cur };
      // 🔴 ช่องว่าง = ยังไม่ได้วัด ต้องเป็น undefined ไม่ใช่ 0
      if (raw.trim() === '') delete next[key];
      else next[key] = Number(raw);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* empty */ }
      return next;
    });
  }

  // ลูกค้าที่จ่ายจริงมาจากฐานข้อมูล ไม่ให้กรอกมือ (ตัวเลขนี้ต้องปลอมไม่ได้)
  const full: EconInput = useMemo(() => ({ ...inp, paidStarter: paid }), [inp, paid]);
  const metrics = useMemo(() => econMetrics(full), [full]);
  const trap = useMemo(() => cacTrap(full), [full]);
  const gate = useMemo(() => investmentGateStatus(full), [full]);
  const north = useMemo(() => verifiedFirstOutcomeRate(full), [full]);

  return (
    <div style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: '16px 18px', background: 'var(--cream2)' }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
        💰 เงินเข้ามาแล้วเดินต่อถึงไหน
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3, marginBottom: 12, lineHeight: 1.7 }}>
        ธุรกิจไม่ได้ชี้ขาดที่ได้ลูกค้าครั้งแรก แต่ชี้ขาดที่
        <b style={{ color: 'var(--ink)' }}>เปิดใช้ → ได้ผลลัพธ์แรก → จ่ายรอบสอง</b>
        <br />🔴 ค่าที่ยังไม่ได้วัดจะติดป้ายเสมอ — ห้ามอ่านเป็นตัวเลขจริง
      </div>

      {/* ด่านลงทุน — บรรทัดแรกต้องเป็นข้อเสนอ */}
      <div style={{
        border: '1px solid #7c3aed', borderRadius: 10, padding: '10px 12px',
        background: 'rgba(124,58,237,0.07)', marginBottom: 12,
      }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>
          🚪 ค้างที่ด่านลงทุน {gate.stuckAt.n} — {gate.stuckAt.evidence}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink)', marginTop: 4, lineHeight: 1.7 }}>{gate.why}</div>
        <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 5 }}>
          ผ่านแล้วจะปลด: {gate.stuckAt.unlocks} · 🔴 ระบบเสนอได้ แต่<b>ปล่อยเงินเองไม่ได้</b> ต้องให้คนอนุมัติ
        </div>
      </div>

      {/* กับดัก CPA */}
      <div style={{
        border: `1px solid ${trap.verdict === 'trap' ? '#dc2626' : 'var(--sand)'}`,
        borderRadius: 10, padding: '10px 12px', background: 'var(--cream)', marginBottom: 12,
      }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>
          {trap.verdict === 'trap' ? '🪤 กับดักต้นทุนต่อคลิก' : trap.verdict === 'ok' ? '✅ ต้นทุนยังอธิบายได้' : '🟡 ยังตัดสินไม่ได้'}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 4, lineHeight: 1.65 }}>{trap.why}</div>
      </div>

      {/* North Star */}
      <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 700, marginBottom: 5 }}>
        ⭐ ตัวชี้วัดดาวเหนือ
      </div>
      <div style={{ marginBottom: 12 }}><Row f={north} /></div>

      {/* กรวยเศรษฐศาสตร์ + ตัวชี้วัด */}
      <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 700, marginBottom: 5 }}>
        ตัวชี้วัดเศรษฐศาสตร์ ({ECON_FUNNEL.length} ขั้นของกรวย)
      </div>
      <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
        {metrics.map((m) => <Row key={m.key} f={m} />)}
      </div>

      {/* ช่องกรอก */}
      <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 700, marginBottom: 6 }}>
        กรอกค่าที่ระบบยังบันทึกเองไม่ได้ (เว้นว่าง = ยังไม่ได้วัด · ห้ามใส่ 0 แทน)
      </div>
      <div style={{ display: 'grid', gap: 7, marginBottom: 10 }}>
        {FIELDS.map((f) => (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, flexWrap: 'wrap' }}>
            <span style={{ flex: '1 1 220px', color: 'var(--ink)' }}>{f.label}</span>
            <input
              type="number" placeholder="—" aria-label={f.label}
              value={inp[f.key] === undefined ? '' : String(inp[f.key])}
              onChange={(e) => set(f.key, e.target.value)}
              style={{
                width: 100, padding: '4px 7px', fontSize: 12, color: 'var(--ink)',
                border: '1px solid var(--sand)', borderRadius: 6, background: 'var(--cream)',
              }}
            />
          </div>
        ))}
        <div style={{ fontSize: 11, color: 'var(--ink3)', lineHeight: 1.6 }}>
          ลูกค้าที่จ่ายจริง = {paid === null ? '🔴 อ่านไม่ได้' : `${paid} ราย`} — ดึงจากฐานข้อมูล
          (ตัด <code style={{ fontSize: 10.5 }}>admin-free</code> ออกแล้ว) <b>แก้มือไม่ได้โดยตั้งใจ</b>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--ink3)', lineHeight: 1.6, borderTop: '1px solid var(--sand)', paddingTop: 10 }}>
        ⚠️ {CVR_NOTE}
      </div>
    </div>
  );
}
