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
        // Guest path (ไม่ล็อกอิน) — จำกัดโควตาต่อ IP + เพดานรวม/วัน · ไม่เก็บประวัติ (กันปนข้าม guest)
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

  // ── Guest AI (ลอง AI จริงก่อนสมัคร) — กันงบบานด้วย cap ต่อ IP + เพดานรวม/วัน แบบ fail-closed ──
  private static readonly GUEST_PER_IP = 3;      // ครั้ง/IP/วัน
  private static readonly GUEST_GLOBAL = 400;    // เพดานรวมทุก IP/วัน (backstop กันงบบานแม้ IP ถูก spoof)

  /** ตอบ guest ถ้ายังไม่เกินโควตา — ทุก error ในชั้น quota = ปิด (fail-closed) ห้ามเปิดทะลุ */
  private async guestAsk(
    ip: string,
    body: { text: string; pageLabel?: string; context?: string },
  ): Promise<{ summary: string; suggestions: string[]; guestRemaining?: number; capped?: boolean }> {
    const CAP_MSG = {
      summary: 'คุณลองใช้ทีม AI ครบโควตาฟรีของวันนี้แล้ว 🎉 สมัครฟรี 15 วัน (ไม่ต้องใช้บัตร) เพื่อให้ทีม AI ทำงานให้ต่อแบบเต็มรูปแบบ',
      suggestions: ['สมัครฟรีเพื่อใช้ทีม AI ต่อ', 'บันทึกงานที่ทำไว้', 'ปลดล็อกทุกเครื่องมือ'],
      capped: true,
    };
    const q = (body.text || '').trim();
    if (!q) return { summary: 'พิมพ์คำถามหรือบอกธุรกิจของคุณสักหน่อย แล้วทีม AI จะช่วยแนะนำให้ครับ', suggestions: [] };

    let remaining: number;
    try {
      const gate = await this.reserveGuestQuota(ip); // จองโควตา "ก่อน" เรียก AI (นับแม้เรียกล้มเหลว = กัน retry ถล่ม)
      if (!gate.ok) return CAP_MSG;
      remaining = gate.remaining;
    } catch {
      return CAP_MSG; // อ่าน/เขียน storage พัง → ปิดไว้ก่อน (ไม่ยอมเปิดทะลุ)
    }

    try {
      const result = await this.callClaudeStateless(q, body.pageLabel, body.context);
      return { ...result, guestRemaining: remaining };
    } catch {
      // AI ล้ม — โควตาถูกนับไปแล้ว (ยอมรับได้ เพื่อกัน retry abuse) · ตอบ fallback สุภาพ
      return { summary: 'ตอนนี้ทีม AI ไม่ว่างชั่วครู่ ลองใหม่อีกครั้งได้เลยครับ', suggestions: [], guestRemaining: remaining };
    }
  }

  /** จอง 1 โควตา (atomic-ish บน DO single-thread) — คืน ok=false เมื่อเกิน IP หรือเพดานรวม */
  private async reserveGuestQuota(ip: string): Promise<{ ok: boolean; remaining: number }> {
    const day = new Date().toISOString().slice(0, 10);          // YYYY-MM-DD (UTC)
    const ipKey = `g:${ip}:${day}`;
    const totKey = `gt:${day}`;
    const s = this.state.storage;
    const ipN = ((await s.get<number>(ipKey)) ?? 0);
    const totN = ((await s.get<number>(totKey)) ?? 0);
    if (ipN >= CeoAiAgent.GUEST_PER_IP) return { ok: false, remaining: 0 };
    if (totN >= CeoAiAgent.GUEST_GLOBAL) return { ok: false, remaining: 0 };
    await s.put(ipKey, ipN + 1);
    await s.put(totKey, totN + 1);
    return { ok: true, remaining: CeoAiAgent.GUEST_PER_IP - (ipN + 1) };
  }

  /** เรียก Claude แบบไม่มีประวัติ (สำหรับ guest ที่ใช้ DO ร่วมกัน — กันข้อมูลปนข้ามคน) */
  private async callClaudeStateless(
    text: string, pageLabel?: string, context?: string,
  ): Promise<{ summary: string; suggestions: string[] }> {
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
    const json = await res.json() as { content: { type: string; text: string }[] };
    const raw = json.content?.[0]?.text ?? '';
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as { summary: string; suggestions: string[] };
    } catch { /* empty */ }
    return { summary: raw, suggestions: [] };
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
