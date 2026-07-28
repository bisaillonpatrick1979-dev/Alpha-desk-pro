import { MarketAsset } from '../types';
import { computeAssetIndicators } from '../lib/indicators';
import { buildDailyHistory } from '../lib/marketData';

interface AssetSeed {
  symbol: string;
  name: string;
  priceCAD: number;
  category: MarketAsset['category'];
  volume24h: string;
}

/**
 * Univers négociable. Seuls le symbole, le prix de référence et la catégorie
 * sont saisis : le RSI, le MACD, les moyennes mobiles, le support et la
 * résistance sont *calculés* depuis l'historique généré, et non recopiés à la
 * main. Des constantes écrites en dur se désynchronisaient du prix dès le
 * premier tick et alimentaient les agents avec une analyse technique fausse.
 */
const ASSET_SEEDS: AssetSeed[] = [
  // Marché américain
  { symbol: 'NVDA', name: 'NVIDIA Corp (NASDAQ)', priceCAD: 178.4, category: 'US Stock', volume24h: '45.8M' },
  { symbol: 'TSLA', name: 'Tesla Inc (NASDAQ)', priceCAD: 345.1, category: 'US Stock', volume24h: '31.2M' },
  { symbol: 'AAPL', name: 'Apple Inc (NASDAQ)', priceCAD: 312.8, category: 'US Stock', volume24h: '28.5M' },
  { symbol: 'NQ=F', name: 'Nasdaq-100 Futures (US)', priceCAD: 20450, category: 'Futures', volume24h: '140M $' },

  // Marché japonais
  { symbol: '7203.T', name: 'Toyota Motor Corp (TSE Tokyo)', priceCAD: 23.4, category: 'Japan Stock', volume24h: '18.4M ¥' },
  { symbol: '9984.T', name: 'SoftBank Group (TSE Tokyo)', priceCAD: 82.5, category: 'Japan Stock', volume24h: '12.1M ¥' },
  { symbol: 'N225', name: 'Nikkei 225 Index (Japon)', priceCAD: 39120, category: 'Japan Stock', volume24h: '3.2B ¥' },

  // Marché australien
  { symbol: 'BHP.AX', name: 'BHP Group Ltd (ASX Sydney)', priceCAD: 41.2, category: 'Australia Stock', volume24h: '6.8M A$' },
  { symbol: 'CBA.AX', name: 'Commonwealth Bank (ASX Sydney)', priceCAD: 128.9, category: 'Australia Stock', volume24h: '4.2M A$' },
  { symbol: 'XJO', name: 'S&P/ASX 200 Index (Australie)', priceCAD: 7850, category: 'Australia Stock', volume24h: '1.1B A$' },

  // Forex
  { symbol: 'EUR/USD', name: 'Euro / US Dollar (Forex)', priceCAD: 1.085, category: 'Forex', volume24h: '520B $' },
  { symbol: 'USD/CAD', name: 'US Dollar / Dollar Canadien', priceCAD: 1.365, category: 'Forex', volume24h: '180B $' },
  { symbol: 'USD/JPY', name: 'US Dollar / Yen Japonais', priceCAD: 154.2, category: 'Forex', volume24h: '410B $' },
  { symbol: 'GBP/USD', name: 'Livre Sterling / US Dollar', priceCAD: 1.292, category: 'Forex', volume24h: '290B $' },

  // Canada, crypto et matières premières
  { symbol: 'SHOP.TO', name: 'Shopify Inc. (TSX)', priceCAD: 114.5, category: 'CAD Stock', volume24h: '3.4M' },
  { symbol: 'TD.TO', name: 'Banque Toronto-Dominion (TSX)', priceCAD: 84.3, category: 'CAD Stock', volume24h: '5.1M' },
  { symbol: 'BTC-CAD', name: 'Bitcoin / CAD (24/7)', priceCAD: 128450, category: 'Crypto', volume24h: '42.1M $' },
  { symbol: 'XAU-CAD', name: 'Or / Gold (Spot CAD/oz)', priceCAD: 3340.5, category: 'Commodities', volume24h: '85.4M $' },
  { symbol: 'WTI-OIL', name: 'Pétrole Brut WTI (Crude Oil)', priceCAD: 104.2, category: 'Commodities', volume24h: '62.0M $' },
];

function buildAsset(seed: AssetSeed): MarketAsset {
  const history = buildDailyHistory(seed);
  const indicators = computeAssetIndicators(history, seed.priceCAD);

  // Clôture de la veille : base honnête pour la variation sur 24 h.
  const previousClose = history.length > 1 ? history[history.length - 2].close : seed.priceCAD;
  const change24h = Math.round(((seed.priceCAD - previousClose) / previousClose) * 10000) / 100;

  return {
    symbol: seed.symbol,
    name: seed.name,
    priceCAD: seed.priceCAD,
    change24h,
    category: seed.category,
    volume24h: seed.volume24h,
    history,
    previousClose,
    ...indicators,
  };
}

export const INITIAL_WATCHLIST: MarketAsset[] = ASSET_SEEDS.map(buildAsset);
