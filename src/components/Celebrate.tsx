import { useEffect, useRef } from 'react';
import type { EmotionalMoment, Tone } from '../lib/emotionalTriggers';

/* ===== Celebrate — โมเมนต์ฉลอง/ให้กำลังใจทันที (confetti + การ์ดอารมณ์) =====
 * ยิงเมื่อผู้ใช้ 'เพิ่งข้าม' หมุดสำคัญ → payoff ทางอารมณ์ทันทีที่ลงมือ
 * confetti วาดบน canvas (ไม่พึ่ง lib ภายนอก) · เคารพ prefers-reduced-motion · auto-dismiss */

const TONE_COLORS: Record<Tone, string[]> = {
  triumph:  ['#ffcf5c', '#f5c451', '#6fe0c8', '#5b8bff', '#ffffff'],
  milestone:['#6fe0c8', '#5b8bff', '#ffcf5c', '#ffffff'],
  encourage:['#5b8bff', '#6fe0c8', '#a855f7', '#ffffff'],
};

interface Particle { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; color: string; life: number }

export default function Celebrate({ moment, onDone }: { moment: EmotionalMoment | null; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!moment) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // confetti burst (ข้ามถ้าผู้ใช้ปิด motion)
    const canvas = canvasRef.current;
    if (canvas && !reduce) {
      const ctx = canvas.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = canvas.clientWidth, H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx?.scale(dpr, dpr);
      const colors = TONE_COLORS[moment.tone];
      const count = moment.tone === 'triumph' ? 160 : 110;
      const parts: Particle[] = Array.from({ length: count }, (_, i) => {
        const angle = (-Math.PI / 2) + (((i / count) - 0.5) * Math.PI * 0.9);
        const speed = 6 + (i % 7);
        return {
          x: W / 2, y: H * 0.32,
          vx: Math.cos(angle) * speed * (0.6 + (i % 5) / 5),
          vy: Math.sin(angle) * speed - 2,
          rot: (i * 37) % 360, vr: ((i % 9) - 4) * 0.3,
          size: 6 + (i % 5) * 2, color: colors[i % colors.length], life: 1,
        };
      });
      let frames = 0;
      const draw = () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, W, H);
        let alive = false;
        for (const p of parts) {
          p.vy += 0.22;           // gravity
          p.vx *= 0.99;
          p.x += p.vx; p.y += p.vy; p.rot += p.vr;
          p.life -= 0.008;
          if (p.life > 0 && p.y < H + 20) {
            alive = true;
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.translate(p.x, p.y); ctx.rotate((p.rot * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
          }
        }
        frames++;
        if (alive && frames < 260) rafRef.current = requestAnimationFrame(draw);
      };
      rafRef.current = requestAnimationFrame(draw);
    }

    // auto-dismiss
    timerRef.current = setTimeout(onDone, reduce ? 2600 : 3800);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(timerRef.current);
    };
  }, [moment, onDone]);

  if (!moment) return null;

  return (
    <div className={`celebrate-overlay tone-${moment.tone}`} onClick={onDone} role="dialog" aria-live="assertive">
      <canvas ref={canvasRef} className="celebrate-canvas" />
      <div className="celebrate-card" onClick={e => e.stopPropagation()}>
        <div className="celebrate-emoji">{moment.emoji}</div>
        <div className="celebrate-title">{moment.title}</div>
        <div className="celebrate-msg">{moment.message}</div>
        <button className="celebrate-btn" onClick={onDone}>ไปต่อ →</button>
      </div>
    </div>
  );
}
