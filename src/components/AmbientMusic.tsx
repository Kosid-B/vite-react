import { useEffect, useState } from 'react';
import { ambient, primeAmbientAutoResume, type AmbientState } from '../lib/ambientAudio';

/* ปุ่มเปิด/ปิดเพลงบรรเลงเบาๆ (โปรซีเจอรัล · ปรับตามเวลาจริง) — วางในแถบด้านข้าง
   ปิดเป็นค่าเริ่มต้น · การกดปุ่มคือ gesture ที่อนุญาตให้เสียงเล่น (autoplay policy) */

const MOOD: Record<AmbientState['mood'], { emoji: string; label: string }> = {
  morning: { emoji: '🌅', label: 'เช้าสดใส' },
  noon:    { emoji: '☀️', label: 'กลางวัน' },
  evening: { emoji: '🌇', label: 'เย็นอบอุ่น' },
  night:   { emoji: '🌙', label: 'กลางคืนสงบ' },
  cyber:   { emoji: '🌃', label: 'ไซเบอร์' },
};

export default function AmbientMusic() {
  const [s, setS] = useState<AmbientState>(ambient.state);

  useEffect(() => {
    const unsub = ambient.subscribe(setS);
    primeAmbientAutoResume();
    return unsub;
  }, []);

  const m = MOOD[s.mood] ?? MOOD.noon;

  return (
    <div className="ambient">
      <button
        className={`ambient-toggle${s.enabled ? ' on' : ''}`}
        onClick={() => (s.enabled ? ambient.disable() : void ambient.enable())}
        title={s.enabled ? 'ปิดเพลงบรรเลง' : 'เปิดเพลงบรรเลงเบาๆ (ปรับตามเวลาจริง)'}
        aria-pressed={s.enabled}
      >
        <span className="ambient-ico">{s.enabled ? '🎵' : '🎧'}</span>
        <span className="ambient-label">
          {s.enabled ? `เพลงบรรเลง · ${m.emoji} ${m.label}` : 'เพลงบรรเลงเบาๆ'}
        </span>
      </button>
      {s.enabled && (
        <input
          className="ambient-vol"
          type="range" min={0} max={1} step={0.05} value={s.volume}
          onChange={e => ambient.setVolume(parseFloat(e.target.value))}
          aria-label="ระดับเสียงเพลงบรรเลง"
        />
      )}
    </div>
  );
}
