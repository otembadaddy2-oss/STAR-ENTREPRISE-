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
// Jamais gratuit : sans abonnement validé (ou invitation de test donnée par l'équipe), tout est refusé.
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";
import { vapidKeys, last9 } from "./_push.mts";
import {
  LIMITES, CONSENTEMENT_VERSION, REPETITIONS, MODELE, OFFRES_TXT, accesDe, aDejaAbonne, texteFinAbonnement, etatQuota, fuseauValide, heureLocale, localVersUtc, parleDeMedicaments, consigne, type Niveau,
} from "./_compagnon.mts";

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

interface SourceWeb { titre: string; url: string }
interface ReponseIA { texte: string; sources: SourceWeb[]; recherches: number; tokensIn: number; tokensOut: number; refus: boolean }

async function appelerIA(messages: { role: string; content: unknown }[], rechercheMax: number): Promise<ReponseIA | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const base = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/+$/, "");
  const avecOutil = rechercheMax > 0;
  const msgs = messages.slice();
  const total: ReponseIA = { texte: "", sources: [], recherches: 0, tokensIn: 0, tokensOut: 0, refus: false };
  let outil = avecOutil;
  for (let tour = 0; tour < 3; tour++) {
    const corps: Record<string, unknown> = {
      model: MODELE(), max_tokens: 1400, output_config: { effort: "low" },
      system: [{ type: "text", text: consigne(), cache_control: { type: "ephemeral" } }],
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
  const session = await requireAuth(req);
  if (!session) return json({ error: "Non authentifié" }, 401);
  const url = new URL(req.url);
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
        SELECT c.account_id, a.telephone, p.nom, pr.test, pr.niveau_test, pr.consentement_at, pr.derniere_ouverture,
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
      const ouvert = ((await sql`SELECT value FROM starvibe_settings WHERE key = 'compagnon_ouvert'`) as { value: string }[])[0]?.value === "on";
      const ti = Number(cout[0].ti), to = Number(cout[0].tou);
      return json({
        ouvert, limites: LIMITES, modele: MODELE(),
        usage30j: { messages: Number(cout[0].msgs), recherches: Number(cout[0].rech), jetonsEntree: ti, jetonsSortie: to, coutEstimeUsd: Math.round(((ti * TARIF_ENTREE_USD + to * TARIF_SORTIE_USD) / 1e6) * 100) / 100 },
        lignes: lignes.map((l) => ({
          accountId: l.account_id, telephone: l.telephone, nom: l.nom || "", test: !!l.test, niveauTest: l.niveau_test || "", planActif: l.plan_actif || "", fin: l.fin || null,
          dernierStatut: l.dernier_statut || "", appareil: l.appareil || "", installeLe: l.installe_le || null, consentement: !!l.consentement_at, derniereOuverture: l.derniere_ouverture || null,
          messages24h: Number(l.msgs24), rappels: Number(l.rappels), notifications: Number(l.notifs),
        })),
      });
    }
    let b: Record<string, unknown> = {};
    try { b = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }
    if (b.action === "ouvrir") {
      await sql`INSERT INTO starvibe_settings (key, value) VALUES ('compagnon_ouvert', ${b.on ? "on" : "off"}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
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
  const ouvert = ((await sql`SELECT value FROM starvibe_settings WHERE key = 'compagnon_ouvert'`) as { value: string }[])[0]?.value === "on";

  // L'effacement et l'export sont toujours possibles (droit de la personne), même sans abonnement actif.
  if (req.method === "GET" && url.searchParams.get("export") === "1") {
    const [rappels, notes, messages] = await Promise.all([
      sql`SELECT titre, quand, repetition, avant_minutes, actif, created_at FROM starvibe_compagnon_rappels WHERE account_id = ${accountId} ORDER BY quand`,
      sql`SELECT texte, created_at FROM starvibe_compagnon_notes WHERE account_id = ${accountId} ORDER BY id`,
      sql`SELECT role, texte, created_at FROM starvibe_compagnon_messages WHERE account_id = ${accountId} ORDER BY id`,
    ]);
    return new Response(JSON.stringify({ exporteLe: new Date().toISOString(), consentement: profil?.consentement_at || null, rappels, notes, messages }, null, 1), {
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
        code: "abonnement_termine", ouvert: true, fin: ancien.fin,
      }, 403);
    }
    return json({
      error: ouvert ? "Keydou Compagnon : abonnement requis. Choisis ton offre, ton accès s'ouvre dès que ton dépôt est reconnu." : "Keydou Compagnon est en période de test : l'accès se fait sur invitation de l'équipe STAR ENTREPRISE.",
      code: "acces_refuse", ouvert,
    }, 403);
  }
  const lim = LIMITES[acces.niveau];

  if (req.method === "GET") {
    await sql`INSERT INTO starvibe_compagnon_profil (account_id, derniere_ouverture) VALUES (${accountId}, now()) ON CONFLICT (account_id) DO UPDATE SET derniere_ouverture = now()`;
    if (url.searchParams.get("historique") === "1") {
      const h = (await sql`SELECT role, texte, created_at FROM starvibe_compagnon_messages WHERE account_id = ${accountId} ORDER BY id DESC LIMIT 40`) as { role: string; texte: string; created_at: string }[];
      return json({ messages: h.reverse().map((x) => ({ role: x.role, texte: x.texte, at: x.created_at })) });
    }
    if (url.searchParams.get("rappels") === "1") {
      const r = (await sql`SELECT id, titre, quand, repetition, avant_minutes, actif, envoye_at FROM starvibe_compagnon_rappels WHERE account_id = ${accountId} ORDER BY actif DESC, quand ASC LIMIT 300`) as RappelRow[];
      return json({ rappels: r.map(rappelApi) });
    }
    const q = await etatQuota(sql, accountId, acces.niveau);
    const notifs = (await sql`SELECT COUNT(*) AS n FROM starvibe_compagnon_push WHERE account_id = ${accountId}`) as { n: string }[];
    const finMs = acces.fin ? new Date(acces.fin).getTime() - Date.now() : null;
    const finBientot = acces.source === "abonnement" && finMs !== null && finMs > 0 && finMs <= 24 * 3600 * 1000;
    return json({ acces: { niveau: acces.niveau, label: lim.label, source: acces.source, fin: acces.fin }, finBientot, texteFin: finBientot && acces.fin ? texteFinAbonnement(new Date(acces.fin)) : "", consentement, consentementVersion: CONSENTEMENT_VERSION, quota: q, notifications: Number(notifs[0]?.n || 0) });
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
      const msg = r.raison === "medicament" ? "Je ne m'occupe pas des médicaments : parle-en à ton médecin ou à ton pharmacien." : r.raison === "limite" ? `Tu as atteint ${lim.rappels} rappels actifs. Supprime-en un pour en ajouter.` : r.raison === "date" ? "La date et l'heure du rappel sont invalides ou déjà passées." : "Donne un titre au rappel.";
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
  const message = clean(body.message, 1500);
  if (!message) return json({ error: "Message vide" }, 400);
  const q0 = await etatQuota(sql, accountId, acces.niveau);
  if (q0.revenirDansMs > 0) {
    return json({ limite: true, revenirDans: q0.revenirDans, error: `Tu as atteint ta limite de ${lim.messages} messages. Reviens dans ${q0.revenirDans}.`, quota: q0 }, 429);
  }
  const hist = (await sql`SELECT role, texte FROM starvibe_compagnon_messages WHERE account_id = ${accountId} ORDER BY id DESC LIMIT 12`) as { role: string; texte: string }[];
  const rapp = (await sql`SELECT id, titre, quand, repetition FROM starvibe_compagnon_rappels WHERE account_id = ${accountId} AND actif = true ORDER BY quand ASC LIMIT 25`) as { id: number; titre: string; quand: string; repetition: string }[];
  const notes = (await sql`SELECT texte FROM starvibe_compagnon_notes WHERE account_id = ${accountId} ORDER BY id DESC LIMIT 40`) as { texte: string }[];
  const ins = (await sql`INSERT INTO starvibe_compagnon_messages (account_id, role, texte) VALUES (${accountId}, 'user', ${message}) RETURNING id`) as { id: number }[];

  const restantes = Math.max(0, lim.recherches - q0.recherchesUtilisees);
  const contexte = [
    `[Contexte] Date et heure locales de la personne : ${heureLocale(new Date(), tz)} (fuseau ${tz}).`,
    `Rappels actifs : ${rapp.length ? rapp.map((r) => `#${r.id} « ${r.titre} » le ${heureLocale(new Date(r.quand), tz)}${r.repetition ? ` (chaque ${r.repetition === "jour" ? "jour" : r.repetition === "semaine" ? "semaine" : r.repetition === "mois" ? "mois" : "année"})` : ""}`).join(" ; ") : "aucun"}.`,
    `Ce que tu retiens de la personne : ${notes.length ? notes.reverse().map((n) => n.texte).join(" ; ") : "rien pour l'instant"}.`,
    `Recherche Internet : ${restantes > 0 ? `disponible (${restantes} recherche(s) restante(s) aujourd'hui)` : "épuisée pour aujourd'hui : réponds avec tes connaissances et dis-le si tu n'es pas sûr"}.`,
    `[Message de la personne] ${message}`,
  ].join("\n");
  const messagesIA: { role: string; content: unknown }[] = [];
  for (const h of hist.reverse()) {
    const r = h.role === "assistant" ? "assistant" : "user";
    if (messagesIA.length === 0 && r === "assistant") continue;
    if (messagesIA.length && messagesIA[messagesIA.length - 1].role === r) continue;
    messagesIA.push({ role: r, content: h.texte.slice(0, 800) });
  }
  if (messagesIA.length && messagesIA[messagesIA.length - 1].role === "user") messagesIA.pop();
  messagesIA.push({ role: "user", content: contexte });

  let ia: ReponseIA | null = null;
  try { ia = await appelerIA(messagesIA, restantes); } catch { ia = null; }
  if (!ia) {
    await sql`DELETE FROM starvibe_compagnon_messages WHERE id = ${ins[0].id}`; // un message qui n'a pas reçu de réponse ne compte pas
    return json({ error: "Keydou est indisponible un instant. Réessaie dans une minute : ce message n'est pas compté." }, 503);
  }
  if (ia.refus) {
    await sql`INSERT INTO starvibe_compagnon_messages (account_id, role, texte, tokens_in, tokens_out) VALUES (${accountId}, 'assistant', ${"Je ne peux pas t'aider sur ce point. Je suis là pour tes rappels, tes questions du quotidien et ta culture générale."}, ${ia.tokensIn}, ${ia.tokensOut})`;
    return json({ reponse: "Je ne peux pas t'aider sur ce point. Je suis là pour tes rappels, tes questions du quotidien et ta culture générale.", sources: [], rappelsAjoutes: [], quota: await etatQuota(sql, accountId, acces.niveau) });
  }

  let reponse = "", rappelsIA: Record<string, unknown>[] = [], notesIA: unknown[] = [], suppr: unknown[] = [];
  const a = ia.texte.indexOf("{"), z = ia.texte.lastIndexOf("}");
  if (a >= 0 && z > a) {
    try {
      const o = JSON.parse(ia.texte.slice(a, z + 1)) as { reponse?: string; rappels?: unknown; notes?: unknown; supprimer_rappels?: unknown };
      reponse = clean(o.reponse, 1800);
      rappelsIA = Array.isArray(o.rappels) ? (o.rappels as Record<string, unknown>[]).slice(0, 5) : [];
      notesIA = Array.isArray(o.notes) ? o.notes.slice(0, 5) : [];
      suppr = Array.isArray(o.supprimer_rappels) ? o.supprimer_rappels.slice(0, 10) : [];
    } catch { /* texte libre ci-dessous */ }
  }
  if (!reponse) reponse = clean(ia.texte.replace(/[{}]/g, ""), 1200) || "Je n'ai pas bien compris, peux-tu reformuler ?";

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
  if (refusMedoc) reponse += "\n\n(Je n'ai pas enregistré ce rappel : je ne m'occupe pas des médicaments. Parle-en à ton médecin ou à ton pharmacien.)";
  if (refusLimite) reponse += `\n\n(Je n'ai pas pu ajouter ce rappel : tu as déjà ${lim.rappels} rappels actifs.)`;

  await sql`INSERT INTO starvibe_compagnon_messages (account_id, role, texte, recherches, tokens_in, tokens_out) VALUES (${accountId}, 'assistant', ${reponse}, ${ia.recherches}, ${ia.tokensIn}, ${ia.tokensOut})`;
  return json({ reponse, sources: ia.sources.slice(0, 3), rappelsAjoutes: ajoutes, quota: await etatQuota(sql, accountId, acces.niveau) });
};

export const config: Config = { path: "/api/starvibe-compagnon" };
