import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster, ToastMessage } from './components/Toaster';
import { INITIAL_WATCHLIST } from './data/watchlist';
import { loadJSON, saveJSON } from './lib/storage';
import { tickAsset } from './lib/marketData';
import {
  applyClose,
  applyOpen,
  buildClosedTrade,
  committedCapital,
  equity,
  exitReason,
  positionPnL,
} from './lib/portfolio';
import {
  PortfolioSettings,
  MarketAsset,
  TradePosition,
  HistoricalTrade,
  WebhookLogItem,
  WebhookPayload,
  AgentDebateResult,
  ApiKeySettings,
  EquitySnapshot,
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

const MAX_SLOTS = 5;
const TICK_INTERVAL_MS = 4000;
/** Un relevé d'équité par minute au maximum : suffisant pour la courbe, sans gonfler le stockage. */
const EQUITY_SNAPSHOT_INTERVAL_MS = 60_000;
const MAX_EQUITY_SNAPSHOTS = 3000;

const STORAGE_KEYS = {
  settings: 'farm_portfolio_settings',
  apiKeys: 'farm_api_keys',
  positions: 'farm_open_positions',
  trades: 'farm_closed_trades',
  equity: 'farm_equity_history',
  markets: 'farm_allowed_markets',
};

const isSettings = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  ['totalCapitalCAD', 'activeBudgetCAD', 'bankReserveCAD', 'targetGoalCAD'].every(
    (key) => Number.isFinite((value as Record<string, unknown>)[key] as number)
  );

const isPositionArray = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.every(
    (p) =>
      typeof p === 'object' &&
      p !== null &&
      typeof (p as TradePosition).id === 'string' &&
      typeof (p as TradePosition).symbol === 'string' &&
      Number.isFinite((p as TradePosition).entryPriceCAD) &&
      Number.isFinite((p as TradePosition).units)
  );

const isTradeArray = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.every(
    (t) => typeof t === 'object' && t !== null && typeof (t as HistoricalTrade).id === 'string' && Number.isFinite((t as HistoricalTrade).pnlCAD)
  );

export default function App() {
  const [settings, setSettings] = useState<PortfolioSettings>(() =>
    loadJSON(STORAGE_KEYS.settings, DEFAULT_SETTINGS, isSettings)
  );
  const [apiKeys, setApiKeys] = useState<ApiKeySettings>(() => loadJSON(STORAGE_KEYS.apiKeys, DEFAULT_API_KEYS));
  const [openPositions, setOpenPositions] = useState<TradePosition[]>(() =>
    loadJSON<TradePosition[]>(STORAGE_KEYS.positions, [], isPositionArray)
  );
  const [closedTrades, setClosedTrades] = useState<HistoricalTrade[]>(() =>
    loadJSON<HistoricalTrade[]>(STORAGE_KEYS.trades, [], isTradeArray)
  );
  const [equityHistory, setEquityHistory] = useState<EquitySnapshot[]>(() =>
    loadJSON<EquitySnapshot[]>(STORAGE_KEYS.equity, [], (v) => Array.isArray(v))
  );
  const [allowedMarkets, setAllowedMarkets] = useState<string[]>(() =>
    loadJSON<string[]>(STORAGE_KEYS.markets, ['US', 'JP', 'AU', 'CA', 'FOREX', 'CRYPTO_COMMODITY'], (v) =>
      Array.isArray(v)
    )
  );

  const [watchlist, setWatchlist] = useState<MarketAsset[]>(INITIAL_WATCHLIST);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(INITIAL_WATCHLIST[0].symbol);
  const [userNotes, setUserNotes] = useState<string>('');

  const [webhookLogs, setWebhookLogs] = useState<WebhookLogItem[]>([]);
  const [lastWebhookPayload, setLastWebhookPayload] = useState<WebhookPayload | null>(null);

  const [debateResult, setDebateResult] = useState<AgentDebateResult | null>(null);
  const [debateNotice, setDebateNotice] = useState<string | null>(null);
  const [isDebating, setIsDebating] = useState(false);
  const [isSimulatingPrices, setIsSimulatingPrices] = useState(true);
  const [isFirmAuthorized, setIsFirmAuthorized] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isApiKeysOpen, setIsApiKeysOpen] = useState(false);
  const [isMultiTradeOpen, setIsMultiTradeOpen] = useState(false);
  const [isMarketScheduleOpen, setIsMarketScheduleOpen] = useState(false);
  const [engineStatus, setEngineStatus] = useState<{ hasGeminiKey: boolean; engine: string } | null>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((message: string, tone: ToastMessage['tone'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * L'actif sélectionné est dérivé de la watchlist plutôt que dupliqué dans un
   * state séparé. La copie précédente devait être resynchronisée à chaque tick,
   * ce qui provoquait un appel setState pendant le rendu du ticker.
   */
  const selectedAsset = useMemo(
    () => watchlist.find((a) => a.symbol === selectedSymbol) ?? watchlist[0],
    [watchlist, selectedSymbol]
  );

  useEffect(() => saveJSON(STORAGE_KEYS.settings, settings), [settings]);
  useEffect(() => saveJSON(STORAGE_KEYS.apiKeys, apiKeys), [apiKeys]);
  useEffect(() => saveJSON(STORAGE_KEYS.positions, openPositions), [openPositions]);
  useEffect(() => saveJSON(STORAGE_KEYS.trades, closedTrades), [closedTrades]);
  useEffect(() => saveJSON(STORAGE_KEYS.equity, equityHistory), [equityHistory]);
  useEffect(() => saveJSON(STORAGE_KEYS.markets, allowedMarkets), [allowedMarkets]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setEngineStatus({ hasGeminiKey: !!data.hasGeminiKey, engine: data.engine ?? 'rule-engine' });
      })
      .catch(() => {
        if (!cancelled) setEngineStatus({ hasGeminiKey: false, engine: 'offline' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Flux de prix simulé. Chaque tick fait aussi progresser la dernière bougie et
  // recalcule RSI / MACD / moyennes mobiles, pour que l'analyse technique
  // envoyée aux agents corresponde réellement au prix affiché.
  useEffect(() => {
    if (!isSimulatingPrices) return;

    const interval = setInterval(() => {
      setWatchlist((prev) =>
        prev.map((asset) => {
          const drift = (Math.random() - 0.49) * 0.008 * asset.priceCAD;
          const decimals = asset.priceCAD < 10 ? 4 : 2;
          const factor = 10 ** decimals;
          const newPrice = Math.max(0.0001, Math.round((asset.priceCAD + drift) * factor) / factor);
          return tickAsset(asset, newPrice, asset.previousClose);
        })
      );
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isSimulatingPrices]);

  const priceFor = useCallback(
    (symbol: string, fallback: number) => watchlist.find((a) => a.symbol === symbol)?.priceCAD ?? fallback,
    [watchlist]
  );

  /**
   * Point de sortie unique du capital.
   *
   * Toute clôture — manuelle, stop, cible, robot — passe par ici, ce qui garantit
   * l'invariant comptable : le principal engagé revient au budget actif et seul
   * le P&L réalisé modifie le capital total.
   */
  const closePositions = useCallback(
    (targets: { id: string; reason: HistoricalTrade['closeReason']; price?: number }[]) => {
      if (targets.length === 0) return;

      setOpenPositions((positions) => {
        const byId = new Map(targets.map((t) => [t.id, t]));
        const closing = positions.filter((p) => byId.has(p.id));
        if (closing.length === 0) return positions;

        const trades = closing.map((position) => {
          const target = byId.get(position.id)!;
          const exitPrice = target.price ?? priceFor(position.symbol, position.currentPriceCAD);
          return buildClosedTrade(position, exitPrice, target.reason);
        });

        // Les mises à jour dépendantes sont programmées hors de l'updater :
        // un updater React doit rester pur et peut être rejoué (StrictMode),
        // ce qui créditait le P&L deux fois.
        queueMicrotask(() => {
          setClosedTrades((prev) => [...trades, ...prev].slice(0, 500));
          setSettings((prev) =>
            trades.reduce((acc, trade) => applyClose(acc, trade.amountCAD, trade.pnlCAD), prev)
          );
        });

        return positions.filter((p) => !byId.has(p.id));
      });
    },
    [priceFor]
  );

  // Réévaluation du P&L latent et déclenchement des stops / cibles.
  useEffect(() => {
    if (openPositions.length === 0) return;

    const hits: { id: string; reason: HistoricalTrade['closeReason']; price: number }[] = [];
    let changed = false;

    const revalued = openPositions.map((position) => {
      const price = priceFor(position.symbol, position.currentPriceCAD);
      const reason = exitReason(position, price);
      if (reason) {
        hits.push({ id: position.id, reason, price });
        return position;
      }

      const { pnlCAD, pnlPercent } = positionPnL(position, price);
      if (position.currentPriceCAD === price && position.pnlCAD === pnlCAD) return position;

      changed = true;
      return { ...position, currentPriceCAD: price, pnlCAD, pnlPercent };
    });

    if (hits.length > 0) {
      closePositions(hits);
      return;
    }
    if (changed) setOpenPositions(revalued);
  }, [watchlist, openPositions, priceFor, closePositions]);

  // Relevé périodique de la valeur liquidative : la courbe historique est ainsi
  // constituée de mesures réelles et non d'une interpolation décorative.
  const lastSnapshotRef = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - lastSnapshotRef.current < EQUITY_SNAPSHOT_INTERVAL_MS && lastSnapshotRef.current !== 0) return;
    lastSnapshotRef.current = now;

    setEquityHistory((prev) =>
      [
        ...prev,
        {
          t: now,
          totalCapitalCAD: settings.totalCapitalCAD,
          equityCAD: equity(settings, openPositions),
          activeBudgetCAD: settings.activeBudgetCAD,
          bankReserveCAD: settings.bankReserveCAD,
        },
      ].slice(-MAX_EQUITY_SNAPSHOTS)
    );
  }, [settings, openPositions]);

  /** Ouverture contrôlée : vérifie les slots, le budget et le doublon de symbole. */
  const openPosition = useCallback(
    (position: TradePosition): boolean => {
      let accepted = false;

      setOpenPositions((positions) => {
        if (positions.length >= MAX_SLOTS) {
          notify(`Les ${MAX_SLOTS} slots sont occupés — clôturez une position avant d'en ouvrir une autre.`, 'warning');
          return positions;
        }
        if (positions.some((p) => p.symbol === position.symbol)) {
          notify(`Une position est déjà ouverte sur ${position.symbol}.`, 'warning');
          return positions;
        }

        accepted = true;
        queueMicrotask(() => setSettings((prev) => applyOpen(prev, position.amountCAD)));
        return [position, ...positions];
      });

      return accepted;
    },
    [notify]
  );

  const buildPosition = useCallback(
    (
      asset: MarketAsset,
      amountCAD: number,
      stopLossCAD: number,
      takeProfitCAD: number,
      type: 'LONG' | 'SHORT',
      source: TradePosition['source']
    ): TradePosition => {
      const now = new Date();
      return {
        id: `pos-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        symbol: asset.symbol,
        assetName: asset.name,
        type,
        entryPriceCAD: asset.priceCAD,
        currentPriceCAD: asset.priceCAD,
        amountCAD: Math.round(amountCAD * 100) / 100,
        units: Number((amountCAD / asset.priceCAD).toFixed(6)),
        stopLossCAD,
        takeProfitCAD,
        openTime: now.toLocaleTimeString('fr-CA'),
        openedAt: now.getTime(),
        pnlCAD: 0,
        pnlPercent: 0,
        source,
      };
    },
    []
  );

  const handleExecuteTrade = useCallback(
    (decision: AgentDebateResult['finalDecision']) => {
      const isBuy = decision.action === 'ACHETER' || decision.action === 'BUY';
      if (!isBuy) {
        notify("La décision des agents n'est pas un ordre d'achat — aucune position ouverte.", 'info');
        return;
      }

      const asset = watchlist.find((a) => a.symbol === decision.symbol) ?? selectedAsset;
      const amountCAD = decision.positionSizeCAD;

      if (!Number.isFinite(amountCAD) || amountCAD <= 0) {
        notify('La taille de position recommandée est nulle — aucun ordre transmis.', 'warning');
        return;
      }
      if (amountCAD > settings.activeBudgetCAD) {
        notify(
          `Budget actif insuffisant : ${amountCAD.toLocaleString('fr-CA')} $ CAD requis pour ${settings.activeBudgetCAD.toLocaleString('fr-CA')} $ CAD disponibles.`,
          'error'
        );
        return;
      }

      const opened = openPosition(
        buildPosition(asset, amountCAD, decision.stopLossPrice, decision.takeProfitPrice, 'LONG', 'AGENT')
      );
      if (opened) notify(`Position ouverte sur ${asset.symbol} pour ${amountCAD.toLocaleString('fr-CA')} $ CAD.`, 'success');
    },
    [watchlist, selectedAsset, settings.activeBudgetCAD, openPosition, buildPosition, notify]
  );

  const handleRunDeliberation = useCallback(async () => {
    setIsDebating(true);
    setDebateResult(null);
    setDebateNotice(null);

    try {
      const response = await fetch('/api/agents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: {
            symbol: selectedAsset.symbol,
            name: selectedAsset.name,
            priceCAD: selectedAsset.priceCAD,
            rsi: selectedAsset.rsi,
            macd: selectedAsset.macd,
            ma50: selectedAsset.ma50,
            ma200: selectedAsset.ma200,
            support: selectedAsset.support,
            resistance: selectedAsset.resistance,
          },
          portfolio: settings,
          userNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.debate) {
        notify(data?.error || 'La délibération a échoué. Réessayez dans un instant.', 'error');
        return;
      }

      setDebateResult(data.debate);
      setDebateNotice(data.notice ?? null);
      setLastWebhookPayload(data.debate.webhookPayload ?? null);

      const decision = data.debate.finalDecision;
      if (isFirmAuthorized && (decision?.action === 'ACHETER' || decision?.action === 'BUY')) {
        handleExecuteTrade(decision);
      }
    } catch (err) {
      console.error('Erreur de délibération :', err);
      notify('Impossible de joindre le serveur de délibération. Vérifiez que le backend est démarré.', 'error');
    } finally {
      setIsDebating(false);
    }
  }, [selectedAsset, settings, userNotes, isFirmAuthorized, handleExecuteTrade, notify]);

  const handleExecuteMultiTrades = useCallback(
    (newPositions: TradePosition[]) => {
      const available = MAX_SLOTS - openPositions.length;
      if (available <= 0) {
        notify(`Les ${MAX_SLOTS} slots sont déjà occupés.`, 'warning');
        return;
      }

      const accepted: TradePosition[] = [];
      let budget = settings.activeBudgetCAD;

      for (const position of newPositions) {
        if (accepted.length >= available) break;
        if (openPositions.some((p) => p.symbol === position.symbol)) continue;
        if (accepted.some((p) => p.symbol === position.symbol)) continue;
        if (position.amountCAD > budget) continue;

        budget -= position.amountCAD;
        accepted.push(position);
      }

      if (accepted.length === 0) {
        notify('Aucun ordre exécutable : budget insuffisant, slots occupés ou positions déjà ouvertes.', 'warning');
        return;
      }

      const spent = committedCapital(accepted);
      setOpenPositions((prev) => [...accepted, ...prev]);
      setSettings((prev) => applyOpen(prev, spent));

      const skipped = newPositions.length - accepted.length;
      notify(
        `${accepted.length} position${accepted.length > 1 ? 's' : ''} ouverte${accepted.length > 1 ? 's' : ''} pour ${spent.toLocaleString('fr-CA')} $ CAD.` +
          (skipped > 0 ? ` ${skipped} ordre${skipped > 1 ? 's' : ''} écarté${skipped > 1 ? 's' : ''}.` : ''),
        'success'
      );
    },
    [openPositions, settings.activeBudgetCAD, notify]
  );

  const handleClosePosition = useCallback(
    (id: string) => closePositions([{ id, reason: 'MANUAL' }]),
    [closePositions]
  );

  const handleScaleUpCapital = useCallback(() => {
    setSettings((prev) => {
      if (prev.bankReserveCAD < prev.scalingTrancheAmountCAD) {
        notify('Réserve bancaire insuffisante pour débloquer cette tranche.', 'error');
        return prev;
      }
      notify(`Tranche de ${prev.scalingTrancheAmountCAD.toLocaleString('fr-CA')} $ CAD transférée vers le budget actif.`, 'success');
      return {
        ...prev,
        activeBudgetCAD: Math.round((prev.activeBudgetCAD + prev.scalingTrancheAmountCAD) * 100) / 100,
        bankReserveCAD: Math.round((prev.bankReserveCAD - prev.scalingTrancheAmountCAD) * 100) / 100,
      };
    });
  }, [notify]);

  const handleSendWebhook = useCallback(async (webhookUrl: string, payload: WebhookPayload) => {
    try {
      const response = await fetch('/api/webhook/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, payload }),
      });
      const data = await response.json();

      setWebhookLogs((prev) =>
        [
          {
            id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date().toLocaleTimeString('fr-CA'),
            endpoint: webhookUrl,
            payload,
            status: (data.status as WebhookLogItem['status']) || 'FAILED',
            responseMessage: data.message || data.error || 'Réponse sans message.',
          },
          ...prev,
        ].slice(0, 50)
      );
    } catch (err) {
      console.error('Erreur webhook :', err);
      setWebhookLogs((prev) =>
        [
          {
            id: `wh-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('fr-CA'),
            endpoint: webhookUrl,
            payload,
            status: 'FAILED' as const,
            responseMessage: 'Le serveur est injoignable.',
          },
          ...prev,
        ].slice(0, 50)
      );
    }
  }, []);

  const handleResetPortfolio = useCallback(() => {
    if (!confirm('Réinitialiser le portefeuille (10 000 $ CAD total / 1 000 $ CAD actif) et effacer tout l\'historique ?')) {
      return;
    }
    setSettings(DEFAULT_SETTINGS);
    setOpenPositions([]);
    setClosedTrades([]);
    setEquityHistory([]);
    setDebateResult(null);
    setDebateNotice(null);
    lastSnapshotRef.current = 0;
    notify('Portefeuille réinitialisé.', 'success');
  }, [notify]);

  const handleToggleMarketPermission = useCallback((marketCode: string) => {
    setAllowedMarkets((prev) =>
      prev.includes(marketCode) ? prev.filter((code) => code !== marketCode) : [...prev, marketCode]
    );
  }, []);

  const currentEquity = equity(settings, openPositions);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans antialiased selection:bg-[#00d2ff] selection:text-black">
      <Header
        settings={settings}
        currentEquity={currentEquity}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenApiKeys={() => setIsApiKeysOpen(true)}
        onOpenMultiTradeModal={() => setIsMultiTradeOpen(true)}
        onOpenMarketSchedule={() => setIsMarketScheduleOpen(true)}
        onResetPortfolio={handleResetPortfolio}
        onToggleSimulatedPriceTick={() => setIsSimulatingPrices((v) => !v)}
        isSimulating={isSimulatingPrices}
        engineStatus={engineStatus}
        activePositionsCount={openPositions.length}
        maxSlots={MAX_SLOTS}
        dataMode={apiKeys.dataMode}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <ErrorBoundary label="Synthèse du portefeuille">
          <PortfolioStats
            settings={settings}
            openPositions={openPositions}
            closedTrades={closedTrades}
            equityHistory={equityHistory}
            currentEquity={currentEquity}
            onScaleUpCapital={handleScaleUpCapital}
          />
        </ErrorBoundary>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <ErrorBoundary label="Graphique de marché">
              <MarketChart
                watchlist={watchlist}
                selectedAsset={selectedAsset}
                onSelectAsset={(asset) => setSelectedSymbol(asset.symbol)}
                userNotes={userNotes}
                setUserNotes={setUserNotes}
                dataMode={apiKeys.dataMode}
                onOpenMultiTradeModal={() => setIsMultiTradeOpen(true)}
              />
            </ErrorBoundary>

            <ErrorBoundary label="Positions ouvertes">
              <PositionsTable
                positions={openPositions}
                maxSlots={MAX_SLOTS}
                onClosePosition={handleClosePosition}
              />
            </ErrorBoundary>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <ErrorBoundary label="Délibération des agents">
              <AgentDebateView
                debateResult={debateResult}
                notice={debateNotice}
                isLoading={isDebating}
                onRunDeliberation={handleRunDeliberation}
                onExecuteTrade={handleExecuteTrade}
                onSendWebhookTest={(payload) => handleSendWebhook('https://example.com/webhook/alpha-desk', payload)}
                selectedAsset={selectedAsset}
                settings={settings}
                isFirmAuthorized={isFirmAuthorized}
                onToggleFirmAuthorization={() => setIsFirmAuthorized((v) => !v)}
                closedTrades={closedTrades}
              />
            </ErrorBoundary>

            <ErrorBoundary label="Panneau webhook">
              <WebhookPanel logs={webhookLogs} onSendWebhook={handleSendWebhook} lastPayload={lastWebhookPayload} />
            </ErrorBoundary>
          </div>
        </div>

        <div className="space-y-6 pt-4 border-t border-white/10">
          <ErrorBoundary label="Robot d'exécution autonome">
            <AutoPilotEngine
              watchlist={watchlist}
              openPositions={openPositions}
              closedTrades={closedTrades}
              settings={settings}
              maxSlots={MAX_SLOTS}
              onOpenPosition={openPosition}
              buildPosition={buildPosition}
            />
          </ErrorBoundary>

          <ErrorBoundary label="Heatmap de sentiment">
            <SentimentHeatmap watchlist={watchlist} />
          </ErrorBoundary>

          <ErrorBoundary label="Laboratoire de backtest">
            <BacktestTrainer watchlist={watchlist} settings={settings} />
          </ErrorBoundary>

          <ErrorBoundary label="Historique des transactions">
            <HistoryLog closedTrades={closedTrades} />
          </ErrorBoundary>
        </div>
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        committedCapitalCAD={committedCapital(openPositions)}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          notify('Paramètres du portefeuille mis à jour.', 'success');
        }}
      />

      <ApiKeysModal
        isOpen={isApiKeysOpen}
        onClose={() => setIsApiKeysOpen(false)}
        apiKeys={apiKeys}
        onSaveApiKeys={(newKeys) => {
          setApiKeys(newKeys);
          notify('Clés et mode de données enregistrés localement.', 'success');
        }}
      />

      <MultiTradeModal
        isOpen={isMultiTradeOpen}
        onClose={() => setIsMultiTradeOpen(false)}
        watchlist={watchlist}
        settings={settings}
        openPositions={openPositions}
        maxSlots={MAX_SLOTS}
        onExecuteMultiTrades={handleExecuteMultiTrades}
      />

      <MarketScheduleModal
        isOpen={isMarketScheduleOpen}
        onClose={() => setIsMarketScheduleOpen(false)}
        allowedMarkets={allowedMarkets}
        onToggleMarketPermission={handleToggleMarketPermission}
        onRunMultiMarketTrade={() => {
          setIsMarketScheduleOpen(false);
          setIsMultiTradeOpen(true);
        }}
      />

      <Toaster toasts={toasts} onDismiss={dismissToast} />

      <footer className="border-t border-white/10 bg-[#0a0a0a] py-6 text-center text-xs text-white/40 font-mono space-y-1">
        <p>ALPHA-DESK PRO • Référence monétaire $ CAD • Alberta, Canada (Mountain Time)</p>
        <p className="text-white/30">
          Simulation de trading à but pédagogique — aucun ordre n'est transmis à un courtier réel et aucun capital n'est engagé.
        </p>
      </footer>
    </div>
  );
}
