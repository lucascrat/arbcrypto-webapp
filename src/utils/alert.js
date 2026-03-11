import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert that works on Web + Native.
 * react-native-web v0.21.0 has Alert.alert() as a no-op,
 * so we use window.alert/window.confirm on web.
 */
export function showAlert(title, message, buttons) {
    if (Platform.OS === 'web') {
        if (buttons && buttons.length > 0) {
            // If there are buttons with callbacks, use confirm for OK/Cancel style
            const fullMessage = message ? `${title}\n\n${message}` : title;

            if (buttons.length === 1) {
                // Single button - just alert and call onPress
                window.alert(fullMessage);
                if (buttons[0].onPress) {
                    buttons[0].onPress();
                }
            } else {
                // Multiple buttons - use confirm (OK = first button, Cancel = second)
                const confirmed = window.confirm(fullMessage);
                if (confirmed && buttons[0].onPress) {
                    buttons[0].onPress();
                } else if (!confirmed && buttons[1]?.onPress) {
                    buttons[1].onPress();
                }
            }
        } else {
            // No buttons - simple alert
            const fullMessage = message ? `${title}\n\n${message}` : title;
            window.alert(fullMessage);
        }
    } else {
        // Native - use React Native Alert
        Alert.alert(title, message, buttons);
    }
}
