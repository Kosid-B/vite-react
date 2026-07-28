// topup.ts — แพ็ก "ซื้อ AI calls เพิ่ม" เมื่อใกล้/เกินโควตาเดือน (pure, tested)
// ราคาออกแบบให้กำไร > 20% แม้ทุก call เป็นงานหนักสุด (agent-run ~฿0.75/call · ดู aiCost.ts)
//   +500  cost worst ฿375  → ฿490 (margin 23%)
//   +1000 cost worst ฿750  → ฿990 (margin 24%)
//   +3000 cost worst ฿2250 → ฿2,900 (margin 22%)
// credits ใช้ได้เฉพาะเดือนที่ซื้อ (ไม่ทบไปเดือนถัดไป) — ตรงกับ ai_topup.month ฝั่ง server

export interface TopupPack {
  id: string;
  calls: number;      // จำนวน AI calls ที่ได้เพิ่ม
  price: number;      // บาท
  label: string;
  best?: boolean;     // แพ็กแนะนำ (คุ้มสุด)
}

export const TOPUP_PACKS: TopupPack[] = [
  { id: 'topup_500',  calls: 500,  price: 490,   label: '+500 AI calls' },
  { id: 'topup_1000', calls: 1000, price: 990,   label: '+1,000 AI calls', best: true },
  { id: 'topup_3000', calls: 3000, price: 2900,  label: '+3,000 AI calls' },
];

export function packById(id: string): TopupPack | undefined {
  return TOPUP_PACKS.find(p => p.id === id);
}

/** ราคาต่อ call ของแพ็ก (บาท ทศนิยม 2) — ใช้โชว์ "เฉลี่ย ฿x/call" */
export function pricePerCall(pack: TopupPack): number {
  return pack.calls > 0 ? +(pack.price / pack.calls).toFixed(2) : 0;
}

/** ควรชวนซื้อ top-up ไหม — เมื่อใช้ไปแล้ว ≥ 80% ของโควตา */
export function shouldOfferTopup(used: number, quota: number): boolean {
  return quota > 0 && used / quota >= 0.8;
}

/** แนะนำแพ็กจาก "จำนวนที่น่าจะขาด" — เลือกแพ็กเล็กสุดที่ครอบคลุม, ไม่มี → แพ็กใหญ่สุด */
export function recommendPack(callsNeeded: number): TopupPack {
  const sorted = [...TOPUP_PACKS].sort((a, b) => a.calls - b.calls);
  return sorted.find(p => p.calls >= callsNeeded) ?? sorted[sorted.length - 1];
}
