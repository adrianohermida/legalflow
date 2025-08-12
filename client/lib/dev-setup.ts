import { supabase, supabaseConfigured } from './supabase';

// Development utilities for setting up initial data
export const devSetup = {
  async createTestUser() {
    // Only run in development and when Supabase is configured
    if (import.meta.env.PROD || !supabaseConfigured) return;

    try {
      // Try to create a test user for demo purposes
      const testEmail = 'adriano@hermidamaia.adv.br';
      const testPassword = '123456';

      console.log('Creating test user for development...');
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error && !error.message.includes('User already registered')) {
        console.error('Error creating test user:', error.message);
      } else {
        console.log('Test user created or already exists');
      }
    } catch (error: any) {
      console.error('Failed to create test user:', error.message);
    }
  },

  async createInitialData() {
    // Only run in development and when Supabase is configured
    if (import.meta.env.PROD || !supabaseConfigured) return;

    try {
      // First, try to create test user
      await this.createTestUser();

      // Check if we already have data
      const { data: existingClientes } = await supabase
        .from('clientes')
        .select('cpfcnpj')
        .limit(1);

      if (existingClientes && existingClientes.length > 0) {
        console.log('Development data already exists');
        return;
      }

      console.log('Setting up development data...');

      // Create sample clientes
      const { data: clientes, error: clientesError } = await supabase
        .from('clientes')
        .insert([
          {
            cpfcnpj: '12345678900',
            nome: 'João Silva',
            whatsapp: '5511999999999'
          },
          {
            cpfcnpj: '12345678000190',
            nome: 'Empresa ABC Ltda',
            whatsapp: '5511888888888'
          },
          {
            cpfcnpj: '98765432100',
            nome: 'Maria Oliveira',
            whatsapp: '5511777777777'
          }
        ])
        .select();

      if (clientesError) {
        console.error('Error creating clientes:', clientesError.message || clientesError);
        return;
      }

      // Create sample advogados
      const { data: advogados, error: advogadosError } = await supabase
        .from('advogados')
        .insert([
          {
            oab: 123456,
            nome: 'Dr. Adriano Hermida Maia',
            uf: 'SP'
          },
          {
            oab: 654321,
            nome: 'Dra. Maria Santos',
            uf: 'SP'
          }
        ])
        .select();

      if (advogadosError) {
        console.error('Error creating advogados:', advogadosError.message || advogadosError);
        return;
      }

      // Create sample processos
      const { data: processos, error: processosError } = await supabase
        .from('processos')
        .insert([
          {
            numero_cnj: '1000123-45.2024.8.26.0001',
            tribunal_sigla: 'TJSP',
            titulo_polo_ativo: 'João Silva',
            titulo_polo_passivo: 'Empresa XYZ',
            data: {
              status: 'ativo',
              fase: 'Petição inicial',
              risco: 'alto',
              proxima_acao: 'Contestação',
              prazo: '2024-02-15'
            }
          },
          {
            numero_cnj: '2000456-78.2024.8.26.0002',
            tribunal_sigla: 'TJSP',
            titulo_polo_ativo: 'Empresa ABC Ltda',
            titulo_polo_passivo: 'Fornecedor DEF',
            data: {
              status: 'ativo',
              fase: 'Instrução',
              risco: 'medio',
              proxima_acao: 'Audiência',
              prazo: '2024-02-20'
            }
          }
        ])
        .select();

      if (processosError) {
        console.error('Error creating processos:', processosError.message || processosError);
        return;
      }

      // Link clientes to processos
      if (clientes && processos) {
        await supabase
          .from('clientes_processos')
          .insert([
            {
              cpfcnpj: clientes[0].cpfcnpj,
              numero_cnj: processos[0].numero_cnj
            },
            {
              cpfcnpj: clientes[1].cpfcnpj,
              numero_cnj: processos[1].numero_cnj
            }
          ]);

        // Link advogados to processos
        if (advogados) {
          await supabase
            .from('advogados_processos')
            .insert([
              {
                oab: advogados[0].oab,
                numero_cnj: processos[0].numero_cnj
              },
              {
                oab: advogados[1].oab,
                numero_cnj: processos[1].numero_cnj
              }
            ]);
        }
      }

      // Create stage types if they don't exist
      const { data: existingTypes } = await supabase
        .from('stage_types')
        .select('id')
        .limit(1);

      if (!existingTypes || existingTypes.length === 0) {
        await supabase
          .from('stage_types')
          .insert([
            { code: 'lesson', label: 'Aula/Conte��do' },
            { code: 'form', label: 'Formulário' },
            { code: 'upload', label: 'Upload de Documento' },
            { code: 'meeting', label: 'Reunião/Audiência' },
            { code: 'gate', label: 'Portão de Aprovação' },
            { code: 'task', label: 'Tarefa Geral' }
          ]);
      }

      console.log('Development data created successfully!');
    } catch (error) {
      console.error('Error setting up development data:', error);
    }
  },

  async checkConnection() {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('count(*)')
        .limit(1);

      if (error) {
        console.error('Supabase connection error:', error);
        return false;
      }

      console.log('Supabase connection successful');
      return true;
    } catch (error) {
      console.error('Failed to connect to Supabase:', error);
      return false;
    }
  }
};

// Auto-run in development
if (import.meta.env.DEV) {
  devSetup.checkConnection().then(connected => {
    if (connected) {
      devSetup.createInitialData();
    }
  });
}
