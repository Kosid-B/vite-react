import { useMemo, useState } from 'react';
import {
  parseNumbers, buildReply, REPLY_NEED_NUMBERS, KEYWORD_OFFERS, dmForKeyword,
  type ReplyChannel,
} from '../../lib/commentReply';
import { shortLinkTarget, SHORT_LINKS } from '../../lib/shortLinks';

/* CommentReplyTab — เครื่องมือตอบคอมเมนต์เฟซบุ๊กให้เร็วและไม่คำนวณผิด
 *
 * ทำไมต้องมี: กลไก "ให้คนพิมพ์ราคา/ต้นทุนในคอมเมนต์ แล้วเราตอบด้วยตัวเลขจริงของเขา"
 *   จะได้ผลก็ต่อเมื่อตอบได้เร็วและถูกทุกครั้ง — ตอบมือ 90+ คอมเมนต์ = คำนวณผิดแน่นอน
 *   และคำนวณผิดในที่สาธารณะเสียความน่าเชื่อถือหนักกว่าไม่ตอบเลย
 *
 * ตรรกะทั้งหมดอยู่ใน lib/commentReply.ts (pure, tested) — หน้านี้เป็นแค่ที่วางกับปุ่มคัดลอก */

function CopyBox({ label, text, hint }: { label: string; text: string; hint?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ border: '1px solid var(--sand)', borderRadius: 10, background: 'var(--cream)', padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink3)' }}>{label}</span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }, () => { /* คลิปบอร์ดไม่ให้สิทธิ์ — ผู้ใช้เลือกข้อความเองได้ */ });
          }}
          style={{
            background: copied ? '#16a34a' : '#0891b2', color: '#fff', border: 0, borderRadius: 8,
            padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอก'}
        </button>
      </div>
      <pre style={{
        margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        fontFamily: 'inherit', fontSize: 13, lineHeight: 1.7, color: 'var(--ink)',
      }}>{text}</pre>
      {hint && <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

export default function CommentReplyTab() {
  const [raw, setRaw] = useState('');
  const [channel, setChannel] = useState<ReplyChannel>('comment');

  const parsed = useMemo(() => parseNumbers(raw), [raw]);
  // ลิงก์เต็มพร้อม UTM ของเฟซบุ๊ก — ใช้เฉพาะตอนตอบในแชท (คอมเมนต์ห้ามมีลิงก์)
  const link = useMemo(() => {
    const sl = SHORT_LINKS['/ราคา'];
    return sl ? shortLinkTarget(sl, 'https://ceoaithailand.org', '?s=fb') : '';
  }, []);
  const reply = useMemo(
    () => (parsed ? buildReply(parsed, { channel, link }) : REPLY_NEED_NUMBERS),
    [parsed, channel, link],
  );

  const input: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--sand)', background: 'var(--cream)', color: 'var(--ink)',
    fontFamily: 'inherit', fontSize: 14,
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
          💬 ตอบคอมเมนต์ด้วยตัวเลขจริงของเขา
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink3)', lineHeight: 1.7 }}>
          วางคอมเมนต์ที่เขาพิมพ์มา → ได้คำตอบที่คำนวณจากโมดูลเดียวกับหน้าเว็บ ตัวเลขตรงกันเสมอ<br />
          <b>คอมเมนต์ห้ามมีลิงก์</b> — เฟซบุ๊กลดการมองเห็นโพสต์ที่พาคนออกนอก · ดึงเข้าแชทแล้วค่อยส่งลิงก์
        </p>
      </div>

      <div style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: 14, background: 'var(--cream2)', display: 'grid', gap: 12 }}>
        <label>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink3)', marginBottom: 5 }}>
            วางคอมเมนต์ที่เขาพิมพ์ (เช่น “50/30” · “ขาย 1,500 ทุน 900”)
          </div>
          <input style={input} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="50/30" autoFocus />
        </label>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['comment', 'dm'] as ReplyChannel[]).map((c) => (
            <button
              key={c}
              onClick={() => setChannel(c)}
              style={{
                padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5,
                border: `1px solid ${channel === c ? '#0891b2' : 'var(--sand)'}`,
                background: channel === c ? 'rgba(8,145,178,.12)' : 'var(--cream)',
                color: channel === c ? '#0e7490' : 'var(--ink)', fontWeight: channel === c ? 700 : 400,
              }}
            >
              {c === 'comment' ? '💬 ตอบในคอมเมนต์ (ไม่มีลิงก์)' : '📨 ตอบในแชท (มีลิงก์)'}
            </button>
          ))}
        </div>

        {parsed?.suspectSwapped && (
          <div style={{ border: '1px solid #f59e0b', borderRadius: 10, padding: '8px 12px', background: 'rgba(245,158,11,.10)', fontSize: 12.5, lineHeight: 1.6 }}>
            ⚠️ ต้นทุนมากกว่าราคา — ระบบจะถามกลับแทนการคำนวณ (เขาอาจพิมพ์สลับ)
          </div>
        )}

        <CopyBox
          label={parsed ? 'คำตอบ (คัดลอกไปวางได้เลย)' : 'ยังอ่านตัวเลขไม่ออก — ใช้ข้อความนี้ถามกลับ'}
          text={reply}
          hint={parsed ? undefined : 'ต้องมีตัวเลขอย่างน้อย 2 ตัว ระบบถึงจะคำนวณให้ — ห้ามเดาแทนเขา'}
        />
      </div>

      {/* โพสต์แบบคอมเมนต์คำเดียว → ทักกลับพร้อมลิงก์ */}
      <div style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: 14, background: 'var(--cream2)', display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>
          🔑 ข้อความทักกลับ เมื่อเขาคอมเมนต์คำเดียว
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.7 }}>
          ทุกลิงก์ติด <code>?s=fb</code> แล้ว — ในแผง Landing Funnel จะแยกได้ว่าคนกลุ่มนี้มาจากเฟซบุ๊ก
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {KEYWORD_OFFERS.map((o) => (
            <CopyBox key={o.keyword} label={`พิมพ์ว่า “${o.keyword}” → ${o.gives}`} text={dmForKeyword(o)} />
          ))}
        </div>
      </div>
    </div>
  );
}
