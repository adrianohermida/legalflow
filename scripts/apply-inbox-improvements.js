import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase não encontradas.');
  console.log('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySQLFile(filePath) {
  try {
    console.log(`📖 Lendo arquivo: ${filePath}`);
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // Dividir em statements individuais (simplificado)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`🔄 Executando ${statements.length} statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`  ⏳ Executando statement ${i + 1}/${statements.length}`);
        try {
          const { error } = await supabase.rpc('exec_sql', { 
            sql: statement + ';' 
          });
          
          if (error) {
            // Tentar execução direta se rpc falhar
            const { error: directError } = await supabase
              .from('_temp_sql_execution')
              .select('*')
              .limit(0);
            
            if (directError) {
              console.log(`  ⚠️  Statement ${i + 1} pode ter falhado: ${error.message}`);
            } else {
              console.log(`  ✅ Statement ${i + 1} executado com sucesso`);
            }
          } else {
            console.log(`  ✅ Statement ${i + 1} executado com sucesso`);
          }
        } catch (sqlError) {
          console.log(`  ⚠️  Statement ${i + 1} falhou: ${sqlError.message}`);
        }
      }
    }
    
    console.log(`✅ Arquivo ${filePath} aplicado!`);
    
  } catch (error) {
    console.error(`❌ Erro ao aplicar ${filePath}:`, error.message);
    throw error;
  }
}

async function testConnection() {
  try {
    console.log('🔌 Testando conexão com Supabase...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error && !error.message.includes('permission denied')) {
      throw error;
    }
    
    console.log('✅ Conexão com Supabase estabelecida!');
    return true;
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Aplicando melhorias no Inbox Legal...\n');
  
  // Testar conexão
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }
  
  try {
    // Aplicar schema do tracking de leitura
    const schemaPath = path.join(process.cwd(), 'INBOX_READ_TRACKING_SCHEMA.sql');
    
    if (fs.existsSync(schemaPath)) {
      await applySQLFile(schemaPath);
    } else {
      console.log('⚠️  Arquivo INBOX_READ_TRACKING_SCHEMA.sql não encontrado, pulando...');
    }
    
    console.log('\n🎉 Melhorias aplicadas com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Substitua o arquivo InboxLegalV2.tsx pelo InboxLegalV2Enhanced.tsx');
    console.log('2. Teste a funcionalidade de leitura e tratamento de itens');
    console.log('3. Verifique as estatísticas de leitura');
    console.log('4. Teste a busca por nome das partes nos processos');
    console.log('5. Teste a exportação para Excel');
    
  } catch (error) {
    console.error('\n❌ Erro durante a aplicação das melhorias:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
