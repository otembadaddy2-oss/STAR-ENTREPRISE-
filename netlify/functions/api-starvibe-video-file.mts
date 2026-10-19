// Sert les fichiers vidéo du fil STAR VIBE, stockés dans Netlify Blobs.
// Prend en charge les requêtes "Range" (indispensable pour que la balise
// <video> puisse lire/avancer une vidéo correctement sur mobile).
import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { ensureSchema, db } from "./_db.mts";
import { verifySignature } from "./_premium.mts";

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "";
  if (!key) return new Response("Missing key", { status: 400 });

  // Vidéo premium : le fichier n'est servi qu'avec un lien signé valide,
  // délivré seulement aux abonnés Famille actifs (voir _premium.mts).
  await ensureSchema();
  const { sql } = db();
  const meta = (await sql`SELECT premium FROM starvibe_videos WHERE blob_key = ${key} LIMIT 1`) as { premium: boolean }[];
  const premium = Boolean(meta[0]?.premium);
  if (premium && !verifySignature(key, url.searchParams.get("exp"), url.searchParams.get("sig"))) {
    return new Response("Contenu réservé aux abonnés", { status: 403 });
  }
  const cacheControl = premium ? "private, max-age=3600" : "public, max-age=31536000, immutable";

  const store = getStore("starvibe-videos");
  const blob = await store.getWithMetadata(key, { type: "arrayBuffer" });
  if (!blob) return new Response("Not found", { status: 404 });

  const typeMime = (blob.metadata?.typeMime as string) || "video/mp4";
  const data = blob.data as ArrayBuffer;
  const total = data.byteLength;

  const range = req.headers.get("range");
  if (!range) {
    return new Response(data, {
      status: 200,
      headers: {
        "content-type": typeMime,
        "content-length": String(total),
        "accept-ranges": "bytes",
        "cache-control": cacheControl,
      },
    });
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  const start = match && match[1] ? Number(match[1]) : 0;
  const end = match && match[2] ? Number(match[2]) : total - 1;
  const chunk = data.slice(start, end + 1);

  return new Response(chunk, {
    status: 206,
    headers: {
      "content-type": typeMime,
      "content-length": String(chunk.byteLength),
      "content-range": `bytes ${start}-${end}/${total}`,
      "accept-ranges": "bytes",
      "cache-control": cacheControl,
    },
  });
};

export const config: Config = {
  path: "/api/starvibe-video-file",
};
