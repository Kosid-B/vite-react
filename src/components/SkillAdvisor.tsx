import type { SkillRec } from '../lib/skillAdvisor';
import type { SkillEntry } from '../data/skillCatalog';

/* ===== CEO เลือก Skill พัฒนาธุรกิจให้ User เอง (agentic) ===== */

export default function SkillAdvisor({ recs, onPick }: { recs: SkillRec[]; onPick: (skill: SkillEntry) => void }) {
  if (!recs.length) return null;
  return (
    <section className="ai-panel sadv">
      <div className="sadv-hd">
        🧠 CEO เลือก Skill พัฒนาธุรกิจให้คุณ
        <span className="sadv-sub">วิเคราะห์ธุรกิจของคุณอัตโนมัติจากกลยุทธ์ + ข้อมูลจริง แล้วเลือก Skill ที่ควรพัฒนาก่อน</span>
      </div>
      <div className="sadv-list">
        {recs.map(r => (
          <div key={r.skill.id} className={`sadv-item ${r.priority}`}>
            <span className="sadv-ico">{r.skill.icon}</span>
            <div className="sadv-body">
              <div className="sadv-name">
                {r.skill.name}
                {r.priority === 'high' && <span className="sadv-pri">แนะนำก่อน</span>}
                {r.skill.official && <span className="sadv-official">Official</span>}
              </div>
              <div className="sadv-reason">
                <b>CEO:</b> “{r.reason}” <span className="sadv-tied">· เสริมด้าน {r.tiedTo}</span>
              </div>
            </div>
            <div className="sadv-right">
              <div className="sadv-price">฿{r.skill.price.toLocaleString()}</div>
              <button className="sadv-pick" onClick={() => onPick(r.skill)}>รับ Skill นี้ →</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
