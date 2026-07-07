import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Root from './Root.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import CookieConsent from './components/CookieConsent.tsx'
import './index.css'

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
