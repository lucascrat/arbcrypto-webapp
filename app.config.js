import 'dotenv/config';

export default {
    name: 'ArbCrypto',
    slug: 'arbcrypto',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/logo.png',
    userInterfaceStyle: 'dark',
    splash: {
        image: './assets/logo.png',
        resizeMode: 'contain',
        backgroundColor: '#0A0E27'
    },
    assetBundlePatterns: [
        '**/*'
    ],
    ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.arbcrypto.app'
    },
    android: {
        adaptiveIcon: {
            foregroundImage: './assets/logo.png',
            backgroundColor: '#0A0E27'
        },
        package: 'com.arbcrypto.app'
    },
    web: {
        favicon: './assets/favicon.png'
    },
    extra: {
        // 🔒 SECURITY: Environment variables loaded from .env
        API_URL: process.env.API_URL,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        NODE_ENV: process.env.NODE_ENV || 'development',
    }
};
