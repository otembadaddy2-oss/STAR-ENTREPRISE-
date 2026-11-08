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
console.log(ko ? "ECHECS : " + ko : "TOUS LES TESTS OK"); process.exit(ko ? 1 : 0);
