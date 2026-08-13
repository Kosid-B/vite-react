import '../index.css';
import { useEffect, useMemo, useState } from 'react';
import { track } from '../lib/analytics';
import { applySeo, siteOrigin } from '../lib/seo';
import {
  CHECKUP_QUESTIONS, CHECKUP_DISCLAIMER, assessCheckup,
  type CheckupChoice, type CheckupResult,
} from '../lib/checkup';
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

export default function Checkup() {
  const [step, setStep] = useState(0);                 // 0..11 = คำถาม · 12 = ผล
  const [answers, setAnswers] = useState<Record<string, CheckupChoice>>({});
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [sent, setSent] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');

  const done = step >= CHECKUP_QUESTIONS.length;
  const result = useMemo(() => (done ? assessCheckup(answers) : null), [done, answers]);

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
    track('checkup_lead', { pct: result?.pct ?? 0, band: result?.band ?? '' });
    try {
      const r = await fetch('/api/checkup-lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, company, answers, pct: result?.pct, band: result?.band }),
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
            ตอบ 12 คำถาม ใช้เวลาประมาณ 3 นาที · ไม่ต้องสมัคร ไม่ต้องกรอกอะไรก่อนเริ่ม
          </p>
        </header>

        {!done && (
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

        {done && result && (
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
              onClick={() => { setStep(0); setAnswers({}); setSent('idle'); window.scrollTo({ top: 0 }); }}
              style={{ marginTop: 20, background: 'none', border: `1px solid ${C.line}`, color: C.dim, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, padding: '11px 18px', borderRadius: 10, width: '100%' }}
            >
              ทำใหม่อีกครั้ง
            </button>
          </>
        )}

        <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${C.line}` }}>
          <LegalLinks />
        </div>
      </div>
    </div>
  );
}
