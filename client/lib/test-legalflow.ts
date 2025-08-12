import { 
  lf, 
  journeyTemplatesApi, 
  journeyInstancesApi, 
  stageTypesApi,
  planosPagamentoApi,
  crossSchemaApi
} from './api';

// Test utilities for LegalFlow schema connections
export const testLegalFlow = {
  // Test 1: Verify connection to legalflow schema
  async testConnection() {
    try {
      console.log('🔍 Testing LegalFlow schema connection...');
      const { data, error } = await lf
        .from('stage_types')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('❌ Connection test failed:', error);
        return false;
      }
      
      console.log('✅ LegalFlow connection successful');
      console.log('📊 Stage types found:', data?.length || 0);
      return true;
    } catch (error) {
      console.error('❌ Connection test error:', error);
      return false;
    }
  },

  // Test 2: Create initial stage types if not exist
  async setupStageTypes() {
    try {
      console.log('🔧 Setting up stage types...');
      
      const stageTypes = [
        { code: 'lesson', label: 'Aula/Conteúdo' },
        { code: 'form', label: 'Formulário' },
        { code: 'upload', label: 'Upload de Documento' },
        { code: 'meeting', label: 'Reunião/Audiência' },
        { code: 'gate', label: 'Portão de Aprovação' },
        { code: 'task', label: 'Tarefa Geral' }
      ];

      for (const stageType of stageTypes) {
        const { data: existing } = await lf
          .from('stage_types')
          .select('*')
          .eq('code', stageType.code)
          .single();

        if (!existing) {
          const { data, error } = await lf
            .from('stage_types')
            .insert(stageType)
            .select()
            .single();

          if (error) {
            console.error(`❌ Failed to create stage type ${stageType.code}:`, error);
          } else {
            console.log(`✅ Created stage type: ${stageType.label}`);
          }
        } else {
          console.log(`ℹ️ Stage type already exists: ${stageType.label}`);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Setup stage types error:', error);
      return false;
    }
  },

  // Test 3: Create a sample journey template
  async createSampleTemplate() {
    try {
      console.log('📝 Creating sample journey template...');
      
      const template = {
        name: 'Teste - Processo Trabalhista',
        niche: 'trabalhista',
        steps_count: 3,
        eta_days: 30,
        tags: ['teste', 'trabalhista']
      };

      const { data: templateData, error: templateError } = await lf
        .from('journey_templates')
        .insert(template)
        .select()
        .single();

      if (templateError) {
        console.error('❌ Failed to create template:', templateError);
        return null;
      }

      console.log('✅ Template created:', templateData.name);

      // Create sample stages for the template
      const stages = [
        {
          template_id: templateData.id,
          position: 1,
          title: 'Análise inicial do caso',
          description: 'Revisão dos documentos e viabilidade',
          type_id: 1, // Assuming first stage type
          mandatory: true,
          sla_hours: 24,
          config: { auto_advance: false }
        },
        {
          template_id: templateData.id,
          position: 2,
          title: 'Preenchimento de formulário',
          description: 'Coleta de dados do cliente',
          type_id: 2, // Form type
          mandatory: true,
          sla_hours: 48,
          config: { form_fields: ['nome', 'cargo', 'salario'] }
        },
        {
          template_id: templateData.id,
          position: 3,
          title: 'Upload de documentos',
          description: 'Envio de CTPS e contratos',
          type_id: 3, // Upload type
          mandatory: true,
          sla_hours: 72,
          config: { max_files: 5, file_types: ['pdf', 'jpg'] }
        }
      ];

      for (const stage of stages) {
        const { data: stageData, error: stageError } = await lf
          .from('journey_template_stages')
          .insert(stage)
          .select()
          .single();

        if (stageError) {
          console.error(`❌ Failed to create stage ${stage.title}:`, stageError);
        } else {
          console.log(`✅ Created stage: ${stage.title}`);
        }
      }

      return templateData;
    } catch (error) {
      console.error('❌ Create sample template error:', error);
      return null;
    }
  },

  // Test 4: Create a journey instance linked to existing cliente/processo
  async createSampleInstance(templateId: string, clienteCpfCnpj: string, processoNumeroCnj?: string) {
    try {
      console.log('🚀 Creating sample journey instance...');
      
      const instance = {
        template_id: templateId,
        cliente_cpfcnpj: clienteCpfCnpj,
        processo_numero_cnj: processoNumeroCnj || null,
        owner_oab: 123456, // Sample OAB
        start_date: new Date().toISOString(),
        status: 'active',
        progress_pct: 0,
        next_action: { type: 'start_first_stage', stage_id: null }
      };

      const { data, error } = await lf
        .from('journey_instances')
        .insert(instance)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create instance:', error);
        return null;
      }

      console.log('✅ Journey instance created:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Create sample instance error:', error);
      return null;
    }
  },

  // Test 5: Test cross-schema query
  async testCrossSchemaQuery(instanceId: string) {
    try {
      console.log('🔄 Testing cross-schema query...');
      
      const enrichedInstance = await crossSchemaApi.getJourneyWithProcess(instanceId);
      
      console.log('✅ Cross-schema query successful');
      console.log('📊 Instance data:', {
        id: enrichedInstance.id,
        template_id: enrichedInstance.template_id,
        cliente: enrichedInstance.cliente?.nome || 'No cliente data',
        processo: enrichedInstance.processo?.numero_cnj || 'No processo data',
        status: enrichedInstance.status
      });

      return enrichedInstance;
    } catch (error) {
      console.error('❌ Cross-schema query error:', error);
      return null;
    }
  },

  // Test 6: Create sample payment plan
  async createSamplePaymentPlan(clienteCpfCnpj: string, processoNumeroCnj?: string) {
    try {
      console.log('💰 Creating sample payment plan...');
      
      const plano = {
        cliente_cpfcnpj: clienteCpfCnpj,
        processo_numero_cnj: processoNumeroCnj || null,
        amount_total: 5000.00,
        installments: 10,
        paid_amount: 0,
        status: 'active'
      };

      const { data: planoData, error: planoError } = await lf
        .from('planos_pagamento')
        .insert(plano)
        .select()
        .single();

      if (planoError) {
        console.error('❌ Failed to create payment plan:', planoError);
        return null;
      }

      console.log('✅ Payment plan created:', planoData.id);

      // Create sample installments
      const installments = Array.from({ length: 10 }, (_, i) => ({
        plano_id: planoData.id,
        n_parcela: i + 1,
        due_date: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: 500.00,
        status: 'pending'
      }));

      for (const installment of installments) {
        const { data: parcelaData, error: parcelaError } = await lf
          .from('parcelas_pagamento')
          .insert(installment)
          .select()
          .single();

        if (parcelaError) {
          console.error(`❌ Failed to create installment ${installment.n_parcela}:`, parcelaError);
        } else {
          console.log(`✅ Created installment ${installment.n_parcela}`);
        }
      }

      return planoData;
    } catch (error) {
      console.error('❌ Create sample payment plan error:', error);
      return null;
    }
  },

  // Run all tests
  async runAllTests() {
    console.log('🧪 Starting LegalFlow schema tests...\n');
    
    const results = {
      connection: false,
      stageTypes: false,
      template: null,
      instance: null,
      crossSchema: null,
      paymentPlan: null
    };

    // Test 1: Connection
    results.connection = await this.testConnection();
    if (!results.connection) return results;

    // Test 2: Stage types
    results.stageTypes = await this.setupStageTypes();

    // Test 3: Sample template
    results.template = await this.createSampleTemplate();

    // Test 4: Sample instance (needs existing cliente)
    if (results.template) {
      // Use a test CPF - in real scenario, this should be an existing cliente
      const testCpfCnpj = '12345678900';
      results.instance = await this.createSampleInstance(
        results.template.id, 
        testCpfCnpj
      );

      // Test 5: Cross-schema query
      if (results.instance) {
        results.crossSchema = await this.testCrossSchemaQuery(results.instance.id);
      }

      // Test 6: Payment plan
      results.paymentPlan = await this.createSamplePaymentPlan(testCpfCnpj);
    }

    console.log('\n🏁 Test results summary:', {
      connection: results.connection ? '✅' : '❌',
      stageTypes: results.stageTypes ? '✅' : '❌',
      template: results.template ? '✅' : '❌',
      instance: results.instance ? '✅' : '❌',
      crossSchema: results.crossSchema ? '✅' : '❌',
      paymentPlan: results.paymentPlan ? '✅' : '❌'
    });

    return results;
  }
};

// Auto-run tests in development
if (import.meta.env.DEV) {
  // Add a delay to let the app initialize
  setTimeout(() => {
    console.log('🔧 LegalFlow schema testing available via: testLegalFlow.runAllTests()');
    // Uncomment the line below to auto-run tests
    // testLegalFlow.runAllTests().catch(console.error);
  }, 5000);
}

export default testLegalFlow;
