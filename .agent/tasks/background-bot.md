# Background Bot Implementation Plan

## Objective
Enable the trading bot to run continuously in the background (even when the app is minimized or the screen is locked) and display a persistent notification on the lock screen.

## Strategy
Use `@notifee/react-native` to create a Foreground Service. This is the standard Android way to keep an app alive for critical tasks.

## Steps

### 1. Install Dependencies
- `npm install @notifee/react-native`
- `npx expo install expo-build-properties` (might be needed for specific android config)

### 2. Configure `app.json`
- Add `@notifee/react-native` plugin (if needed, though it usually auto-links).
- Configure Android permissions: `FOREGROUND_SERVICE`, `WAKE_LOCK`.

### 3. Create Background Service (`src/services/BackgroundBot.js`)
- Initialize Notifee.
- Create a `start()` function that:
    - Registers a Foreground Service component.
    - Displays a persistent notification (e.g., "Bot Active: Scanning...").
    - Starts the `setInterval` loop for trading logic.
- Create a `stop()` function to kill the service and notification.
- Handle "Stop" action from the notification button.

### 4. Integrate with `useAppStore`
- Replace existing `setInterval` logic in `startBot` with `BackgroundBot.start()`.
- Update `stopBot` to call `BackgroundBot.stop()`.
- Ensure state updates (logs, PnL) are synced from the background service to the store (or the store is accessible). *Note: Zustand store is in JS memory, so as long as the JS thread is alive (which Foreground Service ensures), we can use the store directly.*

### 5. Update Android Manifest (via Config Plugin)
- Ensure `<service android:name="app.notifee.core.ForegroundService" ... />` is present (Notifee handles this usually).

### 6. Test
- Run `npx expo run:android` to rebuild with native changes.
- Verify notification appears.
- Lock screen -> Verify bot continues to log/trade.
