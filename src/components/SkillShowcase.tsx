import { useMemo, useState } from 'react';
import {
  SKILL_STAGES, BIZ_LABEL, PLAN_LABEL, catalogSummary, skillsForStage, skillsForBiz,
  priceOf, consultantEquivOf, bundleQuote, creditFor,
  TOTAL_SKILL_COUNT, FREE_SKILL_COUNT, SIGNATURE_COUNT,
  type SkillStage, type SkillBiz,
} from '../lib/skillCatalog';
import { track } from '../lib/analytics';

/* SkillShowcase — โฆษณาบน Landing ว่าระบบมี "ทักษะที่ปรึกษา" อะไรบ้าง
 * ตอบ 3 คำถามที่คนเข้ามาถาม: มีอะไรบ้าง · เหมาะกับธุรกิจฉันไหม · ต้องจ่ายเท่าไร
 * ซื่อสัตย์: บอกตรง ๆ ว่าตัวไหนฟรี ตัวไหนต้องแพ็กไหน ไม่ซ่อนราคาไว้ท้ายสุด */

const PLAN_COLOR: Record<string, string> = {
  free: '#4ade80', starter: '#38bdf8', growth: '#c084fc', scale: '#fbbf24',
};
const SIGNATURE_COLOR = '#fbbf24';
const baht = (n: number) => '฿' + n.toLocaleString('th-TH');

export default function SkillShowcase({ onGetStarted }: { onGetStarted: () => void }) {
  const [stage, setStage] = useState<SkillStage>('validate');
  const [biz, setBiz] = useState<SkillBiz>('all');

  const summary = useMemo(() => catalogSummary(), []);
  const items = useMemo(() => {
    const byBiz = new Set(skillsForBiz(biz).map((s) => s.id));
    return skillsForStage(stage).filter((s) => byBiz.has(s.id));
  }, [stage, biz]);

  const bizOptions: SkillBiz[] = ['all', 'food', 'service', 'online', 'manufacture', 'property'];
  const quote = useMemo(() => bundleQuote(stage), [stage]);

  return (
    <section className="skill-showcase" aria-labelledby="skill-showcase-title">
      <div className="ss-head">
        <span className="ss-eyebrow">ทักษะที่ปรึกษาในระบบ</span>
        <h2 id="skill-showcase-title">
          ที่ปรึกษาธุรกิจ <strong>{TOTAL_SKILL_COUNT} ทักษะ</strong> พร้อมใช้ทันที
        </h2>
        <p className="ss-lead">
          ตั้งแต่ตรวจสอบไอเดียจนถึงวางมาตรฐาน — เลือกตามขั้นที่ธุรกิจคุณอยู่ตอนนี้
          · <strong>{FREE_SKILL_COUNT} ทักษะใช้ได้ฟรี</strong> ไม่ต้องใส่บัตร
          <br />
          ในนั้นมี <strong className="ss-sig-count">{SIGNATURE_COUNT} ทักษะเฉพาะ</strong> ที่กลั่นจากประสบการณ์ที่ปรึกษาธุรกิจและวางระบบ ISO กว่า 25 ปี — ซื้อขาด เป็นเจ้าของถาวร
        </p>
      </div>

      {/* แถบขั้นตอน — เป็นลำดับจริงที่ธุรกิจเดิน จึงใส่เลขกำกับได้ */}
      <ol className="ss-stages">
        {summary.map(({ stage: st, total, free, signature }) => (
          <li key={st.id}>
            <button
              type="button"
              className={'ss-stage' + (stage === st.id ? ' active' : '')}
              aria-pressed={stage === st.id}
              onClick={() => { setStage(st.id); track('skill_stage_view', { stage: st.id }); }}
            >
              <span className="ss-stage-n">{st.order}</span>
              <span className="ss-stage-icon" aria-hidden="true">{st.icon}</span>
              <span className="ss-stage-label">{st.label}</span>
              <span className="ss-stage-meta">{total} ทักษะ · ฟรี {free}{signature > 0 && ` · เฉพาะ ${signature}`}</span>
            </button>
          </li>
        ))}
      </ol>

      <p className="ss-question">“{SKILL_STAGES.find((s) => s.id === stage)?.question}”</p>

      <div className="ss-filter" role="group" aria-label="กรองตามประเภทธุรกิจ">
        {bizOptions.map((b) => (
          <button
            key={b}
            type="button"
            className={'ss-chip' + (biz === b ? ' active' : '')}
            aria-pressed={biz === b}
            onClick={() => { setBiz(b); track('skill_biz_filter', { biz: b }); }}
          >
            {BIZ_LABEL[b]}
          </button>
        ))}
      </div>

      <ul className="ss-grid">
        {items.map((s) => (
          <li key={s.id} className="ss-card">
            <div className="ss-card-top">
              {s.origin === 'signature' ? (
                <span className="ss-tier" style={{ color: SIGNATURE_COLOR, borderColor: SIGNATURE_COLOR }}>
                  ★ เฉพาะที่นี่
                </span>
              ) : (
                <span className="ss-tier" style={{ color: PLAN_COLOR[s.minPlan], borderColor: PLAN_COLOR[s.minPlan] }}>
                  {s.minPlan === 'free' ? 'ฟรี' : PLAN_LABEL[s.minPlan]}
                </span>
              )}
              {s.biz !== 'all' && <span className="ss-biz">{BIZ_LABEL[s.biz]}</span>}
            </div>
            <h3>{s.id.replace(/-/g, ' ')}</h3>
            <p>{s.desc}</p>
            {creditFor(s) && <p className="ss-credit">{creditFor(s)}</p>}
            {s.origin === 'signature' && (
              <div className="ss-price">
                <strong>{baht(priceOf(s))}</strong>
                <span>ซื้อครั้งเดียว · จ้างที่ปรึกษาทำให้ราว {baht(consultantEquivOf(s))}</span>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="ss-foot">
        {quote.items.length >= 2 && (
          <p className="ss-bundle">
            ซื้อทักษะเฉพาะยกชุดในขั้น “{SKILL_STAGES.find((s) => s.id === stage)?.label}”
            ({quote.items.length} ทักษะ) <strong>{baht(quote.price)}</strong>{' '}
            <s>{baht(quote.listPrice)}</s> ประหยัด {baht(quote.saved)}
          </p>
        )}
        <p>
          <strong>ราคาชัดเจน 2 แบบ ไม่มีอะไรซ่อน</strong>
          <br />
          ทักษะทั่วไปรวมอยู่ในแพ็กรายเดือนแล้ว · ทักษะ ★ เฉพาะที่นี่ ซื้อครั้งเดียว เป็นเจ้าของถาวร
          ใช้ได้ตลอดแม้ลดแพ็กลง
          <br />
          สิ่งที่จำกัดคือปริมาณการใช้งาน AI ต่อเดือน (โควตา token) ซึ่งดูได้ตลอดเวลาในหน้าแพ็กเกจ
        </p>
        <button
          type="button"
          className="ss-cta"
          onClick={() => { track('skill_showcase_cta', { stage, biz }); onGetStarted(); }}
        >
          เริ่มใช้ {FREE_SKILL_COUNT} ทักษะฟรี →
        </button>
      </div>
    </section>
  );
}
