import { useLandingTheme } from '../lib/landingTheme';
import { track } from '../lib/analytics';
import {
  TRIAL_ROADMAP, TRIAL_TAKEAWAYS, TRIAL_DAYS, ACTOR_LABEL, totalEffortLabel,
} from '../lib/trialRoadmap';

/* TrialRoadmap — "15 วันนี้จะเกิดอะไรขึ้นกับคุณบ้าง"
 *
 * ปัญหาที่แก้: คำว่า "ทดลองใช้ฟรี 15 วัน" ไม่ได้บอกอะไรเลย ผู้ใช้ต้องเดาเอง
 *   และคนส่วนใหญ่เดาว่า "คงต้องนั่งงมเอง เสียเวลาเปล่า" แล้วก็ไม่เริ่ม
 *   คนไม่ได้กลัวจ่ายเงิน — คนกลัวเสียเวลาแล้วไม่ได้อะไรกลับไป
 *
 * จึงต้องบอก 3 อย่างให้ครบก่อนเขาตัดสินใจ:
 *   1. แต่ละช่วงได้ "ของ" อะไรกลับไป (จับต้องได้ ไม่ใช่ความรู้สึก)
 *   2. ต้องลงแรงเองแค่ไหน vs AI ทำให้แค่ไหน
 *   3. ถ้าไม่จ่ายต่อ ยังเหลืออะไรติดมือ
 *
 * เนื้อหาทั้งหมดมาจาก lib/trialRoadmap.ts (pure, tested — มีเทสต์ตรวจว่าทุกขั้นชี้หน้าที่มีจริง) */

export default function TrialRoadmap({ onGetStarted }: { onGetStarted: () => void }) {
  const light = useLandingTheme() === 'minimal';
  const C = light
    ? { bg: '#f8fafc', panel: '#ffffff', ink: '#0f172a', sub: '#475569', border: '#e2e8f0', cyan: '#0891b2', amber: '#f59e0b', good: '#15803d' }
    : { bg: '#0b1220', panel: '#0f172a', ink: '#ffffff', sub: '#94a3b8', border: '#1e293b', cyan: '#22d3ee', amber: '#fbbf24', good: '#4ade80' };

  const actorColor = (a: string) => (a === 'you' ? C.amber : a === 'ai' ? C.cyan : C.good);

  return (
    <section style={{ padding: '64px 24px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 999, border: `1px solid ${C.cyan}`, color: C.cyan, fontSize: 12.5, fontWeight: 700, marginBottom: 12 }}>
            🗺️ {TRIAL_DAYS} วันนี้ · แผนที่ชัดเจน ไม่ต้องงมเอง
          </div>
          <h2 style={{ fontSize: 'clamp(22px, 3.2vw, 30px)', fontWeight: 800, color: C.ink, margin: '0 0 8px', lineHeight: 1.35 }}>
            {TRIAL_DAYS} วันฟรี คุณจะได้อะไรกลับไปบ้าง
          </h2>
          <p style={{ color: C.sub, fontSize: 14.5, margin: 0, lineHeight: 1.7 }}>
            ไม่ใช่ให้เข้ามาลองเล่นแล้วหายไป — แต่ละช่วงมีของที่จับต้องได้ติดมือกลับไป<br />
            <b style={{ color: C.ink }}>{totalEffortLabel()}</b>
          </p>
        </div>

        <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
          {TRIAL_ROADMAP.map((s, i) => (
            <div
              key={s.id}
              style={{
                border: `1px solid ${C.border}`, borderRadius: 14, background: C.panel,
                padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start',
              }}
            >
              <div style={{ flex: 'none', width: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 22, lineHeight: 1.2 }}>{s.icon}</div>
                <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 700 }}>{i + 1}/{TRIAL_ROADMAP.length}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: C.cyan }}>{s.days}</span>
                  <span style={{ fontSize: 11.5, color: C.sub }}>· ใช้เวลา {s.effort}</span>
                  {/* บอกตรง ๆ ว่าต้องลงแรงเองแค่ไหน — ไม่ขายฝันว่า AI ทำให้หมด */}
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                    border: `1px solid ${actorColor(s.actor)}`, color: actorColor(s.actor),
                  }}>
                    {ACTOR_LABEL[s.actor]}
                  </span>
                </div>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: C.ink, marginBottom: 3, lineHeight: 1.5 }}>
                  {s.title}
                </div>
                <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.65 }}>
                  <b style={{ color: C.good }}>ได้กลับไป:</b> {s.outcome}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ข้อกังวลที่แท้จริง: "ถ้าไม่จ่ายต่อ เสียเวลาเปล่าไหม" — ตอบตรง ๆ */}
        <div style={{ border: `1px solid ${C.good}`, borderRadius: 14, padding: '16px 18px', background: light ? '#f0fdf4' : '#052e16' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 8 }}>
            ครบ 15 วันแล้วไม่จ่ายต่อ — ของพวกนี้ยังเป็นของคุณ
          </div>
          <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
            {TRIAL_TAKEAWAYS.map((t, i) => (
              <div key={i} style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.6 }}>✅ {t}</div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.7 }}>
            เราไม่ล็อกข้อมูลของคุณไว้เป็นตัวประกัน — ส่งออกได้ตลอดเวลาตั้งแต่วันแรก
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 26 }}>
          <button
            onClick={() => { track('landing_cta_click', { cta: 'roadmap_start' }); onGetStarted(); }}
            style={{
              padding: '15px 34px', borderRadius: 12, border: 'none', background: C.amber,
              color: '#020617', fontFamily: 'inherit', fontWeight: 700, fontSize: 16.5, cursor: 'pointer',
            }}
          >
            เริ่มวันแรกของผมเลย →
          </button>
          <div style={{ marginTop: 10, color: C.sub, fontSize: 12.5 }}>
            กรอกแค่ชื่อกับอีเมล · ใช้งานได้ทันที ไม่ต้องรออนุมัติ · ไม่ต้องใช้บัตรเครดิต
          </div>
        </div>
      </div>
    </section>
  );
}
