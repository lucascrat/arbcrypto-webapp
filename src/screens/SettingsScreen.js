import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { RISK_LEVELS } from '../constants/config';
import { useAppStore } from '../store/useAppStore';
import { GlassCard, PrimaryButton, SecondaryButton, Badge, Divider } from '../components/UI';
import { maskApiKey } from '../utils/helpers';
import { scale, moderateScale, RFValue, isWeb, isDesktop, WEB_MAX_WIDTH, WEB_CARD_MAX_WIDTH } from '../utils/responsive';
import { showAlert } from '../utils/alert';
import { secureCredentialsService } from '../services/secureCredentials';

export default function SettingsScreen() {
    const navigation = useNavigation();
    const {
        userSettings,
        isConnected,
        isLoading,
        autoTradeEnabled,
        riskLevel: storeRiskLevel,
        saveUserSettings,
        setRiskLevel: storeSetRiskLevel,
        testConnection,
        toggleAutoTrade,
        signOut,
    } = useAppStore();

    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [isTestnet, setIsTestnet] = useState(userSettings?.is_testnet || false);
    const [riskLevel, setRiskLevel] = useState(storeRiskLevel || userSettings?.risk_level || 'medium');
    const [dailyLossLimit, setDailyLossLimit] = useState(
        userSettings?.daily_loss_limit?.toString() || '20'
    );
    const [maxTradeAmount, setMaxTradeAmount] = useState(
        userSettings?.max_trade_amount?.toString() || '100'
    );
    const [minConfidence, setMinConfidence] = useState(
        userSettings?.min_confidence?.toString() || ''
    );
    const [showApiKey, setShowApiKey] = useState(false);
    const [showApiSecret, setShowApiSecret] = useState(false);
    const [publicIp, setPublicIp] = useState('Carregando...');

    React.useEffect(() => {
        fetchPublicIp();
        loadStoredCredentials();
    }, []);

    const loadStoredCredentials = async () => {
        // 🔒 SECURITY: Load credentials from SecureStore
        const credentials = await secureCredentialsService.getBinanceCredentials();
        if (credentials) {
            setApiKey(credentials.apiKey);
            setApiSecret(credentials.apiSecret);
            setIsTestnet(credentials.isTestnet);
        }
    };

    const fetchPublicIp = async () => {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            setPublicIp(data.ip);
        } catch (error) {
            setPublicIp('Erro ao obter IP');
        }
    };

    const handleSave = async () => {
        try {
            // 🔒 SECURITY: Validate API keys before storing
            if (apiKey && apiSecret) {
                try {
                    secureCredentialsService.validateBinanceKey(apiKey, apiSecret);
                } catch (validationError) {
                    showAlert('Erro de Validação', validationError.message);
                    return;
                }

                // 🔒 SECURITY: Store credentials in SecureStore (encrypted)
                await secureCredentialsService.storeBinanceCredentials(
                    apiKey,
                    apiSecret,
                    isTestnet
                );
            }

            // Apply risk level to store immediately
            storeSetRiskLevel(riskLevel);

            // Save other settings (NOT API keys)
            await saveUserSettings({
                is_testnet: isTestnet,
                risk_level: riskLevel,
                max_trade_amount: parseFloat(maxTradeAmount) || 100,
                daily_loss_limit: parseFloat(dailyLossLimit) || 20,
                min_confidence: minConfidence ? parseInt(minConfidence) : null,
            });

            showAlert('Sucesso', 'Configurações salvas com segurança!');
        } catch (error) {
            showAlert('Erro', error.message);
        }
    };

    const handleTestConnection = async () => {
        if (!apiKey || !apiSecret) {
            showAlert('Erro', 'Preencha as credenciais da API primeiro');
            return;
        }

        // Temporarily set credentials for testing
        const binance = require('../services/binance').binanceService;
        binance.setCredentials(apiKey, apiSecret, isTestnet);

        const result = await testConnection();
        showAlert(
            result.success ? 'Sucesso' : 'Erro',
            result.message
        );
    };

    const handleToggleAutoTrade = () => {
        showAlert(
            autoTradeEnabled ? 'Desativar Auto-Trade' : 'Ativar Auto-Trade',
            autoTradeEnabled
                ? 'O bot não executará mais trades automaticamente.'
                : 'O bot executará trades automaticamente baseado nos sinais. Tem certeza?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Confirmar', onPress: () => toggleAutoTrade(!autoTradeEnabled) },
            ]
        );
    };

    const handleLogout = () => {
        showAlert(
            'Sair',
            'Tem certeza que deseja sair?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut();
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Login' }],
                            });
                        } catch (error) {
                            showAlert('Erro', 'Falha ao sair: ' + error.message);
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={COLORS.gradientDark} style={styles.background} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <Text style={styles.title}>Configurações</Text>
                    <Text style={styles.subtitle}>Configure sua API e preferências</Text>

                    {/* Connection Status */}
                    <GlassCard style={styles.statusCard} gradient>
                        <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>Status da Conexão</Text>
                            <Badge
                                label={isConnected ? 'Conectado' : 'Desconectado'}
                                type={isConnected ? 'success' : 'danger'}
                            />
                        </View>
                        {isConnected && (
                            <Text style={styles.statusInfo}>
                                API configurada corretamente ✓
                            </Text>
                        )}
                    </GlassCard>

                    {/* API Configuration */}
                    <Text style={styles.sectionTitle}>🔐 Credenciais Binance</Text>
                    <GlassCard>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>API Key</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    value={showApiKey ? apiKey : (apiKey ? maskApiKey(apiKey) : '')}
                                    onChangeText={setApiKey}
                                    placeholder="Sua API Key da Binance"
                                    placeholderTextColor={COLORS.textMuted}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <TouchableOpacity
                                    style={styles.showButton}
                                    onPress={() => setShowApiKey(!showApiKey)}
                                >
                                    <Text style={styles.showButtonText}>
                                        {showApiKey ? '🙈' : '👁️'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>API Secret</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    value={showApiSecret ? apiSecret : (apiSecret ? '••••••••••••' : '')}
                                    onChangeText={setApiSecret}
                                    placeholder="Sua API Secret da Binance"
                                    placeholderTextColor={COLORS.textMuted}
                                    secureTextEntry={!showApiSecret}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <TouchableOpacity
                                    style={styles.showButton}
                                    onPress={() => setShowApiSecret(!showApiSecret)}
                                >
                                    <Text style={styles.showButtonText}>
                                        {showApiSecret ? '🙈' : '👁️'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* IP Whitelisting Info */}
                        <View style={styles.ipBox}>
                            <View style={styles.ipHeader}>
                                <Text style={styles.ipLabel}>Seu IP Público (para Whitelist):</Text>
                                <TouchableOpacity onPress={fetchPublicIp}>
                                    <Text style={styles.refreshIp}>🔄</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.ipValue}>{publicIp}</Text>
                            <Text style={styles.ipHint}>
                                Dica: Na Binance, selecione "Restrict access to trusted IPs only" e cole este endereço.
                            </Text>
                        </View>

                        <View style={styles.switchRow}>
                            <View>
                                <Text style={styles.switchLabel}>Modo Testnet</Text>
                                <Text style={styles.switchDescription}>
                                    Use para testes sem dinheiro real
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.switch, isTestnet && styles.switchActive]}
                                onPress={() => setIsTestnet(!isTestnet)}
                            >
                                <View style={[styles.switchThumb, isTestnet && styles.switchThumbActive]} />
                            </TouchableOpacity>
                        </View>

                        <SecondaryButton
                            title="Testar Conexão"
                            onPress={handleTestConnection}
                            style={styles.testButton}
                        />
                    </GlassCard>

                    {/* Risk Configuration */}
                    <Text style={styles.sectionTitle}>⚙️ Configurações de Trading</Text>
                    <GlassCard>
                        <Text style={styles.inputLabel}>Nível de Risco</Text>
                        <View style={styles.riskOptions}>
                            {Object.entries(RISK_LEVELS).map(([key, config]) => (
                                <TouchableOpacity
                                    key={key}
                                    style={[
                                        styles.riskOption,
                                        riskLevel === key && styles.riskOptionActive
                                    ]}
                                    onPress={() => setRiskLevel(key)}
                                >
                                    <Text style={[
                                        styles.riskLabel,
                                        riskLevel === key && styles.riskLabelActive
                                    ]}>
                                        {config.label}
                                    </Text>
                                    <Text style={styles.riskDescription}>
                                        {config.description}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Divider />

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Valor Máximo por Trade (USDT)</Text>
                            <TextInput
                                style={styles.input}
                                value={maxTradeAmount}
                                onChangeText={setMaxTradeAmount}
                                placeholder="100"
                                placeholderTextColor={COLORS.textMuted}
                                keyboardType="numeric"
                            />
                            <Text style={styles.inputHint}>
                                Limite máximo que o bot pode usar em cada operação
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Limite de Perda Diária (USDT)</Text>
                            <TextInput
                                style={styles.input}
                                value={dailyLossLimit}
                                onChangeText={setDailyLossLimit}
                                placeholder="20"
                                placeholderTextColor={COLORS.textMuted}
                                keyboardType="numeric"
                            />
                            <Text style={styles.inputHint}>
                                Bot para automaticamente ao atingir esta perda no dia
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Confiança Mínima (%)</Text>
                            <TextInput
                                style={styles.input}
                                value={minConfidence}
                                onChangeText={setMinConfidence}
                                placeholder={RISK_LEVELS[riskLevel].minConfidence.toString()}
                                placeholderTextColor={COLORS.textMuted}
                                keyboardType="numeric"
                            />
                            <Text style={styles.inputHint}>
                                Override manual: Confiança mínima para IA executar o sinal
                            </Text>
                        </View>

                        <Divider />

                        {/* Auto Trade Toggle */}
                        <View style={styles.switchRow}>
                            <View>
                                <Text style={styles.switchLabel}>Auto-Trade</Text>
                                <Text style={styles.switchDescription}>
                                    Executa trades automaticamente
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.switch, autoTradeEnabled && styles.switchActive]}
                                onPress={handleToggleAutoTrade}
                            >
                                <View style={[styles.switchThumb, autoTradeEnabled && styles.switchThumbActive]} />
                            </TouchableOpacity>
                        </View>

                        {autoTradeEnabled && (
                            <View style={styles.warningBox}>
                                <Text style={styles.warningText}>
                                    ⚠️ O bot executará trades automaticamente baseado nos sinais da IA.
                                    Certifique-se de configurar os limites corretamente.
                                </Text>
                            </View>
                        )}
                    </GlassCard>

                    {/* Risk Info */}
                    <GlassCard style={styles.infoCard}>
                        <Text style={styles.infoTitle}>ℹ️ Informações do Risco Selecionado</Text>
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Max. por Trade</Text>
                                <Text style={styles.infoValue}>
                                    {RISK_LEVELS[riskLevel].maxTradePercent}%
                                </Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Stop Loss</Text>
                                <Text style={[styles.infoValue, styles.negative]}>
                                    {RISK_LEVELS[riskLevel].stopLossPercent}%
                                </Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Take Profit</Text>
                                <Text style={[styles.infoValue, styles.positive]}>
                                    {RISK_LEVELS[riskLevel].takeProfitPercent}%
                                </Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Confiança Min.</Text>
                                <Text style={styles.infoValue}>
                                    {minConfidence || RISK_LEVELS[riskLevel].minConfidence}%
                                </Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Leverage Max.</Text>
                                <Text style={styles.infoValue}>
                                    {RISK_LEVELS[riskLevel].maxLeverage}x
                                </Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Trailing Stop</Text>
                                <Text style={[styles.infoValue, { color: COLORS.accent }]}>
                                    {RISK_LEVELS[riskLevel].trailingStopPercent}%
                                </Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Risco/Trade</Text>
                                <Text style={styles.infoValue}>
                                    {RISK_LEVELS[riskLevel].riskPercent}%
                                </Text>
                            </View>
                        </View>
                    </GlassCard>

                    {/* Save Button */}
                    <PrimaryButton
                        title="Salvar Configurações"
                        onPress={handleSave}
                        loading={isLoading}
                        style={styles.saveButton}
                    />

                    {/* Logout Button */}
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                    >
                        <Text style={styles.logoutText}>🚪 Sair da Conta</Text>
                    </TouchableOpacity>

                    <View style={styles.bottomSpacer} />
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
    scrollView: {
        flex: 1,
    },
    content: {
        padding: isDesktop ? SPACING.xl : SPACING.md,
        paddingTop: SPACING.xxl,
        maxWidth: isWeb ? WEB_CARD_MAX_WIDTH : undefined,
        alignSelf: isWeb ? 'center' : undefined,
        width: '100%',
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
        marginBottom: SPACING.lg,
    },
    statusCard: {
        marginBottom: SPACING.lg,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusLabel: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '600',
    },
    statusInfo: {
        color: COLORS.success,
        fontSize: FONT_SIZES.sm,
        marginTop: SPACING.xs,
    },
    sectionTitle: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.xl,
        fontWeight: '700',
        marginBottom: SPACING.md,
        marginTop: SPACING.md,
    },
    inputGroup: {
        marginBottom: SPACING.md,
    },
    inputLabel: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        marginBottom: SPACING.xs,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.bgLight,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    showButton: {
        position: 'absolute',
        right: SPACING.md,
        padding: SPACING.xs,
    },
    showButtonText: {
        fontSize: RFValue(20),
    },
    ipBox: {
        backgroundColor: COLORS.bgDark + '50',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    ipHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: moderateScale(4),
    },
    ipLabel: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.xs,
    },
    refreshIp: {
        fontSize: 14,
    },
    ipValue: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '800',
        letterSpacing: scale(0.5),
    },
    ipHint: {
        color: COLORS.textMuted,
        fontSize: 10,
        marginTop: moderateScale(4),
    },
    inputHint: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.xs,
        marginTop: SPACING.xs,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: SPACING.sm,
    },
    switchLabel: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
    },
    switchDescription: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.xs,
        marginTop: moderateScale(2),
    },
    switch: {
        width: moderateScale(50),
        height: moderateScale(28),
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.bgLight,
        padding: moderateScale(2),
        justifyContent: 'center',
    },
    switchActive: {
        backgroundColor: COLORS.primary,
    },
    switchThumb: {
        width: moderateScale(24),
        height: moderateScale(24),
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.textMuted,
    },
    switchThumbActive: {
        backgroundColor: COLORS.textPrimary,
        alignSelf: 'flex-end',
    },
    testButton: {
        marginTop: SPACING.md,
    },
    riskOptions: {
        gap: SPACING.sm,
        marginTop: SPACING.xs,
    },
    riskOption: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.bgLight,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    riskOptionActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '15',
    },
    riskLabel: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        marginBottom: SPACING.xs,
    },
    riskLabelActive: {
        color: COLORS.primary,
    },
    riskDescription: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
    },
    warningBox: {
        backgroundColor: COLORS.warning + '20',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginTop: SPACING.md,
    },
    warningText: {
        color: COLORS.warning,
        fontSize: FONT_SIZES.sm,
        lineHeight: RFValue(20),
    },
    infoCard: {
        marginTop: SPACING.lg,
    },
    infoTitle: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        marginBottom: SPACING.md,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    infoItem: {
        width: isDesktop ? '30%' : '45%',
    },
    infoLabel: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.xs,
        marginBottom: SPACING.xs,
    },
    infoValue: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
    },
    positive: {
        color: COLORS.success,
    },
    negative: {
        color: COLORS.danger,
    },
    saveButton: {
        marginTop: SPACING.xl,
    },
    logoutButton: {
        marginTop: SPACING.lg,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.danger + '40',
        backgroundColor: COLORS.danger + '10',
    },
    logoutText: {
        color: COLORS.danger,
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
    },
    bottomSpacer: {
        height: moderateScale(100),
    },
});
