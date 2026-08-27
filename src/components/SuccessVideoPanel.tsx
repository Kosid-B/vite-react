import { callAiAssist } from '../lib/aiAssist';
import { useMemo, useState } from 'react';
import type { AppData } from '../types';
import { track } from '../lib/analytics';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import {
  businessInfoFromData, readinessFor, buildSuccessVideoScript,
  scriptToPlainText, scriptToMarkdown, polishInstruction, applyPolish,
} from '../lib/successVideoScript';

/* SuccessVideoPanel — เมื่อผู้ใช้กรอกข้อมูลธุรกิจแล้ว สร้าง "สคริปต์วิดีโอ YouTube ~30 นาที"
 * ที่ personalize จากธุรกิจเขาเอง เพื่อสร้างความเชื่อมั่นว่า "ระบบพาไปสำเร็จได้"
 * โปร่งใส: เป็นแผน/วิสัยทัศน์ ไม่ใช่การรับประกัน · คัดลอก/ดาวน์โหลดไปพากย์ AI ต่อได้ */

/* 🔴 เดิมเป็นชุดสีตายตัวของธีมเข้มชุดเดียว ⇒ ในธีมสว่างทั้งแผงเป็นสีเข้มบนพื้นขาว
 *    (วัดจริง 27 ส.ค. 2569 ด้วย scripts/contrast-audit.mjs ที่เพิ่งซ่อมให้ผสมชั้นโปร่งแสง)
 *    ⇒ ใช้โทเคนธีมแทน · ธีมเข้มได้ค่าเดิม เพราะโทเคนถูกประกาศให้ตรงกับค่าสำรองเดิม
 *    ⚠️ สีที่ใช้เป็น "ตัวหนังสือ" ต้องใช้ตัวแปร `-text` — สีสดบนพื้นขาวได้ contrast 1.3–2.4 */
const C = { border: 'var(--sand)', panel: 'var(--panel)', card: 'var(--card)', white: 'var(--ink1)', slate: 'var(--muted)', cyan: 'var(--accent-text)', green: 'var(--green-text)', amber: 'var(--amber-text)', dark: '#020617' };

export default function SuccessVideoPanel({ data }: { data: AppData }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [polished, setPolished] = useState<ReturnType<typeof buildSuccessVideoScript> | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const info = useMemo(() => businessInfoFromData(data), [data]);
  const ready = useMemo(() => readinessFor(info), [info]);
  const base = useMemo(() => buildSuccessVideoScript(info), [info]);
  // ข้อมูลธุรกิจเปลี่ยน → ยกเลิกฉบับขัดเกลาเดิม (กันเนื้อหาไม่ตรงกัน)
  const script = polished && polished.title === base.title ? polished : base;

  async function polish() {
    setNote(null);
    if (!isSupabaseEnabled || !supabase) {
      setNote('การขัดเกลาด้วย AI ใช้ได้ในโหมดออนไลน์ (ล็อกอิน) — ตอนนี้แสดงฉบับสร้างอัตโนมัติ ซึ่งพร้อมใช้อยู่แล้ว');
      track('success_video_polish', { mode: 'local' });
      return;
    }
    setBusy(true);
    try {
      const res = await callAiAssist({ page: 'video_script', pageLabel: 'ขัดเกลาสคริปต์วิดีโอ', instruction: polishInstruction(base) });
      const suggestions = (res?.suggestions ?? []).map((s: string) => String(s));
      const out = applyPolish(base, suggestions);
      if (out === base) {
        setNote('AI ตอบกลับไม่ครบทุกบท — คงฉบับสร้างอัตโนมัติไว้ (ยังใช้ได้ปกติ)');
        track('success_video_polish', { mode: 'partial' });
      } else {
        setPolished(out);
        setNote('✨ ขัดเกลาสำนวนโดย AI แล้ว');
        track('success_video_polish', { mode: 'ai' });
      }
    } catch (e) {
      setNote('AI ไม่ตอบตอนนี้ — แสดงฉบับสร้างอัตโนมัติแทน (' + ((e as Error).message || 'error') + ')');
      track('success_video_polish', { mode: 'fallback' });
    } finally {
      setBusy(false);
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(scriptToPlainText(script));
      setCopied(true);
      track('success_video_copied', { minutes: script.estMinutes });
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard อาจถูกบล็อก — ไม่ทำอะไร */ }
  };

  const download = () => {
    const blob = new Blob([scriptToMarkdown(script)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `success-video-${(info.company || 'business').replace(/\s+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    track('success_video_downloaded', { minutes: script.estMinutes });
  };

  const btn: React.CSSProperties = { fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '9px 16px', borderRadius: 10, cursor: 'pointer', border: 0 };

  return (
    <section className="ai-panel" style={{ marginTop: 16, borderRadius: 16, border: `1px solid ${C.border}`, background: C.panel, padding: '20px 22px' }}>
      <div style={{ fontSize: 'clamp(16px, 2.2vw, 20px)', fontWeight: 800, color: C.white }}>
        🎬 วิดีโอสร้างความเชื่อมั่น — <span style={{ color: C.cyan }}>สคริปต์ ~{script.estMinutes} นาที จากธุรกิจคุณ</span>
      </div>
      <div style={{ color: C.slate, fontSize: 13, margin: '4px 0 10px', lineHeight: 1.6 }}>
        ชุดผลิต “จบในตัว” จากข้อมูลธุรกิจ {info.company || 'ของคุณ'} — บทพากย์ + Google Flow prompt + คิวอัดจอระบบจริง + title/ทัมเนล ตามหลัก <b style={{ color: C.white }}>AI Dark Marketing เชิงจริยธรรม</b>
      </div>
      <div style={{ fontSize: 11.5, color: C.slate, marginBottom: 12, lineHeight: 1.6 }}>
        🔐 ฝัง <b style={{ color: 'var(--violet-text)' }}>จริยธรรม + Data Governance (PDPA)</b> ไว้ในไฟล์: ไม่แต่งตัวเลข · ไม่การันตีรายได้ · ไม่มี fake scarcity · ข้อมูลอยู่ใน workspace คุณเอง
      </div>

      {/* Readiness */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', background: C.card, marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 6 }}>
          ความครบของข้อมูลธุรกิจ: <b style={{ color: ready.ready ? C.green : C.amber }}>{Math.round(ready.score * 100)}%</b>
          {' '}({ready.filled.length}/{ready.filled.length + ready.missing.length} ช่อง)
        </div>
        {ready.missing.length > 0 && (
          <div style={{ fontSize: 12, color: C.amber }}>
            กรอกเพิ่มให้สคริปต์ตรงธุรกิจขึ้น: {ready.missing.join(' · ')}
          </div>
        )}
      </div>

      {!ready.ready ? (
        <div style={{ fontSize: 13, color: C.slate, background: C.card, border: `1px dashed ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
          ✍️ กรอกอย่างน้อย <b style={{ color: C.white }}>ชื่อธุรกิจ</b> + <b style={{ color: C.white }}>ประเภทธุรกิจ</b> หรือ <b style={{ color: C.white }}>เป้าหมาย</b> ในหน้านี้ก่อน แล้วระบบจะสร้างสคริปต์ให้ทันที
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <button onClick={copy} style={{ ...btn, background: C.cyan, color: C.dark }}>{copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอกสคริปต์'}</button>
            <button onClick={download} style={{ ...btn, background: C.green, color: C.dark }}>⬇️ ดาวน์โหลด .md</button>
            <button onClick={() => { setOpen(o => !o); if (!open) track('success_video_previewed', { minutes: script.estMinutes }); }}
              style={{ ...btn, background: 'transparent', color: C.cyan, border: `1px solid ${C.cyan}` }}>
              {open ? 'ซ่อนสคริปต์' : `👁️ ดูสคริปต์ (${script.chapters.length} บท)`}
            </button>
            <button onClick={polish} disabled={busy}
              style={{ ...btn, background: 'transparent', color: C.amber, border: `1px solid ${C.amber}`, opacity: busy ? 0.6 : 1, cursor: busy ? 'wait' : 'pointer' }}>
              {busy ? '⏳ กำลังขัดเกลา…' : (polished ? '✨ ขัดเกลาแล้ว' : '✨ ให้ AI ขัดเกลาสำนวน')}
            </button>
          </div>

          {note && (
            <div style={{ fontSize: 12, color: polished ? C.green : C.amber, marginBottom: 10 }}>{note}</div>
          )}

          <div style={{ fontSize: 11.5, color: C.slate, marginBottom: open ? 12 : 0, lineHeight: 1.6 }}>
            📌 {script.disclaimer}
          </div>

          {open && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, color: C.white, fontWeight: 700 }}>{script.title}</div>
              {script.chapters.map(ch => (
                <div key={ch.no} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', background: C.card }}>
                  <div style={{ fontSize: 12, color: C.cyan, fontWeight: 700 }}>บทที่ {ch.no} · {ch.time}</div>
                  <div style={{ fontSize: 14, color: C.white, fontWeight: 700, margin: '2px 0 6px' }}>{ch.heading}</div>
                  <div style={{ fontSize: 11.5, color: C.slate, fontStyle: 'italic', marginBottom: 6 }}>{ch.visual}</div>
                  {ch.lever && <div style={{ fontSize: 11, color: 'var(--violet-text)', marginBottom: 4 }}>🧠 เลเวอร์: {ch.lever}</div>}
                  <div style={{ fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.7 }}>{ch.narration}</div>
                  {ch.points.length > 0 && (
                    <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: C.slate, fontSize: 12.5, lineHeight: 1.7 }}>
                      {ch.points.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  )}
                  {ch.screenRec && <div style={{ fontSize: 12, color: C.green, marginTop: 8 }}>🖥️ อัดจอ: {ch.screenRec}</div>}
                  {ch.flowPrompt && <div style={{ fontSize: 11.5, color: C.amber, marginTop: 4, lineHeight: 1.5 }}>🎥 Flow prompt: <span style={{ color: C.slate }}>{ch.flowPrompt}</span></div>}
                </div>
              ))}

              {/* Governance footer */}
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', background: C.card }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--violet-text)', marginBottom: 6 }}>🔐 จริยธรรม + Data Governance (อยู่ในไฟล์ที่คัดลอก/ดาวน์โหลด)</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: C.slate, fontSize: 12, lineHeight: 1.7 }}>
                  {script.darkMarketing.slice(0, 2).map((t, i) => <li key={'d' + i}>{t}</li>)}
                  {script.ethics.slice(0, 1).map((t, i) => <li key={'e' + i}>{t}</li>)}
                  {script.dataGovernance.slice(0, 1).map((t, i) => <li key={'g' + i}>{t}</li>)}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
