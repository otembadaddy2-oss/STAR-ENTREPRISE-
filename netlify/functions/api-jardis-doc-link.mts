// JARDIS — génère un lien signé de courte durée (15 min) vers un document,
// pour l'aperçu et la projection Google Cast.
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth, issueDocToken } from "./_auth.mts";

export default async (req: Request, _context: Context) => {
  const session = await requireAuth(req);
  if (!session) return json({ error: "Non authentifié" }, 401);
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const id = String(body.id ?? "");
  if (!id) return json({ error: "id requis" }, 400);

  await ensureSchema();
  const { sql } = db();
  const rows = (await sql`SELECT id, type_mime FROM jardis_documents WHERE id = ${Number(id)}`) as {
    id: number;
    type_mime: string;
  }[];
  if (!rows[0]) return json({ error: "Introuvable" }, 404);

  const token = await issueDocToken(id);
  const url = new URL(req.url);
  const base = `${url.protocol}//${url.host}`;

  await sql`
    INSERT INTO jardis_log (action, detail, doc_id, created_by)
    VALUES ('lien', 'lien de prévisualisation généré', ${rows[0].id}, ${Number(session.sub)})
  `;

  return json({
    url: `${base}/api/jardis-doc?id=${id}&t=${encodeURIComponent(token)}`,
    typeMime: rows[0].type_mime,
    expiresInSeconds: 900,
  });
};

export const config: Config = {
  path: "/api/jardis-doc-link",
};
