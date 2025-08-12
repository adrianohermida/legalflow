// Journey Module Types
export interface JourneyTemplate {
  id: string;
  name: string;
  description: string;
  nicho: string; // Legal niche (e.g., "Trabalhista", "Cível", "Criminal")
  tags: string[];
  estimated_days: number;
  created_at: string;
  updated_at: string;
  created_by_oab: string;
  stages: JourneyTemplateStage[];
}

export interface JourneyTemplateStage {
  id: string;
  template_id: string;
  name: string;
  description: string;
  stage_type: StageType;
  sequence_order: number;
  is_required: boolean;
  sla_hours: number;
  estimated_days: number;
  rules: StageRule[];
}

export type StageType = 
  | 'lesson'    // Educational content
  | 'form'      // Form to fill out
  | 'upload'    // Document upload
  | 'meeting'   // Schedule meeting/hearing
  | 'gate'      // Approval/validation gate
  | 'task';     // General task

export interface StageRule {
  id: string;
  stage_id: string;
  rule_type: 'on_enter' | 'on_complete';
  condition: string;
  action: string;
}

// Journey Instances (Active Journeys)
export interface JourneyInstance {
  id: string;
  template_id: string;
  template_name: string;
  cliente_cpfcnpj: string;
  cliente_nome: string;
  processo_numero_cnj?: string;
  owner_oab: string;
  owner_nome: string;
  started_at: string;
  expected_completion: string;
  progress_pct: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  current_stage_id?: string;
  stages: StageInstance[];
}

export interface StageInstance {
  id: string;
  journey_instance_id: string;
  template_stage_id: string;
  stage_name: string;
  stage_type: StageType;
  sequence_order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  started_at?: string;
  completed_at?: string;
  due_date?: string;
  assigned_to_oab?: string;
  notes?: string;
  completion_data?: any; // Store form responses, uploaded files, etc.
}

// Supporting types for different stage types
export interface LessonContent {
  id: string;
  stage_instance_id: string;
  title: string;
  content: string;
  video_url?: string;
  duration_minutes?: number;
  quiz_questions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'text' | 'boolean';
  options?: string[];
  correct_answer?: string;
}

export interface FormDefinition {
  id: string;
  stage_instance_id: string;
  title: string;
  fields: FormField[];
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'file';
  required: boolean;
  options?: string[];
  validation?: string;
}

export interface DocumentRequirement {
  id: string;
  stage_instance_id: string;
  document_type: string;
  description: string;
  is_required: boolean;
  template_url?: string;
}

export interface MeetingSlot {
  id: string;
  stage_instance_id: string;
  title: string;
  description: string;
  scheduled_at?: string;
  duration_minutes: number;
  meeting_url?: string;
  location?: string;
  attendees: string[];
}

// Legal-specific types
export interface Publicacao {
  id: string;
  numero_cnj?: string;
  data_publicacao: string;
  content: string;
  tribunal: string;
  source: string;
  is_processed: boolean;
  linked_journey_instance_id?: string;
}

export interface Movimentacao {
  id: string;
  numero_cnj: string;
  data_movimentacao: string;
  description: string;
  tribunal: string;
  movement_type: string;
  is_processed: boolean;
  linked_journey_instance_id?: string;
}
