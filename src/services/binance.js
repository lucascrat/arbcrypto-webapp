import { APP_CONFIG } from '../constants/config';
import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';

// Proxy backend para resolver CORS no webapp
const PROXY_URL = 'https://b8s0448gcoc0gg84w08gsgco.187.77.230.251.sslip.io/binance/proxy';

class BinanceService {
    constructor() {
        this.apiKey = null;
        this.apiSecret = null;
        this.isTestnet = false;
        this.serverTimeOffset = 0;
        this.exchangeInfo = {};
        this.futuresExchangeInfo = {};
        // Rate limiting: max 8 requests per second to avoid Binance bans
        this._requestQueue = [];
        this._requestTimestamps = [];
        this._maxRequestsPerSecond = 8;
        this._lastTimeSyncAt = 0;
    }

    /**
     * Rate limiter: ensures max N requests per second
     */
    async _rateLimit() {
        const now = Date.now();
        // Remove timestamps older than 1 second
        this._requestTimestamps = this._requestTimestamps.filter(t => now - t < 1000);
        if (this._requestTimestamps.length >= this._maxRequestsPerSecond) {
            const oldestInWindow = this._requestTimestamps[0];
            const waitMs = 1000 - (now - oldestInWindow) + 10;
            if (waitMs > 0) await new Promise(r => setTimeout(r, waitMs));
        }
        this._requestTimestamps.push(Date.now());
    }

    setCredentials(apiKey, apiSecret, isTestnet = false) {
        this.apiKey = apiKey?.trim();
        this.apiSecret = apiSecret?.trim();
        this.isTestnet = !!isTestnet;
    }

    get baseUrl() {
        if (this.isTestnet) return 'https://testnet.binance.vision';
        return 'https://api.binance.com';
    }

    get futuresBaseUrl() {
        if (this.isTestnet) return 'https://testnet.binancefuture.com';
        return 'https://fapi.binance.com';
    }

    async generateSignature(queryString) {
        if (!this.apiSecret) return '';
        return CryptoJS.HmacSHA256(queryString, this.apiSecret).toString(CryptoJS.enc.Hex);
    }

    async getTimestamp() {
        return Math.floor(Date.now() + this.serverTimeOffset);
    }

    async syncServerTime() {
        try {
            const before = Date.now();
            const serverTime = await this.getServerTime();
            const after = Date.now();
            const latency = (after - before) / 2;
            this.serverTimeOffset = serverTime - (after - latency);
            console.log(`[Binance] Time synced. Offset: ${this.serverTimeOffset}ms`);
        } catch (error) {
            console.error('[Binance] Time sync failed:', error);
            this.serverTimeOffset = 0;
        }
    }

    async makeSignedRequest(endpoint, params = {}, method = 'GET', type = 'SPOT') {
        if (!this.apiKey || !this.apiSecret) {
            throw new Error('Chaves da API não configuradas.');
        }

        await this._rateLimit();

        // Re-sync time every hour to prevent clock drift
        if (this.serverTimeOffset === 0 || Date.now() - this._lastTimeSyncAt > 3600000) {
            await this.syncServerTime();
            this._lastTimeSyncAt = Date.now();
        }

        const timestamp = await this.getTimestamp();
        const queryParams = {
            ...params,
            timestamp,
            recvWindow: 60000
        };

        const queryString = Object.entries(queryParams)
            .map(([k, v]) => `${k}=${v}`)
            .join('&');

        const signature = await this.generateSignature(queryString);
        const finalQueryString = `${queryString}&signature=${signature}`;

        const baseUrl = type === 'FUTURES' ? this.futuresBaseUrl : this.baseUrl;
        const url = `${baseUrl}${endpoint}${method === 'GET' || method === 'DELETE' ? '?' + finalQueryString : ''}`;

        const options = {
            method,
            headers: {
                'X-MBX-APIKEY': this.apiKey,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        };

        if (method === 'POST' || method === 'PUT') {
            options.body = finalQueryString;
        }

        try {
            console.log(`[Binance] ${type} Request: ${method} ${endpoint}`);

            let response;
            if (Platform.OS === 'web') {
                // No web usa proxy para evitar CORS
                response = await fetch(PROXY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url,
                        method,
                        headers: options.headers,
                        body: options.body,
                    }),
                });
            } else {
                response = await fetch(url, options);
            }

            const result = await response.json();

            if (!response.ok) {
                console.error(`[Binance API Error] ${endpoint}:`, result);
                if (result.code === -2015) {
                    throw new Error('Chave API Inválida, IP não autorizado ou falta de permissão.');
                }
                if (result.code === -1021) {
                    await this.syncServerTime();
                    throw new Error('Erro de Sincronização de Tempo. Tente novamente.');
                }
                throw new Error(result.msg || `Erro ${result.code}`);
            }

            return result;
        } catch (error) {
            console.error('[Binance Request Error]:', error);
            throw error;
        }
    }

    async makePublicRequest(endpoint, params = {}, type = 'SPOT') {
        await this._rateLimit();
        const queryString = Object.entries(params)
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join('&');

        const baseUrl = type === 'FUTURES' ? this.futuresBaseUrl : this.baseUrl;
        const url = `${baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;

        try {
            let response;
            if (Platform.OS === 'web') {
                response = await fetch(PROXY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, method: 'GET', headers: {} }),
                });
            } else {
                response = await fetch(url);
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.msg || 'Erro na API pública');
            }

            return result;
        } catch (error) {
            console.error('[Binance Public Error]:', error);
            throw error;
        }
    }

    // ===== EXCHANGE INFO (CRITICAL for real trading) =====
    async getExchangeInfo(symbol = null) {
        const params = symbol ? { symbol } : {};
        const data = await this.makePublicRequest('/api/v3/exchangeInfo', params);

        for (const s of data.symbols) {
            const filters = {};
            for (const f of s.filters) {
                filters[f.filterType] = f;
            }
            this.exchangeInfo[s.symbol] = {
                baseAsset: s.baseAsset,
                quoteAsset: s.quoteAsset,
                status: s.status,
                stepSize: parseFloat(filters.LOT_SIZE?.stepSize || '0.00001'),
                minQty: parseFloat(filters.LOT_SIZE?.minQty || '0.00001'),
                maxQty: parseFloat(filters.LOT_SIZE?.maxQty || '99999'),
                tickSize: parseFloat(filters.PRICE_FILTER?.tickSize || '0.01'),
                minPrice: parseFloat(filters.PRICE_FILTER?.minPrice || '0.01'),
                minNotional: parseFloat(filters.MIN_NOTIONAL?.minNotional || filters.NOTIONAL?.minNotional || '10'),
            };
        }

        console.log(`[Binance] Exchange info loaded for ${data.symbols.length} symbols`);
        return this.exchangeInfo;
    }

    async getFuturesExchangeInfo() {
        const data = await this.makePublicRequest('/fapi/v1/exchangeInfo', {}, 'FUTURES');
        for (const s of data.symbols) {
            const filters = {};
            for (const f of s.filters) {
                filters[f.filterType] = f;
            }
            this.futuresExchangeInfo[s.symbol] = {
                baseAsset: s.baseAsset,
                quoteAsset: s.quoteAsset,
                status: s.status,
                stepSize: parseFloat(filters.LOT_SIZE?.stepSize || '0.001'),
                tickSize: parseFloat(filters.PRICE_FILTER?.tickSize || '0.01'),
                minQty: parseFloat(filters.LOT_SIZE?.minQty || '0.001'),
                pair: s.pair,
                contractType: s.contractType
            };
        }
        return this.futuresExchangeInfo;
    }

    async setLeverage(symbol, leverage) {
        console.log(`[Binance Futures] Setting leverage for ${symbol} to ${leverage}x`);
        return this.makeSignedRequest('/fapi/v1/leverage', {
            symbol,
            leverage
        }, 'POST', 'FUTURES');
    }

    async setMarginType(symbol, marginType = 'ISOLATED') {
        try {
            console.log(`[Binance Futures] Setting margin type for ${symbol} to ${marginType}`);
            return await this.makeSignedRequest('/fapi/v1/marginType', {
                symbol,
                marginType
            }, 'POST', 'FUTURES');
        } catch (e) {
            if (e.message.includes('No need to change margin type')) {
                return { code: 200, msg: 'Already set' };
            }
            throw e;
        }
    }

    async getFuturesAccountInfo() {
        return this.makeSignedRequest('/fapi/v2/account', {}, 'GET', 'FUTURES');
    }

    async getFuturesPositionRisk(symbol = null) {
        const params = symbol ? { symbol } : {};
        return this.makeSignedRequest('/fapi/v2/positionRisk', params, 'GET', 'FUTURES');
    }

    async createFuturesOrder(symbol, side, type, quantity, price = null, params = {}) {
        const orderParams = {
            symbol,
            side,
            type,
            quantity: this.formatQuantity(symbol, quantity),
            ...params
        };

        if (price) {
            orderParams.price = this.formatPrice(symbol, price);
            orderParams.timeInForce = 'GTC';
        }

        console.log(`[Binance Futures] Creating Order: ${side} ${symbol}`, orderParams);
        return this.makeSignedRequest('/fapi/v1/order', orderParams, 'POST', 'FUTURES');
    }

    getSymbolInfo(symbol) {
        return this.exchangeInfo[symbol] || null;
    }

    formatQuantity(symbol, quantity) {
        const info = this.exchangeInfo[symbol] || this.futuresExchangeInfo[symbol];
        if (!info) return quantity.toString();

        const stepSize = info.stepSize;
        const precision = stepSize > 0 ? Math.max(0, Math.ceil(-Math.log10(stepSize))) : 8;
        const factor = Math.pow(10, precision);
        const formatted = Math.floor(quantity * factor) / factor;
        return formatted.toFixed(precision);
    }

    formatPrice(symbol, price) {
        const info = this.exchangeInfo[symbol] || this.futuresExchangeInfo[symbol];
        if (!info) return price.toFixed(2);

        const tickSize = info.tickSize;
        const precision = tickSize > 0 ? Math.max(0, Math.ceil(-Math.log10(tickSize))) : 2;
        const factor = Math.pow(10, precision);
        const formatted = Math.floor(price * factor) / factor;
        return formatted.toFixed(precision);
    }

    // Account endpoints
    async getAccountInfo() {
        return this.makeSignedRequest('/api/v3/account');
    }

    async getBalance() {
        const account = await this.getAccountInfo();
        console.log('[Binance] Raw Account Info fetched');

        const filteredBalances = account.balances
            .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
            .map(b => ({
                asset: b.asset,
                free: parseFloat(b.free),
                locked: parseFloat(b.locked),
                total: parseFloat(b.free) + parseFloat(b.locked),
            }));

        console.log(`[Binance] Found ${filteredBalances.length} assets with balance`);
        return filteredBalances;
    }

    // Trading endpoints
    async createMarketBuy(symbol, quantity = null, quoteOrderQty = null) {
        const params = {
            symbol,
            side: 'BUY',
            type: 'MARKET',
        };

        if (quoteOrderQty) {
            const info = this.exchangeInfo[symbol];
            const precision = info ? Math.max(0, Math.ceil(-Math.log10(info.tickSize))) : 2;
            params.quoteOrderQty = parseFloat(quoteOrderQty).toFixed(precision);
        } else if (quantity) {
            params.quantity = this.formatQuantity(symbol, quantity);
        }

        console.log(`[Binance] Market BUY ${symbol}:`, params);
        return this.makeSignedRequest('/api/v3/order', params, 'POST');
    }

    async createMarketSell(symbol, quantity) {
        const formattedQty = this.formatQuantity(symbol, quantity);
        console.log(`[Binance] Market SELL ${symbol}: qty=${formattedQty}`);

        return this.makeSignedRequest('/api/v3/order', {
            symbol,
            side: 'SELL',
            type: 'MARKET',
            quantity: formattedQty,
        }, 'POST');
    }

    async createLimitBuy(symbol, quantity, price) {
        return this.makeSignedRequest('/api/v3/order', {
            symbol,
            side: 'BUY',
            type: 'LIMIT',
            timeInForce: 'GTC',
            quantity: this.formatQuantity(symbol, quantity),
            price: this.formatPrice(symbol, price),
        }, 'POST');
    }

    async createLimitSell(symbol, quantity, price) {
        return this.makeSignedRequest('/api/v3/order', {
            symbol,
            side: 'SELL',
            type: 'LIMIT',
            timeInForce: 'GTC',
            quantity: this.formatQuantity(symbol, quantity),
            price: this.formatPrice(symbol, price),
        }, 'POST');
    }

    // Open Orders
    async getOpenOrders(symbol = null) {
        const params = symbol ? { symbol } : {};
        return this.makeSignedRequest('/api/v3/openOrders', params);
    }

    async cancelOrder(symbol, orderId) {
        return this.makeSignedRequest('/api/v3/order', {
            symbol,
            orderId,
        }, 'DELETE');
    }

    // Recent trades for a symbol
    async getMyTrades(symbol, limit = 10) {
        return this.makeSignedRequest('/api/v3/myTrades', { symbol, limit });
    }

    // Market data
    async getPrice(symbol) {
        const data = await this.makePublicRequest('/api/v3/ticker/price', { symbol });
        return parseFloat(data.price);
    }

    async getAllPrices() {
        return this.makePublicRequest('/api/v3/ticker/price');
    }

    async get24hTicker(symbol) {
        return this.makePublicRequest('/api/v3/ticker/24hr', { symbol });
    }

    async getKlines(symbol, interval = '15m', limit = 100) {
        const data = await this.makePublicRequest('/api/v3/klines', {
            symbol,
            interval,
            limit,
        });

        return data.map(k => ({
            openTime: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
            closeTime: k[6],
        }));
    }

    // ===== ORDERBOOK (bid/ask imbalance) =====
    async getOrderBook(symbol, limit = 20) {
        const data = await this.makePublicRequest('/api/v3/depth', { symbol, limit });
        const bidVolume = data.bids.reduce((sum, [, qty]) => sum + parseFloat(qty), 0);
        const askVolume = data.asks.reduce((sum, [, qty]) => sum + parseFloat(qty), 0);
        const ratio = askVolume > 0 ? bidVolume / askVolume : 1;
        return {
            bidVolume,
            askVolume,
            ratio, // > 1.5 = buy pressure, < 0.67 = sell pressure
            bids: data.bids.slice(0, 5),
            asks: data.asks.slice(0, 5),
        };
    }

    // ===== FUTURES: FUNDING RATE =====
    async getFundingRate(symbol) {
        try {
            const data = await this.makePublicRequest('/fapi/v1/fundingRate', { symbol, limit: 1 }, 'FUTURES');
            const latest = Array.isArray(data) ? data[data.length - 1] : data;
            return parseFloat(latest?.fundingRate || 0);
        } catch (e) {
            console.warn('[Binance] Funding rate fetch failed:', e.message);
            return 0;
        }
    }

    // ===== FUTURES: Close Position =====
    async closeFuturesPosition(symbol, positionAmt) {
        const qty = Math.abs(positionAmt);
        const side = positionAmt > 0 ? 'SELL' : 'BUY'; // Close long = SELL, close short = BUY
        return this.createFuturesOrder(symbol, side, 'MARKET', qty, null, { reduceOnly: 'true' });
    }

    // ===== FUTURES: Place SL/TP Orders =====
    async setFuturesSLTP(symbol, side, stopPrice, takeProfitPrice, quantity) {
        const closeSide = side === 'BUY' ? 'SELL' : 'BUY';
        const results = [];

        if (stopPrice) {
            try {
                const sl = await this.createFuturesOrder(symbol, closeSide, 'STOP_MARKET', quantity, null, {
                    stopPrice: this.formatPrice(symbol, stopPrice),
                    reduceOnly: 'true',
                    workingType: 'MARK_PRICE',
                });
                results.push({ type: 'STOP_LOSS', order: sl });
            } catch (e) {
                console.warn('[Binance] SL order failed:', e.message);
            }
        }

        if (takeProfitPrice) {
            try {
                const tp = await this.createFuturesOrder(symbol, closeSide, 'TAKE_PROFIT_MARKET', quantity, null, {
                    stopPrice: this.formatPrice(symbol, takeProfitPrice),
                    reduceOnly: 'true',
                    workingType: 'MARK_PRICE',
                });
                results.push({ type: 'TAKE_PROFIT', order: tp });
            } catch (e) {
                console.warn('[Binance] TP order failed:', e.message);
            }
        }

        return results;
    }

    // Connectivity
    async ping() {
        return this.makePublicRequest('/api/v3/ping');
    }

    async getServerTime() {
        const data = await this.makePublicRequest('/api/v3/time');
        return data.serverTime;
    }

    async testConnection() {
        try {
            await this.ping();
            if (this.apiKey && this.apiSecret) {
                await this.getAccountInfo();
                return { success: true, message: 'Binance Conectada! ✅' };
            }
            return { success: true, message: 'Sistema Online. Configure suas chaves.' };
        } catch (error) {
            let userMessage = error.message;
            if (error.message.includes('Invalid API-key')) {
                userMessage = "Erro: API Key/Secret inválida, IP não liberado ou falta de permissão 'Spot Trading'.";
            }
            return { success: false, message: userMessage };
        }
    }
}

export const binanceService = new BinanceService();
export default binanceService;
