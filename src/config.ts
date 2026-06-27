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
  // ⬇️ ใส่เลขประจำตัวผู้เสียภาษี 13 หลัก เพื่อให้ใบกำกับภาษีสมบูรณ์ตามกฎหมาย
  taxId: '',
};

// ช่องทางรับชำระเงิน (แสดงบนหน้าจ่ายเงิน + ใบกำกับภาษี)
export const PAYMENT = {
  // โอนเข้าบัญชีธนาคาร
  bankName: 'ธนาคารกสิกรไทย (KASIKORNBANK)',
  bankBranch: 'สาขาเซ็นทรัล ระยอง',
  accountName: 'บจก. บี. เทรนนิ่ง แอนด์ คอนซัลแทนท์',
  accountNo: '005-3-92560-0', // ⚠️ โปรดยืนยันเลขบัญชีให้ถูกต้อง
  // PromptPay (สำหรับ QR) — ใช้เบอร์/เลขผู้เสียภาษีที่ลงทะเบียนพร้อมเพย์ไว้
  promptpayId: '0817817773',
};
