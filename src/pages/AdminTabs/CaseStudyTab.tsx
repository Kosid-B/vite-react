import { useState } from 'react';
import type { AppData, CaseStudy, CaseStudyLesson } from '../../types';
import { isSupabaseEnabled, supabase } from '../../lib/supabase';
import { suggestSkillFromCase, TIER_PRICE, type SkillProposal } from '../../lib/skillValuation';
import { createAdminSkill } from '../../lib/adminSkills';
import { CATEGORY_META, TIER_META, type SkillCategory, type SkillTier } from '../../data/skillCatalog';
import { track } from '../../lib/analytics';

interface Props {
  data: AppData;
  onUpdate: (d: AppData) => void;
}

const PALETTE = ['#06b6d4', '#f59e0b', '#2d6a4f', '#c44b2b', '#7c3aed', '#1a4f8a'];

let seq = 0;
function newId() {
  return 'cs-' + Date.now().toString(36) + '-' + seq++;
}
function colorFor(i: number) {
  return PALETTE[i % PALETTE.length];
}

/** ตรวจ+ทำความสะอาด object ให้เป็น CaseStudy ที่ถูกต้อง (ใช้ตอนนำเข้า JSON) */
function coerce(raw: unknown, idx: number): CaseStudy | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const title = String(o.title ?? o.company ?? '').trim();
  if (!title) return null;
  const rawLessons = Array.isArray(o.lessons) ? o.lessons : [];
  const lessons: CaseStudyLesson[] = rawLessons
    .map((l) => {
      if (typeof l === 'string') return { icon: '💡', body: l };
      const lo = (l ?? {}) as Record<string, unknown>;
      return {
        icon: lo.icon ? String(lo.icon) : '💡',
        title: lo.title ? String(lo.title) : undefined,
        body: String(lo.body ?? '').trim(),
      };
    })
    .filter((l) => l.body);
  return {
    id: String(o.id ?? newId()),
    title,
    company: o.company ? String(o.company) : undefined,
    tag: o.tag ? String(o.tag) : undefined,
    industry: o.industry ? String(o.industry) : undefined,
    origin: o.origin ? String(o.origin) : undefined,
    result: o.result ? String(o.result) : undefined,
    keyLesson: o.keyLesson ? String(o.keyLesson) : undefined,
    applyTo: Array.isArray(o.applyTo) ? o.applyTo.map(String).filter(Boolean) : undefined,
    lessons: lessons.length ? lessons : [{ icon: '💡', body: title }],
    color: o.color ? String(o.color) : colorFor(idx),
    source: 'json',
    createdAt: new Date().toISOString(),
  };
}

export default function CaseStudyTab({ data, onUpdate }: Props) {
  const list = data.caseStudies ?? [];
  const [mode, setMode] = useState<'form' | 'json' | 'ai'>('form');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── ฟอร์มกรอกทีละอัน ──
  const [fTitle, setFTitle] = useState('');
  const [fCompany, setFCompany] = useState('');
  const [fTag, setFTag] = useState('');
  const [fIndustry, setFIndustry] = useState('');
  const [fResult, setFResult] = useState('');
  const [fKey, setFKey] = useState('');
  const [fApply, setFApply] = useState('');
  const [fLessons, setFLessons] = useState<CaseStudyLesson[]>([{ icon: '💡', title: '', body: '' }]);

  // ── นำเข้า JSON ──
  const [jsonText, setJsonText] = useState('');

  // ── สรุปจาก NotebookLM → ให้ AI จัดรูปแบบ ──
  const [aiTitle, setAiTitle] = useState('');
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  // ── แปลง Case → Skill ขาย (Content Studio) ──
  const [skillFor, setSkillFor] = useState<string | null>(null);
  const [proposal, setProposal] = useState<SkillProposal | null>(null);
  const [skillBusy, setSkillBusy] = useState(false);

  function openSkill(c: CaseStudy) {
    setMsg(null);
    setSkillFor(c.id);
    setProposal(suggestSkillFromCase(c));
  }
  function closeSkill() {
    setSkillFor(null);
    setProposal(null);
  }
  function patchProposal(patch: Partial<SkillProposal>) {
    setProposal((p) => (p ? { ...p, ...patch } : p));
  }
  async function createSkill() {
    if (!proposal) return;
    if (!proposal.name.trim() || !proposal.desc.trim()) {
      setMsg({ type: 'err', text: 'กรอกชื่อ + คำอธิบาย Skill ก่อน' });
      return;
    }
    setSkillBusy(true);
    try {
      await createAdminSkill({
        name: proposal.name.trim(),
        desc: proposal.desc.trim(),
        category: proposal.category,
        tier: proposal.tier,
        price: proposal.price,
        icon: proposal.icon,
        tags: proposal.tags,
      });
      track('content_studio_skill_created', { tier: proposal.tier, price: proposal.price, category: proposal.category });
      closeSkill();
      setMsg({ type: 'ok', text: `✅ สร้าง Skill "${proposal.name.trim()}" (${proposal.price.toLocaleString('en-US')} ฿) ลง Marketplace แล้ว — จัดการต่อได้ที่แท็บ Skill Market` });
    } catch (err) {
      setMsg({ type: 'err', text: 'สร้าง Skill ไม่สำเร็จ: ' + ((err as Error).message || 'error') });
    } finally {
      setSkillBusy(false);
    }
  }

  function save(cases: CaseStudy[]) {
    onUpdate({ ...data, caseStudies: cases });
  }
  function addCase(c: CaseStudy) {
    save([...list, c]);
  }
  function removeCase(id: string) {
    if (!window.confirm('ลบ Case Study นี้?')) return;
    save(list.filter((c) => c.id !== id));
    setMsg({ type: 'ok', text: 'ลบแล้ว' });
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!fTitle.trim()) {
      setMsg({ type: 'err', text: 'กรุณากรอกหัวข้อ (Title) ก่อน' });
      return;
    }
    const lessons = fLessons.filter((l) => l.body.trim());
    addCase({
      id: newId(),
      title: fTitle.trim(),
      company: fCompany.trim() || undefined,
      tag: fTag.trim() || undefined,
      industry: fIndustry.trim() || undefined,
      result: fResult.trim() || undefined,
      keyLesson: fKey.trim() || undefined,
      applyTo: fApply.split('\n').map((s) => s.trim()).filter(Boolean),
      lessons: lessons.length ? lessons : [{ icon: '💡', body: fKey.trim() || fTitle.trim() }],
      color: colorFor(list.length),
      source: 'form',
      createdAt: new Date().toISOString(),
    });
    setFTitle(''); setFCompany(''); setFTag(''); setFIndustry(''); setFResult(''); setFKey(''); setFApply('');
    setFLessons([{ icon: '💡', title: '', body: '' }]);
    setMsg({ type: 'ok', text: '✅ เพิ่ม Case Study แล้ว — ดูได้ที่หน้า Case Studies' });
  }

  function importJson(text: string) {
    setMsg(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setMsg({ type: 'err', text: 'JSON ไม่ถูกต้อง — ตรวจวงเล็บ/เครื่องหมายจุลภาค' });
      return;
    }
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const cleaned = arr.map((r, i) => coerce(r, list.length + i)).filter((c): c is CaseStudy => !!c);
    if (!cleaned.length) {
      setMsg({ type: 'err', text: 'ไม่พบ Case Study ที่ถูกต้อง (ต้องมีอย่างน้อย title)' });
      return;
    }
    save([...list, ...cleaned]);
    setJsonText('');
    setMsg({ type: 'ok', text: `✅ นำเข้า ${cleaned.length} รายการแล้ว` });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importJson(String(reader.result ?? ''));
    reader.readAsText(file);
    e.target.value = '';
  }

  async function aiStructure() {
    setMsg(null);
    if (!aiTitle.trim() || !aiText.trim()) {
      setMsg({ type: 'err', text: 'กรอกหัวข้อ + วางข้อความสรุปก่อน' });
      return;
    }
    // ถ้าไม่มี AI (local/offline) → เก็บข้อความดิบเป็นบทเรียนเดียว
    if (!isSupabaseEnabled || !supabase) {
      addCase({
        id: newId(), title: aiTitle.trim(), tag: 'NotebookLM',
        lessons: [{ icon: '📝', body: aiText.trim() }],
        color: colorFor(list.length), source: 'notebooklm', createdAt: new Date().toISOString(),
      });
      setAiTitle(''); setAiText('');
      setMsg({ type: 'ok', text: '✅ เพิ่มแล้ว (โหมด Local — เก็บข้อความดิบ ไม่ได้ให้ AI จัดรูปแบบ)' });
      return;
    }
    setAiBusy(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('ai-assist', {
        body: {
          page: 'cases',
          pageLabel: 'Case Study',
          instruction:
            'สรุปข้อความต่อไปนี้ให้เป็นบทเรียนธุรกิจสำหรับ SME ไทย — summary = บทเรียนสำคัญ 1 ประโยค, ' +
            'suggestions = บทเรียน/ข้อคิดที่นำไปใช้ได้ 3-5 ข้อ (แต่ละข้อสั้น กระชับ ลงมือทำได้)',
          context: aiText.trim(),
        },
      });
      if (error) throw error;
      const lessons: CaseStudyLesson[] = (res?.suggestions ?? [])
        .map((s: string) => ({ icon: '💡', body: String(s).trim() }))
        .filter((l: CaseStudyLesson) => l.body);
      addCase({
        id: newId(),
        title: aiTitle.trim(),
        tag: 'NotebookLM',
        keyLesson: res?.summary ? String(res.summary) : undefined,
        lessons: lessons.length ? lessons : [{ icon: '📝', body: aiText.trim() }],
        color: colorFor(list.length),
        source: 'notebooklm',
        createdAt: new Date().toISOString(),
      });
      setAiTitle(''); setAiText('');
      setMsg({ type: 'ok', text: '✅ AI จัดรูปแบบเป็น Case Study แล้ว — ตรวจ/แก้เพิ่มได้ในหน้า Case Studies' });
    } catch (err) {
      setMsg({ type: 'err', text: 'AI จัดรูปแบบไม่สำเร็จ: ' + ((err as Error).message || 'error') + ' — ลองใหม่ หรือใช้ฟอร์มกรอกแทน' });
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="cst-wrap">
      <h3 className="cst-h3">📚 Content Studio — Case Study → Skill ขาย</h3>
      <p className="cst-note">
        นำเข้ากรณีศึกษาของคุณเอง (ฟอร์ม / JSON / ให้ AI สรุปจากทรานสคริปต์) → แสดงต่อท้ายชุด built-in ในหน้า <strong>Case Studies</strong>
        แล้วกด <strong>💰 เสนอเป็น Skill</strong> เพื่อแปลงเป็นสินค้าใน Marketplace พร้อมประเมินราคาให้อัตโนมัติ (เก็บใน workspace นี้)
      </p>

      <div className="cst-modes">
        <button className={`cst-mode${mode === 'form' ? ' active' : ''}`} onClick={() => setMode('form')}>📝 ฟอร์มกรอก</button>
        <button className={`cst-mode${mode === 'json' ? ' active' : ''}`} onClick={() => setMode('json')}>{'{ } '}วาง/อัปโหลด JSON</button>
        <button className={`cst-mode${mode === 'ai' ? ' active' : ''}`} onClick={() => setMode('ai')}>✨ สรุปจาก NotebookLM</button>
      </div>

      {msg && <div className={`cst-msg ${msg.type}`}>{msg.text}</div>}

      {mode === 'form' && (
        <form className="cst-form" onSubmit={submitForm}>
          <label>หัวข้อ (Title) *
            <input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="เช่น จากร้านเล็กสู่แบรนด์ทั่วประเทศ" />
          </label>
          <div className="cst-row">
            <label>ชื่อบริษัท/แบรนด์<input value={fCompany} onChange={(e) => setFCompany(e.target.value)} /></label>
            <label>แท็ก (หมวด)<input value={fTag} onChange={(e) => setFTag(e.target.value)} placeholder="เช่น กลยุทธ์การตลาด" /></label>
          </div>
          <div className="cst-row">
            <label>อุตสาหกรรม<input value={fIndustry} onChange={(e) => setFIndustry(e.target.value)} /></label>
            <label>ผลลัพธ์ (สั้น)<input value={fResult} onChange={(e) => setFResult(e.target.value)} placeholder="เช่น ยอดขาย +200% ใน 6 เดือน" /></label>
          </div>
          <label>บทเรียนสำคัญ (Key Lesson)
            <textarea value={fKey} onChange={(e) => setFKey(e.target.value)} rows={2} />
          </label>

          <div className="cst-lessons-hd">บทเรียนย่อย (Lessons)</div>
          {fLessons.map((l, i) => (
            <div className="cst-lesson-row" key={i}>
              <input className="cst-icon" value={l.icon ?? ''} onChange={(e) => setFLessons(fLessons.map((x, j) => j === i ? { ...x, icon: e.target.value } : x))} placeholder="💡" />
              <input className="cst-ltitle" value={l.title ?? ''} onChange={(e) => setFLessons(fLessons.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder="หัวข้อบทเรียน" />
              <input className="cst-lbody" value={l.body} onChange={(e) => setFLessons(fLessons.map((x, j) => j === i ? { ...x, body: e.target.value } : x))} placeholder="รายละเอียด" />
              {fLessons.length > 1 && <button type="button" className="cst-del-sm" onClick={() => setFLessons(fLessons.filter((_, j) => j !== i))}>✕</button>}
            </div>
          ))}
          <button type="button" className="cst-add-lesson" onClick={() => setFLessons([...fLessons, { icon: '💡', title: '', body: '' }])}>+ เพิ่มบทเรียน</button>

          <label>นำไปใช้ได้อย่างไร (บรรทัดละข้อ)
            <textarea value={fApply} onChange={(e) => setFApply(e.target.value)} rows={3} placeholder={'ข้อ 1\nข้อ 2'} />
          </label>
          <button type="submit" className="cst-submit">+ เพิ่ม Case Study</button>
        </form>
      )}

      {mode === 'json' && (
        <div className="cst-form">
          <p className="cst-note">วาง JSON (array หรือ object เดียว) — ต้องมีอย่างน้อย <code>title</code> และ <code>lessons</code></p>
          <textarea className="cst-json" value={jsonText} onChange={(e) => setJsonText(e.target.value)} rows={10}
            placeholder={'[{"title":"...","tag":"...","result":"...","keyLesson":"...","lessons":[{"icon":"💡","title":"...","body":"..."}],"applyTo":["..."]}]'} spellCheck={false} />
          <div className="cst-row">
            <button className="cst-submit" onClick={() => importJson(jsonText)} disabled={!jsonText.trim()}>นำเข้าจากข้อความ</button>
            <label className="cst-file">อัปโหลดไฟล์ .json
              <input type="file" accept=".json,application/json" onChange={onFile} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      )}

      {mode === 'ai' && (
        <div className="cst-form">
          <p className="cst-note">
            วางสรุปที่ได้จาก <strong>Google NotebookLM</strong> (หรือข้อความยาว ๆ) แล้วให้ AI จัดเป็นบทเรียนธุรกิจให้อัตโนมัติ
            {!isSupabaseEnabled && <em> — โหมด Local: จะเก็บข้อความดิบ (ไม่มี AI)</em>}
          </p>
          <label>หัวข้อ (Title) *
            <input value={aiTitle} onChange={(e) => setAiTitle(e.target.value)} placeholder="ตั้งชื่อกรณีศึกษานี้" />
          </label>
          <label>ข้อความสรุปจาก NotebookLM *
            <textarea value={aiText} onChange={(e) => setAiText(e.target.value)} rows={10} placeholder="วางสรุป/บทความ/ทรานสคริปต์ที่นี่…" spellCheck={false} />
          </label>
          <button className="cst-submit" onClick={aiStructure} disabled={aiBusy}>
            {aiBusy ? '⏳ AI กำลังจัดรูปแบบ…' : '✨ ให้ AI จัดเป็น Case Study'}
          </button>
        </div>
      )}

      <div className="cst-list-hd">Case Study ที่นำเข้าแล้ว ({list.length})</div>
      {list.length === 0 ? (
        <div className="cst-empty">ยังไม่มี — เพิ่มด้วยวิธีใดวิธีหนึ่งด้านบน</div>
      ) : (
        <div className="cst-list">
          {list.map((c) => (
            <div className="cst-item-wrap" key={c.id}>
              <div className="cst-item" style={{ borderLeftColor: c.color ?? '#64748b' }}>
                <div className="cst-item-main">
                  <div className="cst-item-title">{c.title}</div>
                  <div className="cst-item-meta">
                    {c.company && <span>{c.company}</span>}
                    {c.tag && <span className="cst-item-tag">{c.tag}</span>}
                    <span className="cst-item-src">· {c.source ?? 'form'}</span>
                    <span>· {c.lessons.length} บทเรียน</span>
                  </div>
                </div>
                <div className="cst-item-actions">
                  <button className="cst-skill-btn" onClick={() => (skillFor === c.id ? closeSkill() : openSkill(c))}>
                    {skillFor === c.id ? 'ปิด' : '💰 เสนอเป็น Skill'}
                  </button>
                  <button className="cst-del" onClick={() => removeCase(c.id)}>ลบ</button>
                </div>
              </div>

              {skillFor === c.id && proposal && (
                <div className="cst-skill-editor">
                  <div className="cst-skill-hd">💰 ข้อเสนอ Skill + ประเมินมูลค่า</div>
                  <label>ชื่อ Skill
                    <input value={proposal.name} onChange={(e) => patchProposal({ name: e.target.value })} />
                  </label>
                  <label>คำอธิบาย (1 ประโยค)
                    <textarea rows={2} value={proposal.desc} onChange={(e) => patchProposal({ desc: e.target.value })} />
                  </label>
                  <div className="cst-row">
                    <label>หมวด
                      <select value={proposal.category} onChange={(e) => {
                        const category = e.target.value as SkillCategory;
                        patchProposal({ category, icon: CATEGORY_META[category].icon });
                      }}>
                        {(Object.keys(CATEGORY_META) as SkillCategory[]).map((k) => (
                          <option key={k} value={k}>{CATEGORY_META[k].icon} {CATEGORY_META[k].label}</option>
                        ))}
                      </select>
                    </label>
                    <label>ระดับ (Tier)
                      <select value={proposal.tier} onChange={(e) => {
                        const tier = Number(e.target.value) as SkillTier;
                        patchProposal({ tier, price: TIER_PRICE[tier] });
                      }}>
                        {([1, 2, 3] as SkillTier[]).map((t) => (
                          <option key={t} value={t}>Tier {t} · {TIER_META[t].label}</option>
                        ))}
                      </select>
                    </label>
                    <label>ราคา (฿)
                      <input type="number" min={0} step={10} value={proposal.price}
                        onChange={(e) => patchProposal({ price: Math.max(0, Number(e.target.value) || 0) })} />
                    </label>
                  </div>
                  <div className="cst-skill-value">{proposal.valueNote}</div>
                  <ul className="cst-skill-why">
                    {proposal.rationale.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                  <div className="cst-row">
                    <button className="cst-submit" onClick={createSkill} disabled={skillBusy}>
                      {skillBusy ? '⏳ กำลังสร้าง…' : '+ สร้าง Skill ขาย'}
                    </button>
                    <button type="button" className="cst-del" onClick={closeSkill}>ยกเลิก</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
