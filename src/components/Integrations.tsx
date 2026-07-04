import { useEffect, useState } from 'react';
import {
  SYSTEM_INTEGRATIONS, USER_INTEGRATIONS,
  getIntegrationStatus, saveIntegration, disconnectIntegration, type IntegrationProvider,
} from '../lib/integrations';
import { track } from '../lib/analytics';

/* ===== การเชื่อมต่อเครื่องมือ — แยกชัด "ระบบดูแลให้" vs "เชื่อมบัญชีคุณเอง" ===== */

export default function Integrations({ wsId }: { wsId: string | null }) {
  const [status, setStatus] = useState<Record<IntegrationProvider, boolean>>({ line: false, sheets: false });
  const [open, setOpen] = useState<IntegrationProvider | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { getIntegrationStatus(wsId).then(setStatus); }, [wsId]);

  async function connect(p: IntegrationProvider) {
    const def = USER_INTEGRATIONS.find(i => i.id === p);
    if (def?.fields?.some(f => !form[f.key]?.trim())) { setMsg('กรอกข้อมูลให้ครบก่อน'); return; }
    setBusy(true);
    const err = await saveIntegration(wsId, p, form);
    setBusy(false);
    if (err) { setMsg('⚠️ ' + err); return; }
    setStatus(s => ({ ...s, [p]: true })); setOpen(null); setForm({}); setMsg(null);
    track('integration_connected', { provider: p });
  }
  async function disconnect(p: IntegrationProvider) {
    await disconnectIntegration(wsId, p);
    setStatus(s => ({ ...s, [p]: false }));
  }

  return (
    <section className="ai-panel intg" style={{ marginTop: 16 }}>
      <div className="ai-panel-hd">🔌 การเชื่อมต่อเครื่องมือ</div>

      {/* ระบบดูแลให้ */}
      <div className="intg-group">⚙️ ระบบดูแลให้ · พร้อมใช้ทันที <span>(ไม่ต้องตั้งค่าอะไร)</span></div>
      <div className="intg-list">
        {SYSTEM_INTEGRATIONS.map(it => (
          <div key={it.id} className="intg-row system">
            <span className="intg-ico">{it.icon}</span>
            <div className="intg-body">
              <div className="intg-name">{it.name}</div>
              <div className="intg-desc">{it.desc}</div>
            </div>
            <span className="intg-badge ok">✓ พร้อมใช้</span>
          </div>
        ))}
      </div>

      {/* เชื่อมบัญชีของคุณ */}
      <div className="intg-group" style={{ marginTop: 14 }}>🔗 เชื่อมบัญชีของคุณ <span>(ไม่บังคับ — บัญชี/ข้อมูลเป็นของคุณ)</span></div>
      <div className="intg-list">
        {USER_INTEGRATIONS.map(it => {
          const on = status[it.id];
          return (
            <div key={it.id} className={`intg-row user${on ? ' on' : ''}`}>
              <div className="intg-main">
                <span className="intg-ico">{it.icon}</span>
                <div className="intg-body">
                  <div className="intg-name">{it.name}</div>
                  <div className="intg-desc">{it.desc}</div>
                </div>
                {it.comingSoon
                  ? <span className="intg-badge soon">เร็วๆ นี้</span>
                  : on
                    ? <button className="intg-btn off" onClick={() => disconnect(it.id)}>ตัดการเชื่อมต่อ</button>
                    : <button className="intg-btn" onClick={() => { setOpen(open === it.id ? null : it.id); setForm({}); setMsg(null); }}>เชื่อมบัญชี</button>}
              </div>

              {on && !it.comingSoon && (
                <div className="intg-note ok">✅ เชื่อมบัญชีแล้ว — ระบบตอบ/ส่งอัตโนมัติกำลังเปิดใช้เร็วๆ นี้</div>
              )}

              {open === it.id && !on && (
                <div className="intg-form">
                  {it.fields?.map(f => (
                    <label key={f.key} className="intg-field">
                      <span>{f.label}</span>
                      <input type="password" placeholder={f.placeholder} value={form[f.key] ?? ''}
                        onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} spellCheck={false} />
                    </label>
                  ))}
                  <div className="intg-help">🔒 เก็บแยกปลอดภัยเฉพาะบริษัทคุณ (ไม่อยู่ในข้อมูลที่ซิงก์ · เข้าถึงได้เฉพาะสมาชิกบริษัทคุณ) · {it.help}</div>
                  {msg && <div className="intg-msg">{msg}</div>}
                  <button className="intg-save" onClick={() => connect(it.id)} disabled={busy}>{busy ? 'กำลังเชื่อม…' : 'บันทึกการเชื่อมต่อ'}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
