// สร้างไฟล์ข้อมูลบริษัทต้นแบบ (AppData JSON) สำหรับถ่าย content
// ธุรกิจ: รับทำการตลาดออนไลน์ — วางตาม MIT 24 Steps (customer-first)
// รัน: npx vite-node scripts/genContentSeed.ts
import { writeFileSync } from 'node:fs';
import { DEFAULT_DATA } from '../src/data';
import type { AppData } from '../src/types';

const d: AppData = structuredClone(DEFAULT_DATA);

// ── อัตลักษณ์บริษัท: เอเจนซีรับทำการตลาดออนไลน์ ────────────────────────────
d.aiCompany.name = 'Growth First Digital — เอเจนซีการตลาดออนไลน์';
d.aiCompany.industry = 'บริการการตลาดดิจิทัล (Digital Marketing Agency)';
d.aiCompany.goal = 'พา SME ไทย 20 รายให้ได้ลูกค้าจริงเพิ่ม 30% ใน 90 วัน โดยเริ่มจาก "เข้าใจลูกค้าก่อนยิงแอด"';
d.aiCompany.productDesc =
  'บริการวางกลยุทธ์ + ลงมือทำการตลาดออนไลน์ครบวงจรสำหรับ SME ไทย: ค้นหาลูกค้าตัวจริง (customer discovery) → วาง Value Proposition → ผลิตคอนเทนต์ + ยิงแอด Facebook/TikTok/Google → วัดผล ROI ทุกสัปดาห์';
// Value Proposition (ทำก่อน BMC ตามหลัก MIT — ลด pain เพิ่ม gain ของลูกค้า)
d.aiCompany.productVp =
  'SME ส่วนใหญ่ยิงแอดทิ้งเงินเพราะไม่รู้ว่าลูกค้าตัวจริงคือใคร — เราเริ่มจากสัมภาษณ์ลูกค้าจริงก่อนใช้เงินสักบาท ' +
  'ทำให้ทุกงบโฆษณาพุ่งไปที่กลุ่มที่พร้อมจ่าย เห็นผลเป็นยอดขายจริงภายใน 90 วัน ไม่ใช่แค่ยอดไลก์';
d.aiCompany.productDbd = 'บริการโฆษณาและการตลาด (M73)';

// ── ทีม AI ของเอเจนซี ─────────────────────────────────────────────────────
d.aiCompany.agents = [
  { id: 'a-ceo', role: 'CEO', name: 'อาทิตย์', avatar: '🧭', color: '#c44b2b',
    mandate: 'รับโจทย์ลูกค้า วางกลยุทธ์ customer-first จัดทีม และมอบหมายงานตาม MIT 24 Steps',
    model: 'claude-opus-4-8', status: 'working', reportsTo: null },
  { id: 'a-cso', role: 'Head of Strategy', name: 'ญาดา', avatar: '🔎', color: '#7c3aed',
    mandate: 'สัมภาษณ์ลูกค้าจริง หา Beachhead Market + Persona + Value Proposition ก่อนเริ่มยิงแอด',
    model: 'claude-sonnet-4-6', status: 'working', reportsTo: 'a-ceo' },
  { id: 'a-cmo', role: 'CMO', name: 'มณี', avatar: '📣', color: '#2d6a4f',
    mandate: 'ผลิตคอนเทนต์ + วางแคมเปญ Facebook/TikTok/Google ตาม Persona ที่ยืนยันแล้ว',
    model: 'claude-sonnet-4-6', status: 'working', reportsTo: 'a-ceo' },
  { id: 'a-cdo', role: 'Data/Media Buyer', name: 'ธนา', avatar: '📊', color: '#1a4f8a',
    mandate: 'ยิงแอด วัด ROI/CAC ทุกสัปดาห์ ตัดงบที่ไม่คุ้ม เพิ่มงบที่ได้ลูกค้าจริง',
    model: 'claude-sonnet-4-6', status: 'idle', reportsTo: 'a-cmo' },
];
d.aiCompany.tasks = [
  { id: 't1', agentId: 'a-cso', title: 'สัมภาษณ์ลูกค้าจริง 10 ราย (Customer Discovery)',
    detail: 'ก่อนยิงแอด — หา pain/gain จริงของกลุ่มร้านอาหาร SME เพื่อยืนยัน Beachhead', status: 'in_progress' },
  { id: 't2', agentId: 'a-cmo', title: 'ร่างคอนเทนต์ 7 วันจาก Persona ที่ยืนยันแล้ว',
    detail: 'เปลี่ยน pain point ลูกค้าเป็นหัวข้อคอนเทนต์ที่ดึงคนพร้อมจ่าย', status: 'queued' },
  { id: 't3', agentId: 'a-cdo', title: 'วิเคราะห์คู่แข่ง 5 เอเจนซีด้วย Google Search',
    detail: 'เทียบราคา/บริการ/จุดต่าง ผ่าน Serper.dev', status: 'queued', useWebSearch: true },
  { id: 't4', agentId: 'a-ceo', title: 'สรุป Value Proposition เสนอลูกค้า',
    detail: 'รวมผลสัมภาษณ์ → ร่าง VP ก่อนทำ BMC', status: 'review' },
  { id: 't5', agentId: 'a-ceo', title: 'สรุปแผนสัปดาห์เสนอบอร์ด', detail: 'ความคืบหน้า + ของบอนุมัติ', status: 'done' },
];

// ── MIT 24 Steps: customer-first (1-6 เสร็จก่อน, 7-11 กำลังทำ) ─────────────
const de24Notes: Array<[number, boolean, string]> = [
  [0,  true,  'Market Segmentation: แบ่งตลาด SME ไทยเป็น 8 กลุ่ม (ร้านอาหาร/คลินิกความงาม/ร้านค้าออนไลน์/บริการ B2B ...) จากการสัมภาษณ์จริง 25 ราย'],
  [1,  true,  'Beachhead Market: เลือก "ร้านอาหาร SME ในกรุงเทพฯ ที่เพิ่งเริ่มทำ delivery" — เจ็บปวดชัด งบพร้อม ตัดสินใจเร็ว'],
  [2,  true,  'End User Profile: เจ้าของร้าน 30-45 ปี ทำเอง ไม่มีทีมการตลาด เคยยิงแอดเองแล้วเงินหาย'],
  [3,  true,  'TAM: ~48,000 ร้านในกรุงเทพฯ × ค่าบริการเฉลี่ย ฿15,000/เดือน = ~฿8,600 ลบ./ปี (beachhead)'],
  [4,  true,  'Persona: "พี่แอน" เจ้าของร้านอาหารตามสั่ง 2 สาขา อยากได้ลูกค้าใหม่แต่ไม่มีเวลา ไม่เชื่อเอเจนซีที่ขายฝัน'],
  [5,  true,  'Full Life Cycle Use Case: ตั้งแต่พี่แอนเห็นโฆษณาเรา → ปรึกษาฟรี → เห็นผลสัมภาษณ์ลูกค้าของร้านตัวเอง → เริ่มแคมเปญ → เห็นยอดใน 30 วัน'],
  [6,  false, 'High-Level Product Spec: แพ็กเกจ "Customer-First Growth" — เดือนแรกเน้น discovery + VP, เดือน 2-3 ผลิตคอนเทนต์ + ยิงแอด (กำลังร่าง)'],
  [7,  false, 'Quantify Value Proposition: ร้านนำร่องลด CAC จาก ฿180 เหลือ ฿95/ลูกค้า และเพิ่มยอด 32% ใน 60 วัน (กำลังเก็บตัวเลขจากร้านที่ 2-3)'],
  [8,  false, 'Next 10 Customers: มีร้านสนใจ 6 ราย รอปิด 4 ราย — ใช้ referral จากร้านนำร่อง'],
  [9,  false, 'Define Your Core: จุดแข็งที่ลอกยาก = กระบวนการ customer discovery + คลังบทสัมภาษณ์ลูกค้า SME ไทย'],
  [10, false, 'Competitive Position: คู่แข่งเริ่มที่ "ยิงแอด" เราเริ่มที่ "เข้าใจลูกค้า" → วัดผลเป็นยอดขายไม่ใช่ยอดไลก์'],
];
de24Notes.forEach(([i, done, notes]) => { d.businessModel.de24[i] = { done, notes }; });
// CEO มอบหมายเจ้าของแต่ละ Phase (customer phase → Head of Strategy)
d.businessModel.de24Owners = Array(24).fill(null);
d.businessModel.de24Owners[0] = 'a-cso';
d.businessModel.de24Owners[6] = 'a-cmo';

// ── BMC ให้เข้ากับเอเจนซี (customer-first) ─────────────────────────────────
d.businessModel.bmc.value = [
  'เริ่มจาก "เข้าใจลูกค้าก่อนยิงแอด" — ต่างจากเอเจนซีทั่วไป',
  'วัดผลเป็นยอดขายจริง/ROI ไม่ใช่แค่ยอดไลก์',
  'ลงมือทำจริงครบวงจร ไม่ใช่แค่ที่ปรึกษา',
  'รายงาน ROI โปร่งใสทุกสัปดาห์',
];
d.businessModel.bmc.segments = [
  'ร้านอาหาร SME กรุงเทพฯ (Beachhead)',
  'คลินิกความงาม/ร้านค้าออนไลน์รายเล็ก',
  'ธุรกิจบริการ B2B ที่อยากได้ lead',
];

// ── Persona: เติม Pain/Gain (Value Proposition Canvas — customer-first) ─────
d.personas = [
  { ...d.personas[0], name: 'พี่แอน', role: 'เจ้าของร้านอาหาร 2 สาขา · ทำการตลาดเอง',
    quote: '"เคยจ้างเอเจนซีแล้วได้แต่ยอดไลก์ ยอดขายเท่าเดิม — คราวนี้อยากได้ลูกค้าจริง"',
    pains: ['ยิงแอดเองแล้วเงินหมดแต่ไม่มีออเดอร์', 'ไม่มีเวลาทำคอนเทนต์ทุกวัน', 'ไม่รู้ว่าลูกค้าตัวจริงคือใคร', 'กลัวจ้างเอเจนซีแล้วได้แค่ยอดไลก์'],
    gains: ['ได้ออเดอร์/ลูกค้าจริงเพิ่มขึ้นวัดได้', 'มีคนดูแลการตลาดให้ครบ ไม่ต้องทำเอง', 'เห็นรายงาน ROI ชัดเจนทุกสัปดาห์', 'รู้ว่าควรทุ่มงบไปที่กลุ่มไหน'] },
  { ...d.personas[1], name: 'คุณโบว์', role: 'เจ้าของคลินิกความงาม · เพิ่งเปิดสาขา 2',
    quote: '"อยากได้ลูกค้าใหม่ที่จองจริง ไม่ใช่แค่คนทักมาถามราคาแล้วหายไป"',
    pains: ['คนทักเยอะแต่ปิดการขายไม่ได้', 'คู่แข่งตัดราคาจนกำไรบาง', 'ไม่รู้จะสื่อสารจุดต่างยังไง'],
    gains: ['ได้ลูกค้าที่พร้อมจ่าย ไม่ต่อราคา', 'แบรนด์ดูพรีเมียมกว่าคู่แข่ง', 'ระบบนัดหมายที่ไม่หลุด'] },
  { ...d.personas[2], name: 'คุณเอก', role: 'เจ้าของบริษัทบริการ B2B · ทีม 12 คน',
    quote: '"ผมต้องการ lead ที่คุยแล้วปิดได้ ไม่ใช่รายชื่อขยะ"',
    pains: ['lead เยอะแต่คุณภาพต่ำ ปิดไม่ได้', 'วงจรขายยาว ตามงานเยอะ', 'ไม่มีระบบวัดว่าช่องทางไหนคุ้ม'],
    gains: ['lead คุณภาพที่พร้อมคุย', 'รู้ต้นทุนต่อ lead แต่ละช่องทาง', 'ทีมขายโฟกัสรายที่มีโอกาสปิด'] },
];

// ── การเงิน: มีรายรับ-รายจ่ายจริง → CEO report + คลังเมืองมีข้อมูล ──────────
d.finance = [
  { id: 'f1', label: 'ค่าบริการ retainer — ร้านพี่แอน', amount: 15000, kind: 'revenue', date: '2026-06-05', recurring: true },
  { id: 'f2', label: 'ค่าบริการ retainer — คลินิกคุณโบว์', amount: 18000, kind: 'revenue', date: '2026-06-10', recurring: true },
  { id: 'f3', label: 'ค่าวางกลยุทธ์ (โปรเจกต์) — บริษัทคุณเอก', amount: 35000, kind: 'revenue', date: '2026-06-18' },
  { id: 'f4', label: 'ค่ายิงแอด (ส่งต่อจากลูกค้า)', amount: 22000, kind: 'expense', date: '2026-06-12' },
  { id: 'f5', label: 'ค่าเครื่องมือ (Meta/TikTok/Canva/CRM)', amount: 4500, kind: 'expense', date: '2026-06-01', recurring: true },
  { id: 'f6', label: 'ค่าตอบแทนฟรีแลนซ์คอนเทนต์', amount: 12000, kind: 'expense', date: '2026-06-20' },
];

// ── ทำให้ดู "ใช้งานจริง" สำหรับถ่าย content ────────────────────────────────
d.visitedPages = ['dashboard', 'aicompany', 'personas', 'bmc', 'journey', 'city', 'marketing'];
d.visitedMarket = true;
d.streak = { count: 6, lastDay: '2026-07-07' };
d.subscription.plan = 'scale';
d.subscription.status = 'active';

writeFileSync('content-prototype-seed.json', JSON.stringify(d, null, 2), 'utf8');
console.log('✅ เขียน content-prototype-seed.json สำเร็จ —', JSON.stringify(d).length, 'bytes');
console.log('   MIT steps done:', d.businessModel.de24.filter(s => s.done).length, '/ 24');
console.log('   personas with pains/gains:', d.personas.filter(p => p.pains?.length).length);
console.log('   finance entries:', d.finance?.length);
