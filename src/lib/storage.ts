/**
 * Accès localStorage tolérant aux pannes.
 *
 * Un JSON.parse non protégé sur une entrée corrompue lève pendant l'initialisation
 * du state React, ce qui laisse l'application sur une page blanche définitive :
 * le rechargement relit la même donnée corrompue. On isole donc chaque lecture
 * et on purge la clé fautive.
 */

export function loadJSON<T>(key: string, fallback: T, validate?: (value: unknown) => boolean): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return fallback;
  }

  if (raw === null) return fallback;

  try {
    const parsed = JSON.parse(raw) as T;
    if (validate && !validate(parsed)) throw new Error('validation failed');
    return parsed;
  } catch {
    console.warn(`[alpha-desk] Donnée locale illisible pour "${key}", réinitialisation aux valeurs par défaut.`);
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* quota ou mode privé : rien de plus à faire */
    }
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota dépassé ou stockage désactivé (navigation privée Safari) :
    // l'application reste utilisable, seule la persistance est perdue.
    console.warn(`[alpha-desk] Impossible de sauvegarder "${key}" (stockage indisponible).`);
  }
}

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isArrayOf = <T>(guard: (item: unknown) => boolean) => (value: unknown): value is T[] =>
  Array.isArray(value) && value.every(guard);

export const hasNumericFields = (fields: string[]) => (value: unknown): boolean =>
  isObject(value) && fields.every((f) => typeof value[f] === 'number' && Number.isFinite(value[f] as number));
