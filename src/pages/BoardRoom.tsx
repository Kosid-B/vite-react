import { useMemo } from 'react';
import type { AppData, PageId } from '../types';
import { track } from '../lib/analytics';
import {
  AGENDA, boardState, pendingProposals, skillLevels, gateProgress,
  TRACK_META, type BoardDecision, type AgendaItem, type SkillTrack,
} from '../lib/boardRoom';
import { bigPendingRequests, approveResourceRequest, rejectResourceRequest, requestCost, RESOURCE_BOARD_XP } from '../lib/resourceBridge';
import { RESOURCE_CATEGORIES } from '../lib/resources';

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
  onNavigate: (page: PageId) => void;
}

export default function BoardRoom({ data, onUpdate, onNavigate }: Props) {
  const decisions = useMemo(() => data.boardRoom?.decisions ?? [], [data.boardRoom]);

  const pending = useMemo(() => pendingProposals(data, decisions), [data, decisions]);
  const skills = useMemo(() => skillLevels(decisions), [decisions]);
  const gates = gateProgress(decisions);
  const state = useMemo(() => boardState(data, decisions), [data, decisions]);
  const approved = state.filter((s) => s.status === 'approved');
  const locked = state.filter((s) => s.status === 'locked');

  function decide(item: AgendaItem, status: 'approved' | 'rejected') {
    const rest = decisions.filter((d) => d.itemId !== item.id);
    const rec: BoardDecision = { itemId: item.id, status, at: new Date().toISOString().slice(0, 10) };
    onUpdate({ ...data, boardRoom: { decisions: [...rest, rec] } });
    track('board_decision', { item: item.id, status, track: item.track, xp: status === 'approved' ? item.xp : 0 });
  }
  function reopen(itemId: string) {
    onUpdate({ ...data, boardRoom: { decisions: decisions.filter((d) => d.itemId !== itemId) } });
  }

  // คำขอทรัพยากรก้อนใหญ่ที่ถูกส่งมาให้บอร์ดตัดสิน
  const resState = data.resources ?? { items: [], requests: [] };
  const resProposals = bigPendingRequests(resState);
  const today = () => new Date().toISOString().slice(0, 10);
  function approveResource(reqId: string) {
    // อนุมัติผ่านบอร์ด → ปรับทรัพยากร + ไหลเข้า finance + ได้ XP ทักษะบริหาร
    onUpdate(approveResourceRequest(data, reqId, { viaBoard: true, today: today() }));
    track('board_resource_decision', { status: 'approved', xp: RESOURCE_BOARD_XP });
  }
  function rejectResource(reqId: string) {
    onUpdate(rejectResourceRequest(data, reqId));
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">ห้องบอร์ด</div>
        <div className="page-meta">
          <span className="meta-chip">Gate {gates.approved}/{gates.total}</span>
          <span className="law-badge" data-tip={"CEO (AI) เสนอวาระ → บอร์ด/User อนุมัติ\nอนุมัติแล้วได้สะสมทักษะบริหาร + การตลาด"}>Learning-by-Governing</span>
        </div>
      </div>

      <p className="br-intro">
        CEO เสนอ "วาระ" ให้บอร์ด (คุณ) อนุมัติทีละเรื่อง — แต่ละเรื่องมี <strong>มินิบทเรียน</strong> พออนุมัติแล้ว
        คุณจะได้ <strong>สะสมทักษะบริหารธุรกิจ + การตลาด</strong> ไปในตัว (ตัดสินใจอย่างมีหลักการ ไม่ใช่เดา)
      </p>

      {/* ทักษะ 2 สาย */}
      <div className="br-skills">
        {(['business', 'marketing'] as SkillTrack[]).map((tk) => {
          const s = skills[tk];
          const meta = TRACK_META[tk];
          const pct = s.span > 0 ? Math.min(100, Math.round((s.intoLevel / s.span) * 100)) : 100;
          return (
            <div className="br-skill" key={tk} style={{ borderTopColor: meta.color }}>
              <div className="br-skill-top">
                <span className="br-skill-icon">{meta.icon}</span>
                <div>
                  <div className="br-skill-name">{meta.label}</div>
                  <div className="br-skill-lv">Lv {s.level} · {s.label}</div>
                </div>
                <span className="br-skill-xp">{s.xp} XP</span>
              </div>
              <div className="br-skill-bar"><span style={{ width: `${pct}%`, background: meta.color }} /></div>
              <div className="br-skill-next">
                {s.nextXp === null ? 'ระดับสูงสุด 🏆' : `อีก ${s.nextXp - s.xp} XP → Lv ${s.level + 1}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* วาระที่ CEO เสนอ */}
      <div className="br-sec-hd">📋 วาระที่ CEO เสนอให้อนุมัติ ({pending.length})</div>
      {pending.length === 0 ? (
        <div className="br-empty">ไม่มีวาระค้าง — อนุมัติครบแล้ว หรือรอข้อมูลบางส่วน (ดูด้านล่าง) 🎉</div>
      ) : (
        <div className="br-props">
          {pending.map((item) => {
            const meta = TRACK_META[item.track];
            return (
              <div className="br-prop" key={item.id} style={{ borderLeftColor: meta.color }}>
                <div className="br-prop-head">
                  <span className="br-prop-badge" style={{ background: meta.color }}>{meta.icon} {meta.label}</span>
                  {item.category === 'gate' && <span className="br-prop-gate">Decision Gate</span>}
                  <span className="br-prop-xp">+{item.xp} XP</span>
                </div>
                <div className="br-prop-title">{item.title}</div>
                <div className="br-prop-concept">🎓 {item.concept}</div>
                <div className="br-prop-why"><strong>ทำไมสำคัญ:</strong> {item.why}</div>
                <div className="br-prop-lesson"><strong>บทเรียน:</strong> {item.lesson}</div>
                <div className="br-prop-actions">
                  <button className="br-approve" onClick={() => decide(item, 'approved')}>✓ อนุมัติ (+{item.xp} XP)</button>
                  <button className="br-reject" onClick={() => decide(item, 'rejected')}>ขอแก้ไข</button>
                  {item.goto && (
                    <button className="br-goto" onClick={() => onNavigate(item.goto as PageId)}>ดูข้อมูล →</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* คำขอทรัพยากรก้อนใหญ่ (ส่งมาจากหน้าทรัพยากร) */}
      {resProposals.length > 0 && (
        <>
          <div className="br-sec-hd">📦 คำขอทรัพยากรก้อนใหญ่ให้บอร์ดอนุมัติ ({resProposals.length})</div>
          <div className="br-props">
            {resProposals.map((q) => {
              const r = resState.items.find((x) => x.id === q.resourceId);
              const cm = r ? RESOURCE_CATEGORIES[r.category] : null;
              const cost = requestCost(resState, q);
              return (
                <div className="br-prop" key={q.id} style={{ borderLeftColor: TRACK_META.business.color }}>
                  <div className="br-prop-head">
                    <span className="br-prop-badge" style={{ background: TRACK_META.business.color }}>🏛️ บริหารธุรกิจ</span>
                    <span className="br-prop-gate">คำขอทรัพยากร</span>
                    <span className="br-prop-xp">+{RESOURCE_BOARD_XP} XP</span>
                  </div>
                  <div className="br-prop-title">{cm?.icon} {q.type === 'add' ? 'ขอเพิ่ม' : 'ขอทรัพยากรใหม่'} {q.amount} · {r?.name ?? q.resourceName}</div>
                  <div className="br-prop-why"><strong>ผลกระทบงบ:</strong> +฿{cost.toLocaleString('en-US')}/เดือน (จะบันทึกเป็นรายจ่ายอัตโนมัติเมื่ออนุมัติ)</div>
                  <div className="br-prop-lesson"><strong>เหตุผล:</strong> {q.reason}</div>
                  <div className="br-prop-actions">
                    <button className="br-approve" onClick={() => approveResource(q.id)}>✓ อนุมัติ (+{RESOURCE_BOARD_XP} XP)</button>
                    <button className="br-reject" onClick={() => rejectResource(q.id)}>ปฏิเสธ</button>
                    <button className="br-goto" onClick={() => onNavigate('resources')}>ดูทรัพยากร →</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* อนุมัติแล้ว */}
      {approved.length > 0 && (
        <>
          <div className="br-sec-hd">✅ อนุมัติแล้ว ({approved.length})</div>
          <div className="br-done">
            {approved.map(({ item }) => (
              <div className="br-done-row" key={item.id}>
                <span className="br-done-icon">{TRACK_META[item.track].icon}</span>
                <span className="br-done-title">{item.title}</span>
                <button className="br-reopen" onClick={() => reopen(item.id)} title="เปิดวาระใหม่">↺</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* รอข้อมูล */}
      {locked.length > 0 && (
        <>
          <div className="br-sec-hd">🔒 รอข้อมูล/ลำดับก่อนหน้า ({locked.length})</div>
          <div className="br-locked">
            {locked.map(({ item }) => {
              const req = item.requires ? AGENDA.find((a) => a.id === item.requires) : null;
              return (
                <div className="br-locked-row" key={item.id}>
                  <span className="br-locked-title">{item.title}</span>
                  <span className="br-locked-hint">
                    {req ? `รออนุมัติ "${req.title}" ก่อน` : 'รอข้อมูลให้พร้อม'}
                    {item.goto && <button className="br-goto-sm" onClick={() => onNavigate(item.goto as PageId)}>เตรียมข้อมูล →</button>}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
