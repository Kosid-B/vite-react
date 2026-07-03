/// <reference types="@cloudflare/workers-types" />

export { CeoAiAgent } from './agent/CeoAiAgent';

interface Env {
  ANTHROPIC_API_KEY: string;
  CeoAiAgent: DurableObjectNamespace;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Route /api/agent/CeoAiAgent/<agentId> → Durable Object แยกต่อ workspace (R8)
    // เดิมทุก workspace แชร์ DO 'default' ตัวเดียว — ข้อมูล agent ปนกันข้ามบริษัท
    if (url.pathname.startsWith('/api/agent/')) {
      const seg = url.pathname.split('/')[4] ?? '';           // /api/agent/CeoAiAgent/<id>
      const agentId = /^[A-Za-z0-9_-]{1,64}$/.test(seg) ? seg : 'default';
      const id = env.CeoAiAgent.idFromName(agentId);
      const stub = env.CeoAiAgent.get(id);
      return stub.fetch(request);
    }

    // Health check
    if (url.pathname === '/api/health') {
      return Response.json({ ok: true, ts: Date.now() });
    }

    // Serve static SPA assets
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
