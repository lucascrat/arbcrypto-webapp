import { supabase } from './supabase';
import { secureStorage } from '../utils/secureStorage';

/**
 * 🔒 SECURITY: Simple Authentication Service
 * Uses custom arbcrypto.users table instead of Supabase Auth
 */
class SimpleAuthService {
    constructor() {
        this.currentUser = null;
    }

    /**
     * Register a new user
     */
    async signUp(email, password, metadata = {}) {
        try {
            const { data, error } = await supabase.rpc('register_user', {
                p_email: email.toLowerCase().trim(),
                p_password: password,
                p_full_name: metadata.full_name || null,
            });

            if (error) {
                console.error('[SimpleAuth] RPC Error:', error);
                throw error;
            }

            if (!data) {
                console.error('[SimpleAuth] No data returned from RPC');
                throw new Error('Erro interno: Nenhuma resposta do servidor.');
            }

            const result = typeof data === 'string' ? JSON.parse(data) : data;

            if (!result.success) {
                throw new Error(result.error || 'Erro desconhecido ao criar conta.');
            }

            // Store user data securely
            const user = {
                id: result.user_id,
                email: result.email,
                full_name: result.full_name,
            };

            await this.storeUser(user);
            this.currentUser = user;

            return { user, session: { user_id: user.id } };
        } catch (error) {
            console.error('[SimpleAuth] Sign up error:', error);
            throw new Error(this.getUserFriendlyError(error));
        }
    }

    /**
     * Sign in existing user
     */
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.rpc('login_user', {
                p_email: email.toLowerCase().trim(),
                p_password: password,
            });

            if (error) {
                console.error('[SimpleAuth] RPC Error (SignIn):', error);
                throw error;
            }

            if (!data) {
                console.error('[SimpleAuth] No data returned from RPC (SignIn)');
                throw new Error('Erro interno: Nenhuma resposta do servidor.');
            }

            const result = typeof data === 'string' ? JSON.parse(data) : data;

            if (!result.success) {
                throw new Error(result.error || 'Erro desconhecido ao entrar.');
            }

            // Store user data securely
            const user = {
                id: result.user_id,
                email: result.email,
                full_name: result.full_name,
            };

            await this.storeUser(user);
            this.currentUser = user;

            return { user, session: { user_id: user.id } };
        } catch (error) {
            console.error('[SimpleAuth] Sign in error:', error);
            throw new Error(this.getUserFriendlyError(error));
        }
    }

    /**
     * Sign out current user
     */
    async signOut() {
        try {
            await this.clearUser();
            this.currentUser = null;
            return true;
        } catch (error) {
            console.error('[SimpleAuth] Sign out error:', error);
            throw new Error(this.getUserFriendlyError(error));
        }
    }

    /**
     * Get current authenticated user
     */
    async getCurrentUser() {
        try {
            const userJson = await secureStorage.getItemAsync('simple_auth_user');

            if (!userJson) {
                return null;
            }

            const user = JSON.parse(userJson);
            this.currentUser = user;
            return user;
        } catch (error) {
            console.error('[SimpleAuth] Get user error:', error);
            return null;
        }
    }

    /**
     * Get current session
     */
    async getSession() {
        try {
            const user = await this.getCurrentUser();

            if (!user) {
                return null;
            }

            return { user_id: user.id };
        } catch (error) {
            console.error('[SimpleAuth] Get session error:', error);
            return null;
        }
    }

    /**
     * Restore session from secure storage
     */
    async restoreSession() {
        try {
            const user = await this.getCurrentUser();

            if (!user) {
                return null;
            }

            // Verify user still exists and is active
            const { data, error } = await supabase.rpc('get_user', {
                p_user_id: user.id,
            });

            if (error) {
                await this.clearUser();
                return null;
            }

            const result = typeof data === 'string' ? JSON.parse(data) : data;

            if (!result.success) {
                await this.clearUser();
                return null;
            }

            this.currentUser = user;
            return { user, user_id: user.id };
        } catch (error) {
            console.error('[SimpleAuth] Restore session error:', error);
            await this.clearUser();
            return null;
        }
    }

    /**
     * Update password
     */
    async updatePassword(oldPassword, newPassword) {
        try {
            if (!this.currentUser) {
                throw new Error('Usuário não autenticado');
            }

            const { data, error } = await supabase.rpc('update_password', {
                p_user_id: this.currentUser.id,
                p_old_password: oldPassword,
                p_new_password: newPassword,
            });

            if (error) throw error;

            const result = typeof data === 'string' ? JSON.parse(data) : data;

            if (!result.success) {
                throw new Error(result.error);
            }

            return true;
        } catch (error) {
            console.error('[SimpleAuth] Update password error:', error);
            throw new Error(this.getUserFriendlyError(error));
        }
    }

    /**
     * 🔒 SECURITY: Store user in secure storage
     */
    async storeUser(user) {
        try {
            await secureStorage.setItemAsync(
                'simple_auth_user',
                JSON.stringify(user)
            );
        } catch (error) {
            console.error('[SimpleAuth] Store user error:', error);
        }
    }

    /**
     * 🔒 SECURITY: Clear user from secure storage
     */
    async clearUser() {
        try {
            await secureStorage.deleteItemAsync('simple_auth_user');
        } catch (error) {
            console.error('[SimpleAuth] Clear user error:', error);
        }
    }

    /**
     * Get user-friendly error messages
     */
    getUserFriendlyError(error) {
        const message = error.message || error.toString();

        if (message.includes('Email ou senha incorretos')) {
            return 'Email ou senha incorretos';
        }
        if (message.includes('Email já cadastrado')) {
            return 'Este email já está cadastrado';
        }
        if (message.includes('Senha atual incorreta')) {
            return 'Senha atual incorreta';
        }
        if (message.includes('Usuário desativado')) {
            return 'Usuário desativado. Entre em contato com o suporte.';
        }
        if (message.includes('Usuário não encontrado')) {
            return 'Usuário não encontrado';
        }

        return 'Erro de autenticação. Tente novamente.';
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.currentUser;
    }

    /**
     * Get user ID (safe)
     */
    getUserId() {
        return this.currentUser?.id || null;
    }
}

export const simpleAuthService = new SimpleAuthService();
export default simpleAuthService;
