import type { AppData, PageId } from '../types';
import { retentionNudge } from '../lib/retentionNudge';
import { track } from '../lib/analytics';

/* WelcomeBackCard — การ์ด "กลับมาทำต่อ" สำหรับผู้ใช้เดิมที่หายไป ≥1 วัน (แก้ retention)
 * โปร่งใส: ช่วยทำต่อจากที่ค้าง + งานถัดไปตามความคืบหน้า · ปิดได้ · โชว์วันละครั้ง */

export default function WelcomeBackCard({
  data, onUpdate, onNavigate,
}: { data: AppData; onUpdate: (d: AppData) => void; onNavigate: (p: PageId) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const nudge = retentionNudge({
    today,
    lastActiveDay: data.streak?.lastDay,
    seenDay: data.retentionNudgeSeen,
    visitedCount: data.visitedPages?.length ?? 0,
    streakCount: data.streak?.count ?? 0,
    hasCompany: !!data.aiCompany?.name?.trim(),
    hasIdea: !!data.businessModel?.bmc?.value?.[0]?.trim(),
  });
  if (!nudge.show) return null;

  const markSeen = () => onUpdate({ ...data, retentionNudgeSeen: today });
  const go = () => { track('welcomeback_cta', { page: nudge.ctaPage }); markSeen(); onNavigate(nudge.ctaPage); };
  const dismiss = () => { track('welcomeback_dismiss', {}); markSeen(); };

  return (
    <div style={{ margin: '0 0 16px', borderRadius: 14, border: '1px solid var(--sand)', background: 'var(--cream2)', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{nudge.title}</div>
        <div style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 2, lineHeight: 1.5 }}>{nudge.message}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={go} style={{ background: 'var(--accent)', color: '#fff', border: 0, borderRadius: 10, padding: '10px 16px', fontWeight: 800, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>
          {nudge.ctaLabel}
        </button>
        <button onClick={dismiss} aria-label="ปิด" title="ไว้ทีหลัง"
          style={{ background: 'transparent', color: 'var(--ink3)', border: '1px solid var(--sand)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15 }}>✕</button>
      </div>
    </div>
  );
}
