-- SF-6: Activities ↔ Tickets Bridge - Auto-create Activity RPC
-- 
-- This RPC automatically creates an activity when a task-type stage is completed
-- and no activity exists yet for that stage instance.
--
-- Usage: Called by triggers or manually when stage_instances are marked as completed

CREATE OR REPLACE FUNCTION auto_create_activity_for_completed_task(
  p_stage_instance_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stage_instance RECORD;
  v_journey_instance RECORD;
  v_stage_type RECORD;
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
    -- Try to inherit context from journey/stage
    cliente_cpfcnpj,
    numero_cnj,
    -- Set due date based on stage due_at if available
    due_at
  )
  SELECT 
    v_activity_id,
    COALESCE(
      v_stage_instance.stage_name || ' - ' || COALESCE(v_journey_instance.title, 'Jornada'),
      'Tarefa da etapa concluída'
    ) as title,
    'todo' as status,
    'media' as priority, -- Default priority
    p_stage_instance_id,
    COALESCE(v_stage_instance.assigned_to, 'system') as created_by,
    NOW(),
    NOW(),
    -- Try to get client context from journey
    v_journey_instance.cliente_cpfcnpj,
    v_journey_instance.numero_cnj,
    -- Set due date to stage due_at or 7 days from now
    COALESCE(v_stage_instance.due_at, NOW() + INTERVAL '7 days')
  ;
  
  -- Log the auto-creation in a comment
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

-- SF-6: Trigger function to automatically call the RPC when stage_instances are updated
CREATE OR REPLACE FUNCTION trigger_auto_create_activity_for_completed_task()
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
      SELECT auto_create_activity_for_completed_task(NEW.id) INTO v_result;
      
      -- Log the result (optional, for debugging)
      INSERT INTO legalflow.system_logs (
        id,
        level,
        message,
        context,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        'info',
        'SF-6 auto-create activity triggered',
        v_result,
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Install the trigger on stage_instances table
DROP TRIGGER IF EXISTS trigger_sf6_auto_create_activity ON legalflow.stage_instances;

CREATE TRIGGER trigger_sf6_auto_create_activity
  AFTER UPDATE ON legalflow.stage_instances
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_create_activity_for_completed_task();

-- SF-6: Helper function to manually trigger activity creation for existing completed tasks
CREATE OR REPLACE FUNCTION sf6_process_existing_completed_tasks()
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
    LIMIT 50 -- Process in batches
  LOOP
    v_processed_count := v_processed_count + 1;
    
    -- Try to create activity for this stage
    SELECT auto_create_activity_for_completed_task(v_stage_instance.id) INTO v_result;
    
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
    'results', v_results
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'processed_count', v_processed_count,
    'created_count', v_created_count
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION auto_create_activity_for_completed_task(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION sf6_process_existing_completed_tasks() TO authenticated, anon;

-- Create system_logs table if it doesn't exist (for debugging)
CREATE TABLE IF NOT EXISTS legalflow.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON legalflow.system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON legalflow.system_logs(level);

COMMENT ON FUNCTION auto_create_activity_for_completed_task(UUID) IS 
'SF-6: Automatically creates an activity when a task-type stage is completed if no activity exists yet';

COMMENT ON FUNCTION sf6_process_existing_completed_tasks() IS 
'SF-6: Helper function to process existing completed task stages and create missing activities';

COMMENT ON TRIGGER trigger_sf6_auto_create_activity ON legalflow.stage_instances IS 
'SF-6: Trigger that automatically creates activities when task-type stages are completed';
