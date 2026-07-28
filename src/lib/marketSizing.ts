// marketSizing.ts — วิจัยตลาด + ประเมินขนาดตลาด (TAM/SAM/SOM) ที่ CMO นำเสนอ
// pure + deterministic → เทสต์ได้ · ตัวเลขเป็นการประมาณจากสมมติฐาน (ระบุชัด) ไม่ใช่ข้อเท็จจริง
// AI path (agent-run + Serper) เติมตัวเลขจริงได้ · path นี้ = fallback + โครงคำนวณ

export interface SizingInput {
  annualRevenuePerCustomer: number; // ARPU ต่อปี (บาท) — จากราคาแพ็ก/ดีลเฉลี่ยของผู้ใช้
  businessBase?: number;            // จำนวนลูกค้า/ธุรกิจเป้าหมายทั้งหมด (default = SME ไทย ~3.2M)
  serviceablePct?: number;          // % ที่โมเดลธุรกิจเข้าถึงได้จริง → SAM (default 3%)
  capturePctYr1?: number;           // % ที่คว้าได้ปี 1-2 → SOM (default 0.5% ของ SAM)
}

export interface SizingResult {
  tam: number; sam: number; som: number;
  tamRange: [number, number]; samRange: [number, number]; somRange: [number, number];
  customersSom: number;             // จำนวนลูกค้าโดยประมาณใน SOM
  assumptions: string[];
}

const TH_SME_BASE = 3_200_000; // MSME ไทยโดยประมาณ (แหล่ง: OSMEP ~3.2 ล้านราย) — สมมติฐาน ปรับได้
const clampPct = (p: number) => Math.max(0, Math.min(100, p));
const band = (n: number, pct = 0.25): [number, number] => [Math.round(n * (1 - pct)), Math.round(n * (1 + pct))];

/** คำนวณ TAM/SAM/SOM (top-down) + ช่วง ±25% · ระบุสมมติฐานทุกตัว */
export function estimateSizing(inp: SizingInput): SizingResult {
  const base = Math.max(0, inp.businessBase ?? TH_SME_BASE);
  const arpu = Math.max(0, inp.annualRevenuePerCustomer);
  const svPct = clampPct(inp.serviceablePct ?? 3);
  const capPct = clampPct(inp.capturePctYr1 ?? 0.5);

  const tam = Math.round(base * arpu);
  const samCustomers = Math.round(base * (svPct / 100));
  const sam = Math.round(samCustomers * arpu);
  const customersSom = Math.round(samCustomers * (capPct / 100));
  const som = Math.round(customersSom * arpu);

  return {
    tam, sam, som,
    tamRange: band(tam), samRange: band(sam), somRange: band(som),
    customersSom,
    assumptions: [
      `ฐานลูกค้าเป้าหมาย ~${base.toLocaleString()} ราย${inp.businessBase ? '' : ' (SME ไทย ~3.2M · OSMEP)'}`,
      `รายได้เฉลี่ยต่อลูกค้า/ปี ~฿${arpu.toLocaleString()}`,
      `เข้าถึงได้จริง (SAM) ~${svPct}% ของฐาน`,
      `คว้าได้ปี 1-2 (SOM) ~${capPct}% ของ SAM = ~${customersSom.toLocaleString()} ราย`,
      'ตัวเลขเป็นการประมาณจากสมมติฐาน — ปรับ input ให้ตรงธุรกิจจริงเพื่อความแม่นยำ',
    ],
  };
}

/* ── คะแนนโอกาสตลาด (5 ปัจจัย 1-5) ── */
export interface OppFactors {
  size: number;            // ขนาดตลาด (ใหญ่=ดี)
  growth: number;          // การเติบโต (โต=ดี)
  competition: number;     // ความรุนแรงคู่แข่ง (มาก=แย่ → กลับค่า)
  barrier: number;         // อุปสรรคเข้าตลาด (สูง=เข้ายาก → กลับค่า)
  differentiation: number; // ความต่างของเรา (มาก=ดี)
}
export interface OppScore { score: number; label: string; verdict: string }

const clamp15 = (n: number) => Math.max(1, Math.min(5, n));

/** คะแนนรวม (1-5) — competition/barrier กลับค่า (6-x) เพราะยิ่งมากยิ่งแย่ต่อผู้เข้าใหม่ */
export function opportunityScore(f: OppFactors): OppScore {
  const parts = [clamp15(f.size), clamp15(f.growth), 6 - clamp15(f.competition), 6 - clamp15(f.barrier), clamp15(f.differentiation)];
  const score = Math.round((parts.reduce((s, v) => s + v, 0) / parts.length) * 10) / 10;
  const label = score >= 4 ? '🟢 น่าลงทุน' : score >= 3 ? '🟡 มีโอกาส (บริหารความเสี่ยง)' : '🔴 ระวัง (ตลาดหิน)';
  const verdict = score >= 4
    ? 'ช่องว่างชัด + เราต่างพอ — เดินหน้าโฟกัส segment หลัก'
    : score >= 3
      ? 'มีช่อง แต่ต้องคมเรื่องจุดต่างและ segment เฉพาะ'
      : 'ตลาดแข่งสูง/เข้ายาก — หา niche หรือปรับโมเดลก่อนทุ่มทรัพยากร';
  return { score, label, verdict };
}

/** prompt ให้ CMO (agent-run + Serper) วิจัยตลาด + ประเมินขนาด แล้วนำเสนอ */
export function cmoResearchPrompt(ctx: { industry?: string; goal?: string; value?: string; arpu?: number }): string {
  return (
    'คุณคือ CMO (ประธานเจ้าหน้าที่การตลาด) วิจัยตลาดสำหรับธุรกิจนี้ในประเทศไทย แล้วนำเสนอสรุปเชิงผู้บริหารเป็นภาษาไทย: ' +
    `ธุรกิจ/หมวด: ${ctx.industry ?? '-'} · เป้าหมาย: ${ctx.goal ?? '-'} · คุณค่าหลัก: ${ctx.value ?? '-'}${ctx.arpu ? ` · รายได้/ลูกค้า/ปี ~฿${ctx.arpu.toLocaleString()}` : ''}. ` +
    'ครอบคลุม: (1) ขนาดตลาด TAM/SAM/SOM (ประมาณพร้อมสมมติฐาน) (2) กลุ่มลูกค้าเป้าหมาย 2-3 กลุ่ม + ความเต็มใจจ่าย ' +
    '(3) คู่แข่งหลัก + ช่องว่างที่ยังไม่มีใครทำ (4) เทรนด์ 3-5 ข้อ (5) คะแนนโอกาส + ข้อเสนอเชิงกลยุทธ์. ' +
    'ใช้ข้อมูลตลาดไทยล่าสุดถ้าค้นได้ อ้างอิงแหล่ง และบอกตรง ๆ ถ้าตัวเลขเป็นการประมาณ'
  );
}
