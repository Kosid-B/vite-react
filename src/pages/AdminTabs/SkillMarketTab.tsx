import { useEffect, useState } from 'react';
import { CATEGORY_META, TIER_META, type SkillCategory, type SkillTier } from '../../data/skillCatalog';
import { listAdminSkills, createAdminSkill, setAdminSkillActive, deleteAdminSkill, type AdminSkill } from '../../lib/adminSkills';
import { XP_PER_TIER } from '../../lib/gamification';

const DEFAULT_PRICE: Record<SkillTier, number> = { 1: 500, 2: 1200, 3: 2000 };

const EMPTY_DRAFT = {
  name: '', desc: '', category: 'strategy' as SkillCategory,
  tier: 1 as SkillTier, price: DEFAULT_PRICE[1], icon: '✨', tags: '',
};

export default function SkillMarketTab() {
  const [skills, setSkills] = useState<AdminSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    listAdminSkills(true)
      .then(setSkills)
      .catch(e => setMsg('⚠️ โหลดรายการไม่สำเร็จ: ' + (e as { message?: string }).message))
      .finally(() => setLoading(false));
  }, []);

  async function submit() {
    if (!draft.name.trim() || !draft.desc.trim()) {
      setMsg('⚠️ กรอกชื่อและคำอธิบาย Skill ก่อน');
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const created = await createAdminSkill({
        name: draft.name.trim(),
        desc: draft.desc.trim(),
        category: draft.category,
        tier: draft.tier,
        price: draft.price,
        icon: draft.icon.trim() || '✨',
        tags: draft.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      setSkills(prev => [created, ...prev]);
      setDraft({ ...EMPTY_DRAFT });
      setMsg(`✅ เพิ่ม "${created.name}" เข้า Marketplace แล้ว — ทุกบริษัทเห็น Skill นี้ทันที`);
    } catch (e) {
      setMsg('⚠️ บันทึกไม่สำเร็จ: ' + (e as { message?: string }).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: AdminSkill) {
    try {
      await setAdminSkillActive(s.id, !s.active);
      setSkills(prev => prev.map(x => x.id === s.id ? { ...x, active: !s.active } : x));
    } catch (e) {
      setMsg('⚠️ อัปเดตไม่สำเร็จ: ' + (e as { message?: string }).message);
    }
  }

  async function remove(s: AdminSkill) {
    if (!window.confirm(`ลบ Skill "${s.name}" ออกจาก Marketplace ถาวร?`)) return;
    try {
      await deleteAdminSkill(s.id);
      setSkills(prev => prev.filter(x => x.id !== s.id));
    } catch (e) {
      setMsg('⚠️ ลบไม่สำเร็จ: ' + (e as { message?: string }).message);
    }
  }

  return (
    <div className="pfa-tab-body">
      <div className="pfa-section">
        <div className="pfa-section-title">🛒 เพิ่ม Skill ใหม่เข้า Marketplace</div>
        <p className="adm-skill-hint">
          Skill ที่เพิ่มที่นี่จะแสดงใน Skill Marketplace ของ<b>ทุกบริษัท</b>ทันที —
          ผู้ใช้ซื้อเพื่อปลดล็อกความสามารถให้ทีมเอเจนต์ พร้อมรับ XP สะสมระดับบริษัท (engagement loop)
        </p>
        <div className="adm-skill-form">
          <div className="adm-skill-field" style={{ gridColumn: 'span 2' }}>
            <label>ชื่อ Skill</label>
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
              placeholder="เช่น Line OA Commerce Playbook" />
          </div>
          <div className="adm-skill-field">
            <label>ไอคอน (emoji)</label>
            <input value={draft.icon} onChange={e => setDraft({ ...draft, icon: e.target.value })} placeholder="✨" />
          </div>
          <div className="adm-skill-field">
            <label>หมวด</label>
            <select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value as SkillCategory })}>
              {(Object.entries(CATEGORY_META) as [SkillCategory, typeof CATEGORY_META[SkillCategory]][]).map(([id, m]) => (
                <option key={id} value={id}>{m.icon} {m.label}</option>
              ))}
            </select>
          </div>
          <div className="adm-skill-field">
            <label>Tier</label>
            <select value={draft.tier}
              onChange={e => {
                const tier = Number(e.target.value) as SkillTier;
                setDraft(d => ({ ...d, tier, price: d.price === DEFAULT_PRICE[d.tier] ? DEFAULT_PRICE[tier] : d.price }));
              }}>
              {([1, 2, 3] as const).map(t => (
                <option key={t} value={t}>Tier {t} · {TIER_META[t].label} (+{XP_PER_TIER[t]} XP)</option>
              ))}
            </select>
          </div>
          <div className="adm-skill-field">
            <label>ราคา (฿)</label>
            <input type="number" min={0} value={draft.price}
              onChange={e => setDraft({ ...draft, price: Math.max(0, +e.target.value) })} />
          </div>
          <div className="adm-skill-field" style={{ gridColumn: '1 / -1' }}>
            <label>คำอธิบาย (1–2 ประโยค)</label>
            <input value={draft.desc} onChange={e => setDraft({ ...draft, desc: e.target.value })}
              placeholder="Skill นี้ช่วยให้ทีม AI ทำอะไรได้" />
          </div>
          <div className="adm-skill-field" style={{ gridColumn: '1 / -1' }}>
            <label>ตำแหน่งที่เหมาะ (คั่นด้วยจุลภาค)</label>
            <input value={draft.tags} onChange={e => setDraft({ ...draft, tags: e.target.value })}
              placeholder="เช่น CMO, Sales Manager" />
          </div>
        </div>
        <button className="adm-skill-submit" onClick={submit} disabled={saving}>
          {saving ? '⏳ กำลังบันทึก…' : '＋ เพิ่มเข้า Marketplace'}
        </button>
        {msg && <div className="adm-skill-msg">{msg}</div>}
      </div>

      <div className="pfa-section">
        <div className="pfa-section-title">📦 Skill ที่ Admin เพิ่มไว้ ({skills.length})</div>
        {loading && <div className="adm-skill-hint">กำลังโหลด…</div>}
        {!loading && skills.length === 0 && (
          <div className="adm-skill-hint">ยังไม่มี Skill ที่เพิ่มจาก Admin — เพิ่มตัวแรกจากฟอร์มด้านบน</div>
        )}
        <div className="adm-skill-list">
          {skills.map(s => {
            const cat = CATEGORY_META[s.category];
            return (
              <div key={s.id} className={`adm-skill-row${s.active ? '' : ' inactive'}`}>
                <span className="adm-skill-ico">{s.icon}</span>
                <div className="adm-skill-info">
                  <div className="adm-skill-name">
                    {s.name}
                    <span className="adm-skill-cat" style={{ color: cat.color }}>{cat.icon} {cat.label}</span>
                    <span className="adm-skill-tier" style={{ background: TIER_META[s.tier].bg, color: TIER_META[s.tier].color }}>
                      {TIER_META[s.tier].label}
                    </span>
                  </div>
                  <div className="adm-skill-desc">{s.desc}</div>
                </div>
                <div className="adm-skill-price">฿{s.price.toLocaleString()}</div>
                <button className="adm-skill-toggle" onClick={() => toggleActive(s)}
                  title={s.active ? 'ซ่อนจาก Marketplace' : 'แสดงใน Marketplace'}>
                  {s.active ? '👁 แสดงอยู่' : '🚫 ซ่อนอยู่'}
                </button>
                <button className="adm-skill-del" onClick={() => remove(s)} title="ลบถาวร">×</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
