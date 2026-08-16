import { useMemo, useState } from 'react';
import { useLandingTheme } from '../lib/landingTheme';
import { track } from '../lib/analytics';
import { rememberBizHint } from '../lib/bizHint';
import { BIZ_LABEL, type SkillBiz } from '../lib/skillCatalog';
import {
  quickCheck, verdictOf, verdictText, verdictIsPositive, headlineInsights, topicInsights,
  QUICK_TOPICS, saveQuickDraft, quickTrackPayload,
  type ProductInput, type TopicId, type Insight,
} from '../lib/productQuickCheck';
import { currentFunnelSession } from '../lib/landingFunnel';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

/* ProductQuickCheck — ประตูหน้าของระบบ: กรอกตัวเลขสินค้า → เห็นคำตอบทันที → ค่อยสมัคร
 *
 * ทำไมไม่เรียก AI ในขั้นนี้: อาฮ่าแรกต้องเร็ว ฟรี และ "แต่งไม่ได้"
 *   เลขคณิตจากเลขที่ผู้ใช้กรอกเองแม่นยำ 100% ไม่มี latency ไม่มีค่า token
 *   และไม่มีทางที่ระบบจะพ่นสถิติตลาดที่ไม่มีแหล่งออกไปหาคนแปลกหน้า (ดูเหตุผลเต็มใน lib/productQuickCheck.ts)
 *   AI เก็บไว้ใช้เฟส 2 กับคนที่กดอยากรู้ลึกแล้ว = คนที่สนใจจริง คุ้ม token กว่า
 *
 * ตรรกะทั้งหมดอยู่ใน lib/productQuickCheck.ts (pure, tested) — ไฟล์นี้เป็นแค่หน้าจอ */

const BIZ_OPTIONS: SkillBiz[] = ['food', 'retail', 'service', 'online', 'manufacture', 'property'];

export default function ProductQuickCheck({ onGetStarted }: { onGetStarted: () => void }) {
  const light = useLandingTheme() === 'minimal';
  const C = light
    ? { bg: '#ffffff', panel: '#f8fafc', ink: '#0f172a', sub: '#475569', border: '#e2e8f0', cyan: '#0891b2', amber: '#f59e0b', field: '#ffffff', good: '#15803d', bad: '#dc2626' }
    : { bg: '#020617', panel: '#0f172a', ink: '#ffffff', sub: '#94a3b8', border: '#1e293b', cyan: '#22d3ee', amber: '#fbbf24', field: '#0b1324', good: '#4ade80', bad: '#f87171' };

  const [biz, setBiz] = useState<SkillBiz>('food');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [units, setUnits] = useState('');
  const [fixed, setFixed] = useState('');
  const [shown, setShown] = useState(false);
  const [topics, setTopics] = useState<TopicId[]>([]);

  /** ส่งขึ้นแผงแอดมิน (นิรนาม · ไม่มีชื่อสินค้า) — เงียบเสมอ ห้ามทำหน้าเว็บพัง */
  function report(nextTopics: readonly TopicId[], cta: boolean) {
    if (!isSupabaseEnabled || !supabase) return;   // local/preview → ข้าม
    try {
      const payload = quickTrackPayload(currentFunnelSession(), input, nextTopics, cta);
      supabase.rpc('track_quickcheck', payload).then(() => {}, () => {});
    } catch { /* noop */ }
  }

  const num = (s: string) => { const n = Number(s.replace(/,/g, '')); return Number.isFinite(n) ? n : 0; };
  const input: ProductInput = useMemo(() => ({
    biz, name: name.trim() || undefined,
    price: num(price), cost: num(cost),
    unitsPerMonth: units.trim() ? num(units) : undefined,
    fixedCostPerMonth: fixed.trim() ? num(fixed) : undefined,
  }), [biz, name, price, cost, units, fixed]);

  const result = useMemo(() => quickCheck(input), [input]);
  const verdict = verdictOf(result);
  const canSubmit = num(price) > 0 && cost.trim() !== '';

  function show() {
    if (!canSubmit) return;
    setShown(true);
    if (name.trim()) rememberBizHint(name.trim());   // ต่อยอดกลไกเดิม: พาชื่อธุรกิจเข้าแอป
    // เก็บเฉพาะ field ที่เป็นตัวเลือก/ตัวเลข — ชื่อสินค้าอยู่ใน localStorage ของเครื่องเขาเท่านั้น
    track('quickcheck_submitted', { biz, verdict: verdictOf(quickCheck(input)) });
    report(topics, false);
  }

  function toggleTopic(id: TopicId) {
    setTopics((prev) => {
      const next = prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id];
      if (!prev.includes(id)) {
        track('quickcheck_topic_opened', { topic: id, biz }); // ← ข้อมูลว่าคนกังวลเรื่องอะไร
        report(next, false);
      }
      return next;
    });
  }

  /** เก็บผลไว้แล้วไปสมัคร — ข้อมูลที่กรอกจะไปโผล่ในแอปเอง ไม่ต้องกรอกซ้ำ */
  function saveAndSignup() {
    saveQuickDraft({ input, topics, at: new Date().toISOString().slice(0, 10) });
    track('quickcheck_signup_click', { biz, topics: topics.join(',') || 'none' });
    report(topics, true);
    onGetStarted();
  }

  const field: React.CSSProperties = {
    width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`,
    background: C.field, color: C.ink, fontFamily: 'inherit', fontSize: 15, boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = { fontSize: 12.5, color: C.sub, fontWeight: 700, marginBottom: 5, display: 'block' };

  const InsightRow = ({ i }: { i: Insight }) => {
    if (i.kind === 'calc') {
      const col = i.tone === 'bad' ? C.bad : i.tone === 'good' ? C.good : C.ink;
      return (
        <div style={{ padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: col, fontSize: 14.5, fontWeight: 700, lineHeight: 1.6 }}>{i.text}</div>
          {/* ทุกตัวเลขต้องบอกที่มาได้ — ผู้ใช้ตรวจย้อนเองได้เสมอ */}
          <div style={{ color: C.sub, fontSize: 11.5, marginTop: 2 }}>คำนวณจาก: {i.from}</div>
        </div>
      );
    }
    if (i.kind === 'question') {
      return (
        <div style={{ padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.amber, fontSize: 14, fontWeight: 700, lineHeight: 1.6 }}>❓ {i.text}</div>
          <div style={{ color: C.sub, fontSize: 11.5, marginTop: 2, lineHeight: 1.6 }}>{i.why}</div>
        </div>
      );
    }
    return (
      <div style={{ padding: '9px 0', borderBottom: `1px solid ${C.border}`, color: C.ink, fontSize: 14, lineHeight: 1.6 }}>
        ✅ {i.text}
      </div>
    );
  };

  return (
    <section style={{ padding: '64px 24px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 720, margin: '0 auto', border: `1px solid ${C.border}`, borderRadius: 18, background: C.panel, padding: '28px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 999, border: `1px solid ${C.cyan}`, color: C.cyan, fontSize: 12.5, fontWeight: 700, marginBottom: 12 }}>
            ⚡ ตอบทันที · ไม่ต้องสมัคร · ไม่ต้องรอ AI
          </div>
          <h2 style={{ fontSize: 'clamp(21px, 3vw, 27px)', fontWeight: 800, color: C.ink, margin: '0 0 6px' }}>
            สินค้าของคุณ กำไรจริงเท่าไหร่?
          </h2>
          <p style={{ color: C.sub, fontSize: 14, margin: 0, lineHeight: 1.7 }}>
            กรอก 2 ช่องก็เห็นคำตอบ — คำนวณจากตัวเลขของคุณเอง ไม่ใช่ตัวเลขที่เราเดาให้
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={lbl}>ธุรกิจแบบไหน</label>
            <select style={field} value={biz} onChange={(e) => setBiz(e.target.value as SkillBiz)}>
              {BIZ_OPTIONS.map((b) => <option key={b} value={b}>{BIZ_LABEL[b]}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>ขายอะไร (ไม่บังคับ)</label>
            <input style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ข้าวมันไก่" />
          </div>
          <div>
            <label style={lbl}>ราคาขาย/หน่วย (บาท) *</label>
            <input style={field} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="50" />
          </div>
          <div>
            <label style={lbl}>ต้นทุน/หน่วย (บาท) *</label>
            <input style={field} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="30" />
          </div>
          <div>
            <label style={lbl}>ขายได้/เดือน (หน่วย)</label>
            <input style={field} inputMode="decimal" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="1,000" />
          </div>
          <div>
            <label style={lbl}>ค่าใช้จ่ายคงที่/เดือน</label>
            <input style={field} inputMode="decimal" value={fixed} onChange={(e) => setFixed(e.target.value)} placeholder="30,000" />
          </div>
        </div>

        <button
          onClick={show}
          disabled={!canSubmit}
          style={{
            width: '100%', padding: '13px 26px', borderRadius: 12, border: 'none',
            background: canSubmit ? C.amber : C.border, color: canSubmit ? '#020617' : C.sub,
            fontFamily: 'inherit', fontWeight: 700, fontSize: 15.5, cursor: canSubmit ? 'pointer' : 'default',
          }}
        >
          {canSubmit ? 'ดูกำไรจริงของผม →' : 'กรอกราคาขายและต้นทุนก่อน'}
        </button>

        {shown && (
          <div style={{ marginTop: 22 }}>
            <div style={{
              border: `1px solid ${verdictIsPositive(verdict) ? C.good : verdict === 'unknown' ? C.border : C.bad}`,
              borderRadius: 12, padding: '12px 16px', marginBottom: 14,
              color: verdictIsPositive(verdict) ? C.good : verdict === 'unknown' ? C.sub : C.bad,
              fontSize: 16, fontWeight: 800, textAlign: 'center',
            }}>
              {verdictText(verdict)}
            </div>

            <div style={{ marginBottom: 20 }}>
              {headlineInsights(input, result).map((i, n) => <InsightRow key={n} i={i} />)}
            </div>

            {/* หัวข้อให้เลือกดูลึก — การกดคือข้อมูลว่าเจ้าของธุรกิจกังวลเรื่องอะไรที่สุด */}
            <div style={{ color: C.ink, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>อยากรู้ลึกเรื่องไหน?</div>
            <div style={{ color: C.sub, fontSize: 12.5, marginBottom: 10 }}>กดเลือกได้หลายข้อ — ดูฟรีทันที ไม่ต้องสมัคร</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 14 }}>
              {QUICK_TOPICS.map((t) => {
                const on = topics.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTopic(t.id)}
                    style={{
                      textAlign: 'left', padding: '11px 13px', borderRadius: 11, cursor: 'pointer',
                      border: `1px solid ${on ? C.cyan : C.border}`,
                      background: on ? (light ? '#ecfeff' : '#083344') : C.field,
                      color: C.ink, fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{t.icon} {t.label}</div>
                    <div style={{ fontSize: 11.5, color: C.sub, marginTop: 3, lineHeight: 1.5 }}>{t.answers}</div>
                  </button>
                );
              })}
            </div>

            {topics.map((id) => {
              const t = QUICK_TOPICS.find((x) => x.id === id)!;
              return (
                <div key={id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px', marginBottom: 10, background: C.field }}>
                  <div style={{ color: C.cyan, fontSize: 14.5, fontWeight: 800, marginBottom: 4 }}>{t.icon} {t.label}</div>
                  {topicInsights(id, input, result).map((i, n) => <InsightRow key={n} i={i} />)}
                </div>
              );
            })}

            <div style={{ marginTop: 18, padding: '16px', borderRadius: 12, border: `1px solid ${C.cyan}`, background: light ? '#ecfeff' : '#083344' }}>
              <div style={{ color: C.ink, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>เก็บผลนี้ไว้ในระบบ แล้วให้ทีม AI ทำงานต่อ</div>
              <div style={{ color: C.sub, fontSize: 12.5, lineHeight: 1.7, marginBottom: 12 }}>
                ตัวเลขที่คุณเพิ่งกรอกจะเข้าไปในระบบให้เอง — <b>ไม่ต้องกรอกซ้ำ</b> ·
                ฟรี 15 วัน · กรอกแค่ชื่อกับอีเมล · ไม่ต้องใช้บัตร
              </div>
              <button
                onClick={saveAndSignup}
                style={{ width: '100%', padding: '13px 26px', borderRadius: 12, border: 'none', background: C.amber, color: '#020617', fontFamily: 'inherit', fontWeight: 700, fontSize: 15.5, cursor: 'pointer' }}
              >
                เก็บผลนี้ไว้ + เปิดพื้นที่ทำงานของผม →
              </button>
            </div>

            <div style={{ color: C.sub, fontSize: 11, marginTop: 12, lineHeight: 1.7, textAlign: 'center' }}>
              ⚠️ ตัวเลขทั้งหมดคำนวณจากที่คุณกรอกเท่านั้น ไม่ใช่ข้อมูลตลาดหรือค่าเฉลี่ยอุตสาหกรรม ·
              สิ่งที่กรอกเก็บอยู่ในเครื่องของคุณ ยังไม่ถูกส่งไปไหนจนกว่าคุณจะสมัคร
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
