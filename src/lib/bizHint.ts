// bizHint.ts — จำ "ธุรกิจที่ผู้ใช้พิมพ์บนหน้า Landing" ไว้ (first-party นิรนามใน localStorage)
// เพื่อพาต่อเข้าแอป: prefill ประเภทธุรกิจใน Setup Wizard ให้ "ตรงกับที่กรอกไว้" (ต่อเนื่อง ไม่ต้องกรอกซ้ำ)
// PDPA: ไม่มี PII (เป็นคำอธิบายธุรกิจสั้น ๆ ที่ผู้ใช้พิมพ์เอง) · ล้างได้ด้วย clearBizHint()

const KEY = 'ceo_ai_biz_hint';
const MAX = 80;

/** บันทึกคำที่ผู้ใช้พิมพ์ (ตัดช่องว่าง/จำกัดความยาว) — ข้ามถ้าว่าง */
export function rememberBizHint(text: string | null | undefined): void {
  const v = (text ?? '').trim().slice(0, MAX);
  if (!v) return;
  try { localStorage.setItem(KEY, v); } catch { /* noop */ }
}

export function readBizHint(): string {
  try { return (localStorage.getItem(KEY) ?? '').trim(); } catch { return ''; }
}

export function clearBizHint(): void {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
