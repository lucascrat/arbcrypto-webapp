import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { screenWidth, moderateScale } from '../utils/responsive';

export function PriceChart({ data, width = screenWidth - moderateScale(32), height = 200, showLabels = true }) {
    if (!data || data.length < 2) {
        return (
            <View style={[styles.chartContainer, { height }]}>
                <Text style={styles.noDataText}>Dados insuficientes</Text>
            </View>
        );
    }

    const chartData = {
        labels: showLabels
            ? data.filter((_, i) => i % Math.ceil(data.length / 5) === 0).map((_, i) => `${i * 3}h`)
            : [],
        datasets: [{
            data: data.map(d => d.close || d),
            strokeWidth: 2,
        }],
    };

    const isPositive = data[data.length - 1]?.close >= data[0]?.close;

    return (
        <View style={styles.chartContainer}>
            <LineChart
                data={chartData}
                width={width}
                height={height}
                withDots={false}
                withInnerLines={false}
                withOuterLines={false}
                withVerticalLabels={showLabels}
                withHorizontalLabels={showLabels}
                chartConfig={{
                    backgroundColor: 'transparent',
                    backgroundGradientFrom: 'transparent',
                    backgroundGradientTo: 'transparent',
                    decimalPlaces: 0,
                    color: () => isPositive ? COLORS.success : COLORS.danger,
                    labelColor: () => COLORS.textSecondary,
                    propsForLabels: {
                        fontSize: FONT_SIZES.xs,
                    },
                    propsForBackgroundLines: {
                        stroke: COLORS.border,
                        strokeDasharray: '5,5',
                    },
                }}
                bezier
                style={styles.chart}
            />
        </View>
    );
}

export function MiniChart({ data, width = moderateScale(80), height = moderateScale(30) }) {
    if (!data || data.length < 2) return null;

    const values = data.map(d => d.close || d);
    const isPositive = values[values.length - 1] >= values[0];

    return (
        <LineChart
            data={{
                labels: [],
                datasets: [{ data: values }],
            }}
            width={width}
            height={height}
            withDots={false}
            withInnerLines={false}
            withOuterLines={false}
            withVerticalLabels={false}
            withHorizontalLabels={false}
            chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: 'transparent',
                backgroundGradientTo: 'transparent',
                color: () => isPositive ? COLORS.success : COLORS.danger,
            }}
            bezier
            style={{ paddingRight: 0 }}
        />
    );
}

export function IndicatorChart({
    indicator,
    value,
    min = 0,
    max = 100,
    thresholds = [],
    label
}) {
    const percentage = ((value - min) / (max - min)) * 100;

    let color = COLORS.primary;
    for (const threshold of thresholds) {
        if (value <= threshold.max && value >= threshold.min) {
            color = threshold.color;
            break;
        }
    }

    return (
        <View style={styles.indicatorContainer}>
            <View style={styles.indicatorHeader}>
                <Text style={styles.indicatorLabel}>{indicator}</Text>
                <Text style={[styles.indicatorValue, { color }]}>{value?.toFixed(2)}</Text>
            </View>
            <View style={styles.indicatorBarContainer}>
                <View style={styles.indicatorBar}>
                    <View
                        style={[
                            styles.indicatorFill,
                            { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }
                        ]}
                    />
                </View>
                {thresholds.map((t, i) => (
                    <View
                        key={i}
                        style={[
                            styles.thresholdMarker,
                            { left: `${((t.value - min) / (max - min)) * 100}%` }
                        ]}
                    />
                ))}
            </View>
            {label && <Text style={styles.indicatorNote}>{label}</Text>}
        </View>
    );
}

export function CandlestickSimple({ data, width = screenWidth - moderateScale(32), height = moderateScale(150) }) {
    if (!data || data.length < 5) {
        return (
            <View style={[styles.candleContainer, { height }]}>
                <Text style={styles.noDataText}>Dados insuficientes</Text>
            </View>
        );
    }

    const recentData = data.slice(-20);
    const minPrice = Math.min(...recentData.map(d => d.low));
    const maxPrice = Math.max(...recentData.map(d => d.high));
    const priceRange = maxPrice - minPrice;

    const candleWidth = (width - 20) / recentData.length;

    return (
        <View style={[styles.candleContainer, { width, height }]}>
            {recentData.map((candle, i) => {
                const isGreen = candle.close >= candle.open;
                const bodyTop = ((maxPrice - Math.max(candle.open, candle.close)) / priceRange) * height;
                const bodyHeight = Math.max(2, (Math.abs(candle.close - candle.open) / priceRange) * height);
                const wickTop = ((maxPrice - candle.high) / priceRange) * height;
                const wickBottom = ((maxPrice - candle.low) / priceRange) * height;

                return (
                    <View
                        key={i}
                        style={[
                            styles.candleWrapper,
                            { width: candleWidth, left: i * candleWidth + 10 }
                        ]}
                    >
                        {/* Wick */}
                        <View
                            style={[
                                styles.wick,
                                {
                                    top: wickTop,
                                    height: wickBottom - wickTop,
                                    backgroundColor: isGreen ? COLORS.success : COLORS.danger,
                                }
                            ]}
                        />
                        {/* Body */}
                        <View
                            style={[
                                styles.candleBody,
                                {
                                    top: bodyTop,
                                    height: bodyHeight,
                                    backgroundColor: isGreen ? COLORS.success : COLORS.danger,
                                }
                            ]}
                        />
                    </View>
                );
            })}
        </View>
    );
}

export function VolumeChart({ data, width = screenWidth - moderateScale(32), height = moderateScale(60) }) {
    if (!data || data.length < 2) return null;

    const recentData = data.slice(-20);
    const maxVolume = Math.max(...recentData.map(d => d.volume));
    const barWidth = (width - 20) / recentData.length;

    return (
        <View style={[styles.volumeContainer, { width, height }]}>
            {recentData.map((candle, i) => {
                const isGreen = candle.close >= candle.open;
                const barHeight = (candle.volume / maxVolume) * height;

                return (
                    <View
                        key={i}
                        style={[
                            styles.volumeBar,
                            {
                                left: i * barWidth + 10,
                                width: barWidth - 2,
                                height: barHeight,
                                backgroundColor: isGreen ? COLORS.success + '60' : COLORS.danger + '60',
                            }
                        ]}
                    />
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    chartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    chart: {
        borderRadius: BORDER_RADIUS.md,
        paddingRight: 0,
    },
    noDataText: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.md,
    },
    indicatorContainer: {
        marginBottom: SPACING.md,
    },
    indicatorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    indicatorLabel: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '500',
    },
    indicatorValue: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
    },
    indicatorBarContainer: {
        position: 'relative',
        height: moderateScale(8),
    },
    indicatorBar: {
        height: moderateScale(8),
        backgroundColor: COLORS.bgLight,
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
    },
    indicatorFill: {
        height: '100%',
        borderRadius: BORDER_RADIUS.full,
    },
    thresholdMarker: {
        position: 'absolute',
        top: -2,
        width: 2,
        height: moderateScale(12),
        backgroundColor: COLORS.textMuted,
    },
    indicatorNote: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.xs,
        marginTop: SPACING.xs,
    },
    candleContainer: {
        position: 'relative',
        backgroundColor: COLORS.bgCard,
        borderRadius: BORDER_RADIUS.md,
        overflow: 'hidden',
    },
    candleWrapper: {
        position: 'absolute',
        height: '100%',
        alignItems: 'center',
    },
    wick: {
        position: 'absolute',
        width: 1,
    },
    candleBody: {
        position: 'absolute',
        width: '60%',
        borderRadius: 1,
    },
    volumeContainer: {
        position: 'relative',
        backgroundColor: COLORS.bgCard,
        borderRadius: BORDER_RADIUS.md,
        overflow: 'hidden',
    },
    volumeBar: {
        position: 'absolute',
        bottom: 0,
        borderRadius: 2,
    },
});
