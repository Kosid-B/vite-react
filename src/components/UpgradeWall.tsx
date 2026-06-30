import type { AppData, PageId } from '../types';
import { PAGE_MIN_PLAN, PLAN_NAME, PLAN_COLOR, PLAN_PRICE, isExpired } from '../lib/access';

const PAGE_TITLE: Partial<Record<PageId, string>> = {
  aisearch:  'AI Research',
  market:    'Marketplace',
  team:      'ทีม / สมาชิก',
  iso9001:   'ISO 9001:2015 QMS',
  factory:   'โรงงานอัจฉริยะ',
  analytics: 'SaaS Analytics',
  admin:     'ผู้ดูแลระบบ',
};

const GROWTH_FEATURES = [
  'AI Research — วิจัยตลาดด้วย AI',
  'Marketplace — จัดการสินค้า/บริการ',
  'ทีม / สมาชิก — บริหารทีม',
  'SaaS Analytics — วิเคราะห์ข้อมูล',
  'ISO 9001:2015 QMS — มาตรฐานคุณภาพ',
];

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
  const isScalePlan = requiredPlan === 'scale';

  return (
    <div className="upgrade-wall">
      <div className="upgrade-wall__card">
        <div className="upgrade-wall__lock">🔒</div>

        {expired && (
          <div className="upgrade-wall__expired-badge">
            แพ็กเกจหมดอายุหรือยังไม่ได้สมัคร
          </div>
        )}

        <h2 className="upgrade-wall__title">
          ฟีเจอร์นี้ต้องการแพ็กเกจ{' '}
          <span style={{ color: planColor }}>{planName}</span>
        </h2>

        <p className="upgrade-wall__desc">
          <strong>{pageTitle}</strong>{' '}ให้บริการเฉพาะผู้ใช้แพ็กเกจ{' '}
          <span style={{ color: planColor, fontWeight: 700 }}>{planName}</span>
          {' '}({planPrice}){!isScalePlan && ' ขึ้นไป'}
        </p>

        {!isScalePlan && (
          <ul className="upgrade-wall__features">
            {GROWTH_FEATURES.map(f => (
              <li key={f}>
                <span className="upgrade-wall__check">✓</span> {f}
              </li>
            ))}
          </ul>
        )}

        <div className="upgrade-wall__actions">
          <button
            className="upgrade-wall__btn-primary"
            style={{ background: planColor }}
            onClick={() => onNavigate('billing')}
          >
            อัพเกรดเป็น {planName}
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
