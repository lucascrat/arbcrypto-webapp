import { apiService } from './api';
import { secureStorage } from '../utils/secureStorage';

class AuthService {
    constructor() {
        this.currentUser = null;
    }

    async signUp(email, password, metadata = {}) {
        try {
            const data = await apiService.post('/auth/register', {
                email,
                password,
                full_name: metadata.full_name
            });

            if (data.token) {
                await secureStorage.setItemAsync('user_token', data.token);
                await secureStorage.setItemAsync('user_data', JSON.stringify(data.user));
                this.currentUser = data.user;
            }

            return { user: data.user, session: { user: data.user }, token: data.token };
        } catch (error) {
            console.error('[Auth] Sign up error:', error);
            throw error;
        }
    }

    async signIn(email, password) {
        try {
            const data = await apiService.post('/auth/login', { email, password });

            if (data.token) {
                await secureStorage.setItemAsync('user_token', data.token);
                await secureStorage.setItemAsync('user_data', JSON.stringify(data.user));
                this.currentUser = data.user;
            }

            return { user: data.user, session: { user: data.user }, token: data.token };
        } catch (error) {
            console.error('[Auth] Sign in error:', error);
            throw error;
        }
    }

    async signOut() {
        await secureStorage.deleteItemAsync('user_token');
        await secureStorage.deleteItemAsync('user_data');
        this.currentUser = null;
        return true;
    }

    async getCurrentUser() {
        if (this.currentUser) return this.currentUser;
        const userData = await secureStorage.getItemAsync('user_data');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            return this.currentUser;
        }
        return null;
    }

    async restoreSession() {
        try {
            const user = await this.getCurrentUser();
            if (!user) return null;

            // Valida o token contra o backend — se expirado ou inválido, limpa sessão
            const { apiService } = require('./api');
            try {
                const profile = await apiService.get('/api/me');
                if (profile?.id) {
                    // Token ainda válido — atualiza dados do usuário
                    const updatedUser = { ...user, ...profile };
                    this.currentUser = updatedUser;
                    await secureStorage.setItemAsync('user_data', JSON.stringify(updatedUser));
                    return { user: updatedUser };
                }
            } catch (apiError) {
                // Token inválido ou expirado — limpa sessão e força novo login
                console.log('[Auth] Token inválido/expirado, limpando sessão');
                await this.signOut();
                return null;
            }

            return { user };
        } catch (error) {
            console.error('[Auth] restoreSession error:', error);
            return null;
        }
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getUserId() {
        return this.currentUser?.id || null;
    }
}

export const authService = new AuthService();
export default authService;
