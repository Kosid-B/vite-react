/// <reference types="@cloudflare/workers-types" />

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
        const body = await request.json() as { text: string; pageLabel?: string; context?: string };
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
    this.history = [...messages, { role: 'assistant', content: raw }].slice(-20);

    // Parse structured JSON
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as { summary: string; suggestions: string[] };
    } catch { /* empty */ }
    return { summary: raw, suggestions: [] };
  }
}
