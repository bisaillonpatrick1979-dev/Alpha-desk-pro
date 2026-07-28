export type ActionType = 'BUY' | 'SELL' | 'HOLD' | 'CLOSE' | 'ACHETER' | 'RETIRER' | 'CONSERVER' | 'FERMER';

/**
 * Catégories d'actifs. Type unique partagé par la watchlist et les stratégies :
 * les deux listes divergeaient, ce qui laissait des filtres de marché
 * sélectionner des catégories qu'aucun actif ne portait.
 */
export type AssetCategory =
  | 'CAD Stock'
  | 'US Stock'
  | 'Japan Stock'
  | 'Australia Stock'
  | 'Crypto'
  | 'Forex'
  | 'Commodities'
  | 'Futures';

export interface MarketAsset {
  symbol: string;
  name: string;
  priceCAD: number;
  change24h: number;
  category: AssetCategory;
  rsi: number;
  macd: { macdLine: number; signalLine: number; histogram: number };
  ma50: number | null;
  ma200: number | null;
  support: number;
  resistance: number;
  volume24h: string;
  history: MarketCandle[];
  /** Clôture de référence servant de base au calcul de la variation 24 h. */
  previousClose: number;
}

export interface InstitutionalEngineReport {
  timestampMT: string; // YYYY-MM-DD - HH:MM MT
  qseEngine: {
    score: number; // -100 to +100
    technicalDetails: string;
    marketRegime: 'Tendance Haussière' | 'Tendance Baissière' | 'Range / Consolidation' | 'Volatilité Extrême';
  };
  smiEngine: {
    score: number; // -100 to +100
    sentimentDetails: string;
    macroImpact: string;
  };
  croEngine: {
    vetoStatus: 'APPROVED' | 'VETOED';
    slotAssigned: number; // 1 to 5
    slotCorrelationCheck: string;
    riskPerTradePercent: number; // 1-3%
    riskRewardRatio: string; // e.g. "1:2.4"
    stopLossPriceCAD: number;
    takeProfitPriceCAD: number;
    riskDetails: string;
  };
  cioEngine: {
    globalConfidenceScore: number; // -100 to +100
    finalDecision: 'ACHETEUR' | 'VENDEUR' | 'NEUTRE';
    decisionEnglish: 'BUY' | 'SELL' | 'HOLD' | 'CLOSE';
    capitalScalingRecommendation: string;
    shouldScaleUp: boolean;
    reasoning: string;
  };
  aeeEngine: {
    orderType: 'LIMIT' | 'MARKET' | 'STOP_MARKET' | 'TWAP' | 'VWAP';
    estimatedHorizon: 'Scalp' | 'Intraday' | 'Swing';
    webhookPayload: InstitutionalWebhookPayload;
  };
}

export interface InstitutionalWebhookPayload {
  timestamp_mt: string;
  engine_status: string;
  confidence_score: number;
  slot_id: number;
  action: 'BUY' | 'SELL' | 'CLOSE' | 'HOLD';
  symbol: string;
  amount_cad: number;
  stop_loss: number;
  take_profit: number;
}

export interface MarketCandle {
  time: string;
  /** Époque en millisecondes — permet de trier et de rééchantillonner les séries. */
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AgentDebateResult {
  technicalAnalysis: string;
  sentimentAnalysis: string;
  riskManagement: {
    text: string;
    suggestedRiskPercent: number;
    suggestedPositionSizeCAD: number;
    stopLossPrice: number;
    takeProfitPrice: number;
  };
  finalDecision: {
    action: 'ACHETER' | 'RETIRER' | 'CONSERVER' | 'FERMER' | 'BUY' | 'SELL' | 'HOLD' | 'CLOSE';
    actionEnglish: 'BUY' | 'SELL' | 'HOLD' | 'CLOSE';
    symbol: string;
    positionSizeCAD: number;
    stopLossPrice: number;
    takeProfitPrice: number;
    scalingRecommendation: string;
    shouldScaleUp: boolean;
    scaleAmountCAD?: number;
    reasoning: string;
  };
  webhookPayload: WebhookPayload;
  institutionalReport?: InstitutionalEngineReport;
  rawTextResponse?: string;
}

export interface WebhookPayload {
  action: 'BUY' | 'SELL' | 'CLOSE' | 'HOLD';
  symbol: string;
  amount_cad: number;
  stop_loss: number;
  take_profit: number;
  active_budget_cad: number;
  timestamp?: string;
  agent_farm?: string;
}

export interface TradePosition {
  id: string;
  slotId?: number; // Slot #1 to #5
  symbol: string;
  assetName: string;
  type: 'LONG' | 'SHORT';
  entryPriceCAD: number;
  currentPriceCAD: number;
  amountCAD: number;
  units: number;
  stopLossCAD: number;
  takeProfitCAD: number;
  openTime: string;
  /** Époque d'ouverture, pour dater précisément la position. */
  openedAt: number;
  pnlCAD: number;
  pnlPercent: number;
  /** Origine de l'ordre, affichée dans la table des positions. */
  source?: 'AGENT' | 'MANUAL' | 'AUTOPILOT';
}

export interface HistoricalTrade {
  id: string;
  symbol: string;
  type: 'LONG' | 'SHORT';
  amountCAD: number;
  entryPriceCAD: number;
  exitPriceCAD: number;
  pnlCAD: number;
  pnlPercent: number;
  openTime: string;
  closeTime: string;
  /** Époque de clôture — nécessaire pour reconstruire une courbe d'équité datée. */
  closedAt: number;
  closeReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL' | 'SCALING_REBALANCE';
  /** Origine de l'ordre, reprise depuis la position clôturée. */
  source?: 'AGENT' | 'MANUAL' | 'AUTOPILOT';
}

export interface PortfolioSettings {
  totalCapitalCAD: number;      // e.g. 10 000
  activeBudgetCAD: number;      // e.g. 1 000
  bankReserveCAD: number;       // totalCapital - activeBudget
  targetGoalCAD: number;        // e.g. 20 000
  maxRiskPercentPerTrade: number; // 1 to 3%
  scalingProfitThresholdPercent: number; // e.g. 15%
  scalingTrancheAmountCAD: number; // e.g. 1000
}

export interface ApiKeySettings {
  twelveDataApiKey?: string;
  tradingViewWebhookToken?: string;
  alpacaApiKey?: string;
  alpacaApiSecret?: string;
  interactiveBrokersAccountId?: string;
  binanceApiKey?: string;
  dataMode: 'LIVE_SIMULATED' | 'TWELVE_DATA_REALTIME' | 'TRADINGVIEW_WEBHOOK' | 'BACKTEST_HISTORICAL';
  backtestYearRange: '2020-2021' | '2021-2022' | '2022-2023' | '2023-2024' | '2024-2026';
}

export interface FibonacciLevel {
  level: number; // e.g. 0.618
  label: string; // e.g. '61.8% (Golden Ratio)'
  price: number;
  color: string;
}

export interface MultiTradeRequest {
  assets: MarketAsset[];
  allocationCADPerAsset: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  tradeType: 'LONG' | 'SHORT';
}

export interface WebhookLogItem {
  id: string;
  timestamp: string;
  endpoint: string;
  payload: WebhookPayload;
  status: 'SUCCESS' | 'SIMULATED' | 'FAILED';
  responseMessage: string;
}

export interface DailySentimentData {
  date: string;
  dayLabel: string;
  score: number; // 0 to 100
  label: 'TRÈS HAUSSIER' | 'HAUSSIER' | 'NEUTRE' | 'BAISSIER' | 'TRÈS BAISSIER';
  macroSummary: string;
  topDriver: string;
}

export interface AssetSentimentHeatmap {
  symbol: string;
  assetName: string;
  category: string;
  avg7dScore: number;
  dailyScores: {
    date: string;
    dayLabel: string;
    score: number;
    volumeWeight: number;
  }[];
}

/** Origine des scores de sentiment affichés dans la heatmap. */
export type SentimentSource = 'GEMINI' | 'TECHNIQUE';

/** Point de la courbe d'équité, enregistré au fil de l'eau et persisté. */
export interface EquitySnapshot {
  /** Époque du relevé. */
  t: number;
  /** Capital total (P&L réalisé inclus). */
  totalCapitalCAD: number;
  /** Valeur liquidative = capital total + P&L latent. */
  equityCAD: number;
  activeBudgetCAD: number;
  bankReserveCAD: number;
}

/** Résultat d'un backtest exécuté sur des bougies réelles. */
export interface BacktestReport {
  totalTrades: number;
  winningTrades: number;
  winRate: number;
  maxDrawdownPercent: number;
  totalProfitCAD: number;
  returnPercent: number;
  profitFactor: number;
  sharpeRatio: number;
  bestAsset: string;
  worstAsset: string;
  barsAnalysed: number;
  assetsAnalysed: number;
  strategyLabel: string;
  equityCurve: { index: number; equity: number }[];
}

export type TradingStyle = 'SCALPING' | 'DAY_TRADING' | 'SWING_TRADING' | 'HFT_ARBITRAGE';

export interface StrategyConfig {
  id: string;
  name: string;
  style: TradingStyle;
  description: string;
  targetProfitPercent: number;      // e.g. 2.5%
  trailingStopPercent: number;     // e.g. 1.0%
  allocationPerTradeCAD: number;    // e.g. 250 $ CAD
  maxConcurrentTrades: number;     // e.g. 4 trades
  scanIntervalSeconds: number;     // e.g. 5s for scalping, 30s for swing
  rsiBuyThreshold: number;         // e.g. 35
  rsiSellThreshold: number;        // e.g. 70
  autoReinvestProfits: boolean;    // Auto-compounding
  maxDailyDrawdownCAD: number;     // Stop bot if loss > $ CAD
  enabledMarkets: AssetCategory[];
}

export interface AutoBotLog {
  id: string;
  timestamp: string;
  symbol: string;
  action: 'BUY' | 'TAKE_PROFIT' | 'STOP_LOSS' | 'SCAN_PASS' | 'SCALED_UP';
  strategyStyle: TradingStyle;
  priceCAD: number;
  amountCAD: number;
  profitCAD?: number;
  reasoning: string;
}

export interface AutoPilotStatus {
  isActive: boolean;
  activeStrategy: StrategyConfig;
  totalAutonomouslyEarnedCAD: number;
  totalAutoTradesExecuted: number;
  winRatePercent: number;
  uptime24hSeconds: number;
  lastScanTime: string;
}

