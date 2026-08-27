import { useEffect, useState } from 'react';
import type { LandingAgg } from '../lib/landingFunnel';
import { payingCustomerCount } from '../lib/payments';
import {
  stageFitReport, STAGE_LABEL, type FittedInitiative, type StageFitReport,
} from '../lib/stageFit';
import { reachLeakNote } from '../lib/brandVisibility';

/* แผง "งานชิ้นนี้ถึงเวลาของมันหรือยัง" — skill `case-study-stage-fit` ในรูปโค้ด
 *
 * ทำไมต้องมี: `growthPdca` บอกได้แล้วว่าคอขวดคือ "ไม่มีคนมา"
 *   แต่ไม่มีอะไรเชื่อมข้อสรุปนั้นกลับมาที่ **รายการงานที่เราวางแผนจะทำ**
 *   ⇒ รู้ว่าคอขวดคือ reach แต่ยังเปิดจอไปทำฟีเจอร์ต่อได้อย่างสบายใจ
 *
 * วางไว้ใต้ GrowthPdcaPanel ทันที: PDCA บอก "วงจรค้างตรงไหน" · แผงนี้บอก "แล้วจะทำอะไร"
 */

const TONE: Record<'now' | 'later' | 'never', { c: string; bg: string; head: string }> = {
  now:   { c: '#15803d', bg: '#f0fdf4', head: '✅ ทำได้ตอนนี้' },
  later: { c: '#b45309', bg: '#fffbeb', head: '⏳ ยังไม่ถึงเวลา' },
  never: { c: '#b91c1c', bg: '#fef2f2', head: '🚫 ห้ามทำ' },
};

function Row({ i, kind }: { i: FittedInitiative; kind: 'now' | 'later' | 'never' }) {
  return (
    <li style={{ marginBottom: 8, lineHeight: 1.65 }}>
      <b style={{ color: '#111827' }}>{i.label}</b>
      <div style={{ fontSize: 12.5, color: '#4b5563' }}>{i.why}</div>
      {kind === 'later' && i.unlock && (
        <div style={{ fontSize: 12.5, color: TONE.later.c, fontWeight: 600 }}>🔓 ปลดล็อกเมื่อ: {i.unlock}</div>
      )}
      {kind === 'later' && i.manualFirst && (
        <div style={{ fontSize: 12.5, color: '#4b5563' }}>👉 ทำเวอร์ชันมือก่อนได้: {i.manualFirst}</div>
      )}
    </li>
  );
}

export default function StageFitPanel({ landing }: { landing: LandingAgg | null }) {
  // null = ยังไม่รู้ · -1 = ตรวจไม่ได้ (แยกจาก 0 = ตรวจแล้วไม่มี — ห้ามยุบเป็นค่าเดียวกัน)
  const [paying, setPaying] = useState<number | null>(null);

  useEffect(() => {
    let dead = false;
    payingCustomerCount().then((n) => { if (!dead) setPaying(n === null ? -1 : n); });
    return () => { dead = true; };
  }, []);

  if (!landing || paying === null) return null;

  const days = Math.max(1, landing.days ?? 30);
  const visitorsPerWeek = Math.round(((landing.total ?? 0) / days) * 7 * 10) / 10;
  const unreadable = paying < 0;

  const r: StageFitReport = stageFitReport({
    visitorsPerWeek,
    visitorsTotal: landing.total ?? 0,
    // ตรวจไม่ได้ ⇒ ถือว่า 0 เพื่อ "ไม่ปลดล็อกงานเฟสหลัง" (fail-closed)
    // แล้วประกาศจุดบอดให้เห็นด้านล่าง — ห้ามเงียบ
    payingCustomers: unreadable ? 0 : paying,
  });

  // 🔗 เชื่อมสถานะแบรนด์กลับเข้าวงจรเดียวกัน — งาน reach ผลิต "คนที่จำชื่อเราได้"
  //    ถ้าคนที่จำได้ไปค้นแล้วเจอองค์กรอื่น แรงที่ลงไปหายที่ปลายทาง
  //    ⚠️ เป็นคำเตือน ไม่ใช่ด่านกั้น — งานคอนเทนต์ยังต้องเดินต่อคู่ขนาน
  const leak = r.stage === 'reach' ? reachLeakNote() : null;

  const sections: Array<[('now' | 'later' | 'never'), FittedInitiative[]]> = [
    ['now', r.now], ['later', r.later], ['never', r.never],
  ];

  return (
    <div style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: '16px 18px', background: 'var(--cream2)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--ink)' }}>
        🎯 ถึงเวลาของงานไหนแล้ว — เฟส: {STAGE_LABEL[r.stage]}
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 10, lineHeight: 1.7 }}>
        {r.headline}
        <br />
        <span style={{ color: 'var(--ink3)' }}>
          คำถามเดียวที่มีความหมายตอนนี้: <b style={{ color: 'var(--ink)' }}>{r.question}</b>
        </span>
      </div>

      {!r.canReadRates && (
        <div style={{ fontSize: 12.5, color: '#b45309', background: '#fffbeb', border: '1px dashed #f59e0b',
                      borderRadius: 8, padding: '8px 10px', marginBottom: 10, lineHeight: 1.6 }}>
          ⚠️ ผู้เข้าชมสะสม {landing.total} คน — ยังอ่าน &ldquo;กี่ %&rdquo; ไม่ได้
          ตัวเลขอัตราส่วนทุกตัวในแผงข้างล่างจึงบอกได้แค่ &ldquo;มี/ไม่มี&rdquo;
        </div>
      )}

      {unreadable && (
        <div style={{ fontSize: 12.5, color: '#b91c1c', background: '#fef2f2', border: '1px dashed #ef4444',
                      borderRadius: 8, padding: '8px 10px', marginBottom: 10, lineHeight: 1.6 }}>
          🔴 <b>อ่านจำนวนลูกค้าที่จ่ายจริงไม่ได้</b> (ไม่ใช่แปลว่าเป็น 0) — ระบบถือเป็น 0 ไว้ก่อน
          เพื่อไม่ปลดล็อกงานเฟสหลังโดยที่ยังไม่มีหลักฐาน
        </div>
      )}

      {leak && (
        <div style={{ fontSize: 12.5, color: '#b45309', background: '#fffbeb', border: '1px dashed #f59e0b',
                      borderRadius: 8, padding: '8px 10px', marginBottom: 10, lineHeight: 1.6 }}>
          🔗 <b>รอยรั่วปลายทางของงานเฟสนี้</b> — {leak.text}
        </div>
      )}

      {sections.map(([kind, list]) => list.length === 0 ? null : (
        <div key={kind} style={{ marginTop: 10, background: TONE[kind].bg, border: `1px solid ${TONE[kind].c}22`,
                                 borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: TONE[kind].c, marginBottom: 6 }}>
            {TONE[kind].head} ({list.length})
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5 }}>
            {list.map((i) => <Row key={i.id} i={i} kind={kind} />)}
          </ul>
        </div>
      ))}

      <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 10, lineHeight: 1.6 }}>
        เกณฑ์ทั้งหมดอยู่ใน <code>src/lib/stageFit.ts</code> · หลักการ: skill <code>case-study-stage-fit</code>
        <br />ลูกค้าจ่ายจริงนับเป็น &ldquo;ธุรกิจ&rdquo; และตัด <code>admin-free</code> ออกแล้ว
      </div>
    </div>
  );
}
