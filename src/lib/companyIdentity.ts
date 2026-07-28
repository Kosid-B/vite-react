// companyIdentity.ts — CEO เสนอชื่อบริษัท (หลัก Corporate Identity) + โลโก้ SVG โปรซีเจอรัล
// pure + deterministic (ไม่มี network/side-effect) → เทสต์ได้ · โลโก้เป็น SVG monogram สร้างในแอป
//   (ไม่พึ่ง image API — สอดคล้อง cityScape.ts) · ใช้ทั้ง fallback offline และหลัง AI เสนอชื่อ
//
// หลัก CI ที่ยึด: จำง่าย (สั้น ออกเสียงง่าย) · สื่อความหมาย (โยงธุรกิจ) · โดดเด่น/ไม่ซ้ำ ·
//   ขยายได้ (ไม่ผูกสินค้าเดียว) · โทนบวก · ใช้เป็นโดเมน/โลโก้ได้

export interface NameProposal {
  name: string;        // ชื่อที่เสนอ
  tagline: string;     // สโลแกนสั้น
  rationale: string;   // เหตุผลตามหลัก CI
  logoSvg: string;     // โลโก้ SVG (self-contained)
  colors: { bg: string; fg: string }; // พาเลตหลัก (ใช้ซ้ำใน UI)
}

/** hash เสถียร (djb2) → ใช้ seed สี/รูปแบบให้ผลเดิมทุกครั้งต่อชื่อเดียว */
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** พาเลตสีจากชื่อ (deterministic) — โทนเข้มอ่านง่าย + ตัวอักษรสว่าง */
export function paletteFor(name: string): { bg: string; fg: string } {
  const hue = hashStr(name) % 360;
  return { bg: `hsl(${hue} 62% 42%)`, fg: '#ffffff' };
}

/** อักษรย่อ (monogram) — เอาอักษรตัวแรกของ 1-2 คำแรก (รองรับไทย/อังกฤษ) */
export function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** โลโก้ SVG โปรซีเจอรัล: รูปทรงพื้นหลัง (วงกลม/หกเหลี่ยม/โล่) + อักษรย่อ — เลือกทรงจาก seed */
export function logoSvg(name: string, size = 96): string {
  const { bg, fg } = paletteFor(name);
  const seed = hashStr(name);
  const mono = monogram(name);
  const shapeKind = seed % 3; // 0 วงกลม · 1 หกเหลี่ยม · 2 โล่มุมมน
  const c = size / 2;
  let shape: string;
  if (shapeKind === 0) {
    shape = `<circle cx="${c}" cy="${c}" r="${c - 4}" fill="${bg}"/>`;
  } else if (shapeKind === 1) {
    const r = c - 4;
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      return `${(c + r * Math.cos(a)).toFixed(1)},${(c + r * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
    shape = `<polygon points="${pts}" fill="${bg}"/>`;
  } else {
    shape = `<rect x="6" y="6" width="${size - 12}" height="${size - 12}" rx="${size * 0.28}" fill="${bg}"/>`;
  }
  const fontSize = mono.length > 1 ? size * 0.4 : size * 0.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="โลโก้ ${escapeXml(name)}">` +
    shape +
    `<text x="${c}" y="${c}" fill="${fg}" font-family="Kanit, system-ui, sans-serif" font-weight="700" font-size="${fontSize.toFixed(0)}" text-anchor="middle" dominant-baseline="central">${escapeXml(mono)}</text>` +
    `</svg>`;
}

function escapeXml(s: string): string {
  return String(s).replace(/[<>&"']/g, ch =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[ch] as string));
}

/* ── ตัวสร้างชื่อแบบ rule-based (fallback offline + เมล็ดให้ AI ต่อยอด) ── */
const AFFIX = ['Nova', 'Prime', 'Vantage', 'Ascend', 'Momentum', 'Lumen', 'Verity', 'Cobalt'];
const TH_ROOTS = ['รุ่งเรือง', 'ก้าวหน้า', 'มั่นคง', 'เจริญ', 'ปัญญา', 'วิถี'];
const SUFFIX = ['Labs', 'Studio', 'Group', 'Works', 'Collective', 'Co'];

/** ดึงคำหลักจากเป้าหมาย/ธุรกิจ มาเป็นรากชื่อ (คำอังกฤษ/ไทยยาว ≥ 3) */
function keywords(text: string): string[] {
  return (text.match(/[A-Za-z]{3,}|[฀-๿]{3,}/g) ?? [])
    .map(w => w[0].toUpperCase() + w.slice(1))
    .filter((w, i, a) => a.indexOf(w) === i)
    .slice(0, 4);
}

export interface IdentityContext {
  industry?: string;   // ประเภทธุรกิจ (DBD)
  goal?: string;       // เป้าหมายหลัก
  keywords?: string;   // คำใบ้เพิ่มจากผู้ใช้
}

/** เสนอชื่อ (rule-based) พร้อมโลโก้ — deterministic, ไม่ซ้ำกันในชุด */
export function localNameProposals(ctx: IdentityContext, count = 4): NameProposal[] {
  const kw = keywords([ctx.keywords, ctx.goal, ctx.industry].filter(Boolean).join(' '));
  const root = kw[0] ?? 'Thai';
  const seed = hashStr(root + (ctx.industry ?? ''));
  const candidates: { name: string; why: string }[] = [
    { name: `${root} ${AFFIX[seed % AFFIX.length]}`, why: 'โยงธุรกิจ + คำพลังบวก จำง่าย ขยายไลน์สินค้าได้' },
    { name: `${AFFIX[(seed + 3) % AFFIX.length]} ${SUFFIX[seed % SUFFIX.length]}`, why: 'สั้น โดดเด่น เป็นสากล ใช้เป็นโดเมนได้' },
    { name: `${root}${(kw[1] ?? 'AI')}`, why: 'ผสมคำหลัก 2 คำ = จดจำง่าย สื่อคุณค่าเฉพาะตัว' },
    { name: `${TH_ROOTS[seed % TH_ROOTS.length]} ${root}`, why: 'รากไทยโทนบวก เข้าถึงตลาดไทย น่าเชื่อถือ' },
    { name: `${root} ${SUFFIX[(seed + 2) % SUFFIX.length]}`, why: 'โครงสร้างชื่อองค์กรชัดเจน ดูมืออาชีพ' },
    { name: `${AFFIX[(seed + 5) % AFFIX.length]}${root}`, why: 'คำเดียวติดหู แบรนด์แข็งแรง เลียนแบบยาก' },
  ];
  const seen = new Set<string>();
  const out: NameProposal[] = [];
  for (const cand of candidates) {
    const name = cand.name.replace(/\s+/g, ' ').trim();
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({
      name,
      tagline: taglineFor(name, ctx),
      rationale: cand.why,
      logoSvg: logoSvg(name),
      colors: paletteFor(name),
    });
    if (out.length >= count) break;
  }
  return out;
}

function taglineFor(name: string, ctx: IdentityContext): string {
  const g = (ctx.goal ?? '').trim();
  if (g) return g.length > 48 ? g.slice(0, 46) + '…' : g;
  return `${name} — สร้างธุรกิจให้โตอย่างเป็นระบบด้วย AI`;
}

/** prompt ให้ CEO (ai-assist) เสนอชื่อตามหลัก CI — ให้คืน suggestions รูปแบบ "ชื่อ — เหตุผล"
 *  (เข้ากับ ai-assist ที่คืน {summary, suggestions[]}) · client สร้างโลโก้ + tagline เอง */
export function nameProposalPrompt(ctx: IdentityContext): string {
  return (
    'คุณคือ CEO ช่วยตั้งชื่อบริษัทตามหลัก Corporate Identity (จำง่าย สื่อความหมาย โดดเด่น ขยายได้ โทนบวก ใช้เป็นโดเมน/โลโก้ได้). ' +
    `ธุรกิจ: ${ctx.industry ?? '-'} · เป้าหมาย: ${ctx.goal ?? '-'}${ctx.keywords ? ' · คำใบ้: ' + ctx.keywords : ''}. ` +
    'เสนอ 5 ชื่อที่หลากหลาย (ไทย/อังกฤษ/ผสม). ให้ suggestions เป็นรายการ แต่ละอันรูปแบบ "ชื่อบริษัท — เหตุผลตามหลัก CI สั้น ๆ" ' +
    '(ขีดกลาง — คั่นระหว่างชื่อกับเหตุผล). ห้ามใส่เลขลำดับหน้า.'
  );
}

/** แปลง suggestions ("ชื่อ — เหตุผล") จาก ai-assist → NameProposal พร้อมโลโก้ */
export function parseAiNameSuggestions(suggestions: string[], ctx: IdentityContext = {}): NameProposal[] {
  const seen = new Set<string>();
  const out: NameProposal[] = [];
  for (const raw of suggestions ?? []) {
    const line = String(raw).replace(/^\s*\d+[.)]\s*/, '').trim(); // ตัดเลขลำดับถ้ามี
    if (!line) continue;
    const m = line.split(/\s[—–-]\s/); // แยกชื่อ กับ เหตุผล ด้วยขีดกลาง
    const name = (m[0] ?? '').trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const rationale = (m.slice(1).join(' — ')).trim();
    out.push({
      name,
      tagline: taglineFor(name, ctx),
      rationale: rationale || 'เสนอโดย CEO ตามหลัก Corporate Identity',
      logoSvg: logoSvg(name),
      colors: paletteFor(name),
    });
  }
  return out;
}

/** แปลงผล AI (names[]) → NameProposal พร้อมโลโก้ (สร้างฝั่ง client) */
export function proposalsFromAi(names: { name?: string; tagline?: string; rationale?: string }[]): NameProposal[] {
  return (names ?? [])
    .filter(n => n?.name?.trim())
    .map(n => {
      const name = n.name!.trim();
      return {
        name,
        tagline: (n.tagline ?? '').trim() || `${name}`,
        rationale: (n.rationale ?? '').trim() || 'เสนอโดย CEO ตามหลัก Corporate Identity',
        logoSvg: logoSvg(name),
        colors: paletteFor(name),
      };
    });
}
