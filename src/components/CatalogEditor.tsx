import { useState } from 'react';
import {
  emptyCatalogItem, makeItemId, addItem, updateItem, removeItem, validateItem,
  catalogSummary, priceLabel, type CatalogItem,
} from '../lib/catalog';

/* CatalogEditor — จัดการสินค้า/บริการรายชิ้น (SKU) บนหน้าร้าน
 * ปรัชญา: ไม่จำกัดจำนวน SKU (ยิ่งลงเยอะยิ่งถูกค้นเจอ) — ไม่มีปุ่ม/เพดานจำกัด
 * onUpload (ไม่บังคับ): ส่งไฟล์รูปสินค้าขึ้น Storage → คืน URL (ใช้ uploadShopImage ของหน้าร้าน) */

const box: React.CSSProperties = { border: '1px solid var(--sand)', background: 'var(--cream)', color: 'var(--ink)', borderRadius: 8, padding: '8px 10px', fontFamily: 'inherit', fontSize: 13.5, boxSizing: 'border-box' };

type UploadFn = (file: File) => Promise<{ url?: string; error?: string }>;

/** ปุ่ม/รูปสินค้าต่อชิ้น — มีรูปแล้วโชว์ thumbnail + ลบได้ · ยังไม่มีก็กดแนบ (ย่อรูปอัตโนมัติใน onUpload) */
function ItemImage({ url, busy, onPick, onClear }: { url?: string; busy: boolean; onPick: (f: File) => void; onClear: () => void }) {
  const sq: React.CSSProperties = { width: 46, height: 46, borderRadius: 8, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' };
  if (url) {
    return (
      <div style={{ ...sq, border: '1px solid var(--sand)' }}>
        <img src={url} alt="รูปสินค้า" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <button type="button" onClick={onClear} title="ลบรูป" style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', border: 0, background: 'var(--danger, #dc2626)', color: '#fff', fontSize: 11, cursor: 'pointer', lineHeight: '18px', padding: 0 }}>×</button>
      </div>
    );
  }
  return (
    <label style={{ ...sq, border: '1px dashed var(--sand)', color: 'var(--ink3)', cursor: 'pointer', fontSize: 18 }} title="แนบรูปสินค้า">
      {busy ? '⏳' : '📷'}
      <input type="file" accept="image/jpeg,image/png,image/webp" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); e.currentTarget.value = ''; }} />
    </label>
  );
}

export default function CatalogEditor({ items, onChange, onUpload }: { items: CatalogItem[]; onChange: (items: CatalogItem[]) => void; onUpload?: UploadFn }) {
  const [draft, setDraft] = useState<CatalogItem>(() => emptyCatalogItem(makeItemId()));
  const [busyId, setBusyId] = useState<string | null>(null);
  const s = catalogSummary(items);
  const add = () => {
    if (!validateItem(draft).ok) return;
    onChange(addItem(items, { ...draft, name: draft.name.trim() }));
    setDraft(emptyCatalogItem(makeItemId()));
  };

  /** อัปรูปให้สินค้าแถวนั้น (id) หรือ draft (id='draft') */
  async function pickImage(id: string, file: File, apply: (url: string) => void) {
    if (!onUpload) return;
    setBusyId(id);
    const { url, error } = await onUpload(file);
    setBusyId(null);
    if (url) apply(url);
    else if (error) alert('อัปโหลดรูปไม่สำเร็จ: ' + error);
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 12.5, color: 'var(--ink3)' }}>
        🛍 รายการสินค้า/บริการ: <b style={{ color: 'var(--ink)' }}>{s.count}</b> รายการ
        <span style={{ color: 'var(--accent)' }}> · ไม่จำกัดจำนวน — ยิ่งลงเยอะ ยิ่งถูกค้นเจอ</span>
      </div>

      {items.map(it => (
        <div key={it.id} style={{ display: 'grid', gap: 6, gridTemplateColumns: '1fr', border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 12px', background: 'var(--cream2)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {onUpload && (
              <ItemImage url={it.image} busy={busyId === it.id}
                onPick={f => pickImage(it.id, f, url => onChange(updateItem(items, it.id, { image: url })))}
                onClear={() => onChange(updateItem(items, it.id, { image: undefined }))} />
            )}
            <div style={{ display: 'grid', gap: 6, gridTemplateColumns: '2fr 1fr 1fr auto', alignItems: 'center', flex: 1 }}>
              <input style={box} value={it.name} placeholder="ชื่อสินค้า/บริการ" onChange={e => onChange(updateItem(items, it.id, { name: e.target.value }))} />
              <input style={box} value={it.price || ''} inputMode="numeric" placeholder="ราคา" onChange={e => onChange(updateItem(items, it.id, { price: Number(e.target.value) || 0 }))} />
              <input style={box} value={it.unit ?? ''} placeholder="ต่อ (ชิ้น/ชม.)" onChange={e => onChange(updateItem(items, it.id, { unit: e.target.value }))} />
              <button onClick={() => onChange(removeItem(items, it.id))} title="ลบ" style={{ border: '1px solid var(--sand)', background: 'transparent', color: 'var(--danger, #dc2626)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>✕</button>
            </div>
          </div>
          <input style={box} value={it.desc ?? ''} placeholder="รายละเอียดสั้น (ไม่บังคับ)" onChange={e => onChange(updateItem(items, it.id, { desc: e.target.value }))} />
          <div style={{ fontSize: 12, color: 'var(--ink3)' }}>ป้ายราคา: <b style={{ color: 'var(--ink)' }}>{priceLabel(it)}</b></div>
        </div>
      ))}

      {/* แถวเพิ่มรายการใหม่ */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px dashed var(--sand)', paddingTop: 10 }}>
        {onUpload && (
          <ItemImage url={draft.image} busy={busyId === 'draft'}
            onPick={f => pickImage('draft', f, url => setDraft(d => ({ ...d, image: url })))}
            onClear={() => setDraft(d => ({ ...d, image: undefined }))} />
        )}
        <div style={{ display: 'grid', gap: 6, gridTemplateColumns: '2fr 1fr 1fr auto', alignItems: 'center', flex: 1 }}>
          <input style={box} value={draft.name} placeholder="+ เพิ่มสินค้า/บริการ" onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') add(); }} />
          <input style={box} value={draft.price || ''} inputMode="numeric" placeholder="ราคา" onChange={e => setDraft(d => ({ ...d, price: Number(e.target.value) || 0 }))} />
          <input style={box} value={draft.unit ?? ''} placeholder="ต่อ" onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))} />
          <button onClick={add} disabled={!draft.name.trim()} style={{ border: 0, background: draft.name.trim() ? 'var(--accent)' : 'var(--sand)', color: '#fff', borderRadius: 8, padding: '7px 14px', cursor: draft.name.trim() ? 'pointer' : 'default', fontFamily: 'inherit', fontWeight: 700 }}>เพิ่ม</button>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>💡 เว้นราคาว่าง = แสดง “สอบถามราคา”</div>
    </div>
  );
}
