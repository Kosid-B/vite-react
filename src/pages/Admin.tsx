import { useEffect, useState } from 'react';
import { isSupabaseEnabled } from '../lib/supabase';
import { adminListWorkspaces, type AdminWorkspace } from '../lib/workspaces';
import { isAdminEmail, ADMIN_EMAILS } from '../config';

interface Props {
  currentUserEmail: string | null;
}

function thaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Admin({ currentUserEmail }: Props) {
  const admin = isAdminEmail(currentUserEmail);
  const [rows, setRows] = useState<AdminWorkspace[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!admin || !isSupabaseEnabled) return;
    setLoading(true);
    adminListWorkspaces().then(r => { setRows(r); setLoading(false); });
  }, [admin]);

  if (!isSupabaseEnabled) {
    return (
      <div>
        <div className="page-header"><div className="page-title">ผู้ดูแลระบบ</div></div>
        <div className="team-notice">ต้องเปิดใช้ Supabase ก่อน (ตั้งค่า env + รัน migration <code>0005_admin.sql</code>)</div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div>
        <div className="page-header"><div className="page-title">ผู้ดูแลระบบ</div></div>
        <div className="admin-deny">
          🔒 หน้านี้สำหรับผู้ดูแลระบบเท่านั้น<br/>
          บัญชีที่เป็นแอดมิน: <b>{ADMIN_EMAILS.join(', ')}</b><br/>
          {currentUserEmail ? <>คุณกำลังใช้ <b>{currentUserEmail}</b></> : 'กรุณาเข้าสู่ระบบ'}
        </div>
      </div>
    );
  }

  const totalMembers = rows.reduce((s, r) => s + Number(r.member_count), 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">ผู้ดูแลระบบ</div>
        <div className="page-meta">
          <span className="meta-chip" style={{ borderColor: 'var(--green)', color: 'var(--green)' }}>คุณคือแอดมิน · {currentUserEmail}</span>
          <span className="meta-chip">{rows.length} เวิร์กสเปซ</span>
          <span className="meta-chip">{totalMembers} สมาชิกรวม</span>
        </div>
      </div>

      <div className="admin-note">
        ในฐานะผู้ดูแลระบบ คุณเห็นทุกเวิร์กสเปซในระบบ (ผ่าน Row Level Security ที่ให้สิทธิ์แอดมิน) —
        ใช้ดูภาพรวมลูกค้าทั้งหมดของ CEO AI Thailand
      </div>

      <div className="team-list">
        <div className="admin-row admin-head">
          <div>บริษัท / เวิร์กสเปซ</div>
          <div>เจ้าของ</div>
          <div className="admin-c-num">สมาชิก</div>
          <div className="admin-c-date">สร้างเมื่อ</div>
        </div>
        {loading && <div className="team-empty">กำลังโหลด…</div>}
        {!loading && rows.length === 0 && <div className="team-empty">ยังไม่มีเวิร์กสเปซในระบบ</div>}
        {rows.map(r => (
          <div key={r.id} className="admin-row">
            <div className="admin-ws-name">{r.name}</div>
            <div className="admin-ws-owner">{r.owner_email}</div>
            <div className="admin-c-num">{Number(r.member_count)}</div>
            <div className="admin-c-date">{thaiDate(r.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
