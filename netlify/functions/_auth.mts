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
