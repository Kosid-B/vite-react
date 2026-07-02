import { useState } from 'react';
import { DBD_SECTORS } from '../data/dbd';

const CUSTOM = '__custom__';

interface Props {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

/** Dropdown เลือกประเภทธุรกิจตามหมวด DBD (TSIC) + ช่องกำหนดเอง
 *  ใช้ <select> จริงแทน <datalist> เพราะ datalist ไม่แสดง dropdown บน iOS Safari */
export default function DBDSelect({ value, onChange, className, style }: Props) {
  const isKnown = DBD_SECTORS.some(s => s.items.some(item => `[${s.code}] ${item}` === value));
  const [custom, setCustom] = useState(() => !!value && !isKnown);

  return (
    <div className="dbd-select" style={style}>
      <select
        className={className}
        value={custom ? CUSTOM : (isKnown ? value : '')}
        onChange={e => {
          if (e.target.value === CUSTOM) {
            setCustom(true);
          } else {
            setCustom(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="" disabled>— เลือกประเภทธุรกิจ (DBD) —</option>
        {DBD_SECTORS.map(s => (
          <optgroup key={s.code} label={`หมวด ${s.code} · ${s.label}`}>
            {s.items.map(item => {
              const v = `[${s.code}] ${item}`;
              return <option key={v} value={v}>{item}</option>;
            })}
          </optgroup>
        ))}
        <option value={CUSTOM}>✏️ กำหนดเอง / ธุรกิจอื่นๆ…</option>
      </select>
      {custom && (
        <input
          className={className}
          type="text"
          defaultValue={isKnown ? '' : value}
          placeholder="ระบุประเภทธุรกิจของคุณ..."
          onBlur={e => { if (e.target.value.trim()) onChange(e.target.value.trim()); }}
        />
      )}
    </div>
  );
}
