// Test du gardien Keydou de l'espace enfants (PGlite, ffmpeg local, IA simulée : sans réseau).
process.env.JWT_SECRET = "secret-de-test";
process.env.FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const G = await import("../netlify/functions/_gardien.mts");
const require = createRequire("/tmp/pgl/");
const { PGlite } = require("@electric-sql/pglite");
let bad = 0;
const ok = (c: unknown, m: string) => { if (!c) { bad++; console.log("ECHEC", m); } };
const J = (verdict: any, confiance: number, raison = "r") => ({ verdict, confiance, categorie: "aucune", raison });

// règle de décision : prudente
ok(G.decider(J("ok", 0.95), 6) === "approuve", "ok sûr -> approuve");
ok(G.decider(J("ok", 0.7), 6) === "doute", "ok peu sûr -> doute");
ok(G.decider(J("ok", 0.99), 2) === "doute", "trop peu d'images -> doute");
ok(G.decider(J("refuse", 0.9), 6) === "rejete", "refus sûr -> rejete");
ok(G.decider(J("refuse", 0.5), 6) === "doute", "refus peu sûr -> doute");
ok(G.decider(J("doute", 1), 6) === "doute", "doute -> doute");
ok(G.decider(null, 6) === "doute", "pas de réponse -> doute");
ok(G.verifierAnalyse(7, G.signerAnalyse(7)) && !G.verifierAnalyse(8, G.signerAnalyse(7)) && !G.verifierAnalyse(7, ""), "signature");

// extraction réelle d'images
const video = readFileSync(process.argv[2]);
const imgs = await G.extraireImages(video);
ok(imgs.length >= 5 && imgs.length <= 10, "images extraites : " + imgs.length);
ok(imgs.every((b) => b[0] === 0xff && b[1] === 0xd8), "ce sont des JPEG");

// base + flux complet
const pg = new PGlite();
await pg.exec(`CREATE TABLE starvibe_videos (id SERIAL PRIMARY KEY, account_id INT, legende TEXT, blob_key TEXT, espace TEXT NOT NULL DEFAULT 'general', pour_enfants BOOLEAN DEFAULT false, moderation_statut TEXT DEFAULT 'approuve', gardien_verdict TEXT NOT NULL DEFAULT '', gardien_raison TEXT NOT NULL DEFAULT '', gardien_essais INT NOT NULL DEFAULT 0, gardien_le TIMESTAMPTZ);`);
class Q { s: readonly string[]; v: unknown[]; constructor(s: readonly string[], v: unknown[]) { this.s = s; this.v = v; } then(res: (x: unknown) => unknown, rej?: (e: unknown) => unknown) { return run(this).then(res, rej); } }
const flat = (q: Q, o: { text: string; vals: unknown[] }) => { q.s.forEach((p, i) => { o.text += p; if (i < q.v.length) { o.vals.push(q.v[i]); o.text += "$" + o.vals.length; } }); };
const run = async (q: Q) => { const o = { text: "", vals: [] as unknown[] }; flat(q, o); return (await pg.query(o.text, o.vals)).rows; };
const sql: any = (s: TemplateStringsArray, ...v: unknown[]) => new Q(s, v);
const msgs: any[] = [], alertes: string[] = [], espaces: string[] = [];
let reponse: any = J("ok", 0.95, "Joyeux et adapté.");
const dep = { lireVideo: async () => video, extraire: G.extraireImages, juger: async (_i: unknown, _l: string, e: string) => { espaces.push(e); return reponse; }, poster: async (id: number, m: any) => { msgs.push({ id, ...m }); }, alerter: async (t: string) => { alertes.push(t); } };
const ajouter = async (kids: boolean, legende: string) => (await pg.query(`INSERT INTO starvibe_videos (account_id, legende, blob_key, pour_enfants, moderation_statut) VALUES (1,$1,'k',$2,'en_attente') RETURNING id`, [legende, kids])).rows[0].id as number;
const statut = async (id: number) => (await pg.query(`SELECT moderation_statut s, gardien_verdict v FROM starvibe_videos WHERE id=${id}`)).rows[0];

let id = await ajouter(true, "Ma petite chanson");
ok(await G.analyserVideo(sql, id, dep as any) === "approuve", "bonne vidéo approuvée");
ok((await statut(id)).s === "approuve" && msgs.at(-1).titre.includes("dans PIOUPIOU"), "statut approuvé + message");
ok(await G.analyserVideo(sql, id, dep as any) === null, "pas d'analyse en double");

reponse = J("refuse", 0.95, "Elle montre une scène violente.");
id = await ajouter(true, "bagarre");
ok(await G.analyserVideo(sql, id, dep as any) === "rejete", "mauvaise vidéo refusée");
ok((await statut(id)).s === "rejete" && msgs.at(-1).titre.includes("non acceptable") && msgs.at(-1).texte.includes("violente") && msgs.at(-1).texte.includes("réservé aux enfants"), "refus + message à l'auteur");

reponse = J("doute", 0.6, "Image floue.");
id = await ajouter(true, "bizarre");
ok(await G.analyserVideo(sql, id, dep as any) === "doute", "doute");
ok((await statut(id)).s === "en_attente" && (await statut(id)).v === "doute" && alertes.length === 1, "reste en attente + Carry prévenu");

id = await ajouter(false, "fil normal");
ok(await G.analyserVideo(sql, id, dep as any) === null && (await statut(id)).s === "en_attente", "vidéos hors espace enfants ignorées");

// KOMYO Jeunes : même contrôle, règles d'adolescents
reponse = J("refuse", 0.95, "Elle montre des images à caractère sexuel.");
const idJ = (await pg.query(`INSERT INTO starvibe_videos (account_id, legende, blob_key, espace, pour_enfants, moderation_statut) VALUES (1,'ado','k','jeunes',false,'en_attente') RETURNING id`)).rows[0].id as number;
ok(await G.analyserVideo(sql, idJ, dep as any) === "rejete", "KOMYO Jeunes : contenu sexuel refusé");
ok(espaces.at(-1) === "jeunes" && msgs.at(-1).titre.includes("KOMYO Jeunes") && msgs.at(-1).texte.includes("13 à 17 ans"), "règles et message adaptés aux ados");

// panne de l'IA : réessais puis doute
reponse = null;
id = await ajouter(true, "panne");
ok(await G.analyserVideo(sql, id, dep as any) === null && (await statut(id)).v === "", "panne 1 : on réessaiera");
for (let k = 0; k < 2; k++) { await pg.query(`UPDATE starvibe_videos SET gardien_le = now() - interval '11 minutes' WHERE id=${id}`); await G.analyserVideo(sql, id, dep as any); }
ok((await statut(id)).v === "doute" && (await statut(id)).s === "en_attente", "3 pannes -> doute (jamais approuvée)");

// balayage
reponse = J("ok", 0.95); const id2 = await ajouter(true, "balayage");
const bal = await G.analyserEnAttente(sql, 10, dep as any);
ok(bal.length === 1 && bal[0].id === id2 && bal[0].decision === "approuve", "balayage");
console.log(bad ? "ECHECS " + bad : "OK — test gardien Keydou");
process.exit(bad ? 1 : 0);
