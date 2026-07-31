import { useEffect, useMemo, useState } from 'react';
import type { AppData, PageId } from '../types';
import { getAiUsage, PLAN_AI_CALLS } from '../lib/usage';
import { foundingEffectivePlan, isFoundingPremiumActive } from '../lib/founding';
import { computeNudge } from '../lib/nudge';
import { track } from '../lib/analytics';

interface Props {
  data: AppData;
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

const DISMISS_KEY = 'ceo_ai_nudge_dismiss';
function today(): string { return new Date().toISOString().slice(0, 10); }

export default function ConversionNudge({ data, activePage, onNavigate }: Props) {
  const [dismissed, setDismissed] = useState<string>(() => {
    try { return localStorage.getItem(DISMISS_KEY) ?? ''; } catch { return ''; }
  });

  const nudge = useMemo(() => {
    const now = new Date();
    const sub = data.subscription;
    const trialDaysLeft = sub.status === 'trial' && sub.trialEndDate
      ? Math.ceil((new Date(sub.trialEndDate).getTime() - now.getTime()) / 86400000)
      : null;
    const effPlan = foundingEffectivePlan(sub.plan, data.foundingMember, now);
    const quota = PLAN_AI_CALLS[effPlan];
    const aiPct = quota > 0 ? (getAiUsage().count / quota) * 100 : 0;
    return computeNudge({
      status: sub.status,
      trialDaysLeft,
      aiPct,
      plan: sub.plan,
      foundingActive: isFoundingPremiumActive(data.foundingMember, now),
    });
  }, [data.subscription, data.foundingMember]);

  const dismissTag = nudge ? `${today()}:${nudge.id}` : '';
  const show = !!nudge && activePage !== 'billing' && dismissed !== dismissTag;

  useEffect(() => { if (show && nudge) track('nudge_shown', { tone: nudge.tone, id: nudge.id }); }, [show, nudge]);

  if (!show || !nudge) return null;
  const isTrial = nudge.tone === 'trial';
  const accent = isTrial ? '#f59e0b' : '#06b6d4';

  function dismiss() {
    setDismissed(dismissTag);
    try { localStorage.setItem(DISMISS_KEY, dismissTag); } catch { /* noop */ }
  }
  function go() {
    if (nudge) track('nudge_click', { tone: nudge.tone, id: nudge.id });
    onNavigate('billing');
  }

  return (
    <div role="status" style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      padding: '11px 16px', margin: '0 0 14px', borderRadius: 10,
      border: `1px solid ${accent}`, background: isTrial ? 'rgba(245,158,11,0.10)' : 'rgba(6,182,212,0.10)',
    }}>
      <span style={{ color: '#f8fafc', fontSize: 14, fontWeight: 600, flex: '1 1 260px', lineHeight: 1.5 }}>
        {nudge.message}
      </span>
      <button onClick={go} style={{
        padding: '8px 16px', borderRadius: 8, border: 'none', background: accent,
        color: isTrial ? '#0f172a' : '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', flex: 'none',
      }}>{nudge.cta} →</button>
      <button onClick={dismiss} aria-label="ปิด" style={{
        padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: 'transparent',
        color: '#94a3b8', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', flex: 'none',
      }}>วันนี้ไว้ก่อน</button>
    </div>
  );
}
