import * as amplitude from '@amplitude/unified'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Root from './Root.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import CookieConsent from './components/CookieConsent.tsx'
import { installGlobalErrorReporting } from './lib/errorReport'
import { applyTheme, readTheme } from './lib/theme'
import { AMPLITUDE_KEY } from './lib/amplitude'
// หมายเหตุ: index.css ย้ายไป import ใน App + หน้า public ที่ใช้คลาส (ไม่ import global ที่นี่)
// → marketing landing (`/`) ไม่ต้องโหลด index.css (~67KB) · CookieConsent/IsmsBadge = self-contained

// ── Amplitude (analytics + session replay) — init ครั้งเดียวต่อ lifecycle ของแอป ที่รากฝั่ง client ──
// คีย์เป็น public client key แต่ถูก inline ตอน build → ถ้า secret ไม่ถูกส่งเข้า build จะกลายเป็นสตริงว่าง
// และ SDK จะเงียบสนิทโดยไม่มีใครรู้ (บทเรียน 19 ส.ค. 2569 · ledger #18) — จึงต้องเตือนให้ดังไว้
if (!AMPLITUDE_KEY) console.warn('Amplitude API key missing — analytics disabled');
else {
  amplitude.initAll(AMPLITUDE_KEY, {
    analytics: { autocapture: true },
    // privacyConfig: ปิดบังทุก input ในคลิปที่อัด (อีเมล/ชื่อ/เบอร์) — ข้อบังคับ PDPA ของโปรเจกต์นี้
    sessionReplay: { sampleRate: 1, privacyConfig: { defaultMaskLevel: 'medium' } },
  });
  amplitude.track('Viewed Home Page', { prompt_version: 'BA400.4' }); // helps improve this setup flow — safe to remove once you've verified the event lands
}

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
