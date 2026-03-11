import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { GlassCard } from '../components/UI';

export default function PrivacyPolicyScreen({ navigation }) {
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
                <Text style={styles.title}>Política de Privacidade</Text>
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
                        title="Introdução"
                        content="Esta Política de Privacidade descreve como o ArbCrypto coleta, usa, armazena e protege suas informações pessoais. Ao usar nosso aplicativo, você concorda com as práticas descritas nesta política."
                    />

                    <Section
                        number="2"
                        title="Informações que Coletamos"
                        subsections={[
                            {
                                subtitle: "2.1 Informações de Conta",
                                items: [
                                    'Nome completo',
                                    'Endereço de email',
                                    'Senha (criptografada)',
                                    'Data de criação da conta',
                                ]
                            },
                            {
                                subtitle: "2.2 Informações de Trading",
                                items: [
                                    'Histórico de trades',
                                    'Configurações de estratégia',
                                    'Preferências de risco',
                                    'Saldo e portfólio (armazenado localmente)',
                                ]
                            },
                            {
                                subtitle: "2.3 Informações Técnicas",
                                items: [
                                    'Endereço IP',
                                    'Tipo de dispositivo',
                                    'Sistema operacional',
                                    'Logs de uso do aplicativo',
                                ]
                            },
                        ]}
                    />

                    <Section
                        number="3"
                        title="Informações que NÃO Coletamos"
                        items={[
                            'Suas chaves API da Binance (armazenadas apenas localmente no seu dispositivo)',
                            'Senhas de exchanges',
                            'Informações bancárias',
                            'Documentos de identidade',
                        ]}
                    />

                    <Section
                        number="4"
                        title="Como Usamos Suas Informações"
                        items={[
                            'Fornecer e melhorar nossos serviços',
                            'Autenticar sua identidade',
                            'Executar análises de mercado com IA',
                            'Enviar notificações sobre sua conta',
                            'Detectar e prevenir fraudes',
                            'Cumprir obrigações legais',
                        ]}
                    />

                    <Section
                        number="5"
                        title="Armazenamento de Dados"
                        subsections={[
                            {
                                subtitle: "5.1 Dados na Nuvem (Supabase)",
                                items: [
                                    'Informações de conta',
                                    'Histórico de trades',
                                    'Configurações de usuário',
                                    'Logs de atividade',
                                ]
                            },
                            {
                                subtitle: "5.2 Dados Locais (Seu Dispositivo)",
                                items: [
                                    'Chaves API da Binance (criptografadas)',
                                    'Sessão de autenticação',
                                    'Cache de dados',
                                ]
                            },
                        ]}
                    />

                    <Section
                        number="6"
                        title="Segurança dos Dados"
                        content="Implementamos medidas de segurança de nível bancário:"
                        items={[
                            'Criptografia end-to-end para dados sensíveis',
                            'Armazenamento seguro (iOS Keychain / Android Keystore)',
                            'Autenticação com Supabase Auth',
                            'Comunicação via HTTPS/TLS',
                            'Row Level Security (RLS) no banco de dados',
                        ]}
                    />

                    <Section
                        number="7"
                        title="Compartilhamento de Dados"
                        content="NÓS NÃO vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, EXCETO:"
                        items={[
                            'Quando exigido por lei',
                            'Para proteger nossos direitos legais',
                            'Com seu consentimento explícito',
                            'Com provedores de serviços essenciais (Supabase, Google AI)',
                        ]}
                    />

                    <Section
                        number="8"
                        title="Seus Direitos"
                        content="Você tem o direito de:"
                        items={[
                            'Acessar seus dados pessoais',
                            'Corrigir informações incorretas',
                            'Solicitar exclusão de sua conta',
                            'Exportar seus dados',
                            'Revogar consentimentos',
                            'Opor-se ao processamento de dados',
                        ]}
                    />

                    <Section
                        number="9"
                        title="Retenção de Dados"
                        content="Mantemos seus dados enquanto sua conta estiver ativa. Após a exclusão da conta:"
                        items={[
                            'Dados pessoais são deletados em até 30 dias',
                            'Dados de trading podem ser mantidos para fins legais',
                            'Logs de segurança são mantidos por 90 dias',
                        ]}
                    />

                    <Section
                        number="10"
                        title="Cookies e Rastreamento"
                        content="O ArbCrypto é um aplicativo móvel nativo e NÃO usa cookies. Coletamos apenas dados técnicos essenciais para o funcionamento do app."
                    />

                    <Section
                        number="11"
                        title="Menores de Idade"
                        content="Nosso serviço não é destinado a menores de 18 anos. Não coletamos intencionalmente informações de menores. Se descobrirmos que coletamos dados de um menor, deletaremos imediatamente."
                    />

                    <Section
                        number="12"
                        title="Transferências Internacionais"
                        content="Seus dados podem ser transferidos e processados em servidores localizados fora do Brasil. Garantimos que tais transferências cumpram as leis de proteção de dados aplicáveis."
                    />

                    <Section
                        number="13"
                        title="Mudanças nesta Política"
                        content="Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas através do aplicativo. Recomendamos revisar esta política regularmente."
                    />

                    <Section
                        number="14"
                        title="Contato"
                        content="Para questões sobre privacidade ou para exercer seus direitos, entre em contato:"
                        items={[
                            'Email: privacidade@arbcrypto.com',
                            'Tempo de resposta: até 5 dias úteis',
                        ]}
                    />

                    <View style={styles.disclaimer}>
                        <Text style={styles.disclaimerIcon}>🔒</Text>
                        <Text style={styles.disclaimerText}>
                            SUA PRIVACIDADE É NOSSA PRIORIDADE. PROTEGEMOS SEUS DADOS COM SEGURANÇA DE NÍVEL BANCÁRIO.
                        </Text>
                    </View>
                </GlassCard>

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </View>
    );
}

function Section({ number, title, content, items, subsections }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionNumber}>{number}.</Text>
            <View style={styles.sectionContent}>
                <Text style={styles.sectionTitle}>{title}</Text>
                {content && <Text style={styles.sectionText}>{content}</Text>}

                {subsections && subsections.map((sub, index) => (
                    <View key={index} style={styles.subsection}>
                        <Text style={styles.subsectionTitle}>{sub.subtitle}</Text>
                        {sub.items && (
                            <View style={styles.itemsList}>
                                {sub.items.map((item, idx) => (
                                    <View key={idx} style={styles.item}>
                                        <Text style={styles.bullet}>•</Text>
                                        <Text style={styles.itemText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                ))}

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
    subsection: {
        marginTop: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    subsectionTitle: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        marginBottom: SPACING.xs,
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
        backgroundColor: COLORS.success + '20',
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 2,
        borderColor: COLORS.success + '40',
        marginTop: SPACING.lg,
        alignItems: 'center',
    },
    disclaimerIcon: {
        fontSize: 32,
        marginBottom: SPACING.sm,
    },
    disclaimerText: {
        color: COLORS.success,
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 20,
    },
    bottomSpacer: {
        height: SPACING.xxl,
    },
});
