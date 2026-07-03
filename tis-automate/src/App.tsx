import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

/* ===== TIS Automate — MVP =====
 * ระบบจัดการ Compliance มาตรฐาน TIS/ISO สำหรับ "ธุรกิจ" (SaaS)
 * Flow: ล็อกอิน → สร้าง/เลือกธุรกิจ → สร้างโครงการตามมาตรฐาน (TIS-first) → Kanban (JIT)
 * Design rules ตาม Data-Driven Agent skill: ใช้คำว่า "ธุรกิจ", Supabase-first, Kanban View */

interface Org { id: string; name: string; business_type: string | null; subdomain: string }
interface Standard { id: string; code: string; title: string; type: 'TIS' | 'ISO'; version: string; priority_rank: number }
interface Project { id: string; name: string; status: string; standard_id: string }
interface Column { id: string; name: string; position: number; wip_limit: number | null }
interface Card { id: string; column_id: string; title: string; priority: string; position: number }

const DEFAULT_COLUMNS = ['To Do', 'Doing', 'Review', 'Done'];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // auth form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signUp, setSignUp] = useState(false);

  // data
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeOrg, setActiveOrg] = useState<Org | null>(null);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);

  // forms
  const [orgDraft, setOrgDraft] = useState({ name: '', business_type: '', subdomain: '' });
  const [projDraft, setProjDraft] = useState({ name: '', standard_id: '' });
  const [cardDraft, setCardDraft] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    // profiles: ensure row (organizations.created_by อ้างอิง profiles)
    supabase.from('profiles').upsert({ id: session.user.id, full_name: session.user.email ?? '' })
      .then(() => loadOrgs());
    supabase.from('standards').select('*').eq('is_active', true)
      .order('priority_rank', { ascending: false })  // TIS-first
      .then(({ data }) => setStandards((data as Standard[]) ?? []));
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadOrgs() {
    const { data } = await supabase.from('organizations').select('*').order('created_at');
    setOrgs((data as Org[]) ?? []);
  }

  async function loadProjects(org: Org) {
    setActiveOrg(org);
    setActiveProject(null);
    const { data } = await supabase.from('projects').select('*').eq('org_id', org.id).order('created_at');
    setProjects((data as Project[]) ?? []);
  }

  async function loadBoard(p: Project) {
    setActiveProject(p);
    const [{ data: cols }, { data: crds }] = await Promise.all([
      supabase.from('kanban_columns').select('*').eq('project_id', p.id).order('position'),
      supabase.from('kanban_cards').select('*').eq('project_id', p.id).order('position'),
    ]);
    setColumns((cols as Column[]) ?? []);
    setCards((crds as Card[]) ?? []);
  }

  async function auth() {
    setMsg(null);
    const fn = signUp
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });
    const { error } = await fn;
    if (error) setMsg('⚠️ ' + error.message);
    else if (signUp) setMsg('✅ สมัครแล้ว — ตรวจอีเมลเพื่อยืนยัน (ถ้าเปิด confirm) แล้วล็อกอิน');
  }

  async function createOrg() {
    if (!session || orgDraft.name.trim().length < 2 || orgDraft.subdomain.trim().length < 3) {
      setMsg('⚠️ ระบุชื่อธุรกิจและ subdomain (≥3 ตัวอักษร)'); return;
    }
    const { data, error } = await supabase.from('organizations').insert({
      name: orgDraft.name.trim(),
      business_type: orgDraft.business_type.trim() || null,
      subdomain: orgDraft.subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      created_by: session.user.id,
    }).select().single();
    if (error) { setMsg('⚠️ ' + error.message); return; }
    const org = data as Org;
    const { error: e2 } = await supabase.from('organization_members')
      .insert({ org_id: org.id, user_id: session.user.id, role: 'owner' });
    if (e2) { setMsg('⚠️ ' + e2.message); return; }
    setOrgDraft({ name: '', business_type: '', subdomain: '' });
    setMsg(`✅ สร้างธุรกิจ "${org.name}" แล้ว`);
    loadOrgs();
  }

  async function createProject() {
    if (!session || !activeOrg || !projDraft.name.trim() || !projDraft.standard_id) {
      setMsg('⚠️ ระบุชื่อโครงการและเลือกมาตรฐาน'); return;
    }
    const { data, error } = await supabase.from('projects').insert({
      org_id: activeOrg.id, standard_id: projDraft.standard_id,
      name: projDraft.name.trim(), owner_id: session.user.id,
      subdomain: activeOrg.subdomain,
    }).select().single();
    if (error) { setMsg('⚠️ ' + error.message); return; }
    const p = data as Project;
    // Kanban ตั้งต้น 4 คอลัมน์ (JIT: ใส่ WIP limit ที่ Doing)
    await supabase.from('kanban_columns').insert(
      DEFAULT_COLUMNS.map((name, i) => ({
        project_id: p.id, name, position: i, wip_limit: name === 'Doing' ? 5 : null,
      })));
    setProjDraft({ name: '', standard_id: '' });
    setMsg(`✅ สร้างโครงการ "${p.name}" พร้อมบอร์ด Kanban แล้ว`);
    loadProjects(activeOrg);
  }

  async function addCard() {
    if (!activeProject || !cardDraft.trim() || columns.length === 0) return;
    const col = columns[0];
    const { error } = await supabase.from('kanban_cards').insert({
      project_id: activeProject.id, column_id: col.id,
      title: cardDraft.trim(), position: cards.filter(c => c.column_id === col.id).length,
    });
    if (error) { setMsg('⚠️ ' + error.message); return; }
    setCardDraft('');
    loadBoard(activeProject);
  }

  async function moveCard(card: Card, dir: 1 | -1) {
    const idx = columns.findIndex(c => c.id === card.column_id);
    const target = columns[idx + dir];
    if (!target || !activeProject) return;
    // JIT: เคารพ WIP limit
    const inTarget = cards.filter(c => c.column_id === target.id).length;
    if (target.wip_limit && inTarget >= target.wip_limit) {
      setMsg(`⚠️ คอลัมน์ "${target.name}" เต็ม WIP limit (${target.wip_limit}) — เคลียร์งานเดิมก่อนตามหลัก JIT`);
      return;
    }
    const { error } = await supabase.from('kanban_cards')
      .update({ column_id: target.id }).eq('id', card.id);
    if (error) { setMsg('⚠️ ' + error.message); return; }
    loadBoard(activeProject);
  }

  if (!ready) return <div className="wrap"><div className="loading">กำลังโหลด…</div></div>;

  /* ── ล็อกอิน ── */
  if (!session) {
    return (
      <div className="wrap auth">
        <h1>⚙️ TIS Automate</h1>
        <p className="sub">ระบบจัดการ Compliance มาตรฐาน TIS/ISO สำหรับธุรกิจ — โดย B. Training Consultant</p>
        <div className="card">
          <input placeholder="อีเมล" value={email} onChange={e => setEmail(e.target.value)} />
          <input placeholder="รหัสผ่าน (≥6 ตัว)" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="primary" onClick={auth}>{signUp ? 'สมัครใช้งาน' : 'เข้าสู่ระบบ'}</button>
          <button className="ghost" onClick={() => setSignUp(!signUp)}>
            {signUp ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครใช้งาน'}
          </button>
          {msg && <div className="msg">{msg}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <header>
        <h1>⚙️ TIS Automate</h1>
        <div>
          <span className="user">{session.user.email}</span>
          <button className="ghost" onClick={() => supabase.auth.signOut()}>ออกจากระบบ</button>
        </div>
      </header>
      {msg && <div className="msg">{msg}</div>}

      {/* ── ธุรกิจ ── */}
      <section>
        <h2>🏢 ธุรกิจของฉัน</h2>
        <div className="row">
          {orgs.map(o => (
            <button key={o.id} className={`chip${activeOrg?.id === o.id ? ' active' : ''}`} onClick={() => loadProjects(o)}>
              {o.name} <small>· {o.subdomain}</small>
            </button>
          ))}
        </div>
        <div className="card form">
          <input placeholder="ชื่อธุรกิจ" value={orgDraft.name} onChange={e => setOrgDraft({ ...orgDraft, name: e.target.value })} />
          <input placeholder="ประเภทธุรกิจ" value={orgDraft.business_type} onChange={e => setOrgDraft({ ...orgDraft, business_type: e.target.value })} />
          <input placeholder="subdomain เช่น my-business" value={orgDraft.subdomain} onChange={e => setOrgDraft({ ...orgDraft, subdomain: e.target.value })} />
          <button className="primary" onClick={createOrg}>＋ สร้างธุรกิจ</button>
        </div>
      </section>

      {/* ── โครงการ Compliance ── */}
      {activeOrg && (
        <section>
          <h2>📋 โครงการ Compliance — {activeOrg.name}</h2>
          <div className="row">
            {projects.map(p => (
              <button key={p.id} className={`chip${activeProject?.id === p.id ? ' active' : ''}`} onClick={() => loadBoard(p)}>
                {p.name} <small>· {p.status}</small>
              </button>
            ))}
          </div>
          <div className="card form">
            <input placeholder="ชื่อโครงการ เช่น ขอ มอก. โรงงานบางนา" value={projDraft.name}
              onChange={e => setProjDraft({ ...projDraft, name: e.target.value })} />
            <select value={projDraft.standard_id} onChange={e => setProjDraft({ ...projDraft, standard_id: e.target.value })}>
              <option value="">— เลือกมาตรฐาน (TIS ขึ้นก่อนตามนโยบาย TIS-first) —</option>
              {standards.map(s => <option key={s.id} value={s.id}>[{s.type}] {s.code} — {s.title}</option>)}
            </select>
            <button className="primary" onClick={createProject}>＋ สร้างโครงการ</button>
          </div>
        </section>
      )}

      {/* ── Kanban (JIT) ── */}
      {activeProject && (
        <section>
          <h2>🗂 Kanban — {activeProject.name}</h2>
          <div className="card form inline">
            <input placeholder="งานใหม่ เช่น รวบรวมเอกสารข้อ 7.1.5" value={cardDraft} onChange={e => setCardDraft(e.target.value)} />
            <button className="primary" onClick={addCard}>＋ เพิ่มงาน</button>
          </div>
          <div className="board">
            {columns.map(col => {
              const colCards = cards.filter(c => c.column_id === col.id);
              return (
                <div key={col.id} className="col">
                  <div className="col-hd">{col.name} <small>{colCards.length}{col.wip_limit ? `/${col.wip_limit} WIP` : ''}</small></div>
                  {colCards.map(card => (
                    <div key={card.id} className="kcard">
                      <div>{card.title}</div>
                      <div className="kcard-actions">
                        <button onClick={() => moveCard(card, -1)}>◀</button>
                        <button onClick={() => moveCard(card, 1)}>▶</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <footer>TIS Automate — Supabase project แยก (galtbbkcddugnsfkgyqm) · B. Training Consultant (M.E.A) Co., Ltd. · โทร 081-7817-7773</footer>
    </div>
  );
}
