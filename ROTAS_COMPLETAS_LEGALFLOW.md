# 🗺️ MAPEAMENTO COMPLETO DAS ROTAS - LEGALFLOW

## 🏠 **AUTENTICAÇÃO E ACESSO**

| Rota               | Componente                        | Modo      | Descrição                     |
| ------------------ | --------------------------------- | --------- | ----------------------------- |
| `/login`           | DemoLoginPage / SupabaseLoginPage | Demo/Prod | Página de login               |
| `/forgot-password` | ForgotPassword                    | Ambos     | Recuperar senha               |
| `/reset-password`  | ResetPassword                     | Ambos     | Resetar senha                 |
| `/setup`           | Setup                             | Prod      | Configuração inicial Supabase |
| `/quick-setup`     | QuickSetup                        | Prod      | Setup rápido                  |

## 🏢 **ÁREA PRINCIPAL DO ESCRITÓRIO**

### **Dashboard**

| Rota | Componente              | Modo      | Descrição           |
| ---- | ----------------------- | --------- | ------------------- |
| `/`  | DashboardV2 / Dashboard | Demo/Prod | Dashboard principal |

### **Processos Jurídicos**

| Rota                              | Componente              | Modo      | Descrição               |
| --------------------------------- | ----------------------- | --------- | ----------------------- |
| `/processos`                      | ProcessosV2 / Processos | Demo/Prod | Lista de processos      |
| `/processos/:numero_cnj`          | ProcessoDetailV2        | Demo      | Detalhes do processo    |
| `/processos/:cnj`                 | ProcessoOverview        | Prod      | Visão geral do processo |
| `/processos/:numero_cnj/overview` | ProcessoOverviewV3      | Demo      | Visão geral avançada    |
| `/processos/new`                  | ProcessoDetailV2        | Demo      | Novo processo           |

### **Gestão de Clientes**

| Rota        | Componente | Modo  | Descrição          |
| ----------- | ---------- | ----- | ------------------ |
| `/clientes` | Clientes   | Ambos | Gestão de clientes |

### **Jornadas e Workflows**

| Rota                              | Componente            | Modo      | Descrição            |
| --------------------------------- | --------------------- | --------- | -------------------- |
| `/jornadas`                       | JourneysD1 / Jornadas | Demo/Prod | Lista de jornadas    |
| `/jornadas/designer/:templateId?` | JourneyDesignerD2     | Demo      | Designer de jornadas |
| `/jornadas/new`                   | NovaJornada           | Demo      | Nova jornada         |
| `/jornadas/nova`                  | NovaJornada           | Prod      | Nova jornada         |
| `/jornadas/start`                 | IniciarJornada        | Demo      | Iniciar jornada      |
| `/jornadas/iniciar`               | IniciarJornada        | Prod      | Iniciar jornada      |

### **Inbox Legal (Múltiplas Versões)**

| Rota           | Componente                | Modo      | Descrição         |
| -------------- | ------------------------- | --------- | ----------------- |
| `/inbox`       | InboxLegalC4 / InboxLegal | Demo/Prod | Inbox principal   |
| `/InboxLegal`  | InboxLegal                | Ambos     | Inbox original    |
| `/inbox-legal` | InboxLegal                | Ambos     | Inbox alternativo |
| `/inbox-v2`    | InboxLegalV2              | Ambos     | Inbox versão 2    |
| `/inbox-sf4`   | InboxLegalSF4             | Ambos     | Inbox SF4         |

### **Agenda e Compromissos**

| Rota      | Componente        | Modo      | Descrição                 |
| --------- | ----------------- | --------- | ------------------------- |
| `/agenda` | AgendaC5 / Agenda | Demo/Prod | Calendário e compromissos |

### **Documentos**

| Rota             | Componente                | Modo      | Descrição            |
| ---------------- | ------------------------- | --------- | -------------------- |
| `/documentos`    | DocumentosC6 / Documentos | Demo/Prod | Gestão de documentos |
| `/documentos-c6` | DocumentosC6              | Prod      | Documentos versão C6 |

### **Tickets e Atividades**

| Rota          | Componente   | Modo  | Descrição             |
| ------------- | ------------ | ----- | --------------------- |
| `/tickets`    | TicketsC7    | Ambos | Sistema de tickets    |
| `/activities` | ActivitiesC8 | Ambos | Sistema de atividades |

### **Deals e Negócios**

| Rota     | Componente | Modo  | Descrição       |
| -------- | ---------- | ----- | --------------- |
| `/deals` | DealsC9    | Ambos | Gestão de deals |

## 💰 **ÁREA FINANCEIRA**

| Rota                 | Componente      | Modo  | Descrição            |
| -------------------- | --------------- | ----- | -------------------- |
| `/financeiro`        | Financeiro      | Ambos | Dashboard financeiro |
| `/financeiro/planos` | PlanosPagamento | Demo  | Planos de pagamento  |
| `/planos-pagamento`  | PlanosPagamento | Prod  | Planos de pagamento  |
| `/financeiro/stripe` | StripeCenter    | Ambos | Central Stripe       |
| `/settings/stripe`   | StripeSettings  | Ambos | Configurações Stripe |

## 📊 **RELATÓRIOS E ANALYTICS**

| Rota          | Componente | Modo  | Descrição             |
| ------------- | ---------- | ----- | --------------------- |
| `/relatorios` | Relatorios | Ambos | Sistema de relatórios |

## 🛎️ **SUPORTE E SERVIÇOS**

| Rota        | Componente | Modo  | Descrição            |
| ----------- | ---------- | ----- | -------------------- |
| `/helpdesk` | Helpdesk   | Ambos | Central de ajuda     |
| `/servicos` | Servicos   | Ambos | Catálogo de serviços |

## 👥 **CRM COMPLETO**

### **Gestão de Contatos**

| Rota                | Componente                        | Modo      | Descrição         |
| ------------------- | --------------------------------- | --------- | ----------------- |
| `/crm/contatos`     | ContatosUnificados                | Ambos     | Lista de contatos |
| `/crm/contatos/:id` | ContatoPerfil360 / ContactProfile | Demo/Prod | Perfil do contato |

### **Leads e Conversão**

| Rota         | Componente                | Modo      | Descrição       |
| ------------ | ------------------------- | --------- | --------------- |
| `/crm/leads` | LeadsConversao / CRMLeads | Demo/Prod | Gestão de leads |

### **Deals CRM**

| Rota         | Componente             | Modo      | Descrição       |
| ------------ | ---------------------- | --------- | --------------- |
| `/crm/deals` | DealsKanban / CRMDeals | Demo/Prod | Kanban de deals |

### **Relatórios CRM**

| Rota              | Componente                 | Modo      | Descrição      |
| ----------------- | -------------------------- | --------- | -------------- |
| `/crm/relatorios` | RelatoriosCRM / CRMReports | Demo/Prod | Relatórios CRM |

## 🌐 **PORTAL DO CLIENTE**

| Rota                          | Componente         | Modo  | Descrição             |
| ----------------------------- | ------------------ | ----- | --------------------- |
| `/portal/cliente/:instanceId` | PortalCliente      | Ambos | Portal principal      |
| `/portal/chat`                | PortalChat         | Ambos | Chat do cliente       |
| `/portal/jornada`             | PortalJornada      | Ambos | Jornadas do cliente   |
| `/portal/processos`           | PortalProcessos    | Ambos | Processos do cliente  |
| `/portal/compromissos`        | PortalCompromissos | Ambos | Agenda do cliente     |
| `/portal/financeiro`          | PortalFinanceiro   | Ambos | Financeiro do cliente |
| `/portal/helpdesk`            | PortalHelpdesk     | Ambos | Suporte do cliente    |
| `/portal/servicos`            | PortalServicos     | Ambos | Serviços do cliente   |

## 🔧 **ADMINISTRAÇÃO E DESENVOLVIMENTO**

### **Ferramentas de Desenvolvimento**

| Rota               | Componente      | Modo  | Descrição                    |
| ------------------ | --------------- | ----- | ---------------------------- |
| `/dev/tools`       | DevTools        | Ambos | Ferramentas do desenvolvedor |
| `/dev/auditoria`   | DevAuditoria    | Ambos | Auditoria do sistema         |
| `/dev-auditoria`   | DevAuditoria    | Ambos | Auditoria alternativa        |
| `/qa`              | QAConsole       | Ambos | Console de QA                |
| `/status`          | StatusDashboard | Ambos | Dashboard de status          |
| `/admin/integrity` | AdminIntegrity  | Ambos | Integridade do sistema       |

### **Configurações**

| Rota            | Componente   | Modo  | Descrição     |
| --------------- | ------------ | ----- | ------------- |
| `/config/flags` | FeatureFlags | Ambos | Feature flags |

### **Logs e Auditoria**

| Rota             | Componente | Modo  | Descrição        |
| ---------------- | ---------- | ----- | ---------------- |
| `/dev/audit-log` | AuditLog   | Ambos | Log de auditoria |
| `/audit-log`     | AuditLog   | Ambos | Log alternativo  |

### **Planos e Lançamento**

| Rota      | Componente | Modo  | Descrição           |
| --------- | ---------- | ----- | ------------------- |
| `/launch` | LaunchPlan | Ambos | Plano de lançamento |

## 🧪 **EXEMPLOS E TESTES**

| Rota           | Componente | Modo  | Descrição          |
| -------------- | ---------- | ----- | ------------------ |
| `/examples`    | Examples   | Ambos | Exemplos de design |
| `/api-example` | ApiExample | Ambos | Exemplo de API     |

## 🎯 **RESUMO DE FUNCIONALIDADES**

### **✅ ROTAS ATIVAS E FUNCIONAIS**

- **Total**: 75+ rotas funcionais
- **Principais**: Dashboard, Processos, Clientes, Agenda, Jornadas, Inbox, Documentos
- **CRM Completo**: Contatos, Leads, Deals, Relatórios
- **Portal Cliente**: 8 páginas completas
- **Área Financeira**: Pagamentos, Stripe, Planos
- **Desenvolvimento**: 10+ ferramentas administrativas

### **🔄 VERSIONAMENTO EVOLUTIVO**

- **V2/V3**: Versões melhoradas (ProcessosV2, DashboardV2, etc.)
- **C4/C5/C6**: Versões consolidadas (AgendaC5, DocumentosC6, etc.)
- **SF4**: Versões de feature específica (InboxLegalSF4)

### **👥 TIPOS DE USUÁRIO**

- **Advogado**: Acesso completo a todas as funcionalidades
- **Cliente**: Acesso limitado ao portal específico

### **🚀 MODO DE OPERAÇÃO**

- **Demo**: Dados fictícios, login simplificado
- **Produção**: Supabase real, autenticação completa

---

**NOTA**: Todas as rotas estão protegidas por autenticação e redirecionam para login quando não autenticado. O sistema suporta tanto modo demo quanto produção com diferentes conjuntos de páginas otimizadas para cada modo.
