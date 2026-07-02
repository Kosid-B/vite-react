import { isSupabaseEnabled, supabase } from './supabase';

/** สมัครร้านตลาดฝากขายสินค้า — ฟอร์มสาธารณะบน /shop (ไม่ต้องล็อกอิน)
 *  Production: ตาราง public.shop_applications (anon insert ได้ / admin อ่าน-จัดการ)
 *  Local mode: เก็บใน localStorage เพื่อทดสอบ */

export type ShopPackage = 'free' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'auction';

export interface ShopApplication {
  id: string;
  shopName: string;
  category: string;
  products: string;
  phone: string;
  lineId: string;
  package: ShopPackage;
  status: 'new' | 'contacted' | 'approved' | 'rejected';
  createdAt: string;
}

/** บันไดราคา (กลยุทธ์ตั้งราคา: ฟรี = ดึงคนเข้า → รายวัน impulse ≤฿20 →
 *  ยิ่งผูกยาวยิ่งถูกต่อวัน → รายเดือนคือ anchor "คุ้มสุด" → ประมูล = price discovery ของตำแหน่งพรีเมียม) */
export const SHOP_PACKAGES: {
  id: ShopPackage; name: string; price: string; per: string; perDay: string;
  desc: string; note: string; hot?: boolean; auction?: boolean;
}[] = [
  { id: 'free', name: 'ฟรี', price: '฿0', per: '', perDay: 'ตลอดชีพ',
    desc: 'ลงขายได้ 3 สินค้า · ขึ้นสารบัญตลาด · คิดค่าดำเนินการ 3% เมื่อขายได้จริง',
    note: 'เริ่มขายก่อน จ่ายเมื่อมีรายได้' },
  { id: 'daily', name: 'รายวัน', price: '฿19', per: '/วัน', perDay: '฿19/วัน',
    desc: 'ลงขายไม่จำกัด 1 วันเต็ม — เหมาะกับของสด งานอีเวนต์ ทดลองตลาด',
    note: 'ถูกกว่าค่าเช่าแผงตลาดนัด' },
  { id: 'weekly', name: 'รายสัปดาห์', price: '฿99', per: '/สัปดาห์', perDay: '≈ ฿14/วัน · ประหยัด 26%',
    desc: 'ลงขายไม่จำกัด 7 วัน + ป้าย "ร้านแนะนำประจำสัปดาห์" ในหมวดของคุณ',
    note: 'ขายจริงจังช่วงโปรโมชัน' },
  { id: 'monthly', name: 'รายเดือน', price: '฿290', per: '/เดือน', perDay: '≈ ฿9.7/วัน · ประหยัด 49%',
    desc: 'ทุกอย่างในรายสัปดาห์ + สถิติผู้เข้าชมร้าน + AI ช่วยเขียนคำอธิบายสินค้า',
    note: 'ร้านค้าส่วนใหญ่เลือกแพ็กนี้', hot: true },
  { id: 'yearly', name: 'รายปี', price: '฿2,900', per: '/ปี', perDay: '≈ ฿8/วัน · ฟรี 2 เดือน',
    desc: 'จ่าย 10 เดือน ใช้ 12 เดือน + โลโก้ร้านบนหน้ารวมตลาดตลอดปี',
    note: 'คุ้มสุดเมื่อคิดต่อวัน' },
  { id: 'auction', name: '🔨 ตำแหน่งร้านแนะนำหน้าแรก', price: 'ตั้งราคาแบบประมูล', per: '', perDay: 'English Auction รายสัปดาห์',
    desc: 'ตำแหน่งพรีเมียมหน้าแรกตลาดมีจำกัด — เปิดให้ร้านค้าบิดแข่งกันแบบโปร่งใส ราคาเริ่มเบาๆ บิดสูงสุดชนะ',
    note: 'ราคาที่ยุติธรรมที่สุดคือราคาที่ตลาดสู้', auction: true },
];

const LS_KEY = 'ceo_ai_shop_apps';

function loadLocal(): ShopApplication[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as ShopApplication[]; }
  catch { return []; }
}
function saveLocal(list: ShopApplication[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

export function validPhone(phone: string): boolean {
  return /^[0-9+\- ]{9,15}$/.test(phone.trim());
}

/** ยื่นใบสมัคร — คืน null ถ้าสำเร็จ, ข้อความ error ถ้าไม่ */
export async function submitShopApplication(
  app: Pick<ShopApplication, 'shopName' | 'category' | 'products' | 'phone' | 'lineId' | 'package'>,
): Promise<string | null> {
  if (app.shopName.trim().length < 2) return 'กรุณาระบุชื่อร้าน';
  if (!validPhone(app.phone)) return 'เบอร์โทรไม่ถูกต้อง (9–15 หลัก)';

  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from('shop_applications').insert({
      shop_name: app.shopName.trim(),
      category: app.category,
      products: app.products.trim(),
      phone: app.phone.trim(),
      line_id: app.lineId.trim(),
      package: app.package,
    });
    return error ? 'ส่งใบสมัครไม่สำเร็จ — ลองอีกครั้ง' : null;
  }

  const list = loadLocal();
  list.unshift({
    id: 'app-' + Date.now(),
    shopName: app.shopName.trim(), category: app.category, products: app.products.trim(),
    phone: app.phone.trim(), lineId: app.lineId.trim(), package: app.package,
    status: 'new', createdAt: new Date().toISOString(),
  });
  saveLocal(list);
  return null;
}

interface Row {
  id: string; shop_name: string; category: string; products: string; phone: string;
  line_id: string; package: ShopPackage; status: ShopApplication['status']; created_at: string;
}

/** รายการใบสมัคร (admin เท่านั้นใน production) */
export async function listShopApplications(): Promise<ShopApplication[]> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('shop_applications').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return (data as Row[]).map(r => ({
      id: r.id, shopName: r.shop_name, category: r.category, products: r.products,
      phone: r.phone, lineId: r.line_id, package: r.package, status: r.status, createdAt: r.created_at,
    }));
  }
  return loadLocal();
}

/** admin อัปเดตสถานะใบสมัคร */
export async function updateShopApplication(id: string, status: ShopApplication['status']): Promise<string | null> {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from('shop_applications').update({ status }).eq('id', id);
    return error ? 'อัปเดตไม่สำเร็จ' : null;
  }
  const list = loadLocal();
  const app = list.find(a => a.id === id);
  if (!app) return 'ไม่พบใบสมัคร';
  app.status = status;
  saveLocal(list);
  return null;
}
