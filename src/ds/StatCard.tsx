import type { ReactNode } from 'react';

export interface StatCardProps {
  /** ตัวเลข/ค่าหลัก */
  value: ReactNode;
  /** คำอธิบายใต้ตัวเลข */
  label: string;
}

/** การ์ดสถิติ: ตัวเลขเด่น + ป้ายกำกับ */
export default function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="ds-stat">
      <div className="ds-stat__num">{value}</div>
      <div className="ds-stat__label">{label}</div>
    </div>
  );
}
