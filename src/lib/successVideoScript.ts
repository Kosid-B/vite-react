// successVideoScript.ts — สร้าง "สคริปต์วิดีโอ YouTube ~30 นาที" อัตโนมัติจากข้อมูลธุรกิจที่ผู้ใช้กรอก
// เป้าหมาย: สร้างความเชื่อมั่นว่า "ระบบพาไปสำเร็จได้" โดยเล่าเป็นเส้นทาง (journey) ที่ personalize จากธุรกิจจริงของเขา
// pure + tested · ⚠️ ไม่แต่งตัวเลข/ไม่การันตีรายได้ — เป็น "แผน/วิสัยทัศน์ที่ระบบพาไป" ไม่ใช่คำสัญญา
import type { AppData, AudienceType } from '../types';

export interface BusinessInfo {
  company: string;       // ชื่อบริษัท/ร้าน
  industry: string;      // ประเภทธุรกิจ
  goal: string;          // เป้าหมายหลัก
  audience?: AudienceType;
  product?: string;      // ผลิตภัณฑ์/บริการ
  valueProp?: string;    // คุณค่าหลัก
  persona?: string;      // กลุ่มลูกค้าตัวอย่าง
}

export interface VideoChapter {
  no: number;
  time: string;          // ช่วงเวลาโดยประมาณ เช่น "0:00–3:00"
  heading: string;
  narration: string;     // บทพากย์หลัก (ไทย)
  points: string[];      // ประเด็นขยายความให้ผู้บรรยายเล่าต่อ (ยืดเวลาให้ถึง ~30 นาที)
  visual: string;        // คิวภาพ
}

export interface SuccessVideoScript {
  title: string;
  thumbnail: string;
  disclaimer: string;
  chapters: VideoChapter[];
  estMinutes: number;    // ประเมินความยาวจากจำนวนตัวอักษร (พูดไทย ~700 อักษร/นาที)
}

export interface Readiness {
  filled: string[];
  missing: string[];
  score: number;         // 0..1
  ready: boolean;        // มีข้อมูลพอจะสร้างสคริปต์ที่ personalize ได้จริง
}

const CHARS_PER_MIN = 700; // อัตราพูดไทยโดยประมาณ (รวมช่องว่าง) สำหรับประเมินความยาว

function clean(s: string | undefined | null): string {
  return (s ?? '').trim();
}

export function audienceLabel(a?: AudienceType): string {
  if (a === 'b2b') return 'ลูกค้าธุรกิจ/องค์กร (B2B)';
  if (a === 'b2c') return 'ลูกค้าทั่วไป (B2C)';
  return 'ลูกค้าของคุณ';
}

/** ดึงข้อมูลธุรกิจจาก AppData (ส่วนที่ผู้ใช้กรอก) */
export function businessInfoFromData(d: AppData): BusinessInfo {
  const c = d.aiCompany;
  const vpFromBmc = clean(d.businessModel?.bmc?.value?.[0]);
  return {
    company: clean(c?.name),
    industry: clean(c?.industry),
    goal: clean(c?.goal) || clean(c?.mission),
    audience: d.audienceType,
    product: clean(c?.productDesc),
    valueProp: clean(c?.productVp) || vpFromBmc,
    persona: clean(d.personas?.[0]?.name),
  };
}

/** เช็คว่ากรอกข้อมูลพอไหม — ใช้ให้ UI เตือนกรอกเพิ่มเพื่อสคริปต์ที่ตรงธุรกิจ */
export function readinessFor(info: BusinessInfo): Readiness {
  const checks: Array<[string, string]> = [
    ['company', 'ชื่อธุรกิจ'],
    ['industry', 'ประเภทธุรกิจ'],
    ['goal', 'เป้าหมายหลัก'],
    ['audience', 'กลุ่มลูกค้า (B2B/B2C)'],
    ['product', 'ผลิตภัณฑ์/บริการ'],
    ['valueProp', 'คุณค่าหลัก (Value Prop)'],
  ];
  const filled: string[] = [];
  const missing: string[] = [];
  for (const [key, label] of checks) {
    if (clean(info[key as keyof BusinessInfo] as string)) filled.push(label);
    else missing.push(label);
  }
  const score = filled.length / checks.length;
  // พร้อมสร้างเมื่อมีอย่างน้อย ชื่อธุรกิจ + (ประเภท หรือ เป้าหมาย)
  const ready = !!clean(info.company) && (!!clean(info.industry) || !!clean(info.goal));
  return { filled, missing, score, ready };
}

function co(info: BusinessInfo): string {
  return info.company || 'ธุรกิจของคุณ';
}
function ind(info: BusinessInfo): string {
  return info.industry || 'ธุรกิจของคุณ';
}

/** สร้างสคริปต์วิดีโอ ~30 นาที จากข้อมูลธุรกิจ */
export function buildSuccessVideoScript(info: BusinessInfo): SuccessVideoScript {
  const C = co(info);
  const IND = ind(info);
  const AUD = audienceLabel(info.audience);
  const goal = info.goal || 'เติบโตอย่างมั่นคงและขยายได้';
  const product = info.product || 'สินค้า/บริการของคุณ';
  const vp = info.valueProp || 'สิ่งที่ลูกค้าได้แล้วชีวิตดีขึ้น';
  const persona = info.persona || 'ลูกค้าที่ใช่ที่สุดของคุณ';

  const custChapter: VideoChapter = info.audience === 'b2b'
    ? {
        no: 7, time: '19:00–23:00',
        heading: `หา “ลูกค้าองค์กร” ให้ ${C} — ดีลเดียวเลี้ยงได้ทั้งปี`,
        narration:
          `เพราะ ${C} ขายให้ ${AUD} เกมของคุณไม่ใช่การขายทีละชิ้น แต่คือการได้ “ลูกค้าประจำ” ` +
          `ที่ซื้อซ้ำและสั่งทีละมาก ระบบช่วยจับคู่ ${C} กับองค์กรที่กำลังมองหาสิ่งที่คุณมี ` +
          `เปลี่ยนจากการวิ่งหาลูกค้ารายวัน เป็นการมีดีมานด์ที่จองไว้ล่วงหน้า`,
        points: [
          `ใช้ตัวจับคู่ธุรกิจ (Matchmaker) หาองค์กรที่ต้องการ ${product} แบบซื้อประจำ`,
          'ระบบ RFQ — ให้ลูกค้าองค์กรส่งใบขอเสนอราคาเข้ามาหาคุณเอง',
          'ปิดดีลใหญ่ 1 ราย = รายได้ที่คาดการณ์ได้ทั้งปี ลดความผันผวน',
          'CEO/CMO AI ช่วยร่างข้อเสนอและติดตาม pipeline ให้ไม่หลุด',
        ],
        visual: '[ภาพ: หน้า Marketplace/RFQ + การจับคู่ B2B]',
      }
    : {
        no: 7, time: '19:00–23:00',
        heading: `หาลูกค้าให้ ${C} — เลิกนั่งรอ walk-in`,
        narration:
          `เพราะ ${C} ขายให้ ${AUD} สิ่งที่คุณต้องการคือ “คนเห็น–คนเจอ–คนสั่ง” อย่างสม่ำเสมอ ` +
          `ระบบสร้างหน้าร้านออนไลน์ที่ค้นเจอบน Google ได้จริง ทำเรื่องเทคนิคให้เบื้องหลัง ` +
          `แล้วช่วยจับคู่ ${C} กับคนที่กำลังมองหาสิ่งที่คุณขาย — เปลี่ยนการนั่งรอเป็นการยื่นให้ถึงมือ`,
        points: [
          'หน้าร้านสาธารณะ + SEO อัตโนมัติ — ลูกค้าเสิร์ชเจอโดยคุณแค่กรอกข้อมูลร้าน',
          'การ์ดแชร์ LINE/Facebook ที่กดแล้วสั่งได้เลย',
          'เติมชั่วโมงว่าง (ช่วงร้านเงียบ) ให้กลายเป็นออร์เดอร์',
          `สื่อสารที่ “โมเมนต์” ของ ${persona} ไม่ใช่แค่บอกสรรพคุณสินค้า`,
        ],
        visual: '[ภาพ: หน้าร้าน /b/ + ปุ่มแชร์ LINE]',
      };

  const chapters: VideoChapter[] = [
    {
      no: 1, time: '0:00–2:30',
      heading: `${C} เริ่มต้นที่ความกล้า — แต่ไปถึงด้วยระบบ`,
      narration:
        `ทุกธุรกิจที่สำเร็จ เริ่มจากคนคนหนึ่งที่กล้าตัดสินใจ วันนี้คนคนนั้นคือคุณ และธุรกิจนั้นคือ ${C} ` +
        `แต่ความจริงที่คนไม่ค่อยพูดคือ “ความกล้า” อย่างเดียวพาไปไม่ถึง สิ่งที่พาไปถึงคือ “ระบบ” ` +
        `คลิปนี้จะพาคุณเห็นเส้นทางที่ ${C} จะเดิน ตั้งแต่วันนี้จนถึงวันที่ ${goal}`,
      points: [
        `${C} อยู่ในกลุ่ม ${IND} — ตลาดที่มีโอกาสจริงถ้าเริ่มถูกวิธี`,
        'เป้าหมายของคลิปนี้: ให้คุณเห็นภาพทั้งเส้นทาง ไม่ใช่แค่จุดเริ่ม',
        'ทุกก้าวข้างหน้าจะมีข้อมูลและมีทีมช่วยคิด ไม่ต้องเดาเอง',
      ],
      visual: `[ภาพ: โลโก้/ชื่อ ${C} + ไตเติลเส้นทางสู่ความสำเร็จ]`,
    },
    {
      no: 2, time: '2:30–6:00',
      heading: 'จุดที่คุณอยู่ตอนนี้ (และทำไมมันไม่ใช่ปัญหา)',
      narration:
        `ตอนนี้คุณอาจรู้สึกว่ามีเรื่องต้องทำเต็มไปหมด และกลัวว่าจะพลาด — นั่นเป็นเรื่องปกติของทุกคนที่เริ่มจริง ` +
        `ข่าวดีคือ ธุรกิจส่วนใหญ่ไม่ได้ล้มเพราะเจ้าของไม่เก่ง แต่ล้มเพราะ “ไม่มีระบบให้ตัดสินใจ” ` +
        `และนั่นคือสิ่งเดียวที่ ${C} จะไม่ขาดตั้งแต่วันนี้`,
      points: [
        'ปัญหาที่แท้จริง 3 ข้อ: เดาใจตลาด · ทำคนเดียว · ไม่มีระบบ',
        'ทั้งสามข้อแก้ด้วย “ระบบ + ข้อมูล” ไม่ใช่แค่ขยันขึ้น',
        `${C} จะได้ทั้งสามอย่างนี้เป็นพื้นฐาน`,
      ],
      visual: '[ภาพ: มอนทาจเจ้าของธุรกิจตัวเล็กทำงานหลายบทบาท]',
    },
    {
      no: 3, time: '6:00–9:30',
      heading: `โอกาสของ ${C} ในตลาด ${IND}`,
      narration:
        `ก่อนจะทุ่มแรง เราต้องรู้ก่อนว่า “สนามนี้มีที่ให้เรายืนไหม” ระบบช่วย ${C} ประเมินขนาดตลาดและช่องว่าง ` +
        `เพื่อให้คุณเห็นโอกาสจริง ไม่ใช่ความหวังลอย ๆ — นี่คือก้าวแรกของการลดความเสี่ยง`,
      points: [
        `ประเมินตลาดของ ${IND} (ช่วงโดยประมาณ) + จุดที่คู่แข่งยังไม่ครอง`,
        `คุณค่าที่ ${C} จะยึด: ${vp}`,
        'ใช้ VRIO ดูว่าอะไรที่เราทำได้ดีจนลอกยาก',
        '⚠️ ตัวเลขทั้งหมดมาจากข้อมูลที่คุณกรอก — เป็นการประเมินเพื่อตัดสินใจ',
      ],
      visual: '[ภาพ: หน้า Market Sizing + VRIO]',
    },
    {
      no: 4, time: '9:30–13:30',
      heading: 'เสาที่ 1 — เริ่มถูกด้วย MIT 24 ขั้น',
      narration:
        `หัวใจที่ทำให้ ${C} “เริ่มถูก” คือหลักสร้างธุรกิจของ MIT — พิสูจน์ว่ามีคนอยากซื้อ ${product} ก่อนทุ่มเงินผลิต ` +
        `ระบบถามคุณเป็นคำถามทีละข้อ แล้ว AI ช่วยตกผลึก ว่าใครคือ ${persona} เขาเจอปัญหาอะไร และ ${C} แก้ได้จริงแค่ไหน`,
      points: [
        `ระบุลูกค้าคนแรกที่ใช่: ${persona}`,
        `ทดสอบคุณค่า: ${vp} — ลูกค้าได้อะไร ลด pain เพิ่ม gain ตรงไหน`,
        'พิสูจน์บนกระดาษก่อน = ยังไม่เสียเงินผลิต',
        'ได้ผลลัพธ์ GO / PIVOT / KILL ที่ชัดเจน',
      ],
      visual: '[ภาพ: หน้า Business Model · MIT24 + Personas]',
    },
    {
      no: 5, time: '13:30–17:00',
      heading: 'เสาที่ 2 — โตไกลด้วยระบบและมาตรฐาน',
      narration:
        `เริ่มถูกอย่างเดียวไม่พอ ${C} ต้อง “โตได้โดยไม่พึ่งคุณคนเดียว” นี่คือเสาที่สอง — ระบบบริหารและมาตรฐาน ` +
        `แบบเดียวกับที่องค์กรใหญ่ใช้ แต่ย่อให้ธุรกิจเล็กใช้ได้จริง เพื่อให้วันที่คุณไม่อยู่ ธุรกิจก็ยังเดินหน้า`,
      points: [
        'วางกระบวนการหลักเป็น SOP — ลอกยากขึ้น ส่งต่อคนอื่นทำได้',
        'ตัวชี้วัด (KPI) + การเงินที่ CFO AI ช่วยดูให้',
        'พร้อมขยาย (scalable) โดยคุณภาพไม่ตก',
        `ทั้งหมดเล็งไปที่เป้า: ${goal}`,
      ],
      visual: '[ภาพ: หน้า SIPOC/ISO + CFO analysis]',
    },
    {
      no: 6, time: '17:00–19:00',
      heading: `ทีม AI ของ ${C} — ลงมือแทนคุณ 24 ชม.`,
      narration:
        `คุณไม่ต้องทำทุกอย่างคนเดียวอีกต่อไป ${C} มีทีมผู้บริหาร AI — CEO วางแผนและมอบงาน CFO ดูเงิน CMO คิดการตลาด ` +
        `และเอเจนต์ลงมือทำงานจริง คุณโฟกัสสิ่งที่มีแต่คุณทำได้ ที่เหลือให้ระบบช่วยแบ่งเบา`,
      points: [
        'CEO AI แตกเป้าหมายใหญ่เป็นงานย่อยที่ทำได้จริง',
        'เอเจนต์ช่วยคิดคอนเทนต์ หาข้อมูลตลาด ร่างแผน',
        'เมืองบริษัทโตตามงานจริง — เห็นความคืบหน้า ไม่ท้อกลางทาง',
      ],
      visual: `[ภาพ: หน้าบริษัท AI ของ ${C} + เมืองบริษัท]`,
    },
    custChapter,
    {
      no: 8, time: '23:00–26:00',
      heading: 'คุ้มไหม? — เห็นตัวเลขของคุณเอง',
      narration:
        `คำถามสำคัญคือ “ลงแรงลงเงินแล้วคุ้มไหม” ระบบให้คุณคำนวณ ROI หรือ “ความคุ้มค่า” เองจากตัวเลขจริงของ ${C} ` +
        `แล้วเทียบกับค่าใช้ระบบต่อเดือน ว่าคุ้มกี่เท่า และต้องได้เพิ่มเท่าไหร่ถึงคืนทุน`,
      points: [
        'กรอก 3 ช่อง → เห็นผลตอบแทนเทียบค่าระบบทันที',
        'AI เขียนบทวิเคราะห์ให้อ่านง่าย ว่าคุ้มหรือยัง',
        '⚠️ คำนวณจากตัวเลขที่คุณกรอกเอง — เพื่อช่วยตัดสินใจ ไม่ใช่รับประกันรายได้',
      ],
      visual: '[ภาพ: เครื่องคำนวณ ROI บนหน้าแรก]',
    },
    {
      no: 9, time: '26:00–28:30',
      heading: `ภาพความสำเร็จของ ${C}`,
      narration:
        `ลองจินตนาการวันที่ ${C} ไปถึงเป้า — ${goal} ไม่ใช่เพราะโชคดี แต่เพราะทุกก้าวมีข้อมูล มีระบบ และมีทีมช่วยคิด ` +
        `นั่นคือความแตกต่างระหว่าง “หวังว่าจะรอด” กับ “รู้ว่ากำลังไปถูกทาง”`,
      points: [
        'จากเดาสุ่ม → ตัดสินใจด้วยข้อมูล',
        'จากทำคนเดียว → มีทั้งบริษัทช่วย',
        'จากนั่งรอลูกค้า → มีระบบพาลูกค้ามาหา',
        '📌 นี่คือ “แผน/วิสัยทัศน์ที่ระบบพาไป” — ผลจริงขึ้นกับการลงมือของคุณ',
      ],
      visual: `[ภาพ: เมือง ${C} เติบโตสว่างไสว + เป้าหมายที่ทำได้]`,
    },
    {
      no: 10, time: '28:30–30:00',
      heading: 'ก้าวแรกของคุณ วันนี้',
      narration:
        `เส้นทางทั้งหมดนี้ เริ่มได้ฟรีวันนี้ ไม่ต้องใส่บัตร ${C} ไม่จำเป็นต้องสมบูรณ์แบบตั้งแต่วันแรก ` +
        `แค่เริ่มก้าวแรก แล้วให้ระบบพาไปทีละขั้น เข้าไปที่ ceoaithailand.org แล้วเริ่มเลย`,
      points: [
        'เริ่มฟรีที่ ceoaithailand.org/start',
        'ทดสอบไอเดีย → หาลูกค้า → วางระบบ ทีละขั้น',
        'คุณไม่ได้เดินคนเดียวอีกต่อไป',
      ],
      visual: '[ภาพ: โลโก้ + ceoaithailand.org/start + end screen]',
    },
  ];

  const totalChars = chapters.reduce((n, ch) => n + ch.narration.length + ch.points.join('').length, 0);
  const estMinutes = Math.max(1, Math.round(totalChars / CHARS_PER_MIN));

  return {
    title: `${C} — เส้นทางสู่ความสำเร็จด้วยระบบ AI (ฉบับเต็ม ~30 นาที)`,
    thumbnail: `ซ้าย: เจ้าของ ${C} วันแรก · ขวา: ธุรกิจที่โตเป็นระบบ · ข้อความ: "${C} ทำได้"`,
    disclaimer: 'สคริปต์นี้สร้างจากข้อมูลที่คุณกรอก เป็น “แผน/วิสัยทัศน์ที่ระบบพาไป” เพื่อสร้างกำลังใจและความชัดเจน — ไม่ใช่การรับประกันผลลัพธ์หรือรายได้',
    chapters,
    estMinutes,
  };
}

/** instruction ให้ ai-assist "ขัดเกลาสำนวน" บทพากย์ให้ลื่น–เป็นธรรมชาติ
 *  ⚠️ คงข้อเท็จจริง/ชื่อธุรกิจ/disclaimer เดิม · ห้ามแต่งตัวเลขหรือคำสัญญารายได้ */
export function polishInstruction(s: SuccessVideoScript): string {
  const body = s.chapters
    .map(ch => `บทที่ ${ch.no} (${ch.heading}): ${ch.narration}`)
    .join('\n');
  return (
    `ช่วยขัดเกลา "บทพากย์" ของสคริปต์วิดีโอต่อไปนี้ให้ลื่นไหล เป็นธรรมชาติ ฟังแล้วอบอุ่นน่าเชื่อถือ ` +
    `เหมาะกับการพากย์เสียงภาษาไทย โดย:\n` +
    `- คงใจความ ข้อเท็จจริง และชื่อธุรกิจเดิมทุกอย่าง\n` +
    `- ห้ามแต่งตัวเลข สถิติ หรือคำรับประกันรายได้ใด ๆ ที่ไม่มีในต้นฉบับ\n` +
    `- คงจุดยืนว่านี่คือ "แผน/วิสัยทัศน์ที่ระบบพาไป" ไม่ใช่การการันตี\n` +
    `- ตอบกลับเป็นบทพากย์ที่ขัดเกลาแล้ว ${s.chapters.length} ข้อ (suggestions) เรียงตามบทที่ 1 ถึง ${s.chapters.length} ข้อละ 1 บท\n\n` +
    `บทพากย์ต้นฉบับ:\n${body}`
  );
}

/** ใช้ผลจาก ai-assist (suggestions รายบท) แทนบทพากย์เดิม — คงโครง/ภาพ/points เดิม
 *  ปลอดภัย: แทนเฉพาะเมื่อจำนวน suggestions เท่ากับจำนวนบท และข้อความไม่ว่าง */
export function applyPolish(s: SuccessVideoScript, suggestions: string[]): SuccessVideoScript {
  if (!Array.isArray(suggestions) || suggestions.length !== s.chapters.length) return s;
  const chapters = s.chapters.map((ch, i) => {
    const polished = clean(suggestions[i]);
    return polished ? { ...ch, narration: polished } : ch;
  });
  return { ...s, chapters };
}

/** แปลงเป็นข้อความล้วน (พากย์/คัดลอก) */
export function scriptToPlainText(s: SuccessVideoScript): string {
  const lines: string[] = [s.title, '', s.disclaimer, ''];
  for (const ch of s.chapters) {
    lines.push(`[${ch.time}] บทที่ ${ch.no}: ${ch.heading}`);
    lines.push(ch.visual);
    lines.push(ch.narration);
    if (ch.points.length) {
      lines.push('ขยายความ:');
      for (const p of ch.points) lines.push(`- ${p}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

/** แปลงเป็น Markdown (ดาวน์โหลด/แชร์) */
export function scriptToMarkdown(s: SuccessVideoScript): string {
  const lines: string[] = [`# ${s.title}`, '', `> ${s.disclaimer}`, '', `**ความยาวประเมิน:** ~${s.estMinutes} นาที`, '', `**ทัมเนล:** ${s.thumbnail}`, ''];
  for (const ch of s.chapters) {
    lines.push(`## บทที่ ${ch.no} · ${ch.time} — ${ch.heading}`);
    lines.push(`\`${ch.visual}\``);
    lines.push('');
    lines.push(ch.narration);
    if (ch.points.length) {
      lines.push('');
      lines.push('**ขยายความ:**');
      for (const p of ch.points) lines.push(`- ${p}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
