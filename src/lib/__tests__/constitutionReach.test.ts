import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 ความผิดที่เทสต์นี้กัน (Architecture Consolidation Audit · 24 ส.ค. 2569)
 *
 *    ผมเขียนใน CLAUDE.md และในข้อความคอมมิตว่า
 *      "constitutionBlock() ต่อเข้า brandBriefBlock() ⇒ Vision เดินทางไปกับทุก prompt"
 *    ตรวจจริงแล้ว: มี 15 จุดในโค้ดที่ประกอบคำสั่งส่งเข้า AI · **มี 1 จุดที่แปะรัฐธรรมนูญ**
 *    และ AI ที่ผู้ใช้คุยด้วยจริง (CeoAiAgent + edge functions) ไม่ได้รับเลยสักตัว
 *
 *    เป็นความผิดชั้นที่ ① ของ skill `shipped-not-written` ("โค้ดถูกเรียกใช้จริงไหม")
 *    ที่เกิดขึ้นขณะกำลังสร้างกลไกที่มีไว้กันความผิดชนิดนี้เอง
 *
 * วิธีกัน: ไม่ได้บังคับให้ทุกจุดต้องแปะรัฐธรรมนูญ (บางจุดไม่ควรแปะจริง ๆ)
 *          แต่บังคับว่า **ทุกจุดต้องถูกจัดกลุ่มอย่างจงใจ** ⇒ เพิ่มจุดเรียก AI ใหม่
 *          แล้วไม่ตัดสินใจว่าจะแปะหรือไม่แปะ = แดงทันที
 * ══════════════════════════════════════════════════════════════════════════ */

const SRC = resolve(__dirname, '../..');

/** จุดที่ประกอบคำสั่งส่งเข้า AI แล้ว **ได้รับ** รัฐธรรมนูญแล้ว */
const CARRIES: string[] = [
  'components/GrowthAiPanel.tsx',   // ผ่าน growthAnalysis.growthPrompt() → brandBriefBlock()
];

/** จุดที่ **ยังไม่ได้รับ** — ต้องมีเหตุผลกำกับทุกบรรทัด ห้ามใส่เปล่า ๆ
 *  🔴 = ควรได้รับแต่ยังไม่ได้ต่อ (หนี้) · 🟢 = ไม่ควรได้รับจริง ๆ */
const NOT_YET: Record<string, string> = {
  'components/AiAssist.tsx': '🔴 หนี้ — AI แนะนำทุกหน้า ควรได้รับรัฐธรรมนูญ',
  'components/CompanyNamer.tsx': '🟢 ตั้งชื่อบริษัทของ *ผู้ใช้* ไม่ใช่คอนเทนต์ของเรา',
  'components/MarketAgent.tsx': '🔴 หนี้ — วิจัยตลาดควรผ่าน Golden Question',
  'components/SuccessVideoPanel.tsx': '🔴 หนี้ — เป็นคอนเทนต์สาธารณะ',
  'components/IntakePanel.tsx': '🔴 หนี้ — เป็นด่านแรกที่ควรใช้ Founder Mindset',
  'components/CfoAnalysis.tsx': '🟢 วิเคราะห์ตัวเลขของผู้ใช้ ห้ามให้บริบทแบรนด์เราไปกวน',
  'lib/streamAssist.ts': '🔴 หนี้ — ทางผ่านของ AI แบบสตรีม',
  'lib/openShop.ts': '🟢 สร้างข้อความหน้าร้านของผู้ใช้',
  'pages/Trade.tsx': '🟢 จับคู่ซื้อขายของผู้ใช้',
  'pages/Personas.tsx': '🔴 หนี้ — persona ต้องตรงกับกลุ่มเป้าหมายที่บรีฟกำหนด',
  'pages/TrustContent.tsx': '🔴 หนี้ — เป็นคอนเทนต์สาธารณะ',
  'pages/Knowledge.tsx': '🔴 หนี้ — คลังความรู้ที่ผู้ใช้อ่านต่อ ควรอยู่ในกรอบเดียวกับบรีฟ',
  'pages/MyStorefront.tsx': '🟢 หน้าร้านของผู้ใช้',
  'pages/AdminTabs/CaseStudyTab.tsx': '🔴 หนี้ — เคสที่นำเข้าถูกใช้เป็นคอนเทนต์ต่อ',
};

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== '__tests__') walk(p, out); }
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

/** ไฟล์ที่ประกอบคำสั่งส่งเข้า AI — จับจาก `instruction:` ที่เป็นคีย์ของ payload */
const callSites = walk(SRC)
  .filter((p) => /\binstruction:/.test(readFileSync(p, 'utf8')))
  .map((p) => p.slice(SRC.length + 1))
  .sort();

describe('🔴 รัฐธรรมนูญไปถึง AI ตัวไหนบ้าง (ห้ามอ้างว่า "ทุก prompt")', () => {
  it('เจอจุดเรียก AI จริง (กันเทสต์ผ่านเพราะสแกนไม่เจอ)', () => {
    expect(callSites.length).toBeGreaterThan(10);
  });

  it('ทุกจุดต้องถูกจัดกลุ่มอย่างจงใจ — เพิ่มจุดใหม่แล้วไม่ตัดสินใจ = แดง', () => {
    const unclassified = callSites.filter((f) => !CARRIES.includes(f) && !(f in NOT_YET));
    expect(unclassified, `จุดเรียก AI ที่ยังไม่ถูกจัดกลุ่ม: ${unclassified.join(', ')}`).toEqual([]);
  });

  it('รายการที่จัดไว้ต้องยังมีอยู่จริง — ไฟล์ถูกลบ/เปลี่ยนชื่อแล้วต้องรู้', () => {
    const stale = [...CARRIES, ...Object.keys(NOT_YET)].filter((f) => !callSites.includes(f));
    expect(stale, `อยู่ในรายการแต่ไม่ใช่จุดเรียก AI แล้ว: ${stale.join(', ')}`).toEqual([]);
  });

  it('ทุกจุดที่ยังไม่ได้รับ ต้องมีเหตุผล และต้องติดป้ายว่าเป็นหนี้ 🔴 หรือไม่ควรได้รับ 🟢', () => {
    for (const [f, why] of Object.entries(NOT_YET)) {
      expect(why.length, f).toBeGreaterThan(10);
      expect(/^(🔴|🟢)/.test(why), `${f}: ต้องขึ้นต้นด้วย 🔴 หรือ 🟢`).toBe(true);
    }
  });

  it('🟢 AI ที่ผู้ใช้คุยด้วยจริง (CeoAiAgent) ต้องได้รับรัฐธรรมนูญ — ต่อสายแล้ว 24 ส.ค. 2569', () => {
    const agent = readFileSync(resolve(SRC, 'agent/CeoAiAgent.ts'), 'utf8');
    expect(/constitutionBlock\(\)/.test(agent), 'CeoAiAgent หลุดรัฐธรรมนูญ').toBe(true);
    // 🔴 จุดยืนเก่าที่เจ้าของเปลี่ยนแล้ว ห้ามกลับมาอยู่ในปากของ AI ที่ผู้ใช้คุยด้วย
    expect(agent).not.toMatch(/แพลตฟอร์มสร้างบริษัท AI อัตโนมัติ/);
    expect(agent).toMatch(/AI Business Builder สำหรับคนไทย/);
    expect(agent).toMatch(/Validation ก่อน Scale/);
  });


  it('🔴 ต้องบันทึกไว้ว่า production มีตาราง marketing_* ที่รีโปนี้ไม่ได้เป็นเจ้าของ', () => {
    const doc = readFileSync(resolve(SRC, '../docs/product/ARCHITECTURE-CONSOLIDATION-AUDIT.md'), 'utf8');
    // ตรวจสด 24 ส.ค. 2569: 10 migration ใน production ที่ไม่มีในรีโป (23 ส.ค. 07:38–08:36)
    expect(doc).toMatch(/20260823073854/);
    expect(doc).toMatch(/20260823083627/);
    expect(doc).toMatch(/marketing_\* .{0,20}33 ตาราง|33 ตาราง/);
    // ถ้ารีโปเริ่มเป็นเจ้าของ schema นี้เมื่อไร เทสต์นี้ต้องถูกแก้พร้อมกับ migration ที่เพิ่มเข้ามา
    const owns = readdirSync(resolve(SRC, '../supabase/migrations'))
      .some((f) => /marketing/.test(f));
    expect(owns, 'รีโปเริ่มมี migration marketing_* แล้ว → อัปเดต audit §0').toBe(false);
  });

  it('เอกสาร audit ต้องมีอยู่และรายงานตัวเลขความครอบคลุมจริง', () => {
    const doc = readFileSync(resolve(SRC, '../docs/product/ARCHITECTURE-CONSOLIDATION-AUDIT.md'), 'utf8');
    expect(doc).toContain(`${callSites.length} จุด`);
    expect(doc).toMatch(/ไม่จริง/);
  });
});
