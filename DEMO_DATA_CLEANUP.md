# 🗑️ **PLANO DE LIMPEZA - DADOS DE DEMONSTRAÇÃO**

**Objetivo:** Remover todos os dados de demonstração e mock data do sistema LegalFlow  
**Prioridade:** CRÍTICA - Deve ser executado antes do deploy de produção  
**Tempo Estimado:** 4-6 horas

---

## 📋 **CHECKLIST DE LIMPEZA**

### **🔴 FASE 1: ARQUIVOS COM MOCK DATA EXTENSIVO**

#### **1.1 - IniciarJornada.tsx** ⚠️ **CRÍTICO**

```typescript
// REMOVER COMPLETAMENTE:
const mockTemplates = [...] // Linhas 38-50
const mockClientes = [...] // Linhas 52-65
const mockProcessos = [...] // Linhas 67-80
const mockAdvogados = [...] // Linhas 82-88

// SUBSTITUIR POR:
// Queries reais ao banco de dados usando useSupabaseQuery
```

#### **1.2 - Dashboard.tsx** ⚠️ **CRÍTICO**

```typescript
// REMOVER:
const mockStats = {...} // Linhas 27-40
const mockRecentActivity = [...] // Linhas 42-67

// SUBSTITUIR POR:
// Dashboard com dados reais via SQL agregations
```

#### **1.3 - ChatDock.tsx** ⚠️ **CRÍTICO**

```typescript
// REMOVER:
const mockThreads = [...] // Linhas 15-35
const mockMessages = [...] // Linhas 37-49

// SUBSTITUIR POR:
// useSupabaseQuery para thread_links e ai_messages reais
```

#### **1.4 - Portal Cliente** ⚠️ **CRÍTICO**

```typescript
// REMOVER COMPLETAMENTE:
const mockJourneyInstance = {...} // Linhas 35-290

// SUBSTITUIR POR:
// Query real para journey_instances do cliente logado
```

### **🟡 FASE 2: COMPONENTES DE INTERFACE**

#### **2.1 - CommandPalette.tsx**

```typescript
// REMOVER:
const mockResults = {...} // Linhas 17-50

// IMPLEMENTAR:
// Busca real em processos, clientes, atividades
```

#### **2.2 - NotificationPanel.tsx**

```typescript
// REMOVER:
const mockNotifications = [...] // Linhas 23-54

// IMPLEMENTAR:
// Sistema real de notificações via legalflow.notifications
```

#### **2.3 - FinancialMilestones.tsx**

```typescript
// REMOVER mock data nas queries (Linhas 91-104)
// IMPLEMENTAR queries reais para planos_pagamento
```

### **🟢 FASE 3: SISTEMA DEMO PARALELO**

#### **3.1 - DemoAuthContext.tsx** 🚨 **REMOVER COMPLETAMENTE**

- Sistema de autenticação paralelo para demos
- Usuários fictícios hardcoded
- Lógica de OAB fake

#### **3.2 - Arquivos de Desenvolvimento**

```bash
# REMOVER OU MOVER PARA /dev:
client/lib/dev-setup.ts
client/lib/test-legalflow.ts
client/lib/create-test-user.ts
client/pages/DevTools.tsx (manter apenas em dev)
```

### **🔵 FASE 4: DADOS HARDCODED RECORRENTES**

#### **4.1 - Usuários de Teste**

```typescript
// REMOVER todas as referências:
"test@example.com";
"admin.test@gmail.com";
"João Silva";
"Empresa ABC Ltda";
CPF: "123.456.789-00";
CNPJ: "12.345.678/0001-90";
```

#### **4.2 - Processos de Exemplo**

```typescript
// REMOVER:
"1000123-45.2024.8.26.0001";
"5000456-78.2024.8.26.0002";
// E similares em todos os arquivos
```

#### **4.3 - OABs de Teste**

```typescript
// REMOVER:
123456, 654321, 789012;
// Substituir por validação real de OAB
```

---

## 🛠️ **SCRIPTS DE AUTOMAÇÃO**

### **Script 1: Buscar e Listar Mock Data**

```bash
#!/bin/bash
echo "🔍 Buscando dados de demonstração..."

# Buscar arrays mock
grep -r "mock[A-Z]" client/ --include="*.tsx" --include="*.ts"

# Buscar dados hardcoded comuns
grep -r "João Silva\|test@example\|123\.456\.789\|12\.345\.678" client/ --include="*.tsx" --include="*.ts"

# Buscar arrays com dados estáticos
grep -r "\[\s*{.*nome.*}" client/ --include="*.tsx" --include="*.ts"

echo "✅ Busca conclu��da. Revisar resultados acima."
```

### **Script 2: Validar Limpeza**

```bash
#!/bin/bash
echo "🧹 Validando limpeza de mock data..."

ISSUES=0

# Verificar se ainda existem mocks
if grep -r "mock[A-Z]" client/ --include="*.tsx" --include="*.ts" | grep -v node_modules; then
    echo "❌ Ainda existem mock data"
    ISSUES=$((ISSUES + 1))
fi

# Verificar dados de teste comuns
if grep -r "test@example\|João Silva" client/ --include="*.tsx" --include="*.ts" | grep -v node_modules; then
    echo "❌ Ainda existem dados de teste"
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    echo "✅ Limpeza validada com sucesso!"
else
    echo "⚠️  Encontrados $ISSUES tipos de problemas"
fi
```

---

## 📝 **TEMPLATES DE SUBSTITUIÇÃO**

### **Template 1: Dashboard Real**

```typescript
// client/pages/Dashboard.tsx - VERSÃO LIMPA
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';

const Dashboard = () => {
  // Stats reais do banco
  const { data: stats } = useSupabaseQuery(
    'dashboard-stats',
    `
    SELECT
      (SELECT COUNT(*) FROM public.processos) as total_processos,
      (SELECT COUNT(*) FROM public.clientes) as total_clientes,
      (SELECT COUNT(*) FROM legalflow.tickets WHERE status = 'aberto') as tickets_abertos,
      (SELECT COUNT(*) FROM legalflow.activities WHERE status = 'todo') as tarefas_pendentes
    `
  );

  // Atividade recente real
  const { data: recentActivity } = useSupabaseQuery(
    'recent-activity',
    `
    SELECT * FROM legalflow.activities
    ORDER BY created_at DESC
    LIMIT 5
    `
  );

  return (
    <div className="dashboard">
      {/* Render com dados reais */}
    </div>
  );
};
```

### **Template 2: Portal Cliente Real**

```typescript
// client/pages/portal/PortalCliente.tsx - VERSÃO LIMPA
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { useDemoAuth } from '../../contexts/DemoAuthContext';

const PortalCliente = () => {
  const { user } = useDemoAuth();

  // Journey real do cliente logado
  const { data: journeyInstance } = useSupabaseQuery(
    'client-journey',
    `
    SELECT ji.*, jt.name as template_name
    FROM legalflow.journey_instances ji
    JOIN legalflow.journey_templates jt ON jt.id = ji.template_id
    WHERE ji.cliente_cpfcnpj = $1
    ORDER BY ji.created_at DESC
    LIMIT 1
    `,
    [user?.cpfcnpj]
  );

  return (
    <div className="portal-cliente">
      {/* Render com journey real */}
    </div>
  );
};
```

### **Template 3: Busca Real**

```typescript
// client/components/CommandPalette.tsx - VERSÃO LIMPA
const CommandPalette = () => {
  const [query, setQuery] = useState('');

  const { data: searchResults } = useSupabaseQuery(
    'global-search',
    `
    SELECT 'processo' as type, numero_cnj as id, titulo_polo_ativo as title
    FROM public.processos
    WHERE titulo_polo_ativo ILIKE $1

    UNION ALL

    SELECT 'cliente' as type, cpfcnpj as id, nome as title
    FROM public.clientes
    WHERE nome ILIKE $1

    LIMIT 10
    `,
    [`%${query}%`],
    { enabled: query.length > 2 }
  );

  return (
    <div className="command-palette">
      {/* Render resultados reais */}
    </div>
  );
};
```

---

## ⚡ **EXECUÇÃO STEP-BY-STEP**

### **Dia 1 - Preparação (2h)**

1. ✅ **Backup completo** do código atual
2. ✅ **Executar scripts** de busca de mock data
3. ✅ **Criar branch** `cleanup/remove-demo-data`
4. ✅ **Listar todos** os arquivos afetados

### **Dia 2 - Limpeza Principal (4h)**

1. ✅ **Remover mock arrays** dos arquivos principais
2. ✅ **Substituir por queries** reais usando templates
3. ✅ **Testar funcionamento** de cada página modificada
4. ✅ **Remover sistema demo** paralelo

### **Dia 3 - Validação (2h)**

1. ✅ **Executar script** de validação
2. ✅ **Testes funcionais** em todas as páginas
3. ✅ **Code review** completo
4. ✅ **Merge para** branch principal

---

## 🚨 **CUIDADOS ESPECIAIS**

### **⚠️ NÃO REMOVER:**

- **Componentes de UI** (apenas limpar dados)
- **Lógica de negócio** (apenas dados hardcoded)
- **Estrutura de pastas** (apenas conteúdo de arquivos)
- **Tipos TypeScript** (apenas valores de exemplo)

### **✅ MANTER EM DEV:**

- `client/lib/dev-setup.ts` (apenas dev)
- `client/pages/DevTools.tsx` (apenas dev)
- Demo data em **storybook** se existir

### **🔐 PROTEGER:**

- **Não commitar** credenciais reais
- **Environment vars** para produção
- **Backup** antes de mudanças grandes

---

## 📊 **CRITÉRIOS DE SUCESSO**

### **✅ Limpeza Completa:**

- ✅ Zero occorrências de `mock[A-Z]` em produção
- ✅ Zero dados hardcoded de teste
- ✅ Todas as páginas carregam com dados reais
- ✅ Testes passando após modificações

### **✅ Sistema Funcional:**

- ✅ Dashboard mostra métricas reais
- ✅ Portal cliente funciona com dados reais
- ✅ Busca retorna resultados do banco
- ✅ Todas as funcionalidades preservadas

### **✅ Performance:**

- ✅ Queries otimizadas para dados reais
- ✅ Loading states adequados
- ✅ Error handling robusto
- ✅ UX mantida ou melhorada

---

**💡 DICA:** Execute a limpeza em ambiente de desenvolvimento primeiro e valide todas as funcionalidades antes de aplicar em staging/produção.

**⏰ PRAZO:** Concluir limpeza antes do próximo deploy de produção.

**🎯 META:** Sistema 100% livre de dados de demonstração e pronto para usuários reais.
