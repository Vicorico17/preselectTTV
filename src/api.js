import { randomUUID } from "node:crypto";
import { DraftEngine } from "./draft-engine.js";
import { authFor, beginTwitchAuth, finishTwitchAuth, logout, twitchConfigured } from "./auth.js";
import { loadSnapshot, persistenceMode, saveSnapshot } from "./persistence.js";

const globalStore = globalThis.__pickPredictStore || { engine: new DraftEngine(), clients: new Set() };
globalThis.__pickPredictStore = globalStore;
export const engine = globalStore.engine;
const clients = globalStore.clients;
const ready = globalStore.ready || (globalStore.ready = loadSnapshot().then(snapshot => {
  if (snapshot) engine.restore(snapshot);
}).catch(error => console.error("Recovery load failed:", error.message)));

const sendJson = (res, status, data) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(data));
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
  join: (data, req) => {
    const id = req.headers["x-viewer-id"] || randomUUID();
    return { viewer: engine.join(id, data.name), viewerId: id };
  },
  predict: (data, req) => engine.predict(req.headers["x-viewer-id"], data.champion)
};
const producerActions = {
  "match/create": data => engine.createMatch(data),
  "match/configure": data => engine.configure(data),
  "series/clear": () => engine.clearSeries(),
  "draft/start": () => engine.startDraft(),
  "draft/new-game": () => engine.newGame(),
  "draft/resolve": data => engine.resolve(data.champion),
  "draft/cancel": () => engine.cancelRound(),
  "draft/undo": () => engine.undoLast(),
  "draft/reset": () => engine.resetGame(),
  "recovery/import": data => engine.restore(data.snapshot)
};

export async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    await ready;
    if (url.pathname === "/api/auth/login") return beginTwitchAuth(req, res);
    if (url.pathname === "/api/auth/callback") return finishTwitchAuth(req, res, url);
    if (url.pathname === "/api/auth/logout") return logout(res);
    if (url.pathname === "/api/auth/me") return sendJson(res, 200, authFor(req));
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
      const auth = authFor(req);
      return sendJson(res, 200, { ...engine.publicState(url.searchParams.get("viewerId"), { producer: auth.producer && url.searchParams.get("producer") === "1" }), auth, persistenceMode });
    }
    if (url.pathname === "/api/recovery/export" && req.method === "GET") {
      const auth = authFor(req);
      if (!auth.producer) return sendJson(res, 401, { error: "Producer access required." });
      res.writeHead(200, { "content-type": "application/json", "content-disposition": `attachment; filename="pick-predict-recovery-${Date.now()}.json"` });
      return res.end(JSON.stringify(engine.snapshot(), null, 2));
    }
    if (url.pathname.startsWith("/api/") && req.method === "POST") {
      const name = url.pathname.slice(5);
      const action = publicActions[name] || producerActions[name];
      if (!action) return sendJson(res, 404, { error: "Unknown action." });
      if (producerActions[name] && !authFor(req).producer) return sendJson(res, 401, { error: "Sign in as an authorized broadcaster or moderator." });
      const result = await action(await body(req), req);
      await saveSnapshot(engine.snapshot());
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
    const before = engine.round?.status;
    engine.closeExpired();
    if (before !== engine.round?.status) broadcast();
  }, 250);
  globalStore.timer.unref();
}
