import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Root from './Root.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import CookieConsent from './components/CookieConsent.tsx'
import { installGlobalErrorReporting } from './lib/errorReport'
import { applyTheme, readTheme } from './lib/theme'
// หมายเหตุ: index.css ย้ายไป import ใน App + หน้า public ที่ใช้คลาส (ไม่ import global ที่นี่)
// → marketing landing (`/`) ไม่ต้องโหลด index.css (~67KB) · CookieConsent/IsmsBadge = self-contained

installGlobalErrorReporting(); // จับ error นอก React → รายงานไป GA4 + observability
applyTheme(readTheme());        // ปรับใช้ธีมที่ผู้ใช้เลือก (เข้ม/มินิมอล) ก่อน render

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
      <CookieConsent />
    </ErrorBoundary>
  </StrictMode>,
)

// โหลดสำเร็จแล้ว — ล้าง flag กัน reload-loop เพื่อให้ครั้งหน้าถ้าเจอ chunk error ใหม่ reload ได้อีก
setTimeout(() => { try { sessionStorage.removeItem('ceo_ai_chunk_reload'); } catch { /* noop */ } }, 4000);
