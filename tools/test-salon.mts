// Tests du Salon : limites, codes, jetons LiveKit (signature vérifiée), calcul des minutes. Sans réseau, sans base.
import { jwtVerify } from "jose";
import { LIMITES, verdictCreation, nouveauCode, codeValide, minutesEstimees, httpDe, jetonEntree, configLk, niveauDe, TARIF_MINUTE_USD } from "../netlify/functions/_salon.mts";
let ko = 0;
const ok = (c: boolean, m: string) => { console.log((c ? "OK  " : "ÉCHEC ") + m); if (!c) ko++; };

ok(LIMITES.famille.personnes === 10 && LIMITES.gratuit.personnes === 4, "limites : 10 personnes en Famille, 4 en gratuit");
ok(LIMITES.gratuit.minutes === 20 && LIMITES.famille.minutes === 60, "durées : 20 min gratuit, 60 min Famille");
ok(niveauDe(true) === "famille" && niveauDe(false) === "gratuit", "niveau selon l'abonnement Famille");
ok(verdictCreation("gratuit", 0, 0).ok && verdictCreation("gratuit", 1, 0).ok, "gratuit : 2 salons par semaine autorisés");
const v = verdictCreation("gratuit", 2, 0); ok(!v.ok && /Famille/.test(v.raison), "gratuit : le 3e salon de la semaine est refusé avec un message clair");
ok(verdictCreation("famille", 50, 1499).ok, "Famille : pas de limite par semaine, quota du mois pas atteint");
ok(!verdictCreation("famille", 0, 1500).ok, "Famille : quota de 1 500 minutes-participant atteint");
const codes = new Set<string>(); for (let i = 0; i < 500; i++) codes.add(nouveauCode());
ok([...codes].every(codeValide) && codes.size > 495, "500 codes : valides, sans 0/O/1/I, tous différents");
ok(!codeValide("ABCDEFG0") && !codeValide("abcdefgh") && !codeValide("ABC"), "codes invalides refusés");
const maintenant = new Date("2026-11-10T10:00:00Z");
ok(minutesEstimees(new Date("2026-11-10T10:20:00Z"), maintenant) === 20, "minutes estimées : 20 min restantes = 20");
ok(minutesEstimees(new Date("2026-11-10T10:00:10Z"), maintenant) === 1, "minutes estimées : jamais moins de 1");
ok(httpDe("wss://komyo-abc.livekit.cloud/") === "https://komyo-abc.livekit.cloud", "adresse wss convertie en https");
ok(Math.abs(60 * 10 * TARIF_MINUTE_USD - 0.3) < 1e-9, "coût d'un salon de 10 personnes pendant 60 min = 0,30 $");

process.env.LIVEKIT_URL = "wss://test.livekit.cloud"; process.env.LIVEKIT_API_KEY = "APItest"; process.env.LIVEKIT_API_SECRET = "secret-de-test-assez-long-pour-hs256-0123456789";
ok(configLk().pret, "configuration LiveKit détectée quand les 3 variables existent");
const t = await jetonEntree("ABCDEFGH", "m42", "Henri", 1200);
const { payload } = await jwtVerify(t, new TextEncoder().encode(process.env.LIVEKIT_API_SECRET!), { issuer: "APItest" });
const video = payload.video as Record<string, unknown>;
ok(payload.sub === "m42" && payload.name === "Henri", "jeton : identité et nom corrects");
ok(video.room === "ABCDEFGH" && video.roomJoin === true && video.canPublish === true && video.canSubscribe === true, "jeton : droit d'entrer dans CE salon seulement");
ok(!("roomAdmin" in video) && !("roomCreate" in video), "jeton : aucun droit d'administration donné à un membre");
const dureeJeton = Number(payload.exp) - Math.floor(Date.now() / 1000); ok(dureeJeton > 1100 && dureeJeton <= 1210, "jeton : expire à la fin prévue du salon");
delete process.env.LIVEKIT_API_SECRET; ok(!configLk().pret, "sans le secret, le Salon se dit non branché");
let refus = false; try { await jetonEntree("ABCDEFGH", "m1", "X", 600); } catch { refus = true; } ok(refus, "sans clés : impossible de fabriquer un jeton");
console.log(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUS LES TESTS OK"); if (ko) process.exit(1);
