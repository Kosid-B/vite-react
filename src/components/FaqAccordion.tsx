import { useState } from 'react';
import { track } from '../lib/analytics';

export interface FaqItem { q: string; a: string; }

/* FAQ accordion — เพิ่ม engagement (คลิกกางอ่าน) + คำตอบอยู่ใน DOM เสมอเพื่อ SEO/GEO
 * (crawler และ AI assistant อ่านได้แม้ยังไม่กาง) */
export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="faq-list">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className={`faq-item${isOpen ? ' open' : ''}`}>
            <button
              type="button"
              className="faq-q"
              aria-expanded={isOpen}
              onClick={() => {
                const next = isOpen ? null : i;
                setOpen(next);
                if (next !== null) track('faq_open', { q: it.q });
              }}
            >
              <span>{it.q}</span>
              <span className="faq-ico" aria-hidden="true">{isOpen ? '−' : '+'}</span>
            </button>
            <div className="faq-a"><p>{it.a}</p></div>
          </div>
        );
      })}
    </div>
  );
}
