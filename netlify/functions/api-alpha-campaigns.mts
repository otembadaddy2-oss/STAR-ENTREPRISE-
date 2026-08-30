// Briefs de campagne ALPHA (produit STAR CRÉAT).
// Écriture publique (formulaire alpha/index.html) ; lecture et gestion
// réservées au compte admin ALPHA (alpha/admin.html), connecté via /api/auth.
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

const STATUSES = ["nouveau", "en_discussion", "en_cours", "lance", "termine", "sans_suite"];

interface CampaignRow {
  id: number;
  nom: string;
  entreprise: string;
  telephone: string;
  objectif: string;
  message: string;
  statut: string;
  created_at: string;
  updated_at: string;
}

function toApi(row: CampaignRow) {
  return {
    id: String(row.id),
    nom: row.nom,
    entreprise: row.entreprise,
    telephone: row.telephone,
    objectif: row.objectif,
    message: row.message,
    statut: row.statut,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();

  // Soumission publique du formulaire de brief — aucune authentification.
  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const nom = clean(body.nom, 200);
    const entreprise = clean(body.entreprise, 200);
    const telephone = clean(body.telephone, 60);
    const objectif = clean(body.objectif, 60);
    const message = clean(body.message, 4000);

    if (!nom || !telephone) {
      return json({ error: "Nom et téléphone requis" }, 400);
    }

    const rows = (await sql`
      INSERT INTO alpha_campaigns (nom, entreprise, telephone, objectif, message)
      VALUES (${nom}, ${entreprise}, ${telephone}, ${objectif}, ${message})
      RETURNING *
    `) as CampaignRow[];

    return json({ campaign: toApi(rows[0]) }, 201);
  }

  // Consultation, changement de statut, suppression — réservés à l'admin.
  const session = await requireAuth(req);
  if (!session) return json({ error: "Non authentifié" }, 401);

  if (req.method === "GET") {
    const rows = (await sql`
      SELECT * FROM alpha_campaigns ORDER BY created_at DESC, id DESC
    `) as CampaignRow[];
    return json({ campaigns: rows.map(toApi) });
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
    const statut = clean(body.statut, 30);
    if (!STATUSES.includes(statut)) {
      return json({ error: "Statut invalide" }, 400);
    }

    const rows = (await sql`
      UPDATE alpha_campaigns SET statut = ${statut}, updated_at = now()
      WHERE id = ${id} RETURNING *
    `) as CampaignRow[];

    if (!rows[0]) return json({ error: "Introuvable" }, 404);
    return json({ campaign: toApi(rows[0]) });
  }

  if (req.method === "DELETE") {
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    if (!id) return json({ error: "id requis" }, 400);

    await sql`DELETE FROM alpha_campaigns WHERE id = ${id}`;
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = {
  path: "/api/alpha-campaigns",
};
