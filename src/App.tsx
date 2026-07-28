import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PortfolioStats } from './components/PortfolioStats';
import { MarketChart } from './components/MarketChart';
import { AgentDebateView } from './components/AgentDebateView';
import { PositionsTable } from './components/PositionsTable';
import { HistoryLog } from './components/HistoryLog';
import { WebhookPanel } from './components/WebhookPanel';
import { SettingsModal } from './components/SettingsModal';
import { ApiKeysModal } from './components/ApiKeysModal';
import { MultiTradeModal } from './components/MultiTradeModal';
import { MarketScheduleModal } from './components/MarketScheduleModal';
import { BacktestTrainer } from './components/BacktestTrainer';
import { SentimentHeatmap } from './components/SentimentHeatmap';
import { AutoPilotEngine } from './components/AutoPilotEngine';
import { INITIAL_WATCHLIST } from './data/watchlist';
import {
  PortfolioSettings,
  MarketAsset,
  TradePosition,
  HistoricalTrade,
  WebhookLogItem,
  WebhookPayload,
  AgentDebateResult,
  ApiKeySettings,
} from './types';

const DEFAULT_SETTINGS: PortfolioSettings = {
  totalCapitalCAD: 10000,
  activeBudgetCAD: 1000,
  bankReserveCAD: 9000,
  targetGoalCAD: 20000,
  maxRiskPercentPerTrade: 2,
  scalingProfitThresholdPercent: 15,
  scalingTrancheAmountCAD: 1000,
};

const DEFAULT_API_KEYS: ApiKeySettings = {
  dataMode: 'LIVE_SIMULATED',
  backtestYearRange: '2023-2024',
};

export default function App() {
  const [settings, setSettings] = useState<PortfolioSettings>(() => {
    const saved = localStorage.getItem('farm_portfolio_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [apiKeys, setApiKeys] = useState<ApiKeySettings>(() => {
    const saved = localStorage.getItem('farm_api_keys');
    return saved ? JSON.parse(saved) : DEFAULT_API_KEYS;
  });

  const [watchlist, setWatchlist] = useState<MarketAsset[]>(INITIAL_WATCHLIST);
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset>(INITIAL_WATCHLIST[0]);
  const [userNotes, setUserNotes] = useState<string>('');

  const [openPositions, setOpenPositions] = useState<TradePosition[]>(() => {
    const saved = localStorage.getItem('farm_open_positions');
    return saved ? JSON.parse(saved) : [];
  });

  const [closedTrades, setClosedTrades] = useState<HistoricalTrade[]>(() => {
    const saved = localStorage.getItem('farm_closed_trades');
    return saved ? JSON.parse(saved) : [];
  });

  const [webhookLogs, setWebhookLogs] = useState<WebhookLogItem[]>([]);
  const [lastWebhookPayload, setLastWebhookPayload] = useState<WebhookPayload | null>(null);

  const [debateResult, setDebateResult] = useState<AgentDebateResult | null>(null);
  const [isDebating, setIsDebating] = useState<boolean>(false);
  const [isSimulatingPrices, setIsSimulatingPrices] = useState<boolean>(true);
  const [isFirmAuthorized, setIsFirmAuthorized] = useState<boolean>(true);
  const [firmGeneratedProfitCAD, setFirmGeneratedProfitCAD] = useState<number>(315.80);
  
  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isApiKeysOpen, setIsApiKeysOpen] = useState<boolean>(false);
  const [isMultiTradeOpen, setIsMultiTradeOpen] = useState<boolean>(false);
  const [isMarketScheduleOpen, setIsMarketScheduleOpen] = useState<boolean>(false);
  const [allowedMarkets, setAllowedMarkets] = useState<string[]>(['US', 'JP', 'AU', 'CA', 'FOREX', 'CRYPTO_COMMODITY']);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(true);

  const handleToggleMarketPermission = (marketCode: string) => {
    setAllowedMarkets((prev) =>
      prev.includes(marketCode) ? prev.filter((code) => code !== marketCode) : [...prev, marketCode]
    );
  };

  // Save state persistence
  useEffect(() => {
    localStorage.setItem('farm_portfolio_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('farm_api_keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  useEffect(() => {
    localStorage.setItem('farm_open_positions', JSON.stringify(openPositions));
  }, [openPositions]);

  useEffect(() => {
    localStorage.setItem('farm_closed_trades', JSON.stringify(closedTrades));
  }, [closedTrades]);

  // Check Backend Health
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHasGeminiKey(data.hasGeminiKey))
      .catch(() => setHasGeminiKey(false));
  }, []);

  // Simulate Live Price Ticker Fluctuation & StopLoss / TakeProfit Checks
  useEffect(() => {
    if (!isSimulatingPrices) return;

    const interval = setInterval(() => {
      setWatchlist((prevWatchlist) => {
        const updated = prevWatchlist.map((asset) => {
          const delta = (Math.random() - 0.49) * 0.008 * asset.priceCAD;
          const newPrice = Number(Math.max(0.01, asset.priceCAD + delta).toFixed(2));
          const newChange = Number((asset.change24h + (delta / asset.priceCAD) * 100).toFixed(2));
          return {
            ...asset,
            priceCAD: newPrice,
            change24h: newChange,
          };
        });

        // Update selected asset price reference
        const currentSelected = updated.find((a) => a.symbol === selectedAsset.symbol);
        if (currentSelected) {
          setSelectedAsset(currentSelected);
        }

        return updated;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isSimulatingPrices, selectedAsset.symbol]);

  // Check Open Positions for SL / TP hits whenever prices update
  useEffect(() => {
    if (openPositions.length === 0) return;

    setOpenPositions((currentPositions) => {
      const remaining: TradePosition[] = [];
      let newlyClosed: HistoricalTrade[] = [];

      currentPositions.forEach((pos) => {
        const liveAsset = watchlist.find((a) => a.symbol === pos.symbol);
        const currentPrice = liveAsset ? liveAsset.priceCAD : pos.currentPriceCAD;

        const pnlCAD = (currentPrice - pos.entryPriceCAD) * pos.units;
        const pnlPercent = ((currentPrice - pos.entryPriceCAD) / pos.entryPriceCAD) * 100;

        let hitCloseReason: 'TAKE_PROFIT' | 'STOP_LOSS' | null = null;
        if (currentPrice >= pos.takeProfitCAD) hitCloseReason = 'TAKE_PROFIT';
        else if (currentPrice <= pos.stopLossCAD) hitCloseReason = 'STOP_LOSS';

        if (hitCloseReason) {
          newlyClosed.push({
            id: `trade-${Date.now()}-${Math.random()}`,
            symbol: pos.symbol,
            type: pos.type,
            amountCAD: pos.amountCAD,
            entryPriceCAD: pos.entryPriceCAD,
            exitPriceCAD: currentPrice,
            pnlCAD: Number(pnlCAD.toFixed(2)),
            pnlPercent: Number(pnlPercent.toFixed(2)),
            openTime: pos.openTime,
            closeTime: new Date().toLocaleTimeString('fr-CA'),
            closeReason: hitCloseReason,
          });

          // Return capital back to active budget
          setSettings((prev) => ({
            ...prev,
            activeBudgetCAD: Number((prev.activeBudgetCAD + pnlCAD).toFixed(2)),
          }));
        } else {
          remaining.push({
            ...pos,
            currentPriceCAD: currentPrice,
            pnlCAD: Number(pnlCAD.toFixed(2)),
            pnlPercent: Number(pnlPercent.toFixed(2)),
          });
        }
      });

      if (newlyClosed.length > 0) {
        setClosedTrades((prev) => [...newlyClosed, ...prev]);
      }

      return remaining;
    });
  }, [watchlist]);

  // Trigger Multi-Agent Deliberation via Express API
  const handleRunDeliberation = async () => {
    setIsDebating(true);
    setDebateResult(null);

    try {
      const response = await fetch('/api/agents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: selectedAsset,
          portfolio: settings,
          userNotes,
        }),
      });

      const data = await response.json();
      if (data.success && data.debate) {
        setDebateResult(data.debate);
        setLastWebhookPayload(data.debate.webhookPayload);

        // Auto-execute trade if the firm has user authorization
        if (isFirmAuthorized && (data.debate.finalDecision.action === 'ACHETER' || data.debate.finalDecision.action === 'BUY')) {
          handleExecuteTrade(data.debate.finalDecision);
        }
      } else {
        alert("Erreur lors de la délibération de la ferme d'agents.");
      }
    } catch (err: any) {
      console.error('Deliberation error:', err);
      alert('Erreur réseau lors de la communication avec les agents.');
    } finally {
      setIsDebating(false);
    }
  };

  // Execute Recommended Trade from Agent Decision
  const handleExecuteTrade = (decision: AgentDebateResult['finalDecision']) => {
    if (decision.action === 'ACHETER' || decision.action === 'BUY') {
      const amountCAD = decision.positionSizeCAD || 250;
      if (amountCAD > settings.activeBudgetCAD) {
        alert("Budget actif insuffisant pour exécuter cette taille de position.");
        return;
      }

      const units = Number((amountCAD / selectedAsset.priceCAD).toFixed(4));
      const newPos: TradePosition = {
        id: `pos-${Date.now()}`,
        symbol: selectedAsset.symbol,
        assetName: selectedAsset.name,
        type: 'LONG',
        entryPriceCAD: selectedAsset.priceCAD,
        currentPriceCAD: selectedAsset.priceCAD,
        amountCAD: amountCAD,
        units: units,
        stopLossCAD: decision.stopLossPrice,
        takeProfitCAD: decision.takeProfitPrice,
        openTime: new Date().toLocaleTimeString('fr-CA'),
        pnlCAD: 0,
        pnlPercent: 0,
      };

      setOpenPositions((prev) => [newPos, ...prev]);
    }
  };

  // Execute Multi-Trades Batch Action
  const handleExecuteMultiTrades = (newPositions: TradePosition[]) => {
    const totalSpentCAD = newPositions.reduce((acc, p) => acc + p.amountCAD, 0);

    setOpenPositions((prev) => [...newPositions, ...prev]);
    
    // Deduct total spent from active budget for safety margin
    setSettings((prev) => ({
      ...prev,
      activeBudgetCAD: Math.max(0, prev.activeBudgetCAD - totalSpentCAD),
    }));
  };

  // Manual Close Trade Action
  const handleClosePosition = (id: string) => {
    const posToClose = openPositions.find((p) => p.id === id);
    if (!posToClose) return;

    const closed: HistoricalTrade = {
      id: `trade-${Date.now()}`,
      symbol: posToClose.symbol,
      type: posToClose.type,
      amountCAD: posToClose.amountCAD,
      entryPriceCAD: posToClose.entryPriceCAD,
      exitPriceCAD: posToClose.currentPriceCAD,
      pnlCAD: posToClose.pnlCAD,
      pnlPercent: posToClose.pnlPercent,
      openTime: posToClose.openTime,
      closeTime: new Date().toLocaleTimeString('fr-CA'),
      closeReason: 'MANUAL',
    };

    setClosedTrades((prev) => [closed, ...prev]);
    setOpenPositions((prev) => prev.filter((p) => p.id !== id));

    // Return position amount + P&L back to Active Budget
    setSettings((prev) => ({
      ...prev,
      activeBudgetCAD: Number((prev.activeBudgetCAD + posToClose.amountCAD + posToClose.pnlCAD).toFixed(2)),
    }));
  };

  // Autonomous Bot Position Handlers
  const handleAutoOpenPosition = (newPos: TradePosition) => {
    setOpenPositions((prev) => [newPos, ...prev]);
    setSettings((prev) => ({
      ...prev,
      activeBudgetCAD: Math.max(0, Number((prev.activeBudgetCAD - newPos.amountCAD).toFixed(2))),
    }));
  };

  const handleAutoClosePosition = (id: string, closeReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL') => {
    const posToClose = openPositions.find((p) => p.id === id);
    if (!posToClose) return;

    const liveAsset = watchlist.find((a) => a.symbol === posToClose.symbol);
    const exitPrice = liveAsset ? liveAsset.priceCAD : posToClose.currentPriceCAD;
    const pnlCAD = Number(((exitPrice - posToClose.entryPriceCAD) * posToClose.units).toFixed(2));
    const pnlPercent = Number((((exitPrice - posToClose.entryPriceCAD) / posToClose.entryPriceCAD) * 100).toFixed(2));

    const closed: HistoricalTrade = {
      id: `auto-trade-${Date.now()}-${Math.random()}`,
      symbol: posToClose.symbol,
      type: posToClose.type,
      amountCAD: posToClose.amountCAD,
      entryPriceCAD: posToClose.entryPriceCAD,
      exitPriceCAD: exitPrice,
      pnlCAD: pnlCAD,
      pnlPercent: pnlPercent,
      openTime: posToClose.openTime,
      closeTime: new Date().toLocaleTimeString('fr-CA'),
      closeReason: closeReason,
    };

    setClosedTrades((prev) => [closed, ...prev]);
    setOpenPositions((prev) => prev.filter((p) => p.id !== id));

    setSettings((prev) => ({
      ...prev,
      activeBudgetCAD: Number((prev.activeBudgetCAD + posToClose.amountCAD + pnlCAD).toFixed(2)),
      totalCapitalCAD: Number((prev.totalCapitalCAD + pnlCAD).toFixed(2)),
    }));
  };

  // Scaling Action: Unlock +1000 $ CAD from Bank Reserve to Active Budget
  const handleScaleUpCapital = () => {
    if (settings.bankReserveCAD < settings.scalingTrancheAmountCAD) {
      alert("Réserve banque insuffisante pour débloquer cette tranche.");
      return;
    }

    setSettings((prev) => ({
      ...prev,
      activeBudgetCAD: prev.activeBudgetCAD + prev.scalingTrancheAmountCAD,
      bankReserveCAD: prev.bankReserveCAD - prev.scalingTrancheAmountCAD,
    }));
  };

  // Inject Backtest simulation gains
  const handleApplyBacktestResults = (gainCAD: number) => {
    setSettings((prev) => ({
      ...prev,
      totalCapitalCAD: prev.totalCapitalCAD + gainCAD,
      activeBudgetCAD: prev.activeBudgetCAD + gainCAD,
    }));
    alert(`Gains de backtest (+${gainCAD} $ CAD) crédités au portefeuille avec succès !`);
  };

  // Webhook Test Sender Handler
  const handleSendWebhook = async (webhookUrl: string, payload: WebhookPayload) => {
    try {
      const response = await fetch('/api/webhook/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, payload }),
      });
      const data = await response.json();

      const newLogItem: WebhookLogItem = {
        id: `wh-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('fr-CA'),
        endpoint: webhookUrl,
        payload,
        status: data.status || 'SIMULATED',
        responseMessage: data.message || 'Transmis avec succès',
      };

      setWebhookLogs((prev) => [newLogItem, ...prev]);
    } catch (err: any) {
      console.error('Webhook error:', err);
    }
  };

  // Reset Portfolio Handler
  const handleResetPortfolio = () => {
    if (confirm("Voulez-vous vraiment réinitialiser le portefeuille aux paramètres de départ (10 000 $ CAD Total / 1 000 $ CAD Actif) ?")) {
      setSettings(DEFAULT_SETTINGS);
      setOpenPositions([]);
      setClosedTrades([]);
      setDebateResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans antialiased selection:bg-[#00d2ff] selection:text-black">
      
      {/* Top Application Header */}
      <Header
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenApiKeys={() => setIsApiKeysOpen(true)}
        onOpenMultiTradeModal={() => setIsMultiTradeOpen(true)}
        onOpenMarketSchedule={() => setIsMarketScheduleOpen(true)}
        onResetPortfolio={handleResetPortfolio}
        onToggleSimulatedPriceTick={() => setIsSimulatingPrices(!isSimulatingPrices)}
        isSimulating={isSimulatingPrices}
        hasGeminiKey={hasGeminiKey}
        activePositionsCount={openPositions.length}
        dataMode={apiKeys.dataMode}
      />

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Portfolio Stats Bar, Recharts History & Goal Tracker */}
        <PortfolioStats
          settings={settings}
          openPositions={openPositions}
          closedTrades={closedTrades}
          onScaleUpCapital={handleScaleUpCapital}
        />

        {/* TOP SECTION: Main Trading Workbench (Left: Candlestick/Markets Chart & Slots | Right: Agents IO Debate) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (7 cols): International Markets, Candlestick Chart & Positions Slots */}
          <div className="lg:col-span-7 space-y-6">
            <MarketChart
              watchlist={watchlist}
              selectedAsset={selectedAsset}
              onSelectAsset={setSelectedAsset}
              userNotes={userNotes}
              setUserNotes={setUserNotes}
              dataMode={apiKeys.dataMode}
              onOpenMultiTradeModal={() => setIsMultiTradeOpen(true)}
            />

            {/* Positions Table (5 Slots) directly below Chart */}
            <PositionsTable
              positions={openPositions}
              onClosePosition={handleClosePosition}
            />
          </div>

          {/* Right Column (5 cols): Multi-Agent Deliberation (Agents IO) & Webhook Generator */}
          <div className="lg:col-span-5 space-y-6">
            <AgentDebateView
              debateResult={debateResult}
              isLoading={isDebating}
              onRunDeliberation={handleRunDeliberation}
              onExecuteTrade={handleExecuteTrade}
              onSendWebhookTest={(payload) => handleSendWebhook('https://tradingview.com/webhook/test-farm', payload)}
              selectedAsset={selectedAsset}
              settings={settings}
              isFirmAuthorized={isFirmAuthorized}
              onToggleFirmAuthorization={() => setIsFirmAuthorized(!isFirmAuthorized)}
              firmGeneratedProfitCAD={firmGeneratedProfitCAD}
            />

            <WebhookPanel
              logs={webhookLogs}
              onSendWebhook={handleSendWebhook}
              lastPayload={lastWebhookPayload}
            />
          </div>

        </div>

        {/* BOTTOM SECTION: Autopilot Execution, Sentiment Heatmap, Backtest & History Log */}
        <div className="space-y-6 pt-4 border-t border-white/10">
          
          {/* Robot d'Exécution Autonome 24/7 & Programmation de Stratégies */}
          <AutoPilotEngine
            watchlist={watchlist}
            openPositions={openPositions}
            settings={settings}
            onOpenPosition={handleAutoOpenPosition}
            onClosePosition={handleAutoClosePosition}
            onUpdateSettings={setSettings}
            onLogTradeHistory={(trade) => setClosedTrades((prev) => [trade, ...prev])}
          />

          {/* 7-Day Stratège Sentiment Heatmap Visualizer */}
          <SentimentHeatmap watchlist={watchlist} />

          {/* Backtest Historical Training Section */}
          <BacktestTrainer
            apiKeys={apiKeys}
            watchlist={watchlist}
            onApplyBacktestResults={handleApplyBacktestResults}
          />

          {/* History Log Section */}
          <HistoryLog closedTrades={closedTrades} />

        </div>

      </main>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => setSettings(newSettings)}
      />

      <ApiKeysModal
        isOpen={isApiKeysOpen}
        onClose={() => setIsApiKeysOpen(false)}
        apiKeys={apiKeys}
        onSaveApiKeys={(newKeys) => setApiKeys(newKeys)}
      />

      <MultiTradeModal
        isOpen={isMultiTradeOpen}
        onClose={() => setIsMultiTradeOpen(false)}
        watchlist={watchlist}
        settings={settings}
        onExecuteMultiTrades={handleExecuteMultiTrades}
      />

      <MarketScheduleModal
        isOpen={isMarketScheduleOpen}
        onClose={() => setIsMarketScheduleOpen(false)}
        allowedMarkets={allowedMarkets}
        onToggleMarketPermission={handleToggleMarketPermission}
        onRunMultiMarketTrade={(markets) => {
          setIsMultiTradeOpen(true);
        }}
      />

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0a0a0a] py-6 text-center text-xs text-white/40 font-mono">
        <p>
          Ferme de Trading Multi-Agents Intelligente • Référence Monétaire $ CAD • Graphiques Fibonacci & Intégration 12Data / TradingView
        </p>
      </footer>

    </div>
  );
}
