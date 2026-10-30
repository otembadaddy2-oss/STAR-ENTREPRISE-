// KOMYO — comparaison fiable des numéros de téléphone, pour tous les pays.
// Avant : deux numéros étaient « le même » s'ils avaient les 8 mêmes derniers chiffres, ce qui pouvait refuser à tort
// l'inscription d'une personne d'un autre pays. Maintenant : avec indicatif, on compare l'indicatif ET le numéro ;
// sans indicatif (anciens comptes), on suppose le Congo (+242) comme avant, donc rien ne change pour les comptes existants.

// Indicatifs téléphoniques (UIT) : 1 chiffre, 2 chiffres, puis familles à 3 chiffres.
const UN = new Set(["1", "7"]);
const DEUX = new Set(["20", "27", "30", "31", "32", "33", "34", "36", "39", "40", "41", "43", "44", "45", "46", "47", "48", "49",
  "51", "52", "53", "54", "55", "56", "57", "58", "60", "61", "62", "63", "64", "65", "66", "81", "82", "84", "86",
  "90", "91", "92", "93", "94", "95", "98"]);
const TROIS = new Set(["21", "22", "23", "24", "25", "26", "29", "35", "37", "38", "42", "50", "59", "67", "68", "69", "85", "87", "88", "96", "97", "99"]);

export function chiffres(brut: string): { digits: string; explicite: boolean } {
  const s = String(brut || "").trim();
  let digits = s.replace(/\D/g, "");
  let explicite = s.startsWith("+");
  if (digits.startsWith("00")) { digits = digits.slice(2); explicite = true; }
  return { digits, explicite };
}

export function indicatif(digits: string): { cc: string; national: string } | null {
  if (UN.has(digits.slice(0, 1))) return { cc: digits.slice(0, 1), national: digits.slice(1) };
  if (DEUX.has(digits.slice(0, 2))) return { cc: digits.slice(0, 2), national: digits.slice(2) };
  if (TROIS.has(digits.slice(0, 2))) return { cc: digits.slice(0, 3), national: digits.slice(3) };
  return null;
}

const sansZeros = (s: string) => s.replace(/^0+/, "");
const fin8 = (s: string) => s.slice(-8);

/** Vrai si les deux écritures désignent le même numéro. */
export function memeNumero(a: string, b: string): boolean {
  const pa = chiffres(a), pb = chiffres(b);
  if (pa.digits.length < 8 || pb.digits.length < 8) return false;
  if (pa.explicite && pb.explicite) {
    const sa = indicatif(pa.digits), sb = indicatif(pb.digits);
    if (!sa || !sb) return fin8(pa.digits) === fin8(pb.digits);
    if (sa.cc !== sb.cc) return false;
    return sansZeros(sa.national) === sansZeros(sb.national);
  }
  // Au moins un numéro écrit sans indicatif : numéro local du Congo (+242), comme avant.
  const avecIndicatif = pa.explicite ? pa : pb.explicite ? pb : null;
  if (avecIndicatif) {
    const s = indicatif(avecIndicatif.digits);
    if (s && s.cc !== "242") return false;
  }
  return fin8(pa.digits) === fin8(pb.digits);
}

export const fin8Chiffres = (brut: string) => chiffres(brut).digits.slice(-8);
