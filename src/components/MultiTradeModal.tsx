import React, { useState, useMemo } from 'react';
import { X, Zap, ShieldAlert, ArrowUpRight, ArrowDownRight, Check } from 'lucide-react';
import { MarketAsset, PortfolioSettings, TradePosition } from '../types';
import { stopAndTargetFor } from '../lib/portfolio';

interface MultiTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: MarketAsset[];
  settings: PortfolioSettings;
  openPositions: TradePosition[];
  maxSlots: number;
  onExecuteMultiTrades: (newPositions: TradePosition[]) => void;
}

export const MultiTradeModal: React.FC<MultiTradeModalProps> = ({
  isOpen,
  onClose,
  watchlist,
  settings,
  openPositions,
  maxSlots,
  onExecuteMultiTrades,
}) => {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [allocationPerTradeCAD, setAllocationPerTradeCAD] = useState(250);
  const [stopLossPercent, setStopLossPercent] = useState(3);
  const [takeProfitPercent, setTakeProfitPercent] = useState(8);
  const [tradeType, setTradeType] = useState<'LONG' | 'SHORT'>('LONG');

  const heldSymbols = useMemo(() => new Set(openPositions.map((p) => p.symbol)), [openPositions]);
  const freeSlots = Math.max(0, maxSlots - openPositions.length);

  /** Actifs réellement sélectionnables : ceux qui n'ont pas déjà une position ouverte. */
  const selectableAssets = useMemo(
    () => watchlist.filter((a) => !heldSymbols.has(a.symbol)),
    [watchlist, heldSymbols]
  );

  const validSelection = useMemo(
    () => selectedSymbols.filter((s) => selectableAssets.some((a) => a.symbol === s)),
    [selectedSymbols, selectableAssets]
  );

  const totalRequiredCAD = Math.round(validSelection.length * allocationPerTradeCAD * 100) / 100;
  const isBudgetSufficient = totalRequiredCAD <= settings.activeBudgetCAD;
  const fitsInSlots = validSelection.length <= freeSlots;
  const canSubmit = validSelection.length > 0 && isBudgetSufficient && fitsInSlots && allocationPerTradeCAD > 0;

  if (!isOpen) return null;

  const toggleSelectSymbol = (symbol: string) => {
    setSelectedSymbols((prev) => (prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const now = Date.now();
    const newPositions: TradePosition[] = validSelection.map((symbol, index) => {
      const asset = selectableAssets.find((a) => a.symbol === symbol)!;
      const decimals = asset.priceCAD < 10 ? 4 : 2;

      // Pour un SHORT le stop est au-dessus du prix d'entrée et la cible en dessous.
      const { stopLossCAD, takeProfitCAD } = stopAndTargetFor(
        tradeType,
        asset.priceCAD,
        stopLossPercent,
        takeProfitPercent,
        decimals
      );

      return {
        id: `multi-${now}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        symbol: asset.symbol,
        assetName: asset.name,
        type: tradeType,
        entryPriceCAD: asset.priceCAD,
        currentPriceCAD: asset.priceCAD,
        amountCAD: allocationPerTradeCAD,
        units: Number((allocationPerTradeCAD / asset.priceCAD).toFixed(6)),
        stopLossCAD,
        takeProfitCAD,
        openTime: new Date(now).toLocaleTimeString('fr-CA'),
        openedAt: now,
        pnlCAD: 0,
        pnlPercent: 0,
        source: 'MANUAL' as const,
      };
    });

    onExecuteMultiTrades(newPositions);
    setSelectedSymbols([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0a0a0a] border border-white/15 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-white">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#050505]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm tracking-tight">Exécution simultanée d'ordres multiples</h3>
              <p className="text-[11px] text-white/50">
                {freeSlots} slot{freeSlots > 1 ? 's' : ''} libre{freeSlots > 1 ? 's' : ''} sur {maxSlots}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
          {/* Sélecteur de sens. Le champ existait dans l'état du composant mais
              n'avait aucun contrôle associé : impossible d'ouvrir un SHORT. */}
          <div className="space-y-2">
            <label className="text-white font-bold block uppercase tracking-wider text-[11px]">Sens de la position</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTradeType('LONG')}
                className={`p-3 rounded-xl border flex items-center justify-center space-x-2 font-bold transition-all ${
                  tradeType === 'LONG'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                    : 'bg-[#111] border-white/10 text-white/50 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Achat (LONG)</span>
              </button>
              <button
                type="button"
                onClick={() => setTradeType('SHORT')}
                className={`p-3 rounded-xl border flex items-center justify-center space-x-2 font-bold transition-all ${
                  tradeType === 'SHORT'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-300'
                    : 'bg-[#111] border-white/10 text-white/50 hover:text-white'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Vente à découvert (SHORT)</span>
              </button>
            </div>
            <p className="text-[10px] text-white/40">
              {tradeType === 'LONG'
                ? 'Gain si le prix monte. Stop sous le prix d\'entrée, cible au-dessus.'
                : "Gain si le prix baisse. Stop au-dessus du prix d'entrée, cible en dessous."}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-white font-bold block uppercase tracking-wider text-[11px]">
                Actifs ({validSelection.length} sélectionné{validSelection.length > 1 ? 's' : ''})
              </label>
              <div className="flex items-center space-x-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedSymbols(selectableAssets.slice(0, freeSlots).map((a) => a.symbol))}
                  className="text-[#00d2ff] hover:underline font-semibold"
                >
                  Remplir les slots
                </button>
                <span className="text-white/20">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedSymbols([])}
                  className="text-white/50 hover:text-white"
                >
                  Tout désélectionner
                </button>
              </div>
            </div>

            {selectableAssets.length === 0 ? (
              <p className="text-white/50 bg-[#050505] rounded-xl border border-white/10 p-4 text-center">
                Tous les actifs de la watchlist ont déjà une position ouverte.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1 bg-[#050505] rounded-xl border border-white/10">
                {selectableAssets.map((asset) => {
                  const isSelected = selectedSymbols.includes(asset.symbol);
                  return (
                    <button
                      key={asset.symbol}
                      type="button"
                      onClick={() => toggleSelectSymbol(asset.symbol)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-white font-bold'
                          : 'bg-[#111] border-white/5 text-white/60 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="text-xs text-white font-mono">{asset.symbol}</div>
                        <div className="text-[10px] text-white/50">{asset.priceCAD.toLocaleString('fr-CA')} $ CAD</div>
                      </div>
                      {isSelected ? (
                        <div className="w-5 h-5 bg-amber-500 text-black rounded-lg flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 border border-white/20 rounded-lg" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#111] p-4 rounded-xl border border-white/10">
            <div className="space-y-1">
              <label className="text-white/80 font-bold block text-[11px]">Capital par trade ($ CAD)</label>
              <input
                type="number"
                value={allocationPerTradeCAD}
                onChange={(e) => setAllocationPerTradeCAD(Math.max(1, Number(e.target.value) || 0))}
                min={1}
                // `step="any"` : avec un pas fixe, la validation native du navigateur
                // rejette les montants qui ne tombent pas sur la grille (250 avec un
                // pas de 50 partant de 1) et bloque l'envoi du formulaire sans message.
                step="any"
                className="w-full bg-[#050505] border border-white/15 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-white/80 font-bold block text-[11px]">Stop-loss (%)</label>
              <input
                type="number"
                value={stopLossPercent}
                onChange={(e) => setStopLossPercent(Math.min(50, Math.max(0.1, Number(e.target.value) || 0)))}
                min={0.1}
                max={50}
                step="any"
                className="w-full bg-[#050505] border border-white/15 rounded-xl px-3 py-2 text-rose-400 font-mono font-bold text-sm focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-white/80 font-bold block text-[11px]">Take-profit (%)</label>
              <input
                type="number"
                value={takeProfitPercent}
                onChange={(e) => setTakeProfitPercent(Math.min(100, Math.max(0.1, Number(e.target.value) || 0)))}
                min={0.1}
                max={100}
                step="any"
                className="w-full bg-[#050505] border border-white/15 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="bg-[#050505] p-3.5 rounded-xl border border-white/10 flex items-center justify-between font-mono text-xs">
            <div>
              <span className="text-white/40 block text-[10px] uppercase">Engagement requis</span>
              <span className="font-bold text-white text-base">
                {totalRequiredCAD.toLocaleString('fr-CA')} $ CAD{' '}
                <span className="text-white/40 text-xs">({validSelection.length} positions)</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-white/40 block text-[10px] uppercase">Budget actif disponible</span>
              <span className={`font-bold text-base ${isBudgetSufficient ? 'text-emerald-400' : 'text-rose-400'}`}>
                {settings.activeBudgetCAD.toLocaleString('fr-CA')} $ CAD
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[10px] space-y-1">
              {!isBudgetSufficient && (
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Budget insuffisant : réduisez l'allocation ou débloquez une tranche.
                </span>
              )}
              {!fitsInSlots && (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {validSelection.length} ordres pour {freeSlots} slot{freeSlots > 1 ? 's' : ''} disponible
                  {freeSlots > 1 ? 's' : ''}.
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl font-semibold transition-all"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold rounded-xl flex items-center space-x-2 shadow-lg transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>
                  Lancer {validSelection.length} ordre{validSelection.length > 1 ? 's' : ''} {tradeType}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
