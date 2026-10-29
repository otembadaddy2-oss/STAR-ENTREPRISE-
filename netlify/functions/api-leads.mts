// Demandes de devis et messages de contact du site STAR ENTREPRISE.
// Écriture publique (formulaires devis.html / contact.html) ; lecture et
// gestion réservées aux comptes connectés du groupe.
import { envoyerContact } from "./_mail.mts";
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireGroupAuth as requireAuth } from "./_auth.mts";   // back-office : refuse les jetons KOMYO / Keydou / Marketplace / Guichet
import { pushAll } from "./_push.mts";

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

    // Formulaire KOMYO : champ-piège pour les robots (un humain ne le voit pas) et plafond horaire contre le spam.
    if (type === "komyo-contact") {
      if (clean(body.site, 100)) return json({ lead: { id: "0" } }, 201);   // robot : on fait semblant que c'est passé
      const recents = (await sql`SELECT COUNT(*)::int AS n FROM leads WHERE type = 'komyo-contact' AND created_at > now() - interval '1 hour'`) as { n: number }[];
      if ((recents[0]?.n || 0) >= 30) return json({ error: "Trop de messages pour le moment. Réessaie un peu plus tard." }, 429);
    }

    const rows = (await sql`
      INSERT INTO leads (type, nom, entreprise, email, telephone, service, message)
      VALUES (${type}, ${nom}, ${entreprise}, ${email}, ${telephone}, ${service}, ${message})
      RETURNING *
    `) as LeadRow[];

    // Message venant de KOMYO : le staff est prévenu tout de suite (la demande reste de toute façon dans le Backend).
    if (type === "komyo-contact") {
      // Le message part aussi par e-mail vers contact@starentreprise.com (si le mot de passe SMTP est configuré dans Netlify).
      try { await envoyerContact({ nom, contact: email || telephone, email, message }); } catch { /* le message reste dans le back-office */ }
      try { await pushAll(sql, { title: "Nouveau message KOMYO", body: `${nom || "Visiteur"} : ${message.slice(0, 90)}`, tag: "komyo-contact", url: "/admin.html" }); } catch { /* sans gravité : le message est enregistré */ }
    }

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
