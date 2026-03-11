class BinanceSocketService {
    constructor() {
        this.sockets = {};
        this.callbacks = {};
        this.baseUrl = 'wss://stream.binance.com:9443/ws';
    }

    /**
     * Subscribe to individual symbol ticker
     * @param {string} symbol - Pair name (e.g., BTCUSDT)
     * @param {function} callback - Function called with price updates
     */
    subscribeTicker(symbol, callback) {
        const lowerSymbol = symbol.toLowerCase();
        if (this.sockets[lowerSymbol]) {
            this.callbacks[lowerSymbol] = callback;
            return;
        }

        console.log(`[WebSocket] Subscribing to ${symbol} ticker...`);
        const ws = new WebSocket(`${this.baseUrl}/${lowerSymbol}@ticker`);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // 'c' is the last price in symbol ticker stream
                const price = parseFloat(data.c);
                if (this.callbacks[lowerSymbol]) {
                    this.callbacks[lowerSymbol](price, data);
                }
            } catch (err) {
                console.error(`[WebSocket] Error parsing ${symbol} data:`, err);
            }
        };

        ws.onerror = (err) => {
            console.error(`[WebSocket] Socket error for ${symbol}:`, err);
        };

        ws.onclose = () => {
            console.log(`[WebSocket] Connection closed for ${symbol}`);
            delete this.sockets[lowerSymbol];
        };

        this.sockets[lowerSymbol] = ws;
        this.callbacks[lowerSymbol] = callback;
    }

    /**
     * Unsubscribe from a symbol
     */
    unsubscribeTicker(symbol) {
        const lowerSymbol = symbol.toLowerCase();
        if (this.sockets[lowerSymbol]) {
            this.sockets[lowerSymbol].close();
            delete this.sockets[lowerSymbol];
            delete this.callbacks[lowerSymbol];
        }
    }

    /**
     * Subscribe to multiple symbols for price updates
     */
    subscribePriceUpdates(symbols, callback) {
        symbols.forEach(symbol => {
            this.subscribeTicker(symbol, (price) => {
                callback(symbol, price);
            });
        });
    }

    closeAll() {
        Object.keys(this.sockets).forEach(symbol => {
            this.unsubscribeTicker(symbol);
        });
    }
}

export const binanceSocketService = new BinanceSocketService();
