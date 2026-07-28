import { MarketAsset, MarketCandle } from '../types';

function generateCandles(basePrice: number, volatility: number = 0.02, count: number = 30): MarketCandle[] {
  const candles: MarketCandle[] = [];
  let currentPrice = basePrice * 0.88;
  const now = new Date();

  for (let i = count; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' });
    
    const change = (Math.random() - 0.48) * volatility * currentPrice;
    const open = currentPrice;
    const close = Math.max(0.1, open + change);
    const high = Math.max(open, close) + Math.random() * volatility * currentPrice * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * currentPrice * 0.5;
    const volume = Math.floor(Math.random() * 500000 + 100000);

    currentPrice = close;

    candles.push({
      time: dateStr,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });
  }

  // Calculate MA50 / MA200 / RSI approximations
  for (let i = 0; i < candles.length; i++) {
    const slice = candles.slice(Math.max(0, i - 9), i + 1);
    const avg = slice.reduce((acc, c) => acc + c.close, 0) / slice.length;
    candles[i].ma50 = Number((avg * 0.99).toFixed(2));
    candles[i].ma200 = Number((avg * 0.96).toFixed(2));
    
    let gains = 0;
    let losses = 0;
    for (let j = 1; j < slice.length; j++) {
      const diff = slice[j].close - slice[j - 1].close;
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const rs = losses === 0 ? 100 : gains / losses;
    candles[i].rsi = Math.min(100, Math.max(0, Math.round(100 - (100 / (1 + rs)))));
  }

  return candles;
}

export const INITIAL_WATCHLIST: MarketAsset[] = [
  // 🇺🇸 Marché Américain (US Stock / Futures)
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corp (NASDAQ)',
    priceCAD: 178.40,
    change24h: 4.12,
    category: 'US Stock',
    rsi: 68,
    macd: { macdLine: 3.20, signalLine: 2.10, histogram: 1.10 },
    ma50: 165.30,
    ma200: 142.80,
    support: 168.00,
    resistance: 185.00,
    volume24h: '45.8M',
    history: generateCandles(178.40, 0.03)
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc (NASDAQ)',
    priceCAD: 345.10,
    change24h: -2.30,
    category: 'US Stock',
    rsi: 38,
    macd: { macdLine: -4.50, signalLine: -2.20, histogram: -2.30 },
    ma50: 368.00,
    ma200: 310.00,
    support: 330.00,
    resistance: 370.00,
    volume24h: '31.2M',
    history: generateCandles(345.10, 0.04)
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc (NASDAQ)',
    priceCAD: 312.80,
    change24h: 1.45,
    category: 'US Stock',
    rsi: 58,
    macd: { macdLine: 1.85, signalLine: 1.20, histogram: 0.65 },
    ma50: 302.00,
    ma200: 285.00,
    support: 305.00,
    resistance: 322.00,
    volume24h: '28.5M',
    history: generateCandles(312.80, 0.018)
  },
  {
    symbol: 'NQ=F',
    name: 'Nasdaq-100 Futures (US)',
    priceCAD: 20450.00,
    change24h: 1.12,
    category: 'US Stock',
    rsi: 61,
    macd: { macdLine: 110.5, signalLine: 85.2, histogram: 25.3 },
    ma50: 20100.00,
    ma200: 19400.00,
    support: 20200.00,
    resistance: 20800.00,
    volume24h: '140M $',
    history: generateCandles(20450.00, 0.02)
  },

  // 🇯🇵 Marché Japonais (Japon / Tokyo Stock Exchange)
  {
    symbol: '7203.T',
    name: 'Toyota Motor Corp (TSE Tokyo)',
    priceCAD: 23.40,
    change24h: 2.15,
    category: 'Japan Stock',
    rsi: 62,
    macd: { macdLine: 0.45, signalLine: 0.25, histogram: 0.20 },
    ma50: 22.10,
    ma200: 20.80,
    support: 22.00,
    resistance: 24.80,
    volume24h: '18.4M ¥',
    history: generateCandles(23.40, 0.022)
  },
  {
    symbol: '9984.T',
    name: 'SoftBank Group (TSE Tokyo)',
    priceCAD: 82.50,
    change24h: 3.80,
    category: 'Japan Stock',
    rsi: 66,
    macd: { macdLine: 1.90, signalLine: 1.10, histogram: 0.80 },
    ma50: 76.40,
    ma200: 68.20,
    support: 78.00,
    resistance: 86.50,
    volume24h: '12.1M ¥',
    history: generateCandles(82.50, 0.032)
  },
  {
    symbol: 'N225',
    name: 'Nikkei 225 Index (Japon)',
    priceCAD: 39120.00,
    change24h: 0.88,
    category: 'Japan Stock',
    rsi: 57,
    macd: { macdLine: 180.0, signalLine: 120.0, histogram: 60.0 },
    ma50: 38400.00,
    ma200: 36800.00,
    support: 38500.00,
    resistance: 39800.00,
    volume24h: '3.2B ¥',
    history: generateCandles(39120.00, 0.015)
  },

  // 🇦🇺 Marché Australien (Australie / ASX Sydney)
  {
    symbol: 'BHP.AX',
    name: 'BHP Group Ltd (ASX Sydney)',
    priceCAD: 41.20,
    change24h: 1.25,
    category: 'Australia Stock',
    rsi: 54,
    macd: { macdLine: 0.35, signalLine: 0.20, histogram: 0.15 },
    ma50: 39.80,
    ma200: 37.50,
    support: 39.50,
    resistance: 43.00,
    volume24h: '6.8M A$',
    history: generateCandles(41.20, 0.02)
  },
  {
    symbol: 'CBA.AX',
    name: 'Commonwealth Bank (ASX Sydney)',
    priceCAD: 128.90,
    change24h: -0.65,
    category: 'Australia Stock',
    rsi: 48,
    macd: { macdLine: -0.40, signalLine: -0.15, histogram: -0.25 },
    ma50: 130.50,
    ma200: 122.00,
    support: 125.00,
    resistance: 133.00,
    volume24h: '4.2M A$',
    history: generateCandles(128.90, 0.016)
  },
  {
    symbol: 'XJO',
    name: 'S&P/ASX 200 Index (Australie)',
    priceCAD: 7850.00,
    change24h: 0.45,
    category: 'Australia Stock',
    rsi: 52,
    macd: { macdLine: 25.0, signalLine: 18.0, histogram: 7.0 },
    ma50: 7720.00,
    ma200: 7500.00,
    support: 7750.00,
    resistance: 7950.00,
    volume24h: '1.1B A$',
    history: generateCandles(7850.00, 0.012)
  },

  // 💱 Forex International
  {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar (Forex)',
    priceCAD: 1.0850,
    change24h: 0.24,
    category: 'Forex',
    rsi: 56,
    macd: { macdLine: 0.0012, signalLine: 0.0008, histogram: 0.0004 },
    ma50: 1.0810,
    ma200: 1.0740,
    support: 1.0780,
    resistance: 1.0920,
    volume24h: '520B $',
    history: generateCandles(1.0850, 0.004)
  },
  {
    symbol: 'USD/CAD',
    name: 'US Dollar / Dollar Canadien',
    priceCAD: 1.3650,
    change24h: -0.18,
    category: 'Forex',
    rsi: 46,
    macd: { macdLine: -0.0015, signalLine: -0.0008, histogram: -0.0007 },
    ma50: 1.3680,
    ma200: 1.3580,
    support: 1.3550,
    resistance: 1.3740,
    volume24h: '180B $',
    history: generateCandles(1.3650, 0.005)
  },
  {
    symbol: 'USD/JPY',
    name: 'US Dollar / Yen Japonais',
    priceCAD: 154.20,
    change24h: 0.55,
    category: 'Forex',
    rsi: 63,
    macd: { macdLine: 0.85, signalLine: 0.50, histogram: 0.35 },
    ma50: 152.00,
    ma200: 147.50,
    support: 151.50,
    resistance: 156.00,
    volume24h: '410B $',
    history: generateCandles(154.20, 0.008)
  },
  {
    symbol: 'GBP/USD',
    name: 'Livre Sterling / US Dollar',
    priceCAD: 1.2920,
    change24h: 0.38,
    category: 'Forex',
    rsi: 59,
    macd: { macdLine: 0.0022, signalLine: 0.0014, histogram: 0.0008 },
    ma50: 1.2840,
    ma200: 1.2680,
    support: 1.2800,
    resistance: 1.3050,
    volume24h: '290B $',
    history: generateCandles(1.2920, 0.006)
  },

  // 🇨🇦 Marché Canadien (TSX) & Crypto / Commodities
  {
    symbol: 'SHOP.TO',
    name: 'Shopify Inc. (TSX)',
    priceCAD: 114.50,
    change24h: 3.24,
    category: 'CAD Stock',
    rsi: 62,
    macd: { macdLine: 1.45, signalLine: 0.85, histogram: 0.60 },
    ma50: 108.20,
    ma200: 98.40,
    support: 106.00,
    resistance: 122.00,
    volume24h: '3.4M',
    history: generateCandles(114.50, 0.025)
  },
  {
    symbol: 'TD.TO',
    name: 'Banque Toronto-Dominion (TSX)',
    priceCAD: 84.30,
    change24h: -0.42,
    category: 'CAD Stock',
    rsi: 44,
    macd: { macdLine: -0.25, signalLine: -0.10, histogram: -0.15 },
    ma50: 85.10,
    ma200: 81.80,
    support: 82.50,
    resistance: 87.00,
    volume24h: '5.1M',
    history: generateCandles(84.30, 0.012)
  },
  {
    symbol: 'BTC-CAD',
    name: 'Bitcoin / CAD (24/7)',
    priceCAD: 128450.00,
    change24h: 1.85,
    category: 'Crypto',
    rsi: 58,
    macd: { macdLine: 1250, signalLine: 980, histogram: 270 },
    ma50: 122100.00,
    ma200: 108500.00,
    support: 122000.00,
    resistance: 134000.00,
    volume24h: '42.1M $',
    history: generateCandles(128450, 0.035)
  },
  {
    symbol: 'XAU-CAD',
    name: 'Or / Gold (Spot CAD/oz)',
    priceCAD: 3340.50,
    change24h: 0.95,
    category: 'Commodities',
    rsi: 64,
    macd: { macdLine: 18.2, signalLine: 12.1, histogram: 6.1 },
    ma50: 3280.00,
    ma200: 3120.00,
    support: 3290.00,
    resistance: 3410.00,
    volume24h: '85.4M $',
    history: generateCandles(3340.50, 0.015)
  },
  {
    symbol: 'WTI-OIL',
    name: 'Pétrole Brut WTI (Crude Oil)',
    priceCAD: 104.20,
    change24h: 2.45,
    category: 'Commodities',
    rsi: 59,
    macd: { macdLine: 1.25, signalLine: 0.80, histogram: 0.45 },
    ma50: 101.50,
    ma200: 97.80,
    support: 99.50,
    resistance: 108.00,
    volume24h: '62.0M $',
    history: generateCandles(104.20, 0.025)
  }
];

