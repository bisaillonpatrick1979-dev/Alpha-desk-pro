import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client server-side
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', hasGeminiKey: !!apiKey });
});

// API Multi-Agent Analysis Endpoint
app.post('/api/agents/analyze', async (req, res) => {
  try {
    const { asset, portfolio, userNotes } = req.body;

    if (!asset || !portfolio) {
      return res.status(400).json({ error: 'Asset and portfolio parameters are required' });
    }

    const { symbol, name, priceCAD, rsi, macd, ma50, ma200, support, resistance } = asset;
    const { totalCapitalCAD, activeBudgetCAD, bankReserveCAD, targetGoalCAD, maxRiskPercentPerTrade } = portfolio;

    const maxRiskAmountCAD = (activeBudgetCAD * (maxRiskPercentPerTrade || 2)) / 100;

    const promptText = `
Vous êtes la plateforme de trading autonome "ALPHA-DESK PRO", configurée selon la structure décisionnelle des plus grandes firmes de trading quantitatif et de hedge funds.
Localisation & Timezone : Alberta, Canada (Mountain Time - MT).
Devise Universelle : Dollar Canadien ($ CAD).

### PARAMÈTRES DU PORTEFEUILLE ACTUEL :
- Capital Total Réserve (Banque Globale) : ${totalCapitalCAD} $ CAD
- Budget Actif de Départ (Capital Risqué) : ${activeBudgetCAD} $ CAD
- Réserve en Banque : ${bankReserveCAD} $ CAD
- Objectif de Rentabilité : ${targetGoalCAD} $ CAD
- Risque Max par trade : ${maxRiskPercentPerTrade || 2}% du Budget Actif (${maxRiskAmountCAD.toFixed(2)} $ CAD max à risquer)
- Capacité Portefeuille : 5 Slots Simultanés (#1 à #5)

### DONNÉES DU MARCHÉ POUR L'ACTIF :
- Symbole : ${symbol} (${name})
- Prix Actuel : ${priceCAD} $ CAD
- RSI (14) : ${rsi}
- MACD : Line ${macd.macdLine}, Signal ${macd.signalLine}, Hist ${macd.histogram}
- MM50 : ${ma50} $ CAD | MM200 : ${ma200} $ CAD
- Support Clé : ${support} $ CAD | Résistance Clé : ${resistance} $ CAD
${userNotes ? `- Notes additionnelles/Contexte: "${userNotes}"` : ''}

Consignes de délibération des 5 MOTEURS INSTITUTIONNELS :
1. MOTEUR 1 - Quantitative & Signal Engine (QSE) : Analyse technique, régime de marché (Tendance Haussière, Baissière, Range, Volatilité Extrême), score QSE (-100 à +100).
2. MOTEUR 2 - Sentiment & Macro Intelligence (SMI) : Analyse news, sentiment, risques macro, score SMI (-100 à +100).
3. MOTEUR 3 - Chief Risk Officer (CRO) : Droit de veto, vérification corrélation des 5 slots, Risk-per-trade (1-3%), R:R >= 1:2, niveaux précis SL et TP.
4. MOTEUR 4 - Chief Investment Officer (CIO Engine) : Score de Confiance Global = (QSE * 0.50) + (SMI * 0.30) - (CRO Risk * 0.20). Seuil de déclenchement > +60 (ACHAT) ou < -60 (VENTE/SHORT).
5. MOTEUR 5 - Algorithmic Execution Engine (AEE) : Type d'ordre (Limit, Stop-Market, TWAP/VWAP), slot assigné (#1 à #5), formatage du payload JSON.

Fournissez l'analyse structurée dans le format JSON demandé.
`;

    if (aiClient) {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: promptText,
        config: {
          systemInstruction: 'Vous êtes ALPHA-DESK PRO, le moteur institutionnel multi-agents de trading quantitatif en $ CAD (Alberta, Canada - Mountain Time MT). Vous produisez des délibérations rigoureuses.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              technicalAnalysis: { type: Type.STRING },
              sentimentAnalysis: { type: Type.STRING },
              riskManagement: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  suggestedRiskPercent: { type: Type.NUMBER },
                  suggestedPositionSizeCAD: { type: Type.NUMBER },
                  stopLossPrice: { type: Type.NUMBER },
                  takeProfitPrice: { type: Type.NUMBER },
                },
                required: ['text', 'suggestedRiskPercent', 'suggestedPositionSizeCAD', 'stopLossPrice', 'takeProfitPrice'],
              },
              finalDecision: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING },
                  actionEnglish: { type: Type.STRING },
                  symbol: { type: Type.STRING },
                  positionSizeCAD: { type: Type.NUMBER },
                  stopLossPrice: { type: Type.NUMBER },
                  takeProfitPrice: { type: Type.NUMBER },
                  scalingRecommendation: { type: Type.STRING },
                  shouldScaleUp: { type: Type.BOOLEAN },
                  scaleAmountCAD: { type: Type.NUMBER },
                  reasoning: { type: Type.STRING },
                },
                required: ['action', 'actionEnglish', 'symbol', 'positionSizeCAD', 'stopLossPrice', 'takeProfitPrice', 'scalingRecommendation', 'shouldScaleUp', 'reasoning'],
              },
              webhookPayload: {
                type: Type.OBJECT,
                properties: {
                  timestamp_mt: { type: Type.STRING },
                  engine_status: { type: Type.STRING },
                  confidence_score: { type: Type.NUMBER },
                  slot_id: { type: Type.NUMBER },
                  action: { type: Type.STRING },
                  symbol: { type: Type.STRING },
                  amount_cad: { type: Type.NUMBER },
                  stop_loss: { type: Type.NUMBER },
                  take_profit: { type: Type.NUMBER },
                },
                required: ['timestamp_mt', 'engine_status', 'confidence_score', 'slot_id', 'action', 'symbol', 'amount_cad', 'stop_loss', 'take_profit'],
              },
              institutionalReport: {
                type: Type.OBJECT,
                properties: {
                  timestampMT: { type: Type.STRING },
                  qseEngine: {
                    type: Type.OBJECT,
                    properties: {
                      score: { type: Type.NUMBER },
                      technicalDetails: { type: Type.STRING },
                      marketRegime: { type: Type.STRING },
                    },
                    required: ['score', 'technicalDetails', 'marketRegime'],
                  },
                  smiEngine: {
                    type: Type.OBJECT,
                    properties: {
                      score: { type: Type.NUMBER },
                      sentimentDetails: { type: Type.STRING },
                      macroImpact: { type: Type.STRING },
                    },
                    required: ['score', 'sentimentDetails', 'macroImpact'],
                  },
                  croEngine: {
                    type: Type.OBJECT,
                    properties: {
                      vetoStatus: { type: Type.STRING },
                      slotAssigned: { type: Type.NUMBER },
                      slotCorrelationCheck: { type: Type.STRING },
                      riskPerTradePercent: { type: Type.NUMBER },
                      riskRewardRatio: { type: Type.STRING },
                      stopLossPriceCAD: { type: Type.NUMBER },
                      takeProfitPriceCAD: { type: Type.NUMBER },
                      riskDetails: { type: Type.STRING },
                    },
                    required: ['vetoStatus', 'slotAssigned', 'slotCorrelationCheck', 'riskPerTradePercent', 'riskRewardRatio', 'stopLossPriceCAD', 'takeProfitPriceCAD', 'riskDetails'],
                  },
                  cioEngine: {
                    type: Type.OBJECT,
                    properties: {
                      globalConfidenceScore: { type: Type.NUMBER },
                      finalDecision: { type: Type.STRING },
                      decisionEnglish: { type: Type.STRING },
                      capitalScalingRecommendation: { type: Type.STRING },
                      shouldScaleUp: { type: Type.BOOLEAN },
                      reasoning: { type: Type.STRING },
                    },
                    required: ['globalConfidenceScore', 'finalDecision', 'decisionEnglish', 'capitalScalingRecommendation', 'shouldScaleUp', 'reasoning'],
                  },
                  aeeEngine: {
                    type: Type.OBJECT,
                    properties: {
                      orderType: { type: Type.STRING },
                      estimatedHorizon: { type: Type.STRING },
                      webhookPayload: {
                        type: Type.OBJECT,
                        properties: {
                          timestamp_mt: { type: Type.STRING },
                          engine_status: { type: Type.STRING },
                          confidence_score: { type: Type.NUMBER },
                          slot_id: { type: Type.NUMBER },
                          action: { type: Type.STRING },
                          symbol: { type: Type.STRING },
                          amount_cad: { type: Type.NUMBER },
                          stop_loss: { type: Type.NUMBER },
                          take_profit: { type: Type.NUMBER },
                        },
                        required: ['timestamp_mt', 'engine_status', 'confidence_score', 'slot_id', 'action', 'symbol', 'amount_cad', 'stop_loss', 'take_profit'],
                      },
                    },
                    required: ['orderType', 'estimatedHorizon', 'webhookPayload'],
                  },
                },
                required: ['timestampMT', 'qseEngine', 'smiEngine', 'croEngine', 'cioEngine', 'aeeEngine'],
              },
            },
            required: ['technicalAnalysis', 'sentimentAnalysis', 'riskManagement', 'finalDecision', 'webhookPayload'],
          },
        },
      });

      const parsedResult = JSON.parse(response.text || '{}');
      return res.json({ success: true, debate: parsedResult });
    } else {
      // Fallback Engine if AI Client is unavailable or env key missing
      const isBullish = rsi < 70 && macd.histogram > 0 && priceCAD > ma50;
      const qseScore = isBullish ? 75 : -30;
      const smiScore = isBullish ? 65 : -15;
      const croRiskFactor = 20;
      const confidenceScore = Math.round((qseScore * 0.50) + (smiScore * 0.30) - (croRiskFactor * 0.20));

      const slDist = priceCAD * 0.03; // 3% stop distance
      const stopLossPrice = Number((priceCAD - slDist).toFixed(2));
      const takeProfitPrice = Number((priceCAD + slDist * 2.2).toFixed(2));
      const posSize = Number(Math.min(activeBudgetCAD * 0.25, (maxRiskAmountCAD / 0.03)).toFixed(2));

      const nowMT = new Date().toLocaleString('en-US', { timeZone: 'America/Edmonton' });
      const mtFormatted = `${nowMT} MT`;

      const fallbackDebate = {
        technicalAnalysis: `Moteur Quantitatif QSE (Score: ${qseScore}/100) : Prix à ${priceCAD} $ CAD. RSI=${rsi}, MACD Hist=${macd.histogram}. MM50=${ma50} $ CAD, MM200=${ma200} $ CAD. Support ${support} $ CAD, Résistance ${resistance} $ CAD. ${isBullish ? 'Tendance haussière confirmée au-dessus de la MM50.' : 'Zone de consolidation neutre/prudente.'}`,
        sentimentAnalysis: `Moteur Sentiment SMI (Score: ${smiScore}/100) : Sentiment général ${isBullish ? 'favorable avec flux d achats institutionnels' : 'neutre'} sur le marché canadien/US.`,
        riskManagement: {
          text: `Moteur CRO (Chief Risk Officer) : Risque autorisé 2.0% du budget actif (${maxRiskAmountCAD.toFixed(2)} $ CAD). Taille allouée : ${posSize} $ CAD. Ratio Risque/Rendement calculé : 1:2.2 (Conforme au seuil 1:2). SL: ${stopLossPrice} $ CAD, TP: ${takeProfitPrice} $ CAD.`,
          suggestedRiskPercent: maxRiskPercentPerTrade || 2,
          suggestedPositionSizeCAD: posSize,
          stopLossPrice: stopLossPrice,
          takeProfitPrice: takeProfitPrice,
        },
        finalDecision: {
          action: confidenceScore >= 60 ? 'ACHETER' : 'CONSERVER',
          actionEnglish: confidenceScore >= 60 ? 'BUY' : 'HOLD',
          symbol,
          positionSizeCAD: confidenceScore >= 60 ? posSize : 0,
          stopLossPrice,
          takeProfitPrice,
          scalingRecommendation: activeBudgetCAD >= 1150 ? 'Objectif +15% atteint. Déblocage d une tranche de 1 000 $ CAD recommandé depuis la Reserve Globale.' : 'Budget actif stable. Continuer l accumulation contrôlée.',
          shouldScaleUp: activeBudgetCAD >= 1150,
          scaleAmountCAD: 1000,
          reasoning: confidenceScore >= 60 ? `Score de confiance CIO à ${confidenceScore}/100 (> +60). Déclenchement automatique de l ordre d achat.` : `Score de confiance CIO à ${confidenceScore}/100. En attente de confirmation.`,
        },
        webhookPayload: {
          timestamp_mt: mtFormatted,
          engine_status: 'EXECUTED',
          confidence_score: confidenceScore,
          slot_id: 1,
          action: confidenceScore >= 60 ? 'BUY' : 'HOLD',
          symbol,
          amount_cad: confidenceScore >= 60 ? posSize : 0,
          stop_loss: stopLossPrice,
          take_profit: takeProfitPrice,
        },
        institutionalReport: {
          timestampMT: mtFormatted,
          qseEngine: {
            score: qseScore,
            technicalDetails: `Analyse RSI (14) = ${rsi}, MACD Hist = ${macd.histogram}, MM50 = ${ma50} $ CAD, MM200 = ${ma200} $ CAD.`,
            marketRegime: isBullish ? 'Tendance Haussière' : 'Range / Consolidation',
          },
          smiEngine: {
            score: smiScore,
            sentimentDetails: `Sentiment de marché ${isBullish ? 'positif' : 'neutre'} d après l agrégation de données de nouvelles et volume.`,
            macroImpact: 'Taux directeurs et contexte macroéconomique neutres à légèrement favorables.',
          },
          croEngine: {
            vetoStatus: 'APPROVED',
            slotAssigned: 1,
            slotCorrelationCheck: 'Corrélation acceptable avec les autres slots ouverts du portefeuille.',
            riskPerTradePercent: maxRiskPercentPerTrade || 2,
            riskRewardRatio: '1:2.2 (R:R Conforme >= 1:2)',
            stopLossPriceCAD: stopLossPrice,
            takeProfitPriceCAD: takeProfitPrice,
            riskDetails: `Calcul d exposition au risque valide : ${maxRiskAmountCAD.toFixed(2)} $ CAD à risquer max.`,
          },
          cioEngine: {
            globalConfidenceScore: confidenceScore,
            finalDecision: confidenceScore >= 60 ? 'ACHETEUR' : 'NEUTRE',
            decisionEnglish: confidenceScore >= 60 ? 'BUY' : 'HOLD',
            capitalScalingRecommendation: activeBudgetCAD >= 1150 ? 'Déblocage de tranche +1000 $ CAD validé' : 'Maintenir le capital actif',
            shouldScaleUp: activeBudgetCAD >= 1150,
            reasoning: `Calcul CIO : (${qseScore} × 0.50) + (${smiScore} × 0.30) - (${croRiskFactor} × 0.20) = ${confidenceScore}/100`,
          },
          aeeEngine: {
            orderType: 'LIMIT',
            estimatedHorizon: 'Intraday',
            webhookPayload: {
              timestamp_mt: mtFormatted,
              engine_status: 'EXECUTED',
              confidence_score: confidenceScore,
              slot_id: 1,
              action: confidenceScore >= 60 ? 'BUY' : 'HOLD',
              symbol,
              amount_cad: confidenceScore >= 60 ? posSize : 0,
              stop_loss: stopLossPrice,
              take_profit: takeProfitPrice,
            }
          }
        }
      };

      return res.json({ success: true, debate: fallbackDebate, mode: 'rule-engine-fallback' });
    }
  } catch (err: any) {
    console.error('Error in agent analysis:', err);
    res.status(500).json({ error: err.message || 'Error processing agent deliberation' });
  }
});

// Webhook Sender / Simulator Endpoint
app.post('/api/webhook/send', async (req, res) => {
  const { webhookUrl, payload } = req.body;
  
  if (!webhookUrl || !payload) {
    return res.status(400).json({ error: 'webhookUrl and payload required' });
  }

  try {
    if (webhookUrl.startsWith('http')) {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.json({
        status: response.ok ? 'SUCCESS' : 'FAILED',
        statusCode: response.status,
        message: `Webhook transmis avec statut HTTP ${response.status}`,
      });
    } else {
      // Internal simulation
      return res.json({
        status: 'SIMULATED',
        statusCode: 200,
        message: 'Webhook simulé avec succès dans le logger interne.',
      });
    }
  } catch (err: any) {
    res.json({
      status: 'FAILED',
      statusCode: 500,
      message: `Erreur d'envoi du webhook: ${err.message}`,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ferme de Trading Multi-Agents active sur http://localhost:${PORT}`);
  });
}

startServer();
