import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** padding ใหญ่ขึ้น */
  large?: boolean;
  /** ยกเงาเมื่อ hover */
  hover?: boolean;
  children: ReactNode;
}

/** กล่องเนื้อหาพื้นฐาน (พื้นขาว ขอบ เงานุ่ม) */
export default function Card({ large = false, hover = false, className = '', children, ...rest }: CardProps) {
  const cls = ['ds-card', large ? 'ds-card--pad-lg' : '', hover ? 'ds-card--hover' : '', className].filter(Boolean).join(' ');
  return <div className={cls} {...rest}>{children}</div>;
}
