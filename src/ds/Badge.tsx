import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'rust' | 'green' | 'blue' | 'amber';

export interface BadgeProps {
  /** โทนสีตามความหมาย (สถานะ/หมวด) */
  tone?: BadgeTone;
  children: ReactNode;
}

/** ป้ายสถานะ/หมวดหมู่ขนาดเล็ก */
export default function Badge({ tone = 'neutral', children }: BadgeProps) {
  return <span className={`ds-badge ds-badge--${tone}`}>{children}</span>;
}
