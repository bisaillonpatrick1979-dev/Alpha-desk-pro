import React from 'react';
import { TradePosition } from '../types';
import { ShieldCheck, ArrowUpRight, ArrowDownRight, XCircle } from 'lucide-react';

interface PositionsTableProps {
  positions: TradePosition[];
  maxSlots: number;
  onClosePosition: (id: string) => void;
}

const SOURCE_LABEL: Record<NonNullable<TradePosition['source']>, string> = {
  AGENT: 'Agents',
  MANUAL: 'Manuel',
  AUTOPILOT: 'Robot',
};

export const PositionsTable: React.FC<PositionsTableProps> = ({ positions, maxSlots, onClosePosition }) => {
  if (positions.length === 0) {
    return (
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-xl text-center py-8">
        <ShieldCheck className="w-10 h-10 text-white/20 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-white/80">Aucune position ouverte</h3>
        <p className="text-xs text-white/50 mt-1">
          Lancez une délibération d'agents, un multi-trade ou l'auto-pilote pour occuper les {maxSlots} slots.
        </p>
      </div>
    );
  }

  const totalPnL = positions.reduce((acc, p) => acc + p.pnlCAD, 0);
  const totalCommitted = positions.reduce((acc, p) => acc + p.amountCAD, 0);

  const fmtPrice = (value: number) => value.toLocaleString('fr-CA', { maximumFractionDigits: value < 10 ? 4 : 2 });

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">
            Positions ouvertes ({positions.length} / {maxSlots})
          </h2>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-white/50">
            Capital engagé : <strong className="text-amber-400">{totalCommitted.toLocaleString('fr-CA')} $ CAD</strong>
          </span>
          <span className="text-white/50">
            P&L latent :{' '}
            <strong className={totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {totalPnL >= 0 ? '+' : ''}
              {totalPnL.toFixed(2)} $ CAD
            </strong>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-white/80">
          <thead className="bg-[#050505] text-white/40 uppercase tracking-wider font-semibold border-b border-white/10">
            <tr>
              <th className="p-3">Actif / Sens</th>
              <th className="p-3">Prix d'entrée</th>
              <th className="p-3">Prix actuel</th>
              <th className="p-3">Position CAD</th>
              <th className="p-3">SL / TP</th>
              <th className="p-3 text-right">P&L latent ($ CAD)</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {positions.map((pos) => {
              const isGain = pos.pnlCAD >= 0;
              const isLong = pos.type === 'LONG';

              return (
                <tr key={pos.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3 font-bold text-white">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`p-1 rounded ${
                          isLong ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}
                        title={isLong ? 'Position acheteuse' : 'Position vendeuse à découvert'}
                      >
                        {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span>{pos.symbol}</span>
                          {pos.source && (
                            <span className="text-[9px] font-normal px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                              {SOURCE_LABEL[pos.source]}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-white/40 font-normal">{pos.assetName}</div>
                      </div>
                    </div>
                  </td>

                  <td className="p-3 font-mono">{fmtPrice(pos.entryPriceCAD)} $</td>
                  <td className="p-3 font-mono font-bold text-white">{fmtPrice(pos.currentPriceCAD)} $</td>
                  <td className="p-3 font-semibold text-amber-400">{pos.amountCAD.toLocaleString('fr-CA')} $ CAD</td>

                  <td className="p-3 font-mono text-[11px] space-y-0.5">
                    <div className="text-rose-400">SL : {fmtPrice(pos.stopLossCAD)} $</div>
                    <div className="text-emerald-400">TP : {fmtPrice(pos.takeProfitCAD)} $</div>
                  </td>

                  <td
                    className={`p-3 text-right font-mono font-bold text-sm ${
                      isGain ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isGain ? '+' : ''}
                    {pos.pnlCAD.toFixed(2)} $ CAD
                    <div className="text-[10px] opacity-80">
                      ({isGain ? '+' : ''}
                      {pos.pnlPercent.toFixed(2)} %)
                    </div>
                  </td>

                  <td className="p-3 text-center">
                    <button
                      onClick={() => onClosePosition(pos.id)}
                      className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-lg text-xs font-semibold flex items-center space-x-1 mx-auto transition-all"
                      title="Clôturer cette position au prix courant"
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
