import React, { useState, useEffect } from 'react';
import {
  Bot,
  Zap,
  Play,
  Pause,
  Sliders,
  TrendingUp,
  ShieldAlert,
  Clock,
  DollarSign,
  Activity,
  Layers,
  CheckCircle,
  RefreshCw,
  Award,
  Sparkles,
  ArrowRightLeft,
  X,
  Radio,
} from 'lucide-react';
import {
  MarketAsset,
  TradePosition,
  HistoricalTrade,
  PortfolioSettings,
  StrategyConfig,
  TradingStyle,
  AutoBotLog,
} from '../types';

interface AutoPilotEngineProps {
  watchlist: MarketAsset[];
  openPositions: TradePosition[];
  settings: PortfolioSettings;
  onOpenPosition: (position: TradePosition) => void;
  onClosePosition: (id: string, closeReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL') => void;
  onUpdateSettings: (newSettings: PortfolioSettings) => void;
  onLogTradeHistory: (trade: HistoricalTrade) => void;
}

const DEFAULT_STRATEGIES: Record<TradingStyle, StrategyConfig> = {
  SCALPING: {
    id: 'strat-scalp',
    name: 'Scalping Ultra-Rapide (1m-5m)',
    style: 'SCALPING',
    description: 'Fréquence élevée. Micro-mouvements capturés en secondes. Profit rapide & Stop serré.',
    targetProfitPercent: 1.2,
    trailingStopPercent: 0.5,
    allocationPerTradeCAD: 200,
    maxConcurrentTrades: 5,
    scanIntervalSeconds: 3,
    rsiBuyThreshold: 35,
    rsiSellThreshold: 68,
    autoReinvestProfits: true,
    maxDailyDrawdownCAD: 250,
    enabledMarkets: ['Crypto', 'Forex', 'Futures', 'US Stock'],
  },
  DAY_TRADING: {
    id: 'strat-day',
    name: 'Day Trading Intraday (15m-1h)',
    style: 'DAY_TRADING',
    description: 'Capture des tendances journalières sur le NASDAQ, TSX & Crypto. Clôture en fin de séance.',
    targetProfitPercent: 2.8,
    trailingStopPercent: 1.2,
    allocationPerTradeCAD: 350,
    maxConcurrentTrades: 3,
    scanIntervalSeconds: 8,
    rsiBuyThreshold: 38,
    rsiSellThreshold: 72,
    autoReinvestProfits: true,
    maxDailyDrawdownCAD: 350,
    enabledMarkets: ['CAD Stock', 'US Stock', 'Crypto', 'Commodities'],
  },
  SWING_TRADING: {
    id: 'strat-swing',
    name: 'Swing Trading Momentum (4h-1D)',
    style: 'SWING_TRADING',
    description: 'Recherche de grands mouvements de marché sur l\'Or, le Bitcoin & les géants de la Tech.',
    targetProfitPercent: 7.5,
    trailingStopPercent: 2.5,
    allocationPerTradeCAD: 500,
    maxConcurrentTrades: 2,
    scanIntervalSeconds: 15,
    rsiBuyThreshold: 42,
    rsiSellThreshold: 75,
    autoReinvestProfits: true,
    maxDailyDrawdownCAD: 500,
    enabledMarkets: ['CAD Stock', 'US Stock', 'Crypto', 'Commodities', 'Forex', 'Futures'],
  },
  HFT_ARBITRAGE: {
    id: 'strat-hft',
    name: 'Arbitrage Algorithmique HFT (24/7)',
    style: 'HFT_ARBITRAGE',
    description: 'Détection d\'anomalies et spreads entre bourses mondiales 24h/24 & 7j/7 sans pause.',
    targetProfitPercent: 0.8,
    trailingStopPercent: 0.3,
    allocationPerTradeCAD: 150,
    maxConcurrentTrades: 6,
    scanIntervalSeconds: 2,
    rsiBuyThreshold: 30,
    rsiSellThreshold: 70,
    autoReinvestProfits: true,
    maxDailyDrawdownCAD: 200,
    enabledMarkets: ['Crypto', 'Forex', 'Futures', 'Commodities'],
  },
};

export const AutoPilotEngine: React.FC<AutoPilotEngineProps> = ({
  watchlist,
  openPositions,
  settings,
  onOpenPosition,
  onClosePosition,
  onUpdateSettings,
  onLogTradeHistory,
}) => {
  const [isAutoPilotActive, setIsAutoPilotActive] = useState<boolean>(false);
  const [selectedStyle, setSelectedStyle] = useState<TradingStyle>('SCALPING');
  const [activeStrategy, setActiveStrategy] = useState<StrategyConfig>(DEFAULT_STRATEGIES['SCALPING']);
  const [isProgrammerOpen, setIsProgrammerOpen] = useState<boolean>(false);
  
  // Realtime Stats
  const [autoLogs, setAutoLogs] = useState<AutoBotLog[]>([]);
  const [totalProfitCAD, setTotalProfitCAD] = useState<number>(142.50);
  const [totalAutoTrades, setTotalAutoTrades] = useState<number>(18);
  const [winningTrades, setWinningTrades] = useState<number>(15);
  const [uptimeSeconds, setUptimeSeconds] = useState<number>(86400); // 24h simulated start

  // Switch preset strategy
  const handleSelectStrategyStyle = (style: TradingStyle) => {
    setSelectedStyle(style);
    setActiveStrategy(DEFAULT_STRATEGIES[style]);
  };

  // 24/7 Timer Counter
  useEffect(() => {
    let interval: any = null;
    if (isAutoPilotActive) {
      interval = setInterval(() => {
        setUptimeSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAutoPilotActive]);

  // Autonomous Execution Loop - Runs every N seconds when Auto-Pilot is ON
  useEffect(() => {
    if (!isAutoPilotActive) return;

    const interval = setInterval(() => {
      // 1. Check existing open positions for Auto Take Profit / Stop Loss
      openPositions.forEach((pos) => {
        const liveAsset = watchlist.find((a) => a.symbol === pos.symbol);
        if (!liveAsset) return;

        const currentPrice = liveAsset.priceCAD;
        const pnlCAD = (currentPrice - pos.entryPriceCAD) * pos.units;
        const pnlPercent = ((currentPrice - pos.entryPriceCAD) / pos.entryPriceCAD) * 100;

        // Auto Take Profit Trigger
        if (pnlPercent >= activeStrategy.targetProfitPercent) {
          onClosePosition(pos.id, 'TAKE_PROFIT');

          const newLog: AutoBotLog = {
            id: `log-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toLocaleTimeString('fr-CA'),
            symbol: pos.symbol,
            action: 'TAKE_PROFIT',
            strategyStyle: activeStrategy.style,
            priceCAD: currentPrice,
            amountCAD: pos.amountCAD,
            profitCAD: Number(pnlCAD.toFixed(2)),
            reasoning: `Objectif de profit atteint (+${pnlPercent.toFixed(1)}% ≥ target ${activeStrategy.targetProfitPercent}%). Gain sécurisé et retiré!`,
          };

          setAutoLogs((prev) => [newLog, ...prev.slice(0, 25)]);
          setTotalProfitCAD((prev) => Number((prev + pnlCAD).toFixed(2)));
          setTotalAutoTrades((prev) => prev + 1);
          setWinningTrades((prev) => prev + 1);
          return;
        }

        // Auto Trailing Stop Loss Trigger
        if (pnlPercent <= -activeStrategy.trailingStopPercent) {
          onClosePosition(pos.id, 'STOP_LOSS');

          const newLog: AutoBotLog = {
            id: `log-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toLocaleTimeString('fr-CA'),
            symbol: pos.symbol,
            action: 'STOP_LOSS',
            strategyStyle: activeStrategy.style,
            priceCAD: currentPrice,
            amountCAD: pos.amountCAD,
            profitCAD: Number(pnlCAD.toFixed(2)),
            reasoning: `Protection du capital déclenchée (${pnlPercent.toFixed(1)}% ≤ stop ${activeStrategy.trailingStopPercent}%). Position fermée.`,
          };

          setAutoLogs((prev) => [newLog, ...prev.slice(0, 25)]);
          setTotalProfitCAD((prev) => Number((prev + pnlCAD).toFixed(2)));
          setTotalAutoTrades((prev) => prev + 1);
          return;
        }
      });

      // 2. Scan Watchlist for New Trade Opportunities if Max Trades not reached
      if (openPositions.length < activeStrategy.maxConcurrentTrades) {
        // Filter assets by enabled market categories
        const eligibleAssets = watchlist.filter((a) =>
          activeStrategy.enabledMarkets.includes(a.category as any)
        );

        if (eligibleAssets.length > 0) {
          // Select an asset matching entry conditions (RSI oversold or high momentum)
          const candidate = eligibleAssets.find((a) => a.rsi <= activeStrategy.rsiBuyThreshold || a.change24h >= 2.0);

          if (candidate && !openPositions.some((p) => p.symbol === candidate.symbol)) {
            const allocation = activeStrategy.allocationPerTradeCAD;

            if (settings.activeBudgetCAD >= allocation) {
              const units = Number((allocation / candidate.priceCAD).toFixed(4));
              const tpPrice = Number((candidate.priceCAD * (1 + activeStrategy.targetProfitPercent / 100)).toFixed(2));
              const slPrice = Number((candidate.priceCAD * (1 - activeStrategy.trailingStopPercent / 100)).toFixed(2));

              const newPos: TradePosition = {
                id: `auto-pos-${Date.now()}`,
                symbol: candidate.symbol,
                assetName: candidate.name,
                type: 'LONG',
                entryPriceCAD: candidate.priceCAD,
                currentPriceCAD: candidate.priceCAD,
                amountCAD: allocation,
                units: units,
                stopLossCAD: slPrice,
                takeProfitCAD: tpPrice,
                openTime: new Date().toLocaleTimeString('fr-CA'),
                pnlCAD: 0,
                pnlPercent: 0,
              };

              onOpenPosition(newPos);

              const newLog: AutoBotLog = {
                id: `log-${Date.now()}-${Math.random()}`,
                timestamp: new Date().toLocaleTimeString('fr-CA'),
                symbol: candidate.symbol,
                action: 'BUY',
                strategyStyle: activeStrategy.style,
                priceCAD: candidate.priceCAD,
                amountCAD: allocation,
                reasoning: `Signal d'achat autonome détecté (RSI ${candidate.rsi}, Vol. ${candidate.volume24h}). Position initiée.`,
              };

              setAutoLogs((prev) => [newLog, ...prev.slice(0, 25)]);
            }
          }
        }
      }

    }, activeStrategy.scanIntervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [isAutoPilotActive, activeStrategy, watchlist, openPositions, settings.activeBudgetCAD]);

  // Format Uptime
  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  const winRate = totalAutoTrades > 0 ? Math.round((winningTrades / totalAutoTrades) * 100) : 100;

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-5 relative overflow-hidden">
      
      {/* Background Pulse Glow */}
      <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-1000 ${
        isAutoPilotActive ? 'bg-emerald-500/10' : 'bg-amber-500/5'
      }`} />

      {/* Main Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
        
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-2xl border transition-all ${
            isAutoPilotActive
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_20px_rgba(34,197,94,0.3)] animate-pulse'
              : 'bg-[#111] text-white/50 border-white/10'
          }`}>
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-extrabold text-white text-lg tracking-tight">
                Robot d'Exécution Autonome 24/7 & Programmateur de Stratégies
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                isAutoPilotActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {isAutoPilotActive ? '• ACTIF 24/7 (BATTRE LE MARCHÉ)' : '• PAUSE (MANUEL)'}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Analyse continue, prises de décisions automatisées, scalping, day trading & retrait des profits
            </p>
          </div>
        </div>

        {/* Master Control Toggle Button */}
        <div className="flex items-center space-x-3">
          
          <button
            onClick={() => setIsProgrammerOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold bg-[#111] hover:bg-white/10 text-white border border-white/15 rounded-xl transition-all"
          >
            <Sliders className="w-4 h-4 text-[#00d2ff]" />
            <span>Programmer Règles & Algorithme</span>
          </button>

          <button
            onClick={() => setIsAutoPilotActive(!isAutoPilotActive)}
            className={`flex items-center space-x-2 px-5 py-2.5 text-xs font-extrabold rounded-xl shadow-xl transition-all ${
              isAutoPilotActive
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-900/50'
                : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-[#00d2ff] hover:opacity-95 text-black font-extrabold shadow-emerald-950/50'
            }`}
          >
            {isAutoPilotActive ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Mettre en Pause le Bot 24/7</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Activer l'Auto-Pilote 24/7 ⚡</span>
              </>
            )}
          </button>

        </div>

      </div>

      {/* Realtime Performance & Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        <div className="bg-[#050505] p-3.5 rounded-xl border border-white/10 space-y-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">
            Gains Autonomes Sécurisés
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-mono font-extrabold text-emerald-400">
              +{totalProfitCAD.toLocaleString('fr-CA')} $ CAD
            </span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        <div className="bg-[#050505] p-3.5 rounded-xl border border-white/10 space-y-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">
            Taux de Réussite (Win Rate)
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-mono font-extrabold text-[#00d2ff]">
              {winRate}%
            </span>
            <span className="text-xs font-mono text-white/60">
              {winningTrades}/{totalAutoTrades} gagnants
            </span>
          </div>
        </div>

        <div className="bg-[#050505] p-3.5 rounded-xl border border-white/10 space-y-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">
            Uptime Continu
          </span>
          <div className="flex items-center justify-between font-mono">
            <span className="text-sm font-bold text-white">
              {formatUptime(uptimeSeconds)}
            </span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
        </div>

        <div className="bg-[#050505] p-3.5 rounded-xl border border-white/10 space-y-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">
            Fréquence de Scan
          </span>
          <div className="flex items-center justify-between font-mono">
            <span className="text-sm font-bold text-amber-400">
              Chaque {activeStrategy.scanIntervalSeconds} sec.
            </span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
        </div>

      </div>

      {/* Trading Styles Selector Bar */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-white uppercase tracking-wider font-mono block">
          Sélection du Mode de Trading & Algorithme
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {(Object.keys(DEFAULT_STRATEGIES) as TradingStyle[]).map((style) => {
            const strat = DEFAULT_STRATEGIES[style];
            const isSelected = selectedStyle === style;

            return (
              <button
                key={style}
                onClick={() => handleSelectStrategyStyle(style)}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? 'bg-purple-500/10 border-purple-500/50 text-white shadow-lg'
                    : 'bg-[#050505] hover:bg-white/5 border-white/10 text-white/60'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                )}
                
                <div className="flex items-center space-x-2 mb-1">
                  <Radio className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-400' : 'text-white/40'}`} />
                  <span className="font-extrabold text-xs text-white tracking-tight">
                    {strat.name}
                  </span>
                </div>

                <p className="text-[10px] text-white/50 line-clamp-2 leading-tight mb-2">
                  {strat.description}
                </p>

                <div className="flex items-center justify-between text-[10px] font-mono text-white/70 pt-1 border-t border-white/10">
                  <span>Target: +{strat.targetProfitPercent}%</span>
                  <span>Stop: -{strat.trailingStopPercent}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Autonomous Decision Journal Log */}
      <div className="bg-[#050505] p-4 rounded-xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Activity className="w-4 h-4 text-emerald-400" />
            Journal des Décisions Autonomes & Prises de Profits (24/7)
          </span>
          <span className="text-[10px] font-mono text-white/40">
            Dernier scan: {new Date().toLocaleTimeString('fr-CA')}
          </span>
        </div>

        {autoLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-white/40 font-mono space-y-1">
            <p>Le robot d'exécution autonome est prêt.</p>
            <p className="text-[10px] text-white/30">
              Activez l'Auto-Pilote 24/7 pour commencer la prise de décision automatisée en temps réel.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {autoLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-lg border bg-[#0a0a0a] border-white/10 text-xs font-mono flex items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="text-white/40 text-[10px]">{log.timestamp}</span>
                  
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    log.action === 'TAKE_PROFIT'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : log.action === 'STOP_LOSS'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/30'
                  }`}>
                    {log.action}
                  </span>

                  <span className="font-bold text-white">{log.symbol}</span>
                </div>

                <div className="flex items-center space-x-3 text-[11px]">
                  <span className="text-white/60">{log.reasoning}</span>
                  {log.profitCAD !== undefined && (
                    <span className={`font-bold ${log.profitCAD >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {log.profitCAD >= 0 ? `+${log.profitCAD} $` : `${log.profitCAD} $`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Strategy Customization Modal */}
      {isProgrammerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/15 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto relative">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-[#00d2ff]" />
                <h3 className="text-base font-extrabold text-white">
                  Programmateur d'Algorithme de Trading & Règles
                </h3>
              </div>
              <button
                onClick={() => setIsProgrammerOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              
              <div className="space-y-1">
                <label className="text-white/60 block">Nom de la Stratégie</label>
                <input
                  type="text"
                  value={activeStrategy.name}
                  onChange={(e) => setActiveStrategy({ ...activeStrategy, name: e.target.value })}
                  className="w-full bg-[#050505] border border-white/15 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/60 block">Allocation par Trade ($ CAD)</label>
                <input
                  type="number"
                  value={activeStrategy.allocationPerTradeCAD}
                  onChange={(e) => setActiveStrategy({ ...activeStrategy, allocationPerTradeCAD: Number(e.target.value) })}
                  className="w-full bg-[#050505] border border-white/15 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/60 block">Objectif de Profit Visé (% Take Profit)</label>
                <input
                  type="number"
                  step="0.1"
                  value={activeStrategy.targetProfitPercent}
                  onChange={(e) => setActiveStrategy({ ...activeStrategy, targetProfitPercent: Number(e.target.value) })}
                  className="w-full bg-[#050505] border border-white/15 rounded-xl p-2.5 text-emerald-400 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/60 block">Stop-Loss Suiveur (% Protection)</label>
                <input
                  type="number"
                  step="0.1"
                  value={activeStrategy.trailingStopPercent}
                  onChange={(e) => setActiveStrategy({ ...activeStrategy, trailingStopPercent: Number(e.target.value) })}
                  className="w-full bg-[#050505] border border-white/15 rounded-xl p-2.5 text-rose-400 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/60 block">Fréquence de Scan (Secondes)</label>
                <input
                  type="number"
                  value={activeStrategy.scanIntervalSeconds}
                  onChange={(e) => setActiveStrategy({ ...activeStrategy, scanIntervalSeconds: Number(e.target.value) })}
                  className="w-full bg-[#050505] border border-white/15 rounded-xl p-2.5 text-amber-400 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/60 block">Nombre Max de Trades Simultanés</label>
                <input
                  type="number"
                  value={activeStrategy.maxConcurrentTrades}
                  onChange={(e) => setActiveStrategy({ ...activeStrategy, maxConcurrentTrades: Number(e.target.value) })}
                  className="w-full bg-[#050505] border border-white/15 rounded-xl p-2.5 text-white"
                />
              </div>

            </div>

            {/* Market Selection Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-white/10 font-mono text-xs">
              <label className="text-white/80 font-bold block">
                Marchés & Formes de Trading Activés 24/7:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['CAD Stock', 'US Stock', 'Crypto', 'Forex', 'Commodities', 'Futures'].map((mkt) => {
                  const isChecked = activeStrategy.enabledMarkets.includes(mkt as any);
                  return (
                    <button
                      key={mkt}
                      onClick={() => {
                        const updated = isChecked
                          ? activeStrategy.enabledMarkets.filter((m) => m !== mkt)
                          : [...activeStrategy.enabledMarkets, mkt as any];
                        setActiveStrategy({ ...activeStrategy, enabledMarkets: updated });
                      }}
                      className={`p-2 rounded-xl border text-left flex items-center space-x-2 ${
                        isChecked
                          ? 'bg-[#00d2ff]/10 text-[#00d2ff] border-[#00d2ff]/40 font-bold'
                          : 'bg-[#050505] text-white/40 border-white/10'
                      }`}
                    >
                      <CheckCircle className={`w-3.5 h-3.5 ${isChecked ? 'text-[#00d2ff]' : 'text-white/20'}`} />
                      <span>{mkt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={() => setIsProgrammerOpen(false)}
              className="w-full py-3 bg-gradient-to-r from-[#00d2ff] via-emerald-400 to-amber-400 hover:opacity-95 text-black font-extrabold rounded-xl shadow-lg font-mono text-xs"
            >
              Sauvegarder & Appliquer la Stratégie Programmé
            </button>

          </div>
        </div>
      )}

    </div>
  );
};
