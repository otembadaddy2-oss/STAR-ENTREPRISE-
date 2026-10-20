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
import annuaireSeed from "./keydou-annuaire.json";

const ORG = "star_vibe";
const STAFF_ORG = "star_entreprise";
const NUMERO_RECEPTION = "+242 06 656 50 50";
const MONTANT = 1000;
const MAX_ATTENTE = 5;
const VILLES = ["Brazzaville", "Pointe-Noire", "Dolisie", "Nkayi"];

type LieuSeed = {
  service: string; ville: string; nom: string; adresse: string; telephone: string;
  description: string; source_url: string; source_note: string;
};

let seeded = false;
// Au tout premier appel, si l'annuaire est vide, Keydou reçoit sa mémoire de départ
// (adresses relevées sur des sources publiques, toutes marquées "à confirmer").
// deno-lint-ignore no-explicit-any
async function seedAnnuaire(sql: any) {
  if (seeded) return;
  const n = (await sql`SELECT COUNT(*) AS n FROM starvibe_keydou_lieux`) as { n: string }[];
  if (Number(n[0]?.n) === 0) {
    for (const l of annuaireSeed as LieuSeed[]) {
      await sql`
        INSERT INTO starvibe_keydou_lieux (service, ville, nom, adresse, telephone, description, source_url, source_note, verifie)
        VALUES (${l.service}, ${l.ville}, ${l.nom}, ${l.adresse}, ${l.telephone}, ${l.description}, ${l.source_url}, ${l.source_note}, false)
      `;
    }
  }
  seeded = true;
}

// Journal : chaque contact avec Keydou est enregistré (jamais bloquant pour le client).
// deno-lint-ignore no-explicit-any
async function logEvent(sql: any, accountId: number, type: string, texte = "", service = "", ville = "", requestId: number | null = null) {
  try {
    await sql`
      INSERT INTO starvibe_keydou_events (account_id, type, texte, service, ville, request_id)
      VALUES (${accountId}, ${type}, ${texte.slice(0, 400)}, ${service}, ${ville}, ${requestId})
    `;
  } catch { /* le journal ne doit jamais casser le parcours */ }
}

interface LieuRow {
  id: number; service: string; ville: string; nom: string; adresse: string; telephone: string;
  whatsapp: string; description: string; source_url: string; source_note: string;
  verifie: boolean; actif: boolean; updated_at: string;
}
function lieuApi(l: LieuRow, staff = false) {
  return {
    id: String(l.id), service: l.service, ville: l.ville, nom: l.nom, adresse: l.adresse,
    telephone: l.telephone, whatsapp: l.whatsapp, description: l.description,
    sourceNote: l.source_note, verifie: l.verifie,
    ...(staff ? { sourceUrl: l.source_url, actif: l.actif, updatedAt: l.updated_at } : {}),
  };
}

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
  ville: string;
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
    ville: r.ville,
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
  await seedAnnuaire(sql);
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
    await logEvent(sql, rows[0].account_id, valide ? "paiement_valide" : "paiement_invalide", `${montantRecu} FCFA`, rows[0].service, rows[0].ville, rows[0].id);
    return json({ statut: valide ? "paye" : "paiement_invalide" });
  }

  // --- Staff : journal des contacts, en direct ---
  if (req.method === "GET" && url.searchParams.get("contacts") === "1") {
    const staff = await requireAuth(req);
    if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);
    const limit = Math.min(2000, Math.max(1, Number(url.searchParams.get("limit")) || 300));
    const rows = (await sql`
      SELECT e.id, e.type, e.texte, e.service, e.ville, e.request_id, e.created_at,
             a.telephone, p.nom AS nom
      FROM starvibe_keydou_events e
      JOIN starvibe_accounts a ON a.id = e.account_id
      LEFT JOIN starvibe_profiles p ON p.account_id = a.id AND p.type_profil = 'personnel'
      ORDER BY e.id DESC LIMIT ${limit}
    `) as { id: number; type: string; texte: string; service: string; ville: string; request_id: number | null; created_at: string; telephone: string; nom: string | null }[];
    return json({
      now: new Date().toISOString(),
      contacts: rows.map((r) => ({
        id: String(r.id), date: r.created_at, nom: r.nom || "", telephone: r.telephone, type: r.type,
        texte: r.texte, service: r.service, serviceLabel: SERVICES[r.service] || r.service,
        ville: r.ville, reference: r.request_id ? `KDU-${r.request_id}` : "",
      })),
    });
  }

  // --- Staff : annuaire complet ---
  if (req.method === "GET" && url.searchParams.get("lieux_admin") === "1") {
    const staff = await requireAuth(req);
    if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);
    const rows = (await sql`SELECT * FROM starvibe_keydou_lieux ORDER BY service, ville, nom`) as LieuRow[];
    return json({ lieux: rows.map((l) => lieuApi(l, true)), services: SERVICES, villes: VILLES });
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
      await logEvent(sql, rows[0].account_id, valide ? "paiement_valide" : "paiement_invalide", `${montantRecu} FCFA`, rows[0].service, rows[0].ville, rows[0].id);
      return json({
        statut: valide ? "paye" : "paiement_invalide",
        message: valide ? "Paiement confirmé." : `Montant reçu (${montantRecu}) différent du montant attendu (${rows[0].montant_attendu}) — rejeté.`,
      });
    }

    // --- Staff : gestion de l'annuaire de Keydou ---
    if (action === "lieu_save" || action === "lieu_delete" || action === "lieux_import") {
      const staff = await requireAuth(req);
      if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);

      if (action === "lieu_delete") {
        await sql`DELETE FROM starvibe_keydou_lieux WHERE id = ${Number(body.id)}`;
        return json({ ok: true });
      }

      const read = (b: Record<string, unknown>) => ({
        service: clean(b.service, 20), ville: clean(b.ville, 40), nom: clean(b.nom, 120),
        adresse: clean(b.adresse, 200), telephone: clean(b.telephone, 80), whatsapp: clean(b.whatsapp, 40),
        description: clean(b.description, 400), sourceUrl: clean(b.sourceUrl, 300), sourceNote: clean(b.sourceNote, 200),
        verifie: Boolean(b.verifie), actif: b.actif === undefined ? true : Boolean(b.actif),
      });

      if (action === "lieu_save") {
        const l = read(body);
        if (!SERVICES[l.service] || !l.ville || !l.nom) return json({ error: "Service, ville et nom requis" }, 400);
        const id = Number(body.id) || 0;
        if (id) {
          await sql`
            UPDATE starvibe_keydou_lieux SET service=${l.service}, ville=${l.ville}, nom=${l.nom}, adresse=${l.adresse},
              telephone=${l.telephone}, whatsapp=${l.whatsapp}, description=${l.description}, source_url=${l.sourceUrl},
              source_note=${l.sourceNote}, verifie=${l.verifie}, actif=${l.actif}, updated_at=now()
            WHERE id=${id}
          `;
        } else {
          await sql`
            INSERT INTO starvibe_keydou_lieux (service, ville, nom, adresse, telephone, whatsapp, description, source_url, source_note, verifie, actif)
            VALUES (${l.service}, ${l.ville}, ${l.nom}, ${l.adresse}, ${l.telephone}, ${l.whatsapp}, ${l.description}, ${l.sourceUrl}, ${l.sourceNote}, ${l.verifie}, ${l.actif})
          `;
        }
        return json({ ok: true });
      }

      // Import en masse (fichier Excel rempli par l'équipe) : met à jour si le lieu existe déjà.
      const list = Array.isArray(body.lieux) ? (body.lieux as Record<string, unknown>[]).slice(0, 1000) : [];
      let ajoutes = 0, misAJour = 0, ignores = 0;
      for (const raw of list) {
        const l = read(raw);
        if (!SERVICES[l.service] || !l.ville || !l.nom) { ignores++; continue; }
        const ex = (await sql`SELECT id FROM starvibe_keydou_lieux WHERE service=${l.service} AND ville=${l.ville} AND nom=${l.nom} LIMIT 1`) as { id: number }[];
        if (ex[0]) {
          await sql`
            UPDATE starvibe_keydou_lieux SET adresse=${l.adresse}, telephone=${l.telephone}, whatsapp=${l.whatsapp},
              description=${l.description}, source_url=${l.sourceUrl}, source_note=${l.sourceNote}, verifie=${l.verifie},
              actif=${l.actif}, updated_at=now() WHERE id=${ex[0].id}
          `;
          misAJour++;
        } else {
          await sql`
            INSERT INTO starvibe_keydou_lieux (service, ville, nom, adresse, telephone, whatsapp, description, source_url, source_note, verifie, actif)
            VALUES (${l.service}, ${l.ville}, ${l.nom}, ${l.adresse}, ${l.telephone}, ${l.whatsapp}, ${l.description}, ${l.sourceUrl}, ${l.sourceNote}, ${l.verifie}, ${l.actif})
          `;
          ajoutes++;
        }
      }
      return json({ ok: true, ajoutes, misAJour, ignores });
    }

    // --- Actions du client (compte KOMYO) ---
    const session = await requireAuth(req);
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
    const accountId = Number(session.sub);

    if (action === "demande") {
      const service = clean(body.service, 20);
      if (!SERVICES[service]) return json({ error: "Service inconnu" }, 400);
      const ville = VILLES.includes(clean(body.ville, 40)) ? clean(body.ville, 40) : "";
      const pending = (await sql`
        SELECT COUNT(*) AS n FROM starvibe_keydou_requests WHERE account_id = ${accountId} AND statut = 'en_attente_paiement'
      `) as { n: string }[];
      if (Number(pending[0]?.n) >= MAX_ATTENTE) {
        return json({ error: "Trop de demandes en attente de paiement. Règle ou attends la confirmation des précédentes." }, 429);
      }
      const rows = (await sql`
        INSERT INTO starvibe_keydou_requests (account_id, service, ville, demande_vocale, montant_attendu)
        VALUES (${accountId}, ${service}, ${ville}, ${clean(body.demandeVocale, 300)}, ${MONTANT})
        RETURNING *
      `) as Row[];
      await logEvent(sql, accountId, "demande", clean(body.demandeVocale, 300), service, ville, rows[0].id);
      return json({ demande: toApi(rows[0]) }, 201);
    }

    // Contacts spontanés (ouverture, paroles, choix) : enregistrés pour le suivi en direct.
    if (action === "evenement") {
      const type = clean(body.type, 30);
      if (!["ouverture", "parole", "choix_service", "choix_ville", "appel_lieu"].includes(type)) return json({ error: "Type inconnu" }, 400);
      const svc = SERVICES[clean(body.service, 20)] ? clean(body.service, 20) : "";
      const vil = VILLES.includes(clean(body.ville, 40)) ? clean(body.ville, 40) : "";
      await logEvent(sql, accountId, type, clean(body.texte, 300), svc, vil, Number(body.requestId) || null);
      return json({ ok: true });
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
      await logEvent(sql, accountId, "paiement_declare", clean(body.reference, 200), own[0].service, own[0].ville, requestId);
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
      await logEvent(sql, accountId, "coordonnees", `${details.nom} · ${details.contact}`, own[0].service, own[0].ville, requestId);
      return json({ ok: true });
    }

    return json({ error: "Action inconnue" }, 400);
  }

  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  // --- Aperçu gratuit : combien d'adresses et leurs noms (jamais les numéros) ---
  if (url.searchParams.get("apercu") === "1") {
    const session = await requireAuth(req);
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
    const service = clean(url.searchParams.get("service"), 20);
    const ville = clean(url.searchParams.get("ville"), 40);
    const rows = (await sql`
      SELECT nom FROM starvibe_keydou_lieux
      WHERE actif = true AND service = ${service} AND (${ville} = '' OR ville = ${ville})
      ORDER BY nom
    `) as { nom: string }[];
    return json({ total: rows.length, noms: rows.slice(0, 12).map((r) => r.nom) });
  }

  // --- Adresses complètes (avec numéros) : uniquement après paiement confirmé ---
  if (url.searchParams.get("resultats") === "1") {
    const session = await requireAuth(req);
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
    const id = Number(url.searchParams.get("requestId"));
    const own = (await sql`
      SELECT * FROM starvibe_keydou_requests WHERE id = ${id} AND account_id = ${Number(session.sub)} LIMIT 1
    `) as Row[];
    if (!own[0]) return json({ error: "Demande introuvable" }, 404);
    if (own[0].statut !== "paye") return json({ error: "Paiement non confirmé" }, 402);
    const rows = (await sql`
      SELECT * FROM starvibe_keydou_lieux
      WHERE actif = true AND service = ${own[0].service} AND (${own[0].ville} = '' OR ville = ${own[0].ville})
      ORDER BY ville, verifie DESC, (telephone <> '') DESC, nom
    `) as LieuRow[];
    return json({ lieux: rows.map((l) => lieuApi(l)), service: own[0].service, ville: own[0].ville });
  }

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
