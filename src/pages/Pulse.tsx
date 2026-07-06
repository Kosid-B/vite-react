import { useEffect, useMemo } from 'react';
import type { AppData, PageId } from '../types';
import {
  EXPERIMENTS, variantFor, recordPulse, todayPulse, pulseSummary,
  makeUid, defaultExperiments, type PulseScore, type ExperimentsState, type Experiment,
} from '../lib/experiments';
import { streakCount } from '../lib/streak';
import { track } from '../lib/analytics';

/* ===== Pulse & A/B — วัด "อะไรทำให้อยากใช้งานต่อ" แบบโปร่งใส =====
 * ยินยอมก่อน (opt-in) · รู้ตัวว่าอยู่กลุ่มไหน · เห็นข้อมูลตัวเอง · ปิด/ลบได้ทุกเมื่อ
 * ไม่มี dark pattern: ไม่บิดอารมณ์ ไม่หลอก ไม่ scarcity ปลอม — วัดความรู้สึกจริงตรง ๆ */

const SCORES: { v: PulseScore; emoji: string; label: string; color: string }[] = [
  { v: 1, emoji: '😕', label: 'ยังไม่ค่อยช่วย', color: 'var(--red)' },
  { v: 2, emoji: '🙂', label: 'พอใช้ได้', color: 'var(--amber)' },
  { v: 3, emoji: '😄', label: 'ช่วยได้จริง', color: 'var(--green)' },
];

export default function Pulse({ data, onNavigate, onUpdate }: { data: AppData; onNavigate: (p: PageId) => void; onUpdate: (d: AppData) => void }) {
  const exp = data.experiments ?? defaultExperiments();
  const set = (next: ExperimentsState) => onUpdate({ ...data, experiments: next });

  const streak = streakCount(data);
  const sum = useMemo(() => pulseSummary(exp), [exp]);
  const today = todayPulse(exp);

  useEffect(() => { track('pulse_page_viewed', { enabled: exp.enabled ? 1 : 0 }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ล็อกกลุ่ม A/B ของทุกการทดลอง + ส่ง exposure event ครั้งแรกที่เปิดใช้
  useEffect(() => {
    if (!exp.enabled) return;
    const assignments = { ...(exp.assignments ?? {}) };
    let changed = false;
    for (const e of EXPERIMENTS) {
      if (assignments[e.id]) continue;
      const v = variantFor(exp, e);
      assignments[e.id] = v.id;
      changed = true;
      track('experiment_exposed', { experiment: e.id, variant: v.id });
    }
    if (changed) set({ ...exp, assignments });
  }, [exp.enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  function enable() {
    const uid = exp.uid ?? makeUid();
    set({ ...exp, enabled: true, seenConsent: true, uid });
    track('pulse_consent', { choice: 'opt_in' });
  }
  function decline() {
    set({ ...exp, enabled: false, seenConsent: true });
    track('pulse_consent', { choice: 'decline' });
  }
  function toggleOff() {
    set({ ...exp, enabled: false });
    track('pulse_consent', { choice: 'opt_out' });
  }
  function clearData() {
    if (!confirm('ล้างข้อมูล Pulse ทั้งหมดของคุณในเครื่องนี้? (pulse, กลุ่ม A/B, id ไม่ระบุตัวตน)')) return;
    set(defaultExperiments());
    track('pulse_data_cleared', {});
  }
  function submitPulse(score: PulseScore) {
    set(recordPulse(exp, score));
    track('pulse_submitted', { score });
  }
  function activate(e: Experiment) {
    const activations = Array.from(new Set([...(exp.activations ?? []), e.id]));
    set({ ...exp, activations });
    track('pulse_activation', { experiment: e.id, variant: exp.assignments?.[e.id] ?? variantFor(exp, e).id });
    onNavigate((e.goto ?? 'citylevelup') as PageId);
  }

  return (
    <div className="pls-wrap">
      <style>{PLS_CSS}</style>

      <header className="pls-head">
        <div className="pls-eyebrow">💓 Pulse &amp; A/B · วัดผลแบบโปร่งใส</div>
        <h1 className="pls-h1">อะไรทำให้คุณ<span className="pls-hl">อยากใช้งานต่อ</span>?</h1>
        <p className="pls-lede">
          เราอยากพัฒนาระบบให้ช่วยงานคุณจริง — จึงวัด “ความรู้สึกจริง” ของคุณแบบตรงไปตรงมา
          ไม่ใช้กลลวงหรือบิดอารมณ์ให้ตัดสินใจโดยไม่รู้ตัว. คุณ<b>ยินยอมก่อน</b> เห็นว่าตัวเองอยู่กลุ่มไหน
          ดูข้อมูลของตัวเองได้ทั้งหมด และ<b>ปิดหรือลบได้ทุกเมื่อ</b>.
        </p>
      </header>

      {/* ---- consent gate ---- */}
      {!exp.enabled ? (
        <section className="pls-card pls-consent">
          <h2 className="pls-card-title">🔓 ขอความยินยอมก่อนวัดผล</h2>
          <ul className="pls-list">
            <li><b>วัดอะไร</b>: คะแนน pulse รายวัน (😕/🙂/😄) และคุณกดปุ่ม “อยากทำต่อ” หรือไม่</li>
            <li><b>ทำไม</b>: เพื่อรู้ว่าการออกแบบประสบการณ์แบบไหนช่วยให้คุณลงมือทำธุรกิจได้จริง</li>
            <li><b>ไม่ระบุตัวตน</b>: ใช้ id สุ่มเฉพาะเครื่อง ไม่ผูกกับชื่อ/อีเมล</li>
            <li><b>คุณคุมเอง</b>: ปิดหรือลบข้อมูลได้ทุกเมื่อ — ปิดอยู่แล้วระบบใช้งานได้ครบเหมือนเดิม</li>
          </ul>
          <div className="pls-btn-row">
            <button className="pls-btn pls-primary" onClick={enable}>เปิดใช้ — ช่วยพัฒนาระบบ</button>
            <button className="pls-btn pls-ghost" onClick={decline}>ยังไม่ตอนนี้</button>
          </div>
          {exp.seenConsent && <p className="pls-muted">คุณเลือกไม่เข้าร่วมไว้ — ระบบยังใช้งานได้ครบทุกฟีเจอร์</p>}
        </section>
      ) : (
        <>
          {/* ---- daily pulse ---- */}
          <section className="pls-card">
            <h2 className="pls-card-title">วันนี้ระบบช่วยงานคุณได้แค่ไหน?</h2>
            <p className="pls-muted">แตะเดียว — ตอบตามจริง เปลี่ยนใจภายในวันเดียวกันได้</p>
            <div className="pls-pulse-row">
              {SCORES.map(s => (
                <button key={s.v}
                  className={`pls-pulse-btn${today?.score === s.v ? ' pls-selected' : ''}`}
                  style={today?.score === s.v ? { borderColor: s.color, boxShadow: `0 0 0 1px ${s.color}` } : undefined}
                  onClick={() => submitPulse(s.v)}>
                  <span className="pls-emoji">{s.emoji}</span>
                  <span className="pls-pulse-label">{s.label}</span>
                </button>
              ))}
            </div>
            {today && <p className="pls-thanks">ขอบคุณ! บันทึกความรู้สึกวันนี้แล้ว — คุณเปลี่ยนได้ตลอดวัน</p>}
          </section>

          {/* ---- A/B experiments (transparent, ทุกการทดลอง) ---- */}
          {EXPERIMENTS.map(e => {
            const v = variantFor(exp, e);
            const done = (exp.activations ?? []).includes(e.id);
            return (
              <section key={e.id} className="pls-card pls-exp">
                <div className="pls-exp-top">
                  <h2 className="pls-card-title">🧪 การทดลองที่คุณกำลังอยู่</h2>
                  <span className="pls-badge">{v.label}</span>
                </div>
                <p className="pls-q">คำถามที่เรากำลังหาคำตอบ: <b>{e.question}</b></p>
                <div className="pls-variant">
                  <div className="pls-variant-head">{v.headline}</div>
                  <div className="pls-variant-body">{v.body}</div>
                  <button className="pls-btn pls-primary" onClick={() => activate(e)}>{v.cta} →</button>
                  {done && <span className="pls-done">✓ บันทึกแล้วว่าคุณอยากทำต่อ</span>}
                </div>
                <p className="pls-muted">
                  คุณถูกจัดกลุ่มนี้แบบสุ่มคงที่ (เห็นข้อความเดิมทุกครั้งเพื่อความเป็นธรรมของการทดลอง)
                  — ไม่ใช่การเลือกมาเพื่อกดดันคุณ. เราเทียบว่ากลุ่มไหนทำให้คน “อยากทำต่อ” มากกว่ากัน แล้วนำไปปรับปรุงระบบ.
                </p>
              </section>
            );
          })}

          {/* ---- your own data (transparency) ---- */}
          <section className="pls-card">
            <h2 className="pls-card-title">📊 ข้อมูลของคุณ (เห็นได้ทั้งหมด)</h2>
            <div className="pls-stats">
              <div className="pls-stat"><div className="pls-stat-n">{streak}</div><div className="pls-stat-l">วันต่อเนื่อง</div></div>
              <div className="pls-stat"><div className="pls-stat-n">{sum.n}</div><div className="pls-stat-l">ครั้งที่ให้ pulse</div></div>
              <div className="pls-stat"><div className="pls-stat-n">{sum.n ? sum.avg.toFixed(1) : '—'}</div><div className="pls-stat-l">คะแนนเฉลี่ย /3</div></div>
              <div className="pls-stat"><div className="pls-stat-n">{sum.good}·{sum.meh}·{sum.bad}</div><div className="pls-stat-l">😄·🙂·😕</div></div>
            </div>
            {sum.last7.length > 0 && (
              <div className="pls-spark">
                {sum.last7.map((p, i) => {
                  const sc = SCORES.find(s => s.v === p.score)!;
                  return <div key={i} className="pls-spark-col" title={`${p.day} · ${sc.label}`}>
                    <div className="pls-spark-bar" style={{ height: `${p.score / 3 * 100}%`, background: sc.color }} />
                    <span className="pls-spark-e">{sc.emoji}</span>
                  </div>;
                })}
              </div>
            )}
            {sum.n === 0 && <p className="pls-muted">ยังไม่มีข้อมูล — ให้ pulse วันแรกด้านบนได้เลย</p>}
          </section>

          {/* ---- controls ---- */}
          <section className="pls-card pls-controls">
            <div>
              <div className="pls-card-title" style={{ marginBottom: 4 }}>คุณคุมข้อมูลของตัวเอง</div>
              <p className="pls-muted" style={{ margin: 0 }}>ปิดการวัดผล หรือ ล้างข้อมูลทั้งหมดได้ทุกเมื่อ — ระบบยังใช้งานได้ครบ</p>
            </div>
            <div className="pls-btn-row">
              <button className="pls-btn pls-ghost" onClick={toggleOff}>ปิดการวัดผล</button>
              <button className="pls-btn pls-danger" onClick={clearData}>ล้างข้อมูล Pulse</button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const PLS_CSS = `
.pls-wrap{ max-width:820px; margin:0 auto; }
.pls-eyebrow{ color:var(--accent); font-size:12px; font-weight:700; letter-spacing:.2em; text-transform:uppercase; }
.pls-h1{ font-size:clamp(26px,4vw,40px); font-weight:800; line-height:1.2; margin:10px 0 12px; color:var(--ink); }
.pls-hl{ color:var(--accent); }
.pls-lede{ color:var(--ink3); font-size:15.5px; line-height:1.75; max-width:640px; }
.pls-lede b{ color:var(--ink2); }

.pls-card{ background:var(--cream2); border:1px solid var(--cream3); border-radius:var(--r-lg);
  padding:22px 24px; margin-top:18px; box-shadow:var(--shadow-sm); }
.pls-card-title{ font-size:17px; font-weight:700; color:var(--ink); margin:0 0 6px; }
.pls-muted{ color:var(--ink4); font-size:13px; line-height:1.6; }
.pls-list{ margin:8px 0 18px; padding-left:18px; color:var(--ink3); font-size:14px; line-height:1.9; }
.pls-list b{ color:var(--ink2); }

.pls-btn-row{ display:flex; gap:10px; flex-wrap:wrap; }
.pls-btn{ cursor:pointer; border-radius:999px; padding:10px 18px; font-family:inherit; font-size:14px;
  font-weight:600; border:1px solid var(--cream3); background:var(--cream3); color:var(--ink2);
  transition:transform .15s ease,filter .15s ease; }
.pls-btn:hover{ transform:translateY(-1px); filter:brightness(1.08); }
.pls-primary{ background:var(--accent); border-color:var(--accent); color:#00212b; }
.pls-ghost{ background:transparent; }
.pls-danger{ background:transparent; border-color:var(--red); color:var(--red); }

.pls-consent{ border-color:color-mix(in srgb, var(--accent) 40%, var(--cream3)); }

.pls-pulse-row{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:14px; }
.pls-pulse-btn{ cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:8px;
  padding:18px 10px; border-radius:var(--r-lg); border:1px solid var(--cream3); background:var(--cream);
  color:var(--ink2); font-family:inherit; transition:transform .15s ease,border-color .2s ease; }
.pls-pulse-btn:hover{ transform:translateY(-2px); }
.pls-emoji{ font-size:30px; line-height:1; }
.pls-pulse-label{ font-size:13px; font-weight:600; }
.pls-thanks{ margin-top:12px; color:var(--green); font-size:13.5px; font-weight:600; }

.pls-exp{ border-color:color-mix(in srgb, var(--blue) 30%, var(--cream3)); }
.pls-exp-top{ display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
.pls-badge{ background:var(--blue-bg); color:var(--blue); border:1px solid color-mix(in srgb, var(--blue) 45%, transparent);
  padding:4px 12px; border-radius:999px; font-size:12.5px; font-weight:700; white-space:nowrap; }
.pls-q{ color:var(--ink3); font-size:14px; line-height:1.7; margin:8px 0 14px; }
.pls-q b{ color:var(--ink2); }
.pls-variant{ background:var(--cream); border:1px solid var(--cream3); border-radius:var(--r-lg); padding:18px 20px; }
.pls-variant-head{ font-size:18px; font-weight:800; color:var(--ink); margin-bottom:6px; }
.pls-variant-body{ color:var(--ink3); font-size:14.5px; line-height:1.7; margin-bottom:16px; }
.pls-done{ display:inline-block; margin-left:12px; color:var(--green); font-size:13px; font-weight:600; }

.pls-stats{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin:14px 0; }
.pls-stat{ background:var(--cream); border:1px solid var(--cream3); border-radius:var(--r); padding:14px 10px; text-align:center; }
.pls-stat-n{ font-size:22px; font-weight:800; color:var(--ink); font-variant-numeric:tabular-nums; }
.pls-stat-l{ font-size:11.5px; color:var(--ink4); margin-top:4px; }
.pls-spark{ display:flex; align-items:flex-end; gap:10px; height:90px; padding:10px 4px 0;
  border-top:1px dashed var(--cream3); }
.pls-spark-col{ flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; gap:4px; }
.pls-spark-bar{ width:70%; max-width:34px; border-radius:6px 6px 0 0; min-height:6px; transition:height .4s ease; }
.pls-spark-e{ font-size:14px; }

.pls-controls{ display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }

@media (max-width:560px){
  .pls-stats{ grid-template-columns:repeat(2,1fr); }
  .pls-pulse-row{ grid-template-columns:1fr; }
}
`;
