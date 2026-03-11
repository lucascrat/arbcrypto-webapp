import Constants from 'expo-constants';

const getEnvVar = (key, fallback = '') => {
    const value = Constants.expoConfig?.extra?.[key];
    if (!value && !fallback) {
        console.warn(`⚠️ Environment variable ${key} is not set`);
    }
    return value || fallback;
};

export const APP_CONFIG = {
    name: 'ArbCrypto',
    version: '1.0.0',

    // Gemini AI Configuration
    gemini: {
        apiKey: getEnvVar('GEMINI_API_KEY'),
        model: 'gemini-2.0-flash',
    },

    // Binance API
    binance: {
        baseUrl: 'https://api.binance.com',
        testnetUrl: 'https://testnet.binance.vision',
        wsUrl: 'wss://stream.binance.com:9443/ws',
        testnetWsUrl: 'wss://testnet.binance.vision/ws',
    },

    // Trading Configuration
    trading: {
        defaultSymbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT'],
        defaultTimeframe: '15m',
        botIntervalMs: 45000,     // 45 seconds per cycle (was 2 min)
        maxTradesPerHour: 10,
        minProfitPercent: 0.5,
        stopLossPercent: 2.0,
        takeProfitPercent: 3.5,
        trailingStopPercent: 1.5,
        trailingStopEnabled: true,
        minConfidenceDefault: 70, // overridden by risk level
    },

    // Technical Indicators Configuration
    indicators: {
        rsi: {
            period: 14,
            oversold: 30,
            overbought: 70,
        },
        macd: {
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
        },
        bollingerBands: {
            period: 20,
            stdDev: 2,
        },
        ema: {
            shortPeriod: 9,
            longPeriod: 21,
        },
        sma: {
            period: 50,
        },
        atr: {
            period: 14,
        },
    },
};

export const RISK_LEVELS = {
    low: {
        label: 'Conservador',
        maxTradePercent: 30,       // % of capital per trade (30% de $25 = $7.5)
        riskPercent: 1.0,          // % of account to risk per trade (for ATR sizing)
        stopLossPercent: 1.5,
        takeProfitPercent: 3.0,
        trailingStopPercent: 1.0,
        maxLeverage: 2,
        minConfidence: 80,
        minOrderUsdt: 6,           // Mínimo por ordem em USDT (Binance exige ~5 USDT)
        description: 'Trades apenas com alta confiança. Ideal para capital pequeno.',
    },
    medium: {
        label: 'Moderado',
        maxTradePercent: 40,       // 40% de $25 = $10
        riskPercent: 2.0,
        stopLossPercent: 2.0,
        takeProfitPercent: 3.5,
        trailingStopPercent: 1.5,
        maxLeverage: 3,
        minConfidence: 70,
        minOrderUsdt: 6,
        description: 'Balanceado entre risco e retorno.',
    },
    high: {
        label: 'Agressivo',
        maxTradePercent: 60,       // 60% de $25 = $15
        riskPercent: 3.0,
        stopLossPercent: 3.0,
        takeProfitPercent: 5.0,
        trailingStopPercent: 2.0,
        maxLeverage: 5,
        minConfidence: 60,
        minOrderUsdt: 6,
        description: 'Mais operações, maior risco. Trailing stop ativo.',
    },
};

export const TIMEFRAMES = [
    { value: '1m', label: '1 min' },
    { value: '5m', label: '5 min' },
    { value: '15m', label: '15 min' },
    { value: '30m', label: '30 min' },
    { value: '1h', label: '1 hora' },
    { value: '4h', label: '4 horas' },
    { value: '1d', label: '1 dia' },
];
