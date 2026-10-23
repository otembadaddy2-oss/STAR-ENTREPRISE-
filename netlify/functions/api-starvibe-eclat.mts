// ÉCLAT — le direct de KOMYO. Pour l'instant : liste d'attente (le vrai direct viendra avec un service de diffusion).
// GET  : { inscrit, total }          (compte KOMYO connecté)
// POST : { action: "rejoindre" | "quitter" }
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

const ORG = "star_vibe";

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const sql = db();
  const session = await requireAuth(req);
  if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
  const accountId = Number(session.sub);

  if (req.method === "POST") {
    let body: { action?: string } = {};
    try { body = await req.json(); } catch { /* corps vide */ }
    if (body.action === "rejoindre") {
      await sql`INSERT INTO starvibe_eclat_attente (account_id) VALUES (${accountId}) ON CONFLICT (account_id) DO NOTHING`;
    } else if (body.action === "quitter") {
      await sql`DELETE FROM starvibe_eclat_attente WHERE account_id = ${accountId}`;
    } else {
      return json({ error: "Action inconnue" }, 400);
    }
  } else if (req.method !== "GET") {
    return json({ error: "Méthode non autorisée" }, 405);
  }

  const mine = (await sql`SELECT 1 FROM starvibe_eclat_attente WHERE account_id = ${accountId}`) as unknown[];
  const total = (await sql`SELECT COUNT(*)::int AS n FROM starvibe_eclat_attente`) as { n: number }[];
  return json({ inscrit: mine.length > 0, total: total[0]?.n || 0 });
};

export const config: Config = {
  path: "/api/starvibe-eclat",
};
