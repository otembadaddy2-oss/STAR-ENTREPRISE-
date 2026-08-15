// Événements Pili-Pili Events, sauvegardés dans la base partagée du groupe.
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

interface EvenementRow {
  id: number;
  titre: string;
  date_event: string;
  lieu: string;
  description: string;
}

function toApi(row: EvenementRow, inscrits?: number) {
  return {
    id: String(row.id),
    titre: row.titre,
    dateEvent: row.date_event,
    lieu: row.lieu,
    description: row.description,
    inscrits: inscrits ?? 0,
  };
}

export default async (req: Request, _context: Context) => {
  const session = await requireAuth(req);
  if (!session) return json({ error: "Non authentifié" }, 401);

  await ensureSchema();
  const { sql } = db();

  if (req.method === "GET") {
    const rows = (await sql`
      SELECT e.*, COUNT(i.id)::int AS inscrits
      FROM pilipili_evenements e
      LEFT JOIN pilipili_inscriptions i ON i.evenement_id = e.id
      GROUP BY e.id
      ORDER BY e.date_event DESC, e.id DESC
    `) as (EvenementRow & { inscrits: number })[];
    return json({ evenements: rows.map((r) => toApi(r, r.inscrits)) });
  }

  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const titre = clean(body.titre, 200);
    if (!titre) return json({ error: "Titre requis" }, 400);

    const dateEvent = clean(body.dateEvent, 30);
    const lieu = clean(body.lieu, 200);
    const description = clean(body.description, 4000);

    const rows = (await sql`
      INSERT INTO pilipili_evenements (titre, date_event, lieu, description, created_by)
      VALUES (${titre}, ${dateEvent}, ${lieu}, ${description}, ${Number(session.sub)})
      RETURNING *
    `) as EvenementRow[];

    return json({ evenement: toApi(rows[0], 0) }, 201);
  }

  if (req.method === "PUT") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const id = Number(body.id);
    if (!id) return json({ error: "id requis" }, 400);

    const titre = clean(body.titre, 200);
    if (!titre) return json({ error: "Titre requis" }, 400);

    const dateEvent = clean(body.dateEvent, 30);
    const lieu = clean(body.lieu, 200);
    const description = clean(body.description, 4000);

    const rows = (await sql`
      UPDATE pilipili_evenements SET
        titre = ${titre}, date_event = ${dateEvent}, lieu = ${lieu},
        description = ${description}, updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `) as EvenementRow[];

    if (!rows[0]) return json({ error: "Événement introuvable" }, 404);

    const countRows = (await sql`
      SELECT COUNT(*)::int AS n FROM pilipili_inscriptions WHERE evenement_id = ${id}
    `) as { n: number }[];

    return json({ evenement: toApi(rows[0], countRows[0]?.n ?? 0) });
  }

  if (req.method === "DELETE") {
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    if (!id) return json({ error: "id requis" }, 400);

    await sql`DELETE FROM pilipili_evenements WHERE id = ${id}`;
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = {
  path: "/api/pilipili-evenements",
};
