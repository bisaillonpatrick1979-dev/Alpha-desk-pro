import React, { useState } from 'react';
import { HistoricalTrade } from '../types';
import { History } from 'lucide-react';

interface HistoryLogProps {
  closedTrades: HistoricalTrade[];
}

const PAGE_SIZE = 25;

const SOURCE_LABEL: Record<NonNullable<HistoricalTrade['source']>, string> = {
  AGENT: 'Agents',
  MANUAL: 'Manuel',
  AUTOPILOT: 'Robot',
};

export const HistoryLog: React.FC<HistoryLogProps> = ({ closedTrades }) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (closedTrades.length === 0) {
    return (
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-xl text-center py-6 text-white/50 text-xs">
        Aucune transaction archivée pour l'instant.
      </div>
    );
  }

  const totalRealizedCAD = closedTrades.reduce((acc, t) => acc + t.pnlCAD, 0);
  const winningTrades = closedTrades.filter((t) => t.pnlCAD > 0).length;
  const winRate = ((winningTrades / closedTrades.length) * 100).toFixed(1);
  const bestTrade = closedTrades.reduce((best, t) => (t.pnlCAD > best.pnlCAD ? t : best), closedTrades[0]);
  const worstTrade = closedTrades.reduce((worst, t) => (t.pnlCAD < worst.pnlCAD ? t : worst), closedTrades[0]);

  const fmtPrice = (value: number) => value.toLocaleString('fr-CA', { maximumFractionDigits: value < 10 ? 4 : 2 });
  const visible = closedTrades.slice(0, visibleCount);

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white">
            Historique des transactions ({closedTrades.length})
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <span className="text-white/50">
            Réussite : <strong className="text-emerald-400">{winRate} %</strong>
          </span>
          <span className="text-white/50">
            Meilleur : <strong className="text-emerald-400">+{bestTrade.pnlCAD.toFixed(2)} $</strong>
          </span>
          <span className="text-white/50">
            Pire : <strong className="text-rose-400">{worstTrade.pnlCAD.toFixed(2)} $</strong>
          </span>
          <span className="text-white/50">
            P&L réalisé :{' '}
            <strong className={totalRealizedCAD >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {totalRealizedCAD >= 0 ? '+' : ''}
              {totalRealizedCAD.toFixed(2)} $ CAD
            </strong>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-white/80">
          <thead className="bg-[#050505] text-white/40 uppercase tracking-wider font-semibold border-b border-white/10">
            <tr>
              <th className="p-3">Actif / Sens</th>
              <th className="p-3">Montant engagé</th>
              <th className="p-3">Entrée / Sortie</th>
              <th className="p-3">Clôture</th>
              <th className="p-3">Motif</th>
              <th className="p-3 text-right">P&L réalisé</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {visible.map((trade) => {
              const isGain = trade.pnlCAD >= 0;
              return (
                <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3 font-bold text-white">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{trade.symbol}</span>
                      <span
                        className={`text-[9px] font-normal px-1.5 py-0.5 rounded ${
                          trade.type === 'LONG'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-rose-500/15 text-rose-300'
                        }`}
                      >
                        {trade.type}
                      </span>
                      {trade.source && (
                        <span className="text-[9px] font-normal px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                          {SOURCE_LABEL[trade.source]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 font-semibold text-amber-400">{trade.amountCAD.toLocaleString('fr-CA')} $ CAD</td>
                  <td className="p-3 font-mono text-[11px]">
                    <div>Entrée : {fmtPrice(trade.entryPriceCAD)} $</div>
                    <div>Sortie : {fmtPrice(trade.exitPriceCAD)} $</div>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-white/50">
                    {trade.closedAt
                      ? new Date(trade.closedAt).toLocaleString('fr-CA', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : trade.closeTime}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        trade.closeReason === 'TAKE_PROFIT'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : trade.closeReason === 'STOP_LOSS'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-white/10 text-white/70'
                      }`}
                    >
                      {trade.closeReason}
                    </span>
                  </td>
                  <td className={`p-3 text-right font-mono font-bold ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isGain ? '+' : ''}
                    {trade.pnlCAD.toFixed(2)} $ CAD
                    <div className="text-[10px] opacity-80">
                      ({isGain ? '+' : ''}
                      {trade.pnlPercent.toFixed(2)} %)
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination : au-delà de quelques centaines de lignes, tout rendre d'un
          bloc dégradait nettement le défilement. */}
      {visibleCount < closedTrades.length && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full py-2 text-xs font-bold bg-[#111] hover:bg-white/10 text-white/70 hover:text-white border border-white/10 rounded-xl transition-all"
        >
          Afficher {Math.min(PAGE_SIZE, closedTrades.length - visibleCount)} transactions de plus (
          {closedTrades.length - visibleCount} restantes)
        </button>
      )}
    </div>
  );
};
