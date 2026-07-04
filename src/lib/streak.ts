import type { AppData } from '../types';

/* ===== Streak รายวัน — ต่อเนื่องเมื่อ "ทำงานจริงในแอป" =====
 * นับเมื่อผู้ใช้แก้ไขข้อมูล (updateData) ครั้งแรกของแต่ละวัน — ต่อเนื่องถ้าวันติดกัน, รีเซ็ตถ้าขาดวัน */

const dayStr = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** อัปเดต streak ถ้าเป็นวันใหม่ — คืน AppData เดิมถ้านับวันนี้แล้ว (idempotent, ไม่ recurse) */
export function bumpStreak(d: AppData): AppData {
  const today = dayStr(Date.now());
  const s = d.streak;
  if (s?.lastDay === today) return d;                 // นับไปแล้ววันนี้
  const yesterday = dayStr(Date.now() - 86400000);
  const count = s && s.lastDay === yesterday ? s.count + 1 : 1;
  return { ...d, streak: { count, lastDay: today } };
}

export function streakCount(d: AppData): number {
  const s = d.streak;
  if (!s) return 0;
  const today = dayStr(Date.now());
  const yesterday = dayStr(Date.now() - 86400000);
  // ยังนับต่อเนื่องถ้าล่าสุดคือวันนี้/เมื่อวาน มิฉะนั้นถือว่าขาด (แสดง 0)
  return (s.lastDay === today || s.lastDay === yesterday) ? s.count : 0;
}
