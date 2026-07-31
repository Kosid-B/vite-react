import { useEffect, useState } from 'react';
import { listPendingPayments, listApprovedPayments, reviewPayment, grantAiTopup,
  listPendingTopups, approveTopupRequest, rejectTopupRequest,
  type PaymentSubmission, type TopupRequest } from '../../lib/payments';
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

  const [topups, setTopups] = useState<TopupRequest[]>([]);
  const [tuReqBusy, setTuReqBusy] = useState<string | null>(null);
  const [approved, setApproved] = useState<PaymentSubmission[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [s, t, a] = await Promise.all([listPendingPayments(), listPendingTopups(), listApprovedPayments()]);
      setSubs(s); setTopups(t); setApproved(a);
    } catch { setMsg('⚠️ โหลดคำขอไม่สำเร็จ'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function decideTopup(id: string, approve: boolean) {
    setTuReqBusy(id); setMsg(null);
    const err = approve ? await approveTopupRequest(id) : await rejectTopupRequest(id);
    setTuReqBusy(null);
    if (err) { setMsg('⚠️ ' + err); return; }
    setMsg(approve ? '✅ เปิด credits + ปิดคำขอแล้ว' : '🚫 ตีกลับคำขอ top-up แล้ว');
    load();
  }

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
      {/* คิวคำขอ Top-up — user แจ้งโอนแล้ว → กดเปิด credits ทีเดียว */}
      <div className="topup-queue">
        <div className="pfa-sec-hd">🔔 คำขอ Top-up รอเปิด ({topups.length})</div>
        {topups.length === 0 ? (
          <div className="pfa-empty">ไม่มีคำขอ top-up รอเปิด</div>
        ) : (
          <div className="topup-q-list">
            {topups.map(t => (
              <div key={t.id} className="topup-q-row">
                <div className="topup-q-info">
                  <b>+{t.credits.toLocaleString()} calls</b> · {t.price.toLocaleString()} ฿
                  <span className="topup-q-meta">ws {t.workspaceId.slice(0, 8)}… · {t.createdAt.slice(0, 10)}</span>
                </div>
                <div className="topup-q-actions">
                  <button className="topup-q-ok" disabled={tuReqBusy === t.id} onClick={() => decideTopup(t.id, true)}>
                    {tuReqBusy === t.id ? '…' : '✅ เปิด credits'}
                  </button>
                  <button className="topup-q-no" disabled={tuReqBusy === t.id} onClick={() => decideTopup(t.id, false)}>🚫</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grant Top-up (manual) — เปิด credits ด้วย Workspace ID เอง (สำรอง กรณีไม่มีคำขอในคิว) */}
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

      {/* การจ่ายที่สำเร็จแล้ว (approved) — เห็นยอดขายจริง ไม่ใช่แค่คิวรอตรวจ */}
      <div className="pfa-sec-hd" style={{ marginTop: 22 }}>
        💰 การจ่ายที่สำเร็จแล้ว ({approved.length} ล่าสุด)
        {approved.length > 0 && (
          <span className="pay-done-total"> · รวม ฿{approved.reduce((sum, s) => sum + s.amount, 0).toLocaleString()}</span>
        )}
      </div>
      <p className="pfa-sec-sub">รายการที่ยืนยันแล้ว (SlipOK/แอดมิน) — แพ็กเปิดใช้งานอยู่</p>
      {approved.length === 0 ? (
        <div className="pfa-empty">ยังไม่มีการจ่ายที่สำเร็จ</div>
      ) : (
        <div className="pay-done-list">
          {approved.map(s => (
            <div key={s.id} className="pay-done-row">
              <span className="pay-done-plan">{s.plan.toUpperCase()}</span>
              <span className="pay-done-cycle">{s.cycle === 'yearly' ? 'รายปี' : 'รายเดือน'}</span>
              <span className="pay-done-amount">฿{s.amount.toLocaleString()}</span>
              <span className="pay-done-ws">ws {s.workspaceId.slice(0, 8)}…</span>
              <span className="pay-done-date">{s.createdAt}</span>
              {s.note && <span className="pay-done-note" title={s.note}>{s.note.startsWith('SlipOK') ? '🏦 SlipOK' : '✓ แอดมิน'}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
