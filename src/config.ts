// ===== ตั้งค่าแบรนด์ & ข้อมูลบริษัท (แก้ที่เดียว ใช้ทั้งระบบ) =====

export const BRAND = {
  product: 'CEO AI Thailand',
  tagline: 'แพลตฟอร์มสร้างบริษัท AI อัตโนมัติสำหรับธุรกิจไทย',
};

// อีเมลผู้ดูแลระบบ (เห็น/จัดการทุกเวิร์กสเปซ) — เทียบแบบไม่สนตัวพิมพ์เล็ก-ใหญ่
export const ADMIN_EMAILS = ['support@b-tctraining.com'];

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase());
}

export const COMPANY = {
  name: 'B. Training Consultant (Management Engineering and Agriculture) Co., Ltd.',
  nameTh: 'บริษัท บี. เทรนนิ่ง คอนซัลแตนท์ (การจัดการวิศวกรรมและการเกษตร) จำกัด',
  address: '72/76 หมู่ที่ - ตำบลเนินพระ อำเภอเมืองระยอง จังหวัดระยอง 21000',
  tel: '081-781-7773',
  website: 'https://www.b-tctraining.com/',
  // เลขประจำตัวผู้เสียภาษี 13 หลัก (นิติบุคคล) — ใช้ในใบกำกับภาษี + หน้าข้อมูลบริษัท
  taxId: '0215558006160',
};

// ช่องทางรับชำระเงิน (แสดงบนหน้าจ่ายเงิน + ใบกำกับภาษี)
export const PAYMENT = {
  // โอนเข้าบัญชีธนาคาร
  bankName: 'ธนาคารกสิกรไทย (KASIKORNBANK)',
  bankBranch: 'สาขาเซ็นทรัล ระยอง',
  accountName: 'บจก. บี. เทรนนิ่ง คอนซัลแทนท์ (การจัดการ งานวิศวกรรม และเกษตรกรรม)',
  accountNo: '009-8-92560-0', // ยืนยันตรงสมุดบัญชีจริง (กสิกรไทย สาขาเซ็นทรัล ระยอง)
  // PromptPay (สำหรับ QR) — เลขผู้เสียภาษีบริษัท 13 หลัก (PromptPay นิติบุคคล → เงินเข้าบัญชีบริษัท)
  //   ⚠️ ต้องผูก PromptPay นิติบุคคลเลขนี้กับบัญชีบริษัทในแอปธนาคารก่อน QR จึงเข้าเงินได้
  promptpayId: '0215558006160',
  // ✅ เปิดเป็น true เฉพาะเมื่อ 'ลงทะเบียน PromptPay นิติบุคคล (เลขภาษี) กับธนาคารสำเร็จ' แล้วเท่านั้น
  //   K BIZ (KBank) ไม่รองรับ PromptPay เลขภาษี → ปล่อย false แล้วใช้ 'โอนเข้าบัญชีบริษัท + อัปสลิป' แทน
  //   (เงินเข้าบัญชีบริษัทตรง ๆ) · ถ้า false จะไม่แสดง QR เลขภาษีที่สแกนไม่ติด (กันลูกค้าสับสน)
  promptpayLive: false,
  // 🖼️ ถ้ามี 'QR ร้านค้า' จาก K BIZ / K SHOP (เป็นไฟล์รูป) → วาง URL รูปที่นี่ จะแสดง QR นี้แทน
  //   = QR ที่ใช้ได้จริงกับ KBIZ โดยไม่ต้องมี PromptPay เลขภาษี (เงินเข้าบัญชีบริษัทเช่นกัน)
  //   เว้นว่าง = ไม่แสดง QR (ใช้โอนเข้าบัญชีตามเลขด้านบน)
  qrImageUrl: '',
  // ⚙️ ชำระออนไลน์อัตโนมัติผ่าน Xendit — เปลี่ยนเป็น true เมื่อ Xendit อนุมัติบัญชี (ผ่าน KYC),
  //    deploy ฟังก์ชัน create-invoice + xendit-webhook และตั้ง XENDIT keys ครบแล้ว (ดู COMMAND.md)
  xenditLive: false,
  // 🔁 ตัดเงินอัตโนมัติทุกงวด (auto-renew · Xendit Recurring API) — เปิดเมื่อ xenditLive แล้ว +
  //    deploy create-recurring-plan + recurring-webhook และตั้ง webhook URL ใน Xendit dashboard
  recurringLive: false,
  // ⚙️ ชำระออนไลน์ผ่าน Omise / Opn Payments (ทางเลือกแทน Xendit) — เปลี่ยนเป็น true เมื่อ Omise อนุมัติบัญชี (KYC),
  //    deploy ฟังก์ชัน omise-create-charge + omise-webhook และตั้ง secret OMISE_SECRET_KEY + OMISE_PUBLIC_KEY (ดู COMMAND.md)
  omiseLive: false,
  // Omise Public Key (pkey_… เป็น publishable key = public ฝังได้) — ใส่เมื่อ omiseLive
  omisePublicKey: '',
  // 💳 ชำระออนไลน์ผ่าน Stripe (subscription mode — ตัดเงินอัตโนมัติทุกงวดในตัว, ไม่ต้องพึ่ง cron) —
  //    เปลี่ยนเป็น true เมื่อ Stripe อนุมัติบัญชี (KYC), deploy ฟังก์ชัน stripe-create-checkout + stripe-webhook
  //    และตั้ง secret STRIPE_SECRET_KEY (sk_…) + STRIPE_WEBHOOK_SECRET (whsec_…) (ดู COMMAND.md)
  stripeLive: true,
  // Stripe Publishable Key (pk_… = public ฝังได้โดยดีไซน์ Stripe) — ใช้เมื่อ stripeLive (เผื่อ Payment Element อนาคต)
  stripePublicKey: 'pk_live_51TGcB6EMwgw9S6CEZ7NQ1CA5Lly8WH6mK6QtsPGPOdErQ2J7qf3D6F3hJpqsvbMaXPv9ExYz2K58s11hkGgQGGcc00XRklUVkU',
  // 🔗 Stripe Payment Link (static) — ทางลัดรับชำระเงินโดยไม่ต้อง deploy edge function
  //    แนบ client_reference_id=workspaceId เพื่อให้ webhook map กลับได้ (ถ้าตั้ง)
  //    ⚠️ 1 ลิงก์ = 1 ราคา/สินค้า · การอัปเกรดแพ็กอัตโนมัติต้องตั้ง webhook (ดู docs/integrations/stripe-payments.md)
  //  บัตร (subscription) — ตัดเงินอัตโนมัติทุกงวด (Stripe รองรับเฉพาะบัตรกับ subscription)
  stripePaymentLinkCard: 'https://buy.stripe.com/9B6cN59V0cndax6fcI5AQ00',
  //  PromptPay (one-time) — จ่าย QR ครั้งเดียว (สร้าง Payment Link แบบ one-time + เปิด PromptPay ใน Stripe แล้ววาง URL ที่นี่)
  //  ⚠️ PromptPay ใช้กับ subscription ไม่ได้ ต้องเป็น one-time เท่านั้น
  stripePaymentLinkPromptPay: 'https://buy.stripe.com/14AcN5aZ4drh9t26Gc5AQ01',
  // 🎯 ISO Readiness Pilot (one-time paid pilot ฿1,990) — ข้อเสนอปิดการขายสำหรับ outreach beachhead ISO
  //    (concierge ประเมินความพร้อม + ใช้ระบบเต็ม 1 เดือน) · สร้าง Payment Link one-time ใน Stripe แล้ววาง URL ที่นี่
  //    เว้นว่าง = ยังไม่เปิดขาย → การ์ด Pilot ในหน้า pricing จะซ่อนอัตโนมัติ (ไม่มีปุ่มพัง)
  stripePaymentLinkPilot: '',
  // ราคา Pilot (แสดงผลในการ์ด) — ปรับได้
  pilotPrice: '฿1,990',
  // 🔒 ตรวจสลิปกับ record ธนาคารจริงผ่าน SlipOK (ปิดช่องโหว่ "อัปรูปมั่วก็เปิดฟรี")
  //   false (ตอนนี้): อัปสลิป → เปิดแพ็กทันที (เชื่อผู้ใช้) + แอดมินตรวจย้อนหลัง — UX ลื่นแต่มีความเสี่ยง
  //   true: อัปสลิป → edge function verify-slip เรียก SlipOK ตรวจจริง (ยอด+บัญชีผู้รับ+กันสลิปซ้ำ)
  //         แล้ว "เปิดแพ็กฝั่ง server" เท่านั้น — ปิดช่องโหว่สมบูรณ์
  //   เปิดเป็น true เมื่อ: (1) สมัคร SlipOK (มาตรฐาน SME ไทย) ได้ branchId + apiKey
  //     (2) deploy ฟังก์ชัน verify-slip (3) ตั้ง secret SLIPOK_API_KEY + SLIPOK_BRANCH_ID
  //     (ออปชัน SLIPOK_RECEIVER_HINT = เลขบัญชีบางส่วนไว้จับคู่ผู้รับเพิ่ม · default ปิด เพราะ
  //      บัญชีผูกกับสาขา SlipOK แล้ว SlipOK ตรวจผู้รับให้ในตัว)
  //   ✅ LIVE: branch #72160 + บัญชี K BIZ 0098925600 เชื่อมต่อ SlipOK แล้ว (ก.ค. 2569)
  slipOkLive: true,
};

// Product Catalog หลาย SKU บนหน้าร้าน — gate จนกว่าจะ apply migration
//   เปลี่ยนเป็น true เมื่อ: apply supabase/migrations/0049_storefront_products.sql
//     (เพิ่มคอลัมน์ products jsonb ในตาราง storefronts) แล้ว deploy
//   ปรัชญา: ไม่จำกัดจำนวน SKU (Free/Starter ไม่อั้น → ถูกค้นเจอเยอะ) · เก็บเงินจาก transaction 3% + หลายบริษัท
//   local mode ใช้งานได้ทันที (เก็บใน localStorage) · flag คุมเฉพาะการเขียน products ลง Supabase (กันพังก่อน migrate)
export const CATALOG = {
  // เปิดใช้แล้ว — migration 0049 (storefronts.products) apply บน prod แล้ว ส.ค. 2569
  live: true,
};

// ปักหมุดพิกัดร้าน (lat/lng) บนหน้าร้าน — gate การเขียน lat/lng ลง Supabase จนกว่าจะ apply migration
//   เปลี่ยนเป็น true เมื่อ apply supabase/migrations/0050_storefront_geo.sql (เพิ่มคอลัมน์ lat/lng) แล้ว
//   local mode ใช้งานได้ทันที (เก็บใน localStorage) · flag คุมเฉพาะการเขียนลง Supabase (กันพังก่อน migrate)
export const GEO = {
  // เปิดใช้แล้ว — migration 0050 (storefronts.lat/lng) apply บน prod แล้ว ส.ค. 2569
  live: true,
};

// การเข้าสู่ระบบ
export const AUTH = {
  // เข้าสู่ระบบด้วยเบอร์โทร (OTP ทาง SMS) — ปิดไว้จนกว่าจะตั้งค่า SMS provider ใน Supabase
  //   Auth → Providers → Phone (เช่น Twilio/MessageBird) มิฉะนั้นขึ้น "Unsupported phone provider"
  //   ระหว่างนี้ผู้ใช้เข้าสู่ระบบด้วยอีเมล (Magic Link) ได้ตามปกติ · เปลี่ยนเป็น true เมื่อ SMS พร้อม
  phoneOtp: false,
};

// โมเดลโควตา AI แบบ "token" (0052) — มิเตอร์ + ซื้อ token เพิ่ม ในหน้า Billing
//   ต้องเปิดพร้อมกับฝั่ง server: supabase secrets set ENFORCE_AI_TOKENS=true แล้ว redeploy
//     ฟังก์ชัน ai-assist / ai-plan / agent-run (ไม่งั้น client โชว์ token แต่ server ยังบังคับเป็น call)
//   false: มิเตอร์/ท็อปอัปเป็น "จำนวน call" (ระบบเดิม) · guest daily-free token = live อยู่แล้ว (แยกส่วน)
//   เพดาน/ราคา token = src/lib/tokenEconomics.ts (margin ≥30% ทุกแพ็ก)
//   ✅ LIVE ส.ค. 2569 — ตั้ง secret ENFORCE_AI_TOKENS=true บน prod แล้ว
//      (Supabase: secret มีผลทันที ไม่ต้อง redeploy — docs/guides/functions/secrets)
export const TOKENS = {
  live: true,
};

// ช่องทางชุมชน/โซเชียล — โชว์บนหน้า Landing เฉพาะเมื่อใส่ URL (เว้นว่าง = ซ่อน)
//   ⚠️ เว้นว่างไว้จนกว่าจะสร้างกลุ่มจริง (LINE OpenChat / กลุ่ม Facebook) แล้วค่อยวางลิงก์
export const SOCIAL = {
  lineCommunityUrl: '',      // ลิงก์เชิญเข้า LINE OpenChat / LINE OA community (เช่น https://line.me/ti/g2/...)
  facebookGroupUrl: '',      // ลิงก์กลุ่ม Facebook (ถ้ามี)
  // ช่อง YouTube ทางการ (ยืนยันโดยเจ้าของ 22 ส.ค. 2569) — ใช้ใน JSON-LD `sameAs`
  //   ⇒ บอก Google/AI ว่าช่องนี้กับเว็บนี้เป็น entity เดียวกัน (แก้ปัญหาสับสนกับ Siam AI ได้อีกชั้น)
  //   🟡 คลิปที่เคยลงได้ 942 วิว · คงผู้ชม 89% · แต่ผู้ติดตาม 0 และแทบไม่มีใครกดออกมาเว็บ
  //      ⇒ มี demand ต่อ "ความรู้" ยังไม่มีหลักฐานว่ามี demand ต่อ "เครื่องมือ"
  youtubeUrl: 'https://www.youtube.com/@CEOAIThailand',
  /* 🔴 sameAs ของ Organization schema — บอก Google ว่าโปรไฟล์เหล่านี้คือ "entity เดียวกัน" กับเว็บนี้
   *    ปล่อยว่างไว้เพราะ **ยังไม่มี URL ที่ยืนยันแล้ว** — เดา URL แล้วใส่ = บอก Google ผิดเรื่อง entity
   *    ซึ่งแก้ยากกว่าไม่ใส่เลย · `brandEntity.entityIssues()` จะรายงานเป็น blocker จนกว่าจะกรอก
   *    ⚠️ ชื่อบนโปรไฟล์ต้องสะกดว่า "CEO AI Thailand" ให้ตรงกันทุกที่ ไม่งั้น Google ผูกไม่ติด */
  facebookPageUrl: '',
  linkedinUrl: '',
};

// การเชื่อมต่อที่ User ทำเอง (OAuth) — gate จนกว่าจะตั้งค่า + deploy ครบ (ดู supabase/README.md)
export const INTEGRATIONS = {
  // Google Sheets: User เชื่อมบัญชี Google ของตัวเอง → ระบบเขียนรายงานลงชีตของเขา
  // เปลี่ยนเป็น true เมื่อ: (1) สร้าง OAuth Client ใน Google Cloud + ใส่ googleClientId ด้านล่าง
  //   (2) deploy ฟังก์ชัน sheets-oauth + sheets-sync (3) ตั้ง secret GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET
  sheetsLive: false,
  // OAuth 2.0 Client ID (เป็นค่า public ฝังได้) จาก Google Cloud Console → Credentials
  googleClientId: '',
  // เส้นทาง callback ที่ต้องลงทะเบียนใน Google Cloud (Authorized redirect URI)
  googleRedirectPath: '/oauth/google',
  // theossphere → CEO AI Context Handoff (แผน 24 ขั้น → pre-fill บริษัท AI)
  // เปลี่ยนเป็น true เมื่อ: deploy handoff-import + ตั้ง secret THEOSSPHERE_HANDOFF_SECRET (แชร์กับ theossphere)
  //   (ดู docs/integrations/theossphere-handoff.md) · route /handoff รับ token แล้ว pre-fill
  theossphereLive: false,
  // LINE Login: เข้าสู่ระบบด้วยบัญชี LINE (คนไทยมีทุกคน + ฟรี ไม่มีค่า SMS)
  // เปลี่ยนเป็น true เมื่อ: (1) สร้าง LINE Login channel ใน LINE Developers + ใส่ lineChannelId ด้านล่าง
  //   (2) deploy ฟังก์ชัน line-login (3) ตั้ง secret LINE_CHANNEL_ID/LINE_CHANNEL_SECRET
  //   (ดู docs/integrations/line-login.md) · Callback URL ที่ต้องลงทะเบียนใน LINE = <origin>/oauth/line
  lineLoginLive: false,
  // LINE Login Channel ID (เป็นค่า public ฝังได้)
  lineChannelId: '',
  // เส้นทาง callback ที่ต้องลงทะเบียนใน LINE Developers (Callback URL)
  lineRedirectPath: '/oauth/line',
};

/* ธีมมินิมอล (สว่าง) — เปิดใช้ทั้งแอปแล้ว (เจ้าของสั่งเปิด 22 ส.ค. 2569)
 *
 * 🟢 เงื่อนไขที่ตั้งไว้ผ่านแล้ว — วัดซ้ำล่าสุด **23 ส.ค. 2569** (เดินครบ 50 หน้า × 2 ธีม)
 *    `npm run dev` + `node scripts/contrast-audit.mjs 4.5` · 🔴 (contrast < 2.0) = **0 จุด**
 *
 * ⚠️ **เคยหลุดกลับมาเป็น 13 จุดโดยไม่มีใครรู้** (พบ 23 ส.ค. · ledger #46)
 *    สาเหตุ: บล็อกกฎธีมสว่างที่สร้างอัตโนมัติ ทำให้ตัวอักษรเข้มขึ้น "เทียบพื้นหน้าเว็บ"
 *    แต่ของที่แก้อยู่บน **ปุ่ม/การ์ดที่มีพื้นหลังสีตายตัว** ⇒ ยิ่งแก้ยิ่งแย่ (ได้ 1.17–1.42)
 *    ⇒ **ตัวเลข 0 ไม่ใช่สถานะถาวร — ต้องวัดซ้ำทุกครั้งที่แตะสี/ธีม**
 *
 * 🟡 สิ่งที่ยังไม่ผ่านและต้องรู้ (ไม่ใช่ของที่ลืม — เป็นจุดบอดที่ประกาศไว้):
 *    · ยังเหลือ 🟠 15 จุด (contrast 2.0–3.0 = อ่านออกแต่ฝืนสายตา) แยกเป็นธีมสว่าง 8 · ธีมเข้ม 7
 *      ⇒ ทั้งสองธีมมีพอ ๆ กัน ธีมสว่างไม่ได้แย่กว่า
 *    · ตัวเลขทั้งหมดวัดจาก **ข้อมูลโหมด local** (ไม่มี Supabase) — หน้าที่ต้องมีข้อมูลจริง
 *      จึงจะเรนเดอร์ครบ ยังไม่เคยถูกวัด
 *
 * inAppLive = false ⇒ ซ่อนปุ่มสลับธีมใน sidebar **และบังคับธีมเข้มเมื่ออยู่ในแอป**
 *   (ซ่อนปุ่มอย่างเดียวไม่พอ — คนที่เลือกมินิมอลไว้แล้วจะติดอยู่ในหน้าจอที่อ่านไม่ออกโดยออกไม่ได้)
 * ถ้าต้องปิดกลับ: ตั้งเป็น false แล้ว "ผู้ที่ค้างอยู่ในธีมสว่าง" จะถูกดึงกลับธีมเข้มอัตโนมัติ
 * รายงานเต็ม: docs/review/CONTRAST-AUDIT-2026-08-22.md */
export const THEME = {
  inAppLive: true,
};
