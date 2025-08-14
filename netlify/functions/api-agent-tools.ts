import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const lf = supabase.schema("legalflow");

interface AdvogaAIToolResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

/**
 * Complete a stage instance
 */
async function completeStage(request: any): Promise<AdvogaAIToolResponse> {
  try {
    const { stage_instance_id, notes } = request;

    const { error } = await lf
      .from("stage_instances")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", stage_instance_id);

    if (error) throw error;

    return {
      success: true,
      message: "Etapa marcada como concluída",
      data: { stage_instance_id },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao concluir etapa",
    };
  }
}

/**
 * Create a new stage instance
 */
async function createStage(request: any): Promise<AdvogaAIToolResponse> {
  try {
    const {
      instance_id,
      template_stage_id,
      title,
      description,
      type_id,
      mandatory = false,
      sla_hours = 24,
      due_at,
      assigned_oab,
    } = request;

    let finalTemplateStageId = template_stage_id;

    // If no template stage provided, create a custom one
    if (!finalTemplateStageId) {
      const { data: templateStage, error: templateError } = await lf
        .from("journey_template_stages")
        .insert({
          template_id: null, // Custom stage
          position: 999,
          title,
          description,
          type_id,
          mandatory,
          sla_hours,
        })
        .select()
        .single();

      if (templateError) throw templateError;
      finalTemplateStageId = templateStage.id;
    }

    // Create the stage instance
    const { data: stageInstance, error } = await lf
      .from("stage_instances")
      .insert({
        instance_id,
        template_stage_id: finalTemplateStageId,
        status: "pending",
        mandatory,
        sla_at:
          due_at ||
          new Date(Date.now() + sla_hours * 60 * 60 * 1000).toISOString(),
        assigned_oab,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: "Nova etapa criada na jornada",
      data: stageInstance,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao criar etapa",
    };
  }
}

/**
 * Submit form responses for a stage
 */
async function submitForm(request: any): Promise<AdvogaAIToolResponse> {
  try {
    const {
      stage_instance_id,
      form_key,
      answers_json,
      submitted_by = "advogaai",
    } = request;

    const { data: formResponse, error } = await lf
      .from("form_responses")
      .insert({
        stage_instance_id,
        form_key,
        answers: answers_json,
        submitted_by,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Optionally mark stage as completed if form submission completes it
    await lf
      .from("stage_instances")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", stage_instance_id);

    return {
      success: true,
      message: "Formulário submetido com sucesso",
      data: formResponse,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao submeter formulário",
    };
  }
}

/**
 * Request document for a stage
 */
async function requestDocument(request: any): Promise<AdvogaAIToolResponse> {
  try {
    const {
      template_stage_id,
      name,
      required = true,
      file_types = ["pdf"],
      max_size_mb = 10,
    } = request;

    const { data: documentRequirement, error } = await lf
      .from("document_requirements")
      .insert({
        template_stage_id,
        name,
        required,
        file_types,
        max_size_mb,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: "Requisito de documento criado",
      data: documentRequirement,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao criar requisito de documento",
    };
  }
}

/**
 * Get journey instance details
 */
async function getJourney(instanceId: string): Promise<AdvogaAIToolResponse> {
  try {
    const { data: instance, error } = await lf
      .from("vw_process_journey")
      .select("*")
      .eq("id", instanceId)
      .single();

    if (error) throw error;

    // Get stage instances
    const { data: stages, error: stagesError } = await lf
      .from("stage_instances")
      .select(
        `
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
      `,
      )
      .eq("instance_id", instanceId)
      .order("sla_at");

    if (stagesError) throw stagesError;

    return {
      success: true,
      data: {
        instance,
        stages: stages.map((stage) => ({
          id: stage.id,
          title: stage.journey_template_stages?.title,
          description: stage.journey_template_stages?.description,
          stage_type: stage.journey_template_stages?.stage_types?.code,
          status: stage.status,
          mandatory: stage.mandatory,
          due_at: stage.sla_at,
          completed_at: stage.completed_at,
        })),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao buscar instância da jornada",
    };
  }
}

/**
 * List active journeys for a process
 */
async function listJourneys(numeroCnj: string): Promise<AdvogaAIToolResponse> {
  try {
    const { data: journeys, error } = await lf
      .from("vw_process_journey")
      .select("*")
      .eq("numero_cnj", numeroCnj)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: journeys,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao listar jornadas",
    };
  }
}

const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    const path = event.path.replace("/.netlify/functions/api-agent-tools", "");
    const method = event.httpMethod;

    if (method !== "POST") {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({
          success: false,
          error: "Method not allowed",
        }),
      };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    let result: AdvogaAIToolResponse;

    // Route to appropriate tool
    switch (path) {
      case "/v1/agent/tools/stage.complete":
        result = await completeStage(body);
        break;

      case "/v1/agent/tools/stage.create":
        result = await createStage(body);
        break;

      case "/v1/agent/tools/form.submit":
        result = await submitForm(body);
        break;

      case "/v1/agent/tools/document.request":
        result = await requestDocument(body);
        break;

      case "/v1/agent/tools/journey.get":
        const { instance_id } = body;
        if (!instance_id) {
          result = { success: false, error: "instance_id is required" };
        } else {
          result = await getJourney(instance_id);
        }
        break;

      case "/v1/agent/tools/journey.list":
        const { numero_cnj } = body;
        if (!numero_cnj) {
          result = { success: false, error: "numero_cnj is required" };
        } else {
          result = await listJourneys(numero_cnj);
        }
        break;

      default:
        result = {
          success: false,
          error: `Tool not found: ${path}`,
        };
    }

    return {
      statusCode: result.success ? 200 : 400,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error("API Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
    };
  }
};

export { handler };
