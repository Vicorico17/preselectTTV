import { randomUUID } from "node:crypto";
import { DraftEngine } from "./draft-engine.js";

const globalStore = globalThis.__pickPredictStore || { engine: new DraftEngine(), clients: new Set() };
globalThis.__pickPredictStore = globalStore;
export const engine = globalStore.engine;
const clients = globalStore.clients;

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
const actions = {
  join: (data, req) => {
    const id = req.headers["x-viewer-id"] || randomUUID();
    return { viewer: engine.join(id, data.name), viewerId: id };
  },
  "match/create": data => engine.createMatch(data),
  "draft/start": () => engine.startDraft(),
  "draft/new-game": () => engine.newGame(),
  "draft/resolve": data => engine.resolve(data.champion),
  "draft/cancel": () => engine.cancelRound(),
  "draft/undo": () => engine.undoLast(),
  "draft/reset": () => engine.resetGame(),
  predict: (data, req) => engine.predict(req.headers["x-viewer-id"], data.champion)
};

export async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
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
      return sendJson(res, 200, engine.publicState(url.searchParams.get("viewerId")));
    }
    if (url.pathname.startsWith("/api/") && req.method === "POST") {
      const name = url.pathname.slice(5);
      if (!actions[name]) return sendJson(res, 404, { error: "Unknown action." });
      const result = await actions[name](await body(req), req);
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
