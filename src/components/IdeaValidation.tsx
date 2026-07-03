import { useEffect, useState } from 'react';
import { listLeads, VALIDATION_TARGET, type Lead } from '../lib/leads';

/** 🧪 พิสูจน์ไอเดียก่อนลงทุนสร้าง — แผงผลบนหน้าร้านของฉัน
 *  "คนส่วนใหญ่สร้างสินค้าโดยไม่รู้ว่ามีลูกค้าจริงพร้อมจ่ายหรือเปล่า"
 *  → เผยแพร่หน้าร้านก่อนมีของ แชร์ลิงก์ วัดคนสั่งจอง/สนใจจริง แล้วค่อยตัดสินใจสร้าง */

interface Props {
  slug: string;
  publicUrl: string;
}

const KIND_LABEL = { preorder: '🛒 สั่งจอง', interest: '👀 สนใจ' };

export default function IdeaValidation({ slug, publicUrl }: Props) {
  const [leads, setLeads] = useState<Lead[] | null>(null);

  useEffect(() => {
    listLeads(slug).then(setLeads).catch(() => setLeads([]));
  }, [slug]);

  if (leads === null) return null;
  const preorders = leads.filter(l => l.kind === 'preorder').length;
  const pct = Math.min(100, Math.round((leads.length / VALIDATION_TARGET) * 100));
  const validated = leads.length >= VALIDATION_TARGET;

  return (
    <div className="ivp">
      <div className="ivp-title">🧪 พิสูจน์ไอเดีย — มีลูกค้าพร้อมจ่ายจริงไหม?</div>
      <p className="ivp-sub">
        อย่าเพิ่งลงทุนสร้างเต็มตัว — แชร์ลิงก์หน้าร้านนี้ให้กลุ่มเป้าหมาย
        แล้ววัดจากคนที่<b>ยอมทิ้งช่องทางติดต่อจริง</b> ไม่ใช่แค่คำชม
      </p>

      <div className="ivp-stat-row">
        <div className="ivp-stat"><b>{leads.length}</b><span>ผู้สนใจทั้งหมด</span></div>
        <div className="ivp-stat"><b>{preorders}</b><span>สั่งจองล่วงหน้า</span></div>
        <div className="ivp-stat"><b>{VALIDATION_TARGET}</b><span>เป้าพิสูจน์ไอเดีย</span></div>
      </div>
      <div className="ivp-bar"><div className="ivp-bar-fill" style={{ width: `${pct}%` }} /></div>

      <div className={`ivp-verdict${validated ? ' pass' : ''}`}>
        {validated
          ? `✅ ผ่านเกณฑ์! มีผู้สนใจ ${leads.length} คน (สั่งจอง ${preorders}) — ความต้องการจริงมีอยู่ ลุยสร้าง/สต๊อกของได้เลย แล้วรีบติดต่อกลับทุกคนก่อนเขาเปลี่ยนใจ`
          : leads.length > 0
            ? `กำลังทดสอบ — ได้ ${leads.length}/${VALIDATION_TARGET} คน · เก็บให้ถึงเป้าก่อนตัดสินใจลงทุนใหญ่ (แชร์ลิงก์ใน LINE กลุ่ม/Facebook กลุ่มที่ลูกค้าเป้าหมายอยู่)`
            : `ยังไม่มีผู้สนใจ — เริ่มทดสอบวันนี้: แชร์ลิงก์ ${publicUrl} ให้คนที่น่าจะเป็นลูกค้า 20–30 คน ถ้าไม่มีใครทิ้งช่องทางติดต่อเลย = สัญญาณให้ปรับไอเดียก่อนสร้าง`}
      </div>

      {leads.length > 0 && (
        <div className="ivp-leads">
          {leads.slice(0, 8).map(l => (
            <div key={l.id} className="ivp-lead">
              <span className="ivp-lead-kind">{KIND_LABEL[l.kind]}</span>
              <b>{l.name || 'ไม่ระบุชื่อ'}</b> — {l.contact}
              {l.note && <span className="ivp-lead-note"> · {l.note}</span>}
            </div>
          ))}
          {leads.length > 8 && <div className="ivp-more">…และอีก {leads.length - 8} คน</div>}
        </div>
      )}
    </div>
  );
}
