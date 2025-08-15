-- Funções SQL para operações CRUD completas do Backlog
-- Extensão do sistema Autofix para suporte completo a edição e remoção

-- Função para atualizar item do backlog (propriedades gerais)
CREATE OR REPLACE FUNCTION update_backlog_item(
  p_item_id UUID,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_type autofix_item_type DEFAULT NULL,
  p_priority autofix_priority DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_story_points INTEGER DEFAULT NULL,
  p_complexity autofix_complexity DEFAULT NULL,
  p_estimated_hours INTEGER DEFAULT NULL,
  p_builder_prompt TEXT DEFAULT NULL,
  p_can_execute_in_builder BOOLEAN DEFAULT NULL,
  p_acceptance_criteria TEXT[] DEFAULT NULL,
  p_business_value TEXT DEFAULT NULL,
  p_technical_notes TEXT DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_due_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_updated_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar se o item existe
  IF NOT EXISTS (SELECT 1 FROM autofix_backlog WHERE id = p_item_id) THEN
    RAISE EXCEPTION 'Item do backlog não encontrado';
  END IF;

  -- Atualizar apenas campos fornecidos
  UPDATE autofix_backlog 
  SET 
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    type = COALESCE(p_type, type),
    priority = COALESCE(p_priority, priority),
    category = COALESCE(p_category, category),
    tags = COALESCE(p_tags, tags),
    story_points = COALESCE(p_story_points, story_points),
    complexity = COALESCE(p_complexity, complexity),
    estimated_hours = COALESCE(p_estimated_hours, estimated_hours),
    builder_prompt = COALESCE(p_builder_prompt, builder_prompt),
    can_execute_in_builder = COALESCE(p_can_execute_in_builder, can_execute_in_builder),
    acceptance_criteria = COALESCE(p_acceptance_criteria, acceptance_criteria),
    business_value = COALESCE(p_business_value, business_value),
    technical_notes = COALESCE(p_technical_notes, technical_notes),
    assigned_to = COALESCE(p_assigned_to, assigned_to),
    due_date = COALESCE(p_due_date, due_date),
    updated_at = NOW()
  WHERE id = p_item_id;

  -- Log da operação
  INSERT INTO autofix_history (
    item_id,
    action,
    description,
    metadata,
    created_by
  ) VALUES (
    p_item_id,
    'item_updated',
    'Item do backlog atualizado',
    jsonb_build_object(
      'updated_fields', v_updated_fields,
      'updated_by', v_user_id,
      'timestamp', NOW()
    ),
    v_user_id
  );

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao atualizar item: %', SQLERRM;
END;
$$;

-- Função para remover item do backlog (soft delete)
CREATE OR REPLACE FUNCTION delete_backlog_item(
  p_item_id UUID,
  p_hard_delete BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_item_record RECORD;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Buscar item para logging
  SELECT * INTO v_item_record
  FROM autofix_backlog 
  WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item do backlog não encontrado';
  END IF;

  -- Verificar permissões (apenas criador ou admin pode deletar)
  IF v_item_record.created_by != v_user_id AND 
     NOT EXISTS (
       SELECT 1 FROM auth.users 
       WHERE id = v_user_id 
       AND raw_user_meta_data->>'role' IN ('admin', 'superadmin')
     ) THEN
    RAISE EXCEPTION 'Sem permissão para deletar este item';
  END IF;

  IF p_hard_delete THEN
    -- Hard delete - remove completamente
    DELETE FROM autofix_backlog WHERE id = p_item_id;
    
    -- Log da remoção
    INSERT INTO autofix_history (
      item_id,
      action,
      description,
      metadata,
      created_by
    ) VALUES (
      p_item_id,
      'item_deleted_hard',
      'Item do backlog removido permanentemente',
      jsonb_build_object(
        'title', v_item_record.title,
        'type', v_item_record.type,
        'deleted_by', v_user_id,
        'timestamp', NOW()
      ),
      v_user_id
    );
  ELSE
    -- Soft delete - apenas marca como deletado
    UPDATE autofix_backlog 
    SET 
      status = 'archived'::autofix_status,
      updated_at = NOW()
    WHERE id = p_item_id;
    
    -- Log da remoção
    INSERT INTO autofix_history (
      item_id,
      action,
      description,
      metadata,
      created_by
    ) VALUES (
      p_item_id,
      'item_archived',
      'Item do backlog arquivado',
      jsonb_build_object(
        'title', v_item_record.title,
        'archived_by', v_user_id,
        'timestamp', NOW()
      ),
      v_user_id
    );
  END IF;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao deletar item: %', SQLERRM;
END;
$$;

-- Função para restaurar item arquivado
CREATE OR REPLACE FUNCTION restore_backlog_item(
  p_item_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar se o item existe e está arquivado
  IF NOT EXISTS (
    SELECT 1 FROM autofix_backlog 
    WHERE id = p_item_id AND status = 'archived'
  ) THEN
    RAISE EXCEPTION 'Item não encontrado ou não está arquivado';
  END IF;

  -- Restaurar item
  UPDATE autofix_backlog 
  SET 
    status = 'backlog'::autofix_status,
    updated_at = NOW()
  WHERE id = p_item_id;

  -- Log da restauração
  INSERT INTO autofix_history (
    item_id,
    action,
    description,
    metadata,
    created_by
  ) VALUES (
    p_item_id,
    'item_restored',
    'Item do backlog restaurado do arquivo',
    jsonb_build_object(
      'restored_by', v_user_id,
      'timestamp', NOW()
    ),
    v_user_id
  );

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao restaurar item: %', SQLERRM;
END;
$$;

-- Função para duplicar item do backlog
CREATE OR REPLACE FUNCTION duplicate_backlog_item(
  p_item_id UUID,
  p_new_title TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_original_item RECORD;
  v_new_item_id UUID;
  v_new_title TEXT;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Buscar item original
  SELECT * INTO v_original_item
  FROM autofix_backlog 
  WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item original não encontrado';
  END IF;

  -- Gerar novo ID e título
  v_new_item_id := gen_random_uuid();
  v_new_title := COALESCE(p_new_title, '[CÓPIA] ' || v_original_item.title);

  -- Criar cópia
  INSERT INTO autofix_backlog (
    id,
    title,
    description,
    type,
    priority,
    category,
    tags,
    status,
    pipeline_stage,
    story_points,
    complexity,
    estimated_hours,
    builder_prompt,
    can_execute_in_builder,
    acceptance_criteria,
    business_value,
    technical_notes,
    created_by,
    assigned_to
  ) VALUES (
    v_new_item_id,
    v_new_title,
    v_original_item.description,
    v_original_item.type,
    v_original_item.priority,
    v_original_item.category,
    v_original_item.tags,
    'backlog'::autofix_status,
    'ideation'::autofix_pipeline_stage,
    v_original_item.story_points,
    v_original_item.complexity,
    v_original_item.estimated_hours,
    v_original_item.builder_prompt,
    v_original_item.can_execute_in_builder,
    v_original_item.acceptance_criteria,
    v_original_item.business_value,
    v_original_item.technical_notes,
    v_user_id,
    NULL -- Não duplicar a atribuição
  );

  -- Log da duplicação
  INSERT INTO autofix_history (
    item_id,
    action,
    description,
    metadata,
    created_by
  ) VALUES (
    v_new_item_id,
    'item_duplicated',
    'Item duplicado do backlog',
    jsonb_build_object(
      'original_item_id', p_item_id,
      'original_title', v_original_item.title,
      'duplicated_by', v_user_id,
      'timestamp', NOW()
    ),
    v_user_id
  );

  RETURN v_new_item_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao duplicar item: %', SQLERRM;
END;
$$;

-- Função para buscar itens relacionados (por tags similares)
CREATE OR REPLACE FUNCTION get_related_backlog_items(
  p_item_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  type autofix_item_type,
  priority autofix_priority,
  status autofix_status,
  common_tags TEXT[],
  similarity_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item_tags TEXT[];
BEGIN
  -- Buscar tags do item original
  SELECT tags INTO v_item_tags
  FROM autofix_backlog 
  WHERE autofix_backlog.id = p_item_id;

  IF v_item_tags IS NULL OR array_length(v_item_tags, 1) = 0 THEN
    RETURN;
  END IF;

  -- Buscar itens com tags similares
  RETURN QUERY
  SELECT 
    ab.id,
    ab.title,
    ab.type,
    ab.priority,
    ab.status,
    array_intersect(ab.tags, v_item_tags) as common_tags,
    (
      array_length(array_intersect(ab.tags, v_item_tags), 1)::NUMERIC / 
      array_length(array_union(ab.tags, v_item_tags), 1)::NUMERIC
    ) as similarity_score
  FROM autofix_backlog ab
  WHERE 
    ab.id != p_item_id 
    AND ab.tags && v_item_tags -- Tem pelo menos uma tag em comum
    AND ab.status != 'archived'
  ORDER BY similarity_score DESC, ab.updated_at DESC
  LIMIT p_limit;

EXCEPTION
  WHEN OTHERS THEN
    RETURN;
END;
$$;

-- Função helper para intersecção de arrays
CREATE OR REPLACE FUNCTION array_intersect(a1 TEXT[], a2 TEXT[])
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT array_agg(element)
  FROM unnest(a1) AS element
  WHERE element = ANY(a2);
$$;

-- Função helper para união de arrays
CREATE OR REPLACE FUNCTION array_union(a1 TEXT[], a2 TEXT[])
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT array_agg(DISTINCT element)
  FROM (
    SELECT unnest(a1) AS element
    UNION
    SELECT unnest(a2) AS element
  ) AS combined;
$$;

-- Atualizar view para incluir status arquivado
CREATE OR REPLACE VIEW vw_autofix_kanban_with_archived AS
SELECT 
  ab.*,
  u1.email as created_by_email,
  u2.email as assigned_to_email,
  COALESCE(comment_counts.comment_count, 0) as comment_count,
  COALESCE(attachment_counts.attachment_count, 0) as attachment_count,
  COALESCE(ab.approval_status, 'pending') as approval_status
FROM autofix_backlog ab
LEFT JOIN auth.users u1 ON ab.created_by = u1.id
LEFT JOIN auth.users u2 ON ab.assigned_to = u2.id
LEFT JOIN (
  SELECT 
    item_id, 
    COUNT(*) as comment_count
  FROM autofix_comments 
  GROUP BY item_id
) comment_counts ON ab.id = comment_counts.item_id
LEFT JOIN (
  SELECT 
    item_id, 
    COUNT(*) as attachment_count
  FROM autofix_attachments 
  GROUP BY item_id
) attachment_counts ON ab.id = attachment_counts.item_id
ORDER BY ab.updated_at DESC;

-- Comentários para documentação
COMMENT ON FUNCTION update_backlog_item IS 'Atualiza propriedades gerais de um item do backlog';
COMMENT ON FUNCTION delete_backlog_item IS 'Remove ou arquiva um item do backlog com controle de permissões';
COMMENT ON FUNCTION restore_backlog_item IS 'Restaura um item arquivado do backlog';
COMMENT ON FUNCTION duplicate_backlog_item IS 'Cria uma cópia de um item do backlog';
COMMENT ON FUNCTION get_related_backlog_items IS 'Busca itens relacionados baseado em tags similares';
