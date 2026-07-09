import { useRef, useState } from 'react';
import type { AppData } from '../types';
import { routeIntake, type RoutedTask } from '../lib/intakeRouter';

/* รับข้อมูลจากผู้ใช้ (โหลดไฟล์ / พิมพ์) → CEO มอบงานให้ตำแหน่งที่เกี่ยวข้อง → เข้าคิวงานของเอเจนต์ */

const TEXT_EXT = /\.(txt|csv|tsv|md|markdown|json|log|text)$/i;

export default function IntakePanel({ data, onUpdate }: { data: AppData; onUpdate: (d: AppData) => void }) {
  const c = data.aiCompany;
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [msg, setMsg] = useState('');
  const [routed, setRouted] = useState<RoutedTask[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const agents = c?.agents ?? [];
  const hasTeam = agents.length > 0;

  function onFile(file: File) {
    setFileName(file.name);
    if (TEXT_EXT.test(file.name) || file.type.startsWith('text/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const raw = String(reader.result ?? '');
        // ต่อท้ายข้อความเดิม (ให้พิมพ์เสริมได้)
        setText(t => (t.trim() ? t + '\n' : '') + raw.slice(0, 20000));
        setMsg('📎 โหลดไฟล์แล้ว — ตรวจ/แก้ข้อความได้ก่อนส่ง');
      };
      reader.onerror = () => setMsg('⚠️ อ่านไฟล์ไม่สำเร็จ');
      reader.readAsText(file);
    } else {
      // ไฟล์ที่อ่านเป็นข้อความตรง ๆ ไม่ได้ (PDF/รูป/office) → แนบชื่อไฟล์เป็นบริบท ให้ผู้ใช้พิมพ์เนื้อหาเสริม
      setText(t => (t.trim() ? t + '\n' : '') + `[แนบไฟล์: ${file.name}] — โปรดสรุป/วางเนื้อหาสำคัญของไฟล์นี้เพิ่ม`);
      setMsg('ℹ️ ไฟล์นี้อ่านอัตโนมัติไม่ได้ — แนบชื่อไว้แล้ว โปรดพิมพ์สรุปเนื้อหาเพิ่ม');
    }
  }

  function submit() {
    const tasks = routeIntake(text, agents, fileName ? `ไฟล์ ${fileName}` : 'พิมพ์ข้อมูล');
    if (tasks.length === 0) {
      setMsg(hasTeam ? '⚠️ กรุณากรอกข้อมูลก่อน' : '⚠️ ยังไม่มีทีม AI — สร้างทีม (CEO + ตำแหน่ง) ก่อน');
      return;
    }
    const now = Date.now();
    const newTasks = tasks.map((t, i) => ({
      id: `t-intake-${now.toString(36)}-${i}`,
      agentId: t.agentId,
      title: t.title,
      detail: t.detail,
      status: 'queued' as const,
    }));
    onUpdate({ ...data, aiCompany: { ...c, tasks: [...newTasks, ...(c.tasks ?? [])] } });
    setRouted(tasks);
    setText(''); setFileName('');
    if (fileRef.current) fileRef.current.value = '';
    setMsg(`✅ CEO มอบหมาย ${tasks.length} งานให้ตำแหน่งที่เกี่ยวข้องแล้ว`);
  }

  return (
    <div className="intake-card">
      <div className="intake-head">
        <span className="intake-title">📥 รับข้อมูลจากคุณ → ให้ CEO มอบหมายงาน</span>
        <span className="intake-sub">โหลดไฟล์ หรือพิมพ์ข้อมูลธุรกิจ แล้ว CEO จะแจกจ่ายให้ตำแหน่งที่เกี่ยวข้องดำเนินการ</span>
      </div>

      <textarea
        className="intake-ta" rows={4} value={text}
        placeholder="เช่น: ยอดขายเดือนนี้ตก 20% อยากได้แคมเปญการตลาดใหม่ + ตรวจต้นทุนสินค้า A ว่าทำไมกำไรลด และวางแผนผลิตรอบหน้า…"
        onChange={e => setText(e.target.value)}
      />

      <div className="intake-actions">
        <button className="intake-file" onClick={() => fileRef.current?.click()}>📎 โหลดไฟล์</button>
        <input ref={fileRef} type="file" accept=".txt,.csv,.tsv,.md,.json,.log,text/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        {fileName && <span className="intake-fname" title={fileName}>{fileName}</span>}
        <button className="intake-send" onClick={submit} disabled={!text.trim() || !hasTeam}>
          ให้ CEO มอบหมายงาน →
        </button>
      </div>

      {msg && <div className="intake-msg">{msg}</div>}

      {routed.length > 0 && (
        <ul className="intake-result">
          {routed.map((t, i) => (
            <li key={i}>👤 <b>{t.agentRole}</b> ← {t.areaLabels.join(' · ')}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
