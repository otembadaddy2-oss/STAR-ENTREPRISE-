// KOMYO — abonnements réels (Gratuit / Famille / Business), paiement
// Mobile Money. Même règle que les paiements Marketplace : un paiement
// n'est validé QUE si le montant reçu correspond EXACTEMENT au montant
// attendu — rien n'est jamais activé en silence.
//
// Tant qu'aucun webhook Mobile Money réel n'est branché (clés marchand de
// Carry chez un agrégateur), la confirmation d'un paiement Famille/Business
// se fait manuellement par un compte staff STAR ENTREPRISE, une fois
// l'argent reçu sur le numéro Mobile Money indiqué au client. Cette
// fonction est écrite pour qu'un vrai webhook (action "confirmer_paiement")
// puisse être branché plus tard sans rien changer côté client.
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

const ORG = "star_vibe";
const STAFF_ORG = "star_entreprise";

// Numéro Mobile Money de réception — à remplacer par un vrai compte
// marchand une fois un agrégateur (CinetPay, Flutterwave, etc.) branché.
const NUMERO_RECEPTION = "+242 06 656 50 50";

const PLANS: Record<string, { label: string; montant: number; description: string }> = {
  gratuit: { label: "Découverte", montant: 0, description: "Compte personnel, fil KOMYO, publication de vidéos, fonctions sociales de base." },
  famille: { label: "Famille (PIOUPIOU)", montant: 1500, description: "Contenus PIOUPIOU premium, profils enfants illimités, priorité de modération." },
  business: { label: "Business", montant: 5000, description: "Mise en avant des vidéos, statistiques, futurs outils de promotion KOMYO Business." },
};

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

interface SubRow {
  id: number;
  account_id: number;
  plan: string;
  montant_attendu: number;
  montant_recu: number | null;
  methode: string;
  reference_transaction: string;
  statut: string;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
  telephone?: string;
  auteur_nom?: string;
}

function toApi(row: SubRow) {
  return {
    id: String(row.id),
    plan: row.plan,
    montantAttendu: row.montant_attendu,
    montantRecu: row.montant_recu,
    statut: row.statut,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    referencePaiement: `KOMYO-${row.id}`,
    numeroReception: NUMERO_RECEPTION,
  };
}

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();
  const url = new URL(req.url);

  // --- File des paiements en attente (staff STAR ENTREPRISE) ---
  if (req.method === "GET" && url.searchParams.get("admin") === "1") {
    const staff = await requireAuth(req);
    if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);

    const rows = (await sql`
      SELECT s.*, a.telephone, p.nom AS auteur_nom
      FROM starvibe_subscriptions s
      JOIN starvibe_accounts a ON a.id = s.account_id
      LEFT JOIN starvibe_profiles p ON p.account_id = a.id AND p.type_profil = 'personnel'
      WHERE s.statut = 'en_attente_paiement'
      ORDER BY s.created_at ASC LIMIT 50
    `) as SubRow[];

    return json({ demandes: rows.map((r) => ({ ...toApi(r), telephone: r.telephone, auteur: r.auteur_nom || "" })) });
  }

  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const action = clean(body.action, 30);

    // --- Confirmation d'un paiement (staff STAR ENTREPRISE) ---
    if (action === "confirmer_paiement") {
      const staff = await requireAuth(req);
      if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);

      const subscriptionId = Number(body.subscriptionId);
      const montantRecu = Math.round(Number(body.montantRecu));
      const methode = clean(body.methode, 30) || "mobile_money";
      const reference = clean(body.reference, 200);

      if (!subscriptionId || !Number.isFinite(montantRecu)) {
        return json({ error: "subscriptionId et montantRecu sont requis" }, 400);
      }

      const rows = (await sql`SELECT * FROM starvibe_subscriptions WHERE id = ${subscriptionId} LIMIT 1`) as SubRow[];
      const sub = rows[0];
      if (!sub) return json({ error: "Demande introuvable" }, 404);
      if (sub.statut !== "en_attente_paiement") {
        return json({ error: `Cette demande est déjà "${sub.statut}"` }, 409);
      }

      const valide = montantRecu === sub.montant_attendu;
      await sql`
        UPDATE starvibe_subscriptions
        SET montant_recu = ${montantRecu}, methode = ${methode}, reference_transaction = ${reference},
            statut = ${valide ? "actif" : "paiement_invalide"},
            started_at = ${valide ? sql`now()` : null},
            expires_at = ${valide ? sql`now() + interval '30 days'` : null},
            updated_at = now()
        WHERE id = ${subscriptionId}
      `;

      return json({
        statut: valide ? "actif" : "paiement_invalide",
        montantAttendu: sub.montant_attendu,
        montantRecu,
        message: valide
          ? `Paiement confirmé — plan "${PLANS[sub.plan]?.label || sub.plan}" activé pour 30 jours.`
          : `Montant reçu (${montantRecu}) différent du montant attendu (${sub.montant_attendu}) — paiement rejeté.`,
      });
    }

    // --- Choix d'un plan (compte KOMYO) ---
    const session = await requireAuth(req);
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
    const accountId = Number(session.sub);

    if (action === "choisir_plan") {
      const plan = clean(body.plan, 20);
      if (!PLANS[plan]) return json({ error: "Plan inconnu" }, 400);

      const montant = PLANS[plan].montant;
      const statut = montant === 0 ? "actif" : "en_attente_paiement";

      const rows = (await sql`
        INSERT INTO starvibe_subscriptions (account_id, plan, montant_attendu, statut, started_at)
        VALUES (${accountId}, ${plan}, ${montant}, ${statut}, ${statut === "actif" ? sql`now()` : null})
        RETURNING *
      `) as SubRow[];

      return json({ abonnement: toApi(rows[0]) }, 201);
    }

    return json({ error: "Action inconnue" }, 400);
  }

  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  // --- Statut actuel de l'abonnement (compte KOMYO) ---
  const session = await requireAuth(req);
  if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
  const accountId = Number(session.sub);

  const rows = (await sql`
    SELECT * FROM starvibe_subscriptions WHERE account_id = ${accountId} ORDER BY id DESC LIMIT 1
  `) as SubRow[];

  const courant = rows[0] ? toApi(rows[0]) : { plan: "gratuit", statut: "actif", montantAttendu: 0, montantRecu: null, expiresAt: null };
  return json({ abonnement: courant, plans: PLANS });
};

export const config: Config = {
  path: "/api/starvibe-subscription",
};
