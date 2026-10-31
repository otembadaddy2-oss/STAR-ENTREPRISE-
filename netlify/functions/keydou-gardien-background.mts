// Contrôle immédiat d'une vidéo PIOUPIOU, lancé par la publication (tâche de fond : la réponse part tout de suite, l'analyse
// continue ensuite). Seule la publication peut le déclencher, grâce à une signature (voir _gardien.mts).
import type { Config } from "@netlify/functions";
import { ensureSchema, db } from "./_db.mts";
import { analyserVideo, verifierAnalyse } from "./_gardien.mts";

export default async (req: Request) => {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  if (!id || !verifierAnalyse(id, url.searchParams.get("sig") || "")) return new Response("Non autorisé", { status: 403 });
  await ensureSchema();
  const { sql } = db();
  await analyserVideo(sql, id);
  return new Response("ok");
};
