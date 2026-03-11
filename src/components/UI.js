import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';

export function GlassCard({ children, style, gradient = false, onPress }) {
    const Container = onPress ? TouchableOpacity : View;

    const content = (
        <View style={[styles.glassCard, style]}>
            {children}
        </View>
    );

    if (gradient) {
        return (
            <Container onPress={onPress} activeOpacity={0.8}>
                <LinearGradient
                    colors={COLORS.gradientCard}
                    style={[styles.gradientCard, style]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {children}
                </LinearGradient>
            </Container>
        );
    }

    return (
        <Container onPress={onPress} activeOpacity={0.8}>
            {content}
        </Container>
    );
}

export function PrimaryButton({ title, onPress, disabled, loading, icon, style }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            style={style}
        >
            <LinearGradient
                colors={disabled ? [COLORS.bgLight, COLORS.bgMedium] : COLORS.gradientPrimary}
                style={[styles.primaryButton, disabled && styles.disabledButton]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                {icon && <View style={styles.buttonIcon}>{icon}</View>}
                <Text style={[styles.buttonText, disabled && styles.disabledText]}>
                    {loading ? 'Carregando...' : title}
                </Text>
            </LinearGradient>
        </TouchableOpacity>
    );
}

export function SecondaryButton({ title, onPress, disabled, style }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.8}
            style={[styles.secondaryButton, disabled && styles.disabledButton, style]}
        >
            <Text style={[styles.secondaryButtonText, disabled && styles.disabledText]}>
                {title}
            </Text>
        </TouchableOpacity>
    );
}

export function Badge({ label, type = 'default', size = 'md' }) {
    const badgeColors = {
        success: COLORS.success,
        danger: COLORS.danger,
        warning: COLORS.warning,
        info: COLORS.info,
        default: COLORS.primary,
        buy: COLORS.success,
        sell: COLORS.danger,
        hold: COLORS.warning,
    };

    return (
        <View style={[
            styles.badge,
            { backgroundColor: badgeColors[type] + '20' },
            size === 'sm' && styles.badgeSm,
        ]}>
            <Text style={[
                styles.badgeText,
                { color: badgeColors[type] },
                size === 'sm' && styles.badgeTextSm,
            ]}>
                {label}
            </Text>
        </View>
    );
}

export function StatCard({ label, value, change, changePercent, icon }) {
    const isPositive = change >= 0;

    return (
        <GlassCard style={styles.statCard} gradient>
            <View style={styles.statHeader}>
                {icon && <View style={styles.statIcon}>{icon}</View>}
                <Text style={styles.statLabel}>{label}</Text>
            </View>
            <Text style={styles.statValue}>{value}</Text>
            {(change !== undefined || changePercent !== undefined) && (
                <Text style={[styles.statChange, isPositive ? styles.positive : styles.negative]}>
                    {isPositive ? '↑' : '↓'} {changePercent !== undefined ? `${changePercent.toFixed(2)}%` : change}
                </Text>
            )}
        </GlassCard>
    );
}

export function PriceDisplay({ price, change, size = 'md' }) {
    const isPositive = change >= 0;

    return (
        <View style={styles.priceContainer}>
            <Text style={[styles.price, size === 'lg' && styles.priceLg]}>
                ${typeof price === 'number' ? price.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: price < 1 ? 6 : 2
                }) : price}
            </Text>
            {change !== undefined && (
                <View style={[styles.changeContainer, isPositive ? styles.positiveChange : styles.negativeChange]}>
                    <Text style={[styles.changeText, isPositive ? styles.positive : styles.negative]}>
                        {isPositive ? '+' : ''}{change.toFixed(2)}%
                    </Text>
                </View>
            )}
        </View>
    );
}

export function Divider({ style }) {
    return <View style={[styles.divider, style]} />;
}

export function LoadingSpinner({ size = 'md', color = COLORS.primary }) {
    return (
        <View style={[styles.spinnerContainer, size === 'lg' && styles.spinnerLg]}>
            <View style={[styles.spinner, { borderTopColor: color }]} />
        </View>
    );
}

export function EmptyState({ title, message, icon }) {
    return (
        <View style={styles.emptyState}>
            {icon && <View style={styles.emptyIcon}>{icon}</View>}
            <Text style={styles.emptyTitle}>{title}</Text>
            {message && <Text style={styles.emptyMessage}>{message}</Text>}
        </View>
    );
}

export function ProgressBar({ progress, color = COLORS.primary }) {
    return (
        <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: color }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    glassCard: {
        backgroundColor: COLORS.glassLight,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.md,
        ...SHADOWS.md,
    },
    gradientCard: {
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.md,
        ...SHADOWS.md,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        borderRadius: BORDER_RADIUS.md,
        ...SHADOWS.glow,
    },
    buttonText: {
        color: COLORS.textInverse,
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
    },
    buttonIcon: {
        marginRight: SPACING.sm,
    },
    secondaryButton: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.primary,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    },
    disabledText: {
        color: COLORS.textMuted,
    },
    badge: {
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        alignSelf: 'flex-start',
    },
    badgeSm: {
        paddingVertical: 2,
        paddingHorizontal: SPACING.xs,
    },
    badgeText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    badgeTextSm: {
        fontSize: FONT_SIZES.xs,
    },
    statCard: {
        minWidth: 140,
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    statIcon: {
        marginRight: SPACING.xs,
    },
    statLabel: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
    },
    statValue: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.xxl,
        fontWeight: '700',
    },
    statChange: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        marginTop: SPACING.xs,
    },
    positive: {
        color: COLORS.success,
    },
    negative: {
        color: COLORS.danger,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    price: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.xl,
        fontWeight: '700',
    },
    priceLg: {
        fontSize: FONT_SIZES.xxxl,
    },
    changeContainer: {
        paddingVertical: 2,
        paddingHorizontal: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
    },
    positiveChange: {
        backgroundColor: COLORS.success + '20',
    },
    negativeChange: {
        backgroundColor: COLORS.danger + '20',
    },
    changeText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: SPACING.md,
    },
    spinnerContainer: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    spinnerLg: {
        width: 50,
        height: 50,
    },
    spinner: {
        width: '100%',
        height: '100%',
        borderRadius: BORDER_RADIUS.full,
        borderWidth: 3,
        borderColor: COLORS.border,
        borderTopColor: COLORS.primary,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xxl,
    },
    emptyIcon: {
        marginBottom: SPACING.md,
    },
    emptyTitle: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '600',
        marginBottom: SPACING.xs,
    },
    emptyMessage: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.md,
        textAlign: 'center',
    },
    progressContainer: {
        height: 6,
        backgroundColor: COLORS.bgLight,
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: BORDER_RADIUS.full,
    },
});
