-- =====================================================
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
*/
