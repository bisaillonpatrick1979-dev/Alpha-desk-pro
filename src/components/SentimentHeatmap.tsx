import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, Sparkles, Layers, RefreshCw, Info } from 'lucide-react';
import { MarketAsset, AssetSentimentHeatmap, SentimentSource } from '../types';
import { rsi as rsiSeries } from '../lib/indicators';

interface SentimentHeatmapProps {
  watchlist: MarketAsset[];
}

const CATEGORIES = ['ALL', 'CAD Stock', 'US Stock', 'Crypto', 'Forex'] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

/**
 * Score de sentiment technique, dérivé de l'historique réel de l'actif.
 *
 * L'implémentation précédente calculait `Math.sin((assetIdx + 1) * (dayIdx + 2) * 0.8)`
 * — un motif décoratif sans lien avec le marché — tout en affichant un badge
 * « Agent Gemini Sentiment » et un compteur « 49 analyses / 100 % synchro ».
 * Ici les scores proviennent du RSI et du momentum de clôture de chaque journée,
 * et le badge indique explicitement la source réellement utilisée.
 */
function technicalSentiment(asset: MarketAsset, dayCount: number): number[] {
  const closes = asset.history.map((c) => c.close);
  const rsiValues = rsiSeries(closes, 14);
  const scores: number[] = [];

  for (let i = dayCount - 1; i >= 0; i--) {
    const index = closes.length - 1 - i;
    if (index < 1) {
      scores.push(50);
      continue;
    }

    const currentRsi = rsiValues[index];
    // Le RSI porte l'essentiel du signal ; le momentum sur 5 séances l'ajuste.
    const rsiComponent = currentRsi !== null ? currentRsi : 50;

    const lookback = Math.max(0, index - 5);
    const momentum = closes[lookback] > 0 ? ((closes[index] - closes[lookback]) / closes[lookback]) * 100 : 0;
    const momentumComponent = Math.max(-25, Math.min(25, momentum * 2.5));

    scores.push(Math.round(Math.max(2, Math.min(98, rsiComponent * 0.75 + 12.5 + momentumComponent))));
  }

  return scores;
}

const getScoreColor = (score: number) => {
  if (score >= 75) return 'bg-emerald-500 text-black font-bold';
  if (score >= 60) return 'bg-emerald-500/80 text-white font-semibold';
  if (score >= 50) return 'bg-[#00d2ff]/80 text-black font-semibold';
  if (score >= 40) return 'bg-amber-500/70 text-black font-semibold';
  if (score >= 25) return 'bg-rose-500/80 text-white font-semibold';
  return 'bg-rose-600 text-white font-bold';
};

const moodLabel = (score: number) => {
  if (score >= 75) return 'TRÈS HAUSSIER';
  if (score >= 60) return 'HAUSSIER';
  if (score >= 45) return 'NEUTRE';
  if (score >= 30) return 'BAISSIER';
  return 'TRÈS BAISSIER';
};

export const SentimentHeatmap: React.FC<SentimentHeatmapProps> = ({ watchlist }) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [source, setSource] = useState<SentimentSource>('TECHNIQUE');
  const [modelScores, setModelScores] = useState<Map<string, number[]> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const daysList = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return {
        dayLabel: d.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric' }),
        fullDate: d.toLocaleDateString('fr-CA'),
      };
    });
  }, []);

  /**
   * Les scores techniques sont recalculés à partir de l'historique, qui ne bouge
   * qu'à la marge à chaque tick. On mémoïse sur les symboles pour éviter que la
   * grille entière ne scintille toutes les 4 secondes.
   */
  const symbolKey = useMemo(() => watchlist.map((a) => a.symbol).join(','), [watchlist]);

  const heatmapData = useMemo<AssetSentimentHeatmap[]>(
    () =>
      watchlist.map((asset) => {
        const scores = modelScores?.get(asset.symbol) ?? technicalSentiment(asset, daysList.length);
        const normalised = daysList.map((day, i) => ({
          date: day.fullDate,
          dayLabel: day.dayLabel,
          score: Math.round(Math.max(0, Math.min(100, scores[i] ?? 50))),
          volumeWeight: Math.round((scores[i] ?? 50) * 1.2),
        }));

        return {
          symbol: asset.symbol,
          assetName: asset.name,
          category: asset.category,
          avg7dScore: Math.round(normalised.reduce((acc, d) => acc + d.score, 0) / normalised.length),
          dailyScores: normalised,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [symbolKey, daysList, modelScores]
  );

  const fetchModelSentiment = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/agents/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assets: watchlist.map((a) => ({
            symbol: a.symbol,
            rsi: a.rsi,
            change24h: a.change24h,
            macd: { histogram: a.macd.histogram },
          })),
        }),
      });

      const data = await response.json();

      if (data?.source === 'GEMINI' && Array.isArray(data.scores)) {
        const map = new Map<string, number[]>();
        data.scores.forEach((entry: any) => {
          if (entry?.symbol && Array.isArray(entry.dailyScores)) {
            map.set(entry.symbol, entry.dailyScores.map((s: any) => Number(s) || 50));
          }
        });
        setModelScores(map);
        setSource('GEMINI');
      } else {
        setModelScores(null);
        setSource('TECHNIQUE');
      }
    } catch {
      setModelScores(null);
      setSource('TECHNIQUE');
    } finally {
      setIsLoading(false);
    }
  }, [watchlist]);

  // Une seule tentative au montage : si aucun modèle n'est disponible, la vue
  // reste sur le calcul technique et l'annonce clairement.
  useEffect(() => {
    fetchModelSentiment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aggregateDailyTrend = useMemo(
    () =>
      daysList.map((day, dayIdx) => {
        const scores = heatmapData.map((asset) => asset.dailyScores[dayIdx]?.score ?? 50);
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / (scores.length || 1));
        return { date: day.dayLabel, sentimentIndex: avg, mood: moodLabel(avg) };
      }),
    [daysList, heatmapData]
  );

  const global7dScore = Math.round(
    aggregateDailyTrend.reduce((acc, d) => acc + d.sentimentIndex, 0) / (aggregateDailyTrend.length || 1)
  );

  const filteredHeatmap = heatmapData.filter(
    (item) => selectedCategory === 'ALL' || item.category === selectedCategory
  );

  const ranked = useMemo(() => [...heatmapData].sort((a, b) => b.avg7dScore - a.avg7dScore), [heatmapData]);
  const mostBullish = ranked[0];
  const mostBearish = ranked[ranked.length - 1];

  const isModelBacked = source === 'GEMINI';

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h2 className="font-bold text-white text-base tracking-tight">Heatmap de sentiment (7 jours)</h2>
              {/* Le badge reflète la source réellement utilisée pour les scores affichés. */}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                  isModelBacked
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : 'bg-white/10 text-white/60 border-white/20'
                }`}
              >
                {isModelBacked ? 'Analyse Gemini' : 'Calcul technique local'}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              {isModelBacked
                ? 'Scores produits par le modèle à partir des indicateurs transmis.'
                : 'Scores dérivés du RSI (14) et du momentum sur 5 séances de chaque actif.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchModelSentiment}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold bg-[#111] hover:bg-white/10 disabled:opacity-50 text-white border border-white/15 rounded-xl transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00d2ff] ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Analyse…' : 'Réanalyser'}</span>
          </button>

          <div className="flex items-center space-x-1 bg-[#050505] border border-white/10 rounded-xl p-1 text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                {cat === 'ALL' ? 'Tous' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!isModelBacked && (
        <div className="flex items-start gap-2 text-[11px] text-white/50 bg-[#050505] border border-white/10 rounded-xl p-3">
          <Info className="w-4 h-4 text-[#00d2ff] shrink-0 mt-0.5" />
          <p>
            Aucun modèle de langage n'est connecté (clé <code className="text-white/70">GEMINI_API_KEY</code> absente ou
            appel indisponible). Les scores ci-dessous sont calculés localement à partir des indicateurs techniques : ils
            ne reposent sur aucune analyse de presse ni donnée macroéconomique.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#050505] p-3.5 rounded-xl border border-white/10 space-y-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">Indice global (7 j)</span>
          <div className="flex items-center space-x-2">
            <span
              className={`text-xl font-mono font-extrabold ${
                global7dScore >= 60 ? 'text-emerald-400' : global7dScore >= 45 ? 'text-[#00d2ff]' : 'text-rose-400'
              }`}
            >
              {global7dScore} / 100
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/80 font-mono font-bold">
              {moodLabel(global7dScore)}
            </span>
          </div>
        </div>

        <div className="bg-[#050505] p-3.5 rounded-xl border border-white/10 space-y-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">
            Actif le plus haussier
          </span>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono font-bold text-emerald-400">{mostBullish?.symbol ?? '—'}</span>
            <span className="text-xs font-mono text-emerald-400 font-bold">{mostBullish?.avg7dScore ?? '—'} pts</span>
          </div>
        </div>

        <div className="bg-[#050505] p-3.5 rounded-xl border border-white/10 space-y-1">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">
            Pression baissière maximale
          </span>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono font-bold text-rose-400">{mostBearish?.symbol ?? '—'}</span>
            <span className="text-xs font-mono text-rose-400 font-bold">{mostBearish?.avg7dScore ?? '—'} pts</span>
          </div>
        </div>
      </div>

      <div className="bg-[#050505] p-4 rounded-xl border border-white/10 space-y-2">
        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          Évolution de l'indice agrégé
        </span>

        <div className="h-44 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={aggregateDailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="sentimentTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0a',
                  borderColor: 'rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
                formatter={(val: any) => [`${val} / 100`, 'Indice de sentiment']}
              />
              <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="3 3" />
              <ReferenceLine y={30} stroke="#f43f5e" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="sentimentIndex"
                stroke="#a855f7"
                strokeWidth={2.5}
                fill="url(#sentimentTrendGrad)"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#050505] p-4 rounded-xl border border-white/10 space-y-3">
        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <Layers className="w-4 h-4 text-[#00d2ff]" />
          Matrice par actif
        </span>

        <div className="overflow-x-auto">
          <div className="min-w-[640px] space-y-1.5">
            <div className="grid grid-cols-9 gap-1.5 items-center text-[10px] font-mono text-white/40 pb-1 border-b border-white/10">
              <div className="col-span-2 font-bold uppercase tracking-wider text-white/60">Actif</div>
              {daysList.map((d) => (
                <div key={d.fullDate} className="text-center font-bold">
                  {d.dayLabel}
                </div>
              ))}
            </div>

            {filteredHeatmap.length === 0 ? (
              <p className="text-xs text-white/40 font-mono py-4 text-center">Aucun actif dans cette catégorie.</p>
            ) : (
              filteredHeatmap.map((row) => (
                <div key={row.symbol} className="grid grid-cols-9 gap-1.5 items-center py-1 hover:bg-white/5 rounded-lg">
                  <div className="col-span-2 flex items-center justify-between pr-2">
                    <div className="min-w-0">
                      <span className="font-extrabold text-xs text-white font-mono block">{row.symbol}</span>
                      <span className="text-[9px] text-white/40 block truncate max-w-[120px]">{row.assetName}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-white/70 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                      {row.avg7dScore}
                    </span>
                  </div>

                  {row.dailyScores.map((day) => (
                    <div
                      key={`${row.symbol}-${day.date}`}
                      className={`h-9 rounded-lg flex items-center justify-center text-xs ${getScoreColor(day.score)}`}
                      title={`${row.symbol} — ${day.dayLabel} : ${day.score}/100 (${moodLabel(day.score)})`}
                    >
                      <span className="font-mono text-[11px] leading-none">{day.score}</span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10 text-[10px] text-white/40 font-mono">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> 75+ très haussier
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-[#00d2ff]/80 inline-block" /> 50-74 haussier
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-500/70 inline-block" /> 40-49 neutre
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-rose-500/80 inline-block" /> &lt;40 baissier
          </span>
        </div>
      </div>
    </div>
  );
};
