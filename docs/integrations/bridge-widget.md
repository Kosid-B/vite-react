# Bridge Widget — เว็บบริษัท (b-tctraining) → ceoaithailand.org/start

> **เป้าหมาย:** เปลี่ยน organic ISO traffic ที่อุ่นอยู่แล้วบนเว็บบริษัท (GA4: organic 63% ของ key events)
> ให้กลายเป็น user ของแอป — ปิดช่องว่าง "สะพานเชื่อม 2 เว็บ" ใน [WHY-NO-USERS-DIAGNOSIS.md](../marketing/WHY-NO-USERS-DIAGNOSIS.md)
>
> วิธีใช้: ก๊อป snippet ด้านล่างไปแปะในเว็บบริษัท (WordPress: Appearance → ปลั๊กอิน insert HTML / footer.php ก่อน `</body>`).
> ทุกลิงก์ฝัง **UTM** แล้ว → วัดผลได้ใน GA4 ของแอป (Traffic acquisition → Session source/medium = `btctraining / bridge`).

---

## A. Floating Banner (แปะทุกหน้า — ก่อน `</body>`)
แถบลอยล่าง ปิดได้ จำไว้ 7 วัน (ไม่กวน) · จุดยืน challenger

```html
<!-- ===== CEO AI Thailand — Bridge Floating Banner ===== -->
<div id="ceoai-bridge" style="position:fixed;left:0;right:0;bottom:0;z-index:99999;background:rgba(2,6,23,.96);backdrop-filter:blur(8px);border-top:1px solid #164e63;box-shadow:0 -6px 24px rgba(0,0,0,.4);font-family:inherit">
  <div style="max-width:960px;margin:0 auto;display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:center;padding:12px 18px">
    <span style="flex:none;background:#22d3ee;color:#00212b;font-weight:800;font-size:11px;padding:3px 9px;border-radius:999px">ใหม่</span>
    <span style="color:#e2e8f0;font-size:14.5px;flex:1;min-width:200px;text-align:center"><b style="color:#fff">เจ้าใหญ่ทำ AI ให้องค์กรใหญ่ — เราทำให้ SME ไทยจ้างทีม AI ทั้งบริษัทได้</b> เริ่มฟรี ไม่ต้องใช้บัตร</span>
    <a href="https://ceoaithailand.org/start?ref=btctraining&utm_source=btctraining&utm_medium=bridge&utm_campaign=floating" target="_blank" rel="noopener"
       onclick="try{window.gtag&&gtag('event','bridge_click',{link_id:'floating'});}catch(e){}try{window._lt&&_lt('send','cv',{type:'StartClick'},['afc2c605-4307-45cc-b400-35bba3844d21']);}catch(e){}"
       style="flex:none;background:#f59e0b;color:#020617;font-weight:800;font-size:15px;text-decoration:none;padding:11px 22px;border-radius:10px">ลองฟรี 15 วัน →</a>
    <button id="ceoai-bridge-x" aria-label="ปิด" style="flex:none;background:none;border:none;color:#64748b;font-size:22px;cursor:pointer;line-height:1">×</button>
  </div>
</div>
<script>(function(){var K='ceoai_bridge_hidden',el=document.getElementById('ceoai-bridge');if(!el)return;
try{var t=localStorage.getItem(K);if(t&&Date.now()-(+t)<6048e5){el.style.display='none';return;}}catch(e){}
document.getElementById('ceoai-bridge-x').addEventListener('click',function(){el.style.display='none';try{localStorage.setItem(K,String(Date.now()));}catch(e){}});})();</script>
```

## B. Inline Card (แปะกลาง/ท้ายบทความ ISO/BCP/PDPA — ตรงกลุ่มที่สุด)

```html
<!-- ===== CEO AI Thailand — Inline ISO Card ===== -->
<div style="margin:26px 0;background:linear-gradient(135deg,#0b1220,#0f2233);border:1px solid #164e63;border-radius:16px;padding:22px;color:#fff;display:flex;gap:18px;align-items:center;flex-wrap:wrap;font-family:inherit">
  <div style="flex:1;min-width:240px">
    <div style="font-size:12px;font-weight:800;letter-spacing:1px;color:#22d3ee">CEO AI THAILAND · ใหม่</div>
    <div style="font-size:19px;font-weight:800;margin:6px 0 4px">ประเมินความพร้อม ISO ของโรงงานคุณ ฟรี ด้วย AI</div>
    <div style="font-size:14px;color:#94a3b8">รู้ทันทีว่ายังขาดเอกสารอะไรก่อน audit — ไม่ต้องรอนัดที่ปรึกษา</div>
  </div>
  <a href="https://ceoaithailand.org/start?ref=btctraining&utm_source=btctraining&utm_medium=content_card&utm_campaign=iso_inline" target="_blank" rel="noopener"
     onclick="try{window.gtag&&gtag('event','bridge_click',{link_id:'iso_inline'});}catch(e){}try{window._lt&&_lt('send','cv',{type:'StartClick'},['afc2c605-4307-45cc-b400-35bba3844d21']);}catch(e){}"
     style="flex:none;background:#f59e0b;color:#020617;font-weight:800;font-size:16px;text-decoration:none;padding:14px 26px;border-radius:12px">เริ่มฟรี →</a>
</div>
```

> 💡 **เปลี่ยน `utm_campaign` + `link_id` ตามหน้า** ที่วาง เพื่อรู้ว่าหน้าไหน convert ดีสุด:
> `iso22301` (หน้า ISO 22301) · `pdpa` (หน้า PDPA) · `bcp` (หน้า BCP) · `bmc` (Business Model Canvas) · `training` (ฝึกอบรม)

## C. ปุ่มเมนู/ไซด์บาร์ (แบบเรียบ)

```html
<a href="https://ceoaithailand.org/start?ref=btctraining&utm_source=btctraining&utm_medium=bridge&utm_campaign=menu" target="_blank" rel="noopener"
   onclick="try{window.gtag&&gtag('event','bridge_click',{link_id:'menu'});}catch(e){}try{window._lt&&_lt('send','cv',{type:'StartClick'},['afc2c605-4307-45cc-b400-35bba3844d21']);}catch(e){}"
   style="display:inline-block;background:#22d3ee;color:#00212b;font-weight:800;text-decoration:none;padding:10px 18px;border-radius:8px;font-family:inherit">🤖 จ้างทีม AI ฟรี</a>
```

---

## 🔥 จุดยืน Viral — ท้าชนเจ้าใหญ่แบบมีคลาส (co-opetition)
หลัก: **punch up ไม่ใส่ร้าย** — ไม่เอ่ยชื่อคู่แข่งในทางลบ แต่วางตัวเป็น "ทางเลือกของ SME" ตรงข้ามกับ "ของบริษัทใหญ่"
(ยักษ์ยิ่งดังยิ่งช่วยเราขยายหมวด — คนตื่นตัวเรื่อง AI แล้วมองหาของที่ SME จ่ายไหว)

**คลัง headline challenger (สลับ A/B):**
1. "เจ้าใหญ่ทำ AI ให้องค์กรใหญ่ — เราทำให้ **SME ไทย** จ้างทีม AI ทั้งบริษัทได้" *(ใช้ในแบนเนอร์)*
2. "ไม่ต้องรองบล้านเพื่อใช้ AI — SME ไทยมีทีม AI ของตัวเองได้แล้ว **ฟรี 15 วัน**"
3. "AI สำหรับบริษัทใหญ่มีเยอะ — แต่ **AI ที่เข้าใจ SME ไทย** ทำ ISO/เอกสารได้จริง มีที่เดียว"
4. "ที่ปรึกษาจริง 20 ปี + ทีม AI = สิ่งที่แพลตฟอร์มต่างชาติให้คุณไม่ได้"

> ข้อ 4 = จุดแข็งที่ลอกไม่ได้ (moat): **ประสบการณ์ที่ปรึกษาไทย 20 ปี** ผสม AI — เจ้าใหญ่มี AI แต่ไม่มีบริบท SME ไทย/ISO

**ต่อยอด viral (นอกแบนเนอร์):**
- คอนเทนต์ story "David vs Goliath": ทำไม SME ไทยไม่ต้องรอเทคยักษ์ (เล่าผ่านคลิป/โพสต์)
- เปรียบเทียบแบบมีคลาส: ตาราง "องค์กรใหญ่ vs SME" (ราคา/เวลา/บริบทไทย) — ไม่เอ่ยชื่อยี่ห้อ
- ผูกกระแส: ช่วงที่ข่าว "AI for SMEs" ของเจ้าใหญ่ดัง → โพสต์ "เริ่มได้เลยวันนี้ ฟรี" เกาะกระแส

---

---

## D. วางตรงไหน — ตามข้อมูล GA4 จริง (17 มิ.ย.–16 ก.ค. 2569)
GA4 (G-CHJ99RY1Q1) เห็น traffic ของเว็บบริษัทแล้ว → **71% ของ user ใหม่มาจาก Organic Search** เข้าหน้า content ลึกโดยตรง
(ไม่ผ่านหน้าแรก) ดังนั้นต้องวาง **Inline Card (section B) ในเนื้อหาหน้าเหล่านี้** ไม่ใช่พึ่งแบนเนอร์ลอยอย่างเดียว

| หน้า organic แรง (จาก GA4) | `utm_campaign` / `link_id` | เหตุผล |
|---|---|---|
| ISO 22301 (BCM/business continuity) | `iso22301` | intent สูง ตรงกลุ่มโรงงาน |
| PDPA (การจัดการคุ้มครองข้อมูล) | `pdpa` | เกาะ compliance → AI ช่วยทำเอกสาร |
| BCP (ฝึกซ้อมแผนต่อเนื่องธุรกิจ) | `bcp` | ต่อเนื่องกับ ISO 22301 |
| Business Model Canvas (BMC) | `bmc` | คนวางแผนธุรกิจ = เป้า CEO AI |
| ฝึกอบรม / training | `training` | ผู้เข้าอบรม = warm lead |
| ที่ปรึกษา / consultant | `consultant` | intent สูงสุด (หาที่ปรึกษาอยู่แล้ว) |

> เมืองเด่นใน GA4: Bangkok (37%, ↑450%) + เมืองอุตสาหกรรม EEC (Rayong/Map Ta Phut/Bang Kadi/Huai Pong) = กลุ่ม ISO/โรงงานจริง

---

## E. Cross-domain measurement (ผูก session ข้ามเว็บ — สำคัญต่อการวัดผล)
ปัญหา: ถ้าไม่ตั้ง cross-domain คนคลิกจากเว็บบริษัท → `/start` จะถูกนับเป็น **session ใหม่ (referral)**
ทำให้ signup ไม่ถูก attribute กลับไปยัง organic source เดิม (เห็นภาพ funnel ไม่ครบ)

**ต้องทำ 2 ที่:**

**1) ฝั่งแอป (ceoaithailand.org)** — ทำแล้วใน `index.html`:
```js
gtag('config', 'G-CHJ99RY1Q1', { linker: { domains: ['b-tctraining.com', 'ceoaithailand.org'] } });
```

**2) ฝั่งเว็บบริษัท (b-tctraining.com)** — เพิ่มบรรทัดนี้ในสคริปต์ gtag ที่เว็บบริษัท (ถ้ายังไม่มี linker):
```html
<script>
  // ต่อจาก gtag('js', new Date());
  gtag('config', 'G-CHJ99RY1Q1', { linker: { domains: ['b-tctraining.com', 'ceoaithailand.org'] } });
</script>
```

**3) ตั้งใน GA4 UI (ทำครั้งเดียว):**
`Admin → Data streams → เลือก stream → Configure tag settings → Configure your domains`
→ Add ทั้ง `b-tctraining.com` และ `ceoaithailand.org` → Save

**4) ตั้ง Key event (conversion) ใน GA4:**
`Admin → Events` → mark ให้เป็น key event:
- `bridge_click` (คลิกสะพานจากเว็บบริษัท)
- `start_cta_click` (กดปุ่มสมัครในหน้า /start — แอปยิงให้อยู่แล้ว)
- `start_variant` (เห็น hero ISO — วัด exposure)

## 📊 วัดผลสะพาน (สำคัญ — ปิด loop diagnosis)
- ทุกลิงก์มี UTM: `?ref=btctraining&utm_source=btctraining&utm_medium=<bridge|content_card>&utm_campaign=<หน้า>`
- ดูใน **GA4 แอป** → Reports → Acquisition → Traffic acquisition → filter `session source = btctraining`
- **Funnel เต็ม:** organic เข้าเว็บบริษัท → `bridge_click` → `/start` page_view → `start_cta_click` → signup
- ตำแหน่งที่ควร convert ดีสุด = **Inline card บนบทความ ISO/consultant** (intent สูงสุด)

## หมายเหตุ
- เว็บบริษัท (b-tctraining.com = R-Web CMS) เป็นคนละไซต์กับ repo นี้ — snippet นี้ไป **แปะที่เว็บบริษัท**
  (Inline card: วางในบทความผ่านโหมด HTML/โค้ด · Floating banner: ตั้งค่า → โค้ดและสคริปต์ → ก่อน `</body>`)
- `onclick` ยิง 2 อย่าง: `gtag('event','bridge_click')` (GA4) + `_lt(...StartClick)` (LINE Ads conversion) — ปลอดภัยด้วย try/catch
- ปรับสี/ข้อความได้ · ลิงก์ปลายทาง `/start?ref=btctraining` โชว์ hero เวอร์ชัน ISO อัตโนมัติ
