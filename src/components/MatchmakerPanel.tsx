import { useMemo } from 'react';
import type { AppData } from '../types';
import { topMatches, offerKind, kindLabel, type BizProfile, type MatchResult } from '../lib/b2bMatching';
import { track } from '../lib/analytics';

/* MatchmakerPanel — VP หลัก "AI จับคู่ธุรกิจ": หาคู่ค้า/ซัพพลายเออร์/ผู้ซื้อที่เข้าไม่ถึงมาจับคู่ให้
 * ต่างจากรายการโอกาสเดิม (rating) — อธิบายได้ว่า "ทำไมจับคู่" (need↔offer + พื้นที่) */

const DIR_BADGE: Record<MatchResult['direction'], { t: string; c: string }> = {
  buy:  { t: '🛒 ซื้อจากเขา', c: '#0891b2' },
  sell: { t: '💰 ขายให้เขา', c: '#15803d' },
  peer: { t: '🤝 พันธมิตร', c: '#b45309' },
};

export default function MatchmakerPanel({ data }: { data: AppData }) {
  const me: BizProfile = useMemo(() => ({
    id: 'me',
    name: data.aiCompany?.name || 'ธุรกิจของคุณ',
    category: (data.aiCompany?.productDesc || data.aiCompany?.industry || '').trim(),
    location: '',
  }), [data.aiCompany?.name, data.aiCompany?.productDesc, data.aiCompany?.industry]);

  const pool: BizProfile[] = useMemo(() => (data.marketplace?.partners ?? []).map(p => ({
    id: p.id, name: p.name ?? 'พาร์ตเนอร์', category: p.category ?? '', location: p.location ?? '',
    rating: p.rating, verified: p.verified, inSystem: true,
  })), [data.marketplace?.partners]);

  const matches = useMemo(() => topMatches(me, pool), [me, pool]);
  const myKind = offerKind(me.category);

  return (
    <div style={{ border: '1px solid var(--border, #1e293b)', borderRadius: 14, padding: '18px 20px', margin: '0 0 20px', background: 'var(--panel, rgba(15,23,42,0.5))' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ fontSize: 17, fontWeight: 800 }}>🤝 AI จับคู่ธุรกิจให้คุณ</span>
        <span style={{ fontSize: 12.5, color: 'var(--muted, #94a3b8)' }}>หาคู่ค้า/ซัพพลายเออร์/ผู้ซื้อที่คุณเข้าไม่ถึง — จับคู่ให้อัตโนมัติ</span>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted, #94a3b8)', marginBottom: 14 }}>
        ธุรกิจของคุณ: <b>{me.category || '(ยังไม่ระบุ)'}</b> · ประเภท: <b>{kindLabel(myKind)}</b>
      </div>

      {matches.length === 0 ? (
        <div style={{ fontSize: 13.5, color: 'var(--muted, #94a3b8)', lineHeight: 1.6 }}>
          ยังไม่มีคู่ที่เข้าเกณฑ์ — เพิ่มพาร์ตเนอร์ในระบบ หรือระบุประเภทธุรกิจ (BMC/บริษัท AI) ให้ชัด แล้วระบบจะจับคู่ให้
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {matches.map(m => {
            const badge = DIR_BADGE[m.direction];
            return (
              <div key={m.biz.id} style={{ border: '1px solid var(--border, #1e293b)', borderRadius: 10, padding: '12px 14px', background: 'var(--card, rgba(2,6,23,0.4))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 800 }}>{m.biz.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: badge.c, flex: 'none' }}>{m.score}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: badge.c, border: `1px solid ${badge.c}`, borderRadius: 6, padding: '2px 8px' }}>{badge.t}</span>
                  {m.biz.location && <span style={{ fontSize: 11.5, color: 'var(--muted, #94a3b8)' }}>📍 {m.biz.location}</span>}
                  {m.needsInvite && <span style={{ fontSize: 11.5, color: '#f59e0b', fontWeight: 700 }}>✉️ ต้องเชิญ</span>}
                </div>
                <ul style={{ margin: '4px 0 10px', paddingLeft: 16, fontSize: 12, color: 'var(--muted, #94a3b8)', lineHeight: 1.55 }}>
                  {m.reasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
                <button
                  onClick={() => track('matchmaker_action', { direction: m.direction, needsInvite: m.needsInvite ? 1 : 0, score: m.score })}
                  style={{ width: '100%', background: badge.c, color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {m.action}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
