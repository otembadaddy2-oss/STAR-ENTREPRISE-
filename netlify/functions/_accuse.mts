// Accusé de réception du formulaire de contact KOMYO : la personne sait que son message est bien arrivé.
//  - si son numéro est celui d'un compte KOMYO : un message de Keydou dans sa messagerie ;
//  - sinon, si elle a donné son e-mail : un accusé par e-mail ;
//  - sinon rien (le site affiche seulement « Merci »).
// Le message du visiteur n'est jamais repris dans l'accusé (personne ne peut faire écrire un texte à quelqu'un d'autre).
import { memeNumero, fin8Chiffres } from "./_tel.mts";
import { poster } from "./_msg.mts";
import { envoyerAccuse } from "./_mail.mts";

// deno-lint-ignore no-explicit-any
type Sql = any;
export type Accuse = "messagerie" | "email" | "aucun";

export const TITRE_ACCUSE = "Keydou a bien reçu ton message";
export const TEXTE_ACCUSE = "Bonjour ! Ton message est bien arrivé à l'équipe STAR ENTREPRISE. Nous te répondons dès que possible. En attendant, si tu as besoin d'un service (hôtel, restaurant, garage…), je suis là pour t'aider.";

export async function accuserReception(sql: Sql, d: { email: string; telephone: string }, envoyer: (e: string) => Promise<boolean> = envoyerAccuse): Promise<Accuse> {
  try {
    const tel = fin8Chiffres(d.telephone || "");
    if (tel.length === 8) {
      const comptes = ((await sql`SELECT id, telephone FROM starvibe_accounts WHERE RIGHT(regexp_replace(telephone, '[^0-9]', '', 'g'), 8) = ${tel} LIMIT 20`) as { id: number; telephone: string }[]).filter((c) => memeNumero(c.telephone, d.telephone));
      if (comptes[0]) {
        const deja = (await sql`SELECT 1 FROM starvibe_messages WHERE account_id = ${comptes[0].id} AND titre = ${TITRE_ACCUSE} AND created_at > now() - interval '1 hour' LIMIT 1`) as unknown[];
        if (!deja.length) await poster(sql, comptes[0].id, { kind: "info", titre: TITRE_ACCUSE, texte: TEXTE_ACCUSE, lien: "keydou.html" });
        return "messagerie";
      }
    }
    const email = String(d.email || "").trim();
    if (/^[^\s@<>,;]{1,64}@[^\s@<>,;]{1,63}\.[^\s@<>,;]{2,}$/.test(email)) {
      // au plus un accusé par adresse et par jour (la demande qui vient d'être enregistrée compte pour 1)
      const n = (((await sql`SELECT COUNT(*)::int AS n FROM leads WHERE type = 'komyo-contact' AND lower(email) = lower(${email}) AND created_at > now() - interval '24 hours'`) as { n: number }[])[0]?.n) || 0;
      if (n <= 1 && (await envoyer(email))) return "email";
    }
  } catch (e) { console.error("accusé", e); }
  return "aucun";
}
