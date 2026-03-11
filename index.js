import { registerRootComponent } from 'expo';
import notifee, { EventType } from '@notifee/react-native';
import App from './App';
import { useAppStore } from './src/store/useAppStore';

// Handle background events (like clicking "Stop Bot" in notification)
notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.ACTION_PRESS && detail.pressAction.id === 'stop-bot') {
        console.log('[Background] User pressed stop-bot action');
        // Stop the bot in the store
        const store = useAppStore.getState();
        if (store.stopBot) {
            store.stopBot();
        }

        // Remove the notification
        await notifee.cancelNotification(detail.notification.id);
    }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);

