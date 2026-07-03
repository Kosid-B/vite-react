import { useEffect, useState } from 'react';
import { DBD_SECTORS } from '../data/dbd';
import { SHOP_PACKAGES, submitShopApplication, validPhone, type ShopPackage } from '../lib/shopApply';
import { track } from '../lib/analytics';

/* ===== สมัครร้านตลาดฝากขายสินค้า — /shop (สาธารณะ ไม่ต้องล็อกอิน) =====
 * สมัครง่ายที่สุด: ชื่อร้าน + เบอร์โทร + LINE — ทีมงานติดต่อกลับเปิดร้านให้
 * บันไดราคา: ฟรี → รายวัน ฿19 → รายสัปดาห์ ฿99 → รายเดือน ฿290 → รายปี ฿2,900
 * + ตำแหน่งร้านแนะนำหน้าแรก ตั้งราคาแบบประมูล (English Auction) */

export default function ShopSignup() {
  const [form, setForm] = useState({
    shopName: '', category: '', products: '', phone: '', lineId: '',
    package: 'free' as ShopPackage,
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'สมัครร้านตลาดฝากขายสินค้า — เริ่มฟรี | CEO AI Thailand';
    const meta = document.querySelector('meta[name="description"]') ?? (() => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'description');
      document.head.appendChild(m);
      return m;
    })();
    meta.setAttribute('content', 'เปิดร้านฝากขายสินค้าบนตลาดออนไลน์ CEO AI Thailand — เริ่มฟรี รายวันแค่ ฿19 สมัครด้วยเบอร์โทรกับ LINE ไม่ต้องมีบัญชี');
  }, []);

  const pick = (id: ShopPackage) => {
    track('shop_pkg_selected', { pkg: id });
    setForm(f => ({ ...f, package: id }));
    document.getElementById('shop-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  async function submit() {
    setMsg(null);
    setBusy(true);
    const err = await submitShopApplication(form);
    setBusy(false);
    if (err) { setMsg('⚠️ ' + err); return; }
    track('shop_signup_submitted', { pkg: form.package });
    setSent(true);
  }

  const selected = SHOP_PACKAGES.find(p => p.id === form.package)!;

  return (
    <div className="start-wrap">
      <header className="start-head">
        <span className="start-brand">🏢 CEO AI Thailand</span>
        <a className="start-head-cta" href="/">เข้าใช้ระบบ →</a>
      </header>

      {/* Hero */}
      <section className="start-hero">
        <div className="start-badge">✦ &nbsp;ตลาดฝากขายสินค้า — MARKETPLACE&nbsp; ✦</div>
        <h1 className="start-h1">
          มีของ แต่ยังไม่มีหน้าร้าน?<br />
          <span className="start-h1-hl">ฝากขายบนตลาดของเรา — เริ่มฟรี รายวันแค่ ฿19</span>
        </h1>
        <p className="start-sub">
          เปิดร้านบนตลาดออนไลน์ที่มีธุรกิจในระบบช่วยกันซื้อ-ขาย ไม่ต้องมีเว็บ ไม่ต้องมีบัญชี<br />
          สมัครด้วย <b>เบอร์โทร + LINE</b> — ทีมงานติดต่อกลับเปิดร้านให้ภายใน 24 ชม.
        </p>
        <div className="start-cta-row">
          <a className="start-cta-main" href="#shop-form">🏪 สมัครร้านฝากขาย — ฟรี</a>
          <a className="start-cta-sub" href="/b">ดูตลาดและร้านที่เปิดแล้ว →</a>
        </div>
      </section>

      {/* Pricing ladder */}
      <section className="start-sec">
        <h2 className="start-h2">เลือกแพ็กเกจร้านของคุณ</h2>
        <p className="start-price-note">
          ยิ่งผูกยาว ยิ่งถูกต่อวัน — เริ่มฟรีก่อนได้เสมอ แล้วค่อยขยับเมื่อขายดี
        </p>
        <div className="shop-pkg-grid">
          {SHOP_PACKAGES.map(p => (
            <div key={p.id}
              className={`shop-pkg${p.hot ? ' hot' : ''}${p.auction ? ' auction' : ''}${form.package === p.id ? ' picked' : ''}`}>
              {p.hot && <div className="start-plan-tag">ร้านส่วนใหญ่เลือก</div>}
              <div className="shop-pkg-name">{p.name}</div>
              <div className="shop-pkg-price">{p.price}<span>{p.per}</span></div>
              <div className="shop-pkg-perday">{p.perDay}</div>
              <p>{p.desc}</p>
              <div className="shop-pkg-note">{p.note}</div>
              <button className="shop-pkg-btn" onClick={() => pick(p.id)}>
                {form.package === p.id ? '✓ เลือกแล้ว' : p.auction ? 'สนใจร่วมประมูล' : 'เลือกแพ็กนี้'}
              </button>
            </div>
          ))}
        </div>
        <div className="shop-auction-note">
          🔨 <b>ทำไมตำแหน่งแนะนำถึงใช้การประมูล?</b> ตำแหน่งหน้าแรกมีจำกัด —
          การประมูลแบบ English Auction (เห็นราคากันสด บิดสูงสุดชนะ) ทำให้ราคาเป็นธรรมกับทุกร้าน
          และร้านที่มั่นใจในสินค้าที่สุดได้ตำแหน่งไป
        </div>
      </section>

      {/* Signup form */}
      <section className="start-sec" id="shop-form">
        <h2 className="start-h2">สมัครร้าน — ใช้แค่เบอร์โทรกับ LINE</h2>
        {sent ? (
          <div className="shop-sent">
            <div className="shop-sent-ico">🎉</div>
            <div className="shop-sent-title">รับใบสมัครแล้ว!</div>
            <p>ทีมงานจะติดต่อกลับทาง <b>LINE หรือโทร</b> ภายใน 24 ชั่วโมง
              เพื่อเปิดร้าน "{form.shopName}" (แพ็กเกจ {selected.name}) ให้คุณ</p>
            <p className="shop-upsell">💡 ระหว่างรอ: เปิด <b>บริษัท AI ฟรี</b> — ได้ทีม AI ช่วยเขียนโพสต์ขายของ
              วางแผนโปรโมชัน และวิเคราะห์คู่แข่งให้ร้านคุณอัตโนมัติ</p>
            <a className="start-cta-main shop-sent-cta" href="/">🚀 เปิดบริษัท AI ของฉัน — ฟรี</a>
            <br />
            <a className="start-cta-sub" href="/b">หรือดูตลาดก่อน →</a>
          </div>
        ) : (
          <div className="shop-form">
            <label>ชื่อร้าน *
              <input value={form.shopName} maxLength={120}
                onChange={e => setForm({ ...form, shopName: e.target.value })}
                placeholder="เช่น ร้านป้าแดง ของฝากเมืองจันท์" />
            </label>
            <label>หมวดสินค้า
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="">— เลือกหมวด —</option>
                {DBD_SECTORS.map(s => (
                  <option key={s.code} value={`[${s.code}] ${s.label}`}>[{s.code}] {s.label}</option>
                ))}
              </select>
            </label>
            <label>สินค้าที่จะฝากขาย
              <input value={form.products} maxLength={200}
                onChange={e => setForm({ ...form, products: e.target.value })}
                placeholder="เช่น ทุเรียนทอด น้ำพริก ผ้าทอมือ" />
            </label>
            <label>เบอร์โทร *
              <input value={form.phone} inputMode="tel" maxLength={15}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="08x-xxx-xxxx" />
            </label>
            <label>LINE ID
              <input value={form.lineId} maxLength={60}
                onChange={e => setForm({ ...form, lineId: e.target.value })}
                placeholder="@yourshop หรือ line id ส่วนตัว" />
            </label>
            <div className="shop-form-pkg">
              แพ็กเกจที่เลือก: <b>{selected.name}</b> — {selected.price}{selected.per}
            </div>
            {msg && <div className="skm-msg">{msg}</div>}
            <button className="start-cta-main shop-submit" disabled={busy || !form.shopName.trim() || !validPhone(form.phone)}
              onClick={submit}>
              {busy ? 'กำลังส่ง…' : '🏪 ส่งใบสมัครร้านค้า'}
            </button>
            <div className="shop-form-note">
              ไม่ต้องสร้างบัญชี ไม่ต้องผูกบัตร — ทีมงานติดต่อกลับเปิดร้านให้
              หรือโทรหาเราเลย <a href="tel:08178177773" style={{ color: '#22d3ee', fontWeight: 600 }}>081-7817-7773</a>
            </div>
          </div>
        )}
      </section>

      <footer className="start-foot">
        CEO AI Thailand — ตลาดฝากขายสินค้าสำหรับธุรกิจไทย ·{' '}
        <a href="/b">สารบัญธุรกิจ</a> ·{' '}
        <a href="/start">เริ่มธุรกิจกับทีม AI</a> ·{' '}
        โดย <a href="https://www.b-tctraining.com" target="_blank" rel="noreferrer">B. Training Consultant (M.E.A) Co., Ltd.</a>
        <br />
        เราให้บริการที่ปรึกษามามากกว่า 20 ปีในประเทศไทย · โทร <a href="tel:08178177773">081-7817-7773</a>
      </footer>
    </div>
  );
}
