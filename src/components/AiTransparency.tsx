import { useEffect, useState, type CSSProperties } from 'react';
import { useLandingTheme } from '../lib/landingTheme';
import { track } from '../lib/analytics';
import { SAFETY_COMMITMENTS, SAFETY_TAGLINE } from '../lib/aiSafety';

/* AiTransparency — ปุ่ม "🤖 ความโปร่งใส AI" ที่ footer หน้า Landing → modal คำมั่น 6 ข้อ
 * modal ฝั่ง client (ไม่พาออกจากหน้า = ไม่เสีย conversion · ไม่โหลดเพจใหม่ = ไม่กระทบ performance)
 * Dark AI Marketing #24: ความโปร่งใส = ความเชื่อมั่นระยะยาว (ตรงข้าม dark pattern) */

const COMMITMENTS: { icon: string; text: string }[] = [
  { icon: '👤', text: 'ทุกผลลัพธ์ AI มีมนุษย์ตรวจก่อนใช้จริง' },
  { icon: '🔢', text: 'ไม่แต่งตัวเลข — ตัวเลขทุกตัวมาจากข้อมูลจริงของคุณ' },
  { icon: '⭐', text: 'รีวิวและเคสจริงเท่านั้น ไม่ปั้นตัวเลข' },
  { icon: '🔒', text: 'PDPA — ไม่ป้อนข้อมูลส่วนตัวของคุณเข้า AI โดยไม่จำเป็น' },
  { icon: '🎯', text: 'ไม่มี dark pattern / ความเร่งด่วนปลอม · A/B ทุกอย่าง opt-in' },
  { icon: '💬', text: 'คำแนะนำ AI ช่วยตัดสินใจ ไม่แทนที่ที่ปรึกษาวิชาชีพ' },
];

export default function AiTransparency({ linkStyle }: { linkStyle?: CSSProperties }) {
  const [open, setOpen] = useState(false);
  const light = useLandingTheme() === 'minimal';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function openModal() {
    setOpen(true);
    track('ai_transparency_opened');
  }

  const panel = light
    ? { bg: '#ffffff', border: '#e2e8f0', text: '#334155', head: '#0f172a', sub: '#64748b' }
    : { bg: '#0f172a', border: '#1e293b', text: '#cbd5e1', head: '#f1f5f9', sub: '#94a3b8' };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', padding: 0, ...linkStyle }}
      >
        🤖 ความโปร่งใส AI
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ความโปร่งใส AI"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 20,
            background: 'rgba(2,6,23,0.6)', backdropFilter: 'blur(2px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto',
              background: panel.bg, border: `1px solid ${panel.border}`, borderRadius: 16,
              padding: '24px 22px', textAlign: 'left', boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: panel.head }}>🤖 ความโปร่งใส AI</div>
                <div style={{ fontSize: 13, color: panel.sub, marginTop: 4 }}>เราใช้ AI อย่างมีจริยธรรม — คำมั่นของเรา</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="ปิด"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: panel.sub, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <ul style={{ listStyle: 'none', margin: '18px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {COMMITMENTS.map((c, i) => (
                <li key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', fontSize: 14.5, color: panel.text, lineHeight: 1.55 }}>
                  <span aria-hidden="true" style={{ fontSize: 17, flexShrink: 0 }}>{c.icon}</span>
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${panel.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: panel.head }}>🔒 ความปลอดภัย AI</div>
              <div style={{ fontSize: 12.5, color: panel.sub, margin: '4px 0 12px', lineHeight: 1.5 }}>{SAFETY_TAGLINE}</div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {SAFETY_COMMITMENTS.slice(0, 4).map((c, i) => (
                  <li key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', fontSize: 13.5, color: panel.text, lineHeight: 1.5 }}>
                    <span aria-hidden="true" style={{ fontSize: 16, flexShrink: 0 }}>{c.icon}</span>
                    <span><b style={{ color: panel.head }}>{c.title}</b> — {c.body}</span>
                  </li>
                ))}
              </ul>
              <a href="/security" onClick={() => track('ai_safety_link')}
                style={{ display: 'inline-block', marginTop: 12, fontSize: 13, fontWeight: 700, color: '#22d3ee', textDecoration: 'none' }}>
                อ่านนโยบายความปลอดภัยเต็ม + คำถามที่พบบ่อย →
              </a>
            </div>

            <div style={{ marginTop: 18, fontSize: 12, color: panel.sub, lineHeight: 1.6 }}>
              สอดคล้อง PDPA · ทุกการทดลอง A/B แบบยินยอมก่อน (opt-in) ·
              คำแนะนำ AI เพื่อประกอบการตัดสินใจ ไม่ใช่คำปรึกษาวิชาชีพด้านการเงิน/กฎหมาย
            </div>
          </div>
        </div>
      )}
    </>
  );
}
