# 🔧 CONFIGURAÇÃO DO SISTEMA AUTOFIX

## 📋 Instruções Passo a Passo

### 1. 🗄️ Configurar Banco de Dados

#### Opção A: Setup Automático (Recomendado)

1. Acesse `/autofix-testing` na aplicação
2. Clique em **"Executar Todos"** ou **"Test DB"**
3. O sistema tentará criar as tabelas automaticamente

#### Opção B: Setup Manual (Se automático falhar)

1. **Baixe o script SQL:**

   - Acesse `/autofix-testing`
   - Na aba "Manual Setup", clique em **"Baixar SQL"**
   - Ou copie o conteúdo diretamente

2. **Execute no Supabase:**

   - Abra [Supabase Dashboard](https://supabase.com/dashboard)
   - Vá para **SQL Editor**
   - Cole o script completo
   - Execute todas as linhas

3. **Verifique o Setup:**
   - Volte para `/autofix-testing`
   - Clique em **"Verificar Setup"**

### 2. 🔑 Credenciais Configuradas

✅ **Builder.io API:**

- Public Key: `8e0d76d5073b4c34837809cac5eca825`
- Private Key: `bpk-c334462169634b3f8157b6074848b012`

✅ **Supabase Service Role:**

- Configurada para operações administrativas
- Permite criação automática de tabelas

### 3. 🧪 Testar o Sistema

1. **Acesse a interface de testes:** `/autofix-testing`
2. **Execute diagnósticos:** Clique em "Diagnostics"
3. **Teste completo:** Clique em "Executar Todos"
4. **Teste prompts:** Use a aba "Custom Testing"

## 📄 Arquivo SQL

**Localização:** `AUTOFIX_DATABASE_SETUP.sql`

**Conteúdo completo:** _(disponível para download na interface)_

**O que o script faz:**

- Cria tabela `autofix_history`
- Cria tabela `builder_prompts`
- Adiciona índices para performance
- Cria funções para estatísticas
- Insere dados de exemplo
- Configura triggers automáticos

## 🔍 Verificação de Funcionamento

### ✅ Indicadores de Sucesso

- Status "✅ API Configurada" no header
- Status "✅ Banco OK" no header
- Todos os testes marcados como "SUCCESS"
- Modificações aparecendo no histórico

### ❌ Indicadores de Problema

- Mensagens de erro nos testes
- Status "⚠️ API Pendente" ou "🔧 Banco Pendente"
- Falha nos testes de operação do banco

## 🆘 Solução de Problemas

### Erro: "Tabelas não encontradas"

1. Execute o script SQL manualmente
2. Verifique permissões no Supabase
3. Confirme que as tabelas foram criadas

### Erro: "Permission denied"

1. Verifique RLS policies no Supabase
2. Confirme service role key configurada
3. Execute script como admin

### Erro: "[object Object]"

1. Verifique console do navegador para detalhes
2. Execute diagnósticos para mais informações
3. Recarregue a página se necessário

## 🚀 Recursos Disponíveis

### 🔄 Sistema de Histórico

- Registro automático de todas as modificações
- Tipos: `autofix`, `manual`, `builder_prompt`, `git_import`
- Contexto completo com metadados

### 🛠️ Integração Builder.io

- API real com fallback mock
- Prompts customizados por categoria
- Priorização de tarefas

### 📊 Interface de Monitoramento

- Dashboard de testes em tempo real
- Status visual dos componentes
- Histórico detalhado de modificações

### 🗄️ Gerenciamento de Banco

- Setup automático quando possível
- Verificação de integridade
- Limpeza automática de dados antigos

## 📞 Links Úteis

- **Interface de Testes:** [/autofix-testing](/autofix-testing)
- **Supabase Dashboard:** [https://supabase.com/dashboard](https://supabase.com/dashboard)
- **SQL Editor:** [https://supabase.com/dashboard/project/\_/sql/new](https://supabase.com/dashboard/project/_/sql/new)

---

**Sistema configurado e pronto para uso! 🎉**
