import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { authService } from '../services/auth';
import { GlassCard } from '../components/UI';
import { showAlert } from '../utils/alert';

export default function ForgotPasswordScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleResetPassword = async () => {
        if (!email.trim()) {
            showAlert('Erro', 'Por favor, informe seu email');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('Erro', 'Por favor, informe um email válido');
            return;
        }

        try {
            setLoading(true);
            await authService.resetPassword(email);
            setEmailSent(true);
            setLoading(false);
        } catch (error) {
            setLoading(false);
            showAlert('Erro', error.message);
        }
    };

    if (emailSent) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={COLORS.gradientDark} style={styles.background} />

                <View style={styles.content}>
                    <View style={styles.successContainer}>
                        <Text style={styles.successIcon}>✉️</Text>
                        <Text style={styles.successTitle}>Email Enviado!</Text>
                        <Text style={styles.successText}>
                            Enviamos um link de recuperação para:
                        </Text>
                        <Text style={styles.emailText}>{email}</Text>
                        <Text style={styles.successHint}>
                            Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                        </Text>

                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.navigate('Login')}
                        >
                            <LinearGradient
                                colors={COLORS.gradientPrimary}
                                style={styles.backGradient}
                            >
                                <Text style={styles.backButtonText}>Voltar ao Login</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.resendButton}
                            onPress={() => setEmailSent(false)}
                        >
                            <Text style={styles.resendText}>Não recebeu? Enviar novamente</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={COLORS.gradientDark} style={styles.background} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Header */}
                    <TouchableOpacity
                        style={styles.backLink}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backLinkText}>← Voltar</Text>
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <Text style={styles.logo}>🔑</Text>
                        <Text style={styles.title}>Esqueceu a Senha?</Text>
                        <Text style={styles.subtitle}>
                            Sem problemas! Digite seu email e enviaremos um link para redefinir sua senha.
                        </Text>
                    </View>

                    {/* Form */}
                    <GlassCard style={styles.formCard}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Email</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="seu@email.com"
                                placeholderTextColor={COLORS.textMuted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoFocus
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={handleResetPassword}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={COLORS.gradientPrimary}
                                style={styles.resetGradient}
                            >
                                {loading ? (
                                    <ActivityIndicator color={COLORS.textPrimary} />
                                ) : (
                                    <Text style={styles.resetButtonText}>Enviar Link de Recuperação</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </GlassCard>

                    {/* Info Box */}
                    <View style={styles.infoBox}>
                        <Text style={styles.infoIcon}>ℹ️</Text>
                        <Text style={styles.infoText}>
                            O link de recuperação expira em 1 hora por segurança.
                        </Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
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
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: SPACING.lg,
        justifyContent: 'center',
    },
    backLink: {
        position: 'absolute',
        top: SPACING.xxl,
        left: SPACING.lg,
        zIndex: 10,
    },
    backLinkText: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    logo: {
        fontSize: 64,
        marginBottom: SPACING.sm,
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.xxxl,
        fontWeight: '800',
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    subtitle: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.md,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: SPACING.md,
    },
    formCard: {
        padding: SPACING.xl,
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    inputLabel: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        marginBottom: SPACING.xs,
        fontWeight: '600',
    },
    input: {
        backgroundColor: COLORS.bgLight,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    resetButton: {
        marginBottom: SPACING.sm,
    },
    resetGradient: {
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        ...SHADOWS.md,
    },
    resetButtonText: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary + '20',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginTop: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.primary + '40',
    },
    infoIcon: {
        fontSize: 20,
        marginRight: SPACING.sm,
    },
    infoText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        flex: 1,
        lineHeight: 18,
    },
    // Success state styles
    successContainer: {
        alignItems: 'center',
    },
    successIcon: {
        fontSize: 80,
        marginBottom: SPACING.lg,
    },
    successTitle: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.xxxl,
        fontWeight: '800',
        marginBottom: SPACING.md,
    },
    successText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.md,
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    emailText: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        marginBottom: SPACING.lg,
    },
    successHint: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.sm,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: SPACING.xxl,
        paddingHorizontal: SPACING.lg,
    },
    backButton: {
        width: '100%',
        marginBottom: SPACING.md,
    },
    backGradient: {
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        ...SHADOWS.md,
    },
    backButtonText: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
    },
    resendButton: {
        paddingVertical: SPACING.sm,
    },
    resendText: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
});
