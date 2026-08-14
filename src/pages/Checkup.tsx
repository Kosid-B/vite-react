import '../index.css';
import { useEffect, useMemo, useState } from 'react';
import { track } from '../lib/analytics';
import { applySeo, siteOrigin } from '../lib/seo';
import {
  CHECKUP_QUESTIONS, CHECKUP_DISCLAIMER, assessCheckup, MATURITY_CHOICES,
  fullCheckupQuestions, assessFullCheckup,
  type CheckupChoice, type CheckupResult, type FullCheckupResult,
} from '../lib/checkup';
import { STANDARDS, STANDARD_ORDER, type StandardId } from '../lib/isoStandards';
import LegalLinks from '../components/LegalLinks';

/* ===== /checkup — ตรวจสุขภาพระบบบริหาร (สาธารณะ ไม่ต้องล็อกอิน) =====
 * ประตูหน้าบ้านของสายที่ปรึกษา: ตอบ 12 ข้อ ~3 นาที → เห็นคะแนน + 3 ช่องว่างใหญ่สุดฟรี
 * → อยากได้รายงานเต็ม กรอกอีเมล = ลีดงานที่ปรึกษา
 *
 * จงใจไม่ใช้ supabase ในหน้านี้ (Root โหลดแยก) — หน้าแรกต้องเบาและเปิดเร็วบนมือถือในแอป
 * อีเมลส่งผ่าน /api/checkup-lead (worker) ถ้าล้มเหลวยังโชว์ผลให้ครบ ไม่ขวางผู้ใช้
 */

const C = {
  bg: '#020617', card: '#0b1220', line: '#1e293b',
  text: '#e2e8f0', dim: '#94a3b8', cyan: '#22d3ee',
  green: '#4ade80', amber: '#fbbf24', red: '#f87171',
};

const BAND_COLOR: Record<CheckupResult['band'], string> = {
  critical: C.red, weak: C.amber, developing: C.cyan, ready: C.green,
};

function ScoreRing({ pct, color }: { pct: number; color: string }) {
  const r = 54, circ = 2 * Math.PI * r;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`คะแนนความพร้อม ${pct}%`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke={C.line} strokeWidth="12" />
      <circle
        cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${(circ * pct) / 100} ${circ}`} transform="rotate(-90 70 70)"
      />
      <text x="70" y="72" textAnchor="middle" fill={C.text} fontSize="34" fontWeight="700">{pct}</text>
      <text x="70" y="94" textAnchor="middle" fill={C.dim} fontSize="14">เต็ม 100</text>
    </svg>
  );
}

type Mode = 'pick' | 'quick' | 'full';

/** เก็บคำตอบโหมดเต็มไว้ในเครื่อง — 20-30 ข้อ ถ้าปิดแท็บแล้วหายหมดคือประสบการณ์ที่แย่ที่สุด
 *  เก็บเฉพาะคำตอบ (ตัวเลข) ไม่มี PII */
const LS_KEY = 'ceo_checkup_full';
function loadSaved(): { std: StandardId; answers: Record<string, CheckupChoice> } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return STANDARD_ORDER.includes(v?.std) ? { std: v.std, answers: v.answers ?? {} } : null;
  } catch { return null; }
}

export default function Checkup() {
  const [mode, setMode] = useState<Mode>('pick');
  const [std, setStd] = useState<StandardId>('iso9001');
  const [fullAnswers, setFullAnswers] = useState<Record<string, CheckupChoice>>({});
  const [fullDone, setFullDone] = useState(false);
  const [fullSec, setFullSec] = useState(0);
  const [step, setStep] = useState(0);                 // 0..11 = คำถาม · 12 = ผล
  const [answers, setAnswers] = useState<Record<string, CheckupChoice>>({});
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [sent, setSent] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');

  const done = step >= CHECKUP_QUESTIONS.length;
  const result = useMemo(() => (done ? assessCheckup(answers) : null), [done, answers]);
  const fullQs = useMemo(() => fullCheckupQuestions(std), [std]);
  const fullResult: FullCheckupResult | null = useMemo(
    () => (fullDone ? assessFullCheckup(std, fullAnswers) : null), [fullDone, std, fullAnswers]);
  const fullAnswered = fullQs.filter((q) => fullAnswers[q.id] !== undefined).length;

  // กู้คำตอบที่ทำค้างไว้ (โหมดเต็มมี 20-30 ข้อ ทำไม่จบในรอบเดียวเป็นเรื่องปกติ)
  useEffect(() => {
    const saved = loadSaved();
    if (saved && Object.keys(saved.answers).length > 0) {
      setStd(saved.std); setFullAnswers(saved.answers);
    }
  }, []);
  useEffect(() => {
    if (mode !== 'full') return;
    try { localStorage.setItem(LS_KEY, JSON.stringify({ std, answers: fullAnswers })); } catch { /* โควตาเต็ม — ไม่ขวางผู้ใช้ */ }
  }, [mode, std, fullAnswers]);

  useEffect(() => {
    const o = siteOrigin();
    applySeo({
      title: 'ตรวจสุขภาพระบบบริหารฟรี — พร้อมรับ ISO 9001 แค่ไหน | CEO AI Thailand',
      description:
        'ตอบ 12 คำถาม ใช้เวลา 3 นาที รู้ว่าระบบบริหารของคุณพร้อมรับการตรวจแค่ไหน ' +
        'พร้อมช่องว่างที่ควรแก้ก่อน — ฟรี ไม่ต้องสมัคร ออกแบบจากประสบการณ์ที่ปรึกษา 25 ปี',
      canonicalUrl: `${o}/checkup`,
      imageUrl: `${o}/og-image.png`,
      jsonLd: [{
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'ตรวจสุขภาพระบบบริหาร',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: `${o}/checkup`,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'THB' },
        provider: { '@type': 'Organization', name: 'CEO AI Thailand', url: o },
      }],
    });
    track('checkup_opened', {});
  }, []);

  function answer(v: CheckupChoice) {
    const q = CHECKUP_QUESTIONS[step];
    setAnswers((a) => ({ ...a, [q.id]: v }));
    const next = step + 1;
    setStep(next);
    if (next >= CHECKUP_QUESTIONS.length) {
      track('checkup_completed', { answered: Object.keys(answers).length + 1 });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@') || sent === 'sending') return;
    setSent('sending');
    const r0 = fullResult ?? result;
    track('checkup_lead', { pct: r0?.pct ?? 0, band: r0?.band ?? '', mode });
    try {
      const r = await fetch('/api/checkup-lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email, company,
          answers: fullResult ? fullAnswers : answers,
          pct: (fullResult ?? result)?.pct,
          band: (fullResult ?? result)?.band,
          standard: fullResult ? std : 'quick12',
        }),
      });
      setSent(r.ok ? 'ok' : 'error');
    } catch { setSent('error'); }
  }

  const progress = Math.round((Math.min(step, CHECKUP_QUESTIONS.length) / CHECKUP_QUESTIONS.length) * 100);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Kanit, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 80px' }}>

        <header style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: C.cyan, letterSpacing: 1, marginBottom: 8 }}>
            CEO AI THAILAND · โดยที่ปรึกษาระบบมาตรฐาน 25 ปี
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 700, lineHeight: 1.25, margin: 0 }}>
            ระบบบริหารของคุณ พร้อมรับการตรวจแค่ไหน?
          </h1>
          <p style={{ color: C.dim, marginTop: 12, lineHeight: 1.7 }}>
            {mode === 'full'
              ? `${STANDARDS[std].code} · ครบทุกข้อกำหนด ${fullQs.length} ข้อ — คำตอบถูกเก็บไว้ในเครื่อง ปิดแล้วกลับมาทำต่อได้`
              : 'ไม่ต้องสมัคร ไม่ต้องกรอกอะไรก่อนเริ่ม'}
          </p>
        </header>


        {mode === 'pick' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <button
              onClick={() => { setMode('quick'); track('checkup_mode', { mode: 'quick' }); }}
              style={{ textAlign: 'left', background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 22, cursor: 'pointer', color: C.text, fontFamily: 'inherit' }}
            >
              <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>⚡ ตรวจเร็ว 12 คำถาม</div>
              <div style={{ color: C.dim, fontSize: 15, lineHeight: 1.7 }}>
                ใช้เวลา 3 นาที · เห็นภาพรวมและ 3 จุดที่ควรแก้ก่อน
                <br />เหมาะกับ: อยากรู้คร่าว ๆ ว่าตอนนี้อยู่ตรงไหน
              </div>
            </button>

            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 22 }}>
              <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>📋 ตรวจเต็ม ครบทุกข้อกำหนด</div>
              <div style={{ color: C.dim, fontSize: 15, lineHeight: 1.7, marginBottom: 16 }}>
                20–40 นาที · ได้คะแนนรายหมวด + รายการที่ทำให้ตกตรวจ + ประมาณการเวลา
                <br />เหมาะกับ: เตรียมตรวจจริง หรืออยากได้ตัวเลขไปคุยกับผู้บริหาร
              </div>
              <div style={{ fontSize: 13, color: C.dim, marginBottom: 9 }}>เลือกมาตรฐาน</div>
              <div style={{ display: 'grid', gap: 9 }}>
                {STANDARD_ORDER.map((id) => (
                  <button
                    key={id}
                    onClick={() => { setStd(id); setMode('full'); setFullSec(0); track('checkup_mode', { mode: 'full', std: id }); }}
                    style={{ textAlign: 'left', padding: '14px 16px', borderRadius: 11, cursor: 'pointer', background: '#0f172a', border: `1px solid ${C.line}`, color: C.text, fontSize: 16, fontFamily: 'inherit' }}
                  >
                    {STANDARDS[id].icon} <b>{STANDARDS[id].code}</b>
                    <span style={{ color: C.dim, fontSize: 14 }}> — {STANDARDS[id].focus} · {STANDARDS[id].clauses.length} ข้อ</span>
                  </button>
                ))}
              </div>
            </div>

            <p style={{ color: C.dim, fontSize: 13, lineHeight: 1.7 }}>
              ทั้งสองแบบฟรี ไม่ต้องสมัคร · คำตอบยังไม่ถูกส่งที่ไหนจนกว่าคุณจะเลือกส่งเอง
            </p>
          </div>
        )}

        {mode === 'full' && !fullDone && (() => {
          const secs = [...new Set(fullQs.map((q) => q.section))];
          const cur = secs[Math.min(fullSec, secs.length - 1)];
          const items = fullQs.filter((q) => q.section === cur);
          const last = fullSec >= secs.length - 1;
          return (
            <>
              <div aria-hidden style={{ height: 6, background: C.line, borderRadius: 99, overflow: 'hidden', marginBottom: 18 }}>
                <div style={{ height: '100%', width: `${Math.round((fullAnswered / fullQs.length) * 100)}%`, background: C.cyan, transition: 'width .25s' }} />
              </div>
              <div style={{ fontSize: 13, color: C.dim, marginBottom: 14 }}>
                หมวด {fullSec + 1} จาก {secs.length} · ตอบแล้ว {fullAnswered}/{fullQs.length} ข้อ
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 16px' }}>
                ข้อ {cur} · {items[0]?.sectionTitle}
              </h2>

              <div style={{ display: 'grid', gap: 14 }}>
                {items.map((q) => (
                  <div key={q.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ color: C.cyan, fontWeight: 700 }}>{q.id}</span>
                      <span style={{ fontWeight: 600 }}>{q.title}</span>
                      {q.mandatory && <span style={{ fontSize: 12, color: C.red, border: `1px solid ${C.red}`, borderRadius: 99, padding: '1px 9px' }}>เอกสารบังคับ</span>}
                      {q.priority === 1 && <span style={{ fontSize: 12, color: C.amber }}>ผู้ตรวจเช็คแน่</span>}
                    </div>
                    <div style={{ color: C.dim, fontSize: 15, lineHeight: 1.65, marginBottom: 6 }}>{q.q}</div>
                    <div style={{ color: C.dim, fontSize: 13, marginBottom: q.annexA ? 10 : 12 }}>หลักฐานที่มองหา: {q.keyDoc}</div>
                    {q.annexA && (
                      <details style={{ marginBottom: 12 }}>
                        <summary style={{ cursor: 'pointer', color: C.cyan, fontSize: 13, listStyle: 'none' }}>
                          📖 แนวตีความตามภาคผนวก (Annex A)
                        </summary>
                        <div style={{ color: C.dim, fontSize: 13.5, lineHeight: 1.7, marginTop: 8, paddingLeft: 12, borderLeft: `2px solid ${C.line}` }}>
                          {q.annexA}
                          <div style={{ fontSize: 12, marginTop: 8, opacity: 0.75 }}>
                            Annex A เป็น <b>แนวทางการใช้</b> ไม่ใช่ข้อกำหนด — ไม่นำมาคิดคะแนนและออก NC โดยตรงไม่ได้
                          </div>
                        </div>
                      </details>
                    )}
                    <div style={{ display: 'grid', gap: 7 }}>
                      {MATURITY_CHOICES.map((c, i) => {
                        const on = fullAnswers[q.id] === i;
                        return (
                          <button
                            key={i}
                            onClick={() => setFullAnswers((a) => ({ ...a, [q.id]: i as CheckupChoice }))}
                            style={{
                              textAlign: 'left', padding: '11px 14px', borderRadius: 9, cursor: 'pointer',
                              background: on ? '#0e2a33' : '#0f172a',
                              border: `1px solid ${on ? C.cyan : C.line}`,
                              color: on ? C.text : C.dim, fontSize: 15, fontFamily: 'inherit',
                            }}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                {fullSec > 0 && (
                  <button
                    onClick={() => { setFullSec((v) => v - 1); window.scrollTo({ top: 0 }); }}
                    style={{ flex: '0 0 auto', padding: '13px 18px', borderRadius: 10, background: 'none', border: `1px solid ${C.line}`, color: C.dim, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15 }}
                  >← ย้อนกลับ</button>
                )}
                <button
                  onClick={() => {
                    if (last) { setFullDone(true); track('checkup_completed', { mode: 'full', std, answered: fullAnswered }); }
                    else setFullSec((v) => v + 1);
                    window.scrollTo({ top: 0 });
                  }}
                  style={{ flex: 1, padding: '14px 18px', borderRadius: 10, border: 'none', background: C.cyan, color: '#04121a', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 16 }}
                >{last ? 'ดูผลประเมิน' : 'หมวดถัดไป →'}</button>
              </div>
              <p style={{ color: C.dim, fontSize: 13, lineHeight: 1.7, marginTop: 18 }}>
                ข้อที่ยังไม่ตอบจะถูกนับเป็น "ยังไม่ได้ทำ" — ตอบตามจริงจะได้ผลที่ใช้วางแผนได้จริง
              </p>
            </>
          );
        })()}

        {mode === 'full' && fullDone && fullResult && (
          <>
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: C.dim, marginBottom: 4 }}>{fullResult.standardCode}</div>
              <ScoreRing pct={fullResult.pct} color={BAND_COLOR[fullResult.band]} />
              <div style={{ fontSize: 22, fontWeight: 700, color: BAND_COLOR[fullResult.band], marginTop: 8 }}>{fullResult.bandLabel}</div>
              <p style={{ color: C.dim, lineHeight: 1.75, marginTop: 12, textAlign: 'left' }}>{fullResult.summary}</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
                {fullResult.blockers.length > 0 && (
                  <span style={{ background: '#1a1210', border: '1px solid #7f1d1d', borderRadius: 99, padding: '7px 15px', fontSize: 14, color: C.red }}>
                    ข้อที่ทำให้ตกตรวจ <b>{fullResult.blockers.length}</b> ข้อ
                  </span>
                )}
                <span style={{ background: '#0f172a', border: `1px solid ${C.line}`, borderRadius: 99, padding: '7px 15px', fontSize: 14 }}>
                  ประเมิน <b style={{ color: C.text }}>{fullResult.effortDays[0]}–{fullResult.effortDays[1]}</b> วันทำงาน
                </span>
              </div>
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '30px 0 12px' }}>คะแนนรายหมวด</h2>
            <div style={{ display: 'grid', gap: 9 }}>
              {fullResult.sections.map((s2) => (
                <div key={s2.section} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 11, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 7 }}>
                    <span style={{ fontSize: 15 }}>ข้อ {s2.section} · {s2.title}</span>
                    <b style={{ color: s2.pct >= 80 ? C.green : s2.pct >= 50 ? C.amber : C.red }}>{s2.pct}%</b>
                  </div>
                  <div style={{ height: 5, background: C.line, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s2.pct}%`, background: s2.pct >= 80 ? C.green : s2.pct >= 50 ? C.amber : C.red }} />
                  </div>
                  {s2.gaps > 0 && <div style={{ fontSize: 13, color: C.dim, marginTop: 6 }}>ยังไม่เต็ม {s2.gaps} ข้อ</div>}
                </div>
              ))}
            </div>

            {fullResult.blockers.length > 0 && (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: '30px 0 6px' }}>ข้อที่ทำให้ตกตรวจ</h2>
                <p style={{ color: C.dim, fontSize: 14, lineHeight: 1.7, marginTop: 0 }}>
                  ข้อที่ผู้ตรวจเช็คแน่และตอนนี้ยังไม่พร้อม — ควรปิดให้ครบก่อนนัดตรวจ
                </p>
                <div style={{ display: 'grid', gap: 10 }}>
                  {fullResult.blockers.map((b) => (
                    <div key={b.id} style={{ background: C.card, border: '1px solid #7f1d1d', borderRadius: 12, padding: 16 }}>
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ color: C.red, fontWeight: 700 }}>{b.id}</span> <b>{b.title}</b>
                      </div>
                      <div style={{ color: C.dim, fontSize: 15, lineHeight: 1.65 }}>{b.q}</div>
                      <div style={{ color: C.dim, fontSize: 13, marginTop: 6 }}>หลักฐานที่ต้องมี: {b.keyDoc}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '30px 0 12px' }}>
              ลำดับที่ควรทำ ({Math.min(8, fullResult.gaps.length)} จาก {fullResult.gaps.length} จุด)
            </h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {fullResult.gaps.slice(0, 8).map((g, i) => (
                <div key={g.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ marginBottom: 5 }}>
                    <span style={{ color: C.cyan, fontWeight: 700 }}>{i + 1}.</span> <b>{g.id} {g.title}</b>
                    {g.mandatory && <span style={{ fontSize: 12, color: C.red, marginLeft: 8 }}>เอกสารบังคับ</span>}
                  </div>
                  <div style={{ color: C.dim, fontSize: 15, lineHeight: 1.65 }}>{g.q}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {mode === 'quick' && !done && (
          <>
            <div aria-hidden style={{ height: 6, background: C.line, borderRadius: 99, overflow: 'hidden', marginBottom: 22 }}>
              <div style={{ height: '100%', width: `${progress}%`, background: C.cyan, transition: 'width .25s' }} />
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: '24px 20px' }}>
              <div style={{ fontSize: 13, color: C.dim, marginBottom: 10 }}>
                ข้อ {step + 1} จาก {CHECKUP_QUESTIONS.length}
              </div>
              <h2 style={{ fontSize: 21, fontWeight: 600, lineHeight: 1.5, margin: '0 0 20px' }}>
                {CHECKUP_QUESTIONS[step].q}
              </h2>

              <div style={{ display: 'grid', gap: 10 }}>
                {CHECKUP_QUESTIONS[step].choices.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => answer(i as CheckupChoice)}
                    style={{
                      textAlign: 'left', padding: '15px 17px', borderRadius: 11, cursor: 'pointer',
                      background: '#0f172a', border: `1px solid ${C.line}`, color: C.text,
                      fontSize: 16, fontFamily: 'inherit', lineHeight: 1.5,
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                style={{ marginTop: 16, background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15 }}
              >
                ← ย้อนกลับ
              </button>
            )}

            <p style={{ color: C.dim, fontSize: 13, lineHeight: 1.7, marginTop: 26 }}>
              ตอบตามที่เป็นจริงจะได้ผลที่ใช้ได้จริง — ไม่มีคำตอบไหนผิด และเราไม่ได้เก็บคำตอบไว้จนกว่าคุณจะเลือกส่งเอง
            </p>
          </>
        )}

        {mode === 'quick' && done && result && (
          <>
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 24, textAlign: 'center' }}>
              <ScoreRing pct={result.pct} color={BAND_COLOR[result.band]} />
              <div style={{ fontSize: 22, fontWeight: 700, color: BAND_COLOR[result.band], marginTop: 8 }}>
                {result.bandLabel}
              </div>
              <p style={{ color: C.dim, lineHeight: 1.75, marginTop: 12, textAlign: 'left' }}>{result.summary}</p>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 18 }}>
                <span style={{ background: '#0f172a', border: `1px solid ${C.line}`, borderRadius: 99, padding: '7px 15px', fontSize: 14 }}>
                  ช่องว่างที่พบ <b style={{ color: C.text }}>{result.gaps.length}</b> จุด
                </span>
                {result.missingMandatory > 0 && (
                  <span style={{ background: '#1a1210', border: '1px solid #7f1d1d', borderRadius: 99, padding: '7px 15px', fontSize: 14, color: C.red }}>
                    เอกสารที่มาตรฐานบังคับ ยังขาด <b>{result.missingMandatory}</b> รายการ
                  </span>
                )}
                <span style={{ background: '#0f172a', border: `1px solid ${C.line}`, borderRadius: 99, padding: '7px 15px', fontSize: 14 }}>
                  ประเมิน <b style={{ color: C.text }}>{result.effortDays[0]}–{result.effortDays[1]}</b> วันทำงาน
                </span>
              </div>
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '30px 0 14px' }}>
              3 จุดที่ควรแก้ก่อน
            </h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {result.topGaps.map((g, i) => (
                <div key={g.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, padding: 18 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 8 }}>
                    <span style={{ color: C.cyan, fontWeight: 700, fontSize: 18 }}>{i + 1}</span>
                    <span style={{ fontWeight: 600, lineHeight: 1.5 }}>{g.q}</span>
                  </div>
                  {g.mandatory && (
                    <div style={{ fontSize: 13, color: C.red, marginBottom: 8 }}>
                      เอกสารที่มาตรฐานกำหนดให้ต้องมี
                    </div>
                  )}
                  <div style={{ color: C.dim, fontSize: 15, lineHeight: 1.7 }}>
                    <b style={{ color: C.text }}>สิ่งที่ควรทำ:</b> {g.fix}
                  </div>
                </div>
              ))}
            </div>

            {result.gaps.length > 3 && (
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 22, marginTop: 26 }}>
                <h2 style={{ fontSize: 19, fontWeight: 700, margin: '0 0 8px' }}>
                  ยังมีอีก {result.gaps.length - 3} จุดที่พบ
                </h2>
                <p style={{ color: C.dim, lineHeight: 1.7, fontSize: 15, marginTop: 0 }}>
                  รายงานเต็มมีทุกจุดที่พบ เรียงลำดับว่าควรทำอะไรก่อน–หลัง พร้อมเหตุผล
                  และประมาณการเวลาของแต่ละจุด — ส่งให้ทางอีเมล ไม่มีค่าใช้จ่าย
                </p>

                {sent === 'ok' ? (
                  <div style={{ color: C.green, marginTop: 14, lineHeight: 1.7 }}>
                    ส่งแล้วครับ ตรวจในกล่องจดหมายได้เลย — ถ้าไม่เจอลองดูในเมลขยะ
                  </div>
                ) : (
                  <form onSubmit={submitLead} style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                    <input
                      type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                      placeholder="ชื่อบริษัท (ไม่บังคับ)"
                      style={{ padding: '13px 15px', borderRadius: 10, background: '#0f172a', border: `1px solid ${C.line}`, color: C.text, fontSize: 16, fontFamily: 'inherit' }}
                    />
                    <input
                      type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="อีเมลสำหรับรับรายงาน"
                      style={{ padding: '13px 15px', borderRadius: 10, background: '#0f172a', border: `1px solid ${C.line}`, color: C.text, fontSize: 16, fontFamily: 'inherit' }}
                    />
                    <button
                      type="submit" disabled={sent === 'sending'}
                      style={{ padding: '14px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', background: C.cyan, color: '#04121a', fontWeight: 700, fontSize: 16, fontFamily: 'inherit' }}
                    >
                      {sent === 'sending' ? 'กำลังส่ง…' : 'ส่งรายงานเต็มให้ผม'}
                    </button>
                    {sent === 'error' && (
                      <div style={{ color: C.amber, fontSize: 14, lineHeight: 1.6 }}>
                        ส่งไม่สำเร็จ ลองใหม่อีกครั้ง หรือติดต่อ support@b-tctraining.com ได้โดยตรง
                      </div>
                    )}
                    <div style={{ color: C.dim, fontSize: 13, lineHeight: 1.6 }}>
                      ใช้อีเมลเพื่อส่งรายงานเท่านั้น ไม่ส่งต่อให้บุคคลที่สาม และยกเลิกรับได้ทุกเมื่อ
                    </div>
                  </form>
                )}
              </div>
            )}

            <div style={{ background: '#0f172a', border: `1px solid ${C.line}`, borderRadius: 13, padding: 18, marginTop: 26 }}>
              <p style={{ color: C.dim, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{CHECKUP_DISCLAIMER}</p>
            </div>

            <div style={{ marginTop: 26, textAlign: 'center' }}>
              <a
                href="/blog/why-ai-doesnt-recommend-you"
                onClick={() => track('checkup_cta', { to: 'blog' })}
                style={{ color: C.cyan, fontSize: 15 }}
              >
                อ่านต่อ: ทำไม AI ไม่แนะนำร้านคุณ →
              </a>
            </div>

            <button
              onClick={() => { setMode('pick'); setStep(0); setAnswers({}); setSent('idle'); window.scrollTo({ top: 0 }); }}
              style={{ marginTop: 20, background: 'none', border: `1px solid ${C.line}`, color: C.dim, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, padding: '11px 18px', borderRadius: 10, width: '100%' }}
            >
              ทำใหม่อีกครั้ง
            </button>
          </>
        )}

        {mode === 'full' && fullDone && fullResult && (
          <>
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 22, marginTop: 26 }}>
              <h2 style={{ fontSize: 19, fontWeight: 700, margin: '0 0 8px' }}>รับรายงานเต็มทางอีเมล</h2>
              <p style={{ color: C.dim, lineHeight: 1.7, fontSize: 15, marginTop: 0 }}>
                รายงานมีครบทุกข้อที่ประเมิน พร้อมเอกสารที่ต้องเตรียมของแต่ละข้อ
                และลำดับที่ควรทำก่อน–หลัง — ไม่มีค่าใช้จ่าย
              </p>
              {sent === 'ok' ? (
                <div style={{ color: C.green, marginTop: 12, lineHeight: 1.7 }}>
                  ได้รับแล้วครับ เราจะส่งรายงานให้ทางอีเมล — ถ้าไม่เจอลองดูในเมลขยะ
                </div>
              ) : (
                <form onSubmit={submitLead} style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                  <input
                    type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                    placeholder="ชื่อบริษัท (ไม่บังคับ)"
                    style={{ padding: '13px 15px', borderRadius: 10, background: '#0f172a', border: `1px solid ${C.line}`, color: C.text, fontSize: 16, fontFamily: 'inherit' }}
                  />
                  <input
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="อีเมลสำหรับรับรายงาน"
                    style={{ padding: '13px 15px', borderRadius: 10, background: '#0f172a', border: `1px solid ${C.line}`, color: C.text, fontSize: 16, fontFamily: 'inherit' }}
                  />
                  <button
                    type="submit" disabled={sent === 'sending'}
                    style={{ padding: '14px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', background: C.cyan, color: '#04121a', fontWeight: 700, fontSize: 16, fontFamily: 'inherit' }}
                  >{sent === 'sending' ? 'กำลังส่ง…' : 'ส่งรายงานเต็มให้ผม'}</button>
                  {sent === 'error' && (
                    <div style={{ color: C.amber, fontSize: 14, lineHeight: 1.6 }}>
                      ส่งไม่สำเร็จ ลองใหม่อีกครั้ง หรือติดต่อ support@b-tctraining.com ได้โดยตรง
                    </div>
                  )}
                  <div style={{ color: C.dim, fontSize: 13, lineHeight: 1.6 }}>
                    ใช้อีเมลเพื่อส่งรายงานเท่านั้น ไม่ส่งต่อให้บุคคลที่สาม และยกเลิกรับได้ทุกเมื่อ
                  </div>
                </form>
              )}
            </div>

            <div style={{ background: '#0f172a', border: `1px solid ${C.line}`, borderRadius: 13, padding: 18, marginTop: 22 }}>
              <p style={{ color: C.dim, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{CHECKUP_DISCLAIMER}</p>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => { setFullDone(false); window.scrollTo({ top: 0 }); }}
                style={{ flex: 1, background: 'none', border: `1px solid ${C.line}`, color: C.dim, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, padding: '12px 18px', borderRadius: 10 }}
              >กลับไปแก้คำตอบ</button>
              <button
                onClick={() => {
                  setMode('pick'); setFullDone(false); setFullAnswers({}); setFullSec(0); setSent('idle');
                  try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
                  window.scrollTo({ top: 0 });
                }}
                style={{ flex: 1, background: 'none', border: `1px solid ${C.line}`, color: C.dim, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, padding: '12px 18px', borderRadius: 10 }}
              >เริ่มใหม่</button>
            </div>
          </>
        )}

        <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${C.line}` }}>
          <LegalLinks />
        </div>
      </div>
    </div>
  );
}
