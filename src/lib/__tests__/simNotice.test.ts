import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SIM_NOTICE, SIM_DEADLINE_ISO, simNoticeActive, simNoticeEndsAt } from '../simNotice';
import { SHORT_LINKS } from '../shortLinks';
import { violatesBrand } from '../brandBrief';
import { BLOG_POSTS } from '../blogData';

const file = (p: string) => readFileSync(resolve(__dirname, '../..', p), 'utf8');

describe('ประกาศชั่วคราว — ต้องหายเองเมื่อพ้นเส้นตาย', () => {
  const endsAt = simNoticeEndsAt();

  it('ยังแสดงอยู่ในวันสุดท้าย (ตามเวลาไทย ไม่ใช่ UTC)', () => {
    // 23:59 ของวันที่ 30 ส.ค. เวลาไทย = 16:59 UTC
    expect(simNoticeActive(Date.parse('2026-08-30T16:59:00Z'))).toBe(true);
  });

  it('🔴 หายทันทีเมื่อขึ้นวันใหม่ตามเวลาไทย', () => {
    expect(simNoticeActive(Date.parse('2026-08-30T17:00:01Z'))).toBe(false);
    expect(simNoticeActive(endsAt)).toBe(true);
    expect(simNoticeActive(endsAt + 1)).toBe(false);
  });

  it('🔴 ห้ามหายก่อนเวลา — ใช้ UTC จะตัดคนตั้งแต่ 5 โมงเย็นของวันสุดท้าย', () => {
    const utcMidnight = Date.parse(`${SIM_DEADLINE_ISO}T17:00:00Z`); // = เที่ยงคืนไทยของวันถัดไป
    expect(endsAt, 'หมดอายุเร็วกว่าสิ้นวันไทย').toBeGreaterThanOrEqual(utcMidnight - 1);
  });
});

describe('ข้อความบนแถบ', () => {
  const all = `${SIM_NOTICE.headline} ${SIM_NOTICE.sub}`;

  it('ต้องผ่านคำต้องห้ามของแบรนด์', () => {
    expect(violatesBrand(all), all).toEqual([]);
  });

  it('🔴 ต้องพาไป "ค่ายมือถือ" — เรื่องนี้เราทำแทนไม่ได้ และบทความก็บอกแบบนั้น', () => {
    expect(all).toMatch(/ค่ายมือถือ/);
    expect(all, 'ห้ามชวนให้มาทำกับเรา').not.toMatch(/สมัคร|เริ่มฟรี|ให้เราทำ/);
  });

  it('ต้องเป็นคำถามที่เจ้าของร้านตอบเองไม่ได้ ไม่ใช่คำแถลง', () => {
    expect(SIM_NOTICE.headline).toMatch(/\?/);
    expect(SIM_NOTICE.headline).toMatch(/คุณ/);
  });

  it('ต้องบอกเส้นตายให้ตรงกับค่าคงที่ (แก้วันแล้วลืมแก้ข้อความ = แดง)', () => {
    const day = Number(SIM_DEADLINE_ISO.slice(8, 10));
    expect(SIM_NOTICE.headline).toContain(String(day));
  });
});

describe('🔴 สัญญาคอนเทนต์ — ลิงก์ต้องมีจริง และปลายทางต้องมีของที่สัญญา', () => {
  it('ลิงก์ที่ใช้ต้องเป็นลิงก์สั้นที่มีอยู่จริง', () => {
    expect(SHORT_LINKS[SIM_NOTICE.href], `ไม่มี ${SIM_NOTICE.href} ใน SHORT_LINKS`).toBeTruthy();
  });

  it('ปลายทางต้องเป็นบทความที่มีอยู่จริง', () => {
    const path = SHORT_LINKS[SIM_NOTICE.href].path;          // /blog/<slug>
    const slug = path.replace('/blog/', '');
    expect(BLOG_POSTS.some((p) => p.slug === slug), `ไม่มีบทความ ${slug}`).toBe(true);
  });

  it('🔴 บทความต้องตอบทั้งสองข้อที่แถบสัญญาไว้ — ปลายทางที่ไม่มีของจริง แย่กว่าไม่มีลิงก์', () => {
    const slug = SHORT_LINKS[SIM_NOTICE.href].path.replace('/blog/', '');
    const post = BLOG_POSTS.find((p) => p.slug === slug)!;
    const body = JSON.stringify(post);
    expect(body, 'บทความไม่ได้พูดถึง "เบอร์ลงทะเบียนในชื่อใคร"').toMatch(/ลงทะเบียนในชื่อ/);
    expect(body, 'บทความไม่ได้บอกว่าต้องทำผ่านค่ายมือถือ').toMatch(/ค่ายมือถือ/);
    expect(body, 'บทความไม่ได้ระบุเส้นตาย').toMatch(/30 สิงหาคม/);
  });
});

describe('การวางบนหน้า Landing ต้องไม่ทำลายกฎที่มีอยู่', () => {
  const landing = file('pages/LandingPage.tsx');

  it('ถูกวางเหนือ hero จริง', () => {
    const i = landing.indexOf('<SimNotice');
    const h = landing.indexOf('data-sec="hero"');
    expect(i, 'ไม่ได้ถูกวางบนหน้า Landing').toBeGreaterThan(-1);
    expect(i, 'ต้องอยู่เหนือ hero').toBeLessThan(h);
  });

  it('🔴 ต้องไม่ติด data-sec — ไม่งั้นจะไปแทรกจังหวะอารมณ์และลำดับจอแรก', () => {
    expect(file('components/SimNotice.tsx')).not.toMatch(/data-sec/);
  });

  it('🔴 ต้องคืน null เมื่อพ้นเส้นตาย — พื้นที่จอแรกต้องได้คืนเองโดยไม่ต้องรอใครจำ', () => {
    expect(file('components/SimNotice.tsx')).toMatch(/if \(!active\) return null;/);
  });

  /* 🔴 รีโปนี้มีระบบธีม **สองระบบ** และเลือกผิดระบบ = สีไม่พลิกโดยไม่มีใครรู้
   *    · หน้า Landing → React context (`useLandingTheme`)
   *    · ทั้งระบบ     → `data-theme` บน <html> + โทเคน CSS
   *    วัดจริง 27 ส.ค. 2569: แถบนี้ใช้โทเคน CSS แล้วได้ contrast **1.02** ในโหมดมินิมอลของหน้า Landing
   *    (ตัวหนังสือพลิกเป็นเข้ม แต่พื้นหลังของหน้าไม่พลิกตาม) */
  it('🔴 คอมโพเนนต์ของหน้า Landing ต้องรับสีจาก useLandingTheme ไม่ใช่โทเคน CSS', () => {
    const c = file('components/SimNotice.tsx');
    expect(c, 'ไม่ได้ใช้ธีมของหน้า Landing').toMatch(/useLandingTheme/);
    expect(c, 'มีคู่สีสำหรับโหมดสว่างไหม').toMatch(/LIGHT_C/);
    // ห้ามกลับไปกำหนดสีด้วยโทเคนทั่วระบบใน style ของคอมโพเนนต์นี้
    expect(c.match(/color:\s*'var\(--/g), 'กลับไปใช้โทเคน CSS ซึ่งไม่พลิกตามธีมของหน้านี้').toBeNull();
  });
});
