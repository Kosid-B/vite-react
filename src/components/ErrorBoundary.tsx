import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../lib/errorReport';

/* ===== Error Boundary — กันหน้าจอดำค้างทั้งแอป =====
 * เดิมถ้าหน้าใดหน้าหนึ่ง (lazy chunk) throw หรือโหลด chunk ไม่ได้ (เช่นหลัง deploy ใหม่
 * แต่เบราว์เซอร์ยัง cache index.html เก่าที่ชี้ asset hash เดิม) → React ถอดทั้ง tree =
 * "หน้าจอดำค้าง". Error Boundary นี้จับ error แล้ว:
 *   • ถ้าเป็น chunk-load error → reload อัตโนมัติ 1 ครั้ง (ดึง index.html + asset ใหม่)
 *   • ถ้าเป็น error อื่น → แสดงหน้ากู้คืนภาษาไทย + ปุ่มโหลดใหม่ (ไม่ปล่อยให้จอดำเปล่า) */

const RELOAD_FLAG = 'ceo_ai_chunk_reload';

function isChunkLoadError(err: unknown): boolean {
  const msg = (err instanceof Error ? `${err.name} ${err.message}` : String(err)).toLowerCase();
  return /chunkloaderror|loading chunk|loading css chunk|failed to fetch dynamically imported module|importing a module script failed/.test(msg);
}

interface State { hasError: boolean; chunk: boolean }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, chunk: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, chunk: isChunkLoadError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // chunk-load error หลัง deploy: ดึงเวอร์ชันใหม่โดย reload หนึ่งครั้ง (กัน loop ด้วย sessionStorage)
    if (isChunkLoadError(error)) {
      try {
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, '1');
          location.reload();
          return;
        }
      } catch { /* sessionStorage อาจถูกปิด — ตกไปหน้า fallback */ }
    }
    // log ไว้ช่วย debug (ไม่ทำให้แอปล่ม)
    console.error('[ErrorBoundary]', error, info?.componentStack);
    // รายงานไป GA4 + Cloudflare observability (เห็นปัญหา production ก่อนผู้ใช้แจ้ง)
    reportError(error, 'react.ErrorBoundary');
  }

  private handleReload = () => {
    try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* noop */ }
    location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0f172a', color: '#e5e7eb', padding: '24px',
        fontFamily: '"Noto Sans Thai","Sarabun",system-ui,-apple-system,"Segoe UI",sans-serif',
      }}>
        <div style={{ maxWidth: 440, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔄</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 10px' }}>
            {this.state.chunk ? 'มีเวอร์ชันใหม่ของระบบ' : 'เกิดข้อผิดพลาดชั่วคราว'}
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: '#9aa6d8', margin: '0 0 20px' }}>
            {this.state.chunk
              ? 'ระบบเพิ่งอัปเดต กรุณาโหลดหน้าใหม่เพื่อดึงเวอร์ชันล่าสุด'
              : 'ขออภัย หน้านี้โหลดไม่สำเร็จ ลองโหลดใหม่อีกครั้ง — ข้อมูลของคุณยังปลอดภัย'}
          </p>
          <button onClick={this.handleReload} style={{
            background: '#5b8bff', color: '#fff', border: 0, borderRadius: 10,
            padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>โหลดหน้าใหม่</button>
        </div>
      </div>
    );
  }
}
