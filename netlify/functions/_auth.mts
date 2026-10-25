// Shared auth helpers — JWT issuance/verification for the group backend.
import { SignJWT, jwtVerify } from "jose";

function secret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(raw);
}

export interface SessionClaims {
  sub: string; // account id
  username: string;
  displayName: string;
  org: string;
  role: string;
}

export async function issueToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifyToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionClaims;
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request): Promise<SessionClaims | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  return verifyToken(token);
}

// Jeton court et scopé à un seul document — utilisé pour la lecture directe
// (aperçu iframe, Google Cast) là où l'en-tête Authorization n'est pas
// envoyé par le lecteur (le récepteur Cast récupère l'URL lui-même).
export async function issueDocToken(docId: string): Promise<string> {
  return new SignJWT({ docId, kind: "doc" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret());
}

export async function verifyDocToken(token: string, docId: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.kind === "doc" && payload.docId === docId;
  } catch {
    return false;
  }
}

// Jetons « public » : comptes KOMYO, clients de Keydou sans compte, Marketplace, Guichet unique.
// Ils ne doivent JAMAIS ouvrir le back-office du groupe (leads, membres, JARDIS, devis, inscriptions…).
const ORGS_PUBLIQUES = new Set(["star_vibe", "keydou_guest", "star_marketplace", "guichet_unique"]);

export async function requireGroupAuth(req: Request): Promise<SessionClaims | null> {
  const s = await requireAuth(req);
  if (!s || typeof s.org !== "string" || !s.org || ORGS_PUBLIQUES.has(s.org)) return null;
  return s;
}
