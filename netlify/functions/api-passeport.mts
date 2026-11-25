// PASSEPORT SÛR — API des postes (guichet, caisse, portes, préfecture) et des écrans de la salle d'attente.
// Lectures : GET ?op=sync&espace=CODE&since=N[&ecran=NOM]  ·  GET ?op=ecran&espace=CODE&nom=NOM
// Écritures : POST { op: creer | preinscrire (public) | connexion | oubli | secours | comptes-* | ecrire | payer | appeler | rappeler | absent | reglages, espace, … }
import type { Context, Config } from "@netlify/functions";
import { db, json } from "./_db.mts";
import { ensurePasseport, creerMoteur, normaliserCode, messageRdv } from "./_passeport.mts";
import { creerComptes, DROITS, NOM_ROLE, loginPropre, verifierMotDePasse } from "./_comptes.mts";
const brut = (v: unknown) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);

export default async (req: Request, _context: Context) => {
  await ensurePasseport();
  const m = creerMoteur(db().sql), cpt = creerComptes(db().sql);
  const url = new URL(req.url);
  const jeton = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  // Espace sécurisé : il faut un compte connecté dont le rôle permet l'opération. Espace de démonstration (sans compte) : accès par le code, comme avant.
  async function autoriser(code: string, droit: string): Promise<{ compte: any } | Response> {
    if (!(await cpt.securise(code))) return { compte: null };
    const compte = await cpt.authentifier(code, jeton);
    if (!compte) return json({ error: "Connexion requise : identifiez-vous.", connexion: true }, 401);
    if (compte.doitChanger) return json({ error: "Changez d'abord votre mot de passe temporaire.", changer: true }, 403);
    if (!(DROITS as any)[compte.role]?.includes(droit)) return json({ error: "Votre rôle (" + NOM_ROLE[compte.role] + ") ne permet pas cette action." }, 403);
    return { compte };
  }
  const ip = () => (req.headers.get("x-nf-client-connection-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0] || "").trim().slice(0, 60);
  const introuvable = () => json({ error: "Espace introuvable : vérifiez le code." }, 404);

  if (req.method === "GET") {
    const op = url.searchParams.get("op"), code = normaliserCode(url.searchParams.get("espace"));
    if (op === "suivi") { const r = await m.suivi(normaliserCode(url.searchParams.get("public")), brut(url.searchParams.get("id")), String(url.searchParams.get("code") || "")); return r ? json({ dossier: r.dossier, rev: r.rev }) : json({ error: "Aucun dossier ne correspond à ce numéro et à ce code." }, 404); }
    if (!code) return json({ error: "Code de l'espace manquant." }, 400);
    if (op === "info") { if (!(await m.espace(code))) return introuvable(); return json({ securise: await cpt.securise(code) }); }
    if (op === "sync") { const a = await autoriser(code, "sync"); if (a instanceof Response) return a; const r = await m.sync(code, Math.max(0, Number(url.searchParams.get("since")) || 0), url.searchParams.get("ecran") || undefined); return r ? json(r) : introuvable(); }
    if (op === "comptes") { const a = await autoriser(code, "comptes"); if (a instanceof Response) return a; return json(await cpt.lister(code)); }
    if (op === "ecran") { const r = await m.ecran(code, String(url.searchParams.get("nom") || "").trim()); return r ? json(r) : introuvable(); }
    return json({ error: "Opération inconnue." }, 400);
  }
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  const texte = await req.text();
  if (texte.length > 2_000_000) return json({ error: "Requête trop volumineuse." }, 413);
  let b: any; try { b = JSON.parse(texte || "{}"); } catch { return json({ error: "Requête illisible." }, 400); }
  const op = String(b.op || "");
  if (op === "creer") {
    if (b.admin) { const pb = loginPropre(b.admin.login).length < 3 ? "L'identifiant doit avoir au moins 3 caractères." : !String(b.admin.nom || "").trim() ? "Indiquez le nom de l'administrateur." : verifierMotDePasse(String(b.admin.mdp || "")); if (pb) return json({ error: pb }, 400); }
    const r: any = await m.creer(String(b.nom || ""), ip(), Array.isArray(b.dossiers) ? b.dossiers : []);
    if ("erreur" in r) return json({ error: r.erreur }, 429);
    if (b.admin) { const s: any = await cpt.securiser(r.code, b.admin.login, b.admin.nom, String(b.admin.mdp || "")); if (s.erreur) { await m.supprimer(r.code); return json({ error: s.erreur }, s.statut || 400); } return json({ ...r, securise: true, login: s.login, secours: s.secours }, 201); }
    return json(r, 201);
  }
  if (op === "preinscrire") {
    const r: any = await m.preinscrire(normaliserCode(b.public), ip(), b.dossier); return r.erreur ? json({ error: r.erreur }, r.statut || 400) : json({ id: r.id, code: r.code, dossier: r.dossier });
  }
  if (op === "suivi-piece") { const r: any = await m.suiviPiece(normaliserCode(b.public), brut(b.id), String(b.code || ""), b.piece); return r ? (r.erreur ? json({ error: r.erreur }, r.statut || 400) : json({ dossier: r.dossier, rev: r.rev })) : json({ error: "Aucun dossier ne correspond à ce numéro et à ce code." }, 404); }
  const code = normaliserCode(b.espace); if (!code) return json({ error: "Code de l'espace manquant." }, 400);
  const reponse = (r: any) => (r && r.erreur ? json({ error: r.erreur, dossier: r.dossier }, r.statut || 400) : json(r));
  // --- comptes et connexion ---
  if (op === "securiser") { if (!(await m.espace(code))) return introuvable(); const s: any = await cpt.securiser(code, String(b.login || ""), String(b.nom || ""), String(b.mdp || "")); return reponse(s); }
  if (op === "connexion") { if (!(await m.espace(code))) return introuvable(); return reponse(await cpt.connexion(code, String(b.login || ""), String(b.mdp || ""))); }
  if (op === "oubli") { if (!(await m.espace(code))) return introuvable(); return reponse(await cpt.oubli(code, String(b.login || ""))); }
  if (op === "secours") { if (!(await m.espace(code))) return introuvable(); return reponse(await cpt.secours(code, String(b.login || ""), String(b.codeSecours || ""), String(b.mdp || ""))); }
  if (op === "deconnexion") return json(await cpt.deconnexion(jeton));
  if (op === "changer-mdp") {
    const compte = await cpt.authentifier(code, jeton); if (!compte) return json({ error: "Connexion requise : identifiez-vous.", connexion: true }, 401);
    const r: any = await cpt.changerMotDePasse(code, compte.login, String(b.ancien || ""), String(b.nouveau || "")); if (r.erreur) return reponse(r);
    await cpt.fermerAutresSessions(code, compte.login, r.jeton); await cpt.deconnexion(jeton); return json({ jeton: r.jeton });
  }
  if (op.startsWith("comptes-")) {
    const a = await autoriser(code, "comptes"); if (a instanceof Response) return a;
    if (op === "comptes-creer") return reponse(await cpt.creerCompte(code, String(b.login || ""), String(b.nom || ""), String(b.role || "")));
    if (op === "comptes-reinitialiser") return reponse(await cpt.reinitialiser(code, String(b.login || "")));
    if (op === "comptes-basculer") return reponse(await cpt.basculer(code, String(b.login || ""), !!b.actif, a.compte.login));
  }
  if (op === "ecrire") { const a = await autoriser(code, "ecrire"); if (a instanceof Response) return a; const r = await m.ecrire(code, Array.isArray(b.dossiers) ? b.dossiers : []); return r ? json(r) : introuvable(); }
  if (op === "supprimer") { const a = await autoriser(code, "supprimer"); if (a instanceof Response) return a; if (String(b.confirmation || "") !== "EFFACER") return json({ error: "Confirmation manquante." }, 400); return (await m.supprimer(code)) ? json({ ok: true }) : introuvable(); }
  if (op === "reglages") { const a = await autoriser(code, "reglages"); if (a instanceof Response) return a; const r = await m.reglages(code, b.config); return r ? json(r) : introuvable(); }
  if (op === "payer") { const a = await autoriser(code, "payer"); if (a instanceof Response) return a; const r: any = await m.payer(code, String(b.id || ""), Number(b.montant), String(b.mode || ""), a.compte ? a.compte.nom : String(b.caissier || "")); if (r.dossier && !r.erreur) r.message = messageRdv(r.dossier); return reponse(r); }
  if (op === "appeler" || op === "rappeler" || op === "absent") { const a = await autoriser(code, op); if (a instanceof Response) return a; const f = (m as any)[op]; return reponse(await f(code, Math.round(Number(b.porte)))); }
  return json({ error: "Opération inconnue." }, 400);
};

export const config: Config = { path: "/api/passeport" };
