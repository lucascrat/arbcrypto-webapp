import { APP_CONFIG } from '../constants/config';

// Calculate Simple Moving Average (SMA)
export function calculateSMA(data, period) {
    if (data.length < period) return null;

    const sum = data.slice(-period).reduce((acc, val) => acc + val, 0);
    return sum / period;
}

// Calculate Exponential Moving Average (EMA)
export function calculateEMA(data, period) {
    if (data.length < period) return null;

    const multiplier = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((acc, val) => acc + val, 0) / period;

    for (let i = period; i < data.length; i++) {
        ema = (data[i] - ema) * multiplier + ema;
    }

    return ema;
}

// Calculate Relative Strength Index (RSI)
export function calculateRSI(closes, period = 14) {
    if (closes.length <= period) return null;

    const changes = [];
    for (let i = 1; i < closes.length; i++) {
        changes.push(closes[i] - closes[i - 1]);
    }

    let gains = 0;
    let losses = 0;

    // First RSI calculation
    for (let i = 0; i < period; i++) {
        if (changes[i] > 0) {
            gains += changes[i];
        } else {
            losses += Math.abs(changes[i]);
        }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Smooth RSI calculation
    for (let i = period; i < changes.length; i++) {
        const change = changes[i];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

// Calculate MACD
export function calculateMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (closes.length < slowPeriod + signalPeriod) return null;

    const fastEMA = calculateEMAArray(closes, fastPeriod);
    const slowEMA = calculateEMAArray(closes, slowPeriod);

    const macdLine = [];
    for (let i = slowPeriod - 1; i < closes.length; i++) {
        const fastIndex = i - (slowPeriod - fastPeriod);
        macdLine.push(fastEMA[fastIndex] - slowEMA[i - slowPeriod + 1]);
    }

    const signalLine = calculateEMAArray(macdLine, signalPeriod);
    const histogram = macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1];

    return {
        value: macdLine[macdLine.length - 1],
        signal: signalLine[signalLine.length - 1],
        histogram,
    };
}

// Helper for MACD - returns array of EMAs
function calculateEMAArray(data, period) {
    const emas = [];
    const multiplier = 2 / (period + 1);

    let ema = data.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
    emas.push(ema);

    for (let i = period; i < data.length; i++) {
        ema = (data[i] - ema) * multiplier + ema;
        emas.push(ema);
    }

    return emas;
}

// Calculate Bollinger Bands
export function calculateBollingerBands(closes, period = 20, stdDev = 2) {
    if (closes.length < period) return null;

    const sma = calculateSMA(closes, period);
    const recentCloses = closes.slice(-period);

    // Calculate standard deviation
    const squaredDiffs = recentCloses.map(close => Math.pow(close - sma, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
        upper: sma + (standardDeviation * stdDev),
        middle: sma,
        lower: sma - (standardDeviation * stdDev),
        bandwidth: ((sma + (standardDeviation * stdDev)) - (sma - (standardDeviation * stdDev))) / sma,
    };
}

// Calculate ADX (Average Directional Index)
export function calculateADX(highs, lows, closes, period = 14) {
    if (closes.length <= period * 2) return null;

    const trueRanges = [];
    const plusDM = [];
    const minusDM = [];

    for (let i = 1; i < closes.length; i++) {
        const high = highs[i];
        const low = lows[i];
        const prevHigh = highs[i - 1];
        const prevLow = lows[i - 1];
        const prevClose = closes[i - 1];

        // True Range
        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );
        trueRanges.push(tr);

        // Directional Movement
        const upMove = high - prevHigh;
        const downMove = prevLow - low;

        plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
        minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }

    // Smooth the values
    const smoothedTR = smoothArray(trueRanges, period);
    const smoothedPlusDM = smoothArray(plusDM, period);
    const smoothedMinusDM = smoothArray(minusDM, period);

    // Calculate +DI and -DI
    const plusDI = (smoothedPlusDM / smoothedTR) * 100;
    const minusDI = (smoothedMinusDM / smoothedTR) * 100;

    // Calculate DX
    const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;

    return {
        adx: dx, // Simplified - should be smoothed over period
        plusDI,
        minusDI,
        trend: plusDI > minusDI ? 'bullish' : 'bearish',
        strength: dx > 25 ? 'strong' : 'weak',
    };
}

function smoothArray(data, period) {
    let sum = data.slice(0, period).reduce((acc, val) => acc + val, 0);
    for (let i = period; i < data.length; i++) {
        sum = sum - (sum / period) + data[i];
    }
    return sum;
}

// Comprehensive analysis using all indicators
export function analyzeMarketConditions(klines) {
    const closes = klines.map(k => k.close);
    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);
    const volumes = klines.map(k => k.volume);

    const rsi = calculateRSI(closes);
    const macd = calculateMACD(closes);
    const bb = calculateBollingerBands(closes);
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    const sma50 = calculateSMA(closes, 50);
    const adx = calculateADX(highs, lows, closes);

    const currentPrice = closes[closes.length - 1];
    const avgVolume = calculateSMA(volumes, 20);
    const currentVolume = volumes[volumes.length - 1];

    return {
        currentPrice,
        rsi,
        macd,
        bollingerBands: bb,
        ema9,
        ema21,
        sma50,
        adx,
        volume: {
            current: currentVolume,
            average: avgVolume,
            ratio: currentVolume / avgVolume,
        },
        signals: generateSignals(currentPrice, rsi, macd, bb, ema9, ema21, adx),
    };
}

// Generate trading signals based on indicators
function generateSignals(price, rsi, macd, bb, ema9, ema21, adx) {
    const signals = [];
    let buyScore = 0;
    let sellScore = 0;

    // RSI signals
    if (rsi !== null) {
        if (rsi < APP_CONFIG.indicators.rsi.oversold) {
            signals.push({ indicator: 'RSI', signal: 'BUY', reason: `RSI em sobrevenda (${rsi.toFixed(2)})` });
            buyScore += 2;
        } else if (rsi > APP_CONFIG.indicators.rsi.overbought) {
            signals.push({ indicator: 'RSI', signal: 'SELL', reason: `RSI em sobrecompra (${rsi.toFixed(2)})` });
            sellScore += 2;
        }
    }

    // MACD signals
    if (macd !== null) {
        if (macd.histogram > 0 && macd.value > macd.signal) {
            signals.push({ indicator: 'MACD', signal: 'BUY', reason: 'Cruzamento bullish do MACD' });
            buyScore += 2;
        } else if (macd.histogram < 0 && macd.value < macd.signal) {
            signals.push({ indicator: 'MACD', signal: 'SELL', reason: 'Cruzamento bearish do MACD' });
            sellScore += 2;
        }
    }

    // Bollinger Bands signals
    if (bb !== null) {
        if (price <= bb.lower) {
            signals.push({ indicator: 'BB', signal: 'BUY', reason: 'Preço tocou banda inferior' });
            buyScore += 1.5;
        } else if (price >= bb.upper) {
            signals.push({ indicator: 'BB', signal: 'SELL', reason: 'Preço tocou banda superior' });
            sellScore += 1.5;
        }
    }

    // EMA crossover signals
    if (ema9 !== null && ema21 !== null) {
        if (ema9 > ema21 && price > ema9) {
            signals.push({ indicator: 'EMA', signal: 'BUY', reason: 'EMA 9 acima da EMA 21 (tendência alta)' });
            buyScore += 1.5;
        } else if (ema9 < ema21 && price < ema9) {
            signals.push({ indicator: 'EMA', signal: 'SELL', reason: 'EMA 9 abaixo da EMA 21 (tendência baixa)' });
            sellScore += 1.5;
        }
    }

    // ADX trend confirmation
    if (adx !== null && adx.adx > 25) {
        if (adx.trend === 'bullish') {
            signals.push({ indicator: 'ADX', signal: 'BUY', reason: 'Tendência forte de alta confirmada' });
            buyScore += 1;
        } else {
            signals.push({ indicator: 'ADX', signal: 'SELL', reason: 'Tendência forte de baixa confirmada' });
            sellScore += 1;
        }
    }

    // Calculate overall recommendation
    const totalScore = buyScore + sellScore;
    let recommendation = 'HOLD';
    let confidence = 50;

    if (buyScore > sellScore && buyScore >= 3) {
        recommendation = 'BUY';
        confidence = Math.min(95, 50 + (buyScore / totalScore) * 50);
    } else if (sellScore > buyScore && sellScore >= 3) {
        recommendation = 'SELL';
        confidence = Math.min(95, 50 + (sellScore / totalScore) * 50);
    }

    return {
        signals,
        recommendation,
        confidence: Math.round(confidence),
        buyScore,
        sellScore,
    };
}

// Calculate Average True Range (ATR) — for dynamic position sizing
export function calculateATR(klines, period = 14) {
    if (!klines || klines.length < period + 1) return null;

    const trueRanges = [];
    for (let i = 1; i < klines.length; i++) {
        const high = klines[i].high;
        const low = klines[i].low;
        const prevClose = klines[i - 1].close;
        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        trueRanges.push(tr);
    }

    // Wilder's smoothing (same as Binance/TradingView)
    let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < trueRanges.length; i++) {
        atr = (atr * (period - 1) + trueRanges[i]) / period;
    }
    return atr;
}

// Stochastic RSI — better reversal detection than plain RSI
export function calculateStochasticRSI(closes, rsiPeriod = 14, stochPeriod = 14, smoothK = 3, smoothD = 3) {
    if (closes.length < rsiPeriod + stochPeriod + smoothK + smoothD) return null;

    // Build full RSI array
    const rsiValues = [];
    const changes = [];
    for (let i = 1; i < closes.length; i++) changes.push(closes[i] - closes[i - 1]);

    let avgGain = 0, avgLoss = 0;
    for (let i = 0; i < rsiPeriod; i++) {
        avgGain += changes[i] > 0 ? changes[i] : 0;
        avgLoss += changes[i] < 0 ? Math.abs(changes[i]) : 0;
    }
    avgGain /= rsiPeriod;
    avgLoss /= rsiPeriod;
    rsiValues.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));

    for (let i = rsiPeriod; i < changes.length; i++) {
        const gain = changes[i] > 0 ? changes[i] : 0;
        const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
        avgGain = (avgGain * (rsiPeriod - 1) + gain) / rsiPeriod;
        avgLoss = (avgLoss * (rsiPeriod - 1) + loss) / rsiPeriod;
        rsiValues.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));
    }

    // Stochastic of RSI
    const rawK = [];
    for (let i = stochPeriod - 1; i < rsiValues.length; i++) {
        const slice = rsiValues.slice(i - stochPeriod + 1, i + 1);
        const minRSI = Math.min(...slice);
        const maxRSI = Math.max(...slice);
        rawK.push(maxRSI === minRSI ? 0 : ((rsiValues[i] - minRSI) / (maxRSI - minRSI)) * 100);
    }

    // Smooth K
    const smoothedK = [];
    for (let i = smoothK - 1; i < rawK.length; i++) {
        smoothedK.push(rawK.slice(i - smoothK + 1, i + 1).reduce((a, b) => a + b, 0) / smoothK);
    }

    // Smooth D
    const smoothedD = [];
    for (let i = smoothD - 1; i < smoothedK.length; i++) {
        smoothedD.push(smoothedK.slice(i - smoothD + 1, i + 1).reduce((a, b) => a + b, 0) / smoothD);
    }

    const k = smoothedK[smoothedK.length - 1];
    const d = smoothedD[smoothedD.length - 1];

    return {
        k,
        d,
        oversold: k < 20 && d < 20,
        overbought: k > 80 && d > 80,
        bullishCross: k > d && k < 50,
        bearishCross: k < d && k > 50,
    };
}

// =============================================================================
// PRICE ACTION ANALYZER — Al Brooks Methodology
// Market Cycles: Breakout → Channel → Trading Range
// Patterns: H1/H2/L1/L2, Wedge (3-push), Double Top/Bottom, Climax, Barb Wire
// =============================================================================
export function analyzePriceAction(klines) {
    if (!klines || klines.length < 20) return null;

    const bars = klines.slice(-30).map(k => {
        const bodySize = Math.abs(k.close - k.open);
        const totalRange = k.high - k.low;
        return {
            open: k.open, high: k.high, low: k.low, close: k.close, volume: k.volume,
            bodySize,
            totalRange,
            bodyRatio: totalRange > 0 ? bodySize / totalRange : 0,
            isBullish: k.close > k.open,
            isBearish: k.close < k.open,
            upperWick: k.high - Math.max(k.open, k.close),
            lowerWick: Math.min(k.open, k.close) - k.low,
        };
    });

    const avgBodySize = bars.reduce((s, b) => s + b.bodySize, 0) / bars.length || 1;

    const marketPhase = _paDetectPhase(bars);
    const { buyingPressure, sellingPressure } = _paDetectPressure(bars, avgBodySize);
    const alwaysInBias = buyingPressure > sellingPressure + 2 ? 'LONG'
        : sellingPressure > buyingPressure + 2 ? 'SHORT' : 'NEUTRAL';

    const h1h2Setup = _paDetectH1H2(bars);
    const l1l2Setup = _paDetectL1L2(bars);
    const wedge = _paDetectWedge(klines.slice(-15));
    const dblTopBot = _paDetectDoubleTopBottom(klines.slice(-30));
    const climax = _paDetectClimax(bars, avgBodySize);
    const barbWire = _paDetectBarbWire(bars.slice(-5), avgBodySize);
    const breakout = _paDetectBreakoutStrength(bars, avgBodySize);
    const trendStrength = _paTrendStrength(bars);

    let consecutiveBull = 0, consecutiveBear = 0;
    for (let i = bars.length - 1; i >= 0; i--) { if (bars[i].isBullish) consecutiveBull++; else break; }
    for (let i = bars.length - 1; i >= 0; i--) { if (bars[i].isBearish) consecutiveBear++; else break; }

    return {
        marketPhase,       // 'breakout_bull'|'breakout_bear'|'channel_bull'|'channel_bear'|'trading_range'
        buyingPressure,    // 0-10
        sellingPressure,   // 0-10
        alwaysInBias,      // 'LONG'|'SHORT'|'NEUTRAL'
        h1h2Setup,         // bullish pullback entry (H1/H2)
        l1l2Setup,         // bearish pullback entry (L1/L2)
        wedgeBull: wedge.type === 'BULL',   // 3-push down = bullish reversal
        wedgeBear: wedge.type === 'BEAR',   // 3-push up = bearish reversal
        wedgeStrength: wedge.strength || 'none',
        doubleTop: dblTopBot.type === 'TOP',
        doubleBottom: dblTopBot.type === 'BOTTOM',
        climaxBuy: climax.type === 'BUY',   // too many bull bars = exhaustion → SHORT warning
        climaxSell: climax.type === 'SELL', // too many bear bars = exhaustion → LONG opp
        barbWire,          // avoid trading — wait for breakout
        breakoutStrength: breakout.strength, // 'strong'|'moderate'|'weak'
        breakoutDirection: breakout.direction, // 'BULL'|'BEAR'|'NEUTRAL'
        trendStrength,     // 'strong'|'moderate'|'weak'
        consecutiveBull,
        consecutiveBear,
    };
}

function _paDetectPhase(bars) {
    const last10 = bars.slice(-10);
    let hh = 0, hl = 0, lh = 0, ll = 0;
    for (let i = 1; i < last10.length; i++) {
        if (last10[i].high > last10[i - 1].high) hh++; else lh++;
        if (last10[i].low > last10[i - 1].low) hl++; else ll++;
    }
    let overlapping = 0;
    for (let i = 1; i < last10.length; i++) {
        if (Math.min(last10[i].high, last10[i - 1].high) > Math.max(last10[i].low, last10[i - 1].low)) overlapping++;
    }
    const overlapRatio = overlapping / (last10.length - 1);
    const bullBars = last10.filter(b => b.isBullish && b.bodyRatio > 0.6).length;
    const bearBars = last10.filter(b => b.isBearish && b.bodyRatio > 0.6).length;

    if (hh >= 7 && hl >= 5 && bullBars >= 5 && overlapRatio < 0.4) return 'breakout_bull';
    if (lh >= 7 && ll >= 5 && bearBars >= 5 && overlapRatio < 0.4) return 'breakout_bear';
    if (hh > lh && hl > ll && overlapRatio < 0.65) return 'channel_bull';
    if (lh > hh && ll > hl && overlapRatio < 0.65) return 'channel_bear';
    return 'trading_range';
}

function _paDetectPressure(bars, avgBodySize) {
    let buy = 0, sell = 0;
    const last10 = bars.slice(-10);
    for (let i = 1; i < last10.length; i++) {
        const b = last10[i], prev = last10[i - 1];
        if (b.isBullish && b.bodyRatio > 0.6 && b.bodySize > avgBodySize * 0.8) buy += 1;
        if (b.open > prev.close) buy += 0.5;   // gap up
        if (b.close > prev.high) buy += 1;      // close above prev high
        if (b.isBearish && b.bodyRatio > 0.6 && b.bodySize > avgBodySize * 0.8) sell += 1;
        if (b.open < prev.close) sell += 0.5;   // gap down
        if (b.close < prev.low) sell += 1;      // close below prev low
    }
    return { buyingPressure: Math.min(10, Math.round(buy)), sellingPressure: Math.min(10, Math.round(sell)) };
}

function _paDetectH1H2(bars) {
    const last8 = bars.slice(-8);
    const last3 = bars.slice(-3);
    const isUptrend = last8[last8.length - 1].high > last8[0].high && last8[last8.length - 1].low > last8[0].low;
    if (!isUptrend) return false;
    const hasPullback = last3.some((b, i) => i > 0 && b.low < last3[i - 1].low);
    const lastBar = last3[last3.length - 1];
    return hasPullback && lastBar.isBullish && lastBar.bodyRatio > 0.45;
}

function _paDetectL1L2(bars) {
    const last8 = bars.slice(-8);
    const last3 = bars.slice(-3);
    const isDowntrend = last8[last8.length - 1].low < last8[0].low && last8[last8.length - 1].high < last8[0].high;
    if (!isDowntrend) return false;
    const hasPullback = last3.some((b, i) => i > 0 && b.high > last3[i - 1].high);
    const lastBar = last3[last3.length - 1];
    return hasPullback && lastBar.isBearish && lastBar.bodyRatio > 0.45;
}

function _paDetectWedge(klines) {
    if (klines.length < 8) return { type: 'NONE' };
    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);

    const swingHighs = [];
    for (let i = 1; i < highs.length - 1; i++) {
        if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) swingHighs.push(highs[i]);
    }
    const swingLows = [];
    for (let i = 1; i < lows.length - 1; i++) {
        if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1]) swingLows.push(lows[i]);
    }

    if (swingHighs.length >= 3) {
        const [a, b, c] = swingHighs.slice(-3);
        if (a < b && b < c) {
            const p1 = b - a, p2 = c - b;
            return { type: 'BEAR', strength: p2 < p1 * 0.8 ? 'strong' : 'moderate' };
        }
    }
    if (swingLows.length >= 3) {
        const [a, b, c] = swingLows.slice(-3);
        if (a > b && b > c) {
            const p1 = a - b, p2 = b - c;
            return { type: 'BULL', strength: p2 < p1 * 0.8 ? 'strong' : 'moderate' };
        }
    }
    return { type: 'NONE' };
}

function _paDetectDoubleTopBottom(klines) {
    if (klines.length < 10) return { type: 'NONE' };
    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);

    // Find two distinct highs within 0.5% of each other
    const sortedHighs = [...highs].sort((a, b) => b - a);
    if (sortedHighs.length >= 2 && Math.abs(sortedHighs[0] - sortedHighs[1]) / sortedHighs[0] < 0.005) {
        // Make sure they are separated (not adjacent)
        const idx1 = highs.lastIndexOf(sortedHighs[0]);
        const idx2 = highs.indexOf(sortedHighs[1]);
        if (Math.abs(idx1 - idx2) > 2) return { type: 'TOP', level: sortedHighs[0] };
    }
    const sortedLows = [...lows].sort((a, b) => a - b);
    if (sortedLows.length >= 2 && Math.abs(sortedLows[0] - sortedLows[1]) / sortedLows[0] < 0.005) {
        const idx1 = lows.lastIndexOf(sortedLows[0]);
        const idx2 = lows.indexOf(sortedLows[1]);
        if (Math.abs(idx1 - idx2) > 2) return { type: 'BOTTOM', level: sortedLows[0] };
    }
    return { type: 'NONE' };
}

function _paDetectClimax(bars, avgBodySize) {
    const last5 = bars.slice(-5);
    const bigBull = last5.filter(b => b.isBullish && b.bodySize > avgBodySize * 1.5).length;
    const bigBear = last5.filter(b => b.isBearish && b.bodySize > avgBodySize * 1.5).length;
    if (bigBull >= 3) return { type: 'BUY', count: bigBull };
    if (bigBear >= 3) return { type: 'SELL', count: bigBear };
    return { type: 'NONE' };
}

function _paDetectBarbWire(last5, avgBodySize) {
    if (last5.length < 3) return false;
    let overlapping = 0, dojiCount = 0;
    for (let i = 1; i < last5.length; i++) {
        const b = last5[i], prev = last5[i - 1];
        if (Math.min(b.high, prev.high) > Math.max(b.low, prev.low)) overlapping++;
        if (b.bodyRatio < 0.3) dojiCount++;
    }
    return overlapping >= 3 && dojiCount >= 1;
}

function _paDetectBreakoutStrength(bars, avgBodySize) {
    const last3 = bars.slice(-3);
    const bullBars = last3.filter(b => b.isBullish && b.bodySize > avgBodySize).length;
    const bearBars = last3.filter(b => b.isBearish && b.bodySize > avgBodySize).length;
    if (bullBars === 3) return { strength: 'strong', direction: 'BULL' };
    if (bearBars === 3) return { strength: 'strong', direction: 'BEAR' };
    if (bullBars === 2) return { strength: 'moderate', direction: 'BULL' };
    if (bearBars === 2) return { strength: 'moderate', direction: 'BEAR' };
    return { strength: 'weak', direction: 'NEUTRAL' };
}

function _paTrendStrength(bars) {
    const last10 = bars.slice(-10);
    let score = 0;
    for (let i = 1; i < last10.length; i++) {
        if (last10[i].high > last10[i - 1].high && last10[i].low > last10[i - 1].low) score++;
        if (last10[i].high < last10[i - 1].high && last10[i].low < last10[i - 1].low) score--;
    }
    const n = Math.abs(score) / (last10.length - 1);
    return n > 0.65 ? 'strong' : n > 0.35 ? 'moderate' : 'weak';
}

// =============================================================================
// DIVERGENCE DETECTOR — RSI/MACD vs Price
// Bearish: Price makes Higher High but RSI/MACD makes Lower High → reversal warning
// Bullish: Price makes Lower Low but RSI/MACD makes Higher Low → reversal warning
// =============================================================================
export function detectDivergences(closes, lookback = 20) {
    if (!closes || closes.length < lookback + 15) return { rsiDivergence: 'none', macdDivergence: 'none' };

    const recentCloses = closes.slice(-lookback - 15);

    // Build full RSI array
    const rsiArray = _buildRSIArray(recentCloses, 14);
    // Build MACD histogram array
    const macdArray = _buildMACDHistogramArray(recentCloses);

    const priceSlice = recentCloses.slice(-lookback);
    const rsiSlice = rsiArray.slice(-lookback);
    const macdSlice = macdArray.slice(-lookback);

    // Find swing highs and lows in price
    const swingHighs = _findSwings(priceSlice, 'high');
    const swingLows = _findSwings(priceSlice, 'low');

    let rsiDivergence = 'none';
    let macdDivergence = 'none';

    // Check bearish divergence (price HH + indicator LH)
    if (swingHighs.length >= 2) {
        const [prev, curr] = swingHighs.slice(-2);
        if (priceSlice[curr] > priceSlice[prev]) {
            if (rsiSlice[curr] < rsiSlice[prev] - 2) rsiDivergence = 'bearish';
            if (macdSlice.length > curr && macdSlice.length > prev && macdSlice[curr] < macdSlice[prev]) macdDivergence = 'bearish';
        }
    }

    // Check bullish divergence (price LL + indicator HL)
    if (swingLows.length >= 2) {
        const [prev, curr] = swingLows.slice(-2);
        if (priceSlice[curr] < priceSlice[prev]) {
            if (rsiSlice[curr] > rsiSlice[prev] + 2) rsiDivergence = 'bullish';
            if (macdSlice.length > curr && macdSlice.length > prev && macdSlice[curr] > macdSlice[prev]) macdDivergence = 'bullish';
        }
    }

    return { rsiDivergence, macdDivergence };
}

function _findSwings(data, type) {
    const swings = [];
    for (let i = 2; i < data.length - 2; i++) {
        if (type === 'high') {
            if (data[i] > data[i - 1] && data[i] > data[i - 2] && data[i] > data[i + 1] && data[i] > data[i + 2]) {
                swings.push(i);
            }
        } else {
            if (data[i] < data[i - 1] && data[i] < data[i - 2] && data[i] < data[i + 1] && data[i] < data[i + 2]) {
                swings.push(i);
            }
        }
    }
    return swings;
}

function _buildRSIArray(closes, period = 14) {
    const changes = [];
    for (let i = 1; i < closes.length; i++) changes.push(closes[i] - closes[i - 1]);

    const rsiValues = [];
    let avgGain = 0, avgLoss = 0;
    for (let i = 0; i < period; i++) {
        avgGain += changes[i] > 0 ? changes[i] : 0;
        avgLoss += changes[i] < 0 ? Math.abs(changes[i]) : 0;
    }
    avgGain /= period;
    avgLoss /= period;
    rsiValues.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));

    for (let i = period; i < changes.length; i++) {
        const gain = changes[i] > 0 ? changes[i] : 0;
        const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        rsiValues.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));
    }
    return rsiValues;
}

function _buildMACDHistogramArray(closes) {
    const fastEMA = calculateEMAArray(closes, 12);
    const slowEMA = calculateEMAArray(closes, 26);
    const macdLine = [];
    for (let i = 0; i < slowEMA.length; i++) {
        const fastIdx = i + (fastEMA.length - slowEMA.length);
        if (fastIdx >= 0) macdLine.push(fastEMA[fastIdx] - slowEMA[i]);
    }
    const signalLine = calculateEMAArray(macdLine, 9);
    const histogram = [];
    for (let i = 0; i < signalLine.length; i++) {
        const macdIdx = i + (macdLine.length - signalLine.length);
        histogram.push(macdLine[macdIdx] - signalLine[i]);
    }
    return histogram;
}

// Calculate higher timeframe bias (for multi-timeframe confirmation)
export function calculateHigherTimeframeBias(klines1h) {
    if (!klines1h || klines1h.length < 25) return 'neutral';
    const closes = klines1h.map(k => k.close);
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    if (ema9 === null || ema21 === null) return 'neutral';

    const diff = ((ema9 - ema21) / ema21) * 100;
    if (diff > 0.1) return 'bullish';
    if (diff < -0.1) return 'bearish';
    return 'neutral';
}

// Calculate support and resistance levels
export function calculateSupportResistance(klines, lookback = 20) {
    const recentKlines = klines.slice(-lookback);
    const highs = recentKlines.map(k => k.high);
    const lows = recentKlines.map(k => k.low);

    // Find local highs and lows
    const resistanceLevels = [];
    const supportLevels = [];

    for (let i = 2; i < recentKlines.length - 2; i++) {
        // Check for local high
        if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] &&
            highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
            resistanceLevels.push(highs[i]);
        }
        // Check for local low
        if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] &&
            lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
            supportLevels.push(lows[i]);
        }
    }

    return {
        resistance: resistanceLevels.length > 0 ? Math.max(...resistanceLevels) : Math.max(...highs),
        support: supportLevels.length > 0 ? Math.min(...supportLevels) : Math.min(...lows),
        resistanceLevels: [...new Set(resistanceLevels)].sort((a, b) => b - a).slice(0, 3),
        supportLevels: [...new Set(supportLevels)].sort((a, b) => a - b).slice(0, 3),
    };
}
