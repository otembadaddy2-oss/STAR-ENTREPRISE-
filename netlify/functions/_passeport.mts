// PASSEPORT SÛR — moteur partagé : espaces de travail, dossiers, paiement + rendez-vous + numéro d'appel, appel aux portes, écrans de salle.
// Chaque « espace » (code à 8 caractères) regroupe les postes d'un même site : guichet, caisse, portes, préfecture et écrans de la salle.
// Les opérations critiques (paiement : numéro et rendez-vous ; appel du suivant) sont faites ICI, de façon atomique, pour que deux postes
// ne puissent jamais donner le même numéro ni appeler la même personne.
// SÉCURITÉ : version de démonstration — l'accès repose sur le code de l'espace. Pour de vraies données : comptes nominatifs + double vérification.
import { db } from "./_db.mts";
import { randomBytes } from "node:crypto";

let pret = false;
export async function ensurePasseport() {
  if (pret) return;
  const { sql } = db();
  await sql`CREATE TABLE IF NOT EXISTS pss_espaces (
    code TEXT PRIMARY KEY, code_public TEXT, nom TEXT NOT NULL DEFAULT '', config JSONB NOT NULL DEFAULT '{}'::jsonb,
    version BIGINT NOT NULL DEFAULT 0, compteur_rp INT NOT NULL DEFAULT 0, cree_ip TEXT NOT NULL DEFAULT '',
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(), dernier_acces TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await sql`ALTER TABLE pss_espaces ADD COLUMN IF NOT EXISTS code_public TEXT`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS pss_public_uniq ON pss_espaces (code_public)`;
  await sql`CREATE TABLE IF NOT EXISTS pss_dossiers (
    espace TEXT NOT NULL REFERENCES pss_espaces(code) ON DELETE CASCADE, id TEXT NOT NULL, rev INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'depose', rdv_date DATE, ticket INT, version BIGINT NOT NULL DEFAULT 0,
    data JSONB NOT NULL, maj TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (espace, id))`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS pss_ticket_uniq ON pss_dossiers (espace, rdv_date, ticket) WHERE ticket IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS pss_dossiers_version ON pss_dossiers (espace, version)`;
  await sql`CREATE TABLE IF NOT EXISTS pss_ecrans (espace TEXT NOT NULL REFERENCES pss_espaces(code) ON DELETE CASCADE, nom TEXT NOT NULL, vu TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (espace, nom))`;
  pret = true;
}

export const CONFIG_DEFAUT = {
  portes: 6, noms: {} as Record<string, string>,
  capacite: 60,            // rendez-vous par jour
  delai: 1,                // jours entre le paiement et le premier rendez-vous possible
  jours: [1, 2, 3, 4, 5],  // jours ouvrés (0 = dimanche … 6 = samedi)
  debut: "08:00", pas: 30, parCreneau: 10,
  lieu: "Préfecture de Brazzaville",
  decalage: 0,             // démonstration : avancer la date du jour de N jours
};
export type Config = typeof CONFIG_DEFAUT;
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const nouveauCode = () => { const b = randomBytes(8); let s = ""; for (let i = 0; i < 8; i++) s += ALPHABET[b[i] % ALPHABET.length]; return s; };
// Code de contrôle du demandeur (sur son accusé) : même calcul que dans l'application.
export function codeSuivi(id: string, nom: string): string { let h = 7; const s = id + nom; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36).toUpperCase().padStart(6, "7").slice(-6).replace(/0/g, "7").replace(/O/g, "8").replace(/1/g, "4").replace(/I/g, "9").replace(/L/g, "5"); }
export const normaliserCode = (c: unknown) => String(c ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

function nettoyerConfig(c: any, base: Config): Config {
  const n = (v: unknown, a: number, b: number, d: number) => { const x = Math.round(Number(v)); return Number.isFinite(x) ? Math.min(b, Math.max(a, x)) : d; };
  const noms: Record<string, string> = {};
  for (const [k, v] of Object.entries((c && c.noms) || base.noms || {})) { if (/^\d{1,2}$/.test(k) && String(v).trim()) noms[k] = String(v).trim().slice(0, 40); }
  const jours = Array.isArray(c?.jours) ? [...new Set<number>(c.jours.map((x: unknown) => Math.round(Number(x))).filter((x: number) => x >= 0 && x <= 6))].sort() : base.jours;
  const hhmm = (v: unknown, d: string) => (/^\d{2}:\d{2}$/.test(String(v)) ? String(v) : d);
  return { portes: n(c?.portes, 1, 12, base.portes), noms, capacite: n(c?.capacite, 1, 2000, base.capacite), delai: n(c?.delai, 0, 60, base.delai), jours: jours.length ? jours : base.jours,
    debut: hhmm(c?.debut, base.debut), pas: n(c?.pas, 5, 240, base.pas), parCreneau: n(c?.parCreneau, 1, 500, base.parCreneau), lieu: String(c?.lieu ?? base.lieu).slice(0, 80), decalage: n(c?.decalage, 0, 60, base.decalage) };
}
export const configEspace = (raw: unknown): Config => nettoyerConfig(raw || {}, CONFIG_DEFAUT);

// Date du jour à Brazzaville (UTC+1, sans heure d'été) + décalage de démonstration.
export const jourDe = (cfg: Config, maintenant = Date.now()) => new Date(maintenant + 3600000 + cfg.decalage * 86400000).toISOString().slice(0, 10);
const ajouterJours = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const jourSemaine = (iso: string) => new Date(iso + "T00:00:00Z").getUTCDay();
export function heureCreneau(cfg: Config, index: number) { const [h, m] = cfg.debut.split(":").map(Number); const t = h * 60 + m + Math.floor(index / cfg.parCreneau) * cfg.pas; return String(Math.floor(t / 60) % 24).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0"); }

type Ligne = { id: string; rev: number; status: string; rdv_date: string | null; ticket: number | null; version: string | number; data: any };
const rdvTexte = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function creerMoteur(sql: any) {
  async function espace(code: string) {
    const r = (await sql`SELECT code, code_public, nom, config, version FROM pss_espaces WHERE code = ${code}`) as any[];
    if (!r[0]) return null;
    await sql`UPDATE pss_espaces SET dernier_acces = now() WHERE code = ${code}`;
    return { code: r[0].code as string, publique: String(r[0].code_public || ""), nom: r[0].nom as string, config: configEspace(r[0].config), version: Number(r[0].version) };
  }
  const bump = async (code: string) => Number(((await sql`UPDATE pss_espaces SET version = version + 1 WHERE code = ${code} RETURNING version`) as any[])[0].version);
  const colonnes = (d: any) => ({ status: String(d?.status || "depose").slice(0, 20), rdv: d?.rdv?.date && /^\d{4}-\d{2}-\d{2}$/.test(d.rdv.date) ? d.rdv.date : null, ticket: Number.isInteger(d?.ticket) ? d.ticket : null });
  const publier = (l: Ligne) => ({ id: l.id, rev: l.rev, data: l.data });

  return {
    espace,
    async creer(nom: string, ip: string, dossiers: any[]) {
      await sql`DELETE FROM pss_espaces WHERE dernier_acces < now() - interval '30 days'`;
      const n = ((await sql`SELECT count(*)::int AS n FROM pss_espaces WHERE cree_ip = ${ip} AND cree_le > now() - interval '1 hour'`) as any[])[0].n;
      if (ip && n >= 8) return { erreur: "Trop de créations : réessayez dans une heure." };
      let code = "", publique = "";
      for (let i = 0; i < 6; i++) { const c = nouveauCode(), pub = nouveauCode(); const r = (await sql`INSERT INTO pss_espaces (code, code_public, nom, config, cree_ip) VALUES (${c}, ${pub}, ${String(nom || "").slice(0, 60)}, ${JSON.stringify(CONFIG_DEFAUT)}::jsonb, ${ip}) ON CONFLICT DO NOTHING RETURNING code`) as any[]; if (r[0]) { code = c; publique = pub; break; } }
      if (!code) return { erreur: "Création impossible, réessayez." };
      if (Array.isArray(dossiers) && dossiers.length) {
        const v = await bump(code);
        for (const d of dossiers.slice(0, 400)) {
          if (!d || typeof d.id !== "string" || d.id.length > 40) continue; const c = colonnes(d);
          await sql`INSERT INTO pss_dossiers (espace, id, rev, status, rdv_date, ticket, version, data) VALUES (${code}, ${d.id}, 1, ${c.status}, ${c.rdv}, ${c.ticket}, ${v}, ${JSON.stringify(d)}::jsonb) ON CONFLICT DO NOTHING`;
        }
      }
      return { code, publique };
    },

    // Lecture complète pour les postes de travail (guichet, caisse, portes, préfecture).
    async sync(code: string, since: number, ecran?: string) {
      const e = await espace(code); if (!e) return null;
      if (ecran) await sql`INSERT INTO pss_ecrans (espace, nom, vu) VALUES (${code}, ${ecran.slice(0, 40)}, now()) ON CONFLICT (espace, nom) DO UPDATE SET vu = now()`;
      const lignes = (await sql`SELECT id, rev, status, rdv_date, ticket, version, data FROM pss_dossiers WHERE espace = ${code} AND version > ${since} ORDER BY version, id`) as Ligne[];
      const ecrans = (await sql`SELECT nom, extract(epoch FROM (now() - vu))::int AS il_y_a FROM pss_ecrans WHERE espace = ${code} AND vu > now() - interval '60 seconds' ORDER BY nom`) as any[];
      return { version: e.version, publique: e.publique, config: e.config, jour: jourDe(e.config), serveur: new Date().toISOString(), dossiers: lignes.map(publier), ecrans: ecrans.map(x => ({ nom: x.nom, ilYa: x.il_y_a })) };
    },

    // Lecture minimale pour les écrans de la salle (pas de données personnelles inutiles).
    async ecran(code: string, nom: string) {
      const e = await espace(code); if (!e) return null;
      if (nom) await sql`INSERT INTO pss_ecrans (espace, nom, vu) VALUES (${code}, ${nom.slice(0, 40)}, now()) ON CONFLICT (espace, nom) DO UPDATE SET vu = now()`;
      const jour = jourDe(e.config);
      const appels = (await sql`SELECT ticket, data->'person'->>'nom' AS nom, data->'person'->>'prenoms' AS prenoms, data->'person'->>'sexe' AS sexe, (data->'appel'->>'porte')::int AS porte, data->'appel'->>'at' AS at, id
        FROM pss_dossiers WHERE espace = ${code} AND rdv_date = ${jour} AND status = 'recu' AND data->'appel' IS NOT NULL ORDER BY data->'appel'->>'at' DESC LIMIT 40`) as any[];
      const prochains = (await sql`SELECT ticket FROM pss_dossiers WHERE espace = ${code} AND rdv_date = ${jour} AND status = 'paye' ORDER BY COALESCE((data->>'rang')::int, ticket) LIMIT 14`) as any[];
      const att = (await sql`SELECT count(*)::int AS n FROM pss_dossiers WHERE espace = ${code} AND rdv_date = ${jour} AND status = 'paye'`) as any[];
      const nb = (await sql`SELECT count(*)::int AS n FROM pss_ecrans WHERE espace = ${code} AND vu > now() - interval '60 seconds'`) as any[];
      return { version: e.version, jour, lieu: e.config.lieu, portes: { n: e.config.portes, noms: e.config.noms }, appels, prochains: prochains.map(p => p.ticket), enAttente: att[0].n, ecransConnectes: nb[0].n, serveur: new Date().toISOString() };
    },

    // Écriture de dossiers avec contrôle de révision (pas d'écrasement silencieux).
    async ecrire(code: string, dossiers: { id: string; baseRev: number; data: any }[]) {
      const e = await espace(code); if (!e) return null;
      const acceptes: any[] = [], conflits: any[] = [];
      for (const d of (dossiers || []).slice(0, 50)) {
        if (!d || typeof d.id !== "string" || d.id.length > 40 || !d.data || JSON.stringify(d.data).length > 250000) continue;
        const c = colonnes(d.data), v = await bump(code); d.data.id = d.id;
        let r: any[];
        if (!d.baseRev) r = (await sql`INSERT INTO pss_dossiers (espace, id, rev, status, rdv_date, ticket, version, data) VALUES (${code}, ${d.id}, 1, ${c.status}, ${c.rdv}, ${c.ticket}, ${v}, ${JSON.stringify(d.data)}::jsonb) ON CONFLICT DO NOTHING RETURNING rev`) as any[];
        else r = (await sql`UPDATE pss_dossiers SET rev = rev + 1, status = ${c.status}, rdv_date = ${c.rdv}, ticket = ${c.ticket}, version = ${v}, data = ${JSON.stringify(d.data)}::jsonb, maj = now() WHERE espace = ${code} AND id = ${d.id} AND rev = ${d.baseRev} RETURNING rev`) as any[];
        if (r[0]) acceptes.push({ id: d.id, rev: Number(r[0].rev) });
        else { const cur = (await sql`SELECT id, rev, status, rdv_date, ticket, version, data FROM pss_dossiers WHERE espace = ${code} AND id = ${d.id}`) as Ligne[]; if (cur[0]) conflits.push(publier(cur[0])); }
      }
      return { acceptes, conflits };
    },

    // Paiement à la caisse : numéro de reçu, rendez-vous d'enrôlement et numéro d'appel, attribués ici (atomique).
    async payer(code: string, id: string, montant: number, mode: string, caissier: string) {
      const e = await espace(code); if (!e) return { erreur: "Espace introuvable", statut: 404 };
      if (!(montant > 0) || montant > 100000000) return { erreur: "Montant invalide", statut: 400 };
      for (let essai = 0; essai < 8; essai++) {
        const cur = (await sql`SELECT id, rev, status, data FROM pss_dossiers WHERE espace = ${code} AND id = ${id}`) as any[];
        if (!cur[0]) return { erreur: "Dossier introuvable", statut: 404 };
        if (cur[0].status !== "depose" || cur[0].data.paiement) return { erreur: "Ce dossier est déjà payé.", statut: 409, dossier: cur[0].data };
        // premier jour ouvré avec de la place
        const cfg = e.config; let jour = ajouterJours(jourDe(cfg), cfg.delai), choisi = "", rang = 0;
        for (let i = 0; i < 90 && !choisi; i++, jour = ajouterJours(jour, 1)) {
          if (!cfg.jours.includes(jourSemaine(jour))) continue;
          const n = ((await sql`SELECT count(*)::int AS n FROM pss_dossiers WHERE espace = ${code} AND rdv_date = ${jour}`) as any[])[0].n;
          if (n < cfg.capacite) { choisi = jour; rang = n; }
        }
        if (!choisi) return { erreur: "Aucun rendez-vous disponible dans les 90 prochains jours.", statut: 409 };
        const max = ((await sql`SELECT COALESCE(max(ticket), 0)::int AS m FROM pss_dossiers WHERE espace = ${code} AND rdv_date = ${choisi}`) as any[])[0].m;
        const ticket = max + 1;
        // 1) on réserve le numéro d'appel (index unique : jamais deux fois le même numéro le même jour)
        let res: any[] = [];
        try { res = (await sql`UPDATE pss_dossiers SET rev = rev + 1, rdv_date = ${choisi}, ticket = ${ticket} WHERE espace = ${code} AND id = ${id} AND rev = ${cur[0].rev} AND status = 'depose' AND ticket IS NULL RETURNING rev`) as any[]; }
        catch (err: any) { const c = err?.code || err?.cause?.code, msg = String(err?.cause?.message || err?.message || ""); if (c !== "23505" && !/duplicate key|unique/i.test(msg)) throw err; continue; }
        if (!res[0]) continue;
        // 2) on finalise : numéro de reçu (sans trou), paiement, rendez-vous
        for (let f = 0; f < 4; f++) {
          const fr = (await sql`SELECT rev, data FROM pss_dossiers WHERE espace = ${code} AND id = ${id}`) as any[];
          const rp = Number(((await sql`UPDATE pss_espaces SET compteur_rp = compteur_rp + 1 WHERE code = ${code} RETURNING compteur_rp`) as any[])[0].compteur_rp);
          const maintenant = new Date().toISOString(), d = fr[0].data;
          d.status = "paye"; d.ticket = ticket;
          d.paiement = { montant, mode: String(mode || "Espèces").slice(0, 30), at: maintenant, caissier: String(caissier || "Caisse").slice(0, 40), recu: "RP-" + new Date().getUTCFullYear() + "-" + String(rp).padStart(6, "0") };
          d.rdv = { date: choisi, heure: heureCreneau(cfg, Math.max(rang, ticket - 1)), lieu: cfg.lieu, objet: "Enrôlement (empreintes et photo)" };
          (d.history = d.history || []).push({ s: "paye", at: maintenant, by: d.paiement.caissier, note: "Paiement " + montant.toLocaleString("fr-FR") + " FCFA — " + d.paiement.mode + " · rendez-vous le " + choisi });
          const v = await bump(code);
          const r2 = (await sql`UPDATE pss_dossiers SET rev = rev + 1, status = 'paye', version = ${v}, data = ${JSON.stringify(d)}::jsonb, maj = now() WHERE espace = ${code} AND id = ${id} AND rev = ${fr[0].rev} RETURNING rev`) as any[];
          if (r2[0]) return { dossier: d, rev: Number(r2[0].rev), message: messageRdv(d) };
        }
      }
      return { erreur: "Serveur occupé, réessayez.", statut: 503 };
    },

    // Appel du suivant à une porte : choisit et réserve la personne en une seule opération.
    async appeler(code: string, porte: number) {
      const e = await espace(code); if (!e) return { erreur: "Espace introuvable", statut: 404 };
      if (!(porte >= 1 && porte <= e.config.portes)) return { erreur: "Porte inconnue", statut: 400 };
      const jour = jourDe(e.config);
      for (let essai = 0; essai < 10; essai++) {
        const c = (await sql`SELECT id, rev, data FROM pss_dossiers WHERE espace = ${code} AND rdv_date = ${jour} AND status = 'paye' ORDER BY COALESCE((data->>'rang')::int, ticket) LIMIT 1`) as any[];
        if (!c[0]) return { vide: true };
        const d = c[0].data, at = new Date().toISOString(); d.status = "recu"; d.appel = { porte, at };
        (d.history = d.history || []).push({ s: "recu", at, by: "Porte " + porte, note: "Appelé en salle" });
        const v = await bump(code);
        const r = (await sql`UPDATE pss_dossiers SET rev = rev + 1, status = 'recu', version = ${v}, data = ${JSON.stringify(d)}::jsonb, maj = now() WHERE espace = ${code} AND id = ${c[0].id} AND rev = ${c[0].rev} AND status = 'paye' RETURNING rev`) as any[];
        if (r[0]) return { dossier: d, rev: Number(r[0].rev) };
      }
      return { erreur: "Serveur occupé, réessayez.", statut: 503 };
    },

    async rappeler(code: string, porte: number) { return modifierPorte(code, porte, (d: any, at: string) => { d.appel.at = at; d.history.push({ s: d.status, at, by: "Porte " + porte, note: "Appel répété" }); }); },
    async absent(code: string, porte: number) {
      return modifierPorte(code, porte, (d: any, at: string, max: number) => { d.status = "paye"; d.rang = max + 1; delete d.appel; d.history.push({ s: "paye", at, by: "Porte " + porte, note: "Absent à l'appel — renvoyé en fin de file" }); });
    },

    // Le demandeur (sans compte) suit SON dossier : numéro de reçu + code de contrôle + code public de l'espace.
    async suivi(publique: string, id: string, ctrl: string) {
      const e = (await sql`SELECT code FROM pss_espaces WHERE code_public = ${publique}`) as any[]; if (!e[0]) return null;
      const l = (await sql`SELECT id, rev, data FROM pss_dossiers WHERE espace = ${e[0].code} AND id = ${id}`) as any[]; if (!l[0]) return null;
      if (codeSuivi(l[0].id, String(l[0].data?.person?.nom || "")) !== String(ctrl || "").toUpperCase()) return null;
      return { espace: e[0].code as string, dossier: assainir(l[0].data), rev: Number(l[0].rev) };
    },
    async suiviPiece(publique: string, id: string, ctrl: string, p: any) {
      for (let essai = 0; essai < 5; essai++) {
        const s = await this.suivi(publique, id, ctrl); if (!s) return null;
        const cur = (await sql`SELECT rev, data FROM pss_dossiers WHERE espace = ${s.espace} AND id = ${id}`) as any[]; const d = cur[0].data;
        if (!p || !/^PJ-[a-z0-9]{6,30}$/i.test(String(p.id)) || !["photo", "identite", "naissance", "nationalite", "domicile", "ancien", "autre"].includes(String(p.type))) return { erreur: "Pièce invalide", statut: 400 };
        d.pieces = d.pieces || []; if (!d.pieces.some((q: any) => q.id === p.id)) d.pieces.push({ id: p.id, type: p.type, nom: String(p.nom || "").slice(0, 80), mime: String(p.mime || "").slice(0, 30), taille: Number(p.taille) || 0, at: new Date().toISOString(), par: "demandeur" });
        (d.history = d.history || []).push({ s: d.status, at: new Date().toISOString(), by: "Demandeur", note: "Pièce ajoutée : " + p.type });
        const v = await bump(s.espace);
        const r = (await sql`UPDATE pss_dossiers SET rev = rev + 1, version = ${v}, data = ${JSON.stringify(d)}::jsonb, maj = now() WHERE espace = ${s.espace} AND id = ${id} AND rev = ${cur[0].rev} RETURNING rev`) as any[];
        if (r[0]) return { dossier: assainir(d), rev: Number(r[0].rev) };
      }
      return { erreur: "Serveur occupé, réessayez.", statut: 503 };
    },

    async reglages(code: string, cfg: unknown) {
      const e = await espace(code); if (!e) return null;
      const n = nettoyerConfig(cfg, e.config);
      await sql`UPDATE pss_espaces SET config = ${JSON.stringify(n)}::jsonb WHERE code = ${code}`;
      const v = await bump(code); return { config: n, version: v };
    },
  };

  async function modifierPorte(code: string, porte: number, fn: (d: any, at: string, max: number) => void) {
    const e = await espace(code); if (!e) return { erreur: "Espace introuvable", statut: 404 };
    const jour = jourDe(e.config);
    for (let essai = 0; essai < 6; essai++) {
      const c = (await sql`SELECT id, rev, data FROM pss_dossiers WHERE espace = ${code} AND rdv_date = ${jour} AND status = 'recu' AND (data->'appel'->>'porte')::int = ${porte} ORDER BY data->'appel'->>'at' DESC LIMIT 1`) as any[];
      if (!c[0]) return { vide: true };
      const max = ((await sql`SELECT COALESCE(max(COALESCE((data->>'rang')::int, ticket)), 0)::int AS m FROM pss_dossiers WHERE espace = ${code} AND rdv_date = ${jour}`) as any[])[0].m;
      const d = c[0].data, at = new Date().toISOString(); fn(d, at, max);
      const v = await bump(code);
      const r = (await sql`UPDATE pss_dossiers SET rev = rev + 1, status = ${d.status}, version = ${v}, data = ${JSON.stringify(d)}::jsonb, maj = now() WHERE espace = ${code} AND id = ${c[0].id} AND rev = ${c[0].rev} RETURNING rev`) as any[];
      if (r[0]) return { dossier: d, rev: Number(r[0].rev) };
    }
    return { erreur: "Serveur occupé, réessayez.", statut: 503 };
  }
}

// Version « demandeur » d'un dossier : seulement ce dont il a besoin (état, rendez-vous, numéro d'appel, pièces) — pas d'alertes, ni de numéro de pièce.
export function assainir(d: any) {
  const p = d.person || {};
  return { id: d.id, type: d.type, status: d.status, createdAt: d.createdAt, ticket: d.ticket ?? null, rdv: d.rdv || null, mrzOk: true,
    paiement: d.paiement ? { recu: d.paiement.recu, at: d.paiement.at } : null, pieces: (d.pieces || []).map((x: any) => ({ id: x.id, type: x.type, nom: x.nom, mime: x.mime, taille: x.taille, demo: !!x.demo })),
    person: { nom: p.nom || "", prenoms: p.prenoms || "", naissance: "", sexe: "", piece: { type: "CNI", numero: "", expiration: "" } },
    history: (d.history || []).slice(-6).map((h: any) => ({ s: h.s, at: h.at, by: "", note: "" })), ancienRestitue: !!d.ancienRestitue, ancien: d.ancien ? { numero: "", expiration: d.ancien.expiration || "" } : null, lieu: d.lieu || "" };
}

// Message d'accusé après paiement : date du rendez-vous d'enrôlement et numéro d'appel (envoyé par WhatsApp).
export function messageRdv(d: any): string {
  const r = d.rdv, p = d.person || {};
  return "*Passeport Sûr — Paiement enregistré*\n\nBonjour " + (p.prenoms || "") + ",\nvotre paiement est bien reçu.\n\n📅 *Rendez-vous d'enrôlement :*\n" + rdvTexte(r.date) + " à partir de " + r.heure + "\n📍 " + r.lieu +
    "\n\nReçu de paiement : *" + d.paiement.recu + "*\nVotre N° d'appel : *" + String(d.ticket).padStart(3, "0") + "*\n\nPrésentez-vous ce jour-là avec ce message et votre reçu. Votre numéro, votre nom et la porte s'afficheront sur les écrans de la salle d'attente.";
}
