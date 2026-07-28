import React, { useState } from 'react';
import { Bot, Search, Newspaper, Shield, Zap, CheckCircle, Copy, Send, ArrowRight, Check, AlertTriangle, Info } from 'lucide-react';
import { AgentDebateResult, MarketAsset, PortfolioSettings, HistoricalTrade } from '../types';
import { mtTimestamp } from '../lib/time';

interface AgentDebateViewProps {
  debateResult: AgentDebateResult | null;
  /** Message du serveur, par exemple lorsque le moteur de règles a pris le relais. */
  notice: string | null;
  isLoading: boolean;
  onRunDeliberation: () => void;
  onExecuteTrade: (decision: AgentDebateResult['finalDecision']) => void;
  onSendWebhookTest: (payload: any) => void;
  selectedAsset: MarketAsset;
  settings: PortfolioSettings;
  isFirmAuthorized: boolean;
  onToggleFirmAuthorization: () => void;
  closedTrades: HistoricalTrade[];
}

export const AgentDebateView: React.FC<AgentDebateViewProps> = ({
  debateResult,
  notice,
  isLoading,
  onRunDeliberation,
  onExecuteTrade,
  onSendWebhookTest,
  selectedAsset,
  settings,
  isFirmAuthorized,
  onToggleFirmAuthorization,
  closedTrades,
}) => {
  const [copiedJson, setCopiedJson] = useState(false);

  /**
   * Gains réellement réalisés sur les positions ouvertes par les agents.
   * L'ancienne valeur était une constante codée en dur (315,80 $) affichée comme
   * un résultat de la ferme d'agents.
   */
  const agentTrades = closedTrades.filter((t) => t.source === 'AGENT');
  const agentNetCAD = Math.round(agentTrades.reduce((acc, t) => acc + t.pnlCAD, 0) * 100) / 100;

  const handleCopyJson = async () => {
    if (!debateResult) return;
    const payload = debateResult.institutionalReport?.aeeEngine?.webhookPayload ?? debateResult.webhookPayload;
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2500);
    } catch {
      // L'API presse-papiers est refusée hors contexte sécurisé : on n'affiche
      // pas un état « copié » mensonger.
      console.warn('Presse-papiers indisponible dans ce contexte.');
    }
  };

  const decision = debateResult?.finalDecision;
  const isActionable = decision?.action === 'ACHETER' || decision?.action === 'BUY';
  const confidence = debateResult?.institutionalReport?.cioEngine?.globalConfidenceScore;

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-5 relative overflow-hidden">
      <div
        className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all ${
          isFirmAuthorized ? 'bg-emerald-500/10' : 'bg-amber-500/5'
        }`}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2 flex-wrap">
            <Bot className="w-6 h-6 text-[#00d2ff]" />
            <h2 className="text-lg font-extrabold text-white">Délibération de la ferme d'agents</h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                isFirmAuthorized
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {isFirmAuthorized ? 'Exécution automatique' : 'Validation manuelle'}
            </span>
          </div>
          <p className="text-xs text-white/50 mt-0.5 font-mono">
            <strong className="text-[#00d2ff]">{selectedAsset.symbol}</strong> à{' '}
            {selectedAsset.priceCAD.toLocaleString('fr-CA')} $ • budget{' '}
            {settings.activeBudgetCAD.toLocaleString('fr-CA')} $
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleFirmAuthorization}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition-all flex items-center space-x-1.5 ${
              isFirmAuthorized
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                : 'bg-[#111] hover:bg-white/10 text-white/80 border-white/15'
            }`}
            title="Autoriser la ferme à exécuter automatiquement les ordres d'achat recommandés"
          >
            {isFirmAuthorized ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Ferme autorisée</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Autoriser la ferme</span>
              </>
            )}
          </button>

          <button
            onClick={onRunDeliberation}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl font-mono font-extrabold text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg transition-all ${
              isLoading
                ? 'bg-[#111] text-white/40 cursor-not-allowed border border-white/10'
                : 'bg-gradient-to-r from-[#00d2ff] via-emerald-400 to-amber-400 hover:opacity-95 text-black'
            }`}
          >
            <Zap className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Délibération…' : "Lancer l'analyse"}</span>
          </button>
        </div>
      </div>

      <div
        className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 ${
          isFirmAuthorized
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}
      >
        <div className="flex items-center space-x-2">
          {isFirmAuthorized ? (
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>
            {isFirmAuthorized
              ? "Les ordres d'achat recommandés sont exécutés automatiquement, stop et cible posés à l'ouverture."
              : 'Chaque ordre recommandé attend votre validation explicite.'}
          </span>
        </div>

        <span className="text-white font-bold shrink-0 bg-white/10 px-2 py-1 rounded whitespace-nowrap">
          {agentTrades.length === 0
            ? 'Aucun trade agent clos'
            : `${agentNetCAD >= 0 ? '+' : ''}${agentNetCAD.toLocaleString('fr-CA')} $ sur ${agentTrades.length}`}
        </span>
      </div>

      {notice && (
        <div className="flex items-start gap-2 p-3 rounded-xl border border-white/15 bg-white/5 text-[11px] text-white/70">
          <Info className="w-4 h-4 text-[#00d2ff] shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      {isLoading && (
        <div className="space-y-4 py-8 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-[#050505] rounded-2xl border border-white/10 space-y-2">
              <div className="h-4 bg-white/10 rounded w-1/4" />
              <div className="h-3 bg-white/5 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {!debateResult && !isLoading && (
        <div className="py-12 px-4 text-center bg-[#050505] border border-dashed border-white/15 rounded-2xl space-y-3">
          <Bot className="w-12 h-12 text-white/20 mx-auto" />
          <h3 className="text-sm font-bold text-white/80">Aucune délibération pour {selectedAsset.symbol}</h3>
          <p className="text-xs text-white/50 max-w-md mx-auto">
            Lancez l'analyse pour faire délibérer les cinq moteurs : quantitatif, sentiment, risque, investissement et
            exécution.
          </p>
        </div>
      )}

      {debateResult && !isLoading && decision && (
        <div className="space-y-6">
          <div className="space-y-3 bg-[#050505] border border-white/10 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-white flex items-center space-x-2">
                <Bot className="w-4 h-4 text-[#00d2ff]" />
                <span>1. Comité décisionnel</span>
              </h3>
              <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30 font-bold">
                {debateResult.institutionalReport?.timestampMT || mtTimestamp()}
              </div>
            </div>

            <div className="space-y-3 pt-2 font-mono text-xs">
              <div className="bg-[#111] p-3.5 rounded-xl border border-blue-500/30 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-blue-400 flex items-center space-x-1.5">
                    <Search className="w-3.5 h-3.5" />
                    <span>Moteur quantitatif (QSE)</span>
                  </span>
                  {debateResult.institutionalReport?.qseEngine?.score !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-extrabold whitespace-nowrap">
                      {debateResult.institutionalReport.qseEngine.score} / 100
                    </span>
                  )}
                </div>
                <p className="text-white/80 leading-relaxed font-sans text-xs">
                  {debateResult.institutionalReport?.qseEngine?.technicalDetails || debateResult.technicalAnalysis}
                </p>
                {debateResult.institutionalReport?.qseEngine?.marketRegime && (
                  <div className="text-[10px] text-blue-300 font-bold">
                    Régime de marché : {debateResult.institutionalReport.qseEngine.marketRegime}
                  </div>
                )}
              </div>

              <div className="bg-[#111] p-3.5 rounded-xl border border-purple-500/30 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-purple-400 flex items-center space-x-1.5">
                    <Newspaper className="w-3.5 h-3.5" />
                    <span>Moteur macro / sentiment (SMI)</span>
                  </span>
                  {debateResult.institutionalReport?.smiEngine?.score !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-extrabold whitespace-nowrap">
                      {debateResult.institutionalReport.smiEngine.score} / 100
                    </span>
                  )}
                </div>
                <p className="text-white/80 leading-relaxed font-sans text-xs">
                  {debateResult.institutionalReport?.smiEngine?.sentimentDetails || debateResult.sentimentAnalysis}
                </p>
                {debateResult.institutionalReport?.smiEngine?.macroImpact && (
                  <div className="text-[10px] text-purple-300 font-bold">
                    {debateResult.institutionalReport.smiEngine.macroImpact}
                  </div>
                )}
              </div>

              <div className="bg-[#111] p-3.5 rounded-xl border border-amber-500/30 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-amber-400 flex items-center space-x-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Gestion du risque (CRO)</span>
                  </span>
                  {debateResult.institutionalReport?.croEngine?.vetoStatus && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold whitespace-nowrap">
                      {debateResult.institutionalReport.croEngine.vetoStatus}
                    </span>
                  )}
                </div>
                <p className="text-white/80 leading-relaxed font-sans text-xs">
                  {debateResult.institutionalReport?.croEngine?.riskDetails || debateResult.riskManagement.text}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px] pt-1">
                  {debateResult.institutionalReport?.croEngine?.slotAssigned !== undefined && (
                    <span className="bg-white/5 px-2 py-0.5 rounded text-white/70">
                      Slot #{debateResult.institutionalReport.croEngine.slotAssigned}
                    </span>
                  )}
                  {debateResult.institutionalReport?.croEngine?.riskRewardRatio && (
                    <span className="bg-white/5 px-2 py-0.5 rounded text-white/70">
                      R:R{' '}
                      <strong className="text-emerald-300">
                        {debateResult.institutionalReport.croEngine.riskRewardRatio}
                      </strong>
                    </span>
                  )}
                  <span className="bg-white/5 px-2 py-0.5 rounded text-white/70">
                    Risque{' '}
                    <strong className="text-rose-300">
                      {debateResult.riskManagement.suggestedRiskPercent} % du budget actif
                    </strong>
                  </span>
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border-2 space-y-2 ${
                  isActionable
                    ? 'bg-gradient-to-r from-emerald-950/40 via-[#0a0a0a] to-emerald-950/40 border-emerald-500/40'
                    : 'bg-[#111] border-white/15'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-emerald-400 flex items-center space-x-1.5 text-xs">
                    <Zap className="w-4 h-4" />
                    <span>Comité exécutif (CIO)</span>
                  </span>
                  {confidence !== undefined && (
                    <span
                      className={`px-3 py-1 rounded font-black text-sm ${
                        confidence >= 60
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : confidence <= -60
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-white/10 text-white/70'
                      }`}
                    >
                      Confiance {confidence} / 100
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-white flex items-center space-x-2 flex-wrap gap-1">
                  <span>Décision :</span>
                  <span
                    className={`px-3 py-0.5 rounded-full text-xs font-black uppercase ${
                      isActionable ? 'bg-emerald-500 text-black' : 'bg-white/20 text-white'
                    }`}
                  >
                    {debateResult.institutionalReport?.cioEngine?.finalDecision || decision.action}
                  </span>
                </div>
                <p className="text-white/70 text-xs font-sans italic">
                  {debateResult.institutionalReport?.cioEngine?.reasoning || decision.reasoning}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#050505] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-2 flex-wrap">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-[#00d2ff]" />
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">2. Ordre d'exécution</h3>
              </div>
              <span
                className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                  isActionable ? 'bg-emerald-500 text-black' : 'bg-white/20 text-white'
                }`}
              >
                {decision.action}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-[#111] p-3 rounded-xl border border-white/10">
                <span className="text-white/40 block text-[10px] uppercase">Symbole</span>
                <span className="font-bold text-[#00d2ff] text-sm">{decision.symbol}</span>
              </div>
              <div className="bg-[#111] p-3 rounded-xl border border-white/10">
                <span className="text-white/40 block text-[10px] uppercase">Taille allouée</span>
                <span className="font-bold text-white text-sm">
                  {decision.positionSizeCAD.toLocaleString('fr-CA')} $
                </span>
              </div>
              <div className="bg-[#111] p-3 rounded-xl border border-rose-500/30">
                <span className="text-rose-400 block text-[10px] uppercase font-bold">Stop-loss</span>
                <span className="font-extrabold text-rose-300 text-sm">
                  {decision.stopLossPrice.toLocaleString('fr-CA')} $
                </span>
              </div>
              <div className="bg-[#111] p-3 rounded-xl border border-emerald-500/30">
                <span className="text-emerald-400 block text-[10px] uppercase font-bold">Take-profit</span>
                <span className="font-extrabold text-emerald-300 text-sm">
                  {decision.takeProfitPrice.toLocaleString('fr-CA')} $
                </span>
              </div>
            </div>

            {isActionable && (
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
                <div className="text-xs text-white/50 flex items-center space-x-1 font-mono">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Stop et cible posés automatiquement à l'ouverture</span>
                </div>

                <button
                  onClick={() => onExecuteTrade(decision)}
                  disabled={decision.positionSizeCAD <= 0}
                  className="px-6 py-2.5 rounded-xl font-mono font-extrabold text-xs uppercase tracking-wider flex items-center space-x-2 transition-all bg-gradient-to-r from-[#00d2ff] via-emerald-400 to-amber-400 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed text-black shadow-lg"
                >
                  <span>Exécuter ({decision.positionSizeCAD.toLocaleString('fr-CA')} $ CAD)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="bg-[#050505] border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 gap-2 flex-wrap">
              <span className="font-mono text-xs text-emerald-400 font-bold">3. Payload webhook JSON</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyJson}
                  className="px-3 py-1 bg-[#111] hover:bg-white/10 text-white border border-white/15 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition-all"
                >
                  {copiedJson ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#00d2ff]" />
                  )}
                  <span>{copiedJson ? 'Copié' : 'Copier'}</span>
                </button>

                <button
                  onClick={() => onSendWebhookTest(debateResult.webhookPayload)}
                  className="px-3 py-1 bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-200 border border-indigo-700/50 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Tester</span>
                </button>
              </div>
            </div>

            <pre className="bg-black p-4 rounded-xl text-xs font-mono text-emerald-300 border border-white/10 overflow-x-auto">
              {JSON.stringify(
                debateResult.institutionalReport?.aeeEngine?.webhookPayload ?? debateResult.webhookPayload,
                null,
                2
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
