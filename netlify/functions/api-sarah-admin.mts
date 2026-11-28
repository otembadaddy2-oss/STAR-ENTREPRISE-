// Console de Sarah (équipe STAR ENTREPRISE seulement) : connexion de la ligne WhatsApp, conversations, reprise par une personne, pause de l'IA.
//   GET  ?etat=1                       → état de la connexion, des variables nécessaires (oui/non, jamais les valeurs) et chiffres du jour
//   GET  ?contacts=1[&filtre=a_repondre] → conversations (celles à reprendre d'abord)
//   GET  ?conv=<tel_hash>              → messages d'une conversation
//   POST { action: configurer | urgence | tester | repondre | pause | reprendre | traite | effacer }
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";
import { chiffrer, dechiffrer, nettoyer } from "./_entreprise.mts";
import { CLES, NUMERO_SERVICE, NUMERO_SERVICE_LISIBLE, configSarah, ecrireReglage, envoyerWhatsApp, etatEnvironnement } from "./_sarah.mts";

const ORG_STAFF = "star_entreprise";
const PAUSE_HEURES = () => Number(process.env.SARAH_PAUSE_HEURES) > 0 ? Number(process.env.SARAH_PAUSE_HEURES) : 2;
const chiffres = (s: string) => String(s || "").replace(/\D/g, "");
const masquerId = (s: string) => (s.length <= 6 ? s : s.slice(0, 3) + "•".repeat(s.length - 6) + s.slice(-3));

export default async (req: Request, _context: Context) => {
  const session = await requireAuth(req);
  if (!session) return json({ error: "Non authentifié" }, 401);
  if (session.org !== ORG_STAFF) return json({ error: "Réservé à l'équipe STAR ENTREPRISE" }, 403);
  await ensureSchema();
  const { sql } = db();
  const url = new URL(req.url);

  if (req.method === "GET") {
    if (url.searchParams.get("etat") === "1") {
      const cfg = await configSarah(sql as never); const env = etatEnvironnement();
      const st = ((await sql`SELECT (SELECT COUNT(*) FROM starvibe_sarah_msg WHERE created_at > now() - interval '24 hours' AND role = 'user') AS recus,
        (SELECT COUNT(*) FROM starvibe_sarah_msg WHERE created_at > now() - interval '24 hours' AND role = 'assistant' AND auteur = 'sarah') AS repondus,
        (SELECT COUNT(*) FROM starvibe_sarah_contacts) AS contacts, (SELECT COUNT(*) FROM starvibe_sarah_contacts WHERE a_repondre = true) AS a_reprendre,
        (SELECT COALESCE(SUM(tokens_in),0) FROM starvibe_sarah_msg WHERE created_at > now() - interval '24 hours') AS tin, (SELECT COALESCE(SUM(tokens_out),0) FROM starvibe_sarah_msg WHERE created_at > now() - interval '24 hours') AS tout`) as Record<string, string>[])[0];
      const pret = env.jwt && env.ia && env.verifyToken && env.secretApp && !!cfg.phoneId && !!cfg.token;
      return json({
        numero: NUMERO_SERVICE_LISIBLE, urlWebhook: `${url.origin}/api/sarah-whatsapp`,
        connexion: { phoneId: masquerId(cfg.phoneId), jeton: !!cfg.token, actif: cfg.actif, urgence: cfg.urgence },
        env, pret: pret && cfg.actif && !cfg.urgence,
        manque: [!env.jwt && "JWT_SECRET", !env.ia && "ANTHROPIC_API_KEY", !env.verifyToken && "WHATSAPP_VERIFY_TOKEN", !env.secretApp && "WHATSAPP_APP_SECRET", !cfg.phoneId && "identifiant du numéro (phone_number_id)", !cfg.token && "jeton d'accès WhatsApp", !cfg.actif && "activation de la ligne"].filter(Boolean),
        stats: { recus24h: Number(st.recus), repondus24h: Number(st.repondus), contacts: Number(st.contacts), aReprendre: Number(st.a_reprendre), tokensEntree24h: Number(st.tin), tokensSortie24h: Number(st.tout) },
      });
    }
    if (url.searchParams.get("contacts") === "1") {
      const f = url.searchParams.get("filtre") === "a_repondre";
      const l = (f
        ? await sql`SELECT c.*, (SELECT texte FROM starvibe_sarah_msg m WHERE m.tel_hash = c.tel_hash ORDER BY id DESC LIMIT 1) AS dernier FROM starvibe_sarah_contacts c WHERE c.a_repondre = true ORDER BY c.dernier_message DESC LIMIT 100`
        : await sql`SELECT c.*, (SELECT texte FROM starvibe_sarah_msg m WHERE m.tel_hash = c.tel_hash ORDER BY id DESC LIMIT 1) AS dernier FROM starvibe_sarah_contacts c ORDER BY c.a_repondre DESC, c.dernier_message DESC LIMIT 100`) as Record<string, unknown>[];
      return json({ contacts: l.map((c) => ({ id: c.tel_hash, nom: c.nom, tel: dechiffrer(String(c.tel_chiffre || "")), statut: c.statut, motif: c.motif, pauseJusqu: c.pause_ia_jusqu, aRepondre: c.a_repondre, nb: c.nb_messages, dernierMessage: c.dernier_message, dernier: String(c.dernier || "").slice(0, 140) })) });
    }
    const conv = url.searchParams.get("conv");
    if (conv) {
      const m = (await sql`SELECT id, role, auteur, texte, escalade, created_at FROM starvibe_sarah_msg WHERE tel_hash = ${nettoyer(conv, 64)} ORDER BY id DESC LIMIT 100`) as Record<string, unknown>[];
      return json({ messages: m.reverse() });
    }
    return json({ error: "Action inconnue" }, 400);
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(b.action || "");

  if (action === "configurer") {
    const phone = chiffres(nettoyer(b.phone_id, 40)); const token = nettoyer(b.token, 800);
    if (b.actif === false) { await ecrireReglage(sql as never, CLES.actif, "off"); return json({ ok: true, actif: false }); }
    if (phone.length < 8) return json({ error: "Identifiant du numéro WhatsApp (phone_number_id) invalide" }, 400);
    const ancien = await configSarah(sql as never);
    if (!token && !ancien.token) return json({ error: "Jeton d'accès WhatsApp manquant" }, 400);
    await ecrireReglage(sql as never, CLES.phone, phone);
    if (token) await ecrireReglage(sql as never, CLES.token, chiffrer(token));
    await ecrireReglage(sql as never, CLES.actif, "on");
    return json({ ok: true, actif: true });
  }
  if (action === "urgence") { await ecrireReglage(sql as never, CLES.urgence, b.on ? "on" : "off"); return json({ ok: true, urgence: !!b.on }); }
  if (action === "tester") {   // interroge Meta : le numéro branché est-il bien celui du service à la clientèle ?
    const cfg = await configSarah(sql as never);
    if (!cfg.phoneId || !cfg.token) return json({ ok: false, error: "Identifiant du numéro ou jeton manquant" }, 400);
    try {
      const base = (process.env.WHATSAPP_API_BASE || "https://graph.facebook.com").replace(/\/+$/, ""); const v = process.env.WHATSAPP_GRAPH_VERSION || "v21.0";
      const r = await fetch(`${base}/${v}/${cfg.phoneId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`, { headers: { authorization: `Bearer ${cfg.token}` }, signal: AbortSignal.timeout(12000) });
      const d = (await r.json().catch(() => ({}))) as { display_phone_number?: string; verified_name?: string; quality_rating?: string; code_verification_status?: string; error?: { message?: string } };
      if (!r.ok) return json({ ok: false, error: d.error?.message || `Meta a répondu ${r.status}` }, 200);
      const bonNumero = chiffres(d.display_phone_number || "").endsWith(chiffres(NUMERO_SERVICE).slice(-9));
      return json({ ok: true, numeroMeta: d.display_phone_number || "", nomVerifie: d.verified_name || "", qualite: d.quality_rating || "", bonNumero, message: bonNumero ? "Connexion réussie : le numéro correspond au service à la clientèle." : `Attention : ce numéro (${d.display_phone_number || "inconnu"}) n'est pas ${NUMERO_SERVICE_LISIBLE}.` });
    } catch { return json({ ok: false, error: "Meta n'a pas répondu à temps" }, 200); }
  }
  const tel = nettoyer(b.tel_hash, 64);
  const c = tel ? (((await sql`SELECT * FROM starvibe_sarah_contacts WHERE tel_hash = ${tel}`) as { tel_chiffre: string }[])[0]) : null;
  if (!c) return json({ error: "Conversation introuvable" }, 404);
  if (action === "repondre") {
    const texte = nettoyer(b.texte, 3500); if (!texte) return json({ error: "Message vide" }, 400);
    const cfg = await configSarah(sql as never); if (!cfg.phoneId || !cfg.token) return json({ error: "La ligne WhatsApp n'est pas connectée" }, 400);
    const ok = await envoyerWhatsApp(cfg.phoneId, cfg.token, dechiffrer(c.tel_chiffre), texte);
    await sql`INSERT INTO starvibe_sarah_msg (tel_hash, role, auteur, texte) VALUES (${tel}, 'assistant', 'equipe', ${texte})`;
    await sql`UPDATE starvibe_sarah_contacts SET statut = 'humain', a_repondre = false, pause_ia_jusqu = now() + make_interval(hours => ${PAUSE_HEURES()}) WHERE tel_hash = ${tel}`;
    return json({ ok, envoye: ok, avertissement: ok ? undefined : "Meta n'a pas livré le message (la fenêtre de 24 h après le dernier message du client est peut-être fermée)." });
  }
  if (action === "pause") { const h = Math.min(72, Math.max(1, Math.round(Number(b.heures)) || PAUSE_HEURES())); await sql`UPDATE starvibe_sarah_contacts SET pause_ia_jusqu = now() + make_interval(hours => ${h}), statut = 'humain' WHERE tel_hash = ${tel}`; return json({ ok: true, heures: h }); }
  if (action === "reprendre") { await sql`UPDATE starvibe_sarah_contacts SET pause_ia_jusqu = NULL, statut = 'ia', motif = '' WHERE tel_hash = ${tel}`; return json({ ok: true }); }
  if (action === "traite") { await sql`UPDATE starvibe_sarah_contacts SET a_repondre = false, motif = '', statut = CASE WHEN statut = 'escalade' THEN 'ia' ELSE statut END WHERE tel_hash = ${tel}`; return json({ ok: true }); }
  if (action === "effacer") { await sql`DELETE FROM starvibe_sarah_msg WHERE tel_hash = ${tel}`; await sql`DELETE FROM starvibe_sarah_contacts WHERE tel_hash = ${tel}`; return json({ ok: true }); }
  return json({ error: "Action inconnue" }, 400);
};

export const config: Config = { path: "/api/sarah-admin" };
