import { useEffect, useMemo, useState } from 'react';
import type { AppData } from '../types';
import { closedDealCount, hasNewDealMilestone } from '../lib/ahaShare';
import { referralLink, REF_REWARD_CALLS } from '../lib/referral';
import { track } from '../lib/analytics';

/* ShareMilestone — Aha-moment trigger (Viral Loop เฟส A)
 * โชว์การ์ดฉลอง + ชวนเพื่อน "ตอน" ผู้ใช้ปิดดีลได้จริง (อารมณ์สูงสุด = แชร์เยอะสุด)
 * reuse referralLink (2-sided credit จริง) · โชว์เฉพาะ milestone ใหม่ · opt-in (กด "ไว้ก่อน" ได้) */

interface Props { data: AppData; wsId: string | null; }
const SEEN_KEY = 'ceo_ai_aha_deal_seen';

export default function ShareMilestone({ data, wsId }: Props) {
  const current = useMemo(() => closedDealCount(data), [data]);
  const seenKey = `${SEEN_KEY}:${wsId ?? 'local'}`;
  const [seen, setSeen] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(seenKey) ?? '0', 10) || 0; } catch { return 0; }
  });
  const [copied, setCopied] = useState(false);

  const show = hasNewDealMilestone(current, seen);
  useEffect(() => { if (show) track('aha_share_shown', { deals: current }); }, [show, current]);

  if (!show) return null;
  const link = referralLink(wsId ?? undefined);

  function ack(next: number) {
    try { localStorage.setItem(seenKey, String(next)); } catch { /* noop */ }
    setSeen(next);
  }
  function invite() {
    track('aha_invite_click', { deals: current });
    navigator.clipboard?.writeText(link).then(() => setCopied(true)).catch(() => setCopied(true));
  }

  return (
    <div role="status" style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      background: 'linear-gradient(90deg, rgba(34,197,94,.12), rgba(6,182,212,.12))',
      border: '1px solid rgba(34,197,94,.35)', borderRadius: 12, padding: '12px 16px', margin: '0 0 14px',
    }}>
      <span style={{ fontSize: 22, lineHeight: 1 }}>🎉</span>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div style={{ fontWeight: 800, color: 'var(--ink, #0f172a)', fontSize: 14.5 }}>
          ปิดดีลได้แล้ว {current} รายการ — เยี่ยมมาก!
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink3, #475569)', lineHeight: 1.5, marginTop: 2 }}>
          ชวนเพื่อนเจ้าของธุรกิจมาลอง — <strong>ทั้งคู่ได้เครดิต AI {REF_REWARD_CALLS} calls</strong> เมื่อเพื่อนสมัครแพ็กจ่ายเงิน
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={invite} style={{
          background: copied ? '#16a34a' : '#06b6d4', color: '#fff', border: 0, borderRadius: 9,
          padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {copied ? '✓ คัดลอกลิงก์แล้ว' : '🔗 ชวนเพื่อน (คัดลอกลิงก์)'}
        </button>
        <button onClick={() => ack(current)} style={{
          background: 'transparent', color: 'var(--ink4, #64748b)', border: '1px solid var(--sand, #cbd5e1)',
          borderRadius: 9, padding: '9px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          ไว้ก่อน
        </button>
      </div>
    </div>
  );
}
