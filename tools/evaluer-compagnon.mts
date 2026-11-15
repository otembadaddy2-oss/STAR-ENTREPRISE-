// Évalue Keydou Compagnon sur de VRAIS sujets : QCM avec corrigé, note sur 10 (deux décimales).
// Usage : ANTHROPIC_API_KEY=… npx tsx tools/evaluer-compagnon.mts tools/tests-compagnon/biologie-moleculaire-exemple.json [complet|essentiel]
// Les sujets et leurs corrigés doivent venir d'une source fiable (cours, annales). Le fichier fourni n'est qu'un exemple de bases classiques.
// Même modèle, même réflexion et même consigne « Tests » que dans l'application (netlify/functions/_compagnon2.mts).
import { readFileSync } from "node:fs";
import { supplement, EFFORT, MAX_JETONS, MODELE_NIVEAU } from "../netlify/functions/_compagnon2.mts";
import { consigne, type Niveau } from "../netlify/functions/_compagnon.mts";

// La note est TRONQUÉE (jamais arrondie vers le haut) : on ne gonfle pas la note. 1999 / 2000 = 9.99.
export const noter = (bonnes: number, total: number): string => (total ? (Math.floor((bonnes / total) * 1000 + 1e-9) / 100).toFixed(2) : "0.00");
interface Q { q: string; choix: Record<string, string>; reponse: string }

export async function evaluer(questions: Q[], niveau: Niveau, appeler: (q: Q) => Promise<string>) {
  let bonnes = 0; const fautes: { q: string; attendu: string; recu: string }[] = [];
  for (const q of questions) {
    const txt = (await appeler(q)).toUpperCase();
    const m = /REPONSE\s*[:=]\s*([A-F])/.exec(txt.normalize("NFD").replace(/[̀-ͯ]/g, ""));
    const recu = m ? m[1] : "?";
    if (recu === q.reponse.toUpperCase()) bonnes++; else fautes.push({ q: q.q, attendu: q.reponse, recu });
  }
  return { bonnes, total: questions.length, note: noter(bonnes, questions.length), fautes };
}

async function appelReel(niveau: Niveau, q: Q): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY; if (!key) throw new Error("ANTHROPIC_API_KEY manquante");
  const base = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/+$/, "");
  const enonce = `${q.q}\n${Object.entries(q.choix).map(([k, v]) => `${k}) ${v}`).join("\n")}\n\nRaisonne étape par étape, vérifie ta réponse, puis termine par une dernière ligne exactement de la forme « REPONSE: X » (X = la lettre).`;
  const r = await fetch(`${base}/v1/messages`, { method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }, body: JSON.stringify({
    model: MODELE_NIVEAU(niveau), max_tokens: MAX_JETONS(niveau, "examens"), output_config: { effort: EFFORT(niveau, "examens") },
    system: [{ type: "text", text: consigne() }, { type: "text", text: supplement("examens", { imagesRestantes: 0, imagesPossibles: false, niveau, piece: false }) + "\nPour cette évaluation, n'utilise PAS le format JSON : réponds en texte." }],
    messages: [{ role: "user", content: enonce }] }) });
  const d = (await r.json()) as { content?: { type: string; text?: string }[] };
  return (d.content || []).filter((b) => b.type === "text").map((b) => b.text || "").join("");
}

if (process.argv[1] && process.argv[1].endsWith("evaluer-compagnon.mts")) {
  const fichier = process.argv[2]; const niveau: Niveau = process.argv[3] === "essentiel" ? "essentiel" : "complet";
  if (!fichier) { console.log("Usage : ANTHROPIC_API_KEY=… npx tsx tools/evaluer-compagnon.mts <fichier.json> [complet|essentiel]"); process.exit(1); }
  const jeu = JSON.parse(readFileSync(fichier, "utf8")) as { titre?: string; questions: Q[] };
  const res = await evaluer(jeu.questions, niveau, (q) => appelReel(niveau, q));
  console.log(`${jeu.titre || fichier}\nNiveau ${niveau} : ${res.bonnes} / ${res.total} bonnes réponses → NOTE ${res.note} / 10`);
  for (const f of res.fautes) console.log(` - à revoir : « ${f.q} » (attendu ${f.attendu}, reçu ${f.recu})`);
}
