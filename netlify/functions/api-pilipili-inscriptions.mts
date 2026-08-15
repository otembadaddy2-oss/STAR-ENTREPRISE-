// Inscriptions aux événements Pili-Pili Events, base partagée du groupe.
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

interface InscriptionRow {
  id: number;
  evenement_id: number;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  date_inscription: string;
}

function toApi(row: InscriptionRow) {
  return {
    id: String(row.id),
    evenementId: String(row.evenement_id),
    nom: row.nom,
    prenom: row.prenom,
    telephone: row.telephone,
    email: row.email,
    dateInscription: row.date_inscription,
  };
}

export default async (req: Request, _context: Context) => {
  const session = await requireAuth(req);
  if (!session) return json({ error: "Non authentifié" }, 401);

  await ensureSchema();
  const { sql } = db();

  if (req.method === "GET") {
    const url = new URL(req.url);
    const evenementId = Number(url.searchParams.get("evenementId"));
    const rows = evenementId
      ? ((await sql`
          SELECT * FROM pilipili_inscriptions WHERE evenement_id = ${evenementId}
          ORDER BY date_inscription DESC, id DESC
        `) as InscriptionRow[])
      : ((await sql`
          SELECT * FROM pilipili_inscriptions ORDER BY date_inscription DESC, id DESC
        `) as InscriptionRow[]);
    return json({ inscriptions: rows.map(toApi) });
  }

  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const evenementId = Number(body.evenementId);
    const nom = clean(body.nom, 120);
    const prenom = clean(body.prenom, 120);
    if (!evenementId || !nom || !prenom) {
      return json({ error: "Événement, nom et prénom requis" }, 400);
    }

    const telephone = clean(body.telephone, 60);
    const email = clean(body.email, 200);
    const dateInscription = clean(body.dateInscription, 30) || new Date().toISOString();

    const rows = (await sql`
      INSERT INTO pilipili_inscriptions
        (evenement_id, nom, prenom, telephone, email, date_inscription, created_by)
      VALUES
        (${evenementId}, ${nom}, ${prenom}, ${telephone}, ${email}, ${dateInscription}, ${Number(session.sub)})
      RETURNING *
    `) as InscriptionRow[];

    return json({ inscription: toApi(rows[0]) }, 201);
  }

  if (req.method === "DELETE") {
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    if (!id) return json({ error: "id requis" }, 400);

    await sql`DELETE FROM pilipili_inscriptions WHERE id = ${id}`;
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = {
  path: "/api/pilipili-inscriptions",
};
