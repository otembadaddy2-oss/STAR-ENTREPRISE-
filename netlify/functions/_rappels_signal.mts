// Keydou Compagnon : « un rappel est dû à telle heure », noté dans Netlify Blobs et NON dans la base de données.
//
// Pourquoi : la tâche des rappels passe toutes les 5 minutes. Elle interrogeait la base à CHAQUE passage, ce qui la gardait
// éveillée jour et nuit (crédits Netlify « Compute » : environ 10 crédits par Go-heure). Désormais elle consulte d'abord ce signal
// (très léger) et ne réveille la base que si :
//   - un rappel est dû (ou le sera dans la minute) ;
//   - c'est le balayage de l'heure (fins d'abonnement, purge des conversations d'entreprise) : une fois par heure, à l'heure pile,
//     en même temps que le gardien des vidéos, pour partager la même période d'éveil de la base ;
//   - le signal est illisible (Blobs en panne) : dans le doute, on fait comme avant — jamais de rappel manqué.
//
// Les clés sont « du/AAAAMMJJHHmm » (heure UTC, à la minute) : une clé par échéance, donc aucun conflit entre deux personnes
// qui créent un rappel en même temps.

export interface Magasin {
  list(o: { prefix: string }): Promise<{ blobs: { key: string }[] }>;
  get(k: string, o?: unknown): Promise<unknown>;
  set(k: string, v: string): Promise<unknown>;
  delete(k: string): Promise<unknown>;
}

const PREFIXE = "du/";
const CLE_DERNIER = "dernier-balayage";

export function cleMinute(d: Date): string {
  return PREFIXE + d.toISOString().slice(0, 16).replace(/[-:T]/g, "");
}

async function magasin(): Promise<Magasin> {
  const { getStore } = await import("@netlify/blobs");
  // Lecture « forte » : un rappel créé il y a quelques secondes doit être vu tout de suite.
  return getStore({ name: "keydou-rappels-signal", consistency: "strong" }) as unknown as Magasin;
}

// Note qu'un rappel arrivera à `quand` (et, s'il y a une alerte à l'avance, à `quand - avant`). Sans effet si Blobs est indisponible :
// le balayage de l'heure rattrape alors le rappel (retard maximal d'une heure, jamais un oubli).
export async function signaler(quand: Date, avantMinutes = 0, m?: Magasin): Promise<void> {
  try {
    const s = m || (await magasin());
    const t = quand.getTime();
    if (!Number.isFinite(t)) return;
    await s.set(cleMinute(new Date(t)), "1");
    if (avantMinutes > 0) await s.set(cleMinute(new Date(t - avantMinutes * 60000)), "1");
  } catch (e) {
    console.error("signal rappel (ignoré)", e);
  }
}

export type Decision = { complet: boolean; raison: string };

// Faut-il réveiller la base à ce passage ?
export async function decider(maintenant: Date, m?: Magasin): Promise<Decision> {
  try {
    const s = m || (await magasin());
    const limite = cleMinute(maintenant);
    const { blobs } = await s.list({ prefix: PREFIXE });
    if (blobs.some((b) => b.key <= limite)) return { complet: true, raison: "rappel dû" };
    const d = await s.get(CLE_DERNIER, { type: "text" });
    const dernier = typeof d === "string" ? new Date(d).getTime() : NaN;
    if (!Number.isFinite(dernier)) return { complet: true, raison: "premier passage" };
    const minutes = (maintenant.getTime() - dernier) / 60000;
    if (maintenant.getUTCMinutes() < 5 && minutes >= 30) return { complet: true, raison: "balayage de l'heure" };
    if (minutes >= 90) return { complet: true, raison: "rattrapage (balayage de l'heure manqué)" };
    return { complet: false, raison: "rien à faire" };
  } catch (e) {
    console.error("signal rappel illisible : balayage complet", e);
    return { complet: true, raison: "signal illisible" };
  }
}

// Après un balayage complet : on note l'heure et on efface les échéances déjà traitées (avant la minute en cours : celles de la
// minute en cours restent, car un rappel de « 14:50:30 » peut ne pas être encore dû à un passage à 14:50:10).
export async function terminer(maintenant: Date, m?: Magasin): Promise<void> {
  try {
    const s = m || (await magasin());
    await s.set(CLE_DERNIER, maintenant.toISOString());
    const limite = cleMinute(maintenant);
    const { blobs } = await s.list({ prefix: PREFIXE });
    for (const b of blobs) if (b.key < limite) await s.delete(b.key);
  } catch (e) {
    console.error("signal rappel : nettoyage ignoré", e);
  }
}
