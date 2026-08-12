# ตารางลิงก์ต่อภาพ — ก๊อปวางได้เลย

> **กฎเดียวที่ต้องจำ:** ปุ่มในภาพกดไม่ได้ — ลิงก์ต้องอยู่ใน**ข้อความ**เสมอ
> URL ในภาพมีไว้ให้คน "พิมพ์ตาม" · URL ในแคปชันมีไว้ให้คน "กด"

---

## 🔗 ลิงก์ทั้งหมด

| ภาพ | URL ในภาพ | คนกดแล้วไปที่ |
|---|---|---|
| `05-story-sim-scam` · `08-feed4x5-simscam` | `ceoaithailand.org/sms` | บทความ SMS อัปเดตซิม |
| `01-story-nocapital` · `06-feed4x5-nocapital` | `ceoaithailand.org/ทุน` | เริ่มธุรกิจไม่มีทุน |
| `02-story-pricing` · `07-feed4x5-pricing` | `ceoaithailand.org/ราคา` | ตั้งราคาไม่ขาดทุน |
| `04-story-firstcustomers` · `09-feed4x5-firstcustomers` | `ceoaithailand.org/ลูกค้า` | หาลูกค้า 10 คนแรก |
| `03-story-noskill-ai` | `ceoaithailand.org/ai` | ลอง AI ฟรี (หน้า /start) |

**ทุกลิงก์มีเวอร์ชันอังกฤษด้วย** (เผื่อคนเปิดคีย์บอร์ดอังกฤษอยู่):
`/sms` = `/ซิม` · `/tun` = `/ทุน` · `/price` = `/ราคา` · `/customer` = `/ลูกค้า` · `/plan` = `/แผน`

ทุกตัว **ติด UTM ให้อัตโนมัติ** → เห็นในรายงานว่าคอนเทนต์ชิ้นไหนพาคนมา

---

## 🏷️ ต่อท้าย `?s=` เพื่อบอกว่ามาจากแพลตฟอร์มไหน

**URL ในภาพ** ใช้ตัวสั้นเปล่า ๆ (ให้คนพิมพ์ตาม) · **URL ในแคปชัน/คำอธิบาย** ต่อท้ายด้วย `?s=`
ไม่ต่อก็ยังใช้ได้ แค่จะรวมเป็นก้อน `social` แยกไม่ออกว่ามาจากที่ไหน

| ต่อท้าย | แพลตฟอร์ม | ตัวอย่างเต็ม |
|---|---|---|
| `?s=yt` | YouTube Shorts | `ceoaithailand.org/price?s=yt` |
| `?s=ytv` | YouTube คลิปยาว | `ceoaithailand.org/price?s=ytv` |
| `?s=tt` | TikTok (ไบโอ) | `ceoaithailand.org/sms?s=tt` |
| `?s=fb` | Facebook feed | `ceoaithailand.org/sms?s=fb` |
| `?s=ig` | Instagram Story | `ceoaithailand.org/tun?s=ig` |
| `?s=line` | LINE / กลุ่มไลน์ | `ceoaithailand.org/customer?s=line` |
| `?s=li` | LinkedIn | `ceoaithailand.org/plan?s=li` |
| `?s=qr` | QR ในนามบัตร/เอกสาร | `ceoaithailand.org/ai?s=qr` |

**แยกคลิปย่อยในเรื่องเดียวกัน** เติม `&c=` เข้าไป — ใช้ตอนทำ A/B (เวอร์ชัน A vs B)
```
ceoaithailand.org/price?s=yt&c=1a
ceoaithailand.org/price?s=yt&c=1b
```

> ค่าที่ไม่รู้จักจะตกกลับเป็น `social/organic` เอง — พิมพ์ผิดไม่พัง แค่เสียการแยกที่มา

---

## ▶️ YouTube Shorts — ลิงก์อยู่ใน "คำอธิบาย" เท่านั้น

**ช่องชื่อ = ใส่ hook ไม่ใช่ลิงก์** · ลิงก์ในช่องชื่อกดไม่ได้และกินที่ hook ทิ้ง

| คลิปเรื่อง | วางในคำอธิบาย |
|---|---|
| ต้นทุนต่อจาน | `https://ceoaithailand.org/price?s=yt&c=1a` |
| 3 ข้อผิดพลาดคนเริ่มธุรกิจ | `https://ceoaithailand.org/tun?s=yt&c=2a` |
| ทำธุรกิจคนเดียว | `https://ceoaithailand.org/plan?s=yt&c=3a` |
| ไม่ต้องเก่ง AI | `https://ceoaithailand.org/ai?s=yt&c=4a` |
| ลูกค้า 10 คนแรก | `https://ceoaithailand.org/customer?s=yt&c=5a` |
| SMS ปลอม | `https://ceoaithailand.org/sms?s=yt&c=6a` |

เวอร์ชัน B เปลี่ยน `c=1a` เป็น `c=1b` — ที่เหลือเหมือนเดิม

> **ลิงก์เดียวใช้ทุกคลิปไม่ได้** — คนดูเรื่องต้นทุนแล้วกดไปเจอเรื่องอื่น = ปิดทิ้ง
> ที่ใช้ลิงก์เดียวได้จริงคือ **ลิงก์ในโปรไฟล์ช่อง** → ใส่ `ceoaithailand.org/ai?s=yt`

---

## 📘 Facebook feed — วางท้ายแคปชัน

พิมพ์ URL เป็นข้อความ Facebook จะทำให้กดได้เอง

**SMS อัปเดตซิม**
```
วิธีเช็ก 5 ข้อ อ่านฟรี ไม่ต้องสมัคร 👉 https://ceoaithailand.org/sms
```

**เริ่มธุรกิจไม่มีทุน**
```
คู่มือ 7 ก้าว อ่านฟรี 👉 https://ceoaithailand.org/tun
```

**ตั้งราคาไม่ขาดทุน**
```
สูตรคิดต้นทุน+กำไร อ่านฟรี 👉 https://ceoaithailand.org/price
```

**หาลูกค้า 10 คนแรก**
```
วิธีหาลูกค้าโดยไม่ต้องยิงแอด 👉 https://ceoaithailand.org/customer
```

**ลอง AI ฟรี**
```
ลองใช้ทีม AI ฟรี ไม่ต้องสมัคร 👉 https://ceoaithailand.org/ai
```

> 💡 ใส่ `https://` ด้วย — Facebook จะได้ดึงภาพตัวอย่างหน้าเว็บขึ้นมาให้ (link preview)

---

## 📸 Facebook / Instagram Story

ภาพอย่างเดียวไม่พอ **ต้องติด Link sticker เอง**

1. อัปโหลดภาพ Story
2. แตะไอคอน **สติกเกอร์** → เลือก **Link**
3. วาง URL เต็ม เช่น `https://ceoaithailand.org/sms`
4. ตั้งข้อความบนสติกเกอร์ให้ตรงกับปุ่มในภาพ เช่น `อ่านวิธีเช็ก`
5. **วางสติกเกอร์ทับหรือติดกับปุ่มในภาพ** เพื่อให้คนเข้าใจว่ากดตรงนี้

---

## 💬 LINE / กลุ่มไลน์

ส่งภาพ แล้วส่งข้อความตามทันที (LINE ทำ URL เป็นลิงก์ให้เอง)

```
วิธีเช็ก 5 ข้อ อ่านฟรีครับ
https://ceoaithailand.org/sms
```

---

## 🎵 TikTok / Reels — ⚠️ ต้องตั้งไบโอก่อน

**แคปชัน TikTok กดลิงก์ไม่ได้** — ทางเดียวคือลิงก์ในไบโอ

**ก่อนโพสต์:**
1. โปรไฟล์ → **แก้ไขโปรไฟล์** → ช่อง **เว็บไซต์**
2. ใส่ `ceoaithailand.org/sms` (ช่วงแคมเปญนี้)
3. หมดกระแสแล้วเปลี่ยนเป็น `ceoaithailand.org/ai`

**ในแคปชันเขียนชี้ทางเสมอ:**
```
วิธีเช็ก 5 ข้อ อยู่ในลิงก์ใต้โปรไฟล์ 👆 อ่านฟรี ไม่ต้องสมัคร
```

> 🔴 **ถ้าไม่ตั้งไบโอ = วิวเท่าไรก็เข้าเว็บ 0 คน** — เคยเกิดแล้วครั้งหนึ่งกับคลิปที่ได้วิวเกือบสองหมื่น

---

## ✅ เช็กก่อนโพสต์ทุกครั้ง

- [ ] เปิดลิงก์สั้นจากมือถือจริง แล้วเข้าถูกหน้า
- [ ] URL ในภาพ **ตรงกับ** URL ในแคปชัน
- [ ] Story ติด Link sticker แล้ว
- [ ] TikTok/Reels — ตั้งไบโอแล้ว
- [ ] ลองพิมพ์ตามจากภาพ (ไม่ copy-paste) แล้วเข้าถูก

---

*แนวทางนี้เก็บเป็น skill ถาวรของระบบแล้วที่ `social-creative-linking` — ครั้งหน้าทำครีเอทีฟใหม่ เรียกใช้ได้เลยไม่ต้องคิดใหม่*
