import { useEffect, useState, useCallback } from 'react';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import { listMembers, inviteMember, setMemberRole, removeMember, deleteWorkspace, type Member, type Workspace } from '../lib/workspaces';
import { clearLocalAppData } from '../lib/localReset';
import type { AppData, Agent } from '../types';

interface Props {
  activeWs: string | null;
  workspaces: Workspace[];
  currentUserId: string | null;
  data: AppData;
  onDeleted?: () => void; // หลังลบ workspace/ล้างข้อมูลสำเร็จ
}

const STATUS_COLOR: Record<string, string> = {
  working: '#22c55e',
  idle: '#94a3b8',
  waiting: '#f59e0b',
};

const STATUS_LABEL: Record<string, string> = {
  working: 'กำลังทำงาน',
  idle: 'ว่าง',
  waiting: 'รอคำสั่ง',
};

const ROLE_LABEL: Record<string, string> = { owner: 'เจ้าของ', admin: 'แอดมิน', member: 'สมาชิก' };
const INVITE_RESULT: Record<string, string> = {
  ok: '✓ เพิ่มสมาชิกเรียบร้อย',
  not_found: '✕ ไม่พบผู้ใช้อีเมลนี้ — ผู้ถูกเชิญต้องสมัครสมาชิกก่อน',
  forbidden: '✕ เฉพาะเจ้าของเวิร์กสเปซเท่านั้นที่เชิญได้',
};

type TreeNode = { agent: Agent; children: TreeNode[] };

function buildTree(agents: Agent[]): TreeNode[] {
  function gather(parentId: string | null): TreeNode[] {
    return agents
      .filter(a => a.reportsTo === parentId)
      .map(a => ({ agent: a, children: gather(a.id) }));
  }
  return gather(null);
}

function OrgCard({ agent }: { agent: Agent }) {
  return (
    <div className="org-card" style={{ borderTopColor: agent.color }}>
      <div className="org-card-header">
        <div className="org-avatar">{agent.avatar}</div>
        <div className="org-card-info">
          <div className="org-role">{agent.role}</div>
          <div className="org-name">{agent.name}</div>
        </div>
        <span
          className="org-status-dot"
          style={{ background: STATUS_COLOR[agent.status] ?? '#94a3b8' }}
          title={STATUS_LABEL[agent.status] ?? agent.status}
        />
      </div>
      <div className="org-card-body">
        <div className="org-mandate">{agent.mandate}</div>
        <span className="org-model-tag">{agent.model}</span>
      </div>
    </div>
  );
}

function OrgLevel({ nodes }: { nodes: TreeNode[] }) {
  if (nodes.length === 0) return null;
  return (
    <div className="org-level">
      {nodes.map(({ agent, children }) => (
        <div key={agent.id} className="org-branch">
          <div className="org-branch-vline" />
          <OrgCard agent={agent} />
          {children.length > 0 && (
            <>
              <div className="org-down-vline" />
              <OrgLevel nodes={children} />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Team({ activeWs, workspaces, currentUserId, data, onDeleted }: Props) {
  const ws = workspaces.find(w => w.id === activeWs) ?? null;
  const isOwner = !!ws && ws.owner_id === currentUserId;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [delConfirm, setDelConfirm] = useState('');

  // คำยืนยันการลบ: production = ชื่อ workspace · local = "ลบทั้งหมด"
  const confirmWord = isSupabaseEnabled ? (ws?.name ?? '') : 'ลบทั้งหมด';

  /** 🗑 ลบ workspace ถาวร (prod) / ล้างข้อมูลเริ่มใหม่ (local) — R9: เคลียร์ localStorage เสมอ */
  async function destroy() {
    setBusy(true);
    setMsg(null);
    if (isSupabaseEnabled && activeWs) {
      const err = await deleteWorkspace(activeWs);
      if (err) { setMsg('⚠️ ' + err); setBusy(false); return; }
    }
    clearLocalAppData();
    setBusy(false);
    setDelConfirm('');
    onDeleted?.();
  }

  /** ลบบัญชีผู้ใช้ถาวร (auth.users) — ผ่าน Edge Function delete-account (service role) */
  async function destroyAccount() {
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    const { data: res, error } = await supabase.functions.invoke('delete-account', { body: {} });
    if (error || res?.error) {
      setMsg('⚠️ ลบบัญชีไม่สำเร็จ: ' + (error?.message ?? res?.error ?? ''));
      setBusy(false);
      return;
    }
    clearLocalAppData();
    await supabase.auth.signOut().catch(() => {});
    window.location.href = '/';
  }

  const refresh = useCallback(async () => {
    if (!isSupabaseEnabled || !activeWs) return;
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

  const { aiCompany } = data;
  const tree = buildTree(aiCompany.agents);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">ทีม / ผังองค์กร</div>
        <div className="page-meta">
          <span className="meta-chip">{aiCompany.name}</span>
          <span className="meta-chip">{aiCompany.agents.length} Agent</span>
          {isSupabaseEnabled && ws && (
            <span className="meta-chip">{ws.name}</span>
          )}
        </div>
      </div>

      {/* Org Chart */}
      <div className="org-chart-wrap">
        <div className="org-board-node">
          <div className="org-board-icon">🏛️</div>
          <div>
            <div className="org-board-label">คณะกรรมการ / บอร์ด</div>
            <div className="org-board-name">{aiCompany.name}</div>
          </div>
        </div>

        {tree.length > 0 ? (
          <>
            <div className="org-down-vline" />
            <OrgLevel nodes={tree} />
          </>
        ) : (
          <div className="org-empty">
            ยังไม่มีสมาชิกในองค์กร — เพิ่มได้ในหน้า AI Company
          </div>
        )}
      </div>

      {/* Mission statement */}
      {aiCompany.mission && (
        <div className="org-mission">
          <div className="org-mission-label">Mission Statement</div>
          <div className="org-mission-text">{aiCompany.mission}</div>
        </div>
      )}

      {/* Workspace members (Supabase only) */}
      {isSupabaseEnabled && (
        <div style={{ marginTop: 32 }}>
          <div className="org-ws-section-title">สมาชิก Workspace</div>

          {isOwner && (
            <form className="team-invite" onSubmit={invite}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="อีเมลสมาชิกที่ต้องการเชิญ (ต้องสมัครแล้ว)"
                required
              />
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
                    <div className="team-email">
                      {m.email}{isSelf && <span className="team-you"> (คุณ)</span>}
                    </div>
                  </div>
                  <div className="team-role-col">
                    {isOwner && !memberIsOwner ? (
                      <select
                        className="team-role-sel"
                        value={m.role}
                        onChange={e => changeRole(m.user_id, e.target.value as 'admin' | 'member')}
                      >
                        <option value="member">สมาชิก</option>
                        <option value="admin">แอดมิน</option>
                      </select>
                    ) : (
                      <span className={`team-role-badge role-${m.role}`}>{ROLE_LABEL[m.role] ?? m.role}</span>
                    )}
                  </div>
                  <div className="team-act-col">
                    {isOwner && !memberIsOwner && (
                      <button
                        className="team-remove"
                        onClick={() => remove(m.user_id, m.email)}
                        title="ลบสมาชิก"
                      >×</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="team-hint">
            เชิญสมาชิกได้เฉพาะผู้ที่สมัครบัญชีในระบบแล้ว — สมาชิกในเวิร์กสเปซเดียวกันจะเห็นและแก้ไขข้อมูลร่วมกันผ่าน Row Level Security ของ Supabase
          </div>
        </div>
      )}

      {/* ── 🗑 Danger Zone — ลบ workspace / ล้างข้อมูล (owner เท่านั้นใน production) ── */}
      {(!isSupabaseEnabled || isOwner) && (
        <div className="danger-zone">
          <div className="danger-hd">🗑 Danger Zone</div>
          {isSupabaseEnabled ? (
            <p className="danger-desc">
              ลบ Workspace <b>"{ws?.name}"</b> ถาวร — ข้อมูลบริษัท หน้าร้าน RFQ ออเดอร์ และสมาชิกทั้งหมดจะถูกลบ
              <b> กู้คืนไม่ได้</b>
            </p>
          ) : (
            <p className="danger-desc">
              ล้างข้อมูลทั้งหมดในเครื่องนี้ (local mode) — บริษัท หน้าร้าน RFQ ทุกอย่างหายและเริ่มใหม่ <b>กู้คืนไม่ได้</b>
            </p>
          )}
          <div className="danger-row">
            <input
              placeholder={`พิมพ์ "${confirmWord}" เพื่อยืนยัน`}
              value={delConfirm}
              onChange={e => setDelConfirm(e.target.value)}
            />
            <button
              className="danger-btn"
              disabled={busy || delConfirm.trim() !== confirmWord}
              onClick={destroy}
            >
              {busy ? 'กำลังลบ…' : isSupabaseEnabled ? '🗑 ลบ Workspace ถาวร' : '🗑 ล้างข้อมูลเริ่มใหม่'}
            </button>
          </div>

          {isSupabaseEnabled && (
            <div className="danger-account">
              ต้องการลบ<b>บัญชีผู้ใช้ทั้งหมด</b> (ทุก workspace ที่เป็นเจ้าของ + บัญชีล็อกอิน — กู้คืนไม่ได้)?{' '}
              <button className="danger-link" disabled={busy || delConfirm.trim() !== confirmWord} onClick={destroyAccount}>
                ลบบัญชีถาวร
              </button>
              <span className="danger-note"> (พิมพ์คำยืนยันด้านบนก่อน)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
