import { apiService } from './api';

/**
 * 🛡️ Trading Safety Circuit Breakers
 * Previne perdas catastróficas com mecanismos automáticos de proteção.
 */
class TradingSafetyService {
    constructor() {
        this.dailyLossPercent = 3;    // 3% do saldo como perda diária máxima
        this.maxTradesPerHour = 10;
        this.minWinRate = 40;         // pausar se win rate < 40% (era 20%)
        this.minTradesForWinRate = 20;
        this.maxDrawdownPercent = 15;
        this.maxConcurrentPositions = 3;

        // Cooldown escalonado por drawdown
        this.cooldownTiers = [
            { drawdownPercent: 10, cooldownMs: 86400000 }, // >10%: 24h
            { drawdownPercent: 5,  cooldownMs: 7200000 },  // 5-10%: 2h
            { drawdownPercent: 3,  cooldownMs: 1800000 },  // 3-5%: 30min
        ];
        this.defaultCooldownMs = 300000; // 5min fallback

        // Emergency halt
        this.startingBalance = null;
        this.emergencyHaltPercent = 25; // Halt if balance drops >25% from start

        // Circuit breaker state
        this.isCircuitBreakerActive = false;
        this.circuitBreakerReason = null;
        this.circuitBreakerActivatedAt = null;
        this.currentCooldownMs = this.defaultCooldownMs;
    }

    setStartingBalance(balance) {
        if (!this.startingBalance) this.startingBalance = balance;
    }

    async canTrade(userId, tradeAmount, tradeStats, { balance, activePositionCount } = {}) {
        try {
            // 0. Emergency halt check
            if (balance && this.startingBalance) {
                const dropPercent = ((this.startingBalance - balance) / this.startingBalance) * 100;
                if (dropPercent >= this.emergencyHaltPercent) {
                    this.activateCircuitBreaker(
                        `EMERGENCY: Saldo caiu ${dropPercent.toFixed(1)}% do inicial. Requer restart manual.`,
                        86400000 * 7 // 7-day cooldown = manual reset required
                    );
                    return {
                        allowed: false,
                        reason: `EMERGENCY HALT: Saldo caiu ${dropPercent.toFixed(1)}% (>${this.emergencyHaltPercent}%). Requer restart manual.`,
                    };
                }
            }

            // 1. Circuit breaker check
            if (this.isCircuitBreakerActive) {
                const elapsed = Date.now() - this.circuitBreakerActivatedAt;
                if (elapsed < this.currentCooldownMs) {
                    const remaining = this.currentCooldownMs - elapsed;
                    const remainingStr = remaining >= 3600000
                        ? `${Math.ceil(remaining / 3600000)}h`
                        : `${Math.ceil(remaining / 60000)} min`;
                    return {
                        allowed: false,
                        reason: `Circuit breaker ativo: ${this.circuitBreakerReason}. Aguarde ${remainingStr}.`,
                    };
                }
                this.resetCircuitBreaker();
            }

            // 2. Max concurrent positions check
            if (activePositionCount !== undefined && activePositionCount >= this.maxConcurrentPositions) {
                return {
                    allowed: false,
                    reason: `Limite de ${this.maxConcurrentPositions} posições simultâneas atingido.`,
                };
            }

            // 3. Daily loss limit (% of balance)
            if (balance && this.dailyLossPercent > 0) {
                const dailyLoss = await this.getDailyLoss(userId);
                const dailyLossLimit = balance * (this.dailyLossPercent / 100);
                if (dailyLoss >= dailyLossLimit) {
                    // Determine cooldown based on drawdown severity
                    const drawdownPercent = (dailyLoss / balance) * 100;
                    const cooldownMs = this._getCooldownForDrawdown(drawdownPercent);
                    this.activateCircuitBreaker(
                        `Perda diária de ${drawdownPercent.toFixed(1)}% (limite: ${this.dailyLossPercent}%)`,
                        cooldownMs
                    );
                    return {
                        allowed: false,
                        reason: `Perda diária atingiu ${drawdownPercent.toFixed(1)}% do saldo (limite: ${this.dailyLossPercent}%). Trading pausado.`,
                    };
                }
            }

            // 4. Trades per hour
            const tradesLastHour = await this.getTradesLastHour(userId);
            if (tradesLastHour >= this.maxTradesPerHour) {
                return {
                    allowed: false,
                    reason: `Limite de ${this.maxTradesPerHour} trades/hora atingido. Aguarde.`,
                };
            }

            // 5. Win rate check (floor at 40%)
            if (tradeStats && tradeStats.totalTrades >= this.minTradesForWinRate) {
                if (tradeStats.winRate < this.minWinRate) {
                    this.activateCircuitBreaker(
                        `Win rate muito baixo: ${tradeStats.winRate?.toFixed(1)}%`,
                        7200000 // 2h cooldown for bad win rate
                    );
                    return {
                        allowed: false,
                        reason: `Win rate ${tradeStats.winRate?.toFixed(1)}% < ${this.minWinRate}%. Revise a estratégia.`,
                    };
                }
            }

            return { allowed: true, reason: null };
        } catch (error) {
            console.error('[Safety] Error checking trade permission:', error);
            return { allowed: true, reason: null };
        }
    }

    _getCooldownForDrawdown(drawdownPercent) {
        for (const tier of this.cooldownTiers) {
            if (drawdownPercent >= tier.drawdownPercent) return tier.cooldownMs;
        }
        return this.defaultCooldownMs;
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

    activateCircuitBreaker(reason, cooldownMs) {
        this.isCircuitBreakerActive = true;
        this.circuitBreakerReason = reason;
        this.circuitBreakerActivatedAt = Date.now();
        this.currentCooldownMs = cooldownMs || this.defaultCooldownMs;
        console.log(`[Safety] Circuit breaker: ${reason} (cooldown: ${Math.ceil(this.currentCooldownMs / 60000)}min)`);
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
        if (limits.dailyLossPercent !== undefined) this.dailyLossPercent = limits.dailyLossPercent;
        if (limits.maxTradesPerHour !== undefined) this.maxTradesPerHour = limits.maxTradesPerHour;
        if (limits.minWinRate !== undefined) this.minWinRate = limits.minWinRate;
        if (limits.maxDrawdownPercent !== undefined) this.maxDrawdownPercent = limits.maxDrawdownPercent;
        if (limits.maxConcurrentPositions !== undefined) this.maxConcurrentPositions = limits.maxConcurrentPositions;
    }

    getStatus() {
        return {
            circuitBreakerActive: this.isCircuitBreakerActive,
            circuitBreakerReason: this.circuitBreakerReason,
            limits: {
                dailyLossPercent: this.dailyLossPercent,
                maxTradesPerHour: this.maxTradesPerHour,
                minWinRate: this.minWinRate,
                maxDrawdownPercent: this.maxDrawdownPercent,
                maxConcurrentPositions: this.maxConcurrentPositions,
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
