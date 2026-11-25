// Serveur de TEST local : sert le site + les vraies fonctions « Passeport Sûr » contre PostgreSQL local (aucun coût, aucun réseau).
// Lancer : service postgresql start ; node --experimental-strip-types tools/serveur-local-passeport.mts [port]
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
if (!process.env.NETLIFY_DB_URL) process.env.NETLIFY_DB_URL = "postgres://postgres:kt@localhost:5432/kt";
const api = (await import("../netlify/functions/api-passeport.mts")).default as (r: Request, c: any) => Promise<Response>;
const piece = await import("../netlify/functions/api-passeport-piece.mts");
const stock = new Map<string, any>();
piece.__utiliserMagasin({ get: async (k: string) => stock.get(k)?.v ?? null, set: async (k: string, v: any, o: any) => { stock.set(k, { v, o }); }, getMetadata: async (k: string) => ({ metadata: stock.get(k)?.o?.metadata }), delete: async (k: string) => { stock.delete(k); }, list: async ({ prefix }: { prefix: string }) => ({ blobs: [...stock.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }) });
const pieceApi = piece.default as (r: Request, c: any) => Promise<Response>;
const RACINE = new URL("..", import.meta.url).pathname, TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".json": "application/json", ".webmanifest": "application/manifest+json" };
const port = Number(process.argv[2]) || 8766;
createServer(async (req, res) => {
  try {
    const u = new URL(req.url || "/", "http://localhost");
    if (u.pathname === "/api/passeport" || u.pathname === "/api/passeport-piece") {
      const corps = ["GET", "HEAD"].includes(req.method || "GET") ? undefined : await new Promise<Buffer>(ok => { const b: Buffer[] = []; req.on("data", c => b.push(c)); req.on("end", () => ok(Buffer.concat(b))); });
      const r = await (u.pathname === "/api/passeport" ? api : pieceApi)(new Request("http://localhost" + req.url, { method: req.method, headers: req.headers as any, body: corps }), {});
      res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); return;
    }
    let f = normalize(join(RACINE, decodeURIComponent(u.pathname))); if (!f.startsWith(RACINE)) { res.writeHead(403); res.end(); return; }
    if ((await stat(f).catch(() => null))?.isDirectory()) f = join(f, "index.html");
    const d = await readFile(f); res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream", "cache-control": "no-store" }); res.end(d);
  } catch (e: any) { res.writeHead(e && e.code === "ENOENT" ? 404 : 500); res.end(String(e && e.message || e)); }
}).listen(port, () => console.log("Serveur de test Passeport Sûr : http://localhost:" + port + "/passeport-demo/"));
