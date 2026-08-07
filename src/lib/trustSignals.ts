// trustSignals.ts — สัญญาณความน่าเชื่อถือ "ของจริง" บนหน้า Landing (Dark AI Marketing #17 เชิงจริยธรรม)
// ห้ามปั้นตัวเลขผู้ใช้/โลโก้ลูกค้าปลอม — ใช้เฉพาะข้อเท็จจริงของแบรนด์ (authority/PDPA/risk-reversal)

export interface TrustSignal { icon: string; label: string }

export const TRUST_SIGNALS: TrustSignal[] = [
  { icon: '🎓', label: 'รากฐาน MIT 24 ขั้น × ระบบบริหาร/ISO ที่ปรึกษา 20 ปี (B.TC)' },
  { icon: '🇹🇭', label: 'ออกแบบเพื่อ SME/มือใหม่ไทยโดยเฉพาะ' },
  { icon: '🔒', label: 'PDPA · ข้อมูลเป็นของคุณ ลบได้ทุกเมื่อ' },
  { icon: '🎁', label: 'เริ่มฟรี ไม่ต้องใส่บัตร' },
];
