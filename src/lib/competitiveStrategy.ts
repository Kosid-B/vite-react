/* competitiveStrategy — POP / POD / VRIO ของ CEO AI Thailand (เจ้าของกำหนด 23 ส.ค. 2569)
 *
 * ทำไมต้องเป็นโค้ด ไม่ใช่เอกสาร:
 *   กลยุทธ์ที่อยู่ในไฟล์ .md เฉย ๆ = ต้องมีคนจำได้ว่าต้องเปิดไปอ่าน
 *   ไฟล์นี้ถูกส่งเข้า prompt ผ่าน brandBrief ⇒ ทุกคอนเทนต์/ฟีเจอร์ที่ AI ช่วยคิดจะได้กฎนี้ติดไปด้วย
 *
 * 🔴 แกนของกลยุทธ์ (ประโยคเดียว):
 *   **POP = ความสามารถ AI · POD = วิธีสร้างธุรกิจ · VRIO = ระบบเรียนรู้ธุรกิจที่สะสมเอง**
 *   ⇒ เปลี่ยน LLM ได้โดยความได้เปรียบไม่หาย เพราะ model คือเครื่องยนต์ แต่ข้อมูลธุรกิจที่สะสมคือสินทรัพย์
 *
 * ⚠️ กฎที่สำคัญที่สุดในไฟล์นี้: **ห้ามประกาศว่ามี moat ที่ยั่งยืนแล้ว**
 *   R (Rare) และ I (Inimitable) ที่แข็งจริงจะเกิด "หลัง" มีข้อมูลผลลัพธ์ธุรกิจจริงสะสมพอ
 *   ตอนนี้ยังมี 4 บัญชี · จ่ายเงินจริง 0 ราย ⇒ อ้าง moat ตอนนี้ = คำโกหกที่ฟังดูเป็นมืออาชีพ
 *
 * pure ทั้งไฟล์ · ไม่เรียก network · ไม่มี side effect
 */

/** จุดที่ "ต้องมี แต่ชนะไม่ได้" — ห้ามใช้เป็นเหตุผลหลักว่าทำไมต้องเลือกเรา
 *  เพราะทุกข้อนี้ ChatGPT/Gemini/Canva/AIS×Microsoft ทำได้หมดแล้ว */
export const POP = [
  'AI Chat',
  'สร้างคอนเทนต์ด้วย AI',
  'สร้างภาพ/วิดีโอด้วย AI',
  'AI Agent',
  'Dashboard',
  'เทมเพลตสำเร็จรูป',
  'ภาษาไทย',
  'ใช้บนมือถือได้',
  'ล็อกอิน/ความปลอดภัย',
  'Analytics',
  'Marketing Automation',
] as const;

/** เหตุผลที่ POP ชนะไม่ได้ — เขียนไว้กันคนเอากลับมาเป็นพาดหัว */
export const WHY_POP_CANT_WIN =
  'ทุกข้อในรายการนี้เป็นของที่ตลาดมีแล้ว — AIS×Microsoft เริ่มแจก AI Agent สำเร็จรูปให้ SME ไทยแล้ว ' +
  'ถ้าเราขึ้นหน้าด้วยข้อใดข้อหนึ่ง ลูกค้าจะถามทันทีว่า "แล้วต่างจาก ChatGPT + Canva ยังไง"';

/** 5 ชั้นที่เราชนะได้ — เรียงจากชั้นนอกสุดที่ลูกค้าเจอก่อน */
export const POD = [
  {
    layer: 1,
    name: 'Business Journey',
    claim: 'ไม่เริ่มจาก AI แต่เริ่มจาก "ฉันควรทำธุรกิจอะไร · ลูกค้าคือใคร"',
  },
  {
    layer: 2,
    name: 'Validation Before Spending',
    claim: 'ทดสอบลูกค้า/ปัญหา/ข้อเสนอ ก่อนใช้เงินก้อน',
  },
  {
    layer: 3,
    name: 'Business Operating System',
    claim: 'Idea → ลูกค้า → ทดสอบ → ข้อเสนอ → ราคา → ลูกค้ารายแรก → กำไร → กระบวนการ → KPI → ระบบ → Scale',
  },
  {
    layer: 4,
    name: 'Evidence-Based AI',
    claim: 'AI ต้องบอกว่าอะไรคือ สมมติฐาน / สังเกตได้ / พิสูจน์แล้ว — ห้ามปั้นความจริง',
  },
  {
    layer: 5,
    name: 'Scale with System',
    claim: 'ขายได้ก่อน แล้วค่อยสร้าง Process / KPI / SOP — ไม่ใช่เอาระบบไปขวางตั้งแต่วันแรก',
  },
] as const;

/** บันไดสู่ moat — เรียงตามลำดับที่ต้องสร้าง
 *
 *  🔴 `needsUsers` คือหัวใจของตารางนี้: มันแยก "ของที่ต้องตัดสินใจตอนนี้เพราะ retrofit แพง"
 *     ออกจาก "ของที่ต้องมีผู้ใช้ก่อนถึงจะมีความหมาย"
 *     ⇒ ทำผิดฝั่ง = สร้างฟีเจอร์ให้คนที่ยังไม่มี (ผิดกฎ stageFit ที่เจ้าของอนุมัติเอง)
 */
export const VRIO_LADDER = [
  {
    id: 'business-genome',
    name: 'CEO AI Business Genome',
    what: 'ทุก workspace เก็บข้อมูลมีโครงสร้างของ ลูกค้า · ปัญหา · JTBD · Persona · ข้อเสนอ · ราคา · ช่องทาง · การทดลอง · ผลลัพธ์ · KPI · กระบวนการ — ไม่ใช่เก็บแค่ประวัติแชต',
    needsUsers: 0,
    whyNow: 'เป็น "รูปร่างของข้อมูล" ไม่ใช่ฟีเจอร์ — ผู้ใช้คนแรกที่กรอกลงโครงผิด ต้องรื้อทำใหม่ทั้งหมด (หลักเดียวกับ iso-from-day-one)',
  },
  {
    id: 'thai-playbook',
    name: 'Thai Business Playbook',
    what: 'แปลง MIT 24 Steps + Business Fit + Growth + ระบบบริหาร เป็น decision rules ของเรา ไม่ใช่ prompt ยาว ๆ',
    needsUsers: 0,
    whyNow: 'prompt ลอกได้ใน 5 นาที · workflow + ontology ลอกยากกว่ามาก — และเขียนได้ตั้งแต่ยังไม่มีผู้ใช้',
  },
  {
    id: 'experiment-memory',
    name: 'Experiment Memory',
    what: 'ทุกแคมเปญผูก สมมติฐาน → การกระทำ → หลักฐาน → ผล → บทเรียน',
    needsUsers: 1,
    whyNow: 'ต้องมีคนทำการทดลองจริงอย่างน้อย 1 ราย ถึงจะมีอะไรให้จำ',
  },
  {
    id: 'decision-engine',
    name: 'Decision Engine',
    what: 'ตอบ "ธุรกิจนี้ควรทำอะไรต่อ" จากข้อมูลจริง เช่น ยังไม่ควรยิงแอดเพราะ Problem Validation ยังไม่ผ่าน',
    needsUsers: 5,
    whyNow: 'กฎการตัดสินใจที่ไม่เคยถูกทดสอบกับธุรกิจจริง = ความมั่นใจปลอม — ต้องมีเคสจริงมาหักล้างก่อน',
  },
  {
    id: 'benchmark-network',
    name: 'Business Benchmark Network',
    what: 'benchmark แบบไม่ระบุตัวตน เช่น "ธุรกิจแบบนี้มักติดที่ Offer Validation"',
    needsUsers: 30,
    whyNow: 'ต่ำกว่านี้ benchmark คือค่าเฉลี่ยของความบังเอิญ — และต้องมีความยินยอมที่ถูกต้องตาม PDPA ก่อน',
  },
  {
    id: 'learning-loop',
    name: 'Learning Loop',
    what: 'Think → Build → Measure → Learn → Grow แล้วความรู้กลับเข้า Business Genome ไม่จบที่ Dashboard',
    needsUsers: 30,
    whyNow: 'วงจรจะปิดได้ก็ต่อเมื่อมีผลลัพธ์จริงไหลกลับเข้ามา',
  },
] as const;

/** จำนวนผู้ใช้ภายนอกที่ใช้จริง ณ ปัจจุบัน = 0 ⇒ ปลดล็อกได้เฉพาะรายการที่ needsUsers = 0
 *  คืน { now, later } เพื่อให้แผงและเอกสารพูดตรงกัน */
export function moatReadiness(activeUsers: number): {
  now: typeof VRIO_LADDER[number][];
  later: typeof VRIO_LADDER[number][];
} {
  const now = VRIO_LADDER.filter((v) => activeUsers >= v.needsUsers);
  const later = VRIO_LADDER.filter((v) => activeUsers < v.needsUsers);
  return { now: [...now], later: [...later] };
}

/** 🔴 หมวดหมู่: ป้ายภายใน ≠ คำที่พูดกับลูกค้า
 *
 *  เจ้าของเสนอ category "AI Business Building System" — ถูกในเชิงกลยุทธ์
 *  แต่ **ห้ามเอาขึ้นหน้าเว็บเป็นพาดหัว** ด้วยเหตุผลที่เราวัดมาแล้ว:
 *    ① ไม่มีใครค้นหาชื่อหมวดหมู่ — คนที่ไม่รู้ว่าตัวเองมีปัญหา ไม่ค้นหา
 *    ② การสร้างหมวดหมู่ใหม่ = ต้องสอนตลาดให้รู้จักคำใหม่ ซึ่งแพงเกินกว่างบ ฿1,000/เดือน
 *  ⇒ ป้ายหมวดหมู่ใช้ **ตัดสินใจภายใน** ว่าจะสร้างอะไร · ป้ายหน้าร้านใช้ **ปัญหาของเขา**
 */
export const CATEGORY = {
  internal: 'AI Business Building System',
  external: 'AI Business Builder สำหรับคนไทย',
  publicHook: 'อย่าเพิ่งสร้างธุรกิจ จนกว่าจะรู้ว่าใครจะซื้อ',
  whyNotLeadWithCategory:
    'ไม่มีใครค้นหาชื่อหมวดหมู่สินค้า — คนที่ไม่รู้ว่าตัวเองมีปัญหาจะไม่ค้นหา ' +
    'และการสอนตลาดให้รู้จักคำใหม่แพงเกินกว่างบที่มี',
} as const;

/** สิ่งที่อ้างได้/อ้างไม่ได้วันนี้ — กัน "ฟังดูเป็นมืออาชีพแต่ไม่จริง" */
export const MOAT_CLAIM = {
  mayClaim: [
    'เราออกแบบให้ AI ต้องแยก สมมติฐาน / สังเกตได้ / พิสูจน์แล้ว',
    'เรามีเกณฑ์ขั้นต่ำก่อนสรุปผล — ข้อมูลน้อยเกินไป ระบบจะบอกว่ายังสรุปไม่ได้',
    'เราผูกวิธีสร้างธุรกิจ (MIT 24 Steps) เข้ากับระบบบริหาร 20+ ปีของ B.Training',
  ],
  mustNotClaim: [
    'เรามีความได้เปรียบที่ยั่งยืนแล้ว',
    'ข้อมูลของเราลอกไม่ได้',
    'เรามี network effect',
    'benchmark ของเราแม่นที่สุดในไทย',
  ],
  whyNot:
    'R และ I ที่แข็งจริงเกิดหลังมีข้อมูลผลลัพธ์ธุรกิจจริงสะสมพอ — วันนี้มี 4 บัญชี · จ่ายเงินจริง 0 ราย',
} as const;

/** 🟢 POD ที่ "ใช้ได้ทันทีโดยไม่ต้องรอผู้ใช้" — เพราะสร้างเสร็จแล้วและมีเทสต์คุมอยู่
 *  รายชื่อค่าคงที่จริงในโค้ดที่ทำหน้าที่ Measurement Safety
 *  ⚠️ นี่คือชั้นเดียวในตาราง VRIO ที่ Organized ✅ อยู่แล้ว แต่ **ยังไม่เคยถูกเอาไปสื่อสาร** */
export const MEASUREMENT_SAFETY_GUARDS = [
  'growthPdca.MIN_FOR_RATE',
  'landingFunnel.MIN_SAMPLE',
  'landingAb.MIN_SAMPLE_PER_ARM',
  'pmfSurvey.PMF_MIN_SAMPLE',
  'reachFunnel.MIN_VIEWS_FOR_RATE',
  'reachFunnel.MIN_ARRIVALS_PER_ROUTE',
] as const;

/** บล็อกที่แปะเข้า prompt — ให้ AI รู้ว่าอะไรคือ POP อะไรคือ POD ก่อนเขียนอะไรก็ตาม */
export function strategyBlock(): string {
  return [
    '## แกนการแข่งขัน (ห้ามสลับ)',
    `POP — ต้องมีแต่ชนะไม่ได้: ${POP.join(' · ')}`,
    `  เหตุผล: ${WHY_POP_CANT_WIN}`,
    'POD — เหตุผลที่ต้องเลือกเรา:',
    ...POD.map((p) => `  ${p.layer}. ${p.name} — ${p.claim}`),
    `หมวดหมู่ (ใช้ภายใน): ${CATEGORY.internal}`,
    `พูดกับลูกค้าด้วย: ${CATEGORY.publicHook}`,
    `  ⚠️ ${CATEGORY.whyNotLeadWithCategory}`,
    `🔴 ห้ามอ้าง: ${MOAT_CLAIM.mustNotClaim.join(' · ')}`,
    `  เพราะ: ${MOAT_CLAIM.whyNot}`,
  ].join('\n');
}
