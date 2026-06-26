import { useEffect, useState, useCallback } from 'react';
import { isSupabaseEnabled } from '../lib/supabase';
import { listMembers, inviteMember, setMemberRole, removeMember, type Member, type Workspace } from '../lib/workspaces';

interface Props {
  activeWs: string | null;
  workspaces: Workspace[];
  currentUserId: string | null;
}

const ROLE_LABEL: Record<string, string> = { owner: 'เจ้าของ', admin: 'แอดมิน', member: 'สมาชิก' };
const INVITE_RESULT: Record<string, string> = {
  ok: '✓ เพิ่มสมาชิกเรียบร้อย',
  not_found: '✕ ไม่พบผู้ใช้อีเมลนี้ — ผู้ถูกเชิญต้องสมัครสมาชิกก่อน',
  forbidden: '✕ เฉพาะเจ้าของเวิร์กสเปซเท่านั้นที่เชิญได้',
};

export default function Team({ activeWs, workspaces, currentUserId }: Props) {
  const ws = workspaces.find(w => w.id === activeWs) ?? null;
  const isOwner = !!ws && ws.owner_id === currentUserId;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!activeWs) return;
    setLoading(true);
    setMembers(await listMembers(activeWs));
    setLoading(false);
  }, [activeWs]);

  useEffect(() => { refresh(); }, [refresh]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!activeWs || !email.trim()) return;
    setBusy(true); setMsg(null);
    const res = await inviteMember(activeWs, email);
    setMsg(INVITE_RESULT[res] ?? '✕ ' + res);
    if (res === 'ok') { setEmail(''); await refresh(); }
    setBusy(false);
  }

  async function changeRole(userId: string, role: 'admin' | 'member') {
    if (!activeWs) return;
    await setMemberRole(activeWs, userId, role);
    await refresh();
  }

  async function remove(userId: string, mail: string) {
    if (!activeWs) return;
    if (!window.confirm(`ลบ ${mail} ออกจากเวิร์กสเปซ?`)) return;
    await removeMember(activeWs, userId);
    await refresh();
  }

  if (!isSupabaseEnabled) {
    return (
      <div>
        <div className="page-header"><div className="page-title">ทีม / สมาชิก</div></div>
        <div className="team-notice">
          ฟีเจอร์ทีมต้องเปิดใช้ Supabase ก่อน — ตั้งค่า <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code>
          แล้วรัน migration ใน <code>supabase/</code> (ดูคู่มือใน <code>supabase/README.md</code>)
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">ทีม / สมาชิก</div>
        <div className="page-meta">
          <span className="meta-chip">{ws?.name ?? 'เวิร์กสเปซ'}</span>
          <span className="meta-chip">{members.length} สมาชิก</span>
          {isOwner && <span className="meta-chip" style={{ borderColor: 'var(--green)', color: 'var(--green)' }}>คุณเป็นเจ้าของ</span>}
          <span className="law-badge" data-tip={"Law of Proximity: จัดสมาชิกเป็นรายการเดียว\nบทบาท-การจัดการอยู่ติดกับชื่อ เข้าใจง่าย"}>Proximity</span>
        </div>
      </div>

      {isOwner && (
        <form className="team-invite" onSubmit={invite}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="อีเมลสมาชิกที่ต้องการเชิญ (ต้องสมัครแล้ว)" required />
          <button type="submit" disabled={busy}>{busy ? 'กำลังเชิญ…' : 'เชิญเข้าทีม'}</button>
        </form>
      )}
      {msg && <div className={`team-msg ${msg.startsWith('✓') ? 'ok' : 'err'}`}>{msg}</div>}

      <div className="team-list">
        <div className="team-row team-head">
          <div>สมาชิก</div>
          <div className="team-role-col">บทบาท</div>
          <div className="team-act-col" />
        </div>
        {loading && <div className="team-empty">กำลังโหลด…</div>}
        {!loading && members.length === 0 && <div className="team-empty">ยังไม่มีสมาชิก</div>}
        {members.map(m => {
          const memberIsOwner = m.role === 'owner';
          const isSelf = m.user_id === currentUserId;
          return (
            <div key={m.user_id} className="team-row">
              <div className="team-member">
                <div className="team-av">{m.email.charAt(0).toUpperCase()}</div>
                <div className="team-email">{m.email}{isSelf && <span className="team-you"> (คุณ)</span>}</div>
              </div>
              <div className="team-role-col">
                {isOwner && !memberIsOwner ? (
                  <select className="team-role-sel" value={m.role} onChange={e => changeRole(m.user_id, e.target.value as 'admin' | 'member')}>
                    <option value="member">สมาชิก</option>
                    <option value="admin">แอดมิน</option>
                  </select>
                ) : (
                  <span className={`team-role-badge role-${m.role}`}>{ROLE_LABEL[m.role] ?? m.role}</span>
                )}
              </div>
              <div className="team-act-col">
                {isOwner && !memberIsOwner && (
                  <button className="team-remove" onClick={() => remove(m.user_id, m.email)} title="ลบสมาชิก">×</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="team-hint">
        เชิญสมาชิกได้เฉพาะผู้ที่สมัครบัญชีในระบบแล้ว — สมาชิกในเวิร์กสเปซเดียวกันจะเห็นและแก้ไขข้อมูลบริษัท AI ร่วมกัน
        ผ่าน Row Level Security ของ Supabase
      </div>
    </div>
  );
}
