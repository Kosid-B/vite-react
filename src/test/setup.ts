import '@testing-library/jest-dom/vitest';

/* polyfills สำหรับ jsdom — บางหน้าเรียก API ที่ jsdom ไม่มี (กันเทสต์ render ล้มโดยไม่ใช่บั๊กจริง) */
/* eslint-disable @typescript-eslint/no-explicit-any */
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
  })) as any;
}
class _Stub { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver || _Stub;
(globalThis as any).IntersectionObserver = (globalThis as any).IntersectionObserver || _Stub;
if (typeof window !== 'undefined' && !window.scrollTo) window.scrollTo = (() => {}) as any;
