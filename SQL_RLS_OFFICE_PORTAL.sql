-- ===================================
-- RLS PHASE 4 - OFFICE vs PORTAL SECURITY
-- ===================================

-- Helper functions for Office/Portal access control
CREATE OR REPLACE FUNCTION legalflow.is_office() 
RETURNS boolean
LANGUAGE sql 
STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_advogado ua WHERE ua.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION legalflow.current_cliente_cpfcnpj() 
RETURNS varchar
LANGUAGE sql 
STABLE AS $$
  SELECT c.cpfcnpj FROM public.clientes c WHERE c.user_id = auth.uid() LIMIT 1;
$$;

-- Tickets: escritório vê tudo; cliente vê só os seus; cliente pode criar.
ALTER TABLE legalflow.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t_office_read ON legalflow.tickets;
CREATE POLICY t_office_read ON legalflow.tickets 
FOR SELECT USING (legalflow.is_office());

DROP POLICY IF EXISTS t_client_read ON legalflow.tickets;
CREATE POLICY t_client_read ON legalflow.tickets 
FOR SELECT USING (cliente_cpfcnpj = legalflow.current_cliente_cpfcnpj());

DROP POLICY IF EXISTS t_office_write ON legalflow.tickets;
CREATE POLICY t_office_write ON legalflow.tickets 
FOR ALL USING (legalflow.is_office());

DROP POLICY IF EXISTS t_client_insert ON legalflow.tickets;
CREATE POLICY t_client_insert ON legalflow.tickets 
FOR INSERT WITH CHECK (cliente_cpfcnpj = legalflow.current_cliente_cpfcnpj());

-- Activities: só escritório.
ALTER TABLE legalflow.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS a_office_all ON legalflow.activities;
CREATE POLICY a_office_all ON legalflow.activities 
FOR ALL USING (legalflow.is_office()) WITH CHECK (legalflow.is_office());

-- Deals: só escritório.
ALTER TABLE legalflow.deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS d_office_all ON legalflow.deals;
CREATE POLICY d_office_all ON legalflow.deals 
FOR ALL USING (legalflow.is_office()) WITH CHECK (legalflow.is_office());

-- Jornadas: escritório vê tudo; cliente vê suas instâncias.
ALTER TABLE legalflow.journey_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ji_office_read ON legalflow.journey_instances;
CREATE POLICY ji_office_read ON legalflow.journey_instances 
FOR ALL USING (legalflow.is_office());

DROP POLICY IF EXISTS ji_client_read ON legalflow.journey_instances;
CREATE POLICY ji_client_read ON legalflow.journey_instances 
FOR SELECT USING (cliente_cpfcnpj = legalflow.current_cliente_cpfcnpj());

ALTER TABLE legalflow.stage_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS si_office_read ON legalflow.stage_instances;
CREATE POLICY si_office_read ON legalflow.stage_instances 
FOR ALL USING (legalflow.is_office());

DROP POLICY IF EXISTS si_client_read ON legalflow.stage_instances;
CREATE POLICY si_client_read ON legalflow.stage_instances 
FOR SELECT USING (EXISTS (
  SELECT 1 FROM legalflow.journey_instances ji
  WHERE ji.id = stage_instances.instance_id
    AND ji.cliente_cpfcnpj = legalflow.current_cliente_cpfcnpj()
));

-- Documentos uploads: escritório e o próprio cliente.
ALTER TABLE legalflow.document_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS du_office_read ON legalflow.document_uploads;
CREATE POLICY du_office_read ON legalflow.document_uploads 
FOR ALL USING (legalflow.is_office());

DROP POLICY IF EXISTS du_client_access ON legalflow.document_uploads;
CREATE POLICY du_client_access ON legalflow.document_uploads 
FOR ALL USING (EXISTS (
  SELECT 1 FROM legalflow.stage_instances si
  JOIN legalflow.journey_instances ji ON ji.id = si.instance_id
  WHERE si.id = document_uploads.stage_instance_id 
    AND ji.cliente_cpfcnpj = legalflow.current_cliente_cpfcnpj()
));

-- Agenda (cliente só vê os seus compromissos)
ALTER TABLE legalflow.eventos_agenda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ev_office_read ON legalflow.eventos_agenda;
CREATE POLICY ev_office_read ON legalflow.eventos_agenda 
FOR ALL USING (legalflow.is_office());

DROP POLICY IF EXISTS ev_client_read ON legalflow.eventos_agenda;
CREATE POLICY ev_client_read ON legalflow.eventos_agenda 
FOR SELECT USING (cliente_cpfcnpj = legalflow.current_cliente_cpfcnpj());

-- Financeiro: escritório; cliente vê somente os seus via join com journey_instances
ALTER TABLE legalflow.planos_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE legalflow.parcelas_pagamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pp_office_read ON legalflow.planos_pagamento;
CREATE POLICY pp_office_read ON legalflow.planos_pagamento 
FOR ALL USING (legalflow.is_office());

DROP POLICY IF EXISTS pp_client_read ON legalflow.planos_pagamento;
CREATE POLICY pp_client_read ON legalflow.planos_pagamento 
FOR SELECT USING (cliente_cpfcnpj = legalflow.current_cliente_cpfcnpj());

DROP POLICY IF EXISTS parc_office_read ON legalflow.parcelas_pagamento;
CREATE POLICY parc_office_read ON legalflow.parcelas_pagamento 
FOR ALL USING (legalflow.is_office());

DROP POLICY IF EXISTS parc_client_read ON legalflow.parcelas_pagamento;
CREATE POLICY parc_client_read ON legalflow.parcelas_pagamento 
FOR SELECT USING (EXISTS (
  SELECT 1 FROM legalflow.planos_pagamento pp
  WHERE pp.id = parcelas_pagamento.plano_id
    AND pp.cliente_cpfcnpj = legalflow.current_cliente_cpfcnpj()
));

-- Time entries: office only
ALTER TABLE legalflow.time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS te_office_all ON legalflow.time_entries;
CREATE POLICY te_office_all ON legalflow.time_entries 
FOR ALL USING (legalflow.is_office());

-- CSAT ratings: office can manage, clients can create for their tickets
ALTER TABLE legalflow.csat_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS csat_office_all ON legalflow.csat_ratings;
CREATE POLICY csat_office_all ON legalflow.csat_ratings 
FOR ALL USING (legalflow.is_office());

DROP POLICY IF EXISTS csat_client_insert ON legalflow.csat_ratings;
CREATE POLICY csat_client_insert ON legalflow.csat_ratings 
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM legalflow.tickets t
  WHERE t.id = csat_ratings.ticket_id
    AND t.cliente_cpfcnpj = legalflow.current_cliente_cpfcnpj()
));

-- SLA policies: office only
ALTER TABLE legalflow.sla_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sla_office_all ON legalflow.sla_policies;
CREATE POLICY sla_office_all ON legalflow.sla_policies 
FOR ALL USING (legalflow.is_office());

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION legalflow.is_office() TO authenticated;
GRANT EXECUTE ON FUNCTION legalflow.current_cliente_cpfcnpj() TO authenticated;

-- Comments
COMMENT ON FUNCTION legalflow.is_office() IS 'Returns true if current user is office/team member';
COMMENT ON FUNCTION legalflow.current_cliente_cpfcnpj() IS 'Returns CPF/CNPJ of current client user';
