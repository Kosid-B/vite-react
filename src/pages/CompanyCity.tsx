import { useMemo } from 'react';
import type { AppData, PageId } from '../types';
import { cityStats, type CityBuilding } from '../lib/companyCity';

/* ===== เมืองบริษัท (Company City) — เกมส์ SIM การเติบโต =====
 * เมืองโตตามความคืบหน้าจริง: อาคารสูงขึ้นเมื่อทำงานจริง, ปลดล็อกย่านใหม่ตามเหตุการณ์สำคัญ */

export default function CompanyCity({ data, onNavigate }: { data: AppData; onNavigate: (p: PageId) => void }) {
  const s = useMemo(() => cityStats(data), [data]);

  // เรียงให้อาคารที่สร้างแล้ว (สูง) อยู่กลาง ที่ดินว่างอยู่ท้าย เพื่อภาพเมืองสวย
  const skyline = [...s.buildings].sort((a, b) => b.level - a.level);

  return (
    <div className="city-wrap">
      <div className="city-head">
        <div>
          <h1 className="city-title">🏙️ เมือง{data.aiCompany.name?.trim() || 'บริษัทของคุณ'}</h1>
          <p className="city-sub">
            {data.aiCompany.industry?.trim() ? `ธุรกิจ: ${data.aiCompany.industry} — ` : ''}
            เมืองจะโตเองเมื่อคุณทำงานจริงในแต่ละด้าน แต่ละอาคารคือ 1 ด้านของบริษัท
          </p>
        </div>
        <div className="city-tier" style={{ borderColor: `${s.level.color}66`, background: `${s.level.color}1a` }}>
          <span className="city-tier-badge">{s.level.badge}</span>
          <div>
            <div className="city-tier-name" style={{ color: s.level.color }}>{s.tier.label}</div>
            <div className="city-tier-rank">ระดับ {s.level.rank}</div>
          </div>
        </div>
      </div>

      {/* แถบสถิติเมือง */}
      <div className="city-stats">
        <div className="city-stat"><b>{s.agents}</b><span>👥 ประชากร (เอเจนต์)</span></div>
        <div className="city-stat"><b>{s.built}/{s.total}</b><span>🏢 อาคารที่สร้าง</span></div>
        <div className="city-stat"><b>{s.floors}</b><span>🧱 ชั้นรวมทั้งเมือง</span></div>
        <div className="city-stat"><b>{s.xp.toLocaleString()}</b><span>✨ ความมั่งคั่ง (XP)</span></div>
      </div>

      {/* ความคืบหน้าสู่ระดับเมืองถัดไป */}
      <div className="city-progress">
        <div className="city-progress-top">
          <span>ความเจริญสู่ระดับถัดไป</span>
          <span>{s.level.max === Infinity ? 'สูงสุดแล้ว 👑' : `${s.pctToNext}%`}</span>
        </div>
        <div className="city-progress-bar"><div className="city-progress-fill" style={{ width: `${s.pctToNext}%`, background: s.level.color }} /></div>
      </div>

      {/* ===== ฉากเมือง (skyline) ===== */}
      <div className={`city-scene sky-${s.tier.sky}`}>
        <div className="city-skyline">
          {skyline.map(b => <Building key={b.id} b={b} onNavigate={onNavigate} />)}
        </div>
        <div className="city-ground" />
      </div>

      {/* ===== รายการอาคาร + สิ่งที่ต้องทำเพื่อพัฒนา ===== */}
      <div className="city-list">
        {s.buildings.map(b => (
          <button key={b.id} className={`city-card${b.level > 0 ? ' built' : ''}${b.locked && b.level === 0 ? ' locked' : ''}`}
            onClick={() => onNavigate(b.page)} title={b.role}>
            <span className="city-card-ico">{b.locked && b.level === 0 ? '🔒' : b.icon}</span>
            <div className="city-card-body">
              <div className="city-card-name">{b.name}
                <span className="city-card-lv">{b.level > 0 ? `Lv.${b.level}${b.max > 1 ? `/${b.max}` : ''}` : 'ที่ดินว่าง'}</span>
              </div>
              <div className="city-card-role">{b.role}</div>
              {b.max > 1 && (
                <div className="city-pips">
                  {Array.from({ length: b.max }).map((_, i) => (
                    <span key={i} className={`city-pip${i < b.level ? ' on' : ''}`} />
                  ))}
                </div>
              )}
              <div className="city-card-hint">{b.hint || '✅ สูงสุดแล้ว'}</div>
            </div>
            {b.hint && <span className="city-card-go">ไปพัฒนา →</span>}
          </button>
        ))}
      </div>

      <p className="city-foot">
        💡 ทุกอาคารเชื่อมกับงานจริงในบริษัท — ยิ่งลงมือทำ เมืองยิ่งโต เลื่อนระดับจากหมู่บ้านสตาร์ทอัปสู่มหานคร AI
      </p>
    </div>
  );
}

function Building({ b, onNavigate }: { b: CityBuilding; onNavigate: (p: PageId) => void }) {
  if (b.level === 0) {
    return (
      <button className={`bldg empty${b.locked ? ' locked' : ''}`} onClick={() => onNavigate(b.page)} title={`${b.name} — ${b.hint}`}>
        <span className="bldg-lot">{b.locked ? '🔒' : '＋'}</span>
        <span className="bldg-label">{b.name}</span>
      </button>
    );
  }
  // จำนวนชั้น = level (อาคารสูงตามระดับ) — อาคาร binary (max 1) ให้ดูมี "ตัวตน" 3 ชั้น
  const floors = b.max === 1 ? 3 : b.level + 1;
  return (
    <button className="bldg" onClick={() => onNavigate(b.page)} title={`${b.name} — Lv.${b.level}`}>
      <span className="bldg-roof">{b.icon}</span>
      <span className="bldg-tower">
        {Array.from({ length: floors }).map((_, i) => (
          <span key={i} className="bldg-floor"><i /><i /><i /></span>
        ))}
      </span>
      <span className="bldg-label">{b.name}</span>
    </button>
  );
}
