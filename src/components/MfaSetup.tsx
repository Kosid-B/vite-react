import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * ปิดช่องว่าง R3 (ISO/IEC 27001:2022 control 8.5) — แอปไม่เคยมีหน้าตั้ง MFA มาก่อน
 * ให้ผู้ใช้ (โดยเฉพาะแอดมิน) เปิด Two-Factor Authentication (TOTP) ได้เอง
 * ไม่มีทางลัดให้ผู้ดูแลระบบตั้ง MFA แทนผู้ใช้อื่นได้ — ต้อง scan QR ด้วยอุปกรณ์ตัวเองเสมอ (by design)
 */
export default function MfaSetup() {
  const [open, setOpen] = useState(false);
  const [hasFactor, setHasFactor] = useState<boolean | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'err' | 'ok'; text: string } | null>(null);

  async function refreshStatus() {
    if (!supabase) return;
    const { data } = await supabase.auth.mfa.listFactors();
    setHasFactor(!!data?.totp?.some(f => f.status === 'verified'));
  }

  useEffect(() => { if (open) refreshStatus(); }, [open]);

  async function startEnroll() {
    if (!supabase) return;
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    setBusy(false);
    if (error) { setMsg({ type: 'err', text: error.message }); return; }
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrolling(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !factorId) return;
    setBusy(true); setMsg(null);
    try {
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: code.trim() });
      if (vErr) throw vErr;
      setMsg({ type: 'ok', text: '✅ เปิดใช้ MFA สำเร็จ — ครั้งต่อไปที่เข้าสู่ระบบต้องกรอกรหัสจาก authenticator app ด้วย' });
      setEnrolling(false);
      setCode('');
      await refreshStatus();
    } catch (err) {
      setMsg({ type: 'err', text: (err as Error).message || 'รหัสไม่ถูกต้อง ลองใหม่อีกครั้ง' });
    } finally {
      setBusy(false);
    }
  }

  async function cancelEnroll() {
    if (supabase && factorId) await supabase.auth.mfa.unenroll({ factorId });
    setEnrolling(false); setFactorId(null); setQr(null); setSecret(null); setCode(''); setMsg(null);
  }

  if (!supabase) return null;

  return (
    <>
      <button className="sidebar-mfa-link" onClick={() => setOpen(true)}>🔐 ตั้งค่าความปลอดภัย (MFA)</button>

      {open && (
        <div className="mfa-overlay" onClick={() => setOpen(false)}>
          <div className="mfa-modal" onClick={e => e.stopPropagation()}>
            <div className="mfa-head">
              <div className="mfa-title">🔐 Two-Factor Authentication (MFA)</div>
              <button className="mfa-close" onClick={() => setOpen(false)}>×</button>
            </div>

            {hasFactor === null && <div className="mfa-loading">กำลังตรวจสอบสถานะ…</div>}

            {hasFactor === true && !enrolling && (
              <div className="mfa-status-ok">✅ บัญชีนี้เปิดใช้ MFA อยู่แล้ว</div>
            )}

            {hasFactor === false && !enrolling && (
              <div className="mfa-body">
                <p className="mfa-desc">บัญชีนี้ยังไม่ได้เปิดใช้ MFA — แนะนำให้เปิดโดยเฉพาะบัญชีแอดมิน (control 8.5)</p>
                <button className="mfa-enroll-btn" onClick={startEnroll} disabled={busy}>
                  {busy ? 'กำลังเตรียม…' : 'เริ่มตั้งค่า MFA'}
                </button>
              </div>
            )}

            {enrolling && (
              <form className="mfa-body" onSubmit={verify}>
                <p className="mfa-desc">สแกน QR ด้วยแอป Authenticator (Google Authenticator, Authy ฯลฯ)</p>
                {qr && <div className="mfa-qr" dangerouslySetInnerHTML={{ __html: qr }} />}
                {secret && <div className="mfa-secret">หรือกรอกรหัสด้วยมือ: <code>{secret}</code></div>}
                <label>กรอกรหัส 6 หลักจากแอป
                  <input value={code} onChange={e => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="000000" required autoFocus />
                </label>
                <div className="mfa-actions">
                  <button type="button" className="mfa-cancel" onClick={cancelEnroll} disabled={busy}>ยกเลิก</button>
                  <button type="submit" className="mfa-verify" disabled={busy || code.length !== 6}>
                    {busy ? 'กำลังตรวจสอบ…' : 'ยืนยัน'}
                  </button>
                </div>
              </form>
            )}

            {msg && <div className={`mfa-msg ${msg.type}`}>{msg.text}</div>}
          </div>
        </div>
      )}
    </>
  );
}
