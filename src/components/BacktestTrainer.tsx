import React, { useState, useCallback } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Cpu, Play, RotateCcw, Award, ShieldCheck, Zap, Info } from 'lucide-react';
import { MarketAsset, PortfolioSettings, BacktestReport } from '../types';
import { runBacktest, DEFAULT_BACKTEST_PARAMS, BacktestParams } from '../lib/backtest';

interface BacktestTrainerProps {
  watchlist: MarketAsset[];
  settings: PortfolioSettings;
}

export const BacktestTrainer: React.FC<BacktestTrainerProps> = ({ watchlist, settings }) => {
  const [params, setParams] = useState<BacktestParams>({
    ...DEFAULT_BACKTEST_PARAMS,
    startingCapitalCAD: settings.totalCapitalCAD,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<BacktestReport | null>(null);

  const startBacktest = useCallback(() => {
    setIsRunning(true);
    setReport(null);

    // Le calcul est synchrone mais on laisse le navigateur peindre l'état
    // « en cours » avant de le lancer.
    requestAnimationFrame(() => {
      try {
        setReport(runBacktest(watchlist, params));
      } catch (err) {
        console.error('Échec du backtest :', err);
      } finally {
        setIsRunning(false);
      }
    });
  }, [watchlist, params]);

  const updateParam = (key: keyof BacktestParams, value: number) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  const isProfitable = (report?.totalProfitCAD ?? 0) >= 0;

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base tracking-tight">
              Backtest de la stratégie sur l'historique des bougies
            </h3>
            <p className="text-xs text-white/50">
              La stratégie est rejouée bougie par bougie sur les {watchlist.length} actifs de la watchlist.
            </p>
          </div>
        </div>

        <button
          onClick={startBacktest}
          disabled={isRunning}
          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg transition-all"
        >
          {isRunning ? (
            <>
              <RotateCcw className="w-4 h-4 animate-spin" />
              <span>Simulation en cours…</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Lancer le backtest</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 bg-[#050505] p-4 rounded-xl border border-white/10 text-xs font-mono">
        <div className="space-y-1">
          <label className="text-white/50 block text-[10px] uppercase">Capital initial ($)</label>
          <input
            type="number"
            min={100}
            value={params.startingCapitalCAD}
            onChange={(e) => updateParam('startingCapitalCAD', Math.max(100, Number(e.target.value) || 0))}
            className="w-full bg-[#111] border border-white/15 rounded-lg px-2 py-1.5 text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-white/50 block text-[10px] uppercase">RSI d'achat (≤)</label>
          <input
            type="number"
            min={5}
            max={70}
            value={params.rsiBuyThreshold}
            onChange={(e) => updateParam('rsiBuyThreshold', Math.min(70, Math.max(5, Number(e.target.value) || 5)))}
            className="w-full bg-[#111] border border-white/15 rounded-lg px-2 py-1.5 text-[#00d2ff]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-white/50 block text-[10px] uppercase">Cible (%)</label>
          <input
            type="number"
            min={0.5}
            step="any"
            value={params.takeProfitPercent}
            onChange={(e) => updateParam('takeProfitPercent', Math.max(0.5, Number(e.target.value) || 0.5))}
            className="w-full bg-[#111] border border-white/15 rounded-lg px-2 py-1.5 text-emerald-400"
          />
        </div>
        <div className="space-y-1">
          <label className="text-white/50 block text-[10px] uppercase">Stop (%)</label>
          <input
            type="number"
            min={0.5}
            step="any"
            value={params.stopLossPercent}
            onChange={(e) => updateParam('stopLossPercent', Math.max(0.5, Number(e.target.value) || 0.5))}
            className="w-full bg-[#111] border border-white/15 rounded-lg px-2 py-1.5 text-rose-400"
          />
        </div>
        <div className="space-y-1">
          <label className="text-white/50 block text-[10px] uppercase">Frais A/R (%)</label>
          <input
            type="number"
            min={0}
            step="any"
            value={params.feePercent}
            onChange={(e) => updateParam('feePercent', Math.max(0, Number(e.target.value) || 0))}
            className="w-full bg-[#111] border border-white/15 rounded-lg px-2 py-1.5 text-amber-400"
          />
        </div>
      </div>

      {report && (
        <div className="bg-[#050505] p-4 rounded-xl border border-white/10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center space-x-2 text-white font-bold text-xs">
              <Award className={`w-4 h-4 ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`} />
              <span>
                Résultat sur {report.barsAnalysed.toLocaleString('fr-CA')} bougies et {report.assetsAnalysed} actifs
              </span>
            </div>
            <span className="text-[10px] text-white/40 font-mono">{report.strategyLabel}</span>
          </div>

          {report.totalTrades === 0 ? (
            <p className="text-xs text-white/60 py-4 text-center font-mono">
              Aucune entrée déclenchée avec ces paramètres. Relevez le seuil RSI d'achat pour rendre la stratégie moins
              sélective.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
                <div className="bg-[#111] p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-white/40 block uppercase">P&L simulé</span>
                  <span className={`text-lg font-bold ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isProfitable ? '+' : ''}
                    {report.totalProfitCAD.toLocaleString('fr-CA')} $
                  </span>
                  <span className="text-[10px] text-white/40 block">
                    {report.returnPercent >= 0 ? '+' : ''}
                    {report.returnPercent} %
                  </span>
                </div>

                <div className="bg-[#111] p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-white/40 block uppercase">Transactions</span>
                  <span className="text-lg font-bold text-white">{report.totalTrades}</span>
                  <span className="text-[10px] text-white/40 block">{report.winningTrades} gagnantes</span>
                </div>

                <div className="bg-[#111] p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-white/40 block uppercase">Taux de réussite</span>
                  <span className="text-lg font-bold text-[#00d2ff]">{report.winRate} %</span>
                </div>

                <div className="bg-[#111] p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-white/40 block uppercase">Drawdown max</span>
                  <span className="text-lg font-bold text-amber-400">−{report.maxDrawdownPercent} %</span>
                </div>

                <div className="bg-[#111] p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-white/40 block uppercase">Facteur de profit</span>
                  <span className="text-lg font-bold text-purple-300">
                    {Number.isFinite(report.profitFactor) ? report.profitFactor : '∞'}
                  </span>
                </div>

                <div className="bg-[#111] p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-white/40 block uppercase">Sharpe (approx.)</span>
                  <span className="text-lg font-bold text-white">{report.sharpeRatio}</span>
                </div>
              </div>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={report.equityCurve} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="backtestGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isProfitable ? '#22c55e' : '#f43f5e'} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={isProfitable ? '#22c55e' : '#f43f5e'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="index"
                      stroke="rgba(255,255,255,0.3)"
                      fontSize={10}
                      tickLine={false}
                      label={{ value: 'Transactions', fill: 'rgba(255,255,255,0.3)', fontSize: 10, position: 'insideBottom', offset: -2 }}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.3)"
                      fontSize={10}
                      tickLine={false}
                      domain={['dataMin - 100', 'dataMax + 100']}
                      tickFormatter={(v) => `${Number(v).toLocaleString('fr-CA')} $`}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0a0a0a',
                        borderColor: 'rgba(255,255,255,0.15)',
                        borderRadius: '10px',
                        fontSize: '11px',
                      }}
                      formatter={(value: any) => [`${Number(value).toLocaleString('fr-CA')} $ CAD`, 'Équité simulée']}
                      labelFormatter={(label) => `Après ${label} transaction(s)`}
                    />
                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke={isProfitable ? '#22c55e' : '#f43f5e'}
                      strokeWidth={2}
                      fill="url(#backtestGradient)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3 bg-[#111] rounded-xl border border-white/5 text-xs text-white/70 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#00d2ff]" />
                  <span>Lecture des résultats</span>
                </div>
                <p className="leading-relaxed">
                  Meilleur actif : <strong className="text-emerald-300">{report.bestAsset}</strong> • Moins performant :{' '}
                  <strong className="text-rose-300">{report.worstAsset}</strong>. Les frais aller-retour de{' '}
                  {params.feePercent} % sont déduits de chaque transaction, et le stop est réputé touché avant la cible
                  lorsqu'une même bougie franchit les deux niveaux.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Les résultats ne sont pas transférables au portefeuille : créditer un gain
          de simulation sur le capital réel rendait toutes les métriques du tableau
          de bord fausses. */}
      <div className="flex items-start gap-2 text-[11px] text-white/50 bg-[#050505] border border-white/10 rounded-xl p-3">
        <Info className="w-4 h-4 text-[#00d2ff] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Le backtest s'exécute sur des séries de prix générées pour la démonstration, et non sur des cotations de
          marché historiques. Ses résultats servent à comparer des jeux de paramètres entre eux ; ils ne sont pas
          crédités au portefeuille et ne préjugent pas de performances réelles.
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-mono">
        <Zap className="w-3 h-3" />
        <span>Aucune donnée n'est envoyée à un service externe : le calcul est entièrement local.</span>
      </div>
    </div>
  );
};
