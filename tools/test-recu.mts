// Test des reçus de paiement : textes, numéros WhatsApp, et émission en base (PGlite, sans réseau).
import { createRequire } from "node:module";
process.env.JWT_SECRET = "secret-de-test";
process.env.URL = "https://exemple.netlify.app";
const { dateFr, numeroWhatsApp, texteRecu, variablesModele, recuAbonnement, recuKeydou, recuAnnonce, lienFacture, jetonFactureValide } = await import("../netlify/functions/_recu.mts");
const require = createRequire("/tmp/pgl/");
const { PGlite } = require("@electric-sql/pglite");
let bad = 0;
const ok = (c: unknown, m: string) => { if (!c) { bad++; console.log("ECHEC", m); } };

ok(dateFr(new Date("2026-11-29T22:30:00Z")) === "29 novembre 2026", "date 29 nov");
ok(dateFr(new Date("2026-11-30T23:30:00Z")) === "1er décembre 2026", "date 1er déc (UTC+1)");
ok(numeroWhatsApp("+242 06 656 50 50") === "242066565050", "congo explicite");
ok(numeroWhatsApp("06 656 50 50") === "242066565050", "congo local 9 chiffres");
ok(numeroWhatsApp("6 656 50 50") === "242066565050", "congo local 8 chiffres");
ok(numeroWhatsApp("+225 07 12 34 56 78") === "2250712345678", "côte d'ivoire");
ok(numeroWhatsApp("123") === "", "trop court");
const info = { titre: "Abonnement Famille PIOUPIOU (1 mois)", montant: 1500, payeLe: new Date("2026-10-30T14:00:00Z"), fin: new Date("2026-11-29T14:00:00Z"), detail: "dessins animés premium", reference: "KOMYO-12", methode: "mobile_money" };
const t = texteRecu("REC-2026-000001", info);
ok(t.includes("1 500 FCFA") && t.includes("Valable jusqu'au : 29 novembre 2026") && t.includes("KOMYO-12") && t.includes("PIN"), "texte du reçu");
ok(variablesModele("REC-1", info, "https://x/y").length === 7 && variablesModele("REC-1", info).every((v) => !/[\n\t]/.test(v)), "variables sans retour à la ligne");
const lien = lienFacture(42);
ok(/^https:\/\/exemple\.netlify\.app\/starvibe\/recu\.html\?id=42&t=[0-9a-f]{40}$/.test(lien), "lien facture");
ok(jetonFactureValide(42, lien.split("t=")[1]) && !jetonFactureValide(43, lien.split("t=")[1]) && !jetonFactureValide(42, "x".repeat(40)), "jeton signé");
ok(texteRecu("R", info, "client", "", lien).includes("logo KOMYO") && texteRecu("R", info).includes("KOMYO, le monde en mouvement"), "texte avec facture et slogan");
ok(texteRecu("R", info, "payeur", "Mawa").includes("Vous avez offert"), "texte payeur");

// --- base de test
const pg = new PGlite();
await pg.exec(`
CREATE TABLE starvibe_accounts (id SERIAL PRIMARY KEY, telephone TEXT UNIQUE NOT NULL);
CREATE TABLE starvibe_subscriptions (id SERIAL PRIMARY KEY, account_id INT, plan TEXT, montant_attendu INT, montant_recu INT, methode TEXT, statut TEXT, started_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, updated_at TIMESTAMPTZ DEFAULT now(), payeur_account_id INT, beneficiaire_nom TEXT DEFAULT '');
CREATE TABLE starvibe_keydou_requests (id SERIAL PRIMARY KEY, account_id INT, service TEXT, ville TEXT, montant_attendu INT, montant_recu INT, reference_transaction TEXT DEFAULT '', statut TEXT, paid_at TIMESTAMPTZ, updated_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE starvibe_pub (id SERIAL PRIMARY KEY, account_id INT, jours INT, montant_attendu INT, montant_recu INT, statut TEXT, started_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE starvibe_recus (id SERIAL PRIMARY KEY, kind TEXT NOT NULL, ref_id INTEGER NOT NULL, role TEXT NOT NULL DEFAULT 'client', account_id INTEGER, telephone TEXT NOT NULL DEFAULT '', numero TEXT NOT NULL DEFAULT '', titre TEXT NOT NULL DEFAULT '', montant INTEGER NOT NULL DEFAULT 0, expire_le TIMESTAMPTZ, texte TEXT NOT NULL DEFAULT '', variables JSONB NOT NULL DEFAULT '[]'::jsonb, statut TEXT NOT NULL DEFAULT 'a_envoyer', erreur TEXT NOT NULL DEFAULT '', wa_message_id TEXT NOT NULL DEFAULT '', envoye_le TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (kind, ref_id, role));
INSERT INTO starvibe_accounts (telephone) VALUES ('+242 06 111 22 33'), ('+242 06 444 55 66'), ('abc');
INSERT INTO starvibe_subscriptions (account_id, plan, montant_attendu, montant_recu, methode, statut, started_at, expires_at, payeur_account_id, beneficiaire_nom) VALUES
 (1,'famille',1500,1500,'mobile_money','actif',now(), now() + interval '30 days', NULL, ''),
 (2,'famille',1500,1500,'mobile_money','actif',now(), now() + interval '30 days', 1, 'Mawa'),
 (3,'famille',1500,1500,'mobile_money','actif',now(), now() + interval '30 days', NULL, ''),
 (1,'business',5000,NULL,'','en_attente_paiement',NULL,NULL,NULL,'');
INSERT INTO starvibe_keydou_requests (account_id, service, ville, montant_attendu, montant_recu, statut, paid_at) VALUES (1,'hotel','Pointe-Noire',1000,1000,'paye',now()), (1,'hotel','Pointe-Noire',1000,NULL,'en_attente_paiement',NULL);
INSERT INTO starvibe_pub (account_id, jours, montant_attendu, montant_recu, statut, started_at, expires_at) VALUES (2,14,4000,4000,'actif',now(), now() + interval '14 days');
`);
// adaptateur : sql`...` avec fragments imbriqués, comme l'outil de Netlify
class Q { s: readonly string[]; v: unknown[]; constructor(s: readonly string[], v: unknown[]) { this.s = s; this.v = v; } then(res: (x: unknown) => unknown, rej?: (e: unknown) => unknown) { return run(this).then(res, rej); } }
const flat = (q: Q, out: { text: string; vals: unknown[] }) => { q.s.forEach((p, i) => { out.text += p; if (i < q.v.length) { const x = q.v[i]; if (x instanceof Q) flat(x, out); else { out.vals.push(x); out.text += "$" + out.vals.length; } } }); };
const run = async (q: Q) => { const o = { text: "", vals: [] as unknown[] }; flat(q, o); return (await pg.query(o.text, o.vals)).rows; };
const sql: any = (s: TemplateStringsArray, ...v: unknown[]) => new Q(s, v);

await recuAbonnement(sql, 1);   // client simple
await recuAbonnement(sql, 2);   // cadeau : payeur (compte 1) + bénéficiaire (compte 2)
await recuAbonnement(sql, 3);   // numéro invalide
await recuAbonnement(sql, 4);   // en attente : rien
await recuAbonnement(sql, 1);   // deuxième confirmation : pas de doublon
await recuKeydou(sql, 1, "Un hôtel ou une résidence");
await recuKeydou(sql, 2);       // pas payé : rien
await recuAnnonce(sql, 1, "2 semaines");
const rows = (await pg.query("SELECT kind, ref_id, role, telephone, numero, statut, titre, montant FROM starvibe_recus ORDER BY id")).rows as any[];
console.table(rows);
ok(rows.length === 6, "6 reçus attendus, obtenu " + rows.length);
ok(rows.filter((r) => r.kind === "abo" && r.ref_id === 1).length === 1, "pas de doublon");
ok(rows.some((r) => r.role === "payeur" && r.telephone === "242061112233"), "payeur = compte 1");
ok(rows.some((r) => r.role === "beneficiaire" && r.telephone === "242064445566"), "bénéficiaire = compte 2");
ok(rows.some((r) => r.ref_id === 3 && r.statut === "sans_numero"), "sans numéro");
ok(rows.filter((r) => r.statut === "a_envoyer").length === 5, "5 à envoyer (WhatsApp non branché)");
ok(rows.every((r) => /^REC-2026-\d{6}$/.test(r.numero)), "numéros de reçu");
const tx = (await pg.query("SELECT texte FROM starvibe_recus WHERE kind='pub'")).rows[0] as any;
ok(tx.texte.includes("Annonce visible par tous") && tx.texte.includes("Valable jusqu'au") && tx.texte.includes("recu.html?id="), "reçu annonce avec lien facture");
console.log(bad ? `${bad} échec(s)` : "tous les contrôles OK");
