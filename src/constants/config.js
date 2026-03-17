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
        minConfidenceDefault: 49, // overridden by risk level
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
        maxTradePercent: 30,
        riskPercent: 1.0,
        // ATR-based dynamic SL/TP (replaces fixed %)
        slAtrMultiplier: 1.5,      // SL = ATR × 1.5
        tpAtrMultiplier: 3.0,      // TP = ATR × 3.0
        tp1AtrMultiplier: 2.0,     // Partial TP1 = ATR × 2.0 (close 50%)
        trailingAtrMultiplier: 1.0, // Trailing = ATR × 1.0
        breakEvenAtrThreshold: 1.0, // Move SL to entry when profit > ATR × 1.0
        // Fallback fixed % (used if ATR unavailable)
        stopLossPercent: 1.5,
        takeProfitPercent: 3.0,
        trailingStopPercent: 1.0,
        maxLeverage: 2,
        minConfidence: 49,
        minOrderUsdt: 6,
        maxConcurrentPositions: 2,
        dailyLossPercent: 3,
        description: 'Trades conservadores com SL apertado.',
    },
    medium: {
        label: 'Moderado',
        maxTradePercent: 40,
        riskPercent: 2.0,
        slAtrMultiplier: 2.0,
        tpAtrMultiplier: 3.5,
        tp1AtrMultiplier: 2.0,
        trailingAtrMultiplier: 1.5,
        breakEvenAtrThreshold: 1.0,
        stopLossPercent: 2.0,
        takeProfitPercent: 3.5,
        trailingStopPercent: 1.5,
        maxLeverage: 3,
        minConfidence: 49,
        minOrderUsdt: 6,
        maxConcurrentPositions: 3,
        dailyLossPercent: 4,
        description: 'Balanceado entre risco e retorno.',
    },
    high: {
        label: 'Agressivo',
        maxTradePercent: 60,
        riskPercent: 3.0,
        slAtrMultiplier: 2.5,
        tpAtrMultiplier: 4.0,
        tp1AtrMultiplier: 2.5,
        trailingAtrMultiplier: 2.0,
        breakEvenAtrThreshold: 1.0,
        stopLossPercent: 3.0,
        takeProfitPercent: 5.0,
        trailingStopPercent: 2.0,
        maxLeverage: 5,
        minConfidence: 49,
        minOrderUsdt: 6,
        maxConcurrentPositions: 5,
        dailyLossPercent: 5,
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
