import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { track } from '../lib/analytics';

/**
 * Aha-moment email capture (soft signup) — เด้งตอนผู้ทดลอง (guest) เจอโมเมนต์ดีๆ
 * ขอแค่อีเมล → signInWithOtp (magic link, ไม่ต้องตั้งรหัสผ่าน) = ได้ lead จริงเข้า auth.users
 * ลด friction กว่าฟอร์มสมัครเต็ม · ปิด/ข้ามได้ (ไม่บังคับ)
 */
export default function SaveWorkPrompt({ onClose, onCaptured }: { onClose: () => void; onCaptured: () => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'err' | 'ok'; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !email) { setMsg({ type: 'err', text: 'กรอกอีเมลก่อนนะครับ' }); return; }
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) { setMsg({ type: 'err', text: error.message }); return; }
    track('lead_captured', { source: 'aha_moment' });
    try { localStorage.setItem('ceo_ai_lead', '1'); } catch { /* noop */ }
    setMsg({ type: 'ok', text: '✅ ส่งลิงก์บันทึกงานไปที่อีเมลแล้ว — กดยืนยันในอีเมลเพื่อเก็บงานถาวร' });
    onCaptured();
    setTimeout(onClose, 3500);
  }

  return (
    <div className="savework-overlay" onClick={onClose}>
      <div className="savework-card" onClick={e => e.stopPropagation()}>
        <button className="savework-x" onClick={onClose} aria-label="ปิด">×</button>
        <div className="savework-emoji">🎉</div>
        <h3>งานของคุณกำลังไปได้สวย!</h3>
        <p>ใส่อีเมลเพื่อ <strong>บันทึกงานไว้</strong> — เราจะส่งลิงก์กลับมาให้ ไม่ต้องตั้งรหัสผ่าน</p>
        <form onSubmit={submit}>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@company.co.th" autoComplete="email" required autoFocus
          />
          <button type="submit" className="savework-submit" disabled={busy}>
            {busy ? 'กำลังส่ง…' : 'บันทึกงานของฉัน'}
          </button>
        </form>
        {msg && <div className={msg.type === 'err' ? 'savework-err' : 'savework-ok'}>{msg.text}</div>}
        <button className="savework-skip" onClick={onClose}>ไว้ทีหลัง</button>
      </div>
    </div>
  );
}
