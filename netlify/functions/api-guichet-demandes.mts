// KINDIMBOU — dépôt et suivi des demandes administratives du citoyen connecté.
import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

function numeroDossier(): string {
  const y = new Date().getFullYear();
  const rnd = randomBytes(3).toString("hex").toUpperCase();
  return `KDB-${y}-${rnd}`;
}

export default async (req: Request, _context: Context) => {
  const session = await requireAuth(req);
  if (!session || session.org !== "guichet_unique") return json({ error: "Non authentifié" }, 401);

  await ensureSchema();
  const { sql } = db();
  const citoyenId = Number(session.sub);

  if (req.method === "GET") {
    const rows = await sql`
      SELECT id, numero_dossier, service_code, service_label, statut, details,
             piece_jointe_nom, created_at, updated_at
      FROM guichet_demandes WHERE citoyen_id = ${citoyenId}
      ORDER BY created_at DESC
    `;
    return json({
      demandes: rows.map((r: any) => ({
        id: r.id, numeroDossier: r.numero_dossier, serviceCode: r.service_code,
        serviceLabel: r.service_label, statut: r.statut, details: r.details,
        pieceJointeNom: r.piece_jointe_nom, createdAt: r.created_at, updatedAt: r.updated_at,
      })),
    });
  }

  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const serviceCode = clean(body.serviceCode, 60);
    const serviceLabel = clean(body.serviceLabel, 160);
    const details = clean(body.details, 2000);
    const fileBase64 = String(body.fileBase64 ?? "");
    const fileMime = clean(body.fileMime, 100);
    const fileNom = clean(body.fileNom, 200);

    if (!serviceCode || !serviceLabel) return json({ error: "Service requis" }, 400);

    let blobKey = "";
    if (fileBase64) {
      const raw = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
      const bytes = Buffer.from(raw, "base64");
      if (bytes.byteLength > 8_000_000) return json({ error: "Fichier trop volumineux (limite 8 Mo)" }, 400);
      blobKey = `${Date.now()}-${randomBytes(4).toString("hex")}`;
      const store = getStore("guichet-demandes-pj");
      await store.set(blobKey, bytes, { metadata: { mime: fileMime, nom: fileNom } });
    }

    const dossier = numeroDossier();
    const rows = await sql`
      INSERT INTO guichet_demandes
        (citoyen_id, numero_dossier, service_code, service_label, details, piece_jointe_blob_key, piece_jointe_nom)
      VALUES
        (${citoyenId}, ${dossier}, ${serviceCode}, ${serviceLabel}, ${details}, ${blobKey}, ${fileNom})
      RETURNING id, numero_dossier, service_code, service_label, statut, created_at
    `;
    const d = rows[0] as any;
    return json({
      demande: {
        id: d.id, numeroDossier: d.numero_dossier, serviceCode: d.service_code,
        serviceLabel: d.service_label, statut: d.statut, createdAt: d.created_at,
      },
    }, 201);
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = {
  path: "/api/guichet-demandes",
};
