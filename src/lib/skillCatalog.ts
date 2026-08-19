/* skillCatalog — สารบัญ "ทักษะที่ปรึกษา" ที่ระบบมีให้ผู้ใช้ (source of truth เดียว)
 *
 * ที่มา: .claude/skills/ (เพลย์บุ๊กที่ปรึกษาธุรกิจ) — คัดเฉพาะตัวที่เป็นคุณค่าต่อ "เจ้าของธุรกิจ"
 *   (ตัดเครื่องมือฝั่ง dev เช่น mcp-builder/docx/canvas-design ออก ไม่โชว์ให้ผู้ใช้)
 *
 * ใช้ 3 ที่:
 *   1) Landing — โฆษณาว่าระบบมีทักษะอะไร เหมาะกับธุรกิจไหน ขั้นตอนไหน
 *   2) ในแอป — AI แนะนำทักษะที่ควรใช้ต่อ ตามขั้นตอนที่ผู้ใช้อยู่ (recommendSkills)
 *   3) การคิดเงิน — แต่ละทักษะผูกกับแพ็กขั้นต่ำ (tier) → ใช้ร่วมกับ access.ts
 *
 * ⚠️ นโยบายการคิดเงิน (ตัดสินใจเชิงสถาปัตยกรรม):
 *   ไม่สร้างระบบเก็บเงิน "รายทักษะ" ขึ้นมาใหม่ — ใช้ 2 ชั้นที่มีอยู่แล้ว:
 *     • ชั้นสิทธิ์ = แพ็กรายเดือน (free/starter/growth/scale) ตาม tier ของทักษะ
 *     • ชั้นการใช้งานจริง = token ที่กินตอนรัน (tokenEconomics.ts ซึ่ง live แล้ว)
 *   เหตุผล: การเก็บเงินรายทักษะเพิ่มอีกทางทำให้ผู้ใช้สับสน (3 ระบบเงินในที่เดียว)
 *   และทำให้ราคาคาดเดาไม่ได้ ซึ่งเป็นสาเหตุอันดับต้น ๆ ที่ SME เลิกใช้ SaaS
 * pure/tested — ไม่มี side-effect
 */

import type { PlanId } from '../types';
import { PLAN_RANK } from './access';

/** ขั้นตอนการสร้างและพัฒนาธุรกิจ (เรียงตามลำดับที่ผู้ใช้เดินจริง) */
export type SkillStage = 'validate' | 'model' | 'launch' | 'scale' | 'protect';

/** ประเภทธุรกิจที่ทักษะนี้เหมาะเป็นพิเศษ ('all' = ใช้ได้ทุกธุรกิจ) */
export type SkillOrigin = 'signature' | 'standard';

// นิยามย้ายไป quickCalcCore.ts (ไฟล์ที่ไม่มี side effect) เพื่อให้ Worker ใช้ได้โดยไม่ลาก supabase
export type { SkillBiz } from './quickCalcCore';
import type { SkillBiz } from './quickCalcCore';

export interface SkillEntry {
  id: string;
  stage: SkillStage;
  biz: SkillBiz;
  /** ที่มา: signature = B.TC เขียนเอง (ซื้อขาด) · standard = มากับบันเดิล (รวมในแพ็ก) */
  origin: SkillOrigin;
  /** แพ็กขั้นต่ำ — ใช้กับ standard เท่านั้น */
  minPlan: PlanId;
  /** ระดับมูลค่า 1–3 (signature เท่านั้น) */
  valueTier?: 1 | 2 | 3;
  /** ราคาซื้อขาด (บาท) — signature เท่านั้น */
  price?: number;
  /** ผู้เขียนต้นฉบับ — ให้เครดิตเสมอเมื่อไม่ใช่ของเราเอง (แสดงบน UI) */
  author?: string;
  desc: string;
}

export interface StageMeta {
  id: SkillStage;
  order: number;
  label: string;
  question: string;   // คำถามที่ผู้ใช้ถามตัวเองในขั้นนี้ (ใช้บน Landing)
  icon: string;
}

/** ขั้นตอนธุรกิจ — เรียงตามลำดับจริงที่ผู้ใช้เดิน */
export const SKILL_STAGES: StageMeta[] = [
  { id: 'validate', order: 1, label: 'ตรวจสอบไอเดีย',      question: 'ไอเดียนี้มีคนจ่ายจริงไหม?',        icon: '🧪' },
  { id: 'model',    order: 2, label: 'วางโมเดล & การเงิน',  question: 'ตั้งราคาเท่าไรถึงมีกำไร?',          icon: '🧮' },
  { id: 'launch',   order: 3, label: 'หาลูกค้า & การตลาด',  question: 'จะหาลูกค้ากลุ่มแรกจากไหน?',        icon: '🧲' },
  { id: 'scale',    order: 4, label: 'ขยาย & วางระบบ',      question: 'จะโตโดยไม่พังและไม่ต้องทำเองทุกอย่างยังไง?', icon: '🏗️' },
  { id: 'protect',  order: 5, label: 'มาตรฐาน & ความเสี่ยง', question: 'ทำยังไงให้ธุรกิจไม่สะดุดและน่าเชื่อถือ?', icon: '🛡️' },
];

export const BIZ_LABEL: Record<SkillBiz, string> = {
  all: 'ทุกประเภทธุรกิจ', food: 'ร้านอาหาร/แม่ค้า', retail: 'ค้าปลีก',
  service: 'ธุรกิจบริการ', online: 'ออนไลน์/SaaS', manufacture: 'ผลิต/โรงงาน',
  property: 'อสังหาริมทรัพย์', nonprofit: 'องค์กรไม่แสวงกำไร',
};

export const PLAN_LABEL: Record<PlanId, string> = {
  free: 'ฟรี', starter: 'Starter', growth: 'Growth', scale: 'Scale',
};

export const SKILL_CATALOG: SkillEntry[] = [
  { id: 'scale-to-scope-manufacturing', stage: 'scale', biz: 'manufacture', origin: 'signature', minPlan: 'free', valueTier: 3, price: 2490, author: 'b-training-consultant', desc: 'ขนาด vs ความยืดหยุ่น — ตัดสินใจว่าโรงงานควรโตด้วยกำลังผลิตหรือความสามารถเปลี่ยนไลน์ · จุดคุ้มทุนขั้นต่ำลดลง + วงจรชีวิตสินค้าสั้นลง ทำให้ "ต้นทุนต่อหน่วยที่ถูกที่สุด" แพ้ "ต้นทุนต่อหน่วยที่ขายได้จริง" · สมการที่รวมสต็อกค้าง/ของตาย · เวลาเปลี่ยนไลน์เป็นตัวแปรที่กำหนดขนาดล็อตคุ้มทุน · ตารางวินิจฉัย 10 ข้อ · เส้นทางปรับตัวสำหรับโรงที่ใหญ่ไปแล้ว · และเส้นแบ่งว่าเมื่อไหร่ขนาดยังชนะ (โภคภัณฑ์/กระบวนการต่อเนื่อง/เซมิคอนดักเตอร์)' },
  { id: 'pain-gain-discovery', stage: 'validate', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 3, price: 2490, author: 'b-training-consultant', desc: 'หา Pain/Gain point ให้เจอ "ของจริง" ก่อนคิดสินค้า — ยุคนี้ปัจจัย 4 มีครบแล้ว สิ่งที่ขาดคือคนที่เข้าใจว่าลูกค้าเจ็บตรงไหน และคนตัดสินใจด้วยอารมณ์ก่อนแล้วค่อยหาเหตุผลมารองรับ · บันไดความเจ็บ 3 ชั้น (อาการ→ต้นทุน→ความรู้สึก) · คำถามขุด 5 ข้อ + คำถามที่ห้ามถาม · เกณฑ์ 4 ข้อพิสูจน์ว่าเจอของจริงไม่ใช่คำพูดลอย ๆ · Gain 3 ระดับไต่ถึงตัวตน · สูตรแปลงเป็นข้อความที่ใช้ได้ · เส้นแบ่งจริยธรรมเมื่อเข้าใจอารมณ์คนลึก' },
  { id: 'thai-market-data-sources', stage: 'validate', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, author: 'ceo-ai-thailand', desc: 'แหล่งข้อมูลตลาดไทยที่เชื่อถือได้ + วิธีอ้างอิงอย่างโปร่งใส — ตารางเลือกแหล่งตามคำถาม (NSO/DBD/สภาพัฒน์/ธปท./สสว./depa) ขั้นตอนตรวจสอบตัวเลขก่อนใช้ รูปแบบอ้างอิงที่ถูกต้อง และสิ่งที่ห้ามทำเด็ดขาด' },
  { id: 'iso-from-day-one', stage: 'validate', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 3, price: 2490, author: 'b-training-consultant', desc: 'ISO ทำได้ตั้งแต่ปีแรก ไม่ต้องรอโต — ISO ไม่ใช่ใบเซอร์ของบริษัทใหญ่ แต่คือวิธีสร้างธุรกิจให้ทำซ้ำได้และขยายได้ · ธุรกิจปีแรกมี 3-5 กระบวนการและไม่มีของเดิมให้รื้อ = จังหวะที่ถูกที่สุดในชีวิตของธุรกิจนั้น ยิ่งรอยิ่งแพงเพราะต้อง retrofit · ด่านที่แท้จริงไม่ใช่ความพร้อมของธุรกิจ แต่คือความไว้ใจของเจ้าของ · บันได 5 ขั้น (ให้ก่อนขอ → ใช้ตัวเลขของเขา → กล้าบอกความจริงที่ไม่น่าฟัง → ไม่จับข้อมูลเป็นตัวประกัน → ค่อยเอ่ยคำว่า ISO) · ตารางแปลภาษามาตรฐานเป็นภาษาเจ้าของธุรกิจ · กฎห้ามขึ้นต้นคอนเทนต์ด้วยคำว่า ISO กับคนเพิ่งเริ่มธุรกิจ' },
  { id: 'org-context-traceability', stage: 'scale', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 3, price: 2490, author: 'b-training-consultant', desc: 'บริบทองค์กรแบบสืบย้อนได้ 5 ชั้น — BMC → Business Flow → ตารางเมตริกกระบวนการ → เอกสาร → ข้อกำหนด ISO ร้อยไว้ในตารางเดียว แทนการเขียนบริบทเป็นความเรียงที่ไม่เชื่อมกับอะไร · ตอบได้สองทาง: ข้อกำหนดข้อนี้อยู่ในกระบวนการไหนของธุรกิจ และกระบวนการนี้สร้างคุณค่าอะไร · ลำดับการทำ 5 ขั้นที่ห้ามสลับ (เริ่มจากธุรกิจ ไม่ใช่จากหมายเลขข้อ) · ตารางวินิจฉัยว่าเส้นขาดตรงไหนจากอาการที่พบ · คำถามเดียวที่วินิจฉัยได้เร็วที่สุดคือ "ทำไมถึงวัดตัวนี้"' },
  { id: 'data-verification-10-rules', stage: 'validate', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 3, price: 2490, author: 'b-training-consultant', desc: 'กฎตรวจสอบข้อมูล 3 ชั้น 10 ข้อ ก่อนนำตัวเลข/ข่าว/สถิติไปใช้ — ชั้น 1 ตรวจที่มา (ใคร/ลิงก์/ปีล่าสุด/ผลประโยชน์ทับซ้อน) · ชั้น 2 ตรวจเนื้อหา (สมเหตุสมผล/หน่วยและขอบเขตชัด/สอดคล้องแหล่งอื่น/แยกข้อเท็จจริงจากความเห็น) · ชั้น 3 ติดป้าย 🟢 ยืนยันได้ / 🟡 ใช้อย่างระวัง / 🔴 ยังไม่ยืนยัน พร้อมข้อจำกัด · ตารางระดับความลึกของการตรวจ 6 ชั้น (เห็นในดราฟต์→อ่านพาดหัว→อ่านสรุป→เปิดต้นฉบับ→2 แหล่งอิสระ→ต้นทางปฐมภูมิ) กำหนดว่าป้ายสูงสุดที่ให้ได้คืออะไร · หลักการ 4 คำ บอกที่มา·บอกวันที่·บอกขอบเขต·บอกข้อจำกัด' },
  { id: 'news-to-content-pipeline', stage: 'launch', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 3, price: 2490, author: 'ceo-ai-thailand', desc: 'สายการผลิตคอนเทนต์จากข่าว 6 ขั้น — ตรวจข้อเท็จจริงกับต้นทางก่อนเสมอ (สรุปข่าว = เบาะแส ไม่ใช่แหล่งอ้างอิง) → เช็ก/เขียนบทความปลายทางก่อนเขียนโพสต์ → คอนเทนต์แยกทุกแพลตฟอร์มที่ชั้น 3 → URL เต็มต่อแพลตฟอร์ม → ใส่ปฏิทินพร้อมข้อความเต็มก๊อปวางได้ → ไฟล์ฉากคลิปสั้น 1080x1920 · ห้ามหยิบตัวเลขด้านเดียวจากงานวิจัยเดียวกัน · หนึ่งข่าว = อย่างน้อย 2 เวอร์ชัน (มวลชน/คนที่จ่ายได้)' },
  { id: 'video-originality-guard', stage: 'launch', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 3, price: 2490, author: 'b-training-consultant', desc: 'กฎ 5 ข้อกันคลิปโดนตีเป็น Reused/Spam/Low-Value — ห้ามซ้ำรูปแบบแม้เนื้อหาใหม่หมด (โครงสร้าง จังหวะ ภาพ hook ความยาว 7 จุด) · ใส่ลายนิ้วมือมนุษย์ทุกคลิป · เพิ่มคุณค่าไม่ใช่ส่งต่อข้อมูล (แปลความหมาย+ผลกระทบ+ทางออก) · บอกความแตกต่างใน 10 วินาที · เช็คลิสต์ก่อนเผยแพร่ 8 ข้อ · ตารางหมุนโครงสร้าง 6 แบบสำหรับคลิปเป็นซีรีส์ · และวิธีแก้ความขัดแย้งระหว่าง retention กับ originality โดยแยกหลักการออกจากรูปแบบ' },
  { id: 'content-link-contract', stage: 'launch', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, author: 'ceo-ai-thailand', desc: 'สัญญาส่งมอบงานคอนเทนต์ — ห้ามส่งมอบคอนเทนต์โดยไม่มีลิงก์ปลายทางที่ติดตัวย่อแพลตฟอร์ม + บทความจริงที่รองรับ + ตารางพิสูจน์ว่าทุกข้อความในโพสต์มีอยู่ในบทความ · คอนเทนต์ไม่มีปลายทาง = เสียของทั้งหมด · ปลายทางไม่มีเนื้อหา = แย่กว่าไม่มีลิงก์ เพราะเสียความไว้ใจถาวร · Definition of Done 6 ข้อ + ลำดับทำงานที่ถูก (ปลายทางก่อนคอนเทนต์) + ทางเลือกเมื่อยังไม่มีบทความรองรับ' },
  { id: 'social-creative-linking', stage: 'launch', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, author: 'ceo-ai-thailand', desc: 'ออกแบบครีเอทีฟโซเชียลให้คนกดเข้าเว็บได้จริง — แก้ปัญหาปุ่มในภาพกดไม่ได้ทุกแพลตฟอร์ม ด้วยลิงก์สั้นที่จำได้จากการเห็นครั้งเดียว + วางลิงก์ให้ถูกกลไกแต่ละแพลตฟอร์ม + ติด UTM อัตโนมัติเพื่อวัดว่าคอนเทนต์ชิ้นไหนพาคนมา' },
  { id: 'ab-test-plan', stage: 'launch', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Designs A/B test plans with hypothesis, variants, sample size calculations, success metrics, and statistical significance criteria. Use when optimizing conversions or UX.' },
  { id: 'ai-content-policy', stage: 'launch', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Creates AI-generated content policies with disclosure requirements, quality standards, and review processes. Use when standardizing how your business produces AI-assisted content.' },
  { id: 'analytics-setup-guide', stage: 'launch', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Plans web analytics implementation with event tracking, goals, conversion setup, and dashboard configuration. Use when setting up Google Analytics or similar tools from scratch.' },
  { id: 'big-cycle-resilience', stage: 'launch', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, author: 'b-training-consultant', desc: 'Big Cycle Resilience (Prepare-not-Predict) — เพลย์บุ๊กจากแนวคิด Ray Dalio: ระเบียบโลกเดินเป็นวัฏจักรครั้งใหญ่ (หนี้/AI bubble/ช่องว่างรวย-จน) · เปลี่ยนจาก \'ทำนายให้ถูก\' เป็น \'ถ้าคิดผิดจะรอดยังไง\' · กระจายความเสี่ยง (ลูกค้า/รายได้/สินทรัพย์/ทักษะ) · เตรียมภูมิคุ้มกันก่อนวิกฤต — ใช้เมื่อวางแผนความเสี่' },
  { id: 'business-story-content', stage: 'launch', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 1, price: 990, desc: 'Turn a raw Thai business-story transcript (or topic) into a full content kit — a cleaned narration script, a branded lesson carousel (HTML → PNG cards via Playwright), and A/B captions/titles/thumbnails. Use for "คุณบอม"-style business-storytelling videos, repurposing a voice transcript into shareab' },
  { id: 'buying-triggers', stage: 'launch', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, author: 'b-training-consultant', desc: '3 แรงขับที่ทำให้ลูกค้ายอมจ่าย (Deep Buying Triggers) — หัวใจธุรกิจไม่ใช่แค่คุณภาพสินค้า แต่คือการตอบสนองความต้องการเชิงลึก 3 ประการที่ทำให้ผู้บริโภคควักเงินจ่ายเต็มใจ: (1) ขจัดความทุกข์/ปัญหาที่ค้างคาใจ (2) มอบความสะดวก ลดขั้นตอนยุ่งยาก (3) ขายอารมณ์/ประสบการณ์เหนือระดับ (ทรงพลังสุด สร้างลูกค้าประจำ' },
  { id: 'coopetition-brand-positioning', stage: 'launch', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, author: 'b-training-consultant', desc: 'Co-opetition & Comparative Brand Positioning — เพลย์บุ๊กใช้ \'คู่แข่ง\' เป็นแรงยกแบรนด์ จากเคส BMW ปะทะ Mercedes-Benz (คู่กัดกัน 100+ ปี): สร้างจุดยืนที่คมชัดโดยวางตรงข้ามคู่แข่ง (Benz=หรูหรา/ผู้นำ · BMW=The Ultimate Driving Machine), ทำ guerrilla/comparative marketing ที่จิกกัดแบบมีคลาส (punch up ไม่' },
  { id: 'customer-journey-map', stage: 'launch', biz: 'all', origin: 'standard', minPlan: 'free', desc: 'Maps the full customer journey from awareness through advocacy, identifying touchpoints, emotions, pain points, and conversion gaps. Use when a user wants to understand their customer experience end-to-end, find drop-off points, improve conversion at specific stages, or design a better onboarding/pu' },
  { id: 'data-driven-agent', stage: 'launch', biz: 'online', origin: 'signature', minPlan: 'free', valueTier: 1, price: 990, desc: 'ใช้เมื่อผู้ใช้ต้องการวางแผน ออกแบบ หรือให้คำแนะนำเชิงข้อมูล (Data-Driven) ที่เกี่ยวกับ (1) มาตรฐาน ISO/TIS และงาน Compliance (ISO 9001, 14001, 22301, TIS Automate), (2) การออกแบบสถาปัตยกรรม SaaS ด้วย Supabase (Database Schema, API), (3) กลยุทธ์ Digital Marketing เพื่อเพิ่ม Conversion Rate, หรือ (4)' },
  { id: 'emotional-reel', stage: 'launch', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 1, price: 990, desc: 'Create an emotional Thai "โดนใจ" vertical Reel (9:16 text-over-aesthetic-gradient frames) for a target audience — slow-reveal text with a pain → open-loop → realization → hope arc, rendered as ready-to-post PNG frames, plus caption + posting notes. Use for feels/drama short-form content (Reels/TikTo' },
  { id: 'ethical-sales-persuasion', stage: 'launch', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, author: 'b-training-consultant', desc: 'Ethical Sales Persuasion & Fraud Red-Flags — เพลย์บุ๊กสร้างทีมขายที่ \'ดุแต่สะอาด\' จากเคส Jordan Belfort / The Wolf of Wall Street: ทักษะการโน้มน้าว (Straight Line) คืออาวุธที่ทรงพลังที่สุดในธุรกิจ แต่ถ้าปราศจากจริยธรรมมันจะย้อนกลับมาทำลายคุณเอง — สอนเส้นแบ่งระหว่าง \'โน้มน้าว\' กับ \'ปั่นหัว\', โครงสร้า' },
  { id: 'facebook-group-plan', stage: 'launch', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Plans Facebook Group strategy with content schedule, engagement prompts, moderation rules, and growth tactics. Use when launching or revitalizing a Facebook Group for community and lead generation.' },
  { id: 'feature-request-system', stage: 'launch', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Designs feature request collection and prioritization systems with voting, tagging, and roadmap integration. Use when organizing customer input into product decisions.' },
  { id: 'featured-snippet-optimizer', stage: 'launch', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Optimizes content to win featured snippets with format analysis, answer structure, and formatting. Use when targeting position zero in Google search results.' },
  { id: 'google-business-profile', stage: 'launch', biz: 'property', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Optimizes Google Business Profile listings with categories, attributes, posts, Q&A, and review response templates. Use when improving local search presence.' },
  { id: 'internal-comms', stage: 'launch', biz: 'all', origin: 'standard', minPlan: 'starter', desc: 'A set of resources to help me write all kinds of internal communications, using the formats that my company likes to use. Claude should use this skill whenever asked to write some sort of internal communications (status reports, leadership updates, 3P updates, company newsletters, FAQs, incident rep' },
  { id: 'invisible-influence', stage: 'launch', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, author: 'b-training-consultant', desc: 'Invisible Influence & Beyond-Dashboard Brand Building — เพลย์บุ๊กจากผลศึกษา MI GROUP: ~39% ของผู้บริโภคดิจิทัลไทยเป็น \'กลุ่มพลังเงียบ\' (ไม่ Like/Comment/Share แต่จดจำ+ค้นหา+ซื้อภายหลัง) · เข้าใจ 2 แบบ (Quiet Absorber/Intentional Selector) แล้ว \'ทิ้งร่องรอยแบรนด์\' ด้วย 3 กลยุทธ์ Be Found/Be Remembere' },
  { id: 'job-posting', stage: 'launch', biz: 'online', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Writes compelling job descriptions and hiring ads with role summaries, responsibilities, requirements, benefits, and application instructions optimized for job boards and social media. Use when a user needs to hire employees or contractors, wants to post on job boards, or needs a role description fo' },
  { id: 'kpi-dashboard', stage: 'launch', biz: 'all', origin: 'standard', minPlan: 'starter', desc: 'Sets up KPI tracking dashboards in Notion with metrics, targets, status indicators, and trend tracking for any business type. Use when a user wants to track business performance, needs a visual dashboard for key metrics, or wants to replace scattered spreadsheets with a centralized KPI view.' },
  { id: 'landing-page-audit', stage: 'launch', biz: 'all', origin: 'standard', minPlan: 'free', author: 'matthewhitcham', desc: 'Audits landing pages for conversion optimization with layout, copy, social proof, and CTA recommendations. Use when you need to improve a landing page\'s conversion rate or identify why a page is underperforming.' },
  { id: 'link-building-plan', stage: 'launch', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Designs link building strategies with outreach templates, target site lists, and content-based link earning tactics. Use when you need to improve domain authority.' },
  { id: 'marketplace-seo', stage: 'launch', biz: 'online', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Plans SEO strategies for marketplace platforms with category page optimization, review schema, and internal linking. Use when driving organic traffic to a marketplace.' },
  { id: 'networking-strategy', stage: 'launch', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Creates strategic networking plans with target contacts, outreach templates, relationship nurture sequences, and event calendar.' },
  { id: 'privacy-policy', stage: 'launch', biz: 'online', origin: 'standard', minPlan: 'starter', desc: 'Writes GDPR and CCPA-compliant privacy policies for websites, apps, and online businesses with plain-language annotations explaining each section. Use when a user is launching a website, setting up e-commerce, collecting customer data, or needs to update an outdated privacy policy.' },
  { id: 'product-listing-optimizer', stage: 'launch', biz: 'property', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Optimizes e-commerce product listings with titles, bullet points, descriptions, backend keywords, and images for Amazon, Shopify, and other platforms. Use to increase conversions.' },
  { id: 'product-roadmap', stage: 'launch', biz: 'online', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Creates product roadmaps in Notion with milestones, feature priorities, release timelines, and status tracking for SaaS products, apps, courses, or any product with iterative development. Use when a user needs to plan product development, wants to communicate a roadmap to stakeholders, or needs to p' },
  { id: 'property-listing', stage: 'launch', biz: 'property', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Writes compelling property listing descriptions with features, neighborhood highlights, and buyer-targeted copy.' },
  { id: 'reinvention-observational-innovation', stage: 'launch', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, author: 'b-training-consultant', desc: 'เริ่มใหม่ & นวัตกรรมจากการสังเกต (Momofuku Ando) — เพลย์บุ๊กพลิกชีวิตหลังล้มเหลว + เปลี่ยนการสังเกตชีวิตประจำวันเป็นสินค้าที่ขายได้ จากเคสโมโมฟุกุ อันโด ผู้ล้มละลายวัย 48 แล้วสร้าง Nissin/บะหมี่กึ่งสำเร็จรูปที่เลี้ยงคนทั้งโลก: เริ่มใหม่โดยยึด mission ไม่ใช่ ego, ทำ Observation-to-Product (สังเกตพฤติ' },
  { id: 'sales-email-template', stage: 'launch', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Writes individual sales email templates for follow-up, proposal, negotiation, and close scenarios. Use when you need ready-to-send sales emails for specific situations.' },
  { id: 'social-impact-measurement', stage: 'launch', biz: 'nonprofit', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Designs social impact measurement frameworks with indicators, data collection methods, and reporting templates.' },
  { id: 'store-launch-plan', stage: 'launch', biz: 'online', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Plans e-commerce store launches with pre-launch checklist, marketing calendar, launch day playbook, and post-launch optimization priorities. Use when opening an online store.' },
  { id: 'supply-chain-continuity', stage: 'launch', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 3, price: 2490, desc: 'ในมุมมองของ PLG นี่คือ \\"จุดกำเนิดของ Viral Loop (Network Effect)\\" ที่ทรงพลังที่สุดครับ เพราะเราสามารถใช้ข้อกำหนดนี้เป็นเหตุผลให้ลูกค้าระดับ Enterprise \\"เชิญ (Invite)\\" ซัพพลายเออร์' },
  { id: 'trademark-application', stage: 'launch', biz: 'online', origin: 'standard', minPlan: 'scale', author: 'matthewhitcham', desc: 'Guides trademark application preparation with class selection, specimen requirements, and filing checklists. Use when preparing to file a trademark with the USPTO.' },
  { id: 'training-plan', stage: 'launch', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 1, price: 990, author: 'ceo-ai-thailand', desc: 'Builds structured L&D training plans aligned to role competencies, business goals, and skill gaps. Use when creating employee development programs or upskilling roadmaps.' },
  { id: 'youtube-growth', stage: 'launch', biz: 'manufacture', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, author: 'b-training-consultant', desc: 'YouTube Growth Playbook — ถอดสูตรคลิปไวรัล (hook/thumbnail/title/format/length/niche) แล้วแปลงเป็น \'แผนคอนเทนต์ถูกกฎ\' สำหรับ niche ของเรา (SME/มือใหม่อยากมีธุรกิจ) โดยไม่ละเมิดลิขสิทธิ์/ไม่ reupload/ไม่ทำ spam ผลิตซ้ำ — ใช้เมื่อจะเริ่มช่อง YouTube, วางแผนคอนเทนต์วิดีโอ, หรือเห็นคลิปคนอื่นดังแล้วอยาก' },
  { id: 'ai-use-case-finder', stage: 'model', biz: 'all', origin: 'standard', minPlan: 'free', author: 'matthewhitcham', desc: 'Identifies AI automation opportunities in business workflows with feasibility assessment and ROI estimates. Use when evaluating where AI can save time and money in your business.' },
  { id: 'attribution-model', stage: 'model', biz: 'online', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Designs marketing attribution models with channel mapping, weighting logic, reporting recommendations, and implementation steps. Use when understanding which channels drive conversions.' },
  { id: 'budget-planner', stage: 'model', biz: 'all', origin: 'standard', minPlan: 'free', author: 'matthewhitcham', desc: 'Creates monthly and annual business budgets with category breakdowns, variance tracking, and adjustment triggers. Use when building or revising a business budget.' },
  { id: 'cash-flow-forecast', stage: 'model', biz: 'all', origin: 'standard', minPlan: 'free', desc: 'Projects monthly cash flow for 3-12 months from revenue and expense inputs with scenario modeling and runway calculations. Use when a user needs to plan spending, evaluate whether they can afford a hire or investment, or wants to understand when they\'ll run out of (or accumulate) cash.' },
  { id: 'cashflow-liquidity-management', stage: 'model', biz: 'food', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, author: 'b-training-consultant', desc: 'บริหารกระแสเงินสด & สภาพคล่อง (เคส \'เนื้อแท้\') — เพลย์บุ๊กกัน \'กำไรทิพย์\' จากกรณีร้านอาหารรายได้สูงแต่จ่ายเงินเดือนไม่ได้เพราะขยายสาขาเร็วเกินและเงินจมในสต็อก: แยก \'กำไรทางบัญชี vs เงินสดจริง\', บริหารเงินทุนหมุนเวียนและวงจรเงินสด (Cash Conversion Cycle), พยากรณ์สภาพคล่องล่วงหน้า 13 สัปดาห์, และประเม' },
  { id: 'cohort-analysis', stage: 'model', biz: 'all', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Creates cohort analysis frameworks for understanding retention, revenue, and behavior patterns over time. Use when measuring how user groups perform across their lifecycle.' },
  { id: 'cost-analysis', stage: 'model', biz: 'service', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Performs cost-of-goods-sold and cost-per-unit analyses with margin calculations and optimization recommendations. Use when analyzing product or service costs.' },
  { id: 'decoy-effect', stage: 'model', biz: 'service', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, desc: 'ใช้เมื่อผู้ใช้ต้องการออกแบบ Pricing, Package, หรือตัวเลือกสินค้า/บริการด้วยหลักจิตวิทยา Decoy Effect. ให้ AI สร้างตัวเลือก Decoy ที่ดูไม่คุ้มค่าเพื่อผลักดันสินค้าเป้าหมาย, วิเคราะห์พฤติกรรมผู้บริโภค และแนะนำจำนวน Decoy ที่เหมาะสม. ใช้ทุกครั้งที่มีคำว่า \'Pricing\', \'Package\', \'ตัวเลือก\', \'แพ็กเกจ\', \'โ' },
  { id: 'financial-dashboard', stage: 'model', biz: 'all', origin: 'standard', minPlan: 'growth', desc: 'Creates a financial KPI tracking dashboard structure with revenue, expenses, margins, runway, and trend analysis. Use this skill when a business owner wants a single view of their financial health, needs to set up KPI tracking, or wants to monitor financial metrics consistently.' },
  { id: 'financial-model', stage: 'model', biz: 'all', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Builds financial models for startups with revenue drivers, cost assumptions, and sensitivity analysis. Use when creating detailed financial models for fundraising or planning.' },
  { id: 'financial-projection', stage: 'model', biz: 'all', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Builds 12-month financial projections with revenue scenarios, expense forecasting, and break-even analysis. Use when planning future revenue and expenses for your business.' },
  { id: 'grant-report', stage: 'model', biz: 'nonprofit', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Writes grant progress and final reports with metric tracking, narrative updates, and financial accounting.' },
  { id: 'investment-property-analysis', stage: 'model', biz: 'property', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Analyzes rental investment properties with cash flow projections, cap rate calculations, and ROI scenarios.' },
  { id: 'marketplace-fee-structure', stage: 'model', biz: 'online', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Designs marketplace fee structures with commission models, premium tiers, and competitive analysis. Use when setting or restructuring pricing for a platform business.' },
  { id: 'performance-review', stage: 'model', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 1, price: 990, author: 'ceo-ai-thailand', desc: 'Designs 360-degree performance review systems with evaluation forms, rating scales, KPI measurement, and development plans. Use when building or improving employee performance management.' },
  { id: 'platform-ecosystem-moat', stage: 'model', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, author: 'b-training-consultant', desc: 'Platform Ecosystem & Value-Chain Moat — เพลย์บุ๊กจากเคส NVIDIA: ขยับจาก \'ขายชิ้นส่วน/สินค้าโภคภัณฑ์\' เป็น \'เจ้าของแพลตฟอร์ม/ระบบนิเวศ\' ที่คนอื่นต้องมาต่อ · สร้าง moat ด้วยพันธมิตร+มาตรฐาน (ไม่ใช่แค่ตัวสินค้า) · คุมทรัพยากรคอขวดในซัพพลายเชน · นิยามหมวดใหม่ — ใช้เมื่อสินค้าเริ่มถูกเทียบแต่ราคา หรือจะย' },
  { id: 'pricing-calculator', stage: 'model', biz: 'service', origin: 'standard', minPlan: 'free', author: 'matthewhitcham', desc: 'Builds pricing models, comparison tables, and rate calculators for services, products, and subscriptions with profit margin analysis and competitive positioning. Use when a user needs to set prices for their offerings, wants to create tiered pricing, or needs to calculate freelance rates, project fe' },
  { id: 'pricing-strategy', stage: 'model', biz: 'service', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Develops pricing strategies with market positioning, perceived value analysis, and price sensitivity testing. Use when setting or revising prices for products or services.' },
  { id: 'process-automation-audit', stage: 'model', biz: 'all', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Identifies automation opportunities in business processes with tool recommendations, ROI estimates, and implementation priority rankings.' },
  { id: 'profit-loss-report', stage: 'model', biz: 'all', origin: 'standard', minPlan: 'starter', desc: 'Generates monthly or quarterly profit and loss statements from transaction data with revenue breakdowns, expense categories, and margin analysis. Use this skill when a solopreneur or small business owner needs to understand if they are actually profitable, wants a formatted P&L report, or needs to r' },
  { id: 'proposal-writer', stage: 'model', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Generates complete client proposals from a conversational scope discussion, producing a professional document with executive summary, problem statement, proposed solution, deliverables, pricing, timeline, and terms. Use when a user needs to send a proposal to a prospect, formalize a project scope, o' },
  { id: 'revenue-forecast', stage: 'model', biz: 'all', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Projects revenue with multiple scenarios using historical data and market factors. Use when forecasting future revenue for planning or reporting.' },
  { id: 'saas-evaluation', stage: 'model', biz: 'online', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Evaluates SaaS tools for business adoption with feature comparison, pricing analysis, and migration planning. Use when choosing between software options for your business.' },
  { id: 'saas-metrics-dashboard', stage: 'model', biz: 'online', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Sets up SaaS metrics dashboards tracking MRR, churn, LTV, CAC, expansion revenue, and cohort retention. Use when building or improving subscription business analytics.' },
  { id: 'value-investing-discipline', stage: 'model', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, author: 'b-training-consultant', desc: 'วินัยจัดสรรทุนแบบเน้นคุณค่า (Warren Buffett) — เพลย์บุ๊กวินัยการลงทุน/ตัดสินใจจัดสรรทุนจากหลักคิดของวอร์เรน บัฟเฟตต์ ที่เลือกถือเงินสดสำรองสูงเป็นประวัติการณ์แทนการไล่ตามกระแสหุ้น AI: ลงทุนเฉพาะสิ่งที่เข้าใจจริง (Circle of Competence), ซื้อเมื่อมีส่วนเผื่อความปลอดภัย (Margin of Safety = ราคา < มูลค่' },
  { id: 'vendor-evaluation', stage: 'model', biz: 'service', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Creates structured vendor and tool comparison matrices with weighted scoring, cost analysis, and recommendation summaries for making informed purchasing decisions. Use when a user needs to choose between software tools, service providers, or vendors and wants a systematic evaluation rather than a gu' },
  { id: 'ai-ethics-policy', stage: 'protect', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Creates AI usage policies for businesses with transparency commitments, bias mitigation, and disclosure guidelines. Use when establishing responsible AI practices.' },
  { id: 'becoming-resilient', stage: 'protect', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 1, price: 990, desc: 'Becoming Resilient\\" Implementation Master' },
  { id: 'business-continuity-plan', stage: 'protect', biz: 'all', origin: 'standard', minPlan: 'scale', author: 'matthewhitcham', desc: 'Develops business continuity plans with risk assessment, recovery procedures, and communication protocols to keep operations running during crises.' },
  { id: 'data-collection-plan', stage: 'protect', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Plans data collection strategies with tracking requirements, privacy compliance, storage recommendations, and implementation steps. Use when building your business data infrastructure.' },
  { id: 'is-pdpa', stage: 'protect', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 3, price: 2490, desc: 'กรอบจัดทำและตรวจประเมินมาตรการรักษาความมั่นคงปลอดภัยข้อมูลส่วนบุคคลตาม PDPA (ประกาศ พ.ศ. 2565) — ครอบคลุมมาตรการเชิงองค์กร เทคนิค กายภาพ และการควบคุมการเข้าถึง' },
  { id: 'papa-legitimate-interests-assessment', stage: 'protect', biz: 'online', origin: 'signature', minPlan: 'free', valueTier: 3, price: 2490, desc: 'This skill defines the technical, legal, and operational framework for designing, implementing, and documenting **Legitimate Interests (GDPR Article 6(1)(f))** within Software-as-a-Service (SaaS) platforms built for ISO standards (ISO 9001, ISO 14001, ISO 22301) and IDE systems. It integrates the th' },
  { id: 'pdpa', stage: 'protect', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 3, price: 2490, desc: 'การประยุกต์ใช้ PDPA' },
  { id: 'pdpa-design-by-de', stage: 'protect', biz: 'online', origin: 'signature', minPlan: 'free', valueTier: 3, price: 2490, desc: '## Overview This skill defines the operational framework for developing, auditing, and maintaining Software-as-a-Service (SaaS) platforms for ISO standards (such as ISO 9001, ISO 14001, ISO 22301) and IDE systems. It embeds **Data Protection by Design and by Default (DPbDD)** under **Article 25 of t' },
  { id: 'risk-assessment', stage: 'protect', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Conducts business risk assessments with likelihood and impact scoring, mitigation strategies, and monitoring plans for proactive risk management.' },
  { id: 'ai-service-gap', stage: 'scale', biz: 'service', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, author: 'b-training-consultant', desc: 'AI Service Gap & Real-Demand Solopreneur — เพลย์บุ๊กจากเคส Ty Chen (เด็ก 16 ทำบริการ AI ~$25k/เดือน): พิสูจน์ Demand จริง (คนยอมจ่าย/เสียเวลา ไม่ใช่ยอดวิว) · กฎ 90/10 ลงมือทำ · หา Service Gap (AI ทำได้ แต่คนไม่มีเวลาทำเอง) · Pivot เร็วเมื่อถูกดิสรัปต์ · ส่งเกินคาด→Referrals · Paid Test Projects คัดท' },
  { id: 'automation-workflow', stage: 'scale', biz: 'all', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Designs automation workflows with trigger-action sequences, tool connections, and error handling procedures. Use when automating repetitive business processes.' },
  { id: 'bcms', stage: 'protect', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 3, price: 2490, desc: 'ออกแบบระบบบริหารความต่อเนื่องทางธุรกิจตาม ISO 22301 — ให้ธุรกิจไม่สะดุดเมื่อเกิดเหตุไม่คาดฝัน ตามวงจร PDCA' },
  { id: 'bcms-saas', stage: 'protect', biz: 'online', origin: 'signature', minPlan: 'free', valueTier: 3, price: 2490, desc: 'มาตรฐานความต่อเนื่องชุดขยาย ISO 22313/22317/22318/22330/22331 — วิเคราะห์ผลกระทบธุรกิจ (BIA) และวางแผนฟื้นคืนการดำเนินงาน' },
  { id: 'business-building-24-step', stage: 'validate', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 3, price: 2490, desc: 'สร้างธุรกิจ 24 ขั้นตอนตามแนวทาง Disciplined Entrepreneurship ของ MIT — ลดความเสี่ยงด้วยการทดสอบสมมติฐานอย่างเป็นระบบ ตั้งแต่หาตลาดจนถึงขยาย' },
  { id: 'change-management-plan', stage: 'scale', biz: 'all', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Creates change management plans with stakeholder analysis, communication strategy, and transition timelines for smooth business changes.' },
  { id: 'compensation-design', stage: 'scale', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 1, price: 990, author: 'ceo-ai-thailand', desc: 'Designs competitive salary structures, benefits packages, and incentive schemes. Use when building or reviewing compensation frameworks for teams or entire organizations.' },
  { id: 'customer-win-story', stage: 'scale', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Transforms customer successes into internal win stories with metrics, timeline, and key moments for team motivation and learning.' },
  { id: 'data-dashboard-design', stage: 'scale', biz: 'all', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Plans data dashboard layouts with metric selection, visualization types, refresh frequency, and user-focused design. Use when building dashboards that drive decisions.' },
  { id: 'energy-management', stage: 'scale', biz: 'all', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Maps energy levels to task types for optimized daily scheduling with peak performance time blocks and recovery periods.' },
  { id: 'impact-report', stage: 'scale', biz: 'nonprofit', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Creates annual impact reports with metric visualization, beneficiary stories, and donor recognition sections.' },
  { id: 'insect-biomimicry-business-strategy', stage: 'scale', biz: 'manufacture', origin: 'signature', minPlan: 'free', valueTier: 1, price: 990, desc: 'กลยุทธ์การอยู่รอดและเติบโตของธุรกิจ (Business Survival & Growth Strategy) ถอดรหัสจากอภิสิ่งมีชีวิตแมลง (Superorganisms) ครอบคลุม 4 เสาหลักกลยุทธ์ทางธุรกิจ การกำหนดแก่นธุรกิจ, การเติบโตแบบทวีคูณ, ความเชี่ยวชาญและการป้องกันความเสี่ยง, และการปรับตัวตามวงจรชีวิตผลิตภัณฑ์' },
  { id: 'inventory-management', stage: 'scale', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Sets up inventory tracking systems with reorder points, supplier management, and stockout prevention for product-based businesses.' },
  { id: 'iso-9001', stage: 'scale', biz: 'manufacture', origin: 'signature', minPlan: 'free', valueTier: 3, price: 2490, desc: 'สร้างระบบ ISO 9001' },
  { id: 'knowledge-base-builder', stage: 'scale', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Structures internal knowledge bases with categories, article templates, and maintenance procedures for organized business documentation.' },
  { id: 'marketplace-metrics', stage: 'scale', biz: 'online', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Defines and tracks marketplace health metrics including liquidity, take rate, GMV, and supply/demand balance. Use when measuring and optimizing marketplace performance.' },
  { id: 'metric-definition-guide', stage: 'scale', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Creates metric glossaries defining how each business KPI is calculated, tracked, and interpreted with formulas, data sources, and ownership. Use for team alignment on numbers.' },
  { id: 'property-management-sop', stage: 'scale', biz: 'property', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Builds property management SOPs for maintenance requests, inspections, rent collection, and tenant communication.' },
  { id: 'rbv', stage: 'scale', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 1, price: 990, desc: 'วิเคราะห์ทรัพยากรภายในด้วย Resource-Based View + VRIO — หาว่าอะไรคือข้อได้เปรียบที่คู่แข่งลอกไม่ได้จริง' },
  { id: 'saas-onboarding-flow', stage: 'scale', biz: 'online', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Designs SaaS user onboarding flows with activation milestones, tooltip sequences, and success metrics. Use when building or improving new user onboarding experiences.' },
  { id: 'talent-acquisition', stage: 'scale', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 1, price: 990, author: 'ceo-ai-thailand', desc: 'Designs end-to-end talent acquisition strategy including sourcing channels, interview process, candidate scoring, and offer management. Use when building or improving recruitment pipelines.' },
  { id: 'team-onboarding', stage: 'scale', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 1, price: 990, author: 'ceo-ai-thailand', desc: 'Creates structured 30/60/90-day onboarding plans for new hires. Use when designing new employee orientation programs to accelerate time-to-productivity.' },
  { id: 'turnaround-debt-negotiation', stage: 'scale', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, author: 'b-training-consultant', desc: 'เจรจาพลิกวิกฤตหนี้ & Turnaround (Trump 1990) — เพลย์บุ๊กเจรจาจาก \'จุดที่ดูอ่อนแอที่สุด\' จากเคสวิกฤตหนี้ของโดนัลด์ ทรัมป์ปี 1990: เมื่อเป็นหนี้ท่วมตัว พลิกเกมด้วยหลัก Mutual Downside (ทำให้การล้มของคุณคือความเสียหายของเจ้าหนี้ → เขามีเหตุผลทางธุรกิจที่จะประคองคุณไว้), ใช้สินทรัพย์ไม่จับต้อง (แบรนด์/ค' },
  { id: 'value-proposition-canvas', stage: 'scale', biz: 'all', origin: 'standard', minPlan: 'free', author: 'matthewhitcham', desc: 'Maps value propositions using the Value Proposition Canvas framework with customer jobs, pains, and gains. Use when refining your product-market fit messaging.' },
  { id: 'ai-dark-marketing', stage: 'validate', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, desc: 'การทำการตลาดโดยใช้กลไกที่เกี่ยวข้องกับฮอร์โมนในสมองของมนุษย์' },
  { id: 'benchmarking-report', stage: 'validate', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Creates industry benchmarking reports comparing business metrics against standards and best-in-class performers. Use when evaluating where your business stands versus peers.' },
  { id: 'competitor-analysis', stage: 'validate', biz: 'all', origin: 'standard', minPlan: 'free', author: 'matthewhitcham', desc: 'Conducts a structured competitor analysis with comparison matrices, positioning maps, gap identification, and strategic recommendations. Use when a user wants to understand their competitive landscape, needs to differentiate their offering, or is preparing a go-to-market strategy.' },
  { id: 'conversion-funnel-analysis', stage: 'validate', biz: 'all', origin: 'standard', minPlan: 'free', author: 'matthewhitcham', desc: 'Maps and analyzes conversion funnels with drop-off identification, optimization priorities, and benchmarking. Use when diagnosing where prospects are lost in your sales process.' },
  { id: 'customer-centric-disruption', stage: 'validate', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, author: 'b-training-consultant', desc: 'Customer-Centric Disruption & Category Design — เพลย์บุ๊กพลิกตลาดจากเคส Honda NSX ตบหน้า Ferrari: จับ Pain Point ที่วงการสั่งให้ลูกค้าทน (แล้วเรียกว่าคาแรคเตอร์) มาสร้างหมวดหมู่ใหม่ (Everyday X) โดยไม่ลดคุณภาพหลัก, ทำ \'ได้ทั้งคู่\' เป็นกำแพงกันลอก และดึงผู้เชี่ยวชาญตัวจริงมายกระดับให้เป็นตำนาน — ใช้ก' },
  { id: 'customer-lifetime-value', stage: 'validate', biz: 'all', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Calculates customer lifetime value with segmentation, prediction models, and retention investment recommendations. Use when determining how much a customer is worth over time.' },
  { id: 'customer-persona', stage: 'validate', biz: 'all', origin: 'standard', minPlan: 'free', author: 'matthewhitcham', desc: 'Creates detailed customer personas with demographics, psychographics, buying behaviors, and messaging preferences for targeted marketing.' },
  { id: 'customer-segmentation', stage: 'validate', biz: 'all', origin: 'standard', minPlan: 'free', author: 'matthewhitcham', desc: 'Segments customers by behavior, value, and needs with tailored communication strategies per segment for targeted engagement.' },
  { id: 'customer-success-playbook', stage: 'validate', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Creates customer success playbooks with lifecycle stages, touchpoint cadence, and expansion opportunity identification for retention and growth.' },
  { id: 'emotional-benefit-repositioning', stage: 'validate', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, author: 'b-training-consultant', desc: 'Emotional Benefit Repositioning & Deep Consumer Insight — เพลย์บุ๊กจากเคส Halls (No.1 Brand Thailand 11 ปีซ้อน): พลิกสินค้าจาก \'ขายคุณสมบัติ\' (feature เช่น ความเย็น) เป็น \'ขายช่วงเวลา/insight ทางใจ\' (เย็นไว้..หายใจแล้วไปต่อ), ขุดความเข้าใจผู้บริโภคให้ลึกจนครองใจในตลาดแดงเดือด และกล้าออกของใหม่ (NPD)' },
  { id: 'feedback-analysis', stage: 'validate', biz: 'service', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Analyzes customer feedback data to identify themes, sentiment patterns, and actionable improvement priorities for product and service decisions.' },
  { id: 'keyword-research', stage: 'validate', biz: 'online', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Conducts keyword research with search volume estimates, difficulty assessment, and content mapping recommendations. Use when planning SEO-driven content.' },
  { id: 'linkedin-strategy', stage: 'validate', biz: 'all', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Builds LinkedIn personal brand strategy with posting schedule, content themes, engagement tactics, and connection outreach. Use when growing your professional presence and generating leads on LinkedIn.' },
  { id: 'market-insight-thailand', stage: 'validate', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 1, price: 990, author: 'b-training-consultant', desc: 'ข้อมูลประชากรไทยล่าสุด + กลยุทธ์เจาะตลาดตาม Generation, จังหวัดกำลังซื้อสูง และตลาด Expat — ใช้เมื่อวางแผนการตลาด กำหนดกลุ่มเป้าหมาย โทนสื่อสาร หรือเลือกพื้นที่ยิง Ads ในประเทศไทย' },
  { id: 'market-research', stage: 'validate', biz: 'all', origin: 'standard', minPlan: 'free', desc: 'Conducts market sizing, trend analysis, audience segmentation, and opportunity assessment for business ideas and products. Use when a user is validating a new business idea, entering a new market, preparing a pitch deck, or needs data to support strategic decisions.' },
  { id: 'market-sizing', stage: 'validate', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Estimates TAM, SAM, and SOM with top-down and bottom-up methodologies, assumptions documentation, and presentation-ready outputs. Use for business plans or investor pitches.' },
  { id: 'market-validation', stage: 'validate', biz: 'service', origin: 'signature', minPlan: 'free', valueTier: 1, price: 990, author: 'b-training-consultant', desc: 'Market Validation Skill (Data-Driven Discovery) — คัดกรองไอเดียก่อนเริ่มลงมือสร้าง (Build) เพื่อลดความเสี่ยงทำของที่ไม่มีคนจ่ายเงิน — ใช้เมื่อได้ไอเดียสินค้า/บริการ/โมดูลใหม่ ก่อนอนุมัติพัฒนา' },
  { id: 'negotiation-leverage-timing', stage: 'validate', biz: 'all', origin: 'signature', minPlan: 'free', valueTier: 2, price: 1500, author: 'b-training-consultant', desc: 'Negotiation Leverage & Market Timing — เพลย์บุ๊กเจรจาเชิงกลยุทธ์จากเคส Pixar × Steve Jobs: สร้างอำนาจต่อรอง (BATNA) จากนอกโต๊ะ, จับจังหวะตลาด, พลิกวิกฤต/feedback เป็นการอัปเกรด และรื้อสัญญาที่เสียเปรียบมาเจรจาใหม่ — ใช้ก่อนปิดดีลใหญ่ ระดมทุน ต่อรองสัญญาคู่ค้า หรือขึ้นราคา' },
  { id: 'pricing-analysis', stage: 'validate', biz: 'all', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Analyzes pricing effectiveness with elasticity estimates, competitor benchmarking, value perception, and optimization recommendations. Use when evaluating or adjusting your pricing.' },
  { id: 'revenue-model', stage: 'validate', biz: 'all', origin: 'standard', minPlan: 'free', author: 'matthewhitcham', desc: 'Designs revenue models with pricing tiers, unit economics, LTV calculations, and growth projections. Use when planning or validating your business revenue strategy.' },
  { id: 'sentiment-analysis', stage: 'validate', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Analyzes customer sentiment from reviews, social media, and support tickets with trend tracking, theme categorization, and alert recommendations. Use for brand health monitoring.' },
  { id: 'seo-competitor-analysis', stage: 'validate', biz: 'all', origin: 'standard', minPlan: 'growth', author: 'matthewhitcham', desc: 'Analyzes competitor SEO strategies with keyword overlap, content gaps, backlink profiles, and ranking comparisons. Use when you need to benchmark against competitors.' },
  { id: 'survey-analysis', stage: 'validate', biz: 'all', origin: 'standard', minPlan: 'starter', author: 'matthewhitcham', desc: 'Analyzes survey results with statistical summaries, cross-tabulations, trend identification, and actionable insight recommendations. Use when interpreting survey data for decisions.' },];

/** ทักษะทั้งหมดในขั้นตอนนี้ */
export function skillsForStage(stage: SkillStage): SkillEntry[] {
  return SKILL_CATALOG.filter((s) => s.stage === stage);
}

/** ทักษะที่เหมาะกับธุรกิจประเภทนี้ (รวมตัวที่ใช้ได้ทุกธุรกิจ) */
export function skillsForBiz(biz: SkillBiz): SkillEntry[] {
  return biz === 'all' ? [...SKILL_CATALOG] : SKILL_CATALOG.filter((s) => s.biz === biz || s.biz === 'all');
}

/** ราคาซื้อขาดของทักษะ signature (standard = 0 เพราะรวมมากับแพ็ก) */
export function priceOf(skill: SkillEntry): number {
  return skill.origin === 'signature' ? (skill.price ?? 0) : 0;
}

/** มูลค่าเทียบ "จ้างที่ปรึกษาทำให้" — ใช้สื่อสารความคุ้มค่าอย่างมีที่มา ไม่ใช่ตัวเลขลอย */
export const CONSULTANT_EQUIV: Record<1 | 2 | 3, number> = { 1: 8_000, 2: 15_000, 3: 30_000 };
export function consultantEquivOf(skill: SkillEntry): number {
  return skill.origin === 'signature' && skill.valueTier ? CONSULTANT_EQUIV[skill.valueTier] : 0;
}

/** ผู้ใช้เป็นเจ้าของทักษะนี้แล้วหรือยัง (ซื้อขาด = ถาวร ไม่หายเมื่อลดแพ็ก) */
export function ownsSkill(owned: readonly string[], id: string): boolean {
  return owned.includes(id);
}

/** ใช้ทักษะนี้ได้ไหม
 *  · signature = ต้องซื้อ (เป็นเจ้าของถาวร ไม่ผูกกับแพ็ก — ลดแพ็กแล้วยังใช้ได้)
 *  · standard  = ปลดตามแพ็กรายเดือน */
export function canUseSkill(plan: PlanId, skill: SkillEntry, owned: readonly string[] = []): boolean {
  return skill.origin === 'signature'
    ? ownsSkill(owned, skill.id)
    : PLAN_RANK[plan] >= PLAN_RANK[skill.minPlan];
}

/** ทักษะที่ใช้ได้จริงตอนนี้ (แพ็ก + ที่ซื้อไว้) */
export function skillsForPlan(plan: PlanId, owned: readonly string[] = []): SkillEntry[] {
  return SKILL_CATALOG.filter((s) => canUseSkill(plan, s, owned));
}

export function signatureSkills(): SkillEntry[] {
  return SKILL_CATALOG.filter((s) => s.origin === 'signature');
}
export function standardSkills(): SkillEntry[] {
  return SKILL_CATALOG.filter((s) => s.origin === 'standard');
}

/** ผู้เขียนที่ถือว่าเป็น "ของเราเอง" — เฉพาะกลุ่มนี้เท่านั้นที่นำมาขายรายตัวได้ */
export const OWN_AUTHORS = ['b-training-consultant', 'ceo-ai-thailand', 'CEO AI Thailand'] as const;

/** ข้อความเครดิตผู้เขียน — คืน null ถ้าเป็นของเราเอง (ไม่ต้องเครดิตตัวเอง) */
export function creditFor(skill: SkillEntry): string | null {
  if (!skill.author) return null;
  if ((OWN_AUTHORS as readonly string[]).includes(skill.author)) return null;
  return `เนื้อหาต้นฉบับโดย ${skill.author}`;
}

/** ราคารวมของทักษะ signature ทั้งหมด (ใช้โชว์มูลค่าคลังความรู้) */
export const SIGNATURE_TOTAL_PRICE = signatureSkills().reduce((sum, s) => sum + priceOf(s), 0);
export const SIGNATURE_COUNT = signatureSkills().length;

/** ส่วนลดเมื่อซื้อยกชุดในขั้นตอนเดียวกัน — ยิ่งซื้อหลายตัว ยิ่งลด (สูงสุด 25%)
 *  เหตุผล: ทักษะในขั้นเดียวกันใช้ต่อเนื่องกัน การซื้อยกชุดให้ผลลัพธ์ดีกว่าซื้อเดี่ยว */
export function bundleDiscount(count: number): number {
  if (count >= 6) return 0.25;
  if (count >= 4) return 0.18;
  if (count >= 2) return 0.10;
  return 0;
}

export interface BundleQuote {
  items: SkillEntry[];
  listPrice: number;
  discount: number;   // 0–1
  price: number;      // ราคาสุทธิ (ปัดเป็นจำนวนเต็ม)
  saved: number;
}

/** ใบเสนอราคายกชุดของขั้นตอนหนึ่ง — ตัดตัวที่ผู้ใช้ซื้อไปแล้วออก (ไม่คิดเงินซ้ำ) */
export function bundleQuote(stage: SkillStage, owned: readonly string[] = []): BundleQuote {
  const items = skillsForStage(stage).filter((s) => s.origin === 'signature' && !ownsSkill(owned, s.id));
  const listPrice = items.reduce((sum, s) => sum + priceOf(s), 0);
  const discount = bundleDiscount(items.length);
  const price = Math.round(listPrice * (1 - discount));
  return { items, listPrice, discount, price, saved: listPrice - price };
}

/** สรุปจำนวนต่อขั้นตอน (ใช้โชว์บน Landing) */
export function catalogSummary(): { stage: StageMeta; total: number; free: number; signature: number }[] {
  return SKILL_STAGES.map((stage) => {
    const list = skillsForStage(stage.id);
    return {
      stage,
      total: list.length,
      free: list.filter((s) => s.origin === 'standard' && s.minPlan === 'free').length,
      signature: list.filter((s) => s.origin === 'signature').length,
    };
  });
}

/** จำนวนทักษะที่ใช้ได้ฟรี — ตัวเลขที่ใช้โฆษณาได้อย่างซื่อสัตย์ */
export const FREE_SKILL_COUNT = SKILL_CATALOG.filter((s) => s.origin === 'standard' && s.minPlan === 'free').length;
export const TOTAL_SKILL_COUNT = SKILL_CATALOG.length;

/** AI แนะนำทักษะถัดไป: เอาขั้นที่ผู้ใช้อยู่เป็นหลัก แล้วเติมขั้นถัดไป
 *  done = id ทักษะที่ใช้ไปแล้ว (ไม่แนะนำซ้ำ) */
export function recommendSkills(
  opts: { stage: SkillStage; biz?: SkillBiz; plan: PlanId; owned?: string[]; done?: string[]; limit?: number },
): SkillEntry[] {
  const { stage, biz = 'all', plan, owned = [], done = [], limit = 5 } = opts;
  const cur = SKILL_STAGES.find((s) => s.id === stage)?.order ?? 1;
  const seen = new Set(done);
  const fit = (s: SkillEntry) => s.biz === biz || s.biz === 'all';
  const score = (s: SkillEntry) => {
    const o = SKILL_STAGES.find((x) => x.id === s.stage)?.order ?? 9;
    const stageGap = o < cur ? 9 : o - cur;               // ขั้นปัจจุบันมาก่อน แล้วขั้นถัดไป
    const bizBonus = s.biz !== 'all' && s.biz === biz ? -0.5 : 0; // ตรงประเภทธุรกิจ = ดันขึ้น
    const lockPenalty = canUseSkill(plan, s, owned) ? 0 : 0.4;   // ที่ใช้ได้เลยมาก่อน แต่ยังโชว์ที่ล็อกไว้ให้เห็นคุณค่า
    return stageGap + bizBonus + lockPenalty;
  };
  return SKILL_CATALOG
    .filter((s) => !seen.has(s.id) && fit(s))
    .sort((a, b) => score(a) - score(b) || a.id.localeCompare(b.id))
    .slice(0, limit);
}
