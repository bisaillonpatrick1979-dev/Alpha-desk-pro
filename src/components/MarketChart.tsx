import React, { useState, useMemo } from 'react';
import { MarketAsset, FibonacciLevel } from '../types';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  FileText,
  Zap,
  Crosshair,
  Edit3,
  Type,
  Ruler,
  Magnet,
  Trash2,
  BarChart2,
  Grid,
  Percent,
  Sliders,
  Settings,
  RefreshCw,
  Eye,
  Layers,
} from 'lucide-react';

interface MarketChartProps {
  watchlist: MarketAsset[];
  selectedAsset: MarketAsset;
  onSelectAsset: (asset: MarketAsset) => void;
  userNotes: string;
  setUserNotes: (notes: string) => void;
  dataMode?: string;
  onOpenMultiTradeModal?: () => void;
}

type MarketCategoryFilter = 'ALL' | 'US Stock' | 'Japan Stock' | 'Australia Stock' | 'Forex' | 'CAD Stock' | 'Crypto/Commodities';
type TimeframeType = '1D' | '1W' | '1M' | '1Y' | '5Y';
type ChartStyleType = 'CANDLESTICK' | 'FIBONACCI' | 'AREA';

// Vrai composant de Chandelier Japonais TradingView avec Mèches (Wicks) nettes et Corps (Body)
const RealCandlestickShape = (props: any) => {
  const { x, width, payload, yAxis, y, height } = props;
  if (!payload) return null;

  const { open, high, low, close } = payload;
  if (open === undefined || high === undefined || low === undefined || close === undefined) return null;

  const isGreen = close >= open;
  // Couleurs officielles TradingView
  const color = isGreen ? '#089981' : '#f23645';

  let yHigh: number;
  let yLow: number;
  let yOpen: number;
  let yClose: number;

  if (yAxis && typeof yAxis.scale === 'function') {
    yHigh = yAxis.scale(high);
    yLow = yAxis.scale(low);
    yOpen = yAxis.scale(open);
    yClose = yAxis.scale(close);
  } else {
    yHigh = y;
    yLow = y + height;
    yOpen = close >= open ? y + height : y;
    yClose = close >= open ? y : y + height;
  }

  if (isNaN(yHigh) || isNaN(yLow) || isNaN(yOpen) || isNaN(yClose)) return null;

  const candleWidth = Math.max(5, Math.min(width * 0.7, 16));
  const candleX = x + (width - candleWidth) / 2;
  const wickX = x + width / 2;

  const bodyTop = Math.min(yOpen, yClose);
  const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));

  return (
    <g className="tradingview-candlestick">
      {/* 1. Mèche verticale continue du Plus Haut (High) au Plus Bas (Low) */}
      <line
        x1={wickX}
        y1={yHigh}
        x2={wickX}
        y2={yLow}
        stroke={color}
        strokeWidth={1.5}
      />

      {/* 2. Corps du Chandelier (Open-Close Body) */}
      <rect
        x={candleX}
        y={bodyTop}
        width={candleWidth}
        height={bodyHeight}
        fill={color}
        stroke={color}
        strokeWidth={1}
        rx={0.5}
      />
    </g>
  );
};

// Barres de Volume TradingView bas de graphique
const TradingViewVolumeShape = (props: any) => {
  const { x, width, y, height, payload } = props;
  if (!payload || height === undefined) return null;

  const isGreen = payload.close >= payload.open;
  const fillColor = isGreen ? 'rgba(8, 153, 129, 0.35)' : 'rgba(242, 54, 69, 0.35)';
  const strokeColor = isGreen ? '#089981' : '#f23645';

  const barWidth = Math.max(4, Math.min(width * 0.7, 14));
  const barX = x + (width - barWidth) / 2;

  return (
    <rect
      x={barX}
      y={y}
      width={barWidth}
      height={Math.max(1, height)}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={0.5}
    />
  );
};

// Tooltip interactif spécialisé pour Chandeliers Japonnais
const CandlestickTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  if (!data) return null;

  const isGreen = data.close >= data.open;
  const changeVal = Number((data.close - data.open).toFixed(2));
  const changePct = Number(((changeVal / data.open) * 100).toFixed(2));

  return (
    <div className="bg-[#0a0a0a]/95 border border-white/20 p-3 rounded-xl shadow-2xl font-mono text-xs space-y-1.5 min-w-[220px] backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
        <span className="text-white/60 font-bold">{data.time}</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
          isGreen ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
        }`}>
          {isGreen ? '🟢 HAUSSIER' : '🔴 BAISSIER'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <div className="text-white/70">Ouverture (O):</div>
        <div className="text-right font-bold text-white">${data.open}</div>

        <div className="text-emerald-400 font-medium">Pointe Haut (H):</div>
        <div className="text-right font-bold text-emerald-400">${data.high}</div>

        <div className="text-rose-400 font-medium">Pointe Bas (L):</div>
        <div className="text-right font-bold text-rose-400">${data.low}</div>

        <div className="text-white/70">Fermeture (C):</div>
        <div className="text-right font-bold text-white">${data.close}</div>
      </div>

      <div className="pt-1.5 border-t border-white/10 flex justify-between text-[10px]">
        <span className="text-white/50">Variation Chandelier:</span>
        <span className={`font-bold ${isGreen ? 'text-emerald-400' : 'text-rose-400'}`}>
          {changeVal >= 0 ? '+' : ''}{changeVal} $ ({changePct >= 0 ? '+' : ''}{changePct}%)
        </span>
      </div>
    </div>
  );
};

export const MarketChart: React.FC<MarketChartProps> = ({
  watchlist,
  selectedAsset,
  onSelectAsset,
  userNotes,
  setUserNotes,
  dataMode = 'LIVE_SIMULATED',
  onOpenMultiTradeModal,
}) => {
  const [activeMarketFilter, setActiveMarketFilter] = useState<MarketCategoryFilter>('ALL');
  const [timeframe, setTimeframe] = useState<TimeframeType>('1M');
  const [chartStyle, setChartStyle] = useState<ChartStyleType>('CANDLESTICK');
  
  // Technical Overlay Toggles
  const [showFibonacci, setShowFibonacci] = useState<boolean>(true);
  const [showMovingAverages, setShowMovingAverages] = useState<boolean>(true);
  const [showBollingerBands, setShowBollingerBands] = useState<boolean>(false);
  const [showSupportResistance, setShowSupportResistance] = useState<boolean>(true);
  const [showSubchart, setShowSubchart] = useState<'NONE' | 'RSI' | 'MACD'>('RSI');
  const [activeDrawingTool, setActiveDrawingTool] = useState<string>('crosshair');

  const filteredWatchlist = useMemo(() => {
    return watchlist.filter((item) => {
      if (activeMarketFilter === 'ALL') return true;
      if (activeMarketFilter === 'Crypto/Commodities') {
        return item.category === 'Crypto' || item.category === 'Commodities';
      }
      return item.category === activeMarketFilter;
    });
  }, [watchlist, activeMarketFilter]);

  const isPositive = selectedAsset.change24h >= 0;

  // Enriched Chart History Data
  const enrichedChartData = useMemo(() => {
    if (!selectedAsset.history) return [];

    return selectedAsset.history.map((candle, idx, arr) => {
      const period = Math.min(idx + 1, 20);
      const slice = arr.slice(Math.max(0, idx - 19), idx + 1);
      const avg = slice.reduce((sum, c) => sum + c.close, 0) / period;
      
      const variance = slice.reduce((sum, c) => sum + Math.pow(c.close - avg, 2), 0) / period;
      const stdDev = Math.sqrt(variance);

      const upperBand = Number((avg + stdDev * 2).toFixed(2));
      const lowerBand = Number((avg - stdDev * 2).toFixed(2));

      const isGreen = candle.close >= candle.open;

      return {
        ...candle,
        ma20: Number(avg.toFixed(2)),
        bollingerUpper: upperBand,
        bollingerLower: lowerBand,
        isGreen,
        candleColor: isGreen ? '#089981' : '#f23645',
        // Bar height for candlestick simulation
        candleRange: [candle.low, candle.high],
        bodyRange: [Math.min(candle.open, candle.close), Math.max(candle.open, candle.close)],
      };
    });
  }, [selectedAsset]);

  // Max volume calculation for volume bars histogram
  const maxVolume = useMemo(() => {
    if (!enrichedChartData || enrichedChartData.length === 0) return 100000;
    return Math.max(...enrichedChartData.map((d) => d.volume || 10000));
  }, [enrichedChartData]);

  // Compute dynamic Y-axis domain covering high and low wicks perfectly
  const yDomain = useMemo(() => {
    if (!enrichedChartData || enrichedChartData.length === 0) return ['auto', 'auto'];
    let minLow = Infinity;
    let maxHigh = -Infinity;
    enrichedChartData.forEach((candle) => {
      if (candle.low !== undefined && candle.low < minLow) minLow = candle.low;
      if (candle.high !== undefined && candle.high > maxHigh) maxHigh = candle.high;
    });
    if (minLow === Infinity || maxHigh === -Infinity) return ['auto', 'auto'];
    const diff = maxHigh - minLow;
    const pad = diff > 0 ? diff * 0.08 : 2;
    return [Number((minLow - pad).toFixed(2)), Number((maxHigh + pad).toFixed(2))];
  }, [enrichedChartData]);

  // Latest Candle OHLC
  const latestCandle = useMemo(() => {
    if (!selectedAsset.history || selectedAsset.history.length === 0) {
      return { open: selectedAsset.priceCAD, high: selectedAsset.priceCAD, low: selectedAsset.priceCAD, close: selectedAsset.priceCAD, volume: 0 };
    }
    return selectedAsset.history[selectedAsset.history.length - 1];
  }, [selectedAsset]);

  // Calculate High, Low & Fibonacci Retracement Levels for selected asset
  const fibonacciLevels = useMemo<FibonacciLevel[]>(() => {
    if (!selectedAsset.history || selectedAsset.history.length === 0) return [];

    const prices = selectedAsset.history.map((h) => h.close);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const diff = high - low;

    if (diff === 0) return [];

    return [
      { level: 1.0, label: '100% (Sommet)', price: Number(high.toFixed(2)), color: '#f23645' },
      { level: 0.786, label: '78.6% Retracement', price: Number((high - diff * 0.214).toFixed(2)), color: '#f59e0b' },
      { level: 0.618, label: '61.8% (Ratio d\'Or)', price: Number((high - diff * 0.382).toFixed(2)), color: '#00d2ff' },
      { level: 0.50, label: '50.0% Médiane', price: Number((high - diff * 0.50).toFixed(2)), color: '#a855f7' },
      { level: 0.382, label: '38.2% Support', price: Number((high - diff * 0.618).toFixed(2)), color: '#089981' },
      { level: 0.236, label: '23.6% Support Inf.', price: Number((high - diff * 0.764).toFixed(2)), color: '#3b82f6' },
      { level: 0.0, label: '0% (Creux)', price: Number(low.toFixed(2)), color: '#64748b' },
    ];
  }, [selectedAsset]);

  // Simulated Ask/Bid Spread for TradingView Order Execution Box
  const sellPrice = Number((selectedAsset.priceCAD * 0.9995).toFixed(3));
  const buyPrice = Number((selectedAsset.priceCAD * 1.0005).toFixed(3));
  const spreadVal = Number((buyPrice - sellPrice).toFixed(3));

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-5 relative overflow-hidden">
      
      {/* Category Tabs & Watchlist Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#00d2ff]/10 text-[#00d2ff] rounded-xl border border-[#00d2ff]/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Sélecteur de Marchés Internationaux & Graphiques
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                  {dataMode === 'BACKTEST_HISTORICAL' ? 'Backtest' : 'Flux Live'}
                </span>
              </h2>
            </div>
          </div>
          
          {/* Market Selection Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-[#050505] p-1 rounded-xl border border-white/10 text-xs font-mono font-bold">
            <button
              onClick={() => setActiveMarketFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeMarketFilter === 'ALL' ? 'bg-white/20 text-[#00d2ff]' : 'text-white/40 hover:text-white'
              }`}
            >
              🌎 Tous
            </button>
            <button
              onClick={() => setActiveMarketFilter('US Stock')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeMarketFilter === 'US Stock' ? 'bg-blue-500/30 text-blue-300 border border-blue-500/40' : 'text-white/40 hover:text-white'
              }`}
            >
              🇺🇸 USA
            </button>
            <button
              onClick={() => setActiveMarketFilter('Japan Stock')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeMarketFilter === 'Japan Stock' ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40' : 'text-white/40 hover:text-white'
              }`}
            >
              🇯🇵 Japon
            </button>
            <button
              onClick={() => setActiveMarketFilter('Australia Stock')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeMarketFilter === 'Australia Stock' ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40' : 'text-white/40 hover:text-white'
              }`}
            >
              🇦🇺 Australie
            </button>
            <button
              onClick={() => setActiveMarketFilter('Forex')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeMarketFilter === 'Forex' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' : 'text-white/40 hover:text-white'
              }`}
            >
              💱 Forex
            </button>
            <button
              onClick={() => setActiveMarketFilter('CAD Stock')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeMarketFilter === 'CAD Stock' ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40' : 'text-white/40 hover:text-white'
              }`}
            >
              🇨🇦 Canada
            </button>
            <button
              onClick={() => setActiveMarketFilter('Crypto/Commodities')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeMarketFilter === 'Crypto/Commodities' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40' : 'text-white/40 hover:text-white'
              }`}
            >
              ₿ Crypto/Matières
            </button>
          </div>
        </div>

        {/* Watchlist Horizontal Scroll Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto py-3 no-scrollbar">
          {filteredWatchlist.map((asset) => {
            const isSelected = asset.symbol === selectedAsset.symbol;
            const assetPos = asset.change24h >= 0;
            return (
              <button
                key={asset.symbol}
                onClick={() => onSelectAsset(asset)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl border transition-all text-left flex items-center space-x-3 ${
                  isSelected
                    ? 'bg-[#111] border-[#00d2ff] shadow-md ring-1 ring-[#00d2ff]/40'
                    : 'bg-[#050505] border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-extrabold text-xs text-white font-mono">{asset.symbol}</span>
                    <span className="text-[9px] text-white/40 px-1 py-0.2 bg-white/10 rounded">
                      {asset.category}
                    </span>
                  </div>
                  <div className="text-xs text-white font-mono font-bold mt-0.5">
                    {asset.priceCAD.toLocaleString('fr-CA')} $ CAD
                  </div>
                </div>
                <div className={`text-xs font-semibold flex items-center ${assetPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {assetPos ? '+' : ''}{asset.change24h}%
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Asset Header & TradingView Status Bar */}
      <div className="bg-[#050505] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
              <h3 className="text-xl font-extrabold text-white tracking-tight font-mono">{selectedAsset.symbol} / CAD</h3>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-[#089981]/20 text-[#089981] rounded-full border border-[#089981]/40">
                {selectedAsset.category} • 1D • Live
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-white/50 font-mono">
              <span>Nom: <strong className="text-white">{selectedAsset.name}</strong></span>
              <span>Vol. 24h: <strong className="text-white">{selectedAsset.volume24h}</strong></span>
              <span>Support: <strong className="text-[#089981]">{selectedAsset.support} $ CAD</strong></span>
              <span>Résistance: <strong className="text-[#f23645]">{selectedAsset.resistance} $ CAD</strong></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-mono font-extrabold text-white">
                {selectedAsset.priceCAD.toLocaleString('fr-CA')} $ CAD
              </div>
              <div className={`text-xs font-bold font-mono flex items-center justify-end space-x-1 ${isPositive ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{isPositive ? '+' : ''}{selectedAsset.change24h}% (24h)</span>
              </div>
            </div>

            {onOpenMultiTradeModal && (
              <button
                onClick={onOpenMultiTradeModal}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl flex items-center space-x-1.5 shadow-md transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>Multi-Trades ⚡</span>
              </button>
            )}
          </div>
        </div>

        {/* TradingView Live Candle OHLC Ribbon Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-[#111] px-3.5 py-2 rounded-xl border border-white/10 font-mono text-[11px] text-white/80">
          <span className="text-[#00d2ff] font-bold flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Candle OHLC:</span>
          </span>
          <span>O: <strong className="text-white">${latestCandle.open}</strong></span>
          <span>H: <strong className="text-[#089981]">${latestCandle.high}</strong></span>
          <span>L: <strong className="text-[#f23645]">${latestCandle.low}</strong></span>
          <span>C: <strong className={latestCandle.close >= latestCandle.open ? 'text-[#089981]' : 'text-[#f23645]'}>${latestCandle.close}</strong></span>
          <span className="text-white/40">|</span>
          <span>Vol: <strong className="text-amber-400">{latestCandle.volume ? latestCandle.volume.toLocaleString() : '427,410'}</strong></span>
        </div>
      </div>

      {/* Technical Drawing Toolbar (Timeframe, Style, Indicators) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#050505] p-2.5 rounded-xl border border-white/10 text-xs font-mono">
        
        {/* Timeframe Selector */}
        <div className="flex items-center space-x-1">
          <span className="text-[10px] uppercase text-white/40 mr-1.5 font-mono">Période:</span>
          {(['1D', '1W', '1M', '1Y', '5Y'] as TimeframeType[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                timeframe === tf
                  ? 'bg-[#00d2ff] text-black shadow-sm'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Chart Style Selector */}
        <div className="flex items-center space-x-1 text-xs">
          <button
            onClick={() => setChartStyle('CANDLESTICK')}
            className={`px-3 py-1 rounded-lg font-bold flex items-center space-x-1.5 transition-all ${
              chartStyle === 'CANDLESTICK'
                ? 'bg-[#089981]/20 text-[#089981] border border-[#089981]/40 shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <span>🕯️ Chandeliers Japonais</span>
          </button>

          <button
            onClick={() => setChartStyle('FIBONACCI')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center space-x-1 transition-all ${
              chartStyle === 'FIBONACCI'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5 text-purple-400" />
            <span>Fibonacci</span>
          </button>

          <button
            onClick={() => setChartStyle('AREA')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              chartStyle === 'AREA'
                ? 'bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Surface (Area)
          </button>
        </div>

        {/* Indicators Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFibonacci(!showFibonacci)}
            className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold transition-all ${
              showFibonacci
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[#111] text-white/40 border-white/10'
            }`}
          >
            Fibonacci (0.618)
          </button>

          <button
            onClick={() => setShowMovingAverages(!showMovingAverages)}
            className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold transition-all ${
              showMovingAverages
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-[#111] text-white/40 border-white/10'
            }`}
          >
            MM20 / MM50
          </button>

          <button
            onClick={() => setShowBollingerBands(!showBollingerBands)}
            className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold transition-all ${
              showBollingerBands
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-[#111] text-white/40 border-white/10'
            }`}
          >
            Bollinger
          </button>

          <button
            onClick={() => setShowSubchart(showSubchart === 'RSI' ? 'MACD' : showSubchart === 'MACD' ? 'NONE' : 'RSI')}
            className="px-2.5 py-1 rounded-lg bg-[#111] border border-white/10 text-white/70 hover:text-white font-mono text-[11px]"
          >
            Oscillateur: <strong className="text-[#00d2ff]">{showSubchart}</strong>
          </button>
        </div>

      </div>

      {/* Main TradingView Canvas with Drawing Toolbar & Quick Execution Box */}
      <div className="relative flex bg-[#050505] rounded-2xl border border-white/10 overflow-hidden min-h-[420px]">
        
        {/* TradingView Left Drawing Tools Sidebar */}
        <div className="w-11 bg-[#0a0a0a] border-r border-white/10 flex flex-col items-center py-3 space-y-2.5 z-10 flex-shrink-0">
          <button
            title="Curseur Réticule (Crosshair)"
            onClick={() => setActiveDrawingTool('crosshair')}
            className={`p-2 rounded-lg transition-all ${
              activeDrawingTool === 'crosshair' ? 'bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40' : 'text-white/40 hover:text-white'
            }`}
          >
            <Crosshair className="w-4 h-4" />
          </button>

          <button
            title="Ligne de Tendance / Support"
            onClick={() => setActiveDrawingTool('trendline')}
            className={`p-2 rounded-lg transition-all ${
              activeDrawingTool === 'trendline' ? 'bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40' : 'text-white/40 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
          </button>

          <button
            title="Niveaux Fibonacci"
            onClick={() => setActiveDrawingTool('fibonacci')}
            className={`p-2 rounded-lg transition-all ${
              activeDrawingTool === 'fibonacci' ? 'bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40' : 'text-white/40 hover:text-white'
            }`}
          >
            <Percent className="w-4 h-4" />
          </button>

          <button
            title="Pinceau de Tracé"
            onClick={() => setActiveDrawingTool('brush')}
            className={`p-2 rounded-lg transition-all ${
              activeDrawingTool === 'brush' ? 'bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40' : 'text-white/40 hover:text-white'
            }`}
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            title="Annotation Texte"
            onClick={() => setActiveDrawingTool('text')}
            className={`p-2 rounded-lg transition-all ${
              activeDrawingTool === 'text' ? 'bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40' : 'text-white/40 hover:text-white'
            }`}
          >
            <Type className="w-4 h-4" />
          </button>

          <button
            title="Règle de Mesure %"
            onClick={() => setActiveDrawingTool('ruler')}
            className={`p-2 rounded-lg transition-all ${
              activeDrawingTool === 'ruler' ? 'bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40' : 'text-white/40 hover:text-white'
            }`}
          >
            <Ruler className="w-4 h-4" />
          </button>

          <button
            title="Mode Aimant (Magnet)"
            onClick={() => setActiveDrawingTool('magnet')}
            className={`p-2 rounded-lg transition-all ${
              activeDrawingTool === 'magnet' ? 'bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40' : 'text-white/40 hover:text-white'
            }`}
          >
            <Magnet className="w-4 h-4" />
          </button>

          <div className="w-6 h-[1px] bg-white/10 my-1" />

          <button
            title="Effacer le tracé"
            onClick={() => setActiveDrawingTool('crosshair')}
            className="p-2 rounded-lg text-white/30 hover:text-rose-400 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Chart Canvas Area */}
        <div className="flex-1 p-3 relative h-96">
          
          {/* TradingView Quick Order Execution Box (Top-Left Overlay) */}
          <div className="absolute top-4 left-4 z-20 flex items-center bg-[#0a0a0a]/90 border border-white/20 rounded-xl p-1 shadow-2xl backdrop-blur-md font-mono text-[11px]">
            <button
              onClick={() => onOpenMultiTradeModal && onOpenMultiTradeModal()}
              className="px-2.5 py-1 bg-[#f23645]/20 hover:bg-[#f23645] text-[#f23645] hover:text-white border border-[#f23645]/40 rounded-lg font-bold transition-all flex flex-col items-center"
            >
              <span className="text-[9px] uppercase opacity-70">VENTE</span>
              <span>{sellPrice} $</span>
            </button>

            <div className="px-2 text-center text-white/50 font-bold text-[9px] flex flex-col">
              <span>SPREAD</span>
              <span className="text-amber-400">{spreadVal}</span>
            </div>

            <button
              onClick={() => onOpenMultiTradeModal && onOpenMultiTradeModal()}
              className="px-2.5 py-1 bg-[#089981]/20 hover:bg-[#089981] text-[#089981] hover:text-white border border-[#089981]/40 rounded-lg font-bold transition-all flex flex-col items-center"
            >
              <span className="text-[9px] uppercase opacity-70">ACHAT</span>
              <span>{buyPrice} $</span>
            </button>
          </div>

          {/* Dynamic Live Price Badge on Y-Axis */}
          <div className="absolute top-1/2 right-0 transform -translate-y-1/2 z-20 pointer-events-none">
            <span className={`px-2 py-0.5 rounded-l-md font-mono font-extrabold text-[10px] text-white shadow-lg animate-pulse ${
              isPositive ? 'bg-[#089981]' : 'bg-[#f23645]'
            }`}>
              ${selectedAsset.priceCAD}
            </span>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={enrichedChartData} margin={{ top: 15, right: 35, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradientTheme" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? '#089981' : '#f23645'} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={isPositive ? '#089981' : '#f23645'} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />

              <XAxis dataKey="time" stroke="rgba(255, 255, 255, 0.3)" tick={{ fontSize: 11 }} />

              <YAxis
                yAxisId="price"
                domain={yDomain as any}
                stroke="rgba(255, 255, 255, 0.3)"
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => `$${val}`}
              />

              <YAxis
                yAxisId="volume"
                domain={[0, maxVolume * 3.8]}
                hide
              />

              <Tooltip content={<CandlestickTooltip />} />

              {/* Volume Bars at Bottom of Chart Area */}
              <Bar
                yAxisId="volume"
                dataKey="volume"
                name="Volume"
                shape={<TradingViewVolumeShape />}
                isAnimationActive={false}
              />

              {/* Fibonacci Retracement Levels Reference Lines Overlay */}
              {showFibonacci &&
                fibonacciLevels.map((fib) => (
                  <ReferenceLine
                    yAxisId="price"
                    key={fib.level}
                    y={fib.price}
                    stroke={fib.color}
                    strokeDasharray={fib.level === 0.618 ? 'none' : '3 3'}
                    strokeWidth={fib.level === 0.618 ? 2 : 1}
                    label={{
                      value: `${fib.label} ($${fib.price})`,
                      fill: fib.color,
                      fontSize: 10,
                      position: 'right',
                    }}
                  />
                ))}

              {/* Support & Resistance Lines */}
              {showSupportResistance && (
                <>
                  <ReferenceLine
                    yAxisId="price"
                    y={selectedAsset.support}
                    stroke="#089981"
                    strokeDasharray="4 4"
                    label={{ value: `Support: $${selectedAsset.support}`, fill: '#089981', fontSize: 10 }}
                  />
                  <ReferenceLine
                    yAxisId="price"
                    y={selectedAsset.resistance}
                    stroke="#f23645"
                    strokeDasharray="4 4"
                    label={{ value: `Résistance: $${selectedAsset.resistance}`, fill: '#f23645', fontSize: 10 }}
                  />
                </>
              )}

              {/* Moving Average Line 20 */}
              {showMovingAverages && (
                <Line yAxisId="price" type="monotone" dataKey="ma20" name="MM20" stroke="#00d2ff" strokeWidth={1.5} dot={false} />
              )}

              {/* Bollinger Bands */}
              {showBollingerBands && (
                <>
                  <Line yAxisId="price" type="monotone" dataKey="bollingerUpper" name="Bande Sup." stroke="#a855f7" strokeDasharray="3 3" dot={false} />
                  <Line yAxisId="price" type="monotone" dataKey="bollingerLower" name="Bande Inf." stroke="#a855f7" strokeDasharray="3 3" dot={false} />
                </>
              )}

              {/* Candlestick or Area rendering */}
              {chartStyle === 'AREA' ? (
                <Area
                  yAxisId="price"
                  type="monotone"
                  dataKey="close"
                  name="Prix CAD"
                  stroke={isPositive ? '#089981' : '#f23645'}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#priceGradientTheme)"
                />
              ) : (
                <Bar
                  yAxisId="price"
                  dataKey="close"
                  name="Chandelier Japonais"
                  shape={<RealCandlestickShape />}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subchart for RSI or MACD */}
      {showSubchart !== 'NONE' && (
        <div className="h-28 w-full bg-[#050505] rounded-xl p-2 border border-white/10">
          <div className="text-[10px] text-white/50 uppercase font-mono px-2 mb-1">
            Oscillateur de Moment : <strong className="text-white">{showSubchart}</strong>
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <ComposedChart data={enrichedChartData} margin={{ top: 0, right: 35, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis dataKey="time" hide />
              <YAxis domain={showSubchart === 'RSI' ? [0, 100] : ['auto', 'auto']} stroke="rgba(255, 255, 255, 0.2)" tick={{ fontSize: 9 }} />
              {showSubchart === 'RSI' ? (
                <>
                  <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="2 2" />
                  <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="2 2" />
                  <Line type="monotone" dataKey="close" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                </>
              ) : (
                <Bar dataKey="close" fill="#00d2ff" radius={[2, 2, 0, 0]} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* User Notes Area */}
      <div className="bg-[#050505] p-3.5 rounded-2xl border border-white/10 space-y-2">
        <div className="flex items-center space-x-2 text-xs font-bold text-[#00d2ff]">
          <FileText className="w-4 h-4" />
          <span>Notes & Données d'Analyse Complémentaires (Modèle AI Context)</span>
        </div>
        <textarea
          value={userNotes}
          onChange={(e) => setUserNotes(e.target.value)}
          placeholder="Entrez vos remarques, rapports de bénéfices ou contextes macroéconomiques pour alimenter les agents AI..."
          className="w-full bg-[#111] border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#00d2ff] transition-all resize-none h-16"
        />
      </div>

    </div>
  );
};
