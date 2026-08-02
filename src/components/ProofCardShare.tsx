import { useMemo, useState } from 'react';
import type { AppData } from '../types';
import { proofCardSvg } from '../lib/proofCard';
import { closedDealCount } from '../lib/ahaShare';
import { referralLink } from '../lib/referral';
import { track } from '../lib/analytics';

/* ProofCardShare — Viral Loop เฟส B: การ์ดผลงานแชร์ลง social ได้ 1 คลิก (social proof + curiosity)
 * ดึงสถิติจริง (ดีลปิด/งานเสร็จ/เอเจนต์) → SVG เข้าธีม + brand + ลิงก์ชวน · ดาวน์โหลด PNG / คัดลอกลิงก์ */

function pickStat(data: AppData): { value: string; label: string; sub?: string } {
  const deals = closedDealCount(data);
  if (deals > 0) return { value: String(deals), label: 'ดีลปิดแล้ว', sub: 'ธุรกิจกำลังเดินหน้า 🚀' };
  const done = (data.aiCompany?.tasks ?? []).filter(t => t.status === 'done').length;
  if (done > 0) return { value: String(done), label: 'งานที่ทีม AI ทำเสร็จ', sub: 'ทีม AI ทำงานให้ 24 ชม.' };
  const agents = data.aiCompany?.agents?.length ?? 0;
  if (agents > 0) return { value: String(agents), label: 'เอเจนต์ AI ในทีม', sub: 'ผู้บริหาร AI พร้อมลุย' };
  return { value: '1', label: 'บริษัท AI พร้อมลุย', sub: 'เริ่มสร้างธุรกิจด้วย AI' };
}

function downloadPng(svg: string, filename: string) {
  try {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200; canvas.height = 630;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, 1200, 630);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(b => {
          if (!b) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(b); a.download = filename; a.click();
          URL.revokeObjectURL(a.href);
        }, 'image/png');
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  } catch { /* browser ไม่รองรับ — ผู้ใช้ยังคัดลอกลิงก์ได้ */ }
}

export default function ProofCardShare({ data, wsId }: { data: AppData; wsId: string | null }) {
  const [copied, setCopied] = useState(false);
  const company = (data.aiCompany?.name || 'บริษัท AI ของฉัน').trim();
  const stat = useMemo(() => pickStat(data), [data]);
  const svg = useMemo(() => proofCardSvg({ companyName: company, statValue: stat.value, statLabel: stat.label, subline: stat.sub, url: 'ceoaithailand.org' }), [company, stat]);
  const link = referralLink(wsId ?? undefined);

  function copy() {
    track('proofcard_shared', { via: 'copy_link' });
    navigator.clipboard?.writeText(link).then(() => setCopied(true)).catch(() => setCopied(true));
  }
  function png() {
    track('proofcard_shared', { via: 'download_png' });
    downloadPng(svg, `proof-${company.replace(/\s+/g, '-').slice(0, 24) || 'company'}.png`);
  }

  return (
    <div style={{ background: 'var(--cream2)', border: '1px solid var(--sand)', borderRadius: 'var(--r)', padding: '18px 20px', marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 18 }}>📣</span>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>แชร์การ์ดผลงาน — อวดความคืบหน้า</h3>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink3)', margin: '0 0 14px', lineHeight: 1.6 }}>
        การ์ดผลงานบริษัท AI ของคุณ — ดาวน์โหลดโพสต์ลง social ได้เลย (มีลิงก์ชวนเพื่อนในตัว · เพื่อนสมัคร = <strong style={{ color: 'var(--ink)' }}>ทั้งคู่ได้เครดิต AI</strong>)
      </p>

      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--sand)', maxWidth: 560 }}
        dangerouslySetInnerHTML={{ __html: svg.replace('width="1200" height="630"', 'width="100%" height="auto"') }} />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        <button onClick={png} style={{ background: '#06b6d4', color: '#fff', border: 0, borderRadius: 9, padding: '10px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>
          ⬇️ ดาวน์โหลดรูป (PNG)
        </button>
        <button onClick={copy} style={{ background: copied ? '#16a34a' : 'transparent', color: copied ? '#fff' : 'var(--ink)', border: '1px solid var(--sand)', borderRadius: 9, padding: '10px 16px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>
          {copied ? '✓ คัดลอกลิงก์ชวนเพื่อนแล้ว' : '🔗 คัดลอกลิงก์ชวนเพื่อน'}
        </button>
      </div>
    </div>
  );
}
