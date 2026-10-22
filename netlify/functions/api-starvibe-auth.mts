// STAR VIBE — comptes réels (téléphone + code PIN à 4 ou 5 chiffres, comme un
// compte Mobile Money). Un compte peut porter plusieurs profils : le
// profil personnel du titulaire, et des profils enfant (3-6 ans) qu'il
// supervise. Mêmes protections que les autres comptes du groupe :
// verrouillage après tentatives échouées, réponse générique en cas
// d'échec de connexion, code PIN toujours haché (jamais stocké en clair).
import type { Context, Config } from "@netlify/functions";
import bcrypt from "bcryptjs";
import { getStore } from "@netlify/blobs";
import { randomBytes, randomInt } from "node:crypto";
import { ensureSchema, db, json } from "./_db.mts";
import { issueToken, requireAuth } from "./_auth.mts";
import { pushAll } from "./_push.mts";
import { ipHash, verrou, echec, effacer, msgBloque } from "./_guard.mts";

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

const PIN_RE = /^\d{4,5}$/; // 4 ou 5 chiffres (les comptes existants à 4 chiffres restent valables)
const STAFF_ORG = "star_entreprise";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const ORG = "star_vibe";
const MAX_PHOTO_BYTES = 1_500_000; // le navigateur la réduit avant envoi (~30 Ko)
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function photoUrl(key: string | null | undefined): string | null {
  return key ? `/api/starvibe-photo?key=${encodeURIComponent(key)}` : null;
}

function withPhoto(rows: any[]) {
  return rows.map(({ photo_key, ...p }) => ({ ...p, photoUrl: photoUrl(photo_key) }));
}

function ageFromDate(dateStr: string): number | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getTime() > Date.now()) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();

  if (req.method === "GET" && new URL(req.url).searchParams.get("pin_requests") === "1") {
    const staff = await requireAuth(req);
    if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);
    const rows = await sql`
      SELECT r.id, r.telephone, r.nom_indique, r.statut, r.created_at, r.updated_at, r.code_expire,
             a.ville, a.created_at AS compte_cree, p.nom AS profil_nom
      FROM starvibe_pin_resets r
      JOIN starvibe_accounts a ON a.id = r.account_id
      LEFT JOIN starvibe_profiles p ON p.account_id = a.id AND p.type_profil = 'personnel'
      ORDER BY r.id DESC LIMIT 300
    `;
    return json({
      now: new Date().toISOString(),
      demandes: (rows as any[]).map((r) => ({
        id: String(r.id), telephone: r.telephone, nomIndique: r.nom_indique, statut: r.statut,
        date: r.created_at, maj: r.updated_at, codeExpire: r.code_expire,
        ville: r.ville || "", profil: r.profil_nom || "", compteCree: r.compte_cree,
      })),
    });
  }

  if (req.method === "GET") {
    const session = await requireAuth(req);
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
    const accountId = Number(session.sub);
    const accRows = await sql`
      SELECT id, telephone, ville, created_at FROM starvibe_accounts WHERE id = ${accountId} LIMIT 1
    `;
    const account = accRows[0] as any;
    if (!account) return json({ error: "Compte introuvable" }, 404);
    const profiles = await sql`
      SELECT id, nom, date_naissance, type_profil, photo_key, created_at
      FROM starvibe_profiles WHERE account_id = ${accountId} ORDER BY id ASC
    `;
    return json({
      account: { id: account.id, telephone: account.telephone, ville: account.ville, createdAt: account.created_at },
      profiles: withPhoto(profiles as any[]),
    });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = clean(body.action, 20);

  // ---------- Code PIN oublié (réinitialisation assistée) ----------
  const tel9 = (t: string) => t.replace(/\D/g, "").slice(-9);

  // Membre : demande. Réponse toujours identique (on ne dit jamais si un numéro a un compte).
  if (action === "pin_demande") {
    const telephone = clean(body.telephone, 40).replace(/[^\d+]/g, "");
    const nom = clean(body.nom, 80);
    const ip = ipHash(req);
    const kIp = `ip:pindem:${ip}`, kTel = `tel:pindem:${tel9(telephone)}`;
    const bloc = Math.max(await verrou(sql, kIp), await verrou(sql, kTel));
    if (bloc) return json({ error: msgBloque(bloc) }, 429);
    if (tel9(telephone).length < 8) return json({ error: "Écris ton numéro de téléphone." }, 400);
    await echec(sql, kIp, 4, 60, 60);     // 3 demandes par heure et par connexion
    await echec(sql, kTel, 4, 1440, 240); // 3 demandes par jour et par numéro
    const rows = await sql`SELECT id FROM starvibe_accounts WHERE RIGHT(regexp_replace(telephone, '[^0-9]', '', 'g'), 9) = ${tel9(telephone)} AND guest = false ORDER BY id LIMIT 1`;
    const acc = rows[0] as any;
    if (acc) {
      const deja = await sql`SELECT 1 FROM starvibe_pin_resets WHERE account_id = ${acc.id} AND statut = 'en_attente' AND created_at > now() - interval '6 hours' LIMIT 1`;
      if (!deja[0]) {
        await sql`INSERT INTO starvibe_pin_resets (account_id, telephone, nom_indique) VALUES (${acc.id}, ${telephone}, ${nom})`;
        try { await pushAll(sql, { title: "Code PIN oublié", body: `${telephone}${nom ? " — " + nom : ""} demande un nouveau PIN. Ouvre le backend, onglet « PIN oubliés ».`, tag: "pin-oublie", url: "/starvibe/keydou-admin.html" }); } catch { /* la demande reste visible dans le backend */ }
      }
    }
    return json({ ok: true });
  }

  // Membre : code temporaire reçu par WhatsApp + nouveau PIN
  if (action === "pin_reset") {
    const telephone = clean(body.telephone, 40).replace(/[^\d+]/g, "");
    const code = clean(body.code, 12).replace(/\D/g, "");
    const newPin = String(body.newPin ?? "");
    const kIp = `ip:pinreset:${ipHash(req)}`;
    const bloc = await verrou(sql, kIp);
    if (bloc) return json({ error: msgBloque(bloc) }, 429);
    if (!PIN_RE.test(newPin)) return json({ error: "Le nouveau PIN doit contenir 4 ou 5 chiffres." }, 400);
    if (code.length !== 6) return json({ error: "Le code temporaire fait 6 chiffres." }, 400);
    const rows = await sql`
      SELECT r.id, r.account_id, r.code_hash, r.tries
      FROM starvibe_pin_resets r JOIN starvibe_accounts a ON a.id = r.account_id
      WHERE RIGHT(regexp_replace(a.telephone, '[^0-9]', '', 'g'), 9) = ${tel9(telephone)} AND r.statut = 'code_envoye' AND r.code_expire > now()
      ORDER BY r.id DESC LIMIT 1
    `;
    const r = rows[0] as any;
    const generique = () => json({ error: "Code incorrect ou expiré. Demande un nouveau code si besoin." }, 400);
    if (!r) { await echec(sql, kIp, 8, 60, 30); return generique(); }
    if (!(await bcrypt.compare(code, r.code_hash))) {
      const t = (r.tries || 0) + 1;
      if (t >= 5) await sql`UPDATE starvibe_pin_resets SET statut = 'expire', tries = ${t}, updated_at = now() WHERE id = ${r.id}`;
      else await sql`UPDATE starvibe_pin_resets SET tries = ${t}, updated_at = now() WHERE id = ${r.id}`;
      await echec(sql, kIp, 8, 60, 30);
      return generique();
    }
    const pinHash = await bcrypt.hash(newPin, 12);
    await sql`UPDATE starvibe_accounts SET pin_hash = ${pinHash}, failed_attempts = 0, locked_until = NULL WHERE id = ${r.account_id}`;
    await sql`UPDATE starvibe_pin_resets SET statut = 'termine', updated_at = now() WHERE id = ${r.id}`;
    await effacer(sql, kIp);
    const accRows = await sql`SELECT id, telephone, ville FROM starvibe_accounts WHERE id = ${r.account_id} LIMIT 1`;
    const acc = accRows[0] as any;
    const profiles = await sql`SELECT id, nom, date_naissance, type_profil FROM starvibe_profiles WHERE account_id = ${acc.id} ORDER BY id ASC`;
    const token = await issueToken({ sub: String(acc.id), username: acc.telephone, displayName: (profiles[0] as any)?.nom || acc.telephone, org: ORG, role: "titulaire" });
    return json({ token, account: { id: acc.id, telephone: acc.telephone, ville: acc.ville }, profiles });
  }

  // Staff : générer le code temporaire d'une demande (affiché une seule fois), ou la refuser
  if (action === "pin_code" || action === "pin_refuser") {
    const staff = await requireAuth(req);
    if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);
    const id = Number(body.requestId);
    const rows = await sql`SELECT id, telephone, statut FROM starvibe_pin_resets WHERE id = ${id} LIMIT 1`;
    const r = rows[0] as any;
    if (!r) return json({ error: "Demande introuvable" }, 404);
    if (r.statut === "termine") return json({ error: "Cette demande est déjà terminée." }, 400);
    if (action === "pin_refuser") {
      await sql`UPDATE starvibe_pin_resets SET statut = 'refuse', code_hash = '', updated_at = now() WHERE id = ${id}`;
      return json({ ok: true });
    }
    const code = String(randomInt(0, 1000000)).padStart(6, "0");
    const h = await bcrypt.hash(code, 10);
    await sql`UPDATE starvibe_pin_resets SET statut = 'code_envoye', code_hash = ${h}, code_expire = now() + interval '24 hours', tries = 0, updated_at = now() WHERE id = ${id}`;
    return json({ ok: true, code, telephone: r.telephone });
  }

  if (action === "login") {
    const telephone = clean(body.telephone, 40).replace(/[^\d+]/g, "");
    const pin = String(body.pin ?? "");
    if (!telephone || !pin) return json({ error: "Numéro de téléphone ou code PIN manquant" }, 400);

    // Le numéro est reconnu quelle que soit son écriture : 066565050, 06 656 50 50 ou +242 06 656 50 50.
    const rows = await sql`
      SELECT id, telephone, pin_hash, ville, failed_attempts, locked_until
      FROM starvibe_accounts WHERE RIGHT(regexp_replace(telephone, '[^0-9]', '', 'g'), 9) = ${tel9(telephone)}
      ORDER BY id LIMIT 5
    `;
    let acc = rows[0] as any;
    const genericError = () => json({ error: "Numéro ou code PIN incorrect" }, 401);
    if (!acc || tel9(telephone).length < 8) return genericError();

    if (acc.locked_until && new Date(acc.locked_until).getTime() > Date.now()) {
      const minutes = Math.ceil((new Date(acc.locked_until).getTime() - Date.now()) / 60000);
      return json(
        { error: `Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.` },
        429
      );
    }

    let ok = false;
    for (const r of rows as any[]) {
      if (r.pin_hash && (await bcrypt.compare(pin, r.pin_hash))) { acc = r; ok = true; break; }
    }
    if (!ok) {
      const attempts = (acc.failed_attempts || 0) + 1;
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await sql`
          UPDATE starvibe_accounts
          SET failed_attempts = 0, locked_until = now() + (${LOCKOUT_MINUTES} || ' minutes')::interval
          WHERE id = ${acc.id}
        `;
        return json(
          { error: `Trop de tentatives. Compte verrouillé ${LOCKOUT_MINUTES} minutes par sécurité.` },
          429
        );
      }
      await sql`UPDATE starvibe_accounts SET failed_attempts = ${attempts} WHERE id = ${acc.id}`;
      return genericError();
    }

    if (acc.failed_attempts > 0 || acc.locked_until) {
      await sql`UPDATE starvibe_accounts SET failed_attempts = 0, locked_until = NULL WHERE id = ${acc.id}`;
    }

    const profiles = await sql`
      SELECT id, nom, date_naissance, type_profil FROM starvibe_profiles
      WHERE account_id = ${acc.id} ORDER BY id ASC
    `;
    const token = await issueToken({
      sub: String(acc.id), username: acc.telephone, displayName: (profiles[0] as any)?.nom || acc.telephone,
      org: ORG, role: "titulaire",
    });
    return json({ token, account: { id: acc.id, telephone: acc.telephone, ville: acc.ville }, profiles });
  }

  if (action === "register") {
    const telephone = clean(body.telephone, 40).replace(/[^\d+]/g, "");
    const pin = String(body.pin ?? "");
    const nom = clean(body.nom, 120);
    const dateNaissance = clean(body.dateNaissance, 20);
    const ville = clean(body.ville, 80);
    const typeProfil = clean(body.typeProfil, 20) === "enfant" ? "enfant" : "personnel";

    if (telephone.replace(/\D/g, "").length < 8) {
      return json({ error: "Numéro de téléphone invalide" }, 400);
    }
    if (!PIN_RE.test(pin)) return json({ error: "Le code PIN doit contenir 4 ou 5 chiffres" }, 400);
    if (!nom) return json({ error: "Le nom est requis" }, 400);
    if (!dateNaissance) return json({ error: "La date de naissance est requise" }, 400);

    const age = ageFromDate(dateNaissance);
    if (age === null) return json({ error: "Date de naissance invalide" }, 400);
    if (typeProfil === "enfant") {
      if (age < 3 || age > 6) return json({ error: "L'espace enfants est réservé aux 3-6 ans" }, 400);
    } else {
      if (age < 13) return json({ error: "STAR VIBE est réservé aux 13 ans et plus (sauf profil enfant 3-6 ans)" }, 400);
    }

    const exists = await sql`SELECT id FROM starvibe_accounts WHERE RIGHT(regexp_replace(telephone, '[^0-9]', '', 'g'), 9) = ${tel9(telephone)} LIMIT 1`;
    if (exists.length) {
      return json({ error: "Un compte existe déjà avec ce numéro — connecte-toi plutôt" }, 409);
    }

    const pinHash = await bcrypt.hash(pin, 12);
    const accRows = await sql`
      INSERT INTO starvibe_accounts (telephone, pin_hash, ville)
      VALUES (${telephone}, ${pinHash}, ${ville})
      RETURNING id, telephone, ville
    `;
    const acc = accRows[0] as any;

    const profRows = await sql`
      INSERT INTO starvibe_profiles (account_id, nom, date_naissance, type_profil)
      VALUES (${acc.id}, ${nom}, ${dateNaissance}, ${typeProfil})
      RETURNING id, nom, date_naissance, type_profil
    `;
    const profile = profRows[0] as any;

    const token = await issueToken({
      sub: String(acc.id), username: acc.telephone, displayName: nom, org: ORG, role: "titulaire",
    });
    return json(
      { token, account: { id: acc.id, telephone: acc.telephone, ville: acc.ville }, profiles: [profile] },
      201
    );
  }

  if (action === "add-profile") {
    const session = await requireAuth(req);
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);

    const nom = clean(body.nom, 120);
    const dateNaissance = clean(body.dateNaissance, 20);
    const typeProfil = clean(body.typeProfil, 20) === "enfant" ? "enfant" : "personnel";

    if (!nom || !dateNaissance) return json({ error: "Nom et date de naissance requis" }, 400);
    const age = ageFromDate(dateNaissance);
    if (age === null) return json({ error: "Date de naissance invalide" }, 400);
    if (typeProfil === "enfant" && (age < 3 || age > 6)) {
      return json({ error: "L'espace enfants est réservé aux 3-6 ans" }, 400);
    }

    const rows = await sql`
      INSERT INTO starvibe_profiles (account_id, nom, date_naissance, type_profil)
      VALUES (${Number(session.sub)}, ${nom}, ${dateNaissance}, ${typeProfil})
      RETURNING id, nom, date_naissance, type_profil
    `;
    return json({ profile: rows[0] }, 201);
  }

  // Photo de profil : remplace l'ancienne (supprimée du stockage). Réservée
  // au profil personnel du compte connecté — jamais un profil enfant.
  if (action === "photo-profil") {
    const session = await requireAuth(req);
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
    const accountId = Number(session.sub);
    const profileId = Number(body.profileId);
    const typeMime = clean(body.typeMime, 40) || "image/jpeg";
    const fileBase64 = String(body.fileBase64 ?? "");

    if (!profileId || !fileBase64) return json({ error: "Profil et photo requis" }, 400);
    if (!PHOTO_TYPES.includes(typeMime)) return json({ error: "La photo doit être en JPEG, PNG ou WebP" }, 400);

    const rows = (await sql`
      SELECT id, type_profil, photo_key FROM starvibe_profiles
      WHERE id = ${profileId} AND account_id = ${accountId} LIMIT 1
    `) as { id: number; type_profil: string; photo_key: string | null }[];
    const profile = rows[0];
    if (!profile) return json({ error: "Profil introuvable" }, 404);
    if (profile.type_profil !== "personnel") {
      return json({ error: "Seul le profil personnel peut avoir une photo" }, 403);
    }

    const raw = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
    const bytes = Buffer.from(raw, "base64");
    if (bytes.byteLength === 0) return json({ error: "Photo vide" }, 400);
    if (bytes.byteLength > MAX_PHOTO_BYTES) return json({ error: "Photo trop lourde (limite 1,5 Mo)" }, 400);

    const store = getStore("starvibe-photos");
    const key = `${profileId}-${Date.now()}-${randomBytes(4).toString("hex")}`;
    await store.set(key, bytes, { metadata: { typeMime } });
    await sql`UPDATE starvibe_profiles SET photo_key = ${key} WHERE id = ${profileId}`;
    if (profile.photo_key) await store.delete(profile.photo_key).catch(() => {});

    return json({ photoUrl: photoUrl(key) });
  }

  return json({ error: "Action inconnue" }, 400);
};

export const config: Config = {
  path: "/api/starvibe-auth",
};
