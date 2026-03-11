/**
 * 🧠 ADAPTIVE SELF-LEARNING ENGINE
 *
 * O cérebro do Super Trader. Aprende com cada trade executado,
 * ajusta pesos dos indicadores automaticamente e melhora confiança
 * ao longo do tempo. Auto-programa a estratégia baseado em resultados reais.
 *
 * Conceitos:
 * - Cada indicador/sinal tem um "peso" (weight) que começa em 1.0
 * - Após cada trade, os pesos dos sinais que contribuíram para a decisão
 *   são ajustados: +reward se trade lucrativo, -penalty se prejuízo
 * - O scoring engine combina todos os sinais com seus pesos aprendidos
 * - Market regime detection muda a estratégia conforme o mercado
 */

class AdaptiveEngine {
    constructor() {
        // Signal weights — auto-adjusted via learning
        this.weights = {
            rsi_oversold: 1.0,
            rsi_overbought: 1.0,
            macd_bullish: 1.0,
            macd_bearish: 1.0,
            bb_lower_touch: 1.0,
            bb_upper_touch: 1.0,
            ema_bullish_cross: 1.0,
            ema_bearish_cross: 1.0,
            adx_strong_bull: 1.0,
            adx_strong_bear: 1.0,
            stoch_rsi_oversold: 1.0,
            stoch_rsi_overbought: 1.0,
            volume_spike: 1.0,
            whale_buy: 1.5,
            whale_sell: 1.5,
            orderbook_buy_pressure: 0.8,
            orderbook_sell_pressure: 0.8,
            funding_long_bias: 0.7,
            funding_short_bias: 0.7,
            news_positive: 0.6,
            news_negative: 0.6,
            regime_trending: 1.0,
            regime_ranging: 1.0,
            mtf_confluence_bull: 1.5,
            mtf_confluence_bear: 1.5,
            vwap_above: 0.8,
            vwap_below: 0.8,
            obv_rising: 0.7,
            obv_falling: 0.7,
            ichimoku_bull: 0.9,
            ichimoku_bear: 0.9,
        };

        // Learning parameters
        this.learningRate = 0.15;        // How fast weights adjust
        this.decayRate = 0.98;           // Decay old weights slowly toward 1.0
        this.minWeight = 0.1;            // Never go below 0.1
        this.maxWeight = 3.0;            // Never go above 3.0

        // Trade history for learning
        this.tradeHistory = [];          // Recent trades with signals used
        this.performanceByRegime = {     // Track which regimes are profitable
            trending_up: { wins: 0, losses: 0, pnl: 0 },
            trending_down: { wins: 0, losses: 0, pnl: 0 },
            ranging: { wins: 0, losses: 0, pnl: 0 },
            volatile: { wins: 0, losses: 0, pnl: 0 },
        };

        // Confidence calibration
        this.confidenceHistory = [];     // {predicted, actual} for calibration
        this.calibrationFactor = 1.0;    // Multiply AI confidence by this

        // Load persisted state
        this._loadState();
    }

    // ==========================================
    // MARKET REGIME DETECTION
    // ==========================================

    /**
     * Detecta o regime de mercado atual.
     * @param {object} analysis - Output do analyzeMarketConditions()
     * @param {Array} klines - Klines data
     * @returns {{regime, strength, description}}
     */
    detectMarketRegime(analysis, klines) {
        if (!analysis || !klines || klines.length < 50) {
            return { regime: 'unknown', strength: 0, description: 'Dados insuficientes' };
        }

        const { adx, rsi, bollingerBands, volume, ema9, ema21 } = analysis;
        const closes = klines.map(k => k.close);

        // ADX-based trend strength
        const adxValue = adx?.adx || 0;
        const isTrending = adxValue > 25;
        const isStrongTrend = adxValue > 40;

        // Bollinger Bandwidth — narrowing = ranging, widening = volatile
        const bbWidth = bollingerBands?.bandwidth || 0;
        const isSqueezing = bbWidth < 0.03;   // Very tight bands
        const isExpanding = bbWidth > 0.08;    // Wide bands

        // Directional EMAs
        const emaBullish = ema9 > ema21;

        // Recent volatility (ATR/price ratio via closes)
        const recentCloses = closes.slice(-20);
        const avgClose = recentCloses.reduce((a, b) => a + b, 0) / recentCloses.length;
        const returns = [];
        for (let i = 1; i < recentCloses.length; i++) {
            returns.push(Math.abs((recentCloses[i] - recentCloses[i - 1]) / recentCloses[i - 1]));
        }
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const isVolatile = avgReturn > 0.015; // >1.5% avg candle

        // Volume trend
        const volumeRising = volume?.ratio > 1.3;

        // Classify regime
        if (isStrongTrend && emaBullish && !isVolatile) {
            return { regime: 'trending_up', strength: adxValue, description: '📈 Tendência de ALTA forte. Estratégia: Trend Following.' };
        }
        if (isStrongTrend && !emaBullish && !isVolatile) {
            return { regime: 'trending_down', strength: adxValue, description: '📉 Tendência de BAIXA forte. Estratégia: Short / Fade rallies.' };
        }
        if (isVolatile || isExpanding) {
            return { regime: 'volatile', strength: avgReturn * 100, description: '🌪️ Alta VOLATILIDADE. Estratégia: SL mais apertado, positions menores.' };
        }
        if (!isTrending || isSqueezing) {
            return { regime: 'ranging', strength: 100 - adxValue, description: '📦 RANGING / Lateralizado. Estratégia: Comprar suporte, vender resistência.' };
        }
        if (isTrending && emaBullish) {
            return { regime: 'trending_up', strength: adxValue, description: '📈 Tendência de alta moderada.' };
        }
        if (isTrending && !emaBullish) {
            return { regime: 'trending_down', strength: adxValue, description: '📉 Tendência de baixa moderada.' };
        }

        return { regime: 'ranging', strength: 50, description: 'Mercado indefinido' };
    }

    // ==========================================
    // MULTI-TIMEFRAME ANALYSIS
    // ==========================================

    /**
     * Analisa múltiplos timeframes para confluência.
     * @param {object} binanceService
     * @param {string} symbol
     * @returns {{confluence, direction, details}}
     */
    async multiTimeframeAnalysis(binanceService, symbol) {
        const timeframes = [
            { tf: '5m', weight: 0.15, label: '5min' },
            { tf: '15m', weight: 0.25, label: '15min' },
            { tf: '1h', weight: 0.30, label: '1h' },
            { tf: '4h', weight: 0.30, label: '4h' },
        ];

        const results = await Promise.all(
            timeframes.map(async ({ tf, weight, label }) => {
                try {
                    const klines = await binanceService.getKlines(symbol, tf, 60);
                    const closes = klines.map(k => k.close);
                    if (closes.length < 30) return null;

                    // Quick trend assessment per TF
                    const ema9 = this._quickEMA(closes, 9);
                    const ema21 = this._quickEMA(closes, 21);
                    const lastClose = closes[closes.length - 1];
                    const prevClose = closes[closes.length - 6]; // ~5 candles back

                    const momentum = (lastClose - prevClose) / prevClose;
                    const emaTrend = ema9 > ema21 ? 'bullish' : 'bearish';
                    const priceVsEma = lastClose > ema21 ? 'bullish' : 'bearish';

                    let score = 0;
                    if (emaTrend === 'bullish') score += 1;
                    else score -= 1;
                    if (priceVsEma === 'bullish') score += 1;
                    else score -= 1;
                    if (momentum > 0.005) score += 1;
                    else if (momentum < -0.005) score -= 1;

                    return { tf: label, score, weight, emaTrend, momentum };
                } catch (e) {
                    return null;
                }
            })
        );

        const valid = results.filter(Boolean);
        if (valid.length === 0) return { confluence: 0, direction: 'neutral', details: [] };

        // Weighted confluence score
        let totalWeight = 0;
        let weightedScore = 0;
        for (const r of valid) {
            weightedScore += r.score * r.weight;
            totalWeight += r.weight;
        }
        const normalizedScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

        let direction = 'neutral';
        let confluence = Math.abs(normalizedScore);
        if (normalizedScore > 0.5) direction = 'bullish';
        else if (normalizedScore < -0.5) direction = 'bearish';

        // Strong confluence = all TFs agree
        const allBullish = valid.every(r => r.score > 0);
        const allBearish = valid.every(r => r.score < 0);
        if (allBullish || allBearish) confluence = Math.min(confluence * 1.5, 3);

        return {
            confluence: parseFloat(confluence.toFixed(2)),
            direction,
            allAligned: allBullish || allBearish,
            details: valid.map(r => `${r.tf}: ${r.emaTrend} (${r.score > 0 ? '+' : ''}${r.score})`),
        };
    }

    // ==========================================
    // ADAPTIVE SCORING ENGINE
    // ==========================================

    /**
     * Calcula score adaptativo usando pesos aprendidos.
     * @param {object} data - All collected signals
     * @returns {{score, direction, confidence, activeSignals}}
     */
    calculateAdaptiveScore(data) {
        const { analysis, whaleData, obSignal, fundingSignal, regime, mtf, stochRsi, news } = data;

        const activeSignals = [];
        let bullScore = 0;
        let bearScore = 0;

        const addSignal = (key, direction, reason) => {
            const w = this.weights[key] || 1.0;
            if (direction === 'bull') bullScore += w;
            else bearScore += w;
            activeSignals.push({ key, direction, weight: w, reason });
        };

        // --- TECHNICAL INDICATORS ---

        if (analysis?.rsi != null) {
            if (analysis.rsi < 30) addSignal('rsi_oversold', 'bull', `RSI ${analysis.rsi.toFixed(1)} oversold`);
            if (analysis.rsi > 70) addSignal('rsi_overbought', 'bear', `RSI ${analysis.rsi.toFixed(1)} overbought`);
        }

        if (analysis?.macd) {
            if (analysis.macd.histogram > 0 && analysis.macd.value > analysis.macd.signal)
                addSignal('macd_bullish', 'bull', 'MACD bullish cross');
            if (analysis.macd.histogram < 0 && analysis.macd.value < analysis.macd.signal)
                addSignal('macd_bearish', 'bear', 'MACD bearish cross');
        }

        if (analysis?.bollingerBands) {
            const price = analysis.currentPrice;
            if (price <= analysis.bollingerBands.lower) addSignal('bb_lower_touch', 'bull', 'BB lower band touch');
            if (price >= analysis.bollingerBands.upper) addSignal('bb_upper_touch', 'bear', 'BB upper band touch');
        }

        if (analysis?.ema9 && analysis?.ema21) {
            if (analysis.ema9 > analysis.ema21) addSignal('ema_bullish_cross', 'bull', 'EMA 9>21 bullish');
            else addSignal('ema_bearish_cross', 'bear', 'EMA 9<21 bearish');
        }

        if (analysis?.adx?.adx > 25) {
            if (analysis.adx.trend === 'bullish') addSignal('adx_strong_bull', 'bull', `ADX ${analysis.adx.adx.toFixed(0)} bullish`);
            else addSignal('adx_strong_bear', 'bear', `ADX ${analysis.adx.adx.toFixed(0)} bearish`);
        }

        if (stochRsi) {
            if (stochRsi.oversold) addSignal('stoch_rsi_oversold', 'bull', 'StochRSI oversold');
            if (stochRsi.overbought) addSignal('stoch_rsi_overbought', 'bear', 'StochRSI overbought');
        }

        if (analysis?.volume?.ratio > 2.0) addSignal('volume_spike', 'bull', `Vol ${analysis.volume.ratio.toFixed(1)}x spike`);

        // --- SMART MONEY ---

        if (whaleData?.signal === 'whale_buy') addSignal('whale_buy', 'bull', whaleData.description);
        if (whaleData?.signal === 'whale_sell') addSignal('whale_sell', 'bear', whaleData.description);

        if (obSignal?.signal === 'buy_pressure') addSignal('orderbook_buy_pressure', 'bull', `OB ratio ${obSignal.ratio?.toFixed(2)}`);
        if (obSignal?.signal === 'sell_pressure') addSignal('orderbook_sell_pressure', 'bear', `OB ratio ${obSignal.ratio?.toFixed(2)}`);

        if (fundingSignal?.bias === 'long_bias') addSignal('funding_long_bias', 'bull', fundingSignal.description);
        if (fundingSignal?.bias === 'short_bias') addSignal('funding_short_bias', 'bear', fundingSignal.description);

        // --- SENTIMENT ---

        const newsBullish = (news || []).filter(n => n.sentiment === 'positive').length;
        const newsBearish = (news || []).filter(n => n.sentiment === 'negative').length;
        if (newsBullish > newsBearish) addSignal('news_positive', 'bull', `${newsBullish} positive news`);
        if (newsBearish > newsBullish) addSignal('news_negative', 'bear', `${newsBearish} negative news`);

        // --- MARKET REGIME ---

        if (regime?.regime === 'trending_up') addSignal('regime_trending', 'bull', regime.description);
        if (regime?.regime === 'trending_down') addSignal('regime_trending', 'bear', regime.description);

        // --- MULTI-TIMEFRAME ---

        if (mtf?.direction === 'bullish' && mtf.confluence > 1) addSignal('mtf_confluence_bull', 'bull', `MTF confluência ${mtf.confluence.toFixed(1)}`);
        if (mtf?.direction === 'bearish' && mtf.confluence > 1) addSignal('mtf_confluence_bear', 'bear', `MTF confluência ${mtf.confluence.toFixed(1)}`);

        // --- VWAP / OBV / Ichimoku (from extended analysis) ---

        if (analysis?.vwap && analysis?.currentPrice) {
            if (analysis.currentPrice > analysis.vwap) addSignal('vwap_above', 'bull', 'Price > VWAP');
            else addSignal('vwap_below', 'bear', 'Price < VWAP');
        }

        if (analysis?.obv?.rising) addSignal('obv_rising', 'bull', 'OBV rising');
        if (analysis?.obv?.falling) addSignal('obv_falling', 'bear', 'OBV falling');

        if (analysis?.ichimoku?.signal === 'bullish') addSignal('ichimoku_bull', 'bull', 'Ichimoku bullish');
        if (analysis?.ichimoku?.signal === 'bearish') addSignal('ichimoku_bear', 'bear', 'Ichimoku bearish');

        // --- FINAL SCORE ---

        const totalScore = bullScore + bearScore;
        const netScore = bullScore - bearScore;
        let direction = 'HOLD';
        if (netScore > 1.5) direction = 'LONG';
        else if (netScore < -1.5) direction = 'SHORT';

        // Confidence: how strongly signals agree (0-100)
        let rawConfidence = totalScore > 0 ? (Math.abs(netScore) / totalScore) * 100 : 0;
        // Boost confidence if many signals agree
        rawConfidence *= Math.min(1 + (activeSignals.length / 15), 1.5);
        // Apply calibration from learning
        rawConfidence *= this.calibrationFactor;
        const confidence = Math.min(Math.round(rawConfidence), 98);

        return { score: netScore, direction, confidence, bullScore, bearScore, activeSignals };
    }

    // ==========================================
    // SELF-LEARNING — Auto-adjust weights
    // ==========================================

    /**
     * Registra o resultado de um trade para aprendizado.
     * Chamado após cada trade ser fechado (SL, TP, ou manual).
     */
    recordTradeResult(tradeResult) {
        const { symbol, direction, pnl, pnlPercent, signalsUsed, regime, entryConfidence } = tradeResult;
        const isWin = pnl > 0;

        // Save to history
        this.tradeHistory.push({
            ts: Date.now(),
            symbol,
            direction,
            pnl,
            pnlPercent,
            signalsUsed: signalsUsed || [],
            regime: regime || 'unknown',
            entryConfidence: entryConfidence || 50,
            isWin,
        });

        // Keep last 200 trades
        if (this.tradeHistory.length > 200) this.tradeHistory = this.tradeHistory.slice(-200);

        // --- UPDATE SIGNAL WEIGHTS ---
        const reward = isWin ? this.learningRate : -this.learningRate;
        const magnitude = Math.min(Math.abs(pnlPercent) / 5, 1); // scale by P&L size

        for (const signal of (signalsUsed || [])) {
            const key = signal.key;
            if (!this.weights[key]) continue;

            // Adjust weight: +reward if the signal contributed to a winning trade
            const signalCorrect = (signal.direction === 'bull' && direction === 'LONG' && isWin) ||
                (signal.direction === 'bear' && direction === 'SHORT' && isWin) ||
                (signal.direction === 'bull' && direction === 'LONG' && !isWin) ||
                (signal.direction === 'bear' && direction === 'SHORT' && !isWin);

            // If the signal direction matched trade direction:
            // Win → increase weight. Loss → decrease weight.
            const matchedDirection = (signal.direction === 'bull' && direction === 'LONG') ||
                (signal.direction === 'bear' && direction === 'SHORT');

            if (matchedDirection) {
                const adj = isWin ? this.learningRate * magnitude : -this.learningRate * magnitude;
                this.weights[key] = Math.max(this.minWeight, Math.min(this.maxWeight, this.weights[key] + adj));
            }
        }

        // --- UPDATE REGIME PERFORMANCE ---
        if (this.performanceByRegime[regime]) {
            if (isWin) this.performanceByRegime[regime].wins++;
            else this.performanceByRegime[regime].losses++;
            this.performanceByRegime[regime].pnl += pnl;
        }

        // --- CALIBRATE CONFIDENCE ---
        this.confidenceHistory.push({
            predicted: entryConfidence,
            actual: isWin ? 100 : 0,
        });
        if (this.confidenceHistory.length > 50) this.confidenceHistory = this.confidenceHistory.slice(-50);

        // Calculate calibration: if we predict 80% avg but only win 60%, factor = 60/80 = 0.75
        const avgPredicted = this.confidenceHistory.reduce((s, c) => s + c.predicted, 0) / this.confidenceHistory.length;
        const avgActual = this.confidenceHistory.reduce((s, c) => s + c.actual, 0) / this.confidenceHistory.length;
        if (avgPredicted > 0) {
            this.calibrationFactor = Math.max(0.5, Math.min(1.5, avgActual / avgPredicted));
        }

        // --- DECAY ALL WEIGHTS toward 1.0 (prevent runaway values) ---
        for (const key of Object.keys(this.weights)) {
            this.weights[key] = 1.0 + (this.weights[key] - 1.0) * this.decayRate;
        }

        // Persist
        this._saveState();

        console.log(`[AdaptiveEngine] Trade recorded: ${isWin ? 'WIN' : 'LOSS'} ${pnlPercent?.toFixed(2)}% | Calibration: ${this.calibrationFactor.toFixed(2)} | Regime: ${regime}`);
    }

    /**
     * Retorna recomendação de estratégia baseada no regime e performance histórica.
     */
    getRegimeStrategy(regime) {
        const stats = this.performanceByRegime[regime];
        const totalTrades = stats ? stats.wins + stats.losses : 0;
        const winRate = totalTrades > 0 ? (stats.wins / totalTrades) * 100 : 50;

        const strategies = {
            trending_up: {
                preferred: 'LONG',
                slMultiplier: 1.0,   // Normal SL
                tpMultiplier: 1.5,   // Wider TP for trends
                sizeMultiplier: winRate > 55 ? 1.2 : 0.8,
                description: 'Trend following: ride momentum with wider targets',
            },
            trending_down: {
                preferred: 'SHORT',
                slMultiplier: 1.0,
                tpMultiplier: 1.5,
                sizeMultiplier: winRate > 55 ? 1.2 : 0.8,
                description: 'Short bias: fade rallies in downtrend',
            },
            ranging: {
                preferred: 'REVERSAL',
                slMultiplier: 0.8,   // Tighter SL in range
                tpMultiplier: 0.8,   // Tighter TP
                sizeMultiplier: winRate > 50 ? 1.0 : 0.6,
                description: 'Mean reversion: buy support, sell resistance',
            },
            volatile: {
                preferred: 'CAUTIOUS',
                slMultiplier: 1.5,   // Wider SL for volatility
                tpMultiplier: 2.0,   // Much wider TP
                sizeMultiplier: 0.5, // Half size
                description: 'Reduced exposure: wider stops, smaller positions',
            },
        };

        return strategies[regime] || strategies.ranging;
    }

    /**
     * Retorna um relatório do estado de aprendizado.
     */
    getLearningReport() {
        const totalTrades = this.tradeHistory.length;
        const wins = this.tradeHistory.filter(t => t.isWin).length;
        const totalPnl = this.tradeHistory.reduce((s, t) => s + (t.pnl || 0), 0);

        // Top 5 strongest and weakest signals
        const sorted = Object.entries(this.weights).sort((a, b) => b[1] - a[1]);
        const strongest = sorted.slice(0, 5).map(([k, v]) => `${k}: ${v.toFixed(2)}`);
        const weakest = sorted.slice(-5).map(([k, v]) => `${k}: ${v.toFixed(2)}`);

        return {
            totalTradesLearned: totalTrades,
            winRate: totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0',
            totalPnl: totalPnl.toFixed(2),
            calibrationFactor: this.calibrationFactor.toFixed(3),
            strongestSignals: strongest,
            weakestSignals: weakest,
            regimePerformance: this.performanceByRegime,
            weights: { ...this.weights },
        };
    }

    // ==========================================
    // PERSISTENCE (AsyncStorage-compatible)
    // ==========================================

    _saveState() {
        try {
            const state = {
                weights: this.weights,
                tradeHistory: this.tradeHistory.slice(-100), // last 100 only
                performanceByRegime: this.performanceByRegime,
                confidenceHistory: this.confidenceHistory,
                calibrationFactor: this.calibrationFactor,
            };
            // Use global for in-memory persistence (AsyncStorage can be added later)
            global.__adaptiveState = state;
        } catch (e) { }
    }

    _loadState() {
        try {
            const state = global.__adaptiveState;
            if (state) {
                this.weights = { ...this.weights, ...state.weights };
                this.tradeHistory = state.tradeHistory || [];
                this.performanceByRegime = { ...this.performanceByRegime, ...state.performanceByRegime };
                this.confidenceHistory = state.confidenceHistory || [];
                this.calibrationFactor = state.calibrationFactor || 1.0;
                console.log(`[AdaptiveEngine] Loaded state: ${this.tradeHistory.length} trades, calibration ${this.calibrationFactor.toFixed(2)}`);
            }
        } catch (e) { }
    }

    // ==========================================
    // HELPERS
    // ==========================================

    _quickEMA(data, period) {
        if (data.length < period) return data[data.length - 1];
        const mult = 2 / (period + 1);
        let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
        for (let i = period; i < data.length; i++) ema = (data[i] - ema) * mult + ema;
        return ema;
    }
}

export const adaptiveEngine = new AdaptiveEngine();
export default adaptiveEngine;
