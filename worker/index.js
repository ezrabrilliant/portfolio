// The site on Cloudflare Workers (wrangler.jsonc): the built files in dist/ are the Worker's static assets, and this
// script answers only /api/* (assets.run_worker_first), what server.js answered on the old VPS. Today that is the GTID
// island's /api/gtid/* proxy; any other /api route is a JSON 404 rather than the page.

import { createGtidProxy } from "../server/gtidProxy.js";

const JSON_TYPE = "application/json; charset=utf-8";

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": JSON_TYPE, "cache-control": "no-store" } });
}

/**
 * The fetch handler around one proxy. The proxy's cache lives as long as the isolate (as it lived in the Node process);
 * a refresh it starts in the background is kept alive with ctx.waitUntil, since a Worker may stop work once it answers.
 */
export function createHandler(proxy) {
  return async (request, env, ctx) => {
    const { pathname } = new URL(request.url);
    const gtid = /^\/api\/gtid\/([^/]+)$/.exec(pathname);
    if (gtid && request.method === "GET") {
      try {
        return json(await proxy.get(gtid[1], { background: (p) => ctx.waitUntil(p) }), 200);
      } catch (e) {
        return json({ error: e.message }, e.status || 500);
      }
    }
    if (pathname.startsWith("/api/")) return json({ error: "not found" }, 404);
    return env.ASSETS.fetch(request);
  };
}

const handle = createHandler(createGtidProxy());

export default {
  fetch: (request, env, ctx) => handle(request, env, ctx),
};
