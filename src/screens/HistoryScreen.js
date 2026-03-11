import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { GlassCard, Badge, EmptyState } from '../components/UI';
import { formatCurrency, formatRelativeTime, formatPercent } from '../utils/helpers';

export default function HistoryScreen() {
    const {
        trades,
        tradeStats,
        signals,
        isLoading,
        fetchTrades,
        fetchSignals,
    } = useAppStore();

    const [activeTab, setActiveTab] = useState('trades');

    useEffect(() => {
        fetchTrades();
        fetchSignals();
    }, []);

    const onRefresh = async () => {
        await Promise.all([fetchTrades(), fetchSignals()]);
    };

    // ── helpers ──────────────────────────────────────────────────────────────
    const hasPnL = (item) => {
        const pnl = parseFloat(item.profit_loss);
        return item.side === 'SELL' && !isNaN(pnl) && pnl !== 0;
    };

    const isOpenEntry = (item) =>
        item.side === 'BUY' || item.side === 'LONG';

    // ── Trade card ────────────────────────────────────────────────────────────
    const renderTradeItem = ({ item }) => {
        const pnl = parseFloat(item.profit_loss || 0);
        const pnlPct = parseFloat(item.profit_loss_percent || 0);
        const isProfit = pnl > 0;
        const isBuy = isOpenEntry(item);
        const showPnL = hasPnL(item);
        const totalVal = parseFloat(item.total_value || 0);

        return (
            <GlassCard style={styles.tradeCard}>
                {/* Header */}
                <View style={styles.tradeHeader}>
                    <View style={styles.tradeInfo}>
                        <Text style={styles.tradeSymbol}>{item.symbol}</Text>
                        <Badge
                            label={item.side}
                            type={isBuy ? 'buy' : 'sell'}
                            size="sm"
                        />
                        <Badge
                            label={item.status?.toUpperCase() || 'FILLED'}
                            type={item.status === 'filled' ? 'success' : 'warning'}
                            size="sm"
                        />
                    </View>
                    <Text style={styles.tradeDate}>
                        {formatRelativeTime(item.created_at)}
                    </Text>
                </View>

                {/* Details row */}
                <View style={styles.tradeDetails}>
                    <View style={styles.tradeColumn}>
                        <Text style={styles.tradeLabel}>Qtd</Text>
                        <Text style={styles.tradeValue}>
                            {parseFloat(item.quantity || 0).toFixed(6)}
                        </Text>
                    </View>
                    <View style={styles.tradeColumn}>
                        <Text style={styles.tradeLabel}>Preço</Text>
                        <Text style={styles.tradeValue}>
                            {formatCurrency(item.price)}
                        </Text>
                    </View>
                    <View style={styles.tradeColumn}>
                        <Text style={styles.tradeLabel}>Total</Text>
                        <Text style={styles.tradeValue}>
                            {formatCurrency(totalVal)}
                        </Text>
                    </View>
                    {parseFloat(item.fee || 0) > 0 && (
                        <View style={styles.tradeColumn}>
                            <Text style={styles.tradeLabel}>Taxa</Text>
                            <Text style={[styles.tradeValue, styles.muted]}>
                                {parseFloat(item.fee).toFixed(4)} {item.fee_asset || 'USDT'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* P&L — only for SELL/closed trades */}
                {showPnL && (
                    <View style={[
                        styles.pnlRow,
                        isProfit ? styles.pnlRowProfit : styles.pnlRowLoss,
                    ]}>
                        <Text style={styles.pnlLabel}>
                            {isProfit ? '▲ Lucro' : '▼ Perda'}
                        </Text>
                        <View style={styles.pnlNumbers}>
                            <Text style={[styles.pnlValue, isProfit ? styles.positive : styles.negative]}>
                                {isProfit ? '+' : ''}{formatCurrency(pnl)}
                            </Text>
                            <Text style={[styles.pnlPct, isProfit ? styles.positive : styles.negative]}>
                                ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
                            </Text>
                        </View>
                    </View>
                )}

                {/* BUY = open entry indicator */}
                {isBuy && (
                    <View style={styles.openRow}>
                        <Text style={styles.openText}>📥 Entrada registrada</Text>
                        <Text style={styles.openSub}>P&L será calculado ao vender</Text>
                    </View>
                )}

                {/* Footer */}
                {item.strategy_used && (
                    <Text style={styles.strategyUsed}>
                        📊 {item.strategy_used}
                    </Text>
                )}
            </GlassCard>
        );
    };

    // ── Signal card ───────────────────────────────────────────────────────────
    const renderSignalItem = ({ item }) => (
        <GlassCard style={styles.signalCard}>
            <View style={styles.signalHeader}>
                <View style={styles.signalInfo}>
                    <Text style={styles.signalSymbol}>{item.symbol}</Text>
                    <Badge
                        label={item.signal_type}
                        type={item.signal_type?.toLowerCase() || 'default'}
                    />
                </View>
                <Text style={styles.signalDate}>
                    {formatRelativeTime(item.created_at)}
                </Text>
            </View>

            <View style={styles.signalContent}>
                <View style={styles.signalRow}>
                    <Text style={styles.signalLabel}>Preço na Hora</Text>
                    <Text style={styles.signalValue}>
                        {formatCurrency(item.current_price)}
                    </Text>
                </View>

                <View style={styles.signalRow}>
                    <Text style={styles.signalLabel}>Confiança</Text>
                    <View style={styles.confidenceBar}>
                        <View
                            style={[
                                styles.confidenceFill,
                                {
                                    width: `${item.confidence}%`,
                                    backgroundColor:
                                        item.confidence >= 70 ? COLORS.success :
                                            item.confidence >= 50 ? COLORS.warning :
                                                COLORS.danger,
                                },
                            ]}
                        />
                    </View>
                    <Text style={styles.confidenceText}>{item.confidence}%</Text>
                </View>

                {item.gemini_analysis && (
                    <Text style={styles.analysisText} numberOfLines={3}>
                        {item.gemini_analysis}
                    </Text>
                )}
            </View>

            <View style={styles.indicatorsRow}>
                {item.rsi_value && (
                    <View style={styles.indicatorChip}>
                        <Text style={styles.indicatorLabel}>RSI</Text>
                        <Text style={styles.indicatorValue}>
                            {item.rsi_value.toFixed(1)}
                        </Text>
                    </View>
                )}
                {item.macd_value && (
                    <View style={styles.indicatorChip}>
                        <Text style={styles.indicatorLabel}>MACD</Text>
                        <Text style={[
                            styles.indicatorValue,
                            item.macd_histogram > 0 ? styles.positive : styles.negative,
                        ]}>
                            {item.macd_value.toFixed(4)}
                        </Text>
                    </View>
                )}
            </View>

            {(item.take_profit || item.stop_loss) && (
                <View style={styles.targetsRow}>
                    {item.take_profit && (
                        <View style={styles.targetItem}>
                            <Text style={styles.targetLabel}>Take Profit</Text>
                            <Text style={[styles.targetValue, styles.positive]}>
                                {formatCurrency(item.take_profit)}
                            </Text>
                        </View>
                    )}
                    {item.stop_loss && (
                        <View style={styles.targetItem}>
                            <Text style={styles.targetLabel}>Stop Loss</Text>
                            <Text style={[styles.targetValue, styles.negative]}>
                                {formatCurrency(item.stop_loss)}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.signalFooter}>
                <Badge
                    label={item.executed ? 'Executado' : 'Não Executado'}
                    type={item.executed ? 'success' : 'default'}
                    size="sm"
                />
                {item.news_sentiment && (
                    <Badge
                        label={`Sentimento: ${item.news_sentiment}`}
                        type={
                            item.news_sentiment === 'bullish' ? 'success' :
                                item.news_sentiment === 'bearish' ? 'danger' : 'warning'
                        }
                        size="sm"
                    />
                )}
            </View>
        </GlassCard>
    );

    // ── Stats helpers ─────────────────────────────────────────────────────────
    const profitableTrades = tradeStats?.profitableTrades ?? tradeStats?.wins ?? 0;
    const losingTrades = tradeStats?.losingTrades ?? tradeStats?.losses ?? 0;
    const totalPnL = parseFloat(tradeStats?.totalPnL || 0);
    const winRate = parseFloat(tradeStats?.winRate || 0);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <LinearGradient colors={COLORS.gradientDark} style={styles.background} />

            <View style={styles.header}>
                <Text style={styles.title}>Histórico</Text>

                {/* Stats Summary */}
                {tradeStats && (
                    <GlassCard style={styles.statsCard} gradient>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{tradeStats.totalTrades ?? 0}</Text>
                                <Text style={styles.statLabel}>Trades</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, styles.positive]}>
                                    {profitableTrades}
                                </Text>
                                <Text style={styles.statLabel}>Lucros</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, styles.negative]}>
                                    {losingTrades}
                                </Text>
                                <Text style={styles.statLabel}>Perdas</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={[
                                    styles.statValue,
                                    totalPnL >= 0 ? styles.positive : styles.negative,
                                ]}>
                                    {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
                                </Text>
                                <Text style={styles.statLabel}>P&L Total</Text>
                            </View>
                        </View>

                        {/* Win rate bar */}
                        {tradeStats.totalTrades > 0 && (
                            <View style={styles.winRateRow}>
                                <Text style={styles.winRateLabel}>
                                    Win Rate: {winRate.toFixed(1)}%
                                </Text>
                                <View style={styles.winRateBar}>
                                    <View
                                        style={[
                                            styles.winRateFill,
                                            { width: `${Math.min(winRate, 100)}%` },
                                        ]}
                                    />
                                </View>
                            </View>
                        )}
                    </GlassCard>
                )}

                {/* Tab Selector */}
                <View style={styles.tabSelector}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'trades' && styles.tabActive]}
                        onPress={() => setActiveTab('trades')}
                    >
                        <Text style={[
                            styles.tabText,
                            activeTab === 'trades' && styles.tabTextActive,
                        ]}>
                            Trades ({trades.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'signals' && styles.tabActive]}
                        onPress={() => setActiveTab('signals')}
                    >
                        <Text style={[
                            styles.tabText,
                            activeTab === 'signals' && styles.tabTextActive,
                        ]}>
                            Sinais ({signals.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {activeTab === 'trades' ? (
                <FlatList
                    data={trades}
                    keyExtractor={(item) => String(item.id ?? item.created_at ?? Math.random())}
                    renderItem={renderTradeItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={onRefresh}
                            tintColor={COLORS.primary}
                        />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            title="Nenhum trade ainda"
                            message="Seus trades aparecerão aqui quando o bot executar"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <FlatList
                    data={signals}
                    keyExtractor={(item) => String(item.id ?? item.created_at ?? Math.random())}
                    renderItem={renderSignalItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={onRefresh}
                            tintColor={COLORS.primary}
                        />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            title="Nenhum sinal ainda"
                            message="Análises da IA aparecerão aqui quando o bot rodar"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
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
    header: {
        padding: SPACING.md,
        paddingTop: SPACING.xxl,
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.xxxl,
        fontWeight: '800',
        marginBottom: SPACING.md,
    },

    // Stats card
    statsCard: {
        marginBottom: SPACING.md,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.xl,
        fontWeight: '700',
    },
    statLabel: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.xs,
        marginTop: SPACING.xs,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: COLORS.border,
    },
    winRateRow: {
        marginTop: SPACING.xs,
    },
    winRateLabel: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.xs,
        marginBottom: 4,
    },
    winRateBar: {
        height: 4,
        backgroundColor: COLORS.bgLight,
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
    },
    winRateFill: {
        height: '100%',
        backgroundColor: COLORS.success,
        borderRadius: BORDER_RADIUS.full,
    },

    // Tabs
    tabSelector: {
        flexDirection: 'row',
        backgroundColor: COLORS.bgLight,
        borderRadius: BORDER_RADIUS.md,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.sm,
    },
    tabActive: {
        backgroundColor: COLORS.primary,
    },
    tabText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
    },
    tabTextActive: {
        color: COLORS.textInverse,
    },

    listContent: {
        padding: SPACING.md,
        paddingBottom: 100,
    },

    // Trade card
    tradeCard: {
        marginBottom: SPACING.sm,
    },
    tradeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    tradeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        flexWrap: 'wrap',
    },
    tradeSymbol: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
    },
    tradeDate: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.xs,
    },
    tradeDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    tradeColumn: {
        alignItems: 'center',
    },
    tradeLabel: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.xs,
        marginBottom: 2,
    },
    tradeValue: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    muted: {
        color: COLORS.textMuted,
    },

    // P&L row (only for SELL trades with actual P&L)
    pnlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: BORDER_RADIUS.sm,
        marginBottom: SPACING.sm,
    },
    pnlRowProfit: {
        backgroundColor: 'rgba(0, 200, 83, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(0, 200, 83, 0.3)',
    },
    pnlRowLoss: {
        backgroundColor: 'rgba(255, 82, 82, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255, 82, 82, 0.3)',
    },
    pnlLabel: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    pnlNumbers: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    pnlValue: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '800',
    },
    pnlPct: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },

    // BUY open entry indicator
    openRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        backgroundColor: 'rgba(100, 100, 255, 0.08)',
        borderRadius: BORDER_RADIUS.sm,
        marginBottom: SPACING.sm,
    },
    openText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
    },
    openSub: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.xs,
    },

    strategyUsed: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.xs,
        marginTop: SPACING.xs,
    },

    // Colors
    positive: {
        color: COLORS.success,
    },
    negative: {
        color: COLORS.danger,
    },

    // Signal card
    signalCard: {
        marginBottom: SPACING.sm,
    },
    signalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    signalInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    signalSymbol: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
    },
    signalDate: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.xs,
    },
    signalContent: {
        marginBottom: SPACING.sm,
    },
    signalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    signalLabel: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        width: 100,
    },
    signalValue: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    confidenceBar: {
        flex: 1,
        height: 6,
        backgroundColor: COLORS.bgLight,
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
        marginHorizontal: SPACING.sm,
    },
    confidenceFill: {
        height: '100%',
        borderRadius: BORDER_RADIUS.full,
    },
    confidenceText: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        width: 40,
        textAlign: 'right',
    },
    analysisText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        marginTop: SPACING.sm,
        fontStyle: 'italic',
    },
    indicatorsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    indicatorChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: COLORS.bgLight,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
    },
    indicatorLabel: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.xs,
    },
    indicatorValue: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    targetsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.bgLight,
        borderRadius: BORDER_RADIUS.sm,
        marginBottom: SPACING.sm,
    },
    targetItem: {
        alignItems: 'center',
    },
    targetLabel: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.xs,
        marginBottom: 2,
    },
    targetValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
    },
    signalFooter: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
});
