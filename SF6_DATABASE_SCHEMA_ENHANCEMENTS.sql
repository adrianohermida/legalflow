-- SF-6: Activities ↔ Tickets Bridge - Database Schema Enhancements
-- 
-- This file contains all database schema improvements for the SF-6 bridge
-- including proper foreign keys, indexes, and helper views.

-- Ensure proper foreign key constraint for activities.ticket_id
-- (This should already exist, but we'll recreate it to be sure)
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'activities_ticket_id_fkey'
  ) THEN
    ALTER TABLE legalflow.activities DROP CONSTRAINT activities_ticket_id_fkey;
  END IF;
  
  -- Add the proper foreign key constraint
  ALTER TABLE legalflow.activities 
    ADD CONSTRAINT activities_ticket_id_fkey 
    FOREIGN KEY (ticket_id) 
    REFERENCES legalflow.tickets(id) 
    ON DELETE SET NULL;
END $$;

-- Create index for better performance on ticket_id lookups
CREATE INDEX IF NOT EXISTS idx_activities_ticket_id 
  ON legalflow.activities(ticket_id) 
  WHERE ticket_id IS NOT NULL;

-- Create index for stage_instance_id lookups
CREATE INDEX IF NOT EXISTS idx_activities_stage_instance_id 
  ON legalflow.activities(stage_instance_id) 
  WHERE stage_instance_id IS NOT NULL;

-- SF-6: Create a view for Activity-Ticket relationships
CREATE OR REPLACE VIEW legalflow.v_activity_ticket_bridge AS
SELECT 
  a.id as activity_id,
  a.title as activity_title,
  a.status as activity_status,
  a.priority as activity_priority,
  a.due_at as activity_due_at,
  a.assigned_oab as activity_assigned_oab,
  a.created_at as activity_created_at,
  
  t.id as ticket_id,
  t.subject as ticket_subject,
  t.status as ticket_status,
  t.priority as ticket_priority,
  t.channel as ticket_channel,
  t.frt_due_at as ticket_frt_due_at,
  t.ttr_due_at as ticket_ttr_due_at,
  t.created_at as ticket_created_at,
  
  -- Journey context
  si.id as stage_instance_id,
  st.name as stage_name,
  st.code as stage_code,
  ji.title as journey_title,
  
  -- Client context
  c.nome as cliente_nome,
  a.cliente_cpfcnpj,
  a.numero_cnj,
  
  -- Responsible person
  adv.nome as responsavel_nome,
  
  -- Bridge indicators
  CASE 
    WHEN a.ticket_id IS NOT NULL THEN 'activity_to_ticket'
    WHEN EXISTS(SELECT 1 FROM legalflow.activities a2 WHERE a2.ticket_id = t.id) THEN 'ticket_to_activity'
    ELSE 'no_bridge'
  END as bridge_type,
  
  -- Status alignment check
  CASE 
    WHEN a.status = 'done' AND t.status IN ('resolvido', 'fechado') THEN 'aligned'
    WHEN a.status IN ('todo', 'in_progress') AND t.status IN ('aberto', 'em_andamento') THEN 'aligned'
    ELSE 'misaligned'
  END as status_alignment

FROM legalflow.activities a
FULL OUTER JOIN legalflow.tickets t ON (a.ticket_id = t.id OR EXISTS(
  SELECT 1 FROM legalflow.activities a2 WHERE a2.ticket_id = t.id AND a2.id = a.id
))
LEFT JOIN legalflow.stage_instances si ON a.stage_instance_id = si.id
LEFT JOIN legalflow.stage_types st ON si.stage_type_id = st.id
LEFT JOIN legalflow.journey_instances ji ON si.journey_instance_id = ji.id
LEFT JOIN public.clientes c ON a.cliente_cpfcnpj = c.cpfcnpj
LEFT JOIN public.advogados adv ON a.assigned_oab = adv.oab;

-- SF-6: Create function to get activity statistics
CREATE OR REPLACE FUNCTION sf6_get_bridge_statistics()
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
    'status_misalignments', (
      SELECT COUNT(*) 
      FROM legalflow.v_activity_ticket_bridge 
      WHERE bridge_type != 'no_bridge' AND status_alignment = 'misaligned'
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- SF-6: Function to sync activity and ticket statuses
CREATE OR REPLACE FUNCTION sf6_sync_activity_ticket_status(
  p_activity_id UUID DEFAULT NULL,
  p_ticket_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_activity RECORD;
  v_ticket RECORD;
  v_updates_made INTEGER := 0;
  v_result JSON;
BEGIN
  -- If activity_id provided, sync its linked ticket
  IF p_activity_id IS NOT NULL THEN
    SELECT a.*, t.* INTO v_activity
    FROM legalflow.activities a
    LEFT JOIN legalflow.tickets t ON a.ticket_id = t.id
    WHERE a.id = p_activity_id;
    
    IF FOUND AND v_activity.ticket_id IS NOT NULL THEN
      -- Map activity status to ticket status
      UPDATE legalflow.tickets 
      SET status = CASE 
        WHEN v_activity.status = 'done' THEN 'resolvido'
        WHEN v_activity.status = 'in_progress' THEN 'em_andamento'
        WHEN v_activity.status = 'blocked' THEN 'aberto'
        ELSE 'aberto'
      END,
      updated_at = NOW()
      WHERE id = v_activity.ticket_id;
      
      v_updates_made := v_updates_made + 1;
    END IF;
  END IF;
  
  -- If ticket_id provided, sync its linked activities
  IF p_ticket_id IS NOT NULL THEN
    FOR v_ticket IN 
      SELECT a.*, t.*
      FROM legalflow.activities a
      JOIN legalflow.tickets t ON a.ticket_id = t.id
      WHERE t.id = p_ticket_id
    LOOP
      -- Map ticket status to activity status
      UPDATE legalflow.activities 
      SET status = CASE 
        WHEN v_ticket.status IN ('resolvido', 'fechado') THEN 'done'
        WHEN v_ticket.status = 'em_andamento' THEN 'in_progress'
        ELSE 'todo'
      END,
      updated_at = NOW()
      WHERE id = v_ticket.id;
      
      v_updates_made := v_updates_made + 1;
    END LOOP;
  END IF;
  
  v_result := json_build_object(
    'success', true,
    'updates_made', v_updates_made,
    'activity_id', p_activity_id,
    'ticket_id', p_ticket_id
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'activity_id', p_activity_id,
    'ticket_id', p_ticket_id
  );
END;
$$;

-- SF-6: Function to find activities that should be linked to tickets
CREATE OR REPLACE FUNCTION sf6_suggest_activity_ticket_links()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_suggestions JSON[] := '{}';
  v_suggestion JSON;
  v_activity RECORD;
  v_ticket RECORD;
BEGIN
  -- Find activities and tickets with similar titles/subjects
  FOR v_activity IN
    SELECT a.*, c.nome as cliente_nome
    FROM legalflow.activities a
    LEFT JOIN public.clientes c ON a.cliente_cpfcnpj = c.cpfcnpj
    WHERE a.ticket_id IS NULL
    ORDER BY a.created_at DESC
    LIMIT 50
  LOOP
    -- Look for matching tickets
    SELECT t.*, cl.nome as cliente_nome INTO v_ticket
    FROM legalflow.tickets t
    LEFT JOIN public.clientes cl ON t.cliente_cpfcnpj = cl.cpfcnpj
    WHERE t.id NOT IN (SELECT DISTINCT ticket_id FROM legalflow.activities WHERE ticket_id IS NOT NULL)
      AND (
        -- Similar subjects/titles
        similarity(t.subject, v_activity.title) > 0.3
        OR (
          -- Same client and process
          t.cliente_cpfcnpj = v_activity.cliente_cpfcnpj 
          AND t.numero_cnj = v_activity.numero_cnj
          AND t.cliente_cpfcnpj IS NOT NULL
        )
        OR (
          -- Similar priority and same responsible
          t.priority = v_activity.priority
          AND t.assigned_oab = v_activity.assigned_oab
          AND t.assigned_oab IS NOT NULL
        )
      )
    ORDER BY similarity(t.subject, v_activity.title) DESC
    LIMIT 1;
    
    IF FOUND THEN
      v_suggestion := json_build_object(
        'activity_id', v_activity.id,
        'activity_title', v_activity.title,
        'ticket_id', v_ticket.id,
        'ticket_subject', v_ticket.subject,
        'similarity_score', similarity(v_ticket.subject, v_activity.title),
        'match_reason', CASE 
          WHEN similarity(v_ticket.subject, v_activity.title) > 0.3 THEN 'similar_titles'
          WHEN v_ticket.cliente_cpfcnpj = v_activity.cliente_cpfcnpj THEN 'same_client_process'
          ELSE 'same_priority_responsible'
        END,
        'cliente_nome', COALESCE(v_activity.cliente_nome, v_ticket.cliente_nome)
      );
      
      v_suggestions := v_suggestions || v_suggestion;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'suggestions_count', array_length(v_suggestions, 1),
    'suggestions', v_suggestions
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Enable similarity extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Grant permissions
GRANT EXECUTE ON FUNCTION sf6_get_bridge_statistics() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION sf6_sync_activity_ticket_status(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION sf6_suggest_activity_ticket_links() TO authenticated, anon;

-- Grant SELECT on the bridge view
GRANT SELECT ON legalflow.v_activity_ticket_bridge TO authenticated, anon;

-- Create a helpful comment
COMMENT ON VIEW legalflow.v_activity_ticket_bridge IS 
'SF-6: Unified view showing Activity-Ticket relationships with context from journeys, clients, and responsible parties';

COMMENT ON FUNCTION sf6_get_bridge_statistics() IS 
'SF-6: Get comprehensive statistics about Activity-Ticket bridge usage';

COMMENT ON FUNCTION sf6_sync_activity_ticket_status(UUID, UUID) IS 
'SF-6: Synchronize status between linked activities and tickets';

COMMENT ON FUNCTION sf6_suggest_activity_ticket_links() IS 
'SF-6: AI-powered suggestions for linking activities and tickets based on similarity and context';

-- Create a test data cleanup function for development
CREATE OR REPLACE FUNCTION sf6_cleanup_test_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_activities INTEGER;
  v_deleted_tickets INTEGER;
  v_deleted_comments INTEGER;
BEGIN
  -- Delete test activities (those with [Activity] or [Ticket] prefixes)
  DELETE FROM legalflow.activity_comments 
  WHERE activity_id IN (
    SELECT id FROM legalflow.activities 
    WHERE title LIKE '[Activity]%' OR title LIKE '[Ticket]%'
  );
  
  GET DIAGNOSTICS v_deleted_comments = ROW_COUNT;
  
  DELETE FROM legalflow.activities 
  WHERE title LIKE '[Activity]%' OR title LIKE '[Ticket]%';
  
  GET DIAGNOSTICS v_deleted_activities = ROW_COUNT;
  
  -- Delete test tickets (those with [Activity] prefix)
  DELETE FROM legalflow.tickets 
  WHERE subject LIKE '[Activity]%';
  
  GET DIAGNOSTICS v_deleted_tickets = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'deleted_activities', v_deleted_activities,
    'deleted_tickets', v_deleted_tickets,
    'deleted_comments', v_deleted_comments
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION sf6_cleanup_test_data() TO authenticated, anon;
