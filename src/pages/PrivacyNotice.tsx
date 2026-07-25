import { useState } from 'react';
import { track } from '../lib/analytics';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import {
  buildDraft, privacySystemPrompt, privacyUserPrompt,
  type PrivacyInput, type DocType,
} from '../lib/privacyNotice';

const DATA_OPTIONS = ['ชื่อ-นามสกุล', 'เบอร์โทรศัพท์', 'อีเมล', 'ที่อยู่', 'เลขบัตรประชาชน', 'ข้อมูลการชำระเงิน', 'พฤติกรรมการใช้งาน/คุกกี้'];
const PURPOSE_OPTIONS = ['ติดต่อและให้บริการลูกค้า', 'ดำเนินการตามคำสั่งซื้อ/สัญญา', 'ส่งข่าวสาร/โปรโมชัน', 'สะสมแต้ม/สมาชิก', 'วิเคราะห์และพัฒนาบริการ', 'ปฏิบัติตามกฎหมาย'];

function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter(x => x !== v) : [...list, v];
}

export default function PrivacyNotice() {
  const [docType, setDocType] = useState<DocType>('privacy');
  const [bizName, setBizName] = useState('');
  const [bizType, setBizType] = useState('');
  const [website, setWebsite] = useState('');
  const [dataCollected, setDataCollected] = useState<string[]>(['ชื่อ-นามสกุล', 'เบอร์โทรศัพท์', 'อีเมล']);
  const [purposes, setPurposes] = useState<string[]>(['ติดต่อและให้บริการลูกค้า']);
  const [thirdParties, setThirdParties] = useState('');
  const [retention, setRetention] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [modelUsed, setModelUsed] = useState('');
  const [copied, setCopied] = useState(false);

  function currentInput(): PrivacyInput {
    return {
      bizName, bizType, website, dataCollected, purposes,
      thirdParties: thirdParties.split(',').map(s => s.trim()).filter(Boolean),
      retention, contactEmail, contactPhone, docType,
    };
  }

  async function generate(useAi: boolean) {
    const input = currentInput();
    if (!bizName.trim()) { setMsg('กรุณากรอกชื่อกิจการก่อน'); return; }
    setMsg(''); setCopied(false); setModelUsed('');

    // ออฟไลน์ / ไม่ใช้ AI → ร่างจากเทมเพลตทันที (ใช้ได้เสมอ)
    if (!useAi || !isSupabaseEnabled || !supabase) {
      setDraft(buildDraft(input));
      setModelUsed('เทมเพลต (ออฟไลน์)');
      track('privacy_draft_generated', { doc_type: docType, mode: 'template' });
      return;
    }

    // ใช้ AI ขัดเกลา (tier ไทย → Typhoon ถ้าตั้งไว้ ไม่งั้น Claude) · พังเมื่อไร fallback เทมเพลต
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('privacy-notice', {
        body: { system: privacySystemPrompt(), prompt: privacyUserPrompt(input) },
      });
      if (error || !res?.draft) throw new Error(error?.message || 'no_draft');
      setDraft(res.draft);
      setModelUsed(`AI: ${res.model ?? '-'}`);
      track('privacy_draft_generated', { doc_type: docType, mode: 'ai' });
    } catch {
      setDraft(buildDraft(input)); // fallback ไม่ให้ผู้ใช้มือเปล่า
      setModelUsed('เทมเพลต (AI ไม่พร้อม)');
      setMsg('AI ไม่พร้อม (ตรวจว่า deploy privacy-notice + ตั้ง ANTHROPIC_API_KEY) — ใช้ร่างเทมเพลตแทน');
      track('privacy_draft_generated', { doc_type: docType, mode: 'template_fallback' });
    } finally {
      setLoading(false);
    }
  }

  function copyDraft() {
    navigator.clipboard?.writeText(draft).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }
  function downloadDraft() {
    const blob = new Blob([draft], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docType === 'sop' ? 'SOP' : 'privacy-notice'}-${(bizName || 'draft').replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    track('privacy_draft_downloaded', { doc_type: docType });
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🔐 ตัวช่วยร่างเอกสาร PDPA</h1>
        <p className="page-meta">
          กรอกข้อมูลธุรกิจ → ได้ร่าง <b>ประกาศความเป็นส่วนตัว (Privacy Notice)</b> หรือ <b>SOP</b> ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
          {isSupabaseEnabled ? ' · ขัดเกลาด้วย AI ภาษาไทย' : ' · โหมดออฟไลน์: ร่างจากเทมเพลต'}
        </p>
      </div>

      <div className="pn-grid">
        {/* ── ฟอร์ม ── */}
        <div className="pn-card pn-form">
          <div>
            <div className="pn-lbl">ชนิดเอกสาร</div>
            <div className="pn-seg">
              <button className={`pn-btn ${docType === 'privacy' ? 'pn-btn-primary' : ''}`} onClick={() => setDocType('privacy')}>Privacy Notice</button>
              <button className={`pn-btn ${docType === 'sop' ? 'pn-btn-primary' : ''}`} onClick={() => setDocType('sop')}>SOP สิทธิเจ้าของข้อมูล</button>
            </div>
          </div>

          <div>
            <div className="pn-lbl">ชื่อกิจการ/องค์กร *</div>
            <input className="pn-input" value={bizName} onChange={e => setBizName(e.target.value)} placeholder="เช่น ร้านกาแฟดี" />
          </div>
          <div>
            <div className="pn-lbl">ประเภทธุรกิจ</div>
            <input className="pn-input" value={bizType} onChange={e => setBizType(e.target.value)} placeholder="เช่น ร้านค้าออนไลน์" />
          </div>
          <div>
            <div className="pn-lbl">เว็บไซต์/ช่องทาง</div>
            <input className="pn-input" value={website} onChange={e => setWebsite(e.target.value)} placeholder="เช่น example.com หรือ LINE @xxx" />
          </div>

          <div>
            <div className="pn-lbl">ข้อมูลที่เก็บ</div>
            <div className="pn-chips">
              {DATA_OPTIONS.map(o => (
                <button key={o} className={`pn-chip ${dataCollected.includes(o) ? 'on' : ''}`} onClick={() => setDataCollected(toggle(dataCollected, o))}>{o}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="pn-lbl">วัตถุประสงค์</div>
            <div className="pn-chips">
              {PURPOSE_OPTIONS.map(o => (
                <button key={o} className={`pn-chip ${purposes.includes(o) ? 'on' : ''}`} onClick={() => setPurposes(toggle(purposes, o))}>{o}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="pn-lbl">เปิดเผยให้บุคคลภายนอก (คั่นด้วย ,)</div>
            <input className="pn-input" value={thirdParties} onChange={e => setThirdParties(e.target.value)} placeholder="เช่น ขนส่ง, ผู้ให้บริการชำระเงิน" />
          </div>
          <div>
            <div className="pn-lbl">ระยะเวลาเก็บข้อมูล</div>
            <input className="pn-input" value={retention} onChange={e => setRetention(e.target.value)} placeholder="เช่น 2 ปีหลังสิ้นสุดการเป็นสมาชิก" />
          </div>
          <div className="pn-row">
            <div style={{ flex: 1 }}>
              <div className="pn-lbl">อีเมลติดต่อ</div>
              <input className="pn-input" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="privacy@..." />
            </div>
            <div style={{ flex: 1 }}>
              <div className="pn-lbl">เบอร์ติดต่อ</div>
              <input className="pn-input" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="08x-xxx-xxxx" />
            </div>
          </div>

          <div className="pn-row">
            <button className="pn-btn pn-btn-primary" onClick={() => generate(true)} disabled={loading} style={{ flex: 1 }}>
              {loading ? 'กำลังร่าง…' : (isSupabaseEnabled ? '✨ ร่างด้วย AI' : '📄 สร้างร่าง')}
            </button>
            {isSupabaseEnabled && (
              <button className="pn-btn" onClick={() => generate(false)} disabled={loading} title="ร่างจากเทมเพลต ไม่ใช้ AI">📄 เทมเพลต</button>
            )}
          </div>
          {msg && <div className="pn-warn">{msg}</div>}
        </div>

        {/* ── ผลลัพธ์ ── */}
        <div className="pn-card">
          <div className="pn-result-head">
            <div className="pn-lbl" style={{ margin: 0 }}>ร่างเอกสาร {modelUsed && <span className="pn-model">· {modelUsed}</span>}</div>
            {draft && (
              <div className="pn-row" style={{ margin: 0 }}>
                <button className="pn-btn" onClick={copyDraft}>{copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอก'}</button>
                <button className="pn-btn" onClick={downloadDraft}>⬇️ ดาวน์โหลด .md</button>
              </div>
            )}
          </div>
          {draft
            ? <textarea className="pn-input pn-draft" value={draft} onChange={e => setDraft(e.target.value)} spellCheck={false} />
            : <div className="pn-empty">กรอกข้อมูลด้านซ้าย แล้วกด “สร้างร่าง” — แก้ไขข้อความในกล่องนี้ได้ก่อนคัดลอก/ดาวน์โหลด</div>}
          <div className="pn-disclaimer">⚠️ เป็นร่างตั้งต้นตาม PDPA — ควรให้ที่ปรึกษา/นักกฎหมายตรวจทานก่อนใช้จริง</div>
        </div>
      </div>
    </div>
  );
}
