// JARDIS — sert le contenu brut d'un document (aperçu iframe, projection
// Google Cast). Accepte soit une session normale (Authorization), soit un
// jeton court scopé au document (le récepteur Cast ne peut pas envoyer
// d'en-tête personnalisé).
import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { ensureSchema, db } from "./_db.mts";
import { requireAuth, verifyDocToken } from "./_auth.mts";

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || "";
  const t = url.searchParams.get("t") || "";
  if (!id) return new Response("id requis", { status: 400 });

  const session = await requireAuth(req);
  if (!session) {
    const okToken = t && (await verifyDocToken(t, id));
    if (!okToken) return new Response("Non authentifié", { status: 401 });
  }

  await ensureSchema();
  const { sql } = db();
  const rows = (await sql`
    SELECT blob_key, type_mime, nom FROM jardis_documents WHERE id = ${Number(id)}
  `) as { blob_key: string; type_mime: string; nom: string }[];

  if (!rows[0]) return new Response("Introuvable", { status: 404 });

  const store = getStore("jardis-docs");
  const data = await store.get(rows[0].blob_key, { type: "arrayBuffer" });
  if (!data) return new Response("Introuvable", { status: 404 });

  return new Response(data, {
    status: 200,
    headers: {
      "content-type": rows[0].type_mime || "application/octet-stream",
      "content-disposition": `inline; filename="${rows[0].nom.replace(/"/g, "")}"`,
      "cache-control": "private, max-age=60",
    },
  });
};

export const config: Config = {
  path: "/api/jardis-doc",
};
