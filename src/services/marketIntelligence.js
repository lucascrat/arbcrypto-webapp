import binanceService from './binance';

class MarketIntelligenceService {
    constructor() {
        this.newsApiUrl = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';
        this.cache = {
            news: null,
            lastFetch: 0,
            fundingRates: {},
            fundingLastFetch: {},
        };
    }

    /**
     * News Fetching — cached 15 min
     */
    async getLatestNews() {
        const CACHE_DURATION = 15 * 60 * 1000;
        if (this.cache.news && (Date.now() - this.cache.lastFetch < CACHE_DURATION)) {
            return this.cache.news;
        }

        try {
            const response = await fetch(this.newsApiUrl);
            const data = await response.json();

            const news = (data.Data || []).slice(0, 5).map(item => ({
                title: item.title,
                summary: item.body?.substring(0, 150) + '...',
                source: item.source,
                sentiment: this.inferSentiment(`${item.title} ${item.body}`),
            }));

            this.cache.news = news;
            this.cache.lastFetch = Date.now();
            return news;
        } catch (error) {
            console.error('[MarketIntel] News fetch error:', error);
            return [
                { title: 'Market Uncertainty', summary: 'Global markets await crucial data.', sentiment: 'neutral' },
                { title: 'Bitcoin ETF Inflows', summary: 'Institutional interest remains high.', sentiment: 'positive' }
            ];
        }
    }

    inferSentiment(text) {
        const t = text.toLowerCase();
        const positive = ['bull', 'surge', 'record', 'gain', 'adoption', 'approve', 'etf', 'launch', 'partnership', 'upgrade', 'rally', 'ath'];
        const negative = ['bear', 'crash', 'ban', 'hack', 'scam', 'lawsuit', 'sec', 'reject', 'dump', 'collapse', 'liquidat', 'warning'];

        let score = 0;
        positive.forEach(w => { if (t.includes(w)) score++; });
        negative.forEach(w => { if (t.includes(w)) score--; });

        if (score > 0) return 'positive';
        if (score < 0) return 'negative';
        return 'neutral';
    }

    /**
     * Whale / Big Player Detection
     */
    async analyzeWhaleActivity(symbol) {
        try {
            const klines = await binanceService.getKlines(symbol, '1h', 24);
            if (!klines || klines.length < 24) return { signal: 'neutral', confidence: 0, description: 'Dados insuficientes', action: 'HOLD' };

            const volumes = klines.map(k => k.volume);
            const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
            const lastCandle = klines[klines.length - 2]; // use confirmed candle
            const currentVolume = lastCandle.volume;
            const volumeRatio = currentVolume / avgVolume;

            const priceChanges = klines.map((k, i) => i === 0 ? 0 : Math.abs((k.close - klines[i - 1].close) / klines[i - 1].close));
            const avgPriceChange = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
            const currentPriceChange = Math.abs((lastCandle.close - lastCandle.open) / lastCandle.open);
            const isGreen = lastCandle.close > lastCandle.open;

            if (volumeRatio > 2.5 && currentPriceChange > avgPriceChange * 2) {
                return {
                    signal: isGreen ? 'whale_buy' : 'whale_sell',
                    confidence: 95,
                    description: `🚨 WHALE MOVEMENT: ${isGreen ? 'Massive Inflow' : 'Massive Outflow'}. Volume ${volumeRatio.toFixed(1)}x avg.`,
                    action: isGreen ? 'LONG' : 'SHORT',
                };
            }

            if (volumeRatio > 1.8) {
                return {
                    signal: isGreen ? 'accumulation' : 'distribution',
                    confidence: 70,
                    description: `Smart Money ${isGreen ? 'Accumulating' : 'Distributing'}. Volume ${volumeRatio.toFixed(1)}x avg.`,
                    action: isGreen ? 'LONG' : 'SHORT',
                };
            }

            return { signal: 'neutral', confidence: 0, description: 'Retail-driven action. No smart money detected.', action: 'HOLD' };

        } catch (error) {
            console.error(`[MarketIntel] Whale analysis failed for ${symbol}:`, error);
            return { signal: 'error', confidence: 0, description: 'Analysis error', action: 'HOLD' };
        }
    }

    /**
     * Orderbook Imbalance Signal
     * ratio > 1.5 = buyers dominating = BUY pressure
     * ratio < 0.67 = sellers dominating = SELL pressure
     */
    async getOrderBookSignal(symbol) {
        try {
            const ob = await binanceService.getOrderBook(symbol, 20);
            const { ratio, bidVolume, askVolume } = ob;

            let signal = 'neutral';
            let description = `Bid/Ask ratio ${ratio.toFixed(2)} — balanced`;

            if (ratio > 1.5) {
                signal = 'buy_pressure';
                description = `📗 BUY PRESSURE: Bid/Ask ${ratio.toFixed(2)} — buyers dominating`;
            } else if (ratio < 0.67) {
                signal = 'sell_pressure';
                description = `📕 SELL PRESSURE: Bid/Ask ${ratio.toFixed(2)} — sellers dominating`;
            }

            return { signal, ratio, bidVolume, askVolume, description };
        } catch (e) {
            console.warn('[MarketIntel] Orderbook signal failed:', e.message);
            return { signal: 'neutral', ratio: 1, description: 'Orderbook unavailable' };
        }
    }

    /**
     * Funding Rate Signal (FUTURES only)
     * High positive = shorts earn = market over-leveraged long → SHORT bias
     * High negative = longs earn = market over-leveraged short → LONG bias
     */
    async getFundingRateSignal(symbol) {
        try {
            const rate = await binanceService.getFundingRate(symbol);
            const pct = rate * 100;

            let bias = 'neutral';
            let description = `Funding ${pct.toFixed(4)}% — neutral`;

            if (rate > 0.0005) { // > 0.05%
                bias = 'short_bias';
                description = `🔴 HIGH FUNDING ${pct.toFixed(4)}% — longs overloaded → SHORT bias`;
            } else if (rate < -0.0005) {
                bias = 'long_bias';
                description = `🟢 NEGATIVE FUNDING ${pct.toFixed(4)}% — shorts overloaded → LONG bias`;
            }

            return { rate, pct, bias, description };
        } catch (e) {
            return { rate: 0, pct: 0, bias: 'neutral', description: 'Funding rate unavailable' };
        }
    }

    /**
     * Fear & Greed Proxy (RSI-based)
     */
    getFearAndGreedProxy(rsi) {
        if (rsi > 75) return { value: 85, label: 'Extreme Greed', sentiment: 'bearish_reversal' };
        if (rsi > 60) return { value: 65, label: 'Greed', sentiment: 'bullish' };
        if (rsi < 25) return { value: 15, label: 'Extreme Fear', sentiment: 'bullish_reversal' };
        if (rsi < 40) return { value: 35, label: 'Fear', sentiment: 'bearish' };
        return { value: 50, label: 'Neutral', sentiment: 'neutral' };
    }

    /**
     * Global Capital Flows (BTC proxy)
     */
    async getGlobalFlows() {
        try {
            const btc = await binanceService.get24hTicker('BTCUSDT');
            const change = parseFloat(btc.priceChangePercent);

            if (change > 2.5) {
                return { status: 'risk-on', description: '🔥 RISK-ON: Capital flooding into high-risk assets.', change };
            } else if (change < -2.5) {
                return { status: 'risk-off', description: '🛡️ RISK-OFF: Capital flight to safety.', change };
            }

            return { status: 'neutral', description: 'Stable capital flow.', change };
        } catch (e) {
            return { status: 'unknown', description: 'Data unavailable', change: 0 };
        }
    }
}

export const marketIntelligence = new MarketIntelligenceService();
export default marketIntelligence;
