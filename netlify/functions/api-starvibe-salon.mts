// Le Salon KOMYO — appel vidéo en groupe, famille ou amis (LiveKit).
// Membre (jeton KOMYO) :
//   GET  ?acces=1            → { visible, peutCreer, niveau, limites, testeur, salonEnCours }  (la carte de l'accueil s'affiche si visible)
//   GET  ?salon=CODE         → infos du salon (nom, type, hôte, fin, places)
//   POST { action:"creer", nom, type:"famille"|"amis" }  → { code, lien }
//   POST { action:"entrer", code }                       → { url, jeton, identite, nom, hote, finAt, max, lien }
//   POST { action:"couper"|"retirer", code, identite }   (hôte seulement)
//   POST { action:"fermer", code }                       (hôte seulement)
// Équipe (jeton staff) :
//   GET  ?admin=1            → réglages, usage, coût estimé, derniers salons
//   POST { action:"ouvrir", on }  ·  { action:"testeur", telephone, actif }
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";
import { last9 } from "./_push.mts";
import { hasActiveFamille } from "./_premium.mts";
import { codeDe } from "./_parrainage.mts";
import { LIMITES, TARIF_MINUTE_USD, niveauEffectif, verdictPour, nouveauCode, codeValide, minutesEstimees, configLk, creerPiece, assurerPiece, jetonEntree, retirer, couperMicro, fermerPiece } from "./_salon.mts";

const ORG_MEMBRE = "star_vibe";
const ORG_STAFF = "star_entreprise";
const SITE = "https://komyo.starentreprise.com";

// deno-lint-ignore no-explicit-any
async function reglageOuvert(sql: any): Promise<boolean> {
  return ((await sql`SELECT value FROM starvibe_settings WHERE key = 'salon_ouvert'`) as { value: string }[])[0]?.value === "on";
}
// deno-lint-ignore no-explicit-any
async function nomDe(sql: any, accountId: number): Promise<string> {
  const r = (await sql`SELECT p.nom, a.telephone FROM starvibe_accounts a LEFT JOIN starvibe_profiles p ON p.account_id = a.id AND p.type_profil <> 'enfant' WHERE a.id = ${accountId} ORDER BY p.id LIMIT 1`) as { nom: string | null; telephone: string }[];
  const n = (r[0]?.nom || "").trim();
  return n || ("Membre " + String(r[0]?.telephone || "").slice(-3));
}

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();
  const url = new URL(req.url);
  const session = await requireAuth(req);
  if (!session) return json({ error: "Non authentifié" }, 401);
  const staff = session.org === ORG_STAFF;

  // ================= ÉQUIPE =================
  if (url.searchParams.get("admin") === "1" || (req.method === "POST" && staff)) {
    if (!staff) return json({ error: "Non autorisé" }, 403);
    if (req.method === "GET") {
      const ouvert = await reglageOuvert(sql);
      const u = (await sql`SELECT COUNT(DISTINCT s.id) AS salons, COUNT(e.id) AS entrees, COALESCE(SUM(e.minutes), 0) AS minutes FROM starvibe_salons s LEFT JOIN starvibe_salon_entrees e ON e.salon_id = s.id WHERE s.debut_at > now() - interval '30 days'`) as { salons: string; entrees: string; minutes: string }[];
      const min = Number(u[0].minutes);
      const testeurs = (await sql`SELECT t.account_id, a.telephone, p.nom FROM starvibe_salon_acces t JOIN starvibe_accounts a ON a.id = t.account_id LEFT JOIN starvibe_profiles p ON p.account_id = t.account_id AND p.type_profil = 'personnel' ORDER BY t.created_at DESC LIMIT 100`) as Record<string, unknown>[];
      const salons = (await sql`SELECT s.code, s.nom, s.type, s.max_personnes, s.duree_min, s.famille, s.debut_at, s.ferme_at, a.telephone, (SELECT COUNT(*) FROM starvibe_salon_entrees e WHERE e.salon_id = s.id) AS entrees FROM starvibe_salons s JOIN starvibe_accounts a ON a.id = s.hote_id ORDER BY s.id DESC LIMIT 30`) as Record<string, unknown>[];
      return json({
        ouvert, pret: configLk().pret, limites: LIMITES, tarifMinuteUsd: TARIF_MINUTE_USD,
        usage30j: { salons: Number(u[0].salons), entrees: Number(u[0].entrees), minutesParticipantsEstimees: min, coutEstimeUsd: Math.round(min * TARIF_MINUTE_USD * 100) / 100 },
        testeurs: testeurs.map((t) => ({ accountId: t.account_id, telephone: t.telephone, nom: t.nom || "" })),
        salons: salons.map((s) => ({ code: s.code, nom: s.nom, type: s.type, max: s.max_personnes, dureeMin: s.duree_min, famille: !!s.famille, debut: s.debut_at, ferme: s.ferme_at, hote: s.telephone, entrees: Number(s.entrees) })),
      });
    }
    let b: Record<string, unknown> = {};
    try { b = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }
    if (b.action === "ouvrir") {
      await sql`INSERT INTO starvibe_settings (key, value) VALUES ('salon_ouvert', ${b.on ? "on" : "off"}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
      return json({ ok: true });
    }
    if (b.action === "testeur") {
      const tel = last9(String(b.telephone || ""));
      if (tel.length < 8) return json({ error: "Numéro de téléphone invalide" }, 400);
      const c = (await sql`SELECT id FROM starvibe_accounts WHERE RIGHT(regexp_replace(telephone, '[^0-9]', '', 'g'), 9) = ${tel} LIMIT 2`) as { id: number }[];
      if (c.length === 0) return json({ error: "Aucun compte KOMYO avec ce numéro : la personne doit d'abord créer son compte." }, 404);
      if (c.length > 1) return json({ error: "Plusieurs comptes avec ce numéro : précisez-le avec l'indicatif." }, 409);
      if (b.actif === false) await sql`DELETE FROM starvibe_salon_acces WHERE account_id = ${c[0].id}`;
      else await sql`INSERT INTO starvibe_salon_acces (account_id) VALUES (${c[0].id}) ON CONFLICT (account_id) DO NOTHING`;
      return json({ ok: true, accountId: c[0].id, actif: b.actif !== false });
    }
    return json({ error: "Action inconnue" }, 400);
  }

  // ================= MEMBRE =================
  if (session.org !== ORG_MEMBRE) return json({ error: "Réservé aux membres KOMYO" }, 403);
  const accountId = Number(session.sub);
  if (!accountId) return json({ error: "Compte invalide" }, 401);
  const famille = await hasActiveFamille(sql, accountId);
  const ouvert = await reglageOuvert(sql);
  const testeur = ((await sql`SELECT 1 FROM starvibe_salon_acces WHERE account_id = ${accountId}`) as unknown[]).length > 0;
  const niveau = niveauEffectif(famille, testeur);
  const peutCreerAcces = ouvert || testeur;

  async function quotas() {
    const sem = (await sql`SELECT COUNT(*) AS n FROM starvibe_salons WHERE hote_id = ${accountId} AND debut_at > now() - interval '7 days'`) as { n: string }[];
    const mois = (await sql`SELECT COALESCE(SUM(e.minutes), 0) AS m FROM starvibe_salon_entrees e JOIN starvibe_salons s ON s.id = e.salon_id WHERE s.hote_id = ${accountId} AND s.debut_at > now() - interval '30 days'`) as { m: string }[];
    return { semaine: Number(sem[0].n), minutesMois: Number(mois[0].m) };
  }

  if (req.method === "GET" && url.searchParams.get("acces") === "1") {
    const q = await quotas(); const v = verdictPour(niveau, testeur && !famille, q.semaine, q.minutesMois);
    // Le salon encore ouvert de cette personne : elle peut y revenir ou récupérer son lien, même si elle a quitté la page.
    const enCours = (await sql`SELECT code, nom, fin_at FROM starvibe_salons WHERE hote_id = ${accountId} AND ferme_at IS NULL AND fin_at > now() ORDER BY id DESC LIMIT 1`) as { code: string; nom: string; fin_at: string }[];
    let lienEnCours = ""; if (enCours[0]) { let r = ""; try { r = await codeDe(sql, accountId); } catch { /* sans gravité */ } lienEnCours = `${SITE}/starvibe/salon.html?s=${enCours[0].code}${r ? "&ref=" + encodeURIComponent(r) : ""}`; }
    return json({ visible: peutCreerAcces, peutCreer: peutCreerAcces && v.ok, raison: peutCreerAcces ? v.raison : "Le Salon est en test fermé : il s'ouvrira bientôt à tous les membres.", niveau, limites: LIMITES[niveau], famille, testeur,
      salonEnCours: enCours[0] ? { code: enCours[0].code, nom: enCours[0].nom, finAt: new Date(String(enCours[0].fin_at)).toISOString(), lien: lienEnCours } : null });
  }

  if (req.method === "GET" && url.searchParams.get("salon")) {
    const code = String(url.searchParams.get("salon")).toUpperCase();
    if (!codeValide(code)) return json({ error: "Lien de salon invalide" }, 400);
    const s = (await sql`SELECT s.*, a.id AS hid FROM starvibe_salons s JOIN starvibe_accounts a ON a.id = s.hote_id WHERE s.code = ${code}`) as Record<string, unknown>[];
    if (!s[0]) return json({ error: "Ce salon n'existe pas." }, 404);
    const fin = new Date(String(s[0].fin_at)); const clos = !!s[0].ferme_at || fin.getTime() <= Date.now();
    return json({ code, nom: s[0].nom, type: s[0].type, max: s[0].max_personnes, finAt: fin.toISOString(), clos, hote: await nomDe(sql, Number(s[0].hote_id)), estHote: Number(s[0].hote_id) === accountId });
  }

  if (req.method !== "POST") return json({ error: "Méthode non permise" }, 405);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }

  if (b.action === "creer") {
    if (!peutCreerAcces) return json({ error: "Le Salon est en test fermé : il s'ouvrira bientôt à tous les membres." }, 403);
    const q = await quotas(); const v = verdictPour(niveau, testeur && !famille, q.semaine, q.minutesMois);
    if (!v.ok) return json({ error: v.raison }, 429);
    if (!configLk().pret) return json({ error: "Le Salon n'est pas encore branché. Réessaie un peu plus tard." }, 503);
    const nom = String(b.nom || "").replace(/\s+/g, " ").trim().slice(0, 40) || (b.type === "amis" ? "Salon entre amis" : "Salon en famille");
    const type = b.type === "amis" ? "amis" : "famille";
    const l = LIMITES[niveau]; const fin = new Date(Date.now() + l.minutes * 60000);
    let code = "";
    for (let i = 0; i < 5 && !code; i++) {
      const c = nouveauCode(); const ex = (await sql`SELECT 1 FROM starvibe_salons WHERE code = ${c}`) as unknown[];
      if (ex.length === 0) code = c;
    }
    if (!code) return json({ error: "Réessaie dans un instant." }, 503);
    try { await creerPiece(code, l.personnes, l.minutes); } catch (e) { return json({ error: "Le service vidéo ne répond pas pour le moment. Réessaie dans un instant." }, 502); }
    await sql`INSERT INTO starvibe_salons (code, hote_id, nom, type, max_personnes, duree_min, famille, fin_at) VALUES (${code}, ${accountId}, ${nom}, ${type}, ${l.personnes}, ${l.minutes}, ${famille}, ${fin.toISOString()})`;
    // Le lien d'invitation porte le code de parrainage de l'hôte : chaque nouveau membre arrivé par le Salon compte pour ses médailles.
    let ref = ""; try { ref = await codeDe(sql, accountId); } catch { /* sans gravité */ }
    return json({ ok: true, code, lien: `${SITE}/starvibe/salon.html?s=${code}${ref ? "&ref=" + encodeURIComponent(ref) : ""}`, nom, type, max: l.personnes, minutes: l.minutes, finAt: fin.toISOString() }, 201);
  }

  const code = String(b.code || "").toUpperCase();
  if (!codeValide(code)) return json({ error: "Lien de salon invalide" }, 400);
  const sr = (await sql`SELECT * FROM starvibe_salons WHERE code = ${code}`) as Record<string, unknown>[];
  const s = sr[0];
  if (!s) return json({ error: "Ce salon n'existe pas." }, 404);
  const estHote = Number(s.hote_id) === accountId;
  const fin = new Date(String(s.fin_at));

  if (b.action === "entrer") {
    if (s.ferme_at || fin.getTime() <= Date.now()) return json({ error: "Ce salon est terminé. Demande à ton proche d'en ouvrir un nouveau." }, 410);
    if (!configLk().pret) return json({ error: "Le Salon n'est pas encore branché. Réessaie un peu plus tard." }, 503);
    const nom = await nomDe(sql, accountId);
    const identite = `m${accountId}`;
    await assurerPiece(code, Number(s.max_personnes), fin);
    const jeton = await jetonEntree(code, identite, nom, Math.ceil((fin.getTime() - Date.now()) / 1000));
    let ref = ""; try { ref = await codeDe(sql, accountId); } catch { /* sans gravité */ }
    const lien = `${SITE}/starvibe/salon.html?s=${code}${ref ? "&ref=" + encodeURIComponent(ref) : ""}`;
    await sql`INSERT INTO starvibe_salon_entrees (salon_id, account_id, minutes) VALUES (${Number(s.id)}, ${accountId}, ${minutesEstimees(fin)})`;
    return json({ ok: true, url: configLk().url, jeton, identite, nom, hote: estHote, finAt: fin.toISOString(), max: Number(s.max_personnes), nomSalon: s.nom, lien });
  }

  if (b.action === "couper" || b.action === "retirer" || b.action === "fermer") {
    if (!estHote) return json({ error: "Seule la personne qui a ouvert le salon peut faire cela." }, 403);
    try {
      if (b.action === "fermer") { await fermerPiece(code).catch(() => null); await sql`UPDATE starvibe_salons SET ferme_at = now() WHERE code = ${code} AND ferme_at IS NULL`; return json({ ok: true }); }
      const ident = String(b.identite || "");
      if (!/^m\d{1,12}$/.test(ident)) return json({ error: "Personne inconnue" }, 400);
      if (ident === `m${accountId}`) return json({ error: "Tu ne peux pas le faire sur toi-même : utilise tes propres boutons." }, 400);
      if (b.action === "retirer") await retirer(code, ident); else await couperMicro(code, ident);
      return json({ ok: true });
    } catch { return json({ error: "Le service vidéo ne répond pas pour le moment. Réessaie." }, 502); }
  }
  return json({ error: "Action inconnue" }, 400);
};

export const config: Config = {
  path: "/api/starvibe-salon",
};
