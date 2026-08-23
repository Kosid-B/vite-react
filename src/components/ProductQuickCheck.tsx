import { useMemo, useState } from 'react';
import { useLandingTheme } from '../lib/landingTheme';
import { track } from '../lib/analytics';
import { nextProblemsFor, focusFor, nextProblemsHeading } from '../lib/nextProblems';
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

/** ตัวเลขตัวอย่างตอนเปิดหน้า — ชุดเดียวกับ placeholder เดิม (ร้านอาหารทั่วไป)
 *  ต้องเป็นเคสที่ "ดูดีแต่มีปัญหา" ถึงจะสอนอะไรได้: กำไรต่อชิ้น 40% แต่ยังมีค่าใช้จ่ายคงที่รออยู่ */
const DEMO = { biz: 'food' as SkillBiz, price: '50', cost: '30', units: '1,000', fixed: '30,000' };

export default function ProductQuickCheck({ onGetStarted }: { onGetStarted: () => void }) {
  const light = useLandingTheme() === 'minimal';
  const C = light
    ? { bg: '#ffffff', panel: '#f8fafc', ink: '#0f172a', sub: '#475569', border: '#e2e8f0', cyan: '#0891b2', amber: '#f59e0b', field: '#ffffff', good: '#15803d', bad: '#dc2626' }
    : { bg: '#020617', panel: '#0f172a', ink: '#ffffff', sub: '#94a3b8', border: '#1e293b', cyan: '#22d3ee', amber: '#fbbf24', field: '#0b1324', good: '#4ade80', bad: '#f87171' };

  /* ── ให้ก่อน ขอทีหลัง (PLG) ──────────────────────────────────────────────
   * เดิม: เปิดมาเจอฟอร์มเปล่า 6 ช่อง + ปุ่มสีเทากดไม่ได้ "กรอกราคาขายและต้นทุนก่อน"
   *   = ด่านแรกของเว็บคือ "คุณต้องทำงานก่อนถึงจะได้อะไร" — ตรงข้ามกับ PLG
   *   ผลจริง 11–18 ส.ค. 2569: ผู้เข้าชม 70 คน · กรอกสำเร็จ **0 คน**
   * ตอนนี้: เปิดมาเห็นคำตอบที่คำนวณเสร็จแล้วทันที แล้วค่อยชวนเปลี่ยนเป็นตัวเลขของเขา
   *   (แพตเทิร์นเดียวกับ demoRegister() ในหน้า 'process' — "อาฮ่า 10 วินาที")
   * ⚠️ ตัวเลขตัวอย่างห้ามขึ้น DB — ไม่งั้น quickcheck_submissions จะเต็มไปด้วยเลขที่ไม่มีใครกรอก
   *   (บทเรียนข้อ 11: ข้อมูลที่ดูเหมือนจริงแต่ไม่จริง อันตรายกว่าไม่มีข้อมูล) */
  const [biz, setBiz] = useState<SkillBiz>(DEMO.biz);
  const [name, setName] = useState('');
  const [price, setPrice] = useState(DEMO.price);
  const [cost, setCost] = useState(DEMO.cost);
  const [units, setUnits] = useState(DEMO.units);
  const [fixed, setFixed] = useState(DEMO.fixed);
  const [shown, setShown] = useState(true);   // เห็นผลตั้งแต่วินาทีแรก
  const [touched, setTouched] = useState(false); // false = ยังเป็นตัวอย่าง ห้ามนับเป็นข้อมูลจริง
  const [topics, setTopics] = useState<TopicId[]>([]);

  /** ผู้ใช้แตะช่องไหนก็ตาม = เลิกเป็นตัวอย่าง เริ่มนับเป็นข้อมูลจริง */
  function touch<T>(set: (v: T) => void) {
    return (v: T) => { setTouched(true); set(v); };
  }

  /** ส่งขึ้นแผงแอดมิน (นิรนาม · ไม่มีชื่อสินค้า) — เงียบเสมอ ห้ามทำหน้าเว็บพัง */
  function report(nextTopics: readonly TopicId[], cta: boolean) {
    if (!isSupabaseEnabled || !supabase) return;   // local/preview → ข้าม
    if (!touched) return;   // ยังเป็นตัวเลขตัวอย่างของเรา ไม่ใช่ของผู้ใช้ → ไม่นับ
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
    /* 🔴 className เพื่อบีบ padding บนมือถือ (20 ส.ค. 2569)
       วัดจริง iPhone 390×844: ด้วย padding 64px พาดหัว "สินค้าของคุณ กำไรจริงเท่าไหร่?"
       ตกอยู่ที่ 854px = **เกินขอบจอไป 10px** ⇒ คนเห็นแค่ที่ว่าง ไม่รู้ว่ามีเครื่องมืออยู่ */
    <section className="pqc-section" style={{ padding: '64px 24px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
      {/* 🔴 ขนาด/ระยะห่างย้ายออกจาก inline style มาอยู่ใน class (23 ส.ค. 2569)
          เหตุผล: inline style ชนะ CSS เสมอ ⇒ เขียน @media ในไฟล์ CSS แล้วไม่ขยับ (GOTCHA #3)
          สีที่ยังอยู่ inline คือค่าที่มาจากโทเคนธีม (C.*) ซึ่งเปลี่ยนตามธีมจริง */}
      <div className="pqc-card" style={{ border: `1px solid ${C.border}`, background: C.panel }}>
        <div className="pqc-intro">
          <div className="pqc-badge" style={{ border: `1px solid ${C.cyan}`, color: C.cyan }}>
            ⚡ ตอบทันที · ไม่ต้องสมัคร · ไม่ต้องรอ AI
          </div>
          <h2 className="pqc-h2" style={{ color: C.ink }}>
            สินค้าของคุณ กำไรจริงเท่าไหร่?
          </h2>
          <p className="pqc-lead" style={{ color: C.sub }}>
            {touched
              ? 'คำนวณจากตัวเลขของคุณเอง ไม่ใช่ตัวเลขที่เราเดาให้'
              : 'ด้านล่างคือตัวอย่างที่คำนวณเสร็จแล้ว — แก้ตัวเลขให้เป็นของคุณได้เลย ไม่ต้องสมัคร'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={lbl}>ธุรกิจแบบไหน</label>
            <select style={field} value={biz} onChange={(e) => touch(setBiz)(e.target.value as SkillBiz)}>
              {BIZ_OPTIONS.map((b) => <option key={b} value={b}>{BIZ_LABEL[b]}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>ขายอะไร (ไม่บังคับ)</label>
            <input style={field} value={name} onChange={(e) => touch(setName)(e.target.value)} placeholder="เช่น ข้าวมันไก่" />
          </div>
          <div>
            <label style={lbl}>ราคาขาย/หน่วย (บาท) *</label>
            <input style={field} inputMode="decimal" value={price} onChange={(e) => touch(setPrice)(e.target.value)} placeholder="50" />
          </div>
          <div>
            <label style={lbl}>ต้นทุน/หน่วย (บาท) *</label>
            <input style={field} inputMode="decimal" value={cost} onChange={(e) => touch(setCost)(e.target.value)} placeholder="30" />
          </div>
          <div>
            <label style={lbl}>ขายได้/เดือน (หน่วย)</label>
            <input style={field} inputMode="decimal" value={units} onChange={(e) => touch(setUnits)(e.target.value)} placeholder="1,000" />
          </div>
          <div>
            <label style={lbl}>ค่าใช้จ่ายคงที่/เดือน</label>
            <input style={field} inputMode="decimal" value={fixed} onChange={(e) => touch(setFixed)(e.target.value)} placeholder="30,000" />
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
          {!canSubmit ? 'ใส่ราคาขายและต้นทุนของคุณ' : touched ? 'ดูกำไรจริงของผม →' : 'คำนวณใหม่ด้วยตัวเลขของผม →'}
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

            {/* ⭐ "เรื่องต้นทุนจบแล้ว — ยังเหลืออีก N เรื่อง"
                วางตรงนี้เพราะเป็นจุดเดียวที่มีหลักฐานว่าคนอยู่จริง (ดูเหตุผลเต็มใน lib/nextProblems.ts)
                หน้า Landing มี 19 บล็อก แต่ 15 บล็อกท้ายหน้ามีคนเห็น 0 คน — ใส่ตรงนั้นเท่ากับไม่ได้ใส่ */}
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
              <div style={{ color: C.ink, fontSize: 15.5, fontWeight: 800, marginBottom: 4 }}>
                {nextProblemsHeading()}
              </div>
              {(() => {
                const f = focusFor(result);
                return f ? (
                  <div style={{ color: C.ink, fontSize: 12.5, lineHeight: 1.7, marginBottom: 10, padding: '9px 12px', borderRadius: 9, border: `1px solid ${C.cyan}`, background: light ? '#ecfeff' : '#083344' }}>
                    👉 <b>จากตัวเลขของคุณ เรื่องที่ควรทำต่อคือข้อแรก</b> — {f.why}
                  </div>
                ) : (
                  <div style={{ color: C.sub, fontSize: 12.5, lineHeight: 1.7, marginBottom: 10 }}>
                    ใส่ยอดขายต่อเดือนกับค่าใช้จ่ายคงที่เพิ่ม แล้วระบบจะบอกได้ว่าควรทำเรื่องไหนต่อก่อน
                  </div>
                );
              })()}
              <div style={{ display: 'grid', gap: 8 }}>
                {nextProblemsFor(result).map((p, idx) => (
                  <a
                    key={p.id}
                    href={`${p.shortLink}?utm_source=site&utm_medium=quickcheck&utm_campaign=${p.id}`}
                    onClick={() => track('nextproblem_click', { id: p.id, rank: idx + 1 })}
                    style={{
                      display: 'block', textDecoration: 'none',
                      border: `1px solid ${idx === 0 && focusFor(result) ? C.cyan : C.border}`,
                      borderRadius: 11, padding: '11px 13px', background: C.field,
                    }}
                  >
                    <div style={{ color: C.ink, fontSize: 14, fontWeight: 700, lineHeight: 1.5 }}>{p.icon} {p.ask}</div>
                    <div style={{ color: C.sub, fontSize: 12, marginTop: 4, lineHeight: 1.55 }}>
                      {p.gives} <span style={{ color: C.cyan, fontWeight: 700 }}>— อ่านฟรี ไม่ต้องสมัคร →</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>

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
