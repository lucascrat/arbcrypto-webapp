import { Platform } from 'react-native';

/**
 * Cross-platform secure storage.
 * - Native (iOS/Android): uses expo-secure-store (encrypted)
 * - Web: uses localStorage (not encrypted, but functional)
 *
 * expo-secure-store v15 on web throws "getValueWithKeyAsync is not a function"
 * so we need this wrapper.
 */

let SecureStore = null;

if (Platform.OS !== 'web') {
    // Only import on native platforms
    SecureStore = require('expo-secure-store');
}

export const secureStorage = {
    async getItemAsync(key) {
        if (Platform.OS === 'web') {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                console.warn('[SecureStorage] Web getItem error:', e);
                return null;
            }
        }
        return SecureStore.getItemAsync(key);
    },

    async setItemAsync(key, value) {
        if (Platform.OS === 'web') {
            try {
                localStorage.setItem(key, value);
                return;
            } catch (e) {
                console.warn('[SecureStorage] Web setItem error:', e);
                return;
            }
        }
        return SecureStore.setItemAsync(key, value);
    },

    async deleteItemAsync(key) {
        if (Platform.OS === 'web') {
            try {
                localStorage.removeItem(key);
                return;
            } catch (e) {
                console.warn('[SecureStorage] Web deleteItem error:', e);
                return;
            }
        }
        return SecureStore.deleteItemAsync(key);
    },
};

export default secureStorage;
