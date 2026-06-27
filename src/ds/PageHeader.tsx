import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** ชื่อหน้า */
  title: string;
  /** แถวข้อมูลย่อย (ป้าย/ชิป) ใต้ชื่อ */
  meta?: ReactNode;
}

/** หัวหน้าเพจ: ชื่อใหญ่ + แถว meta */
export default function PageHeader({ title, meta }: PageHeaderProps) {
  return (
    <div className="ds-pagehd">
      <div className="ds-pagehd__title">{title}</div>
      {meta && <div className="ds-pagehd__meta">{meta}</div>}
    </div>
  );
}
