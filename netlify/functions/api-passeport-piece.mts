// PASSEPORT SÛR — pièces jointes (photos, PDF) d'un espace. PUT/POST ?espace=CODE&id=PJ-… (corps = fichier) · GET ?espace=CODE&id=PJ-…
import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { db, json } from "./_db.mts";
import { ensurePasseport, creerMoteur, normaliserCode } from "./_passeport.mts";
const brut = (v: unknown) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);

type Magasin = { get: (k: string, o?: any) => Promise<any>; set: (k: string, v: any, o?: any) => Promise<any>; getMetadata?: (k: string) => Promise<any>; delete?: (k: string) => Promise<any>; list?: (o: { prefix: string }) => Promise<{ blobs: { key: string }[] }> };
let magasin: Magasin | null = null;
export function __utiliserMagasin(m: Magasin) { magasin = m; }
const store = (): Magasin => magasin || (getStore({ name: "passeport-pieces", consistency: "strong" }) as unknown as Magasin);   // lecture « forte » : une pièce envoyée est lisible tout de suite par les autres postes
const MIMES = ["image/jpeg", "image/png", "application/pdf"];

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url); let code = normaliserCode(url.searchParams.get("espace")); const id = String(url.searchParams.get("id") || "");
  if (req.method === "DELETE" && !id) {   // effacement de TOUTES les pièces d'un espace (avant « Effacer l'espace »)
    await ensurePasseport(); const m0 = creerMoteur(db().sql);
    if (!code || !(await m0.espace(code))) return json({ error: "Espace introuvable." }, 404);
    const s = store(); const cles = new Set<string>((await m0.idsPieces(code)).map(i => code + "/" + i));
    try { if (s.list) for (const b of ((await s.list({ prefix: code + "/" })).blobs || [])) cles.add(b.key); } catch (e) { }   // y compris les pièces envoyées mais jamais rattachées à un dossier
    let n = 0; for (const k of cles) { try { if (s.delete) { await s.delete(k); n++; } } catch (e) { } }
    return json({ ok: true, effacees: n });
  }
  if (!/^PJ-[a-z0-9]{6,30}$/i.test(id)) return json({ error: "Demande invalide." }, 400);
  await ensurePasseport();
  const m = creerMoteur(db().sql);
  const publique = normaliserCode(url.searchParams.get("public"));
  if (publique) {   // le demandeur : seulement SON dossier (numéro de reçu + code de contrôle)
    const s = await m.suivi(publique, brut(url.searchParams.get("dossier")), String(url.searchParams.get("code") || ""));
    if (!s) return json({ error: "Accès refusé." }, 403);
    if (req.method === "GET" && !s.dossier.pieces.some((p: any) => p.id === id)) return json({ error: "Pièce introuvable." }, 404);
    code = s.espace;
  } else if (!code || !(await m.espace(code))) return json({ error: "Espace introuvable." }, 404);
  const cle = code + "/" + id;
  if (req.method === "GET") {
    const octets = await store().get(cle, { type: "arrayBuffer" });
    if (!octets) return json({ error: "Pièce introuvable." }, 404);
    const meta = store().getMetadata ? await store().getMetadata!(cle) : null;
    return new Response(octets, { headers: { "content-type": (meta && meta.metadata && meta.metadata.mime) || "application/octet-stream", "cache-control": "private, max-age=3600" } });
  }
  if (req.method === "PUT" || req.method === "POST") {
    const mime = String(req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!MIMES.includes(mime)) return json({ error: "Format non accepté : photo (JPEG, PNG) ou PDF." }, 415);
    const octets = await req.arrayBuffer();
    if (octets.byteLength === 0 || octets.byteLength > 4_000_000) return json({ error: "Fichier vide ou trop lourd (4 Mo maximum)." }, 413);
    await store().set(cle, octets, { metadata: { mime } });
    return json({ ok: true, taille: octets.byteLength }, 201);
  }
  return json({ error: "Méthode non autorisée." }, 405);
};

export const config: Config = { path: "/api/passeport-piece" };
