import { COMPANY } from '../config';
import type { PageId } from '../types';

/* ===== Expert Edge — ฝัง "คูเมือง" ที่ลอกไม่ได้: ที่ปรึกษา+ISO 20 ปี ให้ลูกค้าเห็น/รู้สึกได้ =====
 * ยกระดับ VRIO: เปลี่ยนความเชี่ยวชาญที่ซ่อนอยู่ (I✅ แต่ O⚠️) → ได้เปรียบยั่งยืนที่จับต้องได้ */

const CAPS = ['ISO 9001:2015', 'ISO 14001', 'TIS / มอก.', 'การจัดการวิศวกรรม', 'ระบบคุณภาพ (QMS)', 'PDPA'];

export default function ExpertEdge({ compact, onNavigate }: { compact?: boolean; onNavigate?: (p: PageId) => void }) {
  const tel = COMPANY.tel.replace(/[^0-9+]/g, '');
  return (
    <div className={`xedge${compact ? ' compact' : ''}`}>
      <div className="xedge-main">
        <span className="xedge-ico">🎓</span>
        <div className="xedge-text">
          <div className="xedge-title">
            เบื้องหลังระบบนี้ — ที่ปรึกษาธุรกิจ &amp; ISO จริงกว่า <b>20 ปี</b> ในประเทศไทย
          </div>
          <div className="xedge-sub">
            โดย B. Training Consultant (M.E.A) — ทุกแนวทางในระบบมาจากการ<b>ตรวจประเมิน &amp; ให้คำปรึกษาจริง</b> ไม่ใช่เทมเพลตทั่วไป
          </div>
          {!compact && (
            <div className="xedge-caps">
              {CAPS.map(c => <span key={c} className="xedge-cap">{c}</span>)}
            </div>
          )}
        </div>
      </div>
      {!compact && (
        <div className="xedge-cta">
          <a className="xedge-tel" href={`tel:${tel}`}>📞 ปรึกษาผู้เชี่ยวชาญจริง {COMPANY.tel}</a>
          {onNavigate && <button className="xedge-iso" onClick={() => onNavigate('iso9001')}>ดูระบบ ISO 9001 →</button>}
        </div>
      )}
    </div>
  );
}
