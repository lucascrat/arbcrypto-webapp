import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Animated,
    Dimensions,
    ActivityIndicator,
    FlatList,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_WEIGHTS } from '../constants/theme';
import { isWeb, isDesktop, isTablet, WEB_MAX_WIDTH } from '../utils/responsive';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
    const {
        isConnected,
        totalBalanceUSDT,
        balance,
        futuresState,
        tradingType,
        riskLevel,
        trades,
        tradeStats,
        performanceStats,
        botRunning,
        botStatus,
        botLog,
        botCycleCount,
        startBot,
        stopBot,
        fetchBalance,
        fetchTrades,
        signals,
        error,
        clearError,
        isLoading,
    } = useAppStore();

    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | log | history
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse animation for running bot
    useEffect(() => {
        let animation;
        if (botRunning) {
            animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
                ])
            );
            animation.start();
        } else {
            pulseAnim.setValue(1);
        }
        return () => animation && animation.stop();
    }, [botRunning]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([fetchBalance(), fetchTrades()]);
        } catch (e) { }
        setRefreshing(false);
    }, []);

    const statusText = {
        idle: 'Inativo',
        scanning: 'Escaneando...',
        analyzing: 'IA Analisando...',
        trading: 'Executando...',
        waiting: 'Aguardando...',
        error: 'Erro',
    };

    const statusColor = {
        idle: COLORS.textMuted,
        scanning: COLORS.info,
        analyzing: COLORS.accent,
        trading: COLORS.success,
        waiting: COLORS.warning,
        error: COLORS.danger,
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerBrand}>
                <Image
                    source={require('../../assets/logo.png')}
                    style={styles.headerLogo}
                    resizeMode="contain"
                />
                <View>
                    <Text style={styles.headerTitle}>ArbCrypto</Text>
                    <View style={styles.subtitleRow}>
                        <Text style={[styles.headerSubtitle, { marginRight: 8 }]}>AI Trader</Text>
                        {tradingType === 'AUTO' && (
                            <View style={styles.autoBadge}>
                                <Text style={styles.autoBadgeText}>AUTO PILOT</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
            <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => navigation.navigate('Settings')}
            >
                <Ionicons name="settings-outline" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
        </View>
    );

    const renderConnectionBanner = () => {
        if (isConnected) return null;
        return (
            <TouchableOpacity
                style={styles.connectionBanner}
                onPress={() => navigation.navigate('Settings')}
            >
                <Ionicons name="alert-circle" size={20} color={COLORS.warning} />
                <Text style={styles.connectionText}>
                    Conecte a Binance para iniciar
                </Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
        );
    };

    const renderBalanceCard = () => (
        <LinearGradient
            colors={botRunning ? ['#1a2332', '#0f1923'] : ['#1a2332', '#1a2332']}
            style={styles.balanceCard}
        >
            <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>Patrimônio Total</Text>
                <View style={[styles.statusDot, { backgroundColor: isConnected ? COLORS.success : COLORS.danger }]} />
            </View>

            <Text style={styles.balanceAmount}>
                ${(Number(totalBalanceUSDT || 0) + Number(futuresState?.totalWalletBalance || 0)).toFixed(2)}
            </Text>

            <View style={styles.balanceSplit}>
                <View style={styles.balanceItem}>
                    <Text style={styles.balanceSubLabel}>SPOT</Text>
                    <Text style={styles.balanceSubValue}>${Number(totalBalanceUSDT || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.balanceDivider} />
                <View style={styles.balanceItem}>
                    <Text style={styles.balanceSubLabel}>FUTURES</Text>
                    <Text style={styles.balanceSubValue}>${Number(futuresState?.totalWalletBalance || 0).toFixed(2)}</Text>
                </View>
            </View>

            <View style={styles.assetsRow}>
                {(balance || []).slice(0, 3).map(b => {
                    const total = Number(b.total || 0);
                    return (
                        <View key={b.asset} style={styles.assetChip}>
                            <Text style={styles.assetChipText}>
                                {b.asset}: {total < 1 ? total.toFixed(4) : total.toFixed(2)}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </LinearGradient>
    );

    const renderBotButton = () => (
        <View style={styles.botSection}>
            <Animated.View style={[styles.botButtonContainer, { transform: [{ scale: pulseAnim }] }]}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={botRunning ? stopBot : startBot}
                    disabled={!isConnected}
                >
                    <LinearGradient
                        colors={botRunning ? ['#EF4444', '#DC2626'] : ['#00D9A5', '#0EA5E9']}
                        style={styles.botButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Ionicons
                            name={botRunning ? 'stop' : 'play'}
                            size={40}
                            color="#FFF"
                        />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>

            <Text style={styles.botButtonLabel}>
                {botRunning ? 'PARAR BOT' : 'INICIAR BOT'}
            </Text>

            <View style={[styles.botStatusRow, { borderColor: statusColor[botStatus] + '40' }]}>
                <View style={[styles.statusIndicator, { backgroundColor: statusColor[botStatus] }]} />
                <Text style={[styles.botStatusText, { color: statusColor[botStatus] }]}>
                    {statusText[botStatus]}
                </Text>
            </View>
        </View>
    );

    const renderStats = () => {
        const stats = performanceStats || tradeStats;
        if (!stats || stats.totalTrades === 0) return null;

        const pf = stats.profitFactor;
        const pfColor = pf >= 1.5 ? COLORS.success : pf >= 1 ? COLORS.accent : COLORS.danger;

        return (
            <View>
                {/* Row 1: main stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.totalTrades}</Text>
                        <Text style={styles.statLabel}>Trades</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, {
                            color: (stats.totalPnL || 0) >= 0 ? COLORS.success : COLORS.danger
                        }]}>
                            {Number(stats.totalPnL || 0) >= 0 ? '+' : ''}${Number(stats.totalPnL || 0).toFixed(2)}
                        </Text>
                        <Text style={styles.statLabel}>P&L Total</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, {
                            color: Number(stats.winRate || 0) >= 50 ? COLORS.success : COLORS.accent
                        }]}>
                            {Number(stats.winRate || 0).toFixed(0)}%
                        </Text>
                        <Text style={styles.statLabel}>Win Rate</Text>
                    </View>
                </View>
                {/* Row 2: extended stats */}
                {stats.profitFactor !== undefined && (
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text style={[styles.statValue, { color: pfColor }]}>
                                {Number(pf) >= 999 ? '∞' : Number(pf || 0).toFixed(2)}x
                            </Text>
                            <Text style={styles.statLabel}>Prof. Factor</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={[styles.statValue, {
                                color: (stats.avgPnL || 0) >= 0 ? COLORS.success : COLORS.danger
                            }]}>
                                {Number(stats.avgPnL || 0) >= 0 ? '+' : ''}${Number(stats.avgPnL || 0).toFixed(2)}
                            </Text>
                            <Text style={styles.statLabel}>Avg P&L</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={[styles.statValue, { color: COLORS.success }]}>
                                {stats.wins || 0}W / {stats.losses || 0}L
                            </Text>
                            <Text style={styles.statLabel}>Vitórias/Perdas</Text>
                        </View>
                    </View>
                )}
                {/* Risk Level indicator */}
                <View style={[styles.riskBadgeRow]}>
                    <Text style={styles.riskBadgeLabel}>Risco:</Text>
                    <View style={[styles.riskBadge, {
                        backgroundColor: riskLevel === 'low' ? COLORS.success + '20' : riskLevel === 'medium' ? COLORS.accent + '20' : COLORS.danger + '20'
                    }]}>
                        <Text style={[styles.riskBadgeText, {
                            color: riskLevel === 'low' ? COLORS.success : riskLevel === 'medium' ? COLORS.accent : COLORS.danger
                        }]}>
                            {riskLevel === 'low' ? 'CONSERVADOR' : riskLevel === 'medium' ? 'MODERADO' : 'AGRESSIVO'}
                        </Text>
                    </View>
                    {botRunning && (
                        <View style={[styles.riskBadge, { backgroundColor: COLORS.primary + '20', marginLeft: 6 }]}>
                            <Text style={[styles.riskBadgeText, { color: COLORS.primary }]}>
                                Ciclo #{botCycleCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const renderTabs = () => (
        <View style={styles.tabsRow}>
            {[
                { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
                { key: 'log', label: 'Bot Log', icon: 'terminal-outline' },
                { key: 'history', label: 'Histórico', icon: 'receipt-outline' },
            ].map(tab => (
                <TouchableOpacity
                    key={tab.key}
                    style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                    onPress={() => setActiveTab(tab.key)}
                >
                    <Ionicons
                        name={tab.icon}
                        size={18}
                        color={activeTab === tab.key ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text style={[
                        styles.tabText,
                        activeTab === tab.key && styles.tabTextActive
                    ]}>
                        {tab.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderDashboard = () => (
        <View>
            {/* Recent Signals */}
            {(signals || []).length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Últimos Sinais</Text>
                    {signals.slice(0, 5).map((signal, i) => (
                        <View key={signal.id || i} style={styles.signalRow}>
                            <View style={styles.signalLeft}>
                                <View style={[
                                    styles.signalBadge,
                                    {
                                        backgroundColor:
                                            signal.signal_type === 'BUY' ? COLORS.success + '20' :
                                                signal.signal_type === 'SELL' ? COLORS.danger + '20' :
                                                    COLORS.textMuted + '20'
                                    }
                                ]}>
                                    <Text style={[
                                        styles.signalBadgeText,
                                        {
                                            color:
                                                signal.signal_type === 'BUY' ? COLORS.success :
                                                    signal.signal_type === 'SELL' ? COLORS.danger :
                                                        COLORS.textMuted
                                        }
                                    ]}>
                                        {signal.signal_type}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={styles.signalSymbol}>{signal.symbol}</Text>
                                    <Text style={styles.signalTime}>
                                        {new Date(signal.created_at || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.signalRight}>
                                <Text style={styles.signalPrice}>${Number(signal.current_price || 0).toFixed(2)}</Text>
                                <Text style={styles.signalConfidence}>{signal.confidence}%</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Quick Actions */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ações Rápidas</Text>
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('Trade')}
                    >
                        <Ionicons name="swap-vertical" size={24} color={COLORS.primary} />
                        <Text style={styles.actionText}>Trade Manual</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('History')}
                    >
                        <Ionicons name="analytics" size={24} color={COLORS.info} />
                        <Text style={styles.actionText}>Histórico</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('Settings')}
                    >
                        <Ionicons name="cog" size={24} color={COLORS.accent} />
                        <Text style={styles.actionText}>Config</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderBotLog = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>
                Atividade do Bot
                {botRunning && <Text style={{ color: COLORS.success }}> • ATIVO</Text>}
            </Text>

            {(!botLog || botLog.length === 0) ? (
                <View style={styles.emptyState}>
                    <Ionicons name="terminal-outline" size={40} color={COLORS.textMuted} />
                    <Text style={styles.emptyText}>
                        Inicie o bot para ver a atividade aqui
                    </Text>
                </View>
            ) : (
                (botLog || []).map((entry) => (
                    <View key={entry.id} style={styles.logEntry}>
                        <Text style={styles.logTime}>{entry.time}</Text>
                        <Text style={[
                            styles.logMessage,
                            entry.type === 'error' && { color: COLORS.danger },
                            entry.type === 'success' && { color: COLORS.success },
                            entry.type === 'warning' && { color: COLORS.accent },
                            entry.type === 'trade' && { color: COLORS.primary },
                        ]}>
                            {entry.message}
                        </Text>
                    </View>
                ))
            )}
        </View>
    );

    const renderTradeHistory = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Histórico de Operações</Text>

            {(!trades || trades.length === 0) ? (
                <View style={styles.emptyState}>
                    <Ionicons name="receipt-outline" size={40} color={COLORS.textMuted} />
                    <Text style={styles.emptyText}>
                        Nenhuma operação realizada ainda
                    </Text>
                </View>
            ) : (
                trades.slice(0, 20).map((trade, i) => {
                    const isBuy = trade.side === 'BUY';
                    const pnl = parseFloat(trade.profit_loss) || 0;
                    const pnlPct = parseFloat(trade.profit_loss_percent) || 0;
                    const hasPnl = pnl !== 0;

                    return (
                        <View key={trade.id || i} style={styles.tradeRow}>
                            <View style={styles.tradeLeft}>
                                <View style={[
                                    styles.tradeSideBadge,
                                    { backgroundColor: isBuy ? COLORS.success + '20' : COLORS.danger + '20' }
                                ]}>
                                    <Ionicons
                                        name={isBuy ? 'arrow-up' : 'arrow-down'}
                                        size={14}
                                        color={isBuy ? COLORS.success : COLORS.danger}
                                    />
                                    <Text style={[
                                        styles.tradeSideText,
                                        { color: isBuy ? COLORS.success : COLORS.danger }
                                    ]}>
                                        {trade.side}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={styles.tradeSymbol}>{trade.symbol}</Text>
                                    <Text style={styles.tradeTime}>
                                        {new Date(trade.created_at || Date.now()).toLocaleDateString('pt-BR', {
                                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.tradeRight}>
                                <Text style={styles.tradeValue}>
                                    ${Number(trade.total_value || (Number(trade.quantity || 0) * Number(trade.price || 0))).toFixed(2)}
                                </Text>
                                {hasPnl ? (
                                    <Text style={[
                                        styles.tradePnl,
                                        { color: pnl >= 0 ? COLORS.success : COLORS.danger }
                                    ]}>
                                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pnlPct.toFixed(1)}%)
                                    </Text>
                                ) : (
                                    <Text style={styles.tradeStatus}>
                                        {trade.status === 'filled' ? '✓' : '⏳'} @${Number(trade.price || 0).toFixed(2)}
                                    </Text>
                                )}
                            </View>
                        </View>
                    );
                })
            )}
        </View>
    );

    const renderErrorBanner = () => {
        if (!error) return null;
        return (
            <TouchableOpacity style={styles.errorBanner} onPress={clearError}>
                <Ionicons name="close-circle" size={16} color={COLORS.danger} />
                <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
                <Ionicons name="close" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
        );
    };

    if (isLoading && !activeTab) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    try {
        return (
            <View style={styles.container}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={COLORS.primary}
                            colors={[COLORS.primary]}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.webContainer}>
                    {renderHeader()}
                    {renderErrorBanner()}
                    {renderConnectionBanner()}
                    {renderBalanceCard()}
                    {renderBotButton()}
                    {renderStats()}
                    {renderTabs()}

                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'log' && renderBotLog()}
                    {activeTab === 'history' && renderTradeHistory()}

                    <View style={{ height: 100 }} />
                    </View>
                </ScrollView>
            </View>
        );
    } catch (err) {
        console.error('HomeScreen render error:', err);
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="alert-circle" size={50} color={COLORS.danger} />
                <Text style={{ color: COLORS.textPrimary, marginTop: 10 }}>Ocorreu um erro na exibição.</Text>
                <TouchableOpacity onPress={() => navigation.replace('Login')} style={{ marginTop: 20, padding: 10, backgroundColor: COLORS.primary, borderRadius: 8 }}>
                    <Text style={{ color: 'white' }}>Recarregar</Text>
                </TouchableOpacity>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: isDesktop ? SPACING.xxl : SPACING.md,
        paddingTop: SPACING.xl + 20,
        alignItems: isDesktop ? 'center' : undefined,
    },
    webContainer: {
        width: '100%',
        maxWidth: isWeb ? WEB_MAX_WIDTH : '100%',
        alignSelf: 'center',
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    headerBrand: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerLogo: {
        width: 32,
        height: 32,
        marginRight: SPACING.sm,
    },
    headerTitle: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
    },
    headerSubtitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    settingsButton: {
        padding: SPACING.sm,
        backgroundColor: COLORS.glassLight,
        borderRadius: BORDER_RADIUS.md,
    },

    // Connection Banner
    connectionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.accent + '15',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.md,
        gap: SPACING.sm,
    },
    connectionText: {
        flex: 1,
        color: COLORS.accent,
        fontSize: FONT_SIZES.sm,
    },

    // Error Banner
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.danger + '15',
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        marginBottom: SPACING.sm,
        gap: SPACING.xs,
    },
    errorText: {
        flex: 1,
        color: COLORS.danger,
        fontSize: FONT_SIZES.xs,
    },

    // Balance Card
    balanceCard: {
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    balanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    balanceLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    balanceAmount: {
        fontSize: FONT_SIZES.xxxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginTop: SPACING.xs,
        marginBottom: 8,
    },
    balanceSplit: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        marginTop: 4,
        marginBottom: 8,
    },
    balanceItem: {
        flex: 1,
        alignItems: 'center',
    },
    balanceDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    balanceSubLabel: {
        fontSize: 10,
        color: COLORS.textMuted,
        marginBottom: 4,
        fontWeight: '600',
        letterSpacing: 1,
    },
    balanceSubValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.accent,
    },
    assetsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    autoBadge: {
        backgroundColor: COLORS.success + '20',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.success + '50',
    },
    autoBadgeText: {
        color: COLORS.success,
        fontSize: 9,
        fontWeight: 'bold',
    },

    // Bot Button
    botSection: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    botButtonContainer: {
        marginBottom: SPACING.sm,
    },
    botButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.glow,
    },
    botButtonLabel: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    botStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.bgCard,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    botStatusText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
    },
    cycleCount: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        marginLeft: 'auto',
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    riskBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.lg,
        gap: SPACING.sm,
    },
    riskBadgeLabel: {
        color: COLORS.textMuted,
        fontSize: 12,
    },
    riskBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: 4,
    },
    riskBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.bgCard,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    statValue: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
    },
    statLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        marginTop: 4,
    },

    // Tabs
    tabsRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.bgCard,
        borderRadius: BORDER_RADIUS.md,
        padding: 4,
        marginBottom: SPACING.md,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
    },
    tabActive: {
        backgroundColor: COLORS.glassLight,
    },
    tabText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
    },
    tabTextActive: {
        color: COLORS.primary,
        fontWeight: FONT_WEIGHTS.semibold,
    },

    // Section
    section: {
        marginBottom: SPACING.lg,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },

    // Signals
    signalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.bgCard,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    signalLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    signalBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
    },
    signalBadgeText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.bold,
    },
    signalSymbol: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.medium,
        color: COLORS.textPrimary,
    },
    signalTime: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
    },
    signalRight: {
        alignItems: 'flex-end',
    },
    signalPrice: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        fontWeight: FONT_WEIGHTS.medium,
    },
    signalConfidence: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.accent,
    },

    // Actions
    actionsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    actionCard: {
        flex: 1,
        backgroundColor: COLORS.bgCard,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        gap: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    actionText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },

    // Bot Log
    logEntry: {
        flexDirection: 'row',
        paddingVertical: 6,
        paddingHorizontal: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border + '40',
        gap: SPACING.sm,
    },
    logTime: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        fontFamily: 'monospace',
        width: 60,
    },
    logMessage: {
        flex: 1,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },

    // Trade History
    tradeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.bgCard,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tradeLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    tradeSideBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
    },
    tradeSideText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.bold,
    },
    tradeSymbol: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.medium,
        color: COLORS.textPrimary,
    },
    tradeTime: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
    },
    tradeRight: {
        alignItems: 'flex-end',
    },
    tradeValue: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        fontWeight: FONT_WEIGHTS.medium,
    },
    tradePnl: {
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.semibold,
    },
    tradeStatus: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        gap: SPACING.sm,
    },
    emptyText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        textAlign: 'center',
    },
});
