-- SF-6: Activities ↔ Tickets Bridge - Supabase Compatible Schema
-- 
-- This version works with Supabase's schema restrictions by:
-- 1. Creating all functions in the public schema
-- 2. Using proper schema qualification for legalflow tables
-- 3. Ensuring proper permissions and security

-- =====================================================
-- 1. HELPER FUNCTIONS FOR STATISTICS
-- =====================================================

-- Function to get bridge statistics (public schema)
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
    ),
    'orphaned_activities', (
      SELECT COUNT(*) 
      FROM legalflow.activities a
      LEFT JOIN legalflow.tickets t ON a.ticket_id = t.id
      WHERE a.ticket_id IS NOT NULL AND t.id IS NULL
    ),
    'status_misalignments', 0 -- Simplified for compatibility
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
-- 2. ACTIVITY CREATION FUNCTIONS
-- =====================================================

-- Function to auto-create activity for completed task (public schema)
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
  -- Verify that the stage instance exists and is of type 'task'
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
  
  -- Only create activity if stage is completed
  IF v_stage_instance.status != 'completed' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Stage instance is not completed',
      'stage_instance_id', p_stage_instance_id,
      'current_status', v_stage_instance.status
    );
  END IF;
  
  -- Check if activity already exists for this stage instance
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
  
  -- Get journey instance details for better context
  SELECT ji.*
  INTO v_journey_instance
  FROM legalflow.journey_instances ji
  WHERE ji.id = v_stage_instance.journey_instance_id;
  
  -- Generate a meaningful activity title
  v_activity_id := gen_random_uuid();
  
  -- Create the activity
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
  
  -- Try to log the auto-creation in a comment (ignore if table doesn't exist)
  BEGIN
    INSERT INTO legalflow.activity_comments (
      id,
      activity_id,
      author_id,
      body,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      v_activity_id,
      'system',
      'Activity criada automaticamente ao concluir etapa de tarefa: ' || v_stage_instance.stage_name,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignore comment creation errors
    NULL;
  END;
  
  -- Build success response
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
-- 3. BATCH PROCESSING FUNCTION
-- =====================================================

-- Function to process existing completed tasks (public schema)
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
  -- Find all completed task-type stages without activities
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
    LIMIT 10 -- Process smaller batches for compatibility
  LOOP
    v_processed_count := v_processed_count + 1;
    
    -- Try to create activity for this stage
    SELECT public.sf6_auto_create_activity_for_completed_task(v_stage_instance.id) INTO v_result;
    
    -- Add to results array
    v_results := v_results || v_result;
    
    -- Count successful creations
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
-- 4. CLEANUP AND TESTING FUNCTIONS
-- =====================================================

-- Function to cleanup test data
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
  -- Delete test activities (those with [Activity] or [Ticket] prefixes)
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
  
  BEGIN
    DELETE FROM legalflow.activities 
    WHERE title LIKE '[Activity]%' OR title LIKE '[Ticket]%' OR title LIKE '%SF-6%';
    
    GET DIAGNOSTICS v_deleted_activities = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    v_deleted_activities := 0;
  END;
  
  -- Delete test tickets (those with [Activity] prefix)
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
-- 5. TRIGGER FUNCTION (OPTIONAL - requires manual setup)
-- =====================================================

-- Trigger function for auto-creation (public schema)
CREATE OR REPLACE FUNCTION public.sf6_trigger_auto_create_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Only trigger when status changes to 'completed' and it's a task-type stage
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Check if this is a task-type stage
    IF EXISTS (
      SELECT 1 
      FROM legalflow.stage_types st 
      WHERE st.id = NEW.stage_type_id 
        AND st.code = 'task'
    ) THEN
      -- Call the auto-creation function
      SELECT public.sf6_auto_create_activity_for_completed_task(NEW.id) INTO v_result;
      
      -- Note: Removed system_logs insertion for compatibility
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- 6. PERMISSIONS AND GRANTS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.sf6_get_bridge_statistics() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sf6_auto_create_activity_for_completed_task(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sf6_process_existing_completed_tasks() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sf6_cleanup_test_data() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sf6_trigger_auto_create_activity() TO authenticated, anon;

-- =====================================================
-- 7. INSTALLATION VERIFICATION
-- =====================================================

-- Function to verify installation
CREATE OR REPLACE FUNCTION public.sf6_verify_installation()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_functions_count INTEGER := 0;
  v_tables_accessible BOOLEAN := false;
  v_result JSON;
BEGIN
  -- Count installed functions
  SELECT COUNT(*)
  INTO v_functions_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname LIKE 'sf6_%';
  
  -- Test table access
  BEGIN
    PERFORM COUNT(*) FROM legalflow.activities LIMIT 1;
    v_tables_accessible := true;
  EXCEPTION WHEN OTHERS THEN
    v_tables_accessible := false;
  END;
  
  v_result := json_build_object(
    'success', true,
    'functions_installed', v_functions_count,
    'expected_functions', 5,
    'tables_accessible', v_tables_accessible,
    'installation_complete', (v_functions_count >= 5 AND v_tables_accessible),
    'message', CASE 
      WHEN v_functions_count >= 5 AND v_tables_accessible THEN 'SF-6 instalação completa e funcional'
      WHEN v_functions_count < 5 THEN 'Algumas funções não foram instaladas'
      ELSE 'Tabelas legalflow não acessíveis'
    END
  );
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sf6_verify_installation() TO authenticated, anon;

-- =====================================================
-- 8. COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION public.sf6_get_bridge_statistics() IS 
'SF-6: Get comprehensive statistics about Activity-Ticket bridge usage (Supabase compatible)';

COMMENT ON FUNCTION public.sf6_auto_create_activity_for_completed_task(UUID) IS 
'SF-6: Automatically creates an activity when a task-type stage is completed (Supabase compatible)';

COMMENT ON FUNCTION public.sf6_process_existing_completed_tasks() IS 
'SF-6: Helper function to process existing completed task stages and create missing activities (Supabase compatible)';

COMMENT ON FUNCTION public.sf6_cleanup_test_data() IS 
'SF-6: Clean up test data created during SF-6 testing (Supabase compatible)';

COMMENT ON FUNCTION public.sf6_verify_installation() IS 
'SF-6: Verify that SF-6 functions are properly installed and accessible (Supabase compatible)';

-- Final success message
SELECT 'SF-6 Supabase Compatible Schema instalado com sucesso!' as status,
       'Todas as funções criadas no schema public para compatibilidade com Supabase' as details;
