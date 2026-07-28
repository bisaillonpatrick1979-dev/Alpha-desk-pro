import React from 'react';
import { TradePosition } from '../types';
import { ShieldCheck, ArrowUpRight, ArrowDownRight, XCircle, AlertCircle } from 'lucide-react';

interface PositionsTableProps {
  positions: TradePosition[];
  onClosePosition: (id: string) => void;
}

export const PositionsTable: React.FC<PositionsTableProps> = ({
  positions,
  onClosePosition,
}) => {
  if (positions.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-center py-8">
        <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-300">Aucune position ouverte</h3>
        <p className="text-xs text-slate-400 mt-1">
          LANCEZ une délibération d'agents pour ouvrir de nouvelles positions selon le plan de gestion de risque.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-slate-100">Positions Ouvertes ({positions.length})</h2>
        </div>
        <span className="text-xs text-slate-400">P&L calculé en $ CAD en temps réel</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="p-3">Actif / Sens</th>
              <th className="p-3">Prix Entrée</th>
              <th className="p-3">Prix Actuel</th>
              <th className="p-3">Position CAD</th>
              <th className="p-3">SL / TP</th>
              <th className="p-3 text-right">P&L Latent ($ CAD)</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {positions.map((pos) => {
              const isGain = pos.pnlCAD >= 0;
              return (
                <tr key={pos.id} className="hover:bg-slate-950/50 transition-colors">
                  
                  {/* Asset Symbol & Long/Short */}
                  <td className="p-3 font-bold text-slate-100 flex items-center space-x-2">
                    <span className={`p-1 rounded ${pos.type === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {pos.type === 'LONG' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    </span>
                    <div>
                      <div>{pos.symbol}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{pos.assetName}</div>
                    </div>
                  </td>

                  {/* Entry Price */}
                  <td className="p-3 font-mono">{pos.entryPriceCAD} $</td>

                  {/* Current Price */}
                  <td className="p-3 font-mono font-bold text-slate-100">{pos.currentPriceCAD} $</td>

                  {/* Position CAD */}
                  <td className="p-3 font-semibold text-amber-400">
                    {pos.amountCAD.toLocaleString('fr-CA')} $ CAD
                  </td>

                  {/* SL / TP */}
                  <td className="p-3 font-mono text-[11px] space-y-0.5">
                    <div className="text-rose-400">SL: {pos.stopLossCAD} $</div>
                    <div className="text-emerald-400">TP: {pos.takeProfitCAD} $</div>
                  </td>

                  {/* P&L Latent */}
                  <td className={`p-3 text-right font-mono font-bold text-sm ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isGain ? '+' : ''}{pos.pnlCAD.toFixed(2)} $ CAD
                    <div className="text-[10px] opacity-80">
                      ({isGain ? '+' : ''}{pos.pnlPercent.toFixed(2)}%)
                    </div>
                  </td>

                  {/* Close Action */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onClosePosition(pos.id)}
                      className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-lg text-xs font-semibold flex items-center space-x-1 mx-auto transition-all"
                      title="Clôturer cette position manuellement"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Clôturer</span>
                    </button>
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
