import type { AppData } from '../types';
import { TH_GENERATIONS } from './marketInsightTH';

/* ===== Personal Brand Builder — CMO สร้างแบรนด์ประจำตัวของบริษัท =====
 * สกัดแบรนด์จากข้อมูล workspace (ชื่อ/อุตสาหกรรม/เป้าหมาย/สินค้า) → persona · voice & tone ·
 * content pillars · ช่องทาง (ผูกกับ Gen ตลาดไทย) · bio/tagline · ปฏิทินโพสต์
 * อิงกรอบ personal brand / linkedin-strategy — ใช้ได้ทุก workspace */

export interface BrandArchetype { key: string; name: string; vibe: string; voice: string[] }

/** เลือก archetype จากคำในอุตสาหกรรม/เป้าหมาย */
export function pickArchetype(d: AppData): BrandArchetype {
  const t = `${d.aiCompany?.industry || ''} ${d.aiCompany?.goal || ''} ${d.aiCompany?.productDesc || ''}`.toLowerCase();
  const ARCH: BrandArchetype[] = [
    { key: 'sage', name: '🧠 ผู้รู้ (The Sage)', vibe: 'น่าเชื่อถือ ให้ความรู้ ที่ปรึกษาผู้เชี่ยวชาญ',
      voice: ['ชัดเจน มีหลักฐาน', 'สอนให้เข้าใจง่าย', 'สุภาพ มืออาชีพ'] },
    { key: 'creator', name: '🎨 นักสร้างสรรค์ (The Creator)', vibe: 'สร้างสรรค์ ทันสมัย กล้าต่าง',
      voice: ['สนุก มีสไตล์', 'เล่าเรื่องด้วยภาพ', 'กระตุ้นให้ลอง'] },
    { key: 'hero', name: '🚀 ผู้พาไปถึงเป้า (The Hero)', vibe: 'มุ่งผลลัพธ์ ให้กำลังใจ พาลงมือทำ',
      voice: ['ตรงประเด็น มีพลัง', 'เน้นผลลัพธ์/ตัวเลข', 'ชวนลงมือทันที'] },
    { key: 'caregiver', name: '🤝 ผู้ดูแล (The Caregiver)', vibe: 'ใส่ใจ เข้าถึงง่าย อยู่ข้างลูกค้า',
      voice: ['อบอุ่น เป็นกันเอง', 'ฟังและช่วยแก้', 'ให้ความมั่นใจ'] },
  ];
  if (/iso|มาตรฐาน|compliance|ที่ปรึกษา|training|consult|กฎหมาย|บัญชี|การเงิน/.test(t)) return ARCH[0];
  if (/ครีเอ|content|ดีไซน์|แฟชั่น|อาหาร|ท่องเที่ยว|บันเทิง|art|design/.test(t)) return ARCH[1];
  if (/ขาย|เติบโต|startup|สตาร์ท|เพิ่มยอด|scale|growth|ลงทุน/.test(t)) return ARCH[2];
  if (/บริการ|ดูแล|สุขภาพ|ชุมชน|care|help|support/.test(t)) return ARCH[3];
  return ARCH[0];
}

/** ช่องทาง + จังหวะโพสต์ ผูกกับ Gen ตลาดไทย */
export function brandChannels() {
  const genX = TH_GENERATIONS.find(g => g.gen === 'Gen X');
  const genY = TH_GENERATIONS.find(g => g.gen === 'Gen Y');
  const genZ = TH_GENERATIONS.find(g => g.gen === 'Gen Z');
  return [
    { icon: '💼', name: 'LinkedIn / Facebook (มืออาชีพ)', cadence: '3 โพสต์/สัปดาห์', focus: `ความน่าเชื่อถือ + เคสจริง (${genX?.gen} ${genX?.share}% — Brand Trust)` },
    { icon: '📘', name: 'Facebook Group / Page', cadence: '4–5 โพสต์/สัปดาห์', focus: `ความคุ้มค่า + Engagement (${genY?.gen} ${genY?.share}% — เจ้าของธุรกิจ)` },
    { icon: '🎵', name: 'TikTok / Reels (สั้น)', cadence: '1 คลิป/วัน', focus: `รีวิว/ครีเอทีฟ (${genZ?.gen} ${genZ?.share}% — Influencer/Review)` },
  ];
}

export interface BrandKit {
  name: string;
  archetype: BrandArchetype;
  positioning: string;
  voice: string[];
  dont: string[];
  pillars: { icon: string; name: string; detail: string }[];
  channels: ReturnType<typeof brandChannels>;
  bioShort: string;
  bioLong: string;
  taglines: string[];
}

export function brandKit(d: AppData): BrandKit {
  const c = d.aiCompany;
  const name = c?.name?.trim() || 'บริษัทของคุณ';
  const industry = c?.industry?.trim() || 'ธุรกิจ';
  const goal = c?.goal?.trim() || 'ช่วยลูกค้าให้สำเร็จ';
  const arch = pickArchetype(d);
  return {
    name,
    archetype: arch,
    positioning: `${name} — ${arch.vibe} สำหรับ${industry} ที่ต้องการ${goal}`,
    voice: arch.voice,
    dont: ['ไม่โอ้อวดเกินจริง', 'ไม่ใช้ศัพท์เทคนิคที่ลูกค้าไม่เข้าใจ', 'ไม่ก็อปคู่แข่ง — เล่าจากประสบการณ์จริง'],
    pillars: [
      { icon: '💡', name: 'ให้ความรู้ (Educate)', detail: `เคล็ดลับ/how-to ด้าน${industry} ที่ลูกค้าใช้ได้จริง` },
      { icon: '🏆', name: 'พิสูจน์ผล (Proof)', detail: 'เคสสำเร็จ · ตัวเลข · รีวิวลูกค้า (Win Story)' },
      { icon: '👤', name: 'เบื้องหลัง (Story)', detail: 'ที่มา ตัวตน ทีมงาน เหตุผลที่ทำ — สร้างความผูกพัน' },
      { icon: '🎯', name: 'ชวนลงมือ (CTA)', detail: 'ข้อเสนอ/โปรฯ/ให้ทดลอง — เปลี่ยนผู้ติดตามเป็นลูกค้า' },
    ],
    channels: brandChannels(),
    bioShort: `${arch.name.replace(/^[^ ]+ /, '')} · ${industry} | ${name}`,
    bioLong: `${name} ช่วย${industry}ให้${goal} ด้วยแนวทาง${arch.vibe} — ` +
      `เราเชื่อว่าการลงมือทำจริงและผลลัพธ์ที่วัดได้สำคัญกว่าคำพูดสวยหรู ติดตามเราเพื่อรับเคล็ดลับ เคสจริง และเครื่องมือที่ใช้ได้ทันที`,
    taglines: [
      `${name} — ${goal}ได้จริง เริ่มวันนี้`,
      `${industry}ที่ไว้ใจได้ ผลลัพธ์ที่จับต้องได้`,
      `ทำธุรกิจให้โต ด้วย${name}`,
    ],
  };
}

/** ข้อความแบรนด์เต็ม (สำหรับคัดลอก/เสนอ CEO-บอร์ด) */
export function brandKitText(d: AppData): string {
  const b = brandKit(d);
  const L: string[] = [];
  L.push(`🎨 Personal Brand Kit — ${b.name}`);
  L.push(`Archetype: ${b.archetype.name} · ${b.archetype.vibe}`);
  L.push('');
  L.push(`Positioning: ${b.positioning}`);
  L.push('');
  L.push('Voice & Tone (โทนเสียงแบรนด์):');
  b.voice.forEach(v => L.push(`   ✓ ${v}`));
  b.dont.forEach(v => L.push(`   ✗ ${v}`));
  L.push('');
  L.push('Content Pillars (เสาเนื้อหา 4 ด้าน):');
  b.pillars.forEach(p => L.push(`   ${p.icon} ${p.name} — ${p.detail}`));
  L.push('');
  L.push('ช่องทาง & จังหวะโพสต์ (ตาม Gen ตลาดไทย):');
  b.channels.forEach(ch => L.push(`   ${ch.icon} ${ch.name} · ${ch.cadence} · ${ch.focus}`));
  L.push('');
  L.push(`Bio สั้น: ${b.bioShort}`);
  L.push(`Bio ยาว: ${b.bioLong}`);
  L.push('');
  L.push('Tagline (เลือก 1):');
  b.taglines.forEach((t, i) => L.push(`   ${i + 1}) ${t}`));
  return L.join('\n');
}

/** คำสั่งให้ CMO agent สร้าง/ปรับแบรนด์ (ค้นตลาดจริงเสริม) */
export function brandInstruction(d: AppData): string {
  const b = brandKit(d);
  const c = d.aiCompany;
  return [
    `ทำหน้าที่ CMO: สร้าง/ปรับ "Personal Brand" ของ ${b.name} (${c?.industry || '-'}) ให้โดดเด่นและแข่งขันได้`,
    `เป้าหมายบริษัท: ${c?.goal || '-'}`,
    `แบรนด์ตั้งต้น (draft): Archetype ${b.archetype.name} · Positioning: ${b.positioning}`,
    '',
    'ให้ค้นเทรนด์คอนเทนต์/คู่แข่งล่าสุด แล้วส่งมอบ Brand Kit ที่ใช้ได้จริง:',
    '1) Positioning statement (1 ประโยค) + กลุ่มเป้าหมายหลัก',
    '2) Brand persona + Voice & Tone (คำที่ใช้/ไม่ใช้)',
    '3) Content Pillars 4 ด้าน + ตัวอย่างหัวข้อโพสต์ด้านละ 2',
    '4) แผนช่องทาง (LinkedIn/FB/TikTok) + จังหวะโพสต์ต่อ Gen',
    '5) Bio สั้น/ยาว + 3 tagline ให้เลือก',
    '6) 30-day content starter (7 โพสต์แรกที่โพสต์ได้ทันที)',
    '',
    'ตอบเป็นภาษาไทย กระชับ เอาไปใช้/โพสต์ได้ทันที',
  ].join('\n');
}
