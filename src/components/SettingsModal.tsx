import React, { useState, useEffect } from 'react';
import { X, Save, Landmark, AlertTriangle } from 'lucide-react';
import { PortfolioSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PortfolioSettings;
  /** Capital immobilisé dans les positions ouvertes : il ne peut pas être réalloué. */
  committedCapitalCAD: number;
  onSaveSettings: (newSettings: PortfolioSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  committedCapitalCAD,
  onSaveSettings,
}) => {
  const [totalCapital, setTotalCapital] = useState(settings.totalCapitalCAD);
  const [activeBudget, setActiveBudget] = useState(settings.activeBudgetCAD);
  const [targetGoal, setTargetGoal] = useState(settings.targetGoalCAD);
  const [maxRiskPercent, setMaxRiskPercent] = useState(settings.maxRiskPercentPerTrade);
  const [scalingProfitThreshold, setScalingProfitThreshold] = useState(settings.scalingProfitThresholdPercent);
  const [scalingTranche, setScalingTranche] = useState(settings.scalingTrancheAmountCAD);

  /**
   * Le formulaire est resynchronisé à chaque ouverture.
   *
   * Les `useState` ne s'initialisent qu'au montage : comme la modale reste montée
   * en permanence, elle réaffichait les valeurs figées au premier rendu et
   * écrasait, à l'enregistrement, tous les mouvements de capital survenus depuis.
   */
  useEffect(() => {
    if (!isOpen) return;
    setTotalCapital(settings.totalCapitalCAD);
    setActiveBudget(settings.activeBudgetCAD);
    setTargetGoal(settings.targetGoalCAD);
    setMaxRiskPercent(settings.maxRiskPercentPerTrade);
    setScalingProfitThreshold(settings.scalingProfitThresholdPercent);
    setScalingTranche(settings.scalingTrancheAmountCAD);
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const bankReserve = Math.max(0, totalCapital - activeBudget - committedCapitalCAD);
  const isOverAllocated = activeBudget + committedCapitalCAD > totalCapital;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverAllocated) return;

    onSaveSettings({
      totalCapitalCAD: Number(totalCapital),
      activeBudgetCAD: Number(activeBudget),
      bankReserveCAD: Number(bankReserve),
      targetGoalCAD: Number(targetGoal),
      maxRiskPercentPerTrade: Number(maxRiskPercent),
      scalingProfitThresholdPercent: Number(scalingProfitThreshold),
      scalingTrancheAmountCAD: Number(scalingTranche),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-2">
            <Landmark className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-slate-100 text-sm">Ajustement des Paramètres du Portefeuille ($ CAD)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          {/* Total Capital CAD */}
          <div className="space-y-1">
            <label className="text-slate-300 font-bold block">Capital Total Disponible (Banque globale en $ CAD)</label>
            <input
              type="number"
              value={totalCapital}
              onChange={(e) => setTotalCapital(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-bold focus:outline-none focus:border-amber-500"
              required
            />
            <span className="text-[10px] text-slate-400">Défaut: 10 000 $ CAD</span>
          </div>

          {/* Active Starting Budget CAD */}
          <div className="space-y-1">
            <label className="text-slate-300 font-bold block">Budget Actif de Départ (Alloué aux agents en $ CAD)</label>
            <input
              type="number"
              value={activeBudget}
              onChange={(e) => setActiveBudget(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-bold focus:outline-none focus:border-amber-500"
              required
            />
            <span className="text-[10px] text-slate-400">Défaut: 1 000 $ CAD</span>
          </div>

          {/* Target Portfolio Goal */}
          <div className="space-y-1">
            <label className="text-slate-300 font-bold block">Objectif Final du Portefeuille ($ CAD)</label>
            <input
              type="number"
              value={targetGoal}
              onChange={(e) => setTargetGoal(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-cyan-400 font-bold focus:outline-none focus:border-cyan-500"
              required
            />
            <span className="text-[10px] text-slate-400">Défaut: 20 000 $ CAD</span>
          </div>

          {/* Max Risk % Per Trade */}
          <div className="space-y-1">
            <label className="text-slate-300 font-bold block">Risque Max par Trade (% du Budget Actif)</label>
            <select
              value={maxRiskPercent}
              onChange={(e) => setMaxRiskPercent(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value={1}>1% (Très Prudent)</option>
              <option value={2}>2% (Recommandé Standard)</option>
              <option value={3}>3% (Agressif Modéré)</option>
            </select>
          </div>

          {/* Scaling Profit Threshold % */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Seuil Profit Scaling (%)</label>
              <input
                type="number"
                value={scalingProfitThreshold}
                onChange={(e) => setScalingProfitThreshold(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
              />
              <span className="text-[10px] text-slate-400">ex: +15% de gain</span>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Tranche à Débloquer ($ CAD)</label>
              <input
                type="number"
                value={scalingTranche}
                onChange={(e) => setScalingTranche(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
              />
              <span className="text-[10px] text-slate-400">ex: +1 000 $ CAD</span>
            </div>
          </div>

          {/* Répartition résultante, calculée en tenant compte du capital déjà engagé. */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between text-slate-400">
              <span>Capital engagé dans les positions ouvertes</span>
              <span className="text-amber-400 font-bold">{committedCapitalCAD.toLocaleString('fr-CA')} $ CAD</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Réserve bancaire résultante</span>
              <span className="text-slate-200 font-bold">{bankReserve.toLocaleString('fr-CA')} $ CAD</span>
            </div>
          </div>

          {isOverAllocated && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-[11px]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Le budget actif ({activeBudget.toLocaleString('fr-CA')} $) ajouté au capital engagé (
                {committedCapitalCAD.toLocaleString('fr-CA')} $) dépasse le capital total. Augmentez le capital total ou
                réduisez le budget actif.
              </span>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isOverAllocated}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-emerald-400 hover:from-amber-400 hover:to-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-extrabold rounded-xl flex items-center space-x-1.5 shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer et Mettre à Jour</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
