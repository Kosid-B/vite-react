import type { AppData, VrioItem } from '../types';
import { autoH } from '../utils';

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
}

type VerdictKey = 'disadvantage' | 'parity' | 'temporary' | 'unused' | 'sustained';

const VERDICT: Record<VerdictKey, { label: string; cls: string }> = {
  disadvantage: { label: 'เสียเปรียบ', cls: 'vd-dis' },
  parity: { label: 'เสมอตัว', cls: 'vd-par' },
  temporary: { label: 'ได้เปรียบชั่วคราว', cls: 'vd-tmp' },
  unused: { label: 'ได้เปรียบแต่ยังไม่ได้ใช้', cls: 'vd-unused' },
  sustained: { label: 'ได้เปรียบยั่งยืน', cls: 'vd-sus' },
};

function verdictOf(it: VrioItem): VerdictKey {
  if (!it.v) return 'disadvantage';
  if (!it.r) return 'parity';
  if (!it.i) return 'temporary';
  if (!it.o) return 'unused';
  return 'sustained';
}

const COLS: { key: keyof Pick<VrioItem, 'v' | 'r' | 'i' | 'o'>; letter: string; hd: string; tip: string }[] = [
  { key: 'v', letter: 'V', hd: 'Valuable', tip: 'สร้างคุณค่า/ลดต้นทุน หรือคว้าโอกาสได้จริงไหม' },
  { key: 'r', letter: 'R', hd: 'Rare', tip: 'หายากไหม — คู่แข่งน้อยรายเท่านั้นที่มี' },
  { key: 'i', letter: 'I', hd: 'Inimitable', tip: 'ลอกเลียนหรือหาสิ่งทดแทนได้ยาก/แพงไหม' },
  { key: 'o', letter: 'O', hd: 'Organized', tip: 'องค์กรพร้อมระบบ/คน/กระบวนการเก็บเกี่ยวคุณค่าไหม' },
];

export default function VRIO({ data, onUpdate }: Props) {
  const items = data.vrio;

  function saveField(id: string, field: 'resource' | 'note', value: string) {
    onUpdate({ ...data, vrio: items.map(it => it.id === id ? { ...it, [field]: value } : it) });
  }
  function toggle(id: string, key: 'v' | 'r' | 'i' | 'o') {
    onUpdate({ ...data, vrio: items.map(it => it.id === id ? { ...it, [key]: !it[key] } : it) });
  }
  function addItem() {
    onUpdate({ ...data, vrio: [...items, {
      id: 'vr-' + Date.now().toString(36), resource: 'ทรัพยากร/ความสามารถใหม่', note: 'อธิบายบริบท',
      v: false, r: false, i: false, o: false,
    }] });
  }
  function delItem(id: string) {
    onUpdate({ ...data, vrio: items.filter(it => it.id !== id) });
  }

  const counts = items.reduce((acc, it) => { acc[verdictOf(it)]++; return acc; },
    { disadvantage: 0, parity: 0, temporary: 0, unused: 0, sustained: 0 } as Record<VerdictKey, number>);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">VRIO Analysis</div>
        <div className="page-meta">
          <span className="meta-chip">{items.length} ทรัพยากร</span>
          <span className="meta-chip">เทียบ Paperclip vs ระบบเรา</span>
          <span className="law-badge" data-tip={'VRIO: ประเมินว่าทรัพยากรให้ความได้เปรียบแค่ไหน\nValuable → Rare → Inimitable → Organized\nครบ 4 = ได้เปรียบยั่งยืน'}>Barney VRIO</span>
        </div>
      </div>

      {/* คำอธิบายเกณฑ์ */}
      <div className="vrio-legend">
        {COLS.map(c => (
          <div key={c.key} className="vrio-leg">
            <span className="vrio-leg-letter">{c.letter}</span>
            <div><b>{c.hd}</b><div className="vrio-leg-tip">{c.tip}</div></div>
          </div>
        ))}
      </div>

      {/* สรุปภาพรวม */}
      <div className="vrio-summary">
        <div className="vrio-sum-item vd-sus"><b>{counts.sustained}</b> ยั่งยืน</div>
        <div className="vrio-sum-item vd-unused"><b>{counts.unused}</b> ยังไม่ได้ใช้</div>
        <div className="vrio-sum-item vd-tmp"><b>{counts.temporary}</b> ชั่วคราว</div>
        <div className="vrio-sum-item vd-par"><b>{counts.parity}</b> เสมอตัว</div>
        <div className="vrio-sum-item vd-dis"><b>{counts.disadvantage}</b> เสียเปรียบ</div>
      </div>

      {/* ตาราง VRIO */}
      <div className="vrio-table">
        <div className="vrio-row vrio-head">
          <div className="vrio-c-res">ทรัพยากร / ความสามารถ</div>
          {COLS.map(c => <div key={c.key} className="vrio-c-flag" title={c.tip}>{c.letter}</div>)}
          <div className="vrio-c-verdict">คำตัดสิน</div>
          <div className="vrio-c-del" />
        </div>

        {items.map(it => {
          const vk = verdictOf(it);
          return (
            <div key={it.id} className="vrio-row">
              <div className="vrio-c-res">
                <input className="vrio-res-inp" defaultValue={it.resource} key={'r' + it.id + it.resource}
                  onBlur={e => saveField(it.id, 'resource', e.target.value)} spellCheck={false} />
                <textarea className="vrio-note-inp" rows={1} defaultValue={it.note} key={'n' + it.id + it.note}
                  onBlur={e => saveField(it.id, 'note', e.target.value)}
                  onChange={e => autoH(e.target)} ref={el => autoH(el)} spellCheck={false} />
              </div>
              {COLS.map(c => (
                <div key={c.key} className="vrio-c-flag">
                  <button className={`vrio-flag${it[c.key] ? ' on' : ''}`} onClick={() => toggle(it.id, c.key)}
                    title={c.hd}>{it[c.key] ? '✓' : '–'}</button>
                </div>
              ))}
              <div className="vrio-c-verdict">
                <span className={`vrio-verdict ${VERDICT[vk].cls}`}>{VERDICT[vk].label}</span>
              </div>
              <div className="vrio-c-del">
                <button className="vrio-del" onClick={() => delItem(it.id)} title="ลบ">×</button>
              </div>
            </div>
          );
        })}
      </div>

      <button className="vrio-add" onClick={addItem}>＋ เพิ่มทรัพยากร</button>

      <div className="vrio-insight">
        💡 <b>ข้อสรุปเชิงกลยุทธ์:</b> เทคโนโลยีเอเจนต์ของ Paperclip เป็นโอเพนซอร์ส (ลอกได้ฟรี) จึงได้แค่ <b>เสมอตัว</b> —
        อย่าไปแข่งที่จุดนั้น คูเมืองที่ยั่งยืนของเราอยู่ที่ <b>ความลึกของบริบทไทย + คลังข้อมูลผลลัพธ์ที่สะสม + การล็อกเข้า ecosystem ไทย</b>
        ซึ่งลอกเลียนแพงและต้องมีองค์กรในไทยรองรับ
      </div>
    </div>
  );
}
