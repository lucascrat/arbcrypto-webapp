import { binanceService } from './binance';

/**
 * 🎯 Position Manager — Stop-Loss, Take-Profit e Trailing Stop automático
 *
 * Monitora posições abertas e executa saídas automaticamente quando
 * SL / TP / Trailing stop são atingidos.
 */
class PositionManagerService {
    constructor() {
        /** @type {Map<string, PositionEntry>} symbol → position */
        this.positions = new Map();
        this.monitorInterval = null;
        this.onExitCallback = null;
        this.onLogCallback = null;
        this.MONITOR_INTERVAL_MS = 15000; // check every 15s
    }

    /**
     * Abre (registra) uma nova posição para monitoramento.
     * @param {string} symbol
     * @param {'LONG'|'SHORT'} direction
     * @param {number} quantity  — quantidade do ativo base
     * @param {number} entryPrice
     * @param {number} stopLossPercent  — e.g. 2.0 = 2%
     * @param {number} takeProfitPercent — e.g. 3.0 = 3%
     * @param {'SPOT'|'FUTURES'} venue
     * @param {boolean} trailingStop — ativar trailing stop
     * @param {number} trailingPercent — % de queda do pico para triggerar trailing (default 1.5%)
     */
    openPosition(symbol, direction, quantity, entryPrice, stopLossPercent, takeProfitPercent, venue = 'SPOT', trailingStop = false, trailingPercent = 1.5) {
        const slPrice = direction === 'LONG'
            ? entryPrice * (1 - stopLossPercent / 100)
            : entryPrice * (1 + stopLossPercent / 100);

        const tpPrice = direction === 'LONG'
            ? entryPrice * (1 + takeProfitPercent / 100)
            : entryPrice * (1 - takeProfitPercent / 100);

        const position = {
            symbol,
            direction, // 'LONG' | 'SHORT'
            quantity,
            entryPrice,
            stopLoss: slPrice,
            takeProfit: tpPrice,
            venue,
            trailingStop,
            trailingPercent,
            peakPrice: entryPrice, // highest price seen (for trailing)
            openedAt: Date.now(),
        };

        this.positions.set(symbol, position);
        this.log(`📌 Posição registrada: ${direction} ${symbol} @ $${entryPrice.toFixed(4)} | SL: $${slPrice.toFixed(4)} | TP: $${tpPrice.toFixed(4)}${trailingStop ? ` | Trailing ${trailingPercent}%` : ''}`, 'info');

        return position;
    }

    /**
     * Fecha (remove) posição do rastreamento.
     */
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

    /**
     * Inicia o loop de monitoramento.
     * @param {function} getPriceFn - (symbol) => Promise<number> | number
     * @param {function} onExit - callback chamado quando SL/TP é atingido
     * @param {function} onLog - callback para logar mensagens no bot
     */
    startMonitoring(getPriceFn, onExit, onLog) {
        if (this.monitorInterval) return; // já rodando

        this.onExitCallback = onExit;
        this.onLogCallback = onLog;

        this.monitorInterval = setInterval(async () => {
            await this._checkPositions(getPriceFn);
        }, this.MONITOR_INTERVAL_MS);

        this.log('🔍 Monitor de SL/TP iniciado (15s)', 'info');
    }

    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
            this.log('⏹️ Monitor de SL/TP parado', 'warning');
        }
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

                // Update trailing stop peak
                if (pos.trailingStop) {
                    if (pos.direction === 'LONG' && currentPrice > pos.peakPrice) {
                        pos.peakPrice = currentPrice;
                        pos.stopLoss = Math.max(pos.stopLoss, currentPrice * (1 - pos.trailingPercent / 100));
                        this.log(`📈 Trailing SL atualizado: ${symbol} novo SL $${pos.stopLoss.toFixed(4)}`, 'info');
                    } else if (pos.direction === 'SHORT' && currentPrice < pos.peakPrice) {
                        pos.peakPrice = currentPrice;
                        pos.stopLoss = Math.min(pos.stopLoss, currentPrice * (1 + pos.trailingPercent / 100));
                        this.log(`📉 Trailing SL atualizado: ${symbol} novo SL $${pos.stopLoss.toFixed(4)}`, 'info');
                    }
                }

                // Check Stop-Loss
                const slTriggered = pos.direction === 'LONG'
                    ? currentPrice <= pos.stopLoss
                    : currentPrice >= pos.stopLoss;

                if (slTriggered) {
                    this.log(`🛑 STOP-LOSS atingido: ${symbol} @ $${currentPrice.toFixed(4)} (P&L: ${pnlPct.toFixed(2)}%)`, 'error');
                    await this._executeExit(pos, currentPrice, 'STOP_LOSS');
                    continue;
                }

                // Check Take-Profit
                const tpTriggered = pos.direction === 'LONG'
                    ? currentPrice >= pos.takeProfit
                    : currentPrice <= pos.takeProfit;

                if (tpTriggered) {
                    this.log(`🎯 TAKE-PROFIT atingido: ${symbol} @ $${currentPrice.toFixed(4)} (P&L: +${pnlPct.toFixed(2)}%)`, 'success');
                    await this._executeExit(pos, currentPrice, 'TAKE_PROFIT');
                    continue;
                }

            } catch (e) {
                console.error(`[PositionManager] Error checking ${symbol}:`, e.message);
            }
        }
    }

    async _executeExit(pos, currentPrice, reason) {
        const { symbol, direction, quantity, venue } = pos;

        try {
            let order = null;
            if (venue === 'FUTURES') {
                const side = direction === 'LONG' ? 'SELL' : 'BUY';
                order = await binanceService.createFuturesOrder(symbol, side, 'MARKET', quantity, null, { reduceOnly: 'true' });
            } else {
                // SPOT: only LONG positions (can't short spot)
                order = await binanceService.createMarketSell(symbol, quantity);
            }

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
        } catch (e) {
            this.log(`❌ Erro ao fechar posição ${symbol}: ${e.message}`, 'error');
            // Remove from tracking even on error to avoid infinite loop
            if (e.message.includes('position side does not match') || e.message.includes('insufficient')) {
                this.closePosition(symbol);
            }
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
