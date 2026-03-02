// Currency conversion and formatting utilities

// Exchange rates (base: USD)
// Note: These are approximate rates. In production, consider using a real-time API
export const EXCHANGE_RATES = {
    USD: 1,
    IDR: 15800,      // 1 USD = 15,800 IDR
    VND: 24500       // 1 USD = 24,500 VND
};

// Currency symbols and formatting
export const CURRENCY_CONFIG = {
    USD: {
        symbol: '$',
        position: 'prefix',
        decimals: 2,
        thousandSeparator: ',',
        decimalSeparator: '.',
        format: (value) => `$${formatNumber(value, 2, ',', '.')}`
    },
    IDR: {
        symbol: 'Rp',
        position: 'prefix',
        decimals: 0,
        thousandSeparator: '.',
        decimalSeparator: ',',
        format: (value) => `Rp ${formatNumber(value, 0, '.', ',')}`
    },
    VND: {
        symbol: '₫',
        position: 'suffix',
        decimals: 0,
        thousandSeparator: ',',
        decimalSeparator: '.',
        format: (value) => `${formatNumber(value, 0, ',', '.')} ₫`
    }
};

// Helper function to format numbers with thousand separators
function formatNumber(value, decimals, thousandSep, decimalSep) {
    if (value === null || value === undefined || isNaN(value)) return '0';
    
    const num = Number(value);
    const fixed = num.toFixed(decimals);
    const parts = fixed.split('.');
    
    // Add thousand separators
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
    
    // Join with decimal separator if there are decimals
    return decimals > 0 && parts[1] ? parts.join(decimalSep) : parts[0];
}

/**
 * Convert amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code (USD, IDR, VND)
 * @param {string} toCurrency - Target currency code (USD, IDR, VND)
 * @returns {number} Converted amount
 */
export function convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    
    // Convert to USD first (base currency)
    const amountInUSD = amount / EXCHANGE_RATES[fromCurrency];
    
    // Convert from USD to target currency
    return amountInUSD * EXCHANGE_RATES[toCurrency];
}

/**
 * Format amount in specified currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (USD, IDR, VND)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
    const config = CURRENCY_CONFIG[currency];
    if (!config) return `${amount}`;
    
    return config.format(amount);
}

/**
 * Format amount with million/billion suffix
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (USD, IDR, VND)
 * @returns {string} Formatted currency string with suffix
 */
export function formatCurrencyMillion(amount, currency = 'USD') {
    const config = CURRENCY_CONFIG[currency];
    if (!config) return `${amount}`;
    
    const absAmount = Math.abs(amount);
    let value, suffix;
    
    if (absAmount >= 1000000000) {
        value = amount / 1000000000;
        suffix = 'B';
    } else if (absAmount >= 1000000) {
        value = amount / 1000000;
        suffix = 'M';
    } else if (absAmount >= 1000) {
        value = amount / 1000;
        suffix = 'K';
    } else {
        return config.format(amount);
    }
    
    const formatted = formatNumber(value, 2, config.thousandSeparator, config.decimalSeparator);
    
    if (config.position === 'prefix') {
        return `${config.symbol}${formatted}${suffix}`;
    } else {
        return `${formatted}${suffix} ${config.symbol}`;
    }
}

/**
 * Get currency symbol
 * @param {string} currency - Currency code (USD, IDR, VND)
 * @returns {string} Currency symbol
 */
export function getCurrencySymbol(currency = 'USD') {
    return CURRENCY_CONFIG[currency]?.symbol || '$';
}

/**
 * Convert all financial values in an object from one currency to another
 * @param {object} data - Object containing financial values
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @param {array} excludeKeys - Keys to exclude from conversion
 * @returns {object} Object with converted values
 */
export function convertObjectCurrency(data, fromCurrency, toCurrency, excludeKeys = []) {
    if (fromCurrency === toCurrency) return data;
    
    const converted = { ...data };
    
    for (const key in converted) {
        if (excludeKeys.includes(key)) continue;
        
        const value = converted[key];
        
        // Convert numbers
        if (typeof value === 'number' && !isNaN(value)) {
            converted[key] = convertCurrency(value, fromCurrency, toCurrency);
        }
        // Recursively convert nested objects
        else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            converted[key] = convertObjectCurrency(value, fromCurrency, toCurrency, excludeKeys);
        }
        // Convert arrays of numbers or objects
        else if (Array.isArray(value)) {
            converted[key] = value.map(item => {
                if (typeof item === 'number' && !isNaN(item)) {
                    return convertCurrency(item, fromCurrency, toCurrency);
                } else if (typeof item === 'object' && item !== null) {
                    return convertObjectCurrency(item, fromCurrency, toCurrency, excludeKeys);
                }
                return item;
            });
        }
    }
    
    return converted;
}

/**
 * Get exchange rate between two currencies
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {number} Exchange rate
 */
export function getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1;
    return EXCHANGE_RATES[toCurrency] / EXCHANGE_RATES[fromCurrency];
}
