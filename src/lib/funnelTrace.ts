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

/* ── "กำลังดูส่วนนี้อยู่ไหม" ────────────────────────────────────────────────
 * 🔴 บั๊กที่วัดเจอจริง 20 ส.ค. 2569: เดิมใช้ IntersectionObserver{threshold:0.5}
 *    = ต้องเห็น "ครึ่งหนึ่งของบล็อก" ถึงจะเริ่มนับเวลา
 *    แต่บนมือถือ (iPhone 13 · จอ 664px) วัดความสูงจริงของบล็อกบน Landing ได้:
 *      quickcheck 2045px · pricing 2284px · roadmap 1921px · trust 1707px · team 1501px
 *    บล็อกที่สูงเกิน 2 เท่าของจอ **เป็นไปไม่ได้ทางเรขาคณิต** ที่จะเห็นถึง 50%
 *    ⇒ เวลาที่คนใช้กับ "เครื่องคำนวณ" และ "ราคา" — สองบล็อกสำคัญที่สุดของธุรกิจ —
 *      ถูกบันทึกเป็น 0 มาตลอด ไม่ใช่เพราะไม่มีคนดู แต่เพราะเครื่องมือวัดไม่ได้
 *
 * เกณฑ์ใหม่จึงต้องมองสองทาง: เห็นบล็อกไปครึ่งหนึ่ง **หรือ** บล็อกนี้กินพื้นที่จอไปครึ่งจอ
 * (บล็อกยาว ๆ ที่เต็มจออยู่ = กำลังอ่านอยู่แน่นอน แม้จะเห็นแค่ 20% ของบล็อก) */

/** สัดส่วนของจอที่บล็อกต้องกิน ถึงจะถือว่า "กำลังดูบล็อกนี้" */
export const SECTION_VIEWPORT_SHARE = 0.5;
/** สัดส่วนของตัวบล็อกที่ต้องเห็น ถึงจะถือว่า "กำลังดูบล็อกนี้" (ใช้กับบล็อกเตี้ยกว่าจอ) */
export const SECTION_SELF_SHARE = 0.5;

/** threshold ที่ต้องสมัครไว้ — ต้องถี่พอให้บล็อกสูง ๆ (ratio สูงสุดต่ำ) ยังมี callback ตอนข้ามเกณฑ์ */
export const SECTION_THRESHOLDS = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.35, 0.5, 0.75, 1];

/**
 * บล็อกนี้ถือว่า "กำลังถูกดู" ไหม
 * @param ratio            intersectionRatio (ส่วนของบล็อกที่เห็น)
 * @param intersectionH    ความสูง (px) ของส่วนที่เห็นจริงในจอ
 * @param viewportH        ความสูงจอ (px)
 */
export function sectionInView(ratio: number, intersectionH: number, viewportH: number): boolean {
  if (!(intersectionH > 0)) return false;
  const vh = Number.isFinite(viewportH) && viewportH > 0 ? viewportH : 0;
  if (vh > 0 && intersectionH / vh >= SECTION_VIEWPORT_SHARE) return true;
  return Number.isFinite(ratio) && ratio >= SECTION_SELF_SHARE;
}
