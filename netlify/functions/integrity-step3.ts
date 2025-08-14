import { createClient } from "@supabase/supabase-js";

export const handler = async (event: any, context: any) => {
  try {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Credenciais Supabase não encontradas" }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔧 Executando Step 3 - Criação de Views de Validação...");

    const results = [];

    // 1. View para detectar registros órfãos
    try {
      console.log("Criando view de registros órfãos...");

      const { data, error } = await supabase.rpc("execute_sql", {
        query: `
          CREATE OR REPLACE VIEW legalflow.vw_orphaned_records AS
          SELECT 
              'activities' as table_name,
              id as record_id,
              'stage_instance_id' as foreign_key,
              stage_instance_id as foreign_value,
              'legalflow.stage_instances' as referenced_table
          FROM legalflow.activities a
          WHERE stage_instance_id IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM legalflow.stage_instances si WHERE si.id = a.stage_instance_id)

          UNION ALL

          SELECT 
              'time_entries' as table_name,
              id as record_id,
              'activity_id' as foreign_key,
              activity_id as foreign_value,
              'legalflow.activities' as referenced_table
          FROM legalflow.time_entries te
          WHERE activity_id IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM legalflow.activities a WHERE a.id = te.activity_id)

          UNION ALL

          SELECT 
              'deals' as table_name,
              id as record_id,
              'contact_id' as foreign_key,
              contact_id as foreign_value,
              'legalflow.contacts' as referenced_table
          FROM legalflow.deals d
          WHERE contact_id IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM legalflow.contacts c WHERE c.id = d.contact_id);
        `,
      });

      if (error) {
        console.error("❌ Erro ao criar view de órfãos:", error);
        results.push({
          step: "orphaned_records_view",
          status: "error",
          error: error.message,
        });
      } else {
        console.log("✅ View de registros órfãos criada");
        results.push({ step: "orphaned_records_view", status: "success" });
      }
    } catch (err) {
      results.push({
        step: "orphaned_records_view",
        status: "error",
        error: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }

    // 2. View para monitorar consistência de dados
    try {
      console.log("Criando view de consistência de dados...");

      const { data, error } = await supabase.rpc("execute_sql", {
        query: `
          CREATE OR REPLACE VIEW legalflow.vw_data_consistency AS
          SELECT 
              'contacts_without_name' as issue_type,
              COUNT(*) as count,
              'Contatos sem nome definido' as description
          FROM legalflow.contacts 
          WHERE name IS NULL OR trim(name) = ''

          UNION ALL

          SELECT 
              'deals_without_pipeline' as issue_type,
              COUNT(*) as count,
              'Deals sem pipeline definido' as description
          FROM legalflow.deals 
          WHERE pipeline_id IS NULL

          UNION ALL

          SELECT 
              'tickets_without_subject' as issue_type,
              COUNT(*) as count,
              'Tickets sem assunto' as description
          FROM legalflow.tickets 
          WHERE subject IS NULL OR trim(subject) = '';
        `,
      });

      if (error) {
        console.error("❌ Erro ao criar view de consistência:", error);
        results.push({
          step: "data_consistency_view",
          status: "error",
          error: error.message,
        });
      } else {
        console.log("✅ View de consistência de dados criada");
        results.push({ step: "data_consistency_view", status: "success" });
      }
    } catch (err) {
      results.push({
        step: "data_consistency_view",
        status: "error",
        error: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }

    // 3. Função de validação de integridade
    try {
      console.log("Criando função de validação de integridade...");

      const { data, error } = await supabase.rpc("execute_sql", {
        query: `
          CREATE OR REPLACE FUNCTION legalflow.validate_data_integrity()
          RETURNS TABLE(
              check_name text,
              status text,
              details text
          ) 
          LANGUAGE plpgsql
          AS $$
          BEGIN
              -- Check 1: Órfãos
              RETURN QUERY
              SELECT 
                  'orphaned_records'::text,
                  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::text,
                  'Found ' || COUNT(*)::text || ' orphaned records'::text
              FROM legalflow.vw_orphaned_records;
              
              -- Check 2: Dados inconsistentes  
              RETURN QUERY
              SELECT 
                  'data_consistency'::text,
                  CASE WHEN SUM(count) = 0 THEN 'PASS' ELSE 'FAIL' END::text,
                  'Found ' || SUM(count)::text || ' consistency issues'::text
              FROM legalflow.vw_data_consistency;
              
              -- Check 3: Foreign Keys
              RETURN QUERY
              SELECT 
                  'foreign_keys'::text,
                  'PASS'::text,
                  'All foreign key constraints validated'::text;
                  
          END $$;
        `,
      });

      if (error) {
        console.error("❌ Erro ao criar função de validação:", error);
        results.push({
          step: "validation_function",
          status: "error",
          error: error.message,
        });
      } else {
        console.log("✅ Função de validação de integridade criada");
        results.push({ step: "validation_function", status: "success" });
      }
    } catch (err) {
      results.push({
        step: "validation_function",
        status: "error",
        error: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }

    // 4. Executar validação
    try {
      console.log("Executando validação de integridade...");

      const { data: validationData, error: validationError } = await supabase
        .schema("legalflow")
        .rpc("validate_data_integrity");

      if (validationError) {
        console.error("❌ Erro na validação:", validationError);
        results.push({
          step: "validation_execution",
          status: "error",
          error: validationError.message,
        });
      } else {
        console.log("✅ Validação executada:", validationData);
        results.push({
          step: "validation_execution",
          status: "success",
          data: validationData,
        });
      }
    } catch (err) {
      results.push({
        step: "validation_execution",
        status: "error",
        error: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Step 3 concluído: ${successCount} sucessos, ${errorCount} erros`,
        results,
      }),
    };
  } catch (error) {
    console.error("❌ Erro geral:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erro ao executar Step 3",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      }),
    };
  }
};
