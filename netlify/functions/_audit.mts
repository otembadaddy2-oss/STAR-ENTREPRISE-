// PASSEPORT SÛR — journal de sécurité : qui a fait quoi, quand, d'où. Chaque ligne contient l'empreinte de la précédente (chaîne) :
// effacer, modifier ou insérer une ligne après coup casse la chaîne, et « vérifier » le montre. Le journal n'a AUCUNE opération de modification ni de suppression dans l'API.
// LIMITE : quelqu'un qui contrôlerait la base de données elle-même pourrait recalculer toute la chaîne. Pour un usage réel : copie du journal vers un stockage
// à écriture unique hors de portée des administrateurs (ou signature externe de l'empreinte du jour). Voir le dossier de présentation.
import { createHash } from "node:crypto";

export async function ensureAudit(sql: any) {
  await sql`CREATE TABLE IF NOT EXISTS pss_audit (espace TEXT NOT NULL, n INT NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT now(), login TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL, cible TEXT NOT NULL DEFAULT '', detail TEXT NOT NULL DEFAULT '', ip TEXT NOT NULL DEFAULT '', grave BOOLEAN NOT NULL DEFAULT false, prec TEXT NOT NULL, hash TEXT NOT NULL, PRIMARY KEY (espace, n))`;
}

export type Evenement = { login?: string; role?: string; action: string; cible?: string; detail?: string; ip?: string; grave?: boolean };
const propre = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").slice(0, n);
const calcul = (prec: string, espace: string, n: number, at: string, e: { login: string; role: string; action: string; cible: string; detail: string; ip: string; grave: boolean }) =>
  createHash("sha256").update([prec, espace, n, at, e.login, e.role, e.action, e.cible, e.detail, e.ip, e.grave ? 1 : 0].join("\u001f")).digest("hex");

export function creerAudit(sql: any) {
  return {
    // Ne lève jamais d'erreur : une panne du journal ne doit pas bloquer le travail, mais elle est signalée dans les journaux du serveur.
    async noter(espace: string, ev: Evenement) {
      const e = { login: propre(ev.login, 40), role: propre(ev.role, 20), action: propre(ev.action, 40), cible: propre(ev.cible, 60), detail: propre(ev.detail, 300), ip: propre(ev.ip, 60), grave: !!ev.grave };
      for (let essai = 0; essai < 6; essai++) {
        try {
          const d = (await sql`SELECT n, hash FROM pss_audit WHERE espace = ${espace} ORDER BY n DESC LIMIT 1`) as any[];
          const n = d[0] ? Number(d[0].n) + 1 : 1, prec = d[0] ? String(d[0].hash) : "ORIGINE:" + espace, at = new Date().toISOString();
          await sql`INSERT INTO pss_audit (espace, n, at, login, role, action, cible, detail, ip, grave, prec, hash) VALUES (${espace}, ${n}, ${at}, ${e.login}, ${e.role}, ${e.action}, ${e.cible}, ${e.detail}, ${e.ip}, ${e.grave}, ${prec}, ${calcul(prec, espace, n, at, e)})`;
          return;
        } catch (err: any) { const c = err?.code || err?.cause?.code, msg = String(err?.cause?.message || err?.message || ""); if (c === "23505" || /duplicate key|unique/i.test(msg)) continue; console.error("journal de sécurité : écriture impossible", msg); return; }
      }
    },
    async lire(espace: string, opts: { limite?: number; avant?: number; gravesSeulement?: boolean } = {}) {
      const lim = Math.min(Math.max(Math.round(opts.limite || 100), 1), 500), avant = opts.avant && opts.avant > 0 ? Math.round(opts.avant) : 2147483000;
      const l = (await (opts.gravesSeulement
        ? sql`SELECT n, at, login, role, action, cible, detail, ip, grave FROM pss_audit WHERE espace = ${espace} AND n < ${avant} AND grave = true ORDER BY n DESC LIMIT ${lim}`
        : sql`SELECT n, at, login, role, action, cible, detail, ip, grave FROM pss_audit WHERE espace = ${espace} AND n < ${avant} ORDER BY n DESC LIMIT ${lim}`)) as any[];
      const t = (await sql`SELECT count(*)::int AS n, count(*) FILTER (WHERE grave)::int AS g FROM pss_audit WHERE espace = ${espace}`) as any[];
      return { evenements: l.map(x => ({ n: Number(x.n), at: x.at, login: x.login, role: x.role, action: x.action, cible: x.cible, detail: x.detail, ip: x.ip, grave: !!x.grave })), total: t[0].n, graves: t[0].g };
    },
    // Recalcule toute la chaîne : renvoie la première ligne qui ne correspond plus (modifiée, supprimée ou insérée).
    async verifier(espace: string) {
      const l = (await sql`SELECT n, at, login, role, action, cible, detail, ip, grave, prec, hash FROM pss_audit WHERE espace = ${espace} ORDER BY n LIMIT 50000`) as any[];
      let prec = "ORIGINE:" + espace, attendu = 1;
      for (const x of l) {
        if (Number(x.n) !== attendu) return { ok: false, lignes: l.length, rompuA: attendu, raison: "ligne manquante ou ajoutée" };
        const at = x.at instanceof Date ? x.at.toISOString() : new Date(x.at).toISOString();
        const h = calcul(prec, espace, Number(x.n), at, { login: x.login, role: x.role, action: x.action, cible: x.cible, detail: x.detail, ip: x.ip, grave: !!x.grave });
        if (x.prec !== prec || x.hash !== h) return { ok: false, lignes: l.length, rompuA: Number(x.n), raison: "ligne modifiée" };
        prec = x.hash; attendu++;
      }
      return { ok: true, lignes: l.length, derniere: prec.slice(0, 16) };
    },
  };
}
