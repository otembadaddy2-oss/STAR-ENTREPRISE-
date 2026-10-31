// PIOUPIOU — épisodes officiels de STAR ENTREPRISE (A1, A2, A3…).
//
// Ce sont les dessins animés validés par Carry OTEMBA lui-même : ils n'ont pas besoin de passer par la file de
// modération des vidéos publiées par les utilisateurs. Ils sont réservés aux abonnés Famille, comme toute vidéo premium :
// le fichier n'est servi qu'avec un lien signé (voir _premium.mts).
//
// Les fichiers vidéo ne sont PAS dans le dépôt (public) : ils sont déposés dans Netlify Blobs au premier passage après un
// déploiement qui les contient (dossier netlify/functions/pioupiou-officiel/, ignoré par git), puis ils y restent.
import { getStore } from "@netlify/blobs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { signedVideoUrl } from "./_premium.mts";

export interface EpisodeOfficiel {
  cle: string;       // clé du fichier dans Netlify Blobs (toujours préfixée « officiel- »)
  fichier: string;   // fichier du dossier netlify/functions/pioupiou-officiel/
  titre: string;
  affiche: string;
}

export const PREFIXE_OFFICIEL = "officiel-";
const STORE = "starvibe-videos";

// Dans l'ordre du programme (docs/pioupiou/programme-videos-educatives.md).
export const EPISODES_OFFICIELS: EpisodeOfficiel[] = [
  { cle: "officiel-a1.mp4", fichier: "a1.mp4", titre: "A1 · Bonjour papa, bonjour maman", affiche: "/starvibe/assets/pioupiou/affiche_A1-v1.webp" },
  { cle: "officiel-a2.mp4", fichier: "a2.mp4", titre: "A2 · Les dents du matin", affiche: "/starvibe/assets/pioupiou/affiche_A2-v1.webp" },
  { cle: "officiel-a3.mp4", fichier: "a3.mp4", titre: "A3 · Les mains propres avant de manger", affiche: "/starvibe/assets/pioupiou/affiche_A3-v1.webp" },
  { cle: "officiel-a4.mp4", fichier: "a4.mp4", titre: "A4 · Les mains propres après le repas", affiche: "/starvibe/assets/pioupiou/affiche_A4-v1.webp" },
  { cle: "officiel-a5.mp4", fichier: "a5.mp4", titre: "A5 · Merci !", affiche: "/starvibe/assets/pioupiou/affiche_A5-v1.webp" },
];

export const estOfficiel = (cle: string) => cle.startsWith(PREFIXE_OFFICIEL);

// Les épisodes dont le fichier est bien en stockage (mémorisé : on ne le redemande pas à chaque requête une fois trouvé).
const presents = new Set<string>();

async function lireFichierLivre(fichier: string): Promise<Buffer | null> {
  const bases = [join(process.cwd(), "netlify/functions/pioupiou-officiel"), join(process.env.LAMBDA_TASK_ROOT || "/var/task", "netlify/functions/pioupiou-officiel")];
  for (const b of bases) {
    try { return await readFile(join(b, fichier)); } catch { /* essai suivant */ }
  }
  return null;
}

// Dépose dans Netlify Blobs les fichiers livrés avec ce déploiement et pas encore stockés. Idempotent.
export async function installerEpisodesOfficiels(): Promise<{ cle: string; etat: "deja" | "installe" | "absent" }[]> {
  const store = getStore(STORE);
  const bilan: { cle: string; etat: "deja" | "installe" | "absent" }[] = [];
  for (const ep of EPISODES_OFFICIELS) {
    if (presents.has(ep.cle)) { bilan.push({ cle: ep.cle, etat: "deja" }); continue; }
    const meta = await store.getMetadata(ep.cle);
    if (meta) { presents.add(ep.cle); bilan.push({ cle: ep.cle, etat: "deja" }); continue; }
    const octets = await lireFichierLivre(ep.fichier);
    if (!octets) { bilan.push({ cle: ep.cle, etat: "absent" }); continue; }
    await store.set(ep.cle, octets, { metadata: { typeMime: "video/mp4" } });
    presents.add(ep.cle);
    bilan.push({ cle: ep.cle, etat: "installe" });
  }
  return bilan;
}

// La liste affichée dans l'espace PIOUPIOU, au format de toApi() : même chose pour tous les abonnés, lien de lecture seulement
// pour les abonnés Famille actifs.
export async function episodesOfficiels(peutRegarder: boolean) {
  await installerEpisodesOfficiels();
  return EPISODES_OFFICIELS.filter((ep) => presents.has(ep.cle)).map((ep) => ({
    id: ep.cle,
    legende: ep.titre,
    auteur: "PIOUPIOU",
    likes: 0, vues: 0, commentaires: 0,
    pourEnfants: true,
    espace: "pioupiou",
    auteurProfilId: 0,
    moderationStatut: "approuve",
    createdAt: "2026-10-31T00:00:00.000Z",
    likedByMe: false,
    estMoi: false,
    premium: true,
    verrouille: !peutRegarder,
    ouvert: peutRegarder,
    raisonFermee: peutRegarder ? "" : "abonnement",
    disponibleLe: null,
    afficheUrl: ep.affiche,
    videoUrl: peutRegarder ? signedVideoUrl(ep.cle) : null,
  }));
}
