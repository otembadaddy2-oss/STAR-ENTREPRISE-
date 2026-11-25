// PASSEPORT SÛR — intégrité des dossiers côté SERVEUR. Sur un espace sécurisé, un poste ne peut pas « écrire n'importe quoi » dans un dossier :
// le paiement, le numéro d'appel, le rendez-vous, l'appel en salle, le rang, le caractère « pré-enregistré » et le nom sont posés par le serveur seul ;
// l'étape ne peut avancer que d'un cran à la fois et seulement par les rôles habilités ; la vérification de l'accueil ne vient que de l'accueil ou de la
// Préfecture ; l'historique ne peut qu'être complété (jamais effacé ni réécrit) et chaque nouvelle ligne est signée du compte connecté et datée par le serveur.
// Ce que la page affiche n'a aucune importance : même en trafiquant le code du navigateur, le serveur refait ces vérifications.
export const ETAPES = ["depose", "paye", "recu", "traitement", "pret", "remis"];
const AVANCES_PAR_ECRIRE: Record<string, string[]> = { recu: ["traitement"], traitement: ["pret"], pret: ["remis"] };   // « depose→paye » et « paye→recu » : serveur seulement (paiement, appel)
const ROLES_AVANCE = ["prefecture", "agent"];
const ROLES_VERIF_ACCUEIL = ["accueil", "prefecture"];
const POSE_PAR_LE_SERVEUR = ["paiement", "ticket", "rdv", "appel", "rang"] as const;
const egal = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const cleHisto = (h: any) => [h?.s, h?.at, h?.note].join("|");           // « même ligne » (sans l'auteur, que le serveur réécrit)
const cleComplete = (h: any) => [h?.s, h?.at, h?.by, h?.note].join("|");   // ligne identique, auteur compris

export type Compte = { login: string; nom: string; role: string };
export type Bilan = { donnees: any; tentatives: string[] };

// Création d'un dossier par un poste : seulement un dossier « déposé » vierge de tout ce que le serveur pose.
export function validerCreation(inc: any, compte: Compte): { erreur?: string; donnees?: any } {
  if (!inc || typeof inc !== "object" || Array.isArray(inc)) return { erreur: "Dossier illisible." };
  if (!/^BZV-\d{4}-[A-Z0-9]{3,12}$/.test(String(inc.id || ""))) return { erreur: "Numéro de dossier invalide." };
  if (!["premiere", "renouvellement"].includes(inc.type)) return { erreur: "Type de demande invalide." };
  if (!inc.person || typeof inc.person !== "object" || !String(inc.person.nom || "").trim() || !String(inc.person.piece?.numero || "").trim()) return { erreur: "Identité incomplète." };
  if ((inc.status ?? "depose") !== "depose") return { erreur: "Un nouveau dossier ne peut être créé qu'à l'état « déposé »." };
  for (const k of [...POSE_PAR_LE_SERVEUR, "accueil", "preinscrit", "suite"]) if (inc[k] != null) return { erreur: "Le champ « " + k + " » est réservé au serveur." };
  const d = { ...inc, status: "depose", agent: compte.nom };
  d.history = [{ s: "depose", at: new Date().toISOString(), by: compte.nom + " (" + compte.role + ")", note: String(inc.history?.[0]?.note || "Dossier enregistré").slice(0, 200) }];
  return { donnees: d };
}

// Modification d'un dossier existant : renvoie la version assainie + la liste des tentatives suspectes (pour le journal de sécurité).
export function proteger(cur: any, inc: any, compte: Compte, maintenant = Date.now()): Bilan {
  const t: string[] = [];
  const d: any = { ...inc };
  // 1. champs posés par le serveur seul : on remet la valeur du serveur ; c'est une tentative seulement si le poste en propose une AUTRE valeur non vide
  for (const k of POSE_PAR_LE_SERVEUR) { if (inc[k] != null && !egal(inc[k], cur[k])) t.push("valeur « " + k + " » imposée"); if (cur[k] === undefined) delete d[k]; else d[k] = cur[k]; }
  // 2. identité du dossier
  for (const k of ["id", "createdAt", "type"]) { if (inc[k] !== cur[k]) t.push("champ « " + k + " » modifié"); d[k] = cur[k]; }
  if (cur.preinscrit !== undefined) { if (!egal(inc.preinscrit, cur.preinscrit)) t.push("marque « pré-enregistré » retirée"); d.preinscrit = cur.preinscrit; } else { if (inc.preinscrit != null) t.push("marque « pré-enregistré » inventée"); delete d.preinscrit; }
  if (d.person && cur.person) { if (String(inc.person?.nom ?? "") !== String(cur.person.nom ?? "")) t.push("nom modifié"); d.person = { ...inc.person, nom: cur.person.nom }; }
  // 3. étape : un cran à la fois, par les rôles habilités ; jamais en arrière, jamais un saut
  const de = String(cur.status), vers = String(inc.status ?? de);
  if (vers !== de) {
    const permis = (AVANCES_PAR_ECRIRE[de] || []).includes(vers) && ROLES_AVANCE.includes(compte.role);
    if (!permis) { if (ETAPES.indexOf(vers) > ETAPES.indexOf(de)) t.push("étape « " + de + " → " + vers + " » refusée"); d.status = de; }
  } else d.status = de;
  // 4. vérification de l'accueil
  if (!egal(inc.accueil, cur.accueil)) {
    if (inc.accueil != null && cur.preinscrit && ROLES_VERIF_ACCUEIL.includes(compte.role) && typeof inc.accueil === "object") d.accueil = { ok: inc.accueil.ok === true, at: new Date(maintenant).toISOString(), by: compte.nom, ...(inc.accueil.ok === false ? { motif: String(inc.accueil.motif || "").slice(0, 120) } : {}) };
    else { if (inc.accueil != null) t.push("vérification de l'accueil posée sans droit"); if (cur.accueil === undefined) delete d.accueil; else d.accueil = cur.accueil; }
  } else if (cur.accueil === undefined) delete d.accueil; else d.accueil = cur.accueil;
  // 5. examen d'une alerte : Préfecture seulement
  if (!egal(inc.suite, cur.suite) && compte.role !== "prefecture") { t.push("alerte déclarée « examinée » sans droit"); if (cur.suite === undefined) { delete d.suite; delete d.suiteAt; } else { d.suite = cur.suite; d.suiteAt = cur.suiteAt; } }
  // 6. historique : on ne fait qu'ajouter ; les lignes nouvelles sont signées par le compte et datées par le serveur
  const avant: any[] = Array.isArray(cur.history) ? cur.history : [], recu: any[] = Array.isArray(inc.history) ? inc.history : [];
  const connues = new Set(avant.map(cleHisto)); const nouvelles = recu.filter(h => h && typeof h === "object" && !connues.has(cleHisto(h)));
  if (avant.some(h => !recu.some(x => cleComplete(x) === cleComplete(h)))) t.push("historique réécrit ou effacé");
  d.history = avant.concat(nouvelles.slice(0, 20).map(h => {
    const at = Date.parse(String(h.at)); const ok = Number.isFinite(at) && Math.abs(at - maintenant) <= 10 * 60000;
    if (!ok) t.push("date d'historique falsifiée");
    return { s: ETAPES.includes(String(h.s)) ? h.s : d.status, at: new Date(ok ? at : maintenant).toISOString(), by: compte.nom + " (" + compte.role + ")", note: String(h.note || "").slice(0, 200) };
  }));
  return { donnees: d, tentatives: t };
}
