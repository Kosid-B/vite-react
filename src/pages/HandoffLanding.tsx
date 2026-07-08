import { useEffect, useState } from 'react';
import { INTEGRATIONS } from '../config';
import { stashHandoff } from '../lib/handoffClient';

/**
 * /handoff?token=<signed> — รับแผน 24 ขั้นจาก theossphere (Context Handoff)
 * verify token ฝั่ง server (handoff-import) → เก็บแผนไว้ → พาไปสมัคร/เข้าใช้ → App pre-fill ให้
 * gate ด้วย INTEGRATIONS.theossphereLive (ปิดจนกว่าจะ deploy + ตั้ง secret)
 */

type Status = 'checking' | 'ok' | 'error' | 'off';

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export default function HandoffLanding() {
  const [status, setStatus] = useState<Status>('checking');
  const [biz, setBiz] = useState('');

  useEffect(() => {
    if (!INTEGRATIONS.theossphereLive) { setStatus('off'); return; }
    const token = new URLSearchParams(window.location.search).get('token') ?? '';
    if (!token || !SUPA_URL || !SUPA_KEY) { setStatus('error'); return; }

    (async () => {
      try {
        const res = await fetch(`${SUPA_URL}/functions/v1/handoff-import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok || !data?.plan) { setStatus('error'); return; }
        stashHandoff(data.plan);
        setBiz(String(data.plan.businessName ?? '').slice(0, 80));
        setStatus('ok');
      } catch { setStatus('error'); }
    })();
  }, []);

  const wrap: React.CSSProperties = {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0f172a', color: '#e5e7eb', padding: 24, textAlign: 'center',
    fontFamily: '"Noto Sans Thai","Sarabun",system-ui,sans-serif',
  };
  const card: React.CSSProperties = { maxWidth: 440 };
  const btn: React.CSSProperties = {
    display: 'inline-block', marginTop: 18, background: '#5b8bff', color: '#fff',
    border: 0, borderRadius: 10, padding: '12px 24px', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', textDecoration: 'none',
  };

  if (status === 'off') {
    return <div style={wrap}><div style={card}>
      <div style={{ fontSize: 44 }}>🔌</div>
      <h1 style={{ fontSize: 20, fontWeight: 800 }}>ระบบเชื่อมแผนยังไม่เปิดใช้งาน</h1>
      <p style={{ color: '#9aa6d8', lineHeight: 1.7 }}>ขออภัย ฟีเจอร์เชื่อมแผนจาก theossphere กำลังเตรียมเปิด</p>
      <a href="/start" style={btn}>เริ่มต้นใช้งาน CEO AI Thailand →</a>
    </div></div>;
  }
  if (status === 'checking') {
    return <div style={wrap}><div style={card}>
      <div style={{ fontSize: 44 }}>🔗</div>
      <h1 style={{ fontSize: 20, fontWeight: 800 }}>กำลังเชื่อมแผนธุรกิจของคุณ…</h1>
      <p style={{ color: '#9aa6d8' }}>ตรวจสอบและเตรียมส่งให้ทีม AI</p>
    </div></div>;
  }
  if (status === 'error') {
    return <div style={wrap}><div style={card}>
      <div style={{ fontSize: 44 }}>⚠️</div>
      <h1 style={{ fontSize: 20, fontWeight: 800 }}>ลิงก์เชื่อมแผนไม่ถูกต้องหรือหมดอายุ</h1>
      <p style={{ color: '#9aa6d8', lineHeight: 1.7 }}>ลองกลับไปกด "ส่งแผนไป execute" ที่ theossphere อีกครั้ง หรือเริ่มใหม่ที่นี่</p>
      <a href="/start" style={btn}>เริ่มต้นใช้งาน →</a>
    </div></div>;
  }
  return <div style={wrap}><div style={card}>
    <div style={{ fontSize: 44 }}>✅</div>
    <h1 style={{ fontSize: 20, fontWeight: 800 }}>รับแผนของคุณแล้ว{biz ? ` — ${biz}` : ''}</h1>
    <p style={{ color: '#9aa6d8', lineHeight: 1.7 }}>
      สมัคร/เข้าใช้งาน แล้วทีมพนักงาน AI จะเริ่มลงมือทำจากแผน 24 ขั้นของคุณทันที (ไม่ต้องกรอกใหม่)
    </p>
    <a href="/start" style={btn}>ไปเริ่มให้ทีม AI ลงมือทำ (ทดลองฟรี) →</a>
  </div></div>;
}
