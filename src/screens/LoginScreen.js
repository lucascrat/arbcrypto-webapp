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
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { GlassCard } from '../components/UI';
import { showAlert } from '../utils/alert';

export default function LoginScreen({ navigation }) {
    const { signIn, authLoading } = useAppStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            showAlert('Erro', 'Preencha todos os campos');
            return;
        }

        try {
            const { user } = await signIn(email, password);
            if (user) {
                navigation.replace('Main');
            }
        } catch (error) {
            showAlert('Erro ao entrar', error.message);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={COLORS.gradientDark} style={styles.background} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Logo/Title */}
                    <View style={styles.header}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>ArbCrypto</Text>
                        <Text style={styles.subtitle}>Trading Inteligente com IA</Text>
                    </View>

                    {/* Login Form */}
                    <GlassCard style={styles.formCard}>
                        <Text style={styles.formTitle}>Entrar</Text>

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
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Senha</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[styles.input, styles.passwordInput]}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="••••••••"
                                    placeholderTextColor={COLORS.textMuted}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Text style={styles.eyeIcon}>
                                        {showPassword ? '🙈' : '👁️'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.forgotButton}
                            onPress={() => navigation.navigate('ForgotPassword')}
                        >
                            <Text style={styles.forgotText}>Esqueceu a senha?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                            disabled={authLoading}
                        >
                            <LinearGradient
                                colors={COLORS.gradientPrimary}
                                style={styles.loginGradient}
                            >
                                {authLoading ? (
                                    <ActivityIndicator color={COLORS.textPrimary} />
                                ) : (
                                    <Text style={styles.loginButtonText}>Entrar</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>ou</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <TouchableOpacity
                            style={styles.signupButton}
                            onPress={() => navigation.navigate('SignUp')}
                        >
                            <Text style={styles.signupText}>
                                Não tem conta? <Text style={styles.signupTextBold}>Cadastre-se</Text>
                            </Text>
                        </TouchableOpacity>
                    </GlassCard>

                    {/* Security Notice */}
                    <View style={styles.securityNotice}>
                        <Text style={styles.securityIcon}>🔒</Text>
                        <Text style={styles.securityText}>
                            Suas credenciais são criptografadas e armazenadas com segurança
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
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    logoImage: {
        width: 100,
        height: 100,
        marginBottom: SPACING.sm,
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.xxxl,
        fontWeight: '800',
        marginBottom: SPACING.xs,
    },
    subtitle: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.md,
    },
    formCard: {
        padding: SPACING.xl,
    },
    formTitle: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.xxl,
        fontWeight: '700',
        marginBottom: SPACING.lg,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: SPACING.md,
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
    passwordContainer: {
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 50,
    },
    eyeButton: {
        position: 'absolute',
        right: SPACING.md,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
    },
    eyeIcon: {
        fontSize: 20,
    },
    forgotButton: {
        alignSelf: 'flex-end',
        marginBottom: SPACING.lg,
    },
    forgotText: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.sm,
    },
    loginButton: {
        marginBottom: SPACING.md,
    },
    loginGradient: {
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        ...SHADOWS.md,
    },
    loginButtonText: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: SPACING.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
    },
    dividerText: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.sm,
        marginHorizontal: SPACING.md,
    },
    signupButton: {
        alignItems: 'center',
    },
    signupText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.md,
    },
    signupTextBold: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    securityNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.xl,
        paddingHorizontal: SPACING.lg,
    },
    securityIcon: {
        fontSize: 16,
        marginRight: SPACING.xs,
    },
    securityText: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.xs,
        textAlign: 'center',
        flex: 1,
    },
});
