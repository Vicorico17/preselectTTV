import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { handleApi } from "./api.js";

const root = join(fileURLToPath(new URL("..", import.meta.url)), "public");
const port = Number(process.env.PORT) || 4173;

const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) return handleApi(req, res);

    const path = url.pathname === "/" ? "/index.html" : url.pathname === "/control" ? "/control.html" : url.pathname === "/overlay" ? "/overlay.html" : url.pathname === "/automation" ? "/automation.html" : url.pathname;
    if (path.includes("..")) { res.writeHead(400); return res.end("Invalid path."); }
    const file = await readFile(join(root, path));
    res.writeHead(200, { "content-type": types[extname(path)] || "application/octet-stream" });
    res.end(file);
  } catch (error) {
    if (error.code === "ENOENT") { res.writeHead(404); return res.end("Not found."); }
    res.writeHead(400); res.end(error.message || "Request failed.");
  }
});

server.listen(port, () => console.log(`Pick Predict running at http://localhost:${port}`));
