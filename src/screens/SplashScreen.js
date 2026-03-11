import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';

export default function SplashScreen({ navigation }) {
    const { restoreSession } = useAppStore();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            // Wait a bit for better UX
            await new Promise(resolve => setTimeout(resolve, 1200));

            // Try to restore session — returns session object if valid, null otherwise
            const session = await restoreSession();

            if (session?.user) {
                // Token válido, vai direto para o app
                navigation.replace('Main');
            } else {
                // Sem sessão ou token expirado, vai para login
                navigation.replace('Login');
            }
        } catch (error) {
            console.error('[Splash] Error checking auth:', error);
            navigation.replace('Login');
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={COLORS.gradientDark} style={styles.background} />

            <View style={styles.content}>
                <Image
                    source={require('../../assets/logo.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                />
                <Text style={styles.title}>ArbCrypto</Text>
                <Text style={styles.subtitle}>Trading Inteligente com IA</Text>

                <ActivityIndicator
                    size="large"
                    color={COLORS.primary}
                    style={styles.loader}
                />

                <Text style={styles.loadingText}>Carregando...</Text>
            </View>

            <View style={styles.footer}>
                <Text style={styles.version}>v1.0.0</Text>
                <Text style={styles.security}>🔒 Protegido com Segurança de Nível Bancário</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoImage: {
        width: 150,
        height: 150,
        marginBottom: SPACING.md,
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.xxxl * 1.5,
        fontWeight: '800',
        marginBottom: SPACING.xs,
    },
    subtitle: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.lg,
        marginBottom: SPACING.xxl,
    },
    loader: {
        marginTop: SPACING.xxl,
    },
    loadingText: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.sm,
        marginTop: SPACING.md,
    },
    footer: {
        alignItems: 'center',
        paddingBottom: SPACING.xxl,
    },
    version: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.xs,
        marginBottom: SPACING.xs,
    },
    security: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.xs,
    },
});
