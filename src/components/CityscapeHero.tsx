import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppData } from '../types';
import { cityStats } from '../lib/companyCity';
import { COMPANY_LEVELS } from '../lib/gamification';
import {
  renderCityscape, detectTime, detectSeason,
  TIME_LABEL, SEASON_LABEL, type TimeName, type SeasonName,
} from '../lib/cityScape';

/* Hero ภาพเมืองบริษัทแบบไอโซเมตริก 3 มิติ — แสง/เงาตามเวลา, อากาศตามฤดู (ภูมิอากาศไทย)
 * ผูก XP/ระดับเมืองกับผลงานจริง (cityStats + COMPANY_LEVELS). ฝังบนสุดของหน้า "เมืองบริษัท". */

const TIME_BTNS: { id: TimeName; label: string }[] = [
  { id: 'morning', label: '🌅 เช้า' },
  { id: 'noon', label: '☀️ กลางวัน' },
  { id: 'evening', label: '🌇 เย็น' },
  { id: 'night', label: '🌙 กลางคืน' },
  { id: 'cyber', label: '🤖 ไซเบอร์' },
];
const SEASON_BTNS: { id: SeasonName; label: string }[] = [
  { id: 'summer', label: '☀️ ร้อน' },
  { id: 'rainy', label: '🌧️ ฝน' },
  { id: 'spring', label: '🌸 ใบไม้ผลิ' },
  { id: 'winter', label: '❄️ หนาว' },
];

const LEVEL_META = [
  { rank: 'Starter', ic: '🌱', name: 'หมู่บ้านสตาร์ทอัป' },
  { rank: 'Growing', ic: '🌿', name: 'ชุมชนกำลังโต' },
  { rank: 'Professional', ic: '⭐', name: 'เมืองมืออาชีพ' },
  { rank: 'Advanced', ic: '🏆', name: 'นครธุรกิจ' },
  { rank: 'Elite', ic: '👑', name: 'มหานคร AI' },
];

function xpRange(min: number, max: number): string {
  if (max === Infinity) return `${min.toLocaleString('th-TH')}+ XP`;
  return `${min.toLocaleString('th-TH')}–${max.toLocaleString('th-TH')} XP`;
}

export default function CityscapeHero({ data }: { data: AppData }) {
  const s = useMemo(() => cityStats(data), [data]);
  const svgRef = useRef<SVGSVGElement>(null);

  const [time, setTime] = useState<TimeName>('night');
  const [season, setSeason] = useState<SeasonName>('summer');
  const [auto, setAuto] = useState(true);
  const [autoStatus, setAutoStatus] = useState('');

  useEffect(() => {
    if (svgRef.current) renderCityscape(svgRef.current, time, season);
  }, [time, season]);

  useEffect(() => {
    if (!auto) { setAutoStatus('ปรับเอง — กด “อัตโนมัติ” เพื่อกลับมาตามเวลาจริง'); return; }
    const tick = () => {
      const now = new Date();
      const t = detectTime(now.getHours());
      const se = detectSeason(now.getMonth() + 1);
      setTime(t); setSeason(se);
      const hhmm = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      setAutoStatus(`ตอนนี้ ${hhmm} น. → ${TIME_LABEL[t]} · ${SEASON_LABEL[se]}`);
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [auto]);

  const pickTime = (t: TimeName) => { setAuto(false); setTime(t); };
  const pickSeason = (se: SeasonName) => { setAuto(false); setSeason(se); };

  const lvl = s.level;
  const nextMin = lvl.max === Infinity ? lvl.min : lvl.max + 1;
  const goalLabel = lvl.max === Infinity ? 'สูงสุดแล้ว' : `${s.xp.toLocaleString('th-TH')} / ${nextMin.toLocaleString('th-TH')} XP`;
  const activeRank = lvl.rank;
  const nextRank = COMPANY_LEVELS[Math.min(COMPANY_LEVELS.findIndex(l => l.rank === activeRank) + 1, COMPANY_LEVELS.length - 1)].rank;

  return (
    <div className="clv-root clv-embed" data-time={time} data-season={season}>
      <style>{CLV_CSS}</style>
      <div className="clv-wrap">
        <div className="clv-controls-bar">
          <div className="clv-eyebrow">Company City · Level Up</div>
          <div className="clv-controls">
            <div className="clv-ctrl-group">
              <button className="clv-tbtn clv-auto-btn" aria-pressed={auto} onClick={() => setAuto(a => !a)}>
                🔄 อัตโนมัติตามเวลาจริง
              </button>
              <span className="clv-auto-status">{autoStatus}</span>
            </div>
            <div className="clv-btn-row" role="group" aria-label="เลือกช่วงเวลา">
              {TIME_BTNS.map(b => (
                <button key={b.id} className="clv-tbtn" aria-pressed={time === b.id} onClick={() => pickTime(b.id)}>{b.label}</button>
              ))}
            </div>
            <div className="clv-btn-row" role="group" aria-label="เลือกฤดูกาล">
              {SEASON_BTNS.map(b => (
                <button key={b.id} className="clv-tbtn" aria-pressed={season === b.id} onClick={() => pickSeason(b.id)}>{b.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="clv-city-panel">
          <div className="clv-city-badge">👑 ระดับปัจจุบัน · {s.tier.label}</div>
          <svg ref={svgRef} className="clv-city" viewBox="0 0 1120 760" role="img"
            aria-label="เมืองบริษัทแบบสามมิติ แสดงตึกหลากหลายรูปทรง เงาทอดตามช่วงเวลา และสภาพอากาศตามฤดูกาล" />
        </div>

        <div className="clv-progress-card">
          <div className="clv-progress-top">
            <div className="clv-progress-title">
              ความคืบหน้าสู่ระดับถัดไป — <b>{s.tier.label}{lvl.max === Infinity ? '' : ` → ${(LEVEL_META.find(m => m.rank === nextRank)?.name ?? nextRank)}`}</b>
            </div>
            <div className="clv-xp">{goalLabel}</div>
          </div>
          <div className="clv-bar"><div className="clv-bar-fill" style={{ width: `${s.pctToNext}%` }} /></div>
        </div>

        <div className="clv-levels">
          {COMPANY_LEVELS.map(l => {
            const meta = LEVEL_META.find(m => m.rank === l.rank)!;
            const isActive = l.rank === activeRank;
            const isGoal = l.rank === nextRank && nextRank !== activeRank;
            return (
              <div key={l.rank} className={`clv-lvl${isActive ? ' clv-active' : ''}${isGoal ? ' clv-goal' : ''}`}>
                {isActive && <span className="clv-tag clv-here">คุณอยู่ที่นี่</span>}
                {isGoal && <span className="clv-tag clv-next">เป้าหมายถัดไป ↑</span>}
                <div className="clv-ic">{meta.ic}</div>
                <h3 className="clv-lvl-h3">{meta.name}</h3>
                <div className="clv-range">{xpRange(l.min, l.max)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* Scoped styles (.clv-) — palette vars swap by [data-time] on the root */
const CLV_CSS = `
.clv-root{ --bg1:#070d24; --bg2:#0d1638; --panel:#0e1732; --panel-border:rgba(120,140,220,.18);
  --text:#eef1ff; --text-soft:#9aa6d8; --gold:#ffcf5c; --card:#0b132c; --card-border:rgba(120,140,220,.16);
  --active-border:#5b8bff; --goal-border:#ffcf5c; --bar-track:#141d3f;
  --bar-fill:linear-gradient(90deg,#35e0a1,#8de06f,#ffd84d); --glow:rgba(255,207,92,.35);
  background:radial-gradient(120% 90% at 50% 0%, var(--bg2) 0%, var(--bg1) 62%);
  color:var(--text); border-radius:18px; transition:background .6s ease,color .4s ease; overflow:hidden; }
.clv-root[data-time="morning"]{ --bg1:#f3ddc8; --bg2:#cfe4f4; --panel:#fff8ef; --panel-border:rgba(180,120,60,.20);
  --text:#3a2c22; --text-soft:#8a715c; --gold:#e07b2a; --card:#fffdf8; --card-border:rgba(180,120,60,.18);
  --active-border:#3a86c8; --goal-border:#e07b2a; --bar-track:#efe0cd;
  --bar-fill:linear-gradient(90deg,#57c98a,#a8d95c,#f5a731); --glow:rgba(224,123,42,.25); }
.clv-root[data-time="noon"]{ --bg1:#cfe8ff; --bg2:#eaf5ff; --panel:#ffffff; --panel-border:rgba(60,100,180,.18);
  --text:#152447; --text-soft:#5b6c96; --gold:#f59e0b; --card:#ffffff; --card-border:rgba(60,100,180,.16);
  --active-border:#2f7de1; --goal-border:#f59e0b; --bar-track:#dde9fa;
  --bar-fill:linear-gradient(90deg,#22c58b,#7cd463,#f5b731); --glow:rgba(245,158,11,.25); }
.clv-root[data-time="evening"]{ --bg1:#1b0b2e; --bg2:#3c1440; --panel:#2a1038; --panel-border:rgba(255,150,120,.22);
  --text:#fff2ec; --text-soft:#e0a8a0; --gold:#ffb35c; --card:#241031; --card-border:rgba(255,150,120,.18);
  --active-border:#ff8ba7; --goal-border:#ffb35c; --bar-track:#3a1a45;
  --bar-fill:linear-gradient(90deg,#ff5e7e,#ff9a5c,#ffd84d); --glow:rgba(255,140,90,.35); }
.clv-root[data-time="cyber"]{ --bg1:#04010d; --bg2:#0d0524; --panel:#0c0620; --panel-border:rgba(255,60,220,.25);
  --text:#f4ecff; --text-soft:#a58ad0; --gold:#00f0ff; --card:#0a0519; --card-border:rgba(0,240,255,.18);
  --active-border:#ff3cdc; --goal-border:#00f0ff; --bar-track:#170a33;
  --bar-fill:linear-gradient(90deg,#ff3cdc,#8a5cff,#00f0ff); --glow:rgba(0,240,255,.30); }

.clv-embed .clv-wrap{ max-width:none; margin:0; padding:20px 22px 26px; }
.clv-eyebrow{ display:flex; align-items:center; gap:14px; color:var(--gold);
  font-size:12px; font-weight:700; letter-spacing:.42em; text-transform:uppercase; }
.clv-eyebrow::before{ content:""; width:38px; height:2px; background:var(--gold); border-radius:2px; }
.clv-controls-bar{ display:flex; justify-content:space-between; align-items:flex-start; gap:20px; flex-wrap:wrap; }
.clv-controls{ display:flex; flex-direction:column; gap:10px; align-items:flex-end; }
.clv-ctrl-group{ display:flex; flex-direction:column; gap:6px; align-items:flex-end; }
.clv-btn-row{ display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
.clv-tbtn{ display:flex; align-items:center; gap:6px; cursor:pointer;
  background:var(--card); border:1px solid var(--card-border); color:var(--text);
  border-radius:999px; padding:6px 12px; font-family:inherit; font-size:12.5px; font-weight:600;
  transition:transform .15s ease,border-color .2s ease,box-shadow .2s ease; }
.clv-tbtn:hover{ transform:translateY(-1px); }
.clv-tbtn:focus-visible{ outline:2px solid var(--gold); outline-offset:2px; }
.clv-tbtn[aria-pressed="true"]{ border-color:var(--gold); box-shadow:0 0 0 1px var(--gold),0 6px 22px var(--glow); }
.clv-auto-btn[aria-pressed="true"]{ background:color-mix(in srgb, var(--gold) 16%, var(--card)); color:var(--gold); }
.clv-auto-status{ font-size:12px; color:var(--text-soft); min-height:1.2em; }

.clv-city-panel{ position:relative; margin-top:14px; }
.clv-city-badge{ position:absolute; left:50%; top:6px; transform:translateX(-50%); z-index:5;
  background:color-mix(in srgb, var(--panel) 82%, transparent); border:1px solid var(--gold); color:var(--gold);
  padding:7px 18px; border-radius:999px; font-weight:700; font-size:14px;
  box-shadow:0 8px 30px var(--glow); backdrop-filter:blur(6px); white-space:nowrap;
  animation:clv-float 4.5s ease-in-out infinite; }
@keyframes clv-float{ 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-7px)} }
.clv-city{ width:100%; height:auto; display:block; }

.clv-blink{ animation:clv-blink 1.6s steps(1) infinite; }
@keyframes clv-blink{ 0%,55%{opacity:1} 56%,100%{opacity:.12} }
.clv-flicker{ animation:clv-flick 3.8s ease-in-out infinite; }
@keyframes clv-flick{ 0%,100%{opacity:.95} 44%{opacity:.95} 50%{opacity:.25} 56%{opacity:.95} 72%{opacity:.55} 78%{opacity:.95} }
.clv-beam-pulse{ animation:clv-beam 5s ease-in-out infinite; }
@keyframes clv-beam{ 0%,100%{opacity:.75} 50%{opacity:1} }
.clv-drop{ animation:clv-fall linear infinite; }
@keyframes clv-fall{ from{transform:translateY(-90px)} to{transform:translateY(830px)} }
.clv-flake{ animation:clv-snowfall linear infinite; }
@keyframes clv-snowfall{ from{transform:translate(0,-90px)} 50%{transform:translate(14px,370px)} to{transform:translate(-6px,830px)} }
.clv-petal{ transform-box:fill-box; transform-origin:center; animation:clv-petalfall linear infinite; }
@keyframes clv-petalfall{ from{transform:translate(0,-80px) rotate(0deg)} to{transform:translate(30px,830px) rotate(520deg)} }
.clv-cloud{ animation:clv-drift 14s ease-in-out infinite alternate; }
@keyframes clv-drift{ from{transform:translateX(0)} to{transform:translateX(46px)} }

.clv-progress-card{ margin-top:8px; background:color-mix(in srgb, var(--panel) 78%, transparent);
  border:1px solid var(--panel-border); border-radius:16px; padding:18px 22px; backdrop-filter:blur(4px); }
.clv-progress-top{ display:flex; justify-content:space-between; align-items:baseline; gap:16px; flex-wrap:wrap; margin-bottom:12px; }
.clv-progress-title{ font-size:14px; color:var(--text-soft); }
.clv-progress-title b{ color:var(--text); }
.clv-xp{ font-size:18px; font-weight:800; font-variant-numeric:tabular-nums; letter-spacing:.02em; color:var(--text); }
.clv-bar{ height:11px; border-radius:999px; background:var(--bar-track); overflow:hidden; }
.clv-bar-fill{ height:100%; border-radius:999px; background:var(--bar-fill);
  box-shadow:0 0 18px var(--glow); transition:width .8s cubic-bezier(.2,.8,.2,1); }

.clv-levels{ display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-top:16px; }
.clv-lvl{ position:relative; background:var(--card); border:1px solid var(--card-border);
  border-radius:14px; padding:18px 16px 14px; transition:transform .18s ease,box-shadow .2s ease; }
.clv-lvl:hover{ transform:translateY(-3px); }
.clv-ic{ font-size:24px; margin-bottom:8px; }
.clv-lvl-h3{ font-size:15px; font-weight:700; margin-bottom:3px; color:var(--text); }
.clv-range{ margin-top:8px; font-size:12.5px; color:var(--text-soft); font-variant-numeric:tabular-nums; }
.clv-lvl.clv-active{ border-color:var(--active-border); box-shadow:0 10px 34px color-mix(in srgb, var(--active-border) 28%, transparent); }
.clv-lvl.clv-goal{ border-color:var(--goal-border); box-shadow:0 10px 34px var(--glow); }
.clv-tag{ position:absolute; top:-11px; left:14px; font-size:11px; font-weight:700; padding:4px 11px; border-radius:999px; white-space:nowrap; }
.clv-tag.clv-here{ background:var(--active-border); color:#fff; }
.clv-tag.clv-next{ background:var(--goal-border); color:#1c1503; }

@media (max-width:720px){
  .clv-embed .clv-wrap{ padding:16px 12px 22px; }
  .clv-controls,.clv-ctrl-group{ align-items:flex-start; }
  .clv-btn-row{ justify-content:flex-start; }
  .clv-controls-bar{ gap:12px; }
}
@media (prefers-reduced-motion:reduce){
  .clv-blink,.clv-flicker,.clv-beam-pulse,.clv-city-badge,.clv-drop,.clv-flake,.clv-petal,.clv-cloud{ animation:none; }
  .clv-drop,.clv-flake,.clv-petal{ transform:translateY(320px); }
  .clv-root *{ transition:none !important; }
}
`;
