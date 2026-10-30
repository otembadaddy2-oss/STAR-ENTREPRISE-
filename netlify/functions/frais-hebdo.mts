// Chaque lundi matin (Brazzaville), KOMYO facture les 500 FCFA de la semaine écoulée aux boutiques qui ont eu des ventes,
// met en pause celles qui ont plus de 7 jours de retard, et rouvre celles qui ont tout réglé. La même logique tourne aussi
// à l'ouverture de « Ma boutique » et à chaque commande : cette tâche ne sert qu'à ne rien oublier si le vendeur n'ouvre pas son espace.
import type { Config } from "@netlify/functions";
import { ensureSchema, db } from "./_db.mts";
import { genererFrais } from "./_boutique.mts";

export default async () => {
  await ensureSchema();
  const { sql } = db();
  const rows = (await sql`SELECT id FROM starvibe_boutiques`) as { id: number }[];
  for (const r of rows) await genererFrais(sql, r.id);
  return new Response(JSON.stringify({ boutiques: rows.length }), { headers: { "content-type": "application/json" } });
};

export const config: Config = { schedule: "0 5 * * 1" };   // lundi 05:00 UTC = 06:00 à Brazzaville
