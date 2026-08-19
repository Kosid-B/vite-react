import { useEffect, useMemo, useState } from 'react';
import {
  reachRows, reachAdvice, type PlatformReach, type LinkPlacement, type ReachRow,
} from '../lib/reachFunnel';
import type { LandingAgg } from '../lib/landingFunnel';

/* แผง "วิวบนแพลตฟอร์ม → คนมาถึงเว็บ" — ขั้นที่หายไปของ funnel
 *
 * เดิมเรามีตัวเลขสองฝั่งแยกกันคนละที่ (ยอดวิวอยู่ในแอป TikTok/YT · คนเข้าเว็บอยู่ใน DB เรา)
 * จึงตัดสินใจจาก "ยอดวิว" ตลอด ทั้งที่ยอดวิวไม่ใช่ผลลัพธ์
 *
 * ⚠️ ช่องวิว/เข้าโปรไฟล์ = **กรอกเอง** (เก็บในเครื่องนี้เท่านั้น ไม่ขึ้น DB)
 *    เพราะยังไม่ได้ต่อ Windsor.ai · พอต่อแล้วช่องพวกนี้จะดึงอัตโนมัติ
 *    ช่อง "มาถึงเว็บ" ดึงจาก landing_funnel จริงเสมอ — แก้มือไม่ได้โดยตั้งใจ
 */

const KEY = 'ceoai_reach_manual';

interface Manual { views: number; profileVisits: number | null; placement: LinkPlacement }

const PLATFORMS: { id: string; label: string; utm: string; defaultPlacement: LinkPlacement }[] = [
  { id: 'tiktok', label: 'TikTok', utm: 'tiktok', defaultPlacement: 'bio' },
  { id: 'youtube', label: 'YouTube', utm: 'youtube', defaultPlacement: 'comment' },
  { id: 'facebook', label: 'Facebook', utm: 'facebook', defaultPlacement: 'comment' },
  { id: 'instagram', label: 'Instagram', utm: 'instagram', defaultPlacement: 'bio' },
];

function readManual(): Record<string, Manual> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, Manual>; }
  catch { return {}; }
}

const CEIL_COLOR: Record<ReachRow['ceiling'], string> = {
  to_profile: '#dc2626', to_click: '#d97706', to_view: '#94a3b8', none: '#16a34a', unknown: '#94a3b8',
};

export default function ReachFunnelPanel({ landing }: { landing: LandingAgg | null }) {
  const [manual, setManual] = useState<Record<string, Manual>>({});
  useEffect(() => { setManual(readManual()); }, []);

  function set(id: string, patch: Partial<Manual>) {
    setManual((m) => {
      const blank: Manual = { views: 0, profileVisits: null, placement: 'unknown' };
      const next = { ...m, [id]: { ...blank, ...m[id], ...patch } };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* empty */ }
      return next;
    });
  }

  const rows = useMemo(() => {
    const list: PlatformReach[] = PLATFORMS.map((p) => {
      const m = manual[p.id];
      return {
        platform: p.id,
        label: p.label,
        views: m?.views ?? 0,
        profileVisits: m?.profileVisits ?? null,
        // ⬇️ ข้อมูลจริงจากฐานข้อมูลเรา — ไม่ให้แก้มือ
        arrivals: landing?.by_utm_source?.[p.utm]?.total ?? 0,
        linkPlacement: m?.placement ?? p.defaultPlacement,
      };
    }).filter((p) => p.views > 0 || p.arrivals > 0);
    return reachRows(list);
  }, [manual, landing]);

  return (
    <div style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: '16px 18px', background: 'var(--cream2)' }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
        📡 วิวบนแพลตฟอร์ม → คนมาถึงเว็บ
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3, marginBottom: 12, lineHeight: 1.7 }}>
        ยอดวิวไม่ใช่ผลลัพธ์ — สิ่งที่ตัดสินใจได้คือ "วิวแปลงเป็นคนมาถึงเว็บกี่ %" และ<b style={{ color: 'var(--ink)' }}>ขั้นไหนที่ตัน</b>
        <br />กรอกยอดวิว/เข้าโปรไฟล์เอง (เก็บในเครื่องนี้) · ช่อง "มาถึงเว็บ" ดึงจากฐานข้อมูลจริง แก้ไม่ได้
      </div>

      {/* 🔴 ต้องเตือนตรงนี้ ไม่งั้นแผงนี้จะโกหกโดยการละเว้น:
          landing_funnel เก็บเฉพาะหน้า Landing (LandingPage.tsx เรียก useLandingTrace ที่เดียว)
          แต่ลิงก์การตลาดทุกอันของเราชี้ไป /blog/* ⇒ ช่อง "มาถึงเว็บ" จะเป็น 0 แม้มีคนเข้าจริง
          false negative อันตรายกว่าไม่มีตัวเลขเลย เพราะอ่านได้ว่า "คอนเทนต์ไม่ได้ผล" */}
      <div style={{
        border: '1px solid #dc2626', borderRadius: 10, padding: '9px 12px',
        background: 'var(--cream)', fontSize: 11.5, color: 'var(--ink3)', lineHeight: 1.65, marginBottom: 12,
      }}>
        🔴 <b style={{ color: 'var(--ink)' }}>ช่อง &quot;มาถึงเว็บ&quot; ยังนับไม่ครบ</b> — ฐานข้อมูลของเรา (landing_funnel)
        เก็บเฉพาะคนที่เข้า <b>หน้าแรก/หน้า Landing</b> ไม่เก็บหน้าบทความ <b>/blog/*</b>
        <br />แต่ลิงก์การตลาดทุกอัน (/ราคา /ทุน /ลูกค้า …) พาไปที่บทความ ⇒ ช่องนี้ขึ้น 0 แม้มีคนเข้าจริง
        <br />ตัวเลขจริงของบทความตอนนี้อยู่ใน <b>GA4 เท่านั้น</b> (รายงาน Pages → /blog/…)
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {PLATFORMS.map((p) => {
          const m = manual[p.id];
          const arrivals = landing?.by_utm_source?.[p.utm]?.total ?? 0;
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, flexWrap: 'wrap' }}>
              <span style={{ width: 76, flex: 'none', color: 'var(--ink)', fontWeight: 600 }}>{p.label}</span>
              <input
                type="number" placeholder="วิว" value={m?.views ?? ''}
                onChange={(e) => set(p.id, { views: Number(e.target.value) || 0 })}
                style={{ width: 82, padding: '4px 7px', fontSize: 12, border: '1px solid var(--sand)', borderRadius: 6, background: 'var(--cream)' }}
              />
              <input
                type="number" placeholder="เข้าโปรไฟล์" value={m?.profileVisits ?? ''}
                onChange={(e) => set(p.id, { profileVisits: e.target.value === '' ? null : Number(e.target.value) })}
                style={{ width: 96, padding: '4px 7px', fontSize: 12, border: '1px solid var(--sand)', borderRadius: 6, background: 'var(--cream)' }}
              />
              <select
                value={m?.placement ?? p.defaultPlacement}
                onChange={(e) => set(p.id, { placement: e.target.value as LinkPlacement })}
                style={{ padding: '4px 6px', fontSize: 11.5, border: '1px solid var(--sand)', borderRadius: 6, background: 'var(--cream)' }}
              >
                <option value="bio">ลิงก์ในไบโอ</option>
                <option value="comment">ลิงก์ในคอมเมนต์</option>
                <option value="description">ลิงก์ในคำบรรยาย</option>
                <option value="unknown">ไม่ทราบ</option>
              </select>
              <span style={{ color: 'var(--ink3)', fontSize: 11.5 }}>→ มาถึงเว็บ <b style={{ color: 'var(--ink)' }}>{arrivals}</b></span>
            </div>
          );
        })}
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'grid', gap: 7, marginTop: 12 }}>
          {rows.map((r) => (
            <div key={r.platform} style={{ borderLeft: `3px solid ${CEIL_COLOR[r.ceiling]}`, paddingLeft: 10, fontSize: 11.5, color: 'var(--ink3)', lineHeight: 1.65 }}>
              <b style={{ color: 'var(--ink)' }}>{r.label}</b> — {r.verdict}
            </div>
          ))}
          <div style={{ marginTop: 5, border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 13px', background: 'var(--cream)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>ทุ่มแรงไปทางไหน</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink)', marginTop: 4, lineHeight: 1.7 }}>{reachAdvice(rows)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
