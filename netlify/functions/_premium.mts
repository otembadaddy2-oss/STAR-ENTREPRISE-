// Contenus premium STAR VIBE / PIOUPIOU : accès réservé aux abonnés Famille
// actifs. Le fichier vidéo n'est servi qu'avec un lien signé (HMAC) de courte
// durée, délivré uniquement à un abonné — impossible de deviner l'adresse.
import { createHmac, timingSafeEqual } from "node:crypto";

const LINK_TTL_SECONDS = 6 * 3600;

function hmacKey(): string {
  const raw = process.env.JWT_SECRET;
  if (!raw) throw new Error("JWT_SECRET is not configured");
  return raw;
}

function sign(key: string, exp: number): string {
  return createHmac("sha256", hmacKey()).update(`${key}.${exp}`).digest("hex");
}

export function signedVideoUrl(blobKey: string): string {
  const exp = Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS;
  return `/api/starvibe-video-file?key=${encodeURIComponent(blobKey)}&exp=${exp}&sig=${sign(blobKey, exp)}`;
}

export function verifySignature(blobKey: string, expRaw: string | null, sig: string | null): boolean {
  const exp = Number(expRaw);
  if (!exp || !sig || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = Buffer.from(sign(blobKey, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// Abonnement Famille actif et non expiré.
// deno-lint-ignore no-explicit-any
export async function hasActiveFamille(sql: any, accountId: number): Promise<boolean> {
  const rows = (await sql`
    SELECT 1 FROM starvibe_subscriptions
    WHERE account_id = ${accountId} AND plan = 'famille' AND statut = 'actif'
      AND expires_at IS NOT NULL AND expires_at > now()
    LIMIT 1
  `) as unknown[];
  return rows.length > 0;
}
