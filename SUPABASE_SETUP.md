# Configuração do Supabase - LegalFlow

Este documento explica como configurar o Supabase para o sistema LegalFlow.

## 1. Configuração Inicial

### 1.1 Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Anote a URL do projeto e a chave anônima

### 1.2 Configurar Variáveis de Ambiente
1. Copie o arquivo `.env.example` para `.env`
2. Preencha as variáveis:
```bash
VITE_SUPABASE_URL=sua-url-do-supabase
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

## 2. Executar SQL Schema

Execute o SQL fornecido no projeto para criar todas as tabelas. As principais tabelas são:

- `advogados` - Cadastro de advogados
- `clientes` - Cadastro de clientes  
- `processos` - Processos jurídicos
- `journey_templates` - Templates de jornadas
- `journey_instances` - Instâncias ativas de jornadas
- `planos_pagamento` - Planos de pagamento
- `publicacoes` - Publicações do DJE
- `movimentacoes` - Movimentações processuais

## 3. Configurar Row Level Security (RLS)

### 3.1 Habilitar RLS nas tabelas principais:
```sql
-- Habilitar RLS
ALTER TABLE advogados ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos_pagamento ENABLE ROW LEVEL SECURITY;
```

### 3.2 Criar políticas básicas:
```sql
-- Política para advogados (apenas leitura própria)
CREATE POLICY "Advogados can view own data" ON advogados
FOR SELECT USING (auth.uid()::text = id::text);

-- Política para clientes (advogado pode ver seus clientes)
CREATE POLICY "Lawyers can manage their clients" ON clientes
FOR ALL USING (EXISTS (
  SELECT 1 FROM user_advogado ua 
  WHERE ua.user_id = auth.uid()
));

-- Políticas similares para outras tabelas...
```

## 4. Configurar Autenticação

### 4.1 Habilitar provedores de auth:
- Email/Password (habilitado por padrão)
- Opcionalmente: Google, GitHub, etc.

### 4.2 Criar tabela de vinculação usuário-advogado:
```sql
CREATE TABLE user_advogado (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  oab bigint REFERENCES advogados(oab) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, oab)
);
```

## 5. Configurar Funções RPC (Opcional)

### 5.1 Função para iniciar jornada:
```sql
CREATE OR REPLACE FUNCTION start_journey_instance(
  template_id uuid,
  cliente_cpfcnpj text,
  processo_numero_cnj text DEFAULT NULL,
  owner_oab bigint
) RETURNS uuid AS $$
DECLARE
  instance_id uuid;
  stage_record RECORD;
BEGIN
  -- Criar instância da jornada
  INSERT INTO journey_instances (
    template_id, cliente_cpfcnpj, processo_numero_cnj, owner_oab
  ) VALUES (
    template_id, cliente_cpfcnpj, processo_numero_cnj, owner_oab
  ) RETURNING id INTO instance_id;
  
  -- Criar stages da instância
  FOR stage_record IN 
    SELECT * FROM journey_template_stages 
    WHERE template_id = template_id 
    ORDER BY position
  LOOP
    INSERT INTO stage_instances (
      instance_id, template_stage_id, status, mandatory
    ) VALUES (
      instance_id, stage_record.id, 'pending', stage_record.mandatory
    );
  END LOOP;
  
  RETURN instance_id;
END;
$$ LANGUAGE plpgsql;
```

## 6. Dados de Desenvolvimento

O sistema inclui um script de desenvolvimento que criará dados de exemplo automaticamente quando executado em modo de desenvolvimento.

## 7. Permissões Recomendadas

### RLS Policies por módulo:

#### Clientes
- Advogados podem ver/editar apenas clientes vinculados a eles
- Clientes podem ver apenas seus próprios dados

#### Processos  
- Advogados podem ver processos onde estão vinculados
- Clientes podem ver apenas seus processos

#### Jornadas
- Advogados podem ver/editar jornadas onde são responsáveis
- Clientes podem ver suas jornadas ativas

#### Pagamentos
- Advogados podem ver planos de seus clientes
- Clientes podem ver apenas seus planos

## 8. Monitoramento

Configure alertas no Supabase para:
- Uso de API próximo do limite
- Erros de autenticação
- Queries lentas

## 9. Backup

Configure backup automático:
- Snapshots diários do banco
- Backup das configurações de auth
- Export periódico dos dados críticos
