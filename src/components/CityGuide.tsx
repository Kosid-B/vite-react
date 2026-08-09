import { useEffect, useRef, useState } from 'react';
import type { PageId } from '../types';
import type { GuideScript } from '../lib/cityGuide';
import { track } from '../lib/analytics';

/* CityGuide — Avatar "โฮสต์เมือง" ที่พูดต้อนรับคู่ค้า + อธิบายเมืองเพื่อจับคู่ธุรกิจ (matching)
 * แสดงบทพูดแบบ typewriter ทีละบรรทัด + อ่านออกเสียงจริงด้วย Web Speech API (ไทย, opt-in ไม่เล่นเองอัตโนมัติ)
 * ปุ่ม CTA พาไปหน้า RFQ / จับคู่ธุรกิจ / หน้าร้าน */

function pickThaiVoice(): SpeechSynthesisVoice | null {
  try {
    const vs = window.speechSynthesis.getVoices();
    return vs.find(v => (v.lang || '').toLowerCase().startsWith('th')) || null;
  } catch { return null; }
}

export default function CityGuide({ script, accent, onNavigate }: {
  script: GuideScript; accent: string; onNavigate?: (p: PageId) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [playing, setPlaying] = useState(true);
  const [tts, setTts] = useState(false);
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const line = script.lines[idx] ?? script.lines[0];
  const startedRef = useRef(false);

  useEffect(() => { if (!startedRef.current) { startedRef.current = true; track('city_guide_shown', { era_lines: script.lines.length }); } }, [script.lines.length]);

  // reset เมื่อสคริปต์เปลี่ยน (เปลี่ยนยุค/ข้อมูล)
  useEffect(() => { setIdx(0); setPlaying(true); }, [script]);

  // typewriter บรรทัดปัจจุบัน
  useEffect(() => {
    setTyped('');
    const full = line.text;
    let k = 0;
    const iv = window.setInterval(() => {
      k++; setTyped(full.slice(0, k));
      if (k >= full.length) window.clearInterval(iv);
    }, 26);
    return () => window.clearInterval(iv);
  }, [idx, line.text]);

  // auto-advance เมื่อ playing (หยุดที่บรรทัดสุดท้าย)
  useEffect(() => {
    if (!playing) return;
    const dur = 1500 + line.text.length * 45;
    const to = window.setTimeout(() => {
      setIdx(p => (p < script.lines.length - 1 ? p + 1 : (setPlaying(false), p)));
    }, dur);
    return () => window.clearTimeout(to);
  }, [idx, playing, line.text, script.lines.length]);

  // อ่านออกเสียงบรรทัดปัจจุบัน (เมื่อเปิด TTS)
  useEffect(() => {
    if (!tts || !ttsSupported) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(line.text);
      const v = pickThaiVoice();
      if (v) u.voice = v;
      u.lang = v?.lang || 'th-TH';
      u.rate = 1; u.pitch = 1;
      window.speechSynthesis.speak(u);
    } catch { /* noop */ }
    return () => { try { window.speechSynthesis.cancel(); } catch { /* noop */ } };
  }, [idx, tts, ttsSupported, line.text]);

  // หยุดพูดเมื่อออกจากหน้า
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* noop */ } }, []);

  const toggleTts = () => {
    const next = !tts;
    setTts(next);
    if (!next) { try { window.speechSynthesis.cancel(); } catch { /* noop */ } }
    else { setPlaying(true); track('city_guide_tts', { on: 1 }); }
  };
  const go = (page: string) => { track('city_guide_cta', { page }); onNavigate?.(page as PageId); };

  return (
    <div className="cg-wrap">
      <style>{CG_CSS}</style>
      <div className="cg-avatar" style={{ ['--cg-accent' as string]: accent }}>
        <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="var(--cg-accent)" opacity="0.16" />
          <circle cx="32" cy="32" r="23" fill="#0e1732" stroke="var(--cg-accent)" strokeWidth="1.6" />
          <circle cx="32" cy="27" r="9" fill="#dfe7ff" />
          <path d="M18 47c2-8 10-11 14-11s12 3 14 11z" fill="#dfe7ff" />
          <path d="M15 30a17 17 0 0 1 34 0" fill="none" stroke="var(--cg-accent)" strokeWidth="2.4" />
          <circle cx="15" cy="31" r="3" fill="var(--cg-accent)" />
          <circle cx="49" cy="31" r="3" fill="var(--cg-accent)" />
          <rect x="30" y="40" width="10" height="4" rx="2" fill="var(--cg-accent)" />
          <circle cx="28" cy="27" r="1.4" fill="#0e1732" />
          <circle cx="36" cy="27" r="1.4" fill="#0e1732" />
        </svg>
        <span className="cg-live">● สด</span>
      </div>

      <div className="cg-body">
        <div className="cg-head">
          <b>🎙️ {script.host}</b>
          <span className="cg-sub">ต้อนรับคู่ค้า · แนะนำเพื่อจับคู่ธุรกิจ</span>
          <span className="cg-step">{idx + 1}/{script.lines.length}</span>
        </div>
        <div className="cg-bubble">
          <span className="cg-ic">{line.icon}</span>
          <span className="cg-text">{typed}<span className="cg-caret">▍</span></span>
        </div>
        <div className="cg-controls">
          <button className="cg-btn" onClick={() => setIdx(p => Math.max(0, p - 1))} disabled={idx === 0} title="ก่อนหน้า">⏮</button>
          <button className="cg-btn" onClick={() => setPlaying(p => !p)} title={playing ? 'หยุด' : 'เล่น'}>{playing ? '⏸' : '▶'}</button>
          <button className="cg-btn" onClick={() => setIdx(p => Math.min(script.lines.length - 1, p + 1))} disabled={idx >= script.lines.length - 1} title="ถัดไป">⏭</button>
          {ttsSupported && <button className={`cg-btn cg-tts${tts ? ' on' : ''}`} onClick={toggleTts} title="อ่านออกเสียง">{tts ? '🔊 เสียงเปิด' : '🔈 ฟังเสียง'}</button>}
          <button className="cg-btn cg-replay" onClick={() => { setIdx(0); setPlaying(true); }} title="เล่นใหม่">↺ เล่นใหม่</button>
        </div>
        <div className="cg-ctas">
          {script.ctas.map(c => (
            <button key={c.page} className="cg-cta" onClick={() => go(c.page)}>{c.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

const CG_CSS = `
.cg-wrap{ display:flex; gap:14px; align-items:flex-start; margin-top:12px;
  background:color-mix(in srgb, var(--panel) 80%, transparent); border:1px solid var(--panel-border);
  border-radius:16px; padding:14px 16px; }
.cg-avatar{ position:relative; flex:0 0 auto; filter:drop-shadow(0 4px 14px color-mix(in srgb, var(--cg-accent) 40%, transparent)); }
.cg-live{ position:absolute; bottom:-4px; left:50%; transform:translateX(-50%); font-size:9.5px; font-weight:700;
  color:#ff5b6e; background:#0e1732; border-radius:999px; padding:1px 7px; white-space:nowrap; letter-spacing:.04em; }
.cg-body{ flex:1; min-width:0; }
.cg-head{ display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; }
.cg-head b{ color:var(--text); font-size:14.5px; }
.cg-sub{ font-size:12px; color:var(--text-soft); }
.cg-step{ margin-left:auto; font-size:12px; color:var(--text-soft); font-variant-numeric:tabular-nums; }
.cg-bubble{ display:flex; gap:9px; align-items:flex-start; margin:8px 0 10px; padding:11px 14px;
  background:var(--card); border:1px solid var(--card-border); border-radius:12px; border-top-left-radius:3px; min-height:56px; }
.cg-ic{ font-size:18px; line-height:1.4; flex:0 0 auto; }
.cg-text{ color:var(--text); font-size:14.5px; line-height:1.6; }
.cg-caret{ color:var(--cg-accent, var(--gold)); animation:cg-blink 1s steps(1) infinite; }
@keyframes cg-blink{ 0%,50%{opacity:1} 51%,100%{opacity:0} }
.cg-controls{ display:flex; gap:7px; flex-wrap:wrap; align-items:center; }
.cg-btn{ cursor:pointer; background:var(--card); border:1px solid var(--card-border); color:var(--text);
  border-radius:999px; padding:6px 12px; font-family:inherit; font-size:13px; font-weight:600; transition:border-color .2s,transform .15s; }
.cg-btn:hover:not(:disabled){ transform:translateY(-1px); }
.cg-btn:disabled{ opacity:.4; cursor:default; }
.cg-tts.on{ border-color:var(--gold); color:var(--gold); background:color-mix(in srgb, var(--gold) 14%, var(--card)); }
.cg-ctas{ display:flex; gap:8px; flex-wrap:wrap; margin-top:11px; }
.cg-cta{ cursor:pointer; border:0; border-radius:999px; padding:8px 15px; font-family:inherit; font-size:13px; font-weight:700;
  background:var(--bar-fill); color:#0a1020; box-shadow:0 4px 16px var(--glow); transition:transform .15s; }
.cg-cta:hover{ transform:translateY(-1px); }
@media (max-width:560px){ .cg-wrap{ flex-direction:column; align-items:center; text-align:center; } .cg-head,.cg-controls,.cg-ctas{ justify-content:center; } .cg-step{ margin-left:0; } }
@media (prefers-reduced-motion:reduce){ .cg-caret{ animation:none; } }
`;
