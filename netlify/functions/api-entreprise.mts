// Keydou pour les entreprises : espace du gérant, équipe, savoir de l'entreprise, confidentialité, facture ; administration STAR ENTREPRISE.
// Membre KOMYO (jeton) :
//   GET                       → mon entreprise (gérant : tout ; employé : l'essentiel) ou, sans entreprise, l'invitation éventuelle et les forfaits.
//   GET ?moi=1                → mon appartenance et mon invitation (pour l'application Keydou).
//   GET ?conversations=1[&visiteur=…] → conversations des clients (gérant) ; GET ?facture=1 ; GET ?export=1
//   POST { action }           → creer | maj | savoir_ajouter | savoir_modifier | savoir_supprimer | membre_inviter | membre_retirer | equipe_accepter | equipe_refuser | equipe_quitter
//                               | tester | tester_effacer | effacer_conversations | support_acces | wa_demander | regenerer_cle | supprimer_entreprise
// Équipe STAR ENTREPRISE (jeton staff) : GET ?admin=1 ; POST { action: admin_activer | admin_whatsapp | admin_fermer | admin_urgence }
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";
import { last9 } from "./_push.mts";
import { recuAbonnement } from "./_recu.mts";
import {
  FORFAITS, forfaitActif, entrepriseDuGerant, entrepriseParId, fichesDe, tailleSavoir, nettoyer, nouvelleCle, listeDomaines, repondreClient, statsEntreprise, poolEquipe,
  chiffrer, ESSAI_TEST, SAVOIR_ESSAI_MAX, LIMITE_SAVOIR_EQUIPE, RETENTIONS, TYPES_SAVOIR, TAUX_FCFA, accueilComplet, arretUrgence, type Entreprise, type Forfait,
} from "./_entreprise.mts";

const ORG_MEMBRE = "star_vibe";
const ORG_STAFF = "star_entreprise";
const NUMERO_CONTACT = "+242 06 656 50 50";

// deno-lint-ignore no-explicit-any
type Sql = any;
const nomDe = (sql: Sql, id: number) => sql`SELECT COALESCE((SELECT nom FROM starvibe_profiles WHERE account_id = ${id} ORDER BY (type_profil = 'personnel') DESC, id LIMIT 1), '') AS nom`;
const forfaitApi = (f: Forfait) => ({ id: f.id, type: f.type, label: f.label, usd: f.usd, fcfa: f.fcfa, postes: f.postes, messages: f.messages, canaux: f.canaux, resume: f.resume, poolParPoste: f.poolParPoste, savoirMax: f.savoirMax });
const masqueTel = (t: string) => { const d = String(t || "").replace(/\D/g, ""); return d.length >= 4 ? `•••• ${d.slice(-4)}` : "••••"; };

async function etatGerant(sql: Sql, e: Entreprise, origine: string) {
  const [eq, as] = await Promise.all([forfaitActif(sql, e.gerant_id, "equipe"), forfaitActif(sql, e.gerant_id, "assistant")]);
  const fiches = await fichesDe(sql, e.id);
  const membres = (await sql`
    SELECT m.account_id, m.role, m.statut, m.created_at, a.telephone,
           (SELECT nom FROM starvibe_profiles WHERE account_id = m.account_id ORDER BY (type_profil = 'personnel') DESC, id LIMIT 1) AS nom,
           (SELECT COUNT(*) FROM starvibe_compagnon_messages cm WHERE cm.account_id = m.account_id AND cm.role = 'user' AND cm.created_at > now() - interval '30 days') AS messages30
    FROM starvibe_entreprise_membres m JOIN starvibe_accounts a ON a.id = m.account_id
    WHERE m.entreprise_id = ${e.id} ORDER BY (m.role = 'gerant') DESC, m.created_at
  `) as { account_id: number; role: string; statut: string; created_at: string; telephone: string; nom: string | null; messages30: string }[];
  const pool = eq ? await poolEquipe(sql, e.id, eq.forfait) : null;
  const sans = (await sql`
    SELECT (SELECT u.texte FROM starvibe_entreprise_conv u WHERE u.entreprise_id = a.entreprise_id AND u.visiteur = a.visiteur AND u.role = 'user' AND u.id < a.id ORDER BY u.id DESC LIMIT 1) AS question, a.created_at
    FROM starvibe_entreprise_conv a WHERE a.entreprise_id = ${e.id} AND a.role = 'assistant' AND a.escalade = true AND a.canal <> 'test' AND a.created_at > now() - interval '30 days' ORDER BY a.id DESC LIMIT 15
  `) as { question: string | null; created_at: string }[];
  const maxSavoir = Math.max(as ? as.forfait.savoirMax : 0, eq ? LIMITE_SAVOIR_EQUIPE : 0, SAVOIR_ESSAI_MAX);
  return {
    role: "gerant",
    entreprise: {
      id: e.id, nom: e.nom, secteur: e.secteur, nomAssistant: e.nom_assistant, accueil: e.accueil, ton: e.ton, consignes: e.consignes, contact: e.contact, domaines: listeDomaines(e.domaines).join(" "),
      couleur: e.couleur, retentionJours: e.retention_jours, savoirEquipe: e.savoir_equipe, cle: e.cle_publique, ferme: e.ferme, supportJusqu: e.support_jusqu, essaiRestant: Math.max(0, ESSAI_TEST - e.essai_utilise),
    },
    accueilApercu: accueilComplet(e),
    forfaits: {
      equipe: eq ? { ...forfaitApi(eq.forfait), fin: eq.fin, pool } : null,
      assistant: as ? { ...forfaitApi(as.forfait), fin: as.fin } : null,
    },
    equipe: membres.map((m) => ({ accountId: m.account_id, nom: m.nom || "", telephone: masqueTel(m.telephone), role: m.role, statut: m.statut, messages30: Number(m.messages30 || 0), depuis: m.created_at })),
    places: eq ? { total: eq.forfait.postes, prises: membres.filter((m) => m.statut === "actif" || m.statut === "invite").length } : null,
    savoir: { fiches, taille: tailleSavoir(fiches), max: maxSavoir, types: TYPES_SAVOIR },
    stats: await statsEntreprise(sql, e.id),
    questionsSansReponse: sans.filter((s) => s.question).map((s) => ({ question: s.question, quand: s.created_at })),
    canaux: {
      site: { actif: !!as && as.forfait.canaux.includes("site") && listeDomaines(e.domaines).length > 0, domainesOk: listeDomaines(e.domaines).length > 0, code: `<script src="${origine}/starvibe/assets/keydou-widget.js" data-cle="${e.cle_publique}" defer></script>` },
      whatsapp: { statut: e.wa_actif ? "connecte" : e.wa_demande ? "demande" : "non_connecte", compris: !!as && as.forfait.canaux.includes("whatsapp") },
    },
    forfaitsDisponibles: Object.values(FORFAITS).map(forfaitApi),
    taux: TAUX_FCFA, contact: NUMERO_CONTACT,
  };
}

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();
  const url = new URL(req.url);
  const session = await requireAuth(req);
  if (!session) return json({ error: "Non authentifié" }, 401);
  const origine = url.origin;

  // ================= ÉQUIPE STAR ENTREPRISE =================
  if (session.org === ORG_STAFF) {
    if (req.method === "GET") {
      if (url.searchParams.get("admin") !== "1") return json({ error: "Action inconnue" }, 400);
      // Contenu des conversations : seulement si le gérant a ouvert l'accès support (7 jours au plus). Sinon l'équipe ne voit que des chiffres.
      if (url.searchParams.get("contenu") === "1") {
        const cible = await entrepriseParId(sql, Number(url.searchParams.get("entreprise_id")));
        if (!cible) return json({ error: "Entreprise introuvable" }, 404);
        if (!cible.support_jusqu || new Date(cible.support_jusqu).getTime() < Date.now()) return json({ error: "Le gérant n'a pas ouvert l'accès support : le contenu des conversations est confidentiel.", code: "acces_ferme" }, 403);
        const m = (await sql`SELECT canal, role, texte, escalade, created_at FROM starvibe_entreprise_conv WHERE entreprise_id = ${cible.id} ORDER BY id DESC LIMIT 100`) as Record<string, unknown>[];
        return json({ messages: m });
      }
      const liste = (await sql`
        SELECT e.*, a.telephone AS tel_gerant FROM starvibe_entreprises e JOIN starvibe_accounts a ON a.id = e.gerant_id ORDER BY e.created_at DESC LIMIT 200
      `) as (Entreprise & { tel_gerant: string })[];
      const out = [];
      for (const e of liste) {
        const [eq, as, st] = [await forfaitActif(sql, e.gerant_id, "equipe"), await forfaitActif(sql, e.gerant_id, "assistant"), await statsEntreprise(sql, e.id)];
        const nb = Number(((await sql`SELECT COUNT(*) AS n FROM starvibe_entreprise_membres WHERE entreprise_id = ${e.id} AND statut = 'actif'`) as { n: string }[])[0]?.n || 0);
        out.push({ id: e.id, nom: e.nom, secteur: e.secteur, telGerant: e.tel_gerant, equipe: eq ? { label: eq.forfait.label, fin: eq.fin } : null, assistant: as ? { label: as.forfait.label, fin: as.fin } : null, membresActifs: nb, ...st, whatsapp: e.wa_actif ? "connecte" : e.wa_demande ? "demande" : "non_connecte", waPhoneId: e.wa_phone_id, ferme: e.ferme, supportOuvert: !!e.support_jusqu && new Date(e.support_jusqu).getTime() > Date.now(), creeLe: e.created_at });
      }
      return json({ entreprises: out, urgence: await arretUrgence(sql), forfaits: Object.values(FORFAITS).map(forfaitApi) });
    }
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(b.action || "");
    if (action === "admin_urgence") {
      await sql`INSERT INTO starvibe_settings (key, value) VALUES ('entreprise_ferme_urgence', ${b.on ? "on" : "off"}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
      return json({ ok: true, urgence: !!b.on });
    }
    const e = await entrepriseParId(sql, Number(b.entreprise_id));
    if (!e) return json({ error: "Entreprise introuvable" }, 404);
    if (action === "admin_activer") {
      // Montants élevés (virement, espèces) : l'équipe active le forfait à la main après réception de l'argent ; la facture et le reçu sont émis comme pour un dépôt Mobile Money.
      const f = FORFAITS[String(b.plan || "")];
      if (!f) return json({ error: "Forfait inconnu" }, 400);
      const mois = Math.min(12, Math.max(1, Math.round(Number(b.mois)) || 1));
      const montant = f.fcfa * mois;
      const ref = nettoyer(b.reference, 80);
      const r = (await sql`
        INSERT INTO starvibe_subscriptions (account_id, plan, montant_attendu, montant_recu, statut, methode, reference_transaction, started_at, expires_at, mois)
        VALUES (${e.gerant_id}, ${f.id}, ${montant}, ${montant}, 'actif', 'virement', ${ref || "activation manuelle"}, now(),
          GREATEST(now(), COALESCE((SELECT MAX(o.expires_at) FROM starvibe_subscriptions o WHERE o.account_id = ${e.gerant_id} AND o.plan = ${f.id} AND o.statut = 'actif' AND o.expires_at > now()), now())) + make_interval(days => ${30 * mois}), ${mois})
        RETURNING id
      `) as { id: number }[];
      await recuAbonnement(sql, r[0].id);
      return json({ ok: true, abonnementId: r[0].id, montant });
    }
    if (action === "admin_whatsapp") {
      const phone = nettoyer(b.phone_id, 40).replace(/\D/g, "");
      const token = nettoyer(b.token, 600);
      if (b.actif === false) { await sql`UPDATE starvibe_entreprises SET wa_actif = false WHERE id = ${e.id}`; return json({ ok: true, actif: false }); }
      if (phone.length < 8) return json({ error: "Identifiant du numéro WhatsApp (phone_number_id) invalide" }, 400);
      const dejaPris = (await sql`SELECT 1 FROM starvibe_entreprises WHERE wa_phone_id = ${phone} AND id <> ${e.id} AND wa_actif = true`) as unknown[];
      if (dejaPris.length) return json({ error: "Ce numéro WhatsApp est déjà utilisé par une autre entreprise" }, 409);
      if (!token && !e.wa_token_chiffre) return json({ error: "Jeton d'accès WhatsApp manquant" }, 400);
      await sql`UPDATE starvibe_entreprises SET wa_phone_id = ${phone}, wa_token_chiffre = ${token ? chiffrer(token) : e.wa_token_chiffre}, wa_actif = true, wa_demande = false WHERE id = ${e.id}`;
      return json({ ok: true, actif: true });
    }
    if (action === "admin_fermer") { await sql`UPDATE starvibe_entreprises SET ferme = ${!!b.ferme} WHERE id = ${e.id}`; return json({ ok: true, ferme: !!b.ferme }); }
    return json({ error: "Action inconnue" }, 400);
  }

  // ================= MEMBRE / GÉRANT =================
  if (session.org !== ORG_MEMBRE) return json({ error: "Réservé aux membres KOMYO" }, 403);
  const accountId = Number(session.sub);
  if (!accountId) return json({ error: "Compte invalide" }, 401);
  const miens = await entrepriseDuGerant(sql, accountId);

  const adhesion = async () => (await sql`
    SELECT m.entreprise_id, m.role, m.statut, e.nom, e.gerant_id FROM starvibe_entreprise_membres m JOIN starvibe_entreprises e ON e.id = m.entreprise_id AND e.ferme = false
    WHERE m.account_id = ${accountId} ORDER BY (m.statut = 'actif') DESC, m.created_at DESC LIMIT 1
  `) as { entreprise_id: number; role: string; statut: string; nom: string; gerant_id: number }[];

  if (req.method === "GET") {
    if (url.searchParams.get("moi") === "1") {
      const a = (await adhesion())[0];
      if (!a) return json({ entreprise: null });
      const eq = await forfaitActif(sql, a.gerant_id, "equipe");
      const g = (await nomDe(sql, a.gerant_id)) as { nom: string }[];
      return json({ entreprise: { id: a.entreprise_id, nom: a.nom, role: a.role, statut: a.statut, gerantNom: g[0]?.nom || "", forfaitActif: !!eq, fin: eq?.fin || null } });
    }
    if (!miens) {
      const a = (await adhesion())[0];
      return json({ role: a ? "membre" : "aucun", entreprise: a ? { id: a.entreprise_id, nom: a.nom, statut: a.statut } : null, forfaitsDisponibles: Object.values(FORFAITS).map(forfaitApi), taux: TAUX_FCFA, contact: NUMERO_CONTACT, essai: ESSAI_TEST });
    }
    if (url.searchParams.get("facture") === "1") {
      const lignes = (await sql`SELECT id, plan, mois, montant_recu, methode, reference_transaction, started_at, expires_at FROM starvibe_subscriptions WHERE account_id = ${accountId} AND plan LIKE 'entreprise_%' AND statut = 'actif' AND montant_attendu > 0 ORDER BY started_at DESC LIMIT 60`) as { id: number; plan: string; mois: number; montant_recu: number; methode: string; reference_transaction: string; started_at: string; expires_at: string }[];
      return json({
        emetteur: { nom: "STAR ENTREPRISE", ville: "Brazzaville, Congo", telephone: NUMERO_CONTACT, email: "contact@starentreprise.com", mentions: "Mentions légales (RCCM, NIU) à compléter par STAR ENTREPRISE avant émission officielle." },
        client: { nom: miens.nom, secteur: miens.secteur },
        lignes: lignes.map((l) => ({ numero: `FAC-${miens.id}-${l.id}`, forfait: FORFAITS[l.plan]?.label || l.plan, mois: l.mois, montant: l.montant_recu, methode: l.methode, reference: l.reference_transaction, du: l.started_at, au: l.expires_at })),
        total: lignes.reduce((n, l) => n + Number(l.montant_recu || 0), 0),
      });
    }
    if (url.searchParams.get("conversations") === "1") {
      const v = nettoyer(url.searchParams.get("visiteur"), 40);
      if (v) {
        const m = (await sql`SELECT role, texte, canal, escalade, refuse, created_at FROM starvibe_entreprise_conv WHERE entreprise_id = ${miens.id} AND visiteur = ${v} ORDER BY id LIMIT 200`) as Record<string, unknown>[];
        return json({ messages: m });
      }
      const l = (await sql`
        SELECT visiteur, MAX(canal) AS canal, COUNT(*) FILTER (WHERE role = 'user') AS nb, BOOL_OR(escalade) AS humain, BOOL_OR(refuse) AS refus, MAX(created_at) AS dernier,
               (ARRAY_AGG(texte ORDER BY id) FILTER (WHERE role = 'user'))[1] AS debut
        FROM starvibe_entreprise_conv WHERE entreprise_id = ${miens.id} AND canal <> 'test' GROUP BY visiteur ORDER BY MAX(created_at) DESC LIMIT 60
      `) as Record<string, unknown>[];
      return json({ conversations: l });
    }
    if (url.searchParams.get("export") === "1") {
      const [fiches, membres, conv] = await Promise.all([fichesDe(sql, miens.id),
        sql`SELECT account_id, role, statut, created_at FROM starvibe_entreprise_membres WHERE entreprise_id = ${miens.id}`,
        sql`SELECT canal, visiteur, role, texte, escalade, created_at FROM starvibe_entreprise_conv WHERE entreprise_id = ${miens.id} ORDER BY id`]);
      return new Response(JSON.stringify({ entreprise: { nom: miens.nom, secteur: miens.secteur, contact: miens.contact, consignes: miens.consignes, domaines: miens.domaines }, savoir: fiches, equipe: membres, conversations: conv, exporteLe: new Date().toISOString() }, null, 2), { headers: { "content-type": "application/json", "content-disposition": "attachment; filename=keydou-entreprise-export.json" } });
    }
    return json(await etatGerant(sql, miens, origine));
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(b.action || "");

  // ----- Employé : répondre à une invitation, quitter -----
  if (action === "equipe_accepter" || action === "equipe_refuser" || action === "equipe_quitter") {
    const a = (await sql`SELECT m.entreprise_id, m.statut, m.role, e.gerant_id FROM starvibe_entreprise_membres m JOIN starvibe_entreprises e ON e.id = m.entreprise_id WHERE m.account_id = ${accountId} ORDER BY (m.statut = 'actif') DESC, m.created_at DESC LIMIT 1`) as { entreprise_id: number; statut: string; role: string; gerant_id: number }[];
    if (!a[0]) return json({ error: "Aucune invitation." }, 404);
    if (a[0].role === "gerant" && action !== "equipe_refuser") return json({ error: "Le gérant ne peut pas quitter son entreprise : il peut la supprimer." }, 409);
    if (action === "equipe_accepter") {
      if (a[0].statut === "actif") return json({ ok: true });
      const eq = await forfaitActif(sql, a[0].gerant_id, "equipe");
      if (!eq) return json({ error: "L'entreprise n'a pas de forfait Équipe en cours. Demande à ton gérant." }, 409);
      const n = Number(((await sql`SELECT COUNT(*) AS n FROM starvibe_entreprise_membres WHERE entreprise_id = ${a[0].entreprise_id} AND statut = 'actif'`) as { n: string }[])[0]?.n || 0);
      if (n >= eq.forfait.postes) return json({ error: "Toutes les places de l'équipe sont prises." }, 409);
      await sql`UPDATE starvibe_entreprise_membres SET statut = 'actif' WHERE entreprise_id = ${a[0].entreprise_id} AND account_id = ${accountId}`;
      await sql`DELETE FROM starvibe_entreprise_membres WHERE account_id = ${accountId} AND entreprise_id <> ${a[0].entreprise_id} AND role = 'membre'`;
      return json({ ok: true });
    }
    await sql`DELETE FROM starvibe_entreprise_membres WHERE entreprise_id = ${a[0].entreprise_id} AND account_id = ${accountId} AND role = 'membre'`;
    return json({ ok: true });
  }

  // ----- Créer son espace entreprise -----
  if (action === "creer") {
    if (miens) return json({ error: "Tu as déjà un espace entreprise." }, 409);
    const nom = nettoyer(b.nom, 80);
    if (nom.length < 2) return json({ error: "Indique le nom de ton entreprise." }, 400);
    const deja = (await sql`SELECT 1 FROM starvibe_entreprise_membres WHERE account_id = ${accountId} AND statut = 'actif'`) as unknown[];
    if (deja.length) return json({ error: "Tu fais déjà partie d'une équipe : quitte-la d'abord pour créer ta propre entreprise." }, 409);
    const e = (await sql`INSERT INTO starvibe_entreprises (nom, secteur, gerant_id, cle_publique) VALUES (${nom}, ${nettoyer(b.secteur, 60)}, ${accountId}, ${nouvelleCle()}) RETURNING *`) as Entreprise[];
    await sql`DELETE FROM starvibe_entreprise_membres WHERE account_id = ${accountId} AND statut = 'invite'`;
    await sql`INSERT INTO starvibe_entreprise_membres (entreprise_id, account_id, role, statut) VALUES (${e[0].id}, ${accountId}, 'gerant', 'actif')`;
    return json({ ok: true, ...(await etatGerant(sql, e[0], origine)) }, 201);
  }

  if (!miens) return json({ error: "Crée d'abord ton espace entreprise." }, 403);
  const e = miens;

  if (action === "maj") {
    const nom = b.nom === undefined ? e.nom : nettoyer(b.nom, 80);
    if (nom.length < 2) return json({ error: "Le nom est trop court." }, 400);
    const couleur = /^#[0-9a-fA-F]{6}$/.test(String(b.couleur || "")) ? String(b.couleur) : e.couleur;
    const ret = b.retentionJours === undefined ? e.retention_jours : Number(b.retentionJours);
    if (!RETENTIONS.includes(ret)) return json({ error: "Durée de conservation : 30 jours, 90 jours ou 365 jours." }, 400);
    const dom = b.domaines === undefined ? e.domaines : listeDomaines(String(b.domaines)).join(" ");
    await sql`
      UPDATE starvibe_entreprises SET nom = ${nom}, secteur = ${b.secteur === undefined ? e.secteur : nettoyer(b.secteur, 60)}, nom_assistant = ${b.nomAssistant === undefined ? e.nom_assistant : nettoyer(b.nomAssistant, 30)},
        accueil = ${b.accueil === undefined ? e.accueil : nettoyer(b.accueil, 300)}, ton = ${b.ton === undefined ? e.ton : nettoyer(b.ton, 40) || "chaleureux"}, consignes = ${b.consignes === undefined ? e.consignes : nettoyer(b.consignes, 1500)},
        contact = ${b.contact === undefined ? e.contact : nettoyer(b.contact, 200)}, domaines = ${dom}, couleur = ${couleur}, retention_jours = ${ret}, savoir_equipe = ${b.savoirEquipe === undefined ? e.savoir_equipe : !!b.savoirEquipe}
      WHERE id = ${e.id}`;
    return json(await etatGerant(sql, (await entrepriseParId(sql, e.id))!, origine));
  }

  if (action === "savoir_ajouter" || action === "savoir_modifier") {
    const type = Object.prototype.hasOwnProperty.call(TYPES_SAVOIR, String(b.type)) ? String(b.type) : "fiche";
    const titre = nettoyer(b.titre, 120), texte = nettoyer(b.texte, 2000);
    if (texte.length < 2) return json({ error: "Écris le texte de la fiche." }, 400);
    if (type === "qr" && titre.length < 2) return json({ error: "Écris la question." }, 400);
    const fiches = await fichesDe(sql, e.id);
    const [eq, as] = await Promise.all([forfaitActif(sql, e.gerant_id, "equipe"), forfaitActif(sql, e.gerant_id, "assistant")]);
    const max = Math.max(as ? as.forfait.savoirMax : 0, eq ? LIMITE_SAVOIR_EQUIPE : 0, SAVOIR_ESSAI_MAX);
    const id = Number(b.id) || 0;
    const reste = tailleSavoir(fiches.filter((f) => f.id !== id)) + titre.length + texte.length + 8;
    if (reste > max) return json({ error: `La base de connaissances est pleine (${max.toLocaleString("fr-FR")} signes pour ton forfait). Raccourcis des fiches ou passe à un forfait plus grand.`, code: "savoir_plein" }, 409);
    if (action === "savoir_modifier") {
      const r = (await sql`UPDATE starvibe_entreprise_savoir SET type = ${type}, titre = ${titre}, texte = ${texte}, updated_at = now() WHERE id = ${id} AND entreprise_id = ${e.id} RETURNING id`) as unknown[];
      if (!r.length) return json({ error: "Fiche introuvable." }, 404);
    } else {
      if (fiches.length >= 600) return json({ error: "Trop de fiches (600 au maximum)." }, 409);
      await sql`INSERT INTO starvibe_entreprise_savoir (entreprise_id, type, titre, texte) VALUES (${e.id}, ${type}, ${titre}, ${texte})`;
    }
    const f2 = await fichesDe(sql, e.id);
    return json({ ok: true, savoir: { fiches: f2, taille: tailleSavoir(f2), max, types: TYPES_SAVOIR } });
  }
  if (action === "savoir_supprimer") {
    await sql`DELETE FROM starvibe_entreprise_savoir WHERE id = ${Number(b.id) || 0} AND entreprise_id = ${e.id}`;
    const f2 = await fichesDe(sql, e.id);
    return json({ ok: true, savoir: { fiches: f2, taille: tailleSavoir(f2) } });
  }

  if (action === "membre_inviter") {
    const eq = await forfaitActif(sql, e.gerant_id, "equipe");
    if (!eq) return json({ error: "Choisis d'abord un forfait Équipe pour inviter tes employés.", code: "forfait_requis" }, 402);
    const pris = Number(((await sql`SELECT COUNT(*) AS n FROM starvibe_entreprise_membres WHERE entreprise_id = ${e.id}`) as { n: string }[])[0]?.n || 0);
    if (pris >= eq.forfait.postes) return json({ error: `Toutes les places de ton forfait (${eq.forfait.postes}) sont prises. Retire quelqu'un ou passe au forfait supérieur.`, code: "places_pleines" }, 409);
    const jour = Number(((await sql`SELECT COUNT(*) AS n FROM starvibe_entreprise_membres WHERE entreprise_id = ${e.id} AND created_at > now() - interval '24 hours'`) as { n: string }[])[0]?.n || 0);
    if (jour >= 40) return json({ error: "Trop d'invitations aujourd'hui. Réessaie demain." }, 429);
    const tel = last9(String(b.telephone || ""));
    if (tel.length < 8) return json({ error: "Numéro de téléphone invalide." }, 400);
    const c = (await sql`SELECT id FROM starvibe_accounts WHERE RIGHT(regexp_replace(telephone, '[^0-9]', '', 'g'), 9) = ${tel} LIMIT 2`) as { id: number }[];
    if (c.length === 0) return json({ error: "Aucun compte KOMYO avec ce numéro : la personne doit d'abord créer son compte gratuit KOMYO.", code: "compte_inconnu" }, 404);
    if (c.length > 1) return json({ error: "Plusieurs comptes avec ce numéro : précise l'indicatif du pays." }, 409);
    if (c[0].id === accountId) return json({ error: "C'est ton propre numéro : tu es déjà dans l'équipe." }, 409);
    const ailleurs = (await sql`SELECT 1 FROM starvibe_entreprise_membres WHERE account_id = ${c[0].id} AND statut = 'actif' AND entreprise_id <> ${e.id}`) as unknown[];
    if (ailleurs.length) return json({ error: "Cette personne fait déjà partie d'une autre équipe." }, 409);
    await sql`INSERT INTO starvibe_entreprise_membres (entreprise_id, account_id, role, statut) VALUES (${e.id}, ${c[0].id}, 'membre', 'invite') ON CONFLICT (entreprise_id, account_id) DO NOTHING`;
    return json({ ok: true, message: "Invitation envoyée. La personne la verra en ouvrant Keydou Compagnon et doit l'accepter." });
  }
  if (action === "membre_retirer") {
    const id = Number(b.account_id);
    if (id === accountId) return json({ error: "Tu ne peux pas te retirer toi-même." }, 409);
    await sql`DELETE FROM starvibe_entreprise_membres WHERE entreprise_id = ${e.id} AND account_id = ${id} AND role = 'membre'`;
    return json({ ok: true });
  }

  if (action === "tester") {
    const r = await repondreClient(sql, e, { canal: "test", visiteur: `t${accountId}`, texte: String(b.message || "") });
    if (r.status !== 200) return json({ error: r.error, code: r.code }, r.status);
    return json({ reponse: r.reponse, escalade: !!r.escalade, refuse: !!r.refuse, essaiRestant: Math.max(0, ESSAI_TEST - (await entrepriseParId(sql, e.id))!.essai_utilise) });
  }
  if (action === "tester_effacer") { await sql`DELETE FROM starvibe_entreprise_conv WHERE entreprise_id = ${e.id} AND canal = 'test'`; return json({ ok: true }); }
  if (action === "effacer_conversations") { await sql`DELETE FROM starvibe_entreprise_conv WHERE entreprise_id = ${e.id}`; return json({ ok: true }); }
  if (action === "support_acces") {
    const jours = Number(b.jours) === 7 ? 7 : 0;
    await sql`UPDATE starvibe_entreprises SET support_jusqu = ${jours ? new Date(Date.now() + jours * 86400000).toISOString() : null} WHERE id = ${e.id}`;
    return json({ ok: true, jours });
  }
  if (action === "wa_demander") { await sql`UPDATE starvibe_entreprises SET wa_demande = true WHERE id = ${e.id}`; return json({ ok: true }); }
  if (action === "regenerer_cle") { await sql`UPDATE starvibe_entreprises SET cle_publique = ${nouvelleCle()} WHERE id = ${e.id}`; return json(await etatGerant(sql, (await entrepriseParId(sql, e.id))!, origine)); }
  if (action === "supprimer_entreprise") {
    if (b.confirmer !== true) return json({ error: "Confirmation requise." }, 400);
    await sql`DELETE FROM starvibe_entreprise_conv WHERE entreprise_id = ${e.id}`;
    await sql`DELETE FROM starvibe_entreprise_savoir WHERE entreprise_id = ${e.id}`;
    await sql`DELETE FROM starvibe_entreprise_membres WHERE entreprise_id = ${e.id}`;
    await sql`DELETE FROM starvibe_entreprises WHERE id = ${e.id}`;
    return json({ ok: true });
  }
  return json({ error: "Action inconnue" }, 400);
};

export const config: Config = { path: "/api/entreprise" };
