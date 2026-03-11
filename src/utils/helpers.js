import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Format currency
export function formatCurrency(value, currency = 'USD', decimals = 2) {
    if (value === null || value === undefined) return '-';

    const formatter = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

    return formatter.format(value);
}

// Format crypto amount
export function formatCryptoAmount(value, decimals = 8) {
    if (value === null || value === undefined) return '-';

    const num = parseFloat(value);
    if (num === 0) return '0';

    // Adjust decimals based on value size
    if (num >= 1) {
        decimals = Math.min(decimals, 4);
    } else if (num >= 0.0001) {
        decimals = Math.min(decimals, 6);
    }

    return num.toFixed(decimals).replace(/\.?0+$/, '');
}

// Format percentage
export function formatPercent(value, decimals = 2) {
    if (value === null || value === undefined) return '-';

    const sign = value >= 0 ? '+' : '';
    return `${sign}${parseFloat(value).toFixed(decimals)}%`;
}

// Format large numbers (1K, 1M, 1B)
export function formatLargeNumber(value) {
    if (value === null || value === undefined) return '-';

    const num = parseFloat(value);

    if (num >= 1e9) {
        return `${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
        return `${(num / 1e6).toFixed(2)}M`;
    } else if (num >= 1e3) {
        return `${(num / 1e3).toFixed(2)}K`;
    }

    return num.toFixed(2);
}

// Format date
export function formatDate(date, formatStr = 'dd/MM/yyyy HH:mm') {
    if (!date) return '-';

    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;
        return format(dateObj, formatStr, { locale: ptBR });
    } catch {
        return '-';
    }
}

// Format relative time
export function formatRelativeTime(date) {
    if (!date) return '-';

    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;
        return formatDistanceToNow(dateObj, { addSuffix: true, locale: ptBR });
    } catch {
        return '-';
    }
}

// Validate Binance API Key format
export function isValidApiKey(key) {
    return key && typeof key === 'string' && key.length === 64;
}

// Mask sensitive data
export function maskApiKey(key) {
    if (!key || key.length < 12) return '****';
    return key.substring(0, 6) + '****' + key.substring(key.length - 4);
}

// Calculate percentage change
export function calculatePercentChange(oldValue, newValue) {
    if (!oldValue || oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
}

// Debounce function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

// Generate unique ID
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Deep clone object
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Calculate profit/loss
export function calculatePnL(entryPrice, currentPrice, quantity, side = 'BUY') {
    const priceDiff = currentPrice - entryPrice;
    const pnl = side === 'BUY' ? priceDiff * quantity : -priceDiff * quantity;
    const pnlPercent = (priceDiff / entryPrice) * 100 * (side === 'BUY' ? 1 : -1);

    return {
        pnl,
        pnlPercent,
        isProfit: pnl >= 0,
    };
}

// Color for PnL
export function getPnLColor(value, colors) {
    if (value > 0) return colors.success;
    if (value < 0) return colors.danger;
    return colors.textSecondary;
}

// Sleep utility
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry with exponential backoff
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                await sleep(baseDelay * Math.pow(2, i));
            }
        }
    }

    throw lastError;
}

// Parse error message
export function parseErrorMessage(error) {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.msg) return error.msg;
    return 'Erro desconhecido ocorreu';
}

// Validate quantity for trading
export function validateTradeQuantity(quantity, minQty, maxQty, stepSize) {
    if (quantity < minQty) {
        return { valid: false, error: `Quantidade mínima: ${minQty}` };
    }
    if (quantity > maxQty) {
        return { valid: false, error: `Quantidade máxima: ${maxQty}` };
    }

    const precision = stepSize.toString().split('.')[1]?.length || 0;
    const adjustedQty = Math.floor(quantity / stepSize) * stepSize;

    return {
        valid: true,
        adjustedQuantity: parseFloat(adjustedQty.toFixed(precision)),
    };
}
