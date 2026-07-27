/** ป้าย "ข้อมูลตัวอย่าง (demo) — แทนที่ด้วยของคุณ" (#3 PLG)
 *  ลดความสับสน real vs demo: ผู้ใช้ใหม่เห็นแอปมีข้อมูลเต็มจาก seed → บอกชัดว่าเป็นตัวอย่าง ให้แก้เป็นของตัวเอง */
interface Props {
  /** คำแนะนำสั้น ๆ ว่าควรทำอะไรกับส่วนนี้ */
  hint?: string;
}

export default function DemoBadge({ hint }: Props) {
  return (
    <div className="demo-badge">
      🧪 <b>ข้อมูลตัวอย่าง</b> — แก้/ลบให้เป็นของคุณได้เลย{hint ? <span className="demo-badge__hint"> · {hint}</span> : null}
    </div>
  );
}
