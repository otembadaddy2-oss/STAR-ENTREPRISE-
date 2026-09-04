// STAR Marketplace — validation des paiements (espace vendeur ou commande).
// Règle centrale demandée par Carry : un paiement n'est validé QUE si le
// montant reçu correspond EXACTEMENT au montant attendu (ni moins, ni plus).
// Tout écart est enregistré comme "invalide" — rien n'est validé en silence.
//
// IMPORTANT — cette fonction est pensée pour être appelée par un webhook de
// paiement (Mobile Money, carte, PayPal…) une fois ces intégrations câblées
// avec les vraies clés marchand de Carry. Tant qu'aucun webhook réel n'est
// branché, elle sert aussi de point d'entrée pour une confirmation manuelle
// depuis un futur tableau de bord admin. Avant mise en production réelle,
// définir MARKETPLACE_PAYMENT_WEBHOOK_SECRET et vérifier l'en-tête
// `x-webhook-secret` sur chaque appel — pour l'instant la vérification est
// best-effort (elle ne bloque pas si la variable n'est pas encore définie).
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

const METHODES = new Set(["mobile_money", "carte", "paypal", "autre"]);

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();
  const url = new URL(req.url);

  const expectedSecret = process.env.MARKETPLACE_PAYMENT_WEBHOOK_SECRET;
  if (expectedSecret) {
    const given = req.headers.get("x-webhook-secret") || "";
    if (given !== expectedSecret) return json({ error: "Non autorisé" }, 401);
  }

  if (req.method === "GET") {
    const kind = clean(url.searchParams.get("kind") || "", 20);
    const id = Number(url.searchParams.get("id"));
    if (!id || (kind !== "listing" && kind !== "order")) {
      return json({ error: "kind (listing|order) et id requis" }, 400);
    }
    if (kind === "listing") {
      const rows = await sql`
        SELECT id, listing_id, montant_attendu, montant_recu, statut, created_at, validated_at
        FROM marketplace_listing_payments WHERE listing_id = ${id}
        ORDER BY created_at DESC LIMIT 1
      `;
      if (!rows[0]) return json({ error: "Aucun paiement pour cette annonce" }, 404);
      return json({ paiement: rows[0] });
    }
    const rows = await sql`
      SELECT id, montant_attendu, montant_recu, statut, created_at, updated_at
      FROM marketplace_orders WHERE id = ${id} LIMIT 1
    `;
    if (!rows[0]) return json({ error: "Commande introuvable" }, 404);
    return json({ paiement: rows[0] });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const kind = clean(body.kind, 20);
  const id = Number(body.id);
  const montantRecu = Math.round(Number(body.montantRecu));
  const methode = clean(body.methode, 20);
  const reference = clean(body.reference, 200);

  if (!id || (kind !== "listing" && kind !== "order") || !Number.isFinite(montantRecu)) {
    return json({ error: "kind (listing|order), id et montantRecu sont requis" }, 400);
  }
  if (methode && !METHODES.has(methode)) return json({ error: "Méthode de paiement invalide" }, 400);

  if (kind === "listing") {
    const payRows = await sql`
      SELECT id, listing_id, montant_attendu FROM marketplace_listing_payments
      WHERE listing_id = ${id} ORDER BY created_at DESC LIMIT 1
    `;
    const pay = payRows[0] as any;
    if (!pay) return json({ error: "Aucun paiement en attente pour cette annonce" }, 404);

    const valide = montantRecu === pay.montant_attendu;
    await sql`
      UPDATE marketplace_listing_payments
      SET montant_recu = ${montantRecu}, methode = ${methode}, reference_transaction = ${reference},
          statut = ${valide ? "valide" : "invalide"},
          validated_at = ${valide ? sql`now()` : null}
      WHERE id = ${pay.id}
    `;

    if (valide) {
      await sql`
        UPDATE marketplace_listings
        SET statut = 'active', expire_at = now() + (duree_jours || ' days')::interval, updated_at = now()
        WHERE id = ${pay.listing_id}
      `;
    }

    return json({
      statut: valide ? "valide" : "invalide",
      montantAttendu: pay.montant_attendu,
      montantRecu,
      message: valide
        ? "Paiement confirmé, l'annonce est maintenant active."
        : `Montant reçu (${montantRecu}) différent du montant attendu (${pay.montant_attendu}) — paiement rejeté.`,
    });
  }

  // kind === "order"
  const orderRows = await sql`
    SELECT id, montant_attendu FROM marketplace_orders WHERE id = ${id} LIMIT 1
  `;
  const order = orderRows[0] as any;
  if (!order) return json({ error: "Commande introuvable" }, 404);

  const valide = montantRecu === order.montant_attendu;
  await sql`
    UPDATE marketplace_orders
    SET montant_recu = ${montantRecu}, methode_paiement = ${methode}, reference_transaction = ${reference},
        statut = ${valide ? "paye" : "paiement_invalide"}, updated_at = now()
    WHERE id = ${order.id}
  `;

  return json({
    statut: valide ? "paye" : "paiement_invalide",
    montantAttendu: order.montant_attendu,
    montantRecu,
    message: valide
      ? "Paiement confirmé, la commande est transmise au vendeur."
      : `Montant reçu (${montantRecu}) différent du montant attendu (${order.montant_attendu}) — paiement rejeté.`,
  });
};

export const config: Config = {
  path: "/api/marketplace-payments",
};
