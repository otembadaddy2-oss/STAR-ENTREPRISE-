// Assistant d'une entreprise sur son site (module « keydou-widget.js »). Sans connexion : la clé publique de l'entreprise identifie l'assistant,
// et seuls les sites déclarés par le gérant (« domaines autorisés ») peuvent l'utiliser depuis un navigateur.
//   GET  ?cle=…                        → nom, message d'accueil (qui dit que c'est une IA), couleur.
//   POST { cle, visiteur, message }    → { reponse, escalade }
// Limites : par visiteur, par adresse, par entreprise, et par forfait (messages du mois) : voir repondreClient().
// Note honnête : l'en-tête « Origin » protège contre l'usage du module sur un autre site, pas contre un script qui le falsifierait ;
// c'est pourquoi le coût reste borné par les limites ci-dessus et par l'arrêt d'urgence.
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db } from "./_db.mts";
import { entrepriseParCle, domaineAutorise, repondreClient, accueilComplet, nomAssistant, masquer, forfaitActif } from "./_entreprise.mts";

const rep = (data: unknown, status: number, origine: string | null) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...(origine ? { "access-control-allow-origin": origine, vary: "Origin" } : { vary: "Origin" }) } });

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();
  const origine = req.headers.get("origin");
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "access-control-allow-origin": origine || "", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "600", vary: "Origin" } });
  }
  let cle = "", visiteur = "", message = "";
  if (req.method === "GET") cle = String(url.searchParams.get("cle") || "");
  else if (req.method === "POST") {
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    cle = String(b.cle || ""); visiteur = String(b.visiteur || ""); message = String(b.message || "");
  } else return rep({ error: "Method not allowed" }, 405, null);

  const e = /^kdpub_[a-f0-9]{20,40}$/.test(cle) ? await entrepriseParCle(sql, cle) : null;
  if (!e || e.ferme) return rep({ error: "Assistant introuvable." }, 404, null);
  if (!domaineAutorise(e.domaines, origine)) return rep({ error: "Ce site n'est pas autorisé à utiliser cet assistant." }, 403, null);

  if (req.method === "GET") {
    const actif = !!(await forfaitActif(sql, e.gerant_id, "assistant"));
    return rep({ nom: e.nom, assistant: nomAssistant(e), accueil: accueilComplet(e), couleur: e.couleur, actif }, 200, origine);
  }
  if (!/^[a-z0-9]{12,40}$/i.test(visiteur)) return rep({ error: "Session invalide." }, 400, origine);
  const ip = (req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const r = await repondreClient(sql, e, { canal: "site", visiteur: masquer(visiteur, `v${e.id}`), ip: ip ? masquer(ip, "ip") : "", texte: message });
  if (r.status !== 200) return rep({ error: r.error, code: r.code }, r.status, origine);
  return rep({ reponse: r.reponse, escalade: !!r.escalade }, 200, origine);
};

export const config: Config = { path: "/api/entreprise-public" };
