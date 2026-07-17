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
  // PromptPay (สำหรับ QR) — ใช้เบอร์/เลขผู้เสียภาษีที่ลงทะเบียนพร้อมเพย์ไว้
  promptpayId: '0817817773',
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
  stripeLive: false,
  // Stripe Publishable Key (pk_… = public ฝังได้) — ใส่เมื่อ stripeLive (ยังไม่ใช้ในโค้ดตอนนี้ เผื่อ Payment Element อนาคต)
  stripePublicKey: '',
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
