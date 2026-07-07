import { lazy, Suspense } from 'react';
import type { LegalSection } from './pages/LegalPage';

/**
 * Root router แบบบาง (ไม่ import supabase) — ตัดสินเส้นทางจาก URL ก่อนโหลดอะไรหนัก:
 *  - หน้า public (/b, /start, /shop, /legal…) → โหลดเฉพาะหน้านั้น (ไม่ดึง @supabase/supabase-js เข้ามา)
 *  - เส้นทางอื่น → lazy-load แอปหลัก (App) ที่ใช้ supabase/auth
 * ผล: หน้า marketing/SEO โหลดแรกเบาลงมาก (ไม่มี vendor-supabase ~55KB gzip ใน first paint)
 */
const App = lazy(() => import('./App'));
const StartLanding = lazy(() => import('./pages/StartLanding'));
const ShopSignup = lazy(() => import('./pages/ShopSignup'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const PublicStorefrontPage = lazy(() =>
  import('./pages/PublicStorefront').then(m => ({ default: m.PublicStorefrontPage })));
const PublicDirectoryPage = lazy(() =>
  import('./pages/PublicStorefront').then(m => ({ default: m.PublicDirectoryPage })));

function pick() {
  const p = window.location.pathname;

  // Marketplace สาธารณะ /b และ /b/<slug>
  if (p === '/b' || p === '/b/' || p.startsWith('/b/')) {
    const slug = p.split('/')[2] ?? '';
    return slug ? <PublicStorefrontPage slug={slug} /> : <PublicDirectoryPage />;
  }
  if (p === '/start' || p === '/start/') return <StartLanding />;
  if (p === '/shop' || p === '/shop/') return <ShopSignup />;
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
    <Suspense fallback={<div className="auth-wrap"><div className="auth-loading">กำลังโหลด…</div></div>}>
      {pick()}
    </Suspense>
  );
}
