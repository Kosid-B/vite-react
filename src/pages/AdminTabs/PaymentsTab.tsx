import { useEffect, useState } from 'react';
import { listPendingPayments, reviewPayment, type PaymentSubmission } from '../../lib/payments';

/** คิวยืนยันการชำระเงิน — แอดมินตรวจสลิปที่ผู้ใช้อัปในระบบ → อนุมัติ/ปฏิเสธ
 *  อนุมัติแล้ว: แพ็กเปิดใช้งานเมื่อผู้ใช้ (เจ้าของ workspace) เปิดหน้า "แพ็กเกจ & ชำระเงิน" อีกครั้ง */
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
      ? '✅ อนุมัติแล้ว — แพ็กจะเปิดใช้งานเมื่อผู้ใช้เปิดหน้าชำระเงินอีกครั้ง'
      : 'ปฏิเสธคำขอแล้ว');
    load();
  }

  return (
    <div className="pay-q">
      <div className="pfa-sec-hd">💳 คิวยืนยันการชำระเงิน ({subs.length} รออนุมัติ)</div>
      <p className="pfa-sec-sub">ผู้ใช้อัปสลิปในระบบ → ตรวจแล้วอนุมัติเพื่อเปิดใช้งานแพ็ก</p>
      {msg && <div className="sipoc-gen-msg">{msg}</div>}
      {loading ? (
        <div className="pfa-empty">กำลังโหลด…</div>
      ) : subs.length === 0 ? (
        <div className="pfa-empty">ไม่มีคำขอรออนุมัติ</div>
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
                  {busy === s.id + 'approved' ? '⏳' : '✅ อนุมัติ'}
                </button>
                <button className="pay-q-reject" disabled={!!busy} onClick={() => review(s.id, 'rejected')}>
                  {busy === s.id + 'rejected' ? '⏳' : 'ปฏิเสธ'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
