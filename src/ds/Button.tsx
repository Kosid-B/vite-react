import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** ลำดับความสำคัญทางสายตา */
  variant?: 'primary' | 'dark' | 'ghost';
  /** ขยายเต็มความกว้างคอนเทนเนอร์ */
  block?: boolean;
  children: ReactNode;
}

/** ปุ่มหลักของระบบ — primary (เน้นการกระทำหลัก), dark, ghost (รอง) */
export default function Button({ variant = 'primary', block = false, className = '', children, ...rest }: ButtonProps) {
  const cls = ['ds-btn', `ds-btn--${variant}`, block ? 'ds-btn--block' : '', className].filter(Boolean).join(' ');
  return <button className={cls} {...rest}>{children}</button>;
}
