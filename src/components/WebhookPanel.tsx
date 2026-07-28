import React, { useState } from 'react';
import { Send, Terminal, CheckCircle2, XCircle, Copy, Check, Radio } from 'lucide-react';
import { WebhookLogItem, WebhookPayload } from '../types';

interface WebhookPanelProps {
  logs: WebhookLogItem[];
  onSendWebhook: (url: string, payload: WebhookPayload) => void;
  lastPayload: WebhookPayload | null;
}

export const WebhookPanel: React.FC<WebhookPanelProps> = ({
  logs,
  onSendWebhook,
  lastPayload,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('https://tradingview.com/webhook/test-farm');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const samplePayload: WebhookPayload = lastPayload || {
    action: 'BUY',
    symbol: 'SHOP.TO',
    amount_cad: 250.00,
    stop_loss: 106.00,
    take_profit: 122.00,
    active_budget_cad: 1000.00,
  };

  const handleTestSend = (e: React.FormEvent) => {
    e.preventDefault();
    onSendWebhook(webhookUrl, samplePayload);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Radio className="w-5 h-5 text-teal-400" />
          <h2 className="text-base font-bold text-slate-100">Simulateur & Transmetteur de Webhooks JSON</h2>
        </div>
        <span className="text-xs text-slate-400 font-mono">Format JSON Standard</span>
      </div>

      {/* Webhook Endpoint Tester Form */}
      <form onSubmit={handleTestSend} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-300 block">URL du Webhook Externe (TradingView / Bot / Courtier)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://votre-serveur.com/api/webhook"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Transmettre Webhook</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          * Les signaux émis par les 4 agents sont automatiquement formatés en JSON $ CAD avec le budget actif, le SL et le TP.
        </div>
      </form>

      {/* Webhook History Logs Table */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Journal des Traces Webhook</h3>
        {logs.length === 0 ? (
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
            Aucun webhook transmis récemment.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    {log.status === 'SUCCESS' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : log.status === 'SIMULATED' ? (
                      <Radio className="w-4 h-4 text-teal-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="font-mono text-slate-300 font-bold">{log.endpoint}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                </div>

                <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg text-xs font-mono text-slate-300">
                  <pre className="text-[11px] text-emerald-400 overflow-x-auto">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                  <button
                    onClick={() => handleCopy(log.id, JSON.stringify(log.payload, null, 2))}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-all ml-2"
                    title="Copier JSON"
                  >
                    {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
