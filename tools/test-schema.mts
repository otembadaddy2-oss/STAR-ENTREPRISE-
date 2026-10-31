// Vérifie que SCHEMA_VERSION (netlify/functions/_db.mts) correspond bien au texte de ensureSchema().
// Usage : node --experimental-strip-types tools/test-schema.mts           → vérifie
//         node --experimental-strip-types tools/test-schema.mts --ecrire  → met la ligne à jour après une modification du schéma
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const fichier = new URL("../netlify/functions/_db.mts", import.meta.url);
let src = readFileSync(fichier, "utf8");
const debut = src.indexOf("export async function ensureSchema()");
const fin = src.indexOf("\nexport function json(");
if (debut < 0 || fin < 0) { console.log("ECHEC : ensureSchema() introuvable dans _db.mts"); process.exit(1); }
// l'empreinte porte sur le texte de la fonction, sans la ligne qui lit la version
const corps = src.slice(debut, fin);
const empreinte = createHash("sha1").update(corps).digest("hex").slice(0, 16);
const m = src.match(/const SCHEMA_VERSION = "([0-9a-f]{16})";/);
if (!m) { console.log("ECHEC : ligne SCHEMA_VERSION introuvable"); process.exit(1); }
if (process.argv.includes("--ecrire")) {
  src = src.replace(m[0], `const SCHEMA_VERSION = "${empreinte}";`);
  writeFileSync(fichier, src); console.log("SCHEMA_VERSION mise à jour :", empreinte); process.exit(0);
}
if (m[1] !== empreinte) { console.log(`ECHEC : le schéma a changé (${empreinte}) mais SCHEMA_VERSION vaut ${m[1]}. Lance la commande avec --ecrire.`); process.exit(1); }
console.log("tous les contrôles OK (version du schéma", empreinte + ")");
