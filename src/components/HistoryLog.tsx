import React from 'react';
import { HistoricalTrade } from '../types';
import { History, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';

interface HistoryLogProps {
  closedTrades: HistoricalTrade[];
}

export const HistoryLog: React.FC<HistoryLogProps> = ({ closedTrades }) => {
  if (closedTrades.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-center py-6 text-slate-400 text-xs">
        Aucune transaction archivée pour l'instant.
      </div>
    );
  }

  const totalRealizedCAD = closedTrades.reduce((acc, t) => acc + t.pnlCAD, 0);
  const winningTrades = closedTrades.filter((t) => t.pnlCAD > 0).length;
  const winRate = ((winningTrades / closedTrades.length) * 100).toFixed(1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-slate-100">Historique des Transactions Clôturées</h2>
        </div>
        
        <div className="flex items-center space-x-4 text-xs">
          <span>Taux de Réussite: <strong className="text-emerald-400 font-bold">{winRate}%</strong></span>
          <span>P&L Réalisé Total: <strong className={`font-bold ${totalRealizedCAD >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{totalRealizedCAD >= 0 ? '+' : ''}{totalRealizedCAD.toFixed(2)} $ CAD</strong></span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="p-3">Actif</th>
              <th className="p-3">Montant Engagé</th>
              <th className="p-3">Prix Entrée / Sortie</th>
              <th className="p-3">Motif Clôture</th>
              <th className="p-3 text-right">P&L Réalisé ($ CAD)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {closedTrades.map((trade) => {
              const isGain = trade.pnlCAD >= 0;
              return (
                <tr key={trade.id} className="hover:bg-slate-950/50 transition-colors">
                  <td className="p-3 font-bold text-slate-100">{trade.symbol}</td>
                  <td className="p-3 font-semibold text-amber-400">{trade.amountCAD.toLocaleString('fr-CA')} $ CAD</td>
                  <td className="p-3 font-mono text-[11px]">
                    <div>In: {trade.entryPriceCAD} $</div>
                    <div>Out: {trade.exitPriceCAD} $</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      trade.closeReason === 'TAKE_PROFIT'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : trade.closeReason === 'STOP_LOSS'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {trade.closeReason}
                    </span>
                  </td>
                  <td className={`p-3 text-right font-mono font-bold ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isGain ? '+' : ''}{trade.pnlCAD.toFixed(2)} $ CAD ({trade.pnlPercent.toFixed(2)}%)
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
