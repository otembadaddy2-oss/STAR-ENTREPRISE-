// STAR VIBE — vrai fil vidéo. Publication réservée aux profils
// personnels (un profil enfant/PIOUPIOU ne peut pas publier — son espace
// dédié arrive dans une étape suivante). Fichier vidéo stocké dans
// Netlify Blobs ; seule la clé est gardée en base (même schéma que la
// vitrine ALPHA).
import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";
import { ensureSchema, db, json } from "./_db.mts";
import { requireAuth } from "./_auth.mts";

const ORG = "star_vibe";
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
  created_at: string;
  auteur_nom?: string;
}

function toApi(row: VideoRow, likedByMe: boolean) {
  return {
    id: String(row.id),
    legende: row.legende,
    auteur: row.auteur_nom || "",
    likes: row.likes_count,
    vues: row.vues_count,
    createdAt: row.created_at,
    likedByMe,
    videoUrl: `/api/starvibe-video-file?key=${encodeURIComponent(row.blob_key)}`,
  };
}

export default async (req: Request, _context: Context) => {
  await ensureSchema();
  const { sql } = db();

  const session = await requireAuth(req);
  if (!session || session.org !== ORG) return json({ error: "Non authentifié" }, 401);
  const accountId = Number(session.sub);

  if (req.method === "GET") {
    const url = new URL(req.url);
    const before = Number(url.searchParams.get("before")) || null;

    const rows = (before
      ? await sql`
          SELECT v.*, p.nom AS auteur_nom
          FROM starvibe_videos v
          JOIN starvibe_profiles p ON p.id = v.profile_id
          WHERE v.id < ${before}
          ORDER BY v.id DESC LIMIT 10
        `
      : await sql`
          SELECT v.*, p.nom AS auteur_nom
          FROM starvibe_videos v
          JOIN starvibe_profiles p ON p.id = v.profile_id
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
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = clean(body.action, 20);

  if (action === "publier") {
    const profileId = Number(body.profileId);
    const legende = clean(body.legende, 300);
    const typeMime = clean(body.typeMime, 100) || "video/mp4";
    const fileBase64 = String(body.fileBase64 ?? "");

    if (!profileId || !fileBase64) return json({ error: "Profil et vidéo requis" }, 400);
    if (!typeMime.startsWith("video/")) return json({ error: "Le fichier doit être une vidéo" }, 400);

    const profRows = (await sql`
      SELECT id, type_profil FROM starvibe_profiles WHERE id = ${profileId} AND account_id = ${accountId} LIMIT 1
    `) as { id: number; type_profil: string }[];
    const profile = profRows[0];
    if (!profile) return json({ error: "Profil introuvable" }, 404);
    if (profile.type_profil !== "personnel") {
      return json({ error: "Seul un profil personnel peut publier sur le fil" }, 403);
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

    const rows = (await sql`
      INSERT INTO starvibe_videos (account_id, profile_id, legende, type_mime, blob_key)
      VALUES (${accountId}, ${profileId}, ${legende}, ${typeMime}, ${blobKey})
      RETURNING *
    `) as VideoRow[];
    const created = rows[0];
    created.auteur_nom = (await sql`SELECT nom FROM starvibe_profiles WHERE id = ${profileId}`)[0]?.nom || "";

    return json({ video: toApi(created, false) }, 201);
  }

  if (action === "like" || action === "unlike") {
    const videoId = Number(body.videoId);
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
    const videoId = Number(body.videoId);
    if (!videoId) return json({ error: "videoId requis" }, 400);
    await sql`UPDATE starvibe_videos SET vues_count = vues_count + 1 WHERE id = ${videoId}`;
    return json({ ok: true });
  }

  return json({ error: "Action inconnue" }, 400);
};

export const config: Config = {
  path: "/api/starvibe-videos",
};
