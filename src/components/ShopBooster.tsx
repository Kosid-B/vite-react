import { useState } from 'react';
import type { AppData, AgentTask, PageId } from '../types';
import type { Storefront } from '../lib/storefront';
import { track } from '../lib/analytics';

/** 🚀 Shop Booster — สะพานจากตลาด → บริษัท AI
 *  ร้าน/ธุรกิจสมาชิกที่มาใช้หน้าร้าน/ตลาด กดปุ่มเดียว "จ้างทีม AI ทำงานให้ร้านนี้"
 *  → สร้างงานจริงใน บริษัท AI (มอบให้ CMO/CEO agent) → พาไปดูทีมทำงาน
 *  = ได้สัมผัสคุณค่าแกนหลักของระบบจากบริบทร้านตัวเอง โดยไม่ต้องเริ่มจากศูนย์ */

interface Props {
  data: AppData;
  sf: Storefront;
  onUpdate: (data: AppData) => void;
  onNavigate: (page: PageId) => void;
}

interface BoostJob {
  id: string;
  icon: string;
  title: string;
  desc: string;
  build: (sf: Storefront) => Pick<AgentTask, 'title' | 'detail' | 'useWebSearch'>;
}

const JOBS: BoostJob[] = [
  {
    id: 'posts', icon: '📣', title: 'เขียนโพสต์ขายของ 5 โพสต์',
    desc: 'คอนเทนต์พร้อมโพสต์ลง Facebook/LINE จากสินค้าและโปรโมชันของร้านคุณ',
    build: sf => ({
      title: `เขียนโพสต์ขายของ 5 โพสต์ให้ร้าน "${sf.name}"`,
      detail: `ร้าน: ${sf.name} · สินค้า/บริการ: ${sf.services.join(', ') || '-'} · จุดขาย: ${sf.vp || '-'}` +
        (sf.promo ? ` · โปรโมชันปัจจุบัน: ${sf.promo}` : '') +
        ` — เขียนโพสต์ภาษาไทย 5 โพสต์ โทนเป็นกันเอง มี hook เปิด, CTA ปิด และ hashtag`,
    }),
  },
  {
    id: 'promo', icon: '🎯', title: 'วางแผนโปรโมชันเดือนนี้',
    desc: 'แผนโปรโมชัน 4 สัปดาห์ พร้อมข้อความโฆษณา 📣 ไปใส่หน้าร้านบนตลาด',
    build: sf => ({
      title: `วางแผนโปรโมชันรายเดือนให้ร้าน "${sf.name}"`,
      detail: `ร้าน: ${sf.name} (${sf.dbd || 'ไม่ระบุหมวด'}) ขาย: ${sf.services.join(', ') || '-'}` +
        ` — วางแผนโปรโมชัน 4 สัปดาห์ (ธีม/ส่วนลด/เงื่อนไข) พร้อมร่างข้อความโฆษณาสั้น ≤140 ตัวอักษร` +
        ` สำหรับช่อง "📣 โฆษณา/โปรโมชัน" บนหน้าร้านตลาด`,
    }),
  },
  {
    id: 'compete', icon: '🔎', title: 'วิเคราะห์คู่แข่งและราคาตลาด',
    desc: 'เอเจนต์ค้นข้อมูลจริงจาก Google — คู่แข่งขายเท่าไหร่ เราควรตั้งราคายังไง',
    build: sf => ({
      title: `วิเคราะห์คู่แข่งและราคาตลาดของ "${sf.services[0] ?? sf.name}"`,
      detail: `สินค้า/บริการ: ${sf.services.join(', ') || sf.name} หมวด: ${sf.dbd || '-'}` +
        ` — สำรวจคู่แข่งในตลาดไทย ช่วงราคาที่ขายจริง จุดที่เราได้เปรียบ และข้อเสนอราคาแนะนำ`,
      useWebSearch: true,
    }),
  },
];

export default function ShopBooster({ data, sf, onUpdate, onNavigate }: Props) {
  const [hired, setHired] = useState<string | null>(null);
  const agents = data.aiCompany.agents;
  const cmo = agents.find(a => a.role.toUpperCase().includes('CMO')) ?? agents[0];
  if (!cmo) return null;

  const pendingTitles = new Set(
    data.aiCompany.tasks.filter(t => t.status !== 'done').map(t => t.title));

  function hire(job: BoostJob) {
    const spec = job.build(sf);
    if (pendingTitles.has(spec.title)) {
      setHired(job.id);
      return;
    }
    const task: AgentTask = {
      id: 'boost-' + job.id + '-' + Date.now(),
      agentId: cmo.id,
      status: 'queued',
      ...spec,
    };
    onUpdate({
      ...data,
      aiCompany: { ...data.aiCompany, tasks: [task, ...data.aiCompany.tasks] },
    });
    track('booster_hired', { job: job.id });
    setHired(job.id);
  }

  return (
    <div className="booster">
      <div className="booster-hd">
        <div>
          <div className="booster-title">🚀 จ้างทีม AI ทำงานให้ร้านนี้</div>
          <div className="booster-sub">
            ทีม AI ของบริษัทคุณ (เช่น {cmo.avatar} {cmo.name} — {cmo.role}) พร้อมรับงานการตลาดของร้านทันที
            — งานจะเข้าคิวใน "บริษัท AI" และรันอัตโนมัติ
          </div>
        </div>
      </div>
      <div className="booster-grid">
        {JOBS.map(job => {
          const done = hired === job.id || pendingTitles.has(job.build(sf).title);
          return (
            <div key={job.id} className="booster-card">
              <div className="booster-ico">{job.icon}</div>
              <div className="booster-name">{job.title}</div>
              <p>{job.desc}</p>
              <button className={`booster-btn${done ? ' done' : ''}`} onClick={() => hire(job)} disabled={done}>
                {done ? '✓ อยู่ในคิวทีม AI แล้ว' : `มอบงานให้ ${cmo.avatar} ${cmo.name}`}
              </button>
            </div>
          );
        })}
      </div>
      {hired && (
        <div className="booster-go">
          ✅ มอบงานให้ทีม AI แล้ว —{' '}
          <button className="booster-link" onClick={() => onNavigate('aicompany')}>
            ไปดูทีมทำงานที่ "บริษัท AI" →
          </button>
        </div>
      )}
    </div>
  );
}
