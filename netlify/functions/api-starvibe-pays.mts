// KOMYO — dans quel pays se trouve la personne ? (pour afficher les prix dans sa monnaie, et plus tard
// choisir l'annuaire de Keydou). Netlify donne le pays de la connexion ; rien n'est enregistré ici.
import type { Context, Config } from "@netlify/functions";

export default async (_req: Request, context: Context) => {
  const code = String(context.geo?.country?.code || "").toUpperCase().slice(0, 2);
  return new Response(JSON.stringify({ pays: code }), {
    headers: { "content-type": "application/json", "cache-control": "private, max-age=3600" },
  });
};

export const config: Config = {
  path: "/api/starvibe-pays",
};
