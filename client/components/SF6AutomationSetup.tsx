import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Loader2, CheckCircle, AlertTriangle, Play, Database } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { SF6BridgeManager } from "./SF6BridgeManager";
import { SF6RoundTripTest } from "./SF6RoundTripTest";

interface AutomationResult {
  success: boolean;
  processed_count?: number;
  created_count?: number;
  error?: string;
  results?: any[];
}

export function SF6AutomationSetup() {
  const [setupResult, setSetupResult] = useState<AutomationResult | null>(null);
  const { toast } = useToast();

  // The SF-6 automation SQL
  const SF6_AUTOMATION_SQL = `
-- SF-6: Activities ↔ Tickets Bridge - Auto-create Activity RPC
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

-- Trigger function
CREATE OR REPLACE FUNCTION trigger_auto_create_activity_for_completed_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    IF EXISTS (
      SELECT 1 
      FROM legalflow.stage_types st 
      WHERE st.id = NEW.stage_type_id 
        AND st.code = 'task'
    ) THEN
      SELECT auto_create_activity_for_completed_task(NEW.id) INTO v_result;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Install trigger
DROP TRIGGER IF EXISTS trigger_sf6_auto_create_activity ON legalflow.stage_instances;
CREATE TRIGGER trigger_sf6_auto_create_activity
  AFTER UPDATE ON legalflow.stage_instances
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_create_activity_for_completed_task();

-- Helper function
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
    LIMIT 50
  LOOP
    v_processed_count := v_processed_count + 1;
    
    SELECT auto_create_activity_for_completed_task(v_stage_instance.id) INTO v_result;
    v_results := v_results || v_result;
    
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
`;

  // Setup automation mutation
  const setupMutation = useMutation({
    mutationFn: async () => {
      // First, verify if the functions are installed
      const { data: verifyResult, error: verifyError } = await lf
        .rpc('sf6_verify_installation');

      if (verifyError) {
        throw new Error(`Verificação falhou: ${verifyError.message}. Por favor, execute o arquivo SF6_SUPABASE_COMPATIBLE_SCHEMA.sql no seu Supabase SQL Editor.`);
      }

      if (!verifyResult?.installation_complete) {
        throw new Error(`SF-6 não está completamente instalado. ${verifyResult?.message || 'Execute o arquivo SF6_SUPABASE_COMPATIBLE_SCHEMA.sql no Supabase SQL Editor.'}`);
      }

      // Test the setup by calling the helper function
      const { data: testResult, error: testError } = await lf
        .rpc('sf6_process_existing_completed_tasks');

      if (testError) {
        throw new Error(`Setup verificado mas teste falhou: ${testError.message}`);
      }

      return testResult as AutomationResult;
    },
    onSuccess: (result) => {
      setSetupResult(result);
      toast({
        title: "SF-6 Automation instalada",
        description: `${result.created_count} activities criadas automaticamente`,
      });
    },
    onError: (error: any) => {
      setSetupResult({
        success: false,
        error: error.message,
      });
      toast({
        title: "Erro na instalação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test existing automation
  const testMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await lf.rpc('sf6_process_existing_completed_tasks');
      if (error) throw error;
      return data as AutomationResult;
    },
    onSuccess: (result) => {
      setSetupResult(result);
      toast({
        title: "Teste concluído",
        description: `${result.created_count} activities criadas para etapas concluídas`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no teste",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Tarefas e Tickets - Sistema de Bridge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-neutral-600">
          <p>
            <strong>Tarefas e Tickets:</strong> Bridge automático que cria
            tarefas quando etapas do tipo "task" são concluídas na jornada.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setupMutation.mutate()}
            disabled={setupMutation.isPending}
            style={{ backgroundColor: "var(--brand-700)", color: "white" }}
          >
            {setupMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            <Play className="w-4 h-4 mr-2" />
            Instalar Automação
          </Button>

          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
          >
            {testMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Testar Automação
          </Button>
        </div>

        {setupResult && (
          <Alert>
            <div className="flex items-center gap-2">
              {setupResult.success ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
              <AlertDescription>
                {setupResult.success ? (
                  <div className="space-y-1">
                    <p>✅ SF-6 Automation instalada com sucesso!</p>
                    <div className="flex items-center gap-4 text-sm">
                      <Badge variant="secondary">
                        {setupResult.processed_count} etapas processadas
                      </Badge>
                      <Badge 
                        style={{ backgroundColor: "var(--brand-700)", color: "white" }}
                      >
                        {setupResult.created_count} activities criadas
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p>❌ Erro: {setupResult.error}</p>
                )}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="text-xs text-neutral-500 space-y-1">
          <p><strong>O que será instalado:</strong></p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Função RPC: <code>auto_create_activity_for_completed_task()</code></li>
            <li>Trigger: <code>trigger_sf6_auto_create_activity</code> em stage_instances</li>
            <li>Helper: <code>sf6_process_existing_completed_tasks()</code></li>
          </ul>
        </div>
      </CardContent>
    </Card>

    {/* SF-6 Bridge Manager */}
    <SF6BridgeManager />

    {/* SF-6 Round-Trip Test */}
    <SF6RoundTripTest />
    </div>
  );
}
