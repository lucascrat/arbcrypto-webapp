import { Platform } from 'react-native';

/**
 * Background Bot Service
 * - On native (Android): uses @notifee for foreground service notifications
 * - On web: no-op (web doesn't need foreground services)
 */

let notifee = null;
let AndroidImportance = { HIGH: 4, LOW: 2 };
let AndroidVisibility = { PUBLIC: 1 };

// Only load @notifee on native platforms (it crashes on web)
if (Platform.OS !== 'web') {
    try {
        const notifeeModule = require('@notifee/react-native');
        notifee = notifeeModule.default;
        AndroidImportance = notifeeModule.AndroidImportance || AndroidImportance;
        AndroidVisibility = notifeeModule.AndroidVisibility || AndroidVisibility;
    } catch (e) {
        console.warn('[BackgroundBot] @notifee not available:', e.message);
    }
}

class BackgroundBotService {
    constructor() {
        this.channelId = 'trading-bot-service';
        this.isServiceRunning = false;
        this.updateCallback = null;
    }

    async initialize() {
        if (!notifee) return; // Skip on web
        await notifee.createChannel({
            id: this.channelId,
            name: 'Trading Bot Activity',
            importance: AndroidImportance.HIGH,
            description: 'Mantém o bot operando em segundo plano',
            visibility: AndroidVisibility.PUBLIC,
        });
    }

    async startService(title, body) {
        if (this.isServiceRunning) return;
        if (!notifee) {
            // On web, just mark as running (no notification needed)
            this.isServiceRunning = true;
            console.log('[BackgroundBot] Service started (web mode - no notifications)');
            return;
        }

        try {
            await notifee.requestPermission();
            await notifee.displayNotification({
                title: title || 'Bot ArbCrypto Ativo',
                body: body || 'O bot está monitorando o mercado...',
                android: {
                    channelId: this.channelId,
                    asForegroundService: true,
                    ongoing: true,
                    importance: AndroidImportance.HIGH,
                    visibility: AndroidVisibility.PUBLIC,
                    color: '#00D9A5',
                    pressAction: { id: 'default' },
                    actions: [{ title: 'Parar Bot', pressAction: { id: 'stop-bot' } }],
                },
            });
            this.isServiceRunning = true;
            console.log('[BackgroundBot] Service started');
        } catch (error) {
            console.error('[BackgroundBot] Failed to start service:', error);
            this.isServiceRunning = true; // Still mark as running for bot logic
        }
    }

    async updateNotification(title, body) {
        if (!this.isServiceRunning || !notifee) return;
        try {
            await notifee.displayNotification({
                id: 'default',
                title,
                body,
                android: {
                    channelId: this.channelId,
                    asForegroundService: true,
                    ongoing: true,
                    importance: AndroidImportance.LOW,
                    visibility: AndroidVisibility.PUBLIC,
                    color: '#00D9A5',
                    pressAction: { id: 'default' },
                    actions: [{ title: 'Parar Bot', pressAction: { id: 'stop-bot' } }],
                },
            });
        } catch (e) {
            // Silently fail notification updates
        }
    }

    async stopService() {
        if (!this.isServiceRunning) return;
        if (notifee) {
            try { await notifee.stopForegroundService(); } catch (e) { }
        }
        this.isServiceRunning = false;
        console.log('[BackgroundBot] Service stopped');
    }
}

export const backgroundBot = new BackgroundBotService();
