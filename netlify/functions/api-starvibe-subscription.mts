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
import { recuAbonnement } from "./_recu.mts";
import { requireAuth } from "./_auth.mts";
import { memeNumero } from "./_tel.mts";
import { verrou, echec, msgBloque } from "./_guard.mts";

const ORG = "star_vibe";
const STAFF_ORG = "star_entreprise";

// Numéro Mobile Money de réception — à remplacer par un vrai compte
// marchand une fois un agrégateur (CinetPay, Flutterwave, etc.) branché.
const NUMERO_RECEPTION = "+242 06 656 50 50";

const PLANS: Record<string, { label: string; montant: number; description: string }> = {
  gratuit: { label: "Découverte", montant: 0, description: "Compte personnel, fil KOMYO, publication de vidéos, fonctions sociales de base." },
  famille: { label: "Famille (PIOUPIOU)", montant: 1500, description: "Contenus PIOUPIOU premium, profils enfants illimités, priorité de modération." },
  business: { label: "Business", montant: 5000, description: "Mise en avant des vidéos, statistiques, boutique (tes clients te paient directement ; reçus dans leur messagerie KOMYO ; 500 FCFA par semaine seulement les semaines avec ventes)." },
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
  payeur_account_id?: number | null;
  beneficiaire_nom?: string;
  payeur_telephone?: string;
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

  // --- Webhook Mobile Money (agrégateur) : confirmation AUTOMATIQUE,
  //     sans staff. Contrairement aux autres actions de ce fichier, celle-ci
  //     exige STARVIBE_PAYMENT_WEBHOOK_SECRET configurée — tant que Carry n'a
  //     pas de compte marchand chez un agrégateur (CinetPay, Flutterwave…),
  //     cette variable reste vide et l'action refuse systématiquement, pour
  //     qu'aucun paiement ne puisse jamais s'auto-valider sans vraie preuve
  //     signée par l'agrégateur. Même règle de validation que
  //     "confirmer_paiement" : montant EXACT, sinon rejeté.
  if (req.method === "POST" && url.searchParams.get("webhook") === "1") {
    const secret = process.env.STARVIBE_PAYMENT_WEBHOOK_SECRET;
    const given = req.headers.get("x-webhook-secret") || "";
    if (!secret || given !== secret) {
      return json({ error: "Webhook non configuré ou secret invalide — voir STARVIBE_PAYMENT_WEBHOOK_SECRET" }, 401);
    }

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

    const reference = clean(body.reference, 60);
    const montantRecu = Math.round(Number(body.montantRecu));
    const methode = clean(body.methode, 30) || "mobile_money_auto";
    const transactionId = clean(body.transactionId, 200);
    const m = /^KOMYO-(\d+)$/.exec(reference);
    if (!m || !Number.isFinite(montantRecu)) {
      return json({ error: "reference (format KOMYO-123) et montantRecu requis" }, 400);
    }
    const subscriptionId = Number(m[1]);

    const rows = (await sql`SELECT * FROM starvibe_subscriptions WHERE id = ${subscriptionId} LIMIT 1`) as SubRow[];
    const sub = rows[0];
    if (!sub) return json({ error: "Demande introuvable" }, 404);
    if (sub.statut !== "en_attente_paiement") {
      return json({ error: `Cette demande est déjà "${sub.statut}"` }, 409);
    }

    const valide = montantRecu === sub.montant_attendu;
    await sql`
      UPDATE starvibe_subscriptions
      SET montant_recu = ${montantRecu}, methode = ${methode}, reference_transaction = ${transactionId},
          statut = ${valide ? "actif" : "paiement_invalide"},
          started_at = ${valide ? sql`now()` : null},
          expires_at = ${valide ? sql`now() + interval '30 days'` : null},
          updated_at = now()
      WHERE id = ${subscriptionId}
    `;

    if (valide) await recuAbonnement(sql, subscriptionId);
    return json({
      statut: valide ? "actif" : "paiement_invalide",
      montantAttendu: sub.montant_attendu,
      montantRecu,
    });
  }

  // --- File des paiements en attente (staff STAR ENTREPRISE) ---
  if (req.method === "GET" && url.searchParams.get("admin") === "1") {
    const staff = await requireAuth(req);
    if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);

    const rows = (await sql`
      SELECT s.*, a.telephone, p.nom AS auteur_nom, pa.telephone AS payeur_telephone
      FROM starvibe_subscriptions s
      JOIN starvibe_accounts a ON a.id = s.account_id
      LEFT JOIN starvibe_accounts pa ON pa.id = s.payeur_account_id
      LEFT JOIN starvibe_profiles p ON p.account_id = a.id AND p.type_profil = 'personnel'
      WHERE s.statut = 'en_attente_paiement'
      ORDER BY s.created_at ASC LIMIT 50
    `) as SubRow[];

    return json({ demandes: rows.map((r) => ({ ...toApi(r), telephone: r.telephone, auteur: r.auteur_nom || "", payeurTelephone: r.payeur_telephone || "", beneficiaireNom: r.beneficiaire_nom || "" })) });
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

      if (valide) await recuAbonnement(sql, subscriptionId);
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

    if (action === "rappel_vu") {
      const quoi = clean(body.type, 10);
      if (quoi === "bientot") {
        await sql`UPDATE starvibe_subscriptions SET rappel_j3_at = now() WHERE account_id = ${accountId} AND statut = 'actif' AND montant_attendu > 0 AND rappel_j3_at IS NULL`;
      } else if (quoi === "expire") {
        await sql`UPDATE starvibe_subscriptions SET rappel_fin_at = now() WHERE account_id = ${accountId} AND statut = 'actif' AND montant_attendu > 0 AND rappel_fin_at IS NULL`;
      } else return json({ error: "Type inconnu" }, 400);
      return json({ ok: true });
    }

    // --- Abonnement Famille payé pour un autre compte (un parent, un proche…) ---
    // Le payeur est connecté ; le bénéficiaire est identifié par son numéro. Aucun code secret n'est jamais demandé ici :
    // le dépôt Mobile Money se fait sur le téléphone du payeur, et le plan ne s'active qu'à la confirmation réelle du paiement.
    if (action === "trouver_compte" || action === "abonner_autre") {
      const cle = `abonner:${accountId}`;
      const bloc = await verrou(sql, cle);
      if (bloc) return json({ error: msgBloque(bloc) }, 429);
      const telephone = clean(body.telephone, 40).replace(/[^\d+]/g, "");
      if (telephone.replace(/\D/g, "").length < 8) return json({ error: "Écris le numéro du parent de l'enfant." }, 400);
      await echec(sql, cle, 12, 60, 60);   // 11 recherches par heure et par personne : pas de balayage de numéros
      const cand = (await sql`
        SELECT a.id, a.telephone FROM starvibe_accounts a
        WHERE RIGHT(regexp_replace(a.telephone, '[^0-9]', '', 'g'), 8) = ${telephone.replace(/\D/g, "").slice(-8)} AND a.guest = false
        ORDER BY a.id LIMIT 20
      `) as { id: number; telephone: string }[];
      const cible = cand.find((r) => memeNumero(r.telephone, telephone));
      if (!cible) return json({ error: "Aucun compte KOMYO avec ce numéro. Le parent doit d'abord créer son compte (c'est gratuit)." }, 404);
      const prof = (await sql`SELECT nom, type_profil FROM starvibe_profiles WHERE account_id = ${cible.id} ORDER BY id`) as { nom: string; type_profil: string }[];
      const perso = prof.find((p) => p.type_profil === "personnel");
      const masque = (perso?.nom || "").split(/\s+/).filter(Boolean).map((m) => m[0].toUpperCase() + "•••").join(" ") || "Compte KOMYO";
      const enfants = prof.filter((p) => p.type_profil === "enfant").length;

      if (action === "trouver_compte") return json({ trouve: true, nomMasque: masque, enfants });

      const methode = ["mtn_money", "airtel_money"].includes(clean(body.methode, 20)) ? clean(body.methode, 20) : "";
      if (!methode) return json({ error: "Choisis MTN Mobile Money ou Airtel Money. Le paiement par carte arrive bientôt." }, 400);
      const actif = (await sql`SELECT plan FROM starvibe_subscriptions WHERE account_id = ${cible.id} AND statut = 'actif' AND montant_attendu > 0 AND expires_at > now() ORDER BY id DESC LIMIT 1`) as { plan: string }[];
      if (actif[0]?.plan === "business") return json({ error: "Ce compte a déjà un abonnement Business actif." }, 409);
      const enfantNom = clean(body.enfantNom, 80).replace(/[\u0000-\u001f\u007f<>]/g, "");
      const ligne = (await sql`
        INSERT INTO starvibe_subscriptions (account_id, plan, montant_attendu, statut, methode, payeur_account_id, beneficiaire_nom)
        VALUES (${cible.id}, 'famille', ${PLANS.famille.montant}, 'en_attente_paiement', ${methode}, ${accountId}, ${enfantNom})
        RETURNING *
      `) as SubRow[];
      return json({ abonnement: toApi(ligne[0]), nomMasque: masque }, 201);
    }

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

  // --- Suivi d'un paiement (le payeur ou le bénéficiaire) : le bouton ne devient vert que quand le serveur dit « actif » ---
  if (url.searchParams.get("suivi")) {
    const id = Number(url.searchParams.get("suivi"));
    const r = (await sql`SELECT * FROM starvibe_subscriptions WHERE id = ${id} AND (account_id = ${accountId} OR payeur_account_id = ${accountId}) LIMIT 1`) as SubRow[];
    if (!r[0]) return json({ error: "Paiement introuvable" }, 404);
    return json({ abonnement: toApi(r[0]) });
  }

  // --- Rappel d'échéance : 3 jours avant la fin, puis à la fin (une seule fois chacun) ---
  if (url.searchParams.get("rappel") === "1") {
    const r = (await sql`
      SELECT id, plan, expires_at, rappel_j3_at, rappel_fin_at,
             CEIL(EXTRACT(EPOCH FROM (expires_at - now())) / 86400)::int AS jours,
             (expires_at <= now()) AS fini
      FROM starvibe_subscriptions
      WHERE account_id = ${accountId} AND statut = 'actif' AND montant_attendu > 0 AND expires_at IS NOT NULL
      ORDER BY expires_at DESC LIMIT 1
    `) as { id: number; plan: string; expires_at: string; rappel_j3_at: string | null; rappel_fin_at: string | null; jours: number; fini: boolean }[];
    const a = r[0];
    if (!a) return json({ rappel: null });
    const nom = (await sql`SELECT nom FROM starvibe_profiles WHERE account_id = ${accountId} AND type_profil = 'personnel' ORDER BY id LIMIT 1`) as { nom: string }[];
    const base = { nom: nom[0]?.nom || "", plan: a.plan, planLabel: PLANS[a.plan]?.label || a.plan, expiresAt: a.expires_at };
    if (!a.fini && a.jours <= 3 && !a.rappel_j3_at) return json({ rappel: { ...base, type: "bientot", jours: Math.max(1, a.jours) } });
    if (a.fini && !a.rappel_fin_at && Date.now() - new Date(a.expires_at).getTime() < 7 * 86400000) return json({ rappel: { ...base, type: "expire", jours: 0 } });
    return json({ rappel: null });
  }

  const rows = (await sql`
    SELECT * FROM starvibe_subscriptions WHERE account_id = ${accountId} ORDER BY id DESC LIMIT 1
  `) as SubRow[];

  const courant = rows[0] ? toApi(rows[0]) : { plan: "gratuit", statut: "actif", montantAttendu: 0, montantRecu: null, expiresAt: null };
  return json({ abonnement: courant, plans: PLANS });
};

export const config: Config = {
  path: "/api/starvibe-subscription",
};
