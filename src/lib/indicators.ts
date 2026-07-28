import { MarketCandle } from '../types';

/**
 * Indicateurs techniques standards calculés à partir des bougies réelles.
 * Toutes les fonctions renvoient un tableau aligné sur l'entrée : les positions
 * qui n'ont pas assez d'historique valent `null` plutôt qu'une valeur inventée.
 */

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;

  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;

  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];

  let prev = seed / period;
  out[period - 1] = prev;

  const k = 2 / (period + 1);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** RSI de Wilder (lissage exponentiel des gains/pertes moyens). */
export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length <= period) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }

  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export interface MacdSeries {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
}

export function macd(values: number[], fast = 12, slow = 26, signal = 9): MacdSeries {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);

  const macdLine: (number | null)[] = values.map((_, i) =>
    emaFast[i] === null || emaSlow[i] === null ? null : (emaFast[i] as number) - (emaSlow[i] as number)
  );

  // La ligne de signal est une EMA de la ligne MACD, calculée uniquement sur la
  // portion définie puis réalignée sur l'index d'origine.
  const firstDefined = macdLine.findIndex((v) => v !== null);
  const signalLine: (number | null)[] = new Array(values.length).fill(null);

  if (firstDefined !== -1) {
    const dense = macdLine.slice(firstDefined) as number[];
    const denseSignal = ema(dense, signal);
    for (let i = 0; i < denseSignal.length; i++) {
      signalLine[firstDefined + i] = denseSignal[i];
    }
  }

  const histogram: (number | null)[] = values.map((_, i) =>
    macdLine[i] === null || signalLine[i] === null ? null : (macdLine[i] as number) - (signalLine[i] as number)
  );

  return { macdLine, signalLine, histogram };
}

const round = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/** Nombre de décimales adapté à l'échelle de prix (le Forex cote à 4 décimales). */
export function priceDecimals(price: number): number {
  if (price < 10) return 4;
  if (price < 1000) return 2;
  return 2;
}

export interface AssetIndicators {
  rsi: number;
  macd: { macdLine: number; signalLine: number; histogram: number };
  ma50: number | null;
  ma200: number | null;
  support: number;
  resistance: number;
}

/**
 * Recalcule l'ensemble des indicateurs d'un actif à partir de son historique.
 * Le support et la résistance sont dérivés des extrêmes récents plutôt que
 * figés dans les données statiques, afin qu'ils restent cohérents avec le prix.
 */
export function computeAssetIndicators(history: MarketCandle[], lastPrice: number): AssetIndicators {
  const closes = history.map((c) => c.close);
  const decimals = priceDecimals(lastPrice);

  const rsiSeries = rsi(closes, 14);
  const macdSeries = macd(closes);
  const ma50Series = sma(closes, 50);
  const ma200Series = sma(closes, 200);

  const last = closes.length - 1;
  const lastDefined = <T>(series: (T | null)[]): T | null => {
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i] !== null) return series[i] as T;
    }
    return null;
  };

  const lookback = history.slice(-60);
  const lows = lookback.map((c) => c.low);
  const highs = lookback.map((c) => c.high);

  return {
    rsi: rsiSeries[last] !== null ? Math.round(rsiSeries[last] as number) : 50,
    macd: {
      macdLine: round(lastDefined(macdSeries.macdLine) ?? 0, decimals + 2),
      signalLine: round(lastDefined(macdSeries.signalLine) ?? 0, decimals + 2),
      histogram: round(lastDefined(macdSeries.histogram) ?? 0, decimals + 2),
    },
    ma50: ma50Series[last] !== null ? round(ma50Series[last] as number, decimals) : null,
    ma200: ma200Series[last] !== null ? round(ma200Series[last] as number, decimals) : null,
    support: lows.length ? round(Math.min(...lows), decimals) : round(lastPrice * 0.95, decimals),
    resistance: highs.length ? round(Math.max(...highs), decimals) : round(lastPrice * 1.05, decimals),
  };
}
