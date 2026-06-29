/**
 * Cloudflare Worker entry point
 * - Routes /api/agent/* → CeoAiAgent (Durable Object via `agents` package)
 * - Everything else → static SPA assets
 */
import { routeAgentRequest } from 'agents';

export { CeoAiAgent } from './agent/CeoAiAgent';

interface Env {
  ANTHROPIC_API_KEY: string;
  CeoAiAgent: DurableObjectNamespace;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route /api/agent/* to the Durable Object via the agents SDK
    if (url.pathname.startsWith('/api/agent')) {
      const agentRes = await routeAgentRequest(request, env);
      if (agentRes) return agentRes;
    }

    // Health check
    if (url.pathname === '/api/health') {
      return Response.json({ ok: true, ts: Date.now() });
    }

    // Fall through to Vite-built SPA (static assets)
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
