import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BEHAVIOR_MAP, NEXTPROBLEM_TOPIC, NEXTPROBLEM_UNMAPPED, BEHAVIOR_TOPIC_UNUSED,
  BEHAVIOR_NAMES, BEHAVIOR_TOPICS, BEHAVIOR_FORMATS, cefToBehavior, toCef,
} from '../eventFormat';
import {
  CONSENT_KEY, MAX_BATCH, MAX_AGE_MS, analyticsOptIn, batchIssues, buildBatch,
  emptyOutbox, loadOutbox, saveOutbox,
} from '../behaviorOs';

/* ══════════════════════════════════════════════════════════════════════
 * สายที่สอง — ยิงเข้า **ฐานของ Marketing OS จริง** (ADR-0009)
 * ด่านนี้เฝ้าสามอย่างที่ผิดแล้วเสียหายจริง:
 *  ① แมปผิด/เดาหมวด ⇒ สร้างข้อมูลที่ดูเหมือนจริงในระบบของคนอื่น
 *  ② ส่งโดยไม่มี consent ⇒ ประกาศแทนผู้ใช้ว่ายินยอม (ผิด PDPA)
 *  ③ ส่งก้อนที่ปลายทางปฏิเสธ ⇒ ตกทั้งก้อน ไม่ใช่แค่ตัวที่ผิด
 * ══════════════════════════════════════════════════════════════════════ */
const read = (rel: string) => readFileSync(resolve(__dirname, '../../..', rel), 'utf8');
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const U = (n: number) => `0000000${n}-1111-4111-8111-111111111111`.slice(-36);
const SESSION = '11111111-2222-4333-8444-555555555555';
let seq = 0;
const nextId = () => U(++seq % 10);

describe('① แมปเข้า taxonomy ของเขา — ตรงหรือไม่ส่ง', () => {
  it('ทุกค่าที่เราแมปต้องอยู่ในชุดที่สคีมาเขายอมรับ', () => {
    for (const v of Object.values(BEHAVIOR_MAP)) {
      expect(BEHAVIOR_NAMES).toContain(v.name);
      expect(BEHAVIOR_TOPICS).toContain(v.topic);
      expect(BEHAVIOR_FORMATS).toContain(v.format);
    }
    for (const t of Object.values(NEXTPROBLEM_TOPIC)) expect(BEHAVIOR_TOPICS).toContain(t);
  });

  it('แมปแล้วได้ event ที่ครบตามสคีมา (ไม่มีคีย์เกิน)', () => {
    const out = cefToBehavior(toCef({ name: 'quickcheck_submitted', session: SESSION }), nextId);
    expect(out).not.toBeNull();
    expect(Object.keys(out!).sort()).toEqual(['at', 'format', 'id', 'name', 'session', 'source', 'topic']);
    expect(out!.name).toBe('action');
    expect(out!.topic, 'เครื่องคำนวณ = เสา money').toBe('money');
  });

  it('🔴 event ที่ไม่ได้แมป = null (ไม่ส่ง ไม่ยัดหมวด)', () => {
    for (const n of ['city_viewed', 'reward_claimed', 'ไม่มีจริง']) {
      expect(cefToBehavior(toCef({ name: n, session: SESSION }), nextId)).toBeNull();
    }
  });

  it('🔑 quickcheck ต้องลงเสา money ไม่ใช่ business_validation (เสาที่ตรงความหมาย)', () => {
    for (const e of ['quickcheck_started', 'quickcheck_submitted', 'quickcheck_signup_click']) {
      expect(BEHAVIOR_MAP[e].topic, `${e} ต้องเป็น money`).toBe('money');
    }
    expect(BEHAVIOR_MAP.landing_view.topic, 'หน้า Landing = เสา start').toBe('start');
  });

  it('🔴 topic ของเขาทุกค่าต้องถูกจัดการ — ใช้ หรือมีเหตุผลว่าทำไมยังไม่ใช้', () => {
    const used = new Set<string>([
      ...Object.values(BEHAVIOR_MAP).map((v) => v.topic),
      ...Object.values(NEXTPROBLEM_TOPIC),
    ]);
    const unhandled = BEHAVIOR_TOPICS.filter((t) => !used.has(t) && !BEHAVIOR_TOPIC_UNUSED[t]);
    expect(unhandled, `topic ที่ไม่ถูกจัดการ: ${unhandled.join(', ')}`).toEqual([]);
    for (const [k, why] of Object.entries(BEHAVIOR_TOPIC_UNUSED)) {
      expect(BEHAVIOR_TOPICS, `${k} ต้องเป็น topic ที่เขามีจริง`).toContain(k);
      expect(why.length, `เหตุผลของ ${k} สั้นเกิน`).toBeGreaterThan(25);
    }
  });

  it('nextproblem_click ใช้หัวข้อที่ผู้ใช้กดจริงเป็น topic', () => {
    const got = cefToBehavior(toCef({ name: 'nextproblem_click', session: SESSION, props: { id: 'customers' } }), nextId);
    expect(got?.topic).toBe('first_customer');
    expect(got?.name).toBe('action');
  });

  it('🔴 หัวข้อที่ไม่มีช่องตรง = ไม่ส่ง และต้องมีเหตุผลเขียนไว้', () => {
    for (const id of Object.keys(NEXTPROBLEM_UNMAPPED)) {
      expect(NEXTPROBLEM_TOPIC[id], `${id} ต้องไม่ถูกแมป`).toBeUndefined();
      expect(cefToBehavior(toCef({ name: 'nextproblem_click', session: SESSION, props: { id } }), nextId)).toBeNull();
      expect(NEXTPROBLEM_UNMAPPED[id].length, `เหตุผลของ ${id} สั้นเกิน`).toBeGreaterThan(20);
    }
  });

  it('หัวข้อใน nextProblems ต้องถูกจัดการครบ — แมปหรือมีเหตุผล ห้ามเงียบ', () => {
    const src = read('src/lib/nextProblems.ts');
    const ids = [...src.matchAll(/^\s*id: '([a-z]+)',/gm)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(5);
    const unhandled = ids.filter((i) => !NEXTPROBLEM_TOPIC[i] && !NEXTPROBLEM_UNMAPPED[i]);
    expect(unhandled, `หัวข้อที่ไม่ถูกจัดการ: ${unhandled.join(', ')}`).toEqual([]);
  });

  it('source แปลงตามที่มาจริง: server → saas · browser → website', () => {
    const a = cefToBehavior(toCef({ name: 'landing_view', session: SESSION, source: 'server' }), nextId);
    const b = cefToBehavior(toCef({ name: 'landing_view', session: SESSION }), nextId);
    expect(a?.source).toBe('saas');
    expect(b?.source).toBe('website');
  });
});

describe('② consent — fail-closed ทุกกรณีที่ไม่ชัด', () => {
  it.each([
    ['all', true],
    ['necessary', false],
    [null, false],
    ['', false],
    ['ALL', false],
  ])('ค่า %s ⇒ ส่งได้ %s', (v, expected) => {
    expect(analyticsOptIn(() => v as string | null)).toBe(expected);
  });

  it('อ่าน storage ไม่ได้ (โหมดส่วนตัว) = ไม่ส่ง ไม่โยน error', () => {
    expect(analyticsOptIn(() => { throw new Error('SecurityError'); })).toBe(false);
  });

  it('คีย์ที่ใช้ต้องเป็นคีย์เดียวกับแถบคุกกี้ตัวจริง', () => {
    expect(code(read('src/components/CookieConsent.tsx'))).toContain(`'${CONSENT_KEY}'`);
  });

  it("🔴 'all' ในแถบคุกกี้ต้องเป็นปุ่มที่เปิด Analytics จริง", () => {
    const cc = read('src/components/CookieConsent.tsx');
    expect(cc).toMatch(/choice === 'all'/);
    expect(cc, "'all' ต้องปลด GA_DISABLE").toMatch(/GA_DISABLE\]\s*=\s*false/);
  });
});

describe('③ ก้อนที่ส่ง — ต้องผ่านสคีมา strict ของเขาตั้งแต่บ้านเรา', () => {
  const ev = (over: Partial<Record<string, unknown>> = {}) => ({
    id: U(1), session: SESSION, at: new Date().toISOString(),
    source: 'website', name: 'view', topic: 'business_validation', format: 'interactive',
    ...over,
  });

  it('ก้อนปกติไม่มีข้อติง', () => {
    expect(batchIssues(buildBatch([ev()] as never, U(2), 'test'))).toEqual([]);
  });

  it.each([
    ['version ผิด', { version: 2 }, /version/],
    ['consent ผิด', { consent: 'yes' }, /consent/],
    ['mode ผิด', { mode: 'prod' }, /mode/],
    ['batchId ไม่ใช่ uuid', { batchId: 'abc' }, /batchId/],
    ['events ว่าง', { events: [] }, /events/],
  ])('%s = ถูกปฏิเสธที่บ้านเรา', (_l, patch, re) => {
    const b = { ...buildBatch([ev()] as never, U(2), 'test'), ...patch };
    expect(batchIssues(b).join(' ')).toMatch(re);
  });

  it(`เกิน ${MAX_BATCH} ตัว = ปฏิเสธ`, () => {
    const many = Array.from({ length: MAX_BATCH + 1 }, (_, i) => ev({ id: U(i % 10) }));
    expect(batchIssues(buildBatch(many as never, U(2), 'test')).join(' ')).toMatch(/เกิน/);
  });

  it('🔴 id ซ้ำในก้อนเดียว = ปฏิเสธ (เขาเช็กเองด้วย duplicate_event)', () => {
    const b = buildBatch([ev({ id: U(3) }), ev({ id: U(3) })] as never, U(2), 'test');
    expect(batchIssues(b).join(' ')).toMatch(/ซ้ำ/);
  });

  it('🔴 คีย์เกินในแต่ละ event = ปฏิเสธ (สคีมาเขา strict ⇒ ตกทั้งก้อน)', () => {
    const b = buildBatch([ev({ extra: 'x' })] as never, U(2), 'test');
    expect(batchIssues(b).join(' ')).toMatch(/คีย์เกิน/);
  });

  it('เวลาเก่ากว่า 24 ชม. หรืออนาคตเกิน 1 นาที = ปฏิเสธ', () => {
    const old = ev({ at: new Date(Date.now() - MAX_AGE_MS - 60_000).toISOString() });
    const future = ev({ at: new Date(Date.now() + 120_000).toISOString() });
    expect(batchIssues(buildBatch([old] as never, U(2), 'test')).join(' ')).toMatch(/นอกช่วง/);
    expect(batchIssues(buildBatch([future] as never, U(2), 'test')).join(' ')).toMatch(/นอกช่วง/);
  });
});

describe('④ คิวของค้าง — หายได้ แต่ต้องนับ', () => {
  const fresh = { id: U(1), session: SESSION, at: new Date().toISOString(), source: 'website', name: 'view', topic: 'business_validation', format: 'interactive' } as never;

  it('เขียนแล้วอ่านกลับได้ของเดิม', () => {
    const box = { ...emptyOutbox(), events: [fresh] };
    expect(loadOutbox(saveOutbox(box)).events).toEqual([fresh]);
  });

  it('ที่เก็บว่าง = คิวเปล่า', () => {
    expect(loadOutbox(null)).toEqual(emptyOutbox());
  });

  it('JSON พัง = ทิ้งและนับ', () => {
    expect(loadOutbox('{พัง').dropped).toBe(1);
  });

  it('checksum เพี้ยน = ทิ้งทั้งก้อนและนับตามจำนวน', () => {
    const bad = JSON.stringify({ ...emptyOutbox(), events: [fresh, fresh], checksum: 'ff' });
    expect(loadOutbox(bad).dropped).toBe(2);
  });

  it('🔴 ของที่เกินอายุถูกทิ้งตอนอ่าน + นับ (ส่งไปก็ตกทั้งก้อน)', () => {
    const stale = { ...(fresh as object), at: new Date(Date.now() - MAX_AGE_MS - 1000).toISOString() } as never;
    const box = { ...emptyOutbox(), events: [stale, fresh] };
    const back = loadOutbox(saveOutbox(box));
    expect(back.events).toEqual([fresh]);
    expect(back.dropped).toBe(1);
  });
});

describe('🚢 ถูกเรียกใช้จริง + ขอบเขตความปลอดภัย', () => {
  const b = code(read('src/lib/behaviorOs.ts'));

  it('analytics.track ต้องเรียก sink ที่ 4', () => {
    expect(code(read('src/lib/analytics.ts'))).toMatch(/sendBehaviorAuto\(event/);
  });

  it('landing_view ถูกส่งเข้าสายนี้ด้วย (ไม่ได้ยิงผ่าน track)', () => {
    expect(code(read('src/hooks/useLandingTrace.ts'))).toMatch(/sendBehaviorAuto\('landing_view'/);
  });

  /* ⚠️ เวอร์ชันแรกของเทสต์นี้หา `analyticsOptIn(` เฉย ๆ — ซึ่งไปเจอ **ตัวนิยามฟังก์ชัน
   *    ในไฟล์เดียวกัน** ที่อยู่ก่อน fetch อยู่แล้ว ⇒ ผ่านฟรีแม้ถอดด่านออก (ledger #85 ซ้ำรอย)
   *    ⇒ ต้องจับ **รูปประโยคของด่าน** ไม่ใช่ชื่อฟังก์ชัน */
  it('🔴 ต้องเช็ก consent ก่อน fetch ทุกครั้ง', () => {
    const gate = b.match(/if \(!analyticsOptIn\(/);
    expect(gate, 'ต้องมีด่าน if (!analyticsOptIn(…)) ที่กั้นจริง').not.toBeNull();
    const ci = b.indexOf('if (!analyticsOptIn(');
    const fi = b.indexOf('fetch(');
    expect(fi).toBeGreaterThan(-1);
    expect(ci, 'ด่าน consent ต้องมาก่อนยิง').toBeLessThan(fi);
  });

  it('🔴 ต้องตรวจก้อนด้วย batchIssues ก่อน fetch', () => {
    expect(b.indexOf('batchIssues(')).toBeLessThan(b.indexOf('fetch('));
  });

  it('🔴 ห้ามมี service_role ในไฟล์นี้', () => {
    expect(b).not.toMatch(/service_role|SERVICE_ROLE/);
  });

  it('🔴 คีย์ต้องมาจาก env ไม่ใช่ฝังในรีโป (ledger #96)', () => {
    expect(b).toMatch(/import\.meta\.env\.VITE_MARKETING_OS_ANON_KEY/);
    expect(b).toMatch(/import\.meta\.env\.VITE_MARKETING_OS_URL/);
  });

  it('ไม่ได้ตั้ง env = เงียบสนิท (เช็กก่อนยิง)', () => {
    const gi = b.indexOf('if (!OS_BASE || !OS_ANON_KEY) return;');
    expect(gi, 'ต้องมีด่านว่าไม่มีค่า = ไม่ยิง').toBeGreaterThan(-1);
    expect(gi).toBeLessThan(b.indexOf('fetch('));
  });

  it('เริ่มที่ mode test — ห้ามขึ้น live ก่อนเห็นแถวจริง', () => {
    expect(code(read('src/config.ts'))).toMatch(/behaviorMode:\s*'test'/);
  });

  it('kill switch ต้องมีและถูกเช็ก', () => {
    expect(b).toMatch(/MARKETING_OS\.behaviorLive/);
  });

  it('ต้องเงียบเสมอ (มี catch ครอบทุกทาง)', () => {
    expect((b.match(/catch/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });
});
