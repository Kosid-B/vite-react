/* teamTemplates — ทีม AI สำเร็จรูปตามประเภทธุรกิจ (rule-based, ไม่พึ่ง AI/เน็ต)
 * แก้ friction: เดิมผู้ใช้ต้องสร้างทีมทีละคนเอง → ให้เลือกทีมสำเร็จรูปที่เหมาะกับธุรกิจได้ในคลิกเดียว
 * pure/framework-agnostic — หน้า AICompany นำ roles ไปสร้าง Agent (ใส่ id/สี/โมเดล) เอง */

export interface TeamRole {
  role: string;
  name: string;
  avatar: string;
  mandate: string;
  lead?: boolean;   // true = หัวหน้าสูงสุด (reportsTo = null) · ที่เหลือรายงานต่อ lead
}

export interface TeamTemplate {
  id: string;
  label: string;
  match: string[];   // คีย์เวิร์ดประเภทธุรกิจ (ไทย/อังกฤษ) สำหรับ auto-detect
  blurb: string;
  roles: TeamRole[];
}

const CEO = (mandate: string): TeamRole => ({ role: 'CEO', name: 'อาทิตย์', avatar: '🧭', mandate, lead: true });

export const TEAM_TEMPLATES: TeamTemplate[] = [
  {
    id: 'ecommerce', label: 'ค้าปลีก / ขายออนไลน์', blurb: 'ทีมสำหรับร้านค้า/อีคอมเมิร์ซ เน้นการตลาด-ขาย-ส่งของ',
    match: ['อีคอมเมิร์ซ', 'ขายออนไลน์', 'ขายของ', 'ร้านค้า', 'ค้าปลีก', 'สินค้า', 'ไลฟ์สไตล์', 'retail', 'commerce', 'shop', 'store'],
    roles: [
      CEO('รับเป้าหมายจากบอร์ด วางแผน จ้างทีม และมอบหมายงาน'),
      { role: 'CMO', name: 'มณี', avatar: '📣', mandate: 'วางแผนการตลาด คอนเทนต์ และแคมเปญหาลูกค้าใหม่ผ่านช่องทางออนไลน์' },
      { role: 'Sales', name: 'ก้อง', avatar: '🤝', mandate: 'ปิดการขาย ดูแลลูกค้า และเพิ่มยอดซื้อซ้ำ' },
      { role: 'CFO', name: 'ปิยะ', avatar: '💰', mandate: 'ดูแลรายรับ-รายจ่าย กำไร ต้นทุนสินค้า และตั้งราคา' },
      { role: 'Fulfillment', name: 'ธาดา', avatar: '📦', mandate: 'จัดการสต็อก แพ็ก-ส่งของ และประสบการณ์หลังการขาย' },
    ],
  },
  {
    id: 'food', label: 'อาหาร / ร้านอาหาร / คาเฟ่', blurb: 'ทีมสำหรับธุรกิจอาหาร-เครื่องดื่ม เน้นสินค้า-หน้าร้าน-การตลาด',
    match: ['อาหาร', 'ร้านอาหาร', 'คาเฟ่', 'กาแฟ', 'เครื่องดื่ม', 'ครัว', 'เบเกอรี่', 'food', 'restaurant', 'cafe', 'coffee', 'bakery'],
    roles: [
      CEO('กำหนดทิศทางร้าน วางแผน และมอบหมายงานให้ทีม'),
      { role: 'Head Chef', name: 'ชนก', avatar: '👩‍🍳', mandate: 'พัฒนาเมนู คุมคุณภาพ-รสชาติ และต้นทุนวัตถุดิบ' },
      { role: 'CMO', name: 'มณี', avatar: '📣', mandate: 'การตลาดหน้าร้าน+ออนไลน์ รีวิว โปรโมชัน และดึงลูกค้าใหม่' },
      { role: 'Store Manager', name: 'ธาดา', avatar: '🏪', mandate: 'ดูแลหน้าร้าน บริการ คิว และมาตรฐานการทำงาน (SOP)' },
      { role: 'CFO', name: 'ปิยะ', avatar: '💰', mandate: 'คุมต้นทุน กำไรต่อจาน กระแสเงินสด และตั้งราคาขาย' },
    ],
  },
  {
    id: 'service', label: 'บริการ / ที่ปรึกษา / เอเจนซี', blurb: 'ทีมสำหรับธุรกิจบริการ เน้นส่งมอบงาน-ดูแลลูกค้า-หาลูกค้า',
    match: ['บริการ', 'ที่ปรึกษา', 'คอนซัลต์', 'เอเจนซี', 'รับจ้าง', 'ฟรีแลนซ์', 'service', 'consult', 'agency', 'freelance'],
    roles: [
      CEO('กำหนดทิศทาง วางแผน และมอบหมายงานให้ทีม'),
      { role: 'Delivery Lead', name: 'ธารา', avatar: '🛠️', mandate: 'ส่งมอบงานให้ได้คุณภาพตรงเวลา และวางกระบวนการทำงาน' },
      { role: 'CMO', name: 'มณี', avatar: '📣', mandate: 'สร้างการรับรู้ หาลูกค้าใหม่ และวางตำแหน่งบริการให้โดดเด่น' },
      { role: 'Client Success', name: 'ก้อง', avatar: '🤝', mandate: 'ดูแลลูกค้าเดิม ต่อสัญญา และหาโอกาสขายเพิ่ม' },
      { role: 'CFO', name: 'ปิยะ', avatar: '💰', mandate: 'ดูแลการเงิน ตั้งราคาบริการ และคุมกำไรต่อโปรเจกต์' },
    ],
  },
  {
    id: 'tech', label: 'เทค / ซอฟต์แวร์ / แอป', blurb: 'ทีมสำหรับธุรกิจเทคโนโลยี เน้นผลิตภัณฑ์-เทค-การเติบโต',
    match: ['เทค', 'ซอฟต์แวร์', 'แอป', 'ไอที', 'ดิจิทัล', 'software', 'app', 'saas', 'tech', 'digital', 'platform'],
    roles: [
      CEO('กำหนดวิสัยทัศน์ผลิตภัณฑ์ วางแผน และมอบหมายงาน'),
      { role: 'CTO', name: 'ธารา', avatar: '⚙️', mandate: 'ดูแลระบบ พัฒนา เชื่อมต่อ API และทำงานอัตโนมัติให้เสถียร' },
      { role: 'Product', name: 'ชนก', avatar: '🧩', mandate: 'ออกแบบฟีเจอร์จากปัญหาลูกค้า จัดลำดับ roadmap และวัดผลใช้งาน' },
      { role: 'CMO', name: 'มณี', avatar: '📣', mandate: 'การตลาดแบบ growth หาผู้ใช้ใหม่ และสร้าง viral loop' },
      { role: 'CFO', name: 'ปิยะ', avatar: '💰', mandate: 'ดูแลการเงิน หน่วยเศรษฐศาสตร์ (LTV/CAC) และ runway' },
    ],
  },
  {
    id: 'manufacturing', label: 'ผลิต / โรงงาน / อุตสาหกรรม', blurb: 'ทีมสำหรับธุรกิจผลิต เน้นการผลิต-คุณภาพ-ขาย',
    match: ['ผลิต', 'โรงงาน', 'อุตสาหกรรม', 'oem', 'manufactur', 'factory', 'production', 'industrial'],
    roles: [
      CEO('กำหนดทิศทาง วางแผน และมอบหมายงานให้ทีม'),
      { role: 'COO', name: 'ธารา', avatar: '🏭', mandate: 'คุมกำลังการผลิต กระบวนการ ต้นทุน และประสิทธิภาพ (SOP)' },
      { role: 'QA', name: 'ชนก', avatar: '🔬', mandate: 'ควบคุมคุณภาพ มาตรฐาน (ISO/มอก.) และลดของเสีย' },
      { role: 'Sales', name: 'ก้อง', avatar: '🤝', mandate: 'หาออเดอร์ ดูแลลูกค้า B2B และขยายตลาด' },
      { role: 'CFO', name: 'ปิยะ', avatar: '💰', mandate: 'คุมต้นทุนการผลิต กำไร และกระแสเงินสด' },
    ],
  },
  {
    id: 'general', label: 'ทั่วไป (ครบทุกด้าน)', blurb: 'ทีมมาตรฐานครบทุกด้าน เหมาะกับธุรกิจทั่วไป',
    match: [],
    roles: [
      CEO('รับเป้าหมายจากบอร์ด วางแผน จ้างทีม และมอบหมายงาน'),
      { role: 'CMO', name: 'มณี', avatar: '📣', mandate: 'วางแผนการตลาดและหาลูกค้าใหม่' },
      { role: 'CFO', name: 'ปิยะ', avatar: '💰', mandate: 'ดูแลการเงิน กำไร ต้นทุน และตั้งราคา' },
      { role: 'COO', name: 'ธารา', avatar: '⚙️', mandate: 'ดูแลการดำเนินงานและวางกระบวนการ (SOP)' },
      { role: 'Sales', name: 'ก้อง', avatar: '🤝', mandate: 'ปิดการขายและดูแลลูกค้า' },
    ],
  },
];

export const GENERAL_TEMPLATE = TEAM_TEMPLATES[TEAM_TEMPLATES.length - 1];

/** เลือกทีมที่เหมาะกับประเภทธุรกิจ (จับคีย์เวิร์ด) — ไม่ตรงเลย → ทีมทั่วไป */
export function pickTeamTemplate(industry?: string): TeamTemplate {
  const s = (industry ?? '').toLowerCase().trim();
  if (!s) return GENERAL_TEMPLATE;
  return TEAM_TEMPLATES.find(t => t.match.some(m => s.includes(m))) ?? GENERAL_TEMPLATE;
}
