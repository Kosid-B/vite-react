import { useState } from 'react';
import type { AppData } from '../types';
import { referralLink, REF_REWARD_CALLS } from '../lib/referral';
import { track } from '../lib/analytics';

/* FoundingInvite — ปุ่มชวนเพื่อน/แชร์ลิงก์ให้ง่ายในคลิกเดียว (LINE · แชร์ระบบ · คัดลอก)
 * ล็อกอินแล้ว → ลิงก์ referral ของตัวเอง (?ref=wsId เพื่อรับเครดิตเมื่อเพื่อนสมัคร) · ไม่ล็อกอิน → ลิงก์แคมเปญ founding */

const CAMPAIGN = 'https://ceoaithailand.org/?enter=guest&utm_source=share&utm_medium=app&utm_campaign=founding50';
const SHARE_TEXT = 'มาสร้างธุรกิจด้วย “ทีมผู้บริหาร AI” กัน! CEO AI Thailand ช่วยวางแผน หาลูกค้า เปิดร้าน และวางระบบให้พร้อมโต — ลองฟรี ไม่ต้องผูกบัตร';

export default function FoundingInvite({ wsId }: { data?: AppData; wsId: string | null }) {
  const [copied, setCopied] = useState(false);
  const link = wsId ? referralLink(wsId) : CAMPAIGN;
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  function lineShare() {
    track('invite_share', { via: 'line' });
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(SHARE_TEXT + '\n' + link)}`, '_blank', 'noopener');
  }
  function nativeShare() {
    track('invite_share', { via: 'native' });
    navigator.share?.({ title: 'CEO AI Thailand', text: SHARE_TEXT, url: link }).catch(() => { /* ผู้ใช้ยกเลิก */ });
  }
  function copy() {
    track('invite_share', { via: 'copy' });
    navigator.clipboard?.writeText(link).then(() => setCopied(true)).catch(() => setCopied(true));
  }

  const btn = (bg: string, color = '#fff'): React.CSSProperties => ({
    background: bg, color, border: 0, borderRadius: 9, padding: '10px 16px',
    fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit',
  });

  return (
    <div style={{ background: 'var(--cream2)', border: '1px solid var(--sand)', borderRadius: 'var(--r)', padding: '16px 18px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 18 }}>🎁</span>
        <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: 'var(--ink)' }}>ชวนเพื่อนมาเป็นสมาชิกกลุ่มแรก</h3>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink3)', margin: '0 0 12px', lineHeight: 1.6 }}>
        แชร์ลิงก์ให้เพื่อนลองใช้ฟรี — เพื่อนสมัครแพ็ก <strong style={{ color: 'var(--ink)' }}>ทั้งคู่ได้เครดิต AI คนละ {REF_REWARD_CALLS} ครั้ง</strong>
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 9, background: 'var(--cream)', border: '1px solid var(--sand)', marginBottom: 12 }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{link}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={lineShare} style={btn('#06C755')}>💬 แชร์ทาง LINE</button>
        {canNativeShare && <button onClick={nativeShare} style={btn('#06b6d4')}>📤 แชร์…</button>}
        <button onClick={copy} style={btn(copied ? '#16a34a' : 'transparent', copied ? '#fff' : 'var(--ink)')}>
          {copied ? '✓ คัดลอกแล้ว' : '🔗 คัดลอกลิงก์'}
        </button>
      </div>
    </div>
  );
}
