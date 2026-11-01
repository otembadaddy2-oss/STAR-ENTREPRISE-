// Garde-fou : db() renvoie un objet { sql }. Écrire « const sql = db(); » plante la fonction (« sql is not a function », erreur 502).
// Ce test échoue si une fonction du site utilise db() sans en extraire { sql }.
import { readdirSync, readFileSync } from "node:fs";
const dossier = new URL("../netlify/functions/", import.meta.url);
let bad = 0;
for (const f of readdirSync(dossier).filter((n) => n.endsWith(".mts"))) {
  readFileSync(new URL(f, dossier), "utf8").split("\n").forEach((l, i) => {
    if (/=\s*db\(\)\s*;/.test(l) && !/\{\s*sql[\s,}]/.test(l) && !/const\s+(\w+)\s*=\s*db\(\)/.test(l.replace(/\{[^}]*\}/, ""))) return;
    if (/const\s+sql\s*=\s*db\(\)/.test(l)) { bad++; console.log("ECHEC", f + ":" + (i + 1), l.trim()); }
  });
}
console.log(bad ? "ÉCHECS : " + bad : "tous les contrôles OK (db() utilisé correctement)");
if (bad) process.exit(1);
