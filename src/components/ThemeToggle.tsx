import { useState } from 'react';
import { readTheme, nextTheme, setTheme, themeLabel, themeIcon, type ThemeId } from '../lib/theme';
import { track } from '../lib/analytics';
import { THEME } from '../config';

/* ThemeToggle — ปุ่มสลับธีม เข้ม ↔ มินิมอล (ในฟุตเตอร์ sidebar) */
export default function ThemeToggle() {
  const [t, setT] = useState<ThemeId>(() => readTheme());
  // 🔴 ธีมมินิมอลยังไม่เสร็จสำหรับหน้าในแอป (41 จุดมองไม่เห็นเลย · ดู config.THEME)
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
