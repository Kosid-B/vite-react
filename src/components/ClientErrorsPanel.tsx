import { useEffect, useState } from 'react';
import {
  loadClientErrors, rankedGroups, severityOf, activeBugCount, errorCaveats,
  SEVERITY_LABEL, SEVERITY_COLOR, type ClientErrorAgg, type ErrorGroup,
} from '../lib/clientErrors';

/* แผง "ผู้ใช้เจออะไรพัง" — ตอบคำถามที่ GA4 ตอบไม่ได้
 * GA บอกได้แค่จำนวน js_error · ตัวข้อความอยู่ใน Cloudflare Workers Logs ซึ่งเก็บไม่กี่วัน
 * แผงนี้อ่านจากตาราง client_errors (0058) = ความจำระยะยาวของเรา
 * โหลดข้อมูลเอง ไม่พึ่ง load() ของ GrowthDashboard — แผง error ต้องไม่ล้มพร้อมแผงอื่น */

function short(s: string, n: number) { return s.length > n ? s.slice(0, n) + '…' : s; }

function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} ชม.ที่แล้ว`;
  return `${Math.round(h / 24)} วันที่แล้ว`;
}

function GroupRow({ g }: { g: ErrorGroup }) {
  const sev = severityOf(g);
  return (
    <details style={{ border: '1px solid var(--sand)', borderRadius: 10, background: 'var(--cream)', padding: '10px 12px' }}>
      <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: '#fff', background: SEVERITY_COLOR[sev],
          borderRadius: 999, padding: '2px 8px', flex: 'none',
        }}>{SEVERITY_LABEL[sev]}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{g.count} ครั้ง</span>
        <span style={{ fontSize: 12.5, color: 'var(--ink2)', flex: 1, minWidth: 180 }}>{short(g.message, 90)}</span>
        <span style={{ fontSize: 11.5, color: 'var(--ink3)', flex: 'none' }}>{timeAgo(g.last_seen)}</span>
      </summary>
      <div style={{ marginTop: 10, display: 'grid', gap: 6, fontSize: 12.5, color: 'var(--ink2)' }}>
        <div><b>ที่มา:</b> {g.source} {g.path && <>· <b>หน้า:</b> {g.path}</>}</div>
        {g.ua && <div><b>เบราว์เซอร์:</b> {short(g.ua, 120)}</div>}
        <div><b>เจอครั้งแรก:</b> {timeAgo(g.first_seen)}</div>
        {g.stack && (
          <pre style={{
            margin: 0, padding: 10, borderRadius: 8, background: '#0f172a', color: '#cbd5e1',
            fontSize: 11, lineHeight: 1.55, overflowX: 'auto', whiteSpace: 'pre-wrap',
          }}>{g.stack}</pre>
        )}
      </div>
    </details>
  );
}

export default function ClientErrorsPanel() {
  const [agg, setAgg] = useState<ClientErrorAgg | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr(null);
    loadClientErrors(days)
      .then(d => { if (alive) { setAgg(d); if (!d) setErr('อ่านไม่ได้ (ต้องเป็นแอดมิน และต้อง apply migration 0058 แล้ว)'); } })
      .catch(e => { if (alive) setErr(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days]);

  const groups = rankedGroups(agg);
  const active = activeBugCount(agg);

  return (
    <div style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: '16px 18px', background: 'var(--cream2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>🐞 ผู้ใช้เจออะไรพัง</h3>
        <select
          value={days} onChange={e => setDays(Number(e.target.value))}
          style={{ fontSize: 12, padding: '3px 6px', borderRadius: 8, border: '1px solid var(--sand)', background: 'var(--cream)', color: 'var(--ink)' }}
        >
          <option value={7}>7 วัน</option>
          <option value={30}>30 วัน</option>
          <option value={90}>90 วัน</option>
        </select>
        {loading && <span style={{ fontSize: 12, color: 'var(--ink3)' }}>กำลังโหลด…</span>}
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.6 }}>
        GA4 บอกได้แค่ว่ามี error กี่ครั้ง — ตรงนี้บอกว่า <b>พังเพราะอะไร หน้าไหน และยังเกิดอยู่ไหม</b>
      </p>

      {err && <div style={{ fontSize: 12.5, color: '#dc2626' }}>{err}</div>}

      {agg && (
        <>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: active > 0 ? '#dc2626' : '#16a34a', lineHeight: 1.1 }}>{active}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>บั๊กที่ยังเกิดอยู่ (48 ชม.)</div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.1 }}>{agg.total}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>ทั้งหมดใน {agg.days} วัน</div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.1 }}>{groups.length}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>กลุ่มบั๊กที่ต่างกัน</div>
            </div>
          </div>

          {groups.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--ink3)' }}>ยังไม่มี error ในช่วงนี้ 🎉</div>
            : <div style={{ display: 'grid', gap: 8 }}>{groups.map(g => <GroupRow key={g.fingerprint} g={g} />)}</div>}

          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--ink3)' }}>ตัวเลขนี้บอกอะไรไม่ได้บ้าง</summary>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--ink3)', lineHeight: 1.7 }}>
              {errorCaveats(agg).map(c => <li key={c}>{c}</li>)}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
