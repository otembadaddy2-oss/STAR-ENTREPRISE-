// STAR VIBE — vrai fil vidéo, + espace enfants PIOUPIOU séparé et modéré.
//
// Publication réservée aux profils personnels (un profil enfant/PIOUPIOU
// ne peut ni publier ni voir le fil principal). Une vidéo marquée
// "pour_enfants" par son créateur n'apparaît dans l'espace PIOUPIOU
// qu'après validation par un compte staff STAR ENTREPRISE — c'est le
// vrai filtre de sécurité de l'espace enfants, pas une case décorative.
//
// Fichier vidéo stocké dans Netlify Blobs ; seule la clé est gardée en
// base (même schéma que la vitrine ALPHA).
import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

const ORG = "star_vibe";
const STAFF_ORG = "star_entreprise";
const MAX_VIDEO_BYTES = 40_000_000; // 40 Mo — court format vertical

function clean(value: unknown, maxLen: number): string {
  return String(value ?? "").trim().slice(0, maxLen);
}

interface VideoRow {
  id: number;
  account_id: number;
  profile_id: number;
  legende: string;
  type_mime: string;
  blob_key: string;
  likes_count: number;
  vues_count: number;
  pour_enfants: boolean;
  moderation_statut: string;
  created_at: string;
  auteur_nom?: string;
  telephone?: string;
}

function toApi(row: VideoRow, likedByMe: boolean) {
  return {
    id: String(row.id),
    legende: row.legende,
    auteur: row.auteur_nom || "",
    likes: row.likes_count,
    vues: row.vues_count,
    pourEnfants: row.pour_enfants,
    moderationStatut: row.moderation_statut,
    createdAt: row.created_at,
    likedByMe,
    videoUrl: `/api/starvibe-video-file?key=${encodeURIComponent(row.blob_key)}`,
  };
}

function toModerationApi(row: VideoRow) {
  return {
    id: String(row.id),
    legende: row.legende,
    auteur: row.auteur_nom || "",
    telephone: row.telephone || "",
    createdAt: row.created_at,
    videoUrl: `/api/starvibe-video-file?key=${encodeURIComponent(row.blob_key)}`,
  };
}

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();
  const url = new URL(req.url);

  // --- File de modération PIOUPIOU (réservée au staff STAR ENTREPRISE) ---
  if (req.method === "GET" && url.searchParams.get("moderation") === "1") {
    const staff = await requireAuth(req);
    if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);

    const rows = (await sql`
      SELECT v.*, p.nom AS auteur_nom, a.telephone
      FROM starvibe_videos v
      JOIN starvibe_profiles p ON p.id = v.profile_id
      JOIN starvibe_accounts a ON a.id = v.account_id
      WHERE v.pour_enfants = true AND v.moderation_statut = 'en_attente'
      ORDER BY v.id ASC LIMIT 30
    `) as VideoRow[];

    return json({ videos: rows.map(toModerationApi) });
  }

  // --- Décision de modération (staff) ---
  if (req.method === "POST") {
    let earlyBody: Record<string, unknown>;
    try {
      earlyBody = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    if (clean(earlyBody.action, 20) === "moderer") {
      const staff = await requireAuth(req);
      if (!staff || staff.org !== STAFF_ORG) return json({ error: "Non autorisé" }, 403);

      const videoId = Number(earlyBody.videoId);
      const decision = clean(earlyBody.decision, 20);
      if (!videoId || !["approuve", "rejete"].includes(decision)) {
        return json({ error: "videoId et decision (approuve|rejete) requis" }, 400);
      }

      const rows = (await sql`
        UPDATE starvibe_videos SET moderation_statut = ${decision} WHERE id = ${videoId} RETURNING id
      `) as { id: number }[];
      if (!rows[0]) return json({ error: "Vidéo introuvable" }, 404);
      return json({ ok: true, moderationStatut: decision });
    }

    // --- Toute autre action passe par le compte STAR VIBE de l'utilisateur ---
    const session = await requireAuth(req);
    if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
    const accountId = Number(session.sub);
    const action = clean(earlyBody.action, 20);

    if (action === "publier") {
      const profileId = Number(earlyBody.profileId);
      const legende = clean(earlyBody.legende, 300);
      const typeMime = clean(earlyBody.typeMime, 100) || "video/mp4";
      const fileBase64 = String(earlyBody.fileBase64 ?? "");
      const pourEnfants = Boolean(earlyBody.pourEnfants);

      if (!profileId || !fileBase64) return json({ error: "Profil et vidéo requis" }, 400);
      if (!typeMime.startsWith("video/")) return json({ error: "Le fichier doit être une vidéo" }, 400);

      const profRows = (await sql`
        SELECT id, type_profil FROM starvibe_profiles WHERE id = ${profileId} AND account_id = ${accountId} LIMIT 1
      `) as { id: number; type_profil: string }[];
      const profile = profRows[0];
      if (!profile) return json({ error: "Profil introuvable" }, 404);
      if (profile.type_profil !== "personnel") {
        return json({ error: "Seul un profil personnel peut publier une vidéo" }, 403);
      }

      const raw = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
      const bytes = Buffer.from(raw, "base64");
      if (bytes.byteLength > MAX_VIDEO_BYTES) {
        return json({ error: "Vidéo trop volumineuse (limite 40 Mo)" }, 400);
      }
      if (bytes.byteLength === 0) return json({ error: "Fichier vidéo vide" }, 400);

      const store = getStore("starvibe-videos");
      const blobKey = `${Date.now()}-${randomBytes(4).toString("hex")}`;
      await store.set(blobKey, bytes, { metadata: { typeMime } });

      const moderationStatut = pourEnfants ? "en_attente" : "approuve";

      const rows = (await sql`
        INSERT INTO starvibe_videos (account_id, profile_id, legende, type_mime, blob_key, pour_enfants, moderation_statut)
        VALUES (${accountId}, ${profileId}, ${legende}, ${typeMime}, ${blobKey}, ${pourEnfants}, ${moderationStatut})
        RETURNING *
      `) as VideoRow[];
      const created = rows[0];
      created.auteur_nom = (await sql`SELECT nom FROM starvibe_profiles WHERE id = ${profileId}`)[0]?.nom || "";

      return json({ video: toApi(created, false) }, 201);
    }

    if (action === "like" || action === "unlike") {
      const videoId = Number(earlyBody.videoId);
      if (!videoId) return json({ error: "videoId requis" }, 400);

      if (action === "like") {
        const inserted = await sql`
          INSERT INTO starvibe_likes (video_id, account_id) VALUES (${videoId}, ${accountId})
          ON CONFLICT (video_id, account_id) DO NOTHING
          RETURNING id
        `;
        if (inserted.length) {
          await sql`UPDATE starvibe_videos SET likes_count = likes_count + 1 WHERE id = ${videoId}`;
        }
      } else {
        const deleted = await sql`
          DELETE FROM starvibe_likes WHERE video_id = ${videoId} AND account_id = ${accountId} RETURNING id
        `;
        if (deleted.length) {
          await sql`UPDATE starvibe_videos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ${videoId}`;
        }
      }

      const rows = (await sql`SELECT likes_count FROM starvibe_videos WHERE id = ${videoId}`) as { likes_count: number }[];
      if (!rows[0]) return json({ error: "Vidéo introuvable" }, 404);
      return json({ likes: rows[0].likes_count, likedByMe: action === "like" });
    }

    if (action === "vue") {
      const videoId = Number(earlyBody.videoId);
      if (!videoId) return json({ error: "videoId requis" }, 400);
      await sql`UPDATE starvibe_videos SET vues_count = vues_count + 1 WHERE id = ${videoId}`;
      return json({ ok: true });
    }

    return json({ error: "Action inconnue" }, 400);
  }

  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  // --- Lecture du fil (utilisateur STAR VIBE) ---
  const session = await requireAuth(req);
  if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
  const accountId = Number(session.sub);

  // Une vidéo n'est jamais visible tant qu'elle n'est pas "approuve" — pour
  // le fil principal (pour_enfants = false) c'est automatique dès la
  // publication ; pour PIOUPIOU (pour_enfants = true), ça n'arrive qu'après
  // validation par un compte staff (voir plus haut, action "moderer").
  const wantKids = url.searchParams.get("espace") === "pioupiou";
  const before = Number(url.searchParams.get("before")) || null;

  const rows = (before
    ? await sql`
        SELECT v.*, p.nom AS auteur_nom
        FROM starvibe_videos v
        JOIN starvibe_profiles p ON p.id = v.profile_id
        WHERE v.pour_enfants = ${wantKids} AND v.moderation_statut = 'approuve' AND v.id < ${before}
        ORDER BY v.id DESC LIMIT 10
      `
    : await sql`
        SELECT v.*, p.nom AS auteur_nom
        FROM starvibe_videos v
        JOIN starvibe_profiles p ON p.id = v.profile_id
        WHERE v.pour_enfants = ${wantKids} AND v.moderation_statut = 'approuve'
        ORDER BY v.id DESC LIMIT 10
      `) as VideoRow[];

  const ids = rows.map((r) => r.id);
  const likedRows = ids.length
    ? ((await sql`
        SELECT video_id FROM starvibe_likes WHERE account_id = ${accountId} AND video_id = ANY(${ids})
      `) as { video_id: number }[])
    : [];
  const likedSet = new Set(likedRows.map((r) => r.video_id));

  return json({ videos: rows.map((r) => toApi(r, likedSet.has(r.id))) });
};

export const config: Config = {
  path: "/api/starvibe-videos",
};
