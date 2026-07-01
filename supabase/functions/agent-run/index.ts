import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.26.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL_MAP: Record<string, string> = {
  'claude-opus-4-8': 'claude-opus-4-8',
  'claude-sonnet-4-6': 'claude-sonnet-4-6',
  'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
};

// ─── Serper.dev Search helper ─────────────────────────────────────────────────
const SERPER_KEY = Deno.env.get('SERPER_API_KEY') ?? '';

async function serperSearch(query: string, count = 5): Promise<string> {
  if (!SERPER_KEY) return '';
  const r = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, gl: 'th', hl: 'th', num: count }),
  }).catch(() => null);
  if (!r?.ok) return '';
  const data = await r.json();
  const results: any[] = (data?.organic ?? []).slice(0, count);
  if (!results.length) return '';
  return results
    .map((x, i) => `[${i + 1}] ${x.title}\n${x.link}\n${x.snippet ?? ''}`)
    .join('\n\n');
}

// ─── Handler ──────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const {
      role,
      name,
      mandate,
      model,
      title,
      detail,
      goal,
      industry,
      companyName,
      orgContext,
      useWebSearch,    // เปิดใช้ Brave Search สำหรับงานนี้
      searchQuery,     // custom query (ถ้าไม่ระบุ ใช้ title + industry)
    } = await req.json();

    // ─── Brave Search (ถ้าเปิดใช้และมี API key) ──────────────────────────
    let webContext = '';
    if (useWebSearch) {
      const q = searchQuery ?? `${title} ${industry ?? ''} ไทย 2025`.trim();
      const raw = await serperSearch(q, 5);
      if (raw) {
        webContext = `\n\n--- ข้อมูลล่าสุดจาก Web (Brave Search) ---\nQuery: "${q}"\n\n${raw}\n--- สิ้นสุดข้อมูลจาก Web ---`;
      }
    }

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
    const actualModel = MODEL_MAP[model] ?? 'claude-sonnet-4-6';

    const orgLines = (orgContext ?? [])
      .map((a: { role: string; mandate: string }) => `  • ${a.role}: ${a.mandate}`)
      .join('\n');

    const system = [
      `คุณคือ ${role} (${name}) ของบริษัท ${companyName} ในอุตสาหกรรม ${industry}`,
      '',
      `หน้าที่และความรับผิดชอบของคุณ:`,
      mandate,
      '',
      `เป้าหมายหลักของบริษัท:`,
      goal,
      '',
      orgLines ? `ผังองค์กร — เพื่อนร่วมทีม:\n${orgLines}` : '',
      '',
      `คุณเป็น AI Agent ที่ดำเนินงานจริงในฐานะ ${role}`,
      webContext ? `คุณมีสิทธิ์เข้าถึงข้อมูลจาก Web Search แบบ real-time — ใช้ข้อมูลนี้เพื่อให้ผลลัพธ์ที่ทันสมัยและแม่นยำ` : '',
      `ตอบเป็นภาษาไทย ให้ผลลัพธ์ที่เป็นรูปธรรม ชัดเจน พร้อมนำไปใช้ได้ทันที`,
      `ไม่ต้องแนะนำตัว ไม่ต้องพูดว่า "ในฐานะ AI" — ลงมือทำงานเลย`,
    ].filter(Boolean).join('\n');

    const userMsg = [
      `งานที่ได้รับมอบหมาย: ${title}`,
      '',
      detail ? `รายละเอียด: ${detail}` : '',
      webContext,
      '',
      `ดำเนินงานนี้ตามบทบาทหน้าที่ของคุณ ส่งผลลัพธ์ที่ชัดเจนและนำไปใช้ได้จริง`,
    ].filter(Boolean).join('\n');

    const response = await client.messages.create({
      model: actualModel,
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: userMsg }],
    });

    const output = (response.content[0] as { text: string }).text;
    const webSearchUsed = useWebSearch && !!webContext;

    return new Response(JSON.stringify({ output, webSearchUsed }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
