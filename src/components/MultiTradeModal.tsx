import React, { useState } from 'react';
import { X, Layers, CheckSquare, Square, Zap, ShieldAlert, ArrowUpRight, ArrowDownRight, DollarSign, Check } from 'lucide-react';
import { MarketAsset, PortfolioSettings, TradePosition } from '../types';

interface MultiTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: MarketAsset[];
  settings: PortfolioSettings;
  onExecuteMultiTrades: (newPositions: TradePosition[]) => void;
}

export const MultiTradeModal: React.FC<MultiTradeModalProps> = ({
  isOpen,
  onClose,
  watchlist,
  settings,
  onExecuteMultiTrades,
}) => {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(
    watchlist.slice(0, 3).map((a) => a.symbol)
  );
  const [allocationPerTradeCAD, setAllocationPerTradeCAD] = useState<number>(250);
  const [stopLossPercent, setStopLossPercent] = useState<number>(3);
  const [takeProfitPercent, setTakeProfitPercent] = useState<number>(8);
  const [tradeType, setTradeType] = useState<'LONG' | 'SHORT'>('LONG');

  if (!isOpen) return null;

  const toggleSelectSymbol = (symbol: string) => {
    if (selectedSymbols.includes(symbol)) {
      setSelectedSymbols(selectedSymbols.filter((s) => s !== symbol));
    } else {
      setSelectedSymbols([...selectedSymbols, symbol]);
    }
  };

  const selectAll = () => {
    setSelectedSymbols(watchlist.map((a) => a.symbol));
  };

  const clearAll = () => {
    setSelectedSymbols([]);
  };

  const totalRequiredCAD = selectedSymbols.length * allocationPerTradeCAD;
  const isBudgetSufficient = totalRequiredCAD <= settings.activeBudgetCAD;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSymbols.length === 0) {
      alert('Veuillez sélectionner au moins un actif pour lancer un trade simultané.');
      return;
    }

    if (!isBudgetSufficient) {
      alert(`Budget actif insuffisant (${settings.activeBudgetCAD} $ CAD). Requis: ${totalRequiredCAD} $ CAD.`);
      return;
    }

    const newPositions: TradePosition[] = selectedSymbols.map((sym) => {
      const asset = watchlist.find((a) => a.symbol === sym)!;
      const entryPrice = asset.priceCAD;
      
      const slPrice = tradeType === 'LONG'
        ? Number((entryPrice * (1 - stopLossPercent / 100)).toFixed(2))
        : Number((entryPrice * (1 + stopLossPercent / 100)).toFixed(2));
      
      const tpPrice = tradeType === 'LONG'
        ? Number((entryPrice * (1 + takeProfitPercent / 100)).toFixed(2))
        : Number((entryPrice * (1 - takeProfitPercent / 100)).toFixed(2));

      const units = Number((allocationPerTradeCAD / entryPrice).toFixed(4));

      return {
        id: `multi-${Date.now()}-${sym}-${Math.random()}`,
        symbol: asset.symbol,
        assetName: asset.name,
        type: tradeType,
        entryPriceCAD: entryPrice,
        currentPriceCAD: entryPrice,
        amountCAD: allocationPerTradeCAD,
        units,
        stopLossCAD: slPrice,
        takeProfitCAD: tpPrice,
        openTime: new Date().toLocaleTimeString('fr-CA'),
        pnlCAD: 0,
        pnlPercent: 0,
      };
    });

    onExecuteMultiTrades(newPositions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0a0a0a] border border-white/15 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-0 text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#050505]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm tracking-tight flex items-center gap-2">
                Exécution Simultanée d'Ordres Multiple (Multi-Trades)
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                  Simultané ⚡
                </span>
              </h3>
              <p className="text-[11px] text-white/50">
                Lancez plusieurs positions en un seul clic selon les limites de gestion du risque
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

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
          
          {/* Asset Multi-Selector Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-white font-bold block uppercase tracking-wider text-[11px]">
                Sélection des Actifs de la Ferme ({selectedSymbols.length} sélectionnés)
              </label>
              <div className="flex items-center space-x-2 text-[11px]">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[#00d2ff] hover:underline font-semibold"
                >
                  Tout sélectionner
                </button>
                <span className="text-white/20">•</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-white/50 hover:text-white"
                >
                  Désélectionner tout
                </button>
              </div>
            </div>

            {/* Grid of assets with checkboxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1 bg-[#050505] rounded-xl border border-white/10">
              {watchlist.map((asset) => {
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
                      <div className="text-[10px] text-white/50">{asset.priceCAD} $ CAD</div>
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
          </div>

          {/* Allocation & Risk Settings per trade */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#111] p-4 rounded-xl border border-white/10">
            
            {/* Allocation CAD per trade */}
            <div className="space-y-1">
              <label className="text-white/80 font-bold block text-[11px]">Capital par Trade ($ CAD)</label>
              <input
                type="number"
                value={allocationPerTradeCAD}
                onChange={(e) => setAllocationPerTradeCAD(Number(e.target.value))}
                min={50}
                step={50}
                className="w-full bg-[#050505] border border-white/15 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                required
              />
              <span className="text-[10px] text-white/40">ex: 250 $ CAD par position</span>
            </div>

            {/* Stop Loss % */}
            <div className="space-y-1">
              <label className="text-white/80 font-bold block text-[11px]">Stop-Loss (SL %)</label>
              <input
                type="number"
                value={stopLossPercent}
                onChange={(e) => setStopLossPercent(Number(e.target.value))}
                min={1}
                max={20}
                className="w-full bg-[#050505] border border-white/15 rounded-xl px-3 py-2 text-rose-400 font-mono font-bold text-sm focus:outline-none focus:border-rose-500"
                required
              />
              <span className="text-[10px] text-white/40">Protection de capital</span>
            </div>

            {/* Take Profit % */}
            <div className="space-y-1">
              <label className="text-white/80 font-bold block text-[11px]">Take-Profit (TP %)</label>
              <input
                type="number"
                value={takeProfitPercent}
                onChange={(e) => setTakeProfitPercent(Number(e.target.value))}
                min={2}
                max={50}
                className="w-full bg-[#050505] border border-white/15 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                required
              />
              <span className="text-[10px] text-white/40">Objectif de gain</span>
            </div>

          </div>

          {/* Budget Impact Summary */}
          <div className="bg-[#050505] p-3.5 rounded-xl border border-white/10 flex items-center justify-between font-mono text-xs">
            <div>
              <span className="text-white/40 block text-[10px] uppercase">Engagement Requis</span>
              <span className="font-bold text-white text-base">
                {totalRequiredCAD.toLocaleString('fr-CA')} $ CAD{' '}
                <span className="text-white/40 text-xs">({selectedSymbols.length} positions)</span>
              </span>
            </div>

            <div className="text-right">
              <span className="text-white/40 block text-[10px] uppercase">Budget Actif Disponible</span>
              <span className={`font-bold text-base ${isBudgetSufficient ? 'text-emerald-400' : 'text-rose-400'}`}>
                {settings.activeBudgetCAD.toLocaleString('fr-CA')} $ CAD
              </span>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            {!isBudgetSufficient && (
              <span className="text-rose-400 text-[10px] font-semibold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                Budget insuffisant. Ajustez l'allocation ou débloquez une tranche.
              </span>
            )}

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
                disabled={!isBudgetSufficient || selectedSymbols.length === 0}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-extrabold rounded-xl flex items-center space-x-2 shadow-lg transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>Lancer les {selectedSymbols.length} Trades Simultanés</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
