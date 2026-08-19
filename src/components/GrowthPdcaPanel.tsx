import { useMemo } from 'react';
import {
  growthPdca, BOTTLENECK_LABEL, type Tracker, type PhaseCheck, type PdcaPhase,
} from '../lib/growthPdca';
import type { LandingAgg } from '../lib/landingFunnel';
import { isAmplitudeEnabled } from '../lib/amplitude';

/* แผง PDCA ของการเติบโต — วางไว้บนสุดของแท็บการเติบโต
 *
 * ทำไมต้องอยู่บนสุด: แผงอื่นทั้งหมดคือ "ตัวเลข" แต่แผงนี้ตอบว่า
 *   **ตอนนี้ตัวเลขพวกนั้นเชื่อได้แค่ไหน และควรทำอะไรต่อชิ้นเดียว**
 *   ถ้าอ่านตัวเลขก่อนรู้ว่าวงจรค้างตรงไหน จะได้ข้อสรุปที่มั่นใจแต่ผิด
 */

const STATE_UI: Record<PhaseCheck['state'], { dot: string; color: string }> = {
  ok:      { dot: '●', color: '#16a34a' },
  thin:    { dot: '◐', color: '#d97706' },
  blocked: { dot: '○', color: '#dc2626' },
};

function Phase({ p, stuck }: { p: PhaseCheck; stuck: boolean }) {
  const ui = STATE_UI[p.state];
  return (
    <div style={{
      border: `1px solid ${stuck ? ui.color : 'var(--sand)'}`,
      borderRadius: 10, padding: '9px 12px',
      background: stuck ? 'var(--cream)' : 'var(--cream2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
        <span style={{ color: ui.color }}>{ui.dot}</span>{p.label}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 4, lineHeight: 1.6 }}>{p.evidence}</div>
      {p.todo && (
        <div style={{ fontSize: 11.5, color: ui.color, marginTop: 5, lineHeight: 1.6, fontWeight: 600 }}>→ {p.todo}</div>
      )}
    </div>
  );
}

export default function GrowthPdcaPanel({
  landing, plannedPieces = 0, windowDays = 30, lastVisitAt,
}: {
  landing: LandingAgg | null;
  /** ชิ้นงานที่วางแผนจะปล่อยรอบนี้ (จากปฏิทิน) */
  plannedPieces?: number;
  windowDays?: number;
  lastVisitAt?: string;
}) {
  const status = useMemo(() => {
    /* ⚠️ receiving ของ Amplitude = null โดยตั้งใจ
     *    ฝั่งเบราว์เซอร์รู้ได้แค่ "มีคีย์ไหม" (wired) — รู้ไม่ได้ว่าปลายทางรับ event จริงหรือเปล่า
     *    การเดาว่า "มีคีย์ = ใช้งานได้" คือสิ่งที่ทำให้เราคิดว่ามีข้อมูลมาตลอด ทั้งที่ได้ 0 event
     *    จึงประกาศเป็นจุดบอด (🟡) ให้เห็นชัด แทนที่จะแกล้งตอบ */
    const trackers: Tracker[] = [
      {
        id: 'funnel', label: 'Landing Funnel (ฐานข้อมูลเราเอง)',
        wired: true, receiving: (landing?.total ?? 0) > 0,
        fix: 'ยังไม่มีผู้เข้าชมเข้ามาในช่วงนี้',
      },
      {
        id: 'amplitude', label: 'Amplitude (funnel · retention · session replay)',
        wired: isAmplitudeEnabled,
        receiving: isAmplitudeEnabled ? null : false,
        fix: 'ตั้ง VITE_AMPLITUDE_KEY ใน GitHub → Settings → Secrets → Actions แล้ว deploy ใหม่',
      },
    ];
    return growthPdca({
      agg: landing, trackers, planned: plannedPieces, windowDays, lastVisitAt,
    });
  }, [landing, plannedPieces, windowDays, lastVisitAt]);

  const order: PdcaPhase[] = ['plan', 'do', 'check', 'act'];

  return (
    <div style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: '16px 18px', background: 'var(--cream2)' }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
        🔁 วงจร PDCA ของการเติบโต
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3, marginBottom: 12, lineHeight: 1.7 }}>
        {status.headline}
      </div>

      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {order.map((k) => <Phase key={k} p={status.phases[k]} stuck={status.stuckAt === k} />)}
      </div>

      <div style={{
        marginTop: 12, border: '1px solid var(--sand)', borderRadius: 10,
        padding: '11px 14px', background: 'var(--cream)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
          ทำชิ้นเดียวตอนนี้
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink)', marginTop: 4, lineHeight: 1.7 }}>
          {status.nextAction}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 6, lineHeight: 1.6 }}>
          คนเข้าเว็บ ~{status.visitorsPerWeek} คน/สัปดาห์ · คอขวด: {BOTTLENECK_LABEL[status.bottleneck]}
          {!status.canAct && ' · ยังตัดสินใจจากตัวเลขไม่ได้'}
        </div>
      </div>

      {status.blindSpots.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
            จุดที่เรารู้ว่าเรายังไม่รู้
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            {status.blindSpots.map((b, i) => (
              <div key={i} style={{ fontSize: 11.5, color: 'var(--ink3)', lineHeight: 1.6 }}>{b}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
