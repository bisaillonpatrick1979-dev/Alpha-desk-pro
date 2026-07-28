import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  Smile,
  Frown,
  Meh,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Info,
  Calendar,
  Layers,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { MarketAsset, AssetSentimentHeatmap, DailySentimentData } from '../types';

interface SentimentHeatmapProps {
  watchlist: MarketAsset[];
}

export const SentimentHeatmap: React.FC<SentimentHeatmapProps> = ({ watchlist }) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'CAD Stock' | 'US Stock' | 'Crypto'>('ALL');
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ symbol: string; dayLabel: string; score: number } | null>(null);

  // Generate 7 Days dates labels
  const daysList = useMemo(() => {
    const dates = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayLabel = d.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric' });
      const fullDate = d.toLocaleDateString('fr-CA');
      dates.push({ dayLabel, fullDate, offset: i });
    }
    return dates;
  }, []);

  // Generate 7-Day Asset Sentiment Grid Data based on watchlist
  const heatmapData = useMemo<AssetSentimentHeatmap[]>(() => {
    return watchlist.map((asset, assetIdx) => {
      // Seed deterministic & realistic sentiment scores based on 24h change & asset type
      const baseTrend = asset.change24h > 0 ? 65 : 42;
      const dailyScores = daysList.map((dayObj, dayIdx) => {
        const sineVar = Math.sin((assetIdx + 1) * (dayIdx + 2) * 0.8) * 22;
        const score = Math.min(98, Math.max(12, Math.round(baseTrend + sineVar + (dayIdx * 2.5))));
        return {
          date: dayObj.fullDate,
          dayLabel: dayObj.dayLabel,
          score,
          volumeWeight: Math.round(score * 1.2),
        };
      });

      const avg7dScore = Math.round(
        dailyScores.reduce((acc, curr) => acc + curr.score, 0) / dailyScores.length
      );

      return {
        symbol: asset.symbol,
        assetName: asset.name,
        category: asset.category,
        avg7dScore,
        dailyScores,
      };
    });
  }, [watchlist, daysList]);

  // Aggregate daily sentiment average for the Recharts trendline
  const aggregateDailyTrend = useMemo(() => {
    return daysList.map((dayObj, dayIdx) => {
      const dayScores = heatmapData.map((asset) => asset.dailyScores[dayIdx].score);
      const avgScore = Math.round(dayScores.reduce((a, b) => a + b, 0) / dayScores.length);

      let moodLabel = 'NEUTRE';
      if (avgScore >= 75) moodLabel = 'TRÈS HAUSSIER (Euphorie)';
      else if (avgScore >= 60) moodLabel = 'HAUSSIER';
      else if (avgScore <= 30) moodLabel = 'TRÈS BAISSIER (Peur)';
      else if (avgScore <= 45) moodLabel = 'BAISSIER';

      return {
        date: dayObj.dayLabel,
        fullDate: dayObj.fullDate,
        sentimentIndex: avgScore,
        moodLabel,
        bullishPercent: avgScore,
        bearishPercent: 100 - avgScore,
      };
    });
  }, [daysList, heatmapData]);

  // Overall Global Average Sentiment
  const global7dScore = Math.round(
    aggregateDailyTrend.reduce((acc, curr) => acc + curr.sentimentIndex, 0) / aggregateDailyTrend.length
  );

  const filteredHeatmap = heatmapData.filter(
    (item) => selectedCategory === 'ALL' || item.category === selectedCategory
  );

  // Get cell color mapping helper
  const getScoreColor = (score: number) => {
    if (score >= 75) return 'bg-emerald-500 text-black font-bold shadow-[0_0_10px_rgba(34,197,94,0.4)]';
    if (score >= 60) return 'bg-emerald-500/80 text-white font-semibold';
    if (score >= 50) return 'bg-[#00d2ff]/80 text-black font-semibold';
    if (score >= 40) return 'bg-amber-500/70 text-black font-semibold';
    if (score >= 25) return 'bg-rose-500/80 text-white font-semibold';
    return 'bg-rose-600 text-white font-bold shadow-[0_0_10px_rgba(244,63,94,0.4)]';
  };

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-5 relative overflow-hidden">
      
      {/* Background Subtle Accent Glow */}
      <div className="absolute top-0 left-1/3 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-white text-base tracking-tight">
                Visualiseur Heatmap du Sentiment Stratège (7 Jours)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                Agent Gemini Sentiment 🧠
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Agrégation des rapports d'humeur du marché, flux d'actualités et momentum institutionnel
            </p>
          </div>
        </div>

        {/* Filter Category Tabs */}
        <div className="flex items-center space-x-1 bg-[#050505] border border-white/10 rounded-xl p-1 text-xs">
          {(['ALL', 'CAD Stock', 'Crypto', 'US Stock'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold shadow-sm'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {cat === 'ALL' ? 'Tous' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Top Sentiment Index KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-[#050505] p-3.5 rounded-xl border border-white/10 space-y-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">
            Indice Globale (7j)
          </span>
          <div className="flex items-center space-x-2">
            <span className={`text-xl font-mono font-extrabold ${global7dScore >= 60 ? 'text-emerald-400' : global7dScore >= 45 ? 'text-[#00d2ff]' : 'text-rose-400'}`}>
              {global7dScore} / 100
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/80 font-mono font-bold">
              {global7dScore >= 60 ? 'HAUSSIER' : global7dScore >= 45 ? 'NEUTRE' : 'BAISSIER'}
            </span>
          </div>
        </div>

        <div className="bg-[#050505] p-3.5 rounded-xl border border-white/10 space-y-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">
            Top Actif le Plus Bullish
          </span>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono font-bold text-emerald-400">
              {heatmapData.length > 0 ? [...heatmapData].sort((a,b) => b.avg7dScore - a.avg7dScore)[0].symbol : 'SHOP.TO'}
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {heatmapData.length > 0 ? [...heatmapData].sort((a,b) => b.avg7dScore - a.avg7dScore)[0].avg7dScore : 84} pts
            </span>
          </div>
        </div>

        <div className="bg-[#050505] p-3.5 rounded-xl border border-white/10 space-y-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">
            Pression Bearish Max
          </span>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono font-bold text-rose-400">
              {heatmapData.length > 0 ? [...heatmapData].sort((a,b) => a.avg7dScore - b.avg7dScore)[0].symbol : 'RY.TO'}
            </span>
            <span className="text-xs font-mono text-rose-400 font-bold">
              {heatmapData.length > 0 ? [...heatmapData].sort((a,b) => a.avg7dScore - b.avg7dScore)[0].avg7dScore : 32} pts
            </span>
          </div>
        </div>

        <div className="bg-[#050505] p-3.5 rounded-xl border border-white/10 space-y-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">
            Rapports Traités par Gemini
          </span>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-white font-bold">49 Analyses / 7j</span>
            <span className="text-purple-300 font-bold">100% Synchro</span>
          </div>
        </div>
      </div>

      {/* Recharts 7-Day Market Sentiment Trend Line */}
      <div className="bg-[#050505] p-4 rounded-xl border border-white/10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            Évolution Chronologique de l'Indice de Sentiment
          </span>
          <div className="flex items-center space-x-3 text-[10px] font-mono text-white/50">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> &gt;75: Surchauffe
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400" /> &lt;30: Capitulation
            </span>
          </div>
        </div>

        <div className="h-44 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={aggregateDailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="sentimentTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />

              <XAxis dataKey="date" stroke="rgba(255, 255, 255, 0.3)" fontSize={10} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="rgba(255, 255, 255, 0.3)" fontSize={10} tickLine={false} />

              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0a',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  fontSize: '11px',
                  color: '#fff',
                }}
                formatter={(val: any) => [`${val} / 100`, 'Score Sentiment Agent']}
              />

              <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Zone Bullish', fill: '#22c55e', fontSize: 9 }} />
              <ReferenceLine y={30} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Zone Bearish', fill: '#f43f5e', fontSize: 9 }} />

              <Area
                type="monotone"
                dataKey="sentimentIndex"
                name="Score de Sentiment"
                stroke="#a855f7"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#sentimentTrendGrad)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive 7-Day Asset Matrix Grid (Heatmap) */}
      <div className="bg-[#050505] p-4 rounded-xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Layers className="w-4 h-4 text-[#00d2ff]" />
            Matrice Matrix Heatmap par Actif
          </span>
          <span className="text-[10px] text-white/40 font-mono">
            Survolez ou cliquez une case pour inspecter les micro-facteurs
          </span>
        </div>

        {/* Grid Matrix Header (Days) */}
        <div className="overflow-x-auto">
          <div className="min-w-[600px] space-y-1.5">
            
            {/* Column Headers (Days) */}
            <div className="grid grid-cols-9 gap-1.5 items-center text-[10px] font-mono text-white/40 pb-1 border-b border-white/10">
              <div className="col-span-2 font-bold uppercase tracking-wider text-white/60">Actif</div>
              {daysList.map((d) => (
                <div key={d.dayLabel} className="text-center font-bold">
                  {d.dayLabel}
                </div>
              ))}
            </div>

            {/* Matrix Rows (Assets) */}
            {filteredHeatmap.map((assetRow) => (
              <div
                key={assetRow.symbol}
                className="grid grid-cols-9 gap-1.5 items-center py-1 hover:bg-white/5 rounded-lg transition-all"
              >
                {/* Asset Label */}
                <div className="col-span-2 flex items-center justify-between pr-2">
                  <div>
                    <span className="font-extrabold text-xs text-white font-mono block">
                      {assetRow.symbol}
                    </span>
                    <span className="text-[9px] text-white/40 block truncate max-w-[100px]">
                      {assetRow.assetName}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-white/70 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                    {assetRow.avg7dScore}
                  </span>
                </div>

                {/* 7 Daily Heatmap Cells */}
                {assetRow.dailyScores.map((dayData) => (
                  <button
                    key={`${assetRow.symbol}-${dayData.date}`}
                    onMouseEnter={() => setHoveredCell({ symbol: assetRow.symbol, dayLabel: dayData.dayLabel, score: dayData.score })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => setSelectedAssetSymbol(assetRow.symbol)}
                    className={`h-9 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer text-xs ${getScoreColor(dayData.score)}`}
                    title={`${assetRow.symbol} (${dayData.dayLabel}): ${dayData.score}/100`}
                  >
                    <span className="font-mono text-[11px] leading-none">{dayData.score}</span>
                  </button>
                ))}
              </div>
            ))}

          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-white/10 text-[10px] text-white/40 font-mono">
          <div className="flex items-center space-x-3">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> 75+ Très Haussier
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-[#00d2ff]/80 inline-block" /> 50-74 Haussier
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-500/70 inline-block" /> 40-49 Neutre
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-rose-500/80 inline-block" /> &lt;40 Baissier
            </span>
          </div>

          {hoveredCell && (
            <div className="text-purple-300 font-bold animate-fade-in">
              Focus: {hoveredCell.symbol} ({hoveredCell.dayLabel}) → {hoveredCell.score}/100
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
