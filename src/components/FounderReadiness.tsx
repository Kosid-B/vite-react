import { useMemo, useState } from 'react';
import type { AppData, PageId } from '../types';
import {
  GOLDEN_QUESTION, SCALE_ACTIONS, STAGE_LABEL,
  assessReadiness, nextBestAction, passedCount, readinessStage, scaleCheck,
  type ScaleActionId,
} from '../lib/founderMindset';
import { track } from '../lib/analytics';

interface Props {
  data: AppData;
  onNavigate: (page: PageId) => void;
}

/**
 * ด่านความพร้อมก่อนเร่งเครื่อง
 *
 * อยู่บนสุดของห้องบอร์ดโดยตั้งใจ — บอร์ดควรเห็น "เรามีหลักฐานแค่ไหน"
 * ก่อนจะอนุมัติวาระอะไรก็ตาม ไม่ใช่เห็นทีหลัง
 *
 * ⚠️ ทุกด่านอ่านจากข้อมูลจริงในระบบ ไม่มีช่องให้ติ๊กเอง (ดู lib/founderMindset.ts)
 * และไม่มีปุ่มไหนถูกปิดจากผลตรวจนี้ — หน้าที่ของมันคือทำให้ "ยังไม่มีหลักฐาน"
 * มองเห็นได้ก่อนจ่ายเงิน ไม่ใช่ตัดสินใจแทนเจ้าของ
 */
export default function FounderReadiness({ data, onNavigate }: Props) {
  const gates = useMemo(() => assessReadiness(data), [data]);
  const stage = readinessStage(gates);
  const passed = passedCount(gates);
  const next = nextBestAction(gates);

  const [checking, setChecking] = useState<ScaleActionId | null>(null);
  const verdict = checking ? scaleCheck(checking, gates) : null;

  function check(id: ScaleActionId) {
    const open = checking === id ? null : id;
    setChecking(open);
    if (open) track('founder_scale_check', { action: open, passed });
  }

  return (
    <section className="fr">
      <div className="fr-top">
        <div>
          <div className="fr-title">ก่อนเร่งเครื่อง — เรามีหลักฐานแค่ไหน</div>
          <div className="fr-sub">ทุกข้อดูจากข้อมูลจริงในระบบ ไม่ใช่การประเมินตัวเอง</div>
        </div>
        <span className={`fr-stage fr-stage-${stage}`}>
          {STAGE_LABEL[stage]} · {passed}/6
        </span>
      </div>

      <ol className="fr-gates">
        {gates.map((gate) => (
          <li key={gate.id} className={gate.passed ? 'fr-gate fr-pass' : 'fr-gate'}>
            <span className="fr-mark" aria-hidden="true">{gate.passed ? '✓' : '—'}</span>
            <div className="fr-gate-body">
              <div className="fr-gate-q">{gate.question}</div>
              <div className="fr-gate-ev">{gate.evidence}</div>
            </div>
          </li>
        ))}
      </ol>

      {/* งานเดียว ไม่ใช่รายการยาว — คนที่ว่างวันละชั่วโมงต้องรู้ว่า "พรุ่งนี้ทำอะไร" */}
      <div className="fr-next">
        <div className="fr-next-label">{next.isValidation ? 'งานถัดไปที่คุ้มที่สุด' : 'พร้อมแล้ว'}</div>
        <div className="fr-next-title">{next.title}</div>
        <div className="fr-next-why">{next.why}</div>
        <button className="btn btn-primary" onClick={() => onNavigate(next.goto)}>
          ไปทำเลย
        </button>
      </div>

      <div className="fr-scale">
        <div className="fr-scale-label">กำลังจะใช้เงินก้อน? ลองเช็คก่อน</div>
        <div className="fr-scale-btns">
          {SCALE_ACTIONS.map((action) => (
            <button
              key={action.id}
              className={checking === action.id ? 'fr-chip fr-chip-on' : 'fr-chip'}
              onClick={() => check(action.id)}
            >
              {action.label}
            </button>
          ))}
        </div>

        {verdict && (
          <div className={verdict.ready ? 'fr-verdict fr-verdict-ok' : 'fr-verdict'}>
            <div className="fr-verdict-msg">{verdict.message}</div>
            {verdict.blockers.length > 0 && (
              <ul className="fr-blockers">
                {verdict.blockers.map((b) => (
                  <li key={b.id}>
                    <button className="fr-blocker" onClick={() => onNavigate(b.goto)}>
                      {b.question} <span className="fr-blocker-go">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <p className="fr-golden">“{GOLDEN_QUESTION}”</p>
    </section>
  );
}
