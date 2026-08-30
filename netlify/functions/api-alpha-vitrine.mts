// Vitrine publique ALPHA — panneau de diffusion des affiches/vidéos
// publiées, affiché en boucle sur alpha/vitrine.html. Lecture publique
// (items actifs uniquement) ; gestion (ajout, activation, suppression)
// réservée à l'admin ALPHA, connecté via /api/auth.
import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

interface VitrineRow {
  id: number;
  titre: string;
  client: string;
  type_media: string;
  type_mime: string;
  blob_key: string;
  lien_externe: string;
  actif: boolean;
  ordre: number;
  created_at: string;
}

function toApi(row: VitrineRow) {
  return {
    id: String(row.id),
    titre: row.titre,
    client: row.client,
    typeMedia: row.type_media,
    typeMime: row.type_mime,
    lienExterne: row.lien_externe,
    actif: row.actif,
    ordre: row.ordre,
    createdAt: row.created_at,
    mediaUrl: `/api/alpha-vitrine-media?key=${encodeURIComponent(row.blob_key)}`,
  };
}

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();

  // Lecture publique de la vitrine (page vitrine.html) — items actifs uniquement.
  if (req.method === "GET") {
    const url = new URL(req.url);
    const wantsAll = url.searchParams.get("all") === "1";

    if (wantsAll) {
      const session = await requireAuth(req);
      if (!session) return json({ error: "Non authentifié" }, 401);
      const rows = (await sql`
        SELECT * FROM alpha_vitrine ORDER BY ordre ASC, created_at DESC
      `) as VitrineRow[];
      return json({ items: rows.map(toApi) });
    }

    const rows = (await sql`
      SELECT * FROM alpha_vitrine WHERE actif = true ORDER BY ordre ASC, created_at DESC
    `) as VitrineRow[];
    return json({ items: rows.map(toApi) });
  }

  // Ajout, modification, suppression — réservés à l'admin.
  const session = await requireAuth(req);
  if (!session) return json({ error: "Non authentifié" }, 401);

  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const titre = clean(body.titre, 200);
    const client = clean(body.client, 200);
    const typeMedia = body.typeMedia === "video" ? "video" : "image";
    const typeMime = clean(body.typeMime, 100);
    const lienExterne = clean(body.lienExterne, 500);
    const fileBase64 = String(body.fileBase64 ?? "");

    if (!titre || !fileBase64) {
      return json({ error: "Titre et fichier requis" }, 400);
    }

    const raw = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
    const bytes = Buffer.from(raw, "base64");
    if (bytes.byteLength > 15_000_000) {
      return json({ error: "Fichier trop volumineux (limite 15 Mo)" }, 400);
    }

    const store = getStore("alpha-vitrine");
    const blobKey = `${Date.now()}-${randomBytes(4).toString("hex")}`;
    await store.set(blobKey, bytes, { metadata: { typeMime, titre } });

    const rows = (await sql`
      INSERT INTO alpha_vitrine (titre, client, type_media, type_mime, blob_key, lien_externe, created_by)
      VALUES (${titre}, ${client}, ${typeMedia}, ${typeMime}, ${blobKey}, ${lienExterne}, ${Number(session.sub)})
      RETURNING *
    `) as VitrineRow[];

    return json({ item: toApi(rows[0]) }, 201);
  }

  if (req.method === "PUT") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const id = Number(body.id);
    if (!id) return json({ error: "id requis" }, 400);

    const rows = (await sql`
      UPDATE alpha_vitrine
      SET actif = COALESCE(${body.actif as boolean | undefined}, actif),
          ordre = COALESCE(${body.ordre as number | undefined}, ordre)
      WHERE id = ${id} RETURNING *
    `) as VitrineRow[];

    if (!rows[0]) return json({ error: "Introuvable" }, 404);
    return json({ item: toApi(rows[0]) });
  }

  if (req.method === "DELETE") {
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    if (!id) return json({ error: "id requis" }, 400);

    const rows = (await sql`SELECT blob_key FROM alpha_vitrine WHERE id = ${id}`) as { blob_key: string }[];
    if (rows[0]) {
      const store = getStore("alpha-vitrine");
      await store.delete(rows[0].blob_key);
    }
    await sql`DELETE FROM alpha_vitrine WHERE id = ${id}`;
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = {
  path: "/api/alpha-vitrine",
};
