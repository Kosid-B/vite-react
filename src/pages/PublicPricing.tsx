import { useEffect } from 'react';
import { BRAND, COMPANY, PAYMENT } from '../config';

/* ===== หน้าสินค้า/ราคา สาธารณะ (เข้าได้โดยไม่ต้องล็อกอิน) =====
 * จุดประสงค์: ให้ผู้ใช้ + ผู้ตรวจสอบ payment gateway (KYC) เห็นชัดเจนว่า
 *   "ขายอะไร · ราคาเท่าไร · ชำระเงินยังไง · คืนเงินยังไง · ติดต่อใคร" โดยไม่ต้องสมัคร
 * เนื้อหาราคาตรงกับหน้า Billing (src/pages/Billing.tsx PLANS) */

const SUPPORT_EMAIL = 'support@b-tctraining.com';
const SITE = 'https://ceoaithailand.org';

interface PlanRow {
  name: string;
  monthly: string;
  yearly: string;
  tagline: string;
  features: string[];
}

const PLANS: PlanRow[] = [
  {
    name: 'Free', monthly: '฿0', yearly: '฿0',
    tagline: 'เริ่มต้นสร้างบริษัท AI + เปิดหน้าร้าน B2B',
    features: ['สร้างทีม AI + มอบงานพื้นฐาน', 'เปิดหน้าร้าน Marketplace ฟรี', 'เข้าถึงฟีเจอร์หลักแบบจำกัด'],
  },
  {
    name: 'Starter', monthly: '฿390 / เดือน', yearly: '฿3,900 / ปี',
    tagline: 'สำหรับเจ้าของธุรกิจรายเดี่ยว/มือใหม่',
    features: ['ทุกอย่างใน Free', 'ซื้อขาย B2B (RFQ) เต็มรูปแบบ', 'ทีม AI ช่วยงานการตลาด/เอกสาร'],
  },
  {
    name: 'Growth', monthly: '฿1,490 / เดือน', yearly: '฿14,900 / ปี',
    tagline: 'สำหรับ SME ที่ต้องการทีมครบ',
    features: ['ทุกอย่างใน Starter', 'AI Research + Market/Team/Analytics', 'ISO 9001 QMS + SIPOC'],
  },
  {
    name: 'Scale', monthly: '฿5,900 / เดือน', yearly: '฿59,000 / ปี',
    tagline: 'สำหรับองค์กรที่ต้องการใช้งานเต็มระบบ',
    features: ['ทุกอย่างใน Growth', 'ผู้ดูแลระบบ + เวิร์กสเปซทีม', 'ฟีเจอร์ขั้นสูงทั้งหมด'],
  },
];

export default function PublicPricing() {
  useEffect(() => {
    document.title = `สินค้าและราคา — ${BRAND.product}`;
    const meta = document.querySelector('meta[name="description"]') ?? (() => {
      const m = document.createElement('meta'); m.setAttribute('name', 'description'); document.head.appendChild(m); return m;
    })();
    meta.setAttribute('content', `${BRAND.product} — SaaS ให้ SME ไทยจ้างทีม AI บริหารธุรกิจ + ตลาด B2B. แพ็กเกจ Free / Starter ฿390 / Growth ฿1,490 / Scale ฿5,900 ต่อเดือน. ชำระผ่าน PromptPay/โอนบัญชี.`);
  }, []);

  return (
    <div className="legal-wrap">
      <header className="legal-head">
        <a className="legal-back" href="/">← กลับหน้าหลัก</a>
        <h1 className="legal-title">สินค้าและราคา — {BRAND.product}</h1>
        <p className="legal-sub">แพลตฟอร์ม SaaS โดย {COMPANY.nameTh}</p>
      </header>

      {/* 1. สินค้า/บริการคืออะไร */}
      <section className="legal-sec">
        <h2>1. บริการนี้คืออะไร</h2>
        <p>
          <b>{BRAND.product}</b> คือซอฟต์แวร์บริการ (SaaS) แบบสมัครสมาชิกรายเดือน/รายปี สำหรับผู้ประกอบการและ SME ไทย
          ช่วยให้ธุรกิจ “จ้างทีม AI” มาช่วยวางแผนกลยุทธ์ ทำการตลาด จัดทำเอกสารมาตรฐาน (เช่น ISO 9001) วิเคราะห์ข้อมูล
          และเปิดหน้าร้าน/ซื้อขายแบบ B2B ในตลาดกลาง — ทั้งหมดผ่านเว็บแอปพลิเคชัน ไม่มีการจัดส่งสินค้าทางกายภาพ
        </p>
        <p><b>สิ่งที่ลูกค้าได้รับ (ดิจิทัล):</b></p>
        <ul>
          <li>เครื่องมือสร้าง “บริษัท AI” + มอบหมายงานให้ทีม AI ทำงานอัตโนมัติ</li>
          <li>ตลาด B2B (RFQ) — ประกาศงาน/รับงาน/ใบเสนอราคา + หน้าร้านสาธารณะของธุรกิจ</li>
          <li>เครื่องมือธุรกิจ: แผนการตลาด, Business Model Canvas, ISO 9001 QMS, วิเคราะห์ SaaS</li>
          <li>รายงาน/เอกสารที่ส่งออกเป็นไฟล์ได้ (Markdown/PDF/CSV)</li>
        </ul>
      </section>

      {/* 2. ราคา */}
      <section className="legal-sec">
        <h2>2. แพ็กเกจและราคา</h2>
        <p>ราคาแสดงรวมภาษีมูลค่าเพิ่มแล้ว สกุลเงินบาท (THB) · ยกเลิกการต่ออายุได้ทุกเมื่อ · ทดลองใช้ฟรี 15 วัน</p>
        <div className="pp-table-wrap">
          <table className="pp-table">
            <thead>
              <tr><th>แพ็กเกจ</th><th>รายเดือน</th><th>รายปี</th><th>เหมาะกับ</th><th>ฟีเจอร์เด่น</th></tr>
            </thead>
            <tbody>
              {PLANS.map(p => (
                <tr key={p.name}>
                  <td><b>{p.name}</b></td>
                  <td>{p.monthly}</td>
                  <td>{p.yearly}</td>
                  <td>{p.tagline}</td>
                  <td><ul className="pp-feat">{p.features.map((f, i) => <li key={i}>{f}</li>)}</ul></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="legal-note">
          เริ่มใช้งาน/ดูรายละเอียดแพ็กเกจแบบเต็มได้ที่ <a href={`${SITE}/`}>{SITE.replace('https://', '')}</a> →
          เมนู “แพ็กเกจ &amp; ชำระเงิน”
        </p>
      </section>

      {/* 3. วิธีชำระเงิน */}
      <section className="legal-sec">
        <h2>3. วิธีชำระเงิน</h2>
        <ul>
          <li><b>PromptPay (QR)</b> — สแกนจ่ายเข้าบัญชีนิติบุคคลของผู้ให้บริการ (พร้อมเพย์: {PAYMENT.promptpayId})</li>
          <li><b>โอนเงินผ่านธนาคาร</b> — {PAYMENT.bankName} ชื่อบัญชี “{PAYMENT.accountName}” เลขที่ {PAYMENT.accountNo}</li>
          <li><b>บัตรเครดิต/เดบิต &amp; e-Wallet</b> — ผ่านผู้ให้บริการรับชำระเงินที่ได้มาตรฐาน (เปิดใช้เมื่อผ่านการยืนยันบัญชีร้านค้า)</li>
        </ul>
        <p>หลังชำระเงิน ระบบจะเปิดใช้งานแพ็กเกจให้โดยอัตโนมัติ หรือภายใน 1 ชั่วโมงทำการกรณีโอน/สแกนแล้วส่งสลิป</p>
      </section>

      {/* 4. นโยบายที่เกี่ยวข้อง */}
      <section className="legal-sec">
        <h2>4. นโยบายและเงื่อนไข</h2>
        <ul>
          <li><a href={`${SITE}/refund`}>นโยบายการคืนเงิน (Refund Policy)</a> — คืนเงินได้ภายใน 7 วันตามเงื่อนไข</li>
          <li><a href={`${SITE}/terms`}>ข้อกำหนดและเงื่อนไขการใช้บริการ</a></li>
          <li><a href={`${SITE}/privacy`}>นโยบายความเป็นส่วนตัว (PDPA)</a></li>
        </ul>
      </section>

      {/* 5. ติดต่อ / ข้อมูลบริษัท */}
      <section className="legal-sec">
        <h2>5. ผู้ให้บริการและช่องทางติดต่อ</h2>
        <table className="legal-tbl">
          <tbody>
            <tr><th>ผู้ให้บริการ</th><td>{COMPANY.nameTh}<br /><span className="legal-dim">{COMPANY.name}</span></td></tr>
            <tr><th>ที่อยู่</th><td>{COMPANY.address}</td></tr>
            <tr><th>เลขประจำตัวผู้เสียภาษี</th><td>{COMPANY.taxId}</td></tr>
            <tr><th>โทรศัพท์</th><td><a href={`tel:${COMPANY.tel.replace(/-/g, '')}`}>{COMPANY.tel}</a></td></tr>
            <tr><th>อีเมลฝ่ายบริการลูกค้า</th><td><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></td></tr>
            <tr><th>เว็บไซต์บริษัท</th><td><a href={COMPANY.website} target="_blank" rel="noreferrer">{COMPANY.website}</a></td></tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
