# ArbCrypto - Trading Bot Profissional 🚀

Um aplicativo móvel de trading automatizado para a Binance, alimentado por Inteligência Artificial (Gemini) para análise de mercado e tomada de decisões.

## 📱 Funcionalidades

### Dashboard Principal
- **Saldo Total** em tempo real
- **Win Rate** e estatísticas de performance
- **Gráficos de preço** interativos
- **Indicadores técnicos** (RSI, MACD, Bollinger Bands)
- **Sinais de trading** gerados por IA

### Trading
- Compra e venda de criptomoedas
- Ordens de mercado e limite
- Cálculos automáticos de quantidade
- Integração com múltiplas estratégias

### Análise com IA (Gemini)
- Análise de mercado em tempo real
- Geração de sinais de compra/venda
- Análise de sentimento de mercado
- Recomendações de take profit e stop loss

### Histórico
- Registro de todos os trades executados
- Histórico de sinais gerados
- Performance por estratégia
- P&L detalhado

### Configurações
- Configuração de API da Binance
- Níveis de risco personalizáveis
- Modo testnet para simulação
- Auto-trade opcional

## 🛠 Tecnologias

- **React Native** + **Expo** - Framework mobile
- **Supabase** - Banco de dados e autenticação
- **Binance API** - Trading e dados de mercado
- **Gemini AI** - Análise inteligente de mercado
- **Zustand** - Gerenciamento de estado

## 📊 Indicadores Técnicos

O bot utiliza múltiplos indicadores para tomada de decisões:

| Indicador | Descrição | Uso |
|-----------|-----------|-----|
| **RSI** | Índice de Força Relativa | Identificar sobrecompra/sobrevenda |
| **MACD** | Convergência/Divergência de Médias | Tendência e momentum |
| **Bollinger Bands** | Bandas de volatilidade | Breakouts e reversões |
| **EMA 9/21** | Médias Exponenciais | Cruzamentos de tendência |
| **ADX** | Índice Direcional | Força da tendência |

## 🎯 Estratégias Disponíveis

1. **RSI + MACD Combo** - Combina sobrevenda/sobrecompra com cruzamentos MACD
2. **Bollinger Bands Breakout** - Identifica rompimentos de volatilidade
3. **Triple Indicator** - Requer confirmação de 3 indicadores (conservador)
4. **Momentum Scalping** - Trades rápidos baseados em momentum
5. **Trend Following** - Segue a tendência com confirmação ADX

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- Expo CLI
- Conta na Binance com API ativada
- Smartphone com Expo Go instalado

### Instalação

```bash
# Navegar para a pasta do app
cd ArbCryptoApp

# Instalar dependências
npm install

# Executar o app
npm start
```

### Configuração

1. Abra o app no seu smartphone via Expo Go
2. Vá para a aba **Config**
3. Insira sua **API Key** e **API Secret** da Binance
4. Recomendamos usar o **Modo Testnet** inicialmente
5. Configure seu **Nível de Risco** desejado
6. Teste a conexão antes de operar

## ⚠️ Avisos Importantes

- **Trading envolve riscos** - Você pode perder dinheiro
- **Nunca invista mais do que pode perder**
- **Use sempre Stop Loss** para limitar perdas
- **Teste no modo Testnet** antes de usar dinheiro real
- **A IA não garante lucros** - Use como ferramenta de auxílio

## 📁 Estrutura do Projeto

```
ArbCryptoApp/
├── src/
│   ├── components/     # Componentes reutilizáveis
│   │   ├── UI.js       # Botões, cards, badges
│   │   └── Charts.js   # Gráficos e visualizações
│   ├── screens/        # Telas do app
│   │   ├── HomeScreen.js
│   │   ├── TradeScreen.js
│   │   ├── HistoryScreen.js
│   │   └── SettingsScreen.js
│   ├── services/       # Serviços externos
│   │   ├── supabase.js # Banco de dados
│   │   ├── binance.js  # API de trading
│   │   └── gemini.js   # IA para análise
│   ├── store/          # Estado global
│   │   └── useAppStore.js
│   ├── utils/          # Utilitários
│   │   ├── indicators.js # Cálculos técnicos
│   │   └── helpers.js    # Funções auxiliares
│   ├── constants/      # Configurações
│   │   ├── theme.js    # Cores e estilos
│   │   └── config.js   # Configurações do app
│   └── navigation/     # Navegação
│       └── AppNavigator.js
├── App.js              # Entrada do app
├── app.json            # Configuração Expo
└── package.json        # Dependências
```

## 🔐 Segurança

- As credenciais da API são armazenadas de forma segura
- Nunca compartilhe sua API Secret
- Use permissões restritas na Binance (apenas trading, sem saque)
- Ative 2FA na sua conta Binance

## 📈 Schema do Banco de Dados (Supabase)

O app utiliza o schema `arbcrypto` com as seguintes tabelas:

- `user_settings` - Configurações do usuário
- `trades` - Histórico de trades
- `trading_signals` - Sinais gerados pela IA
- `balance_history` - Histórico de saldo
- `portfolio` - Ativos detidos
- `strategies` - Estratégias disponíveis
- `operation_logs` - Logs de operações
- `market_news` - Notícias de mercado

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Faça commit das alterações
4. Envie um pull request

## 📄 Licença

Este projeto é para uso pessoal e educacional.

---

**Desenvolvido com ❤️ para traders profissionais**
