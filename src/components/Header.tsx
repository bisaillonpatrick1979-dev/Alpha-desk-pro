import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, Zap, Key, Clock, ShieldCheck, Activity, Globe, Bot, AlertTriangle } from 'lucide-react';
import { PortfolioSettings } from '../types';
import { mtClock, mtMinutesOfDay, mtDayOfWeek } from '../lib/time';

interface HeaderProps {
  settings: PortfolioSettings;
  currentEquity: number;
  onOpenSettings: () => void;
  onOpenApiKeys: () => void;
  onOpenMultiTradeModal: () => void;
  onOpenMarketSchedule?: () => void;
  onResetPortfolio: () => void;
  onToggleSimulatedPriceTick: () => void;
  isSimulating: boolean;
  engineStatus: { hasGeminiKey: boolean; engine: string } | null;
  activePositionsCount?: number;
  maxSlots: number;
  dataMode?: string;
}

type SessionName = 'PRÉ-MARCHÉ' | 'SESSION RÉGULIÈRE' | 'APRÈS-BOURSE' | 'MARCHÉ FERMÉ';

const DATA_MODE_LABEL: Record<string, string> = {
  LIVE_SIMULATED: 'Flux simulé',
  TWELVE_DATA_REALTIME: 'Twelve Data',
  TRADINGVIEW_WEBHOOK: 'TradingView',
  BACKTEST_HISTORICAL: 'Backtest',
};

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentEquity,
  onOpenSettings,
  onOpenApiKeys,
  onOpenMultiTradeModal,
  onOpenMarketSchedule,
  onResetPortfolio,
  onToggleSimulatedPriceTick,
  isSimulating,
  engineStatus,
  activePositionsCount = 0,
  maxSlots,
  dataMode = 'LIVE_SIMULATED',
}) => {
  const [albertaTime, setAlbertaTime] = useState('');
  const [sessionName, setSessionName] = useState<SessionName>('MARCHÉ FERMÉ');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setAlbertaTime(`${mtClock(now)} MT`);

      const minutes = mtMinutesOfDay(now);
      const weekday = mtDayOfWeek(now);

      // Les marchés d'actions nord-américains sont fermés le week-end : sans ce
      // contrôle l'en-tête annonçait « session régulière » un samedi midi.
      if (weekday === 0 || weekday === 6) {
        setSessionName('MARCHÉ FERMÉ');
        return;
      }

      if (minutes >= 120 && minutes < 450) setSessionName('PRÉ-MARCHÉ');
      else if (minutes >= 450 && minutes < 840) setSessionName('SESSION RÉGULIÈRE');
      else if (minutes >= 840 && minutes < 1080) setSessionName('APRÈS-BOURSE');
      else setSessionName('MARCHÉ FERMÉ');
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const progressPercent =
    settings.targetGoalCAD > 0 ? Math.min(100, Math.max(0, (currentEquity / settings.targetGoalCAD) * 100)) : 0;

  const slotsFull = activePositionsCount >= maxSlots;

  return (
    <header className="bg-[#0a0a0a] border-b border-white/10 text-white sticky top-0 z-40 shadow-2xl backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-[#00d2ff] via-emerald-400 to-amber-400 rounded-xl shadow-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-[#00d2ff] to-emerald-400 bg-clip-text text-transparent">
                  ALPHA-DESK PRO
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]/30 rounded-full">
                  $ CAD
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-white/10 text-white/60 border border-white/20 rounded-full">
                  {DATA_MODE_LABEL[dataMode] ?? dataMode}
                </span>
              </div>
              <p className="text-xs text-white/50">
                Plateforme multi-moteurs • Alberta, Canada (Mountain Time) • Simulation
              </p>
            </div>
          </div>

          <button
            onClick={onOpenMarketSchedule}
            className="flex items-center space-x-3 bg-[#050505] hover:bg-[#111] p-2 rounded-xl border border-white/10 font-mono text-xs cursor-pointer transition-all hover:border-[#00d2ff]/40"
            title="Afficher les horaires réels, jours fériés et autorisations de marché"
          >
            <div className="flex items-center space-x-1.5 px-2.5 py-1 text-emerald-300 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold">{albertaTime || '--:--:--'}</span>
            </div>

            <div className="px-2.5 py-1 text-white/80 bg-white/5 rounded-lg border border-white/10 text-[11px] font-bold">
              <strong
                className={
                  sessionName === 'SESSION RÉGULIÈRE'
                    ? 'text-emerald-400'
                    : sessionName === 'PRÉ-MARCHÉ'
                    ? 'text-amber-400'
                    : sessionName === 'APRÈS-BOURSE'
                    ? 'text-[#00d2ff]'
                    : 'text-rose-400'
                }
              >
                {sessionName}
              </strong>
            </div>

            <div
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                slotsFull
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-white/5 border-white/10 text-amber-300'
              }`}
            >
              Slots : {activePositionsCount} / {maxSlots}
            </div>
          </button>

          <div className="flex items-center space-x-3 bg-[#050505] p-2 rounded-xl border border-white/10 font-mono">
            <div className="px-3 py-1 border-r border-white/10">
              <span className="text-[9px] uppercase tracking-wider text-white/40 block">Valeur liquidative</span>
              <span className="text-sm font-bold text-white">
                {currentEquity.toLocaleString('fr-CA', { maximumFractionDigits: 2 })} $
              </span>
            </div>
            <div className="px-3 py-1 border-r border-white/10">
              <span className="text-[9px] uppercase tracking-wider text-[#00d2ff] font-medium block">Budget actif</span>
              <span className="text-sm font-bold text-[#00d2ff]">
                {settings.activeBudgetCAD.toLocaleString('fr-CA')} $
              </span>
            </div>
            <div className="px-3 py-1">
              <span className="text-[9px] uppercase tracking-wider text-white/40 block">Réserve</span>
              <span className="text-sm font-bold text-white/80">
                {settings.bankReserveCAD.toLocaleString('fr-CA')} $
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenMarketSchedule}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold bg-[#111] hover:bg-white/10 text-[#00d2ff] border border-[#00d2ff]/30 rounded-xl transition-all"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Horaires</span>
            </button>

            <button
              onClick={onOpenMultiTradeModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-extrabold bg-amber-500 hover:bg-amber-400 text-black rounded-xl shadow-md transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Multi-Trades</span>
            </button>

            <button
              onClick={onOpenApiKeys}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111] hover:bg-white/10 text-white border border-white/15 rounded-xl transition-all"
            >
              <Key className="w-3.5 h-3.5 text-[#00d2ff]" />
              <span>Clés API</span>
            </button>

            <button
              onClick={onToggleSimulatedPriceTick}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                isSimulating
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-[#111] text-white/50 border-white/10'
              }`}
            >
              <span>{isSimulating ? 'Flux actif' : 'Flux en pause'}</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2 bg-[#111] hover:bg-white/10 text-white border border-white/15 rounded-xl transition-all"
              title="Paramètres de gestion du risque"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={onResetPortfolio}
              className="p-2 bg-[#111] hover:bg-rose-500/20 text-white/40 hover:text-rose-400 border border-white/15 rounded-xl transition-all"
              title="Réinitialiser le portefeuille"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* État réel du moteur de délibération. La propriété était reçue mais jamais
            affichée : l'utilisateur n'avait aucun moyen de savoir que l'IA était
            indisponible et que les analyses venaient du moteur de règles. */}
        {engineStatus && !engineStatus.hasGeminiKey && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              {engineStatus.engine === 'offline'
                ? "Le serveur de délibération est injoignable : lancez le backend pour activer les analyses."
                : "Aucune clé GEMINI_API_KEY configurée : les délibérations sont produites par le moteur de règles déterministe, sans modèle de langage."}
            </span>
          </div>
        )}

        {engineStatus?.hasGeminiKey && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-300/80 font-mono">
            <Bot className="w-3.5 h-3.5" />
            <span>Moteur Gemini connecté — les délibérations sont produites par le modèle.</span>
          </div>
        )}

        <div className="mt-3 pt-2 border-t border-white/10 flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-white min-w-max">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Objectif : {settings.targetGoalCAD.toLocaleString('fr-CA')} $ CAD</span>
          </div>
          <div className="flex-1 bg-[#050505] h-2 rounded-full overflow-hidden border border-white/10">
            <div
              className="bg-gradient-to-r from-[#00d2ff] via-emerald-400 to-amber-400 h-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 min-w-max">{progressPercent.toFixed(1)} %</span>
        </div>
      </div>
    </header>
  );
};
