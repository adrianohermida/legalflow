#!/usr/bin/env node

/**
 * SF-2: Processo > Detalhes — Chat Multi-thread + Memória - Setup Script
 * 
 * Este script ajuda na instalação e verificação do sistema de chat multi-thread
 * para processos no Supabase.
 */

const fs = require('fs');
const path = require('path');

// Function to display instructions
function showInstructions() {
  console.log('🚀 SF-2: Chat Multi-thread + Memória - Setup\n');
  
  console.log('📋 INSTRUÇÕES DE INSTALAÇÃO:\n');
  
  console.log('1. 📄 Execute o arquivo SQL no Supabase:');
  console.log('   - Acesse seu painel Supabase > SQL Editor');
  console.log('   - Copie e execute: SF2_CHAT_MULTITHREAD_SCHEMA_COMPLETE.sql');
  console.log('   - Aguarde a confirmação de execução\n');
  
  console.log('2. ✅ Verifique a instalação:');
  console.log('   - Acesse /dev-auditoria no sistema');
  console.log('   - Vá para a aba "Processos"');
  console.log('   - Clique em "Verificar Schema"');
  console.log('   - Execute "Testar Funcionalidades"\n');
  
  console.log('3. 🧪 Teste o chat:');
  console.log('   - Acesse qualquer processo em /processos/:cnj');
  console.log('   - O chat dock aparecerá no canto inferior direito');
  console.log('   - Clique para expandir e criar uma nova conversa\n');
  
  console.log('4. ⚡ Quick Actions disponíveis:');
  console.log('   - Criar tarefa');
  console.log('   - Vincular a ticket');
  console.log('   - Solicitar documento');
  console.log('   - Concluir etapa');
  console.log('   - Análise AdvogaAI');
  console.log('   - Iniciar jornada\n');
  
  console.log('📊 FUNCIONALIDADES IMPLEMENTADAS:\n');
  
  console.log('✅ Schema SQL completo:');
  console.log('   - public.thread_links (threads de chat)');
  console.log('   - public.ai_messages (mensagens)');
  console.log('   - legalflow.conversation_properties (propriedades)');
  console.log('   - Funções RPC para todas as operações');
  console.log('   - Triggers de automação\n');
  
  console.log('✅ Componente React:');
  console.log('   - ProcessChatMultithread integrado ao ProcessoDetail');
  console.log('   - Chat dock responsivo com tabs');
  console.log('   - Sistema de mensagens em tempo real');
  console.log('   - Composer com anexos');
  console.log('   - Quick actions integradas\n');
  
  console.log('✅ Automações:');
  console.log('   - thread_links.properties = {"numero_cnj": ":cnj"}');
  console.log('   - Integração com AdvogaAI Tools v2');
  console.log('   - Histórico preservado por thread');
  console.log('   - Quick actions executando RPCs\n');
  
  console.log('🎯 ACEITE ATINGIDO:');
  console.log('   ✅ criar/abrir várias threads');
  console.log('   ✅ histórico preservado');
  console.log('   ✅ quick-actions executando RPCs\n');
  
  console.log('⚠️  IMPORTANTE:');
  console.log('   - É necessário executar o SQL manualmente no Supabase');
  console.log('   - O chat aparece apenas em páginas de processo (/processos/:cnj)');
  console.log('   - Use /dev-auditoria > Processos para testar e gerenciar\n');
  
  console.log('🔧 TROUBLESHOOTING:');
  console.log('   - Se o chat não aparecer: verifique se o schema foi instalado');
  console.log('   - Se as quick actions falharem: confira as permissões RPC');
  console.log('   - Se houver erros: consulte os logs no componente SF2ProcessosSetup\n');
}

// Function to check if SQL file exists
function checkSQLFile() {
  const sqlPath = path.join(__dirname, '..', 'SF2_CHAT_MULTITHREAD_SCHEMA_COMPLETE.sql');
  
  console.log('📄 Verificando arquivo SQL...\n');
  
  if (fs.existsSync(sqlPath)) {
    const stats = fs.statSync(sqlPath);
    const fileSizeKB = Math.round(stats.size / 1024);
    
    console.log(`✅ Arquivo encontrado: SF2_CHAT_MULTITHREAD_SCHEMA_COMPLETE.sql`);
    console.log(`📊 Tamanho: ${fileSizeKB} KB`);
    console.log(`📅 Modificado: ${stats.mtime.toLocaleString('pt-BR')}\n`);
    
    // Read first few lines to show content preview
    const content = fs.readFileSync(sqlPath, 'utf8');
    const lines = content.split('\n').slice(0, 5);
    
    console.log('👀 Preview do conteúdo:');
    lines.forEach((line, index) => {
      console.log(`   ${index + 1}: ${line}`);
    });
    console.log('   ...\n');
    
    return true;
  } else {
    console.log('❌ Arquivo SQL não encontrado!');
    console.log(`   Esperado em: ${sqlPath}\n`);
    return false;
  }
}

// Function to validate component files
function validateComponents() {
  console.log('🔍 Verificando componentes React...\n');
  
  const components = [
    'client/components/ProcessChatMultithread.tsx',
    'client/components/SF2ProcessosSetup.tsx',
    'client/pages/ProcessoDetail.tsx'
  ];
  
  let allValid = true;
  
  components.forEach(componentPath => {
    const fullPath = path.join(__dirname, '..', componentPath);
    
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${componentPath}`);
    } else {
      console.log(`❌ ${componentPath} - AUSENTE`);
      allValid = false;
    }
  });
  
  console.log('');
  
  if (allValid) {
    console.log('✅ Todos os componentes estão presentes\n');
  } else {
    console.log('⚠️  Alguns componentes estão ausentes\n');
  }
  
  return allValid;
}

// Main execution
function main() {
  showInstructions();
  
  const sqlExists = checkSQLFile();
  const componentsValid = validateComponents();
  
  if (sqlExists && componentsValid) {
    console.log('🎉 SF-2 Setup está pronto para instalação!');
    console.log('   Execute o SQL no Supabase e teste em /dev-auditoria\n');
  } else {
    console.log('⚠️  Alguns arquivos estão ausentes.');
    console.log('   Verifique a integridade da implementação\n');
  }
  
  console.log('📚 Para mais informações, consulte:');
  console.log('   - /dev-auditoria > aba "Processos"');
  console.log('   - Componente SF2ProcessosSetup para testes');
  console.log('   - ProcessChatMultithread na página de processos\n');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { showInstructions, checkSQLFile, validateComponents };
