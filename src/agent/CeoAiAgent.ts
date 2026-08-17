/// <reference types="@cloudflare/workers-types" />

import { FREE_DAILY_TOKENS, type Engagement } from '../lib/tokenEconomics';

interface Env {
  ANTHROPIC_API_KEY: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface IncomingMsg {
  type: 'chat';
  text: string;
  pageLabel?: string;
  context?: string;
}

interface OutgoingMsg {
  type: 'ready' | 'response' | 'error';
  summary?: string;
  suggestions?: string[];
  error?: string;
  agentId?: string;
}

const SYSTEM = `คุณคือ AI ที่ปรึกษาธุรกิจของ CEO AI Thailand — แพลตฟอร์มสร้างบริษัท AI อัตโนมัติสำหรับธุรกิจไทย
ให้คำแนะนำที่กระชับ ตรงประเด็น เป็นรายข้อ ใช้ภาษาไทยเป็นหลัก
วิเคราะห์ตามกรอบ: VRIO, 24 Steps MIT, Business Model Canvas, ISO 9001
ตอบในรูปแบบ JSON เท่านั้น: { "summary": "สรุป 1-2 ประโยค", "suggestions": ["ข้อ1","ข้อ2","ข้อ3"] }`;

export class CeoAiAgent implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private history: ChatMessage[] = [];

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get('Upgrade') ?? '';

    // WebSocket connection
    if (upgrade.toLowerCase() === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];

      this.state.acceptWebSocket(server);
      const id = this.state.id.toString().slice(0, 8);
      server.send(JSON.stringify({ type: 'ready', agentId: id } satisfies OutgoingMsg));

      return new Response(null, { status: 101, webSocket: client });
    }

    // REST fallback: POST { text, pageLabel, context }
    if (request.method === 'POST') {
      try {
        const body = await request.json() as { text: string; pageLabel?: string; context?: string; tier?: string };
        // Guest path (ไม่ล็อกอิน) — จำกัดโควตา token/IP/วัน (คนดูนาน=tier สูง ได้มากกว่า) · ไม่เก็บประวัติ
        if (request.headers.get('x-guest-ask') === '1') {
          const ip = request.headers.get('cf-connecting-ip') || 'unknown';
          return Response.json(await this.guestAsk(ip, body));
        }
        const result = await this.callClaude(body.text, body.pageLabel, body.context);
        return Response.json(result);
      } catch (e) {
        return Response.json({ error: String(e) }, { status: 500 });
      }
    }

    return new Response('CEO AI Agent is running', { status: 200 });
  }

  // WebSocket Hibernation API handlers
  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
    let msg: IncomingMsg;
    try {
      msg = JSON.parse(text) as IncomingMsg;
    } catch {
      ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' } satisfies OutgoingMsg));
      return;
    }

    if (msg.type !== 'chat') return;

    try {
      const result = await this.callClaude(msg.text, msg.pageLabel, msg.context);
      ws.send(JSON.stringify({ type: 'response', ...result } satisfies OutgoingMsg));
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', error: String(e) } satisfies OutgoingMsg));
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    ws.close();
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    ws.close();
  }

  // ── Guest AI (ลอง AI จริงก่อนสมัคร) — โควตาเป็น "token/IP/วัน" (คนดูนาน=tier สูง ได้มากกว่า) fail-closed ──
  //   เพดานต่อ IP = FREE_DAILY_TOKENS[tier] (cold/warm/hot) จาก tokenEconomics (source of truth)
  private static readonly GUEST_GLOBAL_TOKENS = 8_000_000; // เพดาน token รวมทุก IP/วัน (backstop งบบาน ~฿2.4k/วัน)
  private static readonly FAIL_EST_TOKENS = 1200;          // ประมาณ token เมื่อ call ล้ม (นับกัน retry ถล่ม)

  /** clamp tier ที่ client ส่งมาให้เป็นค่าที่ถูกต้อง (default cold — ปลอดภัยไว้ก่อน) */
  private guestTier(t?: string): Engagement {
    return t === 'hot' || t === 'warm' || t === 'cold' ? t : 'cold';
  }

  /** ตอบ guest ถ้ายังไม่เกินเพดาน token/วัน — ทุก error ในชั้น quota = ปิด (fail-closed) ห้ามเปิดทะลุ */
  private async guestAsk(
    ip: string,
    body: { text: string; pageLabel?: string; context?: string; tier?: string },
  ): Promise<{ summary: string; suggestions: string[]; guestTokensLeft?: number; capped?: boolean }> {
    const CAP_MSG = {
      summary: 'คุณลองใช้ทีม AI ครบโควตา token ฟรีของวันนี้แล้ว 🎉 สมัครฟรี 15 วัน (ไม่ต้องใช้บัตร) เพื่อให้ทีม AI ทำงานให้ต่อแบบเต็มรูปแบบ',
      suggestions: ['สมัครฟรีเพื่อใช้ทีม AI ต่อ', 'บันทึกงานที่ทำไว้', 'ปลดล็อกทุกเครื่องมือ'],
      capped: true,
    };
    const q = (body.text || '').trim();
    if (!q) return { summary: 'พิมพ์คำถามหรือบอกธุรกิจของคุณสักหน่อย แล้วทีม AI จะช่วยแนะนำให้ครับ', suggestions: [] };

    const cap = FREE_DAILY_TOKENS[this.guestTier(body.tier)];
    let used: number;
    try {
      const gate = await this.checkGuestTokens(ip, cap); // ตรวจ "ก่อน" เรียก AI (ยังไม่บวก actual)
      if (!gate.ok) return CAP_MSG;
      used = gate.used;
    } catch {
      return CAP_MSG; // อ่าน storage พัง → ปิดไว้ก่อน (ไม่ยอมเปิดทะลุ)
    }

    try {
      const result = await this.callClaudeStateless(q, body.pageLabel, body.context);
      const spent = Math.max(1, result.usage.inputTokens + result.usage.outputTokens);
      await this.addGuestTokens(ip, spent);
      return { summary: result.summary, suggestions: result.suggestions, guestTokensLeft: Math.max(0, cap - used - spent) };
    } catch {
      // AI ล้ม — นับ token ประมาณเพื่อกัน retry ถล่ม (ยอมรับได้) · ตอบ fallback สุภาพ
      await this.addGuestTokens(ip, CeoAiAgent.FAIL_EST_TOKENS).catch(() => {});
      return { summary: 'ตอนนี้ทีม AI ไม่ว่างชั่วครู่ ลองใหม่อีกครั้งได้เลยครับ', suggestions: [], guestTokensLeft: Math.max(0, cap - used - CeoAiAgent.FAIL_EST_TOKENS) };
    }
  }

  /** ตรวจว่ายังมี token เหลือไหม (ไม่บวก) — ok=false เมื่อเกินเพดาน IP หรือเพดานรวม */
  private async checkGuestTokens(ip: string, cap: number): Promise<{ ok: boolean; used: number }> {
    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const s = this.state.storage;
    const ipUsed = ((await s.get<number>(`gtok:${ip}:${day}`)) ?? 0);
    const totUsed = ((await s.get<number>(`gtoktot:${day}`)) ?? 0);
    if (ipUsed >= cap) return { ok: false, used: ipUsed };
    if (totUsed >= CeoAiAgent.GUEST_GLOBAL_TOKENS) return { ok: false, used: ipUsed };
    return { ok: true, used: ipUsed };
  }

  /** บวก token ที่ใช้จริงเข้าตัวนับ IP + รวม (หลังเรียก AI) */
  private async addGuestTokens(ip: string, tokens: number): Promise<void> {
    const day = new Date().toISOString().slice(0, 10);
    const s = this.state.storage;
    const ipKey = `gtok:${ip}:${day}`;
    const totKey = `gtoktot:${day}`;
    await s.put(ipKey, ((await s.get<number>(ipKey)) ?? 0) + tokens);
    await s.put(totKey, ((await s.get<number>(totKey)) ?? 0) + tokens);
  }

  /** เรียก Claude แบบไม่มีประวัติ (สำหรับ guest ที่ใช้ DO ร่วมกัน — กันข้อมูลปนข้ามคน) + คืน usage token จริง */
  private async callClaudeStateless(
    text: string, pageLabel?: string, context?: string,
  ): Promise<{ summary: string; suggestions: string[]; usage: { inputTokens: number; outputTokens: number } }> {
    const userContent = [
      pageLabel ? `[หน้า: ${pageLabel}]` : '',
      context ? `[บริบท: ${context}]` : '',
      text,
    ].filter(Boolean).join('\n');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': this.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 700, system: SYSTEM, messages: [{ role: 'user', content: userContent }] }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const json = await res.json() as { content: { type: string; text: string }[]; usage?: { input_tokens?: number; output_tokens?: number } };
    const raw = json.content?.[0]?.text ?? '';
    const usage = { inputTokens: json.usage?.input_tokens ?? 0, outputTokens: json.usage?.output_tokens ?? 0 };
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) return { ...(JSON.parse(match[0]) as { summary: string; suggestions: string[] }), usage };
    } catch { /* empty */ }
    return { summary: raw, suggestions: [], usage };
  }

  private async callClaude(
    text: string,
    pageLabel?: string,
    context?: string,
  ): Promise<{ summary: string; suggestions: string[] }> {
    const userContent = [
      pageLabel ? `[หน้า: ${pageLabel}]` : '',
      context   ? `[บริบท: ${context}]`  : '',
      text,
    ].filter(Boolean).join('\n');

    const messages: ChatMessage[] = [
      ...this.history.slice(-10),
      { role: 'user', content: userContent },
    ];

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM,
        messages,
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    }

    const json = await res.json() as { content: { type: string; text: string }[] };
    const raw = json.content?.[0]?.text ?? '';

    // Persist history
    this.history = [...messages, { role: 'assistant' as const, content: raw }].slice(-20);

    // Parse structured JSON
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as { summary: string; suggestions: string[] };
    } catch { /* empty */ }
    return { summary: raw, suggestions: [] };
  }
}
