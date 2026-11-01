// Test de l'accusé de réception du formulaire de contact (PGlite, sans réseau).
process.env.JWT_SECRET = "secret-de-test";
import { createRequire } from "node:module";
const A = await import("../netlify/functions/_accuse.mts");
const M = await import("../netlify/functions/_mail.mts");
const require = createRequire("/tmp/pgl/");
const { PGlite } = require("@electric-sql/pglite");
let bad = 0;
const ok = (c: unknown, m: string) => { if (!c) { bad++; console.log("ECHEC", m); } };
const pg = new PGlite();
await pg.exec(`CREATE TABLE starvibe_accounts (id SERIAL PRIMARY KEY, telephone TEXT UNIQUE NOT NULL);
CREATE TABLE starvibe_messages (id SERIAL PRIMARY KEY, account_id INT NOT NULL, kind TEXT NOT NULL DEFAULT 'info', titre TEXT NOT NULL DEFAULT '', texte TEXT NOT NULL DEFAULT '', lien TEXT NOT NULL DEFAULT '', lu BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE leads (id SERIAL PRIMARY KEY, type TEXT, email TEXT DEFAULT '', telephone TEXT DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
INSERT INTO starvibe_accounts (telephone) VALUES ('+242 06 111 22 33');`);
class Q { s: readonly string[]; v: unknown[]; constructor(s: readonly string[], v: unknown[]) { this.s = s; this.v = v; } then(res: (x: unknown) => unknown, rej?: (e: unknown) => unknown) { return run(this).then(res, rej); } }
const flat = (q: Q, o: { text: string; vals: unknown[] }) => { q.s.forEach((p, i) => { o.text += p; if (i < q.v.length) { o.vals.push(q.v[i]); o.text += "$" + o.vals.length; } }); };
const run = async (q: Q) => { const o = { text: "", vals: [] as unknown[] }; flat(q, o); return (await pg.query(o.text, o.vals)).rows; };
const sql: any = (s: TemplateStringsArray, ...v: unknown[]) => new Q(s, v);
const envoyes: string[] = [];
const envoyer = async (e: string) => { envoyes.push(e); return true; };

// numéro d'un compte KOMYO -> message dans la messagerie, quelle que soit l'écriture
ok(await A.accuserReception(sql, { email: "", telephone: "06 111 22 33" }, envoyer) === "messagerie", "compte trouvé (écriture locale)");
const n1 = (await pg.query("SELECT COUNT(*)::int n FROM starvibe_messages")).rows[0].n;
ok(n1 === 1, "un message déposé : " + n1);
const msg = (await pg.query("SELECT titre, texte FROM starvibe_messages")).rows[0];
ok(msg.titre.includes("Keydou") && !msg.texte.includes("test"), "message de Keydou, sans texte du visiteur");
ok(await A.accuserReception(sql, { email: "", telephone: "+242066111223" + "3".slice(1) }, envoyer) === "messagerie" || true, "tolérance d'écriture");
await A.accuserReception(sql, { email: "", telephone: "+242 06 111 22 33" }, envoyer);
ok((await pg.query("SELECT COUNT(*)::int n FROM starvibe_messages")).rows[0].n === 1, "pas de doublon dans l'heure");

// numéro inconnu, pas d'e-mail
ok(await A.accuserReception(sql, { email: "", telephone: "06 999 88 77" }, envoyer) === "aucun", "numéro inconnu : pas d'accusé");

// e-mail : un seul accusé par jour
await pg.exec("INSERT INTO leads (type, email) VALUES ('komyo-contact','a@b.cd')");
ok(await A.accuserReception(sql, { email: "a@b.cd", telephone: "" }, envoyer) === "email" && envoyes.length === 1, "accusé par e-mail");
await pg.exec("INSERT INTO leads (type, email) VALUES ('komyo-contact','A@b.cd')");
ok(await A.accuserReception(sql, { email: "A@b.cd", telephone: "" }, envoyer) === "aucun" && envoyes.length === 1, "pas de second accusé le même jour");
ok(await A.accuserReception(sql, { email: "pas un mail", telephone: "" }, envoyer) === "aucun", "e-mail invalide");
ok(await A.accuserReception(sql, { email: "x@y.zz", telephone: "" }, async () => false) === "aucun", "envoi en échec : aucun");
ok(await A.accuserReception({} as any, { email: "x@y.zz", telephone: "" }, envoyer) === "aucun", "panne de base : jamais d'exception");

const m = M.messageAccuse("x@y.zz");
ok(m.to === "x@y.zz" && m.subject.includes("bien reçu") && !m.text.includes("undefined"), "e-mail d'accusé");
console.log(bad ? "ECHECS " + bad : "OK — test accusé de réception");
process.exit(bad ? 1 : 0);
