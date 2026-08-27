import { useEffect, useMemo, useRef } from 'react';
import type { AppData, PageId } from '../types';
import { nextBestAction } from '../lib/nextBestAction';
import { openLoopFor } from '../lib/appArc';
import { track } from '../lib/analytics';

/* การ์ด "ตอนนี้ควรทำอะไรต่อ" — ปลายทางของห่วงโซ่ Vision → Constitution → Genome → Decision Engine
 *
 * 🔴 ทำไมต้องมีการ์ดนี้: ก่อนหน้านี้เอนจินทั้งหมดถูกเขียนเสร็จและมีเทสต์ครบ
 *    แต่ **ไม่มีผู้ใช้คนไหนเคยเห็นผลของมันเลย** (Architecture Consolidation Audit)
 *    "เขียนถูก ≠ ถูกเรียกใช้" — การ์ดนี้คือชั้นที่ทำให้มันถูกเรียกใช้จริง
 *
 * แสดง **ข้อเดียว** ตามกฎ DMAIC: ขึ้นต้นด้วยข้อเสนอ ไม่ใช่ด้วยที่มา
 * ที่มาอยู่ข้างล่างให้กดดูได้ ไม่ใช่บังคับให้อ่าน
 *
 * 🔴 แก้ 27 ส.ค. 2569 — จังหวะอารมณ์ (`appArc.ts`):
 *    เดิมการ์ดนี้เปิดด้วย **สถานะ** ("ขั้นตอนนี้ของธุรกิจคุณ · จีโนม X%")
 *    = ให้ความมั่นใจก่อนที่ผู้ใช้จะรู้สึกว่ามีอะไรขาด ⇒ ไม่มีอะไรให้คลาย ⇒ ไม่มีเหตุผลจะทำต่อ
 *    (ความผิดตระกูลเดียวกับที่เพิ่งแก้บนหน้า Landing — `emotionalArc.arcIssues` เรียกว่า blocker)
 *    ตอนนี้เปิดด้วย **คำถามที่เขาตอบเองไม่ได้ถ้าไม่รู้ตัวเลขของตัวเอง** แล้วค่อยตามด้วยขั้นต่อไป
 *    ⚠️ คำถามมาจากช่องว่างจริงในจีโนม — ไม่มีช่องว่าง = ไม่มีคำถาม (ห้ามแต่งขึ้นมาเพื่อให้มีความตึง)
 */

/** กิ่งจีโนม → หน้าที่ไปกรอกต่อได้จริง (ต้องเป็น PageId ที่มีอยู่จริงเท่านั้น) */
const BRANCH_PAGE: Record<string, PageId> = {
  business: 'aicompany',
  customer: 'personas',
  problem: 'market',
  offer: 'bmc',
  acquisition: 'funnel',
  experiment: 'bmc',
  economics: 'roi',
  scale: 'process',
};

export default function NextBestActionCard({
  data, onNavigate,
}: { data: AppData; onNavigate: (p: PageId) => void }) {
  const r = useMemo(() => nextBestAction(data), [data]);
  const loop = useMemo(() => openLoopFor(data), [data]);
  const goto = r.stuck ? BRANCH_PAGE[r.stuck.key] : null;

  /* 🔴 วัดว่าจุดตึงพาคนเดินต่อจริงไหม — ไม่งั้นเราจะเถียงกันด้วยความรู้สึก
   *    `nba_loop_shown` คือ **ตัวหาร** ที่ถูกต้อง: นับเฉพาะคนที่เห็นคำถามจริง
   *    ไม่ใช่ผู้ใช้ทั้งหมด (skill experiment-reality-check — เคยหลอกตาแล้ว: 60 คน เห็นจริง 1)
   *    ส่งเฉพาะ "คีย์ของด่าน" ซึ่งเป็นค่าจากรายการปิด — ไม่มีข้อมูลของผู้ใช้ติดไป */
  const shownFor = useRef<string | null>(null);
  useEffect(() => {
    if (!loop || shownFor.current === loop.key) return;
    shownFor.current = loop.key;
    track('nba_loop_shown', { gap: loop.key, stage: r.stage });
  }, [loop, r.stage]);

  return (
    <div className="nba-card">
      {/* ① ความตึงมาก่อนความโล่ง — คำถามที่เขาตอบเองไม่ได้ ก่อนสถานะและก่อนข้อเสนอ */}
      {loop && (
        <div className="nba-loop">
          <p className="nba-q">❓ {loop.question}</p>
          <p className="nba-q-why">{loop.why}</p>
        </div>
      )}

      <div className="nba-hd">
        <span className="nba-eyebrow">ขั้นตอนนี้ของธุรกิจคุณ · {r.stage}</span>
        <span className="nba-pct" title="ความครบของข้อมูลธุรกิจที่ระบบใช้ตัดสินใจ">
          จีโนม {r.genomeCompletePct}%
        </span>
      </div>

      {/* ② ข้อเสนอ — ทางออกของคำถามข้างบน (ความโล่งที่เป็นของจริง) */}
      <p className="nba-action">{r.action}</p>

      {/* ② ที่มา — ตรวจสอบได้ แต่ไม่บังคับให้อ่านก่อน */}
      <details className="nba-why"
        onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) track('nba_why_open', { gap: loop?.key ?? 'none' }); }}>
        <summary>ทำไมถึงเป็นข้อนี้</summary>
        <p>{r.because}</p>
        {r.gaps.length > 0 && (
          <ul className="nba-gaps">
            {r.gaps.map((g) => <li key={g.key}>{g.q}</li>)}
          </ul>
        )}
        {r.blindSpots.map((b, i) => <p key={i} className="nba-blind">{b}</p>)}
      </details>

      {goto && (
        <button className="nba-go" onClick={() => { track('nba_go_click', { gap: loop?.key ?? 'none', to: goto }); onNavigate(goto); }}>
          ไปกรอกข้อมูลส่วนนี้ →
        </button>
      )}
    </div>
  );
}
