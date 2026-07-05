import type { AppData, PageId } from '../types';
import { canAccess } from './access';
import { companyXP, getCompanyLevel } from './gamification';
import { financeSummary } from './finance';

/* ===== เมืองบริษัท (Company City) — เกมส์ SIM การเติบโต =====
 * เมืองของคุณ "โต" ตามความคืบหน้าธุรกิจจริง: แต่ละอาคาร = 1 ด้านของบริษัท
 * ยิ่งทำงานจริง (จ้างเอเจนต์ / ทำงานเสร็จ / ซื้อ skill / เปิดตลาด ฯลฯ) อาคารยิ่งสูงขึ้น
 * ระดับเมือง (หมู่บ้าน → มหานคร) มาจาก XP รวมของบริษัท (ระบบ gamification เดิม) */

export interface CityBuilding {
  id: string;
  icon: string;
  name: string;
  role: string;        // อาคารนี้แทนอะไรในบริษัท
  page: PageId;        // คลิก → ไปหน้าที่พัฒนาอาคารนี้ได้
  level: number;       // 0 = ที่ดินว่าง (ยังไม่สร้าง), 1..max = สร้างแล้ว + อัปเกรด
  max: number;
  hint: string;        // สิ่งที่ต้องทำเพื่อสร้าง/อัปเกรดชั้นถัดไป ('' = สูงสุดแล้ว)
  locked?: boolean;    // ต้องอัปเกรดแพ็กเกจก่อนถึงจะปลดล็อกอาคารนี้
}

/** ระดับจากจำนวนนับเทียบ threshold: count>=t แต่ละตัว = +1 ชั้น */
function levelFromThresholds(count: number, thresholds: number[]): number {
  let lv = 0;
  for (const t of thresholds) { if (count >= t) lv++; else break; }
  return lv;
}

/** ข้อความบอกสิ่งที่ต้องทำเพื่อชั้นถัดไป (อาคารแบบนับจำนวน) */
function nextHint(count: number, thresholds: number[], unit: string): string {
  for (const t of thresholds) {
    if (count < t) return `อีก ${t - count} ${unit} → อัปเกรด`;
  }
  return '';
}

/** เมืองระดับต่าง ๆ ตาม rank ของบริษัท (จาก XP) — คุมบรรยากาศ/ท้องฟ้า */
export const CITY_TIER: Record<string, { label: string; sky: string }> = {
  Starter:      { label: 'หมู่บ้านสตาร์ทอัป', sky: 'village' },
  Growing:      { label: 'ชุมชนกำลังโต',      sky: 'town' },
  Professional: { label: 'เมืองมืออาชีพ',      sky: 'city' },
  Advanced:     { label: 'นครธุรกิจ',          sky: 'metro' },
  Elite:        { label: 'มหานคร AI',          sky: 'elite' },
};

export function cityStats(d: AppData) {
  const c = d.aiCompany;
  const agents = c.agents.length;
  const tasksDone = c.tasks.filter(t => t.status === 'done').length;
  const skills = (c.purchasedSkills ?? []).length;
  const actionsDone = d.actions.filter(a => a.done).length;
  const tools = Object.entries(c.toolOwners ?? {})
    .filter(([, id]) => c.agents.some(a => a.id === id)).length;

  const fin = financeSummary(d);
  const xp = companyXP(d);
  const level = getCompanyLevel(xp);
  const tier = CITY_TIER[level.rank] ?? CITY_TIER.Starter;
  // ความคืบหน้า XP สู่ระดับเมืองถัดไป (Elite = สูงสุด)
  const span = level.max === Infinity ? 1 : (level.max - level.min + 1);
  const pctToNext = level.max === Infinity ? 100
    : Math.min(100, Math.round(((xp - level.min) / span) * 100));

  const buildings: CityBuilding[] = [
    {
      id: 'hq', icon: '🏛️', name: 'สำนักงานใหญ่', role: 'ทีมผู้บริหาร AI (เอเจนต์ในผังองค์กร)', page: 'aicompany',
      level: levelFromThresholds(agents, [1, 3, 5, 8]), max: 4,
      hint: nextHint(agents, [1, 3, 5, 8], 'เอเจนต์'),
    },
    {
      id: 'skill', icon: '🎓', name: 'ศูนย์ฝึกทักษะ', role: 'Skill ที่ปลดล็อกให้ทีม', page: 'aicompany',
      level: levelFromThresholds(skills, [1, 3, 5, 10]), max: 4,
      hint: nextHint(skills, [1, 3, 5, 10], 'skill'),
    },
    {
      id: 'factory', icon: '🏭', name: 'โรงผลิตผลงาน', role: 'งานที่ทีม AI ทำเสร็จ', page: 'aicompany',
      level: levelFromThresholds(tasksDone, [1, 5, 10, 25]), max: 4,
      hint: nextHint(tasksDone, [1, 5, 10, 25], 'งาน'),
    },
    {
      id: 'ops', icon: '🛠️', name: 'ศูนย์ควบคุมเครื่องมือ', role: 'เครื่องมือที่มี C-level ดูแล', page: 'aicompany',
      level: levelFromThresholds(tools, [3, 6, 10]), max: 3,
      hint: nextHint(tools, [3, 6, 10], 'เครื่องมือ'),
    },
    {
      id: 'plaza', icon: '📌', name: 'ลานปฏิบัติการ', role: 'Priority Actions ที่ทำเสร็จ', page: 'actions',
      level: levelFromThresholds(actionsDone, [1, 3, 6]), max: 3,
      hint: nextHint(actionsDone, [1, 3, 6], 'งาน'),
    },
    {
      id: 'mission', icon: '🧭', name: 'ศาลาว่าการ', role: 'Mission Statement ที่บอร์ดอนุมัติ', page: 'aicompany',
      level: c.missionApproved ? 1 : 0, max: 1,
      hint: c.missionApproved ? '' : 'อนุมัติ Mission → สร้างอาคาร',
    },
    {
      id: 'market', icon: '🏪', name: 'ย่านการค้า', role: 'เข้าตลาดธุรกิจ / เปิดหน้าร้าน', page: 'storefront',
      level: d.visitedMarket ? 1 : 0, max: 1,
      hint: d.visitedMarket ? '' : 'เปิดหน้าร้านขึ้นตลาด → สร้างอาคาร',
    },
    {
      id: 'iso', icon: '🛡️', name: 'ศูนย์คุณภาพ ISO', role: 'ระบบคุณภาพ ISO 9001', page: 'iso9001',
      level: d.iso9001?.enabled ? 1 : 0, max: 1, locked: !canAccess(d, 'iso9001'),
      hint: d.iso9001?.enabled ? '' : 'เปิดใช้ ISO 9001 → สร้างอาคาร',
    },
    {
      id: 'data', icon: '📊', name: 'ศูนย์ข้อมูล', role: 'SaaS Analytics (แพ็ก Growth+)', page: 'analytics',
      level: canAccess(d, 'analytics') ? 1 : 0, max: 1, locked: !canAccess(d, 'analytics'),
      hint: canAccess(d, 'analytics') ? '' : 'อัปเกรด Growth → ปลดล็อกอาคาร',
    },
    {
      id: 'lab', icon: '🔬', name: 'ห้องแล็บวิจัย', role: 'AI Research (แพ็ก Growth+)', page: 'aisearch',
      level: canAccess(d, 'aisearch') ? 1 : 0, max: 1, locked: !canAccess(d, 'aisearch'),
      hint: canAccess(d, 'aisearch') ? '' : 'อัปเกรด Growth → ปลดล็อกอาคาร',
    },
    // ===== ย่านการเงิน — ขับด้วยรายรับ/รายจ่ายจริง =====
    {
      id: 'treasury', icon: '💰', name: 'คลังเมือง', role: 'บันทึกรายได้ธุรกิจก้อนแรก', page: 'city',
      level: fin.hasRevenue ? 1 : 0, max: 1,
      hint: fin.hasRevenue ? '' : 'บันทึกรายได้ก้อนแรก → สร้างคลังเมือง',
    },
    {
      id: 'bank', icon: '🏦', name: 'ธนาคารเมือง', role: 'ทำกำไร (รายได้ > รายจ่าย)', page: 'city',
      level: fin.breakEven ? 1 : 0, max: 1,
      hint: fin.breakEven ? '' : 'ทำให้รายได้ > รายจ่าย → เปิดธนาคาร',
    },
    {
      id: 'exchange', icon: '📈', name: 'ตลาดทุน', role: 'กำไรสุทธิสะสม ≥ ฿50,000', page: 'city',
      level: levelFromThresholds(fin.net, [50000, 250000, 1000000]), max: 3,
      hint: fin.net >= 1000000 ? '' :
        fin.net >= 250000 ? 'อีก ฿' + (1000000 - fin.net).toLocaleString('th-TH') + ' → อัปเกรด' :
        fin.net >= 50000 ? 'อีก ฿' + (250000 - fin.net).toLocaleString('th-TH') + ' → อัปเกรด' :
        'กำไรสุทธิ ≥ ฿50,000 → เปิดตลาดทุน',
    },
  ];

  const built = buildings.filter(b => b.level > 0).length;
  const floors = buildings.reduce((s, b) => s + b.level, 0);
  return {
    xp, level, tier, pctToNext, fin,
    agents, tasksDone, skills, actionsDone, tools,
    buildings, built, total: buildings.length, floors,
  };
}

/* ===== แผนผังการพัฒนาสำหรับคู่ค้า (Partner Development Map) =====
 * แปลง "ระดับอาคาร" เป็นภาพการพัฒนาแต่ละด้านของธุรกิจ (ความสูง/รูปทรง) เพื่อให้คู่ค้าเห็นภาพ
 * ความก้าวหน้า โดย "ไม่เปิดเผยตัวเลขลับ" (จำนวนเงิน/จำนวนดีล/จำนวนเอเจนต์ที่แท้จริง) —
 * แสดงเป็นระดับ (tier) + สัดส่วนการพัฒนา % แทน ตัวเลขจริงเก็บเป็นความลับของบริษัท */

export interface DevDimension {
  id: string;
  icon: string;
  name: string;           // ชื่อด้านธุรกิจ
  pct: number;            // 0..100 = ความสูงของตึก (สัดส่วนการพัฒนา ไม่ใช่ตัวเลขลับ)
  tier: string;           // ป้ายระดับ (proxy) เช่น เริ่มต้น/กำลังโต/แข็งแรง/ผู้นำ
  blurb: string;          // คำอธิบายเชิงคุณภาพ (ไม่มีตัวเลขลับ)
}

/** ป้ายระดับจากสัดส่วน % (proxy — ไม่ผูกกับตัวเลขลับ) */
function tierFromPct(pct: number): string {
  if (pct >= 85) return '👑 ผู้นำ';
  if (pct >= 60) return '🏙️ แข็งแรง';
  if (pct >= 35) return '🌆 กำลังโต';
  if (pct > 0) return '🏗️ เริ่มต้น';
  return '🌱 ตั้งไข่';
}

/** รวมระดับอาคารในกลุ่ม → สัดส่วนการพัฒนา 0..100 (ปัดเป็นขั้นละ 5 กัน fingerprint ตัวเลขลับ) */
function groupPct(buildings: CityBuilding[], ids: string[]): number {
  const grp = buildings.filter(b => ids.includes(b.id));
  const lv = grp.reduce((s, b) => s + b.level, 0);
  const mx = grp.reduce((s, b) => s + b.max, 0) || 1;
  return Math.round((lv / mx) * 20) * 5; // 0,5,10,…,100
}

/**
 * แผนผังการพัฒนา 6 ด้าน สำหรับแสดงคู่ค้า — ไม่มีตัวเลขลับ
 * (การเงินแสดงเป็นระดับความมั่นคงเท่านั้น ไม่โชว์จำนวนเงิน)
 */
export function partnerDevelopmentMap(d: AppData): { dimensions: DevDimension[]; overall: number; tierLabel: string } {
  const s = cityStats(d);
  const b = s.buildings;
  const dims: Array<Omit<DevDimension, 'pct' | 'tier'> & { ids: string[]; blurbs: [string, string, string] }> = [
    { id: 'team',    icon: '👥', name: 'ทีมงาน & ผู้บริหาร',    ids: ['hq', 'mission'],        blurb: '', blurbs: ['กำลังจัดตั้งทีม', 'ทีมพร้อมทำงาน', 'ทีมผู้บริหารครบสาย'] },
    { id: 'output',  icon: '🏭', name: 'กำลังผลิต & ส่งมอบ',    ids: ['factory', 'plaza', 'ops'], blurb: '', blurbs: ['เริ่มมีผลงาน', 'ส่งมอบสม่ำเสมอ', 'กำลังผลิตสูง ส่งมอบต่อเนื่อง'] },
    { id: 'skill',   icon: '🎓', name: 'ทักษะ & ความรู้',      ids: ['skill', 'lab'],          blurb: '', blurbs: ['กำลังสะสมทักษะ', 'ทักษะหลากหลาย', 'คลังความรู้แข็งแรง'] },
    { id: 'market',  icon: '🏪', name: 'การตลาด & ช่องทาง',    ids: ['market', 'data'],        blurb: '', blurbs: ['เริ่มเข้าตลาด', 'มีช่องทางการตลาด', 'ตลาด+ข้อมูลครบ'] },
    { id: 'quality', icon: '🛡️', name: 'คุณภาพ & มาตรฐาน',    ids: ['iso'],                   blurb: '', blurbs: ['ยังไม่วางระบบคุณภาพ', 'มีระบบคุณภาพ', 'มาตรฐาน ISO พร้อม'] },
    { id: 'finance', icon: '💎', name: 'ความมั่นคงทางการเงิน', ids: ['treasury', 'bank', 'exchange'], blurb: '', blurbs: ['กำลังสร้างรายได้', 'ทำกำไรแล้ว', 'เติบโตมั่นคง'] },
  ];
  const dimensions: DevDimension[] = dims.map(x => {
    const pct = groupPct(b, x.ids);
    const bi = pct >= 70 ? 2 : pct >= 35 ? 1 : 0;
    return { id: x.id, icon: x.icon, name: x.name, pct, tier: tierFromPct(pct), blurb: x.blurbs[bi] };
  });
  const overall = Math.round(dimensions.reduce((a, x) => a + x.pct, 0) / dimensions.length / 5) * 5;
  return { dimensions, overall, tierLabel: s.tier.label };
}
