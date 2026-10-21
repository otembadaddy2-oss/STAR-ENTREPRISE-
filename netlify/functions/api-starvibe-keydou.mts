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
import annuaire2026 from "./keydou-annuaire-2026.json";
import urgences from "./keydou-urgences.json";
import { vapidKeys, smsSecret, checkSmsSecret, decisionToken, checkDecisionToken, pushAll, parseSms, last9 } from "./_push.mts";

const ORG = "star_vibe";
const STAFF_ORG = "star_entreprise";
const NUMERO_RECEPTION = "+242 06 656 50 50";
const MONTANT = 1000;
const MAX_ATTENTE = 5;
const MAX_SERVICES = 3; // une seule demande de 1 000 FCFA couvre jusqu'à 3 besoins cochés
const VILLES = ["Brazzaville", "Pointe-Noire", "Dolisie", "Nkayi", "Oyo", "Ouesso"];
const AUTRES = "Autres"; // petites villes et routes RN1 / RN2

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
  await importAnnuaire2026(sql);
  seeded = true;
}

type Lieu2026 = {
  service: string; ville: string; nom: string; adresse: string; telephone: string; whatsapp: string;
  description: string; source_url: string; source_note: string;
};
// Annuaire KEYDOU du 21/10/2026 (277 fiches du PDF fourni par Carry) : intégré une seule fois à la
// mémoire de Keydou. Les fiches déjà présentes (même nom, ou même numéro) sont complétées, jamais doublées.
// deno-lint-ignore no-explicit-any
async function importAnnuaire2026(sql: any) {
  const done = ((await sql`SELECT value FROM starvibe_settings WHERE key = 'annuaire_2026'`) as { value: string }[])[0]?.value;
  if (done === "ok") return;
  const liste = (annuaire2026 as Lieu2026[]).map((l) => ({ ...l, tel9: last9(l.telephone) }));
  const j = JSON.stringify(liste);
  await sql`
    UPDATE starvibe_keydou_lieux l SET
      adresse = CASE WHEN x.adresse <> '' THEN x.adresse ELSE l.adresse END,
      telephone = CASE WHEN x.telephone <> '' THEN x.telephone ELSE l.telephone END,
      whatsapp = CASE WHEN x.whatsapp <> '' THEN x.whatsapp ELSE l.whatsapp END,
      description = x.description, source_note = x.source_note, actif = true, updated_at = now()
    FROM jsonb_to_recordset(${j}::jsonb) AS x(service text, ville text, nom text, adresse text, telephone text, whatsapp text, description text, source_url text, source_note text, tel9 text)
    WHERE l.service = x.service AND l.ville = x.ville AND lower(l.nom) = lower(x.nom)
  `;
  await sql`
    INSERT INTO starvibe_keydou_lieux (service, ville, nom, adresse, telephone, whatsapp, description, source_url, source_note, verifie)
    SELECT x.service, x.ville, x.nom, x.adresse, x.telephone, x.whatsapp, x.description, x.source_url, x.source_note, false
    FROM jsonb_to_recordset(${j}::jsonb) AS x(service text, ville text, nom text, adresse text, telephone text, whatsapp text, description text, source_url text, source_note text, tel9 text)
    WHERE NOT EXISTS (
      SELECT 1 FROM starvibe_keydou_lieux l WHERE l.service = x.service AND (
        (l.ville = x.ville AND lower(l.nom) = lower(x.nom))
        OR (x.tel9 <> '' AND RIGHT(regexp_replace(l.telephone, '[^0-9]', '', 'g'), 9) = x.tel9))
    )
  `;
  await sql`INSERT INTO starvibe_settings (key, value) VALUES ('annuaire_2026', 'ok') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
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
  hotel: "Un hôtel ou une résidence",
  restaurant: "Une table au restaurant",
  patisserie: "Une boulangerie ou une pâtisserie",
  cafe: "Un rendez-vous dans un café",
  coiffure: "Un salon de coiffure ou de beauté",
  spa: "Un salon de spa",
  sport: "Une salle de sport",
  voiture: "La location d'un véhicule",
  vente_auto: "Acheter ou vendre une voiture",
  mecanique: "Un garage, un dépannage ou un remorquage",
  station: "Une station-service",
  voyage: "Une agence de voyages ou un billet",
  mariage: "Une salle de mariage ou de réception",
  evenement: "Une agence événementielle",
  bureau: "Un bureau ou un espace de coworking",
  tourisme: "Une agence de tourisme ou un parc naturel",
  enfants: "Un parc ou des loisirs pour enfants",
  banque: "Une banque",
  supermarche: "Un supermarché",
};

// Une demande peut regrouper plusieurs besoins cochés : "hotel,restaurant".
function parseServices(value: unknown): string[] {
  const list = Array.isArray(value) ? value : String(value ?? "").split(",");
  const out: string[] = [];
  for (const v of list) {
    const id = clean(v, 20);
    if (SERVICES[id] && !out.includes(id)) out.push(id);
  }
  return out;
}
function labelOf(service: string): string {
  return service.split(",").map((s) => SERVICES[s] || s).join(" + ");
}
function villeOk(v: string): string {
  return VILLES.includes(v) || v === AUTRES ? v : "";
}
function villeMatch(villeLieu: string, demande: string): boolean {
  if (!demande) return true;
  if (demande === AUTRES) return !VILLES.includes(villeLieu);
  return villeLieu === demande;
}

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
  numero_paiement: string;
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
    serviceLabel: labelOf(r.service),
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


// ---------- Validation d'un dépôt (Oui / SMS reconnu) ----------
// deno-lint-ignore no-explicit-any
async function validerDepot(sql: any, kind: string, id: number, methode: string, reference = ""): Promise<{ ok: boolean; statut: string }> {
  if (kind === "abo") {
    const r = (await sql`
      UPDATE starvibe_subscriptions
      SET montant_recu = montant_attendu, methode = ${methode}, reference_transaction = ${reference},
          statut = 'actif', started_at = now(), expires_at = now() + interval '30 days', updated_at = now()
      WHERE id = ${id} AND statut = 'en_attente_paiement' RETURNING id
    `) as { id: number }[];
    return { ok: r.length > 0, statut: r.length ? "actif" : "deja_traite" };
  }
  const rows = (await sql`SELECT * FROM starvibe_keydou_requests WHERE id = ${id} LIMIT 1`) as Row[];
  if (!rows[0] || rows[0].statut !== "en_attente_paiement") return { ok: false, statut: rows[0]?.statut || "introuvable" };
  await appliquerPaiement(sql, rows[0], rows[0].montant_attendu, reference || methode);
  await logEvent(sql, rows[0].account_id, "paiement_valide", `${rows[0].montant_attendu} FCFA (${methode})`, rows[0].service, rows[0].ville, rows[0].id);
  return { ok: true, statut: "paye" };
}

// deno-lint-ignore no-explicit-any
async function refuserDepot(sql: any, kind: string, id: number): Promise<{ ok: boolean }> {
  if (kind === "abo") {
    const r = (await sql`UPDATE starvibe_subscriptions SET statut = 'paiement_invalide', updated_at = now() WHERE id = ${id} AND statut = 'en_attente_paiement' RETURNING id`) as unknown[];
    return { ok: r.length > 0 };
  }
  const rows = (await sql`
    UPDATE starvibe_keydou_requests SET statut = 'paiement_refuse', updated_at = now()
    WHERE id = ${id} AND statut = 'en_attente_paiement' RETURNING account_id, service, ville, id
  `) as { account_id: number; service: string; ville: string; id: number }[];
  if (rows[0]) await logEvent(sql, rows[0].account_id, "paiement_refuse", "Dépôt non trouvé par le staff", rows[0].service, rows[0].ville, rows[0].id);
  return { ok: rows.length > 0 };
}

const KIND_LABEL: Record<string, string> = { keydou: "Keydou", abo: "Abonnement KOMYO" };

// Notification "Valider le dépôt ?" avec boutons Oui / Non sur le téléphone du staff.
// deno-lint-ignore no-explicit-any
async function demanderValidation(sql: any, kind: string, id: number, titre: string, corps: string) {
  const d = decisionToken(kind, id);
  const base = `/starvibe/keydou-valider.html?k=${kind}&r=${id}&exp=${d.exp}&t=${d.t}`;
  try {
    await pushAll(sql, {
      title: titre, body: corps, tag: `${kind}-${id}`, url: base,
      actions: [{ action: "oui", title: "✅ Reçu, valider" }, { action: "non", title: "❌ Pas reçu" }],
      decide: { kind, id, exp: d.exp, t: d.t },
    });
  } catch { /* la notification ne doit jamais bloquer le client */ }
}

// Lit le corps d'un webhook SMS, quelle que soit l'application de transfert (JSON, formulaire ou texte brut).
async function lireSms(req: Request): Promise<{ message: string; from: string }> {
  const pick = (o: Record<string, unknown>, keys: string[]) => { for (const k of keys) if (o[k] != null && String(o[k]).trim()) return String(o[k]); return ""; };
  const raw = await req.text();
  let obj: Record<string, unknown> = {};
  try { obj = JSON.parse(raw); } catch {
    try { obj = Object.fromEntries(new URLSearchParams(raw)); } catch { obj = {}; }
  }
  const message = pick(obj, ["message", "content", "text", "body", "msg", "sms"]) || (Object.keys(obj).length ? "" : raw);
  return { message, from: pick(obj, ["from", "sender", "number", "address", "phone"]) };
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

  // --- Clé publique pour activer les notifications (page staff) ---
  if (req.method === "GET" && url.searchParams.get("pushkey") === "1") {
    return json({ publicKey: vapidKeys().publicKey });
  }

  // --- Détail d'une demande à valider (page ouverte depuis la notification) ---
  if (req.method === "GET" && url.searchParams.get("decide_info") === "1") {
    const kind = clean(url.searchParams.get("k"), 10), id = Number(url.searchParams.get("r"));
    if (!["keydou", "abo"].includes(kind) || !id || !checkDecisionToken(kind, id, Number(url.searchParams.get("exp")), url.searchParams.get("t") || "")) {
      return json({ error: "Lien expiré ou invalide" }, 403);
    }
    if (kind === "abo") {
      const r = (await sql`
        SELECT s.id, s.plan, s.montant_attendu, s.statut, a.telephone, p.nom
        FROM starvibe_subscriptions s JOIN starvibe_accounts a ON a.id = s.account_id
        LEFT JOIN starvibe_profiles p ON p.account_id = a.id AND p.type_profil = 'personnel' WHERE s.id = ${id}
      `) as { id: number; plan: string; montant_attendu: number; statut: string; telephone: string; nom: string | null }[];
      if (!r[0]) return json({ error: "Introuvable" }, 404);
      return json({ kind, id, objet: `Abonnement ${r[0].plan}`, montant: r[0].montant_attendu, statut: r[0].statut, nom: r[0].nom || "", telephone: r[0].telephone, ville: "", reference: `KOMYO-${id}` });
    }
    const r = (await sql`
      SELECT k.*, a.telephone, p.nom AS auteur_nom FROM starvibe_keydou_requests k JOIN starvibe_accounts a ON a.id = k.account_id
      LEFT JOIN starvibe_profiles p ON p.account_id = a.id AND p.type_profil = 'personnel' WHERE k.id = ${id}
    `) as Row[];
    if (!r[0]) return json({ error: "Introuvable" }, 404);
    return json({ kind, id, objet: labelOf(r[0].service), montant: r[0].montant_attendu, statut: r[0].statut, nom: r[0].auteur_nom || "", telephone: r[0].numero_paiement || r[0].telephone, ville: r[0].ville, reference: `KDU-${id}` });
  }

  // --- Webhook SMS : l'application de transfert de SMS du téléphone de réception envoie ici
  //     chaque SMS reçu. Si le dépôt correspond à UNE demande en attente (montant exact + numéro
  //     de l'expéditeur ou référence), il est validé tout seul et Keydou répond au client. ---
  if (req.method === "POST" && url.searchParams.get("sms") === "1") {
    const given = req.headers.get("x-webhook-secret") || url.searchParams.get("s") || "";
    if (!checkSmsSecret(given)) return json({ error: "Code invalide" }, 401);
    const { message, from } = await lireSms(req);
    const p = parseSms(message);
    const auto = ((await sql`SELECT value FROM starvibe_settings WHERE key = 'sms_auto'`) as { value: string }[])[0]?.value !== "off";
    const repliMontant = ((await sql`SELECT value FROM starvibe_settings WHERE key = 'sms_montant_seul'`) as { value: string }[])[0]?.value !== "off";
    let resultat = "ignore";
    let valeur: { kind: string; id: number } | null = null;

    if (p.depot && p.montant) {
      const kd = (await sql`
        SELECT k.id, k.numero_paiement, a.telephone,
               (k.paiement_declare_at IS NOT NULL AND k.paiement_declare_at > now() - interval '20 minutes') AS recent
        FROM starvibe_keydou_requests k JOIN starvibe_accounts a ON a.id = k.account_id
        WHERE k.statut = 'en_attente_paiement' AND k.montant_attendu = ${p.montant} AND k.created_at > now() - interval '48 hours'
      `) as { id: number; numero_paiement: string; telephone: string; recent: boolean }[];
      const ab = (await sql`
        SELECT s.id, a.telephone FROM starvibe_subscriptions s JOIN starvibe_accounts a ON a.id = s.account_id
        WHERE s.statut = 'en_attente_paiement' AND s.montant_attendu = ${p.montant} AND s.created_at > now() - interval '48 hours'
      `) as { id: number; telephone: string }[];
      const cands = [
        ...kd.map((r) => ({ kind: "keydou", id: r.id, byRef: p.reference === r.id, byPhone: !!p.numero && (last9(r.numero_paiement) === last9(p.numero) || last9(r.telephone) === last9(p.numero)) })),
        ...ab.map((r) => ({ kind: "abo", id: r.id, byRef: false, byPhone: !!p.numero && last9(r.telephone) === last9(p.numero) })),
      ];
      const sure = cands.filter((c) => c.byRef || c.byPhone);
      const byRef = sure.filter((c) => c.byRef);
      let unique = byRef.length === 1 ? byRef : (sure.length === 1 ? sure : []);
      // Repli : le client a payé depuis un autre numéro. Si UNE SEULE demande de ce montant attend
      // (et que le client a touché "J'ai payé" il y a moins de 20 min), le dépôt lui revient.
      let repli = false;
      if (!unique.length && !sure.length && repliMontant) {
        const recents = kd.filter((r) => r.recent);
        if (recents.length === 1 && cands.length === 1) { unique = [{ kind: "keydou", id: recents[0].id, byRef: false, byPhone: false }]; repli = true; }
      }
      if (unique.length === 1) {
        valeur = { kind: unique[0].kind, id: unique[0].id };
        if (auto) {
          const v = await validerDepot(sql, valeur.kind, valeur.id, repli ? "mobile_money_sms_montant" : "mobile_money_sms", `SMS ${p.numero}`);
          resultat = v.ok ? (repli ? "valide_auto_montant" : "valide_auto") : "deja_traite";
          if (v.ok) {
            try { await pushAll(sql, { title: "✅ Dépôt reconnu et validé", body: `${p.montant} FCFA de ${p.numero || "?"} — ${KIND_LABEL[valeur.kind]} n°${valeur.id}${repli ? " (numéro différent de celui du compte, seule demande en attente)" : ""}. Keydou répond au client.`, tag: `${valeur.kind}-${valeur.id}`, url: "/starvibe/keydou-admin.html" }); } catch { /* ignore */ }
          }
        } else {
          resultat = "a_confirmer";
          await demanderValidation(sql, valeur.kind, valeur.id, `Dépôt de ${p.montant} FCFA reçu`, `De ${p.numero || "?"} — ${KIND_LABEL[valeur.kind]} n°${valeur.id}. Valider ?`);
        }
      } else {
        resultat = sure.length > 1 ? "plusieurs_correspondances" : (cands.length ? "numero_different" : "non_rapproche");
        try { await pushAll(sql, { title: `Dépôt de ${p.montant} FCFA non rapproché`, body: `De ${p.numero || "numéro inconnu"}. ${cands.length ? cands.length + " demande(s) du même montant en attente : choisissez." : "Aucune demande en attente de ce montant."}`, tag: "sms-non-rapproche", url: "/starvibe/paiements.html" }); } catch { /* ignore */ }
      }
    }
    await sql`INSERT INTO starvibe_sms_log (expediteur, message, montant, numero, resultat) VALUES (${from.slice(0, 40)}, ${message.slice(0, 600)}, ${p.montant}, ${p.numero}, ${resultat})`;
    return json({ ok: true, resultat });
  }

  // --- Staff : réglages du téléphone (notifications + SMS) ---
  if (req.method === "GET" && url.searchParams.get("sms_info") === "1") {
    const staff = await requireAuth(req);
    if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);
    const auto = ((await sql`SELECT value FROM starvibe_settings WHERE key = 'sms_auto'`) as { value: string }[])[0]?.value !== "off";
    const subs = (await sql`SELECT COUNT(*) AS n FROM starvibe_push_subs`) as { n: string }[];
    const log = (await sql`SELECT id, expediteur, message, montant, numero, resultat, created_at FROM starvibe_sms_log ORDER BY id DESC LIMIT 20`) as unknown[];
    const repli = ((await sql`SELECT value FROM starvibe_settings WHERE key = 'sms_montant_seul'`) as { value: string }[])[0]?.value !== "off";
    return json({ secret: smsSecret(), auto, repli, telephonesNotifies: Number(subs[0]?.n || 0), journal: log });
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
        texte: r.texte, service: r.service, serviceLabel: labelOf(r.service),
        ville: r.ville, reference: r.request_id ? `KDU-${r.request_id}` : "",
      })),
    });
  }

  // --- Staff : annuaire complet ---
  if (req.method === "GET" && url.searchParams.get("lieux_admin") === "1") {
    const staff = await requireAuth(req);
    if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);
    const rows = (await sql`SELECT * FROM starvibe_keydou_lieux ORDER BY service, ville, nom`) as LieuRow[];
    const autres = [...new Set(rows.map((l) => l.ville))].filter((v) => !VILLES.includes(v)).sort();
    return json({ lieux: rows.map((l) => lieuApi(l, true)), services: SERVICES, villes: [...VILLES, ...autres] });
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

    // --- Décision "Oui / Non" depuis la notification ou la page de validation (lien signé, 24 h) ---
    if (action === "decider") {
      const kind = clean(body.k, 10), id = Number(body.r), d = clean(body.d, 5);
      if (!["keydou", "abo"].includes(kind) || !id || !["oui", "non"].includes(d) || !checkDecisionToken(kind, id, Number(body.exp), clean(body.t, 80))) {
        return json({ error: "Lien expiré ou invalide" }, 403);
      }
      if (d === "oui") {
        const v = await validerDepot(sql, kind, id, "mobile_money_valide_staff");
        return json({ ok: v.ok, statut: v.statut });
      }
      const v = await refuserDepot(sql, kind, id);
      return json({ ok: v.ok, statut: v.ok ? "refuse" : "deja_traite" });
    }

    // --- Staff : activer les notifications sur ce téléphone, test, mode automatique ---
    if (action === "push_subscribe" || action === "push_test" || action === "sms_auto" || action === "sms_repli") {
      const staff = await requireAuth(req);
      if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);
      if (action === "sms_auto") {
        await sql`INSERT INTO starvibe_settings (key, value) VALUES ('sms_auto', ${body.on ? "on" : "off"}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
        return json({ ok: true });
      }
      if (action === "sms_repli") {
        await sql`INSERT INTO starvibe_settings (key, value) VALUES ('sms_montant_seul', ${body.on ? "on" : "off"}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
        return json({ ok: true });
      }
      if (action === "push_test") {
        const n = await pushAll(sql, { title: "Keydou — test", body: "Les notifications fonctionnent sur ce téléphone.", tag: "keydou-test", url: "/starvibe/keydou-admin.html" });
        return json({ ok: true, envoyes: n });
      }
      const sub = (body.subscription || {}) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return json({ error: "Abonnement invalide" }, 400);
      await sql`
        INSERT INTO starvibe_push_subs (endpoint, p256dh, auth, label)
        VALUES (${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth}, ${clean(body.label, 60)})
        ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, label = EXCLUDED.label
      `;
      return json({ ok: true });
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
      const services = parseServices(body.services ?? body.service);
      if (!services.length) return json({ error: "Cochez au moins un besoin" }, 400);
      if (services.length > MAX_SERVICES) return json({ error: `Un paiement de 1 000 FCFA couvre jusqu'à ${MAX_SERVICES} besoins à la fois.` }, 400);
      const ville = villeOk(clean(body.ville, 40));
      if (!ville) return json({ error: "Choisissez une ville" }, 400);
      const nom = clean(body.nom, 80);
      const contact = clean(body.contact, 30);
      if (nom.length < 3 || contact.replace(/\D/g, "").length < 8) return json({ error: "Indiquez votre nom et prénom et votre numéro de téléphone" }, 400);
      const pending = (await sql`
        SELECT COUNT(*) AS n FROM starvibe_keydou_requests WHERE account_id = ${accountId} AND statut = 'en_attente_paiement'
      `) as { n: string }[];
      if (Number(pending[0]?.n) >= MAX_ATTENTE) {
        return json({ error: "Trop de demandes en attente de paiement. Règle ou attends la confirmation des précédentes." }, 429);
      }
      const details = JSON.stringify({ nom, contact, ville });
      const rows = (await sql`
        INSERT INTO starvibe_keydou_requests (account_id, service, ville, demande_vocale, montant_attendu, details)
        VALUES (${accountId}, ${services.join(",")}, ${ville}, ${clean(body.demandeVocale, 300)}, ${MONTANT}, ${details}::jsonb)
        RETURNING *
      `) as Row[];
      await logEvent(sql, accountId, "demande", `${nom} · ${contact}`, services.join(","), ville, rows[0].id);
      return json({ demande: toApi(rows[0]) }, 201);
    }

    // Contacts spontanés (ouverture, paroles, choix) : enregistrés pour le suivi en direct.
    if (action === "evenement") {
      const type = clean(body.type, 30);
      if (!["ouverture", "parole", "choix_service", "choix_ville", "appel_lieu"].includes(type)) return json({ error: "Type inconnu" }, 400);
      const svc = parseServices(body.service).join(",");
      const vil = villeOk(clean(body.ville, 40));
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
      const numero = clean(body.numeroPaiement, 20);
      await sql`
        UPDATE starvibe_keydou_requests
        SET paiement_declare_at = now(), reference_transaction = ${clean(body.reference, 200)}, numero_paiement = ${numero}, updated_at = now()
        WHERE id = ${requestId} AND statut = 'en_attente_paiement'
      `;
      await logEvent(sql, accountId, "paiement_declare", clean(body.reference, 200), own[0].service, own[0].ville, requestId);
      if (own[0].statut === "en_attente_paiement") {
        const who = (await sql`SELECT a.telephone, p.nom FROM starvibe_accounts a LEFT JOIN starvibe_profiles p ON p.account_id = a.id AND p.type_profil = 'personnel' WHERE a.id = ${accountId}`) as { telephone: string; nom: string | null }[];
        await demanderValidation(sql, "keydou", requestId, `Valider le dépôt de ${own[0].montant_attendu} FCFA ?`,
          `${who[0]?.nom || "Un client"} (${numero || who[0]?.telephone}) dit avoir payé pour « ${labelOf(own[0].service)} » — réf. KDU-${requestId}. Vérifie ton MTN Money.`);
      }
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
    const groupes: { service: string; label: string; lieux: ReturnType<typeof lieuApi>[] }[] = [];
    for (const svc of parseServices(own[0].service)) {
      const rows = (await sql`
        SELECT * FROM starvibe_keydou_lieux WHERE actif = true AND service = ${svc}
        ORDER BY ville, verifie DESC, (telephone <> '') DESC, nom
      `) as LieuRow[];
      groupes.push({ service: svc, label: SERVICES[svc], lieux: rows.filter((l) => villeMatch(l.ville, own[0].ville)).map((l) => lieuApi(l)) });
    }
    const dt = (own[0].details || {}) as Record<string, string>;
    return json({ groupes, ville: own[0].ville, nom: dt.nom || "" });
  }

  // --- SOS : numéros d'urgence et péages RN1, GRATUITS (sécurité), sans connexion ---
  if (url.searchParams.get("sos") === "1") return json(urgences);

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
