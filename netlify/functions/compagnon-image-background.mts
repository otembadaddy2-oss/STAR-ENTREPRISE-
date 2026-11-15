// Fabrication d'une image demandée à Keydou Compagnon (tâche de fond : la discussion répond tout de suite, l'image arrive ensuite).
// Seule la discussion peut la déclencher, grâce à une signature (voir _compagnon2.mts). Le résultat est gardé dans la base.
import { ensureSchema, db } from "./_db.mts";
import { genererImage, verifierImage, verifierDemandeImage, formatImage, nettoyerErreur, noterSante, ECHEC_DE_CONNEXION } from "./_compagnon2.mts";

export default async (req: Request) => {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  if (!id || !verifierImage(id, url.searchParams.get("sig") || "")) return new Response("Non autorisé", { status: 403 });
  await ensureSchema();
  const { sql } = db();
  const r = (await sql`SELECT prompt, format, statut FROM starvibe_compagnon_images WHERE id = ${id}`) as { prompt: string; format: string; statut: string }[];
  if (!r[0] || r[0].statut !== "attente") return new Response("rien à faire");
  // Deuxième contrôle de sécurité, même si la discussion en a déjà fait un.
  const v = verifierDemandeImage(r[0].prompt);
  if (!v.ok) { await sql`UPDATE starvibe_compagnon_images SET statut = 'refuse', erreur = ${v.message}, fini_at = now() WHERE id = ${id}`; return new Response("refusé"); }
  let g;
  try { g = await genererImage(r[0].prompt, formatImage(r[0].format)); }
  catch (e) { g = { ok: false as const, refus: false, erreur: `exception : ${nettoyerErreur(String((e as Error)?.message || e))}` }; }
  if (g.ok) await noterSante(sql, "images", true); else if (!g.refus && ECHEC_DE_CONNEXION.test(g.erreur)) await noterSante(sql, "images", false, g.erreur);
  if (g.ok) await sql`UPDATE starvibe_compagnon_images SET statut = 'ok', mime = ${g.mime}, data_b64 = ${g.b64}, fini_at = now() WHERE id = ${id}`;
  else await sql`UPDATE starvibe_compagnon_images SET statut = ${g.refus ? "refuse" : "erreur"}, erreur = ${g.erreur}, fini_at = now() WHERE id = ${id}`;
  return new Response("ok");
};
