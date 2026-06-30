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

    // Route /api/agent/* → CeoAiAgent Durable Object
    if (url.pathname.startsWith('/api/agent/')) {
      const id = env.CeoAiAgent.idFromName('default');
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
