// PASSEPORT SÛR — API des postes (guichet, caisse, portes, préfecture) et des écrans de la salle d'attente.
// Lectures : GET ?op=sync&espace=CODE&since=N[&ecran=NOM]  ·  GET ?op=ecran&espace=CODE&nom=NOM
// Écritures : POST { op: creer | preinscrire (public) | connexion | oubli | secours | comptes-* | ecrire | payer | appeler | rappeler | absent | reglages, espace, … }
import type { Context, Config } from "@netlify/functions";
import { db, json } from "./_db.mts";
import { ensurePasseport, creerMoteur, normaliserCode, messageRdv } from "./_passeport.mts";
import { creerComptes, DROITS, NOM_ROLE, loginPropre, verifierMotDePasse } from "./_comptes.mts";
import { creerAudit } from "./_audit.mts";
const brut = (v: unknown) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);

async function traiter(req: Request, _context: Context): Promise<Response> {
  await ensurePasseport();
  const sql = db().sql, m = creerMoteur(sql), cpt = creerComptes(sql), aud = creerAudit(sql);   // une seule connexion par requête
  const url = new URL(req.url);
  const ip = () => (req.headers.get("x-nf-client-connection-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0] || "").trim().slice(0, 60);
  const jeton = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  // Espace sécurisé : il faut un compte connecté dont le rôle permet l'opération. Espace de démonstration (sans compte) : accès par le code, comme avant.
  async function autoriser(code: string, droit: string): Promise<{ compte: any } | Response> {
    if (!(await cpt.securise(code))) return { compte: null };
    const compte = await cpt.authentifier(code, jeton);
    if (!compte) return json({ error: "Connexion requise : identifiez-vous.", connexion: true }, 401);
    if (compte.doitChanger) return json({ error: "Changez d'abord votre mot de passe temporaire.", changer: true }, 403);
    if (!(DROITS as any)[compte.role]?.includes(droit)) { await aud.noter(code, { login: compte.login, role: compte.role, action: "refus-droit", cible: droit, detail: "action non permise à ce rôle", ip: ip(), grave: true }); return json({ error: "Votre rôle (" + NOM_ROLE[compte.role] + ") ne permet pas cette action." }, 403); }
    return { compte };
  }
  const note = (code: string, compte: any, action: string, cible = "", detail = "", grave = false) => aud.noter(code, { login: compte?.login, role: compte?.role, action, cible, detail, ip: ip(), grave });
  // Anti-force-brute des codes de suivi (adresse + dossier) : on ne compte que les échecs.
  const suiviBloque = async (id: string) => (ip() ? await cpt.fenetreBloquee("*", "suivi:" + ip(), 20, 15) : 0) || (await cpt.fenetreBloquee("*", "suividossier:" + id, 30, 60));
  const suiviEchec = async (id: string) => { if (ip()) await cpt.fenetreCompter("*", "suivi:" + ip(), 15); await cpt.fenetreCompter("*", "suividossier:" + id, 60); };
  const introuvable = () => json({ error: "Espace introuvable : vérifiez le code." }, 404);

  if (req.method === "GET") {
    const op = url.searchParams.get("op"), code = normaliserCode(url.searchParams.get("espace"));
    if (op === "suivi") { const id = brut(url.searchParams.get("id")), min = await suiviBloque(id); if (min) return json({ error: "Trop d'essais. Réessayez dans " + min + " minute(s)." }, 429); const r = await m.suivi(normaliserCode(url.searchParams.get("public")), id, String(url.searchParams.get("code") || "")); if (!r) { await suiviEchec(id); return json({ error: "Aucun dossier ne correspond à ce numéro et à ce code." }, 404); } return json({ dossier: r.dossier, rev: r.rev }); }
    if (!code) return json({ error: "Code de l'espace manquant." }, 400);
    if (op === "info") { if (!(await m.espace(code))) return introuvable(); return json({ securise: await cpt.securise(code) }); }
    if (op === "sync") { const a = await autoriser(code, "sync"); if (a instanceof Response) return a; const r = await m.sync(code, Math.max(0, Number(url.searchParams.get("since")) || 0), url.searchParams.get("ecran") || undefined); return r ? json(r) : introuvable(); }
    if (op === "journal") { const a = await autoriser(code, "journal"); if (a instanceof Response) return a; return json(await aud.lire(code, { limite: Number(url.searchParams.get("limite")) || 100, avant: Number(url.searchParams.get("avant")) || 0, gravesSeulement: url.searchParams.get("graves") === "1" })); }
    if (op === "journal-verifier") { const a = await autoriser(code, "journal"); if (a instanceof Response) return a; return json(await aud.verifier(code)); }
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
    if (b.admin) { const s: any = await cpt.securiser(r.code, b.admin.login, b.admin.nom, String(b.admin.mdp || "")); if (s.erreur) { await m.supprimer(r.code); return json({ error: s.erreur }, s.statut || 400); } await note(r.code, { login: s.login, role: "prefecture" }, "espace-securise", "", "création de l'espace avec compte administrateur"); return json({ ...r, securise: true, login: s.login, secours: s.secours }, 201); }
    return json(r, 201);
  }
  if (op === "preinscrire") {
    const r: any = await m.preinscrire(normaliserCode(b.public), ip(), b.dossier); return r.erreur ? json({ error: r.erreur }, r.statut || 400) : json({ id: r.id, code: r.code, dossier: r.dossier });
  }
  if (op === "suivi-piece") { const idb = brut(b.id), min = await suiviBloque(idb); if (min) return json({ error: "Trop d'essais. Réessayez dans " + min + " minute(s)." }, 429); const r: any = await m.suiviPiece(normaliserCode(b.public), brut(b.id), String(b.code || ""), b.piece); return r ? (r.erreur ? json({ error: r.erreur }, r.statut || 400) : json({ dossier: r.dossier, rev: r.rev })) : json({ error: "Aucun dossier ne correspond à ce numéro et à ce code." }, 404); }
  const code = normaliserCode(b.espace); if (!code) return json({ error: "Code de l'espace manquant." }, 400);
  const reponse = (r: any) => (r && r.erreur ? json({ error: r.erreur, dossier: r.dossier }, r.statut || 400) : json(r));
  // --- comptes et connexion ---
  if (op === "securiser") { if (!(await m.espace(code))) return introuvable(); const s: any = await cpt.securiser(code, String(b.login || ""), String(b.nom || ""), String(b.mdp || "")); if (!s.erreur) await note(code, { login: s.login, role: "prefecture" }, "espace-securise", "", "espace de démonstration sécurisé"); return reponse(s); }
  if (op === "connexion") {
    if (!(await m.espace(code))) return introuvable();
    const min = ip() ? await cpt.fenetreBloquee("*", "ipco:" + ip(), 60, 15) : 0; if (min) { await note(code, null, "connexion-bloquee-ip", "", "trop de tentatives depuis cette adresse", true); return json({ error: "Trop d'essais depuis cet appareil. Réessayez dans " + min + " minute(s)." }, 429); }
    if (ip()) await cpt.fenetreCompter("*", "ipco:" + ip(), 15);
    const r: any = await cpt.connexion(code, String(b.login || ""), String(b.mdp || ""));
    if (r.erreur) await note(code, null, r.statut === 429 ? "connexion-bloquee" : "connexion-echec", loginPropre(b.login), r.statut === 429 ? "compte bloqué après trop d'essais" : "identifiant ou mot de passe incorrect", r.statut === 429);
    else await note(code, r.compte, "connexion-ok", r.compte.login);
    return reponse(r);
  }
  if (op === "oubli") { if (!(await m.espace(code))) return introuvable(); if (ip() && (await cpt.fenetreBloquee("*", "ipoubli:" + ip(), 10, 15))) return json({ error: "Trop de demandes. Réessayez plus tard." }, 429); if (ip()) await cpt.fenetreCompter("*", "ipoubli:" + ip(), 15); await note(code, null, "mot-de-passe-oublie", loginPropre(b.login)); return reponse(await cpt.oubli(code, String(b.login || ""))); }
  if (op === "secours") { if (!(await m.espace(code))) return introuvable(); if (ip() && (await cpt.fenetreBloquee("*", "ipsecours:" + ip(), 10, 15))) return json({ error: "Trop d'essais. Réessayez plus tard." }, 429); if (ip()) await cpt.fenetreCompter("*", "ipsecours:" + ip(), 15); const r: any = await cpt.secours(code, String(b.login || ""), String(b.codeSecours || ""), String(b.mdp || "")); await note(code, null, r.erreur ? "secours-echec" : "secours-ok", loginPropre(b.login), r.erreur ? "code de secours incorrect" : "accès retrouvé avec le code de secours", true); return reponse(r); }
  if (op === "deconnexion") { const c0 = await cpt.authentifier(code, jeton); if (c0) await note(code, c0, "deconnexion", c0.login); return json(await cpt.deconnexion(jeton)); }
  if (op === "changer-mdp") {
    const compte = await cpt.authentifier(code, jeton); if (!compte) return json({ error: "Connexion requise : identifiez-vous.", connexion: true }, 401);
    const r: any = await cpt.changerMotDePasse(code, compte.login, String(b.ancien || ""), String(b.nouveau || "")); if (r.erreur) return reponse(r);
    await cpt.fermerAutresSessions(code, compte.login, r.jeton); await cpt.deconnexion(jeton); await note(code, compte, "mot-de-passe-change", compte.login); return json({ jeton: r.jeton });
  }
  if (op.startsWith("comptes-")) {
    const a = await autoriser(code, "comptes"); if (a instanceof Response) return a;
    if (op === "comptes-creer") { const r: any = await cpt.creerCompte(code, String(b.login || ""), String(b.nom || ""), String(b.role || "")); if (!r.erreur) await note(code, a.compte, "compte-cree", r.login, "rôle : " + String(b.role), String(b.role) === "prefecture"); return reponse(r); }
    if (op === "comptes-reinitialiser") { const r: any = await cpt.reinitialiser(code, String(b.login || "")); if (!r.erreur) await note(code, a.compte, "mot-de-passe-reinitialise", r.login, "par la Préfecture"); return reponse(r); }
    if (op === "comptes-basculer") { const r: any = await cpt.basculer(code, String(b.login || ""), !!b.actif, a.compte.login); if (!r.erreur) await note(code, a.compte, b.actif ? "compte-reactive" : "compte-desactive", loginPropre(b.login)); return reponse(r); }
  }
  if (op === "ecrire") { const a = await autoriser(code, "ecrire"); if (a instanceof Response) return a; const r: any = await m.ecrire(code, Array.isArray(b.dossiers) ? b.dossiers : [], a.compte ? { compte: a.compte } : undefined); if (!r) return introuvable(); for (const x of r.tentatives || []) await note(code, a.compte, "tentative-integrite", x.id, x.t.join(" ; ").slice(0, 280), true); delete r.tentatives; return json(r); }
  if (op === "supprimer") { const a = await autoriser(code, "supprimer"); if (a instanceof Response) return a; if (String(b.confirmation || "") !== "EFFACER") return json({ error: "Confirmation manquante." }, 400); if (a.compte) await note(code, a.compte, "espace-efface", code, "effacement définitif des dossiers, pièces et comptes", true); return (await m.supprimer(code)) ? json({ ok: true }) : introuvable(); }
  if (op === "reglages") { const a = await autoriser(code, "reglages"); if (a instanceof Response) return a; const avant = (await m.espace(code))?.config; const r: any = await m.reglages(code, b.config); if (!r) return introuvable(); if (a.compte && avant) { const f = (c: any) => JSON.stringify(c.tarifs); const ch = Object.keys(r.config).filter(k => JSON.stringify((r.config as any)[k]) !== JSON.stringify((avant as any)[k])); if (ch.length) await note(code, a.compte, "reglages", ch.join(","), (ch.includes("tarifs") ? "montant officiel : " + f(avant) + " → " + f(r.config) : "réglages modifiés"), ch.includes("tarifs")); } return json(r); }
  if (op === "payer") { const a = await autoriser(code, "payer"); if (a instanceof Response) return a; const r: any = await m.payer(code, String(b.id || ""), Number(b.montant), String(b.mode || ""), a.compte ? a.compte.nom : String(b.caissier || "")); if (r.dossier && !r.erreur) { r.message = messageRdv(r.dossier); await note(code, a.compte, "paiement", String(b.id || ""), Number(b.montant).toLocaleString("fr-FR") + " FCFA · " + String(b.mode || "") + " · " + (r.dossier.paiement?.recu || "")); } else if (r.erreur && a.compte && r.statut === 400 && /officiel/.test(r.erreur)) await note(code, a.compte, "tentative-montant", String(b.id || ""), "montant proposé : " + Number(b.montant), true); return reponse(r); }
  if (op === "appeler" || op === "rappeler" || op === "absent") { const a = await autoriser(code, op); if (a instanceof Response) return a; const f = (m as any)[op]; return reponse(await f(code, Math.round(Number(b.porte)))); }
  return json({ error: "Opération inconnue." }, 400);
}

// Toute erreur imprévue : réponse neutre pour l'utilisateur (aucun détail technique), détail seulement dans les journaux du serveur.
// Netlify n'applique pas le fichier _headers aux réponses des fonctions : le verrouillage des réponses (aucun contenu actif, jamais mises en cache, jamais intégrables dans une autre page) est posé ici.
const verrouiller = (r: Response) => { const h = new Headers(r.headers); h.set("content-security-policy", "default-src 'none'; frame-ancestors 'none'"); h.set("cache-control", "no-store"); h.set("x-content-type-options", "nosniff"); return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h }); };
export default async (req: Request, context: Context) => {
  try { return verrouiller(await traiter(req, context)); }
  catch (e: any) { console.error("passeport : erreur imprévue", String(e?.stack || e).slice(0, 900)); return verrouiller(json({ error: "Erreur du serveur. Réessayez dans un instant." }, 500)); }
};

export const config: Config = { path: "/api/passeport" };
