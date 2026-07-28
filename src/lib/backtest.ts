import { BacktestReport, MarketAsset, MarketCandle } from '../types';
import { rsi as rsiSeries, sma } from './indicators';

/**
 * Backtest réel exécuté sur les bougies des actifs de la watchlist.
 *
 * La version précédente renvoyait des constantes (42 trades, 71,4 % de réussite,
 * Sharpe 2,15) quels que soient la période, la stratégie ou les données, puis
 * proposait de créditer ce gain inventé au portefeuille. Ici chaque métrique est
 * mesurée sur les transactions effectivement simulées.
 */

export interface BacktestParams {
  /** Capital de départ de la simulation, en $ CAD. */
  startingCapitalCAD: number;
  /** Fraction du capital engagée par position (0-1). */
  allocationFraction: number;
  rsiBuyThreshold: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  /** Nombre maximal de bougies conservées après l'entrée avant sortie forcée. */
  maxHoldBars: number;
  /** Frais aller-retour appliqués à chaque transaction, en pourcentage. */
  feePercent: number;
}

export const DEFAULT_BACKTEST_PARAMS: BacktestParams = {
  startingCapitalCAD: 10000,
  allocationFraction: 0.2,
  rsiBuyThreshold: 35,
  takeProfitPercent: 6,
  stopLossPercent: 3,
  maxHoldBars: 15,
  feePercent: 0.1,
};

interface SimulatedTrade {
  symbol: string;
  entryIndex: number;
  exitIndex: number;
  entryPrice: number;
  exitPrice: number;
  returnPercent: number;
  pnlCAD: number;
}

/** Simule la stratégie sur une série de bougies et renvoie les transactions. */
function simulateAsset(
  symbol: string,
  candles: MarketCandle[],
  params: BacktestParams,
  capitalPerTrade: number
): SimulatedTrade[] {
  const closes = candles.map((c) => c.close);
  const rsiValues = rsiSeries(closes, 14);
  const trendValues = sma(closes, 50);

  const trades: SimulatedTrade[] = [];
  let i = 1;

  while (i < candles.length - 1) {
    const currentRsi = rsiValues[i];
    const trend = trendValues[i];

    // Entrée : RSI en survente ET cours au-dessus de la tendance moyenne.
    const oversold = currentRsi !== null && currentRsi <= params.rsiBuyThreshold;
    const inTrend = trend === null || closes[i] >= trend * 0.98;

    if (!oversold || !inTrend) {
      i++;
      continue;
    }

    const entryPrice = candles[i + 1].open;
    const target = entryPrice * (1 + params.takeProfitPercent / 100);
    const stop = entryPrice * (1 - params.stopLossPercent / 100);

    let exitIndex = Math.min(i + params.maxHoldBars, candles.length - 1);
    let exitPrice = candles[exitIndex].close;

    for (let j = i + 1; j <= Math.min(i + params.maxHoldBars, candles.length - 1); j++) {
      // Convention prudente : si la bougie touche les deux niveaux, le stop est
      // considéré comme atteint en premier.
      if (candles[j].low <= stop) {
        exitIndex = j;
        exitPrice = stop;
        break;
      }
      if (candles[j].high >= target) {
        exitIndex = j;
        exitPrice = target;
        break;
      }
    }

    const grossReturn = (exitPrice - entryPrice) / entryPrice;
    const netReturn = grossReturn - params.feePercent / 100;

    trades.push({
      symbol,
      entryIndex: i + 1,
      exitIndex,
      entryPrice,
      exitPrice,
      returnPercent: netReturn * 100,
      pnlCAD: netReturn * capitalPerTrade,
    });

    i = exitIndex + 1;
  }

  return trades;
}

export function runBacktest(
  assets: MarketAsset[],
  params: BacktestParams = DEFAULT_BACKTEST_PARAMS
): BacktestReport {
  const capitalPerTrade = params.startingCapitalCAD * params.allocationFraction;

  const allTrades = assets.flatMap((asset) =>
    asset.history.length > 60 ? simulateAsset(asset.symbol, asset.history, params, capitalPerTrade) : []
  );

  // Chronologie approximative : les transactions sont rejouées par index de sortie
  // pour construire une courbe d'équité cohérente entre actifs.
  allTrades.sort((a, b) => a.exitIndex - b.exitIndex);

  let equity = params.startingCapitalCAD;
  let peak = equity;
  let maxDrawdownPercent = 0;
  const equityCurve: { index: number; equity: number }[] = [{ index: 0, equity }];

  let grossProfit = 0;
  let grossLoss = 0;

  allTrades.forEach((trade, index) => {
    equity += trade.pnlCAD;
    if (trade.pnlCAD >= 0) grossProfit += trade.pnlCAD;
    else grossLoss += Math.abs(trade.pnlCAD);

    peak = Math.max(peak, equity);
    if (peak > 0) {
      maxDrawdownPercent = Math.max(maxDrawdownPercent, ((peak - equity) / peak) * 100);
    }

    equityCurve.push({ index: index + 1, equity: Math.round(equity * 100) / 100 });
  });

  const winningTrades = allTrades.filter((t) => t.pnlCAD > 0).length;
  const totalProfitCAD = Math.round((equity - params.startingCapitalCAD) * 100) / 100;

  // Sharpe simplifié : moyenne des rendements par transaction rapportée à leur
  // écart-type. Sans transaction, la métrique n'est pas définie — on renvoie 0
  // plutôt qu'une valeur flatteuse inventée.
  const returns = allTrades.map((t) => t.returnPercent);
  const meanReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length
    ? returns.reduce((acc, r) => acc + (r - meanReturn) ** 2, 0) / returns.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? Math.round((meanReturn / stdDev) * Math.sqrt(returns.length) * 100) / 100 : 0;

  const perSymbol = new Map<string, number>();
  allTrades.forEach((t) => perSymbol.set(t.symbol, (perSymbol.get(t.symbol) ?? 0) + t.pnlCAD));
  const ranked = [...perSymbol.entries()].sort((a, b) => b[1] - a[1]);

  return {
    totalTrades: allTrades.length,
    winningTrades,
    winRate: allTrades.length ? Math.round((winningTrades / allTrades.length) * 1000) / 10 : 0,
    maxDrawdownPercent: Math.round(maxDrawdownPercent * 100) / 100,
    totalProfitCAD,
    returnPercent: Math.round((totalProfitCAD / params.startingCapitalCAD) * 10000) / 100,
    profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? Infinity : 0,
    sharpeRatio,
    bestAsset: ranked.length ? ranked[0][0] : '—',
    worstAsset: ranked.length ? ranked[ranked.length - 1][0] : '—',
    barsAnalysed: assets.reduce((acc, a) => acc + a.history.length, 0),
    assetsAnalysed: assets.filter((a) => a.history.length > 60).length,
    strategyLabel: `RSI ≤ ${params.rsiBuyThreshold} au-dessus de la MM50, cible +${params.takeProfitPercent} %, stop −${params.stopLossPercent} %, sortie forcée à ${params.maxHoldBars} bougies`,
    equityCurve,
  };
}
