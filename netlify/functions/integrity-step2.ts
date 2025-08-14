import { createClient } from '@supabase/supabase-js';

export const handler = async (event: any, context: any) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Credenciais Supabase não encontradas' })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔧 Executando Step 2 - Criação de Índices de Performance...');

    const indices = [
      {
        name: 'idx_deals_contact_pipeline',
        sql: 'CREATE INDEX IF NOT EXISTS idx_deals_contact_pipeline ON legalflow.deals(contact_id, pipeline_id);'
      },
      {
        name: 'idx_activities_numero_cnj_status',
        sql: 'CREATE INDEX IF NOT EXISTS idx_activities_numero_cnj_status ON legalflow.activities(numero_cnj, status);'
      },
      {
        name: 'idx_tickets_cliente_status',
        sql: 'CREATE INDEX IF NOT EXISTS idx_tickets_cliente_status ON legalflow.tickets(cliente_cpfcnpj, status);'
      },
      {
        name: 'idx_stage_instances_status_sla',
        sql: 'CREATE INDEX IF NOT EXISTS idx_stage_instances_status_sla ON legalflow.stage_instances(status, sla_at);'
      },
      {
        name: 'idx_time_entries_user_date',
        sql: 'CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON legalflow.time_entries(user_id, start_time);'
      },
      {
        name: 'idx_activities_stage_instance',
        sql: 'CREATE INDEX IF NOT EXISTS idx_activities_stage_instance ON legalflow.activities(stage_instance_id);'
      },
      {
        name: 'idx_planos_journey_instance',
        sql: 'CREATE INDEX IF NOT EXISTS idx_planos_journey_instance ON legalflow.planos_pagamento(journey_instance_id);'
      },
      {
        name: 'idx_time_entries_activity',
        sql: 'CREATE INDEX IF NOT EXISTS idx_time_entries_activity ON legalflow.time_entries(activity_id);'
      }
    ];

    const results = [];

    for (const index of indices) {
      try {
        console.log(`Criando índice: ${index.name}...`);
        
        const { data, error } = await supabase.rpc('execute_sql', {
          query: index.sql
        });

        if (error) {
          console.error(`❌ Erro ao criar ${index.name}:`, error);
          results.push({ 
            index: index.name, 
            status: 'error', 
            error: error.message 
          });
        } else {
          console.log(`✅ Índice ${index.name} criado com sucesso`);
          results.push({ 
            index: index.name, 
            status: 'success' 
          });
        }
      } catch (err) {
        console.error(`❌ Erro inesperado ao criar ${index.name}:`, err);
        results.push({ 
          index: index.name, 
          status: 'error', 
          error: err instanceof Error ? err.message : 'Erro desconhecido' 
        });
      }
    }

    // Tentar habilitar extensão pg_trgm para busca de texto
    try {
      console.log('Habilitando extensão pg_trgm...');
      const { data, error } = await supabase.rpc('execute_sql', {
        query: 'CREATE EXTENSION IF NOT EXISTS pg_trgm;'
      });

      if (error) {
        console.error('❌ Erro ao habilitar pg_trgm:', error);
        results.push({ 
          index: 'pg_trgm_extension', 
          status: 'error', 
          error: error.message 
        });
      } else {
        console.log('✅ Extensão pg_trgm habilitada');
        results.push({ 
          index: 'pg_trgm_extension', 
          status: 'success' 
        });

        // Criar índices de busca de texto apenas se pg_trgm foi habilitada
        const textIndices = [
          {
            name: 'idx_contacts_name_trgm',
            sql: 'CREATE INDEX IF NOT EXISTS idx_contacts_name_trgm ON legalflow.contacts USING gin(name gin_trgm_ops);'
          },
          {
            name: 'idx_tickets_subject_trgm',
            sql: 'CREATE INDEX IF NOT EXISTS idx_tickets_subject_trgm ON legalflow.tickets USING gin(subject gin_trgm_ops);'
          }
        ];

        for (const textIndex of textIndices) {
          try {
            console.log(`Criando índice de texto: ${textIndex.name}...`);
            
            const { data, error } = await supabase.rpc('execute_sql', {
              query: textIndex.sql
            });

            if (error) {
              console.error(`❌ Erro ao criar ${textIndex.name}:`, error);
              results.push({ 
                index: textIndex.name, 
                status: 'error', 
                error: error.message 
              });
            } else {
              console.log(`✅ Índice de texto ${textIndex.name} criado`);
              results.push({ 
                index: textIndex.name, 
                status: 'success' 
              });
            }
          } catch (err) {
            results.push({ 
              index: textIndex.name, 
              status: 'error', 
              error: err instanceof Error ? err.message : 'Erro desconhecido' 
            });
          }
        }
      }
    } catch (err) {
      console.error('❌ Erro inesperado com pg_trgm:', err);
      results.push({ 
        index: 'pg_trgm_extension', 
        status: 'error', 
        error: err instanceof Error ? err.message : 'Erro desconhecido' 
      });
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Step 2 concluído: ${successCount} sucessos, ${errorCount} erros`,
        results
      })
    };

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Erro ao executar Step 2',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    };
  }
};
