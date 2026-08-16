import { useLandingTheme } from '../lib/landingTheme';
import { track } from '../lib/analytics';
import {
  CHATGPT_HEADLINE, CHATGPT_SUB, CHATGPT_CLOSING, CHATGPT_DIFFS,
} from '../lib/trialRoadmap';

/* WhyNotChatGpt — ตอบคำถามที่ผู้เยี่ยมชมคิดในใจแต่ไม่ถาม: "ก็ถาม ChatGPT เอาก็ได้ ฟรีด้วย"
 *
 * ทำไมต้องมี: เจ้าของโปรเจกต์ชี้เอง (16 ส.ค. 2569) ว่ากลุ่มเป้าหมาย
 *   "ยังแยกไม่ออกระหว่างระบบเรากับ ChatGPT/Gemini" — ถ้าแยกไม่ออก ก็ไม่มีเหตุผลจ่ายเงิน
 *   และการสำรวจคู่แข่งยืนยันว่าคู่แข่งตัวจริงคือแชต ไม่ใช่ซอฟต์แวร์ ISO เจ้าไหน
 *   (docs/marketing/COMPETITORS-AND-AI-MOAT.md)
 *
 * เนื้อหาอยู่ใน lib/trialRoadmap.ts (pure, tested — มีเทสต์กันไม่ให้เขียนโจมตีคู่แข่ง
 * และบังคับให้ยอมรับตรง ๆ ว่า ChatGPT เก่งกว่าในบางเรื่อง) */

export default function WhyNotChatGpt({ onGetStarted }: { onGetStarted: () => void }) {
  const light = useLandingTheme() === 'minimal';
  const C = light
    ? { bg: '#ffffff', panel: '#f8fafc', ink: '#0f172a', sub: '#475569', border: '#e2e8f0', cyan: '#0891b2', amber: '#f59e0b' }
    : { bg: '#020617', panel: '#0f172a', ink: '#ffffff', sub: '#94a3b8', border: '#1e293b', cyan: '#22d3ee', amber: '#fbbf24' };

  return (
    <section style={{ padding: '64px 24px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 999, border: `1px solid ${C.cyan}`, color: C.cyan, fontSize: 12.5, fontWeight: 700, marginBottom: 12 }}>
            🤔 คำถามที่หลายคนคิดในใจ
          </div>
          <h2 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: C.ink, margin: '0 0 8px', lineHeight: 1.4 }}>
            “ก็ถาม ChatGPT เอาก็ได้ ฟรีด้วย” — ต่างกันยังไง?
          </h2>
          <p style={{ color: C.ink, fontSize: 16, fontWeight: 700, margin: '0 0 6px', lineHeight: 1.6 }}>
            {CHATGPT_HEADLINE}
          </p>
          <p style={{ color: C.sub, fontSize: 14, margin: 0, lineHeight: 1.7 }}>
            {CHATGPT_SUB}
          </p>
        </div>

        {/* ตารางเทียบ — มือถือแสดงเป็นการ์ดซ้อน, จอกว้างเป็น 3 คอลัมน์ */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', background: C.panel }}>
          <div className="wnc-head" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1.2fr', gap: 0, background: light ? '#f1f5f9' : '#0b1220' }}>
            <div style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800, color: C.sub }}>สิ่งที่คุณต้องการ</div>
            <div style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800, color: C.sub }}>ChatGPT / Gemini</div>
            <div style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800, color: C.cyan }}>ระบบของเรา</div>
          </div>
          {CHATGPT_DIFFS.map((d, i) => (
            <div
              key={d.need}
              className="wnc-row"
              style={{
                display: 'grid', gridTemplateColumns: '1.1fr 1fr 1.2fr',
                borderTop: `1px solid ${C.border}`,
                background: i % 2 ? (light ? '#fbfdff' : '#0c1526') : 'transparent',
              }}
            >
              <div style={{ padding: '12px 14px', fontSize: 13.5, fontWeight: 700, color: C.ink, lineHeight: 1.55 }}>
                <span className="wnc-lbl">— </span>{d.need}
              </div>
              <div style={{ padding: '12px 14px', fontSize: 13, color: C.sub, lineHeight: 1.6 }}>
                <span className="wnc-lbl">ChatGPT: </span>{d.chat}
              </div>
              <div style={{ padding: '12px 14px', fontSize: 13, color: C.ink, lineHeight: 1.6 }}>
                <span className="wnc-lbl">เรา: </span>✅ {d.ours}
              </div>
            </div>
          ))}
        </div>

        {/* ปิดด้วยความซื่อสัตย์ — ไม่ได้มาแทน ChatGPT */}
        <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, border: `1px solid ${C.amber}`, background: light ? '#fffbeb' : '#1c1409', fontSize: 13.5, color: C.ink, lineHeight: 1.7 }}>
          💡 {CHATGPT_CLOSING}
        </div>

        <div style={{ textAlign: 'center', marginTop: 22 }}>
          <button
            onClick={() => { track('landing_cta_click', { cta: 'why_not_chatgpt' }); onGetStarted(); }}
            style={{ padding: '14px 32px', borderRadius: 12, border: 'none', background: C.amber, color: '#020617', fontFamily: 'inherit', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
          >
            ลองระบบที่เถียงกลับได้ — ฟรี 15 วัน →
          </button>
        </div>
      </div>

      {/* มือถือ: ยุบตารางเป็นการ์ดซ้อน (ตาราง 3 คอลัมน์บนจอ 390px อ่านไม่ออก) */}
      <style>{`
        .wnc-lbl { display: none; font-weight: 700; }
        @media (max-width: 700px) {
          .wnc-head { display: none !important; }
          .wnc-row { grid-template-columns: 1fr !important; padding: 4px 0; }
          .wnc-lbl { display: inline; color: inherit; opacity: .75; }
        }
      `}</style>
    </section>
  );
}
