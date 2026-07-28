import React, { useState, useEffect } from 'react';
import { X, Key, Database, CheckCircle2, Cpu, Server, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { ApiKeySettings } from '../types';

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: ApiKeySettings;
  onSaveApiKeys: (newKeys: ApiKeySettings) => void;
}

export const ApiKeysModal: React.FC<ApiKeysModalProps> = ({
  isOpen,
  onClose,
  apiKeys,
  onSaveApiKeys,
}) => {
  const [twelveDataKey, setTwelveDataKey] = useState(apiKeys.twelveDataApiKey || '');
  const [tradingViewToken, setTradingViewToken] = useState(apiKeys.tradingViewWebhookToken || '');
  const [alpacaKey, setAlpacaKey] = useState(apiKeys.alpacaApiKey || '');
  const [alpacaSecret, setAlpacaSecret] = useState(apiKeys.alpacaApiSecret || '');
  const [ibkrAccount, setIbkrAccount] = useState(apiKeys.interactiveBrokersAccountId || '');
  const [binanceKey, setBinanceKey] = useState(apiKeys.binanceApiKey || '');
  const [dataMode, setDataMode] = useState<ApiKeySettings['dataMode']>(apiKeys.dataMode || 'LIVE_SIMULATED');
  const [backtestRange, setBacktestRange] = useState<ApiKeySettings['backtestYearRange']>(apiKeys.backtestYearRange || '2023-2024');

  // La modale reste montée : sans resynchronisation à l'ouverture, elle
  // réaffiche indéfiniment les valeurs capturées au premier rendu.
  useEffect(() => {
    if (!isOpen) return;
    setTwelveDataKey(apiKeys.twelveDataApiKey || '');
    setTradingViewToken(apiKeys.tradingViewWebhookToken || '');
    setAlpacaKey(apiKeys.alpacaApiKey || '');
    setAlpacaSecret(apiKeys.alpacaApiSecret || '');
    setIbkrAccount(apiKeys.interactiveBrokersAccountId || '');
    setBinanceKey(apiKeys.binanceApiKey || '');
    setDataMode(apiKeys.dataMode || 'LIVE_SIMULATED');
    setBacktestRange(apiKeys.backtestYearRange || '2023-2024');
  }, [isOpen, apiKeys]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiKeys({
      twelveDataApiKey: twelveDataKey,
      tradingViewWebhookToken: tradingViewToken,
      alpacaApiKey: alpacaKey,
      alpacaApiSecret: alpacaSecret,
      interactiveBrokersAccountId: ibkrAccount,
      binanceApiKey: binanceKey,
      dataMode,
      backtestYearRange: backtestRange,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0a0a0a] border border-white/15 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-0 text-white">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#050505]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#00d2ff]/10 text-[#00d2ff] rounded-xl border border-[#00d2ff]/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm tracking-tight">
                Connexions API Courtiers & Flux de Données
              </h3>
              <p className="text-[11px] text-white/50">
                Configurez vos clés pour le temps réel ou l'entraînement sur données historiques
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

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
          
          {/* Data Mode Selector */}
          <div className="space-y-3 bg-[#050505] p-4 rounded-xl border border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-4 h-4 text-[#00d2ff]" />
                Mode d'Alimentation du Graphique & Modèle
              </label>
              <span className="text-[10px] text-[#00d2ff] font-mono font-semibold">
                {dataMode === 'LIVE_SIMULATED' ? 'Simulé Temps Réel' : dataMode === 'TWELVE_DATA_REALTIME' ? 'Twelve Data Direct' : 'Backtest Historique'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setDataMode('LIVE_SIMULATED')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  dataMode === 'LIVE_SIMULATED'
                    ? 'bg-[#00d2ff]/15 border-[#00d2ff] text-white shadow-md'
                    : 'bg-[#111] border-white/10 text-white/60 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-white">Simulé CAD (Standard)</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#22c55e]" />
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  Flux algorithmique temps réel intégré avec volatilité TSX / NYSE.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDataMode('TWELVE_DATA_REALTIME')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  dataMode === 'TWELVE_DATA_REALTIME'
                    ? 'bg-[#00d2ff]/15 border-[#00d2ff] text-white shadow-md'
                    : 'bg-[#111] border-white/10 text-white/60 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-white">Twelve Data (API Direct)</span>
                  <Server className="w-3.5 h-3.5 text-[#00d2ff]" />
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  Données de marché en direct réelles via websockets Twelve Data.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDataMode('BACKTEST_HISTORICAL')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  dataMode === 'BACKTEST_HISTORICAL'
                    ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                    : 'bg-[#111] border-white/10 text-white/60 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-amber-400">Backtest Historique</span>
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  Entraînement des agents sur données d'années passées (2020-2026).
                </p>
              </button>
            </div>

            {/* Backtest Range Selector if BACKTEST_HISTORICAL */}
            {dataMode === 'BACKTEST_HISTORICAL' && (
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                <div>
                  <span className="font-bold text-amber-300 block text-xs">Période Historique d'Entraînement</span>
                  <span className="text-[10px] text-white/60">Simuler les décisions d'agents sur le passé</span>
                </div>
                <select
                  value={backtestRange}
                  onChange={(e) => setBacktestRange(e.target.value as any)}
                  className="bg-[#050505] border border-amber-500/40 rounded-lg px-3 py-1.5 text-amber-300 font-mono font-bold text-xs focus:outline-none"
                >
                  <option value="2020-2021">2020 - 2021 (Crash & Rebond Covid)</option>
                  <option value="2021-2022">2021 - 2022 (Bull Run Technologique)</option>
                  <option value="2022-2023">2022 - 2023 (Correction Taux & Inflation)</option>
                  <option value="2023-2024">2023 - 2024 (Rallye Intelligence Artificielle)</option>
                  <option value="2024-2026">2024 - 2026 (Données Récentes Améliorées)</option>
                </select>
              </div>
            )}
          </div>

          {/* API Keys Credentials Grid */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-[#00d2ff]" />
              Clés d'Accès aux Services & Courtiers (TradingView, 12Data, Interactive Brokers...)
            </h4>

            {/* Twelve Data Key */}
            <div className="space-y-1 bg-[#111] p-3 rounded-xl border border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-white font-bold block">12 Data (Twelve Data API Key)</label>
                <a href="https://twelvedata.com/" target="_blank" rel="noreferrer" className="text-[10px] text-[#00d2ff] hover:underline">
                  Obtenir une clé gratuite →
                </a>
              </div>
              <input
                type="password"
                value={twelveDataKey}
                onChange={(e) => setTwelveDataKey(e.target.value)}
                placeholder="ex: 8f72a1290b3445..."
                className="w-full bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#00d2ff]"
              />
              <span className="text-[10px] text-white/40">Utilisé pour obtenir les cours d'actions TSX / CAD & US en temps réel</span>
            </div>

            {/* TradingView Webhook Secret */}
            <div className="space-y-1 bg-[#111] p-3 rounded-xl border border-white/10">
              <label className="text-white font-bold block">TradingView Webhook Secret Token</label>
              <input
                type="text"
                value={tradingViewToken}
                onChange={(e) => setTradingViewToken(e.target.value)}
                placeholder="ex: tv_secret_farm_99218"
                className="w-full bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#00d2ff]"
              />
              <span className="text-[10px] text-white/40">Permet à vos graphiques TradingView d'envoyer des alertes directes à la ferme</span>
            </div>

            {/* Alpaca Trading API */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#111] p-3 rounded-xl border border-white/10">
              <div className="space-y-1">
                <label className="text-white font-bold block">Alpaca API Key ID</label>
                <input
                  type="text"
                  value={alpacaKey}
                  onChange={(e) => setAlpacaKey(e.target.value)}
                  placeholder="PK..."
                  className="w-full bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#00d2ff]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-white font-bold block">Alpaca Secret Key</label>
                <input
                  type="password"
                  value={alpacaSecret}
                  onChange={(e) => setAlpacaSecret(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#00d2ff]"
                />
              </div>
            </div>

            {/* Interactive Brokers / Questrade Account */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#111] p-3 rounded-xl border border-white/10">
              <div className="space-y-1">
                <label className="text-white font-bold block">Interactive Brokers / Questrade ID</label>
                <input
                  type="text"
                  value={ibkrAccount}
                  onChange={(e) => setIbkrAccount(e.target.value)}
                  placeholder="U1234567"
                  className="w-full bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#00d2ff]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-white font-bold block">Clé API Binance / Crypto</label>
                <input
                  type="password"
                  value={binanceKey}
                  onChange={(e) => setBinanceKey(e.target.value)}
                  placeholder="ApiKey_Crypto..."
                  className="w-full bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#00d2ff]"
                />
              </div>
            </div>

          </div>

          {/* Avertissement de stockage exact : les clés sont conservées en clair dans
              localStorage. Annoncer un chiffrement inexistant induirait l'utilisateur
              à saisir des identifiants de courtier réels sur cette base. */}
          <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-[11px]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                Ces clés sont enregistrées <strong>en clair</strong> dans le stockage local de votre navigateur, sans
                chiffrement. Elles ne sont jamais transmises à un serveur, mais restent lisibles par toute extension ou
                toute personne ayant accès à cette session.
              </p>
              <p>
                Cette application est une simulation : aucune de ces clés n'est utilisée pour passer un ordre réel.
                N'y saisissez pas d'identifiants de courtier disposant de droits de négociation.
              </p>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl font-semibold transition-all"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#00d2ff] hover:bg-[#00b2df] text-black font-extrabold rounded-xl flex items-center space-x-1.5 shadow-lg transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Enregistrer les Clés</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
