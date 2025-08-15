-- SF-6: Activities ↔ Tickets Bridge - VERSÃO CORRIGIDA PARA SUPABASE RPC
-- 
-- CORREÇÃO: Todas as funções RPC movidas para o schema 'public'
-- para compatibilidade com Supabase RPC restrictions

-- =====================================================
-- 1. FUNÇÃO DE VERIFICAÇÃO DE INSTALA��ÃO (PUBLIC)
-- =====================================================

CREATE OR REPLACE FUNCTION public.sf6_verify_installation()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_functions_count INTEGER := 0;
  v_tables_accessible BOOLEAN := false;
BEGIN
  -- Contar funções SF-6 instaladas no schema public
  SELECT COUNT(*)
  INTO v_functions_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname LIKE 'sf6_%';
  
  -- Testar acesso às tabelas legalflow
  BEGIN
    PERFORM COUNT(*) FROM legalflow.activities LIMIT 1;
    v_tables_accessible := true;
  EXCEPTION WHEN OTHERS THEN
    v_tables_accessible := false;
  END;
  
  v_result := json_build_object(
    'success', true,
    'schema', 'SF-6',
    'functions_installed', v_functions_count,
    'expected_functions', 5,
    'tables_accessible', v_tables_accessible,
    'installation_complete', (v_functions_count >= 5 AND v_tables_accessible),
    'message', CASE 
      WHEN v_functions_count >= 5 AND v_tables_accessible THEN 'SF-6 instalação completa e funcional'
      WHEN v_functions_count < 5 THEN 'Algumas funções SF-6 não foram instaladas'
      ELSE 'Tabelas legalflow não acessíveis'
    END
  );
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- 2. FUNÇÃO DE ESTATÍSTICAS (PUBLIC)
-- =====================================================

CREATE OR REPLACE FUNCTION public.sf6_get_bridge_statistics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_activities', (SELECT COUNT(*) FROM legalflow.activities),
    'total_tickets', (SELECT COUNT(*) FROM legalflow.tickets),
    'activities_with_tickets', (
      SELECT COUNT(*) FROM legalflow.activities WHERE ticket_id IS NOT NULL
    ),
    'tickets_with_activities', (
      SELECT COUNT(DISTINCT ticket_id) 
      FROM legalflow.activities 
      WHERE ticket_id IS NOT NULL
    ),
    'activities_from_stages', (
      SELECT COUNT(*) 
      FROM legalflow.activities 
      WHERE stage_instance_id IS NOT NULL
    ),
    'completed_task_stages', (
      SELECT COUNT(*) 
      FROM legalflow.stage_instances si
      JOIN legalflow.stage_types st ON si.stage_type_id = st.id
      WHERE si.status = 'completed' AND st.code = 'task'
    )
  ) INTO v_result;
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'hint', 'Check if legalflow schema tables exist'
  );
END;
$$;

-- =====================================================
-- 3. FUNÇÃO DE CRIAÇÃO DE ATIVIDADE (PUBLIC)
-- =====================================================

CREATE OR REPLACE FUNCTION public.sf6_auto_create_activity_for_completed_task(
  p_stage_instance_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stage_instance RECORD;
  v_journey_instance RECORD;
  v_activity_id UUID;
  v_existing_activity_count INTEGER;
  v_result JSON;
BEGIN
  -- Verificar se a etapa existe e é do tipo 'task'
  SELECT si.*, st.code, st.name as stage_name
  INTO v_stage_instance
  FROM legalflow.stage_instances si
  JOIN legalflow.stage_types st ON si.stage_type_id = st.id
  WHERE si.id = p_stage_instance_id
    AND st.code = 'task';
    
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Stage instance not found or not of type task',
      'stage_instance_id', p_stage_instance_id
    );
  END IF;
  
  -- Só criar atividade se a etapa estiver concluída
  IF v_stage_instance.status != 'completed' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Stage instance is not completed',
      'stage_instance_id', p_stage_instance_id,
      'current_status', v_stage_instance.status
    );
  END IF;
  
  -- Verificar se já existe atividade para esta etapa
  SELECT COUNT(*)
  INTO v_existing_activity_count
  FROM legalflow.activities
  WHERE stage_instance_id = p_stage_instance_id;
  
  IF v_existing_activity_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Activity already exists for this stage instance',
      'stage_instance_id', p_stage_instance_id,
      'existing_activities_count', v_existing_activity_count
    );
  END IF;
  
  -- Obter detalhes da jornada
  SELECT ji.*
  INTO v_journey_instance
  FROM legalflow.journey_instances ji
  WHERE ji.id = v_stage_instance.journey_instance_id;
  
  -- Gerar ID da atividade
  v_activity_id := gen_random_uuid();
  
  -- Criar a atividade
  INSERT INTO legalflow.activities (
    id,
    title,
    status,
    priority,
    stage_instance_id,
    created_by,
    created_at,
    updated_at,
    cliente_cpfcnpj,
    numero_cnj,
    due_at
  )
  SELECT 
    v_activity_id,
    COALESCE(
      v_stage_instance.stage_name || ' - ' || COALESCE(v_journey_instance.title, 'Jornada'),
      'Tarefa da etapa concluída'
    ) as title,
    'todo' as status,
    'media' as priority,
    p_stage_instance_id,
    COALESCE(v_stage_instance.assigned_to, 'system') as created_by,
    NOW(),
    NOW(),
    v_journey_instance.cliente_cpfcnpj,
    v_journey_instance.numero_cnj,
    COALESCE(v_stage_instance.due_at, NOW() + INTERVAL '7 days')
  ;
  
  -- Resposta de sucesso
  v_result := json_build_object(
    'success', true,
    'activity_id', v_activity_id,
    'stage_instance_id', p_stage_instance_id,
    'stage_name', v_stage_instance.stage_name,
    'journey_title', v_journey_instance.title,
    'created_at', NOW()
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'error_detail', SQLSTATE,
    'stage_instance_id', p_stage_instance_id
  );
END;
$$;

-- =====================================================
-- 4. FUNÇÃO DE PROCESSAMENTO EM LOTE (PUBLIC)
-- =====================================================

CREATE OR REPLACE FUNCTION public.sf6_process_existing_completed_tasks()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stage_instance RECORD;
  v_result JSON;
  v_results JSON[] := '{}';
  v_processed_count INTEGER := 0;
  v_created_count INTEGER := 0;
BEGIN
  -- Buscar etapas de tarefa concluídas sem atividades
  FOR v_stage_instance IN
    SELECT si.id, si.status, st.name as stage_name
    FROM legalflow.stage_instances si
    JOIN legalflow.stage_types st ON si.stage_type_id = st.id
    WHERE si.status = 'completed'
      AND st.code = 'task'
      AND NOT EXISTS (
        SELECT 1 FROM legalflow.activities a 
        WHERE a.stage_instance_id = si.id
      )
    ORDER BY si.updated_at DESC
    LIMIT 10
  LOOP
    v_processed_count := v_processed_count + 1;
    
    -- Tentar criar atividade para esta etapa
    SELECT public.sf6_auto_create_activity_for_completed_task(v_stage_instance.id) INTO v_result;
    
    -- Adicionar ao array de resultados
    v_results := v_results || v_result;
    
    -- Contar criações bem-sucedidas
    IF (v_result->>'success')::boolean THEN
      v_created_count := v_created_count + 1;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'processed_count', v_processed_count,
    'created_count', v_created_count,
    'results', v_results,
    'message', 'Processamento concluído com sucesso'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'processed_count', v_processed_count,
    'created_count', v_created_count,
    'hint', 'Verifique se as tabelas legalflow existem'
  );
END;
$$;

-- =====================================================
-- 5. FUNÇÃO DE LIMPEZA DE DADOS DE TESTE (PUBLIC)
-- =====================================================

CREATE OR REPLACE FUNCTION public.sf6_cleanup_test_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_activities INTEGER := 0;
  v_deleted_tickets INTEGER := 0;
  v_deleted_comments INTEGER := 0;
BEGIN
  -- Deletar comentários de atividades de teste
  BEGIN
    DELETE FROM legalflow.activity_comments 
    WHERE activity_id IN (
      SELECT id FROM legalflow.activities 
      WHERE title LIKE '[Activity]%' OR title LIKE '[Ticket]%' OR title LIKE '%SF-6%'
    );
    
    GET DIAGNOSTICS v_deleted_comments = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    v_deleted_comments := 0;
  END;
  
  -- Deletar atividades de teste
  BEGIN
    DELETE FROM legalflow.activities 
    WHERE title LIKE '[Activity]%' OR title LIKE '[Ticket]%' OR title LIKE '%SF-6%';
    
    GET DIAGNOSTICS v_deleted_activities = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    v_deleted_activities := 0;
  END;
  
  -- Deletar tickets de teste
  BEGIN
    DELETE FROM legalflow.tickets 
    WHERE subject LIKE '[Activity]%' OR subject LIKE '%SF-6%';
    
    GET DIAGNOSTICS v_deleted_tickets = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    v_deleted_tickets := 0;
  END;
  
  RETURN json_build_object(
    'success', true,
    'deleted_activities', v_deleted_activities,
    'deleted_tickets', v_deleted_tickets,
    'deleted_comments', v_deleted_comments,
    'message', 'Limpeza de dados de teste concluída'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- =====================================================
-- 6. PERMISSÕES PARA SUPABASE RPC
-- =====================================================

-- Conceder permissões de execução para usuários autenticados e anônimos
GRANT EXECUTE ON FUNCTION public.sf6_verify_installation() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sf6_get_bridge_statistics() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sf6_auto_create_activity_for_completed_task(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sf6_process_existing_completed_tasks() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sf6_cleanup_test_data() TO authenticated, anon;

-- =====================================================
-- 7. COMENTÁRIOS DE DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.sf6_verify_installation() IS 
'SF-6: Verifica se as funções SF-6 estão instaladas corretamente (Supabase RPC compatible)';

COMMENT ON FUNCTION public.sf6_get_bridge_statistics() IS 
'SF-6: Obtém estatísticas sobre o bridge Activities-Tickets (Supabase RPC compatible)';

COMMENT ON FUNCTION public.sf6_auto_create_activity_for_completed_task(UUID) IS 
'SF-6: Cria automaticamente uma atividade quando uma etapa de tarefa é concluída (Supabase RPC compatible)';

COMMENT ON FUNCTION public.sf6_process_existing_completed_tasks() IS 
'SF-6: Processa etapas de tarefa já concluídas para criar atividades faltantes (Supabase RPC compatible)';

COMMENT ON FUNCTION public.sf6_cleanup_test_data() IS 
'SF-6: Limpa dados de teste criados durante testes do SF-6 (Supabase RPC compatible)';

-- Mensagem final
SELECT 'SF-6 Supabase RPC Fixed Schema instalado com sucesso!' as status,
       'Todas as funções criadas no schema public para RPC access' as details;
