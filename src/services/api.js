import Constants from 'expo-constants';
import { secureStorage } from '../utils/secureStorage';
import { Platform } from 'react-native';

// Backend no Coolify (sempre disponível para web e mobile)
const COOLIFY_BACKEND_URL = 'https://b8s0448gcoc0gg84w08gsgco.187.77.230.251.sslip.io';

const getBaseUrl = () => {
    const configUrl = Constants.expoConfig?.extra?.API_URL;
    if (configUrl) return configUrl;
    if (Platform.OS === 'web') {
        // Web sempre usa o backend do Coolify
        return COOLIFY_BACKEND_URL;
    }
    // Mobile local dev fallback
    return 'http://localhost:3000';
};

const BASE_URL = getBaseUrl();

export const apiService = {
    async get(endpoint) {
        const token = await secureStorage.getItemAsync('user_token');
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
            },
        });
        return this.handleResponse(response);
    },

    async post(endpoint, data) {
        const token = await secureStorage.getItemAsync('user_token');
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify(data),
        });
        return this.handleResponse(response);
    },

    async handleResponse(response) {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Erro na requisição');
        }
        return data;
    },
};
