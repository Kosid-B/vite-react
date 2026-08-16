import { useMemo, useState } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import type { LandingAgg } from '../lib/landingFunnel';
import {
  sectionStats, sectionLabel, sectionsTrustworthy, MIN_SECTION_VIEWERS,
  abResult, buildGrowthBrief, growthPrompt,
} from '../lib/growthAnalysis';

/* GrowthAiPanel — "คนสนใจส่วนไหนของหน้า" + ผล A/B ทุกตัว + ให้ AI อ่านให้
 *
 * ทำไมต้องมี: ข้อมูลพฤติกรรมถูกเก็บมาตลอดแต่ไม่มีใครเปิดดู เพราะต้องออกไปเปิด GA
 * แผงนี้เอาทุกอย่างมาไว้ในระบบเรา และให้ AI สรุปให้ในปุ่มเดียว
 *
 * ⚠️ กติกาความซื่อสัตย์: ตัวเลขทั้งหมดคำนวณใน growthAnalysis.ts (pure/tested)
 *    AI ได้รับแค่ข้อเท็จจริงที่คำนวณแล้ว + รายการที่ "ห้ามสรุป" — คิดเลขเองไม่ได้ */

const box: React.CSSProperties = {
  border: '1px solid var(--sand)', borderRadius: 12, padding: 14, background: 'var(--cream2)',
};

export default function GrowthAiPanel({ landing }: { landing: LandingAgg | null }) {
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const sections = useMemo(() => sectionStats(landing?.sections), [landing]);
  const abs = useMemo(() => [
    abResult('new_sections_v1', 'ส่วนใหม่บน Landing (เห็น/ไม่เห็น)', landing?.by_ab),
    abResult('hero', 'พาดหัว A/B', landing?.by_hero_ab),
    abResult('layout', 'ลำดับบล็อก A/B', landing?.by_layout_ab),
  ], [landing]);

  const brief = useMemo(() => buildGrowthBrief(landing, sections, abs), [landing, sections, abs]);
  const trusted = sectionsTrustworthy(sections);
  const maxAvg = Math.max(1, ...sections.map(s => s.avgSeconds));

  const analyze = async () => {
    if (!isSupabaseEnabled || !supabase) { setMsg('โหมดออฟไลน์ — ต่อ Supabase ก่อนถึงเรียก AI ได้'); return; }
    setBusy(true); setMsg(null); setAnswer(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assist', {
        body: {
          page: 'admin',
          pageLabel: 'วิเคราะห์พฤติกรรมผู้เยี่ยมชม (first-party)',
          instruction: growthPrompt(brief),
          context: `ข้อมูลรวมนิรนาม ไม่มีข้อมูลส่วนบุคคล · ผู้เข้าชม ${landing?.total ?? 0} คน`,
        },
      });
      if (error) throw error;
      const out = Array.isArray(data?.suggestions) ? data.suggestions.join('\n') : (data?.text ?? data?.answer ?? '');
      setAnswer(String(out || '').trim() || null);
      if (!out) setMsg('AI ตอบกลับว่างเปล่า — ลองใหม่อีกครั้ง');
    } catch {
      setMsg('เรียก AI ไม่สำเร็จ — ข้อมูลด้านบนยังอ่านเองได้ตามปกติ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div>
        <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
          🔍 คนเข้ามาแล้วสนใจส่วนไหน
        </h4>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--ink3)', lineHeight: 1.7 }}>
          วัดจาก “วินาทีที่ส่วนนั้นอยู่ในจอ” ต่อคน — ต่างจากการเลื่อนผ่าน<br />
          เก็บแบบนิรนาม ไม่มีข้อมูลส่วนบุคคล ไม่บันทึกสิ่งที่ผู้ใช้พิมพ์
        </p>
      </div>

      <div style={box}>
        {sections.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--ink3)' }}>
            ยังไม่มีข้อมูลรายส่วน — เริ่มเก็บเมื่อมีผู้เข้าชมหน้า Landing หลังอัปเดตนี้
          </div>
        ) : (
          <>
            {!trusted && (
              <div style={{ fontSize: 12, color: '#b45309', marginBottom: 10, lineHeight: 1.6 }}>
                ⚠️ บางส่วนมีคนเห็นน้อยกว่า {MIN_SECTION_VIEWERS} คน — ดูเป็นแนวโน้มได้ แต่ยังจัดอันดับไม่ได้
              </div>
            )}
            <div style={{ display: 'grid', gap: 7 }}>
              {sections.map(s => {
                const thin = s.viewers < MIN_SECTION_VIEWERS;
                return (
                  <div key={s.key} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 96px', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12.5, color: thin ? 'var(--ink3)' : 'var(--ink)', fontWeight: thin ? 400 : 600 }}>
                      {sectionLabel(s.key)}
                    </span>
                    <div style={{ height: 8, borderRadius: 999, background: 'var(--sand)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.round((s.avgSeconds / maxAvg) * 100)}%`, height: '100%',
                        background: thin ? '#94a3b8' : '#0891b2',
                      }} />
                    </div>
                    <span style={{ fontSize: 11.5, color: 'var(--ink3)', textAlign: 'right' }}>
                      {s.avgSeconds} วิ · {s.viewers} คน
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div style={box}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>🧪 การทดลอง A/B</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {abs.map(ab => (
            <div key={ab.id}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{ab.label}</div>
              <div style={{ fontSize: 12, color: ab.ready ? 'var(--ink)' : 'var(--ink3)', lineHeight: 1.7 }}>
                {ab.arms.length === 0
                  ? 'ยังไม่มีข้อมูล'
                  : ab.arms.map(a => `${a.variant}: สมัคร ${a.signup}/${a.total} (${a.signupPct}%)`).join(' · ')}
              </div>
              <div style={{ fontSize: 11.5, color: ab.ready ? '#16a34a' : '#b45309' }}>
                {`${ab.ready ? '✓' : '⏳'} ${ab.note}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={box}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={analyze}
            disabled={busy}
            style={{
              background: busy ? 'var(--sand)' : '#0891b2', color: busy ? 'var(--ink3)' : '#fff',
              border: 0, borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 700,
              cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {busy ? 'กำลังวิเคราะห์…' : '🤖 ให้ AI วิเคราะห์ให้'}
          </button>
          <span style={{ fontSize: 11.5, color: 'var(--ink3)' }}>
            ส่งเฉพาะตัวเลขรวม — AI คิดเลขเองไม่ได้ และถูกสั่งห้ามสรุปเกินข้อมูล
          </span>
        </div>

        {!brief.enough && (
          <div style={{ fontSize: 12, color: '#b45309', marginTop: 10, lineHeight: 1.7 }}>
            ⚠️ ข้อมูลยังน้อย — AI จะบอกว่ายังสรุปอะไรไม่ได้ และบอกว่าต้องเก็บอะไรเพิ่ม (นั่นคือคำตอบที่ถูกต้อง ไม่ใช่ข้อผิดพลาด)
          </div>
        )}
        {msg && <div style={{ fontSize: 12.5, color: '#b45309', marginTop: 10 }}>{msg}</div>}
        {answer && (
          <pre style={{
            margin: '12px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit',
            fontSize: 13, lineHeight: 1.8, color: 'var(--ink)', background: 'var(--cream)',
            border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 12px',
          }}>{answer}</pre>
        )}

        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--ink3)' }}>
            ดูสิ่งที่ส่งให้ AI จริง (โปร่งใส ตรวจสอบได้)
          </summary>
          <pre style={{
            margin: '8px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit',
            fontSize: 11.5, lineHeight: 1.7, color: 'var(--ink3)',
          }}>{growthPrompt(brief)}</pre>
        </details>
      </div>
    </div>
  );
}
