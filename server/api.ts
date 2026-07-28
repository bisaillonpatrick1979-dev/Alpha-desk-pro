import express, { Router } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Routes de l'API, isolées de la façon dont on les sert.
 *
 * Le même routeur alimente deux cibles : le serveur Express local (`server.ts`)
 * et la fonction serverless Vercel (`api/index.ts`). Auparavant les routes
 * étaient déclarées directement dans `server.ts`, un fichier que Vercel
 * n'exécute jamais — l'API répondait donc 404 en production.
 */
export const router: Router = express.Router();

// Le modèle est configurable : un identifiant invalide ne doit pas nécessiter
// un redéploiement du code.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Client Gemini initialisé côté serveur (la clé ne quitte jamais le backend).
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const mtTimestamp = (date = new Date()) => {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Edmonton',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const time = new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'America/Edmonton',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return `${day} - ${time} MT`;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

router.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: !!apiKey,
    model: apiKey ? GEMINI_MODEL : null,
    engine: apiKey ? 'gemini' : 'rule-engine',
  });
});

/**
 * Moteur de repli déterministe.
 *
 * Il sert dans deux cas : absence de clé API, mais aussi *échec* d'un appel
 * Gemini (quota, modèle inconnu, réseau). Auparavant seul le premier cas était
 * couvert et toute erreur d'API renvoyait un 500 : l'interface restait bloquée
 * sur « Délibération… » sans jamais produire de décision.
 */
function runRuleEngine(asset: any, portfolio: any) {
  const { symbol, priceCAD, rsi, macd, ma50, ma200, support, resistance } = asset;
  const { activeBudgetCAD, maxRiskPercentPerTrade } = portfolio;

  const riskPercent = maxRiskPercentPerTrade || 2;
  const maxRiskAmountCAD = (activeBudgetCAD * riskPercent) / 100;

  const histogram = macd?.histogram ?? 0;
  const aboveTrend = ma50 !== null && ma50 !== undefined ? priceCAD > ma50 : true;

  // Score technique borné, dérivé des indicateurs réellement reçus.
  const rsiScore = rsi <= 30 ? 60 : rsi >= 70 ? -50 : (50 - Math.abs(rsi - 50)) * 1.2;
  const macdScore = Math.max(-40, Math.min(40, histogram > 0 ? 30 : -30));
  const trendScore = aboveTrend ? 25 : -25;
  const qseScore = Math.max(-100, Math.min(100, Math.round(rsiScore + macdScore + trendScore)));

  const smiScore = Math.max(-100, Math.min(100, Math.round(qseScore * 0.6)));
  const croRiskFactor = rsi >= 70 || rsi <= 30 ? 40 : 20;
  const confidenceScore = Math.round(qseScore * 0.5 + smiScore * 0.3 - croRiskFactor * 0.2);

  const stopDistance = priceCAD * 0.03;
  const stopLossPrice = Number((priceCAD - stopDistance).toFixed(2));
  const takeProfitPrice = Number((priceCAD + stopDistance * 2.2).toFixed(2));

  // Taille plafonnée par le risque autorisé ET par le budget disponible.
  const sizeAtRiskLimit = (maxRiskAmountCAD / stopDistance) * priceCAD;
  const positionSize = Number(Math.max(0, Math.min(sizeAtRiskLimit, activeBudgetCAD)).toFixed(2));

  const isBuy = confidenceScore >= 60;
  const stamp = mtTimestamp();

  const webhookPayload = {
    timestamp_mt: stamp,
    engine_status: isBuy ? 'EXECUTED' : 'STANDBY',
    confidence_score: confidenceScore,
    slot_id: 1,
    action: isBuy ? 'BUY' : 'HOLD',
    symbol,
    amount_cad: isBuy ? positionSize : 0,
    stop_loss: stopLossPrice,
    take_profit: takeProfitPrice,
  };

  const trendLabel = ma50 !== null && ma50 !== undefined ? `${ma50} $ CAD` : 'non disponible';
  const ma200Label = ma200 !== null && ma200 !== undefined ? `${ma200} $ CAD` : 'non disponible';

  return {
    technicalAnalysis:
      `Moteur Quantitatif QSE (Score ${qseScore}/100) : prix à ${priceCAD} $ CAD, RSI(14) = ${rsi}, ` +
      `histogramme MACD = ${histogram}. MM50 ${trendLabel}, MM200 ${ma200Label}. ` +
      `Support ${support} $ CAD, résistance ${resistance} $ CAD. ` +
      `${aboveTrend ? 'Cours au-dessus de la MM50 : structure haussière.' : 'Cours sous la MM50 : structure prudente.'}`,
    sentimentAnalysis:
      `Moteur Sentiment SMI (Score ${smiScore}/100) : en l'absence de flux de nouvelles connecté, ` +
      `le score est dérivé du momentum technique et non d'une analyse de presse.`,
    riskManagement: {
      text:
        `Moteur CRO : risque autorisé ${riskPercent} % du budget actif (${maxRiskAmountCAD.toFixed(2)} $ CAD). ` +
        `Taille conforme : ${positionSize} $ CAD. Ratio risque/rendement 1:2.2. ` +
        `SL ${stopLossPrice} $ CAD, TP ${takeProfitPrice} $ CAD.`,
      suggestedRiskPercent: riskPercent,
      suggestedPositionSizeCAD: positionSize,
      stopLossPrice,
      takeProfitPrice,
    },
    finalDecision: {
      action: isBuy ? 'ACHETER' : 'CONSERVER',
      actionEnglish: isBuy ? 'BUY' : 'HOLD',
      symbol,
      positionSizeCAD: isBuy ? positionSize : 0,
      stopLossPrice,
      takeProfitPrice,
      scalingRecommendation:
        'Le déblocage de tranche est piloté par le seuil de scaling configuré dans les paramètres du portefeuille.',
      shouldScaleUp: false,
      scaleAmountCAD: 0,
      reasoning: isBuy
        ? `Score de confiance CIO à ${confidenceScore}/100 (seuil +60 franchi). Ordre d'achat déclenché.`
        : `Score de confiance CIO à ${confidenceScore}/100, sous le seuil de +60. Aucune position initiée.`,
    },
    webhookPayload,
    institutionalReport: {
      timestampMT: stamp,
      qseEngine: {
        score: qseScore,
        technicalDetails: `RSI(14) = ${rsi}, MACD histogramme = ${histogram}, MM50 ${trendLabel}, MM200 ${ma200Label}.`,
        marketRegime: aboveTrend ? 'Tendance Haussière' : 'Range / Consolidation',
      },
      smiEngine: {
        score: smiScore,
        sentimentDetails: 'Score dérivé du momentum technique (aucun fournisseur de nouvelles connecté).',
        macroImpact: 'Contexte macroéconomique non évalué en mode moteur de règles.',
      },
      croEngine: {
        vetoStatus: positionSize > 0 ? 'APPROVED' : 'VETOED',
        slotAssigned: 1,
        slotCorrelationCheck: 'Contrôle de corrélation non applicable en mode moteur de règles.',
        riskPerTradePercent: riskPercent,
        riskRewardRatio: '1:2.2',
        stopLossPriceCAD: stopLossPrice,
        takeProfitPriceCAD: takeProfitPrice,
        riskDetails: `Exposition maximale ${maxRiskAmountCAD.toFixed(2)} $ CAD pour une distance de stop de ${stopDistance.toFixed(2)} $ CAD.`,
      },
      cioEngine: {
        globalConfidenceScore: confidenceScore,
        finalDecision: isBuy ? 'ACHETEUR' : 'NEUTRE',
        decisionEnglish: isBuy ? 'BUY' : 'HOLD',
        capitalScalingRecommendation: 'Scaling piloté par les paramètres du portefeuille.',
        shouldScaleUp: false,
        reasoning: `(${qseScore} × 0,50) + (${smiScore} × 0,30) − (${croRiskFactor} × 0,20) = ${confidenceScore}/100`,
      },
      aeeEngine: {
        orderType: 'LIMIT',
        estimatedHorizon: 'Intraday',
        webhookPayload,
      },
    },
  };
}

const responseSchema = {
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
      required: [
        'action',
        'actionEnglish',
        'symbol',
        'positionSizeCAD',
        'stopLossPrice',
        'takeProfitPrice',
        'scalingRecommendation',
        'shouldScaleUp',
        'reasoning',
      ],
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
      required: [
        'timestamp_mt',
        'engine_status',
        'confidence_score',
        'slot_id',
        'action',
        'symbol',
        'amount_cad',
        'stop_loss',
        'take_profit',
      ],
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
          required: [
            'vetoStatus',
            'slotAssigned',
            'slotCorrelationCheck',
            'riskPerTradePercent',
            'riskRewardRatio',
            'stopLossPriceCAD',
            'takeProfitPriceCAD',
            'riskDetails',
          ],
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
          required: [
            'globalConfidenceScore',
            'finalDecision',
            'decisionEnglish',
            'capitalScalingRecommendation',
            'shouldScaleUp',
            'reasoning',
          ],
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
              required: [
                'timestamp_mt',
                'engine_status',
                'confidence_score',
                'slot_id',
                'action',
                'symbol',
                'amount_cad',
                'stop_loss',
                'take_profit',
              ],
            },
          },
          required: ['orderType', 'estimatedHorizon', 'webhookPayload'],
        },
      },
      required: ['timestampMT', 'qseEngine', 'smiEngine', 'croEngine', 'cioEngine', 'aeeEngine'],
    },
  },
  required: ['technicalAnalysis', 'sentimentAnalysis', 'riskManagement', 'finalDecision', 'webhookPayload'],
};

router.post('/api/agents/analyze', async (req, res) => {
  const { asset, portfolio, userNotes } = req.body ?? {};

  // Validation stricte : sans elle, un corps mal formé provoquait un TypeError
  // à la lecture de `macd.histogram` et un 500 opaque côté client.
  if (!asset || typeof asset !== 'object' || !portfolio || typeof portfolio !== 'object') {
    return res.status(400).json({ error: 'Les paramètres "asset" et "portfolio" sont requis.' });
  }
  if (typeof asset.symbol !== 'string' || !asset.symbol) {
    return res.status(400).json({ error: 'Le champ "asset.symbol" est requis.' });
  }
  if (!isFiniteNumber(asset.priceCAD) || asset.priceCAD <= 0) {
    return res.status(400).json({ error: 'Le champ "asset.priceCAD" doit être un nombre strictement positif.' });
  }
  if (!isFiniteNumber(portfolio.activeBudgetCAD) || portfolio.activeBudgetCAD < 0) {
    return res.status(400).json({ error: 'Le champ "portfolio.activeBudgetCAD" doit être un nombre positif.' });
  }

  const safeAsset = {
    ...asset,
    rsi: isFiniteNumber(asset.rsi) ? asset.rsi : 50,
    macd: {
      macdLine: isFiniteNumber(asset.macd?.macdLine) ? asset.macd.macdLine : 0,
      signalLine: isFiniteNumber(asset.macd?.signalLine) ? asset.macd.signalLine : 0,
      histogram: isFiniteNumber(asset.macd?.histogram) ? asset.macd.histogram : 0,
    },
    ma50: isFiniteNumber(asset.ma50) ? asset.ma50 : null,
    ma200: isFiniteNumber(asset.ma200) ? asset.ma200 : null,
    support: isFiniteNumber(asset.support) ? asset.support : asset.priceCAD * 0.95,
    resistance: isFiniteNumber(asset.resistance) ? asset.resistance : asset.priceCAD * 1.05,
  };

  const safePortfolio = {
    totalCapitalCAD: isFiniteNumber(portfolio.totalCapitalCAD) ? portfolio.totalCapitalCAD : 0,
    activeBudgetCAD: portfolio.activeBudgetCAD,
    bankReserveCAD: isFiniteNumber(portfolio.bankReserveCAD) ? portfolio.bankReserveCAD : 0,
    targetGoalCAD: isFiniteNumber(portfolio.targetGoalCAD) ? portfolio.targetGoalCAD : 0,
    maxRiskPercentPerTrade: isFiniteNumber(portfolio.maxRiskPercentPerTrade) ? portfolio.maxRiskPercentPerTrade : 2,
  };

  if (!aiClient) {
    return res.json({
      success: true,
      debate: runRuleEngine(safeAsset, safePortfolio),
      mode: 'rule-engine',
      notice: "Clé GEMINI_API_KEY absente : délibération produite par le moteur de règles déterministe.",
    });
  }

  const maxRiskAmountCAD = (safePortfolio.activeBudgetCAD * safePortfolio.maxRiskPercentPerTrade) / 100;
  const notes = typeof userNotes === 'string' ? userNotes.slice(0, 2000) : '';

  const promptText = `
Vous êtes la plateforme de trading autonome "ALPHA-DESK PRO", configurée selon la structure décisionnelle des plus grandes firmes de trading quantitatif et de hedge funds.
Localisation & Timezone : Alberta, Canada (Mountain Time - MT).
Devise Universelle : Dollar Canadien ($ CAD).

### PARAMÈTRES DU PORTEFEUILLE ACTUEL :
- Capital Total Réserve (Banque Globale) : ${safePortfolio.totalCapitalCAD} $ CAD
- Budget Actif de Départ (Capital Risqué) : ${safePortfolio.activeBudgetCAD} $ CAD
- Réserve en Banque : ${safePortfolio.bankReserveCAD} $ CAD
- Objectif de Rentabilité : ${safePortfolio.targetGoalCAD} $ CAD
- Risque Max par trade : ${safePortfolio.maxRiskPercentPerTrade}% du Budget Actif (${maxRiskAmountCAD.toFixed(2)} $ CAD max à risquer)
- Capacité Portefeuille : 5 Slots Simultanés (#1 à #5)

### DONNÉES DU MARCHÉ POUR L'ACTIF :
- Symbole : ${safeAsset.symbol} (${safeAsset.name ?? safeAsset.symbol})
- Prix Actuel : ${safeAsset.priceCAD} $ CAD
- RSI (14) : ${safeAsset.rsi}
- MACD : Line ${safeAsset.macd.macdLine}, Signal ${safeAsset.macd.signalLine}, Hist ${safeAsset.macd.histogram}
- MM50 : ${safeAsset.ma50 ?? 'n/d'} $ CAD | MM200 : ${safeAsset.ma200 ?? 'n/d'} $ CAD
- Support Clé : ${safeAsset.support} $ CAD | Résistance Clé : ${safeAsset.resistance} $ CAD
${notes ? `- Notes additionnelles/Contexte: "${notes}"` : ''}

Contraintes impératives :
- La taille de position recommandée ne doit jamais dépasser ${safePortfolio.activeBudgetCAD} $ CAD (budget actif disponible).
- La perte maximale au stop ne doit jamais dépasser ${maxRiskAmountCAD.toFixed(2)} $ CAD.
- N'affirmez pas disposer d'informations de presse ou macroéconomiques que vous n'avez pas ; en leur absence, dites-le explicitement.

Consignes de délibération des 5 MOTEURS INSTITUTIONNELS :
1. MOTEUR 1 - Quantitative & Signal Engine (QSE) : Analyse technique, régime de marché (Tendance Haussière, Baissière, Range, Volatilité Extrême), score QSE (-100 à +100).
2. MOTEUR 2 - Sentiment & Macro Intelligence (SMI) : Analyse news, sentiment, risques macro, score SMI (-100 à +100).
3. MOTEUR 3 - Chief Risk Officer (CRO) : Droit de veto, vérification corrélation des 5 slots, Risk-per-trade (1-3%), R:R >= 1:2, niveaux précis SL et TP.
4. MOTEUR 4 - Chief Investment Officer (CIO Engine) : Score de Confiance Global = (QSE * 0.50) + (SMI * 0.30) - (CRO Risk * 0.20). Seuil de déclenchement > +60 (ACHAT) ou < -60 (VENTE/SHORT).
5. MOTEUR 5 - Algorithmic Execution Engine (AEE) : Type d'ordre (Limit, Stop-Market, TWAP/VWAP), slot assigné (#1 à #5), formatage du payload JSON.

Fournissez l'analyse structurée dans le format JSON demandé.
`;

  try {
    const response = await aiClient.models.generateContent({
      model: GEMINI_MODEL,
      contents: promptText,
      config: {
        systemInstruction:
          'Vous êtes ALPHA-DESK PRO, le moteur institutionnel multi-agents de trading quantitatif en $ CAD (Alberta, Canada - Mountain Time MT). Vous produisez des délibérations rigoureuses.',
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error('Réponse vide du modèle');

    const parsed = JSON.parse(text);
    if (!parsed?.finalDecision) throw new Error('Réponse du modèle sans décision finale');

    return res.json({ success: true, debate: parsed, mode: 'gemini', model: GEMINI_MODEL });
  } catch (err: any) {
    // Repli explicite plutôt qu'un 500 : l'utilisateur obtient une décision
    // exploitable et sait qu'elle ne vient pas du modèle.
    console.error('[agents/analyze] échec Gemini, repli sur le moteur de règles :', err?.message || err);
    return res.json({
      success: true,
      debate: runRuleEngine(safeAsset, safePortfolio),
      mode: 'rule-engine',
      notice: `Appel Gemini indisponible (${err?.message || 'erreur inconnue'}) : délibération produite par le moteur de règles déterministe.`,
    });
  }
});

/**
 * Analyse de sentiment sur 7 jours. En l'absence de clé, la réponse indique
 * clairement que les scores proviennent du calcul technique local et non d'un
 * modèle — l'interface s'appuie sur ce champ pour ne pas afficher un badge
 * « Gemini » mensonger.
 */
router.post('/api/agents/sentiment', async (req, res) => {
  const { assets } = req.body ?? {};

  if (!Array.isArray(assets) || assets.length === 0) {
    return res.status(400).json({ error: 'Le champ "assets" doit être un tableau non vide.' });
  }

  const symbols = assets
    .filter((a: any) => a && typeof a.symbol === 'string')
    .slice(0, 25)
    .map((a: any) => ({
      symbol: a.symbol,
      rsi: isFiniteNumber(a.rsi) ? a.rsi : 50,
      change24h: isFiniteNumber(a.change24h) ? a.change24h : 0,
      histogram: isFiniteNumber(a.macd?.histogram) ? a.macd.histogram : 0,
    }));

  if (symbols.length === 0) {
    return res.status(400).json({ error: 'Aucun actif exploitable dans "assets".' });
  }

  if (!aiClient) {
    return res.json({ success: true, source: 'TECHNIQUE', scores: null });
  }

  try {
    const response = await aiClient.models.generateContent({
      model: GEMINI_MODEL,
      contents:
        `Évaluez le sentiment de marché sur 7 jours pour ces actifs, sur une échelle de 0 (capitulation) à 100 (euphorie). ` +
        `Un score par actif et par jour, du plus ancien (index 0) au plus récent (index 6).\n` +
        JSON.stringify(symbols),
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            assets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  symbol: { type: Type.STRING },
                  dailyScores: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                  driver: { type: Type.STRING },
                },
                required: ['symbol', 'dailyScores', 'driver'],
              },
            },
          },
          required: ['assets'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (!Array.isArray(parsed?.assets)) throw new Error('Réponse de sentiment mal formée');

    return res.json({ success: true, source: 'GEMINI', scores: parsed.assets, model: GEMINI_MODEL });
  } catch (err: any) {
    console.error('[agents/sentiment] échec Gemini, repli technique :', err?.message || err);
    return res.json({ success: true, source: 'TECHNIQUE', scores: null });
  }
});

router.post('/api/webhook/send', async (req, res) => {
  const { webhookUrl, payload } = req.body ?? {};

  if (typeof webhookUrl !== 'string' || !webhookUrl || payload === undefined) {
    return res.status(400).json({ error: '"webhookUrl" et "payload" sont requis.' });
  }

  let target: URL | null = null;
  try {
    target = new URL(webhookUrl);
  } catch {
    target = null;
  }

  // Une URL non absolue reste simulée localement : c'est le mode « bac à sable »
  // documenté dans l'interface.
  if (!target) {
    return res.json({
      status: 'SIMULATED',
      statusCode: 200,
      message: 'Webhook simulé localement (URL non absolue).',
    });
  }

  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return res.status(400).json({ error: 'Seuls les schémas http et https sont acceptés.' });
  }

  try {
    // Sans délai maximal, un endpoint qui ne répond pas bloquait la requête
    // jusqu'au timeout par défaut de Node.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(target.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    return res.json({
      status: response.ok ? 'SUCCESS' : 'FAILED',
      statusCode: response.status,
      message: `Webhook transmis — réponse HTTP ${response.status}.`,
    });
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    return res.json({
      status: 'FAILED',
      statusCode: aborted ? 504 : 502,
      message: aborted
        ? "Délai dépassé : l'endpoint n'a pas répondu en moins de 10 s."
        : `Erreur d'envoi du webhook : ${err?.message || 'inconnue'}`,
    });
  }
});
/** Application Express complète exposant l'API, prête à être servie n'importe où. */
export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));
  app.use(router);
  return app;
}

/** Indique si une clé Gemini est configurée (utilisé pour les journaux de démarrage). */
export const hasGeminiKey = () => !!apiKey;
export const geminiModel = () => GEMINI_MODEL;
