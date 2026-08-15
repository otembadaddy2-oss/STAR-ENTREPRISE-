// JARDIS — bibliothèque de documents autorisés par Carry, indexés pour la
// recherche. Fichiers stockés dans Netlify Blobs, métadonnées + texte
// extrait dans la base partagée du groupe STAR ENTREPRISE.
import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

interface DocRow {
  id: number;
  nom: string;
  dossier: string;
  type_mime: string;
  taille: number;
  contenu_texte: string;
  tags: string;
  created_at: string;
}

function toApi(row: DocRow, score?: number) {
  return {
    id: String(row.id),
    nom: row.nom,
    dossier: row.dossier,
    typeMime: row.type_mime,
    taille: row.taille,
    tags: row.tags,
    createdAt: row.created_at,
    score: score,
    extrait: row.contenu_texte ? row.contenu_texte.slice(0, 240) : "",
  };
}

// Score simple et transparent — cf. section 7 du document maître JARDIS :
// correspondance du contenu, du nom, récence.
function scoreDoc(row: DocRow, q: string): number {
  if (!q) return 0;
  const query = q.toLowerCase();
  const words = query.split(/\s+/).filter(Boolean);
  let score = 0;
  const nom = row.nom.toLowerCase();
  const tags = row.tags.toLowerCase();
  const texte = row.contenu_texte.toLowerCase();
  for (const w of words) {
    if (nom.includes(w)) score += 40 / words.length;
    if (tags.includes(w)) score += 20 / words.length;
    if (texte.includes(w)) score += 30 / words.length;
  }
  const ageDays = (Date.now() - new Date(row.created_at).getTime()) / 86_400_000;
  score += Math.max(0, 10 - ageDays / 10);
  return Math.round(Math.min(100, score));
}

export default async (req: Request, _context: Context) => {
  const session = await requireAuth(req);
  if (!session) return json({ error: "Non authentifié" }, 401);

  await ensureSchema();
  const { sql } = db();
  const store = getStore("jardis-docs");

  if (req.method === "GET") {
    const url = new URL(req.url);
    const q = clean(url.searchParams.get("q"), 200);
    const rows = (await sql`
      SELECT * FROM jardis_documents ORDER BY created_at DESC, id DESC
    `) as DocRow[];

    if (!q) {
      return json({ documents: rows.map((r) => toApi(r)) });
    }

    const scored = rows
      .map((r) => ({ row: r, score: scoreDoc(r, q) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    await sql`
      INSERT INTO jardis_log (action, detail, created_by)
      VALUES ('recherche', ${q}, ${Number(session.sub)})
    `;

    return json({ documents: scored.map((s) => toApi(s.row, s.score)) });
  }

  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const nom = clean(body.nom, 200);
    const fileBase64 = String(body.fileBase64 ?? "");
    if (!nom || !fileBase64) return json({ error: "Nom et fichier requis" }, 400);

    const dossier = clean(body.dossier, 80) || "STAR ENTREPRISE";
    const typeMime = clean(body.typeMime, 100);
    const contenuTexte = clean(body.contenuTexte, 200_000);
    const tags = clean(body.tags, 300);

    const raw = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
    const bytes = Buffer.from(raw, "base64");
    if (bytes.byteLength > 6_000_000) {
      return json({ error: "Fichier trop volumineux (limite 6 Mo)" }, 400);
    }

    const blobKey = `${Date.now()}-${randomBytes(4).toString("hex")}`;
    await store.set(blobKey, bytes, { metadata: { typeMime, nom } });

    const rows = (await sql`
      INSERT INTO jardis_documents
        (nom, dossier, type_mime, taille, contenu_texte, blob_key, tags, created_by)
      VALUES
        (${nom}, ${dossier}, ${typeMime}, ${bytes.byteLength}, ${contenuTexte}, ${blobKey}, ${tags}, ${Number(session.sub)})
      RETURNING *
    `) as DocRow[];

    await sql`
      INSERT INTO jardis_log (action, detail, doc_id, created_by)
      VALUES ('ajout', ${nom}, ${rows[0].id}, ${Number(session.sub)})
    `;

    return json({ document: toApi(rows[0]) }, 201);
  }

  if (req.method === "DELETE") {
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    if (!id) return json({ error: "id requis" }, 400);

    const rows = (await sql`SELECT blob_key FROM jardis_documents WHERE id = ${id}`) as { blob_key: string }[];
    if (rows[0]) {
      await store.delete(rows[0].blob_key);
    }
    await sql`DELETE FROM jardis_documents WHERE id = ${id}`;
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = {
  path: "/api/jardis-documents",
};
