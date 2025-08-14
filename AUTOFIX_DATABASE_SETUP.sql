-- =====================================================
-- AUTOFIX HISTORY SYSTEM - DATABASE SETUP
-- Execute no Supabase SQL Editor para configurar as tabelas
-- =====================================================

-- 1. Criar tabela de histórico de modificações
CREATE TABLE IF NOT EXISTS autofix_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('autofix', 'manual', 'builder_prompt', 'git_import')),
  module TEXT NOT NULL,
  description TEXT NOT NULL,
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  success BOOLEAN NOT NULL DEFAULT false,
  context JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar tabela de prompts do Builder.io
CREATE TABLE IF NOT EXISTS builder_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  context TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT NOT NULL CHECK (category IN ('bug_fix', 'feature', 'improvement', 'refactor')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_autofix_history_timestamp ON autofix_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_autofix_history_type ON autofix_history(type);
CREATE INDEX IF NOT EXISTS idx_autofix_history_module ON autofix_history(module);
CREATE INDEX IF NOT EXISTS idx_autofix_history_success ON autofix_history(success);
CREATE INDEX IF NOT EXISTS idx_builder_prompts_status ON builder_prompts(status);
CREATE INDEX IF NOT EXISTS idx_builder_prompts_created_at ON builder_prompts(created_at DESC);

-- 4. Função para estatísticas do autofix
CREATE OR REPLACE FUNCTION get_autofix_stats()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_modifications', (SELECT COUNT(*) FROM autofix_history),
    'successful_modifications', (SELECT COUNT(*) FROM autofix_history WHERE success = true),
    'failed_modifications', (SELECT COUNT(*) FROM autofix_history WHERE success = false),
    'modifications_by_type', (
      SELECT jsonb_object_agg(type, count)
      FROM (
        SELECT type, COUNT(*) as count
        FROM autofix_history
        GROUP BY type
      ) counts
    ),
    'recent_activity', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'timestamp', timestamp,
          'type', type,
          'module', module,
          'description', description,
          'success', success
        )
      )
      FROM (
        SELECT id, timestamp, type, module, description, success
        FROM autofix_history
        ORDER BY timestamp DESC
        LIMIT 10
      ) recent
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Função para limpeza automática (manter últimas 1000 entradas)
CREATE OR REPLACE FUNCTION cleanup_autofix_history()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH oldest_entries AS (
    SELECT id
    FROM autofix_history
    ORDER BY timestamp DESC
    OFFSET 1000
  )
  DELETE FROM autofix_history
  WHERE id IN (SELECT id FROM oldest_entries);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist to avoid conflicts
DROP TRIGGER IF EXISTS update_autofix_history_updated_at ON autofix_history;
DROP TRIGGER IF EXISTS update_builder_prompts_updated_at ON builder_prompts;

-- Create triggers
CREATE TRIGGER update_autofix_history_updated_at
    BEFORE UPDATE ON autofix_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_builder_prompts_updated_at
    BEFORE UPDATE ON builder_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Inserir dados de exemplo do histórico Git simulado
INSERT INTO autofix_history (type, module, description, changes, success, context, metadata) VALUES
('git_import', 'repository', 'Git commit: feat: Implement office modules reorganization', 
 '["Modified client/components/Sidebar.tsx", "Modified client/components/OfficeModulesWindow.tsx", "Modified client/components/AppShell.tsx"]',
 true,
 '{"git_commit": "abc123", "files_modified": ["client/components/Sidebar.tsx", "client/components/OfficeModulesWindow.tsx", "client/components/AppShell.tsx"]}',
 '{"author": "Adriano Hermida Maia", "commit_date": "2024-01-15T10:30:00Z", "additions": 354, "deletions": 73}'
),
('git_import', 'repository', 'Git commit: fix: Resolve Label import error in InboxLegalV2',
 '["Modified client/pages/InboxLegalV2.tsx"]',
 true,
 '{"git_commit": "def456", "files_modified": ["client/pages/InboxLegalV2.tsx"]}',
 '{"author": "Adriano Hermida Maia", "commit_date": "2024-01-14T15:45:00Z", "additions": 1, "deletions": 0}'
),
('git_import', 'repository', 'Git commit: fix: Update toast components to use Radix UI properly',
 '["Modified client/components/ui/toast.tsx", "Modified client/components/ui/toaster.tsx", "Modified client/hooks/use-toast.ts", "Modified client/global.css"]',
 true,
 '{"git_commit": "ghi789", "files_modified": ["client/components/ui/toast.tsx", "client/components/ui/toaster.tsx", "client/hooks/use-toast.ts", "client/global.css"]}',
 '{"author": "Adriano Hermida Maia", "commit_date": "2024-01-13T09:20:00Z", "additions": 89, "deletions": 45}'
);

-- 8. Configurar RLS (Row Level Security) - opcional
-- ALTER TABLE autofix_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE builder_prompts ENABLE ROW LEVEL SECURITY;

-- Política básica para permitir acesso autenticado
-- CREATE POLICY "Allow authenticated users" ON autofix_history FOR ALL TO authenticated USING (true);
-- CREATE POLICY "Allow authenticated users" ON builder_prompts FOR ALL TO authenticated USING (true);

-- =====================================================
-- VERIFICAÇÃO DO SETUP
-- =====================================================

-- Verificar se as tabelas foram criadas
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('autofix_history', 'builder_prompts');

-- Verificar estatísticas iniciais
SELECT get_autofix_stats();

-- Verificar dados de exemplo inseridos
SELECT 
  type,
  module,
  description,
  success,
  timestamp
FROM autofix_history 
ORDER BY timestamp DESC 
LIMIT 5;

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================

/* 
1. Execute todo este script no Supabase SQL Editor
2. Verifique se as tabelas foram criadas executando a seção de verificação
3. No sistema, acesse /dev/auditoria e clique na aba "Histórico"
4. Teste a funcionalidade de importação de Git
5. Teste prompts do Builder.io (funcionalidade mock)

RECURSOS IMPLEMENTADOS:
- ✅ Histórico completo de modificações
- ✅ Integração simulada com Builder.io
- ✅ Importação de histórico Git
- ✅ Sistema de estatísticas
- ✅ Limpeza automática de dados antigos
- ✅ Interface visual para gerenciamento

PRÓXIMOS PASSOS:
- Conectar API real do Builder.io
- Configurar webhook para git commits
- Implementar notificações em tempo real
- Adicionar filtros avançados no histórico
*/
