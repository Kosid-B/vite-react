import type { Storefront } from './storefront';
import type { Rfq } from './trade';

/** 🤝 Marketplace Agent — เอเจนต์บริหารตลาด จับคู่สินค้า/บริการใน ecosystem
 *  Rule-based scoring ทำงานได้ทุกโหมด (ไม่กิน AI call) — ฝั่ง AI สรุปคำแนะนำ
 *  ภาษาไทยผ่าน ai-assist ทำใน component (production เท่านั้น) */

export interface RfqMatch {
  rfq: Rfq;
  score: number;
  reasons: string[];
}

export interface PartnerMatch {
  sf: Storefront;
  score: number;
  reasons: string[];
}

const sectorOf = (dbd: string) => dbd.match(/^\[([A-Z])\]/)?.[1] ?? '';

/** คำสำคัญของร้าน: สินค้า/บริการเต็มวลี + คำยาว ≥3 จากคำอธิบาย/จุดขาย */
function keyTerms(sf: Storefront): string[] {
  const words = `${sf.description} ${sf.vp}`.split(/[\s,·/()]+/).filter(w => w.length >= 3);
  return [...new Set([...sf.services.filter(s => s.trim().length >= 2), ...words])].slice(0, 40);
}

/** จับคู่ร้านของฉัน ↔ ประกาศงานกลาง (Open RFQ) — คะแนน > 0 คือน่าเสนอราคา */
export function matchRfqs(my: Storefront, rfqs: Rfq[]): RfqMatch[] {
  const mySec = sectorOf(my.dbd);
  const terms = keyTerms(my);
  return rfqs
    .map(rfq => {
      const hay = `${rfq.title} ${rfq.detail}`.toLowerCase();
      const reasons: string[] = [];
      let score = 0;
      if (mySec && rfq.sector && rfq.sector.startsWith(`[${mySec}]`)) {
        score += 3;
        reasons.push('อยู่หมวดธุรกิจเดียวกับร้านคุณ');
      }
      const hits = terms.filter(t => hay.includes(t.toLowerCase())).slice(0, 3);
      if (hits.length > 0) {
        score += hits.length * 2;
        reasons.push(`ตรงกับสินค้า/บริการของคุณ: ${hits.join(', ')}`);
      }
      if (rfq.budget > 0 && score > 0) reasons.push(`งบประมาณผู้ซื้อ ฿${rfq.budget.toLocaleString()}`);
      return { rfq, score, reasons };
    })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/** จับคู่คู่ค้า (ร้านอื่นใน ecosystem) — ซัพพลายเออร์/พันธมิตร/ลูกค้า B2B ที่เกี่ยวข้อง */
export function matchPartners(my: Storefront, stores: Storefront[]): PartnerMatch[] {
  const mySec = sectorOf(my.dbd);
  const myTerms = keyTerms(my);
  const myHay = `${my.name} ${my.description} ${my.vp} ${my.services.join(' ')}`.toLowerCase();
  return stores
    .filter(sf => sf.slug !== my.slug)
    .map(sf => {
      const reasons: string[] = [];
      let score = 0;
      if (mySec && sectorOf(sf.dbd) === mySec) {
        score += 2;
        reasons.push('หมวดธุรกิจเดียวกัน — พันธมิตร/แลกลูกค้ากันได้');
      }
      const theirHay = `${sf.name} ${sf.description} ${sf.vp} ${sf.services.join(' ')}`.toLowerCase();
      const iMatchThem = myTerms.filter(t => theirHay.includes(t.toLowerCase())).slice(0, 2);
      if (iMatchThem.length > 0) {
        score += iMatchThem.length;
        reasons.push(`เกี่ยวข้องกับของคุณ: ${iMatchThem.join(', ')}`);
      }
      const theyMatchMe = sf.services.filter(s => s.trim().length >= 2 && myHay.includes(s.toLowerCase())).slice(0, 2);
      if (theyMatchMe.length > 0) {
        score += theyMatchMe.length;
        reasons.push(`เขามีสิ่งที่คุณอาจต้องใช้: ${theyMatchMe.join(', ')}`);
      }
      // ร้านต่างประเภทเสริมกัน (สินค้า ↔ บริการ) ในหมวดเดียวกัน = supply chain
      if (score > 0 && my.kind !== 'both' && sf.kind !== 'both' && sf.kind !== my.kind) {
        score += 1;
        reasons.push(my.kind === 'product' ? 'เขาให้บริการเสริมสินค้าของคุณได้' : 'สินค้าเขาต่อยอดบริการของคุณได้');
      }
      return { sf, score, reasons };
    })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/** สรุปคำแนะนำแบบ local (ไม่ใช้ AI call) — production ใช้ ai-assist แทนใน component */
export function agentSummaryLocal(my: Storefront, rfqMatches: RfqMatch[], partners: PartnerMatch[]): string {
  if (rfqMatches.length === 0 && partners.length === 0) {
    return `ยังไม่พบคู่ที่เหมาะกับ "${my.name}" ในตอนนี้ — เพิ่มสินค้า/บริการเด่นและคำอธิบายร้านให้ละเอียดขึ้น จะช่วยให้เอเจนต์จับคู่แม่นขึ้น และลองประกาศงานกลางเพื่อดึงคู่ค้าเข้ามา`;
  }
  const parts: string[] = [];
  if (rfqMatches.length > 0) {
    parts.push(`พบงานที่ควรเสนอราคา ${rfqMatches.length} งาน — เริ่มจาก "${rfqMatches[0].rfq.title}" ที่ตรงกับร้านคุณที่สุด เสนอราคาเร็วมีโอกาสปิดดีลสูงกว่า`);
  }
  if (partners.length > 0) {
    parts.push(`คู่ค้าที่น่าติดต่อ ${partners.length} ร้าน — โดยเฉพาะ "${partners[0].sf.name}" (${partners[0].reasons[0] ?? ''}) ลองทักไปแลกลูกค้าหรือส่ง RFQ ดู`);
  }
  return parts.join(' · ');
}
