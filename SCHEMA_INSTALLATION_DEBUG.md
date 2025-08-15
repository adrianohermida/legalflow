# 🔍 Diagnóstico de Instalação de Schemas - Problema Identificado

## 🚨 **Problema Reportado:**
- Usuário instalou os 3 schemas (SF-2, SF-6, SF-7)
- Verificação da instalação de cada um falhou
- Funções RPC não estão sendo reconhecidas

## 🔧 **Solução Implementada:**

### **1. Componente de Diagnóstico Criado**
- ✅ **Arquivo:** `client/components/SchemaDiagnostics.tsx`
- ✅ **Funcionalidade:** Testa individualmente cada função RPC
- ✅ **Método:** Chama cada função e verifica se existe ou retorna erro

### **2. Nova Aba de Diagnóstico**
- ✅ **Localização:** `/dev-auditoria` → aba "Diagnóstico"
- ✅ **Testes disponíveis:**
  - **SF-6:** 5 funções (sf6_verify_installation, sf6_get_bridge_statistics, etc.)
  - **SF-2:** 6 funções (sf2_create_sample_data, sf2_create_process_chat_thread, etc.)
  - **SF-7:** 5 funções (sf7_verify_installation, sf7_create_evento_rapido, etc.)

### **3. Detecção Automática de Funções**
- ✅ **Método:** Testa cada função individualmente
- ✅ **Resultado:** Lista funções que estão funcionando vs. não encontradas
- ✅ **Feedback:** Toast notifications com resultados detalhados

## 🎯 **Como Usar o Diagnóstico:**

### **Passo 1: Acessar Diagnóstico**
1. Vá para `/dev-auditoria`
2. Clique na aba **"Diagnóstico"**
3. Verá o painel de testes de schema

### **Passo 2: Executar Testes**
1. **Clique "Testar SF6"** para testar funções do Bridge Activities ↔ Tickets
2. **Clique "Testar SF2"** para testar funções do Chat Multi-thread
3. **Clique "Testar SF7"** para testar funções da Agenda

### **Passo 3: Interpretar Resultados**
- ✅ **"X funções encontradas"** = Instalação funcionando
- ❌ **"Funções não encontradas: ..."** = Problema na instalação
- ⚠️ **"Função existe mas falhou"** = Função instalada, erro esperado em testes

## 🔍 **Possíveis Problemas Identificados:**

### **1. Schemas Diferentes**
- **SF-2/SF-7:** Funções podem estar no schema `legalflow` em vez de `public`
- **SF-6:** Funções estão corretamente no schema `public`

### **2. Permissões**
- Funções podem não ter `GRANT EXECUTE` para `authenticated` users
- Verificar se RLS está bloqueando acesso

### **3. Nomes de Função**
- Verificar se nomes estão exatos nos arquivos SQL
- Comparar com o que está sendo chamado no código

## 🛠️ **Próximos Passos de Debug:**

### **Execute o Diagnóstico Primeiro:**
1. Acesse a aba **"Diagnóstico"** 
2. Execute os 3 testes
3. Veja quais funções estão faltando

### **Se Funções Não Forem Encontradas:**
1. **Verificar SQL:** Conferir se o arquivo SQL foi executado completamente
2. **Verificar Schema:** Garantir que funções foram criadas no schema correto
3. **Verificar Permissões:** Confirmar `GRANT EXECUTE` nas funções

### **Comandos SQL para Verificar Manualmente:**
```sql
-- Listar funções que começam com sf no schema public
SELECT proname FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'public' AND proname LIKE 'sf%';

-- Testar chamada direta
SELECT sf6_verify_installation();
SELECT sf2_create_sample_data();
SELECT sf7_verify_installation();
```

## 🎉 **Resultado Esperado:**

Após executar o diagnóstico, você saberá exatamente:
- ✅ Quais schemas estão funcionando
- ❌ Quais funções estão faltando
- 🔧 Onde focar para corrigir problemas

**Use o diagnóstico para identificar exatamente quais funções não estão acessíveis!**
