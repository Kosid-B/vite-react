import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.26.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// แมปชื่อโมเดลที่แสดงในหน้า UI → Model ID จริงของ Anthropic
const MODEL_MAP: Record<string, string> = {
  'claude-opus-4-8': 'claude-opus-4-8',
  'claude-sonnet-4-6': 'claude-sonnet-4-6',
  'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const {
      role,        // ตำแหน่ง เช่น CEO, CTO, CMO
      name,        // ชื่อเล่น เช่น Aria
      mandate,     // หน้าที่/ขอบเขตงานของ agent
      model,       // โมเดลที่ agent นี้ใช้
      title,       // ชื่องาน
      detail,      // รายละเอียดงาน
      goal,        // เป้าหมายบริษัท
      industry,    // อุตสาหกรรม
      companyName, // ชื่อบริษัท
      orgContext,  // รายชื่อ agent อื่นในทีม [{role, mandate}]
    } = await req.json();

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
    const actualModel = MODEL_MAP[model] ?? 'claude-sonnet-4-6';

    // สร้าง context ของผังองค์กรเพื่อให้ agent รู้ว่าทีมมีใครบ้าง
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
      orgLines
        ? `ผังองค์กร — เพื่อนร่วมทีม:\n${orgLines}`
        : '',
      '',
      `คุณเป็น AI Agent ที่ดำเนินงานจริงในฐานะ ${role}`,
      `ตอบเป็นภาษาไทย ให้ผลลัพธ์ที่เป็นรูปธรรม ชัดเจน พร้อมนำไปใช้ได้ทันที`,
      `ไม่ต้องแนะนำตัว ไม่ต้องพูดว่า "ในฐานะ AI" — ลงมือทำงานเลย`,
    ].filter(Boolean).join('\n');

    const userMsg = [
      `งานที่ได้รับมอบหมาย: ${title}`,
      '',
      detail ? `รายละเอียด: ${detail}` : '',
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

    return new Response(JSON.stringify({ output }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
