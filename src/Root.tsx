import { lazy, Suspense } from 'react';
import type { LegalSection } from './pages/LegalPage';
import { captureRefFromUrl } from './lib/referralClient';

// จับ ?ref= ตั้งแต่แรกที่เข้าเว็บ (ทำงานทุกเส้นทาง รวมหน้า marketing ที่ไม่ผ่าน App) — first-touch
if (typeof window !== 'undefined') captureRefFromUrl();

/**
 * Root router แบบบาง (ไม่ import supabase) — ตัดสินเส้นทางจาก URL ก่อนโหลดอะไรหนัก:
 *  - หน้า public (/b, /start, /shop, /legal…) → โหลดเฉพาะหน้านั้น (ไม่ดึง @supabase/supabase-js เข้ามา)
 *  - เส้นทางอื่น → lazy-load แอปหลัก (App) ที่ใช้ supabase/auth
 * ผล: หน้า marketing/SEO โหลดแรกเบาลงมาก (ไม่มี vendor-supabase ~55KB gzip ใน first paint)
 */
const App = lazy(() => import('./App'));
const MarketingLanding = lazy(() => import('./pages/MarketingLanding'));
const StartLanding = lazy(() => import('./pages/StartLanding'));
const SalePage = lazy(() => import('./pages/SalePage'));
const ShopSignup = lazy(() => import('./pages/ShopSignup'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const PublicPricing = lazy(() => import('./pages/PublicPricing'));
const HandoffLanding = lazy(() => import('./pages/HandoffLanding'));
const PublicStorefrontPage = lazy(() =>
  import('./pages/PublicStorefront').then(m => ({ default: m.PublicStorefrontPage })));
const PublicDirectoryPage = lazy(() =>
  import('./pages/PublicStorefront').then(m => ({ default: m.PublicDirectoryPage })));

/** ผู้เข้าชมหน้าแรกแบบ "ยังไม่ล็อกอิน" (production) → เสิร์ฟ marketing landing เบา ๆ (ไม่ผ่าน App/supabase/CSS)
 *  - local mode (ไม่มี VITE_SUPABASE_URL) → false (ให้เข้า App เลย เพราะ local ใช้แอปตรง)
 *  - มี ?enter= (กด CTA แล้ว) → false (พาเข้า App)
 *  - มี session ใน localStorage (sb-*-auth-token) → false (ล็อกอินอยู่ → App/dashboard) */
function isLoggedOutHome(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('enter')) return false;
    if (!import.meta.env.VITE_SUPABASE_URL) return false;
    const hasSession = Object.keys(localStorage)
      .some(k => k.includes('auth-token') && !!localStorage.getItem(k));
    return !hasSession;
  } catch { return false; }
}

function pick() {
  const p = window.location.pathname;

  // หน้าแรก `/` สำหรับผู้ยังไม่ล็อกอิน → marketing landing เบา (ตัด supabase ~44KB + index.css ~67KB)
  if ((p === '/' || p === '') && isLoggedOutHome()) return <MarketingLanding />;

  // Marketplace สาธารณะ /b และ /b/<slug>
  if (p === '/b' || p === '/b/' || p.startsWith('/b/')) {
    const slug = p.split('/')[2] ?? '';
    return slug ? <PublicStorefrontPage slug={slug} /> : <PublicDirectoryPage />;
  }
  if (p === '/start' || p === '/start/') return <StartLanding />;
  if (p === '/sale' || p === '/sale/') return <SalePage />;
  if (['/pricing', '/product', '/plans'].some(x => p === x || p === x + '/')) return <PublicPricing />;
  if (p === '/shop' || p === '/shop/') return <ShopSignup />;
  if (p === '/handoff' || p === '/handoff/') return <HandoffLanding />;
  if (p.startsWith('/legal') || ['/privacy', '/terms', '/refund', '/cookies'].some(x => p === x || p === x + '/')) {
    const sec: LegalSection =
      p.includes('privacy') ? 'privacy' :
      p.includes('cookies') ? 'cookies' :
      p.includes('refund') ? 'refund' :
      p.includes('terms') ? 'terms' : 'company';
    return <LegalPage section={sec} />;
  }

  return <App />;
}

export default function Root() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#020617', color: '#64748b', fontFamily: 'Kanit, system-ui, sans-serif' }}>
        กำลังโหลด…
      </div>
    }>
      {pick()}
    </Suspense>
  );
}
