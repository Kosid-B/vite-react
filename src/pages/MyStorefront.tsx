import { useEffect, useState } from 'react';
import type { AppData, PageId } from '../types';
import { getMyStorefront, saveStorefront, uploadShopImage, MAX_SHOP_IMAGES, type Storefront } from '../lib/storefront';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import { draftVpLocal } from '../lib/firstDeal';
import { trackAiCall } from '../lib/usage';
import DBDSelect from '../components/DBDSelect';
import EditableList from '../components/EditableList';
import ShopBooster from '../components/ShopBooster';
import IdeaValidation from '../components/IdeaValidation';

interface Props {
  data: AppData;
  wsId: string | null;
  onUpdate?: (data: AppData) => void;
  onNavigate?: (page: PageId) => void;
}

const APP_ORIGIN = 'https://ceoaithailand.org';

function defaultSlug(name: string): string {
  return name.trim().replace(/\s+/g, '-').slice(0, 60) || 'my-business';
}

export default function MyStorefront({ data, wsId, onUpdate, onNavigate }: Props) {
  const c = data.aiCompany;
  const [sf, setSf] = useState<Storefront | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [vpBusy, setVpBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);

  useEffect(() => {
    getMyStorefront(wsId).then(existing => {
      // ยังไม่มีหน้าร้าน → ร่างจากข้อมูลบริษัทที่กรอกไว้แล้ว (productDesc / productDbd / BMC)
      setSf(existing ?? {
        slug: defaultSlug(c.name),
        name: c.name,
        dbd: c.productDbd ?? c.industry ?? '',
        kind: 'both',
        vp: '',
        promo: '',
        images: [],
        description: c.productDesc ?? data.businessModel.bmc.value[0] ?? '',
        services: data.businessModel.bmc.value.slice(0, 3),
        phone: '', lineId: '', email: '', website: '',
        published: true,
      });
    }).catch(() => setMsg('⚠️ โหลดข้อมูลไม่สำเร็จ')).finally(() => setLoading(false));
  }, [wsId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !sf) return <div className="page-loading" />;

  const publicUrl = `${APP_ORIGIN}/b/${encodeURIComponent(sf.slug)}`;
  const patch = (p: Partial<Storefront>) => setSf({ ...sf, ...p });

  /** อัปโหลดรูปสินค้า — prod: Storage · local: dataURL (ย่อรูปให้อัตโนมัติ) */
  async function addImage(file?: File) {
    if (!file || !sf || sf.images.length >= MAX_SHOP_IMAGES) return;
    setImgBusy(true);
    const { url, error } = await uploadShopImage(wsId, file);
    setImgBusy(false);
    if (error || !url) { setMsg('⚠️ อัปโหลดรูปไม่สำเร็จ: ' + (error ?? '')); return; }
    patch({ images: [...sf.images, url] });
    setMsg('📷 เพิ่มรูปแล้ว — อย่าลืมกดเผยแพร่เพื่อบันทึก');
  }

  /** AI Agent เขียน Value Proposition — prod: Claude ผ่าน ai-assist · local: template จากข้อมูลจริง */
  async function generateVp() {
    if (!sf) return;
    setVpBusy(true);
    setMsg(null);
    try {
      if (isSupabaseEnabled && supabase) {
        trackAiCall();
        const { data: res, error } = await supabase.functions.invoke('ai-assist', {
          body: {
            page: 'storefront',
            pageLabel: 'หน้าร้านของฉัน',
            instruction: 'เขียน Value Proposition หนึ่งประโยค (ไม่เกิน 160 ตัวอักษร ภาษาไทย) ตามโครง: ช่วย[ลูกค้ากลุ่มไหน] แก้[ปัญหาอะไร] ด้วย[สิ่งที่เราให้] ต่างจากคู่แข่งตรง[จุดแข็ง] — ตอบเฉพาะประโยค VP ใน summary',
            context: `ธุรกิจ: ${sf.name} · หมวด DBD: ${sf.dbd} · คำอธิบาย: ${sf.description} · บริการ: ${sf.services.join(', ')}`,
          },
        });
        if (error) throw error;
        const vp = (res?.summary ?? '').trim().replace(/^["']|["']$/g, '');
        if (!vp) throw new Error('AI ไม่ตอบกลับ');
        patch({ vp: vp.slice(0, 200) });
        setMsg('✨ AI Agent เขียนจุดขายให้แล้ว — ปรับแก้ได้ตามใจ แล้วกดเผยแพร่');
      } else {
        patch({ vp: draftVpLocal(sf.name, sf.dbd, sf.description, sf.services) });
        setMsg('✨ ร่างจุดขายจากข้อมูลของคุณแล้ว (local mode) — ปรับแก้ได้ตามใจ');
      }
    } catch (e) {
      setMsg('⚠️ เรียก AI ไม่สำเร็จ: ' + ((e as Error).message || 'error') + ' — ใช้ร่างอัตโนมัติแทน');
      patch({ vp: draftVpLocal(sf.name, sf.dbd, sf.description, sf.services) });
    } finally {
      setVpBusy(false);
    }
  }

  async function save(published: boolean) {
    if (!sf) return;
    if (!sf.name.trim() || !sf.slug.trim()) { setMsg('⚠️ กรอกชื่อธุรกิจและชื่อลิงก์ก่อน'); return; }
    setSaving(true);
    setMsg(null);
    const next = { ...sf, published };
    const err = await saveStorefront(wsId, next);
    setSaving(false);
    if (err) { setMsg('⚠️ ' + err); return; }
    setSf(next);
    setMsg(published
      ? `✅ เผยแพร่หน้าร้านแล้ว — ลูกค้าเข้าชมได้ที่ ${publicUrl}${isSupabaseEnabled ? '' : ' (local mode: พรีวิวในเครื่องนี้เท่านั้น)'}`
      : '✅ บันทึกแบบร่างแล้ว (ยังไม่เผยแพร่)');
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">หน้าร้านของฉัน</div>
        <div className="page-meta">
          <span className="meta-chip">Marketplace · ฟรีทุกแพ็กเกจ</span>
          <span className="meta-chip">{sf.published ? '🟢 เผยแพร่อยู่' : '⚪ แบบร่าง'}</span>
        </div>
      </div>

      <p className="sipoc-intro">
        หน้าร้านสาธารณะให้ลูกค้าค้นเจอธุรกิจของคุณ — สร้างจากข้อมูลที่กรอกไว้แล้ว
        แสดงในสารบัญธุรกิจตามหมวด DBD พร้อมช่องทางติดต่อตรงถึงคุณ (ระบบไม่เก็บค่าคอมมิชชัน)
      </p>

      <div className="sf-editor">
        <div className="sf-form">
          <label className="sf-field">
            <span>ชื่อธุรกิจ</span>
            <input value={sf.name} onChange={e => patch({ name: e.target.value })} spellCheck={false} />
          </label>
          <label className="sf-field">
            <span>ชื่อลิงก์ (slug) — {APP_ORIGIN}/b/…</span>
            <input value={sf.slug} onChange={e => patch({ slug: e.target.value.replace(/[\s/]/g, '-') })} spellCheck={false} />
          </label>
          <label className="sf-field">
            <span>หมวดธุรกิจ (DBD) — ใช้จัดกลุ่มในสารบัญ</span>
            <DBDSelect className="sf-inp" value={sf.dbd} onChange={v => patch({ dbd: v })} />
          </label>
          <label className="sf-field">
            <span>ประเภทร้าน — ใช้กรอง 🛍 สินค้า / 🛠 บริการ บนตลาด</span>
            <select className="sf-inp" value={sf.kind} onChange={e => patch({ kind: e.target.value as Storefront['kind'] })}>
              <option value="both">🛍🛠 ทั้งสินค้าและบริการ</option>
              <option value="product">🛍 สินค้า</option>
              <option value="service">🛠 บริการ</option>
            </select>
          </label>
          <label className="sf-field">
            <span>📣 โฆษณา / โปรโมชัน — แสดงเด่นบนตลาดและหน้าร้าน</span>
            <input value={sf.promo} maxLength={140} onChange={e => patch({ promo: e.target.value })} spellCheck={false}
              placeholder='เช่น "ลด 20% ตลอดเดือนนี้ · ส่งฟรีทั่วไทยเมื่อสั่งครบ ฿500"' />
          </label>
          <div className="sf-field">
            <span>📷 รูปสินค้า (สูงสุด {MAX_SHOP_IMAGES} รูป) — รูปแรกคือหน้าปกบนตลาด</span>
            <div className="sf-img-row">
              {sf.images.map((url, i) => (
                <div key={i} className="sf-img-thumb">
                  <img src={url} alt={`รูปสินค้า ${i + 1}`} />
                  <button className="sf-img-del" title="ลบรูปนี้"
                    onClick={() => patch({ images: sf.images.filter((_, j) => j !== i) })}>×</button>
                </div>
              ))}
              {sf.images.length < MAX_SHOP_IMAGES && (
                <label className="sf-img-add">
                  {imgBusy ? '⏳' : '＋'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden
                    onChange={e => addImage(e.target.files?.[0])} />
                </label>
              )}
            </div>
            <span className="sf-img-hint">แนบรูปจริงของสินค้า — ร้านที่มีรูปได้รับการติดต่อมากกว่าหลายเท่า</span>
          </div>
          <div className="sf-field">
            <span>✨ จุดขาย (Value Proposition) — ประโยคแรกที่ลูกค้าเห็น</span>
            <div className="sf-vp-row">
              <input value={sf.vp} onChange={e => patch({ vp: e.target.value })} spellCheck={false}
                placeholder='เช่น "ช่วยโรงงานอาหาร SME ผ่าน audit ISO ในครึ่งเวลา ด้วยระบบเอกสารอัตโนมัติ"' />
              <button className="sf-vp-btn" onClick={generateVp} disabled={vpBusy}>
                {vpBusy ? '⏳ AI กำลังคิด…' : '✨ ให้ AI Agent เขียน'}
              </button>
            </div>
          </div>
          <label className="sf-field">
            <span>คำอธิบายธุรกิจ</span>
            <textarea rows={3} value={sf.description} onChange={e => patch({ description: e.target.value })} spellCheck={false} />
          </label>

          <div className="sf-field">
            <span>สินค้า / บริการเด่น</span>
            <EditableList
              items={sf.services}
              itemKey={'sf-services'}
              onSave={(i, v) => { const a = [...sf.services]; a[i] = v; patch({ services: a }); }}
              onAdd={() => patch({ services: [...sf.services, 'บริการใหม่'] })}
              onDelete={i => patch({ services: sf.services.filter((_, x) => x !== i) })}
              multiline={false}
              addLabel="＋ เพิ่ม"
            />
          </div>

          <div className="sf-grid2">
            <label className="sf-field"><span>เบอร์โทร</span>
              <input value={sf.phone} onChange={e => patch({ phone: e.target.value })} placeholder="081-234-5678" /></label>
            <label className="sf-field"><span>LINE ID</span>
              <input value={sf.lineId} onChange={e => patch({ lineId: e.target.value })} placeholder="@mybusiness" /></label>
            <label className="sf-field"><span>อีเมล</span>
              <input value={sf.email} onChange={e => patch({ email: e.target.value })} placeholder="contact@business.com" /></label>
            <label className="sf-field"><span>เว็บไซต์</span>
              <input value={sf.website} onChange={e => patch({ website: e.target.value })} placeholder="www.business.com" /></label>
          </div>

          <div className="sf-actions">
            <button className="sf-publish" onClick={() => save(true)} disabled={saving}>
              {saving ? '⏳ กำลังบันทึก…' : '🚀 เผยแพร่หน้าร้าน'}
            </button>
            <button className="sf-draft" onClick={() => save(false)} disabled={saving}>บันทึกแบบร่าง (ปิดเผยแพร่)</button>
          </div>
          {msg && <div className="sf-msg">{msg}</div>}
        </div>

        <div className="sf-side">
          <div className="sf-side-hd">🔗 ลิงก์หน้าร้าน</div>
          <div className="plg-ref-row">
            <input className="plg-ref-link" readOnly value={publicUrl} onFocus={e => e.target.select()} />
            <button className="plg-ref-copy" onClick={() => {
              navigator.clipboard?.writeText(publicUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
            }}>{copied ? '✓ คัดลอกแล้ว' : 'คัดลอก'}</button>
          </div>
          <a className="sf-preview" href={`/b/${encodeURIComponent(sf.slug)}`} target="_blank" rel="noreferrer">
            👁 เปิดดูหน้าร้าน (แท็บใหม่)
          </a>
          <div className="sf-tip">
            💡 เอาลิงก์นี้ไปใส่ใน LINE OA, Facebook Page และนามบัตรได้เลย —
            ลูกค้าเห็นสินค้า/บริการและติดต่อคุณตรงโดยไม่ต้องสมัครสมาชิก
          </div>
        </div>
      </div>

      {/* 🧪 พิสูจน์ไอเดียก่อนลงทุนสร้าง — วัดจากลูกค้าที่ทิ้งช่องทางติดต่อจริง */}
      <IdeaValidation slug={sf.slug} publicUrl={publicUrl} />

      {/* 🚀 สะพานสู่ บริษัท AI — จ้างทีม AI ทำการตลาดให้ร้านนี้ */}
      {onUpdate && onNavigate && (
        <ShopBooster data={data} sf={sf} onUpdate={onUpdate} onNavigate={onNavigate} />
      )}
    </div>
  );
}
