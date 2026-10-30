// MESSAGERIE KOMYO — boîte de réception de chaque personne (reçus, accusés de réception, ventes, factures…).
// GET  ?mes=1                       : mes messages (du plus récent) + nombre de non lus.
// POST { action: "lu", id } | { action: "tout_lu" }
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();
  const session = await requireAuth(req);
  if (!session || session.org !== "star_vibe") return json({ error: "Non authentifié" }, 401);
  const accountId = Number(session.sub);
  if (req.method === "GET") {
    const rows = (await sql`SELECT id, kind, titre, texte, lien, lu, created_at FROM starvibe_messages WHERE account_id = ${accountId} ORDER BY id DESC LIMIT 60`) as Record<string, unknown>[];
    const n = ((await sql`SELECT COUNT(*)::int AS n FROM starvibe_messages WHERE account_id = ${accountId} AND lu = false`) as { n: number }[])[0]?.n || 0;
    return json({ nonLus: n, messages: rows.map((r) => ({ id: r.id, kind: r.kind, titre: r.titre, texte: r.texte, lien: r.lien, lu: r.lu, date: r.created_at })) });
  }
  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    if (body.action === "tout_lu") { await sql`UPDATE starvibe_messages SET lu = true WHERE account_id = ${accountId}`; return json({ ok: true }); }
    if (body.action === "lu") { await sql`UPDATE starvibe_messages SET lu = true WHERE id = ${Number(body.id)} AND account_id = ${accountId}`; return json({ ok: true }); }
  }
  return json({ error: "Requête inconnue" }, 400);
};
export const config: Config = { path: "/api/starvibe-messages" };
