import { useMemo, useState } from 'react';
import { G_CHANNELS, type GChannelId } from '../lib/growthEconomics';
import { buildUtmUrl, presetFor } from '../lib/utmBuilder';
import { track } from '../lib/analytics';

/* UtmBuilder — สร้างลิงก์ติด utm ต่อช่องทาง (ให้ "ติด utm ทุกโพสต์" ทำได้ง่าย ไม่พลาด)
 * ค่า utm map กับ attribution → ยอดสมัครลงช่องถูกใน Growth Dashboard อัตโนมัติ */

const ORIGIN = 'https://ceoaithailand.org';
const TARGETS = [{ path: '/', label: 'หน้าแรก (/)' }, { path: '/start', label: 'เริ่มใช้งาน (/start)' }, { path: '/b', label: 'Marketplace (/b)' }];

export default function UtmBuilder() {
  const [ch, setCh] = useState<GChannelId>('youtube');
  const [campaign, setCampaign] = useState('');
  const [target, setTarget] = useState('/start');
  const [customSource, setCustomSource] = useState('');
  const [copied, setCopied] = useState(false);

  const preset = presetFor(ch);
  const source = ch === 'other' ? customSource : preset.source;
  const url = useMemo(
    () => buildUtmUrl(ORIGIN + target, { source, medium: preset.medium, campaign }),
    [target, source, preset.medium, campaign],
  );

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); track('utm_copied', { channel: ch }); setTimeout(() => setCopied(false), 1800); } catch { /* empty */ }
  };

  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--sand)', background: 'var(--cream)', color: 'var(--ink)', fontFamily: 'inherit', fontSize: 13 };
  const lbl: React.CSSProperties = { fontSize: 12, color: 'var(--ink3)', display: 'block', marginBottom: 3 };

  return (
    <div style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: '16px 18px', background: 'var(--cream2)', display: 'grid', gap: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>🔗 สร้างลิงก์ติด UTM — ก็อปไปโพสต์แต่ละช่องทาง</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <div>
          <label style={lbl}>ช่องทาง</label>
          <select value={ch} onChange={e => setCh(e.target.value as GChannelId)} style={inp}>
            {G_CHANNELS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
        </div>
        {ch === 'other' && (
          <div>
            <label style={lbl}>source (กำหนดเอง)</label>
            <input value={customSource} onChange={e => setCustomSource(e.target.value)} placeholder="เช่น tiktok" style={inp} />
          </div>
        )}
        <div>
          <label style={lbl}>แคมเปญ (utm_campaign)</label>
          <input value={campaign} onChange={e => setCampaign(e.target.value)} placeholder="เช่น ep1, promo-aug" style={inp} />
        </div>
        <div>
          <label style={lbl}>ปลายทาง</label>
          <select value={target} onChange={e => setTarget(e.target.value)} style={inp}>
            {TARGETS.map(t => <option key={t.path} value={t.path}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {!preset.taggable ? (
        <div style={{ fontSize: 12.5, color: 'var(--amber)', background: 'var(--cream)', border: '1px solid var(--sand)', borderRadius: 8, padding: '10px 12px' }}>
          ⚠️ {preset.note} — โพสต์ลิงก์ธรรมดา <b style={{ color: 'var(--ink)' }}>{ORIGIN + target}</b> ได้เลย
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{ flex: '1 1 260px', fontSize: 12.5, color: 'var(--ink)', background: 'var(--cream)', border: '1px solid var(--sand)', borderRadius: 8, padding: '9px 11px', wordBreak: 'break-all' }}>{url}</code>
            <button onClick={copy} style={{ background: 'var(--accent)', color: '#fff', border: 0, borderRadius: 8, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอก'}
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>
            คนที่สมัครจากลิงก์นี้จะถูกนับเข้าช่องทาง “{G_CHANNELS.find(c => c.id === ch)?.label}” อัตโนมัติในตาราง Unit Economics ด้านล่าง
          </div>
        </>
      )}
    </div>
  );
}
