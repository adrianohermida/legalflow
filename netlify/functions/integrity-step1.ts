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

    console.log('🔧 Executando Step 1 - Correção de Foreign Keys...');

    const results = [];

    // 1. FK time_entries.activity_id
    try {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: `
          DO $$ 
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.table_constraints 
                  WHERE constraint_name = 'fk_time_entries_activity'
              ) THEN
                  ALTER TABLE legalflow.time_entries 
                  ADD CONSTRAINT fk_time_entries_activity 
                  FOREIGN KEY (activity_id) REFERENCES legalflow.activities(id) ON DELETE SET NULL;
              END IF;
          END $$;
        `
      });

      if (error) {
        console.error('❌ Erro FK time_entries:', error);
        results.push({ step: 'time_entries_fk', status: 'error', error: error.message });
      } else {
        console.log('✅ FK time_entries adicionada');
        results.push({ step: 'time_entries_fk', status: 'success' });
      }
    } catch (err) {
      results.push({ step: 'time_entries_fk', status: 'error', error: err instanceof Error ? err.message : 'Erro desconhecido' });
    }

    // 2. FK planos_pagamento.journey_instance_id
    try {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: `
          DO $$ 
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.table_constraints 
                  WHERE constraint_name = 'fk_planos_journey'
              ) THEN
                  ALTER TABLE legalflow.planos_pagamento 
                  ADD CONSTRAINT fk_planos_journey 
                  FOREIGN KEY (journey_instance_id) REFERENCES legalflow.journey_instances(id) ON DELETE SET NULL;
              END IF;
          END $$;
        `
      });

      if (error) {
        console.error('❌ Erro FK planos_pagamento:', error);
        results.push({ step: 'planos_pagamento_fk', status: 'error', error: error.message });
      } else {
        console.log('✅ FK planos_pagamento adicionada');
        results.push({ step: 'planos_pagamento_fk', status: 'success' });
      }
    } catch (err) {
      results.push({ step: 'planos_pagamento_fk', status: 'error', error: err instanceof Error ? err.message : 'Erro desconhecido' });
    }

    // 3. FK deals.contact_id
    try {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: `
          DO $$ 
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.table_constraints 
                  WHERE constraint_name = 'fk_deals_contact'
              ) THEN
                  ALTER TABLE legalflow.deals 
                  ADD CONSTRAINT fk_deals_contact 
                  FOREIGN KEY (contact_id) REFERENCES legalflow.contacts(id) ON DELETE SET NULL;
              END IF;
          END $$;
        `
      });

      if (error) {
        console.error('❌ Erro FK deals:', error);
        results.push({ step: 'deals_contact_fk', status: 'error', error: error.message });
      } else {
        console.log('✅ FK deals adicionada');
        results.push({ step: 'deals_contact_fk', status: 'success' });
      }
    } catch (err) {
      results.push({ step: 'deals_contact_fk', status: 'error', error: err instanceof Error ? err.message : 'Erro desconhecido' });
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Step 1 concluído: ${successCount} sucessos, ${errorCount} erros`,
        results
      })
    };

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Erro ao executar Step 1',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    };
  }
};
