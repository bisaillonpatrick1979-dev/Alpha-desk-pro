/**
 * Helpers de temps ancrés sur le fuseau d'Alberta (Mountain Time).
 *
 * L'application est spécifiée pour Alberta : la date, le jour de la semaine et
 * l'heure doivent être lus dans `America/Edmonton`, jamais dans le fuseau du
 * navigateur ni en UTC. `new Date().toISOString()` renvoie la date UTC — en
 * soirée à Edmonton c'est déjà le lendemain, ce qui décalait la détection des
 * jours fériés d'une journée.
 */

export const MT_ZONE = 'America/Edmonton';

/** Date au format YYYY-MM-DD telle qu'elle est vécue à Edmonton. */
export function mtDateISO(date: Date = new Date()): string {
  // en-CA produit déjà YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MT_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Minutes écoulées depuis minuit, heure d'Edmonton. */
export function mtMinutesOfDay(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MT_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

  // Intl peut renvoyer "24" pour minuit selon l'implémentation.
  return (hour % 24) * 60 + minute;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Jour de la semaine à Edmonton (0 = dimanche), indépendant du fuseau du navigateur. */
export function mtDayOfWeek(date: Date = new Date()): number {
  const label = new Intl.DateTimeFormat('en-US', { timeZone: MT_ZONE, weekday: 'short' }).format(date);
  return WEEKDAY_INDEX[label] ?? date.getUTCDay();
}

/** Horloge formatée HH:MM:SS pour l'affichage. */
export function mtClock(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: MT_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

/** Horodatage complet utilisé dans les payloads webhook et les rapports. */
export function mtTimestamp(date: Date = new Date()): string {
  const time = new Intl.DateTimeFormat('fr-CA', {
    timeZone: MT_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return `${mtDateISO(date)} - ${time} MT`;
}
