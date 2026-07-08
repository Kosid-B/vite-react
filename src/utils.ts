export function autoH(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

/* ===== PromptPay QR (EMVCo / มาตรฐานธนาคารแห่งประเทศไทย) ===== */

function tlv(id: string, value: string): string {
  return id + value.length.toString().padStart(2, '0') + value;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** แปลงเบอร์โทร/เลขบัตรประชาชน/เลขผู้เสียภาษีเป็นรูปแบบ proxy ของพร้อมเพย์ */
function formatTarget(raw: string): { tag: string; value: string } | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 13) return { tag: '02', value: digits }; // เลขบัตร / ผู้เสียภาษี
  if (digits.length >= 9 && digits.length <= 10) {
    // เบอร์มือถือ -> 0066 + เลข 9 หลัก (ตัด 0 นำหน้า)
    const local = digits.replace(/^0/, '');
    return { tag: '01', value: '0066' + local };
  }
  return null;
}

/** สร้าง payload string สำหรับ PromptPay QR. คืนค่าว่างถ้าข้อมูลไม่ถูกต้อง */
export function promptPayPayload(target: string, amount?: number): string {
  const t = formatTarget(target);
  if (!t) return '';
  const merchant = tlv('00', 'A000000677010111') + tlv(t.tag, t.value);
  let payload =
    tlv('00', '01') +
    tlv('01', amount && amount > 0 ? '12' : '11') + // 12 = dynamic (มีจำนวนเงิน), 11 = static
    tlv('29', merchant) +
    tlv('53', '764') + // สกุลเงิน THB
    tlv('58', 'TH');
  if (amount && amount > 0) payload += tlv('54', amount.toFixed(2));
  payload += '6304';
  return payload + crc16(payload);
}

/** URL รูป QR พร้อมเพย์ (ใช้บริการ promptpay.io ฝั่งเบราว์เซอร์ผู้ใช้) */
export function promptPayQrUrl(target: string, amount?: number): string {
  const digits = target.replace(/\D/g, '');
  const amt = amount && amount > 0 ? `/${amount.toFixed(2)}` : '';
  return `https://promptpay.io/${digits}${amt}.png`;
}

export function baht(n: number): string {
  // ทน input undefined/null/NaN (data จาก localStorage/Supabase อาจไม่ครบ) — กันหน้าเพจล่ม
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return '฿' + v.toLocaleString('th-TH');
}
