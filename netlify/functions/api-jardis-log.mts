// JARDIS — journal d'actions (transparence prévue par le document maître).
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

export default async (req: Request, _context: Context) => {
  const session = await requireAuth(req);
  if (!session) return json({ error: "Non authentifié" }, 401);
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  await ensureSchema();
  const { sql } = db();
  const rows = (await sql`
    SELECT l.id, l.action, l.detail, l.created_at, d.nom AS doc_nom
    FROM jardis_log l
    LEFT JOIN jardis_documents d ON d.id = l.doc_id
    ORDER BY l.created_at DESC
    LIMIT 100
  `) as { id: number; action: string; detail: string; created_at: string; doc_nom: string | null }[];

  return json({
    entries: rows.map((r) => ({
      id: String(r.id),
      action: r.action,
      detail: r.detail,
      docNom: r.doc_nom,
      createdAt: r.created_at,
    })),
  });
};

export const config: Config = {
  path: "/api/jardis-log",
};
