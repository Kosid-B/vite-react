import { COMPANY } from '../config';
import { track } from '../lib/analytics';

/** Handoff → B.Training: งานมาตรฐานที่ลึก/ซับซ้อน (มอก./ISO) ส่งต่อ "ที่ปรึกษาตัวจริง" ของบริษัทแม่
 *  ตรง brand architecture: CEO AI = เครื่องมือ self-serve · B.Training = บริการที่ปรึกษา (คน) */
export default function ConsultHandoff({ topic = 'มอก. / ISO', from = '' }: { topic?: string; from?: string }) {
  const tel = COMPANY.tel.replace(/[^\d]/g, '');
  const lineUrl = 'https://line.me/ti/p/0817817773';
  const hit = (channel: string) => track('consult_handoff_click', { from, channel, topic });

  return (
    <div className="consult-handoff">
      <div className="ch-ico" aria-hidden="true">🎓</div>
      <div className="ch-body">
        <div className="ch-title">ต้องการที่ปรึกษา {topic} ตัวจริง?</div>
        <div className="ch-desc">
          งานที่ซับซ้อน (ขอ {topic} · เตรียม audit · วางระบบทั้งองค์กร) — เกินกว่าที่เครื่องมือ AI ช่วยได้
          ให้ผู้เชี่ยวชาญ <b>B. Training Consultant</b> (ที่ปรึกษา ISO / มอก. / PDPA กว่า 20 ปี) ดูแลคุณโดยตรง
        </div>
        <div className="ch-actions">
          <a className="ch-btn ch-call" href={`tel:${tel}`} onClick={() => hit('phone')}>📞 โทร {COMPANY.tel}</a>
          <a className="ch-btn ch-line" href={lineUrl} target="_blank" rel="noreferrer" onClick={() => hit('line')}>💬 ปรึกษาทาง LINE</a>
          <a className="ch-btn" href={COMPANY.website} target="_blank" rel="noreferrer" onClick={() => hit('web')}>ดูบริการที่ปรึกษา</a>
        </div>
      </div>
    </div>
  );
}
