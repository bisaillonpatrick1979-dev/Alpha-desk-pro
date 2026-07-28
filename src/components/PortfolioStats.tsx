import React from 'react';
import { Wallet, Landmark, TrendingUp, ArrowUpRight, Award, PlusCircle, Lock } from 'lucide-react';
import { PortfolioSettings, TradePosition, HistoricalTrade, EquitySnapshot } from '../types';
import { PortfolioHistoryChart } from './PortfolioHistoryChart';
import { committedCapital, openPnL, realizedPnL } from '../lib/portfolio';

interface PortfolioStatsProps {
  settings: PortfolioSettings;
  openPositions: TradePosition[];
  closedTrades: HistoricalTrade[];
  equityHistory: EquitySnapshot[];
  currentEquity: number;
  onScaleUpCapital: () => void;
}

export const PortfolioStats: React.FC<PortfolioStatsProps> = ({
  settings,
  openPositions,
  closedTrades,
  equityHistory,
  currentEquity,
  onScaleUpCapital,
}) => {
  const latentPnL = openPnL(openPositions);
  const realized = realizedPnL(closedTrades);
  const committed = committedCapital(openPositions);

  /**
   * `totalCapitalCAD` intègre déjà le P&L réalisé (il est mis à jour à chaque
   * clôture). N'y ajouter que le latent — la version précédente rajoutait aussi
   * le réalisé, comptant donc chaque gain deux fois.
   */
  const progressPercent =
    settings.targetGoalCAD > 0 ? Math.min(100, Math.max(0, (currentEquity / settings.targetGoalCAD) * 100)) : 0;

  // Le capital de départ se déduit du capital courant moins les gains réalisés.
  const startingCapital = settings.totalCapitalCAD - realized;
  const growthPercent = startingCapital > 0 ? ((realized / startingCapital) * 100) : 0;

  const isScalingEligible =
    growthPercent >= settings.scalingProfitThresholdPercent &&
    settings.bankReserveCAD >= settings.scalingTrancheAmountCAD;

  const reservePercent =
    settings.totalCapitalCAD > 0 ? (settings.bankReserveCAD / settings.totalCapitalCAD) * 100 : 0;

  const fmt = (value: number) => value.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-5">
      {isScalingEligible && (
        <div className="bg-gradient-to-r from-emerald-950/80 via-[#0a0a0a] to-emerald-950/80 border-2 border-emerald-500/50 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-300 text-sm">
                Seuil de scaling atteint (+{growthPercent.toFixed(1)} % de gains réalisés)
              </h3>
              <p className="text-xs text-white/70 mt-0.5">
                Vous pouvez transférer une tranche de{' '}
                <strong className="text-emerald-300">
                  {settings.scalingTrancheAmountCAD.toLocaleString('fr-CA')} $ CAD
                </strong>{' '}
                de la réserve vers le budget actif.
              </p>
            </div>
          </div>
          <button
            onClick={onScaleUpCapital}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-bold text-xs rounded-xl shadow-md transition-all whitespace-nowrap flex items-center space-x-1.5"
          >
            <span>Débloquer {settings.scalingTrancheAmountCAD.toLocaleString('fr-CA')} $ CAD</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0a0a0a] border border-[#00d2ff]/30 rounded-2xl p-4 relative overflow-hidden shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
              Budget actif disponible
            </span>
            <div className="p-2 bg-[#00d2ff]/10 text-[#00d2ff] rounded-xl border border-[#00d2ff]/20">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-mono font-bold text-[#00d2ff]">{fmt(settings.activeBudgetCAD)} $ CAD</span>
            <div className="mt-1.5 flex items-center justify-between text-xs text-white/50">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                {fmt(committed)} $ engagés
              </span>
              <span className="text-[#00d2ff] font-semibold">{settings.maxRiskPercentPerTrade} % risque/trade</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00d2ff]/5 rounded-full blur-2xl pointer-events-none" />
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 relative overflow-hidden shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
              Réserve bancaire (protégée)
            </span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-mono font-bold text-white">{fmt(settings.bankReserveCAD)} $ CAD</span>
            <div className="mt-1.5 flex items-center justify-between text-xs text-white/50">
              <span>Fonds hors risque</span>
              <span className="text-white/60 font-semibold font-mono">{reservePercent.toFixed(0)} % du total</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 relative overflow-hidden shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Valeur liquidative</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-mono font-bold text-emerald-400">{fmt(currentEquity)} $ CAD</span>
            <div className="mt-1.5 space-y-0.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-white/50">P&L réalisé</span>
                <span className={`font-mono font-bold ${realized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {realized >= 0 ? '+' : ''}
                  {fmt(realized)} $
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">P&L latent</span>
                <span className={`font-mono font-bold ${latentPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {latentPnL >= 0 ? '+' : ''}
                  {fmt(latentPnL)} $
                </span>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 relative overflow-hidden shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
              Objectif du portefeuille
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-mono font-bold text-amber-400">
                {settings.targetGoalCAD.toLocaleString('fr-CA')} $ CAD
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">{progressPercent.toFixed(1)} %</span>
            </div>
            <div className="mt-2.5 bg-[#050505] h-2 rounded-full overflow-hidden border border-white/10">
              <div
                className="bg-gradient-to-r from-[#00d2ff] via-emerald-400 to-amber-400 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        </div>
      </div>

      <PortfolioHistoryChart
        settings={settings}
        closedTrades={closedTrades}
        openPositions={openPositions}
        equityHistory={equityHistory}
        currentEquity={currentEquity}
      />
    </div>
  );
};
