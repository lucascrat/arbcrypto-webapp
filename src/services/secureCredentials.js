import { secureStorage } from '../utils/secureStorage';

/**
 * 🔒 SECURITY: Secure Credentials Storage
 * Manages encrypted storage of sensitive API credentials
 * - Uses SecureStore on Mobile (iOS/Android)
 * - Uses localStorage on Web/Desktop
 */
class SecureCredentialsService {
    constructor() {
        this.BINANCE_API_KEY = 'binance_api_key';
        this.BINANCE_API_SECRET = 'binance_api_secret';
        this.BINANCE_IS_TESTNET = 'binance_is_testnet';
    }

    async setItem(key, value) {
        await secureStorage.setItemAsync(key, value);
    }

    async getItem(key) {
        return await secureStorage.getItemAsync(key);
    }

    async deleteItem(key) {
        await secureStorage.deleteItemAsync(key);
    }

    /**
     * 🔒 Store Binance credentials securely
     */
    async storeBinanceCredentials(apiKey, apiSecret, isTestnet = false) {
        try {
            await this.setItem(this.BINANCE_API_KEY, apiKey);
            await this.setItem(this.BINANCE_API_SECRET, apiSecret);
            await this.setItem(this.BINANCE_IS_TESTNET, isTestnet.toString());

            console.log('[SecureStore] Binance credentials stored securely');
            return true;
        } catch (error) {
            console.error('[SecureStore] Error storing credentials:', error);
            throw new Error('Falha ao armazenar credenciais de forma segura');
        }
    }

    /**
     * 🔒 Retrieve Binance credentials securely
     */
    async getBinanceCredentials() {
        try {
            const apiKey = await this.getItem(this.BINANCE_API_KEY);
            const apiSecret = await this.getItem(this.BINANCE_API_SECRET);
            const isTestnetStr = await this.getItem(this.BINANCE_IS_TESTNET);

            if (!apiKey || !apiSecret) {
                console.log('[SecureStore] Nenhuma credencial salva — configure nas Configurações');
                return null;
            }

            return {
                apiKey,
                apiSecret,
                isTestnet: isTestnetStr === 'true',
            };
        } catch (error) {
            console.error('[SecureStore] Error retrieving credentials:', error);
            return null;
        }
    }

    /**
     * 🔒 Delete Binance credentials
     */
    async deleteBinanceCredentials() {
        try {
            await this.deleteItem(this.BINANCE_API_KEY);
            await this.deleteItem(this.BINANCE_API_SECRET);
            await this.deleteItem(this.BINANCE_IS_TESTNET);

            console.log('[SecureStore] Binance credentials deleted');
            return true;
        } catch (error) {
            console.error('[SecureStore] Error deleting credentials:', error);
            return false;
        }
    }

    /**
     * 🔒 Check if Binance credentials exist
     */
    async hasBinanceCredentials() {
        try {
            const apiKey = await this.getItem(this.BINANCE_API_KEY);
            const apiSecret = await this.getItem(this.BINANCE_API_SECRET);
            return !!(apiKey && apiSecret);
        } catch (error) {
            return false;
        }
    }

    /**
     * 🔒 Validate Binance API key format
     */
    validateBinanceKey(apiKey, apiSecret) {
        // Binance API keys are 64 characters
        if (!apiKey || apiKey.length !== 64) {
            throw new Error('API Key inválida (deve ter 64 caracteres)');
        }

        // Binance API secrets are 64 characters
        if (!apiSecret || apiSecret.length !== 64) {
            throw new Error('API Secret inválida (deve ter 64 caracteres)');
        }

        return true;
    }

    /**
     * 🔒 Mask API key for display (show first 8 and last 4 chars)
     */
    maskApiKey(apiKey) {
        if (!apiKey || apiKey.length < 12) {
            return '••••••••••••';
        }
        return `${apiKey.substring(0, 8)}${'•'.repeat(48)}${apiKey.substring(60)}`;
    }
}

export const secureCredentialsService = new SecureCredentialsService();
export default secureCredentialsService;
