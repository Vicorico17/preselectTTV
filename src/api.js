import { randomUUID } from "node:crypto";
import { DraftEngine } from "./draft-engine.js";
import { authFor, beginTwitchAuth, finishTwitchAuth, logout, twitchConfigured } from "./auth.js";
import { loadSnapshot, persistenceMode, saveSnapshot } from "./persistence.js";
import { verifyExtensionJwt } from "./extension-auth.js";
import { championCatalog, liveEsportsMatches } from "./automation-data.js";

const globalStore = globalThis.__pickPredictStore || { engines: new Map(), clients: new Set() };
globalThis.__pickPredictStore = globalStore;
const clients = globalStore.clients;
const engineFor = channelId => {
  if (!globalStore.engines.has(channelId)) globalStore.engines.set(channelId, new DraftEngine());
  return globalStore.engines.get(channelId);
};
const ready = globalStore.ready || (globalStore.ready = loadSnapshot().then(snapshot => {
  if (!snapshot) return;
  if (snapshot.version === 3 && Array.isArray(snapshot.channels)) {
    for (const [channelId, state] of snapshot.channels) engineFor(channelId).restore(state);
  } else engineFor("demo").restore(snapshot);
}).catch(error => console.error("Recovery load failed:", error.message)));
const allSnapshots = () => ({ version: 3, savedAt: Date.now(), channels: [...globalStore.engines].map(([id, engine]) => [id, engine.snapshot()]) });

const sendJson = (res, status, data) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(data));
};
const applyCors = (req, res) => {
  const origin = String(req.headers.origin || "");
  const explicit = String(process.env.EXTENSION_ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
  if (/^https:\/\/[a-z0-9-]+\.ext-twitch\.tv$/i.test(origin) || explicit.includes(origin)) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "Origin");
    res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
    res.setHeader("access-control-allow-headers", "Content-Type,Authorization,X-Extension-JWT,X-Viewer-ID");
    res.setHeader("access-control-max-age", "86400");
  }
};
const broadcast = () => {
  for (const res of clients) res.write(`event: refresh\ndata: ${Date.now()}\n\n`);
};
const body = async req => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
};
const publicActions = {
  join: (engine, data, req, context) => {
    const id = context.viewerId || req.headers["x-viewer-id"] || randomUUID();
    return { viewer: engine.join(id, data.name), viewerId: id };
  },
  predict: (engine, data, req, context) => engine.predict(context.viewerId || req.headers["x-viewer-id"], data.champion)
};
const producerActions = {
  "match/create": (engine, data) => engine.createMatch(data),
  "match/configure": (engine, data) => engine.configure(data),
  "series/clear": engine => engine.clearSeries(),
  "draft/start": engine => engine.startDraft(),
  "draft/new-game": engine => engine.newGame(),
  "draft/resolve": (engine, data) => engine.resolve(data.champion),
  "draft/cancel": engine => engine.cancelRound(),
  "draft/undo": engine => engine.undoLast(),
  "draft/reset": engine => engine.resetGame(),
  "recovery/import": (engine, data) => engine.restore(data.snapshot)
};

const contextFor = (req, url) => {
  const auth = authFor(req);
  const extension = verifyExtensionJwt(req);
  const channelId = extension?.channel_id || (auth.configured && auth.producer ? auth.user.id : null) || url.searchParams.get("channel") || "demo";
  const extensionProducer = extension && ["broadcaster", "moderator"].includes(extension.role);
  return {
    auth, extension, channelId,
    viewerId: extension?.opaque_user_id || null,
    producer: extension ? Boolean(extensionProducer) : auth.producer
  };
};

export async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    applyCors(req, res);
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
    await ready;
    if (url.pathname === "/api/auth/login") return beginTwitchAuth(req, res);
    if (url.pathname === "/api/auth/callback") return finishTwitchAuth(req, res, url);
    if (url.pathname === "/api/auth/logout") return logout(res);
    if (url.pathname === "/api/auth/me") return sendJson(res, 200, authFor(req));
    const context = contextFor(req, url);
    const engine = engineFor(context.channelId);
    if (url.pathname === "/api/automation/champions" && req.method === "GET") {
      if (!context.producer) return sendJson(res, 401, { error: "Producer access required." });
      return sendJson(res, 200, await championCatalog());
    }
    if (url.pathname === "/api/automation/matches" && req.method === "GET") {
      if (!context.producer) return sendJson(res, 401, { error: "Producer access required." });
      return sendJson(res, 200, await liveEsportsMatches());
    }
    if (url.pathname === "/api/events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
      res.write("event: refresh\ndata: connected\n\n");
      // Serverless functions cannot hold durable connections; clients also poll.
      if (process.env.VERCEL) return res.end();
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    if (url.pathname === "/api/state" && req.method === "GET") {
      const viewerId = context.viewerId || url.searchParams.get("viewerId");
      const publicAuth = context.extension ? { configured: context.auth.configured, authenticated: false, producer: false, role: "extension", user: null } : context.auth;
      return sendJson(res, 200, { ...engine.publicState(viewerId, { producer: context.producer && url.searchParams.get("producer") === "1" }), auth: publicAuth, channelId: context.channelId, extension: context.extension ? { role: context.extension.role, linked: !context.extension.is_unlinked, anonymous: context.viewerId?.startsWith("A") } : null, persistenceMode });
    }
    if (url.pathname === "/api/recovery/export" && req.method === "GET") {
      if (!context.producer) return sendJson(res, 401, { error: "Producer access required." });
      res.writeHead(200, { "content-type": "application/json", "content-disposition": `attachment; filename="pick-predict-recovery-${Date.now()}.json"` });
      return res.end(JSON.stringify(engine.snapshot(), null, 2));
    }
    if (url.pathname.startsWith("/api/") && req.method === "POST") {
      const name = url.pathname.slice(5);
      const action = publicActions[name] || producerActions[name];
      if (!action) return sendJson(res, 404, { error: "Unknown action." });
      if (producerActions[name] && !context.producer) return sendJson(res, 401, { error: "Sign in as an authorized broadcaster or moderator." });
      const result = await action(engine, await body(req), req, context);
      await saveSnapshot(allSnapshots());
      broadcast();
      return sendJson(res, 200, { ok: true, result });
    }
    return sendJson(res, 404, { error: "Unknown API route." });
  } catch (error) {
    return sendJson(res, 400, { error: error.message || "Request failed." });
  }
}

if (!globalStore.timer) {
  globalStore.timer = setInterval(() => {
    let changed = false;
    for (const engine of globalStore.engines.values()) {
      const before = engine.round?.status;
      engine.closeExpired();
      if (before !== engine.round?.status) changed = true;
    }
    if (changed) broadcast();
  }, 250);
  globalStore.timer.unref();
}
