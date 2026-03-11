import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { GlassCard } from '../components/UI';

export default function RiskDisclaimerScreen({ navigation }) {
    return (
        <View style={styles.container}>
            <LinearGradient colors={COLORS.gradientDark} style={styles.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backText}>← Voltar</Text>
                </TouchableOpacity>
                <Text style={styles.title}>⚠️ Aviso de Risco</Text>
                <Text style={styles.subtitle}>LEIA ATENTAMENTE ANTES DE OPERAR</Text>
            </View>

            {/* Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.criticalWarning}>
                    <Text style={styles.warningIcon}>🚨</Text>
                    <Text style={styles.warningTitle}>AVISO CRÍTICO</Text>
                    <Text style={styles.warningText}>
                        TRADING DE CRIPTOMOEDAS É EXTREMAMENTE ARRISCADO E PODE RESULTAR EM PERDA TOTAL DO SEU CAPITAL.
                    </Text>
                </View>

                <GlassCard style={styles.card}>
                    <RiskSection
                        icon="💸"
                        title="Risco de Perda Total"
                        items={[
                            'Você pode perder TODO o dinheiro investido',
                            'Perdas podem exceder seu investimento inicial em operações alavancadas',
                            'O mercado de criptomoedas é extremamente volátil',
                            'Quedas de 50% ou mais em um único dia são possíveis',
                        ]}
                    />

                    <RiskSection
                        icon="🤖"
                        title="Limitações da Inteligência Artificial"
                        items={[
                            'A IA NÃO garante lucros',
                            'Análises podem estar incorretas',
                            'Resultados passados NÃO garantem resultados futuros',
                            'A IA não pode prever eventos imprevisíveis (black swans)',
                            'Bugs ou erros no algoritmo podem causar perdas',
                        ]}
                    />

                    <RiskSection
                        icon="⚡"
                        title="Riscos do Mercado"
                        items={[
                            'Volatilidade extrema (variações de 10-50% em horas)',
                            'Manipulação de mercado (pump and dump)',
                            'Liquidez baixa em alguns pares',
                            'Gaps de preço (diferenças entre preço de compra e venda)',
                            'Flash crashes (quedas súbitas)',
                        ]}
                    />

                    <RiskSection
                        icon="🔧"
                        title="Riscos Técnicos"
                        items={[
                            'Falhas de conexão com a internet',
                            'Problemas na API da Binance',
                            'Bugs no aplicativo',
                            'Atrasos na execução de ordens',
                            'Erros de sincronização de dados',
                        ]}
                    />

                    <RiskSection
                        icon="🏦"
                        title="Riscos da Exchange"
                        items={[
                            'Hacks ou invasões na Binance',
                            'Congelamento de fundos',
                            'Mudanças nas regras de trading',
                            'Problemas regulatórios',
                            'Insolvência da exchange (raro, mas possível)',
                        ]}
                    />

                    <RiskSection
                        icon="⚖️"
                        title="Riscos Regulatórios"
                        items={[
                            'Mudanças nas leis de criptomoedas',
                            'Proibições governamentais',
                            'Taxação retroativa',
                            'Restrições de saque',
                            'Obrigações de declaração fiscal',
                        ]}
                    />

                    <RiskSection
                        icon="🧠"
                        title="Riscos Psicológicos"
                        items={[
                            'FOMO (Fear of Missing Out) - medo de perder oportunidades',
                            'Panic selling - venda por pânico',
                            'Overtrading - operar em excesso',
                            'Revenge trading - tentar recuperar perdas',
                            'Viés de confirmação - ver apenas o que quer ver',
                        ]}
                    />

                    <View style={styles.divider} />

                    <View style={styles.recommendations}>
                        <Text style={styles.recommendationsTitle}>
                            ✅ RECOMENDAÇÕES IMPORTANTES
                        </Text>

                        <RecommendationItem
                            number="1"
                            text="NUNCA invista dinheiro que você não pode perder"
                        />
                        <RecommendationItem
                            number="2"
                            text="Comece com valores PEQUENOS para testar"
                        />
                        <RecommendationItem
                            number="3"
                            text="Use SEMPRE os limites de perda diária"
                        />
                        <RecommendationItem
                            number="4"
                            text="NÃO opere sob emoção (raiva, ganância, medo)"
                        />
                        <RecommendationItem
                            number="5"
                            text="Diversifique seus investimentos (não coloque tudo em crypto)"
                        />
                        <RecommendationItem
                            number="6"
                            text="Eduque-se continuamente sobre o mercado"
                        />
                        <RecommendationItem
                            number="7"
                            text="Monitore CONSTANTEMENTE suas operações"
                        />
                        <RecommendationItem
                            number="8"
                            text="Tenha um plano de saída ANTES de entrar"
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.disclaimer}>
                        <Text style={styles.disclaimerTitle}>ISENÇÃO DE RESPONSABILIDADE</Text>
                        <Text style={styles.disclaimerText}>
                            O ArbCrypto e seus desenvolvedores NÃO são consultores financeiros.
                            Este aplicativo é uma FERRAMENTA, não um conselho de investimento.
                        </Text>
                        <Text style={styles.disclaimerText}>
                            Você é o ÚNICO responsável por suas decisões de trading e suas consequências.
                        </Text>
                        <Text style={styles.disclaimerText}>
                            NÃO nos responsabilizamos por perdas financeiras, danos diretos ou indiretos
                            resultantes do uso deste aplicativo.
                        </Text>
                    </View>

                    <View style={styles.finalWarning}>
                        <Text style={styles.finalWarningIcon}>⚠️</Text>
                        <Text style={styles.finalWarningText}>
                            SE VOCÊ NÃO ESTÁ DISPOSTO A PERDER TODO O SEU INVESTIMENTO,
                            NÃO USE ESTE APLICATIVO PARA TRADING REAL.
                        </Text>
                    </View>
                </GlassCard>

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </View>
    );
}

function RiskSection({ icon, title, items }) {
    return (
        <View style={styles.riskSection}>
            <View style={styles.riskHeader}>
                <Text style={styles.riskIcon}>{icon}</Text>
                <Text style={styles.riskTitle}>{title}</Text>
            </View>
            <View style={styles.riskItems}>
                {items.map((item, index) => (
                    <View key={index} style={styles.riskItem}>
                        <Text style={styles.riskBullet}>▸</Text>
                        <Text style={styles.riskItemText}>{item}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

function RecommendationItem({ number, text }) {
    return (
        <View style={styles.recommendationItem}>
            <View style={styles.recommendationNumber}>
                <Text style={styles.recommendationNumberText}>{number}</Text>
            </View>
            <Text style={styles.recommendationText}>{text}</Text>
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
        paddingTop: SPACING.xxl,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    backButton: {
        marginBottom: SPACING.md,
    },
    backText: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.xxxl,
        fontWeight: '800',
        marginBottom: SPACING.xs,
    },
    subtitle: {
        color: COLORS.danger,
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    criticalWarning: {
        backgroundColor: COLORS.danger,
        padding: SPACING.xl,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    warningIcon: {
        fontSize: 48,
        marginBottom: SPACING.sm,
    },
    warningTitle: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.xl,
        fontWeight: '800',
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    warningText: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 22,
    },
    card: {
        padding: SPACING.xl,
    },
    riskSection: {
        marginBottom: SPACING.xl,
    },
    riskHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    riskIcon: {
        fontSize: 24,
        marginRight: SPACING.sm,
    },
    riskTitle: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        flex: 1,
    },
    riskItems: {
        paddingLeft: SPACING.lg,
    },
    riskItem: {
        flexDirection: 'row',
        marginBottom: SPACING.xs,
    },
    riskBullet: {
        color: COLORS.danger,
        fontSize: FONT_SIZES.md,
        marginRight: SPACING.xs,
        fontWeight: '700',
    },
    riskItemText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        lineHeight: 20,
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: SPACING.xl,
    },
    recommendations: {
        backgroundColor: COLORS.success + '10',
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.success + '40',
    },
    recommendationsTitle: {
        color: COLORS.success,
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    recommendationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    recommendationNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.success,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.sm,
    },
    recommendationNumberText: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
    },
    recommendationText: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        flex: 1,
        lineHeight: 18,
    },
    disclaimer: {
        backgroundColor: COLORS.warning + '20',
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.warning + '40',
    },
    disclaimerTitle: {
        color: COLORS.warning,
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    disclaimerText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        lineHeight: 20,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    finalWarning: {
        backgroundColor: COLORS.danger + '20',
        padding: SPACING.xl,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 2,
        borderColor: COLORS.danger,
        marginTop: SPACING.lg,
        alignItems: 'center',
    },
    finalWarningIcon: {
        fontSize: 40,
        marginBottom: SPACING.sm,
    },
    finalWarningText: {
        color: COLORS.danger,
        fontSize: FONT_SIZES.md,
        fontWeight: '800',
        textAlign: 'center',
        lineHeight: 22,
    },
    bottomSpacer: {
        height: SPACING.xxl,
    },
});
