import marketIntelligence from './marketIntelligence';
import { RISK_LEVELS } from '../constants/config';

/**
 * Local Decision Engine — Replaces Gemini AI
 * Deterministic weighted scoring system for LONG/SHORT/HOLD decisions.
 * Zero latency, no rate limits, no API costs.
 */
class LocalDecisionEngine {
    constructor() {
        this.name = 'LocalDecisionEngine';
    }

    /**
     * Analyze market data and return a trading decision.
     * Same signature and return format as geminiService.analyzeMarket()
     */
    async analyzeMarket(marketData, venue = 'AUTO', extraData = {}) {
        // 1. Fetch External Data (same as Gemini did)
        const [news, whaleData, flowData] = await Promise.all([
            marketIntelligence.getLatestNews(),
            marketIntelligence.analyzeWhaleActivity(marketData.symbol),
            marketIntelligence.getGlobalFlows(),
        ]);
        const fearGreed = marketIntelligence.getFearAndGreedProxy(marketData.rsi);

        const { fundingRate, orderbookRatio, higherTimeframeBias, divergences } = extraData;

        // 2. Calculate scores
        const signals = [];
        let bullScore = 0;
        let bearScore = 0;
        let forceHold = false;

        // ═══════════════════════════════════════
        // TIER 1 — Price Action (Al Brooks) — max ~18pts
        // ═══════════════════════════════════════
        const pa = marketData.priceAction;
        if (pa) {
            // Market Phase
            if (pa.marketPhase === 'breakout_bull') {
                bullScore += 5.0;
                signals.push({ side: 'bull', pts: 5.0, reason: 'Breakout Bull phase' });
            } else if (pa.marketPhase === 'breakout_bear') {
                bearScore += 5.0;
                signals.push({ side: 'bear', pts: 5.0, reason: 'Breakout Bear phase' });
            } else if (pa.marketPhase === 'channel_bull') {
                bullScore += 2.5;
                signals.push({ side: 'bull', pts: 2.5, reason: 'Channel Bull trend' });
            } else if (pa.marketPhase === 'channel_bear') {
                bearScore += 2.5;
                signals.push({ side: 'bear', pts: 2.5, reason: 'Channel Bear trend' });
            }

            // Always-In Bias
            if (pa.alwaysInBias === 'LONG') {
                bullScore += 2.0;
                signals.push({ side: 'bull', pts: 2.0, reason: 'Always-In LONG bias' });
            } else if (pa.alwaysInBias === 'SHORT') {
                bearScore += 2.0;
                signals.push({ side: 'bear', pts: 2.0, reason: 'Always-In SHORT bias' });
            }

            // Entry Setups
            if (pa.h1h2Setup) {
                bullScore += 3.0;
                signals.push({ side: 'bull', pts: 3.0, reason: 'H1/H2 pullback setup' });
            }
            if (pa.l1l2Setup) {
                bearScore += 3.0;
                signals.push({ side: 'bear', pts: 3.0, reason: 'L1/L2 pullback setup' });
            }

            // Pressure
            if (pa.buyingPressure >= 7) {
                bullScore += 2.0;
                signals.push({ side: 'bull', pts: 2.0, reason: `Buying pressure ${pa.buyingPressure}/10` });
            }
            if (pa.sellingPressure >= 7) {
                bearScore += 2.0;
                signals.push({ side: 'bear', pts: 2.0, reason: `Selling pressure ${pa.sellingPressure}/10` });
            }

            // Breakout Strength
            const bDir = pa.breakoutDirection;
            const bStr = pa.breakoutStrength;
            if (bDir === 'BULL' || bDir === 'LONG') {
                const pts = bStr === 'strong' ? 3.0 : bStr === 'moderate' ? 1.5 : 0;
                if (pts > 0) {
                    bullScore += pts;
                    signals.push({ side: 'bull', pts, reason: `${bStr} bull breakout` });
                }
            } else if (bDir === 'BEAR' || bDir === 'SHORT') {
                const pts = bStr === 'strong' ? 3.0 : bStr === 'moderate' ? 1.5 : 0;
                if (pts > 0) {
                    bearScore += pts;
                    signals.push({ side: 'bear', pts, reason: `${bStr} bear breakout` });
                }
            }

            // Reversal Patterns
            if (pa.wedgeBull) {
                bullScore += 2.0;
                signals.push({ side: 'bull', pts: 2.0, reason: 'Wedge Bull reversal (3-push down)' });
            }
            if (pa.wedgeBear) {
                bearScore += 2.0;
                signals.push({ side: 'bear', pts: 2.0, reason: 'Wedge Bear reversal (3-push up)' });
            }
            if (pa.doubleBottom) {
                bullScore += 2.0;
                signals.push({ side: 'bull', pts: 2.0, reason: 'Double Bottom support' });
            }
            if (pa.doubleTop) {
                bearScore += 2.0;
                signals.push({ side: 'bear', pts: 2.0, reason: 'Double Top resistance' });
            }

            // Climax (exhaustion → opposite side signal)
            if (pa.climaxBuy) {
                bearScore += 2.5;
                signals.push({ side: 'bear', pts: 2.5, reason: 'Climax Buy exhaustion' });
            }
            if (pa.climaxSell) {
                bullScore += 2.5;
                signals.push({ side: 'bull', pts: 2.5, reason: 'Climax Sell exhaustion' });
            }

            // Barb Wire → force HOLD
            if (pa.barbWire) {
                forceHold = true;
                signals.push({ side: 'neutral', pts: 0, reason: 'Barb Wire — no direction' });
            }
        }

        // ═══════════════════════════════════════
        // TIER 2 — ADX / Trend Strength — max ~5pts
        // ═══════════════════════════════════════
        const adx = marketData.adx;
        if (adx && adx.adx) {
            const adxVal = adx.adx;
            const trend = adx.trend?.toLowerCase();

            if (adxVal > 25) {
                if (trend === 'bullish' || trend === 'up') {
                    bullScore += 3.0;
                    signals.push({ side: 'bull', pts: 3.0, reason: `ADX ${adxVal.toFixed(0)} bullish trend` });
                } else if (trend === 'bearish' || trend === 'down') {
                    bearScore += 3.0;
                    signals.push({ side: 'bear', pts: 3.0, reason: `ADX ${adxVal.toFixed(0)} bearish trend` });
                }
                // Very strong trend bonus
                if (adxVal > 40) {
                    const side = (trend === 'bullish' || trend === 'up') ? 'bull' : 'bear';
                    if (side === 'bull') bullScore += 1.5;
                    else bearScore += 1.5;
                    signals.push({ side, pts: 1.5, reason: `Very strong trend ADX ${adxVal.toFixed(0)}` });
                }
            }
        }

        // ═══════════════════════════════════════
        // TIER 3 — Momentum (RSI, MACD, StochRSI) — max ~6pts
        // ═══════════════════════════════════════

        // RSI
        const rsi = marketData.rsi;
        if (rsi !== undefined && rsi !== null) {
            if (rsi < 30) {
                bullScore += 2.0;
                signals.push({ side: 'bull', pts: 2.0, reason: `RSI oversold ${rsi.toFixed(0)}` });
            } else if (rsi > 70) {
                bearScore += 2.0;
                signals.push({ side: 'bear', pts: 2.0, reason: `RSI overbought ${rsi.toFixed(0)}` });
            } else if (rsi < 45) {
                bullScore += 0.5;
                signals.push({ side: 'bull', pts: 0.5, reason: `RSI leaning oversold ${rsi.toFixed(0)}` });
            } else if (rsi > 55) {
                bearScore += 0.5;
                signals.push({ side: 'bear', pts: 0.5, reason: `RSI leaning overbought ${rsi.toFixed(0)}` });
            }
        }

        // MACD
        const macd = marketData.macd;
        if (macd) {
            if (macd.histogram > 0 && macd.macd > macd.signal) {
                bullScore += 2.0;
                signals.push({ side: 'bull', pts: 2.0, reason: 'MACD bullish histogram' });
            } else if (macd.histogram < 0 && macd.macd < macd.signal) {
                bearScore += 2.0;
                signals.push({ side: 'bear', pts: 2.0, reason: 'MACD bearish histogram' });
            }
        }

        // StochRSI
        const stoch = marketData.stochRsi;
        if (stoch) {
            if (stoch.oversold) {
                bullScore += 2.0;
                signals.push({ side: 'bull', pts: 2.0, reason: 'StochRSI oversold' });
            } else if (stoch.overbought) {
                bearScore += 2.0;
                signals.push({ side: 'bear', pts: 2.0, reason: 'StochRSI overbought' });
            }
            if (stoch.crossUp && stoch.k < 50) {
                bullScore += 1.0;
                signals.push({ side: 'bull', pts: 1.0, reason: 'StochRSI bullish cross' });
            } else if (stoch.crossDown && stoch.k > 50) {
                bearScore += 1.0;
                signals.push({ side: 'bear', pts: 1.0, reason: 'StochRSI bearish cross' });
            }
        }

        // ═══════════════════════════════════════
        // TIER 4 — Trend / Bollinger — max ~4pts
        // ═══════════════════════════════════════

        // EMA Cross
        if (marketData.ema9 && marketData.ema21) {
            if (marketData.ema9 > marketData.ema21) {
                bullScore += 2.0;
                signals.push({ side: 'bull', pts: 2.0, reason: 'EMA9 > EMA21 bullish' });
            } else {
                bearScore += 2.0;
                signals.push({ side: 'bear', pts: 2.0, reason: 'EMA9 < EMA21 bearish' });
            }
        }

        // Bollinger Bands
        const bb = marketData.bollingerBands;
        const price = marketData.currentPrice;
        if (bb && price) {
            if (price <= bb.lower) {
                bullScore += 2.0;
                signals.push({ side: 'bull', pts: 2.0, reason: 'Price at BB lower band' });
            } else if (price >= bb.upper) {
                bearScore += 2.0;
                signals.push({ side: 'bear', pts: 2.0, reason: 'Price at BB upper band' });
            }
        }

        // ═══════════════════════════════════════
        // TIER 5 — Smart Money / Volume — max ~5pts
        // ═══════════════════════════════════════

        // Volume spike
        if (marketData.volume?.ratio > 2.0) {
            // High volume — supports whichever side is winning
            const side = bullScore >= bearScore ? 'bull' : 'bear';
            if (side === 'bull') bullScore += 1.5;
            else bearScore += 1.5;
            signals.push({ side, pts: 1.5, reason: `Volume spike ${marketData.volume.ratio.toFixed(1)}x` });
        }

        // Whale activity
        if (whaleData) {
            if (whaleData.signal === 'whale_buy' || whaleData.signal === 'accumulation') {
                const pts = whaleData.signal === 'whale_buy' ? 2.5 : 1.5;
                bullScore += pts;
                signals.push({ side: 'bull', pts, reason: `Whale ${whaleData.signal}` });
            } else if (whaleData.signal === 'whale_sell' || whaleData.signal === 'distribution') {
                const pts = whaleData.signal === 'whale_sell' ? 2.5 : 1.5;
                bearScore += pts;
                signals.push({ side: 'bear', pts, reason: `Whale ${whaleData.signal}` });
            }
        }

        // Orderbook
        if (orderbookRatio !== undefined) {
            if (orderbookRatio > 1.5) {
                bullScore += 1.5;
                signals.push({ side: 'bull', pts: 1.5, reason: `Orderbook buy pressure ${orderbookRatio.toFixed(2)}` });
            } else if (orderbookRatio < 0.67) {
                bearScore += 1.5;
                signals.push({ side: 'bear', pts: 1.5, reason: `Orderbook sell pressure ${orderbookRatio.toFixed(2)}` });
            }
        }

        // ═══════════════════════════════════════
        // TIER 6 — Macro / External — max ~3pts
        // ═══════════════════════════════════════

        // Funding Rate
        if (fundingRate !== undefined) {
            if (fundingRate < -0.0005) {
                bullScore += 1.0;
                signals.push({ side: 'bull', pts: 1.0, reason: 'Negative funding → long bias' });
            } else if (fundingRate > 0.0005) {
                bearScore += 1.0;
                signals.push({ side: 'bear', pts: 1.0, reason: 'Positive funding → short bias' });
            }
        }

        // News sentiment
        if (news && news.length > 0) {
            const posCount = news.filter(n => n.sentiment === 'positive').length;
            const negCount = news.filter(n => n.sentiment === 'negative').length;
            if (posCount > negCount) {
                bullScore += 1.0;
                signals.push({ side: 'bull', pts: 1.0, reason: 'News net positive' });
            } else if (negCount > posCount) {
                bearScore += 1.0;
                signals.push({ side: 'bear', pts: 1.0, reason: 'News net negative' });
            }
        }

        // Global Flows
        if (flowData) {
            if (flowData.status === 'risk-on') {
                bullScore += 1.0;
                signals.push({ side: 'bull', pts: 1.0, reason: 'Global risk-on' });
            } else if (flowData.status === 'risk-off') {
                bearScore += 1.0;
                signals.push({ side: 'bear', pts: 1.0, reason: 'Global risk-off' });
            }
        }

        // ═══════════════════════════════════════
        // 3. CALCULATE CONFIDENCE
        // ═══════════════════════════════════════
        const totalPoints = bullScore + bearScore;
        const rawDiff = Math.abs(bullScore - bearScore);

        // Base confidence: how decisive is the signal?
        let confidence = totalPoints > 0
            ? Math.round((rawDiff / Math.max(totalPoints, 1)) * 100)
            : 0;

        // Boost confidence if there are many agreeing signals
        const activeSignalCount = signals.filter(s => s.side !== 'neutral').length;
        if (activeSignalCount >= 8) confidence += 5;
        else if (activeSignalCount <= 3) confidence -= 5;

        // If total points are high and directional, boost confidence
        if (totalPoints >= 15 && rawDiff >= 8) confidence += 10;
        else if (totalPoints >= 10 && rawDiff >= 5) confidence += 5;

        // ═══════════════════════════════════════
        // 4. APPLY MODIFIERS
        // ═══════════════════════════════════════
        const direction = bullScore >= bearScore ? 'LONG' : 'SHORT';

        // Higher Timeframe Confirmation
        if (higherTimeframeBias) {
            const htf = higherTimeframeBias.toLowerCase();
            const confirmsLong = (direction === 'LONG' && htf === 'bullish');
            const confirmsShort = (direction === 'SHORT' && htf === 'bearish');
            const contradictsLong = (direction === 'LONG' && htf === 'bearish');
            const contradictsShort = (direction === 'SHORT' && htf === 'bullish');

            if (confirmsLong || confirmsShort) {
                confidence += 8;
                signals.push({ side: direction === 'LONG' ? 'bull' : 'bear', pts: 0, reason: 'HTF confirms direction +8' });
            } else if (contradictsLong || contradictsShort) {
                confidence -= 15;
                signals.push({ side: 'neutral', pts: 0, reason: 'HTF contradicts direction -15' });
            }
        }

        // Divergences
        if (divergences) {
            const rsiDiv = divergences.rsiDivergence || 'none';
            const macdDiv = divergences.macdDivergence || 'none';

            // RSI divergence opposing direction
            if ((direction === 'LONG' && rsiDiv === 'bearish') ||
                (direction === 'SHORT' && rsiDiv === 'bullish')) {
                confidence -= 12;
                signals.push({ side: 'neutral', pts: 0, reason: `RSI ${rsiDiv} divergence -12` });
            } else if ((direction === 'LONG' && rsiDiv === 'bullish') ||
                       (direction === 'SHORT' && rsiDiv === 'bearish')) {
                confidence += 5;
            }

            // MACD divergence opposing direction
            if ((direction === 'LONG' && macdDiv === 'bearish') ||
                (direction === 'SHORT' && macdDiv === 'bullish')) {
                confidence -= 10;
                signals.push({ side: 'neutral', pts: 0, reason: `MACD ${macdDiv} divergence -10` });
            }

            // Double divergence
            if (rsiDiv !== 'none' && macdDiv !== 'none' && rsiDiv === macdDiv) {
                if ((direction === 'LONG' && rsiDiv === 'bearish') ||
                    (direction === 'SHORT' && rsiDiv === 'bullish')) {
                    confidence -= 8; // Additional penalty for double divergence
                }
            }
        }

        // ADX < 15 penalty
        if (adx && adx.adx < 15) {
            confidence -= 10;
            signals.push({ side: 'neutral', pts: 0, reason: 'ADX < 15 trendless -10' });
        }

        // Trading range penalty
        if (pa && pa.marketPhase === 'trading_range') {
            confidence -= 8;
        }

        // Clamp confidence
        confidence = Math.max(0, Math.min(98, confidence));

        // ═══════════════════════════════════════
        // 5. DETERMINE ACTION
        // ═══════════════════════════════════════
        let action = direction;

        if (forceHold) {
            action = 'HOLD';
        } else if (confidence < 30) {
            action = 'HOLD';
        } else if (totalPoints < 3) {
            action = 'HOLD';
        }

        // SPOT cannot SHORT
        let resolvedVenue = venue;
        if (venue === 'AUTO') {
            if (direction === 'SHORT') {
                resolvedVenue = 'FUTURES';
            } else if (confidence >= 75) {
                resolvedVenue = 'FUTURES';
            } else {
                resolvedVenue = 'SPOT';
            }
        }

        if (resolvedVenue === 'SPOT' && action === 'SHORT') {
            action = 'HOLD';
        }

        // ═══════════════════════════════════════
        // 6. CALCULATE SL/TP, LEVERAGE, ALLOCATION
        // ═══════════════════════════════════════
        const atr = marketData.atr;
        const atrPercent = atr && price ? (atr / price) * 100 : 2.0;

        // Risk level from confidence + volatility
        let riskLevel;
        if (confidence >= 80 && atrPercent < 2) riskLevel = 'low';
        else if (confidence >= 60) riskLevel = 'medium';
        else riskLevel = 'high';

        const riskConfig = RISK_LEVELS[riskLevel] || RISK_LEVELS.medium;

        // SL/TP based on ATR
        let stopLossPercent, takeProfitPercent;
        if (atr && atr > 0 && price) {
            stopLossPercent = parseFloat(((atr * riskConfig.slAtrMultiplier) / price * 100).toFixed(2));
            takeProfitPercent = parseFloat(((atr * riskConfig.tpAtrMultiplier) / price * 100).toFixed(2));
        } else {
            stopLossPercent = riskConfig.stopLossPercent;
            takeProfitPercent = riskConfig.takeProfitPercent;
        }

        // Enforce minimum 2:1 R:R
        if (takeProfitPercent < stopLossPercent * 2) {
            takeProfitPercent = parseFloat((stopLossPercent * 2).toFixed(2));
        }

        // Leverage (futures only)
        let leverage = 1;
        if (resolvedVenue === 'FUTURES' && action !== 'HOLD') {
            const maxLev = riskConfig.maxLeverage;
            if (confidence >= 85) leverage = maxLev;
            else if (confidence >= 75) leverage = Math.ceil(maxLev * 0.7);
            else if (confidence >= 65) leverage = Math.ceil(maxLev * 0.5);
            else if (confidence >= 55) leverage = Math.ceil(maxLev * 0.3);
            else leverage = 1;
            leverage = Math.max(1, Math.min(leverage, maxLev));
        }

        // Allocation
        let allocation = Math.min(25, riskConfig.maxTradePercent / 2);
        if (confidence >= 85) allocation = Math.min(25, allocation * 1.2);
        else if (confidence >= 70) allocation = allocation;
        else if (confidence >= 55) allocation = Math.max(5, allocation * 0.6);
        else allocation = Math.max(3, allocation * 0.4);
        allocation = Math.round(allocation);

        // Market sentiment
        let marketSentiment;
        if (bullScore > bearScore + 5) marketSentiment = 'bullish';
        else if (bearScore > bullScore + 5) marketSentiment = 'bearish';
        else marketSentiment = 'neutral';

        // ═══════════════════════════════════════
        // 7. BUILD REASONING
        // ═══════════════════════════════════════
        const topSignals = signals
            .filter(s => s.pts > 0)
            .sort((a, b) => b.pts - a.pts)
            .slice(0, 3)
            .map(s => s.reason)
            .join(', ');

        const phase = pa?.marketPhase?.replace(/_/g, ' ') || 'unknown';
        const reasoning = `${phase} phase. ${topSignals}. Bull:${bullScore.toFixed(1)} Bear:${bearScore.toFixed(1)}. HTF:${higherTimeframeBias || 'N/A'}`;

        // 8. LOG
        console.log(`[LocalEngine] ${marketData.symbol}: ${action} ${confidence}% @ ${resolvedVenue} (${leverage}x) — B:${bullScore.toFixed(1)} vs S:${bearScore.toFixed(1)} | ${topSignals}`);

        // 9. RETURN (same format as Gemini)
        return {
            action,
            venue: resolvedVenue,
            leverage,
            confidence,
            reasoning,
            stopLossPercent,
            takeProfitPercent,
            riskLevel,
            marketSentiment,
            allocation,
            intel: {
                news: news.slice(0, 2),
                whale: whaleData,
                flow: flowData,
                fearGreed,
            },
            // Extra debug info
            _debug: {
                bullScore,
                bearScore,
                totalPoints,
                signalCount: activeSignalCount,
                forceHold,
            },
        };
    }
}

export const localDecisionEngine = new LocalDecisionEngine();
export default localDecisionEngine;
