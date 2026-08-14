// Fiches de membres S.O — Gestion des membres, sauvegardées dans la base
// partagée du groupe (au lieu du localStorage du navigateur).
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

interface MemberRow {
  id: number;
  nom: string;
  prenom: string;
  adresse: string;
  email: string;
  date_naissance: string;
  lieu_naissance: string;
  ville: string;
  pays: string;
  fonction: string;
  cv: string;
  photo: string;
  date_enregistrement: string;
}

function toApi(row: MemberRow) {
  return {
    id: String(row.id),
    nom: row.nom,
    prenom: row.prenom,
    adresse: row.adresse,
    email: row.email,
    dateNaissance: row.date_naissance,
    lieuNaissance: row.lieu_naissance,
    ville: row.ville,
    pays: row.pays,
    fonction: row.fonction,
    cv: row.cv,
    photo: row.photo,
    dateEnregistrement: row.date_enregistrement,
  };
}

export default async (req: Request, _context: Context) => {
  const session = await requireAuth(req);
  if (!session) {
    return json({ error: "Non authentifié" }, 401);
  }

  await ensureSchema();
  const { sql } = db();

  if (req.method === "GET") {
    const rows = (await sql`
      SELECT * FROM members ORDER BY date_enregistrement DESC, id DESC
    `) as MemberRow[];
    return json({ membres: rows.map(toApi) });
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
    if (!nom || !prenom) {
      return json({ error: "Nom et prénom requis" }, 400);
    }

    const adresse = clean(body.adresse, 300);
    const email = clean(body.email, 200);
    const dateNaissance = clean(body.dateNaissance, 20);
    const lieuNaissance = clean(body.lieuNaissance, 150);
    const ville = clean(body.ville, 150);
    const pays = clean(body.pays, 150);
    const fonction = clean(body.fonction, 200);
    const cv = clean(body.cv, 4000);
    const photo = clean(body.photo, 2_000_000); // data URL, generous cap
    const dateEnregistrement = clean(body.dateEnregistrement, 30) || new Date().toISOString();

    const rows = (await sql`
      INSERT INTO members
        (nom, prenom, adresse, email, date_naissance, lieu_naissance, ville, pays, fonction, cv, photo, date_enregistrement, created_by)
      VALUES
        (${nom}, ${prenom}, ${adresse}, ${email}, ${dateNaissance}, ${lieuNaissance}, ${ville}, ${pays}, ${fonction}, ${cv}, ${photo}, ${dateEnregistrement}, ${Number(session.sub)})
      RETURNING *
    `) as MemberRow[];

    return json({ membre: toApi(rows[0]) }, 201);
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
    if (!nom || !prenom) {
      return json({ error: "Nom et prénom requis" }, 400);
    }

    const adresse = clean(body.adresse, 300);
    const email = clean(body.email, 200);
    const dateNaissance = clean(body.dateNaissance, 20);
    const lieuNaissance = clean(body.lieuNaissance, 150);
    const ville = clean(body.ville, 150);
    const pays = clean(body.pays, 150);
    const fonction = clean(body.fonction, 200);
    const cv = clean(body.cv, 4000);
    const photo = clean(body.photo, 2_000_000);

    const rows = (await sql`
      UPDATE members SET
        nom = ${nom}, prenom = ${prenom}, adresse = ${adresse}, email = ${email},
        date_naissance = ${dateNaissance}, lieu_naissance = ${lieuNaissance},
        ville = ${ville}, pays = ${pays}, fonction = ${fonction}, cv = ${cv},
        photo = ${photo}, updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `) as MemberRow[];

    if (!rows[0]) return json({ error: "Fiche introuvable" }, 404);
    return json({ membre: toApi(rows[0]) });
  }

  if (req.method === "DELETE") {
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    if (!id) return json({ error: "id requis" }, 400);

    await sql`DELETE FROM members WHERE id = ${id}`;
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = {
  path: "/api/members",
};
