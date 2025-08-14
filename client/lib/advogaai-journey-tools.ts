import { lf } from "./supabase";

/**
 * AdvogaAI Tools HTTP v2 for Journey Management
 * 
 * These endpoints allow the AI agent to interact with journey management
 * directly from chat contexts within the application.
 */

export interface StageCompleteRequest {
  stage_instance_id: string;
  notes?: string;
}

export interface StageCreateRequest {
  instance_id: string;
  template_stage_id?: string;
  title: string;
  description?: string;
  type_id: string;
  mandatory?: boolean;
  sla_hours?: number;
  due_at?: string;
  assigned_oab?: number;
}

export interface FormSubmitRequest {
  stage_instance_id: string;
  form_key: string;
  answers_json: Record<string, any>;
  submitted_by?: string;
}

export interface DocumentRequestRequest {
  template_stage_id: string;
  name: string;
  required?: boolean;
  file_types?: string[];
  max_size_mb?: number;
}

export interface AdvogaAIJourneyToolsResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

/**
 * Complete a stage instance
 * POST /api/v1/agent/tools/stage.complete
 */
export async function completeStage(request: StageCompleteRequest): Promise<AdvogaAIJourneyToolsResponse> {
  try {
    const { error } = await lf
      .from('stage_instances')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', request.stage_instance_id);

    if (error) throw error;

    // Optionally add notes to stage history
    if (request.notes) {
      await lf.from('stage_notes').insert({
        stage_instance_id: request.stage_instance_id,
        content: request.notes,
        created_by: 'advogaai'
      });
    }

    return {
      success: true,
      message: "Etapa marcada como concluída",
      data: { stage_instance_id: request.stage_instance_id }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao concluir etapa"
    };
  }
}

/**
 * Create a new stage instance
 * POST /api/v1/agent/tools/stage.create
 */
export async function createStage(request: StageCreateRequest): Promise<AdvogaAIJourneyToolsResponse> {
  try {
    let templateStageId = request.template_stage_id;

    // If no template stage provided, create a custom one
    if (!templateStageId) {
      const { data: templateStage, error: templateError } = await lf
        .from('journey_template_stages')
        .insert({
          template_id: null, // Custom stage
          position: 999,
          title: request.title,
          description: request.description,
          type_id: request.type_id,
          mandatory: request.mandatory || false,
          sla_hours: request.sla_hours || 24
        })
        .select()
        .single();

      if (templateError) throw templateError;
      templateStageId = templateStage.id;
    }

    // Create the stage instance
    const { data: stageInstance, error } = await lf
      .from('stage_instances')
      .insert({
        instance_id: request.instance_id,
        template_stage_id: templateStageId,
        status: 'pending',
        mandatory: request.mandatory || false,
        sla_at: request.due_at || new Date(Date.now() + (request.sla_hours || 24) * 60 * 60 * 1000).toISOString(),
        assigned_oab: request.assigned_oab
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: "Nova etapa criada na jornada",
      data: stageInstance
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao criar etapa"
    };
  }
}

/**
 * Submit form responses for a stage
 * POST /api/v1/agent/tools/form.submit
 */
export async function submitForm(request: FormSubmitRequest): Promise<AdvogaAIJourneyToolsResponse> {
  try {
    const { data: formResponse, error } = await lf
      .from('form_responses')
      .insert({
        stage_instance_id: request.stage_instance_id,
        form_key: request.form_key,
        answers: request.answers_json,
        submitted_by: request.submitted_by || 'advogaai',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Optionally mark stage as completed if form submission completes it
    await lf
      .from('stage_instances')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', request.stage_instance_id);

    return {
      success: true,
      message: "Formulário submetido com sucesso",
      data: formResponse
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao submeter formulário"
    };
  }
}

/**
 * Request document for a stage
 * POST /api/v1/agent/tools/document.request
 */
export async function requestDocument(request: DocumentRequestRequest): Promise<AdvogaAIJourneyToolsResponse> {
  try {
    const { data: documentRequirement, error } = await lf
      .from('document_requirements')
      .insert({
        template_stage_id: request.template_stage_id,
        name: request.name,
        required: request.required !== false, // Default to true
        file_types: request.file_types || ['pdf'],
        max_size_mb: request.max_size_mb || 10
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: "Requisito de documento criado",
      data: documentRequirement
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao criar requisito de documento"
    };
  }
}

/**
 * Get journey instance details
 * GET /api/v1/agent/tools/journey.get
 */
export async function getJourneyInstance(instanceId: string): Promise<AdvogaAIJourneyToolsResponse> {
  try {
    const { data: instance, error } = await lf
      .from('vw_process_journey')
      .select('*')
      .eq('id', instanceId)
      .single();

    if (error) throw error;

    // Get stage instances
    const { data: stages, error: stagesError } = await lf
      .from('stage_instances')
      .select(`
        id,
        status,
        mandatory,
        sla_at,
        completed_at,
        journey_template_stages (
          title,
          description,
          stage_types (
            code,
            label
          )
        )
      `)
      .eq('instance_id', instanceId)
      .order('sla_at');

    if (stagesError) throw stagesError;

    return {
      success: true,
      data: {
        instance,
        stages: stages.map(stage => ({
          id: stage.id,
          title: stage.journey_template_stages?.title,
          description: stage.journey_template_stages?.description,
          stage_type: stage.journey_template_stages?.stage_types?.code,
          status: stage.status,
          mandatory: stage.mandatory,
          due_at: stage.sla_at,
          completed_at: stage.completed_at
        }))
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao buscar instância da jornada"
    };
  }
}

/**
 * List active journeys for a process
 * GET /api/v1/agent/tools/journey.list
 */
export async function listJourneysByProcess(numeroCnj: string): Promise<AdvogaAIJourneyToolsResponse> {
  try {
    const { data: journeys, error } = await lf
      .from('vw_process_journey')
      .select('*')
      .eq('numero_cnj', numeroCnj)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: journeys
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao listar jornadas"
    };
  }
}

/**
 * Tool registry for easy access in chat contexts
 */
export const advogaAIJourneyTools = {
  'stage.complete': completeStage,
  'stage.create': createStage,
  'form.submit': submitForm,
  'document.request': requestDocument,
  'journey.get': getJourneyInstance,
  'journey.list': listJourneysByProcess
};

/**
 * Execute a tool by name with request data
 */
export async function executeJourneyTool(toolName: string, request: any): Promise<AdvogaAIJourneyToolsResponse> {
  const tool = advogaAIJourneyTools[toolName as keyof typeof advogaAIJourneyTools];
  
  if (!tool) {
    return {
      success: false,
      error: `Tool '${toolName}' not found`
    };
  }

  try {
    return await tool(request);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Erro interno da ferramenta"
    };
  }
}

/**
 * HTTP handler for journey tools (can be used in API routes)
 */
export async function handleJourneyToolRequest(
  method: string,
  toolPath: string,
  body: any
): Promise<Response> {
  if (method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const result = await executeJourneyTool(toolPath, body);
  
  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 400,
    headers: { 'Content-Type': 'application/json' }
  });
}
