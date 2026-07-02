import type { AppData } from '../types';
import { getMyStorefront } from './storefront';
import { listMyRfqs, listIncomingRfqs, listOrders, LOCAL_WS } from './trade';

/** First Revenue Engine — แก้ churn ของกลุ่มเริ่มธุรกิจใหม่ (Gen Z / เสมือนว่างงาน)
 *  หลักการ: user ที่ "ปิดดีลแรก" ได้ จะอยู่ต่อ — ระบบพาไปให้ถึงจุดนั้นใน 30 วัน */

export interface FirstDealState {
  hasProduct: boolean;      // อธิบายผลิตภัณฑ์/บริการแล้ว
  hasVp: boolean;           // มี Value Proposition บนหน้าร้าน
  published: boolean;       // เผยแพร่หน้าร้านแล้ว
  hasRfqActivity: boolean;  // ส่ง RFQ / เสนอราคา อย่างน้อย 1 ครั้ง
  hasFirstOrder: boolean;   // 🎉 ปิดดีลแรกแล้ว
  daysLeft: number;         // เหลือกี่วันในภารกิจ 30 วัน
}

const LS_START = 'ceo_ai_journey_start';

/** วันเริ่มภารกิจ (ตั้งครั้งแรกที่เปิด Dashboard) */
export function journeyDaysLeft(): number {
  let start = localStorage.getItem(LS_START);
  if (!start) {
    start = new Date().toISOString();
    localStorage.setItem(LS_START, start);
  }
  const elapsed = (Date.now() - new Date(start).getTime()) / 86400000;
  return Math.max(0, Math.ceil(30 - elapsed));
}

export async function loadFirstDealState(data: AppData, wsId: string | null): Promise<FirstDealState> {
  const myWs = wsId ?? LOCAL_WS;
  const sf = await getMyStorefront(wsId).catch(() => null);
  const [out, inc, orders] = await Promise.all([
    listMyRfqs(myWs).catch(() => []),
    listIncomingRfqs(sf?.slug ?? null).catch(() => []),
    listOrders(myWs).catch(() => []),
  ]);
  return {
    hasProduct: !!(data.aiCompany.productDesc ?? '').trim(),
    hasVp: !!(sf?.vp ?? '').trim(),
    published: !!sf?.published,
    hasRfqActivity: out.length > 0 || inc.some(r => r.status !== 'open'),
    hasFirstOrder: orders.length > 0,
    daysLeft: journeyDaysLeft(),
  };
}

/* ---------- AI Agent: Value Proposition generator ----------
 * Production: เรียก ai-assist (Claude) · Local/fallback: template จากข้อมูลจริงของบริษัท
 * โครง Value Proposition Canvas: [ลูกค้า] + [งานที่เขาต้องทำ/ปัญหา] + [สิ่งที่เราให้] + [ต่างจากคู่แข่ง] */

export function draftVpLocal(name: string, dbd: string, desc: string, services: string[]): string {
  const what = (services[0] ?? desc.split(/[—\n.]/)[0] ?? 'สินค้าและบริการคุณภาพ').trim();
  const sector = dbd.replace(/^\[[A-Z]\]\s*/, '').split('(')[0].trim();
  const who = sector ? `ธุรกิจและลูกค้าในกลุ่ม${sector}` : 'ลูกค้าของคุณ';
  return `${name || 'เรา'}ช่วยให้${who}ได้${what}ที่ตรงความต้องการ — เริ่มงานไว ราคาชัดเจน ดูแลจนจบงาน`;
}
