import { useEffect, useState } from 'react';
import { SKILL_CATALOG, CATEGORY_META, TIER_META, type SkillCategory, type SkillTier } from '../../data/skillCatalog';
import { listAdminSkills, createAdminSkill, setAdminSkillActive, deleteAdminSkill, type AdminSkill } from '../../lib/adminSkills';
import { adminGetSkillStats, type SkillPurchaseEvent, type SkillAdoption } from '../../lib/skillStats';
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
  const [events, setEvents] = useState<SkillPurchaseEvent[]>([]);
  const [adoption, setAdoption] = useState<SkillAdoption[]>([]);
  const [statsMsg, setStatsMsg] = useState<string | null>(null);

  useEffect(() => {
    listAdminSkills(true)
      .then(setSkills)
      .catch(e => setMsg('⚠️ โหลดรายการไม่สำเร็จ: ' + (e as { message?: string }).message))
      .finally(() => setLoading(false));
    adminGetSkillStats()
      .then(s => { setEvents(s.events); setAdoption(s.adoption); })
      .catch(e => setStatsMsg('⚠️ โหลดสถิติไม่สำเร็จ: ' + (e as { message?: string }).message));
  }, []);

  // ชื่อ Skill จาก id (catalog ในตัว + skill ที่ Admin เพิ่ม)
  const skillName = (id: string) =>
    SKILL_CATALOG.find(s => s.id === id)?.name ?? skills.find(s => s.id === id)?.name ?? id;

  // สรุปสถิติเพื่อการตลาด
  const totalRevenue = events.reduce((s, e) => s + e.price, 0);
  const bySkill = Object.values(events.reduce((acc, e) => {
    if (!acc[e.skillId]) acc[e.skillId] = { skillId: e.skillId, name: e.skillName, purchases: 0, revenue: 0 };
    acc[e.skillId].purchases += 1;
    acc[e.skillId].revenue += e.price;
    return acc;
  }, {} as Record<string, { skillId: string; name: string; purchases: number; revenue: number }>))
    .sort((a, b) => b.purchases - a.purchases);
  const byPay = Object.entries(events.reduce((acc, e) => {
    const k = e.payMethod || 'ไม่ระบุ';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]);
  const PAY_LABEL: Record<string, string> = { promptpay: '📱 PromptPay', card: '💳 บัตรเครดิต/เดบิต', transfer: '🏦 โอนธนาคาร' };

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
      {/* ===== สถิติการเลือกใช้ Skill (Marketing Analytics) ===== */}
      <div className="pfa-section">
        <div className="pfa-section-title">📊 สถิติการเลือกใช้ Skill ของผู้ใช้</div>
        <p className="adm-skill-hint">
          ข้อมูลจาก event การซื้อ Skill ของทุกบริษัท — ใช้วางแผนการตลาด เช่น Skill ไหนขายดี,
          หมวดไหนควรเพิ่ม Skill ใหม่, ลูกค้านิยมจ่ายผ่านช่องทางไหน
        </p>
        {statsMsg && <div className="adm-skill-msg">{statsMsg}</div>}
        <div className="adm-stat-cards">
          <div className="adm-stat-card">
            <div className="adm-stat-num">{events.length.toLocaleString()}</div>
            <div className="adm-stat-lbl">ยอดซื้อทั้งหมด (ครั้ง)</div>
          </div>
          <div className="adm-stat-card">
            <div className="adm-stat-num">฿{totalRevenue.toLocaleString()}</div>
            <div className="adm-stat-lbl">มูลค่ารวม</div>
          </div>
          <div className="adm-stat-card">
            <div className="adm-stat-num">{bySkill[0] ? bySkill[0].name : '—'}</div>
            <div className="adm-stat-lbl">Skill ขายดีที่สุด</div>
          </div>
          <div className="adm-stat-card">
            <div className="adm-stat-num">{byPay[0] ? (PAY_LABEL[byPay[0][0]] ?? byPay[0][0]) : '—'}</div>
            <div className="adm-stat-lbl">ช่องทางชำระยอดนิยม</div>
          </div>
        </div>

        <div className="adm-stat-2col">
          <div>
            <div className="adm-stat-subhd">🏆 Skill ยอดนิยม (จาก event การซื้อ)</div>
            {bySkill.length === 0 && <div className="adm-skill-hint">ยังไม่มี event การซื้อ</div>}
            <table className="adm-stat-table">
              <tbody>
                {bySkill.slice(0, 10).map((s, i) => (
                  <tr key={s.skillId}>
                    <td className="adm-stat-rank">#{i + 1}</td>
                    <td>{s.name}</td>
                    <td className="adm-stat-n">{s.purchases} ครั้ง</td>
                    <td className="adm-stat-n">฿{s.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {byPay.length > 0 && (
              <>
                <div className="adm-stat-subhd" style={{ marginTop: 14 }}>💳 ช่องทางชำระเงิน</div>
                <table className="adm-stat-table">
                  <tbody>
                    {byPay.map(([method, n]) => (
                      <tr key={method}>
                        <td>{PAY_LABEL[method] ?? method}</td>
                        <td className="adm-stat-n">{n} ครั้ง ({Math.round((n / Math.max(events.length, 1)) * 100)}%)</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
          <div>
            <div className="adm-stat-subhd">🏢 Skill ที่บริษัทใช้งานอยู่ (ทุกบริษัท)</div>
            {adoption.length === 0 && <div className="adm-skill-hint">ยังไม่มีข้อมูล (local mode ไม่รวบรวมข้ามบริษัท)</div>}
            <table className="adm-stat-table">
              <tbody>
                {adoption.slice(0, 10).map((a, i) => (
                  <tr key={a.skillId}>
                    <td className="adm-stat-rank">#{i + 1}</td>
                    <td>{skillName(a.skillId)}</td>
                    <td className="adm-stat-n">{a.companies} บริษัท</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {events.length > 0 && (
              <>
                <div className="adm-stat-subhd" style={{ marginTop: 14 }}>🕐 การซื้อล่าสุด</div>
                <div className="adm-stat-recent">
                  {events.slice(0, 6).map((e, i) => (
                    <div key={i} className="adm-stat-recent-row">
                      <span className="adm-stat-recent-time">{e.createdAt.slice(0, 16).replace('T', ' ')}</span>
                      <span className="adm-stat-recent-name">{e.skillName}</span>
                      <span className="adm-stat-n">฿{e.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

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
