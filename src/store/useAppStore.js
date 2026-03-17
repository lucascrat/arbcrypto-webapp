import { create } from 'zustand';
import { binanceService } from '../services/binance';
import { geminiService } from '../services/gemini';
import { authService } from '../services/auth';
import { secureCredentialsService } from '../services/secureCredentials';
import { tradingSafetyService } from '../services/tradingSafety';
import { positionManager } from '../services/positionManager';
import {
    userSettingsService,
    tradesService,
    signalsService,
    balanceService,
    portfolioService,
    strategiesService,
    logsService,
} from '../services/data';
import { analyzeMarketConditions, calculateATR, calculateStochasticRSI, analyzePriceAction, detectDivergences, calculateHigherTimeframeBias } from '../utils/indicators';
import { APP_CONFIG, RISK_LEVELS } from '../constants/config';
import { backgroundBot } from '../services/backgroundBot';
import { binanceSocketService } from '../services/binanceSocket';
import marketIntelligence from '../services/marketIntelligence';

let autoTradeInterval = null;
let botCycleRunning = false; // guard against overlapping cycles

export const useAppStore = create((set, get) => ({
    // Auth State
    userId: null,
    isAuthenticated: false,
    userSettings: null,
    authLoading: false,

    // Trading State
    balance: [],
    totalBalanceUSDT: 0,
    portfolio: [],
    trades: [],
    openOrders: [],
    tradeStats: null,
    performanceStats: null, // rich stats from /api/stats

    // Balance History (from DB)
    balanceHistory: [],

    // Market State
    prices: {},
    selectedSymbol: 'BTCUSDT',
    marketData: {},
    klines: {},
    signals: [],

    // Trading Type
    tradingType: 'AUTO',
    riskLevel: 'medium', // low | medium | high
    futuresState: {
        leverage: 1,
        marginType: 'ISOLATED',
        positions: [],
        totalWalletBalance: 0,
        totalUnrealizedProfit: 0
    },

    // Analysis State
    aiAnalysis: null,
    strategies: [],
    selectedStrategy: null,

    // UI State
    isLoading: false,
    error: null,
    isConnected: false,
    autoTradeEnabled: false,

    // Bot State
    botRunning: false,
    botStatus: 'idle',
    botLog: [],
    botCycleCount: 0,
    lastTradeTime: null,

    // ===== AUTH =====
    signUp: async (email, password, metadata = {}) => {
        try {
            set({ authLoading: true });
            const { user, session } = await authService.signUp(email, password, metadata);
            set({ userId: user.id, isAuthenticated: true, authLoading: false });
            await get().loadUserSettings();
            return { user, session };
        } catch (error) {
            set({ authLoading: false, error: error.message });
            throw error;
        }
    },

    signIn: async (email, password) => {
        try {
            set({ authLoading: true });
            const { user, session } = await authService.signIn(email, password);
            set({ userId: user.id, isAuthenticated: true, authLoading: false });
            await get().initialize();
            return { user, session };
        } catch (error) {
            set({ authLoading: false, error: error.message });
            throw error;
        }
    },

    signOut: async () => {
        try {
            get().stopBot();
            await authService.signOut();
            set({
                userId: null, isAuthenticated: false, userSettings: null,
                balance: [], totalBalanceUSDT: 0, portfolio: [], trades: [],
                tradeStats: null, performanceStats: null, signals: [],
                isConnected: false, autoTradeEnabled: false,
                botRunning: false, botStatus: 'idle', botLog: [],
            });
            return true;
        } catch (error) {
            set({ error: error.message });
            throw error;
        }
    },

    restoreSession: async () => {
        try {
            set({ authLoading: true });
            const session = await authService.restoreSession();
            if (session?.user) {
                set({ userId: session.user.id, isAuthenticated: true, authLoading: false });
                await get().initialize();
                return session;
            }
            set({ authLoading: false });
            return null;
        } catch (error) {
            set({ authLoading: false });
            return null;
        }
    },

    // ===== BOT LOG (persisted to DB) =====
    addBotLog: (message, type = 'info') => {
        const entry = { id: Date.now(), time: new Date().toLocaleTimeString('pt-BR'), message, type };
        set(state => ({ botLog: [entry, ...state.botLog].slice(0, 100) }));
        // Persist to backend (non-blocking)
        logsService.saveBotLog(message, type).catch(() => {});
    },

    // ===== START BOT =====
    startBot: async () => {
        const state = get();
        if (!state.isConnected) {
            set({ error: 'Configure suas credenciais da API primeiro' });
            return;
        }
        if (state.botRunning) return;

        set({ botRunning: true, botStatus: 'scanning', autoTradeEnabled: true, error: null });
        get().addBotLog('🚀 Bot Super Trader iniciado!', 'success');

        try {
            await backgroundBot.initialize();
            await backgroundBot.startService('ArbCrypto Super Trader', 'Iniciando...');
        } catch (e) { console.warn('[Bot] Background service:', e.message); }

        try {
            await get().saveUserSettings({ auto_trade_enabled: true });
        } catch (e) { }

        // Load exchange info
        try {
            await binanceService.getExchangeInfo();
            await binanceService.getFuturesExchangeInfo().catch(() => { });
            get().addBotLog(`✅ Exchange info carregada`, 'success');
        } catch (e) {
            get().addBotLog('⚠️ Erro ao carregar exchange info', 'warning');
        }

        // Real-time price streams (all 6 symbols)
        try {
            const symbols = APP_CONFIG.trading.defaultSymbols;
            binanceSocketService.subscribePriceUpdates(symbols, (symbol, price) => {
                set(state => ({ prices: { ...state.prices, [symbol]: price } }));
            });
            get().addBotLog(`⚡ Streams em tempo real ativos (${symbols.length} pares)`, 'success');
        } catch (e) {
            console.error('[Bot] WebSocket error:', e);
        }

        // Restore positions from DB + sync with Binance
        try {
            const restored = await positionManager.restorePositions();
            if (restored && restored.length > 0) {
                get().addBotLog(`📦 ${restored.length} posição(ões) restaurada(s) do banco`, 'success');
            }
            await positionManager.syncWithBinance();
        } catch (e) {
            get().addBotLog(`⚠️ Erro ao restaurar posições: ${e.message}`, 'warning');
        }

        // Start position monitor with SL/TP
        positionManager.startMonitoring(
            (symbol) => get().prices[symbol] || binanceService.getPrice(symbol),
            async (exitInfo) => {
                const { symbol, direction, reason, exitPrice, entryPrice, quantity, venue } = exitInfo;
                const pnl = direction === 'LONG'
                    ? (exitPrice - entryPrice) * quantity
                    : (entryPrice - exitPrice) * quantity;
                const pnlPct = ((exitPrice - entryPrice) / entryPrice) * 100 * (direction === 'LONG' ? 1 : -1);

                get().addBotLog(
                    `${reason === 'TAKE_PROFIT' ? '🎯' : '🛑'} ${reason}: ${symbol} @ $${exitPrice.toFixed(4)} | P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPct.toFixed(2)}%)`,
                    reason === 'TAKE_PROFIT' ? 'success' : 'warning'
                );

                // Save exit trade to DB
                const trade = {
                    symbol,
                    side: direction === 'LONG' ? 'SELL' : 'BUY',
                    type: 'MARKET',
                    quantity,
                    price: exitPrice,
                    total_value: exitPrice * quantity,
                    fee: 0,
                    status: 'filled',
                    strategy_used: `SL_TP_${reason}`,
                    profit_loss: pnl,
                    profit_loss_percent: pnlPct,
                };
                await tradesService.create(trade).catch(() => { });
                await get().fetchBalance();
                await get().fetchTrades();
            },
            (msg, type) => get().addBotLog(msg, type)
        );

        // Run immediately then on interval
        await get().runBotCycle();
        autoTradeInterval = setInterval(async () => {
            if (get().botRunning) await get().runBotCycle();
        }, APP_CONFIG.trading.botIntervalMs);

        await logsService.create(state.userId, 'BOT_STARTED', {}).catch(() => { });
    },

    // ===== STOP BOT =====
    stopBot: async () => {
        if (autoTradeInterval) { clearInterval(autoTradeInterval); autoTradeInterval = null; }
        botCycleRunning = false;
        set({ botRunning: false, botStatus: 'idle', autoTradeEnabled: false });
        get().addBotLog('⏹️ Bot parado', 'warning');
        binanceSocketService.closeAll();
        await positionManager.stopMonitoring();
        backgroundBot.stopService().catch(() => { });
        const userId = get().userId;
        if (userId) {
            get().saveUserSettings({ auto_trade_enabled: false }).catch(() => { });
            logsService.create(userId, 'BOT_STOPPED', {}).catch(() => { });
        }
    },

    // ===== BOT CYCLE — SUPER TRADER =====
    runBotCycle: async () => {
        const state = get();
        if (!state.botRunning || !state.isConnected) return;
        if (botCycleRunning) {
            get().addBotLog('⏭️ Ciclo anterior ainda rodando, pulando...', 'info');
            return;
        }

        botCycleRunning = true;
        const cycleNum = state.botCycleCount + 1;
        set({ botCycleCount: cycleNum, botStatus: 'scanning' });
        get().addBotLog(`🔄 Ciclo #${cycleNum} — Escaneando ${APP_CONFIG.trading.defaultSymbols.length} pares em paralelo`, 'info');

        backgroundBot.updateNotification('ArbCrypto: Escaneando', `Ciclo #${cycleNum}...`).catch(() => { });

        try {
            // 1. Fetch balances
            const [spotBalances, futuresInfo] = await Promise.all([
                get().fetchBalance(),
                get().fetchFuturesAccount(),
            ]);

            const spotUSDT = spotBalances.find(b => b.asset === 'USDT')?.free || 0;
            const futuresUSDT = parseFloat(futuresInfo?.availableBalance || 0);

            // 2. Get risk level config
            const riskConfig = RISK_LEVELS[get().riskLevel || 'medium'];
            const userMinConf = get().userSettings?.min_confidence;
            const minConfidence = Math.min(
                userMinConf || riskConfig.minConfidence,
                riskConfig.minConfidence
            );
            console.log(`[Bot] Confidence threshold: ${minConfidence}% (user=${userMinConf}, config=${riskConfig.minConfidence})`);

            // 3. Load recent performance for AI context
            let recentStats = null;
            try {
                recentStats = await tradesService.getStats();
            } catch (e) { }

            // 4. PARALLEL scan of ALL symbols
            set({ botStatus: 'analyzing' });
            const currentPrices = get().prices;
            const symbols = APP_CONFIG.trading.defaultSymbols;

            const scanResults = await Promise.all(symbols.map(async (symbol) => {
                try {
                    // Fetch 15m klines + 1h klines for multi-timeframe
                    const [ticker, klines, klines1h] = await Promise.all([
                        binanceService.get24hTicker(symbol),
                        binanceService.getKlines(symbol, '15m', 100),
                        binanceService.getKlines(symbol, '1h', 50),
                    ]);

                    const analysis = analyzeMarketConditions(klines);
                    const atr = calculateATR(klines);
                    const stochRsi = calculateStochasticRSI(klines.map(k => k.close));
                    const priceAction = analyzePriceAction(klines);
                    const currentPrice = currentPrices[symbol] || parseFloat(ticker.lastPrice);

                    // Multi-timeframe bias (1h EMA9 vs EMA21)
                    const higherTimeframeBias = calculateHigherTimeframeBias(klines1h);

                    // Divergence detection (RSI/MACD vs price)
                    const closes = klines.map(k => k.close);
                    const divergences = detectDivergences(closes);

                    const marketData = {
                        symbol,
                        currentPrice,
                        priceChange24h: parseFloat(ticker.priceChangePercent),
                        ...analysis,
                        atr,
                        stochRsi,
                        priceAction,
                        higherTimeframeBias,
                        divergences,
                    };

                    // Fetch intelligence signals in parallel
                    const [fundingSignal, obSignal] = await Promise.all([
                        marketIntelligence.getFundingRateSignal(symbol),
                        marketIntelligence.getOrderBookSignal(symbol),
                    ]);

                    const extraData = {
                        fundingRate: fundingSignal.rate,
                        orderbookRatio: obSignal.ratio,
                        recentStats,
                        minConfidence,
                        higherTimeframeBias,
                        divergences,
                    };

                    const aiResult = await geminiService.analyzeMarket(marketData, get().tradingType, extraData);

                    if (aiResult) {
                        return { symbol, aiResult, marketData, spotUSDT, futuresUSDT };
                    }
                    return null;
                } catch (e) {
                    console.error(`[Bot] Scan error ${symbol}:`, e.message);
                    return null;
                }
            }));

            // 5. Log ALL AI results for debugging, then filter
            const validResults = scanResults.filter(r => r && r.aiResult);

            // Log what Gemini returned for EVERY symbol
            validResults.forEach(({ symbol, aiResult }) => {
                const { action, confidence, venue, reasoning } = aiResult;
                const icon = action === 'HOLD' ? '⏸️' : action === 'LONG' ? '🟢' : '🔴';
                console.log(`[Bot] ${symbol}: ${action} ${confidence}% @ ${venue} — ${reasoning?.slice(0, 80)}`);
                if (action === 'HOLD') {
                    get().addBotLog(`${icon} ${symbol}: HOLD (${confidence}%) — ${reasoning?.slice(0, 60) || 'sem sinal claro'}`, 'debug');
                }
            });

            // Filter actionable trades
            const opportunities = validResults
                .filter(r => ['LONG', 'SHORT'].includes(r.aiResult.action))
                .filter(r => r.aiResult.confidence >= minConfidence)
                .sort((a, b) => b.aiResult.confidence - a.aiResult.confidence);

            // Also show trades that were filtered by confidence
            const belowThreshold = validResults
                .filter(r => ['LONG', 'SHORT'].includes(r.aiResult.action))
                .filter(r => r.aiResult.confidence < minConfidence);

            belowThreshold.forEach(({ symbol, aiResult }) => {
                get().addBotLog(
                    `⚠️ ${symbol}: ${aiResult.action} ${aiResult.confidence}% (abaixo de ${minConfidence}%) — descartado`,
                    'warning'
                );
            });

            opportunities.forEach(({ symbol, aiResult }) => {
                const { action, venue, leverage, confidence } = aiResult;
                get().addBotLog(
                    `📊 ${symbol}: ${action} @ ${venue} (${leverage || 1}x) — ${confidence}% ✓`,
                    'info'
                );
            });

            const holdCount = validResults.filter(r => r.aiResult.action === 'HOLD').length;
            const totalScanned = validResults.length;

            if (opportunities.length === 0) {
                get().addBotLog(
                    `⏸️ Sem oportunidades (${holdCount}/${totalScanned} HOLD, ${belowThreshold.length} abaixo de ${minConfidence}%). Aguardando...`,
                    'info'
                );
                set({ botStatus: 'waiting' });
                botCycleRunning = false;
                return;
            }

            // 6. Safety check before trading
            const totalBalance = spotUSDT + futuresUSDT;
            tradingSafetyService.setStartingBalance(totalBalance);
            const safetyCheck = await tradingSafetyService.canTrade(
                get().userId, 0, recentStats,
                { balance: totalBalance, activePositionCount: positionManager.getActivePositionCount() }
            );
            if (!safetyCheck.allowed) {
                get().addBotLog(`Safety: ${safetyCheck.reason}`, 'warning');
                set({ botStatus: 'waiting' });
                botCycleRunning = false;
                return;
            }

            // 7. Execute best opportunity
            const best = opportunities[0];
            const { symbol, aiResult, marketData } = best;
            const { action, venue, leverage, allocation, stopLossPercent, takeProfitPercent } = aiResult;

            set({ botStatus: 'trading' });
            get().addBotLog(`MELHOR: ${action} ${symbol} ${venue} | Confianca: ${aiResult.confidence}% | HTF: ${marketData.higherTimeframeBias || 'N/A'}`, 'trade');

            // Skip if already in this position
            if (positionManager.hasPosition(symbol)) {
                get().addBotLog(`${symbol}: posicao ja aberta, pulando`, 'warning');
                set({ botStatus: 'waiting' });
                botCycleRunning = false;
                return;
            }

            backgroundBot.updateNotification('ArbCrypto: Trade!', `${action} ${symbol} @ ${venue}`).catch(() => { });

            try {
                const currentPrice = marketData.currentPrice;
                const atr = marketData.atr;

                // ATR-based position sizing
                const riskAmount = (venue === 'FUTURES' ? futuresUSDT : spotUSDT) * (riskConfig.riskPercent / 100);
                const atrSizing = atr && atr > 0 ? riskAmount / (atr * 2) : null;

                // ATR-based SL/TP (dynamic, adapts to volatility)
                let slPct, tpPct;
                const atrConfig = {
                    slMultiplier: riskConfig.slAtrMultiplier,
                    tpMultiplier: riskConfig.tpAtrMultiplier,
                    tp1Multiplier: riskConfig.tp1AtrMultiplier,
                    trailingMultiplier: riskConfig.trailingAtrMultiplier,
                    breakEvenThreshold: riskConfig.breakEvenAtrThreshold,
                };

                if (atr && atr > 0) {
                    slPct = (atr * riskConfig.slAtrMultiplier / currentPrice) * 100;
                    tpPct = (atr * riskConfig.tpAtrMultiplier / currentPrice) * 100;
                    get().addBotLog(`ATR: $${atr.toFixed(4)} | SL: ${slPct.toFixed(2)}% | TP: ${tpPct.toFixed(2)}%`, 'info');
                } else {
                    slPct = stopLossPercent || riskConfig.stopLossPercent;
                    tpPct = takeProfitPercent || riskConfig.takeProfitPercent;
                }
                const trailingPct = riskConfig.trailingStopPercent;

                if (venue === 'FUTURES') {
                    if (futuresUSDT < 5) {
                        get().addBotLog('Saldo Futures insuficiente.', 'warning');
                        set({ botStatus: 'waiting' });
                        botCycleRunning = false;
                        return;
                    }

                    const lev = Math.min(leverage || 2, riskConfig.maxLeverage);
                    await binanceService.setLeverage(symbol, lev);

                    const allocPct = Math.min((allocation || 10) / 100, riskConfig.maxTradePercent / 100);
                    const minOrder = riskConfig.minOrderUsdt || 6;
                    const margin = Math.max(futuresUSDT * allocPct, minOrder);
                    const notional = margin * lev;
                    let quantity = atrSizing && atrSizing < notional / currentPrice
                        ? atrSizing
                        : notional / currentPrice;
                    quantity = Math.max(quantity, binanceService.futuresExchangeInfo[symbol]?.minQty || 0.001);

                    const side = action === 'LONG' ? 'BUY' : 'SELL';
                    get().addBotLog(`Futures ${side}: ${quantity.toFixed(4)} ${symbol} @ ${lev}x | Margin: $${margin.toFixed(2)}`, 'trade');

                    const order = await binanceService.createFuturesOrder(symbol, side, 'MARKET', quantity);

                    // Register with ATR-based position manager
                    positionManager.openPosition({
                        symbol, direction: action, quantity, entryPrice: currentPrice,
                        stopLossPercent: slPct, takeProfitPercent: tpPct,
                        venue: 'FUTURES',
                        trailingStop: riskConfig.trailingStopEnabled !== false,
                        trailingPercent: trailingPct,
                        atr,
                        atrConfig,
                    });

                    // Native Binance SL/TP as safety net
                    const slPrice = action === 'LONG' ? currentPrice * (1 - slPct / 100) : currentPrice * (1 + slPct / 100);
                    const tpPrice = action === 'LONG' ? currentPrice * (1 + tpPct / 100) : currentPrice * (1 - tpPct / 100);
                    await binanceService.setFuturesSLTP(symbol, side, slPrice, tpPrice, quantity).catch(() => { });

                    await tradesService.create({
                        symbol, side, type: 'MARKET', quantity,
                        price: currentPrice, total_value: quantity * currentPrice,
                        status: 'filled', strategy_used: `AI_FUTURES_${lev}x`,
                        profit_loss: 0, profit_loss_percent: 0,
                    }).catch(() => { });

                } else {
                    // SPOT — only LONG
                    if (spotUSDT < 5) {
                        get().addBotLog('Saldo Spot insuficiente.', 'warning');
                        set({ botStatus: 'waiting' });
                        botCycleRunning = false;
                        return;
                    }

                    if (action !== 'LONG') {
                        get().addBotLog('SHORT em SPOT nao suportado. Ignorando.', 'warning');
                        set({ botStatus: 'waiting' });
                        botCycleRunning = false;
                        return;
                    }

                    const allocPct = Math.min((allocation || 15) / 100, riskConfig.maxTradePercent / 100);
                    const minOrder = riskConfig.minOrderUsdt || 6;
                    const tradeAmount = Math.max(spotUSDT * allocPct, minOrder);
                    get().addBotLog(`Spot BUY: $${tradeAmount.toFixed(2)} em ${symbol}`, 'trade');

                    const order = await get().executeTrade(symbol, 'BUY', null, 'MARKET', null, tradeAmount);

                    const execQty = parseFloat(order?.executedQty || 0);
                    if (execQty > 0) {
                        positionManager.openPosition({
                            symbol, direction: 'LONG', quantity: execQty, entryPrice: currentPrice,
                            stopLossPercent: slPct, takeProfitPercent: tpPct,
                            venue: 'SPOT',
                            trailingStop: riskConfig.trailingStopEnabled !== false,
                            trailingPercent: trailingPct,
                            atr,
                            atrConfig,
                        });
                    }
                }

                get().addBotLog(`Operacao Executada! SL: ${slPct.toFixed(2)}% | TP: ${tpPct.toFixed(2)}% | Trailing ATR`, 'success');
                set({ lastTradeTime: Date.now() });

                // Save signal
                const slPrice = action === 'LONG' ? currentPrice * (1 - slPct / 100) : currentPrice * (1 + slPct / 100);
                const tpPrice = action === 'LONG' ? currentPrice * (1 + tpPct / 100) : currentPrice * (1 - tpPct / 100);
                await signalsService.create({
                    symbol,
                    signal_type: action,
                    confidence: aiResult.confidence,
                    rsi_value: marketData.rsi,
                    current_price: currentPrice,
                    stop_loss: slPrice,
                    take_profit: tpPrice,
                    gemini_analysis: aiResult.reasoning,
                    venue,
                    leverage: leverage || 1,
                }).catch(() => { });

            } catch (err) {
                get().addBotLog(`Erro Trade: ${err.message}`, 'error');
            }

            set({ botStatus: 'waiting' });
        } catch (error) {
            console.error('[Bot] Cycle error:', error);
            get().addBotLog(`❌ Erro Crítico Ciclo: ${error.message}`, 'error');
            set({ botStatus: 'error' });
        } finally {
            botCycleRunning = false;
        }
    },

    // ===== SETTINGS =====
    setUserSettings: (settings) => set({ userSettings: settings }),

    loadUserSettings: async () => {
        try {
            const settings = await userSettingsService.get(get().userId);
            if (settings) {
                const riskLevel = settings.risk_level || 'medium';
                const riskConfig = RISK_LEVELS[riskLevel];

                set({ userSettings: settings, autoTradeEnabled: settings.auto_trade_enabled, riskLevel });

                const riskCfg = RISK_LEVELS[riskLevel];
                tradingSafetyService.updateLimits({
                    dailyLossPercent: riskCfg.dailyLossPercent || 3,
                    maxTradesPerHour: settings.max_trades_per_hour || 10,
                    maxConcurrentPositions: riskCfg.maxConcurrentPositions || 3,
                });
            }

            const credentials = await secureCredentialsService.getBinanceCredentials();
            if (credentials) {
                binanceService.setCredentials(credentials.apiKey, credentials.apiSecret, credentials.isTestnet);
                set({ isConnected: true });
            } else {
                set({ isConnected: false });
            }

            return settings;
        } catch (error) {
            console.error('[Store] loadUserSettings error:', error);
            set({ error: error.message });
            return null;
        }
    },

    saveUserSettings: async (settings) => {
        try {
            set({ isLoading: true });
            const { binance_api_key, binance_api_secret, ...safeSettings } = settings;
            const saved = await userSettingsService.upsert(safeSettings);

            // Apply risk level
            if (settings.risk_level) {
                set({ riskLevel: settings.risk_level });
            }

            set({ userSettings: saved, isLoading: false });

            if (settings.max_trades_per_hour !== undefined) {
                tradingSafetyService.updateLimits({
                    maxTradesPerHour: settings.max_trades_per_hour,
                });
            }

            return saved;
        } catch (error) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    setRiskLevel: (level) => {
        if (!RISK_LEVELS[level]) return;
        set({ riskLevel: level });
        get().saveUserSettings({ risk_level: level }).catch(() => { });
    },

    // ===== CONNECTION =====
    testConnection: async () => {
        try {
            set({ isLoading: true });
            const result = await binanceService.testConnection();
            set({ isConnected: result.success, isLoading: false });
            return result;
        } catch (error) {
            set({ isConnected: false, isLoading: false, error: error.message });
            return { success: false, message: error.message };
        }
    },

    // ===== BALANCE =====
    fetchBalance: async () => {
        try {
            const balances = await binanceService.getBalance();
            let prices = get().prices;
            if (Object.keys(prices).length === 0) prices = await get().fetchPrices();

            let totalUSDT = 0;
            for (const b of balances) {
                if (b.asset === 'USDT') {
                    totalUSDT += b.total;
                } else {
                    const price = prices[`${b.asset}USDT`] || 0;
                    totalUSDT += b.total * price;
                }
            }

            const spotUSDT = balances.find(b => b.asset === 'USDT')?.free || 0;
            set({ balance: balances, totalBalanceUSDT: totalUSDT });
            // Save snapshot with spot/futures breakdown to DB
            const futuresBalance = get().futuresState?.totalWalletBalance || 0;
            await balanceService.saveSnapshot(get().userId, {
                total_balance_usdt: totalUSDT,
                spot_balance: spotUSDT,
                futures_balance: futuresBalance,
            }).catch(() => { });
            return balances;
        } catch (error) {
            console.error('[Store] fetchBalance error:', error);
            return [];
        }
    },

    fetchPortfolio: async () => {
        try {
            const portfolio = await portfolioService.getAll(get().userId);
            set({ portfolio });
            return portfolio;
        } catch (error) {
            return [];
        }
    },

    // ===== MARKET DATA =====
    fetchPrices: async () => {
        try {
            const allPrices = await binanceService.getAllPrices();
            const pricesMap = {};
            for (const p of allPrices) pricesMap[p.symbol] = parseFloat(p.price);
            set({ prices: pricesMap });
            return pricesMap;
        } catch (error) {
            return {};
        }
    },

    fetchMarketData: async (symbol) => {
        try {
            set({ isLoading: true, selectedSymbol: symbol });
            const [ticker, klines] = await Promise.all([
                binanceService.get24hTicker(symbol),
                binanceService.getKlines(symbol, '15m', 100),
            ]);

            const analysis = analyzeMarketConditions(klines);
            const atr = calculateATR(klines);
            const stochRsi = calculateStochasticRSI(klines.map(k => k.close));

            const marketData = {
                symbol,
                currentPrice: parseFloat(ticker.lastPrice),
                priceChange24h: parseFloat(ticker.priceChangePercent),
                high24h: parseFloat(ticker.highPrice),
                low24h: parseFloat(ticker.lowPrice),
                volume24h: parseFloat(ticker.volume),
                quoteVolume24h: parseFloat(ticker.quoteVolume),
                ...analysis,
                atr,
                stochRsi,
            };

            set(state => ({
                marketData: { ...state.marketData, [symbol]: marketData },
                klines: { ...state.klines, [symbol]: klines },
                isLoading: false,
            }));

            return marketData;
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return null;
        }
    },

    // ===== FUTURES =====
    setTradingType: (type) => set({ tradingType: type }),

    setFuturesConfig: async (symbol, leverage) => {
        try {
            await binanceService.setLeverage(symbol, leverage);
            set(state => ({ futuresState: { ...state.futuresState, leverage } }));
            return true;
        } catch (error) {
            set({ error: error.message });
            return false;
        }
    },

    fetchFuturesAccount: async () => {
        try {
            const [info, positions] = await Promise.all([
                binanceService.getFuturesAccountInfo(),
                binanceService.getFuturesPositionRisk(),
            ]);
            const activePositions = positions.filter(p => parseFloat(p.positionAmt) !== 0);
            set(state => ({
                futuresState: {
                    ...state.futuresState,
                    totalWalletBalance: parseFloat(info.totalWalletBalance),
                    totalUnrealizedProfit: parseFloat(info.totalUnrealizedProfit),
                    positions: activePositions,
                }
            }));
            return info;
        } catch (error) {
            return null;
        }
    },

    // ===== AI ANALYSIS (manual) =====
    runAIAnalysis: async (symbol) => {
        try {
            set({ isLoading: true });
            let data = get().marketData[symbol];
            if (!data) data = await get().fetchMarketData(symbol);
            if (!data) { set({ isLoading: false }); return null; }

            const riskConfig = RISK_LEVELS[get().riskLevel || 'medium'];
            const analysis = await geminiService.analyzeMarket(data, get().tradingType, {
                minConfidence: get().userSettings?.min_confidence || riskConfig.minConfidence,
            });

            if (analysis) {
                const signal = {
                    symbol,
                    signal_type: analysis.action || 'HOLD',
                    confidence: analysis.confidence || 50,
                    rsi_value: data.rsi,
                    current_price: data.currentPrice,
                    stop_loss: data.currentPrice * (1 - (analysis.stopLossPercent || riskConfig.stopLossPercent) / 100),
                    take_profit: data.currentPrice * (1 + (analysis.takeProfitPercent || riskConfig.takeProfitPercent) / 100),
                    gemini_analysis: analysis.reasoning,
                    news_sentiment: analysis.marketSentiment,
                };
                await signalsService.create(signal).catch(() => { });
                set({ aiAnalysis: analysis, isLoading: false });
            } else {
                set({ isLoading: false });
            }

            return analysis;
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return null;
        }
    },

    fetchSignals: async () => {
        try {
            const signals = await signalsService.getRecent(get().userId);
            set({ signals: signals || [] });
            return signals || [];
        } catch (error) {
            set({ signals: [] });
            return [];
        }
    },

    // ===== TRADES =====
    fetchTrades: async () => {
        try {
            const [trades, stats] = await Promise.all([
                tradesService.getAll(get().userId),
                tradesService.getStats(get().userId),
            ]);
            set({ trades: trades || [], tradeStats: stats, performanceStats: stats });
            return trades || [];
        } catch (error) {
            set({ trades: [] });
            return [];
        }
    },

    executeTrade: async (symbol, side, quantity, type = 'MARKET', price = null, quoteOrderQty = null) => {
        try {
            set({ isLoading: true });

            const tradeValueEst = quoteOrderQty || (quantity * (get().marketData[symbol]?.currentPrice || get().prices[symbol] || 0));
            const safetyCheck = await tradingSafetyService.canTrade(get().userId, tradeValueEst, get().tradeStats);
            if (!safetyCheck.allowed) {
                set({ isLoading: false, error: safetyCheck.reason });
                throw new Error(safetyCheck.reason);
            }

            tradingSafetyService.validateTradeAmount(tradeValueEst, get().totalBalanceUSDT);

            let order;
            if (type === 'MARKET') {
                order = side === 'BUY'
                    ? await binanceService.createMarketBuy(symbol, quantity, quoteOrderQty)
                    : await binanceService.createMarketSell(symbol, quantity);
            } else {
                order = side === 'BUY'
                    ? await binanceService.createLimitBuy(symbol, quantity, price)
                    : await binanceService.createLimitSell(symbol, quantity, price);
            }

            const executedQty = parseFloat(order.executedQty || quantity || 0);
            const cummQuoteQty = parseFloat(order.cummulativeQuoteQty || 0);
            const avgPrice = executedQty > 0 ? cummQuoteQty / executedQty : 0;
            const fee = order.fills?.reduce((sum, f) => sum + parseFloat(f.commission), 0) || 0;

            // P&L for SELL: fetch avg buy price from server
            let profitLoss = 0;
            let profitLossPercent = 0;
            if (side === 'SELL' && executedQty > 0 && avgPrice > 0) {
                try {
                    const avgBuyPrice = await tradesService.getAvgBuyPrice(symbol);
                    if (avgBuyPrice > 0) {
                        profitLoss = (avgPrice - avgBuyPrice) * executedQty - fee;
                        profitLossPercent = ((avgPrice - avgBuyPrice) / avgBuyPrice) * 100;
                    }
                } catch (e) {
                    console.warn('[Trade] P&L calc error:', e.message);
                }
            }

            const trade = {
                symbol,
                side,
                type,
                quantity: executedQty,
                price: avgPrice,
                total_value: cummQuoteQty,
                fee,
                fee_asset: order.fills?.[0]?.commissionAsset || 'USDT',
                binance_order_id: order.orderId?.toString(),
                status: order.status === 'FILLED' ? 'filled' : 'pending',
                strategy_used: get().selectedStrategy?.name || 'AI_Bot',
                profit_loss: profitLoss,
                profit_loss_percent: profitLossPercent,
            };

            await tradesService.create(trade).catch(e => console.error('[Trade] Save error:', e));

            const pnlText = side === 'SELL' && profitLoss !== 0
                ? ` | P&L: ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)} (${profitLossPercent.toFixed(1)}%)`
                : '';
            get().addBotLog(
                `✅ ${side} ${executedQty.toFixed(6)} ${symbol.replace('USDT', '')} @ $${avgPrice.toFixed(2)} ($${cummQuoteQty.toFixed(2)})${pnlText}`,
                'trade'
            );

            await logsService.create(get().userId, 'TRADE_EXECUTED', trade).catch(() => { });
            await Promise.all([get().fetchBalance(), get().fetchTrades()]);
            set({ isLoading: false });
            return order;
        } catch (error) {
            set({ error: error.message, isLoading: false });
            get().addBotLog(`❌ ${side} ${symbol} falhou: ${error.message}`, 'error');
            await logsService.create(get().userId, 'TRADE_FAILED', { symbol, side, quantity }, false, error.message).catch(() => { });
            throw error;
        }
    },

    // ===== STRATEGIES =====
    fetchStrategies: async () => {
        try {
            const strategies = await strategiesService.getAll();
            set({ strategies });
            return strategies;
        } catch (error) {
            return [];
        }
    },

    selectStrategy: (strategy) => set({ selectedStrategy: strategy }),

    // Legacy toggle
    toggleAutoTrade: async (enabled) => {
        if (enabled) await get().startBot();
        else get().stopBot();
    },

    clearError: () => set({ error: null }),
    setError: (error) => set({ error }),

    // ===== FETCH BALANCE HISTORY (from DB) =====
    fetchBalanceHistory: async () => {
        try {
            const history = await balanceService.getHistory(200);
            set({ balanceHistory: history || [] });
            return history || [];
        } catch (e) {
            return [];
        }
    },

    // ===== RESTORE BOT LOGS (from DB) =====
    restoreBotLogs: async () => {
        try {
            const logs = await logsService.getRecent(100);
            if (logs && logs.length > 0) {
                const entries = logs.map(l => ({
                    id: new Date(l.created_at).getTime(),
                    time: new Date(l.created_at).toLocaleTimeString('pt-BR'),
                    message: l.message,
                    type: l.log_type || 'info',
                }));
                set({ botLog: entries });
            }
        } catch (e) {
            console.warn('[Store] restoreBotLogs failed:', e.message);
        }
    },

    // ===== INITIALIZE =====
    initialize: async () => {
        set({ isLoading: true });
        try {
            if (!get().userId) {
                await get().fetchPrices();
                set({ isLoading: false });
                return;
            }

            await get().loadUserSettings();
            await get().fetchPrices();
            await get().fetchStrategies();

            if (get().isConnected) {
                try { await binanceService.getExchangeInfo(); } catch (e) { }

                await Promise.all([
                    get().fetchBalance(),
                    get().fetchTrades(),
                    get().fetchSignals(),
                    get().fetchPortfolio(),
                    get().fetchBalanceHistory(),
                    get().restoreBotLogs(),
                ]);

                // Restore starting balance for safety service from last known balance
                const totalBalance = get().totalBalanceUSDT;
                if (totalBalance > 0) {
                    tradingSafetyService.setStartingBalance(totalBalance);
                }

                // Restore open positions from DB (visible even without bot)
                try {
                    await positionManager.restorePositions();
                } catch (e) {
                    console.warn('[Store] restorePositions failed:', e.message);
                }

                for (const symbol of APP_CONFIG.trading.defaultSymbols.slice(0, 3)) {
                    await get().fetchMarketData(symbol);
                }
            }

            set({ isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },
}));

export default useAppStore;
