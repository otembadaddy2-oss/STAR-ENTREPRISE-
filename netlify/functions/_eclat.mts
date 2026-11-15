// ÉCLAT : le direct de KOMYO, sur le même service vidéo que le Salon (LiveKit). Aucun secret ici.
// Un animateur publie sa caméra ; les spectateurs ne publient rien (ils reçoivent la vidéo et peuvent écrire / réagir par messages).
import { signer } from "./_salon.mts";

export const PLAFOND_SPECTATEURS = 100;      // + l'animateur : borne le coût (par minute et par personne) d'un direct
export const DUREE_MAX_MIN = 60;             // un direct s'arrête de lui-même au bout d'une heure
export const DIRECTS_PAR_JOUR = 3;           // par animateur
export const BATTEMENT_MAX_S = 90;           // sans signe de vie de l'animateur depuis 90 s, le direct n'est plus proposé

export const titreNettoye = (t: unknown, defaut = "Direct ÉCLAT") => String(t || "").replace(/\s+/g, " ").trim().slice(0, 60) || defaut;
export const identiteDe = (accountId: number) => `m${accountId}`;
export const identiteValide = (i: string) => /^m\d{1,12}$/.test(i);

// Jeton d'entrée : valable seulement jusqu'à la fin prévue du direct. L'animateur publie ; le spectateur non.
export async function jetonDirect(salle: string, identite: string, nom: string, animateur: boolean, photo: string, dureeSec: number): Promise<string> {
  const video = { room: salle, roomJoin: true, canPublish: animateur, canSubscribe: true, canPublishData: true };
  return await signer({ name: nom, metadata: JSON.stringify({ p: photo || "", a: animateur ? 1 : 0 }), video }, identite, Math.max(60, Math.min(dureeSec, 3 * 3600)));
}

// Prévenir les abonnés de l'animateur (ceux qui le suivent). Pendant le test fermé : seulement ceux qui ont accès à ÉCLAT.
// Au plus 200 personnes par direct ; ne bloque jamais le démarrage (échecs ignorés, durée bornée).
export const MAX_PREVENUS = 200;
export interface Avis { title: string; body: string; tag: string; url: string }
// deno-lint-ignore no-explicit-any
export async function prevenirAbonnes(sql: any, hoteId: number, ouvert: boolean, avis: Avis, envoyer: (sql: any, accountId: number, p: Avis) => Promise<number>, delaiMs = 4000): Promise<number> {
  try {
    const abo = (await sql`SELECT f.follower FROM starvibe_follows f WHERE f.followed = ${hoteId}
      AND NOT EXISTS (SELECT 1 FROM starvibe_blocks b WHERE (b.blocker = f.follower AND b.blocked = ${hoteId}) OR (b.blocker = ${hoteId} AND b.blocked = f.follower))
      AND (${ouvert} OR EXISTS (SELECT 1 FROM starvibe_salon_acces a WHERE a.account_id = f.follower)) LIMIT ${MAX_PREVENUS}`) as { follower: number }[];
    let n = 0;
    const travail = Promise.allSettled(abo.map(async (a) => { try { if ((await envoyer(sql, Number(a.follower), avis)) > 0) n++; } catch { /* sans gravité */ } }));
    await Promise.race([travail, new Promise((r) => setTimeout(r, delaiMs))]);
    return n;
  } catch { return 0; }
}
