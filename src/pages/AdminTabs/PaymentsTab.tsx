import { useEffect, useState } from 'react';
import { listPendingPayments, reviewPayment, grantAiTopup, type PaymentSubmission } from '../../lib/payments';
import { TOPUP_PACKS } from '../../lib/topup';

/** คิวตรวจสลิปย้อนหลัง (PLG) — แพ็กเปิดให้ผู้ใช้อัตโนมัติทันทีที่อัปสลิปแล้ว แอดมินไม่ใช่คอขวด
 *  หน้าที่แอดมิน = ตรวจสอบย้อนหลัง:
 *    ✅ ยืนยันถูกต้อง = ปิดรายการ (แพ็กใช้งานต่อ)
 *    🚫 ตีกลับ = สลิปปลอม/ไม่ตรง → client เจ้าของ workspace จะถอนแพ็กกลับ Free เองเมื่อเปิดหน้าชำระเงิน */
export default function PaymentsTab() {
  const [subs, setSubs] = useState<PaymentSubmission[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { setSubs(await listPendingPayments()); }
    catch { setMsg('⚠️ โหลดคำขอไม่สำเร็จ'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function review(id: string, status: 'approved' | 'rejected') {
    setBusy(id + status);
    setMsg(null);
    const err = await reviewPayment(id, status);
    setBusy(null);
    if (err) { setMsg('⚠️ ' + err); return; }
    setMsg(status === 'approved'
      ? '✅ ยืนยันสลิปถูกต้องแล้ว — ปิดรายการ'
      : '🚫 ตีกลับแล้ว — ผู้ใช้จะถูกถอนแพ็กกลับ Free เมื่อเปิดหน้าชำระเงินครั้งถัดไป');
    load();
  }

  // Top-up grant: แอดมินเปิด AI credits ให้ workspace หลังยืนยันการโอน
  const [tuWs, setTuWs] = useState('');
  const [tuCalls, setTuCalls] = useState(TOPUP_PACKS[1].calls); // default = แพ็กกลาง
  const [tuBusy, setTuBusy] = useState(false);
  const [tuMsg, setTuMsg] = useState<string | null>(null);
  async function doGrant() {
    if (!tuWs.trim()) { setTuMsg('⚠️ ใส่ Workspace ID'); return; }
    setTuBusy(true); setTuMsg(null);
    const err = await grantAiTopup(tuWs.trim(), tuCalls);
    setTuBusy(false);
    setTuMsg(err ? '⚠️ ' + err : `✅ เปิด +${tuCalls.toLocaleString()} calls ให้ ${tuWs.trim()} แล้ว (เดือนนี้)`);
    if (!err) setTuWs('');
  }

  return (
    <div className="pay-q">
      {/* Grant Top-up — เปิด AI credits ให้ workspace หลังยืนยันการโอน (credits เดือนปัจจุบัน) */}
      <div className="topup-grant">
        <div className="pfa-sec-hd">➕ เปิด AI Top-up ให้ลูกค้า</div>
        <p className="pfa-sec-sub">หลังยืนยันการโอน top-up — ใส่ Workspace ID + เลือกจำนวน แล้วเปิด credits (ใช้ได้เฉพาะเดือนนี้)</p>
        <div className="topup-grant-row">
          <input className="plg-ref-link" placeholder="Workspace ID" value={tuWs} onChange={e => setTuWs(e.target.value)} />
          <select className="topup-grant-sel" value={tuCalls} onChange={e => setTuCalls(Number(e.target.value))}>
            {TOPUP_PACKS.map(p => <option key={p.id} value={p.calls}>{p.label} ({p.price}฿)</option>)}
          </select>
          <button className="plg-nudge-btn" disabled={tuBusy} onClick={doGrant}>{tuBusy ? '…' : 'เปิด credits'}</button>
        </div>
        {tuMsg && <div className="sipoc-gen-msg" style={{ marginTop: 8 }}>{tuMsg}</div>}
      </div>

      <div className="pfa-sec-hd">💳 คิวตรวจสลิปย้อนหลัง ({subs.length} รอตรวจ)</div>
      <p className="pfa-sec-sub">แพ็กเปิดให้ผู้ใช้อัตโนมัติแล้ว (PLG) — ตรวจย้อนหลัง: ยืนยันถูกต้อง หรือตีกลับถ้าสลิปไม่ตรง</p>
      {msg && <div className="sipoc-gen-msg">{msg}</div>}
      {loading ? (
        <div className="pfa-empty">กำลังโหลด…</div>
      ) : subs.length === 0 ? (
        <div className="pfa-empty">ไม่มีสลิปรอตรวจ</div>
      ) : (
        <div className="pay-q-list">
          {subs.map(s => (
            <div key={s.id} className="pay-q-card">
              <div className="pay-q-main">
                <div className="pay-q-top">
                  <span className="pay-q-plan">{s.plan.toUpperCase()}</span>
                  <span className="pay-q-cycle">{s.cycle === 'yearly' ? 'รายปี' : 'รายเดือน'}</span>
                  <span className="pay-q-amount">฿{s.amount.toLocaleString()}</span>
                </div>
                <div className="pay-q-meta">Workspace: {s.workspaceId} · ส่งเมื่อ {s.createdAt}</div>
                {s.slipUrl && (
                  <a className="pay-q-slip" href={s.slipUrl} target="_blank" rel="noreferrer">📎 ดูสลิป</a>
                )}
              </div>
              <div className="pay-q-actions">
                <button className="pay-q-approve" disabled={!!busy} onClick={() => review(s.id, 'approved')}>
                  {busy === s.id + 'approved' ? '⏳' : '✅ ยืนยันถูกต้อง'}
                </button>
                <button className="pay-q-reject" disabled={!!busy} onClick={() => review(s.id, 'rejected')}>
                  {busy === s.id + 'rejected' ? '⏳' : '🚫 ตีกลับ'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
