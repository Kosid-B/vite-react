import type { AppData, PageId } from '../types';
import { PAGE_MIN_PLAN, PLAN_NAME, PLAN_COLOR, PLAN_PRICE, PLAN_PRICE_NUM, discountedMonthly, isExpired } from '../lib/access';

/** teaser คุณค่าปลายทาง (ทำ wall ให้ "นุ่ม" — บอกว่าปลดล็อกแล้วได้อะไร ไม่ใช่แค่ "จ่ายสิ") */
const PAGE_VALUE: Partial<Record<PageId, string>> = {
  aisearch:  'ให้ AI วิจัยตลาด + คู่แข่งจริง สรุปเป็นข้อมูลตัดสินใจภายในไม่กี่นาที',
  market:    'ลงสินค้า/บริการขายในตลาด เข้าถึงผู้ซื้อจริงในระบบ',
  team:      'เชิญทีมเข้ามาช่วยบริหารบริษัท AI ร่วมกัน',
  iso9001:   'เตรียมเอกสาร ISO 9001 ให้พร้อมก่อน auditor มา',
  privacy:   'ให้ AI ร่าง Privacy Notice/SOP ตาม PDPA ใช้ได้จริง',
  compliance:'ให้ AI ตรวจเอกสารหา gap ก่อน audit — รู้จุดอ่อนล่วงหน้า',
  knowledge: 'ถาม-ตอบข้อกำหนด ISO/PDPA/มอก. โดยอ้างอิงจริง ไม่มั่ว',
  factory:   'มอนิเตอร์สายการผลิต + OEE แบบเรียลไทม์',
  analytics: 'เห็น MRR/churn/LTV ของธุรกิจในภาพเดียว',
  sipoc:     'แผนผังกระบวนการ หาคอขวดในงานจริง',
  trade:     'รับงาน B2B จริง — ประกาศ RFQ + ปิดดีล + ติดตามออเดอร์',
};

const PAGE_TITLE: Partial<Record<PageId, string>> = {
  aisearch:  'AI Research',
  market:    'Marketplace',
  team:      'ทีม / สมาชิก',
  iso9001:   'ISO 9001:2015 QMS',
  privacy:   'ตัวช่วย PDPA (Privacy Notice/SOP)',
  compliance: 'AI ตรวจเอกสาร ISO / มอก.',
  knowledge:  'คลังความรู้ ISO / PDPA (ถาม-ตอบ)',
  factory:   'โรงงานอัจฉริยะ',
  analytics: 'SaaS Analytics',
  sipoc:     'SIPOC Process',
  trade:     'ซื้อขาย B2B (RFQ)',
  admin:     'ผู้ดูแลระบบ',
};

const PLAN_FEATURES: Partial<Record<string, string[]>> = {
  starter: [
    'ตัวช่วย PDPA — ร่าง Privacy Notice/SOP ด้วย AI',
    'ซื้อขาย B2B (RFQ) — หาคู่ค้า รับงานจริง',
    'ออเดอร์ + ติดตามสถานะจนปิดดีล',
    'AI calls 300 ครั้ง/เดือน',
    'เอเจนต์ AI สูงสุด 5 ตัว',
  ],
  growth: [
    'AI Research — วิจัยตลาดด้วย AI',
    'Marketplace — จัดการสินค้า/บริการ',
    'ทีม / สมาชิก — บริหารทีม',
    'SaaS Analytics — วิเคราะห์ข้อมูล',
    'ISO 9001:2015 QMS — มาตรฐานคุณภาพ',
    'AI ตรวจเอกสาร ISO/มอก. — หา gap ก่อน audit',
  ],
};

interface Props {
  page: PageId;
  data: AppData;
  onNavigate: (page: PageId) => void;
}

export default function UpgradeWall({ page, data, onNavigate }: Props) {
  const requiredPlan = PAGE_MIN_PLAN[page] ?? 'growth';
  const expired = isExpired(data);
  const planName = PLAN_NAME[requiredPlan];
  const planColor = PLAN_COLOR[requiredPlan];
  const planPrice = PLAN_PRICE[requiredPlan];
  const pageTitle = PAGE_TITLE[page] ?? page;
  const pageValue = PAGE_VALUE[page];
  const isScalePlan = requiredPlan === 'scale';

  // #6 คูปองส่วนลดที่สะสมได้ (จากเกมเมือง/รางวัล) → โชว์ ณ จุดอัปเกรด + ราคาหลังหัก
  const couponPct = data.coupon?.pct ?? 0;
  const base = PLAN_PRICE_NUM[requiredPlan] ?? 0;
  const discounted = discountedMonthly(requiredPlan, couponPct);

  return (
    <div className="upgrade-wall">
      <div className="upgrade-wall__card">
        <div className="upgrade-wall__lock">🔓</div>

        {expired && (
          <div className="upgrade-wall__expired-badge">
            แพ็กเกจหมดอายุหรือยังไม่ได้สมัคร
          </div>
        )}

        {/* #4 value-first: บอกว่า "ปลดล็อกแล้วได้อะไร" ก่อน ไม่ใช่ "จ่ายสิ" */}
        <h2 className="upgrade-wall__title">
          ปลดล็อก <strong>{pageTitle}</strong>
        </h2>

        {pageValue && <p className="upgrade-wall__value">✨ {pageValue}</p>}

        <p className="upgrade-wall__desc">
          อยู่ในแพ็กเกจ{' '}
          <span style={{ color: planColor, fontWeight: 700 }}>{planName}</span>
          {' '}({planPrice}){!isScalePlan && ' ขึ้นไป'}
        </p>

        {!isScalePlan && (
          <ul className="upgrade-wall__features">
            {(PLAN_FEATURES[requiredPlan] ?? PLAN_FEATURES.growth!).map(f => (
              <li key={f}>
                <span className="upgrade-wall__check">✓</span> {f}
              </li>
            ))}
          </ul>
        )}

        {/* #6 คูปองสะสม → ราคาหลังส่วนลด (แปลง gamification เป็นแรงจูงใจอัปเกรด) */}
        {couponPct > 0 && base > 0 && (
          <div className="upgrade-wall__coupon">
            🎟️ คุณมีคูปองส่วนลด <b>−{couponPct}%</b> (จาก “{data.coupon?.reason}”)
            <div className="upgrade-wall__price">
              <span className="upgrade-wall__price-old">฿{base.toLocaleString()}</span>
              <span className="upgrade-wall__price-new" style={{ color: planColor }}>฿{discounted.toLocaleString()}/เดือน</span>
            </div>
          </div>
        )}

        <div className="upgrade-wall__actions">
          <button
            className="upgrade-wall__btn-primary"
            style={{ background: planColor }}
            onClick={() => onNavigate('billing')}
          >
            {couponPct > 0 ? `อัปเกรด ${planName} · ลด ${couponPct}%` : `อัพเกรดเป็น ${planName}`}
          </button>
          <button
            className="upgrade-wall__btn-secondary"
            onClick={() => onNavigate('billing')}
          >
            ดูแพ็กเกจทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );
}
