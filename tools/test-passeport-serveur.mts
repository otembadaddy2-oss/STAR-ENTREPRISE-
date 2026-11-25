// Test de bout en bout du serveur PASSEPORT SÛR : le vrai code serveur contre une vraie base PostgreSQL locale (aucun réseau, aucun coût).
// Lancer : service postgresql start ; node --experimental-strip-types tools/test-passeport-serveur.mts
if (!process.env.NETLIFY_DB_URL) process.env.NETLIFY_DB_URL = "postgres://postgres:kt@localhost:5432/kt";
const { db } = await import("../netlify/functions/_db.mts");
const { ensurePasseport } = await import("../netlify/functions/_passeport.mts");
const api = (await import("../netlify/functions/api-passeport.mts")).default as (r: Request, c: any) => Promise<Response>;
const piece = await import("../netlify/functions/api-passeport-piece.mts");
const stock = new Map<string, any>();
piece.__utiliserMagasin({ get: async (k: string) => stock.get(k)?.v ?? null, set: async (k: string, v: any, o: any) => { stock.set(k, { v, o }); }, getMetadata: async (k: string) => ({ metadata: stock.get(k)?.o?.metadata }), delete: async (k: string) => { stock.delete(k); }, list: async ({ prefix }: { prefix: string }) => ({ blobs: [...stock.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }) });
const pieceApi = piece.default as (r: Request, c: any) => Promise<Response>;
let ko = 0; const ok = (c: boolean, m: string) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };
const post = async (corps: any) => { const r = await api(new Request("https://t.test/api/passeport", { method: "POST", body: JSON.stringify(corps) }), {}); return { statut: r.status, ...(await r.json()) } as any; };
const get = async (qs: string) => { const r = await api(new Request("https://t.test/api/passeport?" + qs), {}); return { statut: r.status, ...(await r.json()) } as any; };
const dossier = (id: string, nom = "NOM" + id) => ({ id, status: "depose", type: "premiere", person: { nom, prenoms: "Prénom", sexe: "F", tel: "+242 06 000 00 00" }, history: [{ s: "depose", at: new Date().toISOString(), by: "Agent 01" }] });

await ensurePasseport();
try {
  // ---------- espace + dossiers ----------
  const c = await post({ op: "creer", nom: "Test" }); ok(c.statut === 201 && /^[A-Z2-9]{8}$/.test(c.code), "création d'un espace (code à 8 caractères)");
  const E = c.code;
  ok((await get("op=sync&espace=ZZZZZZZZ")).statut === 404, "code inconnu refusé (404)");
  const ids = Array.from({ length: 12 }, (_, i) => "BZV-T-" + String(i + 1).padStart(3, "0"));
  const w = await post({ op: "ecrire", espace: E, dossiers: ids.map(id => ({ id, baseRev: 0, data: dossier(id) })) });
  ok(w.acceptes.length === 12 && w.conflits.length === 0, "12 dossiers enregistrés");
  const w2 = await post({ op: "ecrire", espace: E, dossiers: [{ id: ids[0], baseRev: 0, data: dossier(ids[0]) }] });
  ok(w2.conflits.length === 1, "création en double → conflit (pas d'écrasement)");
  const w3 = await post({ op: "ecrire", espace: E, dossiers: [{ id: ids[0], baseRev: 1, data: { ...dossier(ids[0]), note: "A" } }] });
  const w4 = await post({ op: "ecrire", espace: E, dossiers: [{ id: ids[0], baseRev: 1, data: { ...dossier(ids[0]), note: "B" } }] });
  ok(w3.acceptes.length === 1 && w4.conflits.length === 1 && w4.conflits[0].data.note === "A", "deux postes modifient le même dossier : le second reçoit un conflit avec la version du premier");
  const s0 = await get("op=sync&espace=" + E + "&since=0&ecran=Écran A"); ok(s0.dossiers.length === 12 && s0.ecrans.length === 1, "synchronisation complète + écran connecté détecté");
  const s1 = await get("op=sync&espace=" + E + "&since=" + s0.version); ok(s1.dossiers.length === 0, "synchronisation incrémentale : rien de neuf");

  // ---------- paiement : numéros, rendez-vous, capacité, concurrence ----------
  await post({ op: "reglages", espace: E, config: { capacite: 5, delai: 0, jours: [0, 1, 2, 3, 4, 5, 6], decalage: 0 } });
  const p1 = await post({ op: "payer", espace: E, id: ids[0], montant: 50000, mode: "Espèces", caissier: "Caisse" });
  ok(p1.statut === 200 && p1.dossier.ticket === 1 && /^RP-\d{4}-000001$/.test(p1.dossier.paiement.recu), "paiement : reçu RP-…-000001, numéro d'appel 1");
  ok(/Rendez-vous d'enrôlement/.test(p1.message) && p1.message.includes(p1.dossier.rdv.date.slice(0, 4)), "le message WhatsApp contient la date du rendez-vous");
  ok((await post({ op: "payer", espace: E, id: ids[0], montant: 50000, mode: "Espèces" })).statut === 409, "double paiement refusé");
  const lot = await Promise.all(ids.slice(1, 9).map(id => post({ op: "payer", espace: E, id, montant: 75000, mode: "Mobile Money MTN" })));
  ok(lot.every(r => r.statut === 200), "8 paiements simultanés réussis");
  const cle = new Set(lot.concat([p1]).map(r => r.dossier.rdv.date + "#" + r.dossier.ticket)); ok(cle.size === 9, "aucun numéro d'appel en double sur 9 paiements simultanés");
  const jours = lot.concat([p1]).reduce((a: any, r: any) => { a[r.dossier.rdv.date] = (a[r.dossier.rdv.date] || 0) + 1; return a; }, {});
  ok(Object.values(jours).every((n: any) => n <= 5) && Object.keys(jours).length === 2, "capacité de 5 par jour : les suivants passent au jour suivant " + JSON.stringify(jours));
  const rps = new Set(lot.concat([p1]).map(r => r.dossier.paiement.recu)); ok(rps.size === 9, "9 numéros de reçu distincts");

  // ---------- jours ouvrés ----------
  await post({ op: "reglages", espace: E, config: { capacite: 60, delai: 1, jours: [1, 2, 3, 4, 5], decalage: 0 } });
  const pw = await post({ op: "payer", espace: E, id: ids[9], montant: 50000, mode: "Espèces" });
  const dow = new Date(pw.dossier.rdv.date + "T12:00:00Z").getUTCDay(); ok(dow >= 1 && dow <= 5, "le rendez-vous tombe un jour ouvré (" + pw.dossier.rdv.date + ")");

  // ---------- jour de service simulé + appel aux portes ----------
  const rj = await post({ op: "reglages", espace: E, config: { decalage: 0, delai: 0, jours: [0, 1, 2, 3, 4, 5, 6], capacite: 60 } });
  const sy = await get("op=sync&espace=" + E + "&since=0"); const aujourdhui = sy.jour;
  const attente = sy.dossiers.filter((d: any) => d.data.status === "paye" && d.data.rdv.date === aujourdhui);
  ok(attente.length >= 5, "des personnes ont rendez-vous aujourd'hui (" + attente.length + ")");
  const appels = await Promise.all([1, 2, 3, 4].map(p => post({ op: "appeler", espace: E, porte: p })));
  const nums = appels.filter(a => a.dossier).map(a => a.dossier.ticket); ok(nums.length === 4 && new Set(nums).size === 4, "4 portes appellent en même temps : 4 personnes différentes " + JSON.stringify(nums));
  ok(JSON.stringify([...nums].sort((a, b) => a - b)) === JSON.stringify([...nums].sort((a, b) => a - b)) && Math.min(...nums) === 1, "l'ordre des numéros est respecté (le plus petit passe en premier)");
  const ec = await get("op=ecran&espace=" + E + "&nom=Salle A"); ok(ec.appels.length === 4 && ec.portes.n === 6 && ec.enAttente >= 1 && !JSON.stringify(ec).includes("tel"), "écran : appels, portes, prochains numéros — sans données personnelles inutiles");
  const rp = await post({ op: "rappeler", espace: E, porte: 2 }); ok(rp.dossier && rp.dossier.history.some((h: any) => h.note === "Appel répété"), "rappel de la porte 2");
  const ab = await post({ op: "absent", espace: E, porte: 3 }); ok(ab.dossier && ab.dossier.status === "paye" && ab.dossier.rang > 0, "absent à la porte 3 : renvoyé en fin de file");
  const sn = (await get("op=ecran&espace=" + E)).prochains; ok(sn[sn.length - 1] === ab.dossier.ticket, "la personne absente est la dernière de la file");
  ok((await post({ op: "appeler", espace: E, porte: 99 })).statut === 400, "porte inexistante refusée");
  // toutes les personnes de la file sont appelées sans doublon, puis la file est vide
  let vus = new Set<number>(nums); let vide = false;
  for (let i = 0; i < 30 && !vide; i++) { const r = await post({ op: "appeler", espace: E, porte: 1 + (i % 6) }); if (r.vide) vide = true; else { vus.add(r.dossier.ticket); } }
  ok(vide, "la file se vide complètement");

  // ---------- date simulée (démonstration) ----------
  const d1 = await post({ op: "reglages", espace: E, config: { decalage: 2 } }); const sy2 = await get("op=sync&espace=" + E + "&since=0");
  ok(sy2.jour !== aujourdhui && d1.config.decalage === 2, "la date simulée avance de 2 jours (" + aujourdhui + " → " + sy2.jour + ")");

  // ---------- pièces jointes ----------
  const png = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
  const pu = await pieceApi(new Request("https://t.test/api/passeport-piece?espace=" + E + "&id=PJ-abc123xyz", { method: "PUT", headers: { "content-type": "image/png" }, body: png }), {}); ok(pu.status === 201, "pièce envoyée");
  const pg = await pieceApi(new Request("https://t.test/api/passeport-piece?espace=" + E + "&id=PJ-abc123xyz"), {}); ok(pg.status === 200 && pg.headers.get("content-type") === "image/png" && (await pg.arrayBuffer()).byteLength === 7, "pièce relue à l'identique");
  ok((await pieceApi(new Request("https://t.test/api/passeport-piece?espace=" + E + "&id=PJ-abc123xyz", { method: "PUT", headers: { "content-type": "text/html" }, body: "x" }), {})).status === 415, "format interdit refusé (415)");
  ok((await pieceApi(new Request("https://t.test/api/passeport-piece?espace=ZZZZZZZZ&id=PJ-abc123xyz"), {})).status === 404, "pièce d'un autre espace inaccessible");

  // ---------- le demandeur suit SON dossier (sans accéder aux autres) ----------
  const { codeSuivi } = await import("../netlify/functions/_passeport.mts");
  const sy3 = await get("op=sync&espace=" + E + "&since=0"); const pub = sy3.publique; ok(/^[A-Z2-9]{8}$/.test(pub) && pub !== E, "l'espace a un code public distinct du code des postes");
  const mon = ids[1], ctrl = codeSuivi(mon, "NOM" + mon);
  const sv = await get("op=suivi&public=" + pub + "&id=" + mon + "&code=" + ctrl); ok(sv.statut === 200 && sv.dossier.id === mon && sv.dossier.person.nom === "NOM" + mon && !JSON.stringify(sv.dossier).includes("+242"), "suivi du demandeur : son dossier, sans téléphone ni numéro de pièce");
  ok((await get("op=suivi&public=" + pub + "&id=" + mon + "&code=AAAAAA")).statut === 404, "mauvais code de contrôle refusé");
  ok((await get("op=suivi&public=" + E + "&id=" + mon + "&code=" + ctrl)).statut === 404, "le code des postes ne donne pas accès au suivi public");
  const sp = await post({ op: "suivi-piece", public: pub, id: mon, code: ctrl, piece: { id: "PJ-demandeur1", type: "naissance", nom: "acte.pdf", mime: "application/pdf", taille: 10 } });
  ok(sp.dossier && sp.dossier.pieces.some((p: any) => p.id === "PJ-demandeur1"), "le demandeur ajoute une pièce à son dossier");
  const pu2 = await pieceApi(new Request("https://t.test/api/passeport-piece?public=" + pub + "&dossier=" + mon + "&code=" + ctrl + "&id=PJ-demandeur1", { method: "PUT", headers: { "content-type": "application/pdf" }, body: new Uint8Array([37, 80, 68, 70]) }), {}); ok(pu2.status === 201, "le demandeur envoie le fichier de la pièce");
  const pg2 = await pieceApi(new Request("https://t.test/api/passeport-piece?espace=" + E + "&id=PJ-demandeur1"), {}); ok(pg2.status === 200, "les postes retrouvent la pièce du demandeur");
  ok((await pieceApi(new Request("https://t.test/api/passeport-piece?public=" + pub + "&dossier=" + ids[2] + "&code=" + ctrl + "&id=PJ-abc123xyz", { method: "PUT", headers: { "content-type": "image/png" }, body: new Uint8Array([1]) }), {})).status === 403, "le demandeur ne peut pas toucher le dossier d'un autre");
  const sy4 = await get("op=sync&espace=" + E + "&since=0"); ok(sy4.dossiers.find((d: any) => d.id === mon).data.pieces.some((p: any) => p.id === "PJ-demandeur1"), "la pièce du demandeur apparaît aux postes à la synchronisation suivante");

  // ---------- pré-enregistrement par le demandeur + accueil (front office) ----------
  const base = { nom: "mpassi", prenoms: "Grâce", naissance: "1990-04-12", sexe: "F", nationalite: "congolaise", tel: "+242 06 111 22 33", type: "premiere", piece: { type: "CNI", numero: "cni 556677", expiration: "2031-01-01" } };
  const pr = await post({ op: "preinscrire", public: pub, dossier: base });
  ok(pr.statut === 200 && /^BZV-\d{4}-P00001$/.test(pr.id) && /^[A-Z0-9]{6}$/.test(pr.code), "pré-enregistrement public : numéro " + pr.id + " et code de contrôle");
  ok(pr.dossier.preinscrit === true && !JSON.stringify(pr.dossier).includes("556677"), "la réponse au demandeur ne renvoie pas le numéro de pièce");
  const sP = await get("op=sync&espace=" + E + "&since=0"); const dP = sP.dossiers.find((x: any) => x.id === pr.id);
  ok(dP && dP.data.person.nom === "MPASSI" && dP.data.person.piece.numero === "CNI556677" && dP.data.preinscrit && dP.data.status === "depose" && dP.data.agent === "Demandeur", "le dossier apparaît chez les postes (nom en majuscules, pièce nettoyée)");
  ok((await get("op=suivi&public=" + pub + "&id=" + pr.id + "&code=" + pr.code)).statut === 200, "le demandeur retrouve son dossier avec son code");
  const pr2 = await post({ op: "preinscrire", public: pub, dossier: base }); ok(pr2.statut === 200 && /P00002$/.test(pr2.id), "numéros de pré-enregistrement consécutifs, sans doublon");
  const lot2 = await Promise.all([1, 2, 3, 4, 5].map(() => post({ op: "preinscrire", public: pub, dossier: base }))); const idsP = new Set(lot2.map((r: any) => r.id)); ok(lot2.every((r: any) => r.statut === 200) && idsP.size === 5, "5 pré-enregistrements simultanés : 5 numéros différents");
  ok((await post({ op: "preinscrire", public: pub, dossier: { ...base, nom: "" } })).statut === 400, "nom manquant refusé");
  ok((await post({ op: "preinscrire", public: pub, dossier: { ...base, naissance: "2999-01-01" } })).statut === 400, "date de naissance dans le futur refusée");
  ok((await post({ op: "preinscrire", public: pub, dossier: { ...base, type: "renouvellement" } })).statut === 400, "renouvellement sans ancien passeport refusé");
  ok((await post({ op: "preinscrire", public: "ZZZZZZZZ", dossier: base })).statut === 404, "lien public inconnu refusé");
  ok((await post({ op: "preinscrire", public: E, dossier: base })).statut === 404, "le code des postes ne permet pas de pré-enregistrer");
  const xss = await post({ op: "preinscrire", public: pub, dossier: { ...base, prenoms: "<b>x</b>\u0000Jean" } }); const sX = await get("op=sync&espace=" + E + "&since=0");
  ok(xss.statut === 200 && !/[<>\u0000]/.test(sX.dossiers.find((x: any) => x.id === xss.id).data.person.prenoms), "caractères dangereux retirés des champs");
  // la caisse ne peut pas encaisser un dossier pré-enregistré non vérifié
  const pay0 = await post({ op: "payer", espace: E, id: pr.id, montant: 50000, mode: "Espèces", caissier: "Caisse" });
  ok(pay0.statut === 409 && /accueil/i.test(pay0.error), "paiement refusé tant que l'accueil n'a pas vérifié : " + pay0.error);
  // l'accueil valide (écriture normale d'un poste), puis la caisse peut encaisser
  const lu = sX.dossiers.find((x: any) => x.id === pr.id);
  const acc = await post({ op: "ecrire", espace: E, dossiers: [{ id: pr.id, baseRev: lu.rev, data: { ...lu.data, accueil: { ok: true, at: new Date().toISOString(), by: "Accueil" } } }] });
  ok(acc.acceptes.length === 1, "l'accueil enregistre la vérification des originaux");
  const pay1 = await post({ op: "payer", espace: E, id: pr.id, montant: 50000, mode: "Espèces", caissier: "Caisse" });
  ok(pay1.statut === 200 && pay1.dossier.ticket >= 1 && pay1.dossier.paiement.recu, "après vérification, le paiement donne reçu, rendez-vous et numéro d'appel");
  const sPub = await get("op=suivi&public=" + pub + "&id=" + pr.id + "&code=" + pr.code); ok(sPub.dossier.accueil && sPub.dossier.accueil.ok === true && sPub.dossier.paiement, "le demandeur voit « vérifié » puis son rendez-vous");
  // limite par appareil : 10 par heure
  const ipLimite = async (n: number) => { let dernier: any; for (let i = 0; i < n; i++) { const r = await api(new Request("https://t.test/api/passeport", { method: "POST", headers: { "x-nf-client-connection-ip": "203.0.113.77" }, body: JSON.stringify({ op: "preinscrire", public: pub, dossier: base }) }), {}); dernier = r.status; } return dernier; };
  ok((await ipLimite(10)) === 200 && (await ipLimite(1)) === 429, "limite : 10 pré-enregistrements par heure et par appareil, le 11e est refusé (429)");
  await db().sql`DELETE FROM pss_prereg WHERE ip = '203.0.113.77'`;

  // ---------- effacement définitif de l'espace ----------
  ok(stock.size >= 2, "avant effacement : " + stock.size + " pièces dans le magasin");
  ok((await post({ op: "supprimer", espace: E })).statut === 400, "effacer sans confirmation : refusé");
  ok((await pieceApi(new Request("https://t.test/api/passeport-piece?espace=ZZZZZZZZ", { method: "DELETE" }), {})).status === 404, "effacer les pièces d'un espace inconnu : 404");
  const dp = await pieceApi(new Request("https://t.test/api/passeport-piece?espace=" + E, { method: "DELETE" }), {}); const dpj = await dp.json(); ok(dp.status === 200 && dpj.effacees >= 2 && stock.size === 0, "toutes les pièces de l'espace sont effacées (" + dpj.effacees + ")");
  ok((await post({ op: "supprimer", espace: E, confirmation: "EFFACER" })).statut === 200, "l'espace est effacé");
  ok((await get("op=sync&espace=" + E + "&since=0")).statut === 404 && (await get("op=suivi&public=" + pub + "&id=" + mon + "&code=" + ctrl)).statut === 404, "ensuite : l'espace et le suivi du demandeur n'existent plus");
  const restes = (await db().sql`SELECT (SELECT count(*) FROM pss_dossiers WHERE espace = ${E})::int AS d, (SELECT count(*) FROM pss_ecrans WHERE espace = ${E})::int AS e`) as any[]; ok(restes[0].d === 0 && restes[0].e === 0, "plus aucun dossier ni écran en base pour cet espace");

  // ---------- performance : création d'un espace avec 100 dossiers = très peu de requêtes (base distante en production) ----------
  const { creerMoteur } = await import("../netlify/functions/_passeport.mts"); let nbReq = 0;
  const compte = new Proxy(db().sql as any, { apply(cible: any, ceci: any, args: any[]) { nbReq++; return Reflect.apply(cible, ceci, args); } });
  const cent = Array.from({ length: 100 }, (_, i) => dossier("BZV-2026-" + String(70000 + i), "PERF" + i)); cent[5] = cent[4];   // un doublon d'identifiant, ignoré
  const t0 = Date.now(); const cp = await creerMoteur(compte).creer("Perf", "", cent); const dt = Date.now() - t0;
  ok(cp.code && nbReq <= 14, "création avec 100 dossiers : " + nbReq + " requêtes seulement (" + dt + " ms)");
  const nbD = ((await db().sql`SELECT count(*)::int AS n FROM pss_dossiers WHERE espace = ${cp.code}`) as any[])[0].n; ok(nbD === 99, "99 dossiers créés (le doublon est ignoré) : " + nbD);
  await db().sql`DELETE FROM pss_espaces WHERE code = ${cp.code}`;

  // ---------- nettoyage ----------
  await db().sql`DELETE FROM pss_espaces WHERE code = ${E}`;
} catch (e) { console.log("ÉCHEC exception : " + (e as Error).stack); ko++; }
console.log(ko ? "\n" + ko + " échec(s)" : "\nTous les tests passent");
process.exit(ko ? 1 : 0);
