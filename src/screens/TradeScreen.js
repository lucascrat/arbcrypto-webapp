import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';
import { useAppStore } from '../store/useAppStore';
import { GlassCard, PrimaryButton, SecondaryButton, Badge, Divider } from '../components/UI';
import { PriceChart, CandlestickSimple, VolumeChart, IndicatorChart } from '../components/Charts';
import { formatCurrency, formatPercent, formatCryptoAmount } from '../utils/helpers';
import { screenWidth, moderateScale, RFValue } from '../utils/responsive';
import { showAlert } from '../utils/alert';

export default function TradeScreen() {
    const {
        isConnected,
        isLoading,
        balance,
        totalBalanceUSDT,
        prices,
        marketData,
        klines,
        selectedSymbol,
        aiAnalysis,
        strategies,
        selectedStrategy,
        fetchMarketData,
        runAIAnalysis,
        executeTrade,
        selectStrategy,
    } = useAppStore();

    const [tradeType, setTradeType] = useState('BUY');
    const [orderType, setOrderType] = useState('MARKET');
    const [amount, setAmount] = useState('');
    const [price, setPrice] = useState('');
    const [usePercent, setUsePercent] = useState(false);
    const [percentAmount, setPercentAmount] = useState(25);

    const currentMarket = marketData[selectedSymbol];
    const currentKlines = klines[selectedSymbol];
    const currentPrice = currentMarket?.currentPrice || prices[selectedSymbol] || 0;

    // Get available balance for trading
    const usdtBalance = balance.find(b => b.asset === 'USDT')?.free || 0;
    const baseAsset = selectedSymbol.replace('USDT', '');
    const baseBalance = balance.find(b => b.asset === baseAsset)?.free || 0;

    useEffect(() => {
        if (selectedSymbol && !currentMarket) {
            fetchMarketData(selectedSymbol);
        }
    }, [selectedSymbol]);

    useEffect(() => {
        if (usePercent && currentPrice > 0) {
            const availableBalance = tradeType === 'BUY' ? usdtBalance : baseBalance;
            const calculatedAmount = tradeType === 'BUY'
                ? (availableBalance * percentAmount / 100) / currentPrice
                : availableBalance * percentAmount / 100;
            setAmount(calculatedAmount.toFixed(6));
        }
    }, [usePercent, percentAmount, tradeType, usdtBalance, baseBalance, currentPrice]);

    const handleTrade = async () => {
        if (!isConnected) {
            showAlert('Erro', 'Configure suas credenciais da API primeiro');
            return;
        }

        const quantity = parseFloat(amount);
        if (!quantity || quantity <= 0) {
            showAlert('Erro', 'Insira uma quantidade válida');
            return;
        }

        const tradeValue = quantity * currentPrice;

        showAlert(
            `Confirmar ${tradeType}`,
            `${tradeType === 'BUY' ? 'Comprar' : 'Vender'} ${formatCryptoAmount(quantity)} ${baseAsset}\n` +
            `Preço: ${formatCurrency(currentPrice)}\n` +
            `Total: ${formatCurrency(tradeValue)}`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        try {
                            await executeTrade(
                                selectedSymbol,
                                tradeType,
                                quantity,
                                orderType,
                                orderType === 'LIMIT' ? parseFloat(price) : null
                            );
                            showAlert('Sucesso', 'Ordem executada com sucesso!');
                            setAmount('');
                        } catch (error) {
                            showAlert('Erro', error.message);
                        }
                    },
                },
            ]
        );
    };

    const handleAIAnalysis = async () => {
        await runAIAnalysis(selectedSymbol);
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={COLORS.gradientDark} style={styles.background} />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Symbol Selector */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.symbolSelector}
                    contentContainerStyle={styles.symbolSelectorContent}
                >
                    {APP_CONFIG.trading.defaultSymbols.map((symbol) => (
                        <TouchableOpacity
                            key={symbol}
                            style={[
                                styles.symbolChip,
                                selectedSymbol === symbol && styles.symbolChipActive
                            ]}
                            onPress={() => {
                                useAppStore.setState({ selectedSymbol: symbol });
                                fetchMarketData(symbol);
                            }}
                        >
                            <Text style={[
                                styles.symbolChipText,
                                selectedSymbol === symbol && styles.symbolChipTextActive
                            ]}>
                                {symbol.replace('USDT', '')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Price & Chart */}
                {currentMarket && (
                    <GlassCard gradient style={styles.chartCard}>
                        <View style={styles.priceHeader}>
                            <View>
                                <Text style={styles.symbolTitle}>{selectedSymbol}</Text>
                                <Text style={styles.priceValue}>
                                    {formatCurrency(currentPrice)}
                                </Text>
                            </View>
                            <View style={styles.changeContainer}>
                                <Badge
                                    label={formatPercent(currentMarket.priceChange24h)}
                                    type={currentMarket.priceChange24h >= 0 ? 'success' : 'danger'}
                                />
                            </View>
                        </View>

                        {currentKlines && (
                            <>
                                <CandlestickSimple
                                    data={currentKlines}
                                    width={screenWidth - moderateScale(64)}
                                    height={moderateScale(120)}
                                />
                                <VolumeChart
                                    data={currentKlines}
                                    width={screenWidth - moderateScale(64)}
                                    height={moderateScale(40)}
                                />
                            </>
                        )}

                        <View style={styles.marketStats}>
                            <View style={styles.statBlock}>
                                <Text style={styles.statLabel}>24h Alta</Text>
                                <Text style={[styles.statValue, styles.positive]}>
                                    ${currentMarket.high24h?.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.statBlock}>
                                <Text style={styles.statLabel}>24h Baixa</Text>
                                <Text style={[styles.statValue, styles.negative]}>
                                    ${currentMarket.low24h?.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.statBlock}>
                                <Text style={styles.statLabel}>RSI</Text>
                                <Text style={[
                                    styles.statValue,
                                    currentMarket.rsi < 30 ? styles.positive :
                                        currentMarket.rsi > 70 ? styles.negative : {}
                                ]}>
                                    {currentMarket.rsi?.toFixed(1)}
                                </Text>
                            </View>
                        </View>
                    </GlassCard>
                )}

                {/* AI Signal */}
                {currentMarket?.signals && (
                    <GlassCard style={styles.signalCard}>
                        <View style={styles.signalHeader}>
                            <Text style={styles.sectionTitle}>📊 Sinal Técnico</Text>
                            <TouchableOpacity onPress={handleAIAnalysis}>
                                <Text style={styles.refreshButton}>🔄 Atualizar</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.signalContent}>
                            <View style={styles.signalMain}>
                                <Badge
                                    label={currentMarket.signals.recommendation}
                                    type={currentMarket.signals.recommendation.toLowerCase()}
                                />
                                <Text style={styles.signalConfidence}>
                                    {currentMarket.signals.confidence}% confiança
                                </Text>
                            </View>
                            <View style={styles.signalIndicators}>
                                {currentMarket.signals.signals?.slice(0, 3).map((sig, i) => (
                                    <Text key={i} style={styles.signalIndicator}>
                                        • {sig.indicator}: {sig.reason}
                                    </Text>
                                ))}
                            </View>
                        </View>
                    </GlassCard>
                )}

                {/* Trade Form */}
                <GlassCard style={styles.tradeForm}>
                    <Text style={styles.sectionTitle}>💱 Criar Ordem</Text>

                    {/* Buy/Sell Toggle */}
                    <View style={styles.tradeTypeRow}>
                        <TouchableOpacity
                            style={[
                                styles.tradeTypeButton,
                                tradeType === 'BUY' && styles.tradeTypeBuy
                            ]}
                            onPress={() => setTradeType('BUY')}
                        >
                            <Text style={[
                                styles.tradeTypeText,
                                tradeType === 'BUY' && styles.tradeTypeTextActive
                            ]}>
                                COMPRAR
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.tradeTypeButton,
                                tradeType === 'SELL' && styles.tradeTypeSell
                            ]}
                            onPress={() => setTradeType('SELL')}
                        >
                            <Text style={[
                                styles.tradeTypeText,
                                tradeType === 'SELL' && styles.tradeTypeTextActive
                            ]}>
                                VENDER
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Order Type */}
                    <View style={styles.orderTypeRow}>
                        {['MARKET', 'LIMIT'].map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.orderTypeChip,
                                    orderType === type && styles.orderTypeChipActive
                                ]}
                                onPress={() => setOrderType(type)}
                            >
                                <Text style={[
                                    styles.orderTypeText,
                                    orderType === type && styles.orderTypeTextActive
                                ]}>
                                    {type === 'MARKET' ? 'Mercado' : 'Limite'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Balance Info */}
                    <View style={styles.balanceInfo}>
                        <Text style={styles.balanceLabel}>
                            {tradeType === 'BUY' ? 'Disponível:' : 'Disponível:'}
                        </Text>
                        <Text style={styles.balanceValue}>
                            {tradeType === 'BUY'
                                ? `${formatCryptoAmount(usdtBalance, 2)} USDT`
                                : `${formatCryptoAmount(baseBalance)} ${baseAsset}`
                            }
                        </Text>
                    </View>

                    {/* Quick Percent Buttons */}
                    <View style={styles.percentRow}>
                        {[25, 50, 75, 100].map((pct) => (
                            <TouchableOpacity
                                key={pct}
                                style={[
                                    styles.percentButton,
                                    usePercent && percentAmount === pct && styles.percentButtonActive
                                ]}
                                onPress={() => {
                                    setUsePercent(true);
                                    setPercentAmount(pct);
                                }}
                            >
                                <Text style={[
                                    styles.percentText,
                                    usePercent && percentAmount === pct && styles.percentTextActive
                                ]}>
                                    {pct}%
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Amount Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Quantidade ({baseAsset})</Text>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={(text) => {
                                setAmount(text);
                                setUsePercent(false);
                            }}
                            placeholder="0.00"
                            placeholderTextColor={COLORS.textMuted}
                            keyboardType="decimal-pad"
                        />
                    </View>

                    {/* Limit Price (if LIMIT order) */}
                    {orderType === 'LIMIT' && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Preço Limite (USDT)</Text>
                            <TextInput
                                style={styles.input}
                                value={price}
                                onChangeText={setPrice}
                                placeholder={currentPrice?.toFixed(2)}
                                placeholderTextColor={COLORS.textMuted}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    )}

                    {/* Order Summary */}
                    {amount && parseFloat(amount) > 0 && (
                        <View style={styles.summary}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total</Text>
                                <Text style={styles.summaryValue}>
                                    {formatCurrency(parseFloat(amount) * currentPrice)}
                                </Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Taxa Estimada</Text>
                                <Text style={styles.summaryValue}>
                                    ~{formatCurrency(parseFloat(amount) * currentPrice * 0.001)}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Trade Button */}
                    <TouchableOpacity
                        style={[
                            styles.tradeButton,
                            tradeType === 'BUY' ? styles.buyButton : styles.sellButton
                        ]}
                        onPress={handleTrade}
                        disabled={isLoading || !isConnected}
                    >
                        <Text style={styles.tradeButtonText}>
                            {isLoading ? 'Processando...' :
                                tradeType === 'BUY'
                                    ? `Comprar ${baseAsset}`
                                    : `Vender ${baseAsset}`
                            }
                        </Text>
                    </TouchableOpacity>

                    {!isConnected && (
                        <Text style={styles.warningText}>
                            ⚠️ Configure suas credenciais da API para executar trades
                        </Text>
                    )}
                </GlassCard>

                {/* Strategies */}
                <Text style={styles.sectionTitleMain}>🎯 Estratégias</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.strategiesScroll}
                >
                    {strategies.map((strategy) => (
                        <TouchableOpacity
                            key={strategy.id}
                            onPress={() => selectStrategy(strategy)}
                        >
                            <GlassCard
                                style={[
                                    styles.strategyCard,
                                    selectedStrategy?.id === strategy.id && styles.strategyCardActive
                                ]}
                            >
                                <Text style={styles.strategyName}>{strategy.name}</Text>
                                <View style={styles.strategyStats}>
                                    <Text style={styles.strategyWinRate}>
                                        {strategy.win_rate}% WR
                                    </Text>
                                    <Badge
                                        label={strategy.risk_level}
                                        type={
                                            strategy.risk_level === 'low' ? 'success' :
                                                strategy.risk_level === 'high' ? 'danger' : 'warning'
                                        }
                                        size="sm"
                                    />
                                </View>
                                <Text style={styles.strategyIndicators}>
                                    {strategy.indicators_used?.join(' • ')}
                                </Text>
                            </GlassCard>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.bottomSpacer} />
            </ScrollView>
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
    scrollView: {
        flex: 1,
    },
    content: {
        padding: SPACING.md,
        paddingTop: SPACING.xxl,
    },
    symbolSelector: {
        marginBottom: SPACING.md,
    },
    symbolSelectorContent: {
        gap: SPACING.sm,
    },
    symbolChip: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.bgLight,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    symbolChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    symbolChipText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    symbolChipTextActive: {
        color: COLORS.textInverse,
    },
    chartCard: {
        marginBottom: SPACING.md,
    },
    priceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
    },
    symbolTitle: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        marginBottom: SPACING.xs,
    },
    priceValue: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.xxxl,
        fontWeight: '800',
    },
    changeContainer: {
        alignItems: 'flex-end',
    },
    marketStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: SPACING.md,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    statBlock: {
        alignItems: 'center',
    },
    statLabel: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.xs,
        marginBottom: SPACING.xs,
    },
    statValue: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
    },
    positive: {
        color: COLORS.success,
    },
    negative: {
        color: COLORS.danger,
    },
    signalCard: {
        marginBottom: SPACING.md,
    },
    signalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    sectionTitle: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
    },
    refreshButton: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.sm,
    },
    signalContent: {},
    signalMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.sm,
    },
    signalConfidence: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.md,
    },
    signalIndicators: {
        marginTop: SPACING.xs,
    },
    signalIndicator: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        marginBottom: 2,
    },
    tradeForm: {
        marginBottom: SPACING.md,
    },
    tradeTypeRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.md,
        marginBottom: SPACING.md,
    },
    tradeTypeButton: {
        flex: 1,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.bgLight,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    tradeTypeBuy: {
        backgroundColor: COLORS.success + '20',
        borderColor: COLORS.success,
    },
    tradeTypeSell: {
        backgroundColor: COLORS.danger + '20',
        borderColor: COLORS.danger,
    },
    tradeTypeText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
    },
    tradeTypeTextActive: {
        color: COLORS.textPrimary,
    },
    orderTypeRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    orderTypeChip: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.bgLight,
    },
    orderTypeChipActive: {
        backgroundColor: COLORS.primary + '30',
    },
    orderTypeText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    orderTypeTextActive: {
        color: COLORS.primary,
    },
    balanceInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    balanceLabel: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
    },
    balanceValue: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    percentRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    percentButton: {
        flex: 1,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.bgLight,
        alignItems: 'center',
    },
    percentButtonActive: {
        backgroundColor: COLORS.primary,
    },
    percentText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    percentTextActive: {
        color: COLORS.textInverse,
    },
    inputGroup: {
        marginBottom: SPACING.md,
    },
    inputLabel: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        marginBottom: SPACING.xs,
    },
    input: {
        backgroundColor: COLORS.bgLight,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    summary: {
        backgroundColor: COLORS.bgLight,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xs,
    },
    summaryLabel: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
    },
    summaryValue: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    tradeButton: {
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        ...SHADOWS.md,
    },
    buyButton: {
        backgroundColor: COLORS.success,
    },
    sellButton: {
        backgroundColor: COLORS.danger,
    },
    tradeButtonText: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
    },
    warningText: {
        color: COLORS.warning,
        fontSize: FONT_SIZES.sm,
        textAlign: 'center',
        marginTop: SPACING.md,
    },
    sectionTitleMain: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.xl,
        fontWeight: '700',
        marginBottom: SPACING.md,
        marginTop: SPACING.md,
    },
    strategiesScroll: {
        gap: SPACING.sm,
        paddingRight: SPACING.md,
    },
    strategyCard: {
        width: moderateScale(160),
        padding: SPACING.md,
    },
    strategyCardActive: {
        borderColor: COLORS.primary,
        borderWidth: 2,
    },
    strategyName: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
        marginBottom: SPACING.sm,
    },
    strategyStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    strategyWinRate: {
        color: COLORS.success,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    strategyIndicators: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.xs,
        marginTop: SPACING.xs,
    },
    bottomSpacer: {
        height: moderateScale(100),
    },
});
