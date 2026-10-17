// Sert les photos de profil KOMYO, stockées dans Netlify Blobs. Chaque
// nouvelle photo a une nouvelle clé : on peut donc la garder en cache.
import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, _context: Context) => {
  const key = new URL(req.url).searchParams.get("key") || "";
  if (!key) return new Response("Missing key", { status: 400 });

  const blob = await getStore("starvibe-photos").getWithMetadata(key, { type: "arrayBuffer" });
  if (!blob) return new Response("Not found", { status: 404 });

  return new Response(blob.data as ArrayBuffer, {
    status: 200,
    headers: {
      "content-type": (blob.metadata?.typeMime as string) || "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

export const config: Config = {
  path: "/api/starvibe-photo",
};
