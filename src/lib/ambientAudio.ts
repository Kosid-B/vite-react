/* ===== Ambient Soundscape — เพลงบรรเลงเบาๆ แบบโปรซีเจอรัล (Web Audio API) =====
 * ไม่มีไฟล์เสียง/ไม่มีลิขสิทธิ์ · สร้างเสียงสดจาก oscillator (แนวเดียวกับ cityScape ที่วาด SVG โปรซีเจอรัล)
 * ผูกกับ "เวลาจริง": เช้าสดใส → กลางวันสว่าง → เย็นอบอุ่น → กลางคืนสงบ (reuse detectTime)
 * จริยธรรม: ปิดเป็นค่าเริ่มต้น (opt-in) · เบามาก · เริ่มเล่นได้เฉพาะหลัง user gesture (autoplay policy) */

import { detectTime, type TimeName } from './cityScape';

const LS_ON = 'ceo_ai_ambient_on';
const LS_VOL = 'ceo_ai_ambient_vol';

export interface AmbientState { enabled: boolean; volume: number; mood: TimeName; running: boolean; }

interface Mood {
  root: number;        // Hz ของโน้ตหลัก (tonic)
  scale: number[];     // semitone offsets ของสเกล (เพนทาโทนิก กันเสียงชนกัน)
  padGain: number;     // ความดัง pad
  melodyGain: number;  // ความดังโน้ตทำนอง
  cutoff: number;      // lowpass cutoff (สว่าง/ทึบ)
  stepMs: number;      // ระยะห่างเฉลี่ยระหว่างโน้ต
  wave: OscillatorType;
}

const semi = (root: number, s: number) => root * Math.pow(2, s / 12);

/* detectTime คืน morning|noon|evening|night (cyber = โหมดปรับมือ ไม่เกิดจากเวลา) */
const MOODS: Record<TimeName, Mood> = {
  morning: { root: 261.63, scale: [0, 2, 4, 7, 9, 12], padGain: 0.50, melodyGain: 0.50, cutoff: 1400, stepMs: 3200, wave: 'triangle' },
  noon:    { root: 293.66, scale: [0, 2, 4, 7, 9, 12], padGain: 0.45, melodyGain: 0.55, cutoff: 1900, stepMs: 2800, wave: 'triangle' },
  evening: { root: 220.00, scale: [0, 3, 5, 7, 10, 12], padGain: 0.55, melodyGain: 0.45, cutoff: 1000, stepMs: 3800, wave: 'sine' },
  night:   { root: 196.00, scale: [0, 3, 5, 7, 10, 12], padGain: 0.60, melodyGain: 0.40, cutoff: 700,  stepMs: 4800, wave: 'sine' },
  cyber:   { root: 246.94, scale: [0, 2, 3, 7, 8, 12], padGain: 0.50, melodyGain: 0.50, cutoff: 1500, stepMs: 2600, wave: 'triangle' },
};

function currentMood(): TimeName {
  try { return detectTime(new Date().getHours()); } catch { return 'noon'; }
}

type Listener = (s: AmbientState) => void;

class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private padOscs: OscillatorNode[] = [];
  private padFilter: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;
  private melTimer: number | null = null;
  private moodTimer: number | null = null;
  private _enabled = false;
  private _volume = 0.5;          // 0..1 (ผู้ใช้) — สเกลลงภายในให้เบา
  private mood: TimeName = currentMood();
  private listeners = new Set<Listener>();

  constructor() {
    try {
      this._enabled = localStorage.getItem(LS_ON) === '1';
      const v = parseFloat(localStorage.getItem(LS_VOL) ?? '');
      if (!Number.isNaN(v)) this._volume = Math.min(1, Math.max(0, v));
    } catch { /* localStorage อาจถูกปิด */ }
  }

  get enabled() { return this._enabled; }
  get running() { return !!this.ctx; }
  get state(): AmbientState { return { enabled: this._enabled, volume: this._volume, mood: this.mood, running: this.running }; }

  subscribe(fn: Listener): () => void { this.listeners.add(fn); fn(this.state); return () => { this.listeners.delete(fn); }; }
  private emit() { const s = this.state; this.listeners.forEach(fn => fn(s)); }

  private masterTarget() { return 0.10 * this._volume; }  // เพดานเบา ~0.10

  async enable() {
    this._enabled = true;
    try { localStorage.setItem(LS_ON, '1'); } catch { /* ignore */ }
    await this.start();
    this.emit();
  }

  disable() {
    this._enabled = false;
    try { localStorage.setItem(LS_ON, '0'); } catch { /* ignore */ }
    this.stop();
    this.emit();
  }

  setVolume(v: number) {
    this._volume = Math.min(1, Math.max(0, v));
    try { localStorage.setItem(LS_VOL, String(this._volume)); } catch { /* ignore */ }
    if (this.master && this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(this.masterTarget(), t, 0.2);
    }
    this.emit();
  }

  private async start() {
    if (this.ctx) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    try { await ctx.resume(); } catch { /* บาง browser resume ไม่ได้จนกว่าจะมี gesture */ }
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    master.gain.setTargetAtTime(this.masterTarget(), ctx.currentTime, 0.6); // fade in
    this.master = master;

    this.mood = currentMood();
    this.buildPad();
    this.scheduleMelody(MOODS[this.mood].stepMs);
    this.moodTimer = window.setInterval(() => this.refreshMood(), 60000); // เช็คเวลาทุก 1 นาที
  }

  private stop() {
    if (this.melTimer) { clearTimeout(this.melTimer); this.melTimer = null; }
    if (this.moodTimer) { clearInterval(this.moodTimer); this.moodTimer = null; }
    const ctx = this.ctx, master = this.master;
    const oscs = this.padOscs, lfo = this.lfo, filter = this.padFilter;
    this.padOscs = []; this.lfo = null; this.padFilter = null;
    this.ctx = null; this.master = null;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(0, t, 0.4);                 // fade out
    window.setTimeout(() => {
      oscs.forEach(o => { try { o.stop(); o.disconnect(); } catch { /* ignore */ } });
      try { lfo?.stop(); } catch { /* ignore */ }
      try { filter?.disconnect(); } catch { /* ignore */ }
      try { ctx.close(); } catch { /* ignore */ }
    }, 1400);
  }

  private buildPad() {
    const ctx = this.ctx, master = this.master;
    if (!ctx || !master) return;
    const m = MOODS[this.mood];
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = m.cutoff;
    filter.Q.value = 0.7;
    const padGain = ctx.createGain();
    padGain.gain.value = m.padGain * 0.5;
    filter.connect(padGain); padGain.connect(master);
    this.padFilter = filter;

    // pad = tonic + fifth + octave (detune เล็กน้อยให้อบอุ่นแบบ chorus)
    [m.root, semi(m.root, 7), semi(m.root, 12)].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = m.wave;
      o.frequency.value = f;
      o.detune.value = (i - 1) * 6;
      o.connect(filter);
      o.start();
      this.padOscs.push(o);
    });

    // LFO ช้ามาก โยก cutoff ให้เสียง "มีชีวิต"
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = m.cutoff * 0.22;
    lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
    lfo.start();
    this.lfo = lfo;
  }

  private scheduleMelody(delay: number) {
    this.melTimer = window.setTimeout(() => {
      this.playNote();
      const m = MOODS[this.mood];
      this.scheduleMelody(m.stepMs * (0.6 + Math.random() * 0.8)); // จังหวะไม่ตายตัว
    }, delay);
  }

  private playNote() {
    const ctx = this.ctx, master = this.master;
    if (!ctx || !master) return;
    const m = MOODS[this.mood];
    const deg = m.scale[Math.floor(Math.random() * m.scale.length)];
    const oct = Math.random() < 0.35 ? 12 : 0;
    const freq = semi(m.root, deg + oct + 12); // สูงกว่า pad 1 ออกเทฟ ให้ทำนองเด่น
    const o = ctx.createOscillator();
    o.type = m.wave;
    o.frequency.value = freq;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    const peak = m.melodyGain * 0.18;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(peak, now + 0.25);          // attack นุ่ม
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);    // release ยาว
    o.connect(g); g.connect(master);
    o.start(now);
    o.stop(now + 2.8);
    o.onended = () => { try { o.disconnect(); g.disconnect(); } catch { /* ignore */ } };
  }

  private refreshMood() {
    const next = currentMood();
    if (next === this.mood || !this.ctx) return;
    this.mood = next;
    const ctx = this.ctx, m = MOODS[next], t = ctx.currentTime;
    if (this.padFilter) this.padFilter.frequency.setTargetAtTime(m.cutoff, t, 4);
    [m.root, semi(m.root, 7), semi(m.root, 12)].forEach((f, i) => {
      this.padOscs[i]?.frequency.setTargetAtTime(f, t, 4);    // เกลี่ยเปลี่ยนโทนแบบ crossfade
    });
    this.emit();
  }
}

export const ambient = new AmbientEngine();

/** ถ้าผู้ใช้เคยเปิดไว้ — resume ตอน gesture แรก (browser บล็อก autoplay เสียง) */
export function primeAmbientAutoResume() {
  if (!ambient.enabled || ambient.running) return;
  const go = () => { void ambient.enable(); cleanup(); };
  const cleanup = () => {
    window.removeEventListener('pointerdown', go);
    window.removeEventListener('keydown', go);
  };
  window.addEventListener('pointerdown', go, { once: true });
  window.addEventListener('keydown', go, { once: true });
}
