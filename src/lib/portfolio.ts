import { HistoricalTrade, PortfolioSettings, TradePosition } from '../types';

/**
 * Comptabilité du portefeuille — source unique de vérité.
 *
 * Invariant maintenu par ce module :
 *   totalCapitalCAD = bankReserveCAD + activeBudgetCAD + (capital engagé dans les positions ouvertes)
 *
 * Ouvrir une position débite `amountCAD` du budget actif ; la clôturer recrédite
 * `amountCAD + pnlCAD`. Le capital total ne bouge donc que du P&L réalisé.
 */

const round2 = (value: number) => Math.round(value * 100) / 100;

/** P&L latent d'une position, en tenant compte du sens LONG / SHORT. */
export function positionPnL(
  position: Pick<TradePosition, 'type' | 'entryPriceCAD' | 'units'>,
  currentPrice: number
): { pnlCAD: number; pnlPercent: number } {
  const direction = position.type === 'SHORT' ? -1 : 1;
  const move = (currentPrice - position.entryPriceCAD) * direction;

  return {
    pnlCAD: round2(move * position.units),
    pnlPercent: position.entryPriceCAD === 0 ? 0 : round2((move / position.entryPriceCAD) * 100),
  };
}

/**
 * Détermine si une position doit être clôturée au prix courant.
 * Pour un SHORT, le take-profit est *sous* le prix d'entrée et le stop au-dessus :
 * comparer sans tenir compte du sens fermait la position instantanément à l'ouverture.
 */
export function exitReason(
  position: Pick<TradePosition, 'type' | 'stopLossCAD' | 'takeProfitCAD'>,
  currentPrice: number
): 'TAKE_PROFIT' | 'STOP_LOSS' | null {
  if (position.type === 'SHORT') {
    if (position.takeProfitCAD > 0 && currentPrice <= position.takeProfitCAD) return 'TAKE_PROFIT';
    if (position.stopLossCAD > 0 && currentPrice >= position.stopLossCAD) return 'STOP_LOSS';
    return null;
  }

  if (position.takeProfitCAD > 0 && currentPrice >= position.takeProfitCAD) return 'TAKE_PROFIT';
  if (position.stopLossCAD > 0 && currentPrice <= position.stopLossCAD) return 'STOP_LOSS';
  return null;
}

/** Prix de stop / cible cohérents avec le sens de la position. */
export function stopAndTargetFor(
  type: 'LONG' | 'SHORT',
  entryPrice: number,
  stopPercent: number,
  targetPercent: number,
  decimals = 2
): { stopLossCAD: number; takeProfitCAD: number } {
  const factor = 10 ** decimals;
  const at = (pct: number) => Math.round(entryPrice * (1 + pct / 100) * factor) / factor;

  return type === 'SHORT'
    ? { stopLossCAD: at(stopPercent), takeProfitCAD: at(-targetPercent) }
    : { stopLossCAD: at(-stopPercent), takeProfitCAD: at(targetPercent) };
}

/** Capital immobilisé dans les positions encore ouvertes. */
export function committedCapital(positions: TradePosition[]): number {
  return round2(positions.reduce((acc, p) => acc + p.amountCAD, 0));
}

/** Somme du P&L latent de toutes les positions ouvertes. */
export function openPnL(positions: TradePosition[]): number {
  return round2(positions.reduce((acc, p) => acc + p.pnlCAD, 0));
}

export function realizedPnL(trades: HistoricalTrade[]): number {
  return round2(trades.reduce((acc, t) => acc + t.pnlCAD, 0));
}

/**
 * Valeur liquidative : ce que vaudrait le portefeuille si tout était soldé
 * au prix courant. Le P&L réalisé est déjà inclus dans `totalCapitalCAD`,
 * seul le latent s'y ajoute.
 */
export function equity(settings: PortfolioSettings, positions: TradePosition[]): number {
  return round2(settings.totalCapitalCAD + openPnL(positions));
}

/** Débit du budget actif à l'ouverture d'une position. */
export function applyOpen(settings: PortfolioSettings, amountCAD: number): PortfolioSettings {
  return {
    ...settings,
    activeBudgetCAD: round2(Math.max(0, settings.activeBudgetCAD - amountCAD)),
  };
}

/** Recrédit du principal + P&L réalisé à la clôture d'une position. */
export function applyClose(settings: PortfolioSettings, amountCAD: number, pnlCAD: number): PortfolioSettings {
  return {
    ...settings,
    activeBudgetCAD: round2(settings.activeBudgetCAD + amountCAD + pnlCAD),
    totalCapitalCAD: round2(settings.totalCapitalCAD + pnlCAD),
  };
}

/** Construit l'enregistrement d'historique correspondant à une clôture. */
export function buildClosedTrade(
  position: TradePosition,
  exitPrice: number,
  closeReason: HistoricalTrade['closeReason']
): HistoricalTrade {
  const { pnlCAD, pnlPercent } = positionPnL(position, exitPrice);
  const now = new Date();

  return {
    id: `trade-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    symbol: position.symbol,
    type: position.type,
    amountCAD: position.amountCAD,
    entryPriceCAD: position.entryPriceCAD,
    exitPriceCAD: exitPrice,
    pnlCAD,
    pnlPercent,
    openTime: position.openTime,
    closeTime: now.toLocaleTimeString('fr-CA'),
    closedAt: now.getTime(),
    closeReason,
    source: position.source,
  };
}

/** Taille de position respectant le risque maximum autorisé par trade. */
export function maxPositionSize(settings: PortfolioSettings, entryPrice: number, stopPrice: number): number {
  const riskBudget = (settings.activeBudgetCAD * settings.maxRiskPercentPerTrade) / 100;
  const stopDistance = Math.abs(entryPrice - stopPrice);
  if (stopDistance <= 0) return 0;

  const sizeAtRiskLimit = (riskBudget / stopDistance) * entryPrice;
  return round2(Math.min(sizeAtRiskLimit, settings.activeBudgetCAD));
}
