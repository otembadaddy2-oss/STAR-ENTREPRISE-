// Balayage régulier du gardien de l'espace enfants : toute vidéo PIOUPIOU encore en attente est contrôlée par Keydou
// (rattrapage si le contrôle immédiat n'a pas pu se faire). Voir _gardien.mts.
import type { Config } from "@netlify/functions";
import { ensureSchema, db } from "./_db.mts";
import { analyserEnAttente } from "./_gardien.mts";

export default async () => {
  await ensureSchema();
  const { sql } = db();
  const faits = await analyserEnAttente(sql, 8);
  return Response.json({ analyses: faits.length });
};

// Une fois par heure suffit : chaque vidéo est déjà contrôlée dès sa publication (fonction « background »). Ce balayage ne sert que de rattrapage,
// et un passage toutes les 5 minutes gardait la base de données éveillée jour et nuit (crédits Netlify « Compute »).
export const config: Config = { schedule: "0 * * * *" };
