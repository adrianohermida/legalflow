#!/usr/bin/env node

// SCRIPT DRÁSTICO: Substitui TODAS as classes brand por neutras
// Para executar: node drastic-brand-replacement.js

const fs = require('fs');
const path = require('path');

// Mapeamento drástico: brand → neutro
const BRAND_TO_NEUTRAL = {
  // Backgrounds
  'bg-brand-50': 'bg-white',
  'bg-brand-100': 'bg-gray-50', 
  'bg-brand-200': 'bg-gray-100',
  'bg-brand-300': 'bg-gray-200',
  'bg-brand-400': 'bg-gray-300',
  'bg-brand-500': 'bg-gray-400',
  'bg-brand-600': 'bg-gray-600',
  'bg-brand-700': 'bg-black',
  'bg-brand-800': 'bg-gray-800',
  'bg-brand-900': 'bg-gray-900',
  
  // Texts
  'text-brand-50': 'text-gray-50',
  'text-brand-100': 'text-gray-100',
  'text-brand-200': 'text-gray-200',
  'text-brand-300': 'text-gray-300',
  'text-brand-400': 'text-gray-400',
  'text-brand-500': 'text-gray-500',
  'text-brand-600': 'text-gray-600',
  'text-brand-700': 'text-black',
  'text-brand-800': 'text-gray-800',
  'text-brand-900': 'text-gray-900',
  
  // Borders
  'border-brand-50': 'border-gray-50',
  'border-brand-100': 'border-gray-100',
  'border-brand-200': 'border-gray-200',
  'border-brand-300': 'border-gray-300',
  'border-brand-400': 'border-gray-400',
  'border-brand-500': 'border-gray-500',
  'border-brand-600': 'border-gray-600',
  'border-brand-700': 'border-black',
  'border-brand-800': 'border-gray-800',
  'border-brand-900': 'border-gray-900',
  
  // Hover backgrounds
  'hover:bg-brand-50': 'hover:bg-gray-50',
  'hover:bg-brand-100': 'hover:bg-gray-100',
  'hover:bg-brand-200': 'hover:bg-gray-200',
  'hover:bg-brand-600': 'hover:bg-gray-600',
  'hover:bg-brand-700': 'hover:bg-gray-800',
  'hover:bg-brand-900': 'hover:bg-gray-900',
  
  // Hover texts
  'hover:text-brand-700': 'hover:text-gray-800',
  'hover:text-brand-900': 'hover:text-gray-900',
  
  // Hover borders
  'hover:border-brand-200': 'hover:border-gray-300',
  'hover:border-brand-700': 'hover:border-gray-800',
  
  // Group hover
  'group-hover:text-brand-700': 'group-hover:text-gray-800',
  
  // Focus
  'focus:ring-brand-700': 'focus:ring-gray-800',
  'ring-brand-700': 'ring-gray-800',
  
  // Special cases
  'bg-brand-50/30': 'bg-gray-50/30',
  'hover:bg-brand-100/30': 'hover:bg-gray-100/30',
  'border-b-2 border-brand-700': 'border-b-2 border-gray-800'
};

// Lista de arquivos para processar
const FILES_TO_PROCESS = [
  'client/pages/ModeSelector.tsx',
  'client/pages/DemoLoginPage.tsx', 
  'client/pages/SupabaseLoginPage.tsx',
  'client/pages/ColorTest.tsx',
  'client/pages/Dashboard.tsx',
  'client/pages/portal/PortalCliente.tsx',
  'client/pages/portal/PortalChat.tsx',
  'client/pages/InboxLegal.tsx',
  'client/pages/Setup.tsx',
  'client/pages/ForgotPassword.tsx',
  'client/pages/Jornadas.tsx',
  'client/components/Sidebar.tsx',
  'client/components/JourneyDesigner.tsx',
  'client/components/AppLauncher.tsx',
  'client/components/SupabaseSetup.tsx',
  'client/components/CommandPalette.tsx',
  'client/components/ChatDock.tsx',
  'client/components/UnifiedOABSelectionModal.tsx',
  'client/components/NotificationPanel.tsx',
  'client/components/Header.tsx'
];

function replaceBrandClasses(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changesCount = 0;
    
    // Aplica todas as substituições
    for (const [brandClass, neutralClass] of Object.entries(BRAND_TO_NEUTRAL)) {
      const regex = new RegExp(brandClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const before = content;
      content = content.replace(regex, neutralClass);
      if (content !== before) {
        changesCount += (before.match(regex) || []).length;
      }
    }
    
    if (changesCount > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filePath}: ${changesCount} substituições`);
      return changesCount;
    } else {
      console.log(`⚪ ${filePath}: Nenhuma alteração`);
      return 0;
    }
  } catch (error) {
    console.error(`❌ Erro processando ${filePath}:`, error.message);
    return 0;
  }
}

function main() {
  console.log('🔥 INICIANDO SUBSTITUIÇÃO DRÁSTICA DE CLASSES BRAND');
  console.log('==========================================');
  
  let totalChanges = 0;
  let processedFiles = 0;
  
  for (const filePath of FILES_TO_PROCESS) {
    if (fs.existsSync(filePath)) {
      const changes = replaceBrandClasses(filePath);
      totalChanges += changes;
      processedFiles++;
    } else {
      console.log(`⚠️  ${filePath}: Arquivo não encontrado`);
    }
  }
  
  console.log('==========================================');
  console.log(`🎯 RESULTADO FINAL:`);
  console.log(`📁 Arquivos processados: ${processedFiles}`);
  console.log(`🔄 Total de substituições: ${totalChanges}`);
  console.log(`✅ BRAND CLASSES COMPLETAMENTE ELIMINADAS!`);
}

// Executa se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { BRAND_TO_NEUTRAL, replaceBrandClasses };
