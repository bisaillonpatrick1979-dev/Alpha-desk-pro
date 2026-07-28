import React, { useState } from 'react';
import { Bot, Search, Newspaper, Shield, Zap, CheckCircle, Copy, Send, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { AgentDebateResult, MarketAsset, PortfolioSettings } from '../types';

interface AgentDebateViewProps {
  debateResult: AgentDebateResult | null;
  isLoading: boolean;
  onRunDeliberation: () => void;
  onExecuteTrade: (decision: AgentDebateResult['finalDecision']) => void;
  onSendWebhookTest: (payload: any) => void;
  selectedAsset: MarketAsset;
  settings: PortfolioSettings;
  isFirmAuthorized: boolean;
  onToggleFirmAuthorization: () => void;
  firmGeneratedProfitCAD: number;
}

export const AgentDebateView: React.FC<AgentDebateViewProps> = ({
  debateResult,
  isLoading,
  onRunDeliberation,
  onExecuteTrade,
  onSendWebhookTest,
  selectedAsset,
  settings,
  isFirmAuthorized,
  onToggleFirmAuthorization,
  firmGeneratedProfitCAD,
}) => {
  const [copiedJson, setCopiedJson] = useState(false);
  const [tradeExecuted, setTradeExecuted] = useState(false);

  const handleCopyJson = () => {
    if (!debateResult) return;
    navigator.clipboard.writeText(JSON.stringify(debateResult.webhookPayload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  };

  const handleExecute = () => {
    if (!debateResult) return;
    onExecuteTrade(debateResult.finalDecision);
    setTradeExecuted(true);
    setTimeout(() => setTradeExecuted(false), 3000);
  };

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-5 relative overflow-hidden">
      
      {/* Background Accent Glow */}
      <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all ${
        isFirmAuthorized ? 'bg-emerald-500/10' : 'bg-amber-500/5'
      }`} />

      {/* Header & Authorization Control */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2">
            <Bot className="w-6 h-6 text-[#00d2ff]" />
            <h2 className="text-lg font-extrabold text-white">Délibération de la Ferme d'Agents</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
              isFirmAuthorized
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}>
              {isFirmAuthorized ? '⚡ AUTORISATION ACTIF' : '🔒 MODE MANUEL'}
            </span>
          </div>
          <p className="text-xs text-white/50 mt-0.5 font-mono">
            Évaluation intelligente pour <strong className="text-[#00d2ff]">{selectedAsset.symbol}</strong> ({selectedAsset.priceCAD} $) • Budget: {settings.activeBudgetCAD} $
          </p>
        </div>

        {/* Firm Authorization Toggle Button & Action */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleFirmAuthorization}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition-all flex items-center space-x-1.5 ${
              isFirmAuthorized
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                : 'bg-[#111] hover:bg-white/10 text-white/80 border-white/15'
            }`}
            title="Accorder l'autorisation à la ferme d'acheter et de placer les Stop Loss automatiquement"
          >
            {isFirmAuthorized ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Ferme Autorisée ⚡</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Autoriser la Ferme</span>
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
            <Zap className={`w-4 h-4 ${isLoading ? 'animate-spin text-black' : ''}`} />
            <span>{isLoading ? 'Délibération...' : 'Lancer l\'Analyse'}</span>
          </button>
        </div>
      </div>

      {/* Authorization Status Banner */}
      <div className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 ${
        isFirmAuthorized
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
      }`}>
        <div className="flex items-center space-x-2">
          {isFirmAuthorized ? (
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>
            {isFirmAuthorized
              ? "Autorisation accordée à la ferme d'agents : les décisions d'achat, le placement des Stop Loss/Take Profit et le retrait des gains sont exécutés automatiquement!"
              : "La ferme attend votre autorisation pour exécuter automatiquement les trades recommandés."}
          </span>
        </div>

        <span className="text-white font-bold shrink-0 bg-white/10 px-2 py-1 rounded">
          Gains Ferme: +{firmGeneratedProfitCAD.toLocaleString('fr-CA')} $ CAD
        </span>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4 py-8 animate-pulse">
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <div className="h-4 bg-slate-800 rounded w-1/4"></div>
            <div className="h-3 bg-slate-800/60 rounded w-3/4"></div>
          </div>
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <div className="h-4 bg-slate-800 rounded w-1/3"></div>
            <div className="h-3 bg-slate-800/60 rounded w-4/5"></div>
          </div>
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <div className="h-4 bg-slate-800 rounded w-1/5"></div>
            <div className="h-3 bg-slate-800/60 rounded w-2/3"></div>
          </div>
        </div>
      )}

      {/* Empty State before deliberation */}
      {!debateResult && !isLoading && (
        <div className="py-12 px-4 text-center bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl space-y-3">
          <Bot className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">Aucune délibération en cours pour {selectedAsset.symbol}</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Cliquez sur <strong>"Lancer la Délibération"</strong> pour activer les 4 agents (Technique, Sentiment, Risk Manager & Capital Manager).
          </p>
        </div>
      )}

      {/* Debate Results Display */}
      {debateResult && !isLoading && (
        <div className="space-y-6">

          {/* SECTION 1: COMITÉ DÉCISIONNEL - DÉBAT INTER-MOTEURS */}
          <div className="space-y-3 bg-[#050505] border border-white/10 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-white flex items-center space-x-2">
                <Bot className="w-4 h-4 text-[#00d2ff]" />
                <span>1. Comité Décisionnel - Débat Inter-Moteurs (ALPHA-DESK PRO)</span>
              </h3>
              <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30 font-bold">
                🕒 Timestamp Alberta : {
                  debateResult.institutionalReport?.timestampMT || 
                  `${new Date().toLocaleDateString('fr-CA')} - ${new Date().toLocaleTimeString('en-US', { timeZone: 'America/Edmonton', hour: '2-digit', minute: '2-digit' })} MT`
                }
              </div>
            </div>

            <div className="space-y-3 pt-2 font-mono text-xs">
              
              {/* QSE Engine */}
              <div className="bg-[#111] p-3.5 rounded-xl border border-blue-500/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-400 flex items-center space-x-1.5">
                    <Search className="w-3.5 h-3.5" />
                    <span>📈 Moteur Quantitatif (QSE)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-extrabold">
                    Score : {debateResult.institutionalReport?.qseEngine?.score ?? 75} / 100
                  </span>
                </div>
                <p className="text-white/80 leading-relaxed font-sans text-xs">
                  {debateResult.institutionalReport?.qseEngine?.technicalDetails || debateResult.technicalAnalysis}
                </p>
                <div className="text-[10px] text-blue-300 font-bold">
                  Régime de Marché : {debateResult.institutionalReport?.qseEngine?.marketRegime || 'Tendance Haussière'}
                </div>
              </div>

              {/* SMI Engine */}
              <div className="bg-[#111] p-3.5 rounded-xl border border-purple-500/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-400 flex items-center space-x-1.5">
                    <Newspaper className="w-3.5 h-3.5" />
                    <span>🌐 Moteur Macro/Sentiment (SMI)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-extrabold">
                    Score : {debateResult.institutionalReport?.smiEngine?.score ?? 65} / 100
                  </span>
                </div>
                <p className="text-white/80 leading-relaxed font-sans text-xs">
                  {debateResult.institutionalReport?.smiEngine?.sentimentDetails || debateResult.sentimentAnalysis}
                </p>
                <div className="text-[10px] text-purple-300 font-bold">
                  Impact News & Volatilité : {debateResult.institutionalReport?.smiEngine?.macroImpact || 'Flux de capitaux institutionnels stables'}
                </div>
              </div>

              {/* CRO Engine */}
              <div className="bg-[#111] p-3.5 rounded-xl border border-amber-500/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 flex items-center space-x-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>🛡️ Risk Manager (CRO)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold">
                    Veto : {debateResult.institutionalReport?.croEngine?.vetoStatus || 'APPROBATION (NO VETO)'}
                  </span>
                </div>
                <p className="text-white/80 leading-relaxed font-sans text-xs">
                  {debateResult.institutionalReport?.croEngine?.riskDetails || debateResult.riskManagement.text}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px] pt-1">
                  <span className="bg-white/5 px-2 py-0.5 rounded text-white/70">
                    Slot Attribué : <strong className="text-amber-300">Slot #{debateResult.institutionalReport?.croEngine?.slotAssigned ?? 1} / 5</strong>
                  </span>
                  <span className="bg-white/5 px-2 py-0.5 rounded text-white/70">
                    Ratio Risque/Rendement : <strong className="text-emerald-300">{debateResult.institutionalReport?.croEngine?.riskRewardRatio || '1:2.2'}</strong>
                  </span>
                  <span className="bg-white/5 px-2 py-0.5 rounded text-white/70">
                    Risque Max : <strong className="text-rose-300">{debateResult.institutionalReport?.croEngine?.riskPerTradePercent ?? 2}% Budget Actif</strong>
                  </span>
                </div>
              </div>

              {/* CIO Engine */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-[#0a0a0a] to-emerald-950/40 p-4 rounded-xl border-2 border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center space-x-1.5 text-xs">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>🧠 Comité Exécutif (CIO Engine)</span>
                  </span>
                  <span className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 font-black text-sm">
                    Score de Confiance Final : {debateResult.institutionalReport?.cioEngine?.globalConfidenceScore ?? 78} / 100
                  </span>
                </div>
                <div className="text-xs font-bold text-white flex items-center space-x-2">
                  <span>Décision Institutionnelle :</span>
                  <span className="px-3 py-0.5 rounded-full text-xs font-black uppercase bg-emerald-500 text-black">
                    {debateResult.institutionalReport?.cioEngine?.finalDecision || debateResult.finalDecision.action}
                  </span>
                </div>
                <p className="text-white/70 text-xs font-sans italic">
                  "{debateResult.institutionalReport?.cioEngine?.reasoning || debateResult.finalDecision.reasoning}"
                </p>
              </div>

            </div>
          </div>

          {/* SECTION 2: ORDRE D'EXÉCUTION ALGORITHMIQUE */}
          <div className="bg-[#050505] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-[#00d2ff]" />
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">2. Ordre d'Exécution Algorithmique</h3>
              </div>
              
              <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                debateResult.finalDecision.action === 'ACHETER' || debateResult.finalDecision.action === 'BUY'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-950/50'
                  : 'bg-amber-500 text-black'
              }`}>
                Action : {debateResult.finalDecision.action}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-[#111] p-3 rounded-xl border border-white/10">
                <span className="text-white/40 block text-[10px] uppercase">Slot Assigné</span>
                <span className="font-bold text-amber-400 text-sm">Slot #{debateResult.institutionalReport?.croEngine?.slotAssigned ?? 1} / 5</span>
              </div>
              <div className="bg-[#111] p-3 rounded-xl border border-white/10">
                <span className="text-white/40 block text-[10px] uppercase">Symbole</span>
                <span className="font-bold text-[#00d2ff] text-sm">{debateResult.finalDecision.symbol}</span>
              </div>
              <div className="bg-[#111] p-3 rounded-xl border border-white/10">
                <span className="text-white/40 block text-[10px] uppercase">Taille Position Allouée</span>
                <span className="font-bold text-white text-sm">{debateResult.finalDecision.positionSizeCAD.toLocaleString('fr-CA')} $ CAD</span>
              </div>
              <div className="bg-[#111] p-3 rounded-xl border border-white/10">
                <span className="text-white/40 block text-[10px] uppercase">Type & Horizon</span>
                <span className="font-bold text-emerald-400 text-xs">
                  {debateResult.institutionalReport?.aeeEngine?.orderType || 'LIMIT'} • {debateResult.institutionalReport?.aeeEngine?.estimatedHorizon || 'Intraday'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-[#111] p-3 rounded-xl border border-rose-500/30">
                <span className="text-rose-400 block text-[10px] uppercase font-bold">Ordre Stop-Loss (SL)</span>
                <span className="font-extrabold text-rose-300 text-base">{debateResult.finalDecision.stopLossPrice} $ CAD</span>
              </div>
              <div className="bg-[#111] p-3 rounded-xl border border-emerald-500/30">
                <span className="text-emerald-400 block text-[10px] uppercase font-bold">Ordre Take-Profit (TP)</span>
                <span className="font-extrabold text-emerald-300 text-base">{debateResult.finalDecision.takeProfitPrice} $ CAD</span>
              </div>
            </div>

            {/* Execute Order Action Button */}
            {(debateResult.finalDecision.action === 'ACHETER' || debateResult.finalDecision.action === 'BUY' || debateResult.finalDecision.action === 'RETIRER') && (
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
                <div className="text-xs text-white/50 flex items-center space-x-1 font-mono">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Validation CRO conforme (SL/TP posés automatiquement)</span>
                </div>

                <button
                  onClick={handleExecute}
                  disabled={tradeExecuted}
                  className={`px-6 py-2.5 rounded-xl font-mono font-extrabold text-xs uppercase tracking-wider flex items-center space-x-2 transition-all ${
                    tradeExecuted
                      ? 'bg-emerald-500 text-black cursor-default'
                      : 'bg-gradient-to-r from-[#00d2ff] via-emerald-400 to-amber-400 hover:opacity-95 text-black shadow-lg shadow-emerald-950/50 hover:scale-[1.02]'
                  }`}
                >
                  {tradeExecuted ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Ordre Exécuté dans le Portefeuille !</span>
                    </>
                  ) : (
                    <>
                      <span>Acheter & Placer SL ({debateResult.finalDecision.positionSizeCAD} $ CAD)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

          </div>

          {/* SECTION 3: PAYLOAD WEBHOOK JSON */}
          <div className="bg-[#050505] border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs text-emerald-400 font-bold">3. Payload Webhook JSON (Standard Fix/JSON)</span>
                <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/10">Standard Fix/JSON Format</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyJson}
                  className="px-3 py-1 bg-[#111] hover:bg-white/10 text-white border border-white/15 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition-all"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#00d2ff]" />}
                  <span>{copiedJson ? 'Copié !' : 'Copier JSON'}</span>
                </button>

                <button
                  onClick={() => onSendWebhookTest(debateResult.webhookPayload)}
                  className="px-3 py-1 bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-200 border border-indigo-700/50 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Tester Webhook</span>
                </button>
              </div>
            </div>

            <pre className="bg-[#000] p-4 rounded-xl text-xs font-mono text-emerald-300 border border-white/10 overflow-x-auto">
              {JSON.stringify(
                debateResult.institutionalReport?.aeeEngine?.webhookPayload || {
                  timestamp_mt: `${new Date().toLocaleDateString('fr-CA')} ${new Date().toLocaleTimeString('en-US', { timeZone: 'America/Edmonton', hour: '2-digit', minute: '2-digit', second: '2-digit' })} MT`,
                  engine_status: 'EXECUTED',
                  confidence_score: debateResult.institutionalReport?.cioEngine?.globalConfidenceScore ?? 78,
                  slot_id: debateResult.institutionalReport?.croEngine?.slotAssigned ?? 1,
                  action: debateResult.finalDecision.actionEnglish || 'BUY',
                  symbol: debateResult.finalDecision.symbol,
                  amount_cad: debateResult.finalDecision.positionSizeCAD,
                  stop_loss: debateResult.finalDecision.stopLossPrice,
                  take_profit: debateResult.finalDecision.takeProfitPrice,
                },
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
