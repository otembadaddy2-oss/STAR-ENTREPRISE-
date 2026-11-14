import { modeDe, verifierDemandeImage, validerPiece, supplement, idImageDansTexte, marqueImage, formatImage, mimeDepuisOctets, EFFORT, IMAGES_PAR_MOIS, PIECES_PAR_JOUR } from "../netlify/functions/_compagnon2.mts";
import { delaiRetour, formatDuree, localVersUtc, suivante, parleDeMedicaments, fuseauValide, FENETRE_MS } from "../netlify/functions/_compagnon.mts";
let ko = 0; const ok = (n: string, c: boolean) => { if (!c) ko++; console.log((c ? "OK  " : "ECHEC ") + n); };
const H = 3600000, now = Date.UTC(2026, 10, 8, 12, 0, 0);
// 65 messages, le plus ancien il y a 20 h : après le 65e message, il faut attendre 4 h
const d = Array.from({ length: 65 }, (_, i) => now - 20 * H + i * 60000);
ok("limite atteinte -> attente ~4 h", Math.abs(delaiRetour(d, 65, now) - (4 * H)) < 61000);
ok("64 messages -> pas d'attente", delaiRetour(d.slice(1), 65, now) === 0);
// 70 messages en tout (dont 5 de trop) : il faut attendre la sortie du 6e plus ancien
const d70 = Array.from({ length: 70 }, (_, i) => now - 23 * H + i * 1000);
ok("fenêtre glissante", delaiRetour(d70, 65, now) === d70[5] + FENETRE_MS - now);
ok("formatDuree 4 h 12 min", formatDuree(4 * H + 11.5 * 60000) === "4 h 12 min");
ok("formatDuree 35 min", formatDuree(35 * 60000) === "35 min");
ok("formatDuree 3 h pile", formatDuree(3 * H) === "3 h");
// fuseaux : 18:00 à Brazzaville (UTC+1) = 17:00 UTC ; 18:00 à Paris le 13 mars 2026 (heure d'hiver) = 17:00 UTC ; 18:00 à Paris le 14 juillet = 16:00 UTC
ok("Brazzaville", localVersUtc("2026-03-13T18:00", "Africa/Brazzaville")!.toISOString() === "2026-03-13T17:00:00.000Z");
ok("Paris hiver", localVersUtc("2026-03-13T18:00", "Europe/Paris")!.toISOString() === "2026-03-13T17:00:00.000Z");
ok("Paris été", localVersUtc("2026-07-14T18:00", "Europe/Paris")!.toISOString() === "2026-07-14T16:00:00.000Z");
ok("Montréal été", localVersUtc("2026-07-14T18:00", "America/Toronto")!.toISOString() === "2026-07-14T22:00:00.000Z");
ok("date invalide", localVersUtc("demain", "Europe/Paris") === null);
ok("fuseau invalide -> défaut", fuseauValide("n'importe quoi") === "Africa/Brazzaville");
// répétitions
const q = new Date("2026-11-01T07:00:00Z");
ok("jour", suivante(q, "jour", new Date("2026-11-08T12:00:00Z")).toISOString() === "2026-11-09T07:00:00.000Z");
ok("semaine", suivante(q, "semaine", new Date("2026-11-08T12:00:00Z")).toISOString() === "2026-11-15T07:00:00.000Z");
ok("an", suivante(new Date("2026-03-14T07:00:00Z"), "an", new Date("2026-11-08T12:00:00Z")).toISOString() === "2027-03-14T07:00:00.000Z");
ok("sans répétition", suivante(q, "", new Date("2026-11-08T12:00:00Z")).getTime() === q.getTime());
// médicaments
for (const t of ["Prendre mes médicaments à 20 h", "rappelle-moi mon comprimé", "renouveler mon ordonnance", "insuline du soir", "Mon traitement le matin", "pilule", "antibiotiques"]) ok("bloqué : " + t, parleDeMedicaments(t));
for (const t of ["Rendez-vous médical à 10 h", "Anniversaire de maman", "Marcher 20 minutes", "Appeler papa", "Consultation chez le dentiste", "Analyses de sang jeudi"]) ok("autorisé : " + t, !parleDeMedicaments(t));

// ---------- Version 2 : modes, images, pièces jointes ----------
for (const [t, m] of [["J'ai de la fièvre depuis hier, que faire ?", "sante"], ["Comment faire un bail de location ?", "droit"], ["Ma voiture ne démarre plus, la batterie ?", "mecanique"], ["Une recette de poulet à la moambe", "cuisine"], ["Comment fixer le prix de vente de ma boutique ?", "business"], ["Aide-moi pour mon devoir de maths", "education"], ["Bonjour, comment vas-tu ?", "general"]] as [string, string][]) ok("mode " + m + " : " + t, modeDe(t) === m);
ok("mode choisi prioritaire", modeDe("Bonjour", "droit") === "droit");
ok("mode auto -> détection", modeDe("J'ai mal à la tête", "auto") === "sante");
ok("mode inconnu ignoré", modeDe("Bonjour", "n'importe quoi") === "general");
for (const t of ["Crée une image d'un enfant qui joue", "dessine un bébé souriant", "une femme nue sur la plage", "un soldat avec une kalachnikov", "fais-moi un faux billet de 10000", "une fausse carte d'identité", "le portrait du président", "une image qui ressemble à une célébrité", "photo de drogue cocaïne", "un faux reçu Mobile Money", "capture de paiement MTN"]) ok("image refusée : " + t, !verifierDemandeImage(t).ok);
for (const t of ["Un coucher de soleil sur le fleuve Congo, couleurs chaudes", "Une affiche d'anniversaire avec des ballons et des fleurs", "Un logo simple pour ma boutique de pagnes, vert et or", "Un ours en peluche jaune devant un arc-en-ciel", "Un paysage de savane au lever du jour"]) ok("image autorisée : " + t, verifierDemandeImage(t).ok);
ok("image : demande trop courte", !verifierDemandeImage("image").ok);
ok("format par défaut", formatImage(undefined) === "carre" && formatImage("portrait") === "portrait" && formatImage("paysage") === "paysage" && formatImage("x") === "carre");
ok("repère d'image", idImageDansTexte("Voici ton image\n" + marqueImage(42)) === 42 && idImageDansTexte("rien") === 0);
const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40, 1)]).toString("base64");
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 1)]).toString("base64");
const pdf = Buffer.from("%PDF-1.4 test test test test test test test").toString("base64");
const exe = Buffer.from("MZ\u0090\u0000 programme windows pas une image").toString("base64");
const v1 = validerPiece({ data: "data:image/jpeg;base64," + jpg }), v2 = validerPiece({ data: png }), v3 = validerPiece({ data: pdf });
ok("pièce JPEG", v1.ok && v1.piece.kind === "image" && v1.piece.mime === "image/jpeg");
ok("pièce PNG", v2.ok && v2.piece.mime === "image/png");
ok("pièce PDF", v3.ok && v3.piece.kind === "pdf");
ok("pièce exécutable refusée", !validerPiece({ data: exe }).ok);
ok("pièce vide refusée", !validerPiece({ data: "" }).ok && !validerPiece(null).ok);
ok("pièce trop lourde refusée", !validerPiece({ data: "A".repeat(4_500_000) }).ok);
ok("pièce non base64 refusée", !validerPiece({ data: "<script>alert(1)</script>" }).ok);
ok("mime depuis octets", mimeDepuisOctets(Buffer.from([0xff, 0xd8, 0xff, 0x00])) === "image/jpeg" && mimeDepuisOctets(Buffer.from("hello world!!")) === "");
ok("effort : Essentiel low, Complet medium", EFFORT("essentiel") === "low" && EFFORT("complet") === "medium");
ok("images : 0 en Essentiel, 10 en Complet par défaut", IMAGES_PAR_MOIS("essentiel") === 0 && IMAGES_PAR_MOIS("complet") === 10);
ok("pièces : 5 et 30 par jour", PIECES_PAR_JOUR("essentiel") === 5 && PIECES_PAR_JOUR("complet") === 30);
const sS = supplement("sante", { imagesRestantes: 3, imagesPossibles: true, niveau: "complet", piece: false });
ok("consigne santé : pas de diagnostic ni de dose", /MODE SANTÉ/.test(sS) && /diagnostic/.test(sS) && /dose/.test(sS));
ok("consigne : images autorisées si il en reste", /il en reste 3/.test(sS) && /"image":/.test(sS));
ok("consigne : images fermées sinon", /pas encore ouverte/.test(supplement("general", { imagesRestantes: 0, imagesPossibles: false, niveau: "essentiel", piece: false })));
ok("consigne : pièce jointe", /PIÈCE JOINTE/.test(supplement("general", { imagesRestantes: 0, imagesPossibles: true, niveau: "essentiel", piece: true })));
console.log(ko ? "ECHECS : " + ko : "TOUS LES TESTS OK"); process.exit(ko ? 1 : 0);
