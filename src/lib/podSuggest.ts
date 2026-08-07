// podSuggest.ts — แนะนำสินค้า Print-on-Demand (PoD) ที่ "น่าลอง" ให้ตรงกลุ่มเป้าหมายของผู้ใช้
// จัดอันดับแบบ POP (Kalodata) แต่ใช้ "คะแนนความเหมาะ (fit)" ที่คำนวณจากข้อมูลจริงของผู้ใช้
// ⚠️ ไม่ใช่ตัวเลขยอดขายจริง (เราไม่มีข้อมูลนั้น) — เป็นคะแนนช่วยเลือกลองทำ · pure + tested
import type { AudienceType } from '../types';

export interface PodProduct {
  id: string; label: string; icon: string;
  priceMin: number; priceMax: number; marginPct: number;
  tags: string[]; // audience/บริบทที่เหมาะ
}

// PoD = ไม่ต้องสต็อก ผลิตเมื่อสั่ง → เหมาะ SME/มือใหม่ (ความเสี่ยงต่ำ)
export const POD_CATALOG: PodProduct[] = [
  { id: 'tshirt', label: 'เสื้อยืด', icon: '👕', priceMin: 250, priceMax: 450, marginPct: 40, tags: ['b2c', 'trend', 'community', 'fashion', 'event'] },
  { id: 'hoodie', label: 'ฮู้ดดี้', icon: '🧥', priceMin: 550, priceMax: 890, marginPct: 42, tags: ['b2c', 'trend', 'fashion'] },
  { id: 'mug', label: 'แก้วมัค', icon: '☕', priceMin: 150, priceMax: 290, marginPct: 45, tags: ['b2b', 'gift', 'cafe', 'office'] },
  { id: 'tote', label: 'กระเป๋าผ้า', icon: '👜', priceMin: 150, priceMax: 320, marginPct: 48, tags: ['b2c', 'b2b', 'eco', 'event', 'cafe'] },
  { id: 'sticker', label: 'สติกเกอร์', icon: '🏷️', priceMin: 30, priceMax: 120, marginPct: 60, tags: ['b2c', 'community', 'genz', 'art', 'event'] },
  { id: 'phonecase', label: 'เคสมือถือ', icon: '📱', priceMin: 190, priceMax: 390, marginPct: 50, tags: ['b2c', 'trend', 'genz'] },
  { id: 'poster', label: 'โปสเตอร์/ภาพพิมพ์', icon: '🖼️', priceMin: 120, priceMax: 350, marginPct: 55, tags: ['b2c', 'art', 'decor'] },
  { id: 'cap', label: 'หมวก', icon: '🧢', priceMin: 250, priceMax: 420, marginPct: 43, tags: ['b2c', 'b2b', 'fashion', 'brand'] },
  { id: 'notebook', label: 'สมุดโน้ต', icon: '📓', priceMin: 120, priceMax: 280, marginPct: 50, tags: ['b2b', 'office', 'gift'] },
  { id: 'apron', label: 'ผ้ากันเปื้อน', icon: '🥽', priceMin: 250, priceMax: 420, marginPct: 45, tags: ['b2b', 'cafe', 'restaurant', 'staff'] },
];

export interface PodInput {
  audience?: AudienceType;
  industry?: string;
  persona?: string;
  valueProp?: string;
  company?: string;
}

export interface PodSuggestion {
  rank: number;
  product: PodProduct;
  fitScore: number;      // 0..100 (ความเหมาะ ไม่ใช่ยอดขาย)
  why: string[];
  designAngle: string;   // ไอเดียลาย
  targetGroup: string;
  priceRange: string;    // "฿250–450"
  marginNote: string;
}

// อุตสาหกรรม/คีย์เวิร์ด → product ids ที่เข้ากัน
const INDUSTRY_MAP: { kw: string[]; ids: string[] }[] = [
  { kw: ['cafe', 'คาเฟ่', 'coffee', 'กาแฟ'], ids: ['mug', 'apron', 'tote'] },
  { kw: ['restaurant', 'ร้านอาหาร', 'อาหาร', 'food'], ids: ['apron', 'mug', 'tote'] },
  { kw: ['fashion', 'แฟชั่น', 'เสื้อผ้า', 'clothing'], ids: ['tshirt', 'hoodie', 'cap'] },
  { kw: ['art', 'ศิลปะ', 'design', 'ดีไซน์', 'ครีเอเตอร์', 'creator'], ids: ['poster', 'sticker', 'tshirt'] },
  { kw: ['fitness', 'ฟิตเนส', 'gym', 'ออกกำลัง', 'yoga', 'โยคะ'], ids: ['tshirt', 'tote', 'cap'] },
  { kw: ['office', 'องค์กร', 'บริษัท', 'corporate', 'บริการ'], ids: ['mug', 'notebook', 'tote', 'cap'] },
  { kw: ['event', 'อีเวนต์', 'community', 'ชุมชน', 'ค่าย'], ids: ['sticker', 'tshirt', 'tote'] },
  { kw: ['shop', 'ร้านค้า', 'ขายของ', 'store'], ids: ['tshirt', 'tote', 'sticker'] },
];

const GENZ_KW = ['วัยรุ่น', 'นักศึกษา', 'นักเรียน', 'gen z', 'genz', 'teen', 'วัยเรียน'];

function lc(s?: string): string { return (s ?? '').toLowerCase(); }

/** จัดอันดับสินค้า PoD ที่เหมาะกับกลุ่มเป้าหมาย */
export function suggestPod(inp: PodInput, limit = 6): PodSuggestion[] {
  const ind = lc(inp.industry);
  const persona = lc(inp.persona);
  const isB2b = inp.audience === 'b2b';
  const isB2c = inp.audience === 'b2c';

  const indIds = new Set<string>();
  for (const m of INDUSTRY_MAP) if (m.kw.some(k => ind.includes(k))) m.ids.forEach(id => indIds.add(id));
  const genz = GENZ_KW.some(k => persona.includes(k));

  const scored = POD_CATALOG.map(p => {
    const why: string[] = [];
    let score = p.marginPct;                       // ฐาน: มาร์จิ้น (ยิ่งกำไรดี ยิ่งน่าลอง)

    if (isB2b && p.tags.some(t => ['b2b', 'gift', 'office', 'corporate', 'staff'].includes(t))) {
      score += 25; why.push('เหมาะขายองค์กร/ของพรีเมียม-ของขวัญพนักงาน (B2B)');
    }
    if (isB2c && p.tags.some(t => ['b2c', 'trend', 'community', 'genz', 'fashion'].includes(t))) {
      score += 22; why.push('เข้ากับลูกค้าทั่วไป/สายแฟชั่น-คอมมูนิตี้ (B2C)');
    }
    if (indIds.has(p.id)) { score += 20; why.push(`เข้ากับธุรกิจ ${inp.industry} โดยตรง`); }
    if (genz && p.tags.includes('genz')) { score += 15; why.push('โดนใจกลุ่ม Gen Z/วัยรุ่น'); }
    if (p.marginPct >= 50) { score += 6; why.push(`มาร์จิ้นดี ~${p.marginPct}%`); }

    if (why.length === 0) why.push('ตัวเลือกทั่วไปที่เริ่มง่าย ความเสี่ยงต่ำ (ไม่ต้องสต็อก)');

    const fitScore = Math.max(0, Math.min(100, Math.round(score)));
    const targetGroup = inp.persona || (isB2b ? 'ลูกค้าองค์กร/พนักงาน' : isB2c ? 'ลูกค้าทั่วไป' : 'กลุ่มเป้าหมายของคุณ');
    const theme = inp.valueProp || inp.industry || 'จุดเด่นของแบรนด์';
    const designAngle = `ลายที่สื่อ “${theme}”${inp.company ? ` + โลโก้ ${inp.company}` : ''}`;
    return {
      product: p, fitScore, why, designAngle, targetGroup,
      priceRange: `฿${p.priceMin}–${p.priceMax}`,
      marginNote: `กำไรโดยประมาณ ~${p.marginPct}% ต่อชิ้น (ผลิตเมื่อสั่ง ไม่ต้องสต็อก)`,
    };
  });

  scored.sort((a, b) => b.fitScore - a.fitScore || b.product.marginPct - a.product.marginPct);
  return scored.slice(0, Math.max(1, limit)).map((s, i) => ({ rank: i + 1, ...s }));
}
