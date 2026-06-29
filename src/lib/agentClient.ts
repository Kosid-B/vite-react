/**
 * Frontend client สำหรับ Cloudflare AI Agent
 * ใช้แทน Supabase Edge Function ai-assist ได้เลย
 */

export interface AgentResponse {
  summary: string;
  suggestions: string[];
}

let ws: WebSocket | null = null;
let pendingResolve: ((r: AgentResponse) => void) | null = null;
let pendingReject:  ((e: Error) => void) | null = null;

function getAgentUrl(agentId = 'default'): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/api/agent/CeoAiAgent/${agentId}`;
}

function connect(agentId = 'default'): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(getAgentUrl(agentId));
    socket.onopen = () => resolve(socket);
    socket.onerror = () => reject(new Error('WebSocket connection failed'));
    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as { type: string } & AgentResponse & { error?: string };
        if (msg.type === 'response' && pendingResolve) {
          pendingResolve({ summary: msg.summary, suggestions: msg.suggestions });
          pendingResolve = null; pendingReject = null;
        } else if (msg.type === 'error' && pendingReject) {
          pendingReject(new Error(msg.error ?? 'Agent error'));
          pendingResolve = null; pendingReject = null;
        }
      } catch {}
    };
    socket.onclose = () => { ws = null; };
  });
}

/** ส่งข้อความถึง AI Agent ผ่าน WebSocket และรอผลลัพธ์ */
export async function askAgent(opts: {
  text: string;
  page?: string;
  pageLabel?: string;
  context?: string;
  agentId?: string;
}): Promise<AgentResponse> {
  const id = opts.agentId ?? 'default';

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    ws = await connect(id);
  }

  return new Promise((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject  = reject;
    setTimeout(() => {
      if (pendingReject) {
        pendingReject(new Error('Agent timeout'));
        pendingResolve = null; pendingReject = null;
      }
    }, 30_000);

    ws!.send(JSON.stringify({
      type: 'chat',
      text: opts.text,
      page: opts.page,
      pageLabel: opts.pageLabel,
      context: opts.context,
    }));
  });
}

/** REST fallback (ไม่ใช้ WebSocket) */
export async function askAgentRest(opts: {
  text: string;
  page?: string;
  pageLabel?: string;
  context?: string;
}): Promise<AgentResponse> {
  const res = await fetch(`/api/agent/CeoAiAgent/default`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'ask', args: [opts.text, opts.page, opts.pageLabel, opts.context] }),
  });
  if (!res.ok) throw new Error(`Agent REST error: ${res.status}`);
  return res.json() as Promise<AgentResponse>;
}
