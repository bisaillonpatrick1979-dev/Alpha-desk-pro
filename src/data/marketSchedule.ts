import { mtDateISO, mtDayOfWeek, mtMinutesOfDay } from '../lib/time';

export interface MarketScheduleInfo {
  id: string;
  code: 'US' | 'JP' | 'AU' | 'CA' | 'FOREX' | 'CRYPTO_COMMODITY';
  name: string;
  flag: string;
  exchange: string;
  timeZone: string;
  timeZoneLabel: string;
  normalHoursLocal: string;
  normalHoursMT: string; // Mountain Time (Alberta)
  sessionTypes: string[];
  holidays: { date: string; name: string; status: 'FERMÉ' | 'OUVERTURE_PARTIELLE' }[];
  plannedClosures: { date: string; timeMT: string; reason: string }[];
  currentStatus: 'OUVERT' | 'PRÉ-MARCHÉ' | 'APRÈS-BOURSE' | 'PAUSE_DÉJEUNER' | 'FERMÉ' | 'JOUR_FÉRIÉ';
  isTradeAllowedByUser: boolean;
}

export const WORLD_MARKETS_SCHEDULE: MarketScheduleInfo[] = [
  {
    id: 'US',
    code: 'US',
    name: 'États-Unis',
    flag: '🇺🇸',
    exchange: 'NYSE / NASDAQ',
    timeZone: 'America/New_York',
    timeZoneLabel: 'EST / EDT',
    normalHoursLocal: '09:30 - 16:00 EST',
    normalHoursMT: '07:30 - 14:00 MT',
    sessionTypes: ['Pré-marché (02:00-07:30 MT)', 'Régulière (07:30-14:00 MT)', 'Après-bourse (14:00-18:00 MT)'],
    holidays: [
      { date: '2026-01-01', name: 'Jour de l\'An', status: 'FERMÉ' },
      { date: '2026-01-19', name: 'Martin Luther King Jr. Day', status: 'FERMÉ' },
      { date: '2026-02-16', name: 'Presidents\' Day (Washington)', status: 'FERMÉ' },
      { date: '2026-04-03', name: 'Vendredi Saint (Good Friday)', status: 'FERMÉ' },
      { date: '2026-05-25', name: 'Memorial Day', status: 'FERMÉ' },
      { date: '2026-06-19', name: 'Juneteenth National Independence Day', status: 'FERMÉ' },
      { date: '2026-07-03', name: 'Independence Day (Observé)', status: 'FERMÉ' },
      { date: '2026-09-07', name: 'Fête du Travail (Labor Day)', status: 'FERMÉ' },
      { date: '2026-11-26', name: 'Action de Grâce (Thanksgiving)', status: 'FERMÉ' },
      { date: '2026-12-25', name: 'Noël (Christmas Day)', status: 'FERMÉ' },
    ],
    plannedClosures: [
      { date: '2026-07-02', timeMT: '11:00 MT (13:00 EST)', reason: 'Veille Fête Nationale US (Fermeture anticipée)' },
      { date: '2026-11-27', timeMT: '11:00 MT (13:00 EST)', reason: 'Lendemain de Thanksgiving (Black Friday)' },
      { date: '2026-12-24', timeMT: '11:00 MT (13:00 EST)', reason: 'Veille de Noël (Early Close)' },
    ],
    currentStatus: 'OUVERT',
    isTradeAllowedByUser: true,
  },
  {
    id: 'JP',
    code: 'JP',
    name: 'Japon',
    flag: '🇯🇵',
    exchange: 'Bourse de Tokyo (TSE)',
    timeZone: 'Asia/Tokyo',
    timeZoneLabel: 'JST (UTC+9)',
    normalHoursLocal: '09:00-11:30 & 12:30-15:30 JST',
    normalHoursMT: '18:00-20:30 & 21:30-00:30 MT',
    sessionTypes: ['Matinée (18:00-20:30 MT)', 'Pause Déjeuner (20:30-21:30 MT)', 'Apres-midi (21:30-00:30 MT)'],
    holidays: [
      { date: '2026-01-01', name: 'Jour de l\'An (Gantan)', status: 'FERMÉ' },
      { date: '2026-01-02', name: 'Congé Bancaire de Janvier', status: 'FERMÉ' },
      { date: '2026-01-12', name: 'Fête de la Majorité (Seijin no Hi)', status: 'FERMÉ' },
      { date: '2026-02-11', name: 'Fondation de la Nation', status: 'FERMÉ' },
      { date: '2026-02-23', name: 'Anniversaire de l\'Empereur', status: 'FERMÉ' },
      { date: '2026-03-20', name: 'Équinoxe de Printemps', status: 'FERMÉ' },
      { date: '2026-04-29', name: 'Jour de Showa (Golden Week)', status: 'FERMÉ' },
      { date: '2026-05-03', name: 'Mémorial de la Constitution', status: 'FERMÉ' },
      { date: '2026-05-04', name: 'Jour de la Nature (Greenery Day)', status: 'FERMÉ' },
      { date: '2026-05-05', name: 'Fête des Enfants', status: 'FERMÉ' },
      { date: '2026-07-20', name: 'Jour de la Mer (Marine Day)', status: 'FERMÉ' },
      { date: '2026-09-21', name: 'Respect des Personnes Âgées', status: 'FERMÉ' },
      { date: '2026-11-03', name: 'Jour de la Culture', status: 'FERMÉ' },
      { date: '2026-11-23', name: 'Fête du Travail (Kinro Kansha)', status: 'FERMÉ' },
    ],
    plannedClosures: [
      { date: '2026-12-30', timeMT: '20:30 MT', reason: 'Dernière session de l\'année (Omisoka)' },
      { date: '2026-12-31', timeMT: 'Toute la journée', reason: 'Fermeture Annuelle de Fin d\'Année' },
    ],
    currentStatus: 'FERMÉ',
    isTradeAllowedByUser: true,
  },
  {
    id: 'AU',
    code: 'AU',
    name: 'Australie',
    flag: '🇦🇺',
    exchange: 'Bourse de Sydney (ASX)',
    timeZone: 'Australia/Sydney',
    timeZoneLabel: 'AEST / AEDT',
    normalHoursLocal: '10:00 - 16:00 AEST',
    normalHoursMT: '18:00 - 00:00 MT',
    sessionTypes: ['Pré-ouverture (15:00-18:00 MT)', 'Session Régulière (18:00-00:00 MT)'],
    holidays: [
      { date: '2026-01-01', name: 'New Year\'s Day', status: 'FERMÉ' },
      { date: '2026-01-26', name: 'Australia Day', status: 'FERMÉ' },
      { date: '2026-04-03', name: 'Good Friday', status: 'FERMÉ' },
      { date: '2026-04-06', name: 'Easter Monday', status: 'FERMÉ' },
      { date: '2026-04-25', name: 'ANZAC Day', status: 'FERMÉ' },
      { date: '2026-06-08', name: 'King\'s Birthday', status: 'FERMÉ' },
      { date: '2026-10-05', name: 'Labour Day Sydney', status: 'FERMÉ' },
      { date: '2026-12-25', name: 'Christmas Day', status: 'FERMÉ' },
      { date: '2026-12-26', name: 'Boxing Day', status: 'FERMÉ' },
    ],
    plannedClosures: [
      { date: '2026-12-24', timeMT: '22:10 MT (14:10 AEST)', reason: 'Fermeture anticipée Veille de Noël' },
      { date: '2026-12-31', timeMT: '22:10 MT (14:10 AEST)', reason: 'Fermeture anticipée Saint-Sylvestre' },
    ],
    currentStatus: 'FERMÉ',
    isTradeAllowedByUser: true,
  },
  {
    id: 'CA',
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    exchange: 'Bourse de Toronto (TSX)',
    timeZone: 'America/Toronto',
    timeZoneLabel: 'EST / EDT',
    normalHoursLocal: '09:30 - 16:00 EST',
    normalHoursMT: '07:30 - 14:00 MT',
    sessionTypes: ['Pré-marché (05:00-07:30 MT)', 'Régulière TSX (07:30-14:00 MT)', 'Heures Étendues (14:15-15:00 MT)'],
    holidays: [
      { date: '2026-01-01', name: 'Jour de l\'An', status: 'FERMÉ' },
      { date: '2026-02-16', name: 'Jour de la Famille (Family Day)', status: 'FERMÉ' },
      { date: '2026-04-03', name: 'Vendredi Saint', status: 'FERMÉ' },
      { date: '2026-05-18', name: 'Fête de la Reine (Victoria Day)', status: 'FERMÉ' },
      { date: '2026-07-01', name: 'Fête du Canada (Canada Day)', status: 'FERMÉ' },
      { date: '2026-08-03', name: 'Congé Civique (Civic Holiday)', status: 'FERMÉ' },
      { date: '2026-09-07', name: 'Fête du Travail', status: 'FERMÉ' },
      { date: '2026-09-30', name: 'Journée de la Vérité et Réconciliation', status: 'FERMÉ' },
      { date: '2026-10-12', name: 'Action de Grâce Canadienne', status: 'FERMÉ' },
      { date: '2026-11-11', name: 'Jour du Souvenir (Remembrance Day)', status: 'FERMÉ' },
      { date: '2026-12-25', name: 'Jour de Noël', status: 'FERMÉ' },
      { date: '2026-12-26', name: 'Lendemain de Noël (Boxing Day)', status: 'FERMÉ' },
    ],
    plannedClosures: [
      { date: '2026-12-24', timeMT: '11:00 MT (13:00 EST)', reason: 'Fermeture anticipée TSX Veille de Noël' },
    ],
    currentStatus: 'OUVERT',
    isTradeAllowedByUser: true,
  },
  {
    id: 'FOREX',
    code: 'FOREX',
    name: 'Forex International',
    flag: '💱',
    exchange: 'Interbank FX (Sydney/Tokyo/Londres/NY)',
    timeZone: 'UTC',
    timeZoneLabel: '24h / 5j Interbanque',
    normalHoursLocal: '24h/24 Dimanche 17:00 EST à Vendredi 17:00 EST',
    normalHoursMT: '24h/24 Dim 15:00 MT au Ven 15:00 MT',
    sessionTypes: [
      'Session Sydney (18:00-03:00 MT)',
      'Session Tokyo (20:00-05:00 MT)',
      'Session Londres (01:00-10:00 MT)',
      'Session New York (06:00-15:00 MT)',
      'Chevauchement Londres/NY Volatilité Max (06:00-10:00 MT)'
    ],
    holidays: [
      { date: '2026-01-01', name: 'Jour de l\'An Global', status: 'FERMÉ' },
      { date: '2026-12-25', name: 'Noël Global FX', status: 'FERMÉ' },
    ],
    plannedClosures: [
      { date: 'Chaque Week-end', timeMT: 'Du Ven 15:00 MT au Dim 15:00 MT', reason: 'Fermeture Interbanque du Week-end' },
    ],
    currentStatus: 'OUVERT',
    isTradeAllowedByUser: true,
  },
  {
    id: 'CRYPTO_COMMODITY',
    code: 'CRYPTO_COMMODITY',
    name: 'Crypto & Matières Premières',
    flag: '₿',
    exchange: 'Spot Crypto (24/7) & NYMEX/ICE WTI-Or',
    timeZone: 'UTC',
    timeZoneLabel: 'Continu 24/7',
    normalHoursLocal: '24/7/365 pour Crypto • Dim-Ven pour WTI/Or',
    normalHoursMT: 'Crypto : Continu 24h/24 • Matières : Pause 17:00-18:00 MT',
    sessionTypes: [
      'Crypto Spot & Derivs (24/7/365)',
      'WTI Crude Oil & Or NYMEX (Pause quotidienne 17:00-18:00 MT)'
    ],
    holidays: [],
    plannedClosures: [
      { date: 'WTI / Or Futures', timeMT: 'Chaque jour 17:00 - 18:00 MT', reason: 'Maintenance quotidienne NYMEX / CME Group' }
    ],
    currentStatus: 'OUVERT',
    isTradeAllowedByUser: true,
  }
];

// Évalue le statut courant d'un marché, en heure d'Alberta.
export function calculateLiveMarketStatus(market: MarketScheduleInfo, date: Date = new Date()): MarketScheduleInfo['currentStatus'] {
  // `toISOString()` renvoie la date UTC : en soirée à Edmonton (UTC−6/−7) c'est
  // déjà le lendemain, ce qui décalait la détection des jours fériés d'un jour.
  const holidayMatch = market.holidays.find(h => h.date === mtDateISO(date));
  if (holidayMatch) {
    return 'JOUR_FÉRIÉ';
  }

  const timeInMinutes = mtMinutesOfDay(date);

  // `getDay()` renvoie le jour dans le fuseau du navigateur, pas celui d'Alberta :
  // un utilisateur à Tokyo voyait les marchés nord-américains ouverts le samedi.
  const dayOfWeek = mtDayOfWeek(date);

  if (market.code === 'CRYPTO_COMMODITY') {
    return 'OUVERT';
  }

  if (market.code === 'FOREX') {
    // Closed on Friday 15:00 MT to Sunday 15:00 MT
    if ((dayOfWeek === 5 && timeInMinutes >= 900) || dayOfWeek === 6 || (dayOfWeek === 0 && timeInMinutes < 900)) {
      return 'FERMÉ';
    }
    return 'OUVERT';
  }

  // Weekends closed for Stock Markets (US, CA, JP, AU)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'FERMÉ';
  }

  if (market.code === 'US' || market.code === 'CA') {
    // Regular 07:30 MT (450m) to 14:00 MT (840m)
    if (timeInMinutes >= 120 && timeInMinutes < 450) {
      return 'PRÉ-MARCHÉ';
    } else if (timeInMinutes >= 450 && timeInMinutes < 840) {
      return 'OUVERT';
    } else if (timeInMinutes >= 840 && timeInMinutes < 1080) {
      return 'APRÈS-BOURSE';
    } else {
      return 'FERMÉ';
    }
  }

  if (market.code === 'JP') {
    // 18:00 (1080m) to 20:30 (1230m) & 21:30 (1290m) to 00:30 (30m)
    if (timeInMinutes >= 1080 && timeInMinutes < 1230) {
      return 'OUVERT';
    } else if (timeInMinutes >= 1230 && timeInMinutes < 1290) {
      return 'PAUSE_DÉJEUNER';
    } else if (timeInMinutes >= 1290 || timeInMinutes < 30) {
      return 'OUVERT';
    } else {
      return 'FERMÉ';
    }
  }

  if (market.code === 'AU') {
    // 18:00 (1080m) to 00:00 (1440m) MT
    if (timeInMinutes >= 900 && timeInMinutes < 1080) {
      return 'PRÉ-MARCHÉ';
    } else if (timeInMinutes >= 1080 || timeInMinutes < 30) {
      return 'OUVERT';
    } else {
      return 'FERMÉ';
    }
  }

  return 'OUVERT';
}
