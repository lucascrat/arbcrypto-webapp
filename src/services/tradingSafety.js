import { apiService } from './api';

/**
 * 🛡️ Trading Safety Circuit Breakers
 * Previne perdas catastróficas com mecanismos automáticos de proteção.
 */
class TradingSafetyService {
    constructor() {
        this.dailyLossLimit = 20;     // $20 de perda diária máxima
        this.maxTradesPerHour = 10;   // máximo 10 trades por hora
        this.minWinRate = 20;         // pausar se win rate < 20% com 20+ trades
        this.minTradesForWinRate = 20;
        this.maxDrawdownPercent = 15; // pausar se drawdown > 15% da conta
        this.cooldownPeriod = 300000; // 5 min de cooldown

        // Circuit breaker state
        this.isCircuitBreakerActive = false;
        this.circuitBreakerReason = null;
        this.circuitBreakerActivatedAt = null;
    }

    async canTrade(userId, tradeAmount, tradeStats) {
        try {
            // 1. Circuit breaker check
            if (this.isCircuitBreakerActive) {
                const elapsed = Date.now() - this.circuitBreakerActivatedAt;
                if (elapsed < this.cooldownPeriod) {
                    const remaining = Math.ceil((this.cooldownPeriod - elapsed) / 60000);
                    return {
                        allowed: false,
                        reason: `Circuit breaker ativo: ${this.circuitBreakerReason}. Aguarde ${remaining} min.`,
                    };
                }
                this.resetCircuitBreaker();
            }

            // 2. Daily loss limit
            if (this.dailyLossLimit > 0) {
                const dailyLoss = await this.getDailyLoss(userId);
                if (dailyLoss >= this.dailyLossLimit) {
                    this.activateCircuitBreaker(`Limite de perda diária atingido: $${dailyLoss.toFixed(2)}`);
                    return {
                        allowed: false,
                        reason: `Limite de perda diária atingido ($${this.dailyLossLimit}). Trading pausado hoje.`,
                    };
                }
            }

            // 3. Trades per hour
            const tradesLastHour = await this.getTradesLastHour(userId);
            if (tradesLastHour >= this.maxTradesPerHour) {
                return {
                    allowed: false,
                    reason: `Limite de ${this.maxTradesPerHour} trades/hora atingido. Aguarde.`,
                };
            }

            // 4. Win rate check (only if enough data)
            if (tradeStats && tradeStats.totalTrades >= this.minTradesForWinRate) {
                if (tradeStats.winRate < this.minWinRate) {
                    this.activateCircuitBreaker(`Win rate muito baixo: ${tradeStats.winRate?.toFixed(1)}%`);
                    return {
                        allowed: false,
                        reason: `Win rate muito baixo (${tradeStats.winRate?.toFixed(1)}%). Revise a estratégia.`,
                    };
                }
            }

            return { allowed: true, reason: null };
        } catch (error) {
            console.error('[Safety] Error checking trade permission:', error);
            return { allowed: true, reason: null }; // don't block on error
        }
    }

    async getDailyLoss(userId) {
        try {
            const data = await apiService.get('/api/daily-loss');
            return data.totalLoss || 0;
        } catch {
            return 0;
        }
    }

    async getTradesLastHour(userId) {
        try {
            const data = await apiService.get('/api/trades-recent-count?minutes=60');
            return data.count || 0;
        } catch {
            return 0;
        }
    }

    activateCircuitBreaker(reason) {
        this.isCircuitBreakerActive = true;
        this.circuitBreakerReason = reason;
        this.circuitBreakerActivatedAt = Date.now();
        console.log(`[Safety] 🚨 Circuit breaker: ${reason}`);
    }

    resetCircuitBreaker() {
        this.isCircuitBreakerActive = false;
        this.circuitBreakerReason = null;
        this.circuitBreakerActivatedAt = null;
    }

    forceResetCircuitBreaker() {
        this.resetCircuitBreaker();
        return true;
    }

    updateLimits(limits) {
        if (limits.dailyLossLimit !== undefined) this.dailyLossLimit = limits.dailyLossLimit;
        if (limits.maxTradesPerHour !== undefined) this.maxTradesPerHour = limits.maxTradesPerHour;
        if (limits.minWinRate !== undefined) this.minWinRate = limits.minWinRate;
        if (limits.maxDrawdownPercent !== undefined) this.maxDrawdownPercent = limits.maxDrawdownPercent;
        if (limits.cooldownPeriod !== undefined) this.cooldownPeriod = limits.cooldownPeriod;
    }

    getStatus() {
        return {
            circuitBreakerActive: this.isCircuitBreakerActive,
            circuitBreakerReason: this.circuitBreakerReason,
            limits: {
                dailyLossLimit: this.dailyLossLimit,
                maxTradesPerHour: this.maxTradesPerHour,
                minWinRate: this.minWinRate,
                maxDrawdownPercent: this.maxDrawdownPercent,
            },
        };
    }

    /**
     * Valida o valor de um trade individual.
     * Ajustado para contas pequenas ($10+).
     */
    validateTradeAmount(tradeValueUSDT, balance) {
        if (tradeValueUSDT < 5) {
            throw new Error('Valor mínimo de trade: $5 USDT');
        }

        // Never more than 50% of balance in a single trade
        const maxTradeValue = balance * 0.5;
        if (tradeValueUSDT > maxTradeValue && balance > 10) {
            throw new Error(`Valor máximo por trade: $${maxTradeValue.toFixed(2)} (50% do saldo)`);
        }

        if (tradeValueUSDT > balance) {
            throw new Error('Saldo insuficiente');
        }

        return true;
    }
}

export const tradingSafetyService = new TradingSafetyService();
export default tradingSafetyService;
