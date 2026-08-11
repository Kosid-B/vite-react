/* ===== Funnel Trace — วัด "ความลึกของความสนใจ" บน Landing (PDPA-safe) =====
 * ตอบคำถาม "คนเข้าแล้วค้างตรงไหน/ออกตอนไหน" โดยไม่บันทึก cursor path / ไม่เก็บ PII
 * ส่งเป็น GA event รวม (anonymous): scroll depth · dwell · exit depth · rage click
 * ไฟล์นี้ = ตรรกะ pure (คำนวณ % + milestone + rage) ให้ test ได้ · ส่วน DOM อยู่ใน hook */

/** % การเลื่อน (0–100) จาก scrollY + ความสูงเอกสาร + viewport — clamp กัน NaN/เกินช่วง */
export function scrollPct(scrollY: number, docHeight: number, viewportH: number): number {
  const scrollable = docHeight - viewportH;
  if (!Number.isFinite(scrollable) || scrollable <= 0) return 100; // หน้าสั้นกว่าจอ = เห็นครบแล้ว
  const pct = (scrollY / scrollable) * 100;
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/** คืน milestone ที่ "เพิ่งข้าม" (มากกว่า prevMax และ ≤ pct) — ผู้เรียกอัปเดต prevMax เอง */
export function crossedMilestones(prevMax: number, pct: number, milestones: number[]): number[] {
  return milestones.filter((m) => m > prevMax && pct >= m).sort((a, b) => a - b);
}

/** ตัวตรวจ rage-click: คลิกถี่ ≥ threshold ครั้งในหน้าต่างเวลา windowMs (ไม่เก็บพิกัด) */
export function createRageDetector(windowMs = 1000, threshold = 3) {
  let times: number[] = [];
  return {
    /** push เวลา (ms) ของคลิก → true ถ้าเข้าเกณฑ์ rage (แล้วรีเซ็ตกันยิงซ้ำรัว) */
    push(t: number): boolean {
      times = times.filter((x) => t - x < windowMs);
      times.push(t);
      if (times.length >= threshold) { times = []; return true; }
      return false;
    },
  };
}
