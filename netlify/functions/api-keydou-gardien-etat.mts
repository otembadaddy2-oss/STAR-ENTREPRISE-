// État du gardien Keydou de l'espace enfants : ffmpeg tourne-t-il, la clé de l'IA est-elle présente ? (lecture seule, aucun secret révélé)
import type { Config } from "@netlify/functions";
import { diagnostic } from "./_gardien.mts";

export default async () => Response.json(await diagnostic(), { headers: { "cache-control": "no-store" } });

export const config: Config = { path: "/api/keydou-gardien-etat" };
