import { describe, it, expect } from 'vitest';
import { reachRow, reachRows, reachAdvice, MIN_VIEWS_FOR_RATE, type PlatformReach, routeCompare} from '../reachFunnel';

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

describe('คอมเมนต์ปักหมุด vs ไบโอ — อ่านผลจาก by_medium (0065)', () => {
  it('ยังน้อยเกินไป = ต้องบอกตรง ๆ ว่าเทียบไม่ได้ ห้ามประกาศผู้ชนะ', () => {
    const r = routeCompare('tiktok', { 'tiktok/comment': { total: 6 }, 'tiktok/bio': { total: 1 } });
    expect(r.ready).toBe(false);
    expect(r.message).toContain('ยังเทียบไม่ได้');
    // 6 เท่า 1 = ต่างกัน 6 เท่า แต่ห้ามพูดว่าใครชนะ
    expect(r.message).not.toContain('มากกว่า');
  });

  it('พอเทียบได้แล้ว บอกผู้ชนะพร้อมตัวเลขดิบทั้งสองฝั่ง', () => {
    const r = routeCompare('tiktok', { 'tiktok/comment': { total: 90 }, 'tiktok/bio': { total: 30 } });
    expect(r.ready).toBe(true);
    expect(r.message).toContain('คอมเมนต์ปักหมุด');
    expect(r.message).toContain('3 เท่า');
    expect(r.message).toContain('90');
    expect(r.message).toContain('30');
  });

  it('ไบโอชนะก็ต้องรายงานตามจริง — ไม่ใช่เขียนให้เข้าข้างสมมติฐานที่ตั้งไว้', () => {
    const r = routeCompare('tiktok', { 'tiktok/comment': { total: 20 }, 'tiktok/bio': { total: 40 } });
    expect(r.message).toContain('ลิงก์ในไบโอ');
  });

  it('แยกแพลตฟอร์มออกจากกัน — youtube/comment ต้องไม่ปนกับ tiktok/comment', () => {
    const by = { 'tiktok/comment': { total: 50 }, 'youtube/comment': { total: 99 }, 'tiktok/bio': { total: 25 } };
    expect(routeCompare('tiktok', by).comment).toBe(50);
    expect(routeCompare('youtube', by).comment).toBe(99);
    expect(routeCompare('youtube', by).bio).toBe(0);
  });

  it('ไม่มีข้อมูลเลย ต้องไม่พัง', () => {
    const r = routeCompare('tiktok', null);
    expect(r).toMatchObject({ comment: 0, bio: 0, ready: false });
  });
});
