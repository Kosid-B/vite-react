// landingTheme.ts — ธีมของหน้า Landing (เข้ม/มินิมอล) แบบ per-component palette ผ่าน React context
// Dark AI Marketing (UX): ให้ผู้ใช้เลือกโหมดที่อ่านสบายตา = ลด friction + เคารพความชอบ (personalization)
//
// context ถือแค่ ThemeId — แต่ละ component แม็ปเป็น palette ของตัวเอง (คงค่าธีมเข้มเดิมเป๊ะ)
// ค่าโทเคนสว่าง "canonical" ด้านล่างใช้ร่วมกันทุก component เพื่อให้มินิมอลดูเป็นชุดเดียวกัน

import { createContext, useContext } from 'react';
import type { ThemeId } from './theme';

/** context ธีมของ landing — ค่าเริ่มต้น 'dark' (component ที่อยู่นอก provider ยังทำงานปกติ) */
export const LandingThemeCtx = createContext<ThemeId>('dark');

/** hook อ่านธีมปัจจุบันของ landing (re-render อัตโนมัติเมื่อสลับ) */
export function useLandingTheme(): ThemeId {
  return useContext(LandingThemeCtx);
}

export function isLight(theme: ThemeId): boolean {
  return theme === 'minimal';
}

/** โทเคนสีสว่าง (มินิมอล) ที่ทุก component ใช้ร่วมกัน — คุมโทนให้เป็นชุดเดียว
 *  ผ่านเกณฑ์ contrast: ตัวอักษรหลัก #0f172a บนพื้น #f8fafc/#fff, ปุ่ม cyan/amber ใช้โทนเข้มพอ */
export const LIGHT = {
  page:    '#f8fafc',  // พื้นหน้าเว็บ
  panel:   '#ffffff',  // พื้นแผง/การ์ดหลัก
  card:    '#f1f5f9',  // การ์ดชั้นใน/พื้นลึก
  border:  '#e2e8f0',
  border2: '#cbd5e1',
  ink:     '#0f172a',  // ตัวอักษรหลัก (แทน 'white' ของธีมเข้ม)
  slate:   '#475569',  // ตัวอักษรรอง
  muted:   '#64748b',  // ตัวอักษรจาง
  cyan:    '#0891b2',  // ไซแอนสำหรับตัวอักษร/ไอคอนบนพื้นสว่าง (เข้มพอให้อ่านออก)
  cyanBtn: '#0e7490',  // พื้นปุ่มไซแอน (ตัวอักษรขาวอ่านออก ~4.7:1)
  amber:   '#f59e0b',  // แอมเบอร์แบรนด์ (ตัวอักษรเข้มบนปุ่ม)
  green:   '#16a34a',
  red:     '#dc2626',
  onAccent:'#052e2b',  // ตัวอักษรเข้มบนพื้น accent สว่าง
} as const;
