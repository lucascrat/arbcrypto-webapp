import { apiService } from './api';

// ===== USER SETTINGS =====
export const userSettingsService = {
    async get() {
        try {
            return await apiService.get('/api/settings');
        } catch (e) {
            console.warn('[data] settings get failed:', e.message);
            return {};
        }
    },

    async upsert(settings) {
        try {
            return await apiService.post('/api/settings', { settings });
        } catch (e) {
            console.warn('[data] settings upsert failed:', e.message);
            return settings;
        }
    },
};

// ===== TRADES =====
export const tradesService = {
    async getAll() {
        try {
            return await apiService.get('/api/trades');
        } catch (e) {
            console.warn('[data] trades getAll failed:', e.message);
            return [];
        }
    },

    async create(trade) {
        try {
            return await apiService.post('/api/trades', trade);
        } catch (e) {
            console.warn('[data] trade create failed:', e.message);
            return null;
        }
    },

    async getStats() {
        try {
            const stats = await apiService.get('/api/stats');
            // Normalize field names so UI always sees profitableTrades / losingTrades
            return {
                ...stats,
                profitableTrades: stats.profitableTrades ?? stats.wins ?? 0,
                losingTrades: stats.losingTrades ?? stats.losses ?? 0,
            };
        } catch (e) {
            // Fallback: compute locally from trade list
            try {
                const trades = await this.getAll();
                const totalTrades = trades.length;
                const wins = trades.filter(t => parseFloat(t.profit_loss || 0) > 0).length;
                const losses = trades.filter(t => parseFloat(t.profit_loss || 0) < 0).length;
                const totalPnL = trades.reduce((sum, t) => sum + (parseFloat(t.profit_loss) || 0), 0);
                const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
                return {
                    totalTrades, wins, losses,
                    profitableTrades: wins, losingTrades: losses,
                    winRate, totalPnL,
                    avgPnL: totalTrades > 0 ? totalPnL / totalTrades : 0,
                };
            } catch {
                return { totalTrades: 0, wins: 0, losses: 0, profitableTrades: 0, losingTrades: 0, winRate: 0, totalPnL: 0, avgPnL: 0 };
            }
        }
    },

    async getAvgBuyPrice(symbol) {
        try {
            const data = await apiService.get(`/api/trades/avg-buy/${symbol}`);
            return parseFloat(data.avg_price) || 0;
        } catch (e) {
            return 0;
        }
    },
};

// ===== SIGNALS — persisted locally in memory (no dedicated table yet) =====
let _signals = [];

export const signalsService = {
    async create(signal) {
        try {
            _signals = [{ ...signal, id: Date.now(), created_at: new Date().toISOString() }, ..._signals].slice(0, 100);
            return _signals[0];
        } catch (e) {
            return null;
        }
    },

    async getRecent() {
        return _signals.slice(0, 30);
    },
};

// ===== BALANCE SNAPSHOTS — local tracking only =====
let _balanceSnapshots = [];

export const balanceService = {
    async saveSnapshot(userId, data) {
        _balanceSnapshots = [{ ...data, ts: Date.now() }, ..._balanceSnapshots].slice(0, 48); // keep 48 snapshots
        return data;
    },

    getHistory() {
        return _balanceSnapshots;
    },
};

// ===== PORTFOLIO =====
export const portfolioService = {
    async getAll() {
        return [];
    },
};

// ===== STRATEGIES — static definitions =====
export const strategiesService = {
    async getAll() {
        return [
            { id: 'ai_auto', name: 'AI Auto', description: 'Análise completa com IA (padrão)' },
            { id: 'trend_follow', name: 'Trend Follow', description: 'EMA + ADX trend following' },
            { id: 'reversal', name: 'Reversal', description: 'RSI + Stoch RSI reversals' },
        ];
    },
};

// ===== LOGS =====
let _logs = [];

export const logsService = {
    async create(userId, type, data, success = true, error = null) {
        const entry = {
            id: Date.now(),
            type,
            data,
            success,
            error,
            ts: new Date().toISOString(),
        };
        _logs = [entry, ..._logs].slice(0, 200);
        return entry;
    },

    getLogs() {
        return _logs;
    },
};
