import { useState } from 'react';
import { readTheme, nextTheme, setTheme, themeLabel, themeIcon, type ThemeId } from '../lib/theme';
import { track } from '../lib/analytics';
import { THEME } from '../config';

/* ThemeToggle — ปุ่มสลับธีม เข้ม ↔ มินิมอล (ในฟุตเตอร์ sidebar) */
export default function ThemeToggle() {
  const [t, setT] = useState<ThemeId>(() => readTheme());
  // สวิตช์ความปลอดภัย — ถ้าธีมสว่างมีจุดที่อ่านไม่ออกอีก ให้ปิดที่ config.THEME.inAppLive
  // (ปิดแล้วจะบังคับดึงคนที่ค้างอยู่ในธีมสว่างกลับธีมเข้มด้วย ไม่ใช่แค่ซ่อนปุ่ม — ดู App.tsx)
  if (!THEME.inAppLive) return null;
  const nxt = nextTheme(t);

  const toggle = () => {
    setTheme(nxt);
    setT(nxt);
    track('theme_changed', { theme: nxt });
  };

  return (
    <button className="btn-export" onClick={toggle} title={`สลับเป็นธีม “${themeLabel(nxt)}”`}>
      <span aria-hidden="true" style={{ fontSize: 14 }}>{themeIcon(t)}</span>
      ธีม: {themeLabel(t)} → {themeLabel(nxt)}
    </button>
  );
}
