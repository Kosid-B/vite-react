import { useMemo } from 'react';
import type { AppData, PageId } from '../types';
import { nextBestAction } from '../lib/nextBestAction';

/* การ์ด "ตอนนี้ควรทำอะไรต่อ" — ปลายทางของห่วงโซ่ Vision → Constitution → Genome → Decision Engine
 *
 * 🔴 ทำไมต้องมีการ์ดนี้: ก่อนหน้านี้เอนจินทั้งหมดถูกเขียนเสร็จและมีเทสต์ครบ
 *    แต่ **ไม่มีผู้ใช้คนไหนเคยเห็นผลของมันเลย** (Architecture Consolidation Audit)
 *    "เขียนถูก ≠ ถูกเรียกใช้" — การ์ดนี้คือชั้นที่ทำให้มันถูกเรียกใช้จริง
 *
 * แสดง **ข้อเดียว** ตามกฎ DMAIC: ขึ้นต้นด้วยข้อเสนอ ไม่ใช่ด้วยที่มา
 * ที่มาอยู่ข้างล่างให้กดดูได้ ไม่ใช่บังคับให้อ่าน
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
  const goto = r.stuck ? BRANCH_PAGE[r.stuck.key] : null;

  return (
    <div className="nba-card">
      <div className="nba-hd">
        <span className="nba-eyebrow">ขั้นตอนนี้ของธุรกิจคุณ · {r.stage}</span>
        <span className="nba-pct" title="ความครบของข้อมูลธุรกิจที่ระบบใช้ตัดสินใจ">
          จีโนม {r.genomeCompletePct}%
        </span>
      </div>

      {/* ① ข้อเสนอมาก่อนเสมอ */}
      <p className="nba-action">{r.action}</p>

      {/* ② ที่มา — ตรวจสอบได้ แต่ไม่บังคับให้อ่านก่อน */}
      <details className="nba-why">
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
        <button className="nba-go" onClick={() => onNavigate(goto)}>
          ไปกรอกข้อมูลส่วนนี้ →
        </button>
      )}
    </div>
  );
}
