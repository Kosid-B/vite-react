import { describe, it, expect } from 'vitest';
import { reachRow, reachRows, reachAdvice, MIN_VIEWS_FOR_RATE, type PlatformReach } from '../reachFunnel';

const tt = (o: Partial<PlatformReach> = {}): PlatformReach => ({
  platform: 'tiktok', label: 'TikTok', views: 15900, profileVisits: 11,
  arrivals: 0, linkPlacement: 'bio', ...o,
});

describe('reachFunnel — ตัวเลขจริง 16 ส.ค. 2569: 15,900 วิว → เข้าโปรไฟล์ 11 คน', () => {
  it('จับได้ว่าเพดานอยู่ที่ขั้น "เข้าโปรไฟล์" ไม่ใช่ที่คอนเทนต์', () => {
    const r = reachRow(tt());
    expect(r.ceiling).toBe('to_profile');
    expect(r.ceilingCount).toBe(11);
    expect(r.toProfilePct).toBeCloseTo(0.07, 2);
    expect(r.verdict).toContain('ทำคลิปให้ดังขึ้นไม่ช่วย');
  });

  it('คำแนะนำต้องบอกจำนวนคนที่ "ไม่มีทางกดถึงเราได้เลย"', () => {
    const a = reachAdvice(reachRows([tt()]));
    expect(a).toContain('15,889'); // 15900 - 11
    expect(a).toContain('คอมเมนต์');
  });

  it('ย้ายลิงก์ไปคอมเมนต์แล้ว = ไม่ติดเพดานโปรไฟล์อีก', () => {
    const r = reachRow(tt({ linkPlacement: 'comment', profileVisits: null, arrivals: 60 }));
    expect(r.ceiling).toBe('none');
    expect(r.passThroughPct).toBeCloseTo(0.38, 2);
  });

  it('มีคนเห็นเยอะแต่ไม่มีใครมาถึงเว็บ = ปัญหา "เห็นแล้วไม่กด" ไม่ใช่ "ไม่มีคนเห็น"', () => {
    const r = reachRow(tt({ linkPlacement: 'comment', profileVisits: null, arrivals: 0 }));
    expect(r.ceiling).toBe('to_click');
    expect(r.verdict).toContain('เห็นแล้วไม่กด');
  });

  it('วิวน้อยเกินไป ต้องไม่ฟันธงว่าคอนเทนต์แย่', () => {
    const r = reachRow(tt({ views: MIN_VIEWS_FOR_RATE - 1, profileVisits: 0, arrivals: 0 }));
    expect(r.ceiling).toBe('to_view');
    expect(r.verdict).toContain('ยังไม่มีคนเห็น');
  });

  it('เข้าโปรไฟล์เยอะแต่ไม่กดลิงก์ต่อ = ไบโอไม่ชวนกด (คนละคอขวด)', () => {
    const r = reachRow(tt({ views: 1000, profileVisits: 200, arrivals: 10 }));
    expect(r.ceiling).toBe('to_click');
    expect(r.verdict).toContain('ไบโอ');
  });

  it('เรียงตามวิว และแนะนำจากคอขวด ไม่ใช่จากแพลตฟอร์มที่วิวเยอะสุด', () => {
    const rows = reachRows([
      tt({ platform: 'yt', label: 'YouTube', views: 942, profileVisits: null, arrivals: 4, linkPlacement: 'comment' }),
      tt(),
    ]);
    expect(rows[0].label).toBe('TikTok');           // เรียงตามวิว
    expect(reachAdvice(rows)).toContain('TikTok');  // แต่คำแนะนำมาจากคอขวด
  });

  it('ไม่มีข้อมูลต้องบอกตรง ๆ ไม่ใช่แต่งคำแนะนำ', () => {
    expect(reachAdvice([])).toContain('ยังไม่มีข้อมูล');
  });

  it('หารศูนย์ / ค่าประหลาด ต้องไม่ throw', () => {
    expect(() => reachRow(tt({ views: 0, profileVisits: 0, arrivals: 0 }))).not.toThrow();
    expect(reachRow(tt({ views: 0, profileVisits: 0, arrivals: 0 })).passThroughPct).toBe(0);
  });
});
