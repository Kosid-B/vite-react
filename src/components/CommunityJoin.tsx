import { useLandingTheme } from '../lib/landingTheme';
import { SOCIAL } from '../config';
import { track } from '../lib/analytics';

/* CommunityJoin — ชวนเข้าชุมชน LINE/Facebook (บทวิเคราะห์ item #5)
 * แก้ pain "ใช้งานโดดเดี่ยว" + สร้าง retention/บอกต่อ · โชว์เฉพาะเมื่อมี URL จริงใน config (เว้นว่าง = ซ่อน)
 * ไม่สร้างชุมชนปลอม — ถ้ายังไม่มีกลุ่ม จะไม่ render อะไรเลย */
export default function CommunityJoin() {
  const line = SOCIAL.lineCommunityUrl?.trim();
  const fb = SOCIAL.facebookGroupUrl?.trim();
  const light = useLandingTheme() === 'minimal';
  if (!line && !fb) return null; // ยังไม่มีชุมชนจริง → ไม่โชว์

  const C = light
    ? { bg: '#f8fafc', panel: '#ffffff', ink: '#0f172a', sub: '#475569', border: '#e2e8f0' }
    : { bg: '#020617', panel: '#0f172a', ink: '#ffffff', sub: '#94a3b8', border: '#1e293b' };

  return (
    <section style={{ padding: '64px 24px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', border: `1px solid ${C.border}`, borderRadius: 18, background: C.panel, padding: '32px 24px' }}>
        <div style={{ fontSize: 34, marginBottom: 10 }}>👥</div>
        <h2 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800, color: C.ink, marginBottom: 10 }}>
          ไม่ต้องเริ่มธุรกิจคนเดียว
        </h2>
        <p style={{ color: C.sub, fontSize: 15, lineHeight: 1.7, maxWidth: 560, margin: '0 auto 24px' }}>
          เข้าชุมชนผู้ประกอบการที่ใช้ CEO AI — แลกเปลี่ยนประสบการณ์ ถามตอบ และดูเคสจริงของเพื่อนสมาชิก
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {line && (
            <a href={line} target="_blank" rel="noreferrer" onClick={() => track('community_join_click', { channel: 'line' })}
              style={{ padding: '13px 28px', borderRadius: 12, background: '#06C755', color: '#fff', fontWeight: 700, fontSize: 15.5, textDecoration: 'none' }}>
              💬 เข้ากลุ่ม LINE
            </a>
          )}
          {fb && (
            <a href={fb} target="_blank" rel="noreferrer" onClick={() => track('community_join_click', { channel: 'facebook' })}
              style={{ padding: '13px 28px', borderRadius: 12, background: '#1877F2', color: '#fff', fontWeight: 700, fontSize: 15.5, textDecoration: 'none' }}>
              👍 เข้ากลุ่ม Facebook
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
