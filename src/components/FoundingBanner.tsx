import { useEffect, useState } from 'react';
import type { AppData, PlanId } from '../types';
import { track } from '../lib/analytics';
import {
  FOUNDING_CAP, FOUNDING_ELITE, foundingReward, foundingSeatsLeft, foundingTierLabel,
  isFoundingFull, isFoundingPremiumActive,
} from '../lib/founding';
import { claimFoundingMember, fetchFoundingCount } from '../lib/foundingClient';

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
  wsId?: string | null;
  /** เลือกแพ็ก Starter (เมื่อผู้ใช้ยังไม่ใช่ Starter แล้วกด "สมัครเพื่อรับสิทธิ์") */
  onPickStarter?: () => void;
}

/* 🔴 เดิมเป็นชุดสีตายตัวของธีมเข้มชุดเดียว ⇒ ในธีมสว่างทั้งแผงเป็นสีเข้มบนพื้นขาว
 *    (วัดจริง 27 ส.ค. 2569 ด้วย scripts/contrast-audit.mjs ที่เพิ่งซ่อมให้ผสมชั้นโปร่งแสง)
 *    ⇒ ใช้โทเคนธีมแทน · ธีมเข้มได้ค่าเดิม เพราะโทเคนถูกประกาศให้ตรงกับค่าสำรองเดิม
 *    ⚠️ สีที่ใช้เป็น "ตัวหนังสือ" ต้องใช้ตัวแปร `-text` — สีสดบนพื้นขาวได้ contrast 1.3–2.4 */
const C = { cyan: 'var(--accent-text)', cyan3: 'var(--accent-text)', amber: 'var(--amber-text)', bg: 'var(--panel)', border: 'var(--sand)', slate: 'var(--muted)', white: 'var(--ink1)' };

export default function FoundingBanner({ data, onUpdate, wsId, onPickStarter }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fm = data.foundingMember;
  const plan: PlanId = data.subscription.plan;

  useEffect(() => { fetchFoundingCount().then(setCount); }, []);

  // ผู้ที่ได้สิทธิ์แล้ว → การ์ดสถานะ
  if (fm) {
    const active = isFoundingPremiumActive(fm, new Date());
    return (
      <div style={{ ...card, borderColor: C.cyan }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.cyan3 }}>🏅 {foundingTierLabel(fm)}</div>
        <div style={{ color: C.slate, fontSize: 13, marginTop: 6 }}>
          {active
            ? (fm.lifetime
                ? 'คุณได้สิทธิ์ระดับ Growth ตลอดชีพ (ระหว่างที่ยังใช้แพ็ก Starter) — ขอบคุณที่ร่วมเป็นผู้ร่วมก่อตั้ง 🙏'
                : `สิทธิ์ระดับ Growth ถึง ${new Date(fm.premiumUntil!).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}`)
            : 'สิทธิ์ Founding หมดอายุแล้ว — ต่ออายุเป็น Growth เพื่อใช้ฟีเจอร์ต่อ'}
        </div>
      </div>
    );
  }

  const full = count !== null && isFoundingFull(count);
  if (full) return null; // เต็มแล้ว — ไม่รบกวน
  const left = count === null ? null : foundingSeatsLeft(count);
  const elite = count !== null && count < FOUNDING_ELITE; // ยังอยู่ช่วง 100 คนแรก (ตลอดชีพ)

  async function claim() {
    if (!wsId) { setMsg('รับสิทธิ์ได้เมื่อล็อกอิน + มี workspace'); return; }
    setBusy(true); setMsg(null);
    const r = await claimFoundingMember(wsId);
    setBusy(false);
    if (r.full) { setMsg('ขออภัย — ที่นั่ง Founding เต็มแล้ว'); setCount(FOUNDING_CAP); return; }
    if (!r.ok || !r.seq) { setMsg('รับสิทธิ์ไม่สำเร็จ ลองใหม่อีกครั้ง'); return; }
    onUpdate({ ...data, foundingMember: foundingReward(r.seq, new Date()) });
    track('founding_claimed', { seq: r.seq, lifetime: r.seq <= FOUNDING_ELITE ? 1 : 0 });
    setMsg(null);
  }

  const isStarter = plan === 'starter';
  /* 🔴 gradient ต้องวางทับพื้นทึบ ไม่ใช่แทนที่ (23 ส.ค. 2569)
     เดิมเขียน `background:` ทับ ⇒ พื้นทึบของ card หายไป · ในธีมสว่างพื้นจึงกลายเป็นขาว
     แต่ตัวอักษรยังเป็น C.white ตายตัว = ขาวบนขาว (วัดได้ 1.05 = มองไม่เห็นเลย) */
  return (
    <div style={{ ...card, backgroundImage: 'linear-gradient(135deg, rgba(6,182,212,0.10), rgba(245,158,11,0.08))', borderColor: C.amber }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ background: C.amber, color: '#0f172a', fontWeight: 800, fontSize: 11, padding: '3px 10px', borderRadius: 999 }}>
          {elite ? '🔥 100 คนแรก · ตลอดชีพ' : '⭐ Founding Member'}
        </span>
        {left !== null && (
          <span style={{ color: C.cyan3, fontWeight: 700, fontSize: 13 }}>
            เหลือ {left.toLocaleString()} / {FOUNDING_CAP.toLocaleString()} ที่
          </span>
        )}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.white, marginTop: 10 }}>
        สมัคร Starter ฿790 — รับสิทธิ์ระดับ <span style={{ color: C.cyan3 }}>Growth</span> {elite ? 'ตลอดชีพ' : '12 เดือน'}
      </div>
      <div style={{ color: C.slate, fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
        ปลดฟีเจอร์ Growth (AI Search · ตลาด · ทีม · ISO · Analytics) + โควตา 700 calls/เดือน + แถม Skills พิเศษ — จ่ายราคา Starter
        {elite && ' · ล็อกสิทธิ์ตลอดชีพในฐานะผู้ร่วมก่อตั้ง'}
      </div>
      <div style={{ marginTop: 14 }}>
        {isStarter ? (
          <button onClick={claim} disabled={busy} style={btn(busy)}>
            {busy ? 'กำลังรับสิทธิ์…' : '🏅 รับสิทธิ์ Founding เลย'}
          </button>
        ) : (
          <button onClick={() => onPickStarter?.()} style={btn(false)}>
            สมัคร Starter เพื่อรับสิทธิ์ →
          </button>
        )}
      </div>
      {msg && <div style={{ color: C.amber, fontSize: 13, marginTop: 8 }}>{msg}</div>}
    </div>
  );
}

const card: React.CSSProperties = {
  border: `2px solid ${C.border}`, borderRadius: 14, padding: 18, background: C.bg, marginBottom: 16,
};
function btn(busy: boolean): React.CSSProperties {
  return {
    padding: '11px 22px', borderRadius: 10, border: 'none', background: busy ? '#334155' : C.cyan,
    color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, cursor: busy ? 'default' : 'pointer',
  };
}
