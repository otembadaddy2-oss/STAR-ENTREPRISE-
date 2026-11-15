// ÉCLAT — le direct de KOMYO (LiveKit).
// Membre (jeton KOMYO) :
//   GET  (rien)                      → { inscrit, total }                       liste d'attente
//   GET  ?directs=1                  → { visible, peutDiffuser, ouvert, directs:[{code,titre,hote,photo,debut}], monDirect }
//   POST { action:"rejoindre"|"quitter" }                                       liste d'attente
//   POST { action:"demarrer", titre }       → { code, url, jeton, identite, nom, titre, finAt }   (animateur)
//   POST { action:"regarder", code, spectateur? } → { url, jeton, identite, nom, hote, animateur, titre, finAt, hoteIdentite, hoteNom }
//   POST { action:"notifier", subscription } → ce téléphone est prévenu quand les personnes suivies passent en direct
//   POST { action:"battement", code }       (animateur : signe de vie toutes les 30 s)  → { ok, fini }
//   POST { action:"terminer"|"retirer", code, identite? }   (animateur seulement)
// Équipe (jeton staff) :  GET ?admin=1 → { ouvert, pret, directs }   ·   POST { action:"ouvrir", on }
// Pendant le test fermé : seuls les testeurs (ceux du Salon) peuvent diffuser et regarder ; ensuite, « ouvert à tous ».
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";
import { configLk, creerPiece, fermerPiece, retirer, nouveauCode, codeValide } from "./_salon.mts";
import { PLAFOND_SPECTATEURS, DUREE_MAX_MIN, DIRECTS_PAR_JOUR, BATTEMENT_MAX_S, titreNettoye, identiteDe, identiteSpectateur, identiteValide, jetonDirect, prevenirAbonnes } from "./_eclat.mts";
import { pushCompte } from "./_compagnon.mts";

const ORG = "star_vibe";
const ORG_STAFF = "star_entreprise";

// deno-lint-ignore no-explicit-any
async function reglageOuvert(sql: any): Promise<boolean> {
  return ((await sql`SELECT value FROM starvibe_settings WHERE key = 'eclat_ouvert'`) as { value: string }[])[0]?.value === "on";
}
// deno-lint-ignore no-explicit-any
async function identiteVisible(sql: any, accountId: number): Promise<{ nom: string; photo: string }> {
  const r = (await sql`SELECT p.nom, p.photo_key, a.telephone FROM starvibe_accounts a LEFT JOIN starvibe_profiles p ON p.account_id = a.id AND p.type_profil <> 'enfant' WHERE a.id = ${accountId} ORDER BY p.id LIMIT 1`) as { nom: string | null; photo_key: string | null; telephone: string | null }[];
  const n = (r[0]?.nom || "").trim();
  return { nom: n || ("Membre " + String(r[0]?.telephone || "").slice(-3)), photo: r[0]?.photo_key ? `/api/starvibe-photo?key=${encodeURIComponent(r[0].photo_key)}` : "" };
}

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();
  const url = new URL(req.url);
  const session = await requireAuth(req);
  if (!session) return json({ error: "Non authentifié" }, 401);

  // ================= ÉQUIPE =================
  if (session.org === ORG_STAFF) {
    if (req.method === "GET" && url.searchParams.get("admin") === "1") {
      const d = (await sql`SELECT d.code, d.titre, d.debut_at, d.ferme_at, a.telephone FROM starvibe_eclat_directs d JOIN starvibe_accounts a ON a.id = d.hote_id ORDER BY d.id DESC LIMIT 15`) as Record<string, unknown>[];
      return json({ ouvert: await reglageOuvert(sql), pret: configLk().pret, directs: d.map((x) => ({ code: x.code, titre: x.titre, debut: x.debut_at, ferme: x.ferme_at, hote: x.telephone })) });
    }
    if (req.method === "POST") {
      let b: Record<string, unknown> = {};
      try { b = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }
      if (b.action === "ouvrir") {
        await sql`INSERT INTO starvibe_settings (key, value) VALUES ('eclat_ouvert', ${b.on ? "on" : "off"}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
        return json({ ok: true });
      }
    }
    return json({ error: "Non autorisé" }, 403);
  }

  // ================= MEMBRE =================
  if (session.org !== ORG) return json({ error: "Non authentifié" }, 401);
  const accountId = Number(session.sub);
  if (!accountId) return json({ error: "Compte invalide" }, 401);
  const ouvert = await reglageOuvert(sql);
  const testeur = ((await sql`SELECT 1 FROM starvibe_salon_acces WHERE account_id = ${accountId}`) as unknown[]).length > 0;
  const acces = ouvert || testeur;
  const MSG_FERME = "ÉCLAT est en test fermé : le direct s'ouvrira bientôt à tous les membres.";

  if (req.method === "GET" && url.searchParams.get("directs") === "1") {
    let directs: Record<string, unknown>[] = []; let monDirect: { code: string } | null = null;
    if (acces) {
      directs = (await sql`SELECT d.code, d.titre, d.debut_at, d.hote_id FROM starvibe_eclat_directs d WHERE d.ferme_at IS NULL AND d.fin_at > now() AND d.vu_at > now() - interval '90 seconds' ORDER BY d.debut_at DESC LIMIT 20`) as Record<string, unknown>[];
      const m = directs.find((d) => Number(d.hote_id) === accountId); if (m) monDirect = { code: String(m.code) };
    }
    const liste = [];
    for (const d of directs) { const i = await identiteVisible(sql, Number(d.hote_id)); liste.push({ code: d.code, titre: d.titre, hote: i.nom, photo: i.photo, debut: new Date(String(d.debut_at)).toISOString() }); }
    return json({ visible: acces, peutDiffuser: acces, ouvert, raison: acces ? "" : MSG_FERME, directs: liste, monDirect });
  }

  if (req.method === "POST") {
    let b: Record<string, unknown> = {};
    try { b = await req.json(); } catch { /* corps vide */ }

    if (b.action === "rejoindre") { await sql`INSERT INTO starvibe_eclat_attente (account_id) VALUES (${accountId}) ON CONFLICT (account_id) DO NOTHING`; }
    else if (b.action === "quitter") { await sql`DELETE FROM starvibe_eclat_attente WHERE account_id = ${accountId}`; }
    else if (b.action === "notifier") {
      const sub = (b.subscription || {}) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return json({ error: "Abonnement invalide" }, 400);
      await sql`INSERT INTO starvibe_compagnon_push (account_id, endpoint, p256dh, auth, label) VALUES (${accountId}, ${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth}, ${String(b.label || "").slice(0, 60)})
        ON CONFLICT (endpoint) DO UPDATE SET account_id = ${accountId}, p256dh = ${sub.keys.p256dh}, auth = ${sub.keys.auth}`;
      return json({ ok: true });
    }
    else if (b.action === "demarrer") {
      if (!acces) return json({ error: MSG_FERME }, 403);
      if (!configLk().pret) return json({ error: "ÉCLAT n'est pas encore branché. Réessaie un peu plus tard." }, 503);
      const jour = (await sql`SELECT COUNT(*)::int AS n FROM starvibe_eclat_directs WHERE hote_id = ${accountId} AND debut_at > now() - interval '24 hours'`) as { n: number }[];
      if (!testeur && (jour[0]?.n || 0) >= DIRECTS_PAR_JOUR) return json({ error: `Tu as déjà fait ${DIRECTS_PAR_JOUR} directs aujourd'hui. Reviens demain.` }, 429);
      // Un seul direct à la fois : l'ancien est fermé proprement.
      const anciens = (await sql`SELECT code FROM starvibe_eclat_directs WHERE hote_id = ${accountId} AND ferme_at IS NULL`) as { code: string }[];
      for (const a of anciens) { await fermerPiece(a.code).catch(() => null); await sql`UPDATE starvibe_eclat_directs SET ferme_at = now() WHERE code = ${a.code}`; }
      let code = "";
      for (let i = 0; i < 5 && !code; i++) { const c = nouveauCode(); if (((await sql`SELECT 1 FROM starvibe_eclat_directs WHERE code = ${c}`) as unknown[]).length === 0) code = c; }
      if (!code) return json({ error: "Réessaie dans un instant." }, 503);
      const fin = new Date(Date.now() + DUREE_MAX_MIN * 60000);
      try { await creerPiece(code, PLAFOND_SPECTATEURS + 1, DUREE_MAX_MIN); } catch { return json({ error: "Le service vidéo ne répond pas pour le moment. Réessaie dans un instant." }, 502); }
      const titre = titreNettoye(b.titre);
      await sql`INSERT INTO starvibe_eclat_directs (code, hote_id, titre, fin_at) VALUES (${code}, ${accountId}, ${titre}, ${fin.toISOString()})`;
      const i = await identiteVisible(sql, accountId);
      const jeton = await jetonDirect(code, identiteDe(accountId), i.nom, true, i.photo, Math.ceil((fin.getTime() - Date.now()) / 1000));
      // Les abonnés sont prévenus sur leur téléphone (sans jamais retarder ni bloquer le direct).
      const prevenus = await prevenirAbonnes(sql, accountId, ouvert, { title: `🔴 ${i.nom} est en direct`, body: titre, tag: "eclat-" + code, url: `/starvibe/eclat.html?v=${code}` }, pushCompte);
      return json({ ok: true, prevenus, code, url: configLk().url, jeton, identite: identiteDe(accountId), nom: i.nom, photo: i.photo, titre, finAt: fin.toISOString(), maxSpectateurs: PLAFOND_SPECTATEURS }, 201);
    } else if (["regarder", "battement", "terminer", "retirer"].includes(String(b.action))) {
      const code = String(b.code || "").toUpperCase();
      if (!codeValide(code)) return json({ error: "Lien de direct invalide" }, 400);
      const r = (await sql`SELECT * FROM starvibe_eclat_directs WHERE code = ${code}`) as Record<string, unknown>[];
      const d = r[0]; if (!d) return json({ error: "Ce direct n'existe pas." }, 404);
      const estHote = Number(d.hote_id) === accountId; const fin = new Date(String(d.fin_at));
      const clos = !!d.ferme_at || fin.getTime() <= Date.now();
      if (b.action === "regarder") {
        if (!acces) return json({ error: MSG_FERME }, 403);
        if (clos) return json({ error: "Ce direct est terminé.", code: "termine" }, 410);
        if (!configLk().pret) return json({ error: "ÉCLAT n'est pas encore branché. Réessaie un peu plus tard." }, 503);
        const moi = await identiteVisible(sql, accountId); const hote = await identiteVisible(sql, Number(d.hote_id));
        // L'animateur qui revient reprend son rôle ; avec « spectateur », même l'animateur regarde sans couper sa propre diffusion.
        const animateur = estHote && b.spectateur !== true; const ident = animateur ? identiteDe(accountId) : identiteSpectateur(accountId);
        const jeton = await jetonDirect(code, ident, moi.nom, animateur, moi.photo, Math.ceil((fin.getTime() - Date.now()) / 1000));
        return json({ ok: true, url: configLk().url, jeton, identite: ident, nom: moi.nom, photo: moi.photo, animateur, titre: d.titre, finAt: fin.toISOString(), hoteIdentite: identiteDe(Number(d.hote_id)), hoteNom: hote.nom });
      }
      if (!estHote) return json({ error: "Seule la personne qui diffuse peut faire cela." }, 403);
      if (b.action === "battement") {
        if (!clos) await sql`UPDATE starvibe_eclat_directs SET vu_at = now() WHERE code = ${code}`;
        return json({ ok: true, fini: clos });
      }
      if (b.action === "terminer") {
        await fermerPiece(code).catch(() => null);
        await sql`UPDATE starvibe_eclat_directs SET ferme_at = now() WHERE code = ${code} AND ferme_at IS NULL`;
        return json({ ok: true });
      }
      const ident = String(b.identite || "");
      if (!identiteValide(ident) || ident === identiteDe(accountId)) return json({ error: "Personne inconnue" }, 400);
      try { await retirer(code, ident); } catch { return json({ error: "Le service vidéo ne répond pas pour le moment. Réessaie." }, 502); }
      return json({ ok: true });
    } else return json({ error: "Action inconnue" }, 400);
  } else if (req.method !== "GET") {
    return json({ error: "Méthode non autorisée" }, 405);
  }

  const mine = (await sql`SELECT 1 FROM starvibe_eclat_attente WHERE account_id = ${accountId}`) as unknown[];
  const total = (await sql`SELECT COUNT(*)::int AS n FROM starvibe_eclat_attente`) as { n: number }[];
  return json({ inscrit: mine.length > 0, total: total[0]?.n || 0 });
};

export const config: Config = {
  path: "/api/starvibe-eclat",
};
