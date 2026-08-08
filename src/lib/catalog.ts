// catalog.ts — Product Catalog หลาย SKU ต่อหน้าร้าน (pure + tested)
// ปรัชญาราคา (ยืนยันโดย User): "ไม่จำกัดจำนวน SKU" — Free/Starter ลงได้ไม่อั้น (ยิ่งเยอะยิ่งถูกค้นเจอ)
//   เก็บเงินจาก transaction 3% + หลายบริษัท (multi-company) ไม่ใช่ cap SKU (จะไปลดของที่อยากให้เกิด)

export interface CatalogItem {
  id: string;
  name: string;
  price: number;      // บาท · 0 = "สอบถามราคา"
  unit?: string;      // ต่อ ชิ้น/ชม./เดือน/งาน
  desc?: string;      // รายละเอียดสั้น
}

/** ⚠️ ไม่มีเพดานจำนวน SKU โดยดีไซน์ (ห้ามใส่ MAX_SKU) — ดูหมายเหตุปรัชญาราคาด้านบน */

const str = (v: unknown): string => (typeof v === 'string' ? v : '').trim();
const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };

/** id สุ่มไม่ชน (crypto ถ้ามี, fallback) — impure ไม่ต้องเทสต์ค่า */
export function makeItemId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return 'sku-' + crypto.randomUUID(); } catch { /* noop */ }
  return 'sku-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function emptyCatalogItem(id: string): CatalogItem {
  return { id, name: '', price: 0, unit: '', desc: '' };
}

/** coerce ข้อมูลจาก DB/JSON → CatalogItem[] ที่ปลอดภัย (กันของเสีย) */
export function coerceItems(v: unknown): CatalogItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const id = str(o.id) || makeItemId();
      return { id, name: str(o.name), price: num(o.price), unit: str(o.unit), desc: str(o.desc) } as CatalogItem;
    })
    .filter((i) => i.name.length > 0);
}

export function validateItem(item: CatalogItem): { ok: boolean; error?: string } {
  if (!item.name.trim()) return { ok: false, error: 'ต้องมีชื่อสินค้า/บริการ' };
  if (item.price < 0) return { ok: false, error: 'ราคาต้องไม่ติดลบ' };
  return { ok: true };
}

export function addItem(list: CatalogItem[], item: CatalogItem): CatalogItem[] {
  return [...list, { ...item, name: item.name.trim() }];
}
export function updateItem(list: CatalogItem[], id: string, patch: Partial<CatalogItem>): CatalogItem[] {
  return list.map((i) => (i.id === id ? { ...i, ...patch } : i));
}
export function removeItem(list: CatalogItem[], id: string): CatalogItem[] {
  return list.filter((i) => i.id !== id);
}

export interface CatalogSummary { count: number; minPrice: number; maxPrice: number; priced: number }
export function catalogSummary(list: CatalogItem[]): CatalogSummary {
  const priced = list.filter((i) => i.price > 0);
  const prices = priced.map((i) => i.price);
  return {
    count: list.length,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    priced: priced.length,
  };
}

export function formatBaht(n: number): string {
  return '฿' + Math.max(0, Math.round(n)).toLocaleString('th-TH');
}
/** ป้ายราคาต่อชิ้น: "฿120/ชิ้น" หรือ "สอบถามราคา" ถ้า 0 */
export function priceLabel(item: CatalogItem): string {
  if (!(item.price > 0)) return 'สอบถามราคา';
  return formatBaht(item.price) + (item.unit?.trim() ? '/' + item.unit.trim() : '');
}
