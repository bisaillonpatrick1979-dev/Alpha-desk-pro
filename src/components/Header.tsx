import React, { useState, useEffect } from 'react';
import { Bot, Settings, RefreshCw, Zap, Key, Clock, ShieldCheck, Activity, Globe } from 'lucide-react';
import { PortfolioSettings } from '../types';

interface HeaderProps {
  settings: PortfolioSettings;
  onOpenSettings: () => void;
  onOpenApiKeys: () => void;
  onOpenMultiTradeModal: () => void;
  onOpenMarketSchedule?: () => void;
  onResetPortfolio: () => void;
  onToggleSimulatedPriceTick: () => void;
  isSimulating: boolean;
  hasGeminiKey: boolean;
  activePositionsCount?: number;
  dataMode?: string;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenSettings,
  onOpenApiKeys,
  onOpenMultiTradeModal,
  onOpenMarketSchedule,
  onResetPortfolio,
  onToggleSimulatedPriceTick,
  isSimulating,
  hasGeminiKey,
  activePositionsCount = 0,
  dataMode = 'LIVE_SIMULATED',
}) => {
  const [albertaTime, setAlbertaTime] = useState<string>('');
  const [sessionName, setSessionName] = useState<'PRÉ-MARCHÉ' | 'SESSION RÉGULIÈRE' | 'APRÈS-BOURSE' | 'MARCHÉ FERMÉ'>('SESSION RÉGULIÈRE');

  useEffect(() => {
    const updateMT = () => {
      const date = new Date();
      // Alberta Mountain Time (America/Edmonton)
      const mtString = date.toLocaleTimeString('fr-CA', {
        timeZone: 'America/Edmonton',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setAlbertaTime(`${mtString} MT`);

      // Determine Stock Market Session in Mountain Time
      const mtParts = date.toLocaleTimeString('en-US', {
        timeZone: 'America/Edmonton',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).split(':');
      const hours = parseInt(mtParts[0], 10);
      const minutes = parseInt(mtParts[1], 10);
      const timeInMinutes = hours * 60 + minutes;

      // Sessions MT:
      // Pré-marché : 02:00 (120m) à 07:30 (450m)
      // Régulière  : 07:30 (450m) à 14:00 (840m)
      // Après-bourse : 14:00 (840m) à 18:00 (1080m)
      if (timeInMinutes >= 120 && timeInMinutes < 450) {
        setSessionName('PRÉ-MARCHÉ');
      } else if (timeInMinutes >= 450 && timeInMinutes < 840) {
        setSessionName('SESSION RÉGULIÈRE');
      } else if (timeInMinutes >= 840 && timeInMinutes < 1080) {
        setSessionName('APRÈS-BOURSE');
      } else {
        setSessionName('MARCHÉ FERMÉ');
      }
    };

    updateMT();
    const interval = setInterval(updateMT, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentTotal = settings.totalCapitalCAD;
  const goal = settings.targetGoalCAD;
  const progressPercent = Math.min(100, Math.max(0, (currentTotal / goal) * 100));

  return (
    <header className="bg-[#0a0a0a] border-b border-white/10 text-white sticky top-0 z-40 shadow-2xl backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-[#00d2ff] via-emerald-400 to-amber-400 rounded-xl shadow-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-[#00d2ff] to-emerald-400 bg-clip-text text-transparent">
                  ALPHA-DESK PRO
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]/30 rounded-full">
                  $ CAD
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-full">
                  5 SLOTS (#1-#5)
                </span>
              </div>
              <p className="text-xs text-white/50">
                Plateforme Quantitativiste Multi-Moteurs • Alberta, Canada (Mountain Time)
              </p>
            </div>
          </div>

          {/* Clock & Market Session Badge (Clickable to view real market hours & holidays) */}
          <div
            onClick={onOpenMarketSchedule}
            className="flex items-center space-x-3 bg-[#050505] hover:bg-[#111] p-2 rounded-xl border border-white/10 font-mono text-xs cursor-pointer transition-all hover:border-[#00d2ff]/40"
            title="Cliquer pour afficher les horaires réels, jours fériés et fermetures prévues"
          >
            <div className="flex items-center space-x-1.5 px-2.5 py-1 text-emerald-300 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="font-bold">{albertaTime || '12:00:00 MT'}</span>
            </div>

            <div className="px-2.5 py-1 text-white/80 bg-white/5 rounded-lg border border-white/10 text-[11px] font-bold flex items-center space-x-1.5">
              <span>Sessions Mondiales : </span>
              <strong className={
                sessionName === 'SESSION RÉGULIÈRE' ? 'text-emerald-400' :
                sessionName === 'PRÉ-MARCHÉ' ? 'text-amber-400' :
                sessionName === 'APRÈS-BOURSE' ? 'text-[#00d2ff]' : 'text-rose-400'
              }>
                {sessionName}
              </strong>
            </div>

            <div className="px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 text-[11px] font-bold text-amber-300">
              Slots Occasions: {activePositionsCount} / 5
            </div>
          </div>

          {/* Quick Stats Summary Bar */}
          <div className="flex items-center space-x-3 bg-[#050505] p-2 rounded-xl border border-white/10 font-mono">
            <div className="px-3 py-1 border-r border-white/10">
              <span className="text-[9px] uppercase tracking-wider text-white/40 block">Capital Total</span>
              <span className="text-sm font-bold text-white">{settings.totalCapitalCAD.toLocaleString('fr-CA')} $</span>
            </div>

            <div className="px-3 py-1 border-r border-white/10">
              <span className="text-[9px] uppercase tracking-wider text-[#00d2ff] font-medium block">Budget Actif</span>
              <span className="text-sm font-bold text-[#00d2ff]">{settings.activeBudgetCAD.toLocaleString('fr-CA')} $</span>
            </div>

            <div className="px-3 py-1">
              <span className="text-[9px] uppercase tracking-wider text-white/40 block">Réserve Banque</span>
              <span className="text-sm font-bold text-white/80">{settings.bankReserveCAD.toLocaleString('fr-CA')} $</span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Market Hours & Schedule Button */}
            <button
              onClick={onOpenMarketSchedule}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold bg-[#111] hover:bg-white/10 text-[#00d2ff] border border-[#00d2ff]/30 rounded-xl transition-all"
              title="Consulter les heures réelles d'ouverture, jours fériés et autorisations"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Horaires & Marchés 🌎</span>
            </button>

            {/* Multi-Trade Trigger Button */}
            <button
              onClick={onOpenMultiTradeModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-extrabold bg-amber-500 hover:bg-amber-400 text-black rounded-xl shadow-md transition-all"
              title="Exécuter plusieurs ordres de trading simultanés"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Multi-Trades ⚡</span>
            </button>

            {/* API Keys & Broker Connections */}
            <button
              onClick={onOpenApiKeys}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111] hover:bg-white/10 text-white border border-white/15 rounded-xl transition-all"
              title="Configurer les clés API Twelve Data, TradingView, Interactive Brokers..."
            >
              <Key className="w-3.5 h-3.5 text-[#00d2ff]" />
              <span>Clés API / Data</span>
            </button>

            {/* Price Feed Toggle */}
            <button
              onClick={onToggleSimulatedPriceTick}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                isSimulating
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-[#111] text-white/50 border-white/10'
              }`}
            >
              <span>{isSimulating ? 'Flux Live ON' : 'Flux Pause'}</span>
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="p-2 bg-[#111] hover:bg-white/10 text-white border border-white/15 rounded-xl transition-all"
              title="Paramètres de gestion du risque"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Reset */}
            <button
              onClick={onResetPortfolio}
              className="p-2 bg-[#111] hover:bg-rose-500/20 text-white/40 hover:text-rose-400 border border-white/15 rounded-xl transition-all"
              title="Réinitialiser le portefeuille"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Global Progress Bar towards Goal ($20 000 CAD) */}
        <div className="mt-3 pt-2 border-t border-white/10 flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-white min-w-max">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Objectif Rentabilité: {goal.toLocaleString('fr-CA')} $ CAD</span>
          </div>
          <div className="flex-1 bg-[#050505] h-2 rounded-full overflow-hidden border border-white/10 relative">
            <div
              className="bg-gradient-to-r from-[#00d2ff] via-emerald-400 to-amber-400 h-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 min-w-max">
            {progressPercent.toFixed(1)}%
          </span>
        </div>

      </div>
    </header>
  );
};

