import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Bot, Zap, Play, Pause, Sliders, Clock, DollarSign, Activity, CheckCircle, X, Radio } from 'lucide-react';
import {
  MarketAsset,
  TradePosition,
  HistoricalTrade,
  PortfolioSettings,
  StrategyConfig,
  TradingStyle,
  AutoBotLog,
} from '../types';
import { stopAndTargetFor } from '../lib/portfolio';

interface AutoPilotEngineProps {
  watchlist: MarketAsset[];
  openPositions: TradePosition[];
  closedTrades: HistoricalTrade[];
  settings: PortfolioSettings;
  maxSlots: number;
  onOpenPosition: (position: TradePosition) => boolean;
  buildPosition: (
    asset: MarketAsset,
    amountCAD: number,
    stopLossCAD: number,
    takeProfitCAD: number,
    type: 'LONG' | 'SHORT',
    source: TradePosition['source']
  ) => TradePosition;
}

const MARKET_OPTIONS: MarketAsset['category'][] = [
  'CAD Stock',
  'US Stock',
  'Japan Stock',
  'Australia Stock',
  'Crypto',
  'Forex',
  'Commodities',
  'Futures',
];

const DEFAULT_STRATEGIES: Record<TradingStyle, StrategyConfig> = {
  SCALPING: {
    id: 'strat-scalp',
    name: 'Scalping ultra-rapide (1 m – 5 m)',
    style: 'SCALPING',
    description: 'Fréquence élevée, micro-mouvements capturés rapidement, stop serré.',
    targetProfitPercent: 1.2,
    trailingStopPercent: 0.5,
    allocationPerTradeCAD: 200,
    maxConcurrentTrades: 5,
    scanIntervalSeconds: 5,
    rsiBuyThreshold: 35,
    rsiSellThreshold: 68,
    autoReinvestProfits: true,
    maxDailyDrawdownCAD: 250,
    enabledMarkets: ['Crypto', 'Forex', 'Futures', 'US Stock'],
  },
  DAY_TRADING: {
    id: 'strat-day',
    name: 'Day trading intraday (15 m – 1 h)',
    style: 'DAY_TRADING',
    description: 'Capture des tendances journalières sur le NASDAQ, le TSX et la crypto.',
    targetProfitPercent: 2.8,
    trailingStopPercent: 1.2,
    allocationPerTradeCAD: 350,
    maxConcurrentTrades: 3,
    scanIntervalSeconds: 10,
    rsiBuyThreshold: 38,
    rsiSellThreshold: 72,
    autoReinvestProfits: true,
    maxDailyDrawdownCAD: 350,
    enabledMarkets: ['CAD Stock', 'US Stock', 'Crypto', 'Commodities'],
  },
  SWING_TRADING: {
    id: 'strat-swing',
    name: 'Swing trading momentum (4 h – 1 j)',
    style: 'SWING_TRADING',
    description: "Recherche de mouvements amples sur l'or, le bitcoin et les grandes valeurs technologiques.",
    targetProfitPercent: 7.5,
    trailingStopPercent: 2.5,
    allocationPerTradeCAD: 500,
    maxConcurrentTrades: 2,
    scanIntervalSeconds: 20,
    rsiBuyThreshold: 42,
    rsiSellThreshold: 75,
    autoReinvestProfits: true,
    maxDailyDrawdownCAD: 500,
    enabledMarkets: ['CAD Stock', 'US Stock', 'Crypto', 'Commodities', 'Forex', 'Futures'],
  },
  HFT_ARBITRAGE: {
    id: 'strat-hft',
    name: 'Arbitrage algorithmique (24/7)',
    style: 'HFT_ARBITRAGE',
    description: "Détection d'écarts sur les marchés ouverts en continu.",
    targetProfitPercent: 0.8,
    trailingStopPercent: 0.3,
    allocationPerTradeCAD: 150,
    maxConcurrentTrades: 5,
    scanIntervalSeconds: 5,
    rsiBuyThreshold: 30,
    rsiSellThreshold: 70,
    autoReinvestProfits: true,
    maxDailyDrawdownCAD: 200,
    enabledMarkets: ['Crypto', 'Forex', 'Futures', 'Commodities'],
  },
};

const formatUptime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs} h ${mins} m ${seconds % 60} s`;
};

export const AutoPilotEngine: React.FC<AutoPilotEngineProps> = ({
  watchlist,
  openPositions,
  closedTrades,
  settings,
  maxSlots,
  onOpenPosition,
  buildPosition,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<TradingStyle>('SCALPING');
  const [strategy, setStrategy] = useState<StrategyConfig>(DEFAULT_STRATEGIES.SCALPING);
  const [isProgrammerOpen, setIsProgrammerOpen] = useState(false);
  const [openLogs, setOpenLogs] = useState<AutoBotLog[]>([]);
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const [lastScanAt, setLastScanAt] = useState<string | null>(null);

  /**
   * Les données volatiles sont lues via des refs plutôt que capturées dans la
   * closure de l'intervalle.
   *
   * Auparavant `watchlist` et `openPositions` figuraient dans les dépendances de
   * l'effet : comme le flux de prix les remplace toutes les 4 s, l'intervalle
   * était détruit et recréé avant d'avoir pu se déclencher. Toute stratégie dont
   * le cycle de scan dépassait 4 s — day trading et swing — ne s'exécutait
   * littéralement jamais.
   */
  const watchlistRef = useRef(watchlist);
  const positionsRef = useRef(openPositions);
  const settingsRef = useRef(settings);
  const strategyRef = useRef(strategy);

  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);
  useEffect(() => {
    positionsRef.current = openPositions;
  }, [openPositions]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    strategyRef.current = strategy;
  }, [strategy]);

  /** Statistiques dérivées des trades réellement clôturés par le robot. */
  const stats = useMemo(() => {
    const botTrades = closedTrades.filter((t) => t.source === 'AUTOPILOT');
    const wins = botTrades.filter((t) => t.pnlCAD > 0).length;
    const netCAD = botTrades.reduce((acc, t) => acc + t.pnlCAD, 0);

    return {
      trades: botTrades.length,
      wins,
      netCAD: Math.round(netCAD * 100) / 100,
      winRate: botTrades.length > 0 ? Math.round((wins / botTrades.length) * 100) : null,
      recent: botTrades.slice(0, 15),
    };
  }, [closedTrades]);

  /** Perte réalisée par le robot sur les dernières 24 h, pour le coupe-circuit. */
  const drawdown24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const loss = closedTrades
      .filter((t) => t.source === 'AUTOPILOT' && t.closedAt >= cutoff && t.pnlCAD < 0)
      .reduce((acc, t) => acc + t.pnlCAD, 0);
    return Math.abs(Math.round(loss * 100) / 100);
  }, [closedTrades]);

  const drawdownBreached = drawdown24h >= strategy.maxDailyDrawdownCAD;

  // Le coupe-circuit arrête réellement le robot au lieu d'être un simple champ décoratif.
  useEffect(() => {
    if (isActive && drawdownBreached) setIsActive(false);
  }, [isActive, drawdownBreached]);

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => setUptimeSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isActive]);

  const handleSelectStyle = (style: TradingStyle) => {
    setSelectedStyle(style);
    setStrategy(DEFAULT_STRATEGIES[style]);
  };

  /**
   * Un cycle de scan. Le robot n'ouvre que des positions : la sortie (stop et
   * cible) est confiée au moteur de règlement central de l'application, via les
   * niveaux posés à l'ouverture. Faire fermer les positions par les deux côtés
   * provoquait des doubles comptages du P&L.
   */
  const runScan = useCallback(() => {
    const now = new Date();
    setLastScanAt(now.toLocaleTimeString('fr-CA'));

    const config = strategyRef.current;
    const positions = positionsRef.current;
    const budget = settingsRef.current.activeBudgetCAD;

    const slotLimit = Math.min(config.maxConcurrentTrades, maxSlots);
    if (positions.length >= slotLimit) return;
    if (config.allocationPerTradeCAD > budget) return;

    const heldSymbols = new Set(positions.map((p) => p.symbol));

    // Condition d'entrée : RSI en zone de survente, ou momentum haussier confirmé
    // par l'histogramme MACD. Les indicateurs sont désormais recalculés à chaque
    // tick, donc ces seuils réagissent réellement au marché.
    const candidate = watchlistRef.current.find((asset) => {
      if (heldSymbols.has(asset.symbol)) return false;
      if (!config.enabledMarkets.includes(asset.category)) return false;
      if (asset.rsi >= config.rsiSellThreshold) return false;
      return asset.rsi <= config.rsiBuyThreshold || (asset.macd.histogram > 0 && asset.change24h >= 0.5);
    });

    if (!candidate) return;

    const decimals = candidate.priceCAD < 10 ? 4 : 2;
    const { stopLossCAD, takeProfitCAD } = stopAndTargetFor(
      'LONG',
      candidate.priceCAD,
      config.trailingStopPercent,
      config.targetProfitPercent,
      decimals
    );

    const position = buildPosition(
      candidate,
      config.allocationPerTradeCAD,
      stopLossCAD,
      takeProfitCAD,
      'LONG',
      'AUTOPILOT'
    );

    if (!onOpenPosition(position)) return;

    setOpenLogs((prev) =>
      [
        {
          id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: now.toLocaleTimeString('fr-CA'),
          symbol: candidate.symbol,
          action: 'BUY' as const,
          strategyStyle: config.style,
          priceCAD: candidate.priceCAD,
          amountCAD: config.allocationPerTradeCAD,
          reasoning: `RSI ${candidate.rsi}, MACD hist. ${candidate.macd.histogram}. Cible ${takeProfitCAD} $ / stop ${stopLossCAD} $.`,
        },
        ...prev,
      ].slice(0, 25)
    );
  }, [buildPosition, onOpenPosition, maxSlots]);

  const runScanRef = useRef(runScan);
  useEffect(() => {
    runScanRef.current = runScan;
  }, [runScan]);

  // Seuls l'état d'activation et la cadence font varier l'intervalle.
  useEffect(() => {
    if (!isActive) return;
    const periodMs = Math.max(1, strategy.scanIntervalSeconds) * 1000;
    const timer = setInterval(() => runScanRef.current(), periodMs);
    return () => clearInterval(timer);
  }, [isActive, strategy.scanIntervalSeconds]);

  const eligibleCount = useMemo(
    () => watchlist.filter((a) => strategy.enabledMarkets.includes(a.category)).length,
    [watchlist, strategy.enabledMarkets]
  );

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-5 relative overflow-hidden">
      <div
        className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-1000 ${
          isActive ? 'bg-emerald-500/10' : 'bg-amber-500/5'
        }`}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center space-x-3">
          <div
            className={`p-3 rounded-2xl border transition-all ${
              isActive
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                : 'bg-[#111] text-white/50 border-white/10'
            }`}
          >
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h2 className="font-extrabold text-white text-lg tracking-tight">
                Robot d'exécution autonome & programmateur de stratégies
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {isActive ? '• Actif' : '• En pause'}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Le robot ouvre les positions ; les stops et cibles posés à l'ouverture sont exécutés par le moteur de
              règlement du portefeuille.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsProgrammerOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold bg-[#111] hover:bg-white/10 text-white border border-white/15 rounded-xl transition-all"
          >
            <Sliders className="w-4 h-4 text-[#00d2ff]" />
            <span>Programmer les règles</span>
          </button>

          <button
            onClick={() => setIsActive((v) => !v)}
            disabled={!isActive && drawdownBreached}
            className={`flex items-center space-x-2 px-5 py-2.5 text-xs font-extrabold rounded-xl shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              isActive
                ? 'bg-rose-500 hover:bg-rose-600 text-white'
                : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-[#00d2ff] hover:opacity-95 text-black'
            }`}
          >
            {isActive ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Mettre en pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Activer l'auto-pilote</span>
              </>
            )}
          </button>
        </div>
      </div>

      {drawdownBreached && (
        <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs font-mono">
          Coupe-circuit déclenché : {drawdown24h.toLocaleString('fr-CA')} $ CAD de pertes sur 24 h, pour une limite de{' '}
          {strategy.maxDailyDrawdownCAD.toLocaleString('fr-CA')} $ CAD. Relevez la limite ou attendez que la fenêtre de
          24 h défile pour relancer le robot.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#050505] p-3.5 rounded-xl border border-white/10 space-y-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">
            P&L net du robot (réalisé)
          </span>
          <div className="flex items-center justify-between">
            <span
              className={`text-xl font-mono font-extrabold ${
                stats.netCAD > 0 ? 'text-emerald-400' : stats.netCAD < 0 ? 'text-rose-400' : 'text-white/70'
              }`}
            >
              {stats.netCAD > 0 ? '+' : ''}
              {stats.netCAD.toLocaleString('fr-CA')} $ CAD
            </span>
            <DollarSign className="w-4 h-4 text-white/30" />
          </div>
        </div>

        <div className="bg-[#050505] p-3.5 rounded-xl border border-white/10 space-y-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">Taux de réussite</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-mono font-extrabold text-[#00d2ff]">
              {stats.winRate === null ? '—' : `${stats.winRate} %`}
            </span>
            <span className="text-xs font-mono text-white/60">
              {stats.trades === 0 ? 'aucun trade clos' : `${stats.wins}/${stats.trades} gagnants`}
            </span>
          </div>
        </div>

        <div className="bg-[#050505] p-3.5 rounded-xl border border-white/10 space-y-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">
            Durée d'activité de la session
          </span>
          <div className="flex items-center justify-between font-mono">
            <span className="text-sm font-bold text-white">{formatUptime(uptimeSeconds)}</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
        </div>

        <div className="bg-[#050505] p-3.5 rounded-xl border border-white/10 space-y-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">Cadence de scan</span>
          <div className="flex items-center justify-between font-mono">
            <span className="text-sm font-bold text-amber-400">Toutes les {strategy.scanIntervalSeconds} s</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-bold text-white uppercase tracking-wider font-mono block">
          Mode de trading & algorithme
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {(Object.keys(DEFAULT_STRATEGIES) as TradingStyle[]).map((style) => {
            const preset = DEFAULT_STRATEGIES[style];
            const isSelected = selectedStyle === style;

            return (
              <button
                key={style}
                onClick={() => handleSelectStyle(style)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-purple-500/10 border-purple-500/50 text-white shadow-lg'
                    : 'bg-[#050505] hover:bg-white/5 border-white/10 text-white/60'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Radio className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-400' : 'text-white/40'}`} />
                  <span className="font-extrabold text-xs text-white tracking-tight">{preset.name}</span>
                </div>
                <p className="text-[10px] text-white/50 leading-tight mb-2">{preset.description}</p>
                <div className="flex items-center justify-between text-[10px] font-mono text-white/70 pt-1 border-t border-white/10">
                  <span>Cible +{preset.targetProfitPercent} %</span>
                  <span>Stop −{preset.trailingStopPercent} %</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-[#050505] p-4 rounded-xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Activity className="w-4 h-4 text-emerald-400" />
            Journal des décisions autonomes
          </span>
          <span className="text-[10px] font-mono text-white/40">
            {eligibleCount} actif{eligibleCount > 1 ? 's' : ''} éligible{eligibleCount > 1 ? 's' : ''} •{' '}
            {lastScanAt ? `dernier scan ${lastScanAt}` : 'aucun scan effectué'}
          </span>
        </div>

        {openLogs.length === 0 && stats.recent.length === 0 ? (
          <div className="py-8 text-center text-xs text-white/40 font-mono space-y-1">
            <p>Le robot n'a encore pris aucune décision.</p>
            <p className="text-[10px] text-white/30">
              Activez l'auto-pilote : les ouvertures et les clôtures réelles apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {openLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-lg border bg-[#0a0a0a] border-white/10 text-xs font-mono flex items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-2.5 shrink-0">
                  <span className="text-white/40 text-[10px]">{log.timestamp}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/30">
                    Ouverture
                  </span>
                  <span className="font-bold text-white">{log.symbol}</span>
                </div>
                <span className="text-white/60 text-[11px] text-right">{log.reasoning}</span>
              </div>
            ))}

            {stats.recent.map((trade) => (
              <div
                key={trade.id}
                className="p-2.5 rounded-lg border bg-[#0a0a0a] border-white/10 text-xs font-mono flex items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-2.5 shrink-0">
                  <span className="text-white/40 text-[10px]">{trade.closeTime}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      trade.closeReason === 'TAKE_PROFIT'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : trade.closeReason === 'STOP_LOSS'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-white/10 text-white/70 border-white/20'
                    }`}
                  >
                    {trade.closeReason}
                  </span>
                  <span className="font-bold text-white">{trade.symbol}</span>
                </div>
                <span className={`font-bold text-[11px] ${trade.pnlCAD >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {trade.pnlCAD >= 0 ? '+' : ''}
                  {trade.pnlCAD.toFixed(2)} $ ({trade.pnlPercent.toFixed(2)} %)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {isProgrammerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/15 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-[#00d2ff]" />
                <h3 className="text-base font-extrabold text-white">Programmateur d'algorithme</h3>
              </div>
              <button
                onClick={() => setIsProgrammerOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-white/60 block">Nom de la stratégie</label>
                <input
                  type="text"
                  value={strategy.name}
                  onChange={(e) => setStrategy({ ...strategy, name: e.target.value })}
                  className="w-full bg-[#050505] border border-white/15 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/60 block">Allocation par trade ($ CAD)</label>
                <input
                  type="number"
                  min={1}
                  value={strategy.allocationPerTradeCAD}
                  onChange={(e) =>
                    setStrategy({ ...strategy, allocationPerTradeCAD: Math.max(1, Number(e.target.value) || 0) })
                  }
                  className="w-full bg-[#050505] border border-white/15 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/60 block">Objectif de profit (%)</label>
                <input
                  type="number"
                  step="any"
                  min={0.1}
                  value={strategy.targetProfitPercent}
                  onChange={(e) =>
                    setStrategy({ ...strategy, targetProfitPercent: Math.max(0.1, Number(e.target.value) || 0) })
                  }
                  className="w-full bg-[#050505] border border-white/15 rounded-xl p-2.5 text-emerald-400 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/60 block">Stop de protection (%)</label>
                <input
                  type="number"
                  step="any"
                  min={0.1}
                  value={strategy.trailingStopPercent}
                  onChange={(e) =>
                    setStrategy({ ...strategy, trailingStopPercent: Math.max(0.1, Number(e.target.value) || 0) })
                  }
                  className="w-full bg-[#050505] border border-white/15 rounded-xl p-2.5 text-rose-400 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/60 block">Cadence de scan (secondes)</label>
                <input
                  type="number"
                  min={1}
                  value={strategy.scanIntervalSeconds}
                  onChange={(e) =>
                    setStrategy({ ...strategy, scanIntervalSeconds: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="w-full bg-[#050505] border border-white/15 rounded-xl p-2.5 text-amber-400 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/60 block">Trades simultanés (max. {maxSlots})</label>
                <input
                  type="number"
                  min={1}
                  max={maxSlots}
                  value={strategy.maxConcurrentTrades}
                  onChange={(e) =>
                    setStrategy({
                      ...strategy,
                      maxConcurrentTrades: Math.min(maxSlots, Math.max(1, Number(e.target.value) || 1)),
                    })
                  }
                  className="w-full bg-[#050505] border border-white/15 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/60 block">RSI d'achat (≤)</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={strategy.rsiBuyThreshold}
                  onChange={(e) =>
                    setStrategy({
                      ...strategy,
                      rsiBuyThreshold: Math.min(99, Math.max(1, Number(e.target.value) || 1)),
                    })
                  }
                  className="w-full bg-[#050505] border border-white/15 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/60 block">Perte maximale sur 24 h ($ CAD)</label>
                <input
                  type="number"
                  min={0}
                  value={strategy.maxDailyDrawdownCAD}
                  onChange={(e) =>
                    setStrategy({ ...strategy, maxDailyDrawdownCAD: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full bg-[#050505] border border-white/15 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10 font-mono text-xs">
              <label className="text-white/80 font-bold block">Marchés autorisés pour ce robot</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MARKET_OPTIONS.map((market) => {
                  const isChecked = strategy.enabledMarkets.includes(market);
                  return (
                    <button
                      key={market}
                      onClick={() =>
                        setStrategy({
                          ...strategy,
                          enabledMarkets: isChecked
                            ? strategy.enabledMarkets.filter((m) => m !== market)
                            : [...strategy.enabledMarkets, market],
                        })
                      }
                      className={`p-2 rounded-xl border text-left flex items-center space-x-2 ${
                        isChecked
                          ? 'bg-[#00d2ff]/10 text-[#00d2ff] border-[#00d2ff]/40 font-bold'
                          : 'bg-[#050505] text-white/40 border-white/10'
                      }`}
                    >
                      <CheckCircle className={`w-3.5 h-3.5 ${isChecked ? 'text-[#00d2ff]' : 'text-white/20'}`} />
                      <span>{market}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setIsProgrammerOpen(false)}
              className="w-full py-3 bg-gradient-to-r from-[#00d2ff] via-emerald-400 to-amber-400 hover:opacity-95 text-black font-extrabold rounded-xl shadow-lg font-mono text-xs"
            >
              Appliquer la stratégie
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
