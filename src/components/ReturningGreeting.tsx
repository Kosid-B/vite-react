import { useEffect, useMemo, useState } from 'react';
import { track } from '../lib/analytics';
import { readQuickDraft, quickCheck, verdictOf } from '../lib/productQuickCheck';
import { markLandingCta } from '../lib/landingFunnel';

/* ReturningGreeting — คนที่เคยกรอก "ตรวจสินค้าเร็ว" แล้วกลับมา ต้องไม่เจอหน้าเดิมเหมือนไม่เคยรู้จักกัน
 *
 * กฎ Dynamic PLG: ระบบรู้อะไรเกี่ยวกับเขาแล้ว ต้องแสดงให้ตรงกับสิ่งที่รู้
 *   เขากรอกราคา/ต้นทุนไว้ในเครื่องตัวเอง (localStorage) แต่หน้าเว็บทำเหมือนไม่เคยเจอกัน
 *   = ทิ้งบริบทที่เขาอุตส่าห์ให้มาแล้ว
 *
 * ⚠️ ทำไมนี่ "ไม่ใช่" การทดลอง A/B:
 *   ตัวเลขจริง 16 ส.ค. 2569 คือผู้เข้าชม 60 คน · กด CTA 4 คน — แบ่งกลุ่มทดลองแล้ววัดอะไรไม่ได้เลย
 *   และคนกลุ่มนี้เป็น "คนที่มีร่างอยู่" ซึ่งไม่ได้สุ่มมา จึงเทียบกับคนทั่วไปไม่ได้อยู่แล้ว
 *   → ใช้เป็นการปรับตามสถานะ (ทุกคนที่มีร่างเห็นเหมือนกัน) ไม่ใช่ arm ของการทดลอง
 *
 * PDPA: ร่างอยู่ใน localStorage ของเครื่องเขาเอง ไม่เคยขึ้น DB (ชื่อสินค้าที่พิมพ์เองก็ไม่ขึ้น)
 *   คอมโพเนนต์นี้อ่านจากเครื่องเขาอย่างเดียว ไม่ส่งอะไรเพิ่ม
 */

const baht = (n: number) => n.toLocaleString('th-TH', { maximumFractionDigits: 2 });

export default function ReturningGreeting({ onGetStarted }: { onGetStarted: () => void }) {
  const [dismissed, setDismissed] = useState(false);

  const draft = useMemo(() => readQuickDraft(), []);
  const result = useMemo(() => (draft ? quickCheck(draft.input) : null), [draft]);

  useEffect(() => {
    if (draft && result) track('returning_draft_shown', { verdict: verdictOf(result) });
  }, [draft, result]);

  if (!draft || !result || dismissed) return null;
  if (result.marginPerUnit == null || result.marginPct == null) return null;

  const v = verdictOf(result);
  const good = v === 'ok';
  const days = Math.max(
    0,
    Math.round((Date.now() - new Date(draft.at + 'T00:00:00').getTime()) / 86400000),
  );
  const when = days <= 0 ? 'วันนี้' : days === 1 ? 'เมื่อวาน' : `${days} วันก่อน`;

  return (
    <div
      data-sec="returning"
      style={{
        margin: '0 auto', maxWidth: 760, padding: '12px 16px',
        border: '1px solid rgba(34,211,238,.35)', borderRadius: 12,
        background: 'rgba(34,211,238,.07)',
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: '1 1 320px', minWidth: 0 }}>
        <div style={{ fontSize: 12.5, opacity: 0.75, marginBottom: 2 }}>
          👋 ยินดีต้อนรับกลับ — คุณกรอกไว้{when}
        </div>
        <div style={{ fontSize: 14.5, lineHeight: 1.7 }}>
          ราคา <b>{baht(draft.input.price ?? 0)}</b> ต้นทุน <b>{baht(draft.input.cost ?? 0)}</b> →{' '}
          กำไรต่อชิ้น <b>{baht(result.marginPerUnit)}</b> บาท ({Math.round(result.marginPct)}%)
          {!good && <span style={{ opacity: 0.85 }}> — ยังมีจุดที่ควรดูต่อ</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            track('returning_draft_continue', {});
            markLandingCta();
            onGetStarted();
          }}
          style={{
            background: '#22d3ee', color: '#042f2e', border: 0, borderRadius: 9,
            padding: '9px 16px', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          ดูต่อจากตรงนี้ →
        </button>
        <button
          onClick={() => { track('returning_draft_dismiss', {}); setDismissed(true); }}
          style={{
            background: 'transparent', color: 'inherit', border: '1px solid rgba(148,163,184,.4)',
            borderRadius: 9, padding: '9px 12px', fontSize: 13, cursor: 'pointer',
            fontFamily: 'inherit', opacity: 0.8,
          }}
        >
          เริ่มใหม่
        </button>
      </div>
    </div>
  );
}
