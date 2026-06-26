import { useState } from 'react';
import { supabase } from '../lib/supabase';

type Mode = 'signin' | 'signup';

export default function Auth() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'err' | 'ok'; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'signup') {
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

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">CJ Planner</div>
        <div className="auth-sub">แพลตฟอร์มสร้างบริษัท AI อัตโนมัติสำหรับธุรกิจไทย</div>

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
      </div>
    </div>
  );
}
