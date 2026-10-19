// KOMYO — Keydou, assistant multiservices. Chaque service est payant
// (1 000 FCFA, Mobile Money) : rien n'est donné ni enregistré comme "payé"
// sans confirmation. Même règle que les abonnements : le montant reçu doit
// correspondre EXACTEMENT au montant attendu.
//
// Tant qu'aucun compte marchand (API MTN / Airtel / agrégateur) n'est branché,
// un compte staff STAR ENTREPRISE confirme le paiement une fois l'argent reçu
// (page paiements.html). Le webhook ci-dessous est prêt pour la confirmation
// automatique : il exige STARVIBE_PAYMENT_WEBHOOK_SECRET, comme pour les
// abonnements, et refuse tout tant que ce secret n'est pas configuré.
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

const ORG = "star_vibe";
const STAFF_ORG = "star_entreprise";
const NUMERO_RECEPTION = "+242 06 656 50 50";
const MONTANT = 1000;
const MAX_ATTENTE = 5;

const SERVICES: Record<string, string> = {
  hotel: "Un hôtel",
  restaurant: "Une table au restaurant",
  coiffure: "Un salon de coiffure (homme)",
  sport: "Une salle de sport",
  mariage: "Une salle de mariage ou d'événement",
  spa: "Un salon de spa",
  voiture: "La location d'un véhicule pour la journée",
  cafe: "Un rendez-vous dans un café",
  mecanique: "Un dépannage mécanique ou une orientation",
};

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

interface Row {
  id: number;
  account_id: number;
  service: string;
  demande_vocale: string;
  montant_attendu: number;
  montant_recu: number | null;
  reference_transaction: string;
  paiement_declare_at: string | null;
  statut: string;
  details: Record<string, string>;
  traite: boolean;
  paid_at: string | null;
  created_at: string;
  telephone?: string;
  auteur_nom?: string;
}

function toApi(r: Row) {
  return {
    id: String(r.id),
    service: r.service,
    serviceLabel: SERVICES[r.service] || r.service,
    demandeVocale: r.demande_vocale,
    montantAttendu: r.montant_attendu,
    statut: r.statut,
    paiementDeclare: Boolean(r.paiement_declare_at),
    details: r.details || {},
    traite: r.traite,
    paidAt: r.paid_at,
    createdAt: r.created_at,
    referencePaiement: `KDU-${r.id}`,
    numeroReception: NUMERO_RECEPTION,
  };
}

// Valide le paiement d'une demande si (et seulement si) le montant est exact.
async function appliquerPaiement(
  // deno-lint-ignore no-explicit-any
  sql: any, row: Row, montantRecu: number, reference: string,
): Promise<boolean> {
  const valide = montantRecu === row.montant_attendu;
  await sql`
    UPDATE starvibe_keydou_requests
    SET montant_recu = ${montantRecu}, reference_transaction = ${reference},
        statut = ${valide ? "paye" : "paiement_invalide"},
        paid_at = ${valide ? sql`now()` : null}, updated_at = now()
    WHERE id = ${row.id}
  `;
  return valide;
}

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();
  const url = new URL(req.url);

  // --- Webhook de l'opérateur / agrégateur : confirmation AUTOMATIQUE ---
  if (req.method === "POST" && url.searchParams.get("webhook") === "1") {
    const secret = process.env.STARVIBE_PAYMENT_WEBHOOK_SECRET;
    const given = req.headers.get("x-webhook-secret") || "";
    if (!secret || given !== secret) {
      return json({ error: "Webhook non configuré ou secret invalide — voir STARVIBE_PAYMENT_WEBHOOK_SECRET" }, 401);
    }
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    const m = /^KDU-(\d+)$/.exec(clean(body.reference, 60));
    const montantRecu = Math.round(Number(body.montantRecu));
    if (!m || !Number.isFinite(montantRecu)) return json({ error: "reference (KDU-123) et montantRecu requis" }, 400);
    const rows = (await sql`SELECT * FROM starvibe_keydou_requests WHERE id = ${Number(m[1])} LIMIT 1`) as Row[];
    if (!rows[0]) return json({ error: "Demande introuvable" }, 404);
    if (rows[0].statut !== "en_attente_paiement") return json({ error: `Cette demande est déjà "${rows[0].statut}"` }, 409);
    const valide = await appliquerPaiement(sql, rows[0], montantRecu, clean(body.transactionId, 200));
    return json({ statut: valide ? "paye" : "paiement_invalide" });
  }

  // --- Staff : paiements à confirmer + demandes payées à traiter ---
  if (req.method === "GET" && url.searchParams.get("admin") === "1") {
    const staff = await requireAuth(req);
    if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);

    const rows = (await sql`
      SELECT k.*, a.telephone, p.nom AS auteur_nom
      FROM starvibe_keydou_requests k
      JOIN starvibe_accounts a ON a.id = k.account_id
      LEFT JOIN starvibe_profiles p ON p.account_id = a.id AND p.type_profil = 'personnel'
      WHERE k.statut = 'en_attente_paiement' OR (k.statut = 'paye' AND k.traite = false)
      ORDER BY k.created_at ASC LIMIT 60
    `) as Row[];
    const map = (r: Row) => ({ ...toApi(r), telephone: r.telephone, auteur: r.auteur_nom || "" });
    return json({
      aConfirmer: rows.filter((r) => r.statut === "en_attente_paiement").map(map),
      aTraiter: rows.filter((r) => r.statut === "paye").map(map),
    });
  }

  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    const action = clean(body.action, 30);

    // --- Actions staff ---
    if (action === "confirmer_paiement" || action === "marquer_traite") {
      const staff = await requireAuth(req);
      if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);
      const requestId = Number(body.requestId);
      if (!requestId) return json({ error: "requestId requis" }, 400);
      const rows = (await sql`SELECT * FROM starvibe_keydou_requests WHERE id = ${requestId} LIMIT 1`) as Row[];
      if (!rows[0]) return json({ error: "Demande introuvable" }, 404);

      if (action === "marquer_traite") {
        await sql`UPDATE starvibe_keydou_requests SET traite = true, updated_at = now() WHERE id = ${requestId}`;
        return json({ ok: true });
      }

      const montantRecu = Math.round(Number(body.montantRecu));
      if (!Number.isFinite(montantRecu)) return json({ error: "montantRecu requis" }, 400);
      if (rows[0].statut !== "en_attente_paiement") return json({ error: `Cette demande est déjà "${rows[0].statut}"` }, 409);
      const valide = await appliquerPaiement(sql, rows[0], montantRecu, clean(body.reference, 200));
      return json({
        statut: valide ? "paye" : "paiement_invalide",
        message: valide ? "Paiement confirmé." : `Montant reçu (${montantRecu}) différent du montant attendu (${rows[0].montant_attendu}) — rejeté.`,
      });
    }

    // --- Actions du client (compte KOMYO) ---
    const session = await requireAuth(req);
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
    const accountId = Number(session.sub);

    if (action === "demande") {
      const service = clean(body.service, 20);
      if (!SERVICES[service]) return json({ error: "Service inconnu" }, 400);
      const pending = (await sql`
        SELECT COUNT(*) AS n FROM starvibe_keydou_requests WHERE account_id = ${accountId} AND statut = 'en_attente_paiement'
      `) as { n: string }[];
      if (Number(pending[0]?.n) >= MAX_ATTENTE) {
        return json({ error: "Trop de demandes en attente de paiement. Règle ou attends la confirmation des précédentes." }, 429);
      }
      const rows = (await sql`
        INSERT INTO starvibe_keydou_requests (account_id, service, demande_vocale, montant_attendu)
        VALUES (${accountId}, ${service}, ${clean(body.demandeVocale, 300)}, ${MONTANT})
        RETURNING *
      `) as Row[];
      return json({ demande: toApi(rows[0]) }, 201);
    }

    const requestId = Number(body.requestId);
    if (!requestId) return json({ error: "requestId requis" }, 400);
    const own = (await sql`
      SELECT * FROM starvibe_keydou_requests WHERE id = ${requestId} AND account_id = ${accountId} LIMIT 1
    `) as Row[];
    if (!own[0]) return json({ error: "Demande introuvable" }, 404);

    // Le client dit "j'ai payé" : simple signal pour le staff, JAMAIS une validation.
    if (action === "paiement_declare") {
      await sql`
        UPDATE starvibe_keydou_requests
        SET paiement_declare_at = now(), reference_transaction = ${clean(body.reference, 200)}, updated_at = now()
        WHERE id = ${requestId} AND statut = 'en_attente_paiement'
      `;
      return json({ ok: true });
    }

    // Coordonnées du client, uniquement une fois le paiement validé.
    if (action === "details") {
      if (own[0].statut !== "paye") return json({ error: "Le paiement n'est pas encore confirmé" }, 402);
      const details = {
        nom: clean(body.nom, 80),
        contact: clean(body.contact, 80),
        ville: clean(body.ville, 40),
        lieu: clean(body.lieu, 120),
        date: clean(body.date, 60),
        budget: clean(body.budget, 60),
        precisions: clean(body.precisions, 400),
      };
      if (!details.nom || !details.contact || !details.ville) {
        return json({ error: "Nom, coordonnées et ville sont requis" }, 400);
      }
      await sql`
        UPDATE starvibe_keydou_requests SET details = ${JSON.stringify(details)}::jsonb, updated_at = now() WHERE id = ${requestId}
      `;
      return json({ ok: true });
    }

    return json({ error: "Action inconnue" }, 400);
  }

  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  // --- Statut d'une demande (le client attend la validation de son paiement) ---
  const session = await requireAuth(req);
  if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
  const id = Number(url.searchParams.get("id"));
  if (!id) return json({ error: "id requis" }, 400);
  const rows = (await sql`
    SELECT * FROM starvibe_keydou_requests WHERE id = ${id} AND account_id = ${Number(session.sub)} LIMIT 1
  `) as Row[];
  if (!rows[0]) return json({ error: "Demande introuvable" }, 404);
  return json({ demande: toApi(rows[0]) });
};

export const config: Config = {
  path: "/api/starvibe-keydou",
};
