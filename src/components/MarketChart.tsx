import React, { useState, useMemo } from 'react';
import { MarketAsset, FibonacciLevel, MarketCandle } from '../types';
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
  Cell,
} from 'recharts';
import { Activity, TrendingUp, TrendingDown, FileText, Zap, BarChart2, Grid } from 'lucide-react';
import { TIMEFRAMES, TIMEFRAME_ORDER, TimeframeKey, getSeries } from '../lib/marketData';
import { macd as macdSeries, rsi as rsiSeries, sma } from '../lib/indicators';

interface MarketChartProps {
  watchlist: MarketAsset[];
  selectedAsset: MarketAsset;
  onSelectAsset: (asset: MarketAsset) => void;
  userNotes: string;
  setUserNotes: (notes: string) => void;
  dataMode?: string;
  onOpenMultiTradeModal?: () => void;
}

type MarketCategoryFilter =
  | 'ALL'
  | 'US Stock'
  | 'Japan Stock'
  | 'Australia Stock'
  | 'Forex'
  | 'CAD Stock'
  | 'Crypto/Commodities';
type ChartStyleType = 'CANDLESTICK' | 'AREA';

const UP = '#089981';
const DOWN = '#f23645';

interface ChartRow extends MarketCandle {
  /** Étendue mèche basse → mèche haute ; c'est cette plage que recharts met à l'échelle. */
  wick: [number, number];
  ma20: number | null;
  ma50: number | null;
  bollingerUpper: number | null;
  bollingerLower: number | null;
  rsi: number | null;
  macdLine: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
}

/**
 * Chandelier japonais.
 *
 * La barre porte la plage [low, high], donc `y` et `height` fournis par recharts
 * correspondent exactement aux mèches. Le corps est positionné par interpolation
 * linéaire dans cette plage, sans dépendre d'un objet d'échelle interne — la
 * version précédente lisait `props.yAxis.scale`, absent du contrat de `shape`,
 * et retombait sur une barre ancrée au plancher de l'axe : des colonnes pleines
 * au lieu de chandeliers.
 */
const CandlestickShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload || typeof y !== 'number' || typeof height !== 'number') return null;

  const { open, close, high, low } = payload as ChartRow;
  if (![open, close, high, low].every((v) => typeof v === 'number' && Number.isFinite(v))) return null;

  const range = high - low;
  const priceToY = (price: number) => (range === 0 ? y + height / 2 : y + ((high - price) / range) * height);

  const isUp = close >= open;
  const color = isUp ? UP : DOWN;

  const bodyWidth = Math.max(3, Math.min(width * 0.7, 14));
  const bodyX = x + (width - bodyWidth) / 2;
  const wickX = x + width / 2;

  const yOpen = priceToY(open);
  const yClose = priceToY(close);
  const bodyTop = Math.min(yOpen, yClose);
  // Un doji (ouverture = clôture) doit rester visible : hauteur plancher de 1 px.
  const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));

  return (
    <g>
      <line x1={wickX} y1={y} x2={wickX} y2={y + height} stroke={color} strokeWidth={1.25} />
      <rect x={bodyX} y={bodyTop} width={bodyWidth} height={bodyHeight} fill={color} stroke={color} strokeWidth={1} />
    </g>
  );
};

const VolumeShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload || typeof height !== 'number') return null;

  const isUp = payload.close >= payload.open;
  const barWidth = Math.max(3, Math.min(width * 0.7, 14));

  return (
    <rect
      x={x + (width - barWidth) / 2}
      y={y}
      width={barWidth}
      height={Math.max(1, height)}
      fill={isUp ? 'rgba(8, 153, 129, 0.35)' : 'rgba(242, 54, 69, 0.35)'}
      stroke={isUp ? UP : DOWN}
      strokeWidth={0.5}
    />
  );
};

const CandlestickTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload as ChartRow | undefined;
  if (!data) return null;

  const isUp = data.close >= data.open;
  const change = data.close - data.open;
  const changePct = data.open === 0 ? 0 : (change / data.open) * 100;
  const fmt = (v: number) => v.toLocaleString('fr-CA', { maximumFractionDigits: 4 });

  return (
    <div className="bg-[#0a0a0a]/95 border border-white/20 p-3 rounded-xl shadow-2xl font-mono text-xs space-y-1.5 min-w-[220px] backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
        <span className="text-white/60 font-bold">{data.time}</span>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
            isUp
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}
        >
          {isUp ? 'HAUSSIER' : 'BAISSIER'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <div className="text-white/70">Ouverture (O)</div>
        <div className="text-right font-bold text-white">{fmt(data.open)} $</div>
        <div className="text-emerald-400 font-medium">Plus haut (H)</div>
        <div className="text-right font-bold text-emerald-400">{fmt(data.high)} $</div>
        <div className="text-rose-400 font-medium">Plus bas (L)</div>
        <div className="text-right font-bold text-rose-400">{fmt(data.low)} $</div>
        <div className="text-white/70">Clôture (C)</div>
        <div className="text-right font-bold text-white">{fmt(data.close)} $</div>
        {data.rsi !== null && (
          <>
            <div className="text-amber-400 font-medium">RSI (14)</div>
            <div className="text-right font-bold text-amber-400">{data.rsi.toFixed(1)}</div>
          </>
        )}
      </div>

      <div className="pt-1.5 border-t border-white/10 flex justify-between text-[10px]">
        <span className="text-white/50">Variation de la bougie</span>
        <span className={`font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
          {change >= 0 ? '+' : ''}
          {fmt(change)} $ ({changePct >= 0 ? '+' : ''}
          {changePct.toFixed(2)} %)
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
  const [timeframe, setTimeframe] = useState<TimeframeKey>('1M');
  const [chartStyle, setChartStyle] = useState<ChartStyleType>('CANDLESTICK');

  const [showFibonacci, setShowFibonacci] = useState(false);
  const [showMovingAverages, setShowMovingAverages] = useState(true);
  const [showBollingerBands, setShowBollingerBands] = useState(false);
  const [showSupportResistance, setShowSupportResistance] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [subchart, setSubchart] = useState<'NONE' | 'RSI' | 'MACD'>('RSI');

  const filteredWatchlist = useMemo(
    () =>
      watchlist.filter((item) => {
        if (activeMarketFilter === 'ALL') return true;
        if (activeMarketFilter === 'Crypto/Commodities') {
          return item.category === 'Crypto' || item.category === 'Commodities';
        }
        return item.category === activeMarketFilter;
      }),
    [watchlist, activeMarketFilter]
  );

  const isPositive = selectedAsset.change24h >= 0;

  /**
   * Série affichée pour le pas de temps choisi, enrichie des indicateurs.
   * Le sélecteur de période était auparavant purement décoratif : le graphique
   * affichait toujours les mêmes 30 bougies quel que soit le bouton actif.
   */
  const chartData = useMemo<ChartRow[]>(() => {
    const candles = getSeries(selectedAsset, timeframe);
    if (candles.length === 0) return [];

    const closes = candles.map((c) => c.close);
    const ma20 = sma(closes, 20);
    const ma50 = sma(closes, 50);
    const rsiValues = rsiSeries(closes, 14);
    const macdValues = macdSeries(closes);

    return candles.map((candle, i) => {
      // Bandes de Bollinger sur 20 périodes, écart-type réel de la fenêtre.
      const window = closes.slice(Math.max(0, i - 19), i + 1);
      const mean = window.reduce((s, v) => s + v, 0) / window.length;
      const variance = window.reduce((s, v) => s + (v - mean) ** 2, 0) / window.length;
      const stdDev = Math.sqrt(variance);
      const hasBands = i >= 19;

      return {
        ...candle,
        wick: [candle.low, candle.high] as [number, number],
        ma20: ma20[i],
        ma50: ma50[i],
        bollingerUpper: hasBands ? mean + stdDev * 2 : null,
        bollingerLower: hasBands ? mean - stdDev * 2 : null,
        rsi: rsiValues[i],
        macdLine: macdValues.macdLine[i],
        macdSignal: macdValues.signalLine[i],
        macdHistogram: macdValues.histogram[i],
      };
    });
  }, [selectedAsset, timeframe]);

  const maxVolume = useMemo(
    () => (chartData.length ? Math.max(...chartData.map((d) => d.volume || 1)) : 1),
    [chartData]
  );

  const yDomain = useMemo<[number, number] | ['auto', 'auto']>(() => {
    if (chartData.length === 0) return ['auto', 'auto'];
    const lows = chartData.map((c) => c.low);
    const highs = chartData.map((c) => c.high);
    const minLow = Math.min(...lows);
    const maxHigh = Math.max(...highs);
    const span = maxHigh - minLow;
    const pad = span > 0 ? span * 0.08 : Math.max(maxHigh * 0.01, 0.01);
    return [minLow - pad, maxHigh + pad];
  }, [chartData]);

  const latestCandle = chartData[chartData.length - 1];

  const fibonacciLevels = useMemo<FibonacciLevel[]>(() => {
    if (chartData.length === 0) return [];
    const high = Math.max(...chartData.map((c) => c.high));
    const low = Math.min(...chartData.map((c) => c.low));
    const diff = high - low;
    if (diff === 0) return [];

    const at = (retracement: number) => Number((high - diff * retracement).toFixed(4));
    return [
      { level: 1.0, label: '100 % (Sommet)', price: Number(high.toFixed(4)), color: DOWN },
      { level: 0.786, label: '78,6 %', price: at(0.214), color: '#f59e0b' },
      { level: 0.618, label: "61,8 % (Ratio d'or)", price: at(0.382), color: '#00d2ff' },
      { level: 0.5, label: '50,0 %', price: at(0.5), color: '#a855f7' },
      { level: 0.382, label: '38,2 %', price: at(0.618), color: UP },
      { level: 0.236, label: '23,6 %', price: at(0.764), color: '#3b82f6' },
      { level: 0.0, label: '0 % (Creux)', price: Number(low.toFixed(4)), color: '#64748b' },
    ];
  }, [chartData]);

  const priceFmt = (value: number) =>
    value.toLocaleString('fr-CA', { maximumFractionDigits: selectedAsset.priceCAD < 10 ? 4 : 2 });

  const spread = Number((selectedAsset.priceCAD * 0.0005).toFixed(4));
  const bidPrice = Number((selectedAsset.priceCAD - spread).toFixed(4));
  const askPrice = Number((selectedAsset.priceCAD + spread).toFixed(4));

  const toggleClass = (active: boolean, activeClasses: string) =>
    `px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold transition-all ${
      active ? activeClasses : 'bg-[#111] text-white/40 border-white/10 hover:text-white/70'
    }`;

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-5 relative overflow-hidden">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#00d2ff]/10 text-[#00d2ff] rounded-xl border border-[#00d2ff]/20">
              <Activity className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Sélecteur de marchés internationaux
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                {dataMode === 'BACKTEST_HISTORICAL' ? 'Backtest' : 'Flux simulé'}
              </span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-[#050505] p-1 rounded-xl border border-white/10 text-xs font-mono font-bold">
            {(
              [
                ['ALL', '🌎 Tous', 'bg-white/20 text-[#00d2ff]'],
                ['US Stock', '🇺🇸 USA', 'bg-blue-500/30 text-blue-300 border border-blue-500/40'],
                ['Japan Stock', '🇯🇵 Japon', 'bg-rose-500/30 text-rose-300 border border-rose-500/40'],
                ['Australia Stock', '🇦🇺 Australie', 'bg-amber-500/30 text-amber-300 border border-amber-500/40'],
                ['Forex', '💱 Forex', 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'],
                ['CAD Stock', '🇨🇦 Canada', 'bg-purple-500/30 text-purple-300 border border-purple-500/40'],
                ['Crypto/Commodities', '₿ Crypto/Matières', 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'],
              ] as [MarketCategoryFilter, string, string][]
            ).map(([value, label, activeClass]) => (
              <button
                key={value}
                onClick={() => setActiveMarketFilter(value)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeMarketFilter === value ? activeClass : 'text-white/40 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto py-3">
          {filteredWatchlist.length === 0 ? (
            <p className="text-xs text-white/40 font-mono py-2">Aucun actif dans cette catégorie.</p>
          ) : (
            filteredWatchlist.map((asset) => {
              const isSelected = asset.symbol === selectedAsset.symbol;
              const assetUp = asset.change24h >= 0;
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
                      <span className="text-[9px] text-white/40 px-1 bg-white/10 rounded">{asset.category}</span>
                    </div>
                    <div className="text-xs text-white font-mono font-bold mt-0.5">
                      {asset.priceCAD.toLocaleString('fr-CA')} $ CAD
                    </div>
                  </div>
                  <div className={`text-xs font-semibold ${assetUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {assetUp ? '+' : ''}
                    {asset.change24h.toFixed(2)} %
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-[#050505] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
              <h3 className="text-xl font-extrabold text-white tracking-tight font-mono">
                {selectedAsset.symbol} / CAD
              </h3>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-[#089981]/20 text-[#089981] rounded-full border border-[#089981]/40">
                {selectedAsset.category} • {TIMEFRAMES[timeframe].label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-white/50 font-mono">
              <span>
                Nom : <strong className="text-white">{selectedAsset.name}</strong>
              </span>
              <span>
                Vol. 24 h : <strong className="text-white">{selectedAsset.volume24h}</strong>
              </span>
              <span>
                Support : <strong className="text-[#089981]">{priceFmt(selectedAsset.support)} $</strong>
              </span>
              <span>
                Résistance : <strong className="text-[#f23645]">{priceFmt(selectedAsset.resistance)} $</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-mono font-extrabold text-white">
                {selectedAsset.priceCAD.toLocaleString('fr-CA')} $ CAD
              </div>
              <div
                className={`text-xs font-bold font-mono flex items-center justify-end space-x-1 ${
                  isPositive ? 'text-[#089981]' : 'text-[#f23645]'
                }`}
              >
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>
                  {isPositive ? '+' : ''}
                  {selectedAsset.change24h.toFixed(2)} % (24 h)
                </span>
              </div>
            </div>

            {onOpenMultiTradeModal && (
              <button
                onClick={onOpenMultiTradeModal}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl flex items-center space-x-1.5 shadow-md transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>Multi-Trades</span>
              </button>
            )}
          </div>
        </div>

        {latestCandle && (
          <div className="flex flex-wrap items-center gap-3 bg-[#111] px-3.5 py-2 rounded-xl border border-white/10 font-mono text-[11px] text-white/80">
            <span className="text-[#00d2ff] font-bold flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Dernière bougie</span>
            </span>
            <span>
              O : <strong className="text-white">{priceFmt(latestCandle.open)}</strong>
            </span>
            <span>
              H : <strong className="text-[#089981]">{priceFmt(latestCandle.high)}</strong>
            </span>
            <span>
              L : <strong className="text-[#f23645]">{priceFmt(latestCandle.low)}</strong>
            </span>
            <span>
              C :{' '}
              <strong className={latestCandle.close >= latestCandle.open ? 'text-[#089981]' : 'text-[#f23645]'}>
                {priceFmt(latestCandle.close)}
              </strong>
            </span>
            <span className="text-white/40">|</span>
            <span>
              RSI :{' '}
              <strong className="text-amber-400">
                {latestCandle.rsi !== null ? latestCandle.rsi.toFixed(1) : 'n/d'}
              </strong>
            </span>
            <span>
              Vol. : <strong className="text-amber-400">{latestCandle.volume.toLocaleString('fr-CA')}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#050505] p-2.5 rounded-xl border border-white/10 text-xs font-mono">
        <div className="flex items-center space-x-1">
          <span className="text-[10px] uppercase text-white/40 mr-1.5">Période</span>
          {TIMEFRAME_ORDER.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                timeframe === tf ? 'bg-[#00d2ff] text-black shadow-sm' : 'text-white/50 hover:text-white'
              }`}
            >
              {TIMEFRAMES[tf].label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setChartStyle('CANDLESTICK')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              chartStyle === 'CANDLESTICK'
                ? 'bg-[#089981]/20 text-[#089981] border border-[#089981]/40'
                : 'text-white/50 hover:text-white'
            }`}
          >
            🕯️ Chandeliers
          </button>
          <button
            onClick={() => setChartStyle('AREA')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              chartStyle === 'AREA'
                ? 'bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Surface
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFibonacci((v) => !v)}
            className={toggleClass(showFibonacci, 'bg-amber-500/20 text-amber-300 border-amber-500/40')}
          >
            <Grid className="w-3 h-3 inline mr-1" />
            Fibonacci
          </button>
          <button
            onClick={() => setShowMovingAverages((v) => !v)}
            className={toggleClass(showMovingAverages, 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40')}
          >
            MM20 / MM50
          </button>
          <button
            onClick={() => setShowBollingerBands((v) => !v)}
            className={toggleClass(showBollingerBands, 'bg-purple-500/20 text-purple-300 border-purple-500/40')}
          >
            Bollinger
          </button>
          <button
            onClick={() => setShowSupportResistance((v) => !v)}
            className={toggleClass(showSupportResistance, 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40')}
          >
            Support / Rés.
          </button>
          <button
            onClick={() => setShowVolume((v) => !v)}
            className={toggleClass(showVolume, 'bg-white/15 text-white border-white/30')}
          >
            Volume
          </button>
          <button
            onClick={() => setSubchart(subchart === 'RSI' ? 'MACD' : subchart === 'MACD' ? 'NONE' : 'RSI')}
            className="px-2.5 py-1 rounded-lg bg-[#111] border border-white/10 text-white/70 hover:text-white font-mono text-[11px]"
          >
            Oscillateur : <strong className="text-[#00d2ff]">{subchart}</strong>
          </button>
        </div>
      </div>

      <div className="relative bg-[#050505] rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-3 relative h-96">
          <div className="absolute top-4 left-4 z-20 flex items-center bg-[#0a0a0a]/90 border border-white/20 rounded-xl p-1 shadow-2xl backdrop-blur-md font-mono text-[11px]">
            <div className="px-2.5 py-1 bg-[#f23645]/15 text-[#f23645] border border-[#f23645]/40 rounded-lg font-bold flex flex-col items-center">
              <span className="text-[9px] uppercase opacity-70">Vente (bid)</span>
              <span>{bidPrice.toLocaleString('fr-CA')} $</span>
            </div>
            <div className="px-2 text-center text-white/50 font-bold text-[9px] flex flex-col">
              <span>SPREAD</span>
              <span className="text-amber-400">{(askPrice - bidPrice).toFixed(4)}</span>
            </div>
            <div className="px-2.5 py-1 bg-[#089981]/15 text-[#089981] border border-[#089981]/40 rounded-lg font-bold flex flex-col items-center">
              <span className="text-[9px] uppercase opacity-70">Achat (ask)</span>
              <span>{askPrice.toLocaleString('fr-CA')} $</span>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-white/40 font-mono">
              Aucune donnée disponible pour cette période.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 15, right: 60, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGradientTheme" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isPositive ? UP : DOWN} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={isPositive ? UP : DOWN} stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis
                  yAxisId="price"
                  domain={yDomain as any}
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => priceFmt(Number(v))}
                  width={70}
                />
                <YAxis yAxisId="volume" domain={[0, maxVolume * 4]} hide />

                <Tooltip content={<CandlestickTooltip />} />

                {showVolume && (
                  <Bar yAxisId="volume" dataKey="volume" name="Volume" shape={<VolumeShape />} isAnimationActive={false} />
                )}

                {showFibonacci &&
                  fibonacciLevels.map((fib) => (
                    <ReferenceLine
                      yAxisId="price"
                      key={fib.level}
                      y={fib.price}
                      stroke={fib.color}
                      strokeDasharray={fib.level === 0.618 ? undefined : '3 3'}
                      strokeWidth={fib.level === 0.618 ? 2 : 1}
                      label={{ value: fib.label, fill: fib.color, fontSize: 9, position: 'right' }}
                    />
                  ))}

                {showSupportResistance && (
                  <>
                    <ReferenceLine
                      yAxisId="price"
                      y={selectedAsset.support}
                      stroke={UP}
                      strokeDasharray="4 4"
                      label={{ value: 'Support', fill: UP, fontSize: 10, position: 'right' }}
                    />
                    <ReferenceLine
                      yAxisId="price"
                      y={selectedAsset.resistance}
                      stroke={DOWN}
                      strokeDasharray="4 4"
                      label={{ value: 'Résistance', fill: DOWN, fontSize: 10, position: 'right' }}
                    />
                  </>
                )}

                {showBollingerBands && (
                  <>
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="bollingerUpper"
                      name="Bande sup."
                      stroke="#a855f7"
                      strokeDasharray="3 3"
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="bollingerLower"
                      name="Bande inf."
                      stroke="#a855f7"
                      strokeDasharray="3 3"
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  </>
                )}

                {showMovingAverages && (
                  <>
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="ma20"
                      name="MM20"
                      stroke="#00d2ff"
                      strokeWidth={1.5}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="ma50"
                      name="MM50"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  </>
                )}

                {chartStyle === 'AREA' ? (
                  <Area
                    yAxisId="price"
                    type="monotone"
                    dataKey="close"
                    name="Prix CAD"
                    stroke={isPositive ? UP : DOWN}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#priceGradientTheme)"
                    isAnimationActive={false}
                  />
                ) : (
                  <Bar
                    yAxisId="price"
                    dataKey="wick"
                    name="Chandelier"
                    shape={<CandlestickShape />}
                    isAnimationActive={false}
                  />
                )}

                <ReferenceLine
                  yAxisId="price"
                  y={selectedAsset.priceCAD}
                  stroke={isPositive ? UP : DOWN}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  label={{
                    value: `${selectedAsset.priceCAD.toLocaleString('fr-CA')}`,
                    fill: '#fff',
                    fontSize: 10,
                    position: 'right',
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Sous-graphique d'oscillateur. Il traçait auparavant `close` — donc le prix —
          sur une échelle 0-100 avec des seuils RSI à 70/30, ce qui n'avait aucun sens. */}
      {subchart !== 'NONE' && chartData.length > 0 && (
        <div className="h-32 w-full bg-[#050505] rounded-xl p-2 border border-white/10">
          <div className="text-[10px] text-white/50 uppercase font-mono px-2 mb-1">
            {subchart === 'RSI' ? (
              <>
                Oscillateur RSI (14) — dernier :{' '}
                <strong className="text-amber-400">
                  {latestCandle?.rsi !== null && latestCandle?.rsi !== undefined
                    ? latestCandle.rsi.toFixed(1)
                    : 'n/d'}
                </strong>
              </>
            ) : (
              <>
                MACD (12, 26, 9) — histogramme :{' '}
                <strong className="text-[#00d2ff]">
                  {latestCandle?.macdHistogram !== null && latestCandle?.macdHistogram !== undefined
                    ? latestCandle.macdHistogram.toFixed(4)
                    : 'n/d'}
                </strong>
              </>
            )}
          </div>

          <ResponsiveContainer width="100%" height="82%">
            <ComposedChart data={chartData} margin={{ top: 0, right: 60, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" hide />
              <YAxis
                domain={subchart === 'RSI' ? [0, 100] : ['auto', 'auto']}
                stroke="rgba(255,255,255,0.2)"
                tick={{ fontSize: 9 }}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0a',
                  borderColor: 'rgba(255,255,255,0.15)',
                  borderRadius: '10px',
                  fontSize: '11px',
                }}
                formatter={(value: any, name: any) => [
                  typeof value === 'number' ? value.toFixed(4) : value,
                  name,
                ]}
              />

              {subchart === 'RSI' ? (
                <>
                  <ReferenceLine y={70} stroke={DOWN} strokeDasharray="2 2" />
                  <ReferenceLine y={30} stroke={UP} strokeDasharray="2 2" />
                  <Line
                    type="monotone"
                    dataKey="rsi"
                    name="RSI (14)"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                </>
              ) : (
                <>
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" />
                  <Bar dataKey="macdHistogram" name="Histogramme" isAnimationActive={false}>
                    {chartData.map((row, i) => (
                      <Cell key={i} fill={(row.macdHistogram ?? 0) >= 0 ? UP : DOWN} />
                    ))}
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="macdLine"
                    name="MACD"
                    stroke="#00d2ff"
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="macdSignal"
                    name="Signal"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-[#050505] p-3.5 rounded-2xl border border-white/10 space-y-2">
        <div className="flex items-center space-x-2 text-xs font-bold text-[#00d2ff]">
          <FileText className="w-4 h-4" />
          <span>Notes transmises aux agents avec la prochaine délibération</span>
        </div>
        <textarea
          value={userNotes}
          onChange={(e) => setUserNotes(e.target.value)}
          placeholder="Résultats trimestriels, contexte macroéconomique, contraintes personnelles…"
          className="w-full bg-[#111] border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#00d2ff] transition-all resize-none h-16"
        />
      </div>
    </div>
  );
};
