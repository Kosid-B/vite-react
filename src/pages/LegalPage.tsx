import { useEffect } from 'react';
import { BRAND, COMPANY, PAYMENT } from '../config';

/* ===== หน้าเอกสารทางกฎหมาย (สาธารณะ — เข้าได้โดยไม่ต้องล็อกอิน) =====
 * ข้อมูลบริษัท · นโยบายความเป็นส่วนตัว (PDPA) · นโยบายการคืนเงิน · ข้อกำหนดและเงื่อนไข
 * เนื้อหาดึงจาก src/config.ts (COMPANY/PAYMENT) — แก้ที่เดียวใช้ทั้งระบบ */

const EFFECTIVE_DATE = '6 กรกฎาคม 2569'; // ปรับปรุงล่าสุด
const SUPPORT_EMAIL = 'support@b-tctraining.com';
const SITE = 'ceoaithailand.org';

export type LegalSection = 'company' | 'privacy' | 'refund' | 'terms';

const NAV: { id: LegalSection; label: string }[] = [
  { id: 'company', label: 'ข้อมูลบริษัท' },
  { id: 'privacy', label: 'นโยบายความเป็นส่วนตัว' },
  { id: 'refund', label: 'นโยบายการคืนเงิน' },
  { id: 'terms', label: 'ข้อกำหนดและเงื่อนไข' },
];

const webDisplay = COMPANY.website.replace(/^https?:\/\//, '').replace(/\/$/, '');

/** จัดรูปเลขผู้เสียภาษี 13 หลักเป็น x-xxxx-xxxxx-xx-x (มาตรฐานไทย) */
function fmtTaxId(id: string): string {
  const d = id.replace(/\D/g, '');
  if (d.length !== 13) return id;
  return `${d[0]}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10, 12)}-${d[12]}`;
}

export default function LegalPage({ section = 'company' }: { section?: LegalSection }) {
  useEffect(() => {
    document.title = `ข้อกำหนด · ความเป็นส่วนตัว · การคืนเงิน — ${BRAND.product}`;
    const el = document.getElementById(section);
    if (el && section !== 'company') el.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [section]);

  return (
    <div className="legal-root">
      <style>{LEGAL_CSS}</style>
      <header className="legal-head">
        <a href="/" className="legal-back">← กลับหน้าหลัก</a>
        <h1 className="legal-title">ข้อกำหนดการใช้บริการ &amp; นโยบาย</h1>
        <p className="legal-sub">{BRAND.product} · {SITE} · ให้บริการโดย {COMPANY.nameTh}</p>
        <p className="legal-eff">ปรับปรุงล่าสุด: {EFFECTIVE_DATE}</p>
        <nav className="legal-nav">
          {NAV.map(n => <a key={n.id} href={`/legal#${n.id}`} className="legal-nav-a">{n.label}</a>)}
        </nav>
      </header>

      {/* ============ 1. ข้อมูลบริษัท ============ */}
      <section id="company" className="legal-sec">
        <h2>1. ข้อมูลบริษัท (ผู้ให้บริการ)</h2>
        <table className="legal-table">
          <tbody>
            <tr><th>ชื่อนิติบุคคล (ไทย)</th><td>{COMPANY.nameTh}</td></tr>
            <tr><th>ชื่อนิติบุคคล (อังกฤษ)</th><td>{COMPANY.name}</td></tr>
            <tr><th>ที่อยู่จดทะเบียน</th><td>{COMPANY.address}</td></tr>
            <tr><th>โทรศัพท์</th><td><a href={`tel:${COMPANY.tel.replace(/[^0-9+]/g, '')}`}>{COMPANY.tel}</a></td></tr>
            <tr><th>อีเมลติดต่อ / ฝ่ายบริการลูกค้า</th><td><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></td></tr>
            <tr><th>เว็บไซต์</th><td><a href={COMPANY.website} target="_blank" rel="noreferrer">{webDisplay}</a> · <a href={`https://${SITE}`} target="_blank" rel="noreferrer">{SITE}</a></td></tr>
            <tr><th>เลขประจำตัวผู้เสียภาษี</th><td>{COMPANY.taxId ? fmtTaxId(COMPANY.taxId) : 'โปรดติดต่อฝ่ายบริการลูกค้าเพื่อขอข้อมูลใบกำกับภาษี'}</td></tr>
          </tbody>
        </table>
        <p className="legal-note">
          {BRAND.product} เป็นบริการซอฟต์แวร์ (SaaS) ภายใต้การดำเนินงานของ {COMPANY.nameTh}
          สอบถามหรือร้องเรียนการให้บริการได้ที่อีเมลหรือโทรศัพท์ข้างต้น ในวันและเวลาทำการ
        </p>
      </section>

      {/* ============ 2. นโยบายความเป็นส่วนตัว ============ */}
      <section id="privacy" className="legal-sec">
        <h2>2. นโยบายความเป็นส่วนตัว (Privacy Policy)</h2>
        <p>เราเคารพความเป็นส่วนตัวของคุณ และปฏิบัติตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</p>

        <h3>2.1 ข้อมูลที่เราเก็บรวบรวม</h3>
        <ul>
          <li><b>ข้อมูลบัญชี:</b> อีเมลที่ใช้สมัคร/เข้าสู่ระบบ</li>
          <li><b>ข้อมูลที่คุณกรอกในระบบ:</b> ข้อมูลธุรกิจ/เวิร์กสเปซที่คุณสร้างเอง (แผนงาน เอกสาร รายรับ-รายจ่าย ฯลฯ)</li>
          <li><b>ข้อมูลการใช้งาน:</b> สถิติการเข้าใช้เพื่อปรับปรุงบริการ (ผ่าน Google Analytics)</li>
          <li><b>ข้อมูลการชำระเงิน:</b> ดำเนินการผ่านผู้ให้บริการรับชำระเงินภายนอก — เรา<u>ไม่จัดเก็บเลขบัตรเครดิตเต็ม</u>ไว้ในระบบของเรา</li>
        </ul>

        <h3>2.2 วัตถุประสงค์ในการใช้ข้อมูล</h3>
        <ul>
          <li>ให้บริการและดูแลบัญชีของคุณ</li>
          <li>ประมวลผลการชำระเงินและออกใบเสร็จ/ใบกำกับภาษี</li>
          <li>ปรับปรุงและพัฒนาบริการให้ดีขึ้น</li>
          <li>ติดต่อเรื่องบริการ ความปลอดภัย และการแจ้งเตือนสำคัญ</li>
        </ul>

        <h3>2.3 ผู้ให้บริการภายนอก (ผู้ประมวลผลข้อมูล)</h3>
        <p>เราใช้ผู้ให้บริการที่ได้มาตรฐานเพื่อประมวลผลข้อมูลบางส่วน เช่น การโฮสต์ฐานข้อมูลและระบบ (Supabase, Cloudflare), การวิเคราะห์การใช้งาน (Google Analytics), การส่งอีเมล (Resend), การค้นหาข้อมูล และผู้ให้บริการรับชำระเงิน ผู้ให้บริการเหล่านี้อาจจัดเก็บข้อมูลบนเซิร์ฟเวอร์ในต่างประเทศภายใต้มาตรการคุ้มครองที่เหมาะสม</p>

        <h3>2.4 สิทธิของเจ้าของข้อมูล</h3>
        <p>คุณมีสิทธิเข้าถึง แก้ไข ลบ ระงับการใช้ คัดค้าน ขอรับสำเนา และถอนความยินยอมได้ คุณสามารถลบข้อมูลเวิร์กสเปซได้ด้วยตนเองในระบบ หรือขอใช้สิทธิโดยติดต่อ <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>

        <h3>2.5 คุกกี้และการวิเคราะห์แบบสมัครใจ</h3>
        <p>ฟีเจอร์วัดผลประสบการณ์ (Pulse &amp; A/B) เป็นแบบ <b>สมัครใจ (opt-in)</b> — ค่าเริ่มต้นปิด ผู้ใช้เปิด/ปิด/ลบข้อมูลได้ทุกเมื่อ ระบบยังใช้งานได้ครบแม้ไม่เข้าร่วม</p>

        <h3>2.6 การเก็บรักษาและความปลอดภัย</h3>
        <p>เราเก็บข้อมูลเท่าที่จำเป็นตามวัตถุประสงค์และกฎหมาย ใช้การควบคุมการเข้าถึงระดับแถว (Row-Level Security) และการเข้ารหัสระหว่างรับส่งข้อมูล เมื่อคุณลบบัญชี/เวิร์กสเปซ ข้อมูลจะถูกลบตามกระบวนการที่กำหนด</p>

        <h3>2.7 ติดต่อเรื่องข้อมูลส่วนบุคคล</h3>
        <p>{COMPANY.nameTh} · <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> · โทร {COMPANY.tel}</p>
      </section>

      {/* ============ 3. นโยบายการคืนเงิน ============ */}
      <section id="refund" className="legal-sec">
        <h2>3. นโยบายการคืนเงิน (Refund Policy)</h2>

        <h3>3.1 ทดลองใช้ฟรี</h3>
        <p>บริการมีช่วงทดลองใช้ฟรี 15 วัน หากยกเลิกก่อนสิ้นสุดช่วงทดลอง จะ<b>ไม่มีการเรียกเก็บเงิน</b></p>

        <h3>3.2 แพ็กเกจแบบชำระเงิน (รายเดือน)</h3>
        <ul>
          <li>แพ็กเกจต่ออายุอัตโนมัติ คุณยกเลิกการต่ออายุได้ทุกเมื่อ โดยมีผลในรอบบิลถัดไป และยังใช้บริการได้จนสิ้นสุดรอบที่ชำระแล้ว</li>
          <li>โดยทั่วไป<b>ไม่มีการคืนเงินตามสัดส่วน</b>สำหรับรอบบิลที่เริ่มใช้งานไปแล้ว (มาตรฐานบริการดิจิทัล)</li>
        </ul>

        <h3>3.3 กรณีที่ขอคืนเงินได้</h3>
        <ul>
          <li>ชำระซ้ำซ้อน/ผิดพลาดทางเทคนิคจากระบบ</li>
          <li>ระบบไม่สามารถใช้งานได้อย่างมีนัยสำคัญอันเนื่องมาจากความผิดพลาดของผู้ให้บริการ และเราไม่สามารถแก้ไขได้ในเวลาอันสมควร</li>
          <li>คำขอคืนเงินภายใน <b>7 วัน</b> นับจากการชำระเงินครั้งแรก โดยที่ยังไม่ได้ใช้งานในสาระสำคัญ (พิจารณาเป็นกรณี)</li>
        </ul>

        <h3>3.4 วิธีขอคืนเงินและระยะเวลา</h3>
        <p>ส่งคำขอพร้อมหลักฐานการชำระเงินมาที่ <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> เมื่อได้รับอนุมัติ เราจะคืนเงินผ่านช่องทางเดิมภายใน <b>7–14 วันทำการ</b> ทั้งนี้อาจหักค่าธรรมเนียมของผู้ให้บริการรับชำระเงิน (ถ้ามี) ที่ไม่สามารถเรียกคืนได้</p>
      </section>

      {/* ============ 4. ข้อกำหนดและเงื่อนไข ============ */}
      <section id="terms" className="legal-sec">
        <h2>4. ข้อกำหนดและเงื่อนไขการใช้บริการ (Terms &amp; Conditions)</h2>

        <h3>4.1 การยอมรับข้อตกลง</h3>
        <p>การเข้าถึงหรือใช้บริการ {BRAND.product} ถือว่าคุณยอมรับข้อกำหนดฉบับนี้ หากไม่ยอมรับ โปรดหยุดใช้บริการ</p>

        <h3>4.2 คุณสมบัติและบัญชีผู้ใช้</h3>
        <p>ผู้ใช้ต้องมีอายุและความสามารถตามกฎหมายในการทำนิติกรรม คุณมีหน้าที่รักษาความปลอดภัยของบัญชีและรหัสผ่าน และรับผิดชอบต่อกิจกรรมที่เกิดขึ้นภายใต้บัญชีของคุณ</p>

        <h3>4.3 การใช้งานที่ยอมรับได้</h3>
        <p>ห้ามใช้บริการเพื่อการที่ผิดกฎหมาย ละเมิดสิทธิผู้อื่น ส่งสแปม เผยแพร่มัลแวร์ ละเมิดทรัพย์สินทางปัญญา หรือพยายามเจาะระบบ/ทำวิศวกรรมย้อนกลับ</p>

        <h3>4.4 เนื้อหาของผู้ใช้</h3>
        <p>ข้อมูลและเนื้อหาที่คุณสร้างยังคงเป็นของคุณ คุณให้สิทธิเราในการประมวลผลและจัดเก็บเท่าที่จำเป็นเพื่อให้บริการแก่คุณเท่านั้น</p>

        <h3>4.5 คำแนะนำจาก AI (ข้อจำกัด)</h3>
        <p>ผลลัพธ์ที่สร้างโดย AI เป็น<b>เครื่องมือช่วยเท่านั้น</b> ไม่ใช่คำแนะนำทางกฎหมาย บัญชี ภาษี หรือการเงินที่รับรองได้ คุณควรตรวจสอบความถูกต้องและปรึกษาผู้เชี่ยวชาญก่อนนำไปใช้ในเรื่องสำคัญ</p>

        <h3>4.6 การชำระเงินและแพ็กเกจ</h3>
        <p>ค่าบริการ การต่ออายุ และการยกเลิก เป็นไปตามที่แสดงในหน้าแพ็กเกจและ<a href="/legal#refund">นโยบายการคืนเงิน</a>ข้างต้น</p>

        <h3>4.7 ทรัพย์สินทางปัญญาของแพลตฟอร์ม</h3>
        <p>ซอฟต์แวร์ เครื่องหมายการค้า และส่วนประกอบของแพลตฟอร์มเป็นทรัพย์สินของ {COMPANY.nameTh} ห้ามทำซ้ำหรือดัดแปลงโดยไม่ได้รับอนุญาต</p>

        <h3>4.8 ข้อจำกัดความรับผิด</h3>
        <p>บริการให้ "ตามสภาพที่เป็นอยู่" ภายในขอบเขตที่กฎหมายอนุญาต เราไม่รับผิดต่อความเสียหายทางอ้อมหรือความเสียหายที่เป็นผลสืบเนื่องจากการใช้หรือไม่สามารถใช้บริการได้</p>

        <h3>4.9 การระงับหรือยกเลิกบัญชี</h3>
        <p>เราสงวนสิทธิ์ระงับหรือยกเลิกบัญชีที่ละเมิดข้อกำหนดนี้ โดยจะแจ้งให้ทราบตามสมควรเว้นแต่กรณีจำเป็นเร่งด่วน</p>

        <h3>4.10 การแก้ไขข้อกำหนด</h3>
        <p>เราอาจปรับปรุงข้อกำหนดเป็นครั้งคราว และจะระบุวันที่ปรับปรุงล่าสุดไว้ การใช้บริการต่อถือเป็นการยอมรับฉบับที่แก้ไข</p>

        <h3>4.11 กฎหมายที่ใช้บังคับ</h3>
        <p>ข้อกำหนดนี้อยู่ภายใต้กฎหมายแห่งราชอาณาจักรไทย และให้ศาลไทยเป็นผู้มีเขตอำนาจ</p>

        <h3>4.12 ติดต่อเรา</h3>
        <p>{COMPANY.nameTh} · {COMPANY.address} · โทร {COMPANY.tel} · <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
      </section>

      <footer className="legal-foot">
        © 2026 {BRAND.product} · {SITE} · {COMPANY.name}
        {PAYMENT.xenditLive ? '' : ''}
      </footer>
    </div>
  );
}

const LEGAL_CSS = `
.legal-root{ max-width:820px; margin:0 auto; padding:32px 22px 80px; color:#e2e8f0;
  font-family:"Noto Sans Thai",system-ui,sans-serif; line-height:1.8; }
.legal-back{ color:#38bdf8; font-size:14px; text-decoration:none; }
.legal-back:hover{ text-decoration:underline; }
.legal-title{ font-size:clamp(24px,4vw,34px); font-weight:800; margin:14px 0 6px; color:#f8fafc; }
.legal-sub{ color:#94a3b8; font-size:14.5px; margin:0; }
.legal-eff{ color:#64748b; font-size:13px; margin:4px 0 0; }
.legal-nav{ display:flex; flex-wrap:wrap; gap:8px; margin:18px 0 8px; }
.legal-nav-a{ font-size:13px; font-weight:600; color:#cbd5e1; text-decoration:none;
  background:#1e293b; border:1px solid #334155; border-radius:999px; padding:6px 14px; }
.legal-nav-a:hover{ border-color:#38bdf8; color:#38bdf8; }
.legal-sec{ margin-top:34px; scroll-margin-top:20px; border-top:1px solid #1e293b; padding-top:22px; }
.legal-sec h2{ font-size:20px; font-weight:800; color:#f8fafc; margin:0 0 12px; }
.legal-sec h3{ font-size:15.5px; font-weight:700; color:#e2e8f0; margin:18px 0 6px; }
.legal-sec p{ font-size:14.5px; color:#cbd5e1; margin:6px 0; }
.legal-sec ul{ margin:6px 0 6px; padding-left:20px; }
.legal-sec li{ font-size:14.5px; color:#cbd5e1; margin:4px 0; }
.legal-sec a{ color:#38bdf8; }
.legal-sec b, .legal-sec u{ color:#f1f5f9; }
.legal-table{ width:100%; border-collapse:collapse; margin:6px 0 10px; }
.legal-table th, .legal-table td{ text-align:left; padding:9px 12px; border:1px solid #1e293b; font-size:14px; vertical-align:top; }
.legal-table th{ background:#0f172a; color:#94a3b8; font-weight:600; width:38%; white-space:nowrap; }
.legal-table td{ color:#e2e8f0; }
.legal-table a{ color:#38bdf8; }
.legal-note{ background:#0f172a; border:1px solid #1e293b; border-radius:10px; padding:12px 14px; font-size:13.5px; color:#94a3b8; }
.legal-foot{ margin-top:40px; padding-top:18px; border-top:1px solid #1e293b; font-size:12.5px; color:#64748b; text-align:center; }
@media (max-width:560px){ .legal-table th{ width:auto; white-space:normal; } }
`;
