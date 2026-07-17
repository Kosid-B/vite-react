import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BRAND, COMPANY } from '../config';
import { track } from '../lib/analytics';
import LegalLinks from './LegalLinks';
import { pickNudgeVariant, buildNudge } from '../lib/authNudge';
import AuthNudge from './AuthNudge';

type Mode = 'signin' | 'signup';
type Method = 'email' | 'phone';

/** แปลงเบอร์ไทยเป็นรูปแบบสากล E.164 (+66...) — คืน null ถ้ารูปแบบไม่ถูก */
function toE164Thai(raw: string): string | null {
  const d = raw.replace(/[^\d+]/g, '');
  if (/^\+\d{8,15}$/.test(d)) return d;              // ใส่ +รหัสประเทศมาแล้ว
  if (/^0\d{9}$/.test(d)) return '+66' + d.slice(1);  // 0812345678 → +66812345678
  if (/^66\d{9}$/.test(d)) return '+' + d;            // 66812345678 → +66812345678
  return null;
}

export default function Auth({ onBack }: { onBack?: () => void } = {}) {
  const [mode, setMode] = useState<Mode>('signin');
  const [method, setMethod] = useState<Method>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'err' | 'ok'; text: string } | null>(null);

  // Authentic nudge: เลือก "มุมอารมณ์" แบบ deterministic แล้ววัดผลว่ามุมไหนแปลงจริง (GA)
  const variant = useMemo(() => pickNudgeVariant(Math.floor(Date.now() / 86400000)), []);
  const nudge = useMemo(() => buildNudge(variant), [variant]);
  useEffect(() => { track('nudge_shown', { variant }); }, [variant]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'signup') {
        track('nudge_cta', { variant });   // วัดว่ามุมอารมณ์นี้นำสู่การสมัครจริง
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg({ type: 'ok', text: 'สมัครสำเร็จ! ตรวจอีเมลเพื่อยืนยัน แล้วเข้าสู่ระบบได้เลย' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // เข้าสู่ระบบสำเร็จ — App จะจับ session เปลี่ยนเอง
      }
    } catch (err) {
      setMsg({ type: 'err', text: (err as Error).message || 'เกิดข้อผิดพลาด' });
    } finally {
      setBusy(false);
    }
  }

  async function magicLink() {
    if (!supabase || !email) { setMsg({ type: 'err', text: 'กรอกอีเมลก่อน' }); return; }
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setBusy(false);
    setMsg(error ? { type: 'err', text: error.message } : { type: 'ok', text: 'ส่งลิงก์เข้าสู่ระบบไปที่อีเมลแล้ว' });
  }

  // ── เข้าสู่ระบบด้วยเบอร์โทร (OTP ทาง SMS) ── (login และ signup ใช้ flow เดียวกัน)
  async function sendPhoneOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const e164 = toE164Thai(phone);
    if (!e164) { setMsg({ type: 'err', text: 'กรอกเบอร์มือถือให้ถูกต้อง เช่น 0812345678' }); return; }
    setBusy(true); setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
      if (error) throw error;
      setOtpSent(true);
      track('phone_otp_sent', {});
      setMsg({ type: 'ok', text: `ส่งรหัส OTP ไปที่ ${e164} แล้ว — กรอกรหัส 6 หลักด้านล่าง` });
    } catch (err) {
      setMsg({ type: 'err', text: (err as Error).message || 'ส่ง OTP ไม่สำเร็จ (ระบบ SMS อาจยังไม่พร้อม)' });
    } finally {
      setBusy(false);
    }
  }

  async function verifyPhoneOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const e164 = toE164Thai(phone);
    if (!e164) { setMsg({ type: 'err', text: 'เบอร์ไม่ถูกต้อง' }); return; }
    setBusy(true); setMsg(null);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: e164, token: otp.trim(), type: 'sms' });
      if (error) throw error;
      track('phone_otp_verified', {});
      // สำเร็จ — App จะจับ session เปลี่ยนเอง
    } catch (err) {
      setMsg({ type: 'err', text: (err as Error).message || 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        {onBack && (
          <button type="button" className="auth-back" onClick={onBack}>← กลับหน้าแรก</button>
        )}
        <div className="auth-brand">{BRAND.product}</div>
        <div className="auth-sub">{BRAND.tagline}</div>

        <AuthNudge nudge={nudge} />

        {/* สลับวิธีเข้าสู่ระบบ: อีเมล / เบอร์โทร */}
        <div className="auth-method">
          <button type="button" className={method === 'email' ? 'active' : ''}
            onClick={() => { setMethod('email'); setMsg(null); }}>✉️ อีเมล</button>
          <button type="button" className={method === 'phone' ? 'active' : ''}
            onClick={() => { setMethod('phone'); setMsg(null); setOtpSent(false); }}>📱 เบอร์โทร</button>
        </div>

        {method === 'email' ? (
          <>
            <div className="auth-tabs">
              <button className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setMsg(null); }}>เข้าสู่ระบบ</button>
              <button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setMsg(null); }}>สมัครสมาชิก</button>
            </div>

            <form onSubmit={submit} className="auth-form">
              <label>อีเมล
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="you@company.co.th" />
              </label>
              <label>รหัสผ่าน
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder="อย่างน้อย 6 ตัวอักษร" />
              </label>

              {msg && <div className={`auth-msg ${msg.type}`}>{msg.text}</div>}

              <button type="submit" className="auth-submit" disabled={busy}>
                {busy ? 'กำลังดำเนินการ…' : mode === 'signup' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
              </button>
            </form>

            <button className="auth-magic" onClick={magicLink} disabled={busy}>ส่งลิงก์เข้าสู่ระบบทางอีเมล (Magic Link)</button>
          </>
        ) : (
          <form onSubmit={otpSent ? verifyPhoneOtp : sendPhoneOtp} className="auth-form">
            <label>เบอร์มือถือ
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required autoComplete="tel"
                placeholder="0812345678" disabled={otpSent} inputMode="tel" />
            </label>
            {otpSent && (
              <label>รหัส OTP (6 หลัก)
                <input type="text" value={otp} onChange={e => setOtp(e.target.value)} required
                  autoComplete="one-time-code" inputMode="numeric" maxLength={6} placeholder="______" />
              </label>
            )}

            {msg && <div className={`auth-msg ${msg.type}`}>{msg.text}</div>}

            <button type="submit" className="auth-submit" disabled={busy}>
              {busy ? 'กำลังดำเนินการ…' : otpSent ? 'ยืนยันรหัส OTP' : 'ส่งรหัส OTP ทาง SMS'}
            </button>
            {otpSent && (
              <button type="button" className="auth-magic" onClick={() => { setOtpSent(false); setOtp(''); setMsg(null); }}>
                ← แก้เบอร์ / ส่งรหัสใหม่
              </button>
            )}
            <div className="auth-hint">เข้าสู่ระบบ/สมัครด้วยเบอร์เดียว — ไม่ต้องตั้งรหัสผ่าน</div>
          </form>
        )}

        <div className="auth-company">
          ให้บริการโดย {COMPANY.nameTh}<br/>
          <a href={COMPANY.website} target="_blank" rel="noreferrer">{COMPANY.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a> · โทร {COMPANY.tel}<br/>
          <span className="auth-legal-links"><LegalLinks /></span>
        </div>
      </div>
    </div>
  );
}
