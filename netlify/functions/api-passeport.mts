// PASSEPORT SÛR — API des postes (guichet, caisse, portes, préfecture) et des écrans de la salle d'attente.
// Lectures : GET ?op=sync&espace=CODE&since=N[&ecran=NOM]  ·  GET ?op=ecran&espace=CODE&nom=NOM
// Écritures : POST { op: creer | ecrire | payer | appeler | rappeler | absent | reglages, espace, … }
import type { Context, Config } from "@netlify/functions";
import { db, json } from "./_db.mts";
import { ensurePasseport, creerMoteur, normaliserCode, messageRdv } from "./_passeport.mts";
const brut = (v: unknown) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);

export default async (req: Request, _context: Context) => {
  await ensurePasseport();
  const m = creerMoteur(db().sql);
  const url = new URL(req.url);
  const introuvable = () => json({ error: "Espace introuvable : vérifiez le code." }, 404);

  if (req.method === "GET") {
    const op = url.searchParams.get("op"), code = normaliserCode(url.searchParams.get("espace"));
    if (op === "suivi") { const r = await m.suivi(normaliserCode(url.searchParams.get("public")), brut(url.searchParams.get("id")), String(url.searchParams.get("code") || "")); return r ? json({ dossier: r.dossier, rev: r.rev }) : json({ error: "Aucun dossier ne correspond à ce numéro et à ce code." }, 404); }
    if (!code) return json({ error: "Code de l'espace manquant." }, 400);
    if (op === "sync") { const r = await m.sync(code, Math.max(0, Number(url.searchParams.get("since")) || 0), url.searchParams.get("ecran") || undefined); return r ? json(r) : introuvable(); }
    if (op === "ecran") { const r = await m.ecran(code, String(url.searchParams.get("nom") || "").trim()); return r ? json(r) : introuvable(); }
    return json({ error: "Opération inconnue." }, 400);
  }
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  const texte = await req.text();
  if (texte.length > 2_000_000) return json({ error: "Requête trop volumineuse." }, 413);
  let b: any; try { b = JSON.parse(texte || "{}"); } catch { return json({ error: "Requête illisible." }, 400); }
  const op = String(b.op || "");
  if (op === "creer") {
    const ip = (req.headers.get("x-nf-client-connection-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0] || "").trim().slice(0, 60);
    const r = await m.creer(String(b.nom || ""), ip, Array.isArray(b.dossiers) ? b.dossiers : []);
    return "erreur" in r ? json({ error: r.erreur }, 429) : json(r, 201);
  }
  if (op === "suivi-piece") { const r: any = await m.suiviPiece(normaliserCode(b.public), brut(b.id), String(b.code || ""), b.piece); return r ? (r.erreur ? json({ error: r.erreur }, r.statut || 400) : json({ dossier: r.dossier, rev: r.rev })) : json({ error: "Aucun dossier ne correspond à ce numéro et à ce code." }, 404); }
  const code = normaliserCode(b.espace); if (!code) return json({ error: "Code de l'espace manquant." }, 400);
  if (op === "ecrire") { const r = await m.ecrire(code, Array.isArray(b.dossiers) ? b.dossiers : []); return r ? json(r) : introuvable(); }
  if (op === "supprimer") { if (String(b.confirmation || "") !== "EFFACER") return json({ error: "Confirmation manquante." }, 400); return (await m.supprimer(code)) ? json({ ok: true }) : introuvable(); }
  if (op === "reglages") { const r = await m.reglages(code, b.config); return r ? json(r) : introuvable(); }
  const reponse = (r: any) => (r && r.erreur ? json({ error: r.erreur, dossier: r.dossier }, r.statut || 400) : json(r));
  if (op === "payer") { const r: any = await m.payer(code, String(b.id || ""), Number(b.montant), String(b.mode || ""), String(b.caissier || "")); if (r.dossier && !r.erreur) r.message = messageRdv(r.dossier); return reponse(r); }
  if (op === "appeler") return reponse(await m.appeler(code, Math.round(Number(b.porte))));
  if (op === "rappeler") return reponse(await m.rappeler(code, Math.round(Number(b.porte))));
  if (op === "absent") return reponse(await m.absent(code, Math.round(Number(b.porte))));
  return json({ error: "Opération inconnue." }, 400);
};

export const config: Config = { path: "/api/passeport" };
