import type { ReactNode } from 'react';

export interface ChipProps {
  /** สถานะถูกเลือก */
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

/** ชิปแบบกดเลือก (ฟิลเตอร์/แท็บ) */
export default function Chip({ active = false, onClick, children }: ChipProps) {
  return (
    <button className={`ds-chip${active ? ' ds-chip--active' : ''}`} onClick={onClick}>{children}</button>
  );
}
