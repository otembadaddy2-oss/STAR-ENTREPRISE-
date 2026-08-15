// Demandes de devis et messages de contact du site STAR ENTREPRISE.
// Écriture publique (formulaires devis.html / contact.html) ; lecture et
// gestion réservées aux comptes connectés du groupe.
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

interface LeadRow {
  id: number;
  type: string;
  nom: string;
  entreprise: string;
  email: string;
  telephone: string;
  service: string;
  message: string;
  statut: string;
  created_at: string;
}

function toApi(row: LeadRow) {
  return {
    id: String(row.id),
    type: row.type,
    nom: row.nom,
    entreprise: row.entreprise,
    email: row.email,
    telephone: row.telephone,
    service: row.service,
    message: row.message,
    statut: row.statut,
    createdAt: row.created_at,
  };
}

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();

  // Soumission publique — aucune authentification requise, c'est le
  // formulaire du site que n'importe quel visiteur peut envoyer.
  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const type = clean(body.type, 30) || "contact";
    const nom = clean(body.nom, 200);
    const entreprise = clean(body.entreprise, 200);
    const email = clean(body.email, 200);
    const telephone = clean(body.telephone, 60);
    const service = clean(body.service, 200);
    const message = clean(body.message, 4000);

    if (!nom && !email && !telephone) {
      return json({ error: "Merci de renseigner au moins un moyen de contact" }, 400);
    }

    const rows = (await sql`
      INSERT INTO leads (type, nom, entreprise, email, telephone, service, message)
      VALUES (${type}, ${nom}, ${entreprise}, ${email}, ${telephone}, ${service}, ${message})
      RETURNING *
    `) as LeadRow[];

    return json({ lead: toApi(rows[0]) }, 201);
  }

  // Tout le reste (consulter, mettre à jour le statut, supprimer) exige
  // une connexion — c'est la partie back-office.
  const session = await requireAuth(req);
  if (!session) return json({ error: "Non authentifié" }, 401);

  if (req.method === "GET") {
    const rows = (await sql`
      SELECT * FROM leads ORDER BY created_at DESC, id DESC
    `) as LeadRow[];
    return json({ leads: rows.map(toApi) });
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
    const statut = clean(body.statut, 30) || "nouveau";

    const rows = (await sql`
      UPDATE leads SET statut = ${statut} WHERE id = ${id} RETURNING *
    `) as LeadRow[];

    if (!rows[0]) return json({ error: "Introuvable" }, 404);
    return json({ lead: toApi(rows[0]) });
  }

  if (req.method === "DELETE") {
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    if (!id) return json({ error: "id requis" }, 400);

    await sql`DELETE FROM leads WHERE id = ${id}`;
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = {
  path: "/api/leads",
};
