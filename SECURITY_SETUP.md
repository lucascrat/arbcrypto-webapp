# 🔒 INSTRUÇÕES DE CONFIGURAÇÃO SEGURA

## Passo 1: Criar arquivo .env
Copie este arquivo para `.env` e preencha com suas credenciais REAIS:

```bash
cp .env.example .env
```

## Passo 2: Preencher credenciais
Abra o arquivo `.env` e substitua os valores:

```env
# Supabase Configuration
SUPABASE_URL=https://qyagfghcnzenvbhbtsvd.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5YWdmZ2hjbnplbnZiaGJ0c3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDU2NjksImV4cCI6MjA4MzMyMTY2OX0.k_cVE7tLn23NIuuMJlCdWw97F_ZkPpz7SS7d-MleJVc

# Gemini AI Configuration
GEMINI_API_KEY=AIzaSyCtkIEEDnIoc4YHIXALsPePcIw50qlfxaM

# Environment
NODE_ENV=development
```

## Passo 3: IMPORTANTE - Segurança
⚠️ **NUNCA** faça commit do arquivo `.env` no Git!
✅ O arquivo `.gitignore` já está configurado para ignorá-lo

## Passo 4: Rotacionar Chaves (OBRIGATÓRIO)
🔴 **ATENÇÃO:** As chaves acima foram expostas no código. Você DEVE:

### Supabase:
1. Acesse: https://supabase.com/dashboard/project/qyagfghcnzenvbhbtsvd/settings/api
2. Clique em "Reset" na Anon Key
3. Copie a nova chave para o `.env`

### Gemini:
1. Acesse: https://aistudio.google.com/app/apikey
2. Revogue a chave antiga
3. Crie uma nova chave
4. Copie para o `.env`

## Passo 5: Verificar
Execute o app e verifique se não há warnings de variáveis não configuradas.

---

## 📋 Checklist de Segurança
- [ ] Arquivo `.env` criado
- [ ] Credenciais preenchidas
- [ ] `.env` NÃO está no Git (verificar com `git status`)
- [ ] Chaves rotacionadas
- [ ] App testado e funcionando
- [ ] Arquivo `banco de dados supa.txt` deletado
