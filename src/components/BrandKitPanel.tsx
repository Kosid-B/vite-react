import { useMemo, useState } from 'react';
import type { AppData } from '../types';
import { buildBrandKit } from '../lib/brandKit';

/* 🎨 Brand Guidelines ต่อบริษัทของผู้ใช้ — พาเลตสี + คู่ฟอนต์ไทย + แนวทางใช้โลโก้
 * ต่อยอดจากชื่อ+โลโก้ที่บอร์ดเลือก (companyIdentity) · ของ user (ไม่ใช่แบรนด์ Anthropic) */
export default function BrandKitPanel({ data }: { data: AppData }) {
  const c = data.aiCompany;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState('');
  const kit = useMemo(() => buildBrandKit(c?.name ?? '', c?.industry), [c?.name, c?.industry]);

  function copy(v: string) {
    navigator.clipboard?.writeText(v).then(() => { setCopied(v); setTimeout(() => setCopied(''), 1500); });
  }

  if (!c?.name?.trim()) return null; // ต้องมีชื่อบริษัทก่อน

  return (
    <div className="bk-box">
      <button className="bk-toggle" onClick={() => setOpen(o => !o)}>
        🎨 Brand Guidelines ของ {c.name} (สี · ฟอนต์ · โลโก้)
        <span className="bk-caret">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="bk-panel">
          <div className="bk-logo-row">
            <div className="bk-logo" dangerouslySetInnerHTML={{ __html: kit.logoSvg }} />
            <div className="bk-fonts">
              <div className="bk-font"><span className="bk-font-role">หัวข้อ</span> <b style={{ fontFamily: kit.fonts.heading }}>{kit.fonts.heading}</b></div>
              <div className="bk-font"><span className="bk-font-role">เนื้อหา</span> <b style={{ fontFamily: kit.fonts.body }}>{kit.fonts.body}</b></div>
              <div className="bk-font-note">{kit.fonts.note}</div>
            </div>
          </div>

          <div className="bk-swatches">
            {kit.palette.swatches.map(s => (
              <button key={s.name} className="bk-swatch" onClick={() => copy(s.value)} title="คลิกเพื่อคัดลอก">
                <span className="bk-chip" style={{ background: s.value }} />
                <span className="bk-sw-name">{s.name}</span>
                <span className="bk-sw-val">{copied === s.value ? '✓ คัดลอก' : s.value}</span>
                <span className="bk-sw-role">{s.role}</span>
              </button>
            ))}
          </div>

          <ul className="bk-guides">
            {kit.guidelines.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
          <div className="bk-note">💡 ใช้เป็นแนวทางแบรนด์ให้สม่ำเสมอทุกช่องทาง (หน้าร้าน โซเชียล เอกสาร) · ฟอนต์ไทยจาก Google Fonts</div>
        </div>
      )}
    </div>
  );
}
