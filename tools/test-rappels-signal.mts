// Vérifie la décision « faut-il réveiller la base ? » de la tâche des rappels, avec un faux magasin Blobs en mémoire.
// Lancer : node --experimental-strip-types tools/test-rappels-signal.mts
import { cleMinute, signaler, decider, terminer, type Magasin } from "../netlify/functions/_rappels_signal.mts";

let ok = 0, ko = 0;
function verif(nom: string, cond: boolean) { if (cond) { ok++; console.log("OK  " + nom); } else { ko++; console.log("ÉCHEC " + nom); } }

function faux(): Magasin & { cles(): string[]; casse: boolean } {
  const m = new Map<string, string>();
  const o: any = {
    casse: false,
    async list({ prefix }: { prefix: string }) { if (o.casse) throw new Error("blobs HS"); return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).sort().map((key) => ({ key })) }; },
    async get(k: string) { if (o.casse) throw new Error("blobs HS"); return m.get(k) ?? null; },
    async set(k: string, v: string) { if (o.casse) throw new Error("blobs HS"); m.set(k, v); },
    async delete(k: string) { m.delete(k); },
    cles: () => [...m.keys()].sort(),
  };
  return o;
}
const T = (s: string) => new Date(s);

(async () => {
  const s = faux();
  // 1. Premier passage : on ne sait rien, balayage complet (puis on note l'heure).
  let d = await decider(T("2026-11-18T14:52:10Z"), s);
  verif("premier passage : balayage complet", d.complet && d.raison === "premier passage");
  await terminer(T("2026-11-18T14:52:10Z"), s);

  // 2. Rien d'attendu : la base reste endormie à chaque passage de 5 minutes.
  d = await decider(T("2026-11-18T14:57:10Z"), s);
  verif("14:57, rien à faire : la base dort", !d.complet);
  d = await decider(T("2026-11-18T15:27:10Z"), s);
  verif("15:27, rien à faire : la base dort", !d.complet);

  // 3. Balayage de l'heure : seulement dans les 5 premières minutes de l'heure (même moment que le gardien).
  d = await decider(T("2026-11-18T15:02:10Z"), s);
  verif("15:02, dernier balayage il y a 10 min : la base dort", !d.complet);
  d = await decider(T("2026-11-18T16:02:10Z"), s);
  verif("16:02 : balayage de l'heure (abonnements, purge)", d.complet && d.raison === "balayage de l'heure");
  await terminer(T("2026-11-18T16:02:10Z"), s);
  d = await decider(T("2026-11-18T16:07:10Z"), s);
  verif("16:07, juste après le balayage : la base dort", !d.complet);

  // 4. Un rappel créé : il réveille la base au bon passage, pas avant.
  await signaler(T("2026-11-18T16:20:30Z"), 0, s);
  d = await decider(T("2026-11-18T16:15:10Z"), s);
  verif("rappel de 16:20 : à 16:15 la base dort", !d.complet);
  d = await decider(T("2026-11-18T16:20:10Z"), s);
  verif("rappel de 16:20:30 : le passage de 16:20 réveille la base", d.complet && d.raison === "rappel dû");
  await terminer(T("2026-11-18T16:20:10Z"), s);
  verif("la clé de la minute en cours reste (pas encore dû à 16:20:10)", s.cles().includes(cleMinute(T("2026-11-18T16:20:00Z"))));
  d = await decider(T("2026-11-18T16:25:10Z"), s);
  verif("passage suivant (16:25) : rappel traité", d.complet);
  await terminer(T("2026-11-18T16:25:10Z"), s);
  verif("après traitement, la clé de 16:20 est effacée", !s.cles().includes(cleMinute(T("2026-11-18T16:20:00Z"))));
  d = await decider(T("2026-11-18T16:30:10Z"), s);
  verif("16:30 : plus rien, la base dort", !d.complet);

  // 5. Alerte à l'avance : deux échéances (l'avance et l'heure).
  await signaler(T("2026-11-18T18:00:00Z"), 30, s);
  verif("rappel de 18:00 avec alerte 30 min : deux clés", s.cles().includes(cleMinute(T("2026-11-18T17:30:00Z"))) && s.cles().includes(cleMinute(T("2026-11-18T18:00:00Z"))));
  d = await decider(T("2026-11-18T17:30:10Z"), s);
  verif("l'alerte de 17:30 réveille la base", d.complet);

  // 6. Rappel créé dans le passé proche (jusqu'à 5 min autorisées) : traité au passage suivant.
  const s2 = faux(); await terminer(T("2026-11-18T10:00:10Z"), s2);
  await signaler(T("2026-11-18T10:12:00Z"), 0, s2);
  d = await decider(T("2026-11-18T10:15:10Z"), s2);
  verif("rappel déjà échu : traité au passage suivant", d.complet);

  // 7. Rattrapage : si le balayage de l'heure a été manqué, rattrapage au bout de 90 minutes.
  const s3 = faux(); await terminer(T("2026-11-18T10:00:10Z"), s3);
  d = await decider(T("2026-11-18T11:30:10Z"), s3);
  verif("90 minutes sans balayage : rattrapage même hors des 5 premières minutes", d.complet);
  d = await decider(T("2026-11-18T10:45:10Z"), s3);
  verif("45 minutes sans balayage, hors début d'heure : la base dort", !d.complet);

  // 8. Blobs en panne : on fait comme avant (jamais de rappel manqué) et la création ne plante pas.
  const s4 = faux(); s4.casse = true;
  d = await decider(T("2026-11-18T12:07:10Z"), s4);
  verif("Blobs illisible : balayage complet par sécurité", d.complet && d.raison === "signal illisible");
  let plante = false; try { await signaler(T("2026-11-18T13:00:00Z"), 10, s4); } catch { plante = true; }
  verif("Blobs en panne : la création d'un rappel ne plante pas", !plante);

  // 9. Estimation : nombre de réveils de la base par jour sans aucun rappel (avant : 288).
  const s5 = faux(); await terminer(T("2026-11-18T00:00:10Z"), s5);
  let reveils = 0;
  for (let min = 5; min < 24 * 60; min += 5) {
    const t = new Date(T("2026-11-18T00:00:10Z").getTime() + min * 60000);
    const dd = await decider(t, s5);
    if (dd.complet) { reveils++; await terminer(t, s5); }
  }
  verif(`sans rappel : ${reveils} réveil(s) de la base par jour (au lieu de 288)`, reveils >= 23 && reveils <= 25);

  console.log(ko ? `\n${ko} ÉCHEC(S)` : "\nTOUS LES TESTS PASSENT");
  process.exit(ko ? 1 : 0);
})();
