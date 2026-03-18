import { binanceService } from './binance';
import { openPositionsService } from './data';

/**
 * Position Manager — Stop-Loss, Take-Profit, Trailing Stop (ATR-based), Partial Exits
 *
 * Monitora posições abertas e executa saídas automaticamente.
 * v4: Persistência no banco — posições sobrevivem restart do app.
 *
 * Features:
 * - Trailing stop baseado em ATR (adapta à volatilidade)
 * - Break-even stop (move SL para entry quando lucro > ATR threshold)
 * - Saídas parciais (fecha 50% no TP1, trailing no restante)
 * - Persistência no PostgreSQL (sobrevive restart)
 * - Retry logic para ordens de saída que falham
 * - Sync com posições reais da Binance
 */
class PositionManagerService {
    constructor() {
        /** @type {Map<string, PositionEntry>} symbol → position */
        this.positions = new Map();
        this.monitorInterval = null;
        this.persistInterval = null;
        this.onExitCallback = null;
        this.onLogCallback = null;
        this.MONITOR_INTERVAL_MS = 15000;
        this.PERSIST_INTERVAL_MS = 30000; // persist state every 30s
        this.MAX_EXIT_RETRIES = 3;
    }

    /**
     * Restaura posições do banco de dados (chamado no startup)
     */
    async restorePositions() {
        try {
            const saved = await openPositionsService.getOpen();
            if (!saved || saved.length === 0) {
                this.log('Nenhuma posicao aberta para restaurar', 'info');
                return [];
            }

            for (const row of saved) {
                const position = {
                    symbol: row.symbol,
                    direction: row.direction,
                    quantity: parseFloat(row.quantity),
                    originalQuantity: parseFloat(row.original_quantity),
                    entryPrice: parseFloat(row.entry_price),
                    stopLoss: row.stop_loss ? parseFloat(row.stop_loss) : null,
                    takeProfit: row.take_profit ? parseFloat(row.take_profit) : null,
                    tp1Price: row.tp1_price ? parseFloat(row.tp1_price) : null,
                    breakEvenPrice: row.break_even_price ? parseFloat(row.break_even_price) : null,
                    venue: row.venue || 'SPOT',
                    trailingStop: row.trailing_stop || false,
                    trailingPercent: row.trailing_percent ? parseFloat(row.trailing_percent) : 1.5,
                    trailingDistance: row.trailing_distance ? parseFloat(row.trailing_distance) : null,
                    peakPrice: row.peak_price ? parseFloat(row.peak_price) : parseFloat(row.entry_price),
                    openedAt: parseInt(row.opened_at) || Date.now(),
                    partialExitDone: row.partial_exit_done || false,
                    breakEvenActivated: row.break_even_activated || false,
                    atr: row.atr ? parseFloat(row.atr) : null,
                    _dbId: row.id, // track DB record
                };
                this.positions.set(row.symbol, position);
            }

            this.log(`${saved.length} posicao(oes) restaurada(s) do banco`, 'success');
            return saved;
        } catch (e) {
            this.log(`Erro ao restaurar posicoes: ${e.message}`, 'error');
            return [];
        }
    }

    /**
     * Sincroniza posições locais com posições reais da Binance.
     * Remove posições locais que não existem mais na exchange.
     */
    async syncWithBinance() {
        try {
            // Get real Binance futures positions
            let realPositions = {};
            try {
                const futuresPositions = await binanceService.getFuturesPositionRisk();
                for (const p of futuresPositions) {
                    const amt = parseFloat(p.positionAmt);
                    if (amt !== 0) {
                        realPositions[p.symbol] = {
                            quantity: Math.abs(amt),
                            direction: amt > 0 ? 'LONG' : 'SHORT',
                            entryPrice: parseFloat(p.entryPrice),
                            unrealizedProfit: parseFloat(p.unRealizedProfit),
                        };
                    }
                }
            } catch (e) {
                // Futures not available, just check spot
            }

            // Get real Binance spot balances
            try {
                const balances = await binanceService.getBalance();
                for (const b of balances) {
                    if (b.asset !== 'USDT' && b.asset !== 'BNB' && b.total > 0) {
                        const symbol = `${b.asset}USDT`;
                        if (!realPositions[symbol]) {
                            realPositions[symbol] = {
                                quantity: b.total,
                                direction: 'LONG',
                                venue: 'SPOT',
                            };
                        }
                    }
                }
            } catch (e) { }

            // Check local positions against real ones
            let synced = 0;
            for (const [symbol, pos] of this.positions.entries()) {
                const real = realPositions[symbol];
                if (!real || real.quantity < pos.quantity * 0.01) {
                    // Position no longer exists on exchange — was closed externally
                    this.log(`SYNC: ${symbol} nao existe mais na Binance — removendo`, 'warning');
                    await this._closePositionInDB(symbol, 'SYNC', pos.entryPrice, 0, 0);
                    this.positions.delete(symbol);
                    synced++;
                }
            }

            if (synced > 0) {
                this.log(`Sync: ${synced} posicao(oes) orfas removidas`, 'warning');
            } else {
                this.log(`Sync OK: ${this.positions.size} posicoes ativas confirmadas`, 'info');
            }
        } catch (e) {
            this.log(`Erro sync Binance: ${e.message}`, 'error');
        }
    }

    /**
     * Persiste o estado atual de todas as posições no banco
     */
    async persistAllPositions() {
        for (const [symbol, pos] of this.positions.entries()) {
            try {
                await openPositionsService.save({
                    symbol: pos.symbol,
                    direction: pos.direction,
                    venue: pos.venue,
                    quantity: pos.quantity,
                    original_quantity: pos.originalQuantity,
                    entry_price: pos.entryPrice,
                    stop_loss: pos.stopLoss,
                    take_profit: pos.takeProfit,
                    tp1_price: pos.tp1Price,
                    break_even_price: pos.breakEvenPrice,
                    trailing_stop: pos.trailingStop,
                    trailing_percent: pos.trailingPercent,
                    trailing_distance: pos.trailingDistance,
                    peak_price: pos.peakPrice,
                    atr: pos.atr,
                    partial_exit_done: pos.partialExitDone,
                    break_even_activated: pos.breakEvenActivated,
                    opened_at: pos.openedAt,
                });
            } catch (e) {
                console.warn(`[PositionManager] Persist error ${symbol}:`, e.message);
            }
        }
    }

    /**
     * Abre (registra) uma nova posição para monitoramento.
     */
    openPosition({ symbol, direction, quantity, entryPrice, stopLossPercent, takeProfitPercent, venue = 'SPOT', trailingStop = false, trailingPercent = 1.5, atr = null, atrConfig = null }) {
        let slPrice, tpPrice, tp1Price = null;
        let effectiveTrailingDistance = null;
        let breakEvenPrice = null;

        if (atr && atrConfig) {
            const slDistance = atr * (atrConfig.slMultiplier || 1.5);
            const tpDistance = atr * (atrConfig.tpMultiplier || 3.0);
            const tp1Distance = atr * (atrConfig.tp1Multiplier || 2.0);
            effectiveTrailingDistance = atr * (atrConfig.trailingMultiplier || 1.0);
            const breakEvenThreshold = atr * (atrConfig.breakEvenThreshold || 1.0);

            if (direction === 'LONG') {
                slPrice = entryPrice - slDistance;
                tpPrice = entryPrice + tpDistance;
                tp1Price = entryPrice + tp1Distance;
                breakEvenPrice = entryPrice + breakEvenThreshold;
            } else {
                slPrice = entryPrice + slDistance;
                tpPrice = entryPrice - tpDistance;
                tp1Price = entryPrice - tp1Distance;
                breakEvenPrice = entryPrice - breakEvenThreshold;
            }

            this.log(`ATR-based levels: SL=${slDistance.toFixed(2)} TP=${tpDistance.toFixed(2)} TP1=${tp1Distance.toFixed(2)} Trail=${effectiveTrailingDistance.toFixed(2)}`, 'info');
        } else {
            slPrice = direction === 'LONG'
                ? entryPrice * (1 - stopLossPercent / 100)
                : entryPrice * (1 + stopLossPercent / 100);
            tpPrice = direction === 'LONG'
                ? entryPrice * (1 + takeProfitPercent / 100)
                : entryPrice * (1 - takeProfitPercent / 100);
        }

        const position = {
            symbol,
            direction,
            quantity,
            originalQuantity: quantity,
            entryPrice,
            stopLoss: slPrice,
            takeProfit: tpPrice,
            tp1Price,
            breakEvenPrice,
            venue,
            trailingStop,
            trailingPercent,
            trailingDistance: effectiveTrailingDistance,
            peakPrice: entryPrice,
            openedAt: Date.now(),
            partialExitDone: false,
            breakEvenActivated: false,
            atr,
        };

        this.positions.set(symbol, position);
        this.log(`Posicao registrada: ${direction} ${symbol} @ $${entryPrice.toFixed(4)} | SL: $${slPrice.toFixed(4)} | TP1: ${tp1Price ? '$' + tp1Price.toFixed(4) : 'N/A'} | TP: $${tpPrice.toFixed(4)}`, 'info');

        // Persist to DB (non-blocking)
        this._savePositionToDB(position).catch(() => {});

        return position;
    }

    closePosition(symbol) {
        this.positions.delete(symbol);
    }

    hasPosition(symbol) {
        return this.positions.has(symbol);
    }

    getPosition(symbol) {
        return this.positions.get(symbol);
    }

    getAllPositions() {
        return Array.from(this.positions.values());
    }

    getActivePositionCount() {
        return this.positions.size;
    }

    /**
     * Returns all positions with live P&L calculated from current prices
     */
    getPositionsWithPnL(prices) {
        const result = [];
        for (const [symbol, pos] of this.positions.entries()) {
            const currentPrice = prices[symbol] || pos.entryPrice;
            const pnl = pos.direction === 'LONG'
                ? (currentPrice - pos.entryPrice) * pos.quantity
                : (pos.entryPrice - currentPrice) * pos.quantity;
            const pnlPct = pos.direction === 'LONG'
                ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
                : ((pos.entryPrice - currentPrice) / pos.entryPrice) * 100;

            result.push({
                ...pos,
                currentPrice,
                pnl,
                pnlPct,
                duration: Date.now() - pos.openedAt,
            });
        }
        return result;
    }

    startMonitoring(getPriceFn, onExit, onLog) {
        if (this.monitorInterval) return;

        this.onExitCallback = onExit;
        this.onLogCallback = onLog;

        this.monitorInterval = setInterval(async () => {
            await this._checkPositions(getPriceFn);
        }, this.MONITOR_INTERVAL_MS);

        // Periodic persistence (save state to DB every 30s)
        this.persistInterval = setInterval(async () => {
            if (this.positions.size > 0) {
                await this.persistAllPositions();
            }
        }, this.PERSIST_INTERVAL_MS);

        this.log('Monitor de SL/TP iniciado (15s) + persistencia (30s)', 'info');
    }

    async stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        if (this.persistInterval) {
            clearInterval(this.persistInterval);
            this.persistInterval = null;
        }
        // Final persist before stopping — await to ensure data is saved
        if (this.positions.size > 0) {
            try {
                await this.persistAllPositions();
                this.log(`${this.positions.size} posicao(oes) salva(s) no banco antes de parar`, 'info');
            } catch (e) {
                this.log(`Erro ao persistir posicoes antes de parar: ${e.message}`, 'error');
            }
        }
        this.log('Monitor de SL/TP parado', 'warning');
    }

    async _checkPositions(getPriceFn) {
        if (this.positions.size === 0) return;

        for (const [symbol, pos] of this.positions.entries()) {
            try {
                const currentPrice = typeof getPriceFn === 'function'
                    ? await getPriceFn(symbol)
                    : getPriceFn[symbol];

                if (!currentPrice || isNaN(currentPrice)) continue;

                const pnlPct = pos.direction === 'LONG'
                    ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
                    : ((pos.entryPrice - currentPrice) / pos.entryPrice) * 100;

                // --- Break-even stop activation (ATR-based buffer instead of 0.1%) ---
                if (!pos.breakEvenActivated && pos.breakEvenPrice) {
                    const breakEvenHit = pos.direction === 'LONG'
                        ? currentPrice >= pos.breakEvenPrice
                        : currentPrice <= pos.breakEvenPrice;

                    if (breakEvenHit) {
                        // Use ATR-based buffer (0.5 ATR above entry) instead of fixed 0.1%
                        const buffer = pos.atr ? pos.atr * 0.5 : pos.entryPrice * 0.003;
                        const newSL = pos.direction === 'LONG'
                            ? pos.entryPrice + buffer
                            : pos.entryPrice - buffer;
                        pos.stopLoss = pos.direction === 'LONG'
                            ? Math.max(pos.stopLoss, newSL)
                            : Math.min(pos.stopLoss, newSL);
                        pos.breakEvenActivated = true;
                        this.log(`Break-even ativado: ${symbol} SL $${pos.stopLoss.toFixed(4)} (buffer: $${buffer.toFixed(4)})`, 'success');
                    }
                }

                // --- Time-based stop: close after 4h if not profitable ---
                const MAX_HOLD_MS = 4 * 60 * 60 * 1000; // 4 hours
                const holdTime = Date.now() - pos.openedAt;
                if (holdTime > MAX_HOLD_MS && pnlPct <= 0.1) {
                    this.log(`TIME-STOP: ${symbol} aberto ha ${(holdTime / 3600000).toFixed(1)}h sem lucro (${pnlPct.toFixed(2)}%). Fechando.`, 'warning');
                    try {
                        await this._executeExit(pos, currentPrice, 'TIME_STOP');
                        this.positions.delete(symbol);
                    } catch (e) {
                        this.log(`Erro time-stop ${symbol}: ${e.message}`, 'error');
                    }
                    continue;
                }

                // --- Partial Take-Profit (TP1 = close 50%) ---
                if (!pos.partialExitDone && pos.tp1Price) {
                    const tp1Hit = pos.direction === 'LONG'
                        ? currentPrice >= pos.tp1Price
                        : currentPrice <= pos.tp1Price;

                    if (tp1Hit) {
                        const partialQty = pos.quantity * 0.5;
                        this.log(`TP1 atingido: ${symbol} @ $${currentPrice.toFixed(4)} — fechando 50% (${partialQty})`, 'success');

                        try {
                            await this._executePartialExit(pos, currentPrice, partialQty);
                            pos.quantity = pos.quantity - partialQty;
                            pos.partialExitDone = true;
                            // ATR-based break-even after partial exit
                            const buffer = pos.atr ? pos.atr * 0.5 : pos.entryPrice * 0.003;
                            pos.stopLoss = pos.direction === 'LONG'
                                ? Math.max(pos.stopLoss, pos.entryPrice + buffer)
                                : Math.min(pos.stopLoss, pos.entryPrice - buffer);
                            pos.breakEvenActivated = true;
                            this.log(`Restante: ${pos.quantity} ${symbol} com trailing stop`, 'info');
                        } catch (e) {
                            this.log(`Erro no partial exit ${symbol}: ${e.message}`, 'error');
                        }
                        continue;
                    }
                }

                // --- Trailing stop with cooldown (ATR-based or fallback %) ---
                if (pos.trailingStop) {
                    const minPeakMove = pos.atr ? pos.atr * 0.3 : pos.peakPrice * 0.002; // Only update if peak moved significantly

                    if (pos.direction === 'LONG' && currentPrice > pos.peakPrice + minPeakMove) {
                        pos.peakPrice = currentPrice;
                        const newSL = pos.trailingDistance
                            ? currentPrice - pos.trailingDistance
                            : currentPrice * (1 - pos.trailingPercent / 100);
                        pos.stopLoss = Math.max(pos.stopLoss, newSL);
                        this.log(`Trailing SL: ${symbol} peak $${currentPrice.toFixed(4)} SL $${pos.stopLoss.toFixed(4)}`, 'info');
                    } else if (pos.direction === 'SHORT' && currentPrice < pos.peakPrice - minPeakMove) {
                        pos.peakPrice = currentPrice;
                        const newSL = pos.trailingDistance
                            ? currentPrice + pos.trailingDistance
                            : currentPrice * (1 + pos.trailingPercent / 100);
                        pos.stopLoss = Math.min(pos.stopLoss, newSL);
                        this.log(`Trailing SL: ${symbol} peak $${currentPrice.toFixed(4)} SL $${pos.stopLoss.toFixed(4)}`, 'info');
                    }
                }

                // --- Check Stop-Loss ---
                const slTriggered = pos.direction === 'LONG'
                    ? currentPrice <= pos.stopLoss
                    : currentPrice >= pos.stopLoss;

                if (slTriggered) {
                    this.log(`STOP-LOSS: ${symbol} @ $${currentPrice.toFixed(4)} (P&L: ${pnlPct.toFixed(2)}%)`, 'error');
                    await this._executeExit(pos, currentPrice, 'STOP_LOSS');
                    continue;
                }

                // --- Check Take-Profit (TP2 / final TP) ---
                const tpTriggered = pos.direction === 'LONG'
                    ? currentPrice >= pos.takeProfit
                    : currentPrice <= pos.takeProfit;

                if (tpTriggered) {
                    this.log(`TAKE-PROFIT: ${symbol} @ $${currentPrice.toFixed(4)} (P&L: +${pnlPct.toFixed(2)}%)`, 'success');
                    await this._executeExit(pos, currentPrice, 'TAKE_PROFIT');
                    continue;
                }

            } catch (e) {
                console.error(`[PositionManager] Error checking ${symbol}:`, e.message);
            }
        }
    }

    async _executePartialExit(pos, currentPrice, partialQty) {
        const { symbol, direction, venue } = pos;

        if (venue === 'FUTURES') {
            const side = direction === 'LONG' ? 'SELL' : 'BUY';
            await binanceService.createFuturesOrder(symbol, side, 'MARKET', partialQty, null, { reduceOnly: 'true' });
        } else {
            await binanceService.createMarketSell(symbol, partialQty);
        }

        if (this.onExitCallback) {
            await this.onExitCallback({
                symbol,
                direction,
                reason: 'PARTIAL_TP1',
                exitPrice: currentPrice,
                entryPrice: pos.entryPrice,
                quantity: partialQty,
                venue,
                isPartial: true,
            });
        }
    }

    async _executeExit(pos, currentPrice, reason) {
        const { symbol, direction, quantity, venue } = pos;
        const pnl = direction === 'LONG'
            ? (currentPrice - pos.entryPrice) * quantity
            : (pos.entryPrice - currentPrice) * quantity;
        const pnlPct = direction === 'LONG'
            ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
            : ((pos.entryPrice - currentPrice) / pos.entryPrice) * 100;

        // Retry logic for exchange order
        let order = null;
        let lastError = null;
        for (let attempt = 1; attempt <= this.MAX_EXIT_RETRIES; attempt++) {
            try {
                if (venue === 'FUTURES') {
                    const side = direction === 'LONG' ? 'SELL' : 'BUY';
                    order = await binanceService.createFuturesOrder(symbol, side, 'MARKET', quantity, null, { reduceOnly: 'true' });
                } else {
                    order = await binanceService.createMarketSell(symbol, quantity);
                }
                break; // success
            } catch (e) {
                lastError = e;
                this.log(`Tentativa ${attempt}/${this.MAX_EXIT_RETRIES} falhou para fechar ${symbol}: ${e.message}`, 'error');

                // If position doesn't exist on exchange, clean up locally
                if (e.message.includes('position side does not match') ||
                    e.message.includes('insufficient') ||
                    e.message.includes('ReduceOnly') ||
                    e.message.includes('Account has insufficient balance')) {
                    this.log(`${symbol}: posicao nao existe mais na exchange — limpando`, 'warning');
                    break;
                }

                // Wait before retry (exponential backoff)
                if (attempt < this.MAX_EXIT_RETRIES) {
                    await new Promise(r => setTimeout(r, attempt * 2000));
                }
            }
        }

        // Only remove position AFTER successful order OR confirmed non-existence
        if (order || (lastError && (
            lastError.message.includes('position side does not match') ||
            lastError.message.includes('insufficient') ||
            lastError.message.includes('ReduceOnly') ||
            lastError.message.includes('Account has insufficient balance')
        ))) {
            // Close in DB
            await this._closePositionInDB(symbol, reason, currentPrice, pnl, pnlPct);
            this.closePosition(symbol);

            if (this.onExitCallback) {
                await this.onExitCallback({
                    symbol,
                    direction,
                    reason,
                    exitPrice: currentPrice,
                    entryPrice: pos.entryPrice,
                    quantity,
                    venue,
                    order,
                });
            }
        } else {
            // Order failed all retries but position may still exist — keep tracking
            this.log(`ALERTA: ${symbol} falhou ao fechar apos ${this.MAX_EXIT_RETRIES} tentativas — continuando monitoramento`, 'error');
        }
    }

    async _savePositionToDB(pos) {
        return openPositionsService.save({
            symbol: pos.symbol,
            direction: pos.direction,
            venue: pos.venue,
            quantity: pos.quantity,
            original_quantity: pos.originalQuantity,
            entry_price: pos.entryPrice,
            stop_loss: pos.stopLoss,
            take_profit: pos.takeProfit,
            tp1_price: pos.tp1Price,
            break_even_price: pos.breakEvenPrice,
            trailing_stop: pos.trailingStop,
            trailing_percent: pos.trailingPercent,
            trailing_distance: pos.trailingDistance,
            peak_price: pos.peakPrice,
            atr: pos.atr,
            partial_exit_done: pos.partialExitDone,
            break_even_activated: pos.breakEvenActivated,
            opened_at: pos.openedAt,
        });
    }

    async _closePositionInDB(symbol, reason, closePrice, pnl, pnlPct) {
        try {
            await openPositionsService.close(symbol, {
                close_reason: reason,
                close_price: closePrice,
                profit_loss: pnl,
                profit_loss_percent: pnlPct,
            });
        } catch (e) {
            console.warn(`[PositionManager] DB close error ${symbol}:`, e.message);
        }
    }

    log(message, type = 'info') {
        console.log(`[PositionManager] ${message}`);
        if (this.onLogCallback) {
            this.onLogCallback(message, type);
        }
    }
}

export const positionManager = new PositionManagerService();
export default positionManager;
