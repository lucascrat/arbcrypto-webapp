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
    ScrollView,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { GlassCard } from '../components/UI';
import { showAlert } from '../utils/alert';

export default function SignUpScreen({ navigation }) {
    const { signUp, authLoading } = useAppStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const validateForm = () => {
        if (!fullName.trim()) {
            showAlert('Erro', 'Por favor, informe seu nome completo');
            return false;
        }

        if (!email.trim()) {
            showAlert('Erro', 'Por favor, informe seu email');
            return false;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('Erro', 'Por favor, informe um email válido');
            return false;
        }

        if (!password) {
            showAlert('Erro', 'Por favor, informe uma senha');
            return false;
        }

        if (password.length < 6) {
            showAlert('Erro', 'A senha deve ter pelo menos 6 caracteres');
            return false;
        }

        if (password !== confirmPassword) {
            showAlert('Erro', 'As senhas não coincidem');
            return false;
        }

        if (!agreedToTerms) {
            showAlert('Erro', 'Você deve concordar com os Termos de Uso');
            return false;
        }

        return true;
    };

    const handleSignUp = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            const result = await signUp(email, password, {
                full_name: fullName,
            });

            // Se o signup retornou uma sessão, o usuário já está logado
            if (result.session) {
                showAlert(
                    'Bem-vindo! 🎉',
                    'Conta criada com sucesso. Você já está logado!',
                    [
                        {
                            text: 'Começar',
                            onPress: () => navigation.replace('Main'),
                        },
                    ]
                );
            } else {
                // Fallback caso não tenha sessão (não deve acontecer com auto-confirm)
                showAlert(
                    'Sucesso!',
                    'Conta criada com sucesso. Faça login para continuar.',
                    [
                        {
                            text: 'OK',
                            onPress: () => navigation.replace('Login'),
                        },
                    ]
                );
            }
        } catch (error) {
            showAlert('Erro ao criar conta', error.message);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={COLORS.gradientDark} style={styles.background} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>Criar Conta</Text>
                        <Text style={styles.subtitle}>Comece a operar com IA</Text>
                    </View>

                    {/* Sign Up Form */}
                    <GlassCard style={styles.formCard}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Nome Completo</Text>
                            <TextInput
                                style={styles.input}
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="João Silva"
                                placeholderTextColor={COLORS.textMuted}
                                autoCapitalize="words"
                                autoCorrect={false}
                            />
                        </View>

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
                                    placeholder="Mínimo 6 caracteres"
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

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Confirmar Senha</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[styles.input, styles.passwordInput]}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Digite a senha novamente"
                                    placeholderTextColor={COLORS.textMuted}
                                    secureTextEntry={!showConfirmPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <Text style={styles.eyeIcon}>
                                        {showConfirmPassword ? '🙈' : '👁️'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Terms Checkbox */}
                        <View style={styles.checkboxRow}>
                            <TouchableOpacity
                                style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}
                                onPress={() => setAgreedToTerms(!agreedToTerms)}
                            >
                                {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
                            </TouchableOpacity>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.checkboxText}>
                                    Concordo com os{' '}
                                    <Text
                                        style={styles.link}
                                        onPress={() => navigation.navigate('TermsOfService')}
                                    >
                                        Termos de Uso
                                    </Text>
                                    {' '}e{' '}
                                    <Text
                                        style={styles.link}
                                        onPress={() => navigation.navigate('PrivacyPolicy')}
                                    >
                                        Política de Privacidade
                                    </Text>
                                </Text>
                            </View>
                        </View>

                        {/* Risk Warning */}
                        <TouchableOpacity
                            style={styles.warningBox}
                            onPress={() => navigation.navigate('RiskDisclaimer')}
                        >
                            <Text style={styles.warningIcon}>⚠️</Text>
                            <Text style={styles.warningText}>
                                Trading de criptomoedas envolve riscos. Toque para ler o aviso completo.
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.signupButton}
                            onPress={handleSignUp}
                            disabled={authLoading}
                        >
                            <LinearGradient
                                colors={COLORS.gradientPrimary}
                                style={styles.signupGradient}
                            >
                                {authLoading ? (
                                    <ActivityIndicator color={COLORS.textPrimary} />
                                ) : (
                                    <Text style={styles.signupButtonText}>Criar Conta</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>ou</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={() => navigation.navigate('Login')}
                        >
                            <Text style={styles.loginText}>
                                Já tem conta? <Text style={styles.loginTextBold}>Entrar</Text>
                            </Text>
                        </TouchableOpacity>
                    </GlassCard>

                    {/* Security Notice */}
                    <View style={styles.securityNotice}>
                        <Text style={styles.securityIcon}>🔒</Text>
                        <Text style={styles.securityText}>
                            Seus dados são criptografados e protegidos com segurança de nível bancário
                        </Text>
                    </View>
                </ScrollView>
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
    scrollContent: {
        padding: SPACING.lg,
        paddingTop: SPACING.xxl,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    logoImage: {
        width: 80,
        height: 80,
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
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: 2,
        borderColor: COLORS.border,
        marginRight: SPACING.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    checkmark: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '700',
    },
    checkboxText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        flex: 1,
        lineHeight: 20,
    },
    link: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    warningBox: {
        flexDirection: 'row',
        backgroundColor: COLORS.warning + '20',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.warning + '40',
    },
    warningIcon: {
        fontSize: 20,
        marginRight: SPACING.sm,
    },
    warningText: {
        color: COLORS.warning,
        fontSize: FONT_SIZES.xs,
        flex: 1,
        lineHeight: 18,
    },
    signupButton: {
        marginBottom: SPACING.md,
    },
    signupGradient: {
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        ...SHADOWS.md,
    },
    signupButtonText: {
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
    loginButton: {
        alignItems: 'center',
    },
    loginText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.md,
    },
    loginTextBold: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    securityNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.xl,
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.xxl,
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
