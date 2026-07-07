import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { AppData, PageId } from '../types';

// สีตึกแต่ละด้าน (isometric) — ให้เข้าชุดกับ hero Level Up
const ISO_COLORS = ['#5b8bff', '#35e0a1', '#a06bff', '#ff8b5c', '#ffcf5c', '#4ade80'];
import { cityStats, partnerDevelopmentMap } from '../lib/companyCity';
import { useState } from 'react';
import { fmtBaht } from '../lib/finance';
import { streakCount } from '../lib/streak';
import { track } from '../lib/analytics';
import CityTreasury from '../components/CityTreasury';
import CityRewards from '../components/CityRewards';
import CityscapeHero from '../components/CityscapeHero';

/* ===== เมืองบริษัท (Company City) — เกมส์ SIM การเติบโต =====
 * เมืองโตตามความคืบหน้าจริง: อาคารสูงขึ้นเมื่อทำงานจริง, ปลดล็อกย่านใหม่ตามเหตุการณ์สำคัญ
 * เศรษฐกิจเมืองขับด้วยรายรับ/รายจ่ายจริง (คลังเมือง) */

export default function CompanyCity({ data, onNavigate, onUpdate }: { data: AppData; onNavigate: (p: PageId) => void; onUpdate: (d: AppData) => void }) {
  const s = useMemo(() => cityStats(data), [data]);
  const devMap = useMemo(() => partnerDevelopmentMap(data), [data]);
  const [partnerView, setPartnerView] = useState(false);
  const streak = streakCount(data);
  useEffect(() => { track('city_viewed', { built: s.built, net: s.fin.net }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const lockedDistricts = s.buildings.filter(b => b.locked && b.level === 0).length;

  return (
    <div className="city-wrap">
      <div className="city-head">
        <div>
          <h1 className="city-title">🏙️ เมือง{data.aiCompany.name?.trim() || 'บริษัทของคุณ'}</h1>
          <p className="city-sub">
            {data.aiCompany.industry?.trim() ? `ธุรกิจ: ${data.aiCompany.industry} — ` : ''}
            เมืองจะโตเองเมื่อคุณทำงานจริงในแต่ละด้าน แต่ละอาคารคือ 1 ด้านของบริษัท
          </p>
          {streak > 0 && (
            <div className="city-streak">🔥 ทำงานต่อเนื่อง <b>{streak}</b> วัน {streak >= 3 ? '— สุดยอด! รักษาไว้นะ' : ''}</div>
          )}
        </div>
        <div className="city-tier" style={{ borderColor: `${s.level.color}66`, background: `${s.level.color}1a` }}>
          <span className="city-tier-badge">{s.level.badge}</span>
          <div>
            <div className="city-tier-name" style={{ color: s.level.color }}>{s.tier.label}</div>
            <div className="city-tier-rank">ระดับ {s.level.rank}</div>
          </div>
        </div>
      </div>

      {/* ===== Hero: ภาพเมือง 3D ไอโซเมตริก (แสง/เงาตามเวลา · อากาศตามฤดู) ผูก XP จริง ===== */}
      <CityscapeHero data={data} />

      {/* แถบสถิติเมือง */}
      <div className="city-stats">
        <div className="city-stat"><b>{s.agents}</b><span>👥 ประชากร (เอเจนต์)</span></div>
        <div className="city-stat"><b>{s.built}/{s.total}</b><span>🏢 อาคารที่สร้าง</span></div>
        <div className="city-stat"><b className={s.fin.net >= 0 ? 'city-profit' : 'city-loss'}>{s.fin.net >= 0 ? '' : '−'}{fmtBaht(Math.abs(s.fin.net))}</b><span>💵 กำไรสุทธิ</span></div>
        <div className="city-stat"><b>{s.xp.toLocaleString()}</b><span>✨ ความมั่งคั่ง (XP)</span></div>
      </div>

      {/* คลังเมือง — รายรับ/รายจ่าย ขับเศรษฐกิจเมือง */}
      <CityTreasury data={data} onUpdate={onUpdate} />

      {/* รางวัลเมือง — รับรางวัลจริงจากการเล่นเกม */}
      <CityRewards data={data} onUpdate={onUpdate} />

      {/* จังหวะขาย: ปลดล็อกย่านที่ต้องอัปเกรดแพ็กเกจ */}
      {lockedDistricts > 0 && (
        <button className="city-nudge" onClick={() => onNavigate('billing')}>
          🔓 อัปเกรดแพ็ก Growth เพื่อปลดล็อกอีก {lockedDistricts} ย่านในเมือง (ศูนย์ข้อมูล · ห้องแล็บ · ISO) + เก็บรางวัลเพิ่ม →
        </button>
      )}

      {/* ===== แผนผังการพัฒนาสำหรับคู่ค้า — ความสูงตึก = ระดับพัฒนาแต่ละด้าน (ไม่เปิดเผยตัวเลขลับ) ===== */}
      <div className="devmap">
        <div className="devmap-hd">
          <div>
            <h2 className="devmap-title">🤝 แผนผังการพัฒนาสำหรับคู่ค้า</h2>
            <p className="devmap-sub">ความสูง/รูปทรงของแต่ละตึก = ระดับการพัฒนาของธุรกิจในด้านนั้น ให้คู่ค้าเห็นภาพความก้าวหน้า
              โดย <b>ไม่เปิดเผยตัวเลขลับ</b> (รายได้/กำไร/จำนวนดีล เก็บเป็นความลับของบริษัท)</p>
          </div>
          <button className="devmap-toggle" onClick={() => setPartnerView(v => !v)}>
            {partnerView ? '👁️ มุมมองภายใน' : '🤝 มุมมองคู่ค้า'}
          </button>
        </div>
        <div className="devmap-overall">
          ภาพรวมการพัฒนา: <b>{devMap.tierLabel}</b> · ระดับพัฒนาโดยรวม <b>{devMap.overall}%</b>
          {partnerView && <span className="devmap-safe"> · 🔒 ซ่อนตัวเลขลับสำหรับคู่ค้า</span>}
        </div>
        <div className="iso-map">
          {devMap.dimensions.map((dim, i) => {
            const h = 16 + Math.round((Math.max(5, dim.pct) / 100) * 82); // ความสูงตึก (px) = ระดับพัฒนา
            const color = ISO_COLORS[i % ISO_COLORS.length];
            return (
              <div key={dim.id} className="iso-col" title={`${dim.name} — ${dim.tier}`}>
                <div className="iso-stage">
                  <div className="iso-bldg" style={{ '--h': `${h}px`, '--c': color } as CSSProperties}>
                    <span className="iso-w iso-w2" />
                    <span className="iso-w iso-w1" />
                    <span className="iso-top" />
                  </div>
                </div>
                <div className="iso-ic">{dim.icon}</div>
                <div className="iso-pct">{dim.pct}%</div>
                <div className="iso-name">{dim.name}</div>
                <div className="iso-tier">{dim.tier}</div>
                <div className="iso-blurb">{dim.blurb}</div>
              </div>
            );
          })}
        </div>
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
