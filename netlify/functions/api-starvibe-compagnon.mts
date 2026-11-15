// KOMYO — Keydou Compagnon (assistant personnel, version testeurs).
// Membre (jeton KOMYO) :
//   GET                     → état : accès, niveau, quota, consentement, notifications.
//   GET ?historique=1       → les derniers messages.     GET ?rappels=1 → mes rappels.
//   GET ?pushkey=1          → clé publique pour activer les notifications.
//   GET ?export=1           → télécharger toutes mes données.
//   POST { action }         → consentir | chat | rappel_creer | rappel_bascule | rappel_supprimer | push_subscribe | effacer
// Équipe (jeton staff) :
//   GET ?admin=1            → suivi : testeurs et abonnés, dépôt, appareil, dernière ouverture, usage, coût estimé de l'IA.
//   POST { action: "testeur" | "ouvrir" }
// Essai gratuit de 5 messages pour tout membre ; au-delà, abonnement validé (ou invitation de test donnée par l'équipe) obligatoire.
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";
import { vapidKeys, last9, decisionToken, checkDecisionToken } from "./_push.mts";
import {
  ESSAI_MESSAGES, MSG_ESSAI_FINI, MSG_OPTION_ABONNE, compagnonOuvert,
  LIMITES, CONSENTEMENT_VERSION, REPETITIONS, MODELE, OFFRES_TXT, manifesteKeydou, accesDe, aDejaAbonne, texteFinAbonnement, etatQuota, fuseauValide, heureLocale, localVersUtc, parleDeMedicaments, consigne, type Niveau,
} from "./_compagnon.mts";
import {
  MODES, modeDe, supplement, EFFORT, MAX_JETONS, MODELE_NIVEAU, IMAGES_PAR_MOIS, PIECES_PAR_JOUR, imagesDisponibles, verifierDemandeImage, formatImage,
  signerImage, validerPiece, LIMITE_REPONSE, gardePrescription, voixDisponible, VOIX_PAR_JOUR, texteAVoix, genererVoix, connecteurs, listeCapacites, MARQUE_PIECE, marqueImage, idImageDansTexte, type Mode, lireSante, noterSante, verifierConnecteurs, ECHEC_DE_CONNEXION, enPanne } from "./_compagnon2.mts";

const ORG_MEMBRE = "star_vibe";
const ORG_STAFF = "star_entreprise";
const TARIF_ENTREE_USD = 2, TARIF_SORTIE_USD = 10; // Sonnet 5.5, par million de jetons (estimation : le cache réduit le coût réel)

const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ").trim().slice(0, max);

interface RappelRow { id: number; titre: string; quand: string; repetition: string; avant_minutes: number; actif: boolean; envoye_at: string | null }
const rappelApi = (r: RappelRow) => ({ id: r.id, titre: r.titre, quand: r.quand, repetition: r.repetition, avantMinutes: r.avant_minutes, actif: r.actif, envoyeAt: r.envoye_at });

// deno-lint-ignore no-explicit-any
async function creerRappel(sql: any, accountId: number, niveau: Niveau, o: { titre: unknown; quand: Date | null; repetition?: unknown; avant?: unknown }): Promise<{ ok: true; id: number } | { ok: false; raison: string }> {
  const titre = clean(o.titre, 120);
  if (titre.length < 2) return { ok: false, raison: "titre" };
  if (parleDeMedicaments(titre)) return { ok: false, raison: "medicament" };
  if (!o.quand || !Number.isFinite(o.quand.getTime())) return { ok: false, raison: "date" };
  const t = o.quand.getTime();
  if (t < Date.now() - 5 * 60000 || t > Date.now() + 800 * 86400000) return { ok: false, raison: "date" };
  const rep = REPETITIONS.includes(String(o.repetition || "")) ? String(o.repetition || "") : "";
  const avant = Math.min(2880, Math.max(0, Math.round(Number(o.avant) || 0)));
  const n = (await sql`SELECT COUNT(*) AS n FROM starvibe_compagnon_rappels WHERE account_id = ${accountId} AND actif = true`) as { n: string }[];
  if (Number(n[0]?.n || 0) >= LIMITES[niveau].rappels) return { ok: false, raison: "limite" };
  const r = (await sql`
    INSERT INTO starvibe_compagnon_rappels (account_id, titre, quand, repetition, avant_minutes)
    VALUES (${accountId}, ${titre}, ${o.quand.toISOString()}, ${rep}, ${avant}) RETURNING id
  `) as { id: number }[];
  return { ok: true, id: r[0].id };
}

// Images créées pendant les 30 derniers jours (celles qui ont échoué ne comptent pas).
// deno-lint-ignore no-explicit-any
async function imagesUtilisees(sql: any, accountId: number): Promise<{ n: number; joursAvantNouvelle: number }> {
  const r = (await sql`SELECT COUNT(*) AS n, MIN(created_at) AS premiere FROM starvibe_compagnon_images WHERE account_id = ${accountId} AND statut IN ('attente', 'ok') AND created_at > now() - interval '30 days'`) as { n: string; premiere: string | null }[];
  const n = Number(r[0]?.n || 0);
  const jours = r[0]?.premiere ? Math.max(1, Math.ceil((new Date(r[0].premiere).getTime() + 30 * 86400000 - Date.now()) / 86400000)) : 0;
  return { n, joursAvantNouvelle: jours };
}
// deno-lint-ignore no-explicit-any
async function capacites(sql: any, accountId: number, niveau: Niveau) {
  const u = await imagesUtilisees(sql, accountId);
  const max = IMAGES_PAR_MOIS(niveau);
  const maxV = VOIX_PAR_JOUR(niveau);
  const sante = await lireSante(sql);
  const nV = Number(((await sql`SELECT COUNT(*) AS n FROM starvibe_compagnon_voix WHERE account_id = ${accountId} AND created_at > now() - interval '24 hours'`) as { n: string }[])[0]?.n || 0);
  return { voix: { actif: voixDisponible() && !enPanne(sante, "voix") && maxV > 0, max: maxV, restantes: Math.max(0, maxV - nV) }, images: imagesDisponibles() && !enPanne(sante, "images"), imagesMax: max, imagesRestantes: Math.max(0, max - u.n), piecesMax: PIECES_PAR_JOUR(niveau), connecteurs: connecteurs(sante), liste: listeCapacites(niveau), modes: Object.keys(MODES).map((k) => ({ id: k, label: MODES[k as Mode].label, emoji: MODES[k as Mode].emoji })) };
}

interface SourceWeb { titre: string; url: string }
interface ReponseIA { texte: string; sources: SourceWeb[]; recherches: number; tokensIn: number; tokensOut: number; refus: boolean }

async function appelerIA(messages: { role: string; content: unknown }[], rechercheMax: number, o: { niveau: Niveau; mode: Mode; supplement: string }): Promise<ReponseIA | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const base = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/+$/, "");
  const avecOutil = rechercheMax > 0;
  const msgs = messages.slice();
  const total: ReponseIA = { texte: "", sources: [], recherches: 0, tokensIn: 0, tokensOut: 0, refus: false };
  let outil = avecOutil;
  for (let tour = 0; tour < 3; tour++) {
    const corps: Record<string, unknown> = {
      model: MODELE_NIVEAU(o.niveau), max_tokens: MAX_JETONS(o.niveau, o.mode), output_config: { effort: EFFORT(o.niveau, o.mode) },
      system: [{ type: "text", text: consigne(), cache_control: { type: "ephemeral" } }, ...(o.supplement ? [{ type: "text", text: o.supplement }] : [])],
      messages: msgs,
    };
    if (outil) corps.tools = [{ type: "web_search_20260209", name: "web_search", max_uses: Math.min(3, rechercheMax) }];
    let r = await fetch(`${base}/v1/messages`, { method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }, body: JSON.stringify(corps) });
    if (!r.ok && outil && r.status === 400) { // l'outil de recherche n'est pas accepté : on répond sans Internet
      outil = false; delete corps.tools;
      r = await fetch(`${base}/v1/messages`, { method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }, body: JSON.stringify(corps) });
    }
    if (!r.ok) return null;
    const d = (await r.json()) as { content?: Record<string, unknown>[]; stop_reason?: string; usage?: { input_tokens?: number; output_tokens?: number } };
    total.tokensIn += d.usage?.input_tokens || 0; total.tokensOut += d.usage?.output_tokens || 0;
    const blocs = d.content || [];
    for (const b of blocs) {
      if (b.type === "server_tool_use" && b.name === "web_search") total.recherches++;
      if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
        for (const x of b.content as { title?: string; url?: string }[]) if (x.url && !total.sources.some((s) => s.url === x.url)) total.sources.push({ titre: clean(x.title || x.url, 120), url: String(x.url).slice(0, 300) });
      }
    }
    if (d.stop_reason === "refusal") { total.refus = true; return total; }
    if (d.stop_reason === "pause_turn") { msgs.push({ role: "assistant", content: blocs }); continue; }
    total.texte = blocs.filter((b) => b.type === "text").map((b) => String(b.text || "")).join("");
    return total;
  }
  return total;
}

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();
  const url = new URL(req.url);

  // Manifeste de l'application Keydou : servi seulement si le jeton court est valide ET si la personne a un accès valide.
  // Sans manifeste, le navigateur ne propose pas d'installer l'application : l'installation est donc bloquée avant le paiement.
  if (req.method === "GET" && url.searchParams.get("manifest") === "1") {
    const acc = Number(url.searchParams.get("acc")), exp = Number(url.searchParams.get("exp")), t = url.searchParams.get("t") || "";
    if (!acc || !checkDecisionToken("install", acc, exp, t)) return json({ error: "Lien d'installation expiré" }, 403);
    if (!(await accesDe(sql, acc))) return json({ error: "Abonnement requis : l'installation s'ouvre dès que ton dépôt est validé." }, 403);
    return new Response(JSON.stringify(manifesteKeydou()), { headers: { "content-type": "application/manifest+json", "cache-control": "no-store" } });
  }

  const session = await requireAuth(req);
  if (!session) return json({ error: "Non authentifié" }, 401);
  const staff = session.org === ORG_STAFF;

  // ================= ÉQUIPE =================
  if (url.searchParams.get("admin") === "1" || (req.method === "POST" && staff)) {
    if (!staff) return json({ error: "Non autorisé" }, 403);
    if (req.method === "GET") {
      const lignes = (await sql`
        WITH cibles AS (
          SELECT account_id FROM starvibe_compagnon_profil
          UNION SELECT account_id FROM starvibe_subscriptions WHERE plan IN ('compagnon', 'compagnon_complet')
        )
        SELECT c.account_id, a.telephone, p.nom, pr.test, pr.niveau_test, pr.consentement_at, pr.derniere_ouverture, pr.app_installee_at,
          (SELECT plan FROM starvibe_subscriptions s WHERE s.account_id = c.account_id AND s.plan IN ('compagnon', 'compagnon_complet') AND s.statut = 'actif' AND s.expires_at > now() ORDER BY s.expires_at DESC LIMIT 1) AS plan_actif,
          (SELECT expires_at FROM starvibe_subscriptions s WHERE s.account_id = c.account_id AND s.plan IN ('compagnon', 'compagnon_complet') AND s.statut = 'actif' AND s.expires_at > now() ORDER BY s.expires_at DESC LIMIT 1) AS fin,
          (SELECT statut FROM starvibe_subscriptions s WHERE s.account_id = c.account_id AND s.plan IN ('compagnon', 'compagnon_complet') ORDER BY s.id DESC LIMIT 1) AS dernier_statut,
          (SELECT platform FROM starvibe_installs i WHERE i.account_id = c.account_id ORDER BY i.last_seen DESC LIMIT 1) AS appareil,
          (SELECT installed_at FROM starvibe_installs i WHERE i.account_id = c.account_id ORDER BY i.last_seen DESC LIMIT 1) AS installe_le,
          (SELECT COUNT(*) FROM starvibe_compagnon_messages m WHERE m.account_id = c.account_id AND m.role = 'user' AND m.created_at > now() - interval '24 hours') AS msgs24,
          (SELECT COUNT(*) FROM starvibe_compagnon_rappels r WHERE r.account_id = c.account_id AND r.actif = true) AS rappels,
          (SELECT COUNT(*) FROM starvibe_compagnon_push q WHERE q.account_id = c.account_id) AS notifs
        FROM cibles c
        JOIN starvibe_accounts a ON a.id = c.account_id
        LEFT JOIN starvibe_profiles p ON p.account_id = c.account_id AND p.type_profil = 'personnel'
        LEFT JOIN starvibe_compagnon_profil pr ON pr.account_id = c.account_id
        ORDER BY pr.derniere_ouverture DESC NULLS LAST, c.account_id DESC LIMIT 300
      `) as Record<string, unknown>[];
      const cout = (await sql`SELECT COALESCE(SUM(tokens_in), 0) AS ti, COALESCE(SUM(tokens_out), 0) AS tou, COUNT(*) FILTER (WHERE role = 'user') AS msgs, COALESCE(SUM(recherches), 0) AS rech FROM starvibe_compagnon_messages WHERE created_at > now() - interval '30 days'`) as Record<string, string>[];
      const ouvert = (await compagnonOuvert(sql));
      const ti = Number(cout[0].ti), to = Number(cout[0].tou);
      const nbImg = Number(((await sql`SELECT COUNT(*) AS n FROM starvibe_compagnon_images WHERE statut = 'ok' AND created_at > now() - interval '30 days'`) as { n: string }[])[0]?.n || 0);
      let journal: unknown[] = []; try { journal = JSON.parse(((await sql`SELECT value FROM starvibe_settings WHERE key = 'compagnon_ouvert_journal'`) as { value: string }[])[0]?.value || "[]"); } catch { journal = []; }
      return json({
        ouvert, journal, limites: LIMITES, modele: MODELE(),
        usage30j: { messages: Number(cout[0].msgs), recherches: Number(cout[0].rech), jetonsEntree: ti, jetonsSortie: to, coutEstimeUsd: Math.round(((ti * TARIF_ENTREE_USD + to * TARIF_SORTIE_USD) / 1e6) * 100) / 100, images: nbImg, imagesActives: imagesDisponibles() },
        lignes: lignes.map((l) => ({
          accountId: l.account_id, telephone: l.telephone, nom: l.nom || "", test: !!l.test, niveauTest: l.niveau_test || "", planActif: l.plan_actif || "", fin: l.fin || null,
          dernierStatut: l.dernier_statut || "", appareil: l.appareil || "", appInstalleeLe: l.app_installee_at || null, installeLe: l.installe_le || null, consentement: !!l.consentement_at, derniereOuverture: l.derniere_ouverture || null,
          messages24h: Number(l.msgs24), rappels: Number(l.rappels), notifications: Number(l.notifs),
        })),
      });
    }
    let b: Record<string, unknown> = {};
    try { b = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }
    if (b.action === "ouvrir") {
      // Ouvert en permanence : décocher = fermeture d'urgence (arrêt des nouveaux abonnements et des essais).
      await sql`INSERT INTO starvibe_settings (key, value) VALUES ('compagnon_ferme_urgence', ${b.on ? "off" : "on"}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
      // Journal des changements (20 derniers) : qui a ouvert ou fermé, et quand.
      const ancien = ((await sql`SELECT value FROM starvibe_settings WHERE key = 'compagnon_ouvert_journal'`) as { value: string }[])[0]?.value;
      let liste: unknown[] = []; try { liste = JSON.parse(ancien || "[]"); } catch { liste = []; }
      liste.unshift({ on: !!b.on, at: new Date().toISOString(), par: String(session.displayName || session.username || "staff").slice(0, 60) });
      await sql`INSERT INTO starvibe_settings (key, value) VALUES ('compagnon_ouvert_journal', ${JSON.stringify(liste.slice(0, 20))}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
      return json({ ok: true });
    }
    if (b.action === "testeur") {
      const tel = last9(String(b.telephone || ""));
      if (tel.length < 8) return json({ error: "Numéro de téléphone invalide" }, 400);
      const c = (await sql`SELECT id FROM starvibe_accounts WHERE RIGHT(regexp_replace(telephone, '[^0-9]', '', 'g'), 9) = ${tel} LIMIT 2`) as { id: number }[];
      if (c.length === 0) return json({ error: "Aucun compte KOMYO avec ce numéro : la personne doit d'abord créer son compte." }, 404);
      if (c.length > 1) return json({ error: "Plusieurs comptes avec ce numéro : précisez-le avec l'indicatif." }, 409);
      const niveau = b.niveau === "complet" ? "complet" : "essentiel";
      await sql`
        INSERT INTO starvibe_compagnon_profil (account_id, test, niveau_test) VALUES (${c[0].id}, ${b.actif !== false}, ${niveau})
        ON CONFLICT (account_id) DO UPDATE SET test = EXCLUDED.test, niveau_test = EXCLUDED.niveau_test
      `;
      return json({ ok: true, accountId: c[0].id, test: b.actif !== false, niveau });
    }
    return json({ error: "Action inconnue" }, 400);
  }

  // ================= MEMBRE =================
  if (session.org !== ORG_MEMBRE) return json({ error: "Réservé aux membres KOMYO" }, 403);
  const accountId = Number(session.sub);
  if (!accountId) return json({ error: "Compte invalide" }, 401);

  if (req.method === "GET" && url.searchParams.get("pushkey") === "1") return json({ publicKey: vapidKeys().publicKey });

  const acces = await accesDe(sql, accountId);
  const profil = ((await sql`SELECT consentement_at FROM starvibe_compagnon_profil WHERE account_id = ${accountId}`) as { consentement_at: string | null }[])[0];
  const consentement = !!profil?.consentement_at;
  const ouvert = (await compagnonOuvert(sql));

  // Menu KOMYO : l'entrée « Keydou Compagnon » est visible pour un testeur, un abonné (même terminé) ou quand l'offre est ouverte. Aucun effet de bord.
  if (req.method === "GET" && url.searchParams.get("acces") === "1") {
    const visible = !!acces || ouvert || (await aDejaAbonne(sql, accountId)).deja;
    return json({ visible, acces: !!acces && acces.niveau !== "essai", essai: acces?.niveau === "essai", ouvert });
  }

  // L'effacement et l'export sont toujours possibles (droit de la personne), même sans abonnement actif.
  if (req.method === "GET" && url.searchParams.get("export") === "1") {
    const [rappels, notes, messages, images] = await Promise.all([
      sql`SELECT titre, quand, repetition, avant_minutes, actif, created_at FROM starvibe_compagnon_rappels WHERE account_id = ${accountId} ORDER BY quand`,
      sql`SELECT texte, created_at FROM starvibe_compagnon_notes WHERE account_id = ${accountId} ORDER BY id`,
      sql`SELECT role, texte, created_at FROM starvibe_compagnon_messages WHERE account_id = ${accountId} ORDER BY id`,
      sql`SELECT id, prompt, format, statut, created_at FROM starvibe_compagnon_images WHERE account_id = ${accountId} ORDER BY id`,
    ]);
    return new Response(JSON.stringify({ exporteLe: new Date().toISOString(), consentement: profil?.consentement_at || null, rappels, notes, messages, images }, null, 1), {
      headers: { "content-type": "application/json", "content-disposition": "attachment; filename=\"mes-donnees-keydou.json\"" },
    });
  }
  let body: Record<string, unknown> = {};
  if (req.method === "POST") { try { body = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); } }
  if (req.method === "POST" && body.action === "effacer") {
    const a = (await sql`DELETE FROM starvibe_compagnon_rappels WHERE account_id = ${accountId} RETURNING id`) as unknown[];
    const m = (await sql`DELETE FROM starvibe_compagnon_messages WHERE account_id = ${accountId} RETURNING id`) as unknown[];
    const n = (await sql`DELETE FROM starvibe_compagnon_notes WHERE account_id = ${accountId} RETURNING id`) as unknown[];
    await sql`DELETE FROM starvibe_compagnon_push WHERE account_id = ${accountId}`;
    await sql`DELETE FROM starvibe_compagnon_images WHERE account_id = ${accountId}`;
    await sql`DELETE FROM starvibe_compagnon_voix WHERE account_id = ${accountId}`;
    await sql`UPDATE starvibe_compagnon_profil SET consentement_at = NULL, consentement_version = '' WHERE account_id = ${accountId}`;
    return json({ ok: true, effaces: { rappels: a.length, messages: m.length, notes: n.length } });
  }

  // Tout le reste exige un accès valide (abonnement validé ou invitation de test).
  if (!acces) {
    // Abonnement terminé : on invite à reconduire (toujours possible, même si l'offre est fermée aux nouveaux clients).
    const ancien = await aDejaAbonne(sql, accountId);
    if (ancien.deja) {
      return json({
        error: `Ton abonnement Keydou Compagnon est terminé. Pour continuer à profiter de Keydou, réabonne-toi ou reconduis ton abonnement mensuel : ${OFFRES_TXT}.`,
        code: "abonnement_termine", ouvert: true, fin: ancien.fin, capacites: { images: imagesDisponibles(), voix: { actif: voixDisponible() } },
      }, 403);
    }
    return json({
      error: ouvert ? "Keydou Compagnon : abonnement requis. Choisis ton offre, ton accès s'ouvre dès que ton dépôt est reconnu." : "Keydou Compagnon est en période de test : l'accès se fait sur invitation de l'équipe STAR ENTREPRISE.",
      code: "acces_refuse", ouvert, capacites: { images: imagesDisponibles(), voix: { actif: voixDisponible() } },
    }, 403);
  }
  const lim = LIMITES[acces.niveau];

  if (req.method === "GET" && url.searchParams.get("sante") === "1") {
    // « Vérifier maintenant » : les connecteurs sont réellement interrogés (au plus une fois par minute), l'état à jour est renvoyé.
    const avant = await lireSante(sql); const dernier = Math.max(0, ...Object.values(avant).map((x) => x.at));
    const sante = Date.now() - dernier < 60000 ? avant : await verifierConnecteurs(sql);
    return json({ connecteurs: connecteurs(sante), verifieA: new Date().toISOString() });
  }
  if (req.method === "GET" && url.searchParams.get("installtoken") === "1") {
    const d = decisionToken("install", accountId);
    return json({ acc: accountId, exp: d.exp, t: d.t });
  }
  if (req.method === "GET" && url.searchParams.get("voix")) {
    const mid = Number(url.searchParams.get("voix"));
    const deja = (await sql`SELECT data_b64 FROM starvibe_compagnon_voix WHERE account_id = ${accountId} AND message_id = ${mid}`) as { data_b64: string }[];
    const audio = (b64: string) => new Response(Buffer.from(b64, "base64"), { headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=86400" } });
    if (deja[0]) return audio(deja[0].data_b64);
    const maxV = VOIX_PAR_JOUR(acces.niveau);
    if (!voixDisponible() || maxV <= 0) return json({ error: "La voix de Keydou n'est pas disponible pour ton offre.", code: "voix_indisponible" }, 404);
    const m = (await sql`SELECT texte FROM starvibe_compagnon_messages WHERE id = ${mid} AND account_id = ${accountId} AND role = 'assistant'`) as { texte: string }[];
    if (!m[0]) return json({ error: "Message introuvable." }, 404);
    const nV = Number(((await sql`SELECT COUNT(*) AS n FROM starvibe_compagnon_voix WHERE account_id = ${accountId} AND created_at > now() - interval '24 hours'`) as { n: string }[])[0]?.n || 0);
    if (nV >= maxV) return json({ error: `Tu as utilisé tes ${maxV} lectures avec la voix de Keydou aujourd'hui. Elles reviennent demain ; en attendant, ton téléphone peut lire la réponse.`, code: "voix_quota" }, 429);
    const t = texteAVoix(m[0].texte);
    if (t.length < 3) return json({ error: "Rien à lire dans ce message.", code: "voix_vide" }, 400);
    const g = await genererVoix(t);
    if (g.ok) await noterSante(sql, "voix", true); else if (ECHEC_DE_CONNEXION.test(g.erreur)) await noterSante(sql, "voix", false, g.erreur);
    if (!g.ok) return json({ error: "La voix de Keydou est indisponible un instant : ton téléphone peut lire la réponse.", code: "voix_erreur" }, 503);
    await sql`INSERT INTO starvibe_compagnon_voix (account_id, message_id, signes, data_b64) VALUES (${accountId}, ${mid}, ${t.length}, ${g.b64}) ON CONFLICT (account_id, message_id) DO NOTHING`;
    await sql`DELETE FROM starvibe_compagnon_voix WHERE account_id = ${accountId} AND id NOT IN (SELECT id FROM starvibe_compagnon_voix WHERE account_id = ${accountId} ORDER BY id DESC LIMIT 20)`;
    return audio(g.b64);
  }
  if (req.method === "GET" && url.searchParams.get("image")) {
    const id = Number(url.searchParams.get("image"));
    const r = (await sql`SELECT statut, mime, data_b64, erreur, created_at FROM starvibe_compagnon_images WHERE id = ${id} AND account_id = ${accountId}`) as { statut: string; mime: string; data_b64: string; erreur: string; created_at: string }[];
    if (!r[0]) return json({ error: "Image introuvable (elle a peut-être été effacée)." }, 404);
    let st = r[0].statut;
    if (st === "attente" && Date.now() - new Date(r[0].created_at).getTime() > 5 * 60000) { st = "erreur"; await sql`UPDATE starvibe_compagnon_images SET statut = 'erreur', erreur = 'délai dépassé' WHERE id = ${id} AND statut = 'attente'`; }
    if (url.searchParams.get("statut") === "1") {
      const detail = (st === "erreur" || st === "refuse") && acces?.source === "test" ? String(r[0].erreur || "") : "";
      return json({ detail, statut: st, message: st === "refuse" ? "Le contrôle de sécurité a refusé cette image. Essaie une autre idée." : st === "erreur" ? "L'image n'a pas pu être créée. Elle n'est pas comptée : réessaie." : "" });
    }
    if (st !== "ok") return json({ error: "Image pas encore prête." }, 409);
    return new Response(Buffer.from(r[0].data_b64, "base64"), { headers: { "content-type": r[0].mime || "image/jpeg", "cache-control": "private, max-age=86400", "content-disposition": `inline; filename="keydou-image-${id}.${(r[0].mime || "").includes("png") ? "png" : "jpg"}"` } });
  }
  if (req.method === "GET") {
    await sql`INSERT INTO starvibe_compagnon_profil (account_id, derniere_ouverture) VALUES (${accountId}, now()) ON CONFLICT (account_id) DO UPDATE SET derniere_ouverture = now()`;
    if (url.searchParams.get("app") === "1") await sql`UPDATE starvibe_compagnon_profil SET app_installee_at = COALESCE(app_installee_at, now()) WHERE account_id = ${accountId}`;
    if (url.searchParams.get("historique") === "1") {
      const h = (await sql`SELECT id, role, texte, created_at FROM starvibe_compagnon_messages WHERE account_id = ${accountId} ORDER BY id DESC LIMIT 40`) as { id: number; role: string; texte: string; created_at: string }[];
      return json({ messages: h.reverse().map((x) => ({ id: x.id, role: x.role, texte: x.texte, at: x.created_at })) });
    }
    if (url.searchParams.get("rappels") === "1") {
      const r = (await sql`SELECT id, titre, quand, repetition, avant_minutes, actif, envoye_at FROM starvibe_compagnon_rappels WHERE account_id = ${accountId} ORDER BY actif DESC, quand ASC LIMIT 300`) as RappelRow[];
      return json({ rappels: r.map(rappelApi) });
    }
    const q = await etatQuota(sql, accountId, acces.niveau);
    const notifs = (await sql`SELECT COUNT(*) AS n FROM starvibe_compagnon_push WHERE account_id = ${accountId}`) as { n: string }[];
    const finMs = acces.fin ? new Date(acces.fin).getTime() - Date.now() : null;
    const finBientot = acces.source === "abonnement" && finMs !== null && finMs > 0 && finMs <= 24 * 3600 * 1000;
    const ligneCompte = (await sql`SELECT a.telephone AS tel, (SELECT nom FROM starvibe_profiles WHERE account_id = a.id ORDER BY (type_profil = 'personnel') DESC, id LIMIT 1) AS nom FROM starvibe_accounts a WHERE a.id = ${accountId}`) as { tel: string; nom: string | null }[];
    const nomCompte = String(ligneCompte[0]?.nom || "").trim(), chiffres = String(ligneCompte[0]?.tel || "").replace(/\D/g, "");
    const initiales = (nomCompte.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join("") || "KY").toUpperCase();
    const telMasque = chiffres.length >= 6 ? `+${chiffres.slice(0, chiffres.length - 6)} ${chiffres.slice(-6, -4)}•• ••${chiffres.slice(-2)}`.trim() : "";
    return json({ compte: { nom: nomCompte, initiales, telephone: telMasque }, acces: { niveau: acces.niveau, label: lim.label, source: acces.source, fin: acces.fin }, finBientot, texteFin: finBientot && acces.fin ? texteFinAbonnement(new Date(acces.fin)) : "", consentement, consentementVersion: CONSENTEMENT_VERSION, quota: q, notifications: Number(notifs[0]?.n || 0), capacites: await capacites(sql, accountId, acces.niveau) });
  }

  if (req.method !== "POST") return json({ error: "Méthode non permise" }, 405);
  const action = clean(body.action, 30);

  if (action === "consentir") {
    await sql`
      INSERT INTO starvibe_compagnon_profil (account_id, consentement_at, consentement_version) VALUES (${accountId}, now(), ${CONSENTEMENT_VERSION})
      ON CONFLICT (account_id) DO UPDATE SET consentement_at = now(), consentement_version = ${CONSENTEMENT_VERSION}
    `;
    return json({ ok: true });
  }
  if (action === "app_installee") {
    await sql`INSERT INTO starvibe_compagnon_profil (account_id, app_installee_at) VALUES (${accountId}, now()) ON CONFLICT (account_id) DO UPDATE SET app_installee_at = COALESCE(starvibe_compagnon_profil.app_installee_at, now())`;
    return json({ ok: true });
  }
  if (!consentement) return json({ error: "Avant de commencer, accepte que Keydou garde ces informations pour t'aider.", code: "consentement_requis" }, 403);

  if (action === "push_subscribe") {
    const sub = (body.subscription || {}) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return json({ error: "Abonnement invalide" }, 400);
    await sql`
      INSERT INTO starvibe_compagnon_push (account_id, endpoint, p256dh, auth, label) VALUES (${accountId}, ${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth}, ${clean(body.label, 60)})
      ON CONFLICT (endpoint) DO UPDATE SET account_id = ${accountId}, p256dh = ${sub.keys.p256dh}, auth = ${sub.keys.auth}
    `;
    return json({ ok: true });
  }

  const tz = fuseauValide(body.tz);

  if (action === "rappel_creer") {
    const r = await creerRappel(sql, accountId, acces.niveau, { titre: body.titre, quand: localVersUtc(String(body.quand || ""), tz), repetition: body.repetition, avant: body.avantMinutes });
    if (!r.ok) {
      const msg = r.raison === "medicament" ? "Je ne m'occupe pas des médicaments : parle-en à ton médecin ou à ton pharmacien." : r.raison === "limite" ? (acces.niveau === "essai" ? MSG_OPTION_ABONNE : `Tu as atteint ${lim.rappels} rappels actifs. Supprime-en un pour en ajouter.`) : r.raison === "date" ? "La date et l'heure du rappel sont invalides ou déjà passées." : "Donne un titre au rappel.";
      return json({ error: msg, code: r.raison }, 400);
    }
    return json({ ok: true, id: r.id });
  }
  if (action === "rappel_bascule" || action === "rappel_supprimer") {
    const id = Number(body.id);
    if (!id) return json({ error: "Rappel inconnu" }, 400);
    if (action === "rappel_supprimer") await sql`DELETE FROM starvibe_compagnon_rappels WHERE id = ${id} AND account_id = ${accountId}`;
    else if (body.actif === false) await sql`UPDATE starvibe_compagnon_rappels SET actif = false WHERE id = ${id} AND account_id = ${accountId}`;
    else await sql`UPDATE starvibe_compagnon_rappels SET actif = true, avant_envoye = false WHERE id = ${id} AND account_id = ${accountId} AND (quand > now() OR repetition <> '')`;
    return json({ ok: true });
  }

  if (action !== "chat") return json({ error: "Action inconnue" }, 400);

  // ---------- Discussion ----------
  let message = clean(body.message, 1500);
  let pj: { kind: "image" | "pdf"; mime: string; data: string } | null = null;
  if (body.piece) {
    const v = validerPiece(body.piece);
    if (!v.ok) return json({ error: v.erreur }, 400);
    pj = v.piece;
    if (!message) message = "Regarde ce fichier et explique-moi ce que tu vois.";
  }
  if (!message) return json({ error: "Message vide" }, 400);
  const essai = acces.niveau === "essai";
  const q0 = await etatQuota(sql, accountId, acces.niveau);
  if (essai && q0.messagesUtilises >= q0.messagesMax) {
    return json({ essaiTermine: true, error: MSG_ESSAI_FINI, code: "essai_termine", quota: q0 }, 402);
  }
  if (essai && body.piece) return json({ error: MSG_OPTION_ABONNE, code: "option_abonne", quota: q0 }, 402);
  if (q0.revenirDansMs > 0) {
    return json({ limite: true, revenirDans: q0.revenirDans, error: `Tu as atteint ta limite de ${lim.messages} messages. Reviens dans ${q0.revenirDans}.`, quota: q0 }, 429);
  }
  if (pj) {
    const maxP = PIECES_PAR_JOUR(acces.niveau);
    const nbP = Number(((await sql`SELECT COUNT(*) AS n FROM starvibe_compagnon_messages WHERE account_id = ${accountId} AND role = 'user' AND texte LIKE ${MARQUE_PIECE + "%"} AND created_at > now() - interval '24 hours'`) as { n: string }[])[0]?.n || 0);
    if (nbP >= maxP) return json({ error: `Tu as déjà envoyé ${maxP} photos ou documents aujourd'hui. Reviens demain${acces.niveau === "essentiel" ? " ou passe à Complet (30 par jour) avec le bouton « + »" : ""}.`, code: "pieces_limite" }, 429);
  }
  const hist = (await sql`SELECT role, texte FROM starvibe_compagnon_messages WHERE account_id = ${accountId} ORDER BY id DESC LIMIT 12`) as { role: string; texte: string }[];
  const rapp = (await sql`SELECT id, titre, quand, repetition FROM starvibe_compagnon_rappels WHERE account_id = ${accountId} AND actif = true ORDER BY quand ASC LIMIT 25`) as { id: number; titre: string; quand: string; repetition: string }[];
  const notes = (await sql`SELECT texte FROM starvibe_compagnon_notes WHERE account_id = ${accountId} ORDER BY id DESC LIMIT 40`) as { texte: string }[];
  const ins = (await sql`INSERT INTO starvibe_compagnon_messages (account_id, role, texte) VALUES (${accountId}, 'user', ${(pj ? MARQUE_PIECE : "") + message}) RETURNING id`) as { id: number }[];

  const restantes = Math.max(0, lim.recherches - q0.recherchesUtilisees);
  const mode: Mode = modeDe(message, body.mode);
  const imgUtil = await imagesUtilisees(sql, accountId);
  const imgMax = IMAGES_PAR_MOIS(acces.niveau);
  const imgRestantes = Math.max(0, imgMax - imgUtil.n);
  const suppEssai = essai ? "\n\nESSAI GRATUIT. La personne n'a pas encore d'abonnement : réponds brièvement et utilement, sans créer de rappel, sans recherche. Elle a droit à 2 images d'essai (tu peux en créer quand elle le demande clairement). Si elle demande un rappel, un fichier ou une vérification approfondie, explique gentiment que ces options sont comprises dans l'abonnement (Essentiel 5 000 FCFA par mois, Complet 19 $ par mois) et n'ajoute pas \"rappels\"." : "";
  const imagesOk = imagesDisponibles() && !enPanne(await lireSante(sql), "images");
  const supp = supplement(mode, { imagesRestantes: imgRestantes, imagesPossibles: imagesOk, niveau: acces.niveau, piece: !!pj }) + suppEssai;
  const contexte = [
    `[Contexte] Date et heure locales de la personne : ${heureLocale(new Date(), tz)} (fuseau ${tz}).`,
    `Rappels actifs : ${rapp.length ? rapp.map((r) => `#${r.id} « ${r.titre} » le ${heureLocale(new Date(r.quand), tz)}${r.repetition ? ` (chaque ${r.repetition === "jour" ? "jour" : r.repetition === "semaine" ? "semaine" : r.repetition === "mois" ? "mois" : "année"})` : ""}`).join(" ; ") : "aucun"}.`,
    `Ce que tu retiens de la personne : ${notes.length ? notes.reverse().map((n) => n.texte).join(" ; ") : "rien pour l'instant"}.`,
    `Vérification par recherche : ${restantes > 0 ? "disponible" : "épuisée pour aujourd'hui : réponds au mieux avec tes connaissances, dis franchement si tu n'es pas sûr, et mets \"seuil\":true si la question demandait une vérification"}.`,
    `Domaine de la question : ${MODES[mode].label}.`,
    `[Message de la personne] ${message}`,
  ].join("\n");
  const messagesIA: { role: string; content: unknown }[] = [];
  for (const h of hist.reverse()) {
    const r = h.role === "assistant" ? "assistant" : "user";
    if (messagesIA.length === 0 && r === "assistant") continue;
    if (messagesIA.length && messagesIA[messagesIA.length - 1].role === r) continue;
    messagesIA.push({ role: r, content: h.texte.replace(/\[\[img:\d+\]\]/g, "").slice(0, 800) });
  }
  if (messagesIA.length && messagesIA[messagesIA.length - 1].role === "user") messagesIA.pop();
  const blocPJ = pj ? (pj.kind === "pdf"
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: pj.data } }
    : { type: "image", source: { type: "base64", media_type: pj.mime, data: pj.data } }) : null;
  messagesIA.push({ role: "user", content: blocPJ ? [blocPJ, { type: "text", text: contexte }] : contexte });

  let ia: ReponseIA | null = null;
  try { ia = await appelerIA(messagesIA, restantes, { niveau: acces.niveau, mode, supplement: supp }); } catch { ia = null; }
  await noterSante(sql, "claude", !!ia, "Claude ne répond pas");
  if (!ia) {
    await sql`DELETE FROM starvibe_compagnon_messages WHERE id = ${ins[0].id}`; // un message qui n'a pas reçu de réponse ne compte pas
    return json({ error: "Keydou est indisponible un instant. Réessaie dans une minute : ce message n'est pas compté." }, 503);
  }
  if (ia.refus) {
    await sql`INSERT INTO starvibe_compagnon_messages (account_id, role, texte, tokens_in, tokens_out) VALUES (${accountId}, 'assistant', ${"Je ne peux pas t'aider sur ce point. Je suis là pour tes rappels, tes questions du quotidien et ta culture générale."}, ${ia.tokensIn}, ${ia.tokensOut})`;
    return json({ reponse: "Je ne peux pas t'aider sur ce point. Je suis là pour tes rappels, tes questions du quotidien et ta culture générale.", sources: [], rappelsAjoutes: [], quota: await etatQuota(sql, accountId, acces.niveau) });
  }

  let seuilAtteint = false;
  let reponse = "", rappelsIA: Record<string, unknown>[] = [], notesIA: unknown[] = [], suppr: unknown[] = [];
  let imageDemandee: { prompt?: string; format?: string } | null = null;
  const a = ia.texte.indexOf("{"), z = ia.texte.lastIndexOf("}");
  if (a >= 0 && z > a) {
    try {
      const o = JSON.parse(ia.texte.slice(a, z + 1)) as { reponse?: string; seuil?: boolean; rappels?: unknown; notes?: unknown; supprimer_rappels?: unknown; image?: { prompt?: string; format?: string } | null };
      reponse = clean(o.reponse, LIMITE_REPONSE(mode)); seuilAtteint = o.seuil === true;
      rappelsIA = Array.isArray(o.rappels) ? (o.rappels as Record<string, unknown>[]).slice(0, 5) : [];
      notesIA = Array.isArray(o.notes) ? o.notes.slice(0, 5) : [];
      suppr = Array.isArray(o.supprimer_rappels) ? o.supprimer_rappels.slice(0, 10) : [];
      imageDemandee = o.image && typeof o.image === "object" && typeof o.image.prompt === "string" ? o.image : null;
    } catch { /* texte libre ci-dessous */ }
  }
  if (!reponse) reponse = clean(ia.texte.replace(/[{}]/g, ""), Math.min(LIMITE_REPONSE(mode), 3000)) || "Je n'ai pas bien compris, peux-tu reformuler ?";

  const ajoutes: { id: number; titre: string; quand: string }[] = [];
  let refusMedoc = false, refusLimite = false;
  for (const r of rappelsIA) {
    const quand = localVersUtc(String(r.quand || ""), tz);
    const res = await creerRappel(sql, accountId, acces.niveau, { titre: r.titre, quand, repetition: r.repetition, avant: r.avant_minutes });
    if (res.ok) ajoutes.push({ id: res.id, titre: clean(r.titre, 120), quand: quand ? quand.toISOString() : "" });
    else if (res.raison === "medicament") refusMedoc = true;
    else if (res.raison === "limite") refusLimite = true;
  }
  for (const n of notesIA) {
    const t = clean(n, 200);
    if (t.length < 3 || parleDeMedicaments(t) || /\b(mot de passe|code pin|code secret|cvv|num[ée]ro de carte)\b/i.test(t)) continue;
    const dej = (await sql`SELECT 1 FROM starvibe_compagnon_notes WHERE account_id = ${accountId} AND lower(texte) = lower(${t}) LIMIT 1`) as unknown[];
    const nb = (await sql`SELECT COUNT(*) AS n FROM starvibe_compagnon_notes WHERE account_id = ${accountId}`) as { n: string }[];
    if (!dej.length && Number(nb[0]?.n || 0) < 80) await sql`INSERT INTO starvibe_compagnon_notes (account_id, texte) VALUES (${accountId}, ${t})`;
  }
  for (const id of suppr) { const i = Number(id); if (i) await sql`DELETE FROM starvibe_compagnon_rappels WHERE id = ${i} AND account_id = ${accountId}`; }
  if (seuilAtteint && restantes <= 0 && !essai) reponse += acces.niveau === "essentiel"
    ? "\n\nTu as atteint ton seuil de recherches vérifiées pour aujourd'hui. Passe en mode Pro (offre Complet, 19 $ par mois) avec le bouton « + » pour continuer à vérifier tes informations, ou reviens demain."
    : "\n\nTu as atteint ton seuil de recherches vérifiées pour aujourd'hui. Elles reviennent demain.";
  if (refusMedoc) reponse += "\n\n(Je n'ai pas enregistré ce rappel : je ne m'occupe pas des médicaments. Parle-en à ton médecin ou à ton pharmacien.)";
  if (refusLimite) reponse += essai ? `\n\n(Je n'ai pas enregistré ce rappel : les rappels sont compris dans l'abonnement Essentiel, 5 000 FCFA par mois.)` : `\n\n(Je n'ai pas pu ajouter ce rappel : tu as déjà ${lim.rappels} rappels actifs.)`;

  // ---------- Image demandée ----------
  let imageInfo: { id: number; statut: string } | null = null;
  if (imageDemandee) {
    const promptImg = clean(imageDemandee.prompt, 900);
    let refusImage = "";
    if (!imagesOk) refusImage = imagesDisponibles() ? "La création d'images est momentanément indisponible : réessaie un peu plus tard." : "La création d'images n'est pas encore ouverte : elle arrive bientôt.";
    else if (imgMax <= 0) refusImage = "La création d'images est comprise dans l'offre Complet (19 $ par mois). Touche « + » pour changer d'offre.";
    else if (essai && imgRestantes <= 0) refusImage = "Tu as utilisé tes 2 images d'essai. Pour en créer d'autres : Essentiel (5 000 FCFA par mois, 10 images par mois) ou Complet (19 $ par mois, 35 images par mois).";
    else if (imgRestantes <= 0) refusImage = `Tu as utilisé tes ${imgMax} images de ce mois. Tu pourras en créer une nouvelle dans ${imgUtil.joursAvantNouvelle} jour${imgUtil.joursAvantNouvelle > 1 ? "s" : ""}.`;
    else {
      const v = verifierDemandeImage(`${message} ${promptImg}`);
      if (!v.ok) refusImage = v.message;
      else {
        const ins2 = (await sql`INSERT INTO starvibe_compagnon_images (account_id, prompt, format) VALUES (${accountId}, ${promptImg}, ${formatImage(imageDemandee.format)}) RETURNING id`) as { id: number }[];
        imageInfo = { id: ins2[0].id, statut: "attente" };
        await sql`DELETE FROM starvibe_compagnon_images WHERE account_id = ${accountId} AND id NOT IN (SELECT id FROM starvibe_compagnon_images WHERE account_id = ${accountId} ORDER BY id DESC LIMIT 30)`;
        try {
          const lance = await fetch(new URL(`/.netlify/functions/compagnon-image-background?id=${imageInfo.id}&sig=${signerImage(imageInfo.id)}`, req.url), { method: "POST", signal: AbortSignal.timeout(4000) });
          if (lance.status >= 400) await sql`UPDATE starvibe_compagnon_images SET statut = 'erreur', erreur = ${"lancement refusé : " + lance.status}, fini_at = now() WHERE id = ${imageInfo.id} AND statut = 'attente'`;
        } catch { /* la tâche est lancée ; sinon le délai de 5 minutes la marque en échec */ }
      }
    }
    if (refusImage) reponse = refusImage;
  }
  reponse = gardePrescription(reponse, mode);
  const reponseGardee = imageInfo ? `${reponse}\n${marqueImage(imageInfo.id)}` : reponse;

  const insA = (await sql`INSERT INTO starvibe_compagnon_messages (account_id, role, texte, recherches, tokens_in, tokens_out) VALUES (${accountId}, 'assistant', ${reponseGardee}, ${ia.recherches}, ${ia.tokensIn}, ${ia.tokensOut}) RETURNING id`) as { id: number }[];
  return json({ messageId: insA[0]?.id || 0, reponse, sources: ia.sources.slice(0, 3), rappelsAjoutes: ajoutes, mode, image: imageInfo, capacites: await capacites(sql, accountId, acces.niveau), quota: await etatQuota(sql, accountId, acces.niveau) });
};

export const config: Config = { path: "/api/starvibe-compagnon" };
