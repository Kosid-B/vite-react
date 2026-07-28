import { useState } from 'react';
import type { AppData, PageId } from '../types';
import { discountedMonthly, PLAN_PRICE_NUM } from '../lib/access';
import { track } from '../lib/analytics';

/** Soft upgrade nudge (#4 PLG) — โผล่ "ตอนผู้ใช้เพิ่งเห็นคุณค่า" (activated) + ยังอยู่แพ็ก free
 *  ต่างจาก UpgradeWall (กำแพงตันเต็มหน้า) — อันนี้ชวนแบบนุ่ม ปิดได้ ไม่ขวางการใช้งาน
 *  โชว์คูปองสะสม (ถ้ามี) → ราคาหลังส่วนลด = แปลงจังหวะคุณค่า → รายได้ */
const DISMISS_KEY = 'ceo_ai_upgrade_nudge_dismissed';

interface Props {
  data: AppData;
  onNavigate: (page: PageId) => void;
}

export default function UpgradeNudge({ data, onNavigate }: Props) {
  const [dismissed, setDismissed] = useState<boolean>(() => localStorage.getItem(DISMISS_KEY) === '1');
  if (dismissed) return null;

  const couponPct = data.coupon?.pct ?? 0;
  const growthBase = PLAN_PRICE_NUM.growth;
  const growthNow = discountedMonthly('growth', couponPct);

  const close = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
    track('upgrade_nudge_dismiss', {});
  };
  const go = () => {
    track('upgrade_nudge_click', { coupon: couponPct });
    onNavigate('billing');
  };

  return (
    <div className="upgrade-nudge">
      <button className="upgrade-nudge__x" onClick={close} aria-label="ปิด">✕</button>
      <div className="upgrade-nudge__body">
        <div className="upgrade-nudge__hd">🎉 ทีม AI ของคุณเริ่มเดินแล้ว!</div>
        <div className="upgrade-nudge__sub">
          ปลดล็อกฟีเจอร์ Growth (AI Research · Marketplace · Analytics · ISO) เพื่อดันธุรกิจต่อ
          {couponPct > 0
            ? <> — ใช้คูปองสะสม <b>−{couponPct}%</b> ได้เลย</>
            : <> — เริ่มที่ทดลองฟรี</>}
        </div>
      </div>
      <button className="upgrade-nudge__cta" onClick={go}>
        {couponPct > 0
          ? <>อัปเกรด <s>฿{growthBase.toLocaleString()}</s> ฿{growthNow.toLocaleString()}/เดือน →</>
          : <>ดูแพ็กเกจ →</>}
      </button>
    </div>
  );
}
