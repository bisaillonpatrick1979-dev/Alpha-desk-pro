import React from 'react';
import { Wallet, Landmark, TrendingUp, ShieldCheck, ArrowUpRight, Award, PlusCircle, AlertCircle } from 'lucide-react';
import { PortfolioSettings, TradePosition, HistoricalTrade } from '../types';
import { PortfolioHistoryChart } from './PortfolioHistoryChart';

interface PortfolioStatsProps {
  settings: PortfolioSettings;
  openPositions: TradePosition[];
  closedTrades: HistoricalTrade[];
  onScaleUpCapital: () => void;
}

export const PortfolioStats: React.FC<PortfolioStatsProps> = ({
  settings,
  openPositions,
  closedTrades,
  onScaleUpCapital,
}) => {
  const openPnLCAD = openPositions.reduce((acc, pos) => acc + pos.pnlCAD, 0);
  const realizedPnLCAD = closedTrades.reduce((acc, trade) => acc + trade.pnlCAD, 0);
  
  const totalGainsCAD = openPnLCAD + realizedPnLCAD;
  const currentTotalCapital = settings.totalCapitalCAD + totalGainsCAD;
  const progressPercent = Math.min(100, (currentTotalCapital / settings.targetGoalCAD) * 100);

  // Scaling Condition Check: Has Active Budget profited +15% or more?
  const initialActiveBudget = 1000; // default baseline or current settings baseline
  const activeBudgetProfitPercent = ((settings.activeBudgetCAD - initialActiveBudget) / initialActiveBudget) * 100;
  const isScalingEligible = activeBudgetProfitPercent >= settings.scalingProfitThresholdPercent && settings.bankReserveCAD >= settings.scalingTrancheAmountCAD;

  return (
    <div className="space-y-5">
      {/* Scaling Trigger Banner if Active Budget performed well */}
      {isScalingEligible && (
        <div className="bg-gradient-to-r from-emerald-950/80 via-[#0a0a0a] to-emerald-950/80 border-2 border-emerald-500/50 rounded-2xl p-4 shadow-lg shadow-emerald-950/40 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-emerald-300 text-sm">Condition de Scaling Atteinte ! (+{activeBudgetProfitPercent.toFixed(1)}%)</h3>
                <span className="text-[10px] uppercase bg-emerald-500 text-slate-950 font-extrabold px-2 py-0.5 rounded-full">
                  Signal Agent Exécuteur
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Le Budget Actif génère des profits constants. Vous pouvez débloquer une tranche de{' '}
                <strong className="text-emerald-300">{settings.scalingTrancheAmountCAD.toLocaleString('fr-CA')} $ CAD</strong> de la Banque Réserve vers le Budget Actif.
              </p>
            </div>
          </div>
          <button
            onClick={onScaleUpCapital}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all whitespace-nowrap flex items-center space-x-1.5"
          >
            <span>Débloquer +{settings.scalingTrancheAmountCAD.toLocaleString('fr-CA')} $ CAD</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Budget Actif Card */}
        <div className="bg-[#0a0a0a] border border-[#00d2ff]/30 rounded-2xl p-4 relative overflow-hidden shadow-md hover:border-[#00d2ff]/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Budget Actif en Cours</span>
            <div className="p-2 bg-[#00d2ff]/10 text-[#00d2ff] rounded-xl border border-[#00d2ff]/20">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-mono font-bold text-[#00d2ff]">
              {settings.activeBudgetCAD.toLocaleString('fr-CA')} $ CAD
            </span>
            <div className="mt-1.5 flex items-center justify-between text-xs text-white/50">
              <span>Capital alloué aux trades</span>
              <span className="text-[#00d2ff] font-semibold">{settings.maxRiskPercentPerTrade}% risque/trade</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00d2ff]/5 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Réserve en Banque Card */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 relative overflow-hidden shadow-md hover:border-white/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Réserve Banque (Protégée)</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-mono font-bold text-white">
              {settings.bankReserveCAD.toLocaleString('fr-CA')} $ CAD
            </span>
            <div className="mt-1.5 flex items-center justify-between text-xs text-white/50">
              <span>Fonds hors risque</span>
              <span className="text-white/60 font-semibold font-mono">
                {((settings.bankReserveCAD / settings.totalCapitalCAD) * 100).toFixed(0)}% du total
              </span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Capital Total Actuel Card */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 relative overflow-hidden shadow-md hover:border-white/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Capital Total Valorisée</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-mono font-bold text-emerald-400">
              {currentTotalCapital.toLocaleString('fr-CA')} $ CAD
            </span>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-white/50">P&L Latent + Réalisé:</span>
              <span className={`font-mono font-bold ${totalGainsCAD >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalGainsCAD >= 0 ? '+' : ''}{totalGainsCAD.toLocaleString('fr-CA')} $ CAD
              </span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Objectif 20 000 $ CAD Card */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 relative overflow-hidden shadow-md hover:border-white/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Objectif Portefeuille</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-mono font-bold text-amber-400">
                {settings.targetGoalCAD.toLocaleString('fr-CA')} $ CAD
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">{progressPercent.toFixed(1)}%</span>
            </div>
            <div className="mt-2.5 bg-[#050505] h-2 rounded-full overflow-hidden border border-white/10">
              <div
                className="bg-gradient-to-r from-[#00d2ff] via-emerald-400 to-amber-400 h-full transition-all duration-300 shadow-[0_0_10px_#22c55e]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        </div>

      </div>

      {/* 30-Day Historical Performance Chart using Recharts */}
      <PortfolioHistoryChart
        settings={settings}
        closedTrades={closedTrades}
        openPositions={openPositions}
        currentTotalCapital={currentTotalCapital}
        totalGainsCAD={totalGainsCAD}
      />
    </div>
  );
};

