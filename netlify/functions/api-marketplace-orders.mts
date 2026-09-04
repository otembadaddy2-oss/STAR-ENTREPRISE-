// STAR Marketplace — commandes. Une commande est créée "en_attente_paiement"
// et ne passe "payée" que via /api/marketplace-payments, qui vérifie que le
// montant reçu correspond exactement au montant attendu.
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

interface OrderRow {
  id: number;
  listing_id: number;
  buyer_id: number | null;
  acheteur_nom: string;
  acheteur_telephone: string;
  acheteur_email: string;
  quantite: number;
  montant_attendu: number;
  montant_recu: number | null;
  devise: string;
  methode_paiement: string;
  reference_transaction: string;
  statut: string;
  created_at: string;
  updated_at: string;
  listing_titre?: string;
}

function toApi(row: OrderRow) {
  return {
    id: String(row.id),
    listingId: String(row.listing_id),
    listingTitre: row.listing_titre,
    acheteurNom: row.acheteur_nom,
    acheteurTelephone: row.acheteur_telephone,
    acheteurEmail: row.acheteur_email,
    quantite: row.quantite,
    montantAttendu: row.montant_attendu,
    montantRecu: row.montant_recu,
    devise: row.devise,
    methodePaiement: row.methode_paiement,
    statut: row.statut,
    createdAt: row.created_at,
  };
}

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();
  const url = new URL(req.url);

  // Création d'une commande — acheteur invité ou connecté.
  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

    const listingId = Number(body.listingId);
    const acheteurNom = clean(body.acheteurNom, 160);
    const acheteurTelephone = clean(body.acheteurTelephone, 40);
    const acheteurEmail = clean(body.acheteurEmail, 160);
    const quantite = Math.max(1, Math.round(Number(body.quantite) || 1));

    if (!listingId || !acheteurNom || !acheteurTelephone) {
      return json({ error: "Annonce, nom et téléphone de l'acheteur sont requis" }, 400);
    }

    const listingRows = await sql`
      SELECT id, prix, devise, statut FROM marketplace_listings WHERE id = ${listingId} LIMIT 1
    `;
    const listing = listingRows[0] as any;
    if (!listing) return json({ error: "Annonce introuvable" }, 404);
    if (listing.statut !== "active") return json({ error: "Cette annonce n'est plus disponible" }, 409);

    const session = await requireAuth(req);
    const buyerId = session && session.org === "star_marketplace" ? Number(session.sub) : null;
    const montantAttendu = listing.prix * quantite;

    const rows = (await sql`
      INSERT INTO marketplace_orders
        (listing_id, buyer_id, acheteur_nom, acheteur_telephone, acheteur_email,
         quantite, montant_attendu, devise, statut)
      VALUES
        (${listingId}, ${buyerId}, ${acheteurNom}, ${acheteurTelephone}, ${acheteurEmail},
         ${quantite}, ${montantAttendu}, ${listing.devise}, 'en_attente_paiement')
      RETURNING *
    `) as OrderRow[];

    return json({ order: toApi(rows[0]) }, 201);
  }

  // Consultation — vendeur (ses annonces) ou acheteur (ses commandes).
  const session = await requireAuth(req);
  if (!session || session.org !== "star_marketplace") return json({ error: "Non authentifié" }, 401);

  if (req.method === "GET") {
    const scope = clean(url.searchParams.get("scope") || "buyer", 20);

    if (scope === "seller") {
      const rows = (await sql`
        SELECT o.*, l.titre AS listing_titre
        FROM marketplace_orders o
        JOIN marketplace_listings l ON l.id = o.listing_id
        WHERE l.seller_id = ${Number(session.sub)}
        ORDER BY o.created_at DESC
      `) as OrderRow[];
      return json({ orders: rows.map(toApi) });
    }

    const rows = (await sql`
      SELECT o.*, l.titre AS listing_titre
      FROM marketplace_orders o
      JOIN marketplace_listings l ON l.id = o.listing_id
      WHERE o.buyer_id = ${Number(session.sub)}
      ORDER BY o.created_at DESC
    `) as OrderRow[];
    return json({ orders: rows.map(toApi) });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = {
  path: "/api/marketplace-orders",
};
