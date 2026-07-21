import type { CSSProperties } from 'react';

/* ===== รวมลิงก์เอกสารทางกฎหมาย (source เดียว ใช้ทุก footer) =====
 * แก้ที่นี่ที่เดียว → อัปเดตทุกหน้า (แลนดิ้ง/แอป/ล็อกอิน ฯลฯ)
 * ทุกลิงก์ชี้หน้า /legal (สาธารณะ) พร้อม anchor ของแต่ละส่วน */

export const LEGAL_LINKS: { href: string; label: string }[] = [
  { href: '/pricing', label: 'สินค้าและราคา' },
  { href: '/legal#company', label: 'ข้อมูลบริษัท' },
  { href: '/legal#privacy', label: 'ความเป็นส่วนตัว' },
  { href: '/legal#cookies', label: 'คุกกี้' },
  { href: '/legal#refund', label: 'การคืนเงิน' },
  { href: '/legal#terms', label: 'ข้อกำหนด' },
];

export default function LegalLinks({
  className,
  linkClassName,
  style,
  linkStyle,
  sep = ' · ',
}: {
  className?: string;
  linkClassName?: string;
  style?: CSSProperties;
  linkStyle?: CSSProperties;
  sep?: string;
}) {
  return (
    <span className={className} style={style}>
      {LEGAL_LINKS.map((l, i) => (
        <span key={l.href}>
          {i > 0 && <span aria-hidden="true">{sep}</span>}
          <a href={l.href} className={linkClassName} style={linkStyle}>{l.label}</a>
        </span>
      ))}
    </span>
  );
}
