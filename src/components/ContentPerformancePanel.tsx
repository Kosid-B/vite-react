import {
  bySource, byCampaign, byContent, untaggedPct, contentVerdict, MIN_PER_CONTENT,
  type ContentRow,
} from '../lib/contentPerformance';
import type { LandingAgg } from '../lib/landingFunnel';

/* แผง "คอนเทนต์ชิ้นไหนพาคนมา" — คำถามเดียวที่การตลาดต้องตอบให้ได้
 *
 * เดิมระบบตอบได้แค่ "มาจากโซเชียล" เพราะ landing_funnel ทิ้ง utm ทิ้งไป (แก้ที่ 0062)
 * ตอนนี้ตอบได้ถึงระดับ "คลิปไหน" — และบอกตรง ๆ เมื่อยังสรุปไม่ได้ */

function Table({ title, sub, rows, empty }: { title: string; sub: string; rows: ContentRow[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 14px', background: 'var(--cream)' }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{title}</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginBottom: 8 }}>{sub}</div>
      {rows.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink3)' }}>{empty}</div>}
      <div style={{ display: 'grid', gap: 7 }}>
        {rows.map((r) => {
          const thin = r.total < MIN_PER_CONTENT;
          return (
            <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ width: 118, flex: 'none', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
              <div style={{ flex: 1, height: 12, borderRadius: 4, background: 'var(--cream2)', overflow: 'hidden' }}>
                <div style={{ width: `${(r.total / max) * 100}%`, height: '100%', background: thin ? '#94a3b8' : '#0891b2', borderRadius: 4 }} />
              </div>
              <span style={{ width: 40, textAlign: 'right', flex: 'none', color: 'var(--ink3)' }}>{r.total}</span>
              {/* ปริมาณไม่ใช่คำตอบ — % ที่กด CTA คือคุณภาพของทราฟฟิกจากชิ้นนั้น */}
              <span style={{ width: 74, textAlign: 'right', flex: 'none', color: thin ? 'var(--ink3)' : '#16a34a', fontWeight: thin ? 400 : 700 }}>
                CTA {r.ctaPct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ContentPerformancePanel({ landing }: { landing: LandingAgg | null }) {
  const verdict = contentVerdict(landing);
  const untag = untaggedPct(landing);

  return (
    <div style={{ border: '1px solid #0891b2', borderRadius: 12, padding: '16px 18px', background: 'rgba(8,145,178,0.06)', display: 'grid', gap: 12 }}>
      <div>
        <h3 style={{ margin: '0 0 3px', fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
          📣 คอนเทนต์ชิ้นไหนพาคนมา
        </h3>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--ink3)', lineHeight: 1.7 }}>
          อ่านจากแท็กที่เราติดไว้ในลิงก์เอง (<code>?s=</code> / <code>c=</code>) — ไม่ใช่การเดาจาก referrer
        </p>
      </div>

      <div style={{
        fontSize: 12.5, lineHeight: 1.7, padding: '9px 12px', borderRadius: 9,
        border: `1px solid ${verdict.ready ? '#16a34a' : '#b45309'}`,
        background: verdict.ready ? 'rgba(22,163,74,0.08)' : 'rgba(180,83,9,0.08)',
        color: verdict.ready ? '#166534' : '#92400e', fontWeight: 700,
      }}>
        {verdict.ready ? '📊 ' : '⏳ '}{verdict.message}
      </div>

      {untag >= 50 && (
        <div style={{ fontSize: 12, color: '#b45309', lineHeight: 1.7 }}>
          ⚠️ <b>{untag}%</b> ของผู้เข้าชมมาแบบไม่ติดแท็ก — ยิ่งสูง ยิ่งตอบไม่ได้ว่าอะไรได้ผล
          <br />แก้ที่ต้นทาง: ใช้ลิงก์สั้นที่มี <code>?s=</code> ทุกครั้งที่โพสต์ (ดู <code>SHORT_LINKS</code> + LINK-SHEET)
        </div>
      )}

      <Table
        title="แพลตฟอร์ม" sub="มาจากช่องทางไหน"
        rows={bySource(landing)} empty="ยังไม่มีใครมาจากลิงก์ที่ติดแท็ก"
      />
      <Table
        title="หัวข้อ / บทความ" sub="ลิงก์สั้นตัวไหนถูกกด"
        rows={byCampaign(landing)} empty="ยังไม่มีข้อมูล"
      />
      <Table
        title="ชิ้นงานย่อย" sub="แยกคลิปต่อคลิปในหัวข้อเดียวกัน (c=)"
        rows={byContent(landing)} empty="ยังไม่ได้ใส่ c= ในลิงก์"
      />

      <div style={{ fontSize: 11.5, color: 'var(--ink3)', lineHeight: 1.7 }}>
        แถบสีเทา = ยังไม่ถึง {MIN_PER_CONTENT} คน · เทียบ % กันยังไม่ได้ (คนเดียวขยับได้หลายสิบเปอร์เซ็นต์)
      </div>
    </div>
  );
}
