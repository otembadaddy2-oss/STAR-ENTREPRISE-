// Fiches familles/patients suivis — La Maison de la Drépanocytose,
// sauvegardées dans la base partagée du groupe STAR ENTREPRISE.
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

interface BeneficiaireRow {
  id: number;
  nom: string;
  prenom: string;
  type: string;
  telephone: string;
  ville: string;
  notes: string;
  date_enregistrement: string;
}

function toApi(row: BeneficiaireRow) {
  return {
    id: String(row.id),
    nom: row.nom,
    prenom: row.prenom,
    type: row.type,
    telephone: row.telephone,
    ville: row.ville,
    notes: row.notes,
    dateEnregistrement: row.date_enregistrement,
  };
}

export default async (req: Request, _context: Context) => {
  const session = await requireAuth(req);
  if (!session) return json({ error: "Non authentifié" }, 401);

  await ensureSchema();
  const { sql } = db();

  if (req.method === "GET") {
    const rows = (await sql`
      SELECT * FROM drepano_beneficiaires ORDER BY date_enregistrement DESC, id DESC
    `) as BeneficiaireRow[];
    return json({ beneficiaires: rows.map(toApi) });
  }

  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const nom = clean(body.nom, 120);
    const prenom = clean(body.prenom, 120);
    if (!nom || !prenom) return json({ error: "Nom et prénom requis" }, 400);

    const type = clean(body.type, 30) || "famille";
    const telephone = clean(body.telephone, 60);
    const ville = clean(body.ville, 150);
    const notes = clean(body.notes, 4000);
    const dateEnregistrement = clean(body.dateEnregistrement, 30) || new Date().toISOString();

    const rows = (await sql`
      INSERT INTO drepano_beneficiaires
        (nom, prenom, type, telephone, ville, notes, date_enregistrement, created_by)
      VALUES
        (${nom}, ${prenom}, ${type}, ${telephone}, ${ville}, ${notes}, ${dateEnregistrement}, ${Number(session.sub)})
      RETURNING *
    `) as BeneficiaireRow[];

    return json({ beneficiaire: toApi(rows[0]) }, 201);
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

    const nom = clean(body.nom, 120);
    const prenom = clean(body.prenom, 120);
    if (!nom || !prenom) return json({ error: "Nom et prénom requis" }, 400);

    const type = clean(body.type, 30) || "famille";
    const telephone = clean(body.telephone, 60);
    const ville = clean(body.ville, 150);
    const notes = clean(body.notes, 4000);

    const rows = (await sql`
      UPDATE drepano_beneficiaires SET
        nom = ${nom}, prenom = ${prenom}, type = ${type}, telephone = ${telephone},
        ville = ${ville}, notes = ${notes}, updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `) as BeneficiaireRow[];

    if (!rows[0]) return json({ error: "Fiche introuvable" }, 404);
    return json({ beneficiaire: toApi(rows[0]) });
  }

  if (req.method === "DELETE") {
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    if (!id) return json({ error: "id requis" }, 400);

    await sql`DELETE FROM drepano_beneficiaires WHERE id = ${id}`;
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = {
  path: "/api/drepano",
};
