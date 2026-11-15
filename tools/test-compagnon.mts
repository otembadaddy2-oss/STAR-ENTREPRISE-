import { modeDe, verifierDemandeImage, validerPiece, supplement, idImageDansTexte, marqueImage, formatImage, mimeDepuisOctets, EFFORT, MAX_JETONS, LIMITE_REPONSE, MODE_PROFOND, gardePrescription, MSG_PAS_DE_DOSE, IMAGES_PAR_MOIS, PIECES_PAR_JOUR, texteAVoix, VOIX_PAR_JOUR, VOIX_SIGNES_MAX, texteCompagnonPourKeydou, cleValide, nettoyerErreur, ordonnerModelesImage, connecteurs, listeCapacites } from "../netlify/functions/_compagnon2.mts";
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
ok("images : 2 en essai, 10 en Essentiel, 35 en Complet par défaut", IMAGES_PAR_MOIS("essai") === 2 && IMAGES_PAR_MOIS("essentiel") === 10 && IMAGES_PAR_MOIS("complet") === 35);
ok("voix de Keydou : 0 en Essentiel, 6 par jour en Complet par défaut", VOIX_PAR_JOUR("essentiel") === 0 && VOIX_PAR_JOUR("complet") === 6);
{
  const t = texteAVoix("**Bonjour** 😀 ! Voici le lien https://exemple.com/x pour toi.\nSource : https://a.b [[img:12]]");
  ok("texte lu : sans mise en forme, sans lien, sans « Source », sans emoji", t === "Bonjour ! Voici le lien pour toi." && !/https?:|\*|\[\[|Source/.test(t));
  const long = "Une phrase assez longue pour le test de coupe. ".repeat(40), c = texteAVoix(long);
  ok("texte lu : coupé à " + VOIX_SIGNES_MAX + " signes maximum, à la fin d'une phrase", c.length <= VOIX_SIGNES_MAX && /\.$/.test(c));
}
ok("personnes réelles : refus + piste « source vérifiée »", /source vérifiée/.test(String(verifierDemandeImage("Le portrait du président de la République")?.message || "")));
ok("pièces : 5 et 30 par jour", PIECES_PAR_JOUR("essentiel") === 5 && PIECES_PAR_JOUR("complet") === 30);
const sS = supplement("sante", { imagesRestantes: 3, imagesPossibles: true, niveau: "complet", piece: false });
ok("consigne santé : pas de diagnostic ni de dose", /MODE MÉDECINE ET SANTÉ/.test(sS) && /diagnostic/.test(sS) && /dose/.test(sS));
ok("consigne : images autorisées si il en reste", /il en reste 3/.test(sS) && /"image":/.test(sS));
ok("consigne : images fermées sinon", /pas encore ouverte/.test(supplement("general", { imagesRestantes: 0, imagesPossibles: false, niveau: "essentiel", piece: false })));
ok("consigne : pièce jointe", /PIÈCE JOINTE/.test(supplement("general", { imagesRestantes: 0, imagesPossibles: true, niveau: "essentiel", piece: true })));

// ---------- Médecine experte, tests d'examen, filet « jamais de prescription » ----------
ok("mode Tests : biologie moléculaire", modeDe("Explique-moi la PCR en biologie moléculaire") === "examens");
ok("mode Tests : fais-moi passer un test", modeDe("Fais-moi passer un test de génétique") === "examens");
ok("mode Tests : QCM", modeDe("Voici un QCM de biochimie") === "examens");
ok("mode Santé : pas pris pour un test", modeDe("J'ai de la fièvre et mal à la gorge") === "sante");
ok("réflexion maximale en Santé et en Tests (Complet)", EFFORT("complet", "sante") === "high" && EFFORT("complet", "examens") === "high" && EFFORT("essentiel", "sante") === "medium");
ok("réflexion normale ailleurs", EFFORT("complet", "cuisine") === "medium" && EFFORT("essentiel", "droit") === "low" && EFFORT("complet") === "medium");
ok("réponses plus longues en Santé/Tests", MAX_JETONS("complet", "sante") === 4500 && MAX_JETONS("complet", "general") === 2200 && LIMITE_REPONSE("examens") === 6000 && LIMITE_REPONSE("cuisine") === 1800 && MODE_PROFOND("sante") && !MODE_PROFOND("droit"));
const cs = supplement("sante", { imagesRestantes: 0, imagesPossibles: false, niveau: "complet", piece: false });
ok("Santé : ne prescrit jamais", /NE PRESCRIS JAMAIS/.test(cs) && /pas de dose/.test(cs));
ok("Santé : oriente vers un spécialiste avec adresse vérifiable", /ORIENTATION/.test(cs) && /VÉRIFIABLES/.test(cs) && /N'invente|n'inventes JAMAIS une adresse/i.test(cs));
ok("Santé : couvre la biologie moléculaire et les spécialités", /biologie \(dont moléculaire\)/.test(cs) && /cardiologie/.test(cs) && /oncologie/.test(cs));
const ce = supplement("examens", { imagesRestantes: 0, imagesPossibles: false, niveau: "complet", piece: false });
ok("Tests : note sur 10 à deux décimales, honnêteté", /note sur 10 avec deux décimales/.test(ce) && /ne gonfles jamais/.test(ce) && /ne promets jamais une note parfaite/.test(ce));
for (const t of ["Prends 500 mg de paracétamol matin et soir", "2 comprimés par jour pendant 5 jours", "1 g toutes les 6 heures", "10 gouttes avant les repas"]) ok("dose repérée : " + t, gardePrescription(t, "sante").includes(MSG_PAS_DE_DOSE));
for (const t of ["Le paludisme est causé par un parasite du genre Plasmodium.", "Le glucose normal est de 0,7 à 1,1 g/L à jeun.", "Va voir un cardiologue cette semaine."]) ok("pas d'alerte inutile : " + t.slice(0, 40), gardePrescription(t, "sante") === t);
ok("pas d'alerte en mode Tests", gardePrescription("La dose de 500 mg par jour est un exemple de pharmacologie", "examens") === "La dose de 500 mg par jour est un exemple de pharmacologie");
ok("alerte posée une seule fois", (gardePrescription(gardePrescription("2 comprimés par jour", "sante"), "sante").match(/⚠️/g) || []).length === 1);

// ---------- Outil d'évaluation : la notation est juste ----------
{
  const { noter, evaluer } = await import("./evaluer-compagnon.mts");
  const jeu = JSON.parse((await import("node:fs")).readFileSync(new URL("./tests-compagnon/biologie-moleculaire-exemple.json", import.meta.url), "utf8")) as { questions: { q: string; choix: Record<string, string>; reponse: string }[] };
  ok("jeu d'exemple : 20 questions avec 4 choix et un corrigé valide", jeu.questions.length === 20 && jeu.questions.every((q) => Object.keys(q.choix).length === 4 && q.reponse in q.choix));
  ok("note : 20/20 = 10.00, 19/20 = 9.50, 0 = 0.00", noter(20, 20) === "10.00" && noter(19, 20) === "9.50" && noter(0, 20) === "0.00" && noter(1999, 2000) === "9.99");
  const parfait = await evaluer(jeu.questions, "complet", async (q) => "Je raisonne…\nREPONSE: " + q.reponse);
  ok("évaluation d'un candidat parfait → 10.00", parfait.note === "10.00" && parfait.fautes.length === 0);
  let n = 0; const moyen = await evaluer(jeu.questions, "complet", async (q) => "REPONSE: " + (n++ === 3 ? "D" : q.reponse));
  ok("évaluation avec 1 faute → 9.50 et la faute est listée", moyen.note === "9.50" && moyen.fautes.length === 1);
  const illisible = await evaluer(jeu.questions.slice(0, 2), "complet", async () => "je ne sais pas");
  ok("réponse sans lettre → comptée fausse", illisible.note === "0.00");
}
console.log(ko ? "ECHECS : " + ko : "TOUS LES TESTS OK"); process.exit(ko ? 1 : 0);
{
  const o = texteCompagnonPourKeydou(true), f = texteCompagnonPourKeydou(false);
  ok("Keydou : Compagnon ouvert → offres, capacités, jamais de prescription", /OUVERT/.test(o) && /5 000 FCFA/.test(o) && /19 \$/.test(o) && /ne prescrit JAMAIS/.test(o) && /35 images par mois/.test(o) && /10 images/.test(o));
  ok("Keydou : Compagnon fermé → pas d'ouverture annoncée, pas de date", /PAS encore ouvert/.test(f) && !/OUVERT \(/.test(f) && /Ne promets ni date/.test(f));
}
ok("clé valide : une vraie clé passe, un texte collé par erreur est refusé", cleValide("sk-proj-AbCdEf0123456789_xyz") && cleValide("sk_0123456789abcdef0123") && !cleValide("Envoie-moi ensuite la capture de la liste avec VOIX_API_KEY dedans") && !cleValide("") && !cleValide(undefined) && !cleValide("court"));
ok("raison technique : clé masquée, 220 signes au plus", !/sk-proj-abcdef/.test(nettoyerErreur("Incorrect API key provided: sk-proj-abcdef123456 You can find")) && nettoyerErreur("x".repeat(500)).length === 220);
{
  const o = ordonnerModelesImage(["gpt-4o", "gpt-image-1", "gpt-image-1-mini", "gpt-image-2", "gpt-image-1.5", "gpt-image-2-2026-01-15", "dall-e-3", "whisper-1"]);
  ok("modèles d'images : le plus récent d'abord, sans les autres modèles", o[0] === "gpt-image-2" && o.indexOf("gpt-image-1.5") < o.indexOf("gpt-image-1") && !o.includes("gpt-4o") && !o.includes("whisper-1") && o.includes("dall-e-3"));
}
{
  const c = connecteurs(), ext = ["chatgpt", "grok", "llama", "kling", "canva", "adobe", "gmail", "agenda", "drive", "github", "whatsapp"];
  ok("connecteurs externes : tous « bientôt » (aucun n'est faussement annoncé comme connecté)", ext.every((id) => c.find((x) => x.id === id)?.statut === "bientot"));
  ok("connecteurs réels : Claude, recherche et rappels actifs", ["claude", "recherche", "rappels"].every((id) => c.find((x) => x.id === id)?.statut === "actif"));
  ok("capacités : 6 rubriques, Essentiel = 5 fichiers par jour", listeCapacites("essentiel").length === 6 && /5 fichiers/.test(listeCapacites("essentiel").find((x) => x.id === "pieces")?.detail || ""));
}

