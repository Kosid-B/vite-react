import { useState } from 'react';
import {
  emptyCatalogItem, makeItemId, addItem, updateItem, removeItem, validateItem,
  catalogSummary, priceLabel, type CatalogItem,
} from '../lib/catalog';

/* CatalogEditor — จัดการสินค้า/บริการรายชิ้น (SKU) บนหน้าร้าน
 * ปรัชญา: ไม่จำกัดจำนวน SKU (ยิ่งลงเยอะยิ่งถูกค้นเจอ) — ไม่มีปุ่ม/เพดานจำกัด */

const box: React.CSSProperties = { border: '1px solid var(--sand)', background: 'var(--cream)', color: 'var(--ink)', borderRadius: 8, padding: '8px 10px', fontFamily: 'inherit', fontSize: 13.5, boxSizing: 'border-box' };

export default function CatalogEditor({ items, onChange }: { items: CatalogItem[]; onChange: (items: CatalogItem[]) => void }) {
  const [draft, setDraft] = useState<CatalogItem>(() => emptyCatalogItem(makeItemId()));
  const s = catalogSummary(items);
  const add = () => {
    if (!validateItem(draft).ok) return;
    onChange(addItem(items, { ...draft, name: draft.name.trim() }));
    setDraft(emptyCatalogItem(makeItemId()));
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 12.5, color: 'var(--ink3)' }}>
        🛍 รายการสินค้า/บริการ: <b style={{ color: 'var(--ink)' }}>{s.count}</b> รายการ
        <span style={{ color: 'var(--accent)' }}> · ไม่จำกัดจำนวน — ยิ่งลงเยอะ ยิ่งถูกค้นเจอ</span>
      </div>

      {items.map(it => (
        <div key={it.id} style={{ display: 'grid', gap: 6, gridTemplateColumns: '1fr', border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 12px', background: 'var(--cream2)' }}>
          <div style={{ display: 'grid', gap: 6, gridTemplateColumns: '2fr 1fr 1fr auto', alignItems: 'center' }}>
            <input style={box} value={it.name} placeholder="ชื่อสินค้า/บริการ" onChange={e => onChange(updateItem(items, it.id, { name: e.target.value }))} />
            <input style={box} value={it.price || ''} inputMode="numeric" placeholder="ราคา" onChange={e => onChange(updateItem(items, it.id, { price: Number(e.target.value) || 0 }))} />
            <input style={box} value={it.unit ?? ''} placeholder="ต่อ (ชิ้น/ชม.)" onChange={e => onChange(updateItem(items, it.id, { unit: e.target.value }))} />
            <button onClick={() => onChange(removeItem(items, it.id))} title="ลบ" style={{ border: '1px solid var(--sand)', background: 'transparent', color: 'var(--danger, #dc2626)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>✕</button>
          </div>
          <input style={box} value={it.desc ?? ''} placeholder="รายละเอียดสั้น (ไม่บังคับ)" onChange={e => onChange(updateItem(items, it.id, { desc: e.target.value }))} />
          <div style={{ fontSize: 12, color: 'var(--ink3)' }}>ป้ายราคา: <b style={{ color: 'var(--ink)' }}>{priceLabel(it)}</b></div>
        </div>
      ))}

      {/* แถวเพิ่มรายการใหม่ */}
      <div style={{ display: 'grid', gap: 6, gridTemplateColumns: '2fr 1fr 1fr auto', alignItems: 'center', borderTop: '1px dashed var(--sand)', paddingTop: 10 }}>
        <input style={box} value={draft.name} placeholder="+ เพิ่มสินค้า/บริการ" onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') add(); }} />
        <input style={box} value={draft.price || ''} inputMode="numeric" placeholder="ราคา" onChange={e => setDraft(d => ({ ...d, price: Number(e.target.value) || 0 }))} />
        <input style={box} value={draft.unit ?? ''} placeholder="ต่อ" onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))} />
        <button onClick={add} disabled={!draft.name.trim()} style={{ border: 0, background: draft.name.trim() ? 'var(--accent)' : 'var(--sand)', color: '#fff', borderRadius: 8, padding: '7px 14px', cursor: draft.name.trim() ? 'pointer' : 'default', fontFamily: 'inherit', fontWeight: 700 }}>เพิ่ม</button>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>💡 เว้นราคาว่าง = แสดง “สอบถามราคา”</div>
    </div>
  );
}
