// Liste des devis générés par Jardissa (stockés dans Netlify Blobs par
// create-devis.mts), pour l'espace direction — lecture seule, authentifiée.
import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

interface DevisRecord {
  id: string;
  name: string;
  phone: string;
  formula: string;
  need: string;
  lang: "fr" | "en";
  createdAt: string;
}

export default async (req: Request, _context: Context) => {
  const session = await requireAuth(req);
  if (!session) return json({ error: "Non authentifié" }, 401);
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const store = getStore("devis");
  const { blobs } = await store.list();

  const records = (
    await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" }) as Promise<DevisRecord | null>))
  ).filter((r): r is DevisRecord => Boolean(r));

  records.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return json({ devis: records });
};

export const config: Config = {
  path: "/api/devis-list",
};
