// Test de KOMYO Business — boutiques : ouverture, commande, accusé de réception, frais hebdomadaires (PGlite, sans réseau).
process.env.JWT_SECRET = "secret-de-test";
import { createRequire } from "node:module";
const B = await import("../netlify/functions/_boutique.mts");
const require = createRequire("/tmp/pgl/");
const { PGlite } = require("@electric-sql/pglite");
let bad = 0;
const ok = (c: unknown, m: string) => { if (!c) { bad++; console.log("ECHEC", m); } };
const pg = new PGlite();
await pg.exec(`
CREATE TABLE starvibe_accounts (id SERIAL PRIMARY KEY, telephone TEXT UNIQUE NOT NULL);
CREATE TABLE starvibe_profiles (id SERIAL PRIMARY KEY, account_id INT, nom TEXT, date_naissance TEXT, type_profil TEXT DEFAULT 'personnel');
CREATE TABLE starvibe_subscriptions (id SERIAL PRIMARY KEY, account_id INT, plan TEXT, montant_attendu INT, montant_recu INT, methode TEXT, statut TEXT, started_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, updated_at TIMESTAMPTZ DEFAULT now(), payeur_account_id INT, beneficiaire_nom TEXT DEFAULT '');
CREATE TABLE starvibe_messages (id SERIAL PRIMARY KEY, account_id INT NOT NULL, kind TEXT NOT NULL DEFAULT 'info', titre TEXT NOT NULL DEFAULT '', texte TEXT NOT NULL DEFAULT '', lien TEXT NOT NULL DEFAULT '', lu BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE starvibe_recus (id SERIAL PRIMARY KEY, kind TEXT NOT NULL, ref_id INTEGER NOT NULL, role TEXT NOT NULL DEFAULT 'client', account_id INTEGER, telephone TEXT NOT NULL DEFAULT '', numero TEXT NOT NULL DEFAULT '', titre TEXT NOT NULL DEFAULT '', montant INTEGER NOT NULL DEFAULT 0, expire_le TIMESTAMPTZ, texte TEXT NOT NULL DEFAULT '', variables JSONB NOT NULL DEFAULT '[]'::jsonb, statut TEXT NOT NULL DEFAULT 'a_envoyer', erreur TEXT NOT NULL DEFAULT '', wa_message_id TEXT NOT NULL DEFAULT '', envoye_le TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (kind, ref_id, role));
CREATE TABLE starvibe_boutiques (id SERIAL PRIMARY KEY, account_id INTEGER UNIQUE NOT NULL, nom TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', ville TEXT NOT NULL DEFAULT '', numero_paiement TEXT NOT NULL DEFAULT '', services JSONB NOT NULL DEFAULT '[]'::jsonb, statut TEXT NOT NULL DEFAULT 'active', pause_motif TEXT NOT NULL DEFAULT '', frais_curseur DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE starvibe_articles (id SERIAL PRIMARY KEY, boutique_id INTEGER NOT NULL, titre TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', prix INTEGER NOT NULL, actif BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE starvibe_commandes (id SERIAL PRIMARY KEY, boutique_id INTEGER NOT NULL, client_account_id INTEGER NOT NULL, lignes JSONB NOT NULL DEFAULT '[]'::jsonb, total INTEGER NOT NULL, statut TEXT NOT NULL DEFAULT 'en_attente', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), declare_at TIMESTAMPTZ, paid_at TIMESTAMPTZ);
CREATE TABLE starvibe_renouvellements (id SERIAL PRIMARY KEY, boutique_id INTEGER NOT NULL, nom_prenom TEXT NOT NULL, activites TEXT NOT NULL, montant INTEGER NOT NULL, frais_ids JSONB NOT NULL DEFAULT '[]'::jsonb, statut TEXT NOT NULL DEFAULT 'a_payer', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), declare_at TIMESTAMPTZ, valide_at TIMESTAMPTZ);
CREATE TABLE starvibe_frais (id SERIAL PRIMARY KEY, boutique_id INTEGER NOT NULL, semaine DATE NOT NULL, ventes_n INTEGER NOT NULL DEFAULT 0, ventes_total INTEGER NOT NULL DEFAULT 0, montant INTEGER NOT NULL DEFAULT 500, statut TEXT NOT NULL DEFAULT 'a_payer', declare_at TIMESTAMPTZ, paid_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (boutique_id, semaine));
INSERT INTO starvibe_accounts (telephone) VALUES ('+242 06 111 22 33'),('+242 06 444 55 66'),('+242 06 777 88 99'),('+242 06 000 11 22');
INSERT INTO starvibe_profiles (account_id, nom, date_naissance) VALUES (1,'Vendeuse','1990-05-01'),(2,'Cliente','1995-03-03'),(3,'Sans Business','1990-01-01'),(4,'Ado','2012-01-01');
INSERT INTO starvibe_subscriptions (account_id, plan, montant_attendu, montant_recu, statut, started_at, expires_at) VALUES (1,'business',5000,5000,'actif',now(), now()+interval '30 days'),(4,'business',5000,5000,'actif',now(), now()+interval '30 days');
`);
class Q { s: readonly string[]; v: unknown[]; constructor(s: readonly string[], v: unknown[]) { this.s = s; this.v = v; } then(res: (x: unknown) => unknown, rej?: (e: unknown) => unknown) { return run(this).then(res, rej); } }
const flat = (q: Q, o: { text: string; vals: unknown[] }) => { q.s.forEach((p, i) => { o.text += p; if (i < q.v.length) { const x = q.v[i]; if (x instanceof Q) flat(x, o); else { o.vals.push(x); o.text += "$" + o.vals.length; } } }); };
const run = async (q: Q) => { const o = { text: "", vals: [] as unknown[] }; flat(q, o); return (await pg.query(o.text, o.vals)).rows; };
const sql: any = (s: TemplateStringsArray, ...v: unknown[]) => new Q(s, v);
const q = async (t: string) => (await pg.query(t)).rows as any[];

// --- ouverture : règles
ok(!(await B.ouvrirBoutique(sql, 3, { nom: "X", numeroPaiement: "066111222", services: ["mode"], accepte: true })).ok, "sans Business : refusé");
ok(!(await B.ouvrirBoutique(sql, 4, { nom: "Ado Shop", numeroPaiement: "066111222", services: ["mode"], accepte: true })).ok, "mineur : refusé");
ok(!(await B.ouvrirBoutique(sql, 1, { nom: "Chez Awa", numeroPaiement: "066111222", services: ["mode"] })).ok, "règles non acceptées : refusé");
ok(!(await B.ouvrirBoutique(sql, 1, { nom: "Chez Awa", numeroPaiement: "123", services: ["mode"], accepte: true })).ok, "numéro invalide");
ok(!(await B.ouvrirBoutique(sql, 1, { nom: "Chez Awa", numeroPaiement: "066111222", services: ["nimporte"], accepte: true })).ok, "service inconnu");
const o = await B.ouvrirBoutique(sql, 1, { nom: "Chez Awa", ville: "Pointe-Noire", numeroPaiement: "06 611 12 22", services: ["mode", "beaute"], accepte: true });
ok(o.ok, "ouverture"); const bid = (o as any).data.id;
ok(!(await B.ajouterArticle(sql, 1, { titre: "Pagne", prix: 50 })).ok, "prix trop bas");
const a1 = await B.ajouterArticle(sql, 1, { titre: "Pagne wax", prix: 7500 }); const a2 = await B.ajouterArticle(sql, 1, { titre: "Sac", prix: 12000 });
ok(a1.ok && a2.ok, "articles");

// --- commande et accusé de réception
ok(!(await B.creerCommande(sql, 1, bid, [{ articleId: (a1 as any).data.id, qte: 1 }])).ok, "pas dans sa propre boutique");
ok(!(await B.creerCommande(sql, 2, bid, [{ articleId: 9999, qte: 1 }])).ok, "article inconnu");
ok(!(await B.creerCommande(sql, 2, bid, [{ articleId: (a1 as any).data.id, qte: 99 }])).ok, "quantité trop grande");
const c = await B.creerCommande(sql, 2, bid, [{ articleId: (a1 as any).data.id, qte: 2 }, { articleId: (a2 as any).data.id, qte: 1 }]);
ok(c.ok && (c as any).data.total === 27000 && (c as any).data.numeroPaiement === "06 611 12 22", "commande 27 000");
const cid = (c as any).data.id;
ok((await q("SELECT 1 FROM starvibe_messages WHERE account_id=1 AND kind='commande'")).length === 1, "vendeur prévenu de la commande");
ok(!(await B.confirmerCommande(sql, 2, cid)).ok, "le client ne peut pas confirmer à la place du vendeur");
ok((await B.declarerPaye(sql, 2, cid)).ok, "client déclare payé");
ok((await B.confirmerCommande(sql, 1, cid)).ok, "vendeur confirme");
ok(!(await B.confirmerCommande(sql, 1, cid)).ok, "pas de double confirmation");
const rec = await q("SELECT role, account_id, statut, titre, montant FROM starvibe_recus ORDER BY id");
ok(rec.length === 2 && rec.some((r) => r.role === "client" && r.account_id === 2 && r.montant === 27000) && rec.some((r) => r.role === "vendeur" && r.account_id === 1), "accusé client + notification vendeur : " + JSON.stringify(rec));
const mc = await q("SELECT texte FROM starvibe_messages WHERE account_id=2 AND kind='recu'");
ok(mc.length === 1 && mc[0].texte.includes("2 × Pagne wax") && mc[0].texte.includes("27 000 FCFA") && mc[0].texte.includes("CMD-" + cid), "reçu du client dans sa messagerie");
ok((await q("SELECT 1 FROM starvibe_messages WHERE account_id=1 AND kind='vente'")).length === 1, "notification de vente dans la messagerie du vendeur");

// --- frais : CHAQUE semaine d'ouverture (avec ou sans vente), une seule facture par semaine, semaine d'ouverture offerte
await B.genererFrais(sql, bid);
ok((await q("SELECT 1 FROM starvibe_frais")).length === 0, "semaine d'ouverture offerte : pas de facture");
const c2 = await B.creerCommande(sql, 2, bid, [{ articleId: (a1 as any).data.id, qte: 1 }]); await B.confirmerCommande(sql, 1, (c2 as any).data.id);
await pg.exec(`UPDATE starvibe_commandes SET paid_at = now() - interval '8 days' WHERE id IN (${cid}, ${(c2 as any).data.id})`);   // les deux ventes passent à la semaine précédente
// on recule le curseur de 2 semaines : 2 semaines terminées à facturer (une avec 2 ventes, une SANS aucune vente)
await pg.exec("UPDATE starvibe_boutiques SET frais_curseur = (date_trunc('week', now() AT TIME ZONE 'Africa/Brazzaville') - interval '14 days')::date");
await B.genererFrais(sql, bid); await B.genererFrais(sql, bid);
const fr = await q("SELECT * FROM starvibe_frais ORDER BY semaine");
ok(fr.length === 2 && fr.every((f) => f.montant === 500), "2 factures de 500 F : " + JSON.stringify(fr));
ok(fr[0].ventes_n === 0 && fr[1].ventes_n === 2 && fr[1].ventes_total === 34500, "semaine sans vente facturée aussi ; semaine avec 2 ventes : 34 500 F");
ok((await q("SELECT 1 FROM starvibe_messages WHERE account_id=1 AND kind='frais'")).length === 2, "2 factures dans la messagerie, sans doublon");
ok((await q("SELECT statut FROM starvibe_boutiques"))[0].statut === "active", "pas encore en pause");
await pg.exec("UPDATE starvibe_frais SET created_at = now() - interval '9 days'");
await B.genererFrais(sql, bid);
ok((await q("SELECT statut FROM starvibe_boutiques"))[0].statut === "active", "9 jours d'impayé : toujours ouverte (1 semaine + 3 jours de grâce)");
await pg.exec("UPDATE starvibe_frais SET created_at = now() - interval '11 days'");
await B.genererFrais(sql, bid);
ok((await q("SELECT statut FROM starvibe_boutiques"))[0].statut === "pause", "pause automatique après 10 jours");
ok(!(await B.creerCommande(sql, 2, bid, [{ articleId: (a1 as any).data.id, qte: 1 }])).ok, "boutique en pause : pas de commande");
// --- renouvellement : fiche, dette affichée, dépôt, validation par l'équipe
const d0 = await B.dette(sql, bid); ok(d0.montant === 1000 && d0.semaines === 2, "dette de 2 × 500 F = 1 000 F");
ok(!(await B.demanderRenouvellement(sql, 1, { nomPrenom: "A", activites: "Pagnes", detteCochee: true })).ok, "nom trop court");
ok(!(await B.demanderRenouvellement(sql, 1, { nomPrenom: "Awa Mbemba", activites: "", detteCochee: true })).ok, "activités manquantes");
ok(!(await B.demanderRenouvellement(sql, 1, { nomPrenom: "Awa Mbemba", activites: "Pagnes et sacs", detteCochee: false })).ok, "case dette non cochée");
const rn = await B.demanderRenouvellement(sql, 1, { nomPrenom: "Awa Mbemba", activites: "Pagnes et sacs", detteCochee: true });
ok(rn.ok && (rn as any).data.montant === 1000 && (rn as any).data.numeroKomyo === "+242 06 656 50 50", "demande de renouvellement");
const rid = (rn as any).data.id;
ok((await q("SELECT statut FROM starvibe_boutiques"))[0].statut === "pause", "toujours en pause tant que non validé");
ok((await B.declarerRenouvellement(sql, 1, rid)).ok, "vendeur déclare son dépôt");
ok(!(await B.confirmerRenouvellement(sql, 999)).ok, "demande inconnue");
ok((await B.confirmerRenouvellement(sql, rid)).ok && !(await B.confirmerRenouvellement(sql, rid)).ok, "équipe valide (une seule fois)");
ok((await q("SELECT statut FROM starvibe_boutiques"))[0].statut === "active", "boutique rouverte après validation");
await pg.exec("UPDATE starvibe_boutiques SET statut = 'pause', pause_motif = 'staff'");
await pg.exec("UPDATE starvibe_boutiques SET frais_curseur = (date_trunc('week', now() AT TIME ZONE 'Africa/Brazzaville') - interval '21 days')::date");
const avant = (await q("SELECT COUNT(*)::int AS n FROM starvibe_frais"))[0].n;
await B.genererFrais(sql, bid);
ok((await q("SELECT COUNT(*)::int AS n FROM starvibe_frais"))[0].n === avant, "boutique en pause : pas de frais pendant la pause");
await pg.exec("UPDATE starvibe_boutiques SET statut = 'active', pause_motif = ''");
ok((await B.dette(sql, bid)).montant === 0, "plus de dette : case Fermé");
ok((await q("SELECT 1 FROM starvibe_recus WHERE kind='renouv'")).length === 1, "reçu du renouvellement");
ok(!(await B.demanderRenouvellement(sql, 1, { nomPrenom: "Awa Mbemba", activites: "Pagnes", detteCochee: true })).ok, "sans dette : rien à renouveler");
ok((await B.creerCommande(sql, 2, bid, [{ articleId: (a1 as any).data.id, qte: 1 }])).ok, "commande à nouveau possible");
// abonnement Business expiré : plus de commande
await pg.exec("UPDATE starvibe_subscriptions SET expires_at = now() - interval '1 day' WHERE account_id = 1");
ok(!(await B.creerCommande(sql, 2, bid, [{ articleId: (a1 as any).data.id, qte: 1 }])).ok, "Business expiré : boutique fermée");
console.log(bad ? `${bad} échec(s)` : "tous les contrôles OK");
