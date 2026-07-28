import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, ShieldCheck, Check, Globe, AlertTriangle, ToggleLeft, ToggleRight, Zap } from 'lucide-react';
import { WORLD_MARKETS_SCHEDULE, MarketScheduleInfo, calculateLiveMarketStatus } from '../data/marketSchedule';

interface MarketScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  allowedMarkets: string[]; // List of market codes allowed e.g. ['US', 'JP', 'AU', 'CA', 'FOREX', 'CRYPTO_COMMODITY']
  onToggleMarketPermission: (marketCode: string) => void;
  onRunMultiMarketTrade: (selectedMarkets: string[]) => void;
}

export const MarketScheduleModal: React.FC<MarketScheduleModalProps> = ({
  isOpen,
  onClose,
  allowedMarkets,
  onToggleMarketPermission,
  onRunMultiMarketTrade,
}) => {
  const [activeTab, setActiveTab] = useState<'HOURS' | 'HOLIDAYS' | 'PERMISSIONS'>('HOURS');
  const [albertaTime, setAlbertaTime] = useState<string>('');
  const [marketsWithStatus, setMarketsWithStatus] = useState<MarketScheduleInfo[]>(WORLD_MARKETS_SCHEDULE);

  useEffect(() => {
    const updateMT = () => {
      const now = new Date();
      const mtString = now.toLocaleTimeString('fr-CA', {
        timeZone: 'America/Edmonton',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setAlbertaTime(`${mtString} MT`);

      const updated = WORLD_MARKETS_SCHEDULE.map((m) => ({
        ...m,
        currentStatus: calculateLiveMarketStatus(m, now),
        isTradeAllowedByUser: allowedMarkets.includes(m.code),
      }));
      setMarketsWithStatus(updated);
    };

    updateMT();
    const interval = setInterval(updateMT, 1000);
    return () => clearInterval(interval);
  }, [allowedMarkets]);

  if (!isOpen) return null;

  const handleLaunchMultiMarketAnalysis = () => {
    onRunMultiMarketTrade(allowedMarkets);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0a0a0a] border border-white/15 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 bg-[#050505] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-[#00d2ff] via-emerald-400 to-amber-400 rounded-xl text-black">
              <Globe className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Horaires Réels des Marchés, Jours Fériés & Accès Multi-Marchés</span>
              </h2>
              <p className="text-xs text-white/50">
                Hub de Synchronisation Mondiale • Heure locale d'Alberta ({albertaTime || 'Mountain Time'})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 px-5 py-3 bg-[#080808] border-b border-white/10 font-mono text-xs font-bold">
          <button
            onClick={() => setActiveTab('HOURS')}
            className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all ${
              activeTab === 'HOURS'
                ? 'bg-gradient-to-r from-[#00d2ff]/20 to-emerald-500/20 text-[#00d2ff] border border-[#00d2ff]/40'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>1. Horaires & Sessions Réelles</span>
          </button>

          <button
            onClick={() => setActiveTab('HOLIDAYS')}
            className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all ${
              activeTab === 'HOLIDAYS'
                ? 'bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/40'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>2. Jours Fériés & Fermetures Prévues</span>
          </button>

          <button
            onClick={() => setActiveTab('PERMISSIONS')}
            className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all ${
              activeTab === 'PERMISSIONS'
                ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 border border-purple-500/40'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>3. Autorisations de Trading ({allowedMarkets.length} Actifs)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* TAB 1: Real Hours & Live Sessions */}
          {activeTab === 'HOURS' && (
            <div className="space-y-4">
              <div className="bg-[#111] p-3 rounded-xl border border-white/10 text-white/70 font-mono leading-relaxed flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Tous les horaires sont calculés en temps réel en <strong>Heure des Montagnes (MT - Alberta, Canada)</strong>.</span>
                </span>
                <span className="text-emerald-300 font-bold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/30">
                  {albertaTime}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {marketsWithStatus.map((m) => (
                  <div
                    key={m.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      m.currentStatus === 'OUVERT'
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : m.currentStatus === 'PRÉ-MARCHÉ' || m.currentStatus === 'APRÈS-BOURSE'
                        ? 'bg-amber-950/20 border-amber-500/30'
                        : 'bg-[#0f0f0f] border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{m.flag}</span>
                        <div>
                          <h4 className="font-bold text-white text-sm">{m.name}</h4>
                          <span className="text-[10px] text-white/50 font-mono">{m.exchange}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-wide border ${
                        m.currentStatus === 'OUVERT'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : m.currentStatus === 'PRÉ-MARCHÉ'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : m.currentStatus === 'APRÈS-BOURSE'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : m.currentStatus === 'PAUSE_DÉJEUNER'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}>
                        {m.currentStatus === 'OUVERT' ? '🟢 OUVERT' :
                         m.currentStatus === 'PRÉ-MARCHÉ' ? '🌅 PRÉ-MARCHÉ' :
                         m.currentStatus === 'APRÈS-BOURSE' ? '🌆 APRÈS-BOURSE' :
                         m.currentStatus === 'PAUSE_DÉJEUNER' ? '🍱 PAUSE DÉJEUNER' : '🔴 FERMÉ'}
                      </span>
                    </div>

                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="flex justify-between text-white/70">
                        <span>Horaires Locaux :</span>
                        <strong className="text-white">{m.normalHoursLocal}</strong>
                      </div>
                      <div className="flex justify-between text-[#00d2ff]">
                        <span>Converti en MT (Alberta) :</span>
                        <strong className="font-bold">{m.normalHoursMT}</strong>
                      </div>
                      <div className="pt-2 border-t border-white/10 text-[10px] text-white/50">
                        <span className="block font-bold text-white/70 mb-1">Sessions Principales :</span>
                        <ul className="list-disc list-inside space-y-0.5">
                          {m.sessionTypes.map((st, idx) => (
                            <li key={idx}>{st}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Holidays & Planned Closures */}
          {activeTab === 'HOLIDAYS' && (
            <div className="space-y-6">
              <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-amber-200 flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Consultez le calendrier officiel des <strong>jours fériés et fermetures anticipées prévues</strong> sur les places financières mondiales (NYSE, NASDAQ, TSX, TSE Tokyo, ASX Sydney, Interbank FX).
                </p>
              </div>

              <div className="space-y-5">
                {marketsWithStatus.map((m) => (
                  <div key={m.id} className="bg-[#111] border border-white/10 rounded-xl p-4 space-y-3">
                    <div className="flex items-center space-x-2 border-b border-white/10 pb-2">
                      <span className="text-xl">{m.flag}</span>
                      <h4 className="font-bold text-white text-sm">{m.name} ({m.exchange})</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
                      {/* Holidays */}
                      <div>
                        <h5 className="font-bold text-amber-400 mb-2 flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Jours Fériés Clés (Holidays) :</span>
                        </h5>
                        {m.holidays.length === 0 ? (
                          <span className="text-white/40 italic">Aucun jour férié (Actif 24/7)</span>
                        ) : (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-2">
                            {m.holidays.map((h, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-white/5 p-1.5 rounded border border-white/5">
                                <span className="text-white/80">{h.name}</span>
                                <span className="text-amber-300 font-bold">{h.date}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Planned Closures */}
                      <div>
                        <h5 className="font-bold text-[#00d2ff] mb-2 flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Fermetures Anticipées Prévues :</span>
                        </h5>
                        {m.plannedClosures.length === 0 ? (
                          <span className="text-white/40 italic">Aucune fermeture anticipée</span>
                        ) : (
                          <div className="space-y-1.5">
                            {m.plannedClosures.map((pc, idx) => (
                              <div key={idx} className="bg-white/5 p-2 rounded border border-white/5 space-y-0.5">
                                <div className="flex justify-between font-bold text-white">
                                  <span>{pc.date}</span>
                                  <span className="text-rose-400">{pc.timeMT}</span>
                                </div>
                                <div className="text-[10px] text-white/50">{pc.reason}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Permissions & Multi-Market Trading */}
          {activeTab === 'PERMISSIONS' && (
            <div className="space-y-6">
              <div className="bg-purple-950/20 border border-purple-500/30 p-4 rounded-xl text-purple-200 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-sm text-purple-300">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  <span>Gestion des Autorisations de Trading Multi-Marchés</span>
                </div>
                <p className="text-white/70 leading-relaxed font-sans text-xs">
                  Activez ou désactivez les marchés sur lesquels vous autorisez vos moteurs d'IA et votre compte à effectuer des opportunités d'arbitrage et d'exécution automatisée.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {marketsWithStatus.map((m) => {
                  const isAllowed = allowedMarkets.includes(m.code);
                  return (
                    <div
                      key={m.id}
                      onClick={() => onToggleMarketPermission(m.code)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isAllowed
                          ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400'
                          : 'bg-[#111] border-white/10 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-3xl">{m.flag}</span>
                        <div>
                          <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                            <span>{m.name}</span>
                            <span className="text-[10px] font-mono text-white/50">({m.code})</span>
                          </h4>
                          <p className="text-[11px] text-white/50 font-mono">{m.exchange}</p>
                          <span className={`text-[10px] font-mono font-bold ${isAllowed ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isAllowed ? '✓ Autorisé au Trading' : '✕ Verrouillé par l\'Utilisateur'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`p-2 rounded-xl text-xl transition-all ${
                          isAllowed ? 'text-emerald-400' : 'text-white/20'
                        }`}
                      >
                        {isAllowed ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-white/30" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer / Multi-Trade Execution Bar */}
        <div className="p-5 bg-[#050505] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-mono text-white/60">
            Marchés autorisés par l'utilisateur : <strong className="text-emerald-400">{allowedMarkets.length} sur {WORLD_MARKETS_SCHEDULE.length}</strong>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={handleLaunchMultiMarketAnalysis}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-[#00d2ff] via-emerald-400 to-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center space-x-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Scanner & Trader sur Marchés Autorisés</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
