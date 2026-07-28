import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';
import { TrendingUp, Calendar, BarChart2, Layers, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import { PortfolioSettings, HistoricalTrade, TradePosition, EquitySnapshot } from '../types';

interface PortfolioHistoryChartProps {
  settings: PortfolioSettings;
  closedTrades: HistoricalTrade[];
  openPositions: TradePosition[];
  equityHistory: EquitySnapshot[];
  currentEquity: number;
}

type ChartViewMode = 'CAPITAL' | 'CUMULATIVE_PNL' | 'DAILY_PERF';
type TimeRangeMode = '7D' | '14D' | '30D';

const DAY_MS = 24 * 60 * 60 * 1000;

export const PortfolioHistoryChart: React.FC<PortfolioHistoryChartProps> = ({
  settings,
  closedTrades,
  openPositions,
  equityHistory,
  currentEquity,
}) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>('CAPITAL');
  const [timeRange, setTimeRange] = useState<TimeRangeMode>('30D');

  const days = timeRange === '7D' ? 7 : timeRange === '14D' ? 14 : 30;

  /**
   * Courbe reconstruite à partir de mesures réelles : les relevés d'équité
   * enregistrés par l'application et les transactions effectivement clôturées.
   *
   * L'implémentation précédente fabriquait la courbe avec `Math.sin()`, un terme
   * de bruit et un `Math.random()` recalculé à chaque rendu — un graphique
   * décoratif présenté comme un historique de performance.
   */
  const historyData = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // P&L réalisé agrégé par journée.
    const realizedByDay = new Map<number, number>();
    closedTrades.forEach((trade) => {
      const dayStart = new Date(trade.closedAt || now);
      dayStart.setHours(0, 0, 0, 0);
      realizedByDay.set(dayStart.getTime(), (realizedByDay.get(dayStart.getTime()) ?? 0) + trade.pnlCAD);
    });

    // Dernier relevé d'équité connu pour chaque journée.
    const snapshotByDay = new Map<number, EquitySnapshot>();
    equityHistory.forEach((snapshot) => {
      const dayStart = new Date(snapshot.t);
      dayStart.setHours(0, 0, 0, 0);
      snapshotByDay.set(dayStart.getTime(), snapshot);
    });

    // Capital au début de la fenêtre : on retire le P&L réalisé depuis lors.
    const windowStart = startOfToday.getTime() - (days - 1) * DAY_MS;
    const realizedInWindow = closedTrades
      .filter((t) => (t.closedAt || now) >= windowStart)
      .reduce((acc, t) => acc + t.pnlCAD, 0);

    let runningCapital = settings.totalCapitalCAD - realizedInWindow;
    let cumulative = 0;

    const rows = [];
    for (let i = 0; i < days; i++) {
      const dayStart = windowStart + i * DAY_MS;
      const date = new Date(dayStart);
      const isToday = dayStart === startOfToday.getTime();
      const isFuture = dayStart > startOfToday.getTime();
      if (isFuture) break;

      const dayRealized = Math.round((realizedByDay.get(dayStart) ?? 0) * 100) / 100;
      runningCapital = Math.round((runningCapital + dayRealized) * 100) / 100;
      cumulative = Math.round((cumulative + dayRealized) * 100) / 100;

      const snapshot = snapshotByDay.get(dayStart);
      const hasMeasurement = Boolean(snapshot) || dayRealized !== 0 || isToday;

      rows.push({
        date: date.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' }),
        fullDate: date.toLocaleDateString('fr-CA'),
        totalCapital: isToday ? settings.totalCapitalCAD : runningCapital,
        equity: isToday ? currentEquity : snapshot?.equityCAD ?? runningCapital,
        activeBudget: isToday ? settings.activeBudgetCAD : snapshot?.activeBudgetCAD ?? null,
        bankReserve: isToday ? settings.bankReserveCAD : snapshot?.bankReserveCAD ?? null,
        cumulativePnL: cumulative,
        dailyPnL: dayRealized,
        measured: hasMeasurement,
      });
    }

    return rows;
  }, [days, settings, closedTrades, equityHistory, currentEquity]);

  const totalTrades = closedTrades.length;
  const winningTrades = closedTrades.filter((t) => t.pnlCAD > 0).length;
  const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : null;

  const realizedTotal = closedTrades.reduce((acc, t) => acc + t.pnlCAD, 0);
  const openPnL = openPositions.reduce((acc, p) => acc + p.pnlCAD, 0);
  const totalGains = Math.round((realizedTotal + openPnL) * 100) / 100;

  const startingCapital = settings.totalCapitalCAD - realizedTotal;
  const returnPercent = startingCapital > 0 ? ((totalGains / startingCapital) * 100).toFixed(2) : '0.00';

  const peakEquity = useMemo(() => {
    const measured = equityHistory.map((s) => s.equityCAD);
    return Math.max(currentEquity, ...(measured.length ? measured : [currentEquity]));
  }, [equityHistory, currentEquity]);

  const hasMeasuredHistory = equityHistory.length > 1 || closedTrades.length > 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-[#0a0a0a]/95 border border-white/15 backdrop-blur-md p-3.5 rounded-xl shadow-2xl text-xs space-y-2">
        <p className="font-bold text-white/80 border-b border-white/10 pb-1.5 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#00d2ff]" />
          {label}
        </p>
        <div className="space-y-1 font-mono">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-white/70 text-[11px]">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                {entry.name}
              </span>
              <span className="font-bold text-white text-[11px]">
                {typeof entry.value === 'number'
                  ? `${entry.value.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $ CAD`
                  : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const axisProps = {
    stroke: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    tickLine: false,
    axisLine: { stroke: 'rgba(255,255,255,0.1)' },
  };

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 space-y-5 shadow-2xl relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#00d2ff]/10 text-[#00d2ff] rounded-xl border border-[#00d2ff]/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-white text-base tracking-tight">Évolution du portefeuille ({timeRange})</h2>
            <p className="text-xs text-white/50 mt-0.5">
              Reconstruit à partir des transactions clôturées et des relevés d'équité enregistrés.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#050505] border border-white/10 rounded-xl p-1 text-xs">
            {(['7D', '14D', '30D'] as TimeRangeMode[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  timeRange === range ? 'bg-white/15 text-white shadow-sm' : 'text-white/40 hover:text-white/80'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-[#050505] border border-white/10 rounded-xl p-1 text-xs">
            {(
              [
                ['CAPITAL', 'Capital & budget', Layers, 'bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/30'],
                ['CUMULATIVE_PNL', 'P&L cumulé', TrendingUp, 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'],
                ['DAILY_PERF', 'Gains journaliers', BarChart2, 'bg-amber-500/20 text-amber-400 border border-amber-500/30'],
              ] as [ChartViewMode, string, typeof Layers, string][]
            ).map(([mode, label, Icon, activeClass]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-lg font-semibold flex items-center space-x-1.5 transition-all ${
                  viewMode === mode ? activeClass : 'text-white/50 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#050505]/80 p-3.5 rounded-xl border border-white/5">
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase text-white/40 tracking-wider block font-medium">
            Rendement depuis l'origine
          </span>
          <div className="flex items-center space-x-1">
            <span
              className={`text-base font-mono font-bold ${
                Number(returnPercent) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {Number(returnPercent) >= 0 ? '+' : ''}
              {returnPercent} %
            </span>
            {Number(returnPercent) >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
            )}
          </div>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] uppercase text-white/40 tracking-wider block font-medium">Taux de réussite</span>
          <span className="text-base font-mono font-bold text-[#00d2ff]">
            {winRate === null ? '—' : `${winRate} %`}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] uppercase text-white/40 tracking-wider block font-medium">Sommet mesuré</span>
          <span className="text-base font-mono font-bold text-white">
            {peakEquity.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} <span className="text-[10px] text-white/40">CAD</span>
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] uppercase text-white/40 tracking-wider block font-medium">Transactions</span>
          <span className="text-base font-mono font-bold text-amber-400">
            {totalTrades}{' '}
            <span className="text-[10px] text-white/40">
              ({totalTrades} clos / {openPositions.length} actifs)
            </span>
          </span>
        </div>
      </div>

      {!hasMeasuredHistory && (
        <div className="flex items-start gap-2 text-[11px] text-white/50 bg-[#050505] border border-white/10 rounded-xl p-3">
          <Info className="w-4 h-4 text-[#00d2ff] shrink-0 mt-0.5" />
          <p>
            Aucune transaction clôturée pour l'instant : la courbe reste plate à la valeur du capital de départ. Elle se
            remplira au fur et à mesure des positions soldées.
          </p>
        </div>
      )}

      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'CAPITAL' ? (
            <AreaChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="capitalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d2ff" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#00d2ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" {...axisProps} minTickGap={20} />
              <YAxis
                {...axisProps}
                domain={['dataMin - 200', 'dataMax + 200']}
                tickFormatter={(v) => `${Number(v).toLocaleString('fr-CA')} $`}
                width={90}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 12, fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="equity"
                name="Valeur liquidative"
                stroke="#00d2ff"
                strokeWidth={2.5}
                fill="url(#capitalGradient)"
                connectNulls
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="activeBudget"
                name="Budget actif"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#budgetGradient)"
                connectNulls
                isAnimationActive={false}
              />
            </AreaChart>
          ) : viewMode === 'CUMULATIVE_PNL' ? (
            <AreaChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" {...axisProps} minTickGap={20} />
              <YAxis
                {...axisProps}
                tickFormatter={(v) => `${Number(v).toLocaleString('fr-CA')} $`}
                width={90}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 12, fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="cumulativePnL"
                name="P&L réalisé cumulé"
                stroke="#22c55e"
                strokeWidth={2.5}
                fill="url(#pnlGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          ) : (
            <ComposedChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" {...axisProps} minTickGap={20} />
              <YAxis
                {...axisProps}
                tickFormatter={(v) => `${Number(v).toLocaleString('fr-CA')} $`}
                width={90}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 12, fontSize: 11 }} />
              {/* Le P&L journalier peut être négatif : la couleur suit le signe. */}
              <Bar dataKey="dailyPnL" name="P&L réalisé du jour" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {historyData.map((row, i) => (
                  <Cell key={i} fill={row.dailyPnL >= 0 ? '#22c55e' : '#f43f5e'} />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="cumulativePnL"
                name="Cumul"
                stroke="#00d2ff"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] text-white/40 pt-2 border-t border-white/5 font-mono gap-2">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00d2ff]" />
            <span>Valeur liquidative</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
            <span>Budget actif</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
            <span>P&L réalisé</span>
          </span>
        </div>
        <span>{equityHistory.length} relevé{equityHistory.length > 1 ? 's' : ''} enregistré{equityHistory.length > 1 ? 's' : ''}</span>
      </div>
    </div>
  );
};
