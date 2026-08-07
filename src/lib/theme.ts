// theme.ts — สลับธีม UI: 'dark' (ค่าเริ่มต้น) / 'minimal' (สว่าง มินิมอล)
// ตั้งค่าผ่าน data-theme บน <html> → override CSS variables ใน index.css
// เก็บใน localStorage (ค่าตั้งค่าอุปกรณ์ ไม่ใช่ข้อมูลธุรกิจ) · ส่วน pure = tested

export type ThemeId = 'dark' | 'minimal';

export const THEMES: { id: ThemeId; label: string; icon: string }[] = [
  { id: 'dark', label: 'เข้ม', icon: '🌙' },
  { id: 'minimal', label: 'มินิมอล', icon: '☀️' },
];

const KEY = 'ceoai_theme';

/** รับค่าที่ไม่แน่นอน → ThemeId ที่ถูกต้อง (default 'dark') */
export function normalizeTheme(v: unknown): ThemeId {
  return v === 'minimal' ? 'minimal' : 'dark';
}

/** สลับไปธีมถัดไป */
export function nextTheme(t: ThemeId): ThemeId {
  return t === 'dark' ? 'minimal' : 'dark';
}

export function themeLabel(t: ThemeId): string {
  return THEMES.find(x => x.id === t)?.label ?? 'เข้ม';
}
export function themeIcon(t: ThemeId): string {
  return THEMES.find(x => x.id === t)?.icon ?? '🌙';
}

/** อ่านธีมที่บันทึกไว้ */
export function readTheme(): ThemeId {
  try { return normalizeTheme(localStorage.getItem(KEY)); } catch { return 'dark'; }
}

export function saveTheme(t: ThemeId): void {
  try { localStorage.setItem(KEY, t); } catch { /* empty */ }
}

/** ตั้ง data-theme บน <html> (dark = ไม่มี attribute ใช้ :root ปกติ) */
export function applyTheme(t: ThemeId): void {
  try {
    const el = document.documentElement;
    if (t === 'minimal') el.setAttribute('data-theme', 'minimal');
    else el.removeAttribute('data-theme');
  } catch { /* empty (SSR/worker) */ }
}

/** บันทึก + ปรับใช้ทันที */
export function setTheme(t: ThemeId): void {
  saveTheme(t);
  applyTheme(t);
}
