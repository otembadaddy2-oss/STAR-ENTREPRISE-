// Vérifie le jeton d'installation et le manifeste de l'application Keydou.
process.env.JWT_SECRET = process.env.JWT_SECRET || "secret-de-test";
import { existsSync } from "node:fs";
import { decisionToken, checkDecisionToken } from "../netlify/functions/_push.mts";
import { manifesteKeydou } from "../netlify/functions/_compagnon.mts";
let ko = 0; const ok = (n: string, c: boolean) => { if (!c) ko++; console.log((c ? "OK  " : "ECHEC ") + n); };
const d = decisionToken("install", 42);
ok("jeton valide pour le bon compte", checkDecisionToken("install", 42, d.exp, d.t));
ok("jeton refusé pour un autre compte", !checkDecisionToken("install", 43, d.exp, d.t));
ok("jeton refusé s'il est modifié", !checkDecisionToken("install", 42, d.exp, d.t.replace(/.$/, d.t.endsWith("a") ? "b" : "a")));
ok("jeton refusé après expiration", !checkDecisionToken("install", 42, Math.floor(Date.now() / 1000) - 5, d.t));
ok("jeton d'installation inutilisable comme jeton de décision de dépôt", !checkDecisionToken("keydou", 42, d.exp, d.t));
const m = manifesteKeydou();
ok("manifeste : nom, démarrage, portée", m.name === "Keydou Compagnon" && m.start_url.startsWith(m.scope) && m.display === "standalone");
ok("manifeste : 4 icônes existantes", m.icons.length === 4 && m.icons.every((i) => existsSync("." + i.src)));
console.log(ko ? "ECHECS : " + ko : "TOUS LES TESTS OK"); process.exit(ko ? 1 : 0);
