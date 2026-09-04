// STAR Marketplace — annonces. Une annonce reste "en_attente_paiement"
// (invisible côté public) tant que le paiement de l'espace n'est pas
// confirmé par /api/marketplace-payments. Le tarif ci-dessous est un
// PLACEHOLDER à valider avec Carry avant mise en production.
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

// PLACEHOLDER — tarif de l'espace vendeur, à confirmer avec Carry.
const TARIF_PAR_30_JOURS = 2000; // FCFA / tranche de 30 jours

const CATEGORIES = new Set([
  "mode", "electronique", "maison", "beaute", "alimentation",
  "services", "vehicules", "immobilier", "autre",
]);

interface ListingRow {
  id: number;
  seller_id: number;
  titre: string;
  description: string;
  categorie: string;
  prix: number;
  devise: string;
  photos: string;
  ville: string;
  duree_jours: number;
  statut: string;
  expire_at: string | null;
  created_at: string;
  updated_at: string;
  seller_nom?: string;
  seller_telephone?: string;
}

function toApi(row: ListingRow) {
  let photos: string[] = [];
  try { photos = JSON.parse(row.photos || "[]"); } catch { /* garde [] */ }
  return {
    id: String(row.id),
    titre: row.titre,
    description: row.description,
    categorie: row.categorie,
    prix: row.prix,
    devise: row.devise,
    photos,
    ville: row.ville,
    dureeJours: row.duree_jours,
    statut: row.statut,
    expireAt: row.expire_at,
    createdAt: row.created_at,
    vendeur: row.seller_nom ? { nom: row.seller_nom, telephone: row.seller_telephone } : undefined,
  };
}

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();
  const url = new URL(req.url);

  if (req.method === "GET") {
    const id = url.searchParams.get("id");
    if (id) {
      const rows = (await sql`
        SELECT l.*, u.nom AS seller_nom, u.telephone AS seller_telephone
        FROM marketplace_listings l
        JOIN marketplace_users u ON u.id = l.seller_id
        WHERE l.id = ${Number(id)} LIMIT 1
      `) as ListingRow[];
      if (!rows[0]) return json({ error: "Annonce introuvable" }, 404);
      return json({ listing: toApi(rows[0]) });
    }

    const mine = url.searchParams.get("mine");
    if (mine) {
      const session = await requireAuth(req);
      if (!session || session.org !== "star_marketplace") return json({ error: "Non authentifié" }, 401);
      const rows = (await sql`
        SELECT * FROM marketplace_listings
        WHERE seller_id = ${Number(session.sub)}
        ORDER BY created_at DESC
      `) as ListingRow[];
      return json({ listings: rows.map(toApi) });
    }

    const categorie = clean(url.searchParams.get("categorie") || "", 40);
    const recherche = clean(url.searchParams.get("q") || "", 120);
    let rows: ListingRow[];
    if (categorie && recherche) {
      rows = (await sql`
        SELECT l.*, u.nom AS seller_nom, u.telephone AS seller_telephone
        FROM marketplace_listings l JOIN marketplace_users u ON u.id = l.seller_id
        WHERE l.statut = 'active' AND l.categorie = ${categorie}
          AND (l.titre ILIKE ${"%" + recherche + "%"} OR l.description ILIKE ${"%" + recherche + "%"})
        ORDER BY l.created_at DESC
      `) as ListingRow[];
    } else if (categorie) {
      rows = (await sql`
        SELECT l.*, u.nom AS seller_nom, u.telephone AS seller_telephone
        FROM marketplace_listings l JOIN marketplace_users u ON u.id = l.seller_id
        WHERE l.statut = 'active' AND l.categorie = ${categorie}
        ORDER BY l.created_at DESC
      `) as ListingRow[];
    } else if (recherche) {
      rows = (await sql`
        SELECT l.*, u.nom AS seller_nom, u.telephone AS seller_telephone
        FROM marketplace_listings l JOIN marketplace_users u ON u.id = l.seller_id
        WHERE l.statut = 'active'
          AND (l.titre ILIKE ${"%" + recherche + "%"} OR l.description ILIKE ${"%" + recherche + "%"})
        ORDER BY l.created_at DESC
      `) as ListingRow[];
    } else {
      rows = (await sql`
        SELECT l.*, u.nom AS seller_nom, u.telephone AS seller_telephone
        FROM marketplace_listings l JOIN marketplace_users u ON u.id = l.seller_id
        WHERE l.statut = 'active'
        ORDER BY l.created_at DESC
      `) as ListingRow[];
    }
    return json({ listings: rows.map(toApi) });
  }

  if (req.method === "POST") {
    const session = await requireAuth(req);
    if (!session || session.org !== "star_marketplace") return json({ error: "Non authentifié" }, 401);
    if (session.role !== "vendeur") return json({ error: "Compte vendeur requis" }, 403);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

    const titre = clean(body.titre, 200);
    const description = clean(body.description, 4000);
    const categorie = clean(body.categorie, 40) || "autre";
    const prix = Math.round(Number(body.prix));
    const ville = clean(body.ville, 80);
    const dureeJours = [7, 30, 90].includes(Number(body.dureeJours)) ? Number(body.dureeJours) : 30;
    const photos = Array.isArray(body.photos) ? (body.photos as unknown[]).slice(0, 6).map((p) => clean(p, 500)) : [];

    if (!titre || !prix || prix <= 0 || !CATEGORIES.has(categorie)) {
      return json({ error: "Titre, prix et catégorie valides sont requis" }, 400);
    }

    const montantEspace = Math.round((dureeJours / 30) * TARIF_PAR_30_JOURS);

    const rows = (await sql`
      INSERT INTO marketplace_listings
        (seller_id, titre, description, categorie, prix, ville, duree_jours, photos, statut)
      VALUES
        (${Number(session.sub)}, ${titre}, ${description}, ${categorie}, ${prix}, ${ville},
         ${dureeJours}, ${JSON.stringify(photos)}, 'en_attente_paiement')
      RETURNING *
    `) as ListingRow[];
    const listing = rows[0];

    const payRows = await sql`
      INSERT INTO marketplace_listing_payments (listing_id, montant_attendu, statut)
      VALUES (${listing.id}, ${montantEspace}, 'en_attente')
      RETURNING id
    `;

    return json({
      listing: toApi(listing),
      paiementEspace: { id: (payRows[0] as any).id, montantAttendu: montantEspace, devise: "FCFA" },
    }, 201);
  }

  if (req.method === "PUT") {
    const session = await requireAuth(req);
    if (!session || session.org !== "star_marketplace") return json({ error: "Non authentifié" }, 401);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    const id = Number(body.id);
    if (!id) return json({ error: "id requis" }, 400);

    const owns = await sql`SELECT seller_id FROM marketplace_listings WHERE id = ${id} LIMIT 1`;
    if (!owns[0]) return json({ error: "Introuvable" }, 404);
    if ((owns[0] as any).seller_id !== Number(session.sub)) return json({ error: "Non autorisé" }, 403);

    const titre = clean(body.titre, 200);
    const description = clean(body.description, 4000);
    const prix = Number(body.prix);

    const rows = (await sql`
      UPDATE marketplace_listings
      SET titre = COALESCE(NULLIF(${titre}, ''), titre),
          description = COALESCE(NULLIF(${description}, ''), description),
          prix = CASE WHEN ${prix} > 0 THEN ${Math.round(prix) || 0} ELSE prix END,
          updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `) as ListingRow[];
    return json({ listing: toApi(rows[0]) });
  }

  if (req.method === "DELETE") {
    const session = await requireAuth(req);
    if (!session || session.org !== "star_marketplace") return json({ error: "Non authentifié" }, 401);
    const id = Number(url.searchParams.get("id"));
    if (!id) return json({ error: "id requis" }, 400);

    const owns = await sql`SELECT seller_id FROM marketplace_listings WHERE id = ${id} LIMIT 1`;
    if (!owns[0]) return json({ error: "Introuvable" }, 404);
    if ((owns[0] as any).seller_id !== Number(session.sub)) return json({ error: "Non autorisé" }, 403);

    await sql`DELETE FROM marketplace_listings WHERE id = ${id}`;
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = {
  path: "/api/marketplace-listings",
};
