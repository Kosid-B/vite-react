import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  CEF_SCHEMA, CEF_SINKS, EVENT_MAP, NOT_SENT_YET, SENT_DIRECT,
  cefIssues, cefToOs, osEventFor, sinksFor, toCef,
} from '../eventFormat';
import { OS_SAFE_EVENTS } from '../osCodec';

const SRC = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(SRC, '..', rel), 'utf8');
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== '__tests__') walk(p, out); }
    else if (/\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}
const allSrc = walk(SRC).map((f) => code(readFileSync(f, 'utf8'))).join('\n');

/** ชื่อ event ที่ `track()` ยิงจริงทั้งรีโป — ดึงจากโค้ด ไม่ใช่รายการที่เขียนไว้ */
const tracked = new Set(
  [...allSrc.matchAll(/\btrack\(\s*'([a-z0-9_]+)'/g)].map((m) => m[1]),
);

describe('① CEF — รูปแบบกลางต้องตรวจตัวเองได้', () => {
  const rec = () => toCef({ name: 'quickcheck_submitted', session: 's-1', now: () => '2026-11-20T00:00:00.000Z' });

  it('สร้างแล้วได้ schema ที่ประกาศ และ source ปริยาย = browser', () => {
    const r = rec();
    expect(r.schema).toBe(CEF_SCHEMA);
    expect(r.source).toBe('browser');
    expect(cefIssues(r)).toEqual([]);
  });

  it('เรกคอร์ดฝั่งเซิร์ฟเวอร์ต้องประกาศตัวเองได้ (ADR-0007 พึ่งข้อนี้)', () => {
    const r = toCef({ name: 'purchase_completed', session: 's-1', source: 'server' });
    expect(r.source).toBe('server');
    expect(cefIssues(r)).toEqual([]);
  });

  it.each([
    ['schema ผิด', { schema: 'cef/999' }, /schema/],
    ['name ว่าง', { name: '  ' }, /name/],
    ['session ว่าง', { session: '' }, /session/],
    ['source ผิด', { source: 'guess' }, /source/],
    ['occurredAt ไม่ใช่เวลา', { occurredAt: 'เมื่อวาน' }, /occurredAt/],
    ['props ไม่ใช่อ็อบเจกต์', { props: 'x' }, /props/],
  ])('%s = ถูกปฏิเสธ', (_label, patch, re) => {
    expect(cefIssues({ ...rec(), ...patch }).join(' ')).toMatch(re);
  });

  it('ของที่ไม่ใช่อ็อบเจกต์ไม่ทำให้โยน error', () => {
    for (const v of [null, undefined, 3, 'x', []]) expect(cefIssues(v).length).toBeGreaterThan(0);
  });
});

describe('② sinksFor — ตอบคำถามที่เมื่อก่อนตอบไม่ได้: "event นี้ไปถึงไหน"', () => {
  it('ทุก event ไป GA + Amplitude เสมอ (เพราะ track() ส่งทุกตัว)', () => {
    for (const n of ['quickcheck_submitted', 'city_viewed', 'ชื่อที่ไม่มีจริง']) {
      expect(sinksFor(n)).toContain('ga4');
      expect(sinksFor(n)).toContain('amplitude');
    }
  });

  it('ไป Marketing OS เฉพาะที่แมปไว้', () => {
    expect(sinksFor('quickcheck_submitted')).toContain('marketing_os');
    expect(sinksFor('city_viewed')).not.toContain('marketing_os');
  });

  it('🔴 sinksFor ห้ามอ้างปลายทางที่โค้ดไม่ได้เรียก — อ่าน analytics.ts ตัวจริง', () => {
    const a = code(read('src/lib/analytics.ts'));
    // GA + Amplitude ถูกเรียกแบบไม่มีเงื่อนไขของ event (จึงอ้างว่า "ทุกตัว" ได้)
    expect(a).toMatch(/window\.gtag\?\.\('event', event/);
    expect(a).toMatch(/sendAmplitude\(event/);
    // OS ถูกเรียกใต้เงื่อนไข (จึงอ้างว่า "เฉพาะที่แมป" ได้)
    expect(a).toMatch(/if \(osEvent\) sendOsEvent\(/);
    expect(CEF_SINKS).toEqual(['ga4', 'amplitude', 'marketing_os']);
  });

  it('⚠️ landing_funnel ห้ามถูกนับเป็น sink ของ event (เป็นตารางสถานะ คนละทาง)', () => {
    expect([...CEF_SINKS]).not.toContain('landing_funnel');
    expect(read('src/lib/eventFormat.ts')).toMatch(/landing_funnel.*ไม่ใช่ sink/s);
  });
});

describe('③ แปลงออก — CEF → payload ของ Marketing OS', () => {
  it('ชื่อของเราถูกแปลงเป็นคำศัพท์ของเขา', () => {
    const out = cefToOs(toCef({ name: 'quickcheck_submitted', session: 's-9' }));
    expect(out?.eventName).toBe('calculator_complete');
    expect(out?.sessionId).toBe('s-9');
  });

  it('seg / utm / pagePath เดินทางถึงปลายทาง (ไม่ตกกลางทางเหมือน GOTCHA #6)', () => {
    const out = cefToOs(toCef({
      name: 'landing_cta_click',
      session: 's-1',
      context: { seg: 'owner', pagePath: '/', utm: { utm_source: 'facebook', utm_medium: 'post' } },
    }));
    expect(out?.segmentCode).toBe('owner');
    expect(out?.pagePath).toBe('/');
    expect(out?.utmSource).toBe('facebook');
    expect(out?.utmMedium).toBe('post');
  });

  it('ชื่อที่ไม่ได้แมป = null (ไม่ส่ง ไม่ใช่ส่งชื่อมั่ว)', () => {
    expect(cefToOs(toCef({ name: 'city_viewed', session: 's-1' }))).toBeNull();
  });

  it('เรกคอร์ดที่ใช้ไม่ได้ = null', () => {
    const bad = { ...toCef({ name: 'quickcheck_submitted', session: 's-1' }), schema: 'cef/0' };
    expect(cefToOs(bad)).toBeNull();
  });

  it('🔴 คีย์ PII ยังถูกตัดเมื่อผ่านชั้นนี้ (ชั้นกลางห้ามกลายเป็นทางอ้อมของกฎ)', () => {
    const out = cefToOs(toCef({
      name: 'quickcheck_submitted',
      session: 's-1',
      props: { customer_phone: '0812345678', biz: 'food' },
    }));
    expect(out?.properties).toEqual({ biz: 'food' });
  });

  it('ทุกชื่อปลายทางใน EVENT_MAP ต้องเป็น event ที่ OS รับจริง', () => {
    for (const v of Object.values(EVENT_MAP)) expect(OS_SAFE_EVENTS).toContain(v);
    for (const k of Object.keys(SENT_DIRECT)) expect(OS_SAFE_EVENTS).toContain(k);
  });
});

describe('④ ถูกเรียกใช้จริงไหม — ชั้นกลางที่ข้ามได้ ไม่ใช่มาตรฐาน', () => {
  it('🔴 สายส่งต้องประกอบ payload ผ่าน CEF ห้ามเรียก encodeOsEvent ตรง', () => {
    const c = code(read('src/lib/marketingOs.ts'));
    expect(c).toMatch(/cefToOs\(toCef\(/);
    expect(c, 'ข้าม CEF ไปประกอบเองไม่ได้').not.toMatch(/encodeOsEvent\(/);
  });

  it('eventFormat ต้อง pure (ไม่มี fetch/storage/env)', () => {
    const c = code(read('src/lib/eventFormat.ts'));
    expect(c).not.toMatch(/\bfetch\s*\(/);
    expect(c).not.toMatch(/localStorage|sessionStorage/);
    expect(c).not.toMatch(/import\.meta\.env/);
  });

  it('ทุกคีย์ใน EVENT_MAP ต้องมี track() จริงในโค้ด (ห้ามแมปชื่อที่ไม่มีใครยิง)', () => {
    const ghosts = Object.keys(EVENT_MAP).filter((k) => !tracked.has(k));
    expect(ghosts, `แมปชื่อที่ไม่มีใครยิง: ${ghosts.join(', ')}`).toEqual([]);
  });

  it('ชื่อใน SENT_DIRECT ต้องมี sendOsEvent จริง', () => {
    for (const k of Object.keys(SENT_DIRECT)) {
      expect(allSrc, `${k} ประกาศว่าส่งตรง แต่ไม่มีใครเรียก`).toMatch(new RegExp(`sendOsEvent\\(\\s*'${k}'`));
    }
  });

  it('safe event ทุกตัวต้องถูกส่ง หรือมีเหตุผลว่าทำไมยังไม่ส่ง', () => {
    const sent = new Set<string>([...Object.values(EVENT_MAP), ...Object.keys(SENT_DIRECT)]);
    const unexplained = OS_SAFE_EVENTS.filter((e) => !sent.has(e) && !NOT_SENT_YET[e]);
    expect(unexplained).toEqual([]);
  });
});

describe('⑤ ตัวเลขที่เอกสารอ้าง ต้องเป็นตัวเลขจริงวันนี้', () => {
  /** 🔒 คอมเมนต์ใน eventFormat.ts อ้างว่า "182 ตัว" — ล็อกไว้ให้แก้เอกสารเมื่อเลขเปลี่ยน
   *  (กฎสูงสุด: ห้ามเขียนข้ออ้างเชิงตัวเลขโดยไม่มีกลไกยืนยัน) */
  it('จำนวน track() ที่ไม่ซ้ำ ต้องตรงกับที่เอกสารในไฟล์อ้างไว้', () => {
    const claimed = Number(read('src/lib/eventFormat.ts').match(/= \*\*(\d+) ตัว\*\*/)?.[1]);
    expect(claimed, 'ไฟล์ต้องอ้างจำนวนเป็นตัวเลข').toBeGreaterThan(0);
    expect(tracked.size, `เอกสารอ้าง ${claimed} แต่นับจริงได้ ${tracked.size} — แก้เอกสาร`).toBe(claimed);
  });

  it('osEventFor คืน null สำหรับชื่อที่ไม่รู้จัก (ไม่เดา)', () => {
    expect(osEventFor('ไม่มีจริง')).toBeNull();
  });
});
