import { APP_CONFIG } from '../constants/config';
import marketIntelligence from './marketIntelligence';

class GeminiService {
    constructor() {
        this.apiKey = APP_CONFIG.gemini.apiKey;
        this.model = APP_CONFIG.gemini.model;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1';
    }

    async generateContent(prompt, systemInstruction = null) {
        const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

        const body = {
            contents: [
                {
                    parts: [{ text: systemInstruction ? `${systemInstruction}\n\nUser Question: ${prompt}` : prompt }]
                }
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1024
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const result = await response.json();
            if (!response.ok) {
                console.error('Gemini Error:', JSON.stringify(result));
                throw new Error(result.error?.message || 'Gemini API error');
            }

            return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } catch (error) {
            console.error('Gemini Request Failed:', error);
            throw error;
        }
    }

    /**
     * Enhanced Market Analysis with Intelligence Data
     * @param {object} marketData - Technical data for the symbol
     * @param {string} venue - 'SPOT' | 'FUTURES' | 'AUTO'
     * @param {object} extraData - {fundingRate, orderbookRatio, recentStats}
     */
    async analyzeMarket(marketData, venue = 'AUTO', extraData = {}) {
        // 1. Fetch External Data (News, Whales, Flows)
        const [news, whaleData, flowData] = await Promise.all([
            marketIntelligence.getLatestNews(),
            marketIntelligence.analyzeWhaleActivity(marketData.symbol),
            marketIntelligence.getGlobalFlows(),
        ]);
        const fearGreed = marketIntelligence.getFearAndGreedProxy(marketData.rsi);

        const { fundingRate, orderbookRatio, recentStats } = extraData;

        // 2. Build Expert Prompt — action field MUST be LONG | SHORT | HOLD
        const systemPrompt = `You are an ELITE AI Crypto Quantitative Trader with expertise in Al Brooks Price Action methodology combined with quantitative analysis.
Your objective: Maximize Alpha while protecting capital. Trade WITH the market cycle, not against it.

PRICE ACTION RULES (Al Brooks — highest priority):
- BREAKOUT PHASE (breakout_bull/bear): Probability 70%+. Enter immediately in breakout direction. High confidence trades.
- CHANNEL PHASE (channel_bull/bear): Buy pullbacks (H1/H2) in uptrend. Sell pullbacks (L1/L2) in downtrend. Moderate confidence.
- TRADING RANGE: Only scalps. Buy at support, sell at resistance. Avoid middle. Confidence usually LOW → prefer HOLD.
- BARB WIRE: ALWAYS HOLD — tight range with dojis, no direction.
- CLIMAX BUY: 3+ large bull bars = exhaustion → do NOT go LONG, consider SHORT if other signals confirm.
- CLIMAX SELL: 3+ large bear bars = exhaustion → LONG opportunity if oversold.
- WEDGE BEAR (3-push up): Potential reversal → SHORT bias if confirmed by other signals.
- WEDGE BULL (3-push down): Potential reversal → LONG bias if oversold and confirmed.
- DOUBLE TOP: Resistance tested twice → SHORT/HOLD on longs.
- DOUBLE BOTTOM: Support tested twice → LONG opportunity.
- Always-In Bias = 'LONG': Market structure favors bulls. Prefer LONG setups.
- Always-In Bias = 'SHORT': Market structure favors bears. Prefer SHORT setups.
- Buying Pressure 7+/10: Strong buying — bullish. Selling Pressure 7+/10: Strong selling — bearish.

CRITICAL TRADING RULES:
- LONG: Bullish market phase + buying pressure + H1/H2 setup or strong breakout bull + positive macro.
- SHORT: Bearish market phase + selling pressure + L1/L2 setup or strong breakout bear (FUTURES only).
- HOLD: Barb wire active, trading range without clear edge, confidence < ${extraData.minConfidence || 70}%, contradictory signals.
- SPOT only supports LONG. FUTURES supports LONG or SHORT.
- Minimum risk/reward: 2:1 (Al Brooks core rule — swing must offer at least 2x the risk).

VENUE RULES:
- If venue hint is SPOT: action can only be LONG or HOLD.
- If venue hint is FUTURES: action can be LONG, SHORT, or HOLD.
- If venue hint is AUTO: choose best venue based on signal direction and confidence.

RESPONSE: Return JSON ONLY, no markdown, no explanation outside JSON.
{
  "action": "LONG" | "SHORT" | "HOLD",
  "venue": "SPOT" | "FUTURES",
  "leverage": number (1-10, FUTURES only, 1 for SPOT),
  "confidence": 0-100,
  "reasoning": "Clinical 1-sentence analysis including market phase and PA pattern.",
  "stopLossPercent": number (% below entry for LONG, % above entry for SHORT, e.g. 2.0),
  "takeProfitPercent": number (% above entry for LONG, % below entry for SHORT, min 2x stopLoss),
  "riskLevel": "low" | "medium" | "high",
  "marketSentiment": "bullish" | "bearish" | "neutral",
  "allocation": number (1-25, % of available capital to deploy)
}`;

        const newsSummary = news.slice(0, 3).map(n => `- ${n.title} (${n.sentiment})`).join('\n');

        // Build funding rate context
        const fundingCtx = fundingRate !== undefined
            ? `\n⚡ **FUNDING RATE**: ${(fundingRate * 100).toFixed(4)}% ${fundingRate > 0.0005 ? '(HIGH POSITIVE → SHORT bias)' : fundingRate < -0.0005 ? '(HIGH NEGATIVE → LONG bias)' : '(neutral)'}`
            : '';

        // Build orderbook context
        const orderbookCtx = orderbookRatio !== undefined
            ? `\n📖 **ORDERBOOK**: Bid/Ask ratio ${orderbookRatio.toFixed(2)} ${orderbookRatio > 1.5 ? '(BUY pressure)' : orderbookRatio < 0.67 ? '(SELL pressure)' : '(balanced)'}`
            : '';

        // Build recent performance context
        const statsCtx = recentStats
            ? `\n📊 **RECENT BOT PERFORMANCE**: Win rate ${recentStats.winRate?.toFixed(1)}% over last ${recentStats.totalTrades} trades | Avg P&L: $${recentStats.avgPnL?.toFixed(2)}`
            : '';

        // Build Price Action context (Al Brooks methodology)
        const pa = marketData.priceAction;
        const paCtx = pa ? `
📐 **PRICE ACTION (Al Brooks)**:
- Market Phase: ${pa.marketPhase?.replace('_', ' ').toUpperCase()} | Trend: ${pa.trendStrength?.toUpperCase()}
- Always-In Bias: ${pa.alwaysInBias} | Buying Pressure: ${pa.buyingPressure}/10 | Selling Pressure: ${pa.sellingPressure}/10
- Consecutive Bull Bars: ${pa.consecutiveBull} | Bear Bars: ${pa.consecutiveBear}
- Entry Setups: ${[pa.h1h2Setup && 'H1/H2 (bullish pullback)', pa.l1l2Setup && 'L1/L2 (bearish pullback)'].filter(Boolean).join(', ') || 'none'}
- Reversal Patterns: ${[
    pa.wedgeBull && `Wedge BULL (3-push down, ${pa.wedgeStrength} reversal)`,
    pa.wedgeBear && `Wedge BEAR (3-push up, ${pa.wedgeStrength} exhaustion)`,
    pa.doubleTop && 'Double Top (resistance x2 → bearish)',
    pa.doubleBottom && 'Double Bottom (support x2 → bullish)',
    pa.climaxBuy && 'Climax Buy (too far up → exhaustion → SHORT risk)',
    pa.climaxSell && 'Climax Sell (too far down → exhaustion → LONG opp)',
].filter(Boolean).join(', ') || 'none'}
- Breakout: ${pa.breakoutStrength?.toUpperCase()} ${pa.breakoutDirection !== 'NEUTRAL' ? pa.breakoutDirection : ''}
- ⚠️ Barb Wire (avoid): ${pa.barbWire ? 'YES — overlapping doji bars, HOLD recommended' : 'No'}` : '';

        const prompt = `
📊 **MARKET DATA FOR ${marketData.symbol}** (Venue hint: ${venue}):
Price: $${marketData.currentPrice} (${marketData.priceChange24h?.toFixed(2)}% in 24h)

🐋 **SMART MONEY INTEL**:
- Activity: ${whaleData.description}
- Signal: ${whaleData.signal?.toUpperCase()} (Confidence: ${whaleData.confidence}%)

📈 **TECHNICAL DATA**:
- RSI(14): ${marketData.rsi?.toFixed(2)} — Status: ${fearGreed.label} (${fearGreed.value}/100)
- MACD: ${marketData.macd?.histogram > 0 ? `Bullish Histogram (+${marketData.macd?.histogram?.toFixed(4)})` : `Bearish Histogram (${marketData.macd?.histogram?.toFixed(4)})`}
- Bollinger: ${marketData.currentPrice > (marketData.bollingerBands?.upper || Infinity) ? 'UPPER BAND TOUCH (Overbought)' : marketData.currentPrice < (marketData.bollingerBands?.lower || 0) ? 'LOWER BAND TOUCH (Oversold)' : 'Within normal range'}
- EMA9 vs EMA21: ${(marketData.ema9 || 0) > (marketData.ema21 || 0) ? 'Bullish (EMA9 > EMA21)' : 'Bearish (EMA9 < EMA21)'}
- ADX: ${marketData.adx?.adx?.toFixed(1)} — Trend: ${marketData.adx?.trend?.toUpperCase()} (${marketData.adx?.strength})
- Volume: ${marketData.volume?.ratio?.toFixed(2)}x vs 20-period average
- ATR(14): ${marketData.atr?.toFixed(4) || 'N/A'}${fundingCtx}${orderbookCtx}
${paCtx}
🌍 **MACRO / FLOWS**:
- Global Status: ${flowData.status?.toUpperCase()} (${flowData.description})

📰 **NEWS SENTIMENT**:
${newsSummary}
${statsCtx}

DECIDE: action, venue, leverage (if futures), allocation %.`;

        try {
            const response = await this.generateContent(prompt, systemPrompt);
            // Extract JSON — strip any markdown code blocks
            const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);

                // Normalize: some models might still return "recommendation" or "BUY"/"SELL"
                if (!data.action && data.recommendation) {
                    const recMap = { 'BUY': 'LONG', 'SELL': 'SHORT', 'HOLD': 'HOLD', 'LONG': 'LONG', 'SHORT': 'SHORT' };
                    data.action = recMap[data.recommendation?.toUpperCase()] || 'HOLD';
                }
                // Ensure action is uppercase
                if (data.action) data.action = data.action.toUpperCase();
                // Normalize venue
                if (!data.venue) data.venue = venue === 'AUTO' ? 'SPOT' : venue;

                console.log(`[Gemini] ${marketData.symbol}: ${data.action} @ ${data.venue} (${data.leverage || 1}x) — ${data.confidence}% confidence`);

                return {
                    ...data,
                    intel: {
                        news: news.slice(0, 2),
                        whale: whaleData,
                        flow: flowData,
                        fearGreed
                    }
                };
            }
            console.warn('[Gemini] Could not parse JSON from response:', response.slice(0, 200));
            return null;
        } catch (error) {
            console.error('Gemini analysis error:', error);
            return null;
        }
    }

    async getCryptoNews() {
        return await marketIntelligence.getLatestNews();
    }
}

export const geminiService = new GeminiService();
export default geminiService;
