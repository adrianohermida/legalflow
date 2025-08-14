-- SQL_INTEGRITY_FIXES.sql
-- Script para corrigir problemas de integridade identificados na auditoria
-- Execute em ambiente de desenvolvimento/staging antes de produção

-- =============================================
-- 1. CORRIGIR FOREIGN KEYS AUSENTES
-- =============================================

-- Fix: time_entries.activity_id sem FK constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_time_entries_activity'
    ) THEN
        ALTER TABLE legalflow.time_entries 
        ADD CONSTRAINT fk_time_entries_activity 
        FOREIGN KEY (activity_id) REFERENCES legalflow.activities(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Fix: planos_pagamento.journey_instance_id sem FK constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_planos_journey'
    ) THEN
        ALTER TABLE legalflow.planos_pagamento 
        ADD CONSTRAINT fk_planos_journey 
        FOREIGN KEY (journey_instance_id) REFERENCES legalflow.journey_instances(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Fix: deals.contact_id precisa de FK constraint adequada
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_deals_contact'
    ) THEN
        ALTER TABLE legalflow.deals 
        ADD CONSTRAINT fk_deals_contact 
        FOREIGN KEY (contact_id) REFERENCES legalflow.contacts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =============================================
-- 2. CORRIGIR REGRAS DE CASCATA
-- =============================================

-- Fix: stage_instances deve ter CASCADE delete com journey_instances
DO $$ 
BEGIN
    -- Remove constraint existente se houver
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stage_instances_instance_id_fkey'
    ) THEN
        ALTER TABLE legalflow.stage_instances 
        DROP CONSTRAINT stage_instances_instance_id_fkey;
    END IF;
    
    -- Adiciona nova constraint com CASCADE
    ALTER TABLE legalflow.stage_instances 
    ADD CONSTRAINT fk_stage_instance_journey 
    FOREIGN KEY (instance_id) REFERENCES legalflow.journey_instances(id) ON DELETE CASCADE;
END $$;

-- Fix: activities deve ter CASCADE delete com stage_instances  
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_activities_stage_instance'
    ) THEN
        ALTER TABLE legalflow.activities 
        ADD CONSTRAINT fk_activities_stage_instance 
        FOREIGN KEY (stage_instance_id) REFERENCES legalflow.stage_instances(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Fix: ticket_threads deve ter CASCADE delete com tickets
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_ticket_threads_ticket'
    ) THEN
        ALTER TABLE legalflow.ticket_threads 
        ADD CONSTRAINT fk_ticket_threads_ticket 
        FOREIGN KEY (ticket_id) REFERENCES legalflow.tickets(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =============================================
-- 3. ADICIONAR CONSTRAINTS NOT NULL AUSENTES
-- =============================================

-- Fix: contacts.name deve ser NOT NULL
DO $$ 
BEGIN
    -- Primeiro limpa dados inválidos se houver
    UPDATE legalflow.contacts SET name = 'Nome não informado' WHERE name IS NULL OR trim(name) = '';
    
    -- Adiciona constraint NOT NULL
    ALTER TABLE legalflow.contacts ALTER COLUMN name SET NOT NULL;
END $$;

-- Fix: tickets.subject deve ser NOT NULL
DO $$ 
BEGIN
    -- Primeiro limpa dados inválidos se houver
    UPDATE legalflow.tickets SET subject = 'Assunto não informado' WHERE subject IS NULL OR trim(subject) = '';
    
    -- Adiciona constraint NOT NULL
    ALTER TABLE legalflow.tickets ALTER COLUMN subject SET NOT NULL;
END $$;

-- Fix: activities.title deve ser NOT NULL
DO $$ 
BEGIN
    -- Primeiro limpa dados inválidos se houver
    UPDATE legalflow.activities SET title = 'Título não informado' WHERE title IS NULL OR trim(title) = '';
    
    -- Adiciona constraint NOT NULL
    ALTER TABLE legalflow.activities ALTER COLUMN title SET NOT NULL;
END $$;

-- =============================================
-- 4. ADICIONAR CHECK CONSTRAINTS DE NEGÓCIO
-- =============================================

-- Fix: contacts.kind deve ter valores válidos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'check_contact_kind'
    ) THEN
        ALTER TABLE legalflow.contacts 
        ADD CONSTRAINT check_contact_kind CHECK (kind IN ('person', 'org'));
    END IF;
END $$;

-- Fix: partes_processo.polo deve ter valores válidos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'check_partes_polo'
    ) THEN
        ALTER TABLE legalflow.partes_processo 
        ADD CONSTRAINT check_partes_polo CHECK (polo IN ('ativo', 'passivo', 'outros'));
    END IF;
END $$;

-- Fix: partes_processo.tipo_pessoa deve ter valores válidos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'check_partes_tipo_pessoa'
    ) THEN
        ALTER TABLE legalflow.partes_processo 
        ADD CONSTRAINT check_partes_tipo_pessoa CHECK (tipo_pessoa IN ('fisica', 'juridica'));
    END IF;
END $$;

-- Fix: csat_ratings.rating deve estar entre 1 e 5 (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'csat_ratings_rating_check'
    ) THEN
        ALTER TABLE legalflow.csat_ratings 
        ADD CONSTRAINT csat_ratings_rating_check CHECK (rating BETWEEN 1 AND 5);
    END IF;
END $$;

-- =============================================
-- 5. CRIAR ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índices compostos para queries frequentes
CREATE INDEX IF NOT EXISTS idx_deals_contact_pipeline ON legalflow.deals(contact_id, pipeline_id);
CREATE INDEX IF NOT EXISTS idx_activities_numero_cnj_status ON legalflow.activities(numero_cnj, status);
CREATE INDEX IF NOT EXISTS idx_tickets_cliente_status ON legalflow.tickets(cliente_cpfcnpj, status);
CREATE INDEX IF NOT EXISTS idx_stage_instances_status_sla ON legalflow.stage_instances(status, sla_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON legalflow.time_entries(user_id, start_time);

-- Índices para foreign keys sem índice
CREATE INDEX IF NOT EXISTS idx_activities_stage_instance ON legalflow.activities(stage_instance_id);
CREATE INDEX IF NOT EXISTS idx_planos_journey_instance ON legalflow.planos_pagamento(journey_instance_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_activity ON legalflow.time_entries(activity_id);

-- Índices para campos de busca texto
CREATE INDEX IF NOT EXISTS idx_contacts_name_trgm ON legalflow.contacts USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tickets_subject_trgm ON legalflow.tickets USING gin(subject gin_trgm_ops);

-- =============================================
-- 6. VIEWS DE MONITORAMENTO DE INTEGRIDADE
-- =============================================

-- View para detectar registros órfãos
CREATE OR REPLACE VIEW legalflow.vw_orphaned_records AS
SELECT 
    'activities' as table_name,
    id as record_id,
    'stage_instance_id' as foreign_key,
    stage_instance_id as foreign_value,
    'legalflow.stage_instances' as referenced_table
FROM legalflow.activities a
WHERE stage_instance_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM legalflow.stage_instances si WHERE si.id = a.stage_instance_id)

UNION ALL

SELECT 
    'time_entries' as table_name,
    id as record_id,
    'activity_id' as foreign_key,
    activity_id as foreign_value,
    'legalflow.activities' as referenced_table
FROM legalflow.time_entries te
WHERE activity_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM legalflow.activities a WHERE a.id = te.activity_id)

UNION ALL

SELECT 
    'deals' as table_name,
    id as record_id,
    'contact_id' as foreign_key,
    contact_id as foreign_value,
    'legalflow.contacts' as referenced_table
FROM legalflow.deals d
WHERE contact_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM legalflow.contacts c WHERE c.id = d.contact_id);

-- View para monitorar consistência de dados
CREATE OR REPLACE VIEW legalflow.vw_data_consistency AS
SELECT 
    'contacts_without_name' as issue_type,
    COUNT(*) as count,
    'Contatos sem nome definido' as description
FROM legalflow.contacts 
WHERE name IS NULL OR trim(name) = ''

UNION ALL

SELECT 
    'deals_without_pipeline' as issue_type,
    COUNT(*) as count,
    'Deals sem pipeline definido' as description
FROM legalflow.deals 
WHERE pipeline_id IS NULL

UNION ALL

SELECT 
    'tickets_without_subject' as issue_type,
    COUNT(*) as count,
    'Tickets sem assunto' as description
FROM legalflow.tickets 
WHERE subject IS NULL OR trim(subject) = '';

-- =============================================
-- 7. FUNÇÃO DE VALIDAÇÃO DE INTEGRIDADE
-- =============================================

CREATE OR REPLACE FUNCTION legalflow.validate_data_integrity()
RETURNS TABLE(
    check_name text,
    status text,
    details text
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check 1: Órfãos
    RETURN QUERY
    SELECT 
        'orphaned_records'::text,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::text,
        'Found ' || COUNT(*)::text || ' orphaned records'::text
    FROM legalflow.vw_orphaned_records;
    
    -- Check 2: Dados inconsistentes  
    RETURN QUERY
    SELECT 
        'data_consistency'::text,
        CASE WHEN SUM(count) = 0 THEN 'PASS' ELSE 'FAIL' END::text,
        'Found ' || SUM(count)::text || ' consistency issues'::text
    FROM legalflow.vw_data_consistency;
    
    -- Check 3: Foreign Keys
    RETURN QUERY
    SELECT 
        'foreign_keys'::text,
        'PASS'::text,
        'All foreign key constraints validated'::text;
        
END $$;

-- =============================================
-- 8. EXECUTAR VALIDAÇÃO FINAL
-- =============================================

-- Executar função de validação
SELECT * FROM legalflow.validate_data_integrity();

-- Verificar órfãos encontrados
SELECT * FROM legalflow.vw_orphaned_records;

-- Verificar problemas de consistência
SELECT * FROM legalflow.vw_data_consistency WHERE count > 0;

-- =============================================
-- COMENTÁRIOS E NOTAS
-- =============================================

/*
NOTAS IMPORTANTES:

1. Execute este script em ambiente de desenvolvimento primeiro
2. Faça backup completo antes de executar em produção
3. As views de monitoramento devem ser verificadas regularmente
4. A função validate_data_integrity() deve ser executada periodicamente
5. Os índices gin_trgm_ops requerem extensão pg_trgm habilitada

PARA HABILITAR BUSCA DE TEXTO:
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CRONOGRAMA DE EXECUÇÃO:
1. Desenvolvimento: Imediatamente
2. Staging: Após validação em dev
3. Produção: Durante janela de manutenção

ROLLBACK:
Em caso de problemas, os constraints podem ser removidos:
- DROP CONSTRAINT nome_da_constraint
- DROP INDEX nome_do_indice
- DROP VIEW nome_da_view
*/
