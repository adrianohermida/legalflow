import React from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Download, Copy, ExternalLink } from "lucide-react";
import { useToast } from "../hooks/use-toast";

const SQL_CONTENT = `-- =====================================================
-- AUTOFIX HISTORY SYSTEM - DATABASE SETUP
-- Execute no Supabase SQL Editor para configurar as tabelas
-- VERSÃO CORRIGIDA - Pode ser executado múltiplas vezes sem erro
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

-- 7. Inserir dados de exemplo do histórico Git simulado (apenas se não existirem)
INSERT INTO autofix_history (type, module, description, changes, success, context, metadata)
SELECT * FROM (VALUES
  ('git_import'::text, 'repository'::text, 'Git commit: feat: Implement office modules reorganization'::text,
   '["Modified client/components/Sidebar.tsx", "Modified client/components/OfficeModulesWindow.tsx", "Modified client/components/AppShell.tsx"]'::jsonb,
   true,
   '{"git_commit": "abc123", "files_modified": ["client/components/Sidebar.tsx", "client/components/OfficeModulesWindow.tsx", "client/components/AppShell.tsx"]}'::jsonb,
   '{"author": "Adriano Hermida Maia", "commit_date": "2024-01-15T10:30:00Z", "additions": 354, "deletions": 73}'::jsonb
  ),
  ('git_import'::text, 'repository'::text, 'Git commit: fix: Resolve Label import error in InboxLegalV2'::text,
   '["Modified client/pages/InboxLegalV2.tsx"]'::jsonb,
   true,
   '{"git_commit": "def456", "files_modified": ["client/pages/InboxLegalV2.tsx"]}'::jsonb,
   '{"author": "Adriano Hermida Maia", "commit_date": "2024-01-14T15:45:00Z", "additions": 1, "deletions": 0}'::jsonb
  ),
  ('git_import'::text, 'repository'::text, 'Git commit: fix: Update toast components to use Radix UI properly'::text,
   '["Modified client/components/ui/toast.tsx", "Modified client/components/ui/toaster.tsx", "Modified client/hooks/use-toast.ts", "Modified client/global.css"]'::jsonb,
   true,
   '{"git_commit": "ghi789", "files_modified": ["client/components/ui/toast.tsx", "client/components/ui/toaster.tsx", "client/hooks/use-toast.ts", "client/global.css"]}'::jsonb,
   '{"author": "Adriano Hermida Maia", "commit_date": "2024-01-13T09:20:00Z", "additions": 89, "deletions": 45}'::jsonb
  )
) AS v(type, module, description, changes, success, context, metadata)
WHERE NOT EXISTS (
  SELECT 1 FROM autofix_history
  WHERE context->>'git_commit' IN ('abc123', 'def456', 'ghi789')
);

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
✅ VERSÃO CORRIGIDA - Agora pode ser executado múltiplas vezes sem erro!

1. Execute todo este script no Supabase SQL Editor
2. Verifique se as tabelas foram criadas executando a seção de verificação
3. No sistema, acesse /dev-auditoria e execute os testes
4. Teste a funcionalidade de importação de Git
5. Teste prompts do Builder.io

MELHORIAS NESTA VERSÃO:
- ✅ DROP TRIGGER IF EXISTS para evitar conflitos
- ✅ INSERT com verificação de duplicatas
- ✅ Pode ser executado múltiplas vezes sem erro
- ✅ Triggers recriados corretamente

RECURSOS IMPLEMENTADOS:
- ✅ Histórico completo de modificações
- ✅ Integração com Builder.io
- ✅ Importação de histórico Git
- ✅ Sistema de estatísticas
- ✅ Limpeza automática de dados antigos
- ✅ Interface visual para gerenciamento

PRÓXIMOS PASSOS:
- Conectar API real do Builder.io
- Configurar webhook para git commits
- Implementar notificações em tempo real
- Adicionar filtros avançados no histórico
*/`;

interface SQLFileDownloaderProps {
  className?: string;
}

const CLEANUP_SQL_CONTENT = `-- =====================================================
-- AUTOFIX CLEANUP SCRIPT
-- Execute APENAS se quiser limpar tudo e começar do zero
-- ATENÇÃO: Isso irá deletar TODOS os dados do autofix!
-- =====================================================

-- 1. Drop triggers first to avoid conflicts
DROP TRIGGER IF EXISTS update_autofix_history_updated_at ON autofix_history;
DROP TRIGGER IF EXISTS update_builder_prompts_updated_at ON builder_prompts;

-- 2. Drop functions
DROP FUNCTION IF EXISTS get_autofix_stats();
DROP FUNCTION IF EXISTS cleanup_autofix_history();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- 3. Drop tables (CASCADE will remove dependencies)
DROP TABLE IF EXISTS autofix_history CASCADE;
DROP TABLE IF EXISTS builder_prompts CASCADE;

-- =====================================================
-- VERIFICAÇÃO DA LIMPEZA
-- =====================================================

-- Verificar se as tabelas foram removidas
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('autofix_history', 'builder_prompts');

-- Se retornar 0 linhas, a limpeza foi bem-sucedida

-- =====================================================
-- PRÓXIMOS PASSOS
-- =====================================================

/*
Após executar este script de limpeza:

1. Execute o script principal: AUTOFIX_DATABASE_SETUP.sql
2. Verifique o setup em /autofix-testing
3. Execute os testes para confirmar funcionamento

ATENÇÃO: Este script remove TODOS os dados do autofix!
Use apenas se quiser começar completamente do zero.
*/`;

export const SQLFileDownloader: React.FC<SQLFileDownloaderProps> = ({
  className,
}) => {
  const { toast } = useToast();

  const downloadSQL = () => {
    try {
      const blob = new Blob([SQL_CONTENT], { type: "text/sql" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "AUTOFIX_DATABASE_SETUP.sql";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "✅ Arquivo baixado",
        description: "AUTOFIX_DATABASE_SETUP.sql foi baixado com sucesso",
      });
    } catch (error) {
      toast({
        title: "❌ Erro no download",
        description: "Não foi possível baixar o arquivo SQL",
        variant: "destructive",
      });
    }
  };

  const downloadCleanupSQL = () => {
    try {
      const blob = new Blob([CLEANUP_SQL_CONTENT], { type: "text/sql" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "AUTOFIX_CLEANUP.sql";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "🧹 Script de limpeza baixado",
        description: "AUTOFIX_CLEANUP.sql foi baixado. ⚠️ Use com cuidado!",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "❌ Erro no download",
        description: "Não foi possível baixar o script de limpeza",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(SQL_CONTENT);
      toast({
        title: "✅ Copiado",
        description: "Script SQL copiado para a área de transferência",
      });
    } catch (error) {
      toast({
        title: "❌ Erro ao copiar",
        description: "Não foi possível copiar o script SQL",
        variant: "destructive",
      });
    }
  };

  const openSupabase = () => {
    window.open("https://supabase.com/dashboard/project/_/sql/new", "_blank");
  };

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">
              📄 Script de Configuração SQL
            </h4>
            <p className="text-xs text-muted-foreground">
              Execute este script no Supabase SQL Editor para criar as tabelas
              do autofix.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={downloadSQL}
                variant="outline"
                className="flex-1 text-xs"
              >
                <Download className="mr-2 h-3 w-3" />
                Baixar SQL
              </Button>

              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="flex-1 text-xs"
              >
                <Copy className="mr-2 h-3 w-3" />
                Copiar
              </Button>

              <Button
                onClick={openSupabase}
                variant="outline"
                className="flex-1 text-xs"
              >
                <ExternalLink className="mr-2 h-3 w-3" />
                Abrir Supabase
              </Button>
            </div>

            <Button
              onClick={downloadCleanupSQL}
              variant="destructive"
              size="sm"
              className="w-full text-xs"
            >
              🧹 Baixar Script de Limpeza (Remove tudo)
            </Button>
          </div>

          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <strong>📋 Como usar:</strong>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Baixe ou copie o script SQL</li>
              <li>Abra o Supabase SQL Editor</li>
              <li>Cole e execute o script completo</li>
              <li>Volte aqui e execute os testes</li>
            </ol>

            <div className="mt-2 pt-2 border-t border-muted-foreground/20">
              <strong>🔧 Versão Corrigida:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>✅ Pode ser executado múltiplas vezes sem erro</li>
                <li>✅ Triggers são recriados corretamente</li>
                <li>✅ Evita duplicação de dados de exemplo</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SQLFileDownloader;
