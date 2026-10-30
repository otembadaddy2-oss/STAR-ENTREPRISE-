// REÇUS DE PAIEMENT KOMYO — consultation et suivi.
// GET  ?mes=1      (abonné)  : mes reçus, du plus récent au plus ancien.
// GET  ?staff=1    (staff)   : les derniers reçus avec l'état d'envoi WhatsApp et un lien pour l'envoyer à la main.
// POST { action: "renvoyer", id }      (staff) : retente l'envoi automatique WhatsApp.
// POST { action: "marque_envoye", id } (staff) : l'équipe l'a envoyé à la main (lien WhatsApp pré-rempli).
import type { Context, Config } from "@netlify/functions";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";
import { envoyerWhatsApp, numeroWhatsApp } from "./_recu.mts";

const ORG = "star_vibe";
const STAFF_ORG = "star_entreprise";

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();
  const url = new URL(req.url);
  const session = await requireAuth(req);

  if (req.method === "GET" && url.searchParams.get("mes") === "1") {
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
    const rows = (await sql`
      SELECT numero, titre, montant, expire_le, texte, created_at FROM starvibe_recus
      WHERE account_id = ${Number(session.sub)} ORDER BY id DESC LIMIT 50
    `) as Record<string, unknown>[];
    return json({ recus: rows.map((r) => ({ numero: r.numero, titre: r.titre, montant: r.montant, expireLe: r.expire_le, texte: r.texte, date: r.created_at })) });
  }

  // ----- staff -----
  if (!session || session.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);

  if (req.method === "GET" && url.searchParams.get("staff") === "1") {
    const rows = (await sql`SELECT id, numero, titre, montant, telephone, statut, erreur, texte, expire_le, created_at FROM starvibe_recus ORDER BY id DESC LIMIT 100`) as Record<string, unknown>[];
    return json({
      auto: !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID),
      recus: rows.map((r) => ({
        id: r.id, numero: r.numero, titre: r.titre, montant: r.montant, telephone: r.telephone, statut: r.statut, erreur: r.erreur, date: r.created_at, expireLe: r.expire_le,
        lienWhatsApp: r.telephone ? `https://wa.me/${r.telephone}?text=${encodeURIComponent(String(r.texte))}` : "",
      })),
    });
  }

  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    const id = Number(body.id);
    if (!id) return json({ error: "id requis" }, 400);
    const r = ((await sql`SELECT * FROM starvibe_recus WHERE id = ${id} LIMIT 1`) as Record<string, unknown>[])[0];
    if (!r) return json({ error: "Reçu introuvable" }, 404);
    if (body.action === "marque_envoye") {
      await sql`UPDATE starvibe_recus SET statut = 'envoye_manuel', envoye_le = now() WHERE id = ${id}`;
      return json({ ok: true });
    }
    if (body.action === "renvoyer") {
      const wa = numeroWhatsApp(String(r.telephone));
      if (!wa) return json({ error: "Pas de numéro valide pour ce reçu" }, 400);
      const res = await envoyerWhatsApp(wa, Array.isArray(r.variables) ? (r.variables as string[]) : []);
      await sql`UPDATE starvibe_recus SET statut = ${res.etat}, erreur = ${res.erreur || ""}, wa_message_id = ${res.id || ""}, envoye_le = ${res.etat === "envoye" ? sql`now()` : null} WHERE id = ${id}`;
      return json({ statut: res.etat, erreur: res.erreur || "" });
    }
  }
  return json({ error: "Requête inconnue" }, 400);
};

export const config: Config = { path: "/api/starvibe-recus" };
