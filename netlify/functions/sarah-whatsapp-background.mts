// Réponse de Sarah à un message WhatsApp (tâche de fond : le webhook a déjà répondu « 200 » à Meta).
// Seul le webhook peut la déclencher, grâce à une signature (voir _sarah.mts). Le numéro du client n'est gardé que chiffré (pour que l'équipe puisse le rappeler) ; messages effacés après 90 jours.
import { ensureSchema, db } from "./_db.mts";
import { purgerAnciens, traiterMessage, verifierCorpsSarah, type MessageEntrant } from "./_sarah.mts";

export default async (req: Request) => {
  const brut = await req.text();
  if (!verifierCorpsSarah(brut, req.headers.get("x-sig") || "")) return new Response("Non autorisé", { status: 403 });
  const m = JSON.parse(brut) as MessageEntrant;
  await ensureSchema();
  const { sql } = db();
  const r = await traiterMessage(sql as never, m);
  if (Math.random() < 0.02) await purgerAnciens(sql as never).catch(() => { });   // ménage de temps en temps
  return new Response(r.statut);
};
