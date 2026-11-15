// Réponse à un message WhatsApp d'un client (tâche de fond : le webhook a déjà répondu « 200 » à Meta).
// Seul le webhook peut la déclencher, grâce à une signature (voir _entreprise.mts). Le numéro du client n'est jamais gardé : seulement une empreinte.
import { ensureSchema, db } from "./_db.mts";
import { dechiffrer, masquer, repondreClient, verifierCorps, type Entreprise } from "./_entreprise.mts";

const MESSAGE_NON_TEXTE = "Je lis seulement les messages écrits pour le moment. Pouvez-vous m'écrire votre question ?";

export async function envoyerWhatsApp(phoneId: string, token: string, a: string, texte: string): Promise<boolean> {
  const version = process.env.WHATSAPP_GRAPH_VERSION || "v21.0";
  const base = (process.env.WHATSAPP_API_BASE || "https://graph.facebook.com").replace(/\/+$/, "");
  const r = await fetch(`${base}/${version}/${phoneId}/messages`, {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to: a, type: "text", text: { body: texte.slice(0, 3500), preview_url: false } }), signal: AbortSignal.timeout(15000),
  });
  return r.ok;
}

export default async (req: Request) => {
  const brut = await req.text();
  if (!verifierCorps(brut, req.headers.get("x-sig") || "")) return new Response("Non autorisé", { status: 403 });
  const m = JSON.parse(brut) as { phone: string; from: string; id: string; type: string; texte: string };
  await ensureSchema();
  const { sql } = db();
  const e = ((await sql`SELECT * FROM starvibe_entreprises WHERE wa_phone_id = ${m.phone} AND wa_actif = true AND ferme = false`) as Entreprise[])[0];
  if (!e) return new Response("entreprise inconnue");
  const deja = (await sql`SELECT 1 FROM starvibe_entreprise_conv WHERE entreprise_id = ${e.id} AND ext_id = ${m.id} LIMIT 1`) as unknown[];
  if (deja.length) return new Response("déjà traité");   // Meta renvoie parfois le même message : on ne répond qu'une fois
  const token = dechiffrer(e.wa_token_chiffre);
  if (!token) return new Response("jeton absent");
  let texte: string;
  if (m.type !== "text" || !m.texte.trim()) texte = MESSAGE_NON_TEXTE;
  else {
    const r = await repondreClient(sql, e, { canal: "whatsapp", visiteur: masquer(m.from, `wa${e.id}`), texte: m.texte, extId: m.id });
    if (r.status === 200) texte = r.reponse || "";
    else if (r.code === "ferme") return new Response("fermé");
    else texte = r.error || "L'assistant est indisponible un instant.";
  }
  const ok = await envoyerWhatsApp(m.phone, token, m.from, texte);
  return new Response(ok ? "envoyé" : "échec d'envoi");
};
