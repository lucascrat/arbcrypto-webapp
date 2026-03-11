import Constants from 'expo-constants';
import { secureStorage } from '../utils/secureStorage';
import { Platform } from 'react-native';

const getBaseUrl = () => {
    const configUrl = Constants.expoConfig?.extra?.API_URL;
    if (Platform.OS === 'web') {
        // On web, use the current hostname with API port so it works in any environment
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        return `http://${hostname}:3000`;
    }
    return configUrl || 'http://localhost:3000';
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
