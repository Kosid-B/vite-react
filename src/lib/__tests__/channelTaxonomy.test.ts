import { describe, it, expect } from 'vitest';
import { SOURCE_PRESETS } from '../shortLinks';
import { G_CHANNELS, type GChannelId } from '../growthEconomics';
import { resolveChannel, channelFromReferrer } from '../attribution';
import { UTM_PRESETS } from '../utmBuilder';

/* สัญญาระหว่าง "ช่องทางที่เราติดแท็ก" กับ "ช่องทางที่ระบบนับได้"
 *
 * ทำไมต้องมี (บั๊กจริง พบ 19 ส.ค. 2569 ตอนเจ้าของถามว่า customer channel วางไว้แบบไหน):
 *   เรามี taxonomy 3 ชุดที่ไม่ตรงกัน —
 *     SOURCE_PRESETS (?s= ในลิงก์) · GChannelId (unit economics) · refKind (funnel)
 *   ผลจริงที่วัดได้:
 *     • `?s=tt` / `?s=ttc` (TikTok — แพลตฟอร์ม reach สูงสุด 15,900 วิว) → ตกเป็น 'other'
 *     • `?s=ig` (Instagram) · `?s=li` (LinkedIn) → ตกเป็น 'other'
 *     • `?s=qr` (ออฟไลน์) → **ถูกนับเป็น LINE** เพราะ "off·line·" มีคำว่า "line" อยู่ข้างใน
 *   ⇒ ติดแท็กอย่างดีแล้วระบบโยนทิ้ง = ลงแรงแล้วไม่ได้เรียนรู้
 */

describe('ช่องทางลูกค้า — ทุกแพลตฟอร์มที่เราติดแท็ก ต้องมีช่องทางรองรับ', () => {
  const ids = new Set<GChannelId>(G_CHANNELS.map((c) => c.id));

  it.each(Object.entries(SOURCE_PRESETS))('?s=%s → ต้องไม่ตกเป็น "อื่นๆ"', (key, preset) => {
    const ch = resolveChannel({ source: preset.source, medium: preset.medium, campaign: 'pricing' });
    expect(ch, `?s=${key} (${preset.source}) ตกเป็น 'other' — ติดแท็กแล้วแต่ระบบนับไม่ได้`).not.toBe('other');
    expect(ids.has(ch), `${ch} ไม่มีใน G_CHANNELS`).toBe(true);
  });

  it('ออฟไลน์/QR ต้องไม่ถูกนับเป็น LINE (คำว่า off·line· มี "line" อยู่ข้างใน)', () => {
    expect(resolveChannel({ source: 'offline', medium: 'qr' })).toBe('offline');
  });

  it('TikTok ต้องแยกออกมาเป็นช่องทางของตัวเอง — เป็นแพลตฟอร์มที่ reach สูงสุด', () => {
    expect(resolveChannel({ source: 'tiktok', medium: 'bio' })).toBe('tiktok');
    expect(resolveChannel({ source: 'tiktok', medium: 'comment' })).toBe('tiktok');
    expect(channelFromReferrer('https://www.tiktok.com/@x')).toBe('tiktok');
  });

  it('ทุกช่องทางต้องมี UTM preset (ไม่งั้นสร้างลิงก์ให้ช่องนั้นไม่ได้)', () => {
    for (const c of G_CHANNELS) {
      expect(UTM_PRESETS[c.id], `ไม่มี UTM preset ของ ${c.id}`).toBeDefined();
    }
  });

  it('UTM preset ที่ติดแท็กได้ ต้อง resolve กลับเป็นช่องทางเดิม (ไป-กลับต้องตรงกัน)', () => {
    for (const c of G_CHANNELS) {
      const p = UTM_PRESETS[c.id];
      if (!p.taggable || !p.source) continue;   // seo/other ไม่ต้องติด utm
      expect(resolveChannel({ source: p.source, medium: p.medium }), `${c.id} ไป-กลับไม่ตรง`).toBe(c.id);
    }
  });

  it('ห้ามมีช่องทางซ้ำ และ id ต้องไม่ว่าง', () => {
    const list = G_CHANNELS.map((c) => c.id);
    expect(new Set(list).size).toBe(list.length);
    expect(list.every((id) => id.length > 0)).toBe(true);
  });
});
