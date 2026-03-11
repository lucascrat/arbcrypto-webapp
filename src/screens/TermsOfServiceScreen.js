import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { GlassCard } from '../components/UI';

export default function TermsOfServiceScreen({ navigation }) {
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
                <Text style={styles.title}>Termos de Uso</Text>
                <Text style={styles.subtitle}>Última atualização: 04 de Fevereiro de 2026</Text>
            </View>

            {/* Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <GlassCard style={styles.card}>
                    <Section
                        number="1"
                        title="Aceitação dos Termos"
                        content="Ao acessar e usar o ArbCrypto, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não use o aplicativo."
                    />

                    <Section
                        number="2"
                        title="Descrição do Serviço"
                        content="O ArbCrypto é uma plataforma de trading de criptomoedas que utiliza inteligência artificial para análise de mercado e execução de trades. O serviço é fornecido 'como está' e 'conforme disponível'."
                    />

                    <Section
                        number="3"
                        title="Riscos de Trading"
                        content="AVISO IMPORTANTE: Trading de criptomoedas envolve riscos substanciais, incluindo perda total do capital investido. Você reconhece e aceita que:"
                        items={[
                            'O mercado de criptomoedas é altamente volátil',
                            'Perdas podem exceder seu investimento inicial',
                            'Resultados passados não garantem resultados futuros',
                            'A IA não garante lucros ou previne perdas',
                            'Você é o único responsável por suas decisões de trading',
                        ]}
                    />

                    <Section
                        number="4"
                        title="Elegibilidade"
                        content="Você deve ter pelo menos 18 anos de idade e capacidade legal para celebrar contratos vinculativos. Ao usar o ArbCrypto, você declara e garante que atende a esses requisitos."
                    />

                    <Section
                        number="5"
                        title="Conta de Usuário"
                        items={[
                            'Você é responsável por manter a confidencialidade de suas credenciais',
                            'Você é responsável por todas as atividades em sua conta',
                            'Você deve notificar imediatamente sobre qualquer uso não autorizado',
                            'Não compartilhe suas credenciais com terceiros',
                        ]}
                    />

                    <Section
                        number="6"
                        title="API da Binance"
                        content="O ArbCrypto se conecta à Binance através de suas chaves API. Você reconhece que:"
                        items={[
                            'Você é responsável por configurar permissões adequadas',
                            'Recomendamos usar apenas permissões de leitura e trading (sem saque)',
                            'Suas chaves são armazenadas de forma criptografada',
                            'Você pode revogar o acesso a qualquer momento',
                        ]}
                    />

                    <Section
                        number="7"
                        title="Limitações de Responsabilidade"
                        content="O ArbCrypto e seus desenvolvedores NÃO são responsáveis por:"
                        items={[
                            'Perdas financeiras resultantes do uso do aplicativo',
                            'Erros ou imprecisões nas análises de IA',
                            'Interrupções ou falhas no serviço',
                            'Ações ou omissões de terceiros (incluindo Binance)',
                            'Problemas técnicos ou bugs no software',
                        ]}
                    />

                    <Section
                        number="8"
                        title="Isenção de Garantias"
                        content="O SERVIÇO É FORNECIDO 'COMO ESTÁ', SEM GARANTIAS DE QUALQUER TIPO, EXPRESSAS OU IMPLÍCITAS, INCLUINDO, MAS NÃO SE LIMITANDO A:"
                        items={[
                            'Garantias de comercialização',
                            'Adequação a um propósito específico',
                            'Não violação de direitos',
                            'Precisão ou confiabilidade dos resultados',
                        ]}
                    />

                    <Section
                        number="9"
                        title="Uso Aceitável"
                        content="Você concorda em NÃO:"
                        items={[
                            'Usar o aplicativo para atividades ilegais',
                            'Tentar hackear ou comprometer a segurança',
                            'Fazer engenharia reversa do software',
                            'Usar bots ou automação não autorizada',
                            'Violar leis de lavagem de dinheiro ou financiamento ao terrorismo',
                        ]}
                    />

                    <Section
                        number="10"
                        title="Privacidade de Dados"
                        content="Coletamos e processamos dados conforme nossa Política de Privacidade. Ao usar o ArbCrypto, você consente com a coleta e uso de informações conforme descrito."
                    />

                    <Section
                        number="11"
                        title="Modificações dos Termos"
                        content="Reservamo-nos o direito de modificar estes termos a qualquer momento. Mudanças significativas serão notificadas através do aplicativo. O uso continuado após as mudanças constitui aceitação dos novos termos."
                    />

                    <Section
                        number="12"
                        title="Rescisão"
                        content="Podemos suspender ou encerrar seu acesso ao ArbCrypto a qualquer momento, sem aviso prévio, por violação destes termos ou por qualquer outro motivo."
                    />

                    <Section
                        number="13"
                        title="Lei Aplicável"
                        content="Estes termos são regidos pelas leis do Brasil. Qualquer disputa será resolvida nos tribunais competentes do Brasil."
                    />

                    <Section
                        number="14"
                        title="Contato"
                        content="Para questões sobre estes Termos de Uso, entre em contato através de: suporte@arbcrypto.com"
                    />

                    <View style={styles.disclaimer}>
                        <Text style={styles.disclaimerIcon}>⚠️</Text>
                        <Text style={styles.disclaimerText}>
                            AO USAR O ARBCRYPTO, VOCÊ RECONHECE QUE LEU, ENTENDEU E CONCORDOU COM ESTES TERMOS DE USO.
                        </Text>
                    </View>
                </GlassCard>

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </View>
    );
}

function Section({ number, title, content, items }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionNumber}>{number}.</Text>
            <View style={styles.sectionContent}>
                <Text style={styles.sectionTitle}>{title}</Text>
                {content && <Text style={styles.sectionText}>{content}</Text>}
                {items && (
                    <View style={styles.itemsList}>
                        {items.map((item, index) => (
                            <View key={index} style={styles.item}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.itemText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
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
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.sm,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    card: {
        padding: SPACING.xl,
    },
    section: {
        flexDirection: 'row',
        marginBottom: SPACING.xl,
    },
    sectionNumber: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        marginRight: SPACING.sm,
        marginTop: 2,
    },
    sectionContent: {
        flex: 1,
    },
    sectionTitle: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        marginBottom: SPACING.sm,
    },
    sectionText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        lineHeight: 20,
        marginBottom: SPACING.sm,
    },
    itemsList: {
        marginTop: SPACING.xs,
    },
    item: {
        flexDirection: 'row',
        marginBottom: SPACING.xs,
    },
    bullet: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.md,
        marginRight: SPACING.xs,
        marginTop: 2,
    },
    itemText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.sm,
        lineHeight: 20,
        flex: 1,
    },
    disclaimer: {
        backgroundColor: COLORS.warning + '20',
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 2,
        borderColor: COLORS.warning + '40',
        marginTop: SPACING.lg,
        alignItems: 'center',
    },
    disclaimerIcon: {
        fontSize: 32,
        marginBottom: SPACING.sm,
    },
    disclaimerText: {
        color: COLORS.warning,
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 20,
    },
    bottomSpacer: {
        height: SPACING.xxl,
    },
});
