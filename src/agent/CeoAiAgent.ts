import { Agent, type Connection, unstable_callable as callable } from 'agents';

interface Env {
  ANTHROPIC_API_KEY: string;
  CeoAiAgent: DurableObjectNamespace;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface IncomingMsg {
  type: 'chat';
  text: string;
  page?: string;
  pageLabel?: string;
  context?: string;
  history?: ChatMessage[];
}

const SYSTEM = `คุณคือ AI ที่ปรึกษาธุรกิจของ CEO AI Thailand — แพลตฟอร์มสร้างบริษัท AI อัตโนมัติสำหรับธุรกิจไทย
ให้คำแนะนำที่กระชับ ตรงประเด็น เป็นรายข้อ ใช้ภาษาไทยเป็นหลัก
วิเคราะห์ตามกรอบ: VRIO, 24 Steps MIT, Business Model Canvas, ISO 9001
ตอบในรูปแบบ JSON: { "summary": "สรุป 1-2 ประโยค", "suggestions": ["ข้อ1","ข้อ2","ข้อ3"] }`;

export class CeoAiAgent extends Agent<Env> {
  private history: ChatMessage[] = [];

  async onConnect(connection: Connection) {
    connection.send(JSON.stringify({ type: 'ready', agentId: this.name }));
  }

  async onMessage(connection: Connection, message: string) {
    let msg: IncomingMsg;
    try {
      msg = JSON.parse(message) as IncomingMsg;
    } catch {
      connection.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' }));
      return;
    }

    if (msg.type !== 'chat') return;

    // Build prompt with page context
    const userContent = [
      msg.pageLabel ? `[หน้า: ${msg.pageLabel}]` : '',
      msg.context   ? `[บริบท: ${msg.context}]`   : '',
      msg.text,
    ].filter(Boolean).join('\n');

    // Merge incoming history + current turn
    const messages: ChatMessage[] = [
      ...(msg.history ?? this.history).slice(-10),
      { role: 'user', content: userContent },
    ];

    try {
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
        const err = await res.text();
        connection.send(JSON.stringify({ type: 'error', error: `Anthropic error: ${res.status} ${err}` }));
        return;
      }

      const json = (await res.json()) as { content: { type: string; text: string }[] };
      const raw = json.content?.[0]?.text ?? '';

      // Parse structured JSON from Claude
      let parsed: { summary: string; suggestions: string[] };
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : { summary: raw, suggestions: [] };
      } catch {
        parsed = { summary: raw, suggestions: [] };
      }

      // Persist to history
      this.history = [
        ...messages,
        { role: 'assistant', content: raw },
      ].slice(-20);

      connection.send(JSON.stringify({ type: 'response', ...parsed }));
    } catch (e) {
      connection.send(JSON.stringify({ type: 'error', error: String(e) }));
    }
  }

  // REST endpoint — callable from non-WS clients
  @callable()
  async ask(text: string, page = '', pageLabel = '', context = ''): Promise<{ summary: string; suggestions: string[] }> {
    const userContent = [pageLabel && `[หน้า: ${pageLabel}]`, context && `[บริบท: ${context}]`, text].filter(Boolean).join('\n');

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
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    const json = (await res.json()) as { content: { type: string; text: string }[] };
    const raw = json.content?.[0]?.text ?? '';
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : { summary: raw, suggestions: [] };
    } catch {
      return { summary: raw, suggestions: [] };
    }
  }
}
