// Sert publiquement les fichiers (images/vidéos) de la vitrine ALPHA,
// stockés dans Netlify Blobs. Aucune authentification — ce contenu est
// destiné à être vu par le grand public sur alpha/vitrine.html.
import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "";
  if (!key) return new Response("Missing key", { status: 400 });

  const store = getStore("alpha-vitrine");
  const blob = await store.getWithMetadata(key, { type: "arrayBuffer" });
  if (!blob) return new Response("Not found", { status: 404 });

  const typeMime = (blob.metadata?.typeMime as string) || "application/octet-stream";

  return new Response(blob.data as ArrayBuffer, {
    status: 200,
    headers: {
      "content-type": typeMime,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

export const config: Config = {
  path: "/api/alpha-vitrine-media",
};
