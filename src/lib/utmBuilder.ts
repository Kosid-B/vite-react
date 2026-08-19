// utmBuilder.ts — สร้างลิงก์ติด utm ให้ตรงกับช่องทางลูกค้าทั้งหมดของ Growth Dashboard
// ค่า utm ถูกออกแบบให้ resolve กลับเป็นช่องทางเดิมได้ (ตรงกับ attribution.channelFromUtm) · pure + tested
import type { GChannelId } from './growthEconomics';

export interface UtmPreset { source: string; medium: string; taggable: boolean; note?: string }

// source/medium ที่จับคู่กับ attribution.channelFromUtm ให้ลงช่องถูกต้อง
export const UTM_PRESETS: Record<GChannelId, UtmPreset> = {
  youtube: { source: 'youtube', medium: 'video', taggable: true },
  tiktok: { source: 'tiktok', medium: 'bio', taggable: true },
  fb_group: { source: 'facebook', medium: 'group', taggable: true },
  instagram: { source: 'instagram', medium: 'story', taggable: true },
  line: { source: 'line', medium: 'broadcast', taggable: true },
  linkedin: { source: 'linkedin', medium: 'social', taggable: true },
  offline: { source: 'offline', medium: 'qr', taggable: true, note: 'QR บนสื่อสิ่งพิมพ์/นามบัตร' },
  word_of_mouth: { source: 'referral', medium: 'word_of_mouth', taggable: true },
  other: { source: '', medium: 'referral', taggable: true, note: 'กำหนด source เอง' },
  seo: { source: '', medium: '', taggable: false, note: 'SEO/Organic ไม่ต้องติด utm — Google จับให้เอง' },
};

export interface UtmParams { source?: string; medium?: string; campaign?: string }

/** สร้าง URL ติด utm (ข้ามค่าที่ว่าง · encode ค่าให้ปลอดภัย) */
export function buildUtmUrl(base: string, p: UtmParams): string {
  const b = (base ?? '').trim();
  const parts: string[] = [];
  const add = (k: string, v?: string) => { const val = (v ?? '').trim(); if (val) parts.push(`${k}=${encodeURIComponent(val)}`); };
  add('utm_source', p.source);
  add('utm_medium', p.medium);
  add('utm_campaign', p.campaign);
  if (parts.length === 0) return b;
  const sep = b.includes('?') ? '&' : '?';
  return b + sep + parts.join('&');
}

export function presetFor(ch: GChannelId): UtmPreset {
  return UTM_PRESETS[ch];
}
