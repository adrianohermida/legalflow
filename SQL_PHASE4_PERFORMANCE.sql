-- ===================================
-- PHASE 4 PERFORMANCE OPTIMIZATION
-- ===================================

-- Additional indexes for Phase 4 tables and queries

-- SLA Policies indexes
CREATE INDEX IF NOT EXISTS idx_sla_policies_active ON legalflow.sla_policies(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_sla_policies_group_priority ON legalflow.sla_policies(group_key, priority) WHERE active = true;

-- Tickets performance indexes
CREATE INDEX IF NOT EXISTS idx_tickets_sla_frt ON legalflow.tickets(frt_due_at) WHERE frt_due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_sla_ttr ON legalflow.tickets(ttr_due_at) WHERE ttr_due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_first_response ON legalflow.tickets(first_response_at);
CREATE INDEX IF NOT EXISTS idx_tickets_resolved_at ON legalflow.tickets(resolved_at);
CREATE INDEX IF NOT EXISTS idx_tickets_status_created ON legalflow.tickets(status, created_at);

-- Time entries performance
CREATE INDEX IF NOT EXISTS idx_time_entries_user_started ON legalflow.time_entries(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_ticket_duration ON legalflow.time_entries(ticket_id, duration_minutes);

-- CSAT ratings performance  
CREATE INDEX IF NOT EXISTS idx_csat_ratings_created_rating ON legalflow.csat_ratings(created_at, rating);
CREATE INDEX IF NOT EXISTS idx_csat_ratings_ticket_created ON legalflow.csat_ratings(ticket_id, created_at);

-- Activities performance
CREATE INDEX IF NOT EXISTS idx_activities_status_due ON legalflow.activities(status, due_at) WHERE status IN ('pending', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_activities_assigned_status ON legalflow.activities(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_activities_type_status ON legalflow.activities(activity_type, status);

-- Deals performance  
CREATE INDEX IF NOT EXISTS idx_deals_stage_value ON legalflow.deals(stage, value);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_stage ON legalflow.deals(assigned_to, stage);
CREATE INDEX IF NOT EXISTS idx_deals_close_date ON legalflow.deals(expected_close_date) WHERE stage NOT IN ('closed_won', 'closed_lost');

-- Agenda events performance
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_data_status ON legalflow.eventos_agenda(data_inicio, status);
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_assigned_data ON legalflow.eventos_agenda(assigned_to, data_inicio);

-- Parcelas pagamento performance
CREATE INDEX IF NOT EXISTS idx_parcelas_status_due ON legalflow.parcelas_pagamento(status, due_date);
CREATE INDEX IF NOT EXISTS idx_parcelas_plano_status ON legalflow.parcelas_pagamento(plano_id, status);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_tickets_metrics_query ON legalflow.tickets(created_at, status, priority, group_key) 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

CREATE INDEX IF NOT EXISTS idx_stage_instances_sla_query ON legalflow.stage_instances(status, sla_at)
WHERE status IN ('pending', 'in_progress');

-- App events telemetry performance
CREATE INDEX IF NOT EXISTS idx_app_events_event_created ON legalflow.app_events(event, created_at);
CREATE INDEX IF NOT EXISTS idx_app_events_user_event ON legalflow.app_events(user_id, event, created_at);

-- Ticket threads performance
CREATE INDEX IF NOT EXISTS idx_ticket_threads_ticket_created ON legalflow.ticket_threads(ticket_id, created_at);

-- Update table statistics for query planner
ANALYZE legalflow.tickets;
ANALYZE legalflow.time_entries;
ANALYZE legalflow.csat_ratings;
ANALYZE legalflow.activities;
ANALYZE legalflow.deals;
ANALYZE legalflow.eventos_agenda;
ANALYZE legalflow.parcelas_pagamento;
ANALYZE legalflow.app_events;

-- Comments for documentation
COMMENT ON INDEX legalflow.idx_sla_policies_group_priority IS 'Optimizes SLA policy lookup for ticket creation';
COMMENT ON INDEX legalflow.idx_tickets_metrics_query IS 'Optimizes ticket metrics view queries for last 30 days';
COMMENT ON INDEX legalflow.idx_stage_instances_sla_query IS 'Optimizes SLA stage buckets view queries';
