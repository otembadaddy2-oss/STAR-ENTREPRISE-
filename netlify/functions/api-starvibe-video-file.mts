// Sert les fichiers vidéo du fil STAR VIBE, stockés dans Netlify Blobs.
// Prend en charge les requêtes "Range" (indispensable pour que la balise
// <video> puisse lire/avancer une vidéo correctement sur mobile).
import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "";
  if (!key) return new Response("Missing key", { status: 400 });

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
        "cache-control": "public, max-age=31536000, immutable",
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
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

export const config: Config = {
  path: "/api/starvibe-video-file",
};
