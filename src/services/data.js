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
            return {
                ...stats,
                profitableTrades: stats.profitableTrades ?? stats.wins ?? 0,
                losingTrades: stats.losingTrades ?? stats.losses ?? 0,
            };
        } catch (e) {
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

// ===== SIGNALS — persisted to backend DB =====
export const signalsService = {
    async create(signal) {
        try {
            return await apiService.post('/api/signals', signal);
        } catch (e) {
            console.warn('[data] signal create failed:', e.message);
            return null;
        }
    },

    async getRecent(userId, limit = 30) {
        try {
            return await apiService.get(`/api/signals?limit=${limit}`);
        } catch (e) {
            console.warn('[data] signals getRecent failed:', e.message);
            return [];
        }
    },
};

// ===== BALANCE SNAPSHOTS — persisted to backend DB =====
export const balanceService = {
    async saveSnapshot(userId, data) {
        try {
            return await apiService.post('/api/balance-snapshot', {
                total_balance: data.total_balance_usdt || 0,
                spot_balance: data.spot_balance || 0,
                futures_balance: data.futures_balance || 0,
            });
        } catch (e) {
            console.warn('[data] balance snapshot failed:', e.message);
            return null;
        }
    },

    async getHistory(limit = 200) {
        try {
            return await apiService.get(`/api/balance-history?limit=${limit}`);
        } catch (e) {
            console.warn('[data] balance history failed:', e.message);
            return [];
        }
    },
};

// ===== OPEN POSITIONS (persistence) =====
export const openPositionsService = {
    async getOpen() {
        try {
            return await apiService.get('/api/positions/open');
        } catch (e) {
            console.warn('[data] open positions get failed:', e.message);
            return [];
        }
    },

    async save(position) {
        try {
            return await apiService.post('/api/positions/open', position);
        } catch (e) {
            console.warn('[data] open position save failed:', e.message);
            return null;
        }
    },

    async close(symbol, closeData) {
        try {
            return await apiService.post('/api/positions/close', { symbol, ...closeData });
        } catch (e) {
            console.warn('[data] position close failed:', e.message);
            return null;
        }
    },

    async getHistory(limit = 50) {
        try {
            return await apiService.get(`/api/positions/history?limit=${limit}`);
        } catch (e) {
            console.warn('[data] position history failed:', e.message);
            return [];
        }
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
            { id: 'ai_auto', name: 'AI Auto', description: 'Analise completa com IA (padrao)' },
            { id: 'trend_follow', name: 'Trend Follow', description: 'EMA + ADX trend following' },
            { id: 'reversal', name: 'Reversal', description: 'RSI + Stoch RSI reversals' },
        ];
    },
};

// ===== BOT LOGS — persisted to backend DB =====
// Keeps in-memory buffer + periodically flushes to backend
let _pendingLogs = [];
let _flushTimer = null;

export const logsService = {
    async create(userId, type, data, success = true, error = null) {
        const entry = {
            message: `[${type}] ${error || JSON.stringify(data).slice(0, 200)}`,
            log_type: success ? 'info' : 'error',
        };
        _pendingLogs.push(entry);

        // Flush every 10 logs or after 30s
        if (_pendingLogs.length >= 10) {
            this._flush();
        } else if (!_flushTimer) {
            _flushTimer = setTimeout(() => this._flush(), 30000);
        }
        return entry;
    },

    async saveBotLog(message, type = 'info') {
        _pendingLogs.push({ message, log_type: type });
        if (_pendingLogs.length >= 10) {
            this._flush();
        } else if (!_flushTimer) {
            _flushTimer = setTimeout(() => this._flush(), 30000);
        }
    },

    async _flush() {
        if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
        if (_pendingLogs.length === 0) return;

        const batch = _pendingLogs.splice(0, 50);
        try {
            await apiService.post('/api/bot-logs/batch', { logs: batch });
        } catch (e) {
            // Put back on failure (will retry next flush)
            _pendingLogs.unshift(...batch);
            console.warn('[data] bot logs flush failed:', e.message);
        }
    },

    async getRecent(limit = 100) {
        try {
            return await apiService.get(`/api/bot-logs?limit=${limit}`);
        } catch (e) {
            console.warn('[data] bot logs getRecent failed:', e.message);
            return [];
        }
    },

    getLogs() {
        return [];
    },
};
