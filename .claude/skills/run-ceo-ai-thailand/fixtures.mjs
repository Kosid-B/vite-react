// สถานะธุรกิจตัวอย่างสำหรับตรวจหน้าจอ
//
// ทำไมต้องมี: หน้าจอของแอปนี้เปลี่ยนตาม "ธุรกิจของผู้ใช้ไปถึงไหนแล้ว"
// การถ่ายภาพหน้าจอสถานะเดียวจึงตรวจได้แค่เสี้ยวเดียว และเสี้ยวที่มักไม่พังด้วย
//
// สามสถานะนี้ตรงกับด่านความพร้อมใน lib/founderMindset.ts โดยตั้งใจ —
// ทุกหน้าที่เปลี่ยนตามความคืบหน้าของธุรกิจจึงถูกตรวจครบทั้งสามช่วง
//
// ⚠️ ค่าเหล่านี้ถูก "ปะทับ" ลงบน AppData จริงที่แอปสร้างไว้แล้ว ไม่ได้เขียนทับทั้งก้อน
// (เขียนทับทั้งก้อนแล้วโครงจะไม่ครบ แอป render ไม่ออก และดูเหมือนหน้าเปล่า)

/** ผู้ใช้ใหม่เอี่ยม — ยังไม่มีอะไรเลย */
export const blank = {
  onboardGoal: 'explore',
  focusDismissed: true,
  journeyHidden: true,
};

/** กำลังพิสูจน์ — มีงานวิจัย มีลูกค้าเป้าหมาย ขายได้รายแรกแล้ว แต่ยังไม่รู้กำไร */
export const validating = {
  ...blank,
  audienceType: 'b2b',
  personas: [
    { id: 'p1', name: 'เจ้าของโรงงานฉีดพลาสติก 40 คน', age: '45', job: 'เจ้าของกิจการ' },
  ],
  marketInsight: {
    savedAt: '2026-08-01T00:00:00Z',
    mode: 'b2b',
    segments: ['โรงงาน SME ชลบุรี', 'โรงงาน SME ระยอง'],
  },
  finance: [
    { id: 'f1', label: 'ค่าวางระบบ ISO — ลูกค้า A', amount: 45000, kind: 'revenue', date: '2026-07-10' },
  ],
  funnelSource: 'seed',
};

/** พิสูจน์แล้ว — ขายซ้ำได้ รู้กำไรจริง ต่อตัวเลขจริงแล้ว */
export const proven = {
  ...validating,
  finance: [
    { id: 'f1', label: 'ค่าวางระบบ ISO — ลูกค้า A', amount: 45000, kind: 'revenue', date: '2026-07-10' },
    { id: 'f2', label: 'ค่าวางระบบ ISO — ลูกค้า B', amount: 38000, kind: 'revenue', date: '2026-07-24' },
    { id: 'f3', label: 'อบรมภายใน — ลูกค้า C', amount: 22000, kind: 'revenue', date: '2026-08-08' },
    { id: 'f4', label: 'ค่าเดินทางหาลูกค้า', amount: 6200, kind: 'expense', date: '2026-08-09' },
    { id: 'f5', label: 'ค่าจ้างผู้ช่วยพาร์ทไทม์', amount: 12000, kind: 'expense', date: '2026-08-10' },
  ],
  funnelSource: 'real',
};

export const FIXTURES = { blank, validating, proven };
