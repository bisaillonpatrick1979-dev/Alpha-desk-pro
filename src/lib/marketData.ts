import { MarketAsset, MarketCandle } from '../types';
import { computeAssetIndicators, priceDecimals } from './indicators';

/**
 * Génération de séries de bougies.
 *
 * Deux propriétés importantes :
 *  1. Déterministe — le générateur est semé à partir du symbole et du pas de
 *     temps, donc un même actif produit toujours le même graphique. Sans cela,
 *     chaque re-render redessinait un historique différent.
 *  2. Ancrée sur le prix courant — la marche aléatoire est construite *à rebours*
 *     depuis le dernier prix, si bien que la dernière bougie clôture exactement
 *     au prix affiché par le ticker.
 */

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** mulberry32 — PRNG compact et reproductible. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type TimeframeKey = '1D' | '1W' | '1M' | '6M' | '1Y';

interface TimeframeSpec {
  key: TimeframeKey;
  label: string;
  /** Nombre de bougies affichées. */
  bars: number;
  /** Durée d'une bougie, en millisecondes. */
  intervalMs: number;
  /** Format de l'étiquette d'axe. */
  axis: 'time' | 'date' | 'month';
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const TIMEFRAMES: Record<TimeframeKey, TimeframeSpec> = {
  '1D': { key: '1D', label: '1J', bars: 78, intervalMs: 5 * MINUTE, axis: 'time' },
  '1W': { key: '1W', label: '1S', bars: 56, intervalMs: 3 * HOUR, axis: 'date' },
  '1M': { key: '1M', label: '1M', bars: 30, intervalMs: DAY, axis: 'date' },
  '6M': { key: '6M', label: '6M', bars: 130, intervalMs: DAY, axis: 'date' },
  '1Y': { key: '1Y', label: '1A', bars: 260, intervalMs: DAY, axis: 'month' },
};

export const TIMEFRAME_ORDER: TimeframeKey[] = ['1D', '1W', '1M', '6M', '1Y'];

/** Historique quotidien de référence : assez long pour une MM200 réelle. */
const DAILY_HISTORY_BARS = 320;

function formatLabel(date: Date, axis: TimeframeSpec['axis']): string {
  if (axis === 'time') {
    return date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  if (axis === 'month') {
    return date.toLocaleDateString('fr-CA', { month: 'short', year: '2-digit' });
  }
  return date.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' });
}

/**
 * Construit `bars` bougies se terminant à `endPrice`, en remontant le temps.
 * La volatilité est mise à l'échelle du pas de temps (racine du temps) pour que
 * les bougies 5 minutes ne bougent pas autant que les bougies journalières.
 */
export function generateSeries(
  symbol: string,
  endPrice: number,
  dailyVolatility: number,
  spec: TimeframeSpec,
  endTime: number = Date.now()
): MarketCandle[] {
  const rand = seededRandom(hashString(`${symbol}|${spec.key}`));
  const decimals = priceDecimals(endPrice);
  const factor = 10 ** decimals;
  const round = (value: number) => Math.round(value * factor) / factor;

  const barVolatility = dailyVolatility * Math.sqrt(spec.intervalMs / DAY);

  // Marche à rebours : on part du prix actuel et on reconstruit les clôtures passées.
  const closes: number[] = new Array(spec.bars);
  let price = endPrice;
  for (let i = spec.bars - 1; i >= 0; i--) {
    closes[i] = price;
    // Léger biais haussier dans le sens du temps, donc baissier en remontant.
    const drift = (rand() - 0.5) * 2 * barVolatility - barVolatility * 0.04;
    price = Math.max(endPrice * 0.05, price / (1 + drift));
  }

  const candles: MarketCandle[] = [];
  for (let i = 0; i < spec.bars; i++) {
    const close = closes[i];
    const open = i === 0 ? close / (1 + (rand() - 0.5) * barVolatility) : closes[i - 1];
    const wick = barVolatility * close * 0.6;

    const high = Math.max(open, close) + rand() * wick;
    const low = Math.max(0.0001, Math.min(open, close) - rand() * wick);
    const date = new Date(endTime - (spec.bars - 1 - i) * spec.intervalMs);

    candles.push({
      time: formatLabel(date, spec.axis),
      timestamp: date.getTime(),
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume: Math.floor((0.6 + rand() * 0.8) * 400000),
    });
  }

  return candles;
}

/** Volatilité journalière par classe d'actif — le Forex bouge bien moins qu'une crypto. */
export function dailyVolatilityFor(category: MarketAsset['category']): number {
  switch (category) {
    case 'Crypto':
      return 0.035;
    case 'Forex':
      return 0.005;
    case 'Commodities':
      return 0.018;
    case 'Futures':
      return 0.02;
    default:
      return 0.022;
  }
}

/** Historique quotidien d'un actif, utilisé pour tous les indicateurs. */
export function buildDailyHistory(asset: Pick<MarketAsset, 'symbol' | 'priceCAD' | 'category'>): MarketCandle[] {
  return generateSeries(
    asset.symbol,
    asset.priceCAD,
    dailyVolatilityFor(asset.category),
    { key: '1Y', label: '1A', bars: DAILY_HISTORY_BARS, intervalMs: DAY, axis: 'date' }
  );
}

const seriesCache = new Map<string, MarketCandle[]>();

/**
 * Série affichée pour un pas de temps donné. Les vues journalières et
 * supérieures sont découpées dans l'historique quotidien (une seule source de
 * vérité pour les indicateurs) ; les vues intraday sont générées séparément.
 */
export function getSeries(asset: MarketAsset, timeframe: TimeframeKey): MarketCandle[] {
  const spec = TIMEFRAMES[timeframe];

  if (spec.intervalMs >= DAY) {
    return asset.history.slice(-spec.bars);
  }

  const cacheKey = `${asset.symbol}|${timeframe}`;
  let series = seriesCache.get(cacheKey);
  if (!series) {
    series = generateSeries(asset.symbol, asset.priceCAD, dailyVolatilityFor(asset.category), spec);
    seriesCache.set(cacheKey, series);
  }

  // Recale la dernière bougie sur le prix courant pour que le graphique intraday
  // suive le ticker sans régénérer toute la série.
  return applyLivePrice(series, asset.priceCAD);
}

/** Met à jour la dernière bougie d'une série avec le prix courant. */
export function applyLivePrice(series: MarketCandle[], price: number): MarketCandle[] {
  if (series.length === 0) return series;

  const last = series[series.length - 1];
  if (last.close === price) return series;

  const updated: MarketCandle = {
    ...last,
    close: price,
    high: Math.max(last.high, price),
    low: Math.min(last.low, price),
  };

  return [...series.slice(0, -1), updated];
}

/**
 * Fait progresser un actif d'un tick : la dernière bougie quotidienne absorbe le
 * nouveau prix et tous les indicateurs sont recalculés dessus. Sans cela le RSI,
 * le MACD et les moyennes mobiles restaient figés sur leurs valeurs initiales
 * pendant que le prix, lui, bougeait.
 */
export function tickAsset(asset: MarketAsset, newPrice: number, previousClose: number): MarketAsset {
  const history = applyLivePrice(asset.history, newPrice);
  const indicators = computeAssetIndicators(history, newPrice);

  const decimals = priceDecimals(newPrice);
  const factor = 10 ** decimals;

  return {
    ...asset,
    priceCAD: newPrice,
    change24h: Math.round(((newPrice - previousClose) / previousClose) * 10000) / 100,
    history,
    rsi: indicators.rsi,
    macd: indicators.macd,
    ma50: indicators.ma50 ?? asset.ma50,
    ma200: indicators.ma200 ?? asset.ma200,
    support: Math.round(indicators.support * factor) / factor,
    resistance: Math.round(indicators.resistance * factor) / factor,
  };
}
